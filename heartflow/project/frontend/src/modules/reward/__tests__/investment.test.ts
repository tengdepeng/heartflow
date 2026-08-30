// ============================================================
// 投资持仓收益引擎测试（INCR-31）
// 覆盖 成本/市值/盈亏/收益率/组合汇总(含多币种折算)/存储读写
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
  useHoldings,
  holdingCost,
  holdingValue,
  holdingPnl,
  holdingYield,
  holdingSummary,
  portfolioSummary,
  HOLDING_KIND_META,
  type Holding,
} from '../investment'

const RATES = { CNY: 1, USD: 7.2 }

function h(o: Partial<Holding> = {}): Holding {
  return {
    id: o.id ?? 'h1',
    name: o.name ?? '茅台',
    kind: o.kind ?? 'stock',
    currency: o.currency,
    quantity: o.quantity ?? 100,
    costPrice: o.costPrice ?? 10,
    currentPrice: o.currentPrice ?? 15,
    note: o.note,
    updatedAt: o.updatedAt ?? '2026-08-01',
  }
}

describe('单一持仓指标', () => {
  it('成本/市值/盈亏/收益率', () => {
    const hh = h({ quantity: 100, costPrice: 10, currentPrice: 15 })
    expect(holdingCost(hh)).toBe(1000)
    expect(holdingValue(hh)).toBe(1500)
    expect(holdingPnl(hh)).toBe(500)
    expect(holdingYield(hh)).toBe(50)
  })

  it('成本为 0 时收益率 0', () => {
    expect(holdingYield(h({ quantity: 0, costPrice: 0, currentPrice: 5 }))).toBe(0)
  })
})

describe('持有外币持仓折算', () => {
  it('holdingSummary 折算到基准币', () => {
    const hh = h({ quantity: 10, costPrice: 10, currentPrice: 12, currency: 'USD' })
    const s = holdingSummary(hh, RATES, 'CNY')
    expect(s.value).toBe(120)
    expect(s.valueBase).toBe(120 * 7.2)
    expect(s.pnl).toBe(20)
    expect(s.pnlBase).toBe(20 * 7.2)
  })
})

describe('组合汇总', () => {
  it('多持仓汇总盈亏笔数', () => {
    const ps = portfolioSummary(
      [
        h({ id: 'a', currentPrice: 15, costPrice: 10 }), // +500
        h({ id: 'b', currentPrice: 8, costPrice: 10 }), // -200
        h({ id: 'c', currentPrice: 10, costPrice: 10 }), // 0
      ],
      RATES,
      'CNY',
    )
    expect(ps.count).toBe(3)
    expect(ps.totalPnl).toBe(300)
    expect(ps.totalValue - ps.totalCost).toBe(ps.totalPnl)
    expect(ps.winCount).toBe(1)
    expect(ps.lossCount).toBe(1)
    expect(ps.evenCount).toBe(1)
    expect(ps.yield).toBeGreaterThan(0)
  })

  it('按种类划分 byKind', () => {
    const ps = portfolioSummary(
      [
        h({ kind: 'stock', currentPrice: 15, costPrice: 10 }),
        h({ kind: 'fund', currentPrice: 5, costPrice: 5 }),
      ],
      RATES,
      'CNY',
    )
    expect(ps.byKind.stock.value).toBe(1500)
    expect(ps.byKind.fund.pnl).toBe(0)
    expect(HOLDING_KIND_META.stock.label).toBe('股票')
  })
})

describe('useHoldings 存储读写', () => {
  it('create/updatePrice/remove', () => {
    const uh = useHoldings()
    const created = uh.create({ name: '苹果', kind: 'stock', quantity: 1, costPrice: 100, currentPrice: 120 })
    expect(uh.holdings.value).toHaveLength(1)
    uh.updatePrice(created.id, 150)
    expect(uh.holdings.value[0].currentPrice).toBe(150)
    expect(holdingValue(uh.holdings.value[0])).toBe(150)
    uh.remove(created.id)
    expect(uh.holdings.value).toHaveLength(0)
    expect(store['hf:reward_holdings'] as unknown[]).toHaveLength(0)
  })

  it('invalid 价格不更新', () => {
    const uh = useHoldings()
    const c = uh.create({ name: 'BTC', kind: 'crypto', quantity: 0.5, costPrice: 40000, currentPrice: 45000 })
    uh.updatePrice(c.id, NaN)
    expect(uh.holdings.value[0].currentPrice).toBe(45000)
  })
})