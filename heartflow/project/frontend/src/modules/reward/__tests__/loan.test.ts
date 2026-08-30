// ============================================================
// loan 借贷/往来引擎测试（INCR-25）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, unknown> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, d?: unknown): unknown => store[k] ?? d),
    mockSetKV: vi.fn((k: string, v: unknown): void => {
      store[k] = v
    }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: mockGetKV,
    setKV: mockSetKV,
  },
}))

import {
  remaining,
  loanStatus,
  overdueDays,
  netSummary,
  useLoans,
  type LoanRecord,
} from '../loan'

const TODAY = '2026-08-29'

function loan(o: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: o.id ?? 'l1',
    direction: o.direction ?? 'lend',
    counterparty: o.counterparty ?? '小王',
    amount: o.amount ?? 500,
    account: o.account ?? 'cash',
    createdAt: o.createdAt ?? '2026-08-01',
    dueAt: o.dueAt,
    note: o.note,
    settlements: o.settlements ?? [],
  }
}

describe('remaining / loanStatus 余额与状态', () => {
  it('未结算时剩余等于原始金额', () => {
    expect(remaining(loan())).toBe(500)
    expect(loanStatus(loan())).toBe('outstanding')
  })

  it('部分还款后剩余扣减', () => {
    const l = loan({ settlements: [{ id: 's1', amount: 200, at: '2026-08-10' }] })
    expect(remaining(l)).toBe(300)
    expect(loanStatus(l)).toBe('outstanding')
  })

  it('结清后剩余为 0、状态 settled', () => {
    const l = loan({ settlements: [{ id: 's1', amount: 500, at: '2026-08-10' }] })
    expect(remaining(l)).toBe(0)
    expect(loanStatus(l)).toBe('settled')
  })

  it('多笔结算累加、超额结算剩余下限为 0', () => {
    const l = loan({
      settlements: [
        { id: 's1', amount: 300, at: '2026-08-10' },
        { id: 's2', amount: 400, at: '2026-08-12' },
      ],
    })
    expect(remaining(l)).toBe(0)
    expect(loanStatus(l)).toBe('settled')
  })
})

describe('overdueDays 逾期天数', () => {
  it('已结清不逾期', () => {
    const l = loan({ dueAt: '2026-08-01', settlements: [{ id: 's1', amount: 500, at: '2026-08-05' }] })
    expect(overdueDays(l, TODAY)).toBe(0)
  })

  it('无应还日不逾期', () => {
    expect(overdueDays(loan(), TODAY)).toBe(0)
  })

  it('未到期不逾期', () => {
    const l = loan({ dueAt: '2026-09-01' })
    expect(overdueDays(l, TODAY)).toBe(0)
  })

  it('到期当天不逾期', () => {
    const l = loan({ dueAt: '2026-08-29' })
    expect(overdueDays(l, TODAY)).toBe(0)
  })

  it('逾期按自然日计算（跨月）', () => {
    const l = loan({ dueAt: '2026-07-30' })
    expect(overdueDays(l, TODAY)).toBe(30)
  })

  it('仅逾期 1 天返回 1', () => {
    const l = loan({ dueAt: '2026-08-28' })
    expect(overdueDays(l, TODAY)).toBe(1)
  })
})

