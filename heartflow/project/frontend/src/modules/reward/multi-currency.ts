// ============================================================
// 劳酬 · 多币种/汇率（INCR-31 数据扩展）
// 基准币种 + 汇率表 + 金额换算。汇率语义：rate[code] = 1 单位 code 兑多少基准币。
// 纯函数引擎负责换算/格式化，useMultiCurrency 负责存储读写。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'

export interface CurrencyEntry {
  code: string
  symbol: string
  label: string
}

export interface CurrencyConfig {
  /** 基准币种（本账本记账币种） */
  base: string
  /** 汇率表：rate[code] = 1 单位 code 兑多少基准币 */
  rates: Record<string, number>
  /** 汇率表更新时间 */
  updatedAt: string
}

/** 常用币种清单 */
export const CURRENCY_LIST: CurrencyEntry[] = [
  { code: 'CNY', symbol: '¥', label: '人民币' },
  { code: 'USD', symbol: '$', label: '美元' },
  { code: 'EUR', symbol: '€', label: '欧元' },
  { code: 'HKD', symbol: 'HK$', label: '港币' },
  { code: 'JPY', symbol: 'JP¥', label: '日元' },
  { code: 'GBP', symbol: '£', label: '英镑' },
  { code: 'KRW', symbol: '₩', label: '韩元' },
  { code: 'AUD', symbol: 'A$', label: '澳元' },
  { code: 'CAD', symbol: 'C$', label: '加元' },
  { code: 'SGD', symbol: 'S$', label: '新加坡元' },
]

/** 默认汇率（以 CNY 为基准，供离线参考；用户可在面板手动更新） */
export const DEFAULT_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.2,
  EUR: 7.8,
  HKD: 0.92,
  JPY: 0.048,
  GBP: 9.1,
  KRW: 0.0052,
  AUD: 4.7,
  CAD: 5.2,
  SGD: 5.3,
}

export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  base: 'CNY',
  rates: { ...DEFAULT_RATES },
  updatedAt: '',
}

const CONFIG_KEY = REWARD_STORAGE_KEYS.CURRENCY_CONFIG

// ---- 纯函数 ----

/** 归一化汇率表（保证含基准币=1，缺省补默认值） */
export function normalizeRates(config: CurrencyConfig): Record<string, number> {
  const rates: Record<string, number> = { ...(config.rates || {}), [config.base]: 1 }
  for (const c of CURRENCY_LIST) {
    if (rates[c.code] == null && DEFAULT_RATES[c.code] != null) rates[c.code] = DEFAULT_RATES[c.code]
  }
  return rates
}

/** 金额 → 基准币 */
export function toBase(amount: number, code: string, rates: Record<string, number>, base: string): number {
  if (code === base || !code) return amount
  const r = rates[code]
  if (code === base) return amount
  if (code === 'CNY' && base !== 'CNY') {
    // 由美元折算：amount CNY → amount / r[base] 基准
    return base && rates[base] ? amount / rates[base] : amount
  }
  return r != null ? amount * r : amount
}

/** 金额换算：from → to（经基准币中转） */
export function convertAmount(amount: number, from: string, to: string, rates: Record<string, number>, base: string): number {
  if (from === to) return amount
  const inBase = toBase(amount, from, rates, base)
  if (to === base) return inBase
  const r = rates[to]
  return r && r > 0 ? inBase / r : inBase
}

/** 币种符号 */
export function currencySymbol(code: string, _rates: Record<string, number>, base: string): string {
  const list = CURRENCY_LIST.find(c => c.code === code)
  if (list) return list.symbol
  return (base && code === base ? CURRENCY_LIST.find(c => c.code === base)?.symbol : '') || ''
}

/** 千分位格式化（保留 decimals 位小数） */
export function formatMoney(amount: number, digits = 2): string {
  const neg = amount < 0
  const abs = Math.abs(amount)
  const [i, d] = abs.toFixed(digits).split('.')
  const comma = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${neg ? '-' : ''}${comma}${d ? '.' + d : ''}`
}

/** 带币种符号的展示（amount 为 code 币种金额） */
export function moneyLabel(amount: number, code: string, rates: Record<string, number>, base: string, digits = 2): string {
  const sym = currencySymbol(code, rates, base)
  return `${sym || code + ' '}${formatMoney(amount, digits)}`
}

/** 转为基准币并格式化（用于汇总展示） */
export function moneyInBase(amount: number, code: string, rates: Record<string, number>, base: string, digits = 2): string {
  const inBase = toBase(amount, code, rates, base)
  return moneyLabel(inBase, base, rates, base, digits)
}

// ---- 存储读写 ----

export function useMultiCurrency() {
  const config = ref<CurrencyConfig>(
    storage.getKV<CurrencyConfig>(CONFIG_KEY, { ...DEFAULT_CURRENCY_CONFIG }),
  )
  const rates = ref<Record<string, number>>(normalizeRates(config.value))

  function persist(): void {
    storage.setKV(CONFIG_KEY, config.value)
  }
  function refresh(): void {
    rates.value = normalizeRates(config.value)
  }
  function load(): void {
    config.value = storage.getKV<CurrencyConfig>(CONFIG_KEY, { ...DEFAULT_CURRENCY_CONFIG })
    refresh()
  }

  function setBase(code: string): void {
    if (!code) return
    config.value.base = code
    config.value.updatedAt = new Date().toISOString()
    persist()
    refresh()
  }

  function setRate(code: string, value: number): void {
    if (!code) return
    config.value.rates = { ...(config.value.rates || {}), [code]: value }
    config.value.updatedAt = new Date().toISOString()
    persist()
    refresh()
  }

  function resetRates(): void {
    config.value.rates = { ...DEFAULT_RATES }
    config.value.updatedAt = new Date().toISOString()
    persist()
    refresh()
  }

  return { config, rates, setBase, setRate, resetRates, load, refresh }
}