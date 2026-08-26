// ============================================================
// 知微阁 · 智慧档案分析引擎（wisdom-analytics）
// 从每一条「提问＋回答」的记录里，读出智慧的沉淀。
// 档案概览、领域分布、标签分布、月份分布、回看节律、
// 知微健康（广度 / 深度 / 延续）与温和洞察。
// 全纯函数、本地计算、零网络出口，接受 now 以保证时间可测试。
// ============================================================

import type { WisdomItem } from './types'
import type { HistoryItem } from './history'

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

const DAY = 24 * 60 * 60 * 1000

// ---- 领域元数据 ----
// 领域 = 提问问题被路由到的「光点群」；与视图层 runAsk 的关键词直觉对齐
export type WisdomDomain =
  | 'focus'       // 专注
  | 'emotion'     // 情绪
  | 'record'      // 记录
  | 'anchor'      // 心锚
  | 'work'        // 工作
  | 'relation'    // 关系
  | 'body'        // 身体
  | 'other'       // 其他

export const DOMAIN_META: Record<WisdomDomain, { label: string; icon: string; color: string }> = {
  focus: { label: '专注', icon: '⏱', color: '#6a9ab8' },
  emotion: { label: '情绪', icon: '🌤', color: '#d08a5a' },
  record: { label: '记录', icon: '📝', color: '#a8a068' },
  anchor: { label: '心锚', icon: '⛓', color: '#a0784a' },
  work: { label: '工作', icon: '🛠', color: '#7a8ab8' },
  relation: { label: '关系', icon: '🤝', color: '#d08a9a' },
  body: { label: '身体', icon: '🍃', color: '#6a9a7a' },
  other: { label: '其他', icon: '✨', color: '#9a9a9a' },
}

