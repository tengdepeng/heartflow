// ============================================================
// 自律工坊 · 番茄可视化测试
// 验证：种树可视化（品种/阶段/树园派生）、树园概览、7 日趋势、
//       任务绑定聚合、中断记录统计与存储。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  treeSpeciesForFocus,
  treeStageForFocus,
  buildForest,
  forestOverview,
  forestDailyTrend,
  taskFocusRows,
  interruptionStats,
  usePomodoroForest,
  INTERRUPTION_CATEGORY_META,
} from '../pomodoro-forest'
import type { FocusSession } from '../../../types'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(store).forEach(k => delete store[k])
})

function mkSession(partial: Partial<FocusSession> & { id: string }): FocusSession {
  return {
    status: 'completed',
    mode: 'focus',
    plannedDuration: 25 * 60 * 1000,
    elapsed: 25 * 60 * 1000,
    startedAt: '2026-08-01T08:00:00.000Z',
    pausedDuration: 0,
    pausedAt: null,
    completedAt: '2026-08-01T08:25:00.000Z',
    tags: [],
    note: '',
    carrierId: null,
    ...partial,
  }
}

describe('treeSpeciesForFocus 品种判定', () => {
  it('按专注时长映射品种', () => {
    expect(treeSpeciesForFocus(0)).toBe('seed')
    expect(treeSpeciesForFocus(10 * 60 * 1000)).toBe('sprout')
    expect(treeSpeciesForFocus(25 * 60 * 1000)).toBe('sapling')
    expect(treeSpeciesForFocus(45 * 60 * 1000)).toBe('tree')
    expect(treeSpeciesForFocus(90 * 60 * 1000)).toBe('bloom')
  })
})

describe('treeStageForFocus 生长阶段', () => {
  it('0-4 阶段随专注时长递增', () => {
    expect(treeStageForFocus(0)).toBe(0)
    expect(treeStageForFocus(10 * 60 * 1000)).toBe(1)
    expect(treeStageForFocus(25 * 60 * 1000)).toBe(2)
    expect(treeStageForFocus(45 * 60 * 1000)).toBe(3)
    expect(treeStageForFocus(90 * 60 * 1000)).toBe(4)
  })
})

describe('buildForest 树园派生', () => {
  it('完成会话→成活树，中断会话→枯萎树', () => {
    const sessions = [
      mkSession({ id: 's1', carrierId: 't1' }),
      mkSession({ id: 's2', status: 'interrupted', elapsed: 5 * 60 * 1000 }),
    ]
    const forest = buildForest(sessions)
    expect(forest.length).toBe(2)
    const s1 = forest.find(t => t.sessionId === 's1')!
    const s2 = forest.find(t => t.sessionId === 's2')!
    expect(s1.status).toBe('growing')
    expect(s1.taskId).toBe('t1')
    expect(s2.status).toBe('withered')
  })

  it('忽略非 focus 模式会话', () => {
    const sessions = [mkSession({ id: 's1', mode: 'nap' })]
    expect(buildForest(sessions)).toEqual([])
  })

  it('按种植时间倒序', () => {
    const sessions = [
      mkSession({ id: 's1', completedAt: '2026-08-01T08:25:00.000Z' }),
      mkSession({ id: 's2', completedAt: '2026-08-02T08:25:00.000Z' }),
    ]
    const forest = buildForest(sessions)
    expect(forest[0].sessionId).toBe('s2')
  })
})

describe('forestOverview 树园概览', () => {
  const now = new Date('2026-08-02T12:00:00.000Z')
  const trees = buildForest([
    mkSession({ id: 's1', completedAt: '2026-08-02T08:25:00.000Z' }),
    mkSession({ id: 's2', completedAt: '2026-08-02T09:25:00.000Z', elapsed: 50 * 60 * 1000 }),
    mkSession({ id: 's3', status: 'interrupted', elapsed: 3 * 60 * 1000, completedAt: '2026-08-02T10:00:00.000Z' }),
    mkSession({ id: 's4', completedAt: '2026-08-01T08:25:00.000Z' }),
  ])

  it('统计总数/成活/枯萎/今日', () => {
    const o = forestOverview(trees, now)
    expect(o.totalTrees).toBe(4)
    expect(o.growingTrees).toBe(3)
    expect(o.witheredTrees).toBe(1)
    expect(o.todayTrees).toBe(3)
    expect(o.todayWithered).toBe(1)
  })

  it('专注投入按成活树累计', () => {
    const o = forestOverview(trees, now)
    expect(o.totalFocusMs).toBe((25 + 50 + 25) * 60 * 1000)
    expect(o.todayFocusMs).toBe((25 + 50) * 60 * 1000)
  })

  it('最佳品种取最高生长档', () => {
    const o = forestOverview(trees, now)
    expect(o.bestSpecies).toBe('tree')
  })

  it('成活率 0-100', () => {
    const o = forestOverview(trees, now)
    expect(o.survivalRate).toBe(75)
  })

  it('空树园成活率为 0', () => {
    const o = forestOverview([], now)
    expect(o.survivalRate).toBe(0)
    expect(o.bestSpecies).toBe('seed')
  })
})

describe('forestDailyTrend 7 日趋势', () => {
  it('按天聚合专注投入与棵树', () => {
    const now = new Date('2026-08-02T12:00:00.000Z')
    const trees = buildForest([
      mkSession({ id: 's1', completedAt: '2026-08-02T08:25:00.000Z' }),
      mkSession({ id: 's2', completedAt: '2026-08-01T08:25:00.000Z' }),
    ])
    const trend = forestDailyTrend(trees, 3, now)
    expect(trend.length).toBe(3)
    expect(trend[2].date).toBe('2026-08-02')
    expect(trend[2].count).toBe(1)
    expect(trend[1].count).toBe(1)
    expect(trend[0].count).toBe(0)
  })
})

