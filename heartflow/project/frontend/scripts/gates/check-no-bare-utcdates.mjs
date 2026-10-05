#!/usr/bin/env node
// ============================================================
// 禁裸 UTC 切日闸门（自研）
//
// 起因（2026-10-03 / 2026-10-04 实证盘点，详见 借鉴分析/当前缺口复核-2026-10-03.md §6.5）：
//   全仓 2452 处 toISOString()，其中约 342 处生产代码（AST 实测，非 grep 臆测）
//   把 UTC ISO 字符串硬切成「YYYY-MM-DD」当业务日期键，例如：
//     new Date(ts).toISOString().slice(0, 10)
//     new Date().toISOString().split('T')[0]
//     record.createdAt.split('T')[0]          // 连 toISOString 都没调，直接切存好的 UTC 时间戳
//   在 UTC+8 下，本地 00:00–08:00 发生的记录会被算到「前一天」，直接污染所有
//   「今日 / 连续天数 / 热力图 / 分组」类统计。官方口径是 utils/time.ts 的
//   getLocalDateKey()（getFullYear/getMonth/getDate，注释明写不可用 UTC 切日）。
//
// 本闸门只做一件事：**禁止新增**裸 UTC 切日写法。存量 342 处登记进 baseline 有意例外，
// 由后续「按域分批迁移」计划慢慢消化（每批配反向验证 + 定向回归，见 skill
// utc-date-key-migration）。闸门不阻止存量，但任何不在 baseline 内的新匹配立即红灯。
//
// 覆盖的形态（五类都是「取 UTC 日期/月日期键」的缺陷签名）：
//   A. toISOString().slice(0, 10) / toISOString().substring(0, 10)  （含空格变体）
//   B. toISOString().split('T')[0]
//   C. 独立 .split('T')[0]   —— 切已经存好的 UTC 时间戳字符串
//   D. 时间戳属性 .slice(0,10) / .substring(0,10)（2026-10-05 补）
//      如 w.createdAt.slice(0,10)、m.timestamp.substring(0,10)。
//      D 类此前完全漏检，实测全库 79 处 / 55 文件。必须用属性名白名单，
//      否则会误伤 text.slice(0,10) 这类普通字符串截断。
//   E. 月键 .slice(0,7) / .substring(0,7)（2026-10-05 补）
//      如 new Date().toISOString().slice(0,7)、r.at.slice(0,7)、
//      note.createdAt.slice(0,7)。月键在 UTC+8 下同样错月：本地 00:00-08:00
//      的记录会被算进「上个月」，污染月视图 / 月报 / 预算 / 对账单分组。
//      实测全库 74 处 / 47 文件，属性白名单实测零噪声。
//      ⚠️ 白名单**刻意不含** today / date / d 这类裸变量名：实证
//      HabitReminderPanel.vue:75 的 today 本来就是本地键
//      （getFullYear/getMonth/getDate 拼的），today.slice(0,7) 无害；
//      meditation-analytics 的 date 是入参、口径由调用方决定。
//      裸变量只收语义上只可能是 UTC 时间戳串的 iso/createdAt/.../at/raw。
//   注意：单纯的 toISOString()（如存 createdAt 跨设备序列化）不是缺陷，不拦截。
//
// 基线结构（scripts/gates/no-bare-utcdates-baseline.json）：
//   { "$comment": "...", "violations": { "<relpath>": ["归一化片段", ...], ... } }
//   以「去空白归一化的违规片段」为身份，对行号漂移鲁棒；同一文件里新增一个
//   不同的违规片段（哪怕文件已在基线内）也会被抓到。
//
// 用法：node scripts/gates/check-no-bare-utcdates.mjs [--include-tests] [--json] [--update-baseline]
// 退出码：0 = 无新增裸切日；1 = 出现新增裸切日 / 基线解析失败
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative, extname } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = path.join(ROOT, 'src')
const BASELINE_FILE = path.join(ROOT, 'scripts', 'gates', 'no-bare-utcdates-baseline.json')

const args = process.argv.slice(2)
const INCLUDE_TESTS = args.includes('--include-tests')
const AS_JSON = args.includes('--json')
const UPDATE_BASELINE = args.includes('--update-baseline')

