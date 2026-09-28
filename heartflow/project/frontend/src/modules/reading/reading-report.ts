// ============================================================
// 阅览殿 · 年度阅读报告
// ------------------------------------------------------------
// 把分散在 hall / reading-insights / reading-speed 的阅读数据，
// 按「年」聚合成一份可读的年度报告（藏书 / 本年读完 / 时长 / 天数 /
// 均速 / 偏好标签 / 月度趋势 / 最投入的一天）。
//
// 复用 reading-calendar 的 summarizeYear 做年度时长聚合，
// 不引入新的存储键；纯函数 buildYearReport 便于单测。
// ============================================================

import { ref, computed } from 'vue'
import type { Book, ReadingSession } from './types'
import type { ReadingAnalytics } from './reading-insights'
import type { SpeedStats } from './reading-speed'
import { useReadingHall } from './hall'
import { useReadingInsights } from './reading-insights'
import { useReadingSpeed } from './reading-speed'
import { summarizeYear, type DayReading } from './reading-calendar'

/** 月度数据点 */
export interface MonthPoint {
  /** YYYY-MM */
  month: string
  /** 月标签（去前导零，如 "9"） */
  label: string
  books: number
  minutes: number
}

/** 年度阅读报告 */
export interface YearReport {
  year: number
  totalBooks: number
  finishedBooks: number
  totalMinutes: number
  activeDays: number
  bestDay: DayReading | null
  avgWpm: number
  totalWords: number
  topTags: { tag: string; count: number }[]
  monthly: MonthPoint[]
}

/** 纯聚合：由原始数据拼出某年报告（不读存储，便于单测） */
export function buildYearReport(
  year: number,
  sessions: ReadingSession[],
  books: Book[],
  analytics: ReadingAnalytics,
  speed: SpeedStats,
): YearReport {
  const prefix = String(year)
  const yearSummary = summarizeYear(year, sessions)

  const finishedThisYear = books.filter(
    b => b.status === 'finished' && (b.finishDate ?? '').startsWith(prefix),
  )

  // 月度分布：读完月份计书、阅读月份计分钟，合并到同一张月表
  const monthMap = new Map<string, { books: number; minutes: number }>()
  for (const b of finishedThisYear) {
    const m = (b.finishDate ?? '').slice(0, 7)
    if (!monthMap.has(m)) monthMap.set(m, { books: 0, minutes: 0 })
    monthMap.get(m)!.books += 1
  }
  for (const s of sessions) {
    if (!s.date.startsWith(prefix)) continue
    const m = s.date.slice(0, 7)
    if (!monthMap.has(m)) monthMap.set(m, { books: 0, minutes: 0 })
    monthMap.get(m)!.minutes += s.duration
  }
  const monthly: MonthPoint[] = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month,
      label: String(Number(month.slice(5))),
      books: v.books,
      minutes: v.minutes,
    }))

  return {
    year,
    totalBooks: books.length,
    finishedBooks: finishedThisYear.length,
    totalMinutes: yearSummary.totalMinutes,
    activeDays: yearSummary.activeDays,
    bestDay: yearSummary.bestDay,
    avgWpm: speed.averageWPM,
    totalWords: speed.totalWordsRead,
    topTags: (analytics.topTags ?? []).slice(0, 6),
    monthly,
  }
}

/**
 * 年度阅读报告组合式：以 hall / insights / speed 为数据源，
 * 提供按年查看的派生报告。
 */
export function useReadingReport() {
  const hall = useReadingHall()
  const insights = useReadingInsights()
  const speed = useReadingSpeed()
  const now = new Date()
  const viewYear = ref(now.getFullYear())

  const report = computed(() =>
    buildYearReport(
      viewYear.value,
      hall.sessions.value,
      hall.books.value,
      insights.analytics.value,
      speed.computeSpeedStats(),
    ),
  )

  function setYear(y: number) {
    viewYear.value = y
  }

  return { viewYear, report, setYear }
}
