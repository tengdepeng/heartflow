// ============================================================
// 成长庭院 · 习惯打卡日历分析引擎 (模块三十七)
// 聚合 HabitLike[].ticks 为 Streaks 式近 N 天打卡热图 + 维度统计
// 本地离线纯函数，数据背书：hf:habits（garden/Habit.ticks）
// ============================================================

import type { HabitLike } from './growth-meteor'

/** 单个打卡日格子 */
export interface DayCell {
  /** YYYY-MM-DD（本地时区） */
  date: string
  /** 星期标签 日/一/二… */
  label: string
  /** 当日有打卡的习惯数 */
  count: number
  /** 当日是否有人打卡 */
  active: boolean
}

/** 打卡日历聚合结果 */
export interface HabitCalendar {
  /** 近 N 天格子（含今天，按时间升序） */
  days: DayCell[]
  /** 本周打卡人次 */
  weekHits: number
  /** 累计打卡人次 */
  totalHits: number
  /** 有过打卡的习惯数 */
  activeHabits: number
  /** 今日已打卡习惯数 */
  todayHits: number
}

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 本地时区 YYYY-MM-DD */
export function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 聚合全部习惯的打卡记录为近 N 天热图 + 维度统计 */
export function habitCalendarAggregate(habits: HabitLike[], now: Date, days = 28): HabitCalendar {
  const todayStr = toLocalDate(now)

  const cells: DayCell[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const ds = toLocalDate(d)
    const count = habits.filter((h) => h.ticks.includes(ds)).length
    cells.push({ date: ds, label: WEEK_LABELS[d.getDay()], count, active: count > 0 })
  }

  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const weekStartStr = toLocalDate(weekStart)
  let weekHits = 0
  let totalHits = 0
  const activeIds = new Set<string>()
  for (const h of habits) {
    for (const t of h.ticks) {
      totalHits++
      activeIds.add(h.id)
      if (t >= weekStartStr) weekHits++
    }
  }

  const todayHits = habits.filter((h) => h.ticks.includes(todayStr)).length

  return { days: cells, weekHits, totalHits, activeHabits: activeIds.size, todayHits }
}

/** 单个习惯的打卡维度统计 */
export interface HabitDimension {
  id: string
  text: string
  /** 累计打卡次数 */
  hits: number
  /** 最近打卡日期（YYYY-MM-DD） */
  lastDate: string | null
  /** 当前连续 */
  streak: number
}

/** 统计每个习惯的打卡维度 */
export function habitDimensionStats(habits: HabitLike[]): HabitDimension[] {
  return habits.map((h) => ({
    id: h.id,
    text: h.text,
    hits: h.ticks.length,
    lastDate: h.ticks.length ? h.ticks[h.ticks.length - 1] : null,
    streak: h.streak,
  })).sort((a, b) => b.hits - a.hits)
}
