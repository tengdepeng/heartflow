// ============================================================
// 更漏 · 工作记录空间测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useClepsydra } from '../clepsydra'
import {
  WORK_CATEGORY_META,
  intensityLabel,
  windowStart,
  inWindow,
  recordSeconds,
  computeSummary,
  computeState,
  formatSeconds,
} from '../clepsydra'
import type { WorkRecord, WorkCategory } from '../clepsydra'

const { mockKV } = vi.hoisted(() => ({ mockKV: new Map<string, unknown>() }))
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(k: string, def: T): T => (mockKV.has(k) ? (mockKV.get(k) as T) : def),
    setKV: (k: string, v: unknown): void => void mockKV.set(k, v),
  },
}))
beforeEach(() => mockKV.clear())

function rec(partial: Partial<WorkRecord>): WorkRecord {
  return {
    id: 'r1',
    startedAt: '2026-08-21T02:00:00.000Z',
    endedAt: '2026-08-21T03:00:00.000Z',
    durationSeconds: 3600,
    category: 'project',
    sourceType: 'manual',
    intensity: 0.7,
    note: '',
    createdAt: '2026-08-21T02:00:00.000Z',
    ...partial,
  }
}

const NOW = new Date('2026-08-21T12:00:00.000Z')

describe('分类与强度映射', () => {
  it('五个分类齐全，且强度映射可用', () => {
    expect(Object.keys(WORK_CATEGORY_META)).toHaveLength(5)
    expect(WORK_CATEGORY_META.project.intensity).toBeGreaterThan(0)
    expect(WORK_CATEGORY_META.create.intensity).toBeGreaterThan(WORK_CATEGORY_META.daily.intensity)
  })

  it('强度文案为描述而非评分', () => {
    expect(intensityLabel(0.9)).toContain('深度')
    expect(intensityLabel(0.1)).toContain('休整')
  })
})

describe('recordSeconds / inWindow', () => {
  it('已完成记录按时长计算', () => {
    expect(recordSeconds(rec({ startedAt: '2026-08-21T02:00:00Z', endedAt: '2026-08-21T03:00:00Z' }), NOW)).toBe(3600)
  })

  it('进行中记录按 now 动态计算', () => {
    const r = rec({ endedAt: null })
    expect(recordSeconds(r, new Date('2026-08-21T03:30:00Z'))).toBeGreaterThanOrEqual(3600)
  })

  it('inWindow 认窗口起点与终点', () => {
    const start = windowStart(NOW, 'day')
    expect(inWindow(rec({ startedAt: '2026-08-21T08:00:00Z' }), start, NOW)).toBe(true)
    expect(inWindow(rec({ startedAt: '2026-08-20T08:00:00Z' }), start, NOW)).toBe(false)
  })
})

describe('computeSummary', () => {
  it('汇总总时长与分类占比（比例描述）', () => {
    const records = [
      rec({ id: 'a', category: 'project', startedAt: '2026-08-21T01:00:00Z', endedAt: '2026-08-21T02:00:00Z' }),
      rec({ id: 'b', category: 'daily', startedAt: '2026-08-21T02:00:00Z', endedAt: '2026-08-21T04:00:00Z' }),
    ]
    const s = computeSummary(records, windowStart(NOW, 'day'), NOW)
    expect(s.totalSeconds).toBe(10800)
    expect(s.byCategory.project).toBe(3600)
    expect(s.byCategory.daily).toBe(7200)
    // 分类顺序：project/daily/study/create/custom → 1/3 · 2/3 · 0 · 0 · 0
    expect(s.categoryBalance[0]).toBeCloseTo(1 / 3)
    expect(s.categoryBalance[1]).toBeCloseTo(2 / 3)
    expect(s.categoryBalance[2]).toBe(0)
    expect(s.avgSeconds).toBe(5400)
  })

  it('空记录返回零汇总', () => {
    const s = computeSummary([], windowStart(NOW, 'day'), NOW)
    expect(s.totalSeconds).toBe(0)
    expect(s.count).toBe(0)
  })
})

describe('computeState 光仪状态（比例描述）', () => {
  it('balanceIndex 与汇总占比一致，非评分', () => {
    const summary = computeSummary(
      [rec({ category: 'study', startedAt: '2026-08-21T01:00:00Z', endedAt: '2026-08-21T02:00:00Z' })],
      windowStart(NOW, 'week'),
      NOW,
    )
    const st = computeState(summary, { sessionCount: 2 })
    // study 在主分类 index(2)
    expect(st.balanceIndex[2]).toBeCloseTo(1)
    expect(st.dominantHue).toBe(WORK_CATEGORY_META.study.hue)
    expect(st.threadDensity).toBeGreaterThanOrEqual(0)
    expect(st.threadDensity).toBeLessThanOrEqual(1)
    expect(st.rotationSpeed).toBeGreaterThanOrEqual(0.4)
  })

  it('密度由会话数温和描述（封顶 1）', () => {
    const empty = computeState(computeSummary([], windowStart(NOW, 'week'), NOW), { sessionCount: 12 })
    expect(empty.threadDensity).toBeCloseTo(1)
  })
})

describe('formatSeconds', () => {
  it('人类可读时长', () => {
    expect(formatSeconds(3600)).toBe('1时00分')
    expect(formatSeconds(90)).toBe('1分')
    expect(formatSeconds(30)).toBe('30秒')
  })
})

describe('useClepsydra 组合式', () => {
  it('startTimer 开始并复用进行中会话', () => {
    const { startTimer, running } = useClepsydra()
    const r1 = startTimer({ category: 'project' })
    const r2 = startTimer({ category: 'study' })
    expect(r1.id).toBe(r2.id) // 复用进行中，不并发开启（宪法：无提醒轰炸）
    expect(running.value).toBeTruthy()
  })

  it('stopTimer 结算时长', () => {
    const { startTimer, stopTimer, running } = useClepsydra()
    startTimer({ category: 'create' })
    const done = stopTimer('收尾')
    expect(done).toBeTruthy()
    expect(done!.endedAt).toBeTruthy()
    expect(running.value).toBeNull()
  })

  it('addRecord / removeRecord 维护列表', () => {
    const { addRecord, removeRecord, records } = useClepsydra()
    const r = addRecord({
      startedAt: new Date('2026-08-21T01:00:00Z'),
      endedAt: new Date('2026-08-21T02:00:00Z'),
      category: 'study',
    })
    expect(records.value).toContainEqual(r)
    expect(records.value.length).toBe(1)
    expect(records.value[0]!.durationSeconds).toBe(3600)
    removeRecord(r.id)
    expect(records.value.find(x => x.id === r.id)).toBeUndefined()
  })
})

describe('分类类型完备性', () => {
  it('sum 中分类键齐全', () => {
    const s = computeSummary([rec({ category: 'custom' })], windowStart(NOW, 'all'), NOW)
    const keys = Object.keys(s.byCategory) as WorkCategory[]
    expect(keys.sort()).toEqual(['create', 'custom', 'daily', 'project', 'study'])
  })
})