// 四类缺陷签名。全局正则，逐行非全局匹配用。
const BARE_CUT_RE = /toISOString\(\)\s*\.(?:slice|substring)\s*\(\s*0\s*,\s*10\s*\)|toISOString\(\)\s*\.split\s*\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]|\.split\s*\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]/

// 形态 D（2026-10-05 补）：**时间戳属性**直接切日期键，全程不出现 toISOString ——
//   w.createdAt.slice(0, 10) / m.timestamp.substring(0,10) / s.recordedAt.slice(0, 10)
// 此前完全漏检。白名单过滤后实测新增 54 段 / 30 文件（未加白名单的裸正则
// 会命中 79 段 / 55 文件，多出的部分是 text/title.slice(0,10) 这类普通截断噪声）。
//   其中 `w.createdAt.slice(0,10)` 连 `toISOString` 都没有，是最隐蔽的一类：
//   读者容易以为「这是从已存好的字符串切」就没问题，实际存的正是 UTC ISO 时间戳。
//
// ⚠️ 必须用**属性名白名单**而不是通用 `X.slice(0,10)`，否则会误伤
// `text.slice(0,10)` / `title.slice(0,10)` 这类普通字符串截断（实测会命中几十处噪声）。
// 白名单只收「语义上确定为 ISO 时间戳」的字段名。
const TS_FIELD = [
  'at', 'createdAt', 'updatedAt', 'recordedAt', 'timestamp', 'iso',
  'startedAt', 'completedAt', 'sentAt', 'pushedAt', 'assessedAt',
  'startTime', 'endTime', 'lastModified', 'importDate', 'unlockedAt', 'doneAt',
  'dateStr', 'dayKey', 'raw',
].join('|')
const TS_SLICE_RE = new RegExp(
  `\\b(?:${TS_FIELD})\\s*\\.\\s*(?:slice|substring)\\s*\\(\\s*0\\s*,\\s*10\\s*\\)`,
)

// 形态 E（2026-10-05 补）：月键 —— 把 UTC ISO 切到「YYYY-MM」当月份分组键。
//   与日键同病，只是切 7 位。属性侧＝时间戳/日期属性；裸变量侧＝只可能是
//   UTC 时间戳串的短名（iso/createdAt/recordedAt/.../at/raw）。
// ⚠️ TS_FIELD 本身就是 .join('|') 拼出来的字符串，这里**只能插值不能展开**：
//     [...TS_FIELD] 会把字符串逐字符摊开，正则退化成 a|t|c|r|e... 导致乱抓。
const MONTH_FIELD = `${TS_FIELD}|date|ym|monthKey|monthStr|curMonth|currentMonth|periodKey|startDate|endDate|checkinDate|finishDate|sunkAt`
const BARE_MONTH_VAR = ['iso', 'createdAt', 'recordedAt', 'updatedAt', 'timestamp', 'at', 'raw'].join('|')
const TS_MONTH_RE = new RegExp(
  `\\b(?:${MONTH_FIELD}|${BARE_MONTH_VAR})\\s*\\.\\s*(?:slice|substring)\\s*\\(\\s*0\\s*,\\s*7\\s*\\)`,
)
// E1：任意接收者的 toISOString().slice(0, 7)（含 today.toISOString().slice(0, 7)）
const ISO_MONTH_RE = /toISOString\(\)\s*\.\s*(?:slice|substring)\s*\(\s*0\s*,\s*7\s*\)/

/** 逐行匹配 A~E 各形态签名；返回命中的原始片段 */
function matchLine(line) {
  return (
    line.match(BARE_CUT_RE) ||
    line.match(TS_SLICE_RE) ||
    line.match(ISO_MONTH_RE) ||
    line.match(TS_MONTH_RE)
  )
}

/** 去空白归一化：slice(0, 10) 与 slice(0,10) 视为同一身份，降低空格导致的误报 */
const norm = (s) => s.replace(/\s+/g, '')

function rel(p) {
  return relative(ROOT, p).replace(/\\/g, '/')
}

function isTestFile(p) {
  const r = rel(p)
  return r.includes('/__tests__/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(r)
}

/** 收集待扫描文件（与 circular 闸门同惯例：跳过 node_modules / 点目录 / .d.ts） */
function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      collect(full, out)
      continue
    }
    const ext = extname(entry.name)
    if (!['.ts', '.tsx', '.vue'].includes(ext)) continue
    if (entry.name.endsWith('.d.ts')) continue
    if (!INCLUDE_TESTS && isTestFile(full)) continue
    out.push(full)
  }
  return out
}

