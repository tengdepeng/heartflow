#!/usr/bin/env node
// ============================================================
// 房间接线闸门（自研）
//
// 起因（2026-10-01 真机/静态审计发现的两个真实故障，均已修复）：
//  1) 默认「按领域」导航把 72/75 个房间全塞进「系统 · 安全」——
//     因为 room-graph 里只有 2 个房间写了 domain，而 App.vue 的 dimKey
//     兜底是 `effDomain(r) ?? (r.isMainPath ? 'time' : 'system')`。
//     → 新增房间忘了写 domain 就会悄悄重现，故本闸门把「缺 domain」列为硬失败。
//  2) `/automation` 挂的其实是「自律工坊」，真正的「自动化工坊」却在
//     `/automation-workshop`，URL / 名字 / 内容三者交叉错位。
//     → 故本闸门把「别名指向错位」「有房间图无路由」列为硬失败。
//
// 检查项（硬失败，exit 1）：
//   H1 房间缺 domain
//   H2 room id 或 path 重复
//   H3 有房间图条目但无对应路由（点进去会空）
//   H4 口语别名错位（别名 == 另一个房间的正式名 → 会跳错房间）
//
// 检查项（基线豁免，新增即报错）：
//   B1 有路由但无房间图条目（不进侧栏；多数为子页/编辑器/管理工具，已有站内入口）
//   B2 views/*.vue 未注册路由（少数为 Tauri 浮窗 / 插件壳，非页面）
//
// 刻意**不**检查：
//   「房间正式名是否登记进 roomResolver」——resolveRoomRoute() 第 2 步会拿
//   getAllRooms() 做 name 精准匹配，第 3 步做 id 匹配，正式名天然可搜到。
//   ROOM_ALIASES 只负责口语别名。曾误判为缺口，故在此留档，别再补无效别名。
//
// 用法：node scripts/gates/check-room-wiring.mjs [--json] [--update-baseline]
// 退出码：0 = 通过；1 = 硬失败或出现新増未登记项
// ============================================================

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const BASELINE_FILE = path.join(ROOT, 'scripts/gates/room-wiring-baseline.json')

const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '')

// ---------- 解析 room-graph ----------
const rgText = readIf(path.join(SRC, 'engine/room-graph.ts'))
const rooms = []
const blockRe = /^ {2}'?([a-zA-Z0-9-]+)'?: \{([\s\S]*?)^ {2}\},?$/gm
for (const m of rgText.matchAll(blockRe)) {
  const [, id, body] = m
  const grab = (k) => {
    const mm = new RegExp(`${k}: '([^']*)'`).exec(body)
    return mm ? mm[1] : undefined
  }
  const p = grab('path')
  if (!p) continue
  rooms.push({ id, path: p, name: grab('name'), domain: grab('domain') })
}

// ---------- 解析 router ----------
const rtText = readIf(path.join(SRC, 'router/index.ts'))
const routes = new Map()
const routeRe = /path: '(\/[a-zA-Z0-9\-/:]*)',\s*\n\s*(?:name: '([A-Za-z0-9-]+)',\s*\n\s*)?component: \(\) => import\('([^']+)'\)/g
for (const m of rtText.matchAll(routeRe)) routes.set(m[1], { name: m[2] || '', file: m[3] })

// ---------- 解析 roomResolver 别名 ----------
const rrText = readIf(path.join(SRC, 'modules/mirror/roomResolver.ts'))
const aliasByPath = new Map()
for (const m of rrText.matchAll(/^\s*'([^']+)': '(\/[a-zA-Z0-9-]+)',$/gm)) {
  const [, alias, p] = m
  if (!aliasByPath.has(p)) aliasByPath.set(p, [])
  aliasByPath.get(p).push(alias)
}

// ---------- views ----------
const viewsDir = path.join(SRC, 'views')
const views = fs.readdirSync(viewsDir).filter((f) => f.endsWith('.vue'))
const routedFiles = new Set([...routes.values()].map((r) => path.basename(r.file)))

const errors = []
const roomPaths = new Set(rooms.map((r) => r.path))

// H1 缺 domain
for (const r of rooms) {
  if (!r.domain) errors.push(`[H1] 房间缺 domain（会从默认「按领域」导航掉落）：${r.id} (${r.name}) → ${r.path}`)
}

// H2 id / path 重复
const seenId = new Map()
const seenPath = new Map()
for (const r of rooms) {
  if (seenId.has(r.id)) errors.push(`[H2] room id 重复：${r.id}`)
  seenId.set(r.id, true)
  if (seenPath.has(r.path)) errors.push(`[H2] room path 重复：${r.path}（${seenPath.get(r.path)} 与 ${r.id}）`)
  seenPath.set(r.path, r.id)
}

// H3 有房间图无路由
for (const r of rooms) {
  if (!routes.has(r.path)) errors.push(`[H3] 有房间图但无路由（点了会空）：${r.id} → ${r.path}`)
}

// H4 别名错位
for (const [p, aliases] of aliasByPath) {
  for (const a of aliases) {
    for (const r of rooms) {
      if (r.path !== p && r.name && r.name === a) {
        errors.push(`[H4] 别名「${a}」指向 ${p}，但它实际是房间 ${r.name} (${r.path})`)
      }
    }
  }
}

// B1 / B2 基线豁免
const baseline = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : { routesWithoutRoom: [], viewsWithoutRoute: [] }
const allow = (list, key) => new Set((list?.[key] || []).map((x) => (typeof x === 'string' ? x : x.path ?? x.file)))

const allowedRoutes = allow(baseline, 'routesWithoutRoom')
const allowedViews = allow(baseline, 'viewsWithoutRoute')

const newRoutes = []
for (const p of routes.keys()) {
  if (!roomPaths.has(p) && !allowedRoutes.has(p)) newRoutes.push(p)
}
const newViews = []
for (const v of views) {
  if (!routedFiles.has(v) && !allowedViews.has(v)) newViews.push(v)
}

const json = process.argv.includes('--json')
const ok = errors.length === 0 && newRoutes.length === 0 && newViews.length === 0

if (process.argv.includes('--update-baseline')) {
  const next = {
    $comment: '仅在确认「该路由/视图确实不需要房间图条目或路由注册」后，手动运行 node scripts/gates/check-room-wiring.mjs --update-baseline 更新。',
    routesWithoutRoom: [...new Set([...routes.keys()].filter((p) => !roomPaths.has(p)))]
      .sort()
      .map((p) => ({ path: p, note: 'TODO：填写为何不需要房间图条目' })),
    viewsWithoutRoute: views.filter((v) => !routedFiles.has(v)).sort(),
  }
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n', 'utf8')
  console.log('基线已更新：' + path.relative(ROOT, BASELINE_FILE))
  process.exit(0)
}

if (json) {
  console.log(JSON.stringify({ rooms: rooms.length, routes: routes.size, errors, newRoutes, newViews }, null, 2))
} else {
  console.log(`房间接线闸门 · 房间图 ${rooms.length} · 路由 ${routes.size} · 别名 ${[...aliasByPath.values()].reduce((a, b) => a + b.length, 0)} 条`)
  for (const e of errors) console.log('  ✗ ' + e)
  for (const p of newRoutes) console.log(`  ✗ [B1] 新增「有路由无房间图」，请接线或登记基线：${p}`)
  for (const v of newViews) console.log(`  ✗ [B2] 新增「视图未注册路由」，请接线或登记基线：${v}`)
  if (ok) console.log('✓ 房间接线全部合规')
}

process.exit(ok ? 0 : 1)
