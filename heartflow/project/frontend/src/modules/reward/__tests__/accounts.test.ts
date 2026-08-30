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

import type { RewardRecord } from '../reward-list'
import { useAccounts } from '../accounts'

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r1',
    type: o.type ?? 'expense',
    category: o.category ?? 'tool',
    amount: o.amount ?? 100,
    description: '',
    at: '2026-08-01T00:00:00Z',
    ...o,
  }
}

describe('useAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete store['hf:reward_accounts']
    delete store['hf:reward_transfers']
  })

  it('create 新增账户并持久化，内置类型 id = type', () => {
    const acc = useAccounts()
    acc.create({ name: '支付宝', type: 'alipay', initialBalance: 0, icon: '🏦' })
    expect(acc.accounts.value.length).toBe(1)
    expect(acc.accounts.value[0].id).toBe('alipay')
    expect(mockSetKV).toHaveBeenCalledWith('hf:reward_accounts', acc.accounts.value)
  })

  it('通用账户 id 用名字 slug，撞车时加后缀', () => {
    const acc = useAccounts()
    acc.create({ name: 'My Wallet', type: 'other', initialBalance: 0 })
    acc.create({ name: 'My Wallet!', type: 'other', initialBalance: 0 })
    expect(acc.accounts.value.map(a => a.id)).toEqual(['my-wallet', expect.stringContaining('my-wallet-')])
  })

  it('accountBalance = 初始 + 收入 − 支出（忽略其他账户）', () => {
    const acc = useAccounts()
    acc.create({ name: '现金', type: 'cash', initialBalance: 100 })
    const records = [
      rec({ id: 'a', type: 'income', account: 'cash', amount: 50 }),
      rec({ id: 'b', type: 'expense', account: 'cash', amount: 30 }),
      rec({ id: 'c', type: 'expense', account: 'alipay', amount: 99 }),
    ]
    expect(acc.accountBalance('cash', records)).toBe(120)
  })

  it('转账影响两账户余额', () => {
    const acc = useAccounts()
    acc.create({ name: '现金', type: 'cash', initialBalance: 100 })
    acc.create({ name: '微信', type: 'wechat', initialBalance: 0 })
    acc.createTransfer('cash', 'wechat', 40, '2026-08-02T00:00:00Z')
    expect(acc.accountBalance('cash', [])).toBe(60)
    expect(acc.accountBalance('wechat', [])).toBe(40)
  })

  it('ensure 不存在则自动创建，存在则复用不重复', () => {
    const acc = useAccounts()
    const first = acc.ensure('支付宝', 'alipay')
    const second = acc.ensure('支付宝', 'alipay')
    expect(first.id).toBe(second.id)
    expect(acc.accounts.value.filter(a => a.name === '支付宝').length).toBe(1)
  })

  it('remove 删除账户', () => {
    const acc = useAccounts()
    acc.create({ name: '储蓄', type: 'savings', initialBalance: 0 })
    acc.remove(acc.accounts.value[0].id)
    expect(acc.accounts.value).toHaveLength(0)
  })
})