// ============================================================
// 功能词典 · 幕僚「搜索词加强」
// ----------------------------------------------------------
// 用户反馈：「幕僚搜索词加强，比如我要记账告诉我没有这个功能？」
// 根因之一是意图解析只认硬编码的 NAV_TARGETS，命中不了就干巴巴回落 general。
//
// 本模块在**运行时**从真实数据源生成一份功能词典（不手写副本，避免过期）：
//   1) NAV_TARGETS  目的地别名（调令「打开 X」的跳转表）
//   2) router       真实路由表（path + meta.title 中文名，自动过滤 :id 动态段）
//   3) room-graph   房间图（path / name / id）
// 并提供轻量模糊搜索：双向包含 + 最长公共子串（零第三方依赖，符合宪法·本地私有）。
// ============================================================

import { getAllRooms } from '../../engine/room-graph'

// ------------------------------------------------------------
// 路由表来源：可注入，不静态 import router 实例。
//
// 原因（真机踩坑，勿回退）：router/index.ts 在模块顶层就执行 createRouter()，
// 一旦本文件静态 import 它，任何引用到 featureDictionary 的模块图都会带上
// 这个副作用 —— 于是只 mock 了 useRouter / useRoute 的测试会因「vue-router
// mock 里没有 createRouter」整片崩掉（曾一次挂掉 EmotionGarden / timeline /
// TimeArchivePanel 等 5 个文件共 37 条用例）。
//
// 生产由 main.ts 注入真实路由表；未注入时降级为空，其余两源（目的地别名表、
// 房间图）照常工作，不会让调用方崩。
// ------------------------------------------------------------
export interface RouteInfoLike {
  path: string
  name?: string | symbol | null
  meta?: { title?: unknown }
}

let routeSource: (() => RouteInfoLike[]) | null = null

/** 注入路由表来源（生产在 main.ts 调用）；传 null 可撤销注入 */
export function setRouteSource(fn: (() => RouteInfoLike[]) | null): void {
  routeSource = fn
  entriesCache = null
}

export interface NavTarget {
  /** 目的地别名（用户可能说法） */
  keys: string[]
  /** 真实路由 */
  route: string
  /** 中文空间名 */
  name: string
}

/** 目的地别名 → 路由（调令「打开 X」的真实跳转目标） */
export const NAV_TARGETS: NavTarget[] = [
  { keys: ['殿堂设置', '设置', '偏好'], route: '/settings', name: '殿堂设置' },
  { keys: ['房间管理', '房间'], route: '/room-manager', name: '房间管理' },
  { keys: ['幕僚阁', '幕僚', '顾问', '管家'], route: '/advisors', name: '幕僚阁' },
  { keys: ['时间长廊', '时间廊'], route: '/time-corridor', name: '时间长廊' },
  { keys: ['锚点庭院'], route: '/anchor', name: '锚点庭院' },
  { keys: ['成长花园', '成长庭院', '花园'], route: '/growth-garden', name: '成长花园' },
  { keys: ['情绪花房', '花房'], route: '/garden', name: '情绪花房' },
  { keys: ['知识殿堂', '经略'], route: '/knowledge', name: '知识殿堂' },
  { keys: ['殿堂辞典', '辞典', '字典'], route: '/dictionary', name: '殿堂辞典' },
  // 财务 / 记账：项目里真实存在的是 /reward「劳酬」（记账 v2：多账户 / 预算预警 /
  // 支出流水 / 月结单 / CSV 导入，见 src/views/Reward.vue 与 src/modules/reward/*）。
  // 没有 /accounting 之类的虚构路由 —— 这里指向的就是真实的那一个。
  { keys: ['记账', '账本', '财务', '劳酬', '算账'], route: '/reward', name: '劳酬' },
  { keys: ['引力场', '首页', '回家'], route: '/', name: '引力场' },
]

/** 词典条目：一个可跳转的功能/空间，带若干可匹配的说法 */
export interface FeatureEntry {
  route: string
  name: string
  keys: string[]
}

/** 搜索命中结果 */
export interface FeatureHit {
  route: string
  name: string
  /** 0–1，越大越相近 */
  score: number
  /** 命中的那个说法（用于回复里说明「为什么是它」） */
  matched: string
}

/** 直接跳转的判定阈值：query 里出现完整说法，且说法占 query 的比例不低于此值 */
const DIRECT_JUMP_RATIO = 0.8
/** 进入候选建议的最低分（低于此值视为不相干） */
const SUGGEST_MIN_SCORE = 0.5

function addKey(keys: Set<string>, key: string): void {
  const k = (key || '').trim()
  // 单字/空串不参与匹配，否则「的」「了」这类高频字会把所有条目都拉进候选
  if (k.length < 2) return
  keys.add(k)
}

let entriesCache: FeatureEntry[] | null = null

/**
 * 运行时生成功能词典（NAV_TARGETS ∪ 真实路由表 ∪ 房间图），按 route 去重。
 * 结果缓存；词典内容只随代码变化，不必每次调令重建。
 */
