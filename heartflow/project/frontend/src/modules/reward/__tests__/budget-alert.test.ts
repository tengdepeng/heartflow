import { describe, it, expect } from 'vitest'
import { categorizeExpense, computeBudgetProgress, monthOutflow, budgetsForMonth } from '../budget-alert'
import type { RewardRecord } from '../reward-list'
import type { Budget } from '../types'
import type { Transfer } from '../accounts'

function rec(o: Partial<RewardRecord>): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tool',
    amount: o.amount ?? 0,
    description: '',
    at: o.at ?? '2026-08-05T00:00:00Z',
    ...o,
  }
}

describe('budget-alert 引擎', () => {
  it('categorizeExpense 按类别聚合某月支出，忽略收入与越月', () => {
    const records = [
      rec({ category: 'tool', amount: 100, at: '2026-08-01T00:00:00Z' }),
      rec({ category: 'tool', amount: 50, at: '2026-08-02T00:00:00Z' }),
      rec({ category: 'food', amount: 20, at: '2026-07-31T00:00:00Z' }),
      rec({ type: 'income', category: 'salary', amount: 999, at: '2026-08-03T00:00:00Z' }),
    ]
    expect(categorizeExpense(records, '2026-08')).toEqual({ tool: 150 })
  })

  it('computeBudgetProgress 计算比例与状态（ok/warn/over）', () => {
    const base: Budget = { id: 'b', category: 'tools', monthlyLimit: 200, currentSpent: 0, month: '2026-08' }
    expect(computeBudgetProgress({ ...base }, { tools: 150 }).status).toBe('ok') // 0.75
    expect(computeBudgetProgress({ ...base }, { tools: 180 }).status).toBe('warn') // 0.9
    expect(computeBudgetProgress({ ...base }, { tools: 210 }).status).toBe('over')
    expect(computeBudgetProgress({ ...base }, { tools: 100 }).ratio).toBeCloseTo(0.5)
  })

  it('monthOutflow 仅支出口径 = 纯支出', () => {
    const transfers: Transfer[] = [
      { id: 't1', from: 'cash', to: 'alipay', amount: 50, at: '2026-08-02T00:00:00Z' },
    ]
    const records = [rec({ amount: 30, at: '2026-08-01T00:00:00Z' })]
    const r = monthOutflow(records, transfers, '2026-08', 'expense')
    expect(r.expense).toBe(30)
    expect(r.turnedOver).toBe(50)
    expect(r.total).toBe(30)
  })

  it('monthOutflow 含转账口径 = 支出 + 当月转出总额', () => {
    const transfers: Transfer[] = [
      { id: 't1', from: 'cash', to: 'alipay', amount: 50, at: '2026-08-02T00:00:00Z' },
      { id: 't2', from: 'alipay', to: 'cash', amount: 20, at: '2026-08-03T00:00:00Z' },
    ]
    const records = [rec({ amount: 30, at: '2026-08-01T00:00:00Z' })]
    const r = monthOutflow(records, transfers, '2026-08', 'withTransfer')
    expect(r.turnedOver).toBe(70)
    expect(r.total).toBe(100)
  })

  it('monthOutflow 忽略其他月份转账', () => {
    const transfers: Transfer[] = [
      { id: 't1', from: 'cash', to: 'alipay', amount: 999, at: '2026-07-02T00:00:00Z' },
    ]
    const r = monthOutflow([], transfers, '2026-08', 'withTransfer')
    expect(r.turnedOver).toBe(0)
    expect(r.total).toBe(0)
  })

  it('budgetsForMonth 只返回指定月', () => {
    const budgets: Budget[] = [
      { id: 'a', category: 'tools', monthlyLimit: 100, currentSpent: 0, month: '2026-08' },
      { id: 'b', category: 'health', monthlyLimit: 100, currentSpent: 0, month: '2026-07' },
    ]
    expect(budgetsForMonth(budgets, '2026-08').map(b => b.id)).toEqual(['a'])
  })
})