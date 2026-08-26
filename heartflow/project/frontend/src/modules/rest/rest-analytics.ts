// ============================================================
// 息壤 · 休憩档案分析引擎（rest-analytics）
// 从每一次小憩读出「被滋养」的痕迹：
// 档案概览、活动分布、休憩节律、恢复健康、温和洞察。
// 全纯函数、本地计算、零网络出口。
// 顺着「息壤」蓝图：把身体的休息当成土壤，允许歇脚，滋养根系。
// ============================================================

import type { BreakRecord, RestPractice } from './types'

const DAY = 86_400_000

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- 档案概览 ----

export interface RestOverview {
  total: number
  /** 累计休息时长（分钟） */
  totalMinutes: number
  /** 本月休息次数 */
  thisMonth: number
  /** 本月累计时长（分钟） */
  thisMonthMinutes: number
  /** 平均单次时长（分钟） */
  avgDuration: number
  /** 平均心情 1-5 */
  avgMood: number
  /** 有记录的天数 */
  distinctDays: number
  /** 最近一次休息时刻 */
  lastActive: string | null
}

export function restOverview(records: BreakRecord[], now: Date = new Date()): RestOverview {
  const total = records.length
  let minutes = 0
  let moodSum = 0
  let durSum = 0
  let last: string | null = null
  const days = new Set<string>()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let thisMonth = 0
  let thisMonthMinutes = 0

  for (const r of records) {
    minutes += r.duration
    durSum += r.duration
    moodSum += r.mood
    days.add(dayKey(new Date(r.date).getTime()))
    if (r.date && last === null) last = r.date
    if (r.date.startsWith(yearMonth)) {
      thisMonth++
      thisMonthMinutes += r.duration
    }
  }

  return {
    total,
    totalMinutes: minutes,
    thisMonth,
    thisMonthMinutes,
    avgDuration: total ? Math.round(durSum / total) : 0,
    avgMood: total ? Math.round((moodSum / total) * 10) / 10 : 0,
    distinctDays: days.size,
    lastActive: last,
  }
}

// ---- 活动分布 ----

export interface RestActivityRow {
  /** 活动 id（practice id） */
  activity: string
  /** 显示名 */
  name: string
  icon: string
  count: number
  /** 占比 0-100 */
  pct: number
  /** 该活动累计时长（分钟） */
  minutes: number
}

