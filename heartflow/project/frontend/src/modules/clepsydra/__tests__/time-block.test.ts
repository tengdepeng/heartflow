// ============================================================
// 更漏 · 时间块引擎纯函数单测
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  minutesToLabel,
  labelToMinutes,
  blockEndMin,
  mergeIntervals,
  freeGaps,
  sortTasksForSchedule,
  autoSchedule,
  scheduledMinutes,
  dayCoverage,
  localDateKey,
  blockToRecordInput,
  weekDaysOf,
  weekCoverage,
  blocksForWeek,
  WEEK_START_DOW,
  type PlannedTask,
  type TimeBlock,
} from '../time-block'

function makeTask(partial: Partial<PlannedTask> & { estimatedMinutes: number }): PlannedTask {
  return {
    id: partial.id ?? 't-' + Math.random().toString(36).slice(2, 7),
    title: partial.title ?? 'task',
    category: partial.category ?? 'project',
    date: partial.date ?? '2026-10-02',
    done: partial.done ?? false,
    createdAt: partial.createdAt ?? '2026-10-02T00:00:00.000Z',
    ...partial,
  }
}

function makeBlock(partial: Partial<TimeBlock> & { startMin: number; durationMin: number }): TimeBlock {
  return {
    id: partial.id ?? 'b-' + Math.random().toString(36).slice(2, 7),
    date: partial.date ?? '2026-10-02',
    category: partial.category ?? 'project',
    title: partial.title ?? 'block',
    taskId: partial.taskId ?? null,
    done: partial.done ?? false,
    ...partial,
  }
}

describe('minutesToLabel / labelToMinutes', () => {
  it('round trips basic values', () => {
    expect(minutesToLabel(0)).toBe('00:00')
    expect(minutesToLabel(450)).toBe('07:30')
    expect(minutesToLabel(1380)).toBe('23:00')
    expect(labelToMinutes('07:30')).toBe(450)
    expect(labelToMinutes('23:00')).toBe(1380)
  })

  it('rejects invalid labels', () => {
    expect(labelToMinutes('25:00')).toBeNull()
    expect(labelToMinutes('07:99')).toBeNull()
    expect(labelToMinutes('abc')).toBeNull()
  })
})

describe('mergeIntervals', () => {
  it('merges overlapping and adjacent', () => {
    const out = mergeIntervals([
      { startMin: 60, endMin: 120 },
      { startMin: 100, endMin: 200 },
      { startMin: 200, endMin: 240 },
    ])
    expect(out).toEqual([{ startMin: 60, endMin: 240 }])
  })

  it('keeps disjoint intervals', () => {
    const out = mergeIntervals([
      { startMin: 0, endMin: 100 },
      { startMin: 200, endMin: 300 },
    ])
    expect(out).toHaveLength(2)
  })
})

describe('freeGaps', () => {
  it('splits one block in the middle into two gaps', () => {
    const gaps = freeGaps([{ startMin: 600, endMin: 660 }], 420, 1380)
    expect(gaps).toEqual([
      { startMin: 420, endMin: 600 },
      { startMin: 660, endMin: 1380 },
    ])
  })

  it('handles a block before window and after window via clamp', () => {
    const gaps = freeGaps([{ startMin: 0, endMin: 500 }, { startMin: 1300, endMin: 2000 }], 420, 1380)
    expect(gaps).toEqual([{ startMin: 500, endMin: 1300 }])
  })
})

