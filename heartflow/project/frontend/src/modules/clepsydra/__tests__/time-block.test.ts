// ============================================================
// 更漏 · 时间块引擎纯函数单测
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WorkRecord } from '../clepsydra'
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
  detectOverlapIds,
  resolveFreeStart,
  maxDurationInGap,
  compactDayLayout,
  buildTemplate,
  instantiateTemplate,
  computePlanActual,
  useTimeBlock,
  type PlannedTask,
  type TimeBlock,
  type BlockTemplate,
} from '../time-block'
import { useClepsydra, resetClepsydra } from '../clepsydra'

// 仅供 INCR-423 专注绑定集成用例使用的存储 mock（纯函数用例不触碰 storage，无副作用）
const { mockStorage, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  return {
    store,
    mockStorage: {
      getKV: (k: string, def: any) => (k in store ? store[k] : def),
      setKV: (k: string, v: any) => { store[k] = v },
    },
  }
})
vi.mock('../../../engine/storage', () => ({ storage: mockStorage }))

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

describe('detectOverlapIds', () => {
  const date = '2026-10-02'

  it('无重叠返回空集合', () => {
    const blocks = [
      makeBlock({ id: 'a', startMin: 420, durationMin: 60, date }),
      makeBlock({ id: 'b', startMin: 540, durationMin: 60, date }),
    ]
    expect(detectOverlapIds(blocks, date).size).toBe(0)
  })

  it('相邻（端点相接）不算重叠', () => {
    const blocks = [
      makeBlock({ id: 'a', startMin: 420, durationMin: 60, date }), // 420–480
      makeBlock({ id: 'b', startMin: 480, durationMin: 60, date }), // 480–540 相邻
    ]
    expect(detectOverlapIds(blocks, date).size).toBe(0)
  })

  it('严格相交标记双方 id', () => {
    const blocks = [
      makeBlock({ id: 'a', startMin: 420, durationMin: 120, date }), // 420–540
      makeBlock({ id: 'b', startMin: 480, durationMin: 60, date }), // 480–540 重叠
    ]
    const ids = detectOverlapIds(blocks, date)
    expect(ids.size).toBe(2)
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(true)
  })

  it('链式重叠标记所有参与方', () => {
    const blocks = [
      makeBlock({ id: 'a', startMin: 420, durationMin: 60, date }), // 420–480
      makeBlock({ id: 'b', startMin: 450, durationMin: 60, date }), // 450–510 与 a、c 重叠
      makeBlock({ id: 'c', startMin: 500, durationMin: 60, date }), // 500–560 与 b 重叠，不与 a
    ]
    const ids = detectOverlapIds(blocks, date)
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(true)
    expect(ids.has('c')).toBe(true)
  })

  it('跨天不重叠（全量检测时不同 date 互不干扰）', () => {
    const blocks = [
      makeBlock({ id: 'a', startMin: 420, durationMin: 60, date: '2026-10-02' }),
      makeBlock({ id: 'b', startMin: 420, durationMin: 60, date: '2026-10-03' }),
    ]
    expect(detectOverlapIds(blocks).size).toBe(0)
  })

  it('不修改入参', () => {
    const blocks = [
      makeBlock({ id: 'a', startMin: 420, durationMin: 120, date }),
      makeBlock({ id: 'b', startMin: 480, durationMin: 60, date }),
    ]
    const before = JSON.stringify(blocks)
    detectOverlapIds(blocks, date)
    expect(JSON.stringify(blocks)).toBe(before)
  })
})

