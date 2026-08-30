// ============================================================
// 资产负债净资产引擎测试（INCR-27）
// 覆盖资产回溯 / 负债回溯 / 趋势起点 / 总览 / 月度趋势
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  netAssetSummary,
  netAssetTrend,
  accountBalanceAt,
  liabilityAt,
  cardTrendStartMonth,
} from '../net-asset'
import type { Account } from '../accounts'
import type { Transfer } from '../accounts'
import type { CreditCardRecord } from '../credit-card'
import type { RewardRecord } from '../reward-list'

const TODAY = '2026-08-29'

function acc(o: Partial<Account> = {}): Account {
  return { id: 'cash', name: '现金', type: 'cash', initialBalance: 0, note: undefined, ...o }
}
function rec(o: Partial<RewardRecord>): RewardRecord {
  return { id: 'r1', type: 'income', category: 'salary', amount: 100, description: '', at: '2026-08-10', account: undefined, ...o }
}
function tr(o: Partial<Transfer>): Transfer {
  return { id: 't1', from: 'a', to: 'b', amount: 100, at: '2026-08-10', note: undefined, ...o }
}
function card(o: Partial<CreditCardRecord> = {}): CreditCardRecord {
  return {
    id: 'c1',
    name: '招行卡',
    kind: 'credit',
    creditLimit: 10000,
    openingBalance: 3000,
    repaymentDay: 10,
    planMonthly: undefined,
    note: undefined,
    repayments: [],
    ...o,
  }
}

describe('accountBalanceAt 资产回溯重构', () => {
  it('无记录时返回期初余额', () => {
    expect(accountBalanceAt(acc({ initialBalance: 500 }), [], [], TODAY)).toBe(500)
  })

  it('计入 asOf 当日及之前的收支（收入加/支出减），排除之后记录', () => {
    const records = [
      rec({ id: 'a', type: 'income', amount: 1000, at: '2026-08-05' }),
      rec({ id: 'b', type: 'expense', amount: 300, at: '2026-08-20' }),
      rec({ id: 'c', type: 'income', amount: 9999, at: '2026-08-31' }), // 在 asOf 之后，忽略
    ]
    expect(accountBalanceAt(acc(), records, [], '2026-08-20')).toBe(700)
  })

  it('仅统计归属本账户的记录', () => {
    const records = [
      rec({ id: 'a', type: 'income', amount: 1000, account: 'cash' }),
      rec({ id: 'b', type: 'income', amount: 5000, account: 'bank' }),
    ]
    expect(accountBalanceAt(acc(), records, [], TODAY)).toBe(1000)
  })

  it('计入转账（转出减/转入加）且按 asOf 截断', () => {
    const transfers = [
      tr({ from: 'cash', to: 'bank', amount: 500, at: '2026-08-05' }),
      tr({ from: 'bank', to: 'cash', amount: 9000, at: '2026-08-31' }),
    ]
    expect(accountBalanceAt(acc(), [], transfers, '2026-08-20')).toBe(-500)
    expect(accountBalanceAt(acc(), [], transfers, '2026-08-31')).toBe(8500)
  })
})

describe('liabilityAt 负债回溯', () => {
  it('asOf 今天 = cardBalance', () => {
    const c = card({ repayments: [{ id: 'rp1', amount: 1000, at: '2026-08-15' }] })
    expect(liabilityAt(c, TODAY)).toBe(2000)
  })

  it('asOf 早于还款日时加回该日后发生的还款', () => {
    const c = card({ repayments: [{ id: 'rp1', amount: 1000, at: '2026-08-15' }] })
    expect(liabilityAt(c, '2026-08-01')).toBe(3000) // 期初 3000，尚未还款
  })

  it('不会为负', () => {
    const c = card({ openingBalance: 2000, repayments: [{ id: 'rp1', amount: 2000, at: '2026-08-15' }] })
    expect(liabilityAt(c, TODAY)).toBe(0)
    expect(liabilityAt(c, '2026-08-01')).toBe(2000)
  })
})