describe('sortTasksForSchedule', () => {
  it('puts longer estimates first, then earlier createdAt', () => {
    const a = makeTask({ id: 'a', estimatedMinutes: 30, createdAt: '2026-01-01T00:00:00.000Z' })
    const b = makeTask({ id: 'b', estimatedMinutes: 90, createdAt: '2026-01-02T00:00:00.000Z' })
    const c = makeTask({ id: 'c', estimatedMinutes: 90, createdAt: '2026-01-01T00:00:00.000Z' })
    const sorted = sortTasksForSchedule([a, b, c])
    expect(sorted.map(t => t.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('autoSchedule', () => {
  const date = '2026-10-02'

  it('places unscheduled tasks into free gaps avoiding lunch', () => {
    const tasks = [
      makeTask({ id: 't1', estimatedMinutes: 60, date, createdAt: '2026-10-02T08:00:00.000Z' }),
      makeTask({ id: 't2', estimatedMinutes: 60, date, createdAt: '2026-10-02T09:00:00.000Z' }),
    ]
    const blocks = autoSchedule(tasks, [], {})
    expect(blocks).toHaveLength(2)
    // 第一个块从工作窗口起点 07:00 开始
    expect(blocks[0].startMin).toBe(420)
    expect(blocks[0].durationMin).toBe(60)
    expect(blocks[0].taskId).toBe('t1')
    // 第二个块紧接其后 08:00，未落入午休 12:00-13:00
    expect(blocks[1].startMin).toBe(480)
    // 没有任何块与午休重叠
    for (const b of blocks) {
      expect(b.startMin + b.durationMin <= 720 || b.startMin >= 780).toBe(true)
    }
  })

  it('does not double-book existing blocks', () => {
    const existing = [makeBlock({ id: 'x', startMin: 420, durationMin: 120, date })]
    const tasks = [makeTask({ id: 't1', estimatedMinutes: 60, date })]
    const blocks = autoSchedule(tasks, existing, {})
    // 新块应排在已有块之后（420+120=540 起）
    expect(blocks).toHaveLength(1)
    expect(blocks[0].startMin).toBe(540)
  })

  it('stops when no gap fits', () => {
    // 已有块填满整个工作窗口（07:00-23:00 = 960 分钟），无空隙
    const existing = [makeBlock({ id: 'x', startMin: 420, durationMin: 960, date })]
    const tasks = [
      makeTask({ id: 't1', estimatedMinutes: 60, date }),
      makeTask({ id: 't2', estimatedMinutes: 60, date }),
    ]
    const blocks = autoSchedule(tasks, existing, {})
    expect(blocks).toHaveLength(0)
  })

  it('ignores zero-estimate tasks', () => {
    const tasks = [makeTask({ id: 't1', estimatedMinutes: 0, date })]
    expect(autoSchedule(tasks, [], {})).toHaveLength(0)
  })

  it('is pure: does not mutate inputs', () => {
    const tasks = [makeTask({ id: 't1', estimatedMinutes: 30, date })]
    const blocks = [makeBlock({ id: 'x', startMin: 420, durationMin: 60, date })]
    const before = blocks.length
    autoSchedule(tasks, blocks, {})
    expect(blocks).toHaveLength(before)
  })
})

describe('scheduledMinutes / dayCoverage', () => {
  it('sums durations for the date', () => {
    const blocks = [
      makeBlock({ startMin: 420, durationMin: 60, date: '2026-10-02' }),
      makeBlock({ startMin: 540, durationMin: 30, date: '2026-10-02' }),
      makeBlock({ startMin: 420, durationMin: 60, date: '2026-10-03' }),
    ]
    expect(scheduledMinutes(blocks, '2026-10-02')).toBe(90)
  })

  it('coverage is ratio of scheduled window, capped at 1', () => {
    const blocks = [makeBlock({ startMin: 420, durationMin: 60, date: '2026-10-02' })] // 1h of 16h
    expect(dayCoverage(blocks, '2026-10-02', 420, 1380)).toBeCloseTo(1 / 16, 5)
  })
})

describe('localDateKey', () => {
  it('formats local date', () => {
    expect(localDateKey(new Date(2026, 9, 2, 23, 59))).toBe('2026-10-02')
  })
})

describe('blockEndMin', () => {
  it('returns start plus duration', () => {
    expect(blockEndMin({ startMin: 420, durationMin: 90 })).toBe(510)
  })
})

describe('blockToRecordInput', () => {
  it('把时间块映射为 auto 工作记录输入（按 date+startMin 算起止）', () => {
    const b = makeBlock({ id: 'blk-x', date: '2026-10-02', startMin: 9 * 60, durationMin: 45, category: 'study', title: '晨间复盘' })
    const input = blockToRecordInput(b)
    expect(input.sourceType).toBe('auto')
    expect(input.sourceAnchorId).toBe('blk-x')
    expect(input.category).toBe('study')
    expect(input.note).toBe('时间块·晨间复盘')
    // 09:00 + 45min = 09:45（本地时区）
    expect(input.startedAt.toISOString()).toBe(new Date('2026-10-02T09:00:00').toISOString())
    expect(input.endedAt.toISOString()).toBe(new Date('2026-10-02T09:45:00').toISOString())
  })
})

describe('周视图纯函数', () => {
  it('WEEK_START_DOW 为周一(1)', () => {
    expect(WEEK_START_DOW).toBe(1)
  })

  it('weekDaysOf 返回含 anchor 的那一周 7 个周一→周日 localDateKey', () => {
    // 2026-10-02 是周五；所在周应为 2026-09-28(周一) → 2026-10-04(周日)
    const days = weekDaysOf(new Date(2026, 9, 2, 12, 0))
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-09-28')
    expect(days[6]).toBe('2026-10-04')
    // 严格周一→周日递增
    const parsed = days.map(d => new Date(d + 'T00:00:00').getDay())
    expect(parsed).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('weekDaysOf 对周一 anchor 也返回该周', () => {
    const days = weekDaysOf(new Date(2026, 9, 5, 9, 0)) // 周一
    expect(days[0]).toBe('2026-10-05')
    expect(days[6]).toBe('2026-10-11')
  })

  it('blocksForWeek 仅保留属于该周的块', () => {
    const days = weekDaysOf(new Date(2026, 9, 2, 12, 0))
    const blocks = [
      makeBlock({ id: 'in', date: '2026-09-29', startMin: 420, durationMin: 60 }),
      makeBlock({ id: 'out', date: '2026-10-05', startMin: 420, durationMin: 60 }),
    ]
    const wk = blocksForWeek(blocks, days)
    expect(wk.map(b => b.id)).toEqual(['in'])
  })

  it('weekCoverage 为 7 天已排总分钟 / (7 × 工作窗口)，封顶 1', () => {
    const days = weekDaysOf(new Date(2026, 9, 2, 12, 0))
    // 每天排 1 小时（60 分钟），窗口 07:00-23:00 = 960 分钟
    const blocks = days.map((d, i) => makeBlock({ id: 'd' + i, date: d, startMin: 420, durationMin: 60 }))
    expect(weekCoverage(blocks, days, 420, 1380)).toBeCloseTo(60 / 960, 5)
    // 全填满应封顶 1
    const full = days.map((d, i) => makeBlock({ id: 'f' + i, date: d, startMin: 420, durationMin: 960 }))
    expect(weekCoverage(full, days, 420, 1380)).toBe(1)
  })
})