describe('taskFocusRows 任务绑定聚合', () => {
  it('按任务聚合专注次数与时长', () => {
    const trees = buildForest([
      mkSession({ id: 's1', carrierId: 't1', completedAt: '2026-08-01T08:25:00.000Z' }),
      mkSession({ id: 's2', carrierId: 't1', completedAt: '2026-08-01T09:25:00.000Z' }),
      mkSession({ id: 's3', carrierId: 't2', completedAt: '2026-08-01T10:25:00.000Z', elapsed: 50 * 60 * 1000 }),
    ])
    const rows = taskFocusRows(trees, [
      { id: 't1', title: '写周报' },
      { id: 't2', title: '学外语' },
    ])
    expect(rows.length).toBe(2)
    expect(rows.find(r => r.taskId === 't1')!.focusCount).toBe(2)
    expect(rows.find(r => r.taskId === 't1')!.focusMs).toBe(50 * 60 * 1000)
    expect(rows.find(r => r.taskId === 't2')!.taskTitle).toBe('学外语')
  })

  it('忽略未绑定任务或枯萎树', () => {
    const trees = buildForest([
      mkSession({ id: 's1', completedAt: '2026-08-01T08:25:00.000Z' }),
      mkSession({ id: 's2', status: 'interrupted', carrierId: 't1', elapsed: 5 * 60 * 1000, completedAt: '2026-08-01T09:00:00.000Z' }),
    ])
    expect(taskFocusRows(trees, [{ id: 't1', title: '任务' }])).toEqual([])
  })

  it('任务已删除时回退占位标题', () => {
    const trees = buildForest([
      mkSession({ id: 's1', carrierId: 'ghost', completedAt: '2026-08-01T08:25:00.000Z' }),
    ])
    const rows = taskFocusRows(trees, [])
    expect(rows[0].taskTitle).toBe('（已删除任务）')
  })
})

describe('interruptionStats 中断统计', () => {
  const now = new Date('2026-08-02T12:00:00.000Z')
  const records = [
    { id: 'r1', sessionId: 's1', taskId: null, reason: '来消息了', category: 'notification' as const, occurredAt: '2026-08-02T09:00:00.000Z', focusMs: 10 * 60 * 1000 },
    { id: 'r2', sessionId: 's2', taskId: null, reason: '走神', category: 'distraction' as const, occurredAt: '2026-08-02T10:00:00.000Z', focusMs: 5 * 60 * 1000 },
    { id: 'r3', sessionId: 's3', taskId: null, reason: '消息轰炸', category: 'notification' as const, occurredAt: '2026-08-01T09:00:00.000Z', focusMs: 15 * 60 * 1000 },
  ]

  it('统计总数/今日/原因分布', () => {
    const s = interruptionStats(records, now)
    expect(s.total).toBe(3)
    expect(s.today).toBe(2)
    expect(s.byCategory).toEqual({ notification: 2, distraction: 1 })
    expect(s.mostCommon).toBe('notification')
  })

  it('平均坚持时长', () => {
    const s = interruptionStats(records, now)
    expect(s.avgFocusMs).toBe(10 * 60 * 1000)
  })

  it('空记录回退', () => {
    const s = interruptionStats([], now)
    expect(s.total).toBe(0)
    expect(s.mostCommon).toBe('none')
    expect(s.avgFocusMs).toBe(0)
  })
})

describe('usePomodoroForest 中断存储', () => {
  it('recordInterruption 新增并持久化', () => {
    const f = usePomodoroForest()
    f.load()
    const r = f.recordInterruption({ sessionId: 's1', reason: '临时急事', category: 'urgent', focusMs: 8 * 60 * 1000 })
    expect(r.id).toBeTruthy()
    expect(f.interruptions.value.length).toBe(1)
    expect(mockSetKV).toHaveBeenCalled()
    expect(store['hf:discipline:interruptions'].length).toBe(1)
  })

  it('load 从存储恢复', () => {
    store['hf:discipline:interruptions'] = [
      { id: 'r1', sessionId: 's1', taskId: null, reason: 'x', category: 'other', occurredAt: '2026-08-01T00:00:00.000Z', focusMs: 1000 },
    ]
    const f = usePomodoroForest()
    f.load()
    expect(f.interruptions.value.length).toBe(1)
  })

  it('removeInterruption 删除', () => {
    const f = usePomodoroForest()
    f.load()
    const r = f.recordInterruption({ sessionId: 's1', reason: 'x', category: 'other', focusMs: 1000 })
    expect(f.removeInterruption(r.id)).toBe(true)
    expect(f.interruptions.value.length).toBe(0)
    expect(f.removeInterruption('nope')).toBe(false)
  })

  it('clearInterruptions 清空', () => {
    const f = usePomodoroForest()
    f.load()
    f.recordInterruption({ sessionId: 's1', reason: 'x', category: 'other', focusMs: 1000 })
    f.clearInterruptions()
    expect(f.interruptions.value).toEqual([])
  })
})

describe('INTERRUPTION_CATEGORY_META 元数据完整性', () => {
  it('所有分类均有标签与图标', () => {
    for (const meta of Object.values(INTERRUPTION_CATEGORY_META)) {
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.icon.length).toBeGreaterThan(0)
    }
  })
})
