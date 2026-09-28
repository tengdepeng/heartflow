// ============================================================
// 阅览殿 · 阅读日历热力图
// ------------------------------------------------------------
// 按 ReadingSession.date + duration 聚合「日 / 月 / 年」的阅读
// 时长与书目数，渲染 GitHub 风格的月级热力小格（强度 = 分钟）。
//
// 数据来源于 useReadingHall().sessions（键 hf:reading:sessions），
// 与书卷/书架同源，不引入新的存储键。
// 纯聚合函数（dayLevel / aggregateByDay / buildMonthCalendar /
// summarizeYear）与本模块单测解耦，无需挂载组件即可验证。
// ============================================================

import { ref, computed } from 'vue'
import type { ReadingSession } from './types'
import { useReadingHall } from './hall'

/** 单日阅读聚合 */
export interface DayReading {
  /** YYYY-MM-DD */
  date: string
  /** 当日累计阅读分钟 */
  minutes: number
  /** 当日阅读的不同书目数 */
  books: number
  /** 当日会话数 */
  sessions: number
  /** 强度等级 0-4 */
  level: number
}

/** 月历格子（含月外填充格） */
export interface MonthCell extends DayReading {
  /** 是否属于当前查看月份 */
  inMonth: boolean
  /** 0=周日 … 6=周六 */
  weekday: number
}

/** 月历 */
export interface MonthCalendar {
  year: number
  month: number // 1-12
  /** 6 周 × 7 天 */
  weeks: MonthCell[][]
  totalMinutes: number
  totalSessions: number
  /** 当月有阅读（minutes>0）的天数 */
  activeDays: number
}

/** 年度阅读小结 */
export interface YearSummary {
  year: number
  totalMinutes: number
  totalSessions: number
  activeDays: number
  bestDay: DayReading | null
  level4Days: number
  level3Days: number
  level2Days: number
  level1Days: number
}

/** 进入 level 1/2/3/4 的分钟阈值（>= 即晋升一级） */
const MINUTE_LEVELS = [1, 30, 60, 120]

/** 由当日阅读分钟推导热力等级（0-4） */
export function dayLevel(minutes: number): number {
  if (minutes <= 0) return 0
  let level = 0
  for (const threshold of MINUTE_LEVELS) {
    if (minutes >= threshold) level++
    else break
  }
  return level
}

/** 把会话数组按日聚合（纯函数，便于单测） */
export function aggregateByDay(sessions: ReadingSession[]): Map<string, DayReading> {
  const minutesByDay = new Map<string, number>()
  const sessionsByDay = new Map<string, number>()
  const booksByDay = new Map<string, Set<string>>()
  for (const s of sessions) {
    minutesByDay.set(s.date, (minutesByDay.get(s.date) ?? 0) + s.duration)
    sessionsByDay.set(s.date, (sessionsByDay.get(s.date) ?? 0) + 1)
    if (!booksByDay.has(s.date)) booksByDay.set(s.date, new Set())
    booksByDay.get(s.date)!.add(s.bookId)
  }
  const map = new Map<string, DayReading>()
  for (const [date, minutes] of minutesByDay) {
    map.set(date, {
      date,
      minutes,
      sessions: sessionsByDay.get(date) ?? 0,
      books: booksByDay.get(date)?.size ?? 0,
      level: dayLevel(minutes),
    })
  }
  return map
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

/**
 * 构建某年某月的日历矩阵（6 周 × 7 天，覆盖月前/月后填充）。
 * 纯函数：sessions 直接传入，不读存储。
 */
export function buildMonthCalendar(year: number, month: number, sessions: ReadingSession[]): MonthCalendar {
  const byDay = aggregateByDay(sessions)
  const first = new Date(year, month - 1, 1)
  const startWeekday = first.getDay() // 0=周日
  const gridStart = new Date(year, month - 1, 1 - startWeekday)

  const weeks: MonthCell[][] = []
  let totalMinutes = 0
  let totalSessions = 0
  let activeDays = 0

  for (let w = 0; w < 6; w++) {
    const row: MonthCell[] = []
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + d)
      const inMonth = cellDate.getMonth() === month - 1
      const dateStr = ymd(cellDate.getFullYear(), cellDate.getMonth() + 1, cellDate.getDate())
      const agg = inMonth ? byDay.get(dateStr) : undefined
      const minutes = agg?.minutes ?? 0
      const cell: MonthCell = {
        date: dateStr,
        minutes,
        books: agg?.books ?? 0,
        sessions: agg?.sessions ?? 0,
        level: agg?.level ?? 0,
        inMonth,
        weekday: cellDate.getDay(),
      }
      row.push(cell)
      if (inMonth) {
        totalMinutes += minutes
        totalSessions += cell.sessions
        if (minutes > 0) activeDays++
      }
    }
    weeks.push(row)
  }

  return { year, month, weeks, totalMinutes, totalSessions, activeDays }
}

/** 年度阅读小结（纯函数） */
export function summarizeYear(year: number, sessions: ReadingSession[]): YearSummary {
  const prefix = String(year)
  const byDay = aggregateByDay(sessions.filter((s) => s.date.startsWith(prefix)))
  let totalMinutes = 0
  let totalSessions = 0
  let activeDays = 0
  let bestDay: DayReading | null = null
  const levels = [0, 0, 0, 0, 0]
  for (const day of byDay.values()) {
    totalMinutes += day.minutes
    totalSessions += day.sessions
    if (day.minutes > 0) activeDays++
    if (!bestDay || day.minutes > bestDay.minutes) bestDay = day
    levels[day.level]++
  }
  return {
    year,
    totalMinutes,
    totalSessions,
    activeDays,
    bestDay,
    level4Days: levels[4],
    level3Days: levels[3],
    level2Days: levels[2],
    level1Days: levels[1],
  }
}

/**
 * 阅读日历组合式：以 useReadingHall().sessions 为数据源，
 * 提供按月导航与月度/年度派生统计。
 */
export function useReadingCalendar() {
  const hall = useReadingHall()
  const now = new Date()
  const viewYear = ref(now.getFullYear())
  const viewMonth = ref(now.getMonth() + 1)

  const monthCalendar = computed(() => buildMonthCalendar(viewYear.value, viewMonth.value, hall.sessions.value))
  const yearSummary = computed(() => summarizeYear(viewYear.value, hall.sessions.value))

  function prevMonth() {
    if (viewMonth.value === 1) {
      viewMonth.value = 12
      viewYear.value -= 1
    } else {
      viewMonth.value -= 1
    }
  }

  function nextMonth() {
    if (viewMonth.value === 12) {
      viewMonth.value = 1
      viewYear.value += 1
    } else {
      viewMonth.value += 1
    }
  }

  function setView(y: number, m: number) {
    viewYear.value = y
    viewMonth.value = Math.max(1, Math.min(12, m))
  }

  return {
    viewYear,
    viewMonth,
    sessions: hall.sessions,
    monthCalendar,
    yearSummary,
    prevMonth,
    nextMonth,
    setView,
  }
}