/** 依据问题文本的轻量关键词分类，返回主导领域 */
export function classifyDomain(question: string): WisdomDomain {
  const q = question.toLowerCase()
  const score: Partial<Record<WisdomDomain, number>> = {}
  const hit = (d: WisdomDomain, words: string[]) => {
    let n = 0
    for (const w of words) if (q.includes(w)) n++
    if (n) score[d] = (score[d] || 0) + n
  }
  hit('focus', ['专注', '时长', '几次', '状态', '近况'])
  hit('emotion', ['情绪', '心情', '感受', '低落', '开心', '平静'])
  hit('work', ['工作', '专注', '小时', '本周'])
  hit('relation', ['关系', '羁绊', '朋友', '家人', '联系'])
  hit('body', ['身体', '健康', '睡眠', '觉察'])
  hit('anchor', ['锚', '心锚', '安放'])
  hit('record', ['记录', '笔记', '写', '回看'])
  const entries = Object.entries(score) as [WisdomDomain, number][]
  if (!entries.length) return 'other'
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

// ---- 档案概览 ----

export interface WisdomOverview {
  /** 记录总数 */
  total: number
  /** 累计对话次数（历史询问） */
  totalAsks: number
  /** 平均回答长度（字） */
  avgAnswerLen: number
  /** 有空回答的条数 */
  withAnswer: number
  /** 覆盖的标签数 */
  tagCount: number
  /** 覆盖的领域数 */
  domainCount: number
  /** 主导领域 */
  topDomain: WisdomDomain | null
  /** 最近 30 天新增记录 */
  recent30: number
  /** 最近 30 天对话次数 */
  recentAsks30: number
  /** 最常使用的标签 */
  topTag: { tag: string; count: number } | null
  /** 最近一次记录的日期 */
  latestDate: string | null
}

export function wisdomOverview(
  items: WisdomItem[],
  history: HistoryItem[],
  now: Date = new Date(),
): WisdomOverview {
  const nowT = now.getTime()
  const cutoff30 = nowT - 30 * DAY
  let withAnswer = 0
  let sumLen = 0
  let recent30 = 0
  let latestDate: string | null = null
  const tags = new Set<string>()
  const domains = new Map<WisdomDomain, number>()

  for (const it of items) {
    const len = (it.answer || '').trim().length
    sumLen += len
    if (len > 0) withAnswer++
    for (const t of it.tags || []) {
      const k = t.trim().toLowerCase()
      if (k) tags.add(k)
    }
    const dom = classifyDomain(it.question || '')
    domains.set(dom, (domains.get(dom) || 0) + 1)
    const t = new Date(it.createdAt).getTime()
    if (isFinite(t)) {
      if (t >= cutoff30) recent30++
      if (!latestDate || it.createdAt > latestDate) latestDate = it.createdAt
    }
  }

  let recentAsks30 = 0
  for (const h of history) {
    const at = new Date(h.at || h.id || 0).getTime()
    if (isFinite(at) && at >= cutoff30) recentAsks30++
  }

  const tagCounts = new Map<string, number>()
  for (const it of items) for (const t of it.tags || []) tagCounts.set(t.trim().toLowerCase(), (tagCounts.get(t.trim().toLowerCase()) || 0) + 1)
  let topTag: { tag: string; count: number } | null = null
  for (const [tag, count] of tagCounts) {
    if (!topTag || count > topTag.count) topTag = { tag, count }
  }

  let topDomain: WisdomDomain | null = null
  for (const [d, c] of domains) if (!topDomain || c > (domains.get(topDomain) || 0)) topDomain = d

  const total = items.length
  return {
    total,
    totalAsks: history.length,
    avgAnswerLen: total ? Math.round((sumLen / total) * 10) / 10 : 0,
    withAnswer,
    tagCount: tags.size,
    domainCount: domains.size,
    topDomain,
    recent30,
    recentAsks30,
    topTag,
    latestDate,
  }
}

// ---- 通用分布行 ----

export interface WisdomRow {
  key: string
  label: string
  icon?: string
  color: string
  count: number
  /** 占比 0-100 */
  pct: number
}

/** 领域分布 */
export function wisdomDomainRows(items: WisdomItem[], top = 8): WisdomRow[] {
  const total = items.length || 1
  const map = new Map<WisdomDomain, number>()
  for (const it of items) {
    const d = classifyDomain(it.question || '')
    map.set(d, (map.get(d) || 0) + 1)
  }
  return (Object.keys(DOMAIN_META) as WisdomDomain[])
    .map((d) => ({ key: d, ...DOMAIN_META[d], count: map.get(d) || 0, pct: Math.round(((map.get(d) || 0) / total) * 100) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}

/** 标签分布 */
export function wisdomTagRows(items: WisdomItem[], top = 8): WisdomRow[] {
  const total = items.length || 1
  const map = new Map<string, number>()
  for (const it of items) {
    for (const t of it.tags || []) {
      const k = t.trim().toLowerCase()
      if (!k) continue
      map.set(k, (map.get(k) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ key: label, label, color: '#a09a8a', count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}

/** 月份分布（近 top 个月，按时间倒序） */
export function wisdomMonthlyRows(items: WisdomItem[], top = 6): WisdomRow[] {
  type M = { k: string; y: number; m: number }
  const counts = new Map<string, number>()
  let max: M | null = null
  for (const it of items) {
    const d = new Date(it.createdAt)
    if (!isFinite(d.getTime())) continue
    const y = d.getFullYear()
    const m = d.getMonth()
    const k = `${y}-${String(m + 1).padStart(2, '0')}`
    counts.set(k, (counts.get(k) || 0) + 1)
    if (!max) max = { k, y, m }
    else if (y > max.y || (y === max.y && m > max.m)) max = { k, y, m }
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  const topK = max ? sorted.slice(0, top) : []
  const total = items.length || 1
  return topK.map(([k, count]) => ({
    key: k,
    label: k,
    color: '#8a9ad8',
    count,
    pct: Math.round((count / total) * 100),
  }))
}

// ---- 回看节律 ----

export interface WisdomRhythm {
  /** 近 30 天新增记录 */
  recorded30: number
  /** 近 90 天新增记录 */
  recorded90: number
  /** 近 30 天对话次数 */
  asks30: number
  /** 累计对话次数 */
  totalAsks: number
  /** 平均每条回答长度 */
  avgAnswer: number
}

export function wisdomRhythm(
  items: WisdomItem[],
  history: HistoryItem[],
  now: Date = new Date(),
): WisdomRhythm {
  const nowT = now.getTime()
  const c30 = nowT - 30 * DAY
  const c90 = nowT - 90 * DAY
  let recorded30 = 0
  let recorded90 = 0
  let sumLen = 0
  for (const it of items) {
    const t = new Date(it.createdAt).getTime()
    if (isFinite(t)) {
      if (t >= c30) recorded30++
      if (t >= c90) recorded90++
    }
    sumLen += (it.answer || '').trim().length
  }
  let asks30 = 0
  for (const h of history) {
    const at = new Date(h.at || h.id || 0).getTime()
    if (isFinite(at) && at >= c30) asks30++
  }
  return {
    recorded30,
    recorded90,
    asks30,
    totalAsks: history.length,
    avgAnswer: items.length ? Math.round((sumLen / items.length) * 10) / 10 : 0,
  }
}

// ---- 知微健康（0-100）----

export interface WisdomArchiveHealth {
  /** 0-100 智慧沉淀的丰盈程度 */
  score: number
  /** 广度（标签与领域多样）0-100 */
  breadth: number
  /** 深度（回答的丰厚程度）0-100 */
  depth: number
  /** 延续（近 90 天记录 + 对话活力）0-100 */
  continuity: number
  label: string
}

export function wisdomHealth(
  items: WisdomItem[],
  history: HistoryItem[],
  now: Date = new Date(),
): WisdomArchiveHealth {
  const total = items.length
  if (total === 0) {
    return { score: 0, breadth: 0, depth: 0, continuity: 0, label: '慧心初醒' }
  }

  const tagCount = new Set(items.flatMap((i) => (i.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean))).size
  const domainCount = new Set(items.map((i) => classifyDomain(i.question || ''))).size
  const breadth = clamp(Math.round(Math.min(tagCount, 24) * 2.6 + Math.min(domainCount, 8) * 4))

  const sumLen = items.reduce((s, i) => s + (i.answer || '').trim().length, 0)
  const avgLen = sumLen / total
  const richRatio = items.filter((i) => (i.answer || '').trim().length >= 40).length / total
  const depth = clamp(Math.round(Math.min(avgLen / 12, 4) * 15 + richRatio * 40))

  const rhythm = wisdomRhythm(items, history, now)
  const recency = limit01(items, now, 90)
  const askActive = clamp(Math.round(Math.min(rhythm.asks30 / Math.max(history.length, 1), 1) * 40))
  const continuity = clamp(Math.round(recency * 55 + Math.min(rhythm.asks30, 30) * 1 + askActive * 0.35))

  const score = clamp(Math.round(breadth * 0.35 + depth * 0.4 + continuity * 0.25))
  const label =
    score >= 70 ? '慧心通透' : score >= 45 ? '格物致知' : score >= 20 ? '静水流深' : '慧心初醒'

  return { score, breadth, depth, continuity, label }
}

/** 近 cutoff 天内有记录的条数占比（0-1） */
function limit01(items: WisdomItem[], now: Date, cutoffDays: number): number {
  const cutoff = now.getTime() - cutoffDays * DAY
  let hit = 0
  for (const it of items) {
    const t = new Date(it.createdAt).getTime()
    if (isFinite(t) && t >= cutoff) hit++
  }
  return Math.min(hit / Math.max(items.length, 1), 1)
}

// ---- 温和洞察 ----

export function wisdomInsights(
  items: WisdomItem[],
  history: HistoryItem[],
  now = new Date(),
  limit = 4,
): string[] {
  if (items.length === 0) {
    return ['知微阁还是空白的。记下第一问与一答，让慧心开始转动。']
  }
  const out: string[] = []
  const ov = wisdomOverview(items, history, now)
  const health = wisdomHealth(items, history, now)
  const domains = wisdomDomainRows(items)

  if (ov.withAnswer === 0) out.push('还缺回答的余温，试着为每条提问补上一段回答，让光点变得厚实。')
  if (ov.avgAnswerLen < 20) out.push('回答还很轻，再多写几句，让它不只是问句的回声。')
  const dom = domains[0]
  if (dom && dom.count > 0) out.push(`你的光点常落在「${dom.label}」上，那是近期在意的地方。`)
  if (history.length === 0) out.push('你还没有回看对话，试着提出一段想再看一眼的话，让光点并置成片段。')
  out.push(`当前慧心沉淀为「${health.label}」。`)
  return out.slice(0, limit)
}

// ---- 高频标签 ----

export interface WisdomTag {
  tag: string
  count: number
}

export function wisdomTopTags(items: WisdomItem[], top = 6): WisdomTag[] {
  const map = new Map<string, number>()
  for (const it of items) {
    for (const t of it.tags || []) {
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