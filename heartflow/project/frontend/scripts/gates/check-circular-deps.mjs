#!/usr/bin/env node
// ============================================================
// 循环依赖闸门（自研，替代 madge）
//
// 为什么不用 madge：
//   madge → dependency-tree → filing-cabinet，其中 sfcLookup 对 **.vue** 文件做
//   依赖提取时，若被查的说明符以 `.js` 结尾（如
//   `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'`），
//   会退回 jsLookup，用 babel 的 `jsx+flow`（**没有 typescript 插件**）去解析
//   **整个 .vue 原文**（含 <template>）→ 第 2 行的 `:class` 触发 JSX 命名空间
//   语法错误 → `SyntaxError: Unexpected token (2:52)`，且不打印文件名，
//   整条闸门直接崩掉。见 src/components/Globe3D.vue。
//
// 本脚本：
//   - 用 @vue/compiler-sfc 正确抽取 .vue 的 script / script setup 块
//   - 用 typescript 官方 AST（直连依赖）提取 import / export-from / import()
//   - 只跟随「相对路径」与「@/ 别名」，不解析 node_modules
//   - 默认跳过类型专用导入（import type / export type）与测试文件，只报真实环
//
// 基线：scripts/gates/circular-baseline.json 登记「已知环」，闸门放行；新增环立即红灯。
//
// 位置说明：放在 scripts/gates/ 而非 scripts/ 根下 —— .gitignore:89 有
// `**/scripts/*.mjs`（只匹配 scripts/ 一层），放根下会让本脚本进不了版本库，
// 于是「本地能跑、别人机器缺文件」。子目录与已有 scripts/benchmark/ 同惯例。
//
// 用法：node scripts/gates/check-circular-deps.mjs [--include-tests] [--verbose]
//                                              [--json] [--update-baseline]
// 退出码：0 = 无新增环；1 = 出现新增环 / 解析失败
// ============================================================

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve, dirname, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse as parseSfc } from '@vue/compiler-sfc'

// 本文件位于 <frontend>/scripts/gates/ → 上溯两级为 frontend 根
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, 'src')
const BASELINE_PATH = join(ROOT, 'scripts', 'gates', 'circular-baseline.json')

const args = process.argv.slice(2)
const INCLUDE_TESTS = args.includes('--include-tests')
const VERBOSE = args.includes('--verbose')
const AS_JSON = args.includes('--json')
const UPDATE_BASELINE = args.includes('--update-baseline')

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return new Set()
  try {
    const data = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'))
    return new Set(Array.isArray(data.cycles) ? data.cycles : [])
  } catch (e) {
    console.error(`⚠️  基线文件解析失败，按空基线处理：${e.message}`)
    return new Set()
  }
}

/** 可解析的源码扩展名 */
const SOURCE_EXTS = ['.ts', '.tsx', '.vue']
/** 不当节点处理的资源类后缀（不参与环检测） */
const ASSET_EXTS = ['.css', '.scss', '.sass', '.less', '.styl', '.json', '.svg', '.png', '.jpg', '.glb', '.gltf', '.wasm', '.md', '.txt', '.hdr', '.exr']
/** 明显的非源码说明符前缀 */
const NON_SOURCE_PREFIXES = ['virtual:', 'node:', 'data:', 'http:', 'https:', '?', '/@']

function rel(p) {
  return relative(ROOT, p).replace(/\\/g, '/')
}

function isTestFile(p) {
  const r = rel(p)
  return r.includes('/__tests__/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(r)
}

// ---- 1. 收集待分析文件 ----
function collect(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      collect(full, out)
      continue
    }
    const ext = extname(entry.name)
    if (!SOURCE_EXTS.includes(ext)) continue
    if (entry.name.endsWith('.d.ts')) continue
    if (!INCLUDE_TESTS && isTestFile(full)) continue
    out.push(full)
  }
  return out
}

