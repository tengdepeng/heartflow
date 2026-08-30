import { describe, it, expect } from 'vitest'
import { applyRecordFilter, tagCounts, accountOptions, toggleArchived } from '../record-detail'
import type { RewardRecord } from '../reward-list'

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tools',
    amount: o.amount ?? 10,
    description: '',
    at: '2026-08-05T00:00:00Z',
    ...o,
  }
}

const records: RewardRecord[] = [
  rec({ id: 'a', amount: 50, tags: ['工作'], account: 'cash', at: '2026-08-01T00:00:00Z' }),
  rec({ id: 'b', amount: 20, tags: ['生活'], account: 'alipay', at: '2026-08-02T00:00:00Z' }),
  rec({ id: 'c', amount: 10, tags: ['工作'], account: 'cash', archived: true, at: '2026-08-03T00:00:00Z' }),
  rec({ id: 'd', type: 'income', amount: 100, category: 'salary', account: 'cash', at: '2026-08-04T00:00:00Z' }),
]

describe('record-detail 明细引擎', () => {
  it('applyRecordFilter 默认按 at 降序分页', () => {
    const r = applyRecordFilter(records)
    expect(r.total).toBe(4)
    expect(r.records[0].id).toBe('d') // 最新在前
  })

  it('按标签过滤', () => {
    const r = applyRecordFilter(records, { tag: '工作' })
    expect(r.total).toBe(2)
    expect(r.records.map(x => x.id)).toEqual(['c', 'a']) // at 降序
  })

  it('按账户过滤', () => {
    const r = applyRecordFilter(records, { account: 'alipay', showArchived: true })
    expect(r.total).toBe(1)
    expect(r.records[0].id).toBe('b')
  })

  it('showArchived=false 隐藏归档', () => {
    const r = applyRecordFilter(records, { showArchived: false })
    expect(r.total).toBe(3)
    expect(r.records.some(x => x.archived)).toBe(false)
  })

  it('按金额升序排序', () => {
    const r = applyRecordFilter(records, { sortField: 'amount', sortOrder: 'asc', showArchived: false })
    const amts = r.records.map(x => x.amount)
    expect(amts).toEqual([20, 50, 100])
  })

  it('分页截断', () => {
    const r = applyRecordFilter(records, { pageSize: 2, page: 2, showArchived: false })
    expect(r.totalPages).toBe(2)
    expect(r.records.length).toBe(1) // 第 2 页余 1 条
  })

  it('过滤文档级别 income 与 keyword', () => {
    const r = applyRecordFilter(records, { types: ['income'] })
    expect(r.total).toBe(1)
  })

  it('tagCounts 统计标签频次', () => {
    expect(tagCounts(records)).toEqual({ 工作: 2, 生活: 1 })
  })

  it('accountOptions 去重含缺省现金', () => {
    expect(accountOptions(records)).toEqual(['cash', 'alipay'])
  })

  it('toggleArchived 切换记录归档', () => {
    const next = toggleArchived(records, 'b')
    expect(next.find(x => x.id === 'b')!.archived).toBe(true)
    expect(next.find(x => x.id === 'a')!.archived).toBeUndefined()
  })
})