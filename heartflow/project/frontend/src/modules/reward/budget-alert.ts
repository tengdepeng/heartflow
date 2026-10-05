// ============================================================
// 预算预警引擎：类别支出聚合、预算进度判定、月流出双口径
// 消费 props 传入的 records / transfers 实时计算，避免双实例缓存失步
// ============================================================
import type { RewardRecord } from './reward-list'
import type { Budget } from './types'
import type { Transfer } from './accounts'
import { getLocalMonthKey } from '../../utils/time'

export type OutflowMode = 'expense' | 'withTransfer'
export type BudgetStatus = 'ok' | 'warn' | 'over'

export interface BudgetProgress {
  spent: number
  limit: number
  ratio: number
  status: BudgetStatus
}

/** 某月的类别级支出聚合（只统计支出，忽略收入/越月） */
export function categorizeExpense(records: RewardRecord[], month: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of records) {
    if (r.type !== 'expense') continue
    if (getLocalMonthKey(r.at) !== month) continue
    out[r.category] = (out[r.category] ?? 0) + r.amount
  }
  return out
}

/** 预算进度：spent / ratio / 状态（>=100% 超支，>=80% 接近，否则达标） */
export function computeBudgetProgress(budget: Budget, categorySpent: Record<string, number>): BudgetProgress {
  const spent = categorySpent[budget.category] ?? 0
  const ratio = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0
  const status: BudgetStatus = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'
  return { spent, limit: budget.monthlyLimit, ratio, status }
}

export interface MonthOutflow {
  /** 该月纯支出（records.expense） */
  expense: number
  /** 该月账户间转出总额（转账是闭合动作，全量计入「对外流动」） */
  turnedOver: number
  /** 实际口径总值 */
  total: number
}

/**
 * 月流出双口径：
 * - expense        仅统计支出
 * - withTransfer   支出 + 当月账户转出总额（把转出视为账本对外移动，纳入预算考量）
 */
export function monthOutflow(
  records: RewardRecord[],
  transfers: Transfer[],
  month: string,
  mode: OutflowMode,
): MonthOutflow {
  let expense = 0
  for (const r of records) {
    if (r.type === 'expense' && getLocalMonthKey(r.at) === month) expense += r.amount
  }
  let turnedOver = 0
  for (const t of transfers) {
    if (getLocalMonthKey(t.at) !== month) continue
    turnedOver += t.amount
  }
  const total = mode === 'withTransfer' ? expense + turnedOver : expense
  return { expense, turnedOver, total }
}

/** 过滤出与给定月份匹配的预算 */
export function budgetsForMonth(budgets: Budget[], month: string): Budget[] {
  return budgets.filter(b => b.month === month)
}