/** 逐行扫描，返回 { "<relpath>": Map<normSegment, { raw, line }> } */
function scan() {
  const files = collect(SRC)
  const result = new Map()
  let scanned = 0
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf-8')
    const lines = code.split('\n')
    const perFile = new Map()
    lines.forEach((line, idx) => {
      const m = matchLine(line)
      if (m) {
        const raw = m[0]
        const key = norm(raw)
        if (!perFile.has(key)) perFile.set(key, { raw, line: idx + 1 })
      }
    })
    if (perFile.size > 0) result.set(rel(f), perFile)
    scanned++
  }
  return { scanned, result }
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return { $comment: '', violations: {} }
  try {
    const data = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'))
    return { $comment: data.$comment || '', violations: data.violations || {} }
  } catch (e) {
    console.error(`⚠️  基线文件解析失败，按空基线处理：${e.message}`)
    return { $comment: '', violations: {} }
  }
}

// ---------- 执行 ----------
const { scanned, result } = scan()
const baseline = loadBaseline()
const baseViolations = baseline.violations || {}

// 计算新增：当前片段不在该文件基线内
const newViolations = []
for (const [file, segMap] of result) {
  const baseSet = new Set((baseViolations[file] || []).map(norm))
  for (const [key, info] of segMap) {
    if (!baseSet.has(key)) newViolations.push({ file, raw: info.raw, line: info.line, key })
  }
}
// 统计基线规模（用于提示）
const baselineTotal = Object.values(baseViolations).reduce((a, arr) => a + arr.length, 0)
const baselineFiles = Object.keys(baseViolations).length

// ---------- --update-baseline ----------
if (UPDATE_BASELINE) {
  const nextViolations = {}
  for (const [file, segMap] of result) {
    nextViolations[file] = [...segMap.keys()].sort()
  }
  const next = {
    $comment:
      baseline.$comment ||
      '存量裸 UTC 切日（toISOString().slice(0,10) / .split(\'T\')[0] 取日期键），经 2026-10-04 实证盘点确认共 ' +
        baselineTotal +
        ' 处，均为待迁移存量。本闸门只防新增：任何不在本基线内的新匹配即红灯。迁移一批就手动从 violations 删对应条目（不要整体 --update-baseline，以免把新增也一并登记）。官方替换写法：utils/time.ts 的 getLocalDateKey()。',
    violations: nextViolations,
  }
  const seededTotal = Object.values(nextViolations).reduce((a, arr) => a + arr.length, 0)
  const seededFiles = Object.keys(nextViolations).length
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n', 'utf-8')
  console.log(`已播种基线：${rel(BASELINE_FILE)}`)
  console.log(`现存裸切日 ${seededTotal} 处 / ${seededFiles} 个文件，已全部登记为有意例外（待迁移）。`)
  process.exit(0)
}

// ---------- 输出 ----------
const ok = newViolations.length === 0

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        scanned,
        baselineFiles,
        baselineTotal,
        newViolations,
      },
      null,
      2,
    ),
  )
} else {
  console.log(
    `禁裸 UTC 切日闸门 · 扫描 ${scanned} 个文件（${INCLUDE_TESTS ? '含测试' : '已排除 __tests__ 与 *.test/spec'}）· 基线存量 ${baselineTotal} 处 / ${baselineFiles} 文件`,
  )
  if (newViolations.length > 0) {
    console.log(`\n✗ 发现 ${newViolations.length} 处**新增**裸 UTC 切日（不在基线内）：`)
    newViolations.forEach((v, i) => {
      console.log(`  ${String(i + 1).padStart(3)}. ${v.file}:${v.line}  ${v.raw}`)
    })
    console.log('\n请改用 utils/time.ts 的 getLocalDateKey(new Date(x)) 取本地日历日。')
    console.log('确需放行（存量迁移尚未覆盖）才手动加进 no-bare-utcdates-baseline.json 的 violations。')
  } else {
    console.log('✓ 无新增裸 UTC 切日（存量均在基线内，由迁移计划消化）')
  }
}

process.exit(ok ? 0 : 1)