export function restActivityRows(
  records: BreakRecord[],
  practices: RestPractice[],
  limit = 6,
): RestActivityRow[] {
  if (records.length === 0) return []
  const total = records.length
  const map = new Map<string, { count: number; minutes: number }>()
  for (const r of records) {
    const entry = map.get(r.activity) || { count: 0, minutes: 0 }
    entry.count++
    entry.minutes += r.duration
    map.set(r.activity, entry)
  }
  const rows = [...map.entries()]
    .map(([activity, { count, minutes }]) => {
      const p = practices.find((pr) => pr.id === activity)
      return {
        activity,
        name: p?.name || activity,
        icon: p?.icon || '🌿',
        count,
        pct: Math.round((count / total) * 100),
        minutes,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  // 补足恢复力参考（若对上有休憩方式）
  return rows
}

// ---- 休憩节律 ----

export interface RestRhythm {
  /** 近 7 天休息次数 */
  weeklyCount: number
  /** 近 7 天累计时长（分钟） */
  weeklyMinutes: number
  /** 连续休息天数（今日无则从昨日回溯） */
  streakDays: number
  /** 平均日间隔（天，≥2 记录时才有意义） */
  avgGapDays: number
  /** 单日最多休息次数 */
  peakDayCount: number
}

export function restRhythm(records: BreakRecord[], now: Date = new Date()): RestRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY

  let weeklyCount = 0
  let weeklyMinutes = 0
  const stamps: number[] = []
  const dateSet = new Set<string>()
  const perDay = new Map<string, number>()

  for (const r of records) {
    const t = new Date(r.date).getTime()
    if (!isFinite(t)) continue
    const key = dayKey(t)
    dateSet.add(key)
    perDay.set(key, (perDay.get(key) || 0) + 1)
    stamps.push(t)
    if (t >= weekAgo) {
      weeklyCount++
      weeklyMinutes += r.duration
    }
  }

  let streak = 0
  const anchorDay = dateSet.has(dayKey(nowT)) ? nowT : dateSet.has(dayKey(nowT - DAY)) ? nowT - DAY : -1
  if (anchorDay !== -1) {
    let cursor = anchorDay
    while (dateSet.has(dayKey(cursor))) {
      streak++
      cursor -= DAY
    }
  }

  let avgGap = 0
  if (stamps.length >= 2) {
    const sorted = [...stamps].sort((a, b) => a - b)
    let gapSum = 0
    for (let i = 1; i < sorted.length; i++) gapSum += (sorted[i] - sorted[i - 1]) / DAY
    avgGap = Math.round((gapSum / (sorted.length - 1)) * 10) / 10
  }

  let peakDayCount = 0
  for (const c of perDay.values()) peakDayCount = Math.max(peakDayCount, c)

  return { weeklyCount, weeklyMinutes, streakDays: streak, avgGapDays: avgGap, peakDayCount }
}

// ---- 恢复健康（0-100）----

export interface RestHealth {
  /** 0-100：身体被好好休息的程度 */
  score: number
  /** 广度（活动多样）+ 恢复力水平（平均心情×恢复度）0-100 */
  breadth: number
  /** 节律（近 14 天活跃休憩日）0-100 */
  cadence: number
  /** 滋养（充足时长 vs 理想）0-100 */
  nurture: number
  label: string
}

export function restHealth(
  records: BreakRecord[],
  practices: RestPractice[],
  now: Date = new Date(),
): RestHealth {
  const weeks = 2
  const idealDaily = 20 // 理想每日休憩 20 分钟
  const idealDays = weeks * 7

  // 广度：不同活动数 / 活跃方式多样性
  const acts = new Set(records.map((r) => r.activity))
  // 平均恢复度（取该活动对应休憩方式的 recovery，缺省 60）
  let recoverySum = 0
  for (const r of records) {
    const p = practices.find((pr) => pr.id === r.activity)
    recoverySum += p?.recovery ?? 60
  }
  const avgRecovery = records.length ? recoverySum / records.length : 0
  const breadth = Math.round(
    Math.min(acts.size, 6) * 10 + // 最多 60 分（6 种）
      (records.length ? (avgRecovery / 100) * 40 : 0), // 恢复度最多 40 分
  )

  // 节律：近 14 天活跃休憩日（≥8 天得满分）
  const cutoff = now.getTime() - 14 * DAY
  const activeDays = new Set<string>()
  for (const r of records) {
    const t = new Date(r.date).getTime()
    if (isFinite(t) && t >= cutoff) activeDays.add(dayKey(t))
  }
  const cadence = clamp(Math.round((activeDays.size / idealDays) * 100))

  // 滋养：近 14 天日均时长 / 理想 20 分钟
  let recentMinutes = 0
  for (const r of records) {
    const t = new Date(r.date).getTime()
    if (isFinite(t) && t >= cutoff) recentMinutes += r.duration
  }
  const dailyAvg = recentMinutes / 14
  const nurture = clamp(Math.round((dailyAvg / idealDaily) * 100))

  const score = Math.round(breadth * 0.4 + cadence * 0.3 + nurture * 0.3)
  const label =
    score >= 70 ? '土壤丰润' : score >= 45 ? '润养渐起' : score >= 20 ? '偶有歇脚' : '休土待垦'

  return { score, breadth, cadence, nurture, label }
}

// ---- 温和洞察 ----

export function restInsights(
  records: BreakRecord[],
  practices: RestPractice[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  if (records.length === 0) {
    return ['息壤未曾耕动。允许自己停下来喝杯茶、散个步——记下一笔，便开始滋养。']
  }

  const out: string[] = []
  const ov = restOverview(records, now)
  const rh = restRhythm(records, now)
  const health = restHealth(records, practices, now)
  const acts = restActivityRows(records, practices, 1)

  if (ov.avgMood >= 4) {
    out.push('休息后的心情整体不错，休憩在起作用。')
  } else if (ov.avgMood <= 2) {
    out.push('休息后心情仍然偏低，也许需要的不是更多小憩，而是更深处的一段留白。')
  }

  if (rh.streakDays >= 3) {
    out.push(`已连续 ${rh.streakDays} 天有休憩，息壤节律在成形。`)
  }

  if (acts[0] && acts[0].count > 0) {
    out.push(`最常用的是${acts[0].icon} ${acts[0].name}（${acts[0].count} 次）。`)
  }

  if (ov.thisMonth > 0 && ov.avgDuration < 15) {
    out.push('本月单次休息偏短（<15 分钟），试着把时长拉长一些。')
  }

  out.push(`近期滋养沉淀为「${health.label}」。`)

  return out.slice(0, limit)
}