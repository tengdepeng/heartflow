// ============================================================
// 文明根系 · 文明档案分析引擎（traditions-analytics）
// 从每一条技艺、仪式与民俗的记录里，读出「文明」的余温。
// 档案概览、类别分布（技艺/仪式）、来源分布、地域分布、
// 实践节律、文明健康、温和洞察与高频标签。
// 全纯函数、本地计算、零网络出口，接受 now 以保证时间可测试。
// ============================================================

import type { FolkloreEntry, CraftCategory, RitualType } from './types'

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

const DAY = 24 * 60 * 60 * 1000

// ---- 元数据 ----

export const CRAFT_META: Record<CraftCategory, { label: string; icon: string; color: string }> = {
  handicraft: { label: '手工艺', icon: '🧺', color: '#c49a6a' },
  culinary: { label: '烹饪', icon: '🍚', color: '#d09a5a' },
  textile: { label: '纺织', icon: '🧵', color: '#b86a8a' },
  woodwork: { label: '木工', icon: '🪚', color: '#a0784a' },
  metalwork: { label: '金工', icon: '⚒', color: '#7a7a8a' },
  ceramic: { label: '陶瓷', icon: '🏺', color: '#a08aa8' },
  painting: { label: '绘画', icon: '🖌', color: '#d08a5a' },
  music: { label: '音乐', icon: '🎵', color: '#6a9ab8' },
  dance: { label: '舞蹈', icon: '🩰', color: '#b87a9a' },
  literature: { label: '文学', icon: '📜', color: '#8a8a5a' },
  medicine: { label: '医药', icon: '🌿', color: '#6a9a6a' },
  agriculture: { label: '农耕', icon: '🌾', color: '#a8a068' },
  architecture: { label: '建筑', icon: '🏯', color: '#7a6a8a' },
  other: { label: '其他', icon: '🧩', color: '#9a9a9a' },
}

export const RITUAL_META: Record<RitualType, { label: string; icon: string; color: string }> = {
  life: { label: '人生仪礼', icon: '🎎', color: '#c4906a' },
  seasonal: { label: '岁时节令', icon: '🏮', color: '#c4625a' },
  agricultural: { label: '农耕仪式', icon: '🌾', color: '#a8a068' },
  ancestral: { label: '祭祖', icon: '🕯', color: '#7a6a8a' },
  healing: { label: '疗愈', icon: '🍃', color: '#6a9a7a' },
  celebration: { label: '庆典', icon: '🎊', color: '#d08a5a' },
  mourning: { label: '哀悼', icon: '🕊', color: '#8a8a9a' },
  transition: { label: '过渡仪式', icon: '🚪', color: '#6a8a9a' },
  daily: { label: '日常仪式', icon: '☕', color: '#a0704a' },
  custom: { label: '自定义', icon: '✨', color: '#9a8ab8' },
}

export const SOURCE_META: Record<FolkloreEntry['source'], { label: string; icon: string; color: string }> = {
  personal: { label: '个人', icon: '🧑', color: '#c49a6a' },
  family: { label: '家族', icon: '👨‍👩‍👧', color: '#a0784a' },
  community: { label: '社区', icon: '🏘', color: '#6a9ab8' },
  public: { label: '公共', icon: '📖', color: '#8a8a5a' },
}

// ---- 档案概览 ----

export interface TraditionsOverview {
  /** 记录总数 */
  total: number
  /** 濒危数 */
  endangered: number
  /** 累计实践次数 */
  totalPracticeCount: number
  /** 有传承人的记录数 */
  withInheritor: number
  /** 有实践的记录数 */
  practiced: number
  /** 覆盖的类别数 */
  categoryCount: number
  /** 覆盖的地域数 */
  regionCount: number
  /** 平均实践次数 */
  avgPracticeCount: number
  /** 最近 30 天新记录 */
  recentlyRecorded30: number
  /** 最常实践的一项 */
  topPracticed: { name: string; count: number } | null
  /** 刚记录的一笔 */
  latest: { name: string; date: string } | null
}

/** 判断某类别是否属于技艺类 */
function isCraft(cat: FolkloreEntry['category']): cat is CraftCategory {
  return cat in CRAFT_META
}

