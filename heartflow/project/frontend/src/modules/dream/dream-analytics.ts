// ============================================================
// 梦乡小筑 · 梦境档案分析引擎（dream-analytics）
// 借鉴点：第16类·周公解梦「梦境统计」
// 用梦记沉淀出「梦的轮廓」：情绪分布、高频主题、记录节奏与温和洞察。
// 全纯函数、本地计算、零网络（守宪法第 1 条）。
// 只记录与呈现，不引入任何迷信解析（第16类「拒绝迷信推算内容」）。
// ============================================================

import type { Dream } from '../../stores/dreamNook'

const DAY_MS = 86_400_000

export const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  fear: '😨',
  sad: '😢',
  curious: '🤔',
  confused: '🌀',
  neutral: '☁️',
}

function dayKey(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function tsOf(d: Dream): number {
  const t = new Date(d.at).getTime()
  return isFinite(t) ? t : 0
}

function words(d: Dream): number {
  return (d.content || '').replace(/\s+/g, '').length
}

// ---- 梦境概览 ----

export interface DreamOverview {
  total: number
  active: number
  archived: number
  thisMonth: number
  /** 近 7 天记录数 */
  thisWeek: number
  /** 有过记录的活跃天数 */
  activeDays: number
  /** 活跃梦境平均字数 */
  avgWords: number
  /** 记录时段偏好（at 的小时众数 0-23） */
  peakHour: number | null
  /** 已连续记录的天数（今日有则今日，无则昨日回溯） */
  consecutiveDays: number
}

export function dreamOverview(dreams: Dream[], now: Date = new Date()): DreamOverview {
  const nowT = now.getTime()
  const daySet = new Set<string>()
  const month = now.getMonth()
  const year = now.getFullYear()
  const weekAgo = nowT - 7 * DAY_MS
  const hourHist = new Map<number, number>()

  let active = 0
  let thisMonth = 0
  let thisWeek = 0
  let wordSum = 0

  for (const d of dreams) {
    const t = tsOf(d)
    if (t <= 0) continue
    daySet.add(dayKey(t))
    hourHist.set(new Date(t).getHours(), (hourHist.get(new Date(t).getHours()) || 0) + 1)
    const dt = new Date(t)
    if (dt.getMonth() === month && dt.getFullYear() === year) thisMonth++
    if (t >= weekAgo) thisWeek++
    if (!d.archived) {
      active++
      wordSum += words(d)
    }
  }

  let peakHour: number | null = null
  let max = 0
  for (const [h, c] of hourHist) if (c > max) { max = c; peakHour = h }

  const anchor = daySet.has(dayKey(nowT)) ? startOfDay(nowT) : startOfDay(nowT) - DAY_MS
  let consecutive = 0
  let cursor = anchor
  while (daySet.has(dayKey(cursor))) {
    consecutive++
    cursor -= DAY_MS
  }

  return {
    total: dreams.length,
    active,
    archived: dreams.length - active,
    thisMonth,
    thisWeek,
    activeDays: daySet.size,
    avgWords: active > 0 ? Math.round(wordSum / active) : 0,
    peakHour,
    consecutiveDays: consecutive,
  }
}

// ---- 情绪分布 ----

export interface MoodEntry {
  mood: string
  emoji: string
  count: number
  pct: number
}

const MOOD_ORDER = ['happy', 'curious', 'neutral', 'confused', 'sad', 'fear']

export function moodDistribution(dreams: Dream[]): MoodEntry[] {
  const map = new Map<string, number>()
  const total = dreams.length || 0
  for (const d of dreams) map.set(d.mood, (map.get(d.mood) || 0) + 1)
  return MOOD_ORDER
    .filter(m => (map.get(m) || 0) > 0)
    .map(m => ({
      mood: m,
      emoji: MOOD_EMOJI[m] || '☁️',
      count: map.get(m)!,
      pct: total > 0 ? Math.round((map.get(m)! / total) * 100) : 0,
    }))
}

export interface DominantMood {
  mood: string
  emoji: string
  count: number
  pct: number
}

export function dominantMood(dreams: Dream[]): DominantMood | null {
  if (dreams.length === 0) return null
  const dist = moodDistribution(dreams)
  let dominant: MoodEntry = dist[0]
  for (const e of dist) if (e.count > dominant.count) dominant = e
  return dominant
}

// ---- 高频梦境主题 ----

export interface ThemeRow {
  tag: string
  count: number
  pct: number
}

export function topThemes(dreams: Dream[], limit = 6): ThemeRow[] {
  const map = new Map<string, number>()
  const total = dreams.length || 0
  for (const d of dreams) for (const t of d.tags) map.set(t, (map.get(t) || 0) + 1)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
}

// ---- 温和洞察（只呈现，不评判、不迷信） ----

export function dreamInsights(dreams: Dream[], now: Date = new Date(), limit = 4): string[] {
  const out: string[] = []
  const ov = dreamOverview(dreams, now)
  const dom = dominantMood(dreams)
  const themes = topThemes(dreams, 3)

  if (ov.total === 0) {
    return ['梦乡还空着——睡着之后你都在想些什么，也值得被记下来。']
  }

  if (ov.consecutiveDays >= 3) {
    out.push(`已连续 ${ov.consecutiveDays} 夜记录梦境，梦的轮廓在慢慢成形。`)
  }
  if (dom && dom.count >= 3) {
    if (dom.mood === 'fear') out.push(`恐惧的梦不少——把它们原样记下，本身就是一种安顿。`)
    else if (dom.mood === 'happy') out.push(`「${dom.emoji}」是你梦乡的常客，醒来后的轻松也一并留住了。`)
    else out.push(`你最常见的梦境情绪是「${dom.emoji}」。`)
  }
  if (themes.length === 1 && themes[0].count >= 3) {
    out.push(`「${themes[0].tag}」反复出现在梦里，似乎始终在等一个回应。`)
  } else if (themes.length > 1) {
    out.push(`高频浮现在梦里的主题有：${themes.slice(0, 3).map(t => t.tag).join('、')}。`)
  }
  if (ov.peakHour !== null) {
    out.push(`你常在 ${ov.peakHour}:00 前后记录梦境。`)
  }
  if (ov.thisWeek === 0 && ov.total > 0) {
    out.push('这一周梦里没有留影，安静一些也好——想记时再来。')
  } else if (ov.thisWeek >= 4) {
    out.push(`这一周记下了 ${ov.thisWeek} 段梦，好勤的笔。`)
  }
  if (ov.archived > 0) {
    out.push(`已有 ${ov.archived} 段梦境收入归档，站在远处也看得清轮廓。`)
  }

  return out.slice(0, limit)
}