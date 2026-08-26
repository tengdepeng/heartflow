// ============================================================
// 成长庭院 · 成长气象引擎
// 借鉴「大运流年趋势分析」的结构化呈现，仅做自我成长的浓缩回顾，
// 不引入任何命理推算。将目标 / 种子 / 习惯 / 蜕变光茧
// 汇聚为一张「成长气象图」，全部本地计算。
// 守宪法第1条本地私有、第2条超级自定义。
// ============================================================

import type { Goal, GoalStatus } from '../goal/types'
import type { Cocoon } from '../seasonal/cocoon'

export interface SeedLike {
  id: string
  sprouted: boolean
  at: string
}

export interface HabitLike {
  id: string
  text: string
  streak: number
  streakPct: number
  ticks: string[]
}

// ---- 概览 ----

export interface GrowthOverview {
  totalTargets: number
  bloomed: number
  growing: number
  dormant: number
  bloomRate: number // %
  seedCount: number
  sproutCount: number
  sproutRate: number // %
  habitCount: number
  avgStreak: number
  bestHabit: string | null
  cocoonCount: number
  flyingCocoons: number
}

export function growthOverview(
  targets: Goal[],
  seeds: SeedLike[],
  habits: HabitLike[],
  cocoons: Cocoon[],
): GrowthOverview {
  const bloomed = targets.filter(t => t.status === 'bloom').length
  const growing = targets.filter(t => t.status === 'growing' || t.status === 'sprout').length
  const dormant = targets.filter(t => t.status === 'dormant').length

  const sproutCount = seeds.filter(s => s.sprouted).length
  const ratedHabits = habits.filter(h => h.streak > 0 || h.ticks.length > 0)
  const avgStreak = ratedHabits.length
    ? Math.round(ratedHabits.reduce((s, h) => s + h.streak, 0) / ratedHabits.length * 10) / 10
    : 0
  const bestHabit = habits.length
    ? [...habits].sort((a, b) => b.streak - a.streak)[0]?.text || null
    : null

  return {
    totalTargets: targets.length,
    bloomed,
    growing,
    dormant,
    bloomRate: targets.length ? Math.round((bloomed / targets.length) * 100) : 0,
    seedCount: seeds.length,
    sproutCount,
    sproutRate: seeds.length ? Math.round((sproutCount / seeds.length) * 100) : 0,
    habitCount: habits.length,
    avgStreak,
    bestHabit,
    cocoonCount: cocoons.length,
    flyingCocoons: cocoons.filter(c => c.stage === 'flying').length,
  }
}

// ---- 分布 ----

export interface DomainRow {
  domain: Goal['domain']
  label: string
  color: string
  count: number
  pct: number
}

const DOMAIN_LABELS: Record<Goal['domain'], string> = {
  work: '工作', growth: '成长', health: '健康', relation: '关系',
  wealth: '财富', play: '逸趣', other: '其他',
}
const DOMAIN_COLORS: Record<Goal['domain'], string> = {
  work: '#6b9fc4', growth: '#8a9a7a', health: '#d98c7a', relation: '#f0c040',
  wealth: '#e0a96d', play: '#5ab8a0', other: '#a07c8c',
}

const STAGE_ORDER: GoalStatus[] = ['seed', 'sprout', 'growing', 'bloom', 'dormant']
export const STAGE_LABELS: Record<GoalStatus, string> = {
  seed: '种子', sprout: '发芽', growing: '生长中', bloom: '已开花', dormant: '休眠',
}

export function domainDistribution(targets: Goal[]): DomainRow[] {
  const total = targets.length || 1
  return (Object.keys(DOMAIN_LABELS) as Goal['domain'][]).map((domain) => {
    const count = targets.filter(t => t.domain === domain).length
    return {
      domain,
      label: DOMAIN_LABELS[domain],
      color: DOMAIN_COLORS[domain],
      count,
      pct: Math.round((count / total) * 100),
    }
  }).filter(r => r.count > 0)
}

export interface StageRow {
  status: GoalStatus
  label: string
  count: number
  pct: number
}

export function stageDistribution(targets: Goal[]): StageRow[] {
  const total = targets.length || 1
  return STAGE_ORDER.map((status) => {
    const count = targets.filter(t => t.status === status).length
    return {
      status,
      label: STAGE_LABELS[status],
      count,
      pct: Math.round((count / total) * 100),
    }
  }).filter(r => r.count > 0)
}

// ---- 习惯审视 ----

export interface HabitReview {
  best: { text: string; streak: number } | null
  strong: { text: string; streak: number }[]
  stagnant: { text: string; streak: number }[]
}