describe('buildTemplate / instantiateTemplate（INCR-418 模板）', () => {
  it('buildTemplate 剥离 id/date，仅保留规划形状', () => {
    const tasks = [
      makeTask({ id: 't1', title: '深度工作', category: 'project', estimatedMinutes: 60, date: '2026-10-02' }),
    ]
    const blocks = [
      makeBlock({ id: 'b1', date: '2026-10-02', startMin: 420, durationMin: 60, category: 'study', title: '晨练' }),
    ]
    const tpl = buildTemplate('工作日', tasks, blocks)
    expect(tpl.name).toBe('工作日')
    expect(tpl.tasks).toHaveLength(1)
    expect(tpl.tasks[0]).toEqual({ title: '深度工作', category: 'project', estimatedMinutes: 60 })
    expect(tpl.blocks).toHaveLength(1)
    expect(tpl.blocks[0]).toEqual({ startMin: 420, durationMin: 60, category: 'study', title: '晨练' })
    // 剥离了 id / date
    expect((tpl.tasks[0] as Record<string, unknown>).id).toBeUndefined()
    expect((tpl.blocks[0] as Record<string, unknown>).date).toBeUndefined()
  })

  it('buildTemplate 空名回退「未命名模板」', () => {
    const tpl = buildTemplate('   ', [], [])
    expect(tpl.name).toBe('未命名模板')
  })

  it('instantiateTemplate 生成新 id + 目标 date + done=false', () => {
    const tpl: BlockTemplate = {
      id: 'tp1', name: '工作日', createdAt: '2026-10-02T00:00:00.000Z',
      tasks: [{ title: '深度工作', category: 'project', estimatedMinutes: 60 }],
      blocks: [{ startMin: 420, durationMin: 60, category: 'study', title: '晨练' }],
    }
    const { tasks, blocks } = instantiateTemplate(tpl, '2026-10-09')
    expect(tasks).toHaveLength(1)
    expect(tasks[0].date).toBe('2026-10-09')
    expect(tasks[0].done).toBe(false)
    expect(tasks[0].id).not.toBe('t1')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].date).toBe('2026-10-09')
    expect(blocks[0].done).toBe(false)
    expect(blocks[0].taskId).toBeNull()
    expect(blocks[0].id).not.toBe('b1')
  })

  it('instantiateTemplate 不改入参（模板不被修改）', () => {
    const tpl: BlockTemplate = {
      id: 'tp1', name: 'x', createdAt: '2026-10-02T00:00:00.000Z',
      tasks: [{ title: 'a', category: 'project', estimatedMinutes: 30 }],
      blocks: [],
    }
    const before = JSON.stringify(tpl)
    instantiateTemplate(tpl, '2026-10-09')
    expect(JSON.stringify(tpl)).toBe(before)
  })
})

