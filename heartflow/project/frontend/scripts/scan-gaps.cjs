// 全模块扫描：找出零外部引用的 useXxx 组合式函数
const fs = require('fs')
const path = require('path')

const roots = {
  modules: 'src/modules',
  components: 'src/components',
  views: 'src/views',
}

function walk(dir, ext) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, ext))
    else if (e.name.endsWith(ext)) out.push(p)
  }
  return out
}

const moduleFiles = walk(roots.modules, '.ts')
const componentFiles = walk(roots.components, '.vue')
const viewFiles = walk(roots.views, '.vue')

// 收集所有模块文件内容
const moduleContents = new Map()
for (const f of moduleFiles) moduleContents.set(f, fs.readFileSync(f, 'utf8'))

// 找出所有 export function useXxx
const fns = new Map() // fn -> defining file
for (const [f, c] of moduleContents) {
  const re = /export function (use[A-Za-z0-9_]+)/g
  let m
  while ((m = re.exec(c))) fns.set(m[1], f)
}

// 统计每个函数的引用（排除定义文件自身）
const results = []
for (const [fn, defFile] of fns) {
  const re = new RegExp(`\\b${fn}\\b`, 'g')
  let count = 0
  const where = []
  // 检查所有模块文件
  for (const [f, c] of moduleContents) {
    if (f === defFile) continue
    if (re.test(c)) { count++; if (where.length < 3) where.push(f.replace('src/modules/', 'mod:')) }
  }
  // 检查组件和视图
  for (const f of [...componentFiles, ...viewFiles]) {
    const c = fs.readFileSync(f, 'utf8')
    if (re.test(c)) { count++; if (where.length < 3) where.push(f.replace('src/', '')) }
  }
  if (count === 0) {
    results.push({ fn, def: defFile.replace('src/modules/', '') })
  }
}

console.log('=== 零外部引用的 useXxx 组合式函数 ===')
for (const r of results.sort((a, b) => a.def.localeCompare(b.def))) {
  console.log(`${r.fn}\t${r.def}`)
}
console.log(`\n共 ${results.length} 个`)