describe('cardTrendStartMonth 趋势起点', () => {
  it('无还款的新卡以当前月为起点', () => {
    expect(cardTrendStartMonth(card(), TODAY)).toBe('2026-08')
  })

  it('有还款以最早还款月为起点', () => {
    const c = card({ repayments: [{ id: 'a', amount: 100, at: '2026-07-20' }] })
    expect(cardTrendStartMonth(c, TODAY)).toBe('2026-07')
  })
})

describe('netAssetSummary 净资产总览', () => {
  it('资产 = 各账户余额合计，负债 = 卡未还合计，净资产 = 之差', () => {
    const accounts = [
      acc({ id: 'cash', name: '现金', initialBalance: 5000 }),
      acc({ id: 'bank', name: '银行', initialBalance: 20000 }),
    ]
    const cards = [
      card({ id: 'a', openingBalance: 3000 }),
      card({ id: 'b', kind: 'debt', creditLimit: undefined, openingBalance: 2000 }),
    ]
    const s = netAssetSummary(accounts, [], [], cards, TODAY)
    expect(s.totalAssets).toBe(25000)
    expect(s.totalLiabilities).toBe(5000)
    expect(s.netAssets).toBe(20000)
    expect(s.assetItems.length).toBe(2)
    expect(s.liabilityItems.length).toBe(2)
    expect(s.negative).toBe(false)
  })

  it('负债为 0 时 coverage 为 null', () => {
    const s = netAssetSummary([acc({ initialBalance: 3000 })], [], [], [], TODAY)
    expect(s.coverage).toBeNull()
    expect(s.netAssets).toBe(3000)
  })

  it('覆盖率 = 资产÷负债×100，净资产为负与倒挂统计', () => {
    const s = netAssetSummary([acc({ id: 'x', name: '借支', initialBalance: -200 })], [], [], [card({ openingBalance: 1000 })], TODAY)
    expect(s.coverage).toBe(-20)
    expect(s.negative).toBe(true)
    expect(s.negativeAssets).toBe(1)
  })
})

describe('netAssetTrend 月度趋势', () => {
  it('生成近 6 个月的升序节点，net = 资产 − 负债', () => {
    const s = netAssetTrend([acc({ initialBalance: 1000 })], [], [], [], '2026-08-29', 6)
    expect(s.length).toBe(6)
    expect(s[0].month).toBe('2026-03')
    expect(s[5].month).toBe('2026-08')
    expect(s.every(p => p.net === p.assets - p.liabilities)).toBe(true)
    expect(s.every(p => p.assets === 1000)).toBe(true)
  })

  it('卡从趋势起点月起计入负债，前期为 0', () => {
    const accounts = [acc({ initialBalance: 10000 })]
    const c = card({ openingBalance: 3000, repayments: [{ id: 'rp1', amount: 3000, at: '2026-08-15' }] })
    const s = netAssetTrend(accounts, [], [], [c], '2026-08-29', 6)
    // 起点月 = 2026-08：8 月前负债 0，8 月负债 = 未还 0（已还清）
    expect(s.find(p => p.month === '2026-07')!.liabilities).toBe(0)
    expect(s.find(p => p.month === '2026-08')!.liabilities).toBe(0)
    expect(s.find(p => p.month === '2026-08')!.net).toBe(10000)
  })

  it('新卡（无还款）仅当前月计入期初负债', () => {
    const accounts = [acc({ initialBalance: 10000 })]
    const c = card({ openingBalance: 3000 })
    const s = netAssetTrend(accounts, [], [], [c], '2026-08-29', 6)
    expect(s.find(p => p.month === '2026-07')!.liabilities).toBe(0)
    expect(s.find(p => p.month === '2026-08')!.liabilities).toBe(3000)
  })

  it('月份跨年回绕正确', () => {
    const s = netAssetTrend([acc({ initialBalance: 100 })], [], [], [], '2026-02-10', 6)
    expect(s[0].month).toBe('2025-09')
    expect(s[5].month).toBe('2026-02')
  })
})