describe('computePlanActual（INCR-419 计划vs实际）', () => {
  const date = '2026-10-02'

  function makeRecord(
    partial: Partial<WorkRecord> & { startedAt: string; durationSeconds: number; category: WorkRecord['category'] },
  ): WorkRecord {
    return {
      id: partial.id ?? 'r-' + Math.random().toString(36).slice(2, 7),
      startedAt: partial.startedAt,
      endedAt: partial.endedAt ?? null,
      durationSeconds: partial.durationSeconds,
      category: partial.category,
      sourceType: partial.sourceType ?? 'manual',
      sourceAnchorId: partial.sourceAnchorId,
      intensity: partial.intensity ?? 0.5,
      note: partial.note ?? '',
      createdAt: partial.createdAt ?? partial.startedAt,
      zone: partial.zone,
    }
  }

  it('仅有计划无记录：实际为 0、偏差为负、完成率 0', () => {
    const blocks = [makeBlock({ id: 'b1', date, startMin: 420, durationMin: 60, category: 'project' })]
    const rep = computePlanActual(blocks, [], d => d === date)
    expect(rep.plannedMin).toBe(60)
    expect(rep.actualMin).toBe(0)
    expect(rep.deltaMin).toBe(-60)
    expect(rep.totalBlocks).toBe(1)
    expect(rep.doneBlocks).toBe(0)
    expect(rep.completionRate).toBe(0)
    expect(rep.byCategory).toHaveLength(1)
    expect(rep.byCategory[0]).toEqual({ category: 'project', plannedMin: 60, actualMin: 0, deltaMin: -60 })
  })

  it('完成块联动的 auto 记录时长等于计划 → 该分类偏差 0、完成率 100%', () => {
    const blocks = [makeBlock({ id: 'b1', date, startMin: 420, durationMin: 60, category: 'project', done: true })]
    const records = [
      makeRecord({ id: 'ra', startedAt: date + 'T09:00:00', durationSeconds: 3600, category: 'project', sourceType: 'auto', sourceAnchorId: 'b1' }),
    ]
    const rep = computePlanActual(blocks, records, d => d === date)
    const row = rep.byCategory.find(r => r.category === 'project')!
    expect(row.plannedMin).toBe(60)
    expect(row.actualMin).toBe(60)
    expect(row.deltaMin).toBe(0)
    expect(rep.doneBlocks).toBe(1)
    expect(rep.completionRate).toBe(1)
  })

  it('同分类额外手动记录 → 实际超出计划、偏差为正', () => {
    const blocks = [makeBlock({ id: 'b1', date, startMin: 420, durationMin: 60, category: 'study' })]
    const records = [
      makeRecord({ id: 'r1', startedAt: date + 'T10:00:00', durationSeconds: 1800, category: 'study' }),
      makeRecord({ id: 'r2', startedAt: date + 'T14:00:00', durationSeconds: 3600, category: 'study' }),
    ]
    const rep = computePlanActual(blocks, records, d => d === date)
    const row = rep.byCategory.find(r => r.category === 'study')!
    expect(row.plannedMin).toBe(60)
    expect(row.actualMin).toBe(90)
    expect(row.deltaMin).toBe(30)
    expect(rep.deltaMin).toBe(30)
  })

  it('窗口按 date 过滤：其他日期的块与记录不计入', () => {
    const blocks = [
      makeBlock({ id: 'in', date, startMin: 420, durationMin: 60, category: 'project' }),
      makeBlock({ id: 'out', date: '2026-10-03', startMin: 420, durationMin: 120, category: 'project' }),
    ]
    const records = [
      makeRecord({ id: 'rin', startedAt: date + 'T09:00:00', durationSeconds: 3600, category: 'project' }),
      makeRecord({ id: 'rout', startedAt: '2026-10-03T09:00:00', durationSeconds: 3600, category: 'project' }),
    ]
    const rep = computePlanActual(blocks, records, d => d === date)
    expect(rep.plannedMin).toBe(60)
    expect(rep.actualMin).toBe(60)
    expect(rep.totalBlocks).toBe(1)
  })

  it('周窗口：按 days 集合聚合多日，周外忽略', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03']
    const blocks = [
      makeBlock({ id: 'b1', date: '2026-10-02', startMin: 420, durationMin: 60, category: 'project' }),
      makeBlock({ id: 'b2', date: '2026-10-03', startMin: 420, durationMin: 30, category: 'daily' }),
      makeBlock({ id: 'b3', date: '2026-10-09', startMin: 420, durationMin: 999, category: 'study' }),
    ]
    const records = [
      makeRecord({ id: 'r1', startedAt: '2026-10-02T09:00:00', durationSeconds: 3600, category: 'project' }),
      makeRecord({ id: 'r2', startedAt: '2026-10-04T09:00:00', durationSeconds: 3600, category: 'daily' }),
    ]
    const set = new Set(days)
    const rep = computePlanActual(blocks, records, d => set.has(d))
    expect(rep.plannedMin).toBe(90) // 60 + 30
    expect(rep.actualMin).toBe(60) // 仅 10-02 的 project
    expect(rep.totalBlocks).toBe(2)
  })

  it('不修改入参', () => {
    const blocks = [makeBlock({ id: 'b1', date, startMin: 420, durationMin: 60, category: 'project' })]
    const records = [makeRecord({ id: 'r1', startedAt: date + 'T09:00:00', durationSeconds: 3600, category: 'project' })]
    const beforeB = JSON.stringify(blocks)
    const beforeR = JSON.stringify(records)
    computePlanActual(blocks, records, d => d === date)
    expect(JSON.stringify(blocks)).toBe(beforeB)
    expect(JSON.stringify(records)).toBe(beforeR)
  })
})

