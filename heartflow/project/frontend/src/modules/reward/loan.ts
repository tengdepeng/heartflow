// ============================================================
// 劳酬 · 借贷/往来管理（INCR-25）
// 借出借入记录 + 还款/收债状态 + 应收应付净额面板。
// 纯函数引擎负责余额/状态/逾期/净额聚合，useLoans 负责存储读写。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'

/** 往来方向：借出（别人欠我） / 借入（我欠别人） */
export type LoanDirection = 'lend' | 'borrow'

/** 单笔还款/收债 */
export interface LoanSettlement {
  id: string
  amount: number
  at: string
  note?: string
}

export interface LoanRecord {
  id: string
  direction: LoanDirection
  /** 往来对象（人 / 机构） */
  counterparty: string
  /** 原始金额 */
  amount: number
  /** 关联账户 id，缺省 'cash' */
  account?: string
  /** 发生日期 yyyy-mm-dd */
  createdAt: string
  /** 应还/应收日 yyyy-mm-dd（可空） */
  dueAt?: string
  note?: string
  settlements: LoanSettlement[]
}

const LOANS_KEY = REWARD_STORAGE_KEYS.LOANS

// ---- 纯函数 ----

/** 未结余额 = 原始金额 − 已结算合计（下限 0） */
export function remaining(l: LoanRecord): number {
  const paid = l.settlements.reduce((s, x) => s + x.amount, 0)
  return Math.max(0, l.amount - paid)
}

export function loanStatus(l: LoanRecord): 'outstanding' | 'settled' {
  return remaining(l) <= 0 ? 'settled' : 'outstanding'
}

/** 逾期天数：未结清且到应还/应收日才可能 >0；已结清为 0 */
export function overdueDays(l: LoanRecord, today: string): number {
  if (loanStatus(l) === 'settled' || !l.dueAt || l.dueAt >= today) return 0
  return Math.max(1, Math.floor((Date.parse(today) - Date.parse(l.dueAt)) / 86400000))
}

export interface LoanNetSummary {
  /** 应收（借出未结） */
  receivable: number
  /** 应付（借入未结） */
  payable: number
  /** 净额 = 应收 − 应付（正=净应收，负=净应付） */
  net: number
  lendCount: number
  borrowCount: number
  outstandingCount: number
  settledCount: number
  overdueLendCount: number
  overdueBorrowCount: number
}

export function netSummary(records: LoanRecord[], today: string): LoanNetSummary {
  let receivable = 0
  let payable = 0
  let lendCount = 0
  let borrowCount = 0
  let outstanding = 0
  let settled = 0
  let overdueLend = 0
  let overdueBorrow = 0
  for (const l of records) {
    const st = loanStatus(l)
    const rem = remaining(l)
    if (st === 'settled') settled++
    else outstanding++
    if (l.direction === 'lend') {
      lendCount++
      receivable += rem
      if (st === 'outstanding' && overdueDays(l, today) > 0) overdueLend++
    } else {
      borrowCount++
      payable += rem
      if (st === 'outstanding' && overdueDays(l, today) > 0) overdueBorrow++
    }
  }
  return {
    receivable,
    payable,
    net: receivable - payable,
    lendCount,
    borrowCount,
    outstandingCount: outstanding,
    settledCount: settled,
    overdueLendCount: overdueLend,
    overdueBorrowCount: overdueBorrow,
  }
}

export const LOAN_DIRECTION_META: Record<LoanDirection, { label: string; icon: string; color: string }> = {
  lend: { label: '借出', icon: '📤', color: '#f0c040' },
  borrow: { label: '借入', icon: '📥', color: '#6b9fc4' },
}

// ---- 存储读写 ----
export function useLoans() {
  const records = ref<LoanRecord[]>(storage.getKV<LoanRecord[]>(LOANS_KEY, []))

  function persist(): void {
    storage.setKV(LOANS_KEY, records.value)
  }
  function load(): void {
    records.value = storage.getKV<LoanRecord[]>(LOANS_KEY, [])
  }

  function create(data: Omit<LoanRecord, 'id' | 'settlements'>): LoanRecord {
    const loan: LoanRecord = {
      ...data,
      id: `ln-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      settlements: [],
    }
    records.value.push(loan)
    persist()
    return loan
  }

  function settle(id: string, amount: number, at: string, note?: string): void {
    const i = records.value.findIndex(l => l.id === id)
    if (i < 0 || amount <= 0) return
    records.value[i].settlements.push({
      id: `st-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      amount,
      at,
      note,
    })
    persist()
  }

  function remove(id: string): void {
    records.value = records.value.filter(l => l.id !== id)
    persist()
  }

  return { records, create, settle, remove, load }
}
