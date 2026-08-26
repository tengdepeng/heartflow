// ============================================================
// 知微阁 · 掌握度档案分析引擎（mastery-analytics）
// 从「知识掌握度」实践读出土木成林的程度：
// 掌握概览、三态分布、薄弱清单、复习节奏、温和洞察。
// 全纯函数、本地计算、零网络出口（守宪法第 1 条）。
// 顺着蓝图第 3 类「Khan Academy」：按自己的节奏推进，不设排行。
// ============================================================

import type { MasteryItem } from './mastery'
import { masteryStateFor } from './mastery'

const DAY = 86_400_000

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- 掌握概览 ----

export interface MasteryOverview {
  total: number
  mastered: number
  learning: number
  fresh: number
  /** 平均掌握度 0-100 */
  avgConfidence: number
  /** 平均练习次数 */
  avgAttempts: number
  /** 掌握率 0-100 */
  masteryRate: number
  /** 已练习的知识点数 */
  practiced: number
}

export function masteryOverview(items: MasteryItem[]): MasteryOverview {
  const total = items.length
  let mastered = 0
  let learning = 0
  let fresh = 0
  let confSum = 0
  let attSum = 0
  let practiced = 0

  for (const i of items) {
    const st = masteryStateFor(i.confidence)
    if (st === 'mastered') mastered++
    else if (st === 'learning') learning++
    else fresh++
    confSum += i.confidence
    attSum += i.attempts || 0
    if (i.attempts > 0) practiced++
  }

  return {
    total,
    mastered,
    learning,
    fresh,
    avgConfidence: total ? Math.round(confSum / total) : 0,
    avgAttempts: total ? Math.round((attSum / total) * 10) / 10 : 0,
    masteryRate: total ? Math.round((mastered / total) * 100) : 0,
    practiced,
  }
}

// ---- 三态分布 ----

export interface MasteryStateRow {
  state: 'new' | 'learning' | 'mastered'
  label: string
  icon: string
  color: string
  count: number
}

const STATE_META: Record<'new' | 'learning' | 'mastered', { label: string; icon: string; color: string }> = {
  new: { label: '待学', icon: '🌱', color: '#9ca3af' },
  learning: { label: '练习中', icon: '🌿', color: '#f0c040' },
  mastered: { label: '已通晓', icon: '🌳', color: '#34d399' },
}

export function masteryStateDistribution(items: MasteryItem[]): MasteryStateRow[] {
  return (['new', 'learning', 'mastered'] as const).map((state) => {
    const m = STATE_META[state]
    return {
      state,
      label: m.label,
      icon: m.icon,
      color: m.color,
      count: items.filter((i) => masteryStateFor(i.confidence) === state).length,
    }
  })
}

// ---- 薄弱清单 ----

export interface WeakItem {
  item: MasteryItem
  state: 'new' | 'learning'
  stateLabel: string
}

/** 待加强：待学优先，其次练习中，同类内按掌握度升序 */
export function weakList(items: MasteryItem[]): WeakItem[] {
  return items
    .filter((i) => masteryStateFor(i.confidence) !== 'mastered')
    .sort((a, b) => {
      const sa = masteryStateFor(a.confidence) === 'new' ? 0 : 1
      const sb = masteryStateFor(b.confidence) === 'new' ? 0 : 1
      if (sa !== sb) return sa - sb
      return a.confidence - b.confidence
    })
    .map((item) => ({
      item,
      state: masteryStateFor(item.confidence) as 'new' | 'learning',
      stateLabel: masteryStateFor(item.confidence) === 'new' ? '待学' : '练习中',
    }))
}

// ---- 复习节奏 ----

export interface MasteryRhythm {
  /** 近 7 天练习次数 */
  weeklyAttempts: number
  /** 近 30 天练习次数 */
  monthlyAttempts: number
  /** 有练习的天数 */
  activeDays: number
  /** 最近一次练习时刻 */
  lastActive: string | null
  /** 连续练习天数（今日无则从昨日回溯） */
  streakDays: number
}

export function masteryRhythm(items: MasteryItem[], now: Date = new Date()): MasteryRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY
  const monthAgo = nowT - 30 * DAY
  const activeSet = new Set<string>()

  let weekly = 0
  let monthly = 0
  let last: string | null = null

  for (const i of items) {
    if (!i.updatedAt) continue
    const t = new Date(i.updatedAt).getTime()
    if (!isFinite(t)) continue
    activeSet.add(dayKey(t))
    if (t >= weekAgo) weekly++
    if (t >= monthAgo) monthly++
    if (last === null || t > new Date(last).getTime()) last = i.updatedAt
  }

  let streak = 0
  const anchorDay = activeSet.has(dayKey(nowT)) ? nowT : nowT - DAY
  let cursor = anchorDay
  while (activeSet.has(dayKey(cursor))) {
    streak++
    cursor -= DAY
  }

  return {
    weeklyAttempts: weekly,
    monthlyAttempts: monthly,
    activeDays: activeSet.size,
    lastActive: last,
    streakDays: streak,
  }
}

// ---- 温和洞察 ----

export function masteryInsights(items: MasteryItem[], now: Date = new Date(), limit = 4): string[] {
  if (items.length === 0) {
    return ['知微阁还没有知识点。记下一个正在琢磨的概念，让掌握度随实践生长。']
  }

  const out: string[] = []
  const ov = masteryOverview(items)
  const rhythm = masteryRhythm(items, now)

  if (ov.practiced === 0) {
    out.push(`收录了 ${ov.total} 个知识点，都还没练过——先挑一个最在意的开始。`)
  }

  if (ov.practiced > 0) {
    out.push(`已练过 ${ov.practiced} 个知识点，均值练习 ${ov.avgAttempts} 次。`)
  }

  if (ov.avgConfidence > 0) {
    out.push(`平均掌握度 ${ov.avgConfidence}。`)
  }

  if (ov.mastered > 0) {
    out.push(`${ov.mastered} 个已「通晓」，这份手感是可以迁移的。`)
  }

  if (rhythm.streakDays >= 3) {
    out.push(`已连续 ${rhythm.streakDays} 天回炉，温故的节律成了习惯。`)
  } else if (rhythm.monthlyAttempts >= 5) {
    out.push(`本月练习了 ${rhythm.monthlyAttempts} 次，日拱一卒正当时。`)
  }

  const weak = weakList(items)
  if (weak.length > 0) {
    const t = weak.slice(0, 3).map((w) => `「${w.item.topic}」`)
    out.push(`最该回炉的是 ${t.join('、')}。`)
  }

  return out.slice(0, limit)
}