// ---- 2. 提取说明符 ----
/** .vue → 拼回它的 <script> / <script setup> 文本（保留行号无意义，只需语法正确） */
function scriptTextOfVue(code) {
  const { descriptor, errors } = parseSfc(code, { filename: 'x.vue' })
  if (errors && errors.length) return { text: '', parseFailed: true }
  return {
    text: [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join('\n'),
    parseFailed: false,
  }
}

function extractSpecifiers(code, filePath) {
  const isVue = filePath.endsWith('.vue')
  let text = code
  if (isVue) {
    const r = scriptTextOfVue(code)
    if (r.parseFailed) return { specs: [], parseFailed: true }
    text = r.text
  }
  if (!text.trim()) return { specs: [], parseFailed: false }

  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, false, kind)
  const specs = []
  const push = (name) => {
    if (typeof name !== 'string' || !name) return
    specs.push(name)
  }

  const visit = (node) => {
    // import ... from 'x' （含 import type）
    if (ts.isImportDeclaration(node)) {
      if (!node.importClause?.isTypeOnly) push(node.moduleSpecifier?.text)
    } else if (ts.isExportDeclaration(node)) {
      // export ... from 'x' （含 export type）
      if (!node.isTypeOnly) push(node.moduleSpecifier?.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      // 动态 import('x')
      push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { specs, parseFailed: false }
}

// ---- 3. 解析路径 ----
const RESOLVE_SUFFIXES = ['', '.ts', '.tsx', '.vue', '/index.ts', '/index.tsx', '/index.vue']

function resolveSpecifier(spec, fromFile) {
  if (!spec || NON_SOURCE_PREFIXES.some((p) => spec.startsWith(p))) return null
  if (ASSET_EXTS.some((e) => spec.endsWith(e))) return null

  let base = null
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec)
  else return null // 裸包名 / 虚拟模块 → 交给打包器

  for (const suf of RESOLVE_SUFFIXES) {
    const cand = base + suf
    if (existsSync(cand) && statSync(cand).isFile()) {
      // 显式带 .ts 后缀时 base 已是文件，避免再拼出 x.ts.ts
      if (suf === '' && !SOURCE_EXTS.includes(extname(cand))) return null
      return cand
    }
  }
  return null
}

// ---- 4. 建图 ----
const files = collect(SRC)
const fileSet = new Set(files)
const graph = new Map()
const unresolved = new Map()
let parseFailures = 0
let edgeCount = 0

for (const f of files) {
  const code = readFileSync(f, 'utf-8')
  const { specs, parseFailed } = extractSpecifiers(code, f)
  if (parseFailed) {
    parseFailures++
    console.error(`PARSE-ERR ${rel(f)}`)
    continue
  }
  const deps = new Set()
  for (const s of specs) {
    const target = resolveSpecifier(s, f)
    if (target && fileSet.has(target)) {
      deps.add(target)
      edgeCount++
    } else if (target === null && s.startsWith('.')) {
      if (!unresolved.has(f)) unresolved.set(f, [])
      unresolved.get(f).push(s)
    }
  }
  graph.set(f, deps)
}

// ---- 5. 找环（三色 DFS，找到即记录下来） ----
const WHITE = 0, GRAY = 1, BLACK = 2
const color = new Map(files.map((f) => [f, WHITE]))
const stack = []
const cycles = []
const seenCycleKeys = new Set()

function canonicalNames(cycle) {
  const names = cycle.map(rel)
  let best = 0
  for (let i = 1; i < names.length; i++) if (names[i] < names[best]) best = i
  return [...names.slice(best), ...names.slice(0, best)]
}

/** 环的可读展示：A → B → C → A（首尾闭合，且轮转到字典序最小者起头） */
function formatCycle(cycle) {
  const names = canonicalNames(cycle)
  return [...names, names[0]].join(' → ')
}

function dfs(node) {
  color.set(node, GRAY)
  stack.push(node)
  for (const next of graph.get(node) || []) {
    if (color.get(next) === GRAY) {
      const start = stack.indexOf(next)
      const cycle = stack.slice(start)
      const key = canonicalNames(cycle).join(' → ')
      if (!seenCycleKeys.has(key)) {
        seenCycleKeys.add(key)
        cycles.push(cycle)
      }
    } else if (color.get(next) === WHITE) {
      dfs(next)
    }
  }
  stack.pop()
  color.set(node, BLACK)
}

for (const f of files) if (color.get(f) === WHITE) dfs(f)

// ---- 6. 与基线比对 ----
const baseline = loadBaseline()
const formatted = cycles.map((c) => ({ key: formatCycle(c), cycle: c }))
const known = formatted.filter((c) => baseline.has(c.key))
const fresh = formatted.filter((c) => !baseline.has(c.key))
const foundKeys = new Set(formatted.map((c) => c.key))
const staleBaseline = [...baseline].filter((k) => !foundKeys.has(k))

// ---- 7. 更新基线（--update-baseline）----
if (UPDATE_BASELINE) {
  const next = {
    $comment: existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')).$comment : [],
    cycles: formatted.map((c) => c.key).sort(),
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n')
  console.log(`已更新基线：${BASELINE_PATH}`)
  console.log(`现存环 ${formatted.length} 个已全部登记。请同时在 $comment 里说明登记原因。`)
  process.exit(0)
}

// ---- 8. 输出 ----
const header = `循环依赖闸门 · 扫描 ${files.length} 个文件 / ${edgeCount} 条静态导入边${INCLUDE_TESTS ? '（含测试文件）' : '（已排除 __tests__ 与 *.test/spec）'}`

if (AS_JSON) {
  console.log(JSON.stringify({
    files: files.length,
    edges: edgeCount,
    parseFailures,
    known: known.map((c) => c.key),
    fresh: fresh.map((c) => c.key),
    staleBaseline,
    unresolvedUnresolvedCount: unresolved.size,
  }, null, 2))
} else {
  console.log(header)

  if (parseFailures > 0) console.error(`⚠️  ${parseFailures} 个文件解析失败（见上方 PARSE-ERR）`)

  if (VERBOSE && unresolved.size) {
    console.log(`\nℹ️  未解析的相对说明符（多为 ?raw / 虚拟模块，不计为环，共 ${unresolved.size} 个文件）：`)
    for (const [f, list] of unresolved) console.log(`   ${rel(f)}: ${[...new Set(list)].join(', ')}`)
  }

  if (fresh.length > 0) {
    console.log(`\n✗ 发现 ${fresh.length} 个**新增**循环依赖：`)
    fresh.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}. ${c.key}`))
    console.log('\n环意味着模块初始化顺序不确定，运行期可能拿到 undefined。')
    console.log('请打断环（提取公共依赖 / 依赖注入 / 把 barrel 换成直接导入）。')
    console.log('确需放行才用：node scripts/gates/check-circular-deps.mjs --update-baseline（并在 $comment 写明原因）')
  } else {
    console.log('✓ 无新增循环依赖')
  }

  if (known.length > 0) {
    console.log(`\nℹ️  基线内已知环 ${known.length} 个（已登记放行，建议排期打断）：`)
    if (VERBOSE || fresh.length > 0) known.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}. ${c.key}`))
    else console.log('   用 --verbose 查看明细；清单见 scripts/gates/circular-baseline.json')
  }

  if (staleBaseline.length > 0) {
    console.log(`\n♻️  基线里有 ${staleBaseline.length} 个环已消失（干得漂亮），可运行 --update-baseline 清理：`)
    staleBaseline.forEach((k) => console.log(`  - ${k}`))
  }
}

process.exit(fresh.length === 0 && parseFailures === 0 ? 0 : 1)
