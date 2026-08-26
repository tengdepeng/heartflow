// ============================================================
// 岁时阁 · 岁时档案分析引擎（seasonal-analytics）
// 从四季仪式读出「岁时有序」的痕迹：
// 档案概览、季节分布、岁时健康度、温和洞察。
// 全纯函数、本地计算、零网络出口（守宪法第 1 条）。
// 顺着蓝图「岁时仪式」：只呈现节律的流转，不催促、不评判。
// ============================================================

import type { Season, SeasonalRitual } from './types'
import { SEASON_META } from './data'

const DAY = 86_400_000

function seasonIcon(season: Season): string {
  return SEASON_META.find((m) => m.key === season)?.icon || ''
}

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

const SEASON_LABEL: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

// ---- 档案概览 ----

export interface SeasonalOverview {
  total: number
  /** 已有完成记录的仪式数 */
  awakened: number
  /** 今年累计完成次数 */
  doneThisYear: number
  /** 平均单仪式完成次数 */
  avgCount: number
  /** 连续打卡天数 */
  streak: number
  /** 覆盖到的季节数（有完成记录的） */
  coveredSeasons: number
  /** 最近一次完成时刻 */
  lastActive: string | null
}

export function seasonalOverview(
  rituals: SeasonalRitual[],
  now: Date = new Date(),
): SeasonalOverview {
  const total = rituals.length
  const awakened = rituals.filter((r) => r.count > 0).length
  const year = now.getFullYear()

  let doneThisYear = 0
  let countSum = 0
  let last: string | null = null
  const dateSet = new Set<string>()
  const activeSeasons = new Set<Season>()

  for (const r of rituals) {
    if (r.count > 0) {
      countSum += r.count
      activeSeasons.add(r.season)
      if (r.lastCompletedAt) {
        const d = new Date(r.lastCompletedAt)
        dateSet.add(dayKey(d.getTime()))
        if (d.getFullYear() === year) doneThisYear += r.count
        if (last === null || d.getTime() > new Date(last).getTime()) last = r.lastCompletedAt
      }
    }
  }

  const avgCount = awakened ? Math.round((countSum / awakened) * 10) / 10 : 0

  // 连续打卡天数（从今日或昨日回溯）
  const nowT = now.getTime()
  const anchorDay = dateSet.has(dayKey(nowT)) ? nowT : dateSet.has(dayKey(nowT - DAY)) ? nowT - DAY : -1
  let streak = 0
  if (anchorDay !== -1) {
    let cursor = anchorDay
    while (dateSet.has(dayKey(cursor))) {
      streak++
      cursor -= DAY
    }
  }

  return {
    total,
    awakened,
    doneThisYear,
    avgCount,
    streak,
    coveredSeasons: activeSeasons.size,
    lastActive: last,
  }
}

// ---- 季节分布 ----

export interface SeasonRow {
  season: Season
  label: string
  icon: string
  /** 该季仪式数 */
  ritualCount: number
  /** 该季已完成（count>0）数 */
  completedCount: number
  /** 完成占比 0-100 */
  doneRate: number
}

export function seasonRows(rituals: SeasonalRitual[]): SeasonRow[] {
  return SEASON_ORDER.map((season) => {
    const list = rituals.filter((r) => r.season === season)
    const ritualCount = list.length
    const completedCount = list.filter((r) => r.count > 0).length
    return {
      season,
      label: SEASON_LABEL[season],
      icon: seasonIcon(season),
      ritualCount,
      completedCount,
      doneRate: ritualCount ? Math.round((completedCount / ritualCount) * 100) : 0,
    }
  })
}

// ---- 岁时健康（0-100）----

export interface SeasonalHealth {
  /** 0-100：时节越被拾起寒意越浅 */
  score: number
  /** 广度（覆盖季节 + 仪式被唤醒比例）0-100 */
  breadth: number
  /** 深度（单仪式平均完成次数）0-100 */
  depth: number
  /** 节律（近 14 天的活跃日数）0-100 */
  cadence: number
  label: string
}

export function seasonHealth(rituals: SeasonalRitual[], now: Date = new Date()): SeasonalHealth {
  const ov = seasonalOverview(rituals, now)

  // 广度：覆盖季节分 + 唤醒仪式分
  const seasonScore = (ov.coveredSeasons / 4) * 100
  const awakenScore = ov.total ? (ov.awakened / ov.total) * 100 : 0
  const breadth = Math.round(seasonScore * 0.5 + awakenScore * 0.5)

  // 深度：平均完成次数（≥5 得满分）
  const depth = clamp(Math.round((ov.avgCount / 5) * 100))

  // 节律：近 14 天活跃日数（≥7 得满分）
  const cutoff = now.getTime() - 14 * DAY
  const activeDays = new Set<string>()
  for (const r of rituals) {
    if (r.lastCompletedAt) {
      const t = new Date(r.lastCompletedAt).getTime()
      if (isFinite(t) && t >= cutoff) activeDays.add(dayKey(t))
    }
  }
  const cadence = clamp(Math.round((activeDays.size / 7) * 100))

  const score = Math.round(breadth * 0.4 + depth * 0.35 + cadence * 0.25)
  const label =
    score >= 70 ? '岁时入序' : score >= 45 ? '节律渐起' : score >= 20 ? '偶拾时节' : '岁时待启'

  return { score, breadth, depth, cadence, label }
}

// ---- 温和洞察 ----

export function seasonalInsights(
  rituals: SeasonalRitual[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  if (rituals.length === 0) {
    return ['岁时阁还没有仪式。从顺应当下的季节，记下一个想反复做的小仪式开始。']
  }

  const out: string[] = []
  const ov = seasonalOverview(rituals, now)
  const health = seasonHealth(rituals, now)
  const rows = seasonRows(rituals)

  if (ov.total > 0 && ov.awakened === 0) {
    out.push(`收录了 ${ov.total} 个节气仪式，都还没开始——让其中一个在今天落地。`)
  }

  if (ov.awakened > 0) {
    out.push(`已有 ${ov.awakened} 个仪式被拾起，共完成 ${ov.doneThisYear} 次（今年），平均每熟练 ${ov.avgCount} 次。`)
  }

  if (ov.streak >= 3) {
    out.push(`已连续 ${ov.streak} 天踏着时点归来，节律正在成形。`)
  }

  const activeSeasons = rows.filter((r) => r.completedCount > 0)
  if (activeSeasons.length === 1) {
    out.push(`目前只有${activeSeasons[0].label}季的仪式常被拾起，另三季还候着时令。`)
  }

  if (health.score > 0) {
    out.push(`近期岁时沉淀为「${health.label}」。`)
  }

  const quietest = rows.filter((r) => r.completedCount === 0)
  if (quietest.length === 1) {
    const { season, icon } = quietest[0]
    out.push(`${icon} ${SEASON_LABEL[season]}季的仪式尚未被拾起，挑一个在${SEASON_LABEL[season]}天试试。`)
  }

  return out.slice(0, limit)
}