describe('冲突智能避让/重排（INCR-421）', () => {
  const date = '2026-10-02'
  const WS = 420
  const WE = 1380

  describe('resolveFreeStart', () => {
    it('desired 完整落在空隙内 → 保持 desired（最小移动）', () => {
      const blocks = [makeBlock({ id: 'a', date, startMin: 420, durationMin: 60 })]
      // 空隙 [480, 1380]，desired=600 容纳 60 → 保持 600
      expect(resolveFreeStart(blocks, date, 600, 60, { windowStartMin: WS, windowEndMin: WE })).toBe(600)
    })

    it('desired 与他块重叠 → 推到最近空隙起点', () => {
      const blocks = [makeBlock({ id: 'a', date, startMin: 420, durationMin: 60 })]
      // 空隙只有 [480, 1380]；desired=450 落在 [420,480] 内 → 推到 480
      expect(resolveFreeStart(blocks, date, 450, 60, { windowStartMin: WS, windowEndMin: WE })).toBe(480)
    })

    it('excludeId：移动正在拖的块时排除自身 → 不避让自己原槽', () => {
      const blocks = [
        makeBlock({ id: 'm', date, startMin: 450, durationMin: 60 }),
        makeBlock({ id: 'a', date, startMin: 600, durationMin: 60 }),
      ]
      // 排除 m 后，m 原槽 [450,510] 是自由空隙，desired=450 应被保留
      expect(resolveFreeStart(blocks, date, 450, 60, { excludeId: 'm', windowStartMin: WS, windowEndMin: WE })).toBe(450)
      // 不排外则 m 也成障碍，desired=450 被推到 510
      expect(resolveFreeStart(blocks, date, 450, 60, { windowStartMin: WS, windowEndMin: WE })).toBe(510)
    })

    it('当日无任何空隙容纳 → 退化 clamp 到窗口（尽力）', () => {
      const blocks = [makeBlock({ id: 'a', date, startMin: WS, durationMin: WE - WS })]
      // 整窗被占满，desired=700 → clamp(700, WS, WE-60) = 700
      expect(resolveFreeStart(blocks, date, 700, 60, { windowStartMin: WS, windowEndMin: WE })).toBe(700)
    })
  })

  describe('maxDurationInGap', () => {
    it('块后方有空隙 → 返回可拉伸的最大时长', () => {
      const blocks = [
        makeBlock({ id: 'm', date, startMin: 420, durationMin: 60 }),
        makeBlock({ id: 'a', date, startMin: 600, durationMin: 60 }),
      ]
      // 排除 m 后，含 420 的空隙为 [420,600] → 可拉伸 180
      expect(maxDurationInGap(blocks, date, 'm', 420, { windowStartMin: WS, windowEndMin: WE })).toBe(180)
    })

    it('当日仅此一块（排除自身）→ 返回整窗剩余', () => {
      const blocks = [makeBlock({ id: 'm', date, startMin: 420, durationMin: 60 })]
      expect(maxDurationInGap(blocks, date, 'm', 420, { windowStartMin: WS, windowEndMin: WE })).toBe(WE - 420)
    })
  })

  describe('compactDayLayout', () => {
    it('两个重叠块 → 后者被向右推挤消解冲突', () => {
      const blocks = [
        makeBlock({ id: 'a', date, startMin: 420, durationMin: 120 }),
        makeBlock({ id: 'b', date, startMin: 480, durationMin: 60 }),
      ]
      const moves = compactDayLayout(blocks, date, { windowStartMin: WS, windowEndMin: WE })
      expect(moves).toHaveLength(1)
      expect(moves[0]).toEqual({ id: 'b', startMin: 540 })
    })

    it('端点相邻不重叠 → 无移动', () => {
      const blocks = [
        makeBlock({ id: 'a', date, startMin: 420, durationMin: 60 }),
        makeBlock({ id: 'b', date, startMin: 480, durationMin: 60 }),
      ]
      expect(compactDayLayout(blocks, date, { windowStartMin: WS, windowEndMin: WE })).toHaveLength(0)
    })

    it('不修改入参', () => {
      const blocks = [
        makeBlock({ id: 'a', date, startMin: 420, durationMin: 120 }),
        makeBlock({ id: 'b', date, startMin: 480, durationMin: 60 }),
      ]
      const before = JSON.stringify(blocks)
      compactDayLayout(blocks, date, { windowStartMin: WS, windowEndMin: WE })
      expect(JSON.stringify(blocks)).toBe(before)
    })
  })
})

