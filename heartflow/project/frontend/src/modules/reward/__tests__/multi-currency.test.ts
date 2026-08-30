// ============================================================
// 多币种/汇率引擎测试（INCR-31）
// 覆盖汇率归一/换算/格式化/存储读写
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
  normalizeRates,
  toBase,
  convertAmount,
  currencySymbol,
  formatMoney,
  moneyLabel,
  moneyInBase,
  useMultiCurrency,
  CURRENCY_LIST,
  DEFAULT_RATES,
} from '../multi-currency'

// 基准 CNY，USD=7.2
describe('汇率语义与换算', () => {
  it('匿名速率自基准构造：USD=7.2 → 1美元=7.2人民币', () => {
    const rates: Record<string, number> = { CNY: 1, USD: 7.2 }
    expect(toBase(10, 'USD', rates, 'CNY')).toBe(72)
    expect(toBase(100, 'CNY', rates, 'CNY')).toBe(100)
  })

  it('convertAmount 经基准中转（USD→EUR）', () => {
    const rates: Record<string, number> = { CNY: 1, USD: 7.2, EUR: 7.8 }
    // 10 USD = 72 CNY = 72/7.8 EUR ≈ 9.2307
    const v = convertAmount(10, 'USD', 'EUR', rates, 'CNY')
    expect(Math.abs(v - 10 * 7.2 / 7.8) < 0.0001).toBe(true)
  })

  it('同币种原样返回', () => {
    const rates: Record<string, number> = { CNY: 1, USD: 7.2 }
    expect(convertAmount(50, 'USD', 'USD', rates, 'CNY')).toBe(50)
  })
})

describe('格式化', () => {
  it('formatMoney 千分位', () => {
    expect(formatMoney(1234567.5)).toBe('1,234,567.50')
    expect(formatMoney(-88)).toBe('-88.00')
  })

  it('currencySymbol 取符号，缺省回退基准', () => {
    const rates: Record<string, number> = { CNY: 1, USD: 7.2 }
    expect(currencySymbol('USD', rates, 'CNY')).toBe('$')
    expect(currencySymbol('CNY', rates, 'CNY')).toBe('¥')
  })

  it('moneyLabel 带符号', () => {
    const rates: Record<string, number> = { CNY: 1, USD: 7.2 }
    expect(moneyLabel(72, 'USD', rates, 'CNY')).toBe('$72.00')
    expect(moneyInBase(10, 'USD', rates, 'CNY')).toBe('¥72.00')
  })
})

describe('normalizeRates', () => {
  it('保证基准=1 并补齐缺省', () => {
    const rates = normalizeRates({ base: 'CNY', rates: { USD: 7, CNY: 1 }, updatedAt: '' })
    expect(rates.CNY).toBe(1)
    expect(rates.USD).toBe(7)
    expect(rates.JPY).toBe(DEFAULT_RATES.JPY)
  })
})

describe('useMultiCurrency 存储', () => {
  it('默认基准 CNY 且含完整清单', () => {
    const mc = useMultiCurrency()
    expect(mc.config.value.base).toBe('CNY')
    expect(CURRENCY_LIST.length).toBeGreaterThanOrEqual(10)
  })

  it('setBase 持久化基准', () => {
    const mc = useMultiCurrency()
    mc.setBase('USD')
    expect(mc.config.value.base).toBe('USD')
    expect((store['hf:reward_currency_config'] as { base: string }).base).toBe('USD')
    // 基准=USD 时 rates.USD 归一为 1
    expect(mc.rates.value.USD).toBe(1)
    mc.setBase('CNY')
  })

  it('setRate / resetRates', () => {
    const mc = useMultiCurrency()
    mc.setRate('USD', 7.5)
    expect(mc.rates.value.USD).toBe(7.5)
    mc.resetRates()
    expect(mc.rates.value.USD).toBe(DEFAULT_RATES.USD)
  })
})