export function getFeatureEntries(): FeatureEntry[] {
  if (entriesCache) return entriesCache

  const byRoute = new Map<string, Set<string>>()
  const byRouteName = new Map<string, string>()
  const ensure = (route: string, name: string): Set<string> => {
    let keys = byRoute.get(route)
    if (!keys) {
      keys = new Set<string>()
      byRoute.set(route, keys)
    }
    if (name && !byRouteName.get(route)) byRouteName.set(route, name)
    return keys
  }

  // 1) 目的地别名表
  for (const t of NAV_TARGETS) {
    const keys = ensure(t.route, t.name)
    addKey(keys, t.name)
    for (const k of t.keys) addKey(keys, k)
  }

  // 2) 真实路由表（剔除带 :param 的动态路由，那不是可直接跳转的落地页）
  //    未注入路由源时降级为空，其余两源照常工作
  for (const r of routeSource?.() ?? []) {
    const path = r.path
    if (!path || path.includes(':')) continue
    const title = typeof r.meta?.title === 'string' ? r.meta.title : ''
    const name = title || (typeof r.name === 'string' ? r.name : path)
    const keys = ensure(path, name)
    addKey(keys, name)
    if (typeof r.name === 'string' && r.name !== name) addKey(keys, r.name)
    // path 段（如 reward / growth-garden）便于英文/半截输入命中
    addKey(keys, path.replace(/^\//, ''))
  }

  // 3) 房间图（补充路由表里没有标题的房间名）
  for (const room of getAllRooms()) {
    if (!room.path || room.path.includes(':')) continue
    const keys = ensure(room.path, room.name)
    addKey(keys, room.name)
    addKey(keys, room.id)
  }

  entriesCache = [...byRoute.entries()].map(([route, keys]) => ({
    route,
    name: byRouteName.get(route) ?? route,
    keys: [...keys],
  }))
  return entriesCache
}

/** 最长公共子串长度（中文轻量模糊匹配，不引第三方依赖） */
function longestCommonSubstring(a: string, b: string): number {
  let best = 0
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      let n = 0
      while (i + n < a.length && j + n < b.length && a[i + n] === b[j + n]) n++
      if (n > best) best = n
    }
  }
  return best
}

/**
 * 单条说法与查询的相似度（0–1）：
 *   完全相等 1.0 > 双向包含 0.6–1.0 > 公共子串模糊 0–0.5
 */
function scoreKey(query: string, key: string): number {
  if (!key || !query) return 0
  if (query === key) return 1
  if (query.includes(key)) return 0.6 + 0.4 * (key.length / query.length)
  if (key.includes(query)) return 0.6 + 0.4 * (query.length / key.length)
  // 模糊：公共子串占较短串的比例，打折到 0.5 以下，优先级低于任何包含命中
  const lcs = longestCommonSubstring(query, key)
  if (lcs < 2) return 0
  return 0.5 * (lcs / Math.min(query.length, key.length))
}

/**
 * 在功能词典里模糊搜索。按 route 去重（同一空间只出一次），按分数降序。
 * @param query 用户输入
 * @param limit 返回条数上限
 */
export function searchFeatures(query: string, limit = 3): FeatureHit[] {
  const q = (query || '').trim()
  if (q.length < 2) return []

  const best = new Map<string, FeatureHit>()
  for (const entry of getFeatureEntries()) {
    let top = 0
    let matched = ''
    for (const key of entry.keys) {
      const s = scoreKey(q, key)
      if (s > top) {
        top = s
        matched = key
      }
    }
    if (top < SUGGEST_MIN_SCORE) continue
    const prev = best.get(entry.route)
    if (!prev || top > prev.score) {
      best.set(entry.route, { route: entry.route, name: entry.name, score: top, matched })
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
    .slice(0, limit)
}

/**
 * 是否可以「直接跳转」：查询里出现了一个完整的功能说法，且该说法占了查询主体
 * （'房间管理'→跳；'安排房间' 里只有 '房间' 二字、占比不足 → 不跳，只给建议）。
 */
export function pickDirectJump(query: string, hits: FeatureHit[]): FeatureHit | null {
  const q = (query || '').trim()
  if (q.length < 2 || hits.length !== 1) return null
  const hit = hits[0]
  if (!q.includes(hit.matched) && !hit.matched.includes(q)) return null
  const ratio = Math.min(q.length, hit.matched.length) / Math.max(q.length, hit.matched.length)
  return ratio >= DIRECT_JUMP_RATIO ? hit : null
}

/** 「找不到」时给用户的功能清单提示（取词典前若干项，运行时生成） */
export function buildFeatureHint(max = 10): string {
  const names = getFeatureEntries()
    .map((e) => e.name)
    .filter((n) => !!n && n.length <= 6)
    .slice(0, max)
  return names.join(' · ')
}

/** 仅供测试/调试：清空缓存（词典内容只随代码变化，正常运行时无需调用） */
export function resetFeatureDictionaryCache(): void {
  entriesCache = null
}
