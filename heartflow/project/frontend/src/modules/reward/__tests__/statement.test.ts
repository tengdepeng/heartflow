import { describe, it, expect } from 'vitest'
import { monthStatement, toMarkdown, toCsv } from '../statement'
import type { RewardRecord } from '../reward-list'

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tools',
    amount: o.amount ?? 1,
    description: '',
    at: o.at ?? '2026-08-01T00:00:00Z',
    account: o.account ?? 'cash',
    ...o,
  }
}

const records: RewardRecord[] = [
  rec({ id: 'a', type: 'income', category: 'salary', amount: 1000, at: '2026-08-05T00:00:00Z' }),
  rec({ id: 'b', type: 'expense', category: 'tools', amount: 100, at: '2026-08-06T00:00:00Z' }),
  rec({ id: 'c', type: 'expense', category: 'tools', amount: 50, at: '2026-08-07T00:00:00Z' }),
  rec({ id: 'd', type: 'expense', category: 'learning', amount: 30, at: '2026-07-30T00:00:00Z' }), // 上月不计
]

describe('statement 月结单引擎', () => {
  it('monthStatement 汇总指定月收支', () => {
    const s = monthStatement(records, '2026-08')
    expect(s.income).toBe(1000)
    expect(s.expense).toBe(150)
    expect(s.balance).toBe(850)
    expect(s.count).toBe(3)
  })

  it('categoryTop 按支出类别降序取 TOP', () => {
    const s = monthStatement(records, '2026-08')
    expect(s.categoryTop[0]).toEqual({ category: 'tools', amount: 150 })
    expect(s.expenseByType.learning).toBeUndefined()
  })

  it('incomeByType/expenseByType 分布', () => {
    const s = monthStatement(records, '2026-08')
    expect(s.incomeByType.salary).toBe(1000)
    expect(s.expenseByType.tools).toBe(150)
  })

  it('toMarkdown 输出标题与金额', () => {
    const md = toMarkdown(monthStatement(records, '2026-08'))
    expect(md).toContain('2026-08')
    expect(md).toContain('净结余')
    expect(md).toContain('tools')
  })

  it('toCsv 首行表头含 field，并按字段含金额', () => {
    const csv = toCsv(monthStatement(records, '2026-08'))
    const lines = csv.split('\n').filter(Boolean)
    expect(lines[0]).toContain('field')
    expect(lines[1]).toContain('1000') // income
    expect(lines[2]).toContain('150') // expense
    expect(lines[3]).toContain('850') // balance
  })

  it('空月汇总归零且 TOP 为空数组', () => {
    const s = monthStatement(records, '2026-09')
    expect(s.income).toBe(0)
    expect(s.expense).toBe(0)
    expect(s.count).toBe(0)
    expect(s.categoryTop).toEqual([])
    expect(toMarkdown(s)).toContain('无支出')
  })
})