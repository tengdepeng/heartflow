// ============================================================
// 阅览殿 · 阅读日历热力图 单元测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import type { ReadingSession } from '../types'

function setup(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const mock = createMockStorage()
  mock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = mock
  invalidateCache()
  return mock
}

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

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('reading-calendar 数据层', () => {
  it('dayLevel 阈值分级正确', async () => {
    setup()
    const m = await import('../reading-calendar')
    expect(m.dayLevel(0)).toBe(0)
    expect(m.dayLevel(1)).toBe(1)
    expect(m.dayLevel(30)).toBe(2)
    expect(m.dayLevel(60)).toBe(3)
    expect(m.dayLevel(120)).toBe(4)
    expect(m.dayLevel(300)).toBe(4)
  })

  it('aggregateByDay 同日分钟与会话累加，书目按不同 id 去重计数', async () => {
    setup()
    const m = await import('../reading-calendar')
    const days = m.aggregateByDay([
      session('2026-09-26', 20, 'b1'),
      session('2026-09-26', 30, 'b1'),
      session('2026-09-26', 10, 'b2'),
      session('2026-09-27', 40, 'b1'),
    ])
    expect(days.size).toBe(2)
    const d26 = days.get('2026-09-26')!
    expect(d26.minutes).toBe(60)
    expect(d26.sessions).toBe(3)
    expect(d26.books).toBe(2)
    expect(d26.level).toBe(3)
    expect(days.get('2026-09-27')!.minutes).toBe(40)
  })

  it('buildMonthCalendar 生成 6 周 × 7 格，当月统计正确且月外格标记', async () => {
    setup()
    const m = await import('../reading-calendar')
    // 2026-09-01 为周二（weekday=2），网格首格为 8/30(周日) 起的填充
    const cal = m.buildMonthCalendar(2026, 9, [
      session('2026-09-01', 90, 'b1'),
      session('2026-09-15', 15, 'b1'),
      session('2026-09-30', 5, 'b2'),
    ])
    expect(cal.weeks.length).toBe(6)
    expect(cal.weeks[0].length).toBe(7)
    expect(cal.activeDays).toBe(3)
    expect(cal.totalMinutes).toBe(90 + 15 + 5)
    expect(cal.totalSessions).toBe(3)
    const firstRowCell = cal.weeks[0][2]
    expect(firstRowCell.inMonth).toBe(true)
    expect(firstRowCell.date).toBe('2026-09-01')
    expect(firstRowCell.level).toBe(3) // 90 分钟 >=60 触发 level3（level4 需 >=120）
    expect(cal.weeks[0][0].inMonth).toBe(false)
    expect(cal.weeks[0][1].inMonth).toBe(false)
  })

  it('summarizeYear 仅统计目标年，并选出最投入的一天', async () => {
    setup()
    const m = await import('../reading-calendar')
    const sum = m.summarizeYear(2026, [
      session('2026-09-26', 60, 'b1'),
      session('2026-09-27', 120, 'b1'),
      session('2026-09-27', 30, 'b2'),
      session('2025-12-31', 999, 'b1'),
    ])
    expect(sum.totalMinutes).toBe(60 + 120 + 30)
    expect(sum.activeDays).toBe(2)
    expect(sum.bestDay?.date).toBe('2026-09-27')
    expect(sum.bestDay?.minutes).toBe(150)
    expect(sum.level4Days).toBe(1)
  })

  it('useReadingCalendar 导航：上一月 / 跨年前进，月度统计反映存储会话', async () => {
    // 生产态 setKV 写入的是 JSON 字符串，mock 需同样以字符串存储，loadSessions 才能 JSON.parse 成功
    setup({
      'hf:reading:sessions': JSON.stringify([session('2026-09-26', 30, 'b1')]),
    })
    const { useReadingCalendar } = await import('../reading-calendar')
    const cal = useReadingCalendar()
    cal.setView(2026, 9)
    expect(cal.viewMonth.value).toBe(9)
    expect(cal.viewYear.value).toBe(2026)
    cal.prevMonth()
    expect(cal.viewMonth.value).toBe(8)
    cal.prevMonth()
    expect(cal.viewMonth.value).toBe(7)
    cal.setView(2026, 12)
    cal.nextMonth()
    expect(cal.viewYear.value).toBe(2027)
    expect(cal.viewMonth.value).toBe(1)
    // 跨年后再回到有数据的 2026-09，月度统计应反映存储会话
    cal.setView(2026, 9)
    expect(cal.sessions.value.length).toBe(1)
    expect(cal.monthCalendar.value.totalMinutes).toBe(30)
  })
})
