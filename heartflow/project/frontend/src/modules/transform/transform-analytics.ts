// ============================================================
// 蜕变回廊 · 蜕变势能分析引擎（transform-analytics）
// 把零散的蜕变记录升华成"成长势能"：活力评分、节奏、连续每周蜕变、洞察。
// 全纯函数、本地计算，零网络出口（守宪法第 1 条）。
// ============================================================

import type { Transformation, TransformType } from './gallery'

export interface TransformMomentum {
  /** 0-100 成长势能评分 */
  score: number
  /** 势能档位 */
  level: 'sparking' | 'rising' | 'steady' | 'thriving'
  /** 距上次蜕变天数（无可记录为 null） */
  daysSinceLast: number | null
  /** 近 7 天蜕变次数 */
  last7Count: number
  /** 近 30 天蜕变次数 */
  last30Count: number
  /** 近 30 天覆盖的变化类型 */
  activeTypes: TransformType[]
}

export interface TransformCadence {
  /** 平均间隔天数（≥2 条才计算） */
  avgIntervalDays: number | null
  /** 最长的两次记录间隔（天，≥2 条） */
  longestGapDays: number | null
  /** 当前连续蜕变周数（近几周每周至少记录一次） */
  currentWeekStreak: number
  /** 累计出现蜕变的周数 */
  totalActiveWeeks: number
}

const LEVELS = [
  { max: 20, level: 'sparking' as const, label: '微光' },
  { max: 45, level: 'rising' as const, label: '苏醒' },
  { max: 72, level: 'steady' as const, label: '生长' },
  { max: Infinity, level: 'thriving' as const, label: '勃发' },
]

const LEVEL_LABELS: Record<TransformMomentum['level'], string> = {
  sparking: '微光',
  rising: '苏醒',
  steady: '生长',
  thriving: '勃发',
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function startOfWeek(d: Date): number {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = day.getDay() === 0 ? 7 : day.getDay() // 周一为一周之始
  day.setDate(day.getDate() - (dow - 1))
  return day.getTime()
}

function parseTime(s: string): number {
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * 成长势能：综合"最近活跃（40%）、近30天频率（35%）、近30天类型多样（25%）"得出 0-100。
 */
export function transformMomentum(records: Transformation[], now: Date = new Date()): TransformMomentum {
  const dayMs = 86_400_000
  const today = startOfDay(now)
  const last7Start = today - 6 * dayMs
  const last30Start = today - 29 * dayMs
  const dayOf = (t: number) => (today - t) / dayMs

  const times = records.map((r) => parseTime(r.createdAt)).filter((t) => t > 0)
  if (times.length === 0) {
    return { score: 0, level: 'sparking', daysSinceLast: null, last7Count: 0, last30Count: 0, activeTypes: [] }
  }

  const lastTime = Math.max(...times)
  const daysSinceLast = Math.max(0, Math.round(dayOf(lastTime)))

  const last7 = times.filter((t) => t >= last7Start).length
  const last30All = times.filter((t) => t >= last30Start).length
  const activeTypes = [
    ...new Set(records.filter((r) => parseTime(r.createdAt) >= last30Start).map((r) => r.type)),
  ]

  // 最近活跃分：最近 7 天内活跃给满分，每过一天线性衰减，30 天外归 0
  const recency = Math.max(0, 1 - daysSinceLast / 10) // 10 天线性衰减到 0
  const recencyScore = Math.round(40 * recency)

  // 频率分：近 30 天每 1 次约 7 分，封顶 35
  const freqScore = Math.min(35, Math.round(last30All * 7))

  // 多样分：近 30 天每覆盖 1 类约 6 分，封顶 25
  const varietyScore = Math.min(25, activeTypes.length * 6)

  const score = clamp(Math.round(recencyScore + freqScore + varietyScore), 0, 100)
  const level = LEVELS.find((l) => score <= l.max)!.level

  return { score, level, daysSinceLast, last7Count: last7, last30Count: last30All, activeTypes }
}

/** 蜕变节奏：平均间隔、最长空窗、当前连续蜕变周数、累计活跃周数 */
export function transformCadence(records: Transformation[], now: Date = new Date()): TransformCadence {
  const times = records.map((r) => parseTime(r.createdAt)).filter((t) => t > 0).sort((a, b) => a - b)
  const empty: TransformCadence = { avgIntervalDays: null, longestGapDays: null, currentWeekStreak: 0, totalActiveWeeks: 0 }
  if (times.length === 0) return empty

  const dayMs = 86_400_000

  let totalGap = 0
  let gaps = 0
  let longestGap = 0
  for (let i = 1; i < times.length; i++) {
    const gap = (times[i] - times[i - 1]) / dayMs
    totalGap += gap
    gaps++
    if (gap > longestGap) longestGap = gap
  }

  // 当前连续蜕变周数：从本周向前数，每周至少一次记录才连续
  const weekSet = new Set(times.map((t) => startOfWeek(new Date(t))))
  const currentWeek = startOfWeek(now)
  let streak = 0
  for (let w = currentWeek; weekSet.has(w); w -= 7 * dayMs) streak++

  return {
    avgIntervalDays: gaps ? Math.round(totalGap / gaps) : null,
    longestGapDays: gaps ? Math.round(longestGap) : null,
    currentWeekStreak: streak,
    totalActiveWeeks: weekSet.size,
  }
}

/** 变化类型热度（占记录总数的比例，倒序） */
export function typeHeat(records: Transformation[]): Array<{ type: TransformType; count: number; ratio: number }> {
  const total = records.length || 1
  const map = new Map<TransformType, number>()
  for (const r of records) map.set(r.type, (map.get(r.type) || 0) + 1)
  return [...map.entries()]
    .map(([type, count]) => ({ type, count, ratio: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 成长洞察：基于数据生成可读的启发式洞察（纯函数、无外部依赖）。
 * 返回最多 limit 条，按类型排序：势能解读 → 连续蜕变 → 空窗提醒 → 类型偏好。
 */
export function transformInsights(records: Transformation[], now: Date = new Date()): string[] {
  const out: string[] = []
  const momentum = transformMomentum(records, now)
  const cadence = transformCadence(records, now)
  const heat = typeHeat(records)
  const top = heat[0]

  if (records.length === 0) {
    return ['记录第一段蜕变，让成长有迹可循。']
  }

  out.push(`成长势能${LEVEL_LABELS[momentum.level]}：近 30 天蜕变 ${momentum.last30Count} 次`)

  if (cadence.currentWeekStreak >= 2) {
    out.push(`已连续 ${cadence.currentWeekStreak} 周每周都有蜕变，恒心可贵，继续守住。`)
  }

  if (momentum.daysSinceLast != null && momentum.daysSinceLast >= 14) {
    out.push(`已经 ${momentum.daysSinceLast} 天没有记录蜕变，从小改变重新拾起吧。`)
  } else if (cadence.longestGapDays != null && cadence.longestGapDays >= 21) {
    out.push(`最长有过 ${cadence.longestGapDays} 天的空窗——蜕变不死，只是休整。`)
  }

  if (top && top.ratio >= 50) {
    out.push(`「${top.type}」是你最密集的变化方向（占 ${top.ratio}%），不妨在它之上再加一个维度的拓张。`)
  } else if (top) {
    out.push(`你的变化维度均衡展开（${heat.map((h) => h.type).join('、')}），全人成长在路上。`)
  }

  return out
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}