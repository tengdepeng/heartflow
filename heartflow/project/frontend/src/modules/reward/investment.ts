// ============================================================
// 劳酬 · 投资持仓收益（INCR-31 数据扩展）
// 持仓（股票/基金/加密/其他）成本/现价 → 市值/盈亏/收益率 + 组合汇总。
// 纯函数引擎 + useHoldings 存储读写（hf:reward_holdings）。
// 汇率参与：不同币种持仓按汇率表折算到基准币再汇总。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'
import { toBase } from './multi-currency'

export type HoldingKind = 'stock' | 'fund' | 'crypto' | 'other'

export interface Holding {
  id: string
  name: string
  kind: HoldingKind
  /** 交易币种，缺省用基准币 */
  currency?: string
  quantity: number
  /** 买入成本价（按 quantity 单位） */
  costPrice: number
  /** 最新价 */
  currentPrice: number
  note?: string
  updatedAt: string
}

export interface HoldingKindMeta {
  label: string
  icon: string
  color: string
}

export const HOLDING_KIND_META: Record<HoldingKind, HoldingKindMeta> = {
  stock: { label: '股票', icon: '📈', color: '#6b9fc4' },
  fund: { label: '基金', icon: '🧺', color: '#8a9a7a' },
  crypto: { label: '加密', icon: '🪙', color: '#e0a96d' },
  other: { label: '其他', icon: '🏷️', color: '#94a3b8' },
}

const HOLDINGS_KEY = REWARD_STORAGE_KEYS.HOLDINGS

// ---- 纯函数 ----

export function holdingCost(h: Pick<Holding, 'quantity' | 'costPrice'>): number {
  return h.quantity * h.costPrice
}

export function holdingValue(h: Pick<Holding, 'quantity' | 'currentPrice'>): number {
  return h.quantity * h.currentPrice
}

export function holdingPnl(h: Holding): number {
  return holdingValue(h) - holdingCost(h)
}

/** 收益率（%，成本为 0 时返回 0） */
export function holdingYield(h: Holding): number {
  const cost = holdingCost(h)
  if (cost === 0) return 0
  return Math.round((holdingPnl(h) / cost) * 10000) / 100
}

/** 单一持仓摘要（含折算基准币） */
export function holdingSummary(
  h: Holding,
  rates: Record<string, number>,
  base: string,
): {
  cost: number
  value: number
  pnl: number
  yield: number
  costBase: number
  valueBase: number
  pnlBase: number
} {
  const cur = h.currency || base
  const cost = holdingCost(h)
  const value = holdingValue(h)
  const pnl = value - cost
  return {
    cost,
    value,
    pnl,
    yield: holdingYield(h),
    costBase: toBase(cost, cur, rates, base),
    valueBase: toBase(value, cur, rates, base),
    pnlBase: toBase(value, cur, rates, base) - toBase(cost, cur, rates, base),
  }
}

export interface PortfolioSummary {
  totalCost: number
  totalValue: number
  totalPnl: number
  /** 总收益率（%，成本为 0 返回 0） */
  yield: number
  count: number
  /** 盈利/亏损/持平笔数 */
  winCount: number
  lossCount: number
  evenCount: number
  /** 按种类划分（均折算基准币） */
  byKind: Record<HoldingKind, { cost: number; value: number; pnl: number }>
}

export function portfolioSummary(holdings: Holding[], rates: Record<string, number>, base: string): PortfolioSummary {
  const byKind = {
    stock: { cost: 0, value: 0, pnl: 0 },
    fund: { cost: 0, value: 0, pnl: 0 },
    crypto: { cost: 0, value: 0, pnl: 0 },
    other: { cost: 0, value: 0, pnl: 0 },
  }
  let totalCost = 0
  let totalValue = 0
  let win = 0
  let loss = 0
  let even = 0
  for (const h of holdings) {
    const s = holdingSummary(h, rates, base)
    totalCost += s.costBase
    totalValue += s.valueBase
    const k = byKind[h.kind] || byKind.other
    k.cost += s.costBase
    k.value += s.valueBase
    k.pnl += s.pnlBase
    if (s.pnl > 0) win++
    else if (s.pnl < 0) loss++
    else even++
  }
  return {
    totalCost,
    totalValue,
    totalPnl: totalValue - totalCost,
    yield: totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 10000) / 100 : 0,
    count: holdings.length,
    winCount: win,
    lossCount: loss,
    evenCount: even,
    byKind,
  }
}

export function holdingKindMeta(kind: HoldingKind): HoldingKindMeta {
  return HOLDING_KIND_META[kind] || HOLDING_KIND_META.other
}

// ---- 存储读写 ----

export function useHoldings() {
  const holdings = ref<Holding[]>(storage.getKV<Holding[]>(HOLDINGS_KEY, []))

  function persist(): void {
    storage.setKV(HOLDINGS_KEY, holdings.value)
  }
  function load(): void {
    holdings.value = storage.getKV<Holding[]>(HOLDINGS_KEY, [])
  }

  function create(data: Omit<Holding, 'id' | 'updatedAt'>): Holding {
    const h: Holding = {
      ...data,
      id: `h-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      updatedAt: new Date().toISOString(),
    }
    holdings.value.push(h)
    persist()
    return h
  }

  function updatePrice(id: string, currentPrice: number): void {
    const i = holdings.value.findIndex(h => h.id === id)
    if (i < 0 || isNaN(currentPrice)) return
    holdings.value[i].currentPrice = currentPrice
    holdings.value[i].updatedAt = new Date().toISOString()
    persist()
  }

  function update(id: string, patch: Partial<Holding>): void {
    const i = holdings.value.findIndex(h => h.id === id)
    if (i < 0) return
    holdings.value[i] = { ...holdings.value[i], ...patch, updatedAt: new Date().toISOString() }
    persist()
  }

  function remove(id: string): void {
    holdings.value = holdings.value.filter(h => h.id !== id)
    persist()
  }

  return { holdings, create, updatePrice, update, remove, load }
}