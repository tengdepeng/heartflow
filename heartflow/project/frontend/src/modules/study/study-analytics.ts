// ============================================================
// 思绪书房 · 书房气象分析引擎（study-analytics）
// 从笔记（落字/标签/温故）读出"书房的气象"：
// 藏书概览、落字节奏、温故建议、书房健康度、温和洞察。
// 全纯函数、本地计算、零网络出口（守宪法第 1 条）。
// 顺着蓝图 20「温故知新」：让记过的东西不蒙尘，而是可回想的书脊。
// ============================================================

import type { Note } from './types'

const DAY = 86_400_000

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function daysBetween(a: number, b: number): number {
  return Math.max(0, Math.round((b - a) / DAY))
}

function tsAt(v: string | undefined | null): number {
  if (!v) return 0
  const t = new Date(v).getTime()
  return isFinite(t) ? t : 0
}

// ---- 藏书概览 ----

export interface StudioOverview {
  total: number
  active: number
  archived: number
  /** 速记卡片（原子化）数 */
  atomicCount: number
  /** 全部标签种类数 */
  totalTags: number
  /** 近 7 天新记 */
  notesThisWeek: number
  /** 从第一篇到今天，平均每天记几篇 */
  avgPerDay: number
  /** 内容总字数 */
  totalWords: number
}

export function studioOverview(notes: Note[], now: Date = new Date()): StudioOverview {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY
  let active = 0
  let archived = 0
  let atomic = 0
  let thisWeek = 0
  let words = 0
  const tags = new Set<string>()
  let firstT = 0

  for (const n of notes) {
    if (n.archived) archived++
    else active++
    if (n.isAtomic) atomic++
    if (n.createdAt && tsAt(n.createdAt) >= weekAgo) thisWeek++
    words += (n.content || '').length
    if (Array.isArray(n.tags)) for (const t of n.tags) if (t) tags.add(t)
    const c = tsAt(n.createdAt)
    if (firstT === 0 || (c && c < firstT)) firstT = c
  }

  const span = firstT ? daysBetween(firstT, nowT) : 0
  return {
    total: notes.length,
    active,
    archived,
    atomicCount: atomic,
    totalTags: tags.size,
    notesThisWeek: thisWeek,
    avgPerDay: span > 0 ? Math.round((notes.length / span) * 10) / 10 : notes.length ? notes.length : 0,
    totalWords: words,
  }
}

// ---- 落字节奏 ----

export interface WritingRhythm {
  /** 已连续落字的天数（今日有则从今日，今日无则昨日回溯） */
  consecutiveDays: number
  /** 近 7 天有落字的天数 */
  activeDays7: number
  /** 历史最长连续落字天数 */
  longestStreak: number
  /** 落字时段偏好（0-23 众数） */
  peakHour: number | null
  /** 高频标签 Top5 */
  topTags: { tag: string; count: number }[]
}

export function writingRhythm(notes: Note[], now: Date = new Date()): WritingRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY
  const daySet = new Set<string>()
  const active7 = new Set<string>()
  const hourHist = new Map<number, number>()

  for (const n of notes) {
    const c = tsAt(n.createdAt)
    if (!c) continue
    daySet.add(dayKey(c))
    hourHist.set(new Date(c).getHours(), (hourHist.get(new Date(c).getHours()) || 0) + 1)
    if (c >= weekAgo) active7.add(dayKey(c))
  }

  // 连续天数（今日无则昨日）的倒推
  const anchorDay = daySet.has(dayKey(nowT)) ? startOfDay(nowT) : startOfDay(nowT) - DAY
  let consecutive = 0
  let cursor = anchorDay
  while (daySet.has(dayKey(cursor))) {
    consecutive++
    cursor -= DAY
  }

  // 历史最长连续（按天排序累加）
  const days = [...daySet].sort()
  let longestStreak = 0
  let run = 0
  let prev = 0
  for (const k of days) {
    const t = new Date(`${k}T00:00:00`).getTime()
    if (prev === 0 || t - prev === DAY) run++
    else run = 1
    if (run > longestStreak) longestStreak = run
    prev = t
  }

  let peakHour: number | null = null
  let max = 0
  for (const [h, c] of hourHist) if (c > max) { max = c; peakHour = h }

  const freq = new Map<string, number>()
  for (const n of notes) {
    if (Array.isArray(n.tags)) for (const t of new Set(n.tags)) if (t) freq.set(t, (freq.get(t) || 0) + 1)
  }
  const topTags = [...freq.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 5)

  return {
    consecutiveDays: consecutive,
    activeDays7: active7.size,
    longestStreak,
    peakHour,
    topTags,
  }
}