export function traditionsOverview(entries: FolkloreEntry[], now: Date = new Date()): TraditionsOverview {
  const nowT = now.getTime()
  const cutoff30 = nowT - 30 * DAY
  let endangered = 0
  let sumPractice = 0
  let withInheritor = 0
  let practiced = 0
  let recent30 = 0
  let top: { name: string; count: number } | null = null
  let latest: { name: string; date: string } | null = null
  const cats = new Set<string>()
  const regions = new Set<string>()

  for (const e of entries) {
    if (e.endangered) endangered++
    sumPractice += e.practiceCount ?? 0
    if (e.inheritor) withInheritor++
    if ((e.practiceCount ?? 0) > 0 || e.lastPracticedAt) practiced++
    cats.add(String(e.category))
    if (e.region) regions.add(e.region)
    const recorded = new Date(e.recordedAt).getTime()
    if (isFinite(recorded) && recorded >= cutoff30) recent30++
    const c = e.practiceCount ?? 0
    if (!top || c > top.count) top = { name: e.name, count: c }
    if (e.recordedAt && (!latest || e.recordedAt > latest.date)) latest = { name: e.name, date: e.recordedAt }
  }

  const total = entries.length
  return {
    total,
    endangered,
    totalPracticeCount: sumPractice,
    withInheritor,
    practiced,
    categoryCount: cats.size,
    regionCount: regions.size,
    avgPracticeCount: total ? Math.round((sumPractice / total) * 10) / 10 : 0,
    recentlyRecorded30: recent30,
    topPracticed: top,
    latest,
  }
}

// ---- 通用分布行 ----

export interface TraditionsRow {
  key: string
  label: string
  icon?: string
  color: string
  count: number
  /** 占比 0-100 */
  pct: number
}

