// ============================================================
// 预算进阶引擎测试（INCR-28）：总/年度预算 + 日均动态 + 滚动结余
// ============================================================
import { describe, it, expect } from 'vitest'
import type { RewardRecord } from '../reward-list'
import type { Transfer } from '../accounts'
import {
  daysInMonth,
  prevMonthKey,
  prevMonthRollover,
  monthOutflowTotal,
  monthBudgetAdvance,
  annualSpent,
  yearBudgetAdvance,
} from '../budget-advance'
import type { AdvanceBudgetConfig } from '../budget-advance'

const TODAY = '2026-08-29'
const MONTH = '2026-08'

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tools',
    amount: o.amount ?? 10,
    description: '',
    at: o.at ?? '2026-08-01T00:00:00Z',
    ...o,
  }
}
function tr(o: Partial<Transfer> = {}): Transfer {
  return { id: o.id ?? 't', from: o.from ?? 'cash', to: o.to ?? 'alipay', amount: o.amount ?? 10, at: o.at ?? '2026-08-01T00:00:00Z', ...o }
}
function cfg(o: Partial<AdvanceBudgetConfig> = {}): AdvanceBudgetConfig {
  return { monthlyLimit: 10000, annualLimit: 120000, rollover: false, ...o }
}

describe('daysInMonth 月份天数', () => {
  it('常规月/闰二月/大月', () => {
    expect(daysInMonth('2026-08')).toBe(31)
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-12')).toBe(31)
  })
})

describe('prevMonthKey 上月 key 跨年回绕', () => {
  it('常规与跨年', () => {
    expect(prevMonthKey('2026-08')).toBe('2026-07')
    expect(prevMonthKey('2026-01')).toBe('2025-12')
  })
})

describe('monthOutflowTotal 月总流出复用口径', () => {
  it('expense 不含转账，withTransfer 含转账', () => {
    const records = [rec({ amount: 100, at: '2026-08-05T00:00:00Z' })]
    const transfers = [tr({ amount: 50, at: '2026-08-06T00:00:00Z' })]
    expect(monthOutflowTotal(records, transfers, MONTH, 'expense')).toBe(100)
    expect(monthOutflowTotal(records, transfers, MONTH, 'withTransfer')).toBe(150)
  })
})

describe('prevMonthRollover 上月未用结转', () => {
  it('关闭结转恒为 0', () => {
    const records = [rec({ amount: 500, at: '2026-07-05T00:00:00Z' })]
    expect(prevMonthRollover(records, [], MONTH, { monthlyLimit: 10000, rollover: false }, 'expense')).toBe(0)
  })

  it('上月未用完 => 结余 = 预算 − 上月支出', () => {
    const records = [rec({ amount: 4000, at: '2026-07-05T00:00:00Z' })]
    expect(prevMonthRollover(records, [], MONTH, { monthlyLimit: 10000, rollover: true }, 'expense')).toBe(6000)
  })

  it('上月超支 => 无法结转 0', () => {
    const records = [rec({ amount: 12000, at: '2026-07-05T00:00:00Z' })]
    expect(prevMonthRollover(records, [], MONTH, { monthlyLimit: 10000, rollover: true }, 'expense')).toBe(0)
  })
})

describe('monthBudgetAdvance 本月总预算/日均动态', () => {
  it('达标：limit − spent = remaining，日均=remaining÷剩余天数', () => {
    const records = [rec({ amount: 1000, at: '2026-08-05T00:00:00Z' }), rec({ amount: 2000, at: '2026-08-10T00:00:00Z' })]
    const m = monthBudgetAdvance(records, [], MONTH, TODAY, cfg(), 'expense')
    expect(m.limit).toBe(10000)
    expect(m.rolledIn).toBe(0)
    expect(m.spent).toBe(3000)
    expect(m.remaining).toBe(7000)
    expect(m.ratio).toBeCloseTo(0.3)
    expect(m.status).toBe('ok')
    expect(m.daysElapsed).toBe(29)
    expect(m.daysRemaining).toBe(2)
    expect(m.dailyAvailable).toBe(3500)
    expect(m.dailySpentSoFar).toBeCloseTo(3000 / 29)
  })

  it('接近：>=80% 为 warn', () => {
    const records = [rec({ amount: 8500, at: '2026-08-05T00:00:00Z' })]
    const m = monthBudgetAdvance(records, [], MONTH, TODAY, cfg(), 'expense')
    expect(m.status).toBe('warn')
    expect(m.remaining).toBe(1500)
  })

  it('超支：>=100% 为 over 且 remaining 为负表示超支额', () => {
    const records = [rec({ amount: 11000, at: '2026-08-05T00:00:00Z' })]
    const m = monthBudgetAdvance(records, [], MONTH, TODAY, cfg(), 'expense')
    expect(m.status).toBe('over')
    expect(m.ratio).toBeCloseTo(1.1)
    expect(m.remaining).toBe(-1000)
  })

  it('开启结转：limit = 月度预算 + 上月结转', () => {
    const prev = [rec({ amount: 4000, at: '2026-07-05T00:00:00Z' })]
    const cur = [rec({ amount: 2000, at: '2026-08-05T00:00:00Z' })]
    const m = monthBudgetAdvance([...prev, ...cur], [], MONTH, TODAY, cfg({ rollover: true }), 'expense')
    expect(m.rolledIn).toBe(6000)
    expect(m.limit).toBe(16000)
    expect(m.spent).toBe(2000)
    expect(m.remaining).toBe(14000)
  })
})

describe('annualSpent / yearBudgetAdvance 年度预算', () => {
  it('expense 口径统计年初至今支出', () => {
    const records = [rec({ amount: 10000, at: '2026-01-05T00:00:00Z' }), rec({ amount: 20000, at: '2026-06-05T00:00:00Z' })]
    expect(annualSpent(records, [], '2026', 'expense')).toBe(30000)
  })

  it('withTransfer 口径含转账', () => {
    const transfers = [tr({ amount: 5000, at: '2026-06-01T00:00:00Z' })]
    expect(annualSpent([], transfers, '2026', 'withTransfer')).toBe(5000)
    expect(annualSpent([], transfers, '2026', 'expense')).toBe(0)
  })

  it('汇总：剩余/占用率/月均', () => {
    const records = [rec({ amount: 10000, at: '2026-01-05T00:00:00Z' }), rec({ amount: 20000, at: '2026-06-05T00:00:00Z' })]
    const y = yearBudgetAdvance(records, [], '2026', cfg(), 'expense')
    expect(y.limit).toBe(120000)
    expect(y.spent).toBe(30000)
    expect(y.remaining).toBe(90000)
    expect(y.ratio).toBeCloseTo(0.25)
    expect(y.status).toBe('ok')
    expect(y.monthlyAvg).toBe(10000)
  })
})