// ---- 温故建议 ----

export interface RevisitNote {
  note: Note
  /** 距上次翻动天数 */
  days: number
  reason: string
}

/** 给一条笔记打"该温故"分：越久未翻动、越有分量越值得回到书桌 */
function revisitScore(n: Note, nowT: number): { score: number; days: number; reason: string } {
  if (n.archived || n.deletedAt) return { score: -1, days: 0, reason: '' }
  const updated = tsAt(n.updatedAt)
  const updatedDays = updated ? daysBetween(updated, nowT) : daysBetween(tsAt(n.createdAt), nowT)
  const created = tsAt(n.createdAt)
  const age = created ? daysBetween(created, nowT) : 0

  if (updatedDays < 3) return { score: 0, days: updatedDays, reason: '刚翻动过' }

  const richness = Math.min(30, Math.floor((n.content || '').length / 30))
  const tagBonus = Math.min(10, (n.tags || []).length * 3)
  const weight = Math.min(50, age / 4)
  const score = updatedDays + richness + tagBonus + weight

  const reason = updatedDays >= 30 ? '搁了挺久，值得再翻一页' : updatedDays >= 14 ? '放了半个月，可以温故一下' : '过了几天，再看一眼'
  return { score, days: updatedDays, reason }
}

export function revisitSuggestion(notes: Note[], now: Date = new Date()): RevisitNote | null {
  const nowT = now.getTime()
  let bestScore = -1
  let candidate: RevisitNote | null = null
  for (const n of notes) {
    const { score, days, reason } = revisitScore(n, nowT)
    if (score <= 0) continue
    if (score > bestScore) {
      bestScore = score
      candidate = { note: n, days, reason }
    }
  }
  return candidate
}

// ---- 书房健康度（0-100）----

export interface StudioHealth {
  score: number
  /** 节奏 0-40 */
  cadence: number
  /** 广度 0-30 */
  breadth: number
  /** 深耕 0-30 */
  depth: number
  label: string
}

export function studioHealth(notes: Note[], now: Date = new Date()): StudioHealth {
  const ov = studioOverview(notes, now)
  const rh = writingRhythm(notes, now)

  // 节奏：近 7 天活跃天 ≥5 得满分 40
  const cadence = Math.min(40, Math.round((rh.activeDays7 / 5) * 40))
  // 广度：标签 ≥10 得满分 30
  const breadth = Math.min(30, Math.round((ov.totalTags / 10) * 30))
  // 深耕：平均每篇字数 ≥180 得满分 30
  const avgLen = ov.active ? ov.totalWords / ov.active : 0
  const depth = Math.min(30, Math.round((avgLen / 180) * 30))

  const score = Math.round(cadence + breadth + depth)
  const label =
    score >= 70 ? '笔耕不辍' : score >= 45 ? '渐入书境' : score >= 20 ? '刚动笔' : '墨迹初干'
  return { score, cadence, breadth, depth, label }
}

// ---- 温和洞察（只呈现，不催促） ----

export function studioInsights(notes: Note[], now: Date = new Date(), limit = 4): string[] {
  const out: string[] = []
  if (notes.length === 0) {
    out.push('书房还空着。落下一行字，腾出脑中一格。')
    return out
  }
  const ov = studioOverview(notes, now)
  const rh = writingRhythm(notes, now)
  const health = studioHealth(notes, now)

  if (health.score > 0) out.push(`这间书房的整体气象是「${health.label}」。`)
  if (rh.consecutiveDays >= 3) out.push(`已连续 ${rh.consecutiveDays} 天落字，笔是通的。`)
  else if (ov.notesThisWeek > 0) out.push(`这周写了 ${ov.notesThisWeek} 篇。`)
  if (rh.topTags.length) out.push(`你反复回到「${rh.topTags[0].tag}」这个话题。`)
  if (ov.archived > 0) out.push(`书架侧还有 ${ov.archived} 篇收进尘埃。`)
  if (ov.totalWords >= 1000) out.push(`这些字加起来已有约 ${formatWords(ov.totalWords)} 千言。`)

  return out.slice(0, limit)
}

function formatWords(w: number): string {
  const k = w / 1000
  return k >= 10 ? Math.round(k).toString() : (Math.round(k * 10) / 10).toString()
}