/** 技艺类别分布 */
export function traditionsCraftRows(entries: FolkloreEntry[], top = 8): TraditionsRow[] {
  const crafts = entries.filter((e) => isCraft(e.category))
  const total = crafts.length || 1
  return (Object.keys(CRAFT_META) as CraftCategory[])
    .map((key) => {
      const count = crafts.filter((e) => e.category === key).length
      return { key, ...CRAFT_META[key], count, pct: Math.round((count / total) * 100) }
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}

/** 仪式类别分布 */
export function traditionsRitualRows(entries: FolkloreEntry[], top = 8): TraditionsRow[] {
  const rituals = entries.filter((e) => !isCraft(e.category))
  const total = rituals.length || 1
  return (Object.keys(RITUAL_META) as RitualType[])
    .map((key) => {
      const count = rituals.filter((e) => e.category === key).length
      return { key, ...RITUAL_META[key], count, pct: Math.round((count / total) * 100) }
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}

/** 来源分布 */
export function traditionsSourceRows(entries: FolkloreEntry[]): TraditionsRow[] {
  const total = entries.length || 1
  return (Object.keys(SOURCE_META) as FolkloreEntry['source'][]).map((source) => {
    const count = entries.filter((e) => e.source === source).length
    return { key: source, ...SOURCE_META[source], count, pct: Math.round((count / total) * 100) }
  })
}

/** 地域分布（按记录数降序） */
export function traditionsRegionRows(entries: FolkloreEntry[], top = 5): TraditionsRow[] {
  const total = entries.length || 1
  const map = new Map<string, number>()
  for (const e of entries) {
    const r = e.region || '未标注'
    map.set(r, (map.get(r) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({
      key: label,
      label,
      color: '#b89a7a',
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}

// ---- 实践分档 ----

export interface PracticeBuckets {
  never: TraditionsRow   // 从未实践
  light: TraditionsRow   // 1-2 次
  active: TraditionsRow  // 3+ 次
}

export function practiceBuckets(entries: FolkloreEntry[]): PracticeBuckets {
  const total = entries.length || 1
  const never = entries.filter((e) => (e.practiceCount ?? 0) === 0).length
  const light = entries.filter((e) => { const c = e.practiceCount ?? 0; return c >= 1 && c <= 2 }).length
  const active = entries.filter((e) => (e.practiceCount ?? 0) >= 3).length
  return {
    never: { key: 'never', label: '未实践', color: '#8a8a9a', count: never, pct: Math.round((never / total) * 100) },
    light: { key: 'light', label: '偶有实践', color: '#a8a068', count: light, pct: Math.round((light / total) * 100) },
    active: { key: 'active', label: '常践常新', color: '#6a9a7a', count: active, pct: Math.round((active / total) * 100) },
  }
}

// ---- 文明节律 ----

export interface TraditionsRhythm {
  /** 近 30 天新记录 */
  recorded30: number
  /** 近 90 天新记录 */
  recorded90: number
  /** 近 30 天有实践 */
  practiced30: number
  /** 累计实践 */
  totalPractice: number
  /** 平均每条实践次数 */
  avgPractice: number
}

export function traditionsRhythm(entries: FolkloreEntry[], now: Date = new Date()): TraditionsRhythm {
  const nowT = now.getTime()
  const c30 = nowT - 30 * DAY
  const c90 = nowT - 90 * DAY
  let recorded30 = 0
  let recorded90 = 0
  let practiced30 = 0
  let sumPractice = 0

  for (const e of entries) {
    const r = new Date(e.recordedAt).getTime()
    if (isFinite(r)) {
      if (r >= c30) recorded30++
      if (r >= c90) recorded90++
    }
    if (e.lastPracticedAt) {
      const p = new Date(e.lastPracticedAt).getTime()
      if (isFinite(p) && p >= c30) practiced30++
    }
    sumPractice += e.practiceCount ?? 0
  }

  return {
    recorded30,
    recorded90,
    practiced30,
    totalPractice: sumPractice,
    avgPractice: entries.length ? Math.round((sumPractice / entries.length) * 10) / 10 : 0,
  }
}

// ---- 文明健康（0-100）----

export interface TraditionsArchiveHealth {
  /** 0-100 文明的繁茂程度 */
  score: number
  /** 广度（类别与地域多样）0-100 */
  breadth: number
  /** 传承（有传承人 + 非濒危 + 有实践）0-100 */
  heritage: number
  /** 延续（近 90 天记录 + 实践活力）0-100 */
  continuity: number
  label: string
}

export function traditionsHealth(entries: FolkloreEntry[], now: Date = new Date()): TraditionsArchiveHealth {
  const total = entries.length
  if (total === 0) {
    return { score: 0, breadth: 0, heritage: 0, continuity: 0, label: '文明待耕' }
  }

  const cats = new Set(entries.map((e) => String(e.category))).size
  const regions = new Set(entries.filter((e) => e.region).map((e) => e.region)).size
  const breadth = clamp(Math.round(Math.min(cats, 24) * 2.5 + Math.min(regions, 10) * 3))

  const inheritorRatio = entries.filter((e) => e.inheritor).length / total
  const endangeredRatio = entries.filter((e) => e.endangered).length / total
  const practicedRatio = entries.filter((e) => (e.practiceCount ?? 0) > 0).length / total
  const heritage = clamp(Math.round(inheritorRatio * 40 + (1 - endangeredRatio) * 20 + practicedRatio * 40))

  const rhythm = traditionsRhythm(entries, now)
  const recency = limit01(entries, now, 90)
  const practiceActive = clamp(Math.round(Math.min(rhythm.practiced30 / Math.max(total, 1), 1) * 40))
  const continuity = clamp(Math.round(recency * 60 + practiceActive * 0.4))

  const score = clamp(Math.round(breadth * 0.35 + heritage * 0.4 + continuity * 0.25))
  const label =
    score >= 70 ? '文明繁盛' : score >= 45 ? '生生不息' : score >= 20 ? '淡泊沉淀' : '文明待耕'

  return { score, breadth, heritage, continuity, label }
}

/** 近 cutoff 天内有记录的条数占比（0-1） */
function limit01(entries: FolkloreEntry[], now: Date, cutoffDays: number): number {
  const cutoff = now.getTime() - cutoffDays * DAY
  let hit = 0
  for (const e of entries) {
    const t = new Date(e.recordedAt).getTime()
    if (isFinite(t) && t >= cutoff) hit++
  }
  return Math.min(hit / Math.max(entries.length, 1), 1)
}

// ---- 温和洞察 ----

export function traditionsInsights(entries: FolkloreEntry[], now = new Date(), limit = 4): string[] {
  if (entries.length === 0) {
    return ['文明的根系还是一片空地。记下第一项技艺或仪式，让余温生根。']
  }
  const out: string[] = []
  const ov = traditionsOverview(entries, now)
  const health = traditionsHealth(entries, now)
  const buckets = practiceBuckets(entries)
  const sources = traditionsSourceRows(entries)
  const crafts = traditionsCraftRows(entries)
  const rituals = traditionsRitualRows(entries)

  if (ov.endangered > 0) out.push(`${ov.endangered} 项濒危记录值得珍惜，可以是下一次实践的起点。`)
  if (ov.total > 0 && ov.withInheritor === 0) out.push('还没有一位被记录下的传承人，若有熟悉这门技艺的长辈，不妨记下姓名。')
  if (buckets.never.count > 0) out.push(`${buckets.never.count} 条记录还未曾实践，亲手做一次，余温才算真正被握住。`)

  const domCraft = crafts[0]
  const domRitual = rituals[0]
  if (domCraft && domCraft.count > 0) out.push(`技艺方面，以「${domCraft.label}」最有积累。`)
  if (domRitual && domRitual.count > 0) out.push(`仪式方面，「${domRitual.label}」记录得最勤。`)

  const familyLike = sources.find((s) => s.key === 'family')
  if (familyLike && familyLike.count === 0 && ov.total > 0) out.push('还没有家族来源的记录，问问家中长辈，或许能补上珍贵的一笔。')

  out.push(`当下文明沉淀为「${health.label}」。`)
  return out.slice(0, limit)
}

// ---- 高频标签 ----

export interface TraditionsTag {
  tag: string
  count: number
}

export function traditionsTopTags(entries: FolkloreEntry[], top = 6): TraditionsTag[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    for (const t of e.tags || []) {
      const k = t.trim().toLowerCase()
      if (!k) continue
      map.set(k, (map.get(k) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}