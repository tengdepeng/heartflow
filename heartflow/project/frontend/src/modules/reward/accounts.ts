// ============================================================
// 劳酬 · 多账户与转账数据层
// records 仍由 reward-list/视图持有；本模块只管理账户清单与转账 ledger，
// 提供余额计算、账户 CRUD、转账、ensure 式导入自动建户。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'
import type { RewardRecord } from './reward-list'

export type AccountType = 'cash' | 'bank' | 'savings' | 'alipay' | 'wechat' | 'other'

export interface Account {
  id: string
  name: string
  type: AccountType
  icon?: string
  initialBalance: number
  note?: string
}

export interface Transfer {
  id: string
  from: string
  to: string
  amount: number
  at: string
  note?: string
}

export interface AccountSummary {
  account: Account
  balance: number
}

export const DEFAULT_ACCOUNT_ID = 'cash'

/** 内置账户：id 直接采用其类型值，便于导入/转账以 type 作为归属 id */
const BUILTIN_ID: Partial<Record<AccountType, string>> = {
  cash: 'cash',
  bank: 'bank',
  savings: 'savings',
  alipay: 'alipay',
  wechat: 'wechat',
}

const ACCOUNTS_KEY = REWARD_STORAGE_KEYS.ACCOUNTS
const TRANSFERS_KEY = REWARD_STORAGE_KEYS.TRANSFERS

function slug(name: string): string {
  return name.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-') || 'account'
}

export function useAccounts() {
  const accounts = ref<Account[]>(storage.getKV<Account[]>(ACCOUNTS_KEY, []))
  const transfers = ref<Transfer[]>(storage.getKV<Transfer[]>(TRANSFERS_KEY, []))

  function persistAccounts(): void {
    storage.setKV(ACCOUNTS_KEY, accounts.value)
  }
  function persistTransfers(): void {
    storage.setKV(TRANSFERS_KEY, transfers.value)
  }

  /** 计算不与其他账户撞车且稳定的 id：内置账户用类型值，其余用名字 slug */
  function uniqueId(data: Omit<Account, 'id'>): string {
    const base = BUILTIN_ID[data.type] ?? slug(data.name)
    if (!accounts.value.some(a => a.id === base)) return base
    return `${base}-${Math.floor(Math.random() * 1e4)}`
  }

  function create(data: Omit<Account, 'id'>): Account {
    const acc: Account = { ...data, id: uniqueId(data) }
    accounts.value.push(acc)
    persistAccounts()
    return acc
  }

  function update(id: string, patch: Partial<Account>): void {
    const i = accounts.value.findIndex(a => a.id === id)
    if (i >= 0) {
      accounts.value[i] = { ...accounts.value[i], ...patch }
      persistAccounts()
    }
  }

  function remove(id: string): void {
    accounts.value = accounts.value.filter(a => a.id !== id)
    persistAccounts()
  }

  function createTransfer(from: string, to: string, amount: number, at: string, note?: string): void {
    if (from === to || amount <= 0) return
    transfers.value.push({ id: `t${Date.now()}`, from, to, amount, at, note })
    persistTransfers()
  }

  /** 账户余额 = 初始 + Σ收入 − Σ支出 + (转入 − 转出)。records 由调用方(视图)传入避免双实例 */
  function accountBalance(id: string, records: RewardRecord[]): number {
    const acc = accounts.value.find(a => a.id === id)
    if (!acc) return 0
    let b = acc.initialBalance
    for (const r of records) {
      if ((r.account ?? DEFAULT_ACCOUNT_ID) !== id) continue
      b += r.type === 'income' ? r.amount : -r.amount
    }
    for (const t of transfers.value) {
      if (t.from === id) b -= t.amount
      if (t.to === id) b += t.amount
    }
    return b
  }

  /** 若存在返回既有账户，否则自动创建（供导入落户） */
  function ensure(name: string, type: AccountType): Account {
    const existing = accounts.value.find(a => a.name === name)
    if (existing) return existing
    return create({ name, type, initialBalance: 0 })
  }

  /** 从存储重读账户与转账（供其它面板同步本模块其它实例最新写入） */
  function load(): void {
    accounts.value = storage.getKV<Account[]>(ACCOUNTS_KEY, [])
    transfers.value = storage.getKV<Transfer[]>(TRANSFERS_KEY, [])
  }

  return {
    accounts,
    transfers,
    create,
    update,
    remove,
    createTransfer,
    accountBalance,
    ensure,
    load,
  }
}