export function habitReview(habits: HabitLike[]): HabitReview {
  const sorted = [...habits].sort((a, b) => b.streak - a.streak)
  return {
    best: sorted.length ? { text: sorted[0].text, streak: sorted[0].streak } : null,
    strong: sorted.filter(h => h.streak >= 3).map(h => ({ text: h.text, streak: h.streak })),
    stagnant: sorted.filter(h => h.streak > 0 && h.streak <= 1).map(h => ({ text: h.text, streak: h.streak })),
  }
}

// ---- 成长势能 ----

export interface GrowthMomentum {
  /** 0~100 成长势能 */
  score: number
  label: string
  color: string
}

export function growthMomentum(targets: Goal[], seeds: SeedLike[], habits: HabitLike[]): GrowthMomentum {
  const total = targets.length
  if (total === 0 && seeds.length === 0 && habits.length === 0) {
    return { score: 0, label: '刚开垦', color: '#6b7280' }
  }

  // 开花率 40%
  const bloomComponent = targets.length
    ? (targets.filter(t => t.status === 'bloom').length / targets.length) * 40
    : 0
  // 活跃占比（非休眠目标）30%
  const activeComponent = targets.length
    ? (targets.filter(t => t.status !== 'dormant').length / targets.length) * 30
    : 30
  // 种子发芽率 15%
  const sproutComponent = seeds.length
    ? (seeds.filter(s => s.sprouted).length / seeds.length) * 15
    : 0
  // 习惯活力（存在习惯 + 平均连续）15%
  let habitComponent = 0
  if (habits.length) {
    const hasHabit = 8
    const avgStreak = habits.reduce((s, h) => s + h.streak, 0) / habits.length
    habitComponent = hasHabit + Math.min(avgStreak, 7) * 1
  }

  let score = Math.round(bloomComponent + activeComponent + sproutComponent + habitComponent)
  score = Math.max(0, Math.min(100, score))

  let label: string
  let color: string
  if (score >= 75) { label = '节节拔高'; color = '#34d399' }
  else if (score >= 55) { label = '稳健生长'; color = '#8a9a7a' }
  else if (score >= 35) { label = '徐徐日增'; color = '#f0c040' }
  else if (score >= 15) { label = '萌芽静待'; color = '#e0a96d' }
  else { label = '疏于打理'; color = '#a07c8c' }

  return { score, label, color }
}

// ---- 温和洞察 ----

export function growthInsights(
  targets: Goal[],
  seeds: SeedLike[],
  habits: HabitLike[],
  cocoons: Cocoon[],
  now: Date,
  limit = 4,
): string[] {
  const insights: string[] = []
  const overview = growthOverview(targets, seeds, habits, cocoons)

  if (overview.totalTargets === 0 && overview.seedCount === 0 && overview.habitCount === 0 && overview.cocoonCount === 0) {
    return ['花园还空着，从种下一颗种子或立一个目标开始吧。']
  }

  if (overview.bloomed > 0) {
    insights.push(`已有 ${overview.bloomed} 个目标开花，这是你亲手浇灌出的果实。`)
  } else if (overview.totalTargets > 0) {
    const oldest = [...targets].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
    if (oldest) {
      const days = Math.max(0, Math.floor((now.getTime() - new Date(oldest.createdAt).getTime()) / 86400000))
      if (days > 0) insights.push(`最早的目标已走过了 ${days} 天，仍在路上。`)
    }
  }

  if (overview.totalTargets > 0 && overview.dormant > 0) {
    insights.push(`${overview.dormant} 个目标正休眠，醒来也许只差一个「推进」。`)
  }

  if (overview.seedCount > 0) {
    const unSprouted = overview.seedCount - overview.sproutCount
    if (unSprouted > 0) insights.push(`还有 ${unSprouted} 颗种子未发芽，给它们一个开始的机会。`)
    if (overview.sproutRate >= 60) insights.push(`种子发芽率达 ${overview.sproutRate}%，行动力值得肯定。`)
  }

  const review = habitReview(habits)
  if (review.strong.length) insights.push(`「${review.strong[0].text}」已连续 ${review.strong[0].streak} 天，是你的定海神针。`)
  if (review.stagnant.length) insights.push(`「${review.stagnant[0].text}」总是中断，试着拆小一点点。`)

  if (overview.flyingCocoons > 0) {
    insights.push(`${overview.flyingCocoons} 枚光茧已展翅，蜕变正在发生。`)
  } else if (overview.cocoonCount > 0) {
    insights.push(`还有 ${overview.cocoonCount} 枚光茧在孕育，多给它们一点时间。`)
  }

  return insights.slice(0, limit)
}