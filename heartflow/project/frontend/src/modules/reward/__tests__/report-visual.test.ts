// ============================================================
// 报表可视化引擎测试（INCR-29）
// 覆盖同比环比 / 分类占比 / 分类趋势 / 排行榜 / 年度热力图
// ============================================================
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  monthStat,
  compareMonth,
  categoryShare,
  categoryTrend,
  categoryRanking,
  yearHeatmap,
} from '../report-visual'
import type { RewardRecord } from '../reward-list'

function rec(o: Partial<RewardRecord>): RewardRecord {
  return { id: 'r', type: 'expense', category: 'social', amount: 100, description: '', at: '2026-08-10', account: undefined, ...o }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('monthStat / prevMonthKey / prevYearMonthKey', () => {
  it('汇总单月收支结余与标签', () => {
    const records = [
      rec({ type: 'income', amount: 2000, at: '2026-08-05' }),
      rec({ type: 'expense', amount: 300, at: '2026-08-20' }),
      rec({ type: 'expense', amount: 100, at: '2026-07-31' }), // 上月，忽略
    ]
    expect(monthStat(records, '2026-08')).toEqual({
      key: '2026-08', label: '8月', income: 2000, expense: 300, balance: 1700,
    })
  })

  it('跨年回绕：环比定位到上月', () => {
    expect(compareMonth([], '2026-01').prev!.key).toBe('2025-12')
    expect(compareMonth([], '2026-03').prev!.key).toBe('2026-02')
  })

  it('去年同期：定位到去年的同月', () => {
    expect(compareMonth([], '2026-08').lastYear!.key).toBe('2025-08')
  })
})

describe('compareMonth 同比环比', () => {
  it('基线缺失/为 0 时 deltas 为 null（范围统计恒存在，值为 0）', () => {
    const records = [rec({ type: 'income', amount: 100, at: '2026-08-01' })]
    const c = compareMonth(records, '2026-01')
    expect(c.prev!.key).toBe('2025-12')
    expect(c.lastYear!.key).toBe('2025-01')
    expect(c.prev!.income).toBe(0)
    expect(c.mom.income).toBeNull()
    expect(c.yoy.income).toBeNull()
  })

  it('环比：本月相对上月的变化率', () => {
    const records = [
      rec({ type: 'expense', amount: 100, at: '2026-07-01' }),
      rec({ type: 'expense', amount: 150, at: '2026-08-01' }),
    ]
    const c = compareMonth(records, '2026-08')
    expect(c.prev!.key).toBe('2026-07')
    expect(c.mom.expense).toBeCloseTo(0.5) // (150-100)/100
  })

  it('同比：本相对去年同期变化率', () => {
    const records = [
      rec({ type: 'expense', amount: 200, at: '2025-08-01' }),
      rec({ type: 'expense', amount: 100, at: '2026-08-01' }),
    ]
    const c = compareMonth(records, '2026-08')
    expect(c.lastYear!.key).toBe('2025-08')
    expect(c.yoy.expense).toBeCloseTo(-0.5)
  })

  it('基数为 0 时变化率返回 null', () => {
    const records = [rec({ type: 'expense', amount: 50, at: '2026-08-01' })]
    const c = compareMonth(records, '2026-08')
    expect(c.mom.expense).toBeNull()
    expect(c.yoy.expense).toBeNull()
  })
})

describe('categoryShare 分类占比', () => {
  const records = [
    rec({ category: 'social', amount: 300 }),
    rec({ category: 'learning', amount: 100 }),
    rec({ category: 'social', amount: 100 }),
    rec({ type: 'income', category: 'salary', amount: 999 }), // 支出以外的忽略
  ]

  it('按金额降序聚合、带占比与笔数', () => {
    const s = categoryShare(records, 'expense')
    expect(s.total).toBe(500)
    expect(s.items[0]).toMatchObject({ key: 'social', amount: 400, count: 2, ratio: 0.8 })
    expect(s.items[1]).toMatchObject({ key: 'learning', amount: 100, count: 1, ratio: 0.2 })
  })

  it('resolver 注入标签与配色', () => {
    const s = categoryShare(records, 'expense', (k) => ({ label: `L:${k}`, color: '#123456' }))
    expect(s.items[0].label).toBe('L:social')
    expect(s.items[0].color).toBe('#123456')
  })
})

describe('categoryTrend 分类趋势', () => {
  it('生成最近 N 月序列，末位为数据所在月', () => {
    // 趋势序列以系统当前月为末位：钉时到数据所在月（2026-08），
    // 使「末位为数据所在月」断言成立，避免随实际日期漂移。
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
    const records = []
    for (let i = 0; i < 120; i++) {
      records.push(rec({ type: 'expense', category: 'food', amount: 10, at: '2024-08-01' }))
      records.push(rec({ type: 'expense', category: 'food', amount: 10, at: '2026-08-01' }))
    }
    const t = categoryTrend(records, 12, 4)
    expect(t.months).toHaveLength(12)
    const last = t.months[t.months.length - 1]
    expect(last.label.endsWith('8月') || last.label.endsWith('2026年8月')).toBe(true)
    // food 极值应进入 topN 系列（金额显著高于其他）
    expect(t.series.some((s) => s.key === 'food')).toBe(true)
  })

  it('maxValue 覆盖收支与系列最大值，保证柱/线不溢出', () => {
    const records = [
      rec({ type: 'income', amount: 5000, at: '2026-08-01' }),
      rec({ type: 'expense', category: 'social', amount: 800, at: '2026-08-01' }),
      rec({ type: 'expense', category: 'social', amount: 200, at: '2026-07-01' }),
    ]
    const t = categoryTrend(records, 12, 4)
    expect(t.maxValue).toBe(5000)
    const social = t.series.find((s) => s.key === 'social')
    expect(social).toBeDefined()
    expect(social!.data.reduce((s, v) => s + v, 0)).toBe(1000)
  })

  it('空数据返回全零序列', () => {
    const t = categoryTrend([], 6, 4)
    expect(t.months).toHaveLength(6)
    expect(t.series).toHaveLength(0)
    expect(t.maxValue).toBe(1)
  })
})

describe('categoryRanking 分类排行榜', () => {
  const records = [
    rec({ category: 'social', amount: 300 }),
    rec({ category: 'social', amount: 100 }),
    rec({ category: 'learning', amount: 50 }),
  ]

  it('金额降序、含笔数/均值/相对比例', () => {
    const r = categoryRanking(records, 'expense')
    expect(r[0]).toMatchObject({ key: 'social', amount: 400, count: 2, avg: 200, ratio: 1 })
    expect(r[1]).toMatchObject({ key: 'learning', amount: 50, count: 1, avg: 50, ratio: 0.125 })
  })

  it('上涨返回空', () => {
    expect(categoryRanking([], 'expense')).toEqual([])
  })
})

describe('yearHeatmap 年度热力图', () => {
  it('仅统计指定年份与收支类型', () => {
    const records = [
      rec({ type: 'expense', amount: 300, at: '2026-08-10' }),
      rec({ type: 'expense', amount: 100, at: '2026-08-10' }),
      rec({ type: 'expense', amount: 9999, at: '2025-08-10' }), // 上年，忽略
      rec({ type: 'income', amount: 9999, at: '2026-08-11' }), // 收入，默认不看
    ]
    const h = yearHeatmap(records, 2026, 'expense')
    expect(h.total).toBe(400)
    expect(h.max).toBe(400)
    expect(h.activeDays).toBe(1)
    expect(h.year).toBe(2026)
  })

  it('约 52-54 周、周一为首、年度内日归属 inYear', () => {
    const h = yearHeatmap([], 2026, 'expense')
    expect(h.weeks.length).toBeGreaterThanOrEqual(52)
    expect(h.weeks.length).toBeLessThanOrEqual(54)
    // 每行 7 格
    for (const w of h.weeks) expect(w.cells).toHaveLength(7)
    const totalInYear = h.weeks.reduce((s, w) => s + w.cells.filter((c) => c.inYear).length, 0)
    // 平年 365 天，2026 为平年
    expect(totalInYear).toBe(365)
  })

  it('income 类型统计收入', () => {
    const records = [
      rec({ type: 'income', amount: 600, at: '2026-08-10' }),
      rec({ type: 'expense', amount: 999, at: '2026-08-10' }),
    ]
    const h = yearHeatmap(records, 2026, 'income')
    expect(h.total).toBe(600)
  })
})