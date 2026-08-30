// ============================================================
// 信用卡/负债引擎测试（INCR-26）
// 覆盖余额/可用/到期/逾期/还款计划/负债聚合/存储读写
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

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
})

import {
  useCreditCards,
  cardBalance,
  cleared,
  availableCredit,
  nextDueDate,
  isOverdue,
  overdueDays,
  dueInDays,
  minimumPayment,
  payoffPlan,
  liabilitySummary,
  type CreditCardRecord,
} from '../credit-card'

const TODAY = '2026-08-29'

function card(o: Partial<CreditCardRecord> = {}): CreditCardRecord {
  return {
    id: o.id ?? 'c1',
    name: o.name ?? '招行卡',
    kind: o.kind ?? 'credit',
    creditLimit: o.creditLimit ?? 10000,
    openingBalance: o.openingBalance ?? 3000,
    repaymentDay: o.repaymentDay ?? 10,
    planMonthly: o.planMonthly,
    note: o.note,
    repayments: o.repayments ?? [],
  }
}

describe('cardBalance / cleared 余额与状态', () => {
  it('无还款时未还 = 期初已用', () => {
    expect(cardBalance(card())).toBe(3000)
    expect(cleared(card())).toBe(false)
  })

  it('部分还款后未还扣减', () => {
    const c = card({ repayments: [{ id: 'r1', amount: 800, at: '2026-08-15' }] })
    expect(cardBalance(c)).toBe(2200)
  })

  it('还清后 balance=0 且 cleared=true', () => {
    const c = card({ repayments: [{ id: 'r1', amount: 3000, at: '2026-08-15' }] })
    expect(cardBalance(c)).toBe(0)
    expect(cleared(c)).toBe(true)
  })
})

describe('availableCredit 可用额度', () => {
  it('信用卡可用 = 额度 − 已用', () => {
    expect(availableCredit(card({ creditLimit: 10000, openingBalance: 3000 }))).toBe(7000)
  })

  it('负债无额度返回 0', () => {
    const c = card({ kind: 'debt', creditLimit: undefined })
    expect(availableCredit(c)).toBe(0)
  })

  it('已用超过额度时可用归零', () => {
    expect(availableCredit(card({ creditLimit: 5000, openingBalance: 8000 }))).toBe(0)
  })
})

describe('nextDueDate / dueInDays 到期', () => {
  it('还款日仍未到本月 → 返回本月还款日', () => {
    // 今天 8/29，还款日 10 → 本月 8/10 已过 → 返回 9/10
    expect(nextDueDate(card(), '2026-08-29')).toBe('2026-09-10')
  })

  it('还款日在今天之后 → 返回本月还款日', () => {
    expect(nextDueDate(card({ repaymentDay: 20 }), '2026-08-10')).toBe('2026-08-20')
  })

  it('已还清 → 无下次还款日', () => {
    const c = card({ repayments: [{ id: 'r1', amount: 3000, at: '2026-08-15' }] })
    expect(nextDueDate(c, TODAY)).toBeNull()
  })

  it('还款日 31 在 30 天月份自动截断到月末', () => {
    // 6/10，还款日 31 → 6/31 不存在 → 6/30
    expect(nextDueDate(card({ repaymentDay: 31 }), '2026-06-10')).toBe('2026-06-30')
  })

  it('dueInDays = 距下次还款日天数', () => {
    expect(dueInDays(card(), '2026-08-29')).toBe(12) // 9/10 − 8/29
    expect(dueInDays(card({ repayments: [{ id: 'r1', amount: 9999, at: '2026-08-15' }] }), TODAY)).toBeNull()
  })
})

describe('isOverdue / overdueDays 逾期', () => {
  it('还款日已过仍有余额 → 逾期', () => {
    // 今天 8/29，还款日 10，已过 → 逾期 19 天
    expect(isOverdue(card(), TODAY)).toBe(true)
    expect(overdueDays(card(), TODAY)).toBe(19)
  })

  it('还款日未到 → 不逾期', () => {
    expect(isOverdue(card({ repaymentDay: 30 }), TODAY)).toBe(false)
    expect(overdueDays(card({ repaymentDay: 30 }), TODAY)).toBe(0)
  })

  it('还款日当天未还清不视为逾期（day0）', () => {
    // 今天 8/10 = 还款日
    expect(overdueDays(card(), '2026-08-10')).toBe(0)
  })

  it('已还清恒不逾期', () => {
    const c = card({ repayments: [{ id: 'r1', amount: 3000, at: '2026-08-15' }] })
    expect(isOverdue(c, TODAY)).toBe(false)
  })
})

