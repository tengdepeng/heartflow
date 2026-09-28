// ============================================================
// 阅览殿 · 年度阅读报告 单元测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { buildYearReport } from '../reading-report'
import type { Book, ReadingSession } from '../types'
import type { ReadingAnalytics } from '../reading-insights'
import type { SpeedStats } from '../reading-speed'

function session(date: string, duration: number, bookId = 'b1'): ReadingSession {
  return {
    id: date + bookId + duration,
    bookId,
    startPage: 0,
    endPage: 1,
    duration,
    date,
    timestamp: date + 'T00:00:00.000Z',
  }
}

function book(finishDate: string | undefined, status: Book['status'] = 'finished'): Book {
  return {
    id: 'bk_' + (finishDate ?? 'none'),
    title: '书',
    author: '作者',
    totalPages: 100,
    currentPage: 100,
    status,
    tags: [],
    quotes: [],
    totalReadingTime: 0,
    finishDate,
  }
}

const analytics: ReadingAnalytics = {
  totalBooks: 0,
  totalPages: 0,
  totalReadingTime: 0,
  avgReadingSpeed: 0,
  monthlyBooks: 0,
  monthlyReadingTime: 0,
  topTags: [{ tag: '科幻', count: 3 }, { tag: '哲学', count: 2 }, { tag: '历史', count: 1 }],
  timeDistribution: [],
  monthlyTrend: [],
  streak: 0,
  bestReadingDay: '',
}

const speed: SpeedStats = {
  averageWPM: 300,
  maxWPM: 500,
  minWPM: 100,
  medianWPM: 300,
  averageComprehension: 0.8,
  totalWordsRead: 120000,
  totalReadingTime: 0,
  speedVariance: 0,
  recentWPM: 320,
  trend: 'improving',
}

describe('reading-report 数据层', () => {
  it('聚合年阅读时长、读完本数、月度分布与最投入一天', () => {
    const report = buildYearReport(
      2026,
      [session('2026-09-01', 90), session('2026-09-15', 30), session('2025-12-31', 999)],
      [book('2026-09-10'), book('2025-12-01')],
      analytics,
      speed,
    )
    expect(report.year).toBe(2026)
    expect(report.totalBooks).toBe(2)
    expect(report.finishedBooks).toBe(1) // 仅 2026-09-10 计入本年
    expect(report.totalMinutes).toBe(120) // 仅 2026 会话
    expect(report.activeDays).toBe(2)
    expect(report.bestDay?.date).toBe('2026-09-01') // 90 > 30
    expect(report.avgWpm).toBe(300)
    expect(report.totalWords).toBe(120000)
    // 月度：2026-09 合并「读完 1 本 + 阅读 120 分钟」
    expect(report.monthly).toHaveLength(1)
    expect(report.monthly[0]).toMatchObject({ month: '2026-09', label: '9', books: 1, minutes: 120 })
  })

  it('跨年读完的书不计入本年，跨年会话不计入时长', () => {
    const report = buildYearReport(
      2026,
      [session('2025-08-01', 60)],
      [book('2025-08-01'), book('2024-01-01', 'finished')],
      analytics,
      speed,
    )
    expect(report.finishedBooks).toBe(0)
    expect(report.totalMinutes).toBe(0)
    expect(report.activeDays).toBe(0)
    expect(report.monthly).toHaveLength(0)
    expect(report.bestDay).toBeNull()
  })

  it('偏好标签截取前 6 个', () => {
    const report = buildYearReport(2026, [], [], analytics, speed)
    expect(report.topTags).toHaveLength(3)
    expect(report.topTags[0]).toEqual({ tag: '科幻', count: 3 })
  })

  it('空数据年给出全零报告', () => {
    const report = buildYearReport(2026, [], [], analytics, speed)
    expect(report.totalBooks).toBe(0)
    expect(report.finishedBooks).toBe(0)
    expect(report.totalMinutes).toBe(0)
    expect(report.activeDays).toBe(0)
    expect(report.bestDay).toBeNull()
    expect(report.monthly).toHaveLength(0)
  })
})