describe('netSummary 应收应付净额聚合', () => {
  it('空记录全零', () => {
    const s = netSummary([], TODAY)
    expect(s).toEqual({
      receivable: 0,
      payable: 0,
      net: 0,
      lendCount: 0,
      borrowCount: 0,
      outstandingCount: 0,
      settledCount: 0,
      overdueLendCount: 0,
      overdueBorrowCount: 0,
    })
  })

  it('借出未结计入应收、借入未结计入应付，净额=应收−应付', () => {
    const lend = loan({ id: 'a', direction: 'lend', amount: 1000, settlements: [{ id: 's1', amount: 300, at: '2026-08-05' }] })
    const borrow = loan({ id: 'b', direction: 'borrow', amount: 600 })
    const s = netSummary([lend, borrow], TODAY)
    expect(s.receivable).toBe(700)
    expect(s.payable).toBe(600)
    expect(s.net).toBe(100)
    expect(s.lendCount).toBe(1)
    expect(s.borrowCount).toBe(1)
    expect(s.outstandingCount).toBe(2)
    expect(s.settledCount).toBe(0)
  })

  it('结清记录不参与应收应付', () => {
    const settled = loan({ direction: 'lend', amount: 500, settlements: [{ id: 's1', amount: 500, at: '2026-08-05' }] })
    const s = netSummary([settled], TODAY)
    expect(s.receivable).toBe(0)
    expect(s.settledCount).toBe(1)
    expect(s.outstandingCount).toBe(0)
  })

  it('净额为负表示净应付', () => {
    const lend = loan({ id: 'a', direction: 'lend', amount: 100 })
    const borrow = loan({ id: 'b', direction: 'borrow', amount: 300 })
    expect(netSummary([lend, borrow], TODAY).net).toBe(-200)
  })

  it('逾期笔数按方向分别统计', () => {
    const overdueLend = loan({ id: 'a', direction: 'lend', dueAt: '2026-08-01' })
    const overdueBorrow = loan({ id: 'b', direction: 'borrow', dueAt: '2026-08-01' })
    const okBorrow = loan({ id: 'c', direction: 'borrow', dueAt: '2026-09-10' })
    const s = netSummary([overdueLend, overdueBorrow, okBorrow], TODAY)
    expect(s.overdueLendCount).toBe(1)
    expect(s.overdueBorrowCount).toBe(1)
  })
})

describe('useLoans 存储读写', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete store['hf:reward_loans']
  })

  it('create 新增记录并持久化，settlements 初始为空', () => {
    const loans = useLoans()
    const created = loans.create({
      direction: 'borrow',
      counterparty: '房东',
      amount: 8000,
      account: 'cash',
      createdAt: '2026-08-01',
      dueAt: '2026-09-01',
      note: '押一付三',
    })
    expect(loans.records.value.length).toBe(1)
    expect(created.id).toBeTruthy()
    expect(created.settlements).toEqual([])
    expect(mockSetKV).toHaveBeenCalledWith('hf:reward_loans', loans.records.value)
  })

  it('settle 追加还款/收债记录并持久化', () => {
    const loans = useLoans()
    const created = loans.create({
      direction: 'lend',
      counterparty: '同事',
      amount: 1000,
      createdAt: '2026-08-01',
    })
    loans.settle(created.id, 400, '2026-08-10', '还了一部分')
    expect(loans.records.value[0].settlements).toHaveLength(1)
    expect(loans.records.value[0].settlements[0]).toMatchObject({ amount: 400, at: '2026-08-10', note: '还了一部分' })
    expect(remaining(loans.records.value[0])).toBe(600)
  })

  it('settle 金额非正或记录不存在时不追加', () => {
    const loans = useLoans()
    const created = loans.create({
      direction: 'borrow',
      counterparty: '小明',
      amount: 200,
      createdAt: '2026-08-01',
    })
    loans.settle(created.id, 0, '2026-08-10')
    loans.settle('nope', 100, '2026-08-10')
    expect(loans.records.value[0].settlements).toHaveLength(0)
  })

  it('remove 删除记录并持久化', () => {
    const loans = useLoans()
    const a = loans.create({ direction: 'lend', counterparty: 'A', amount: 100, createdAt: '2026-08-01' })
    const b = loans.create({ direction: 'borrow', counterparty: 'B', amount: 200, createdAt: '2026-08-01' })
    loans.remove(a.id)
    expect(loans.records.value.map(l => l.id)).toEqual([b.id])
  })

  it('load 重读外部写入', () => {
    store['hf:reward_loans'] = [loan({ id: 'ext' })]
    const loans = useLoans()
    expect(loans.records.value.map(l => l.id)).toEqual(['ext'])
  })
})