describe('minimumPayment / payoffPlan 还款计划', () => {
  it('最低还款 = 已用×10% 向上取整', () => {
    expect(minimumPayment(card({ openingBalance: 3040 }))).toBe(304)
  })

  it('默认 12 期均衡月供与结清期数', () => {
    const p = payoffPlan(card({ openingBalance: 12000 }))
    expect(p.monthly).toBe(1000)
    expect(p.months).toBe(12)
  })

  it('自定义 planMonthly 优先', () => {
    const p = payoffPlan(card({ openingBalance: 12000, planMonthly: 3000 }))
    expect(p.monthly).toBe(3000)
    expect(p.months).toBe(4)
  })

  it('已还清 → 月供与期数归零', () => {
    const c = card({ repayments: [{ id: 'r1', amount: 99999, at: '2026-08-15' }] })
    expect(payoffPlan(c)).toEqual({ monthly: 0, months: 0 })
  })
})

describe('liabilitySummary 负债口径聚合', () => {
  it('聚合负债总额/额度/可用/最低还款/逾期待收', () => {
    const cards = [
      card({ id: 'a', name: '招行', openingBalance: 3000, repaymentDay: 10 }), // 逾期
      card({ id: 'b', name: '花呗', kind: 'debt', creditLimit: undefined, openingBalance: 2000, repaymentDay: 30 }), // 按期
    ]
    const s = liabilitySummary(cards, TODAY)
    expect(s.totalBalance).toBe(5000)
    expect(s.totalCreditLimit).toBe(10000) // 仅信用卡额度
    expect(s.totalAvailable).toBe(7000)
    expect(s.totalMinimum).toBe(500)
    expect(s.creditCount).toBe(1)
    expect(s.debtCount).toBe(1)
    expect(s.overdueCount).toBe(1)
  })

  it('3 天内到期计入 dueSoon', () => {
    // 还款日 31 → 本月 8/31，距今 8/29 差 2 天
    const cards = [card({ repaymentDay: 31 })]
    expect(liabilitySummary(cards, TODAY).dueSoonCount).toBe(1)
  })

  it('空列表全零', () => {
    const s = liabilitySummary([], TODAY)
    expect(s.totalBalance).toBe(0)
    expect(s.overdueCount).toBe(0)
    expect(s.dueSoonCount).toBe(0)
  })
})

describe('useCreditCards 存储读写', () => {
  it('create 新增并持久化，repayments 初始为空', () => {
    const cc = useCreditCards()
    const created = cc.create({
      name: '工行卡',
      kind: 'credit',
      creditLimit: 20000,
      openingBalance: 5000,
      repaymentDay: 15,
    })
    expect(cc.records.value.length).toBe(1)
    expect(created.repayments).toEqual([])
  })

  it('repay 追加还款明细并扣减余额', () => {
    const cc = useCreditCards()
    const c = cc.create({ name: '招行', kind: 'credit', creditLimit: 10000, openingBalance: 3000, repaymentDay: 10 })
    cc.repay(c.id, 1000, TODAY)
    expect(cardBalance(cc.records.value[0])).toBe(2000)
    expect(cc.records.value[0].repayments.length).toBe(1)
  })

  it('repay 金额≤0 忽略', () => {
    const cc = useCreditCards()
    const c = cc.create({ name: '招行', kind: 'credit', creditLimit: 10000, openingBalance: 3000, repaymentDay: 10 })
    cc.repay(c.id, 0, TODAY)
    expect(cc.records.value[0].repayments.length).toBe(0)
  })

  it('updatePlan 设置/清空还款计划', () => {
    const cc = useCreditCards()
    const c = cc.create({ name: '招行', kind: 'credit', creditLimit: 10000, openingBalance: 3000, repaymentDay: 10 })
    cc.updatePlan(c.id, 800)
    expect(cc.records.value[0].planMonthly).toBe(800)
    cc.updatePlan(c.id, 0)
    expect(cc.records.value[0].planMonthly).toBeUndefined()
  })

  it('remove 删除并存库', () => {
    const cc = useCreditCards()
    const c = cc.create({ name: '招行', kind: 'credit', creditLimit: 10000, openingBalance: 3000, repaymentDay: 10 })
    cc.remove(c.id)
    expect(cc.records.value.length).toBe(0)
    expect(useCreditCards().records.value.length).toBe(0)
  })
})