describe('专注会话绑定（INCR-423）', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    resetClepsydra()
  })

  it('startFocusOnBlock 写一条绑定 blockId 的手动记录，runningBlockId 反映该块', () => {
    const tb = useTimeBlock()
    const b = tb.addBlock({ date: '2026-10-02', startMin: 420, durationMin: 60, category: 'project', title: '专注块' })
    tb.startFocusOnBlock(b.id)
    const running = useClepsydra().running.value
    expect(running).not.toBeNull()
    expect(running!.blockId).toBe(b.id)
    expect(running!.sourceType).toBe('manual')
    expect(tb.runningBlockId.value).toBe(b.id)
  })

  it('stopFocusOnBlock 停止会话并标记完成；因已有真实会话，不补计划代理（仅 1 条记录）', () => {
    const tb = useTimeBlock()
    const b = tb.addBlock({ date: '2026-10-02', startMin: 420, durationMin: 60, category: 'study', title: '专注块2' })
    tb.startFocusOnBlock(b.id)
    tb.stopFocusOnBlock(b.id)
    expect(useClepsydra().running.value).toBeNull()
    const storedBlock = (store['hf:clepsydra_time_blocks'] as any[]).find(x => x.id === b.id)!
    expect(storedBlock.done).toBe(true)
    const recs = store['hf:clepsydra_records'] as any[]
    expect(recs).toHaveLength(1)
    expect(recs[0].blockId).toBe(b.id)
    expect(recs[0].sourceType).toBe('manual')
    expect(recs[0].endedAt).not.toBeNull()
  })

  it('已完成的块不允许再开专注会话（避免与 auto 代理重复计）', () => {
    const tb = useTimeBlock()
    const b = tb.addBlock({ date: '2026-10-02', startMin: 420, durationMin: 60, category: 'project', title: '已完成块' })
    tb.toggleBlock(b.id) // 完成 → 写 auto 代理
    const before = (store['hf:clepsydra_records'] as any[]).length
    tb.startFocusOnBlock(b.id) // 已完成 → 拒绝开启
    expect(useClepsydra().running.value).toBeNull()
    expect((store['hf:clepsydra_records'] as any[]).length).toBe(before)
  })

  it('另一块进行中时，开新专注会话被拒（更漏单例仅允许一个进行中）', () => {
    const tb = useTimeBlock()
    const b1 = tb.addBlock({ date: '2026-10-02', startMin: 420, durationMin: 60, category: 'project', title: '块1' })
    const b2 = tb.addBlock({ date: '2026-10-02', startMin: 600, durationMin: 60, category: 'study', title: '块2' })
    tb.startFocusOnBlock(b1.id)
    tb.startFocusOnBlock(b2.id) // 拒绝
    expect(tb.runningBlockId.value).toBe(b1.id)
    expect((store['hf:clepsydra_records'] as any[]).length).toBe(1)
  })

  it('stopFocusOnBlock 仅停绑定到该块的会话：块不匹配则不动', () => {
    const tb = useTimeBlock()
    const b1 = tb.addBlock({ date: '2026-10-02', startMin: 420, durationMin: 60, category: 'project', title: '块1' })
    const b2 = tb.addBlock({ date: '2026-10-02', startMin: 600, durationMin: 60, category: 'study', title: '块2' })
    tb.startFocusOnBlock(b1.id)
    tb.stopFocusOnBlock(b2.id) // 进行中会话属 b1，不应停
    expect(useClepsydra().running.value).not.toBeNull()
    expect(tb.runningBlockId.value).toBe(b1.id)
  })
})
