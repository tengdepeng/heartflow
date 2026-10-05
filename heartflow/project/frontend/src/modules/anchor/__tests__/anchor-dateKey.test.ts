// ============================================================
// 锚点域 · 时区治理（INCR-466）
//
// 锚点域 4 处 UTC 裸切日已统一为 utils/time.ts 的 getLocalDateKey：
//   - anchor-journals.journalDateKey（手札日键，D 类形态 iso.slice(0,10)）
//   - AnchorJournalPanel.dateLabel（视图日期标签）
//   - anchor-review：getDateRange / generateDailyTrend / getStreakStats
//   - celebration：triggerCelebration 今日上下文 / 导出文件名 / checkStreak
// 东八区 00:00–08:00 发生的记录，用旧口径会被算到「前一天」。
//
// 反向验证：把实现改回 slice(0,10) / toISOString().split('T')[0] 后，
// 带「前提」标注的用例应转红（非 UTC 时区下才有意义）。
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { journalDateKey, filterJournals } from '../anchor-journals'
import { useAnchorReview } from '../anchor-review'
import { useCalendarExport, checkStreak } from '../celebration'
import type { Anchor } from '../types'

/** 本地某日某时 → UTC ISO 时间戳（东八区本地 03:00 = UTC 前一天 19:00） */
function localISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

function mkAnchor(partial: Partial<Anchor> & { id: string }): Anchor {
  return {
    id: partial.id,
    text: partial.text ?? '锚',
    done: partial.done ?? false,
    targetDate: partial.targetDate ?? '2026-03-15',
    createdAt: partial.createdAt ?? localISO(2026, 3, 15, 10),
    doneAt: partial.doneAt,
    priority: partial.priority ?? 'must',
    stage: partial.stage ?? 'active',
    driftCount: partial.driftCount ?? 0,
    tags: partial.tags ?? [],
    category: partial.category ?? '',
  }
}

describe('anchor-journals.journalDateKey · 本地日历日', () => {
  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })

  it('东八区凌晨的 UTC 时间戳返回本地当天，而非 UTC 前一天', () => {
    const iso = localISO(2026, 3, 15, 3) // 本地 03-15 03:00 = UTC 03-14 19:00
    expect(journalDateKey(iso)).toBe('2026-03-15')
    expect(journalDateKey(iso)).not.toBe(iso.slice(0, 10))
  })

  it('filterJournals 的日期范围按本地日键筛选', () => {
    const items = [
      {
        anchorId: 'a',
        content: '凌晨手札',
        createdAt: localISO(2026, 3, 15, 3),
        updatedAt: localISO(2026, 3, 15, 3),
      },
    ]
    expect(filterJournals(items, { dateFrom: '2026-03-15', dateTo: '2026-03-15' })).toHaveLength(1)
    // 旧口径会落到 03-14，此断言在旧实现下转红
    expect(filterJournals(items, { dateFrom: '2026-03-14', dateTo: '2026-03-14' })).toHaveLength(0)
  })
})

describe('anchor-review · 本地日历日', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15 03:00（东八区凌晨，UTC 仍是 03-14）
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getDateRange(日回顾) 的 end/start 用本地日', () => {
    const { getDateRange } = useAnchorReview()
    const r = getDateRange('daily')
    expect(r.end).toBe('2026-03-15')
    expect(r.start).toBe('2026-03-15')
  })

  it('getDateRange(周回顾) 起点为本地往前 6 天', () => {
    const { getDateRange } = useAnchorReview()
    const r = getDateRange('weekly')
    expect(r.end).toBe('2026-03-15')
    expect(r.start).toBe('2026-03-09')
  })

  it('getStreakStats 连续天数按本地日历日回溯', () => {
    const { getStreakStats } = useAnchorReview()
    const anchors = [
      mkAnchor({ id: '1', targetDate: '2026-03-14' }),
      mkAnchor({ id: '2', targetDate: '2026-03-13' }),
    ]
    // 旧口径 yesterday 会算成 03-13 → 只连 1 天
    expect(getStreakStats(anchors).currentStreak).toBe(2)
  })

  it('generateReview 每日趋势的日期键与 targetDate 同口径', () => {
    const { generateReview } = useAnchorReview()
    const anchors = [mkAnchor({ id: '1', targetDate: '2026-03-15', done: true })]
    const r = generateReview(anchors, 'daily')
    expect(r.dailyTrend).toHaveLength(1)
    expect(r.dailyTrend[0].date).toBe('2026-03-15')
    expect(r.dailyTrend[0].total).toBe(1)
  })
})

describe('celebration · 本地日历日', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('导出文件名使用本地日（东八区凌晨不落到 UTC 前一天）', () => {
    const { exportAsICS } = useCalendarExport()
    expect(exportAsICS([]).filename).toBe('heartflow-anchors-2026-03-15.ics')
  })

  it('checkStreak 按本地日历日统计连续完成', () => {
    const anchors = [
      mkAnchor({ id: '1', done: true, doneAt: localISO(2026, 3, 15, 10) }),
      mkAnchor({ id: '2', done: true, doneAt: localISO(2026, 3, 14, 3) }),
      mkAnchor({ id: '3', done: true, doneAt: localISO(2026, 3, 13, 3) }),
    ]
    // 旧口径把三条切成 {03-15,03-13,03-12}，从今天 UTC 键回溯会断在 0
    expect(checkStreak(anchors)).toBe(3)
  })
})