// ============================================================
// 预算进阶引擎（INCR-28）：总/年度预算 + 日均动态 + 滚动结余 rollover
// 在既有分类预算(budget-alert)之上，提供整体预算口径视角
// 全纯函数：由 records / transfers / config 实时计算，不落中间态
// ============================================================
import type { RewardRecord } from './reward-list'
import type { Transfer } from './accounts'
import { monthOutflow } from './budget-alert'
import type { OutflowMode, BudgetStatus } from './budget-alert'
import { REWARD_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

export interface AdvanceBudgetConfig {
  /** 本月总预算（未含结转） */
  monthlyLimit: number
  /** 年度总预算 */
  annualLimit: number
  /** 是否启用「未用结余滚动到下月」 */
  rollover: boolean
}

export interface MonthBudgetAdvance {
  /** 本月总可用额度 = 月度预算 + 上月结转 */
  limit: number
  /** 固定月度预算 */
  baseLimit: number
  /** 上月未用结转额 */
  rolledIn: number
  /** 本月已支出（按口径） */
  spent: number
  /** 剩余可用 = limit − spent */
  remaining: number
  /** spent / limit */
  ratio: number
  status: BudgetStatus
  /** 本月至今日已过天数 */
  daysElapsed: number
  /** 本月至今日剩余天数 */
  daysRemaining: number
  /** 剩余日均可用额度 = remaining / 剩余天数 */
  dailyAvailable: number
  /** 本月累计日均支出 = spent / 已过天数 */
  dailySpentSoFar: number
}

export interface YearBudgetAdvance {
  /** 年度总预算 */
  limit: number
  /** 年初至今支出 */
  spent: number
  /** 年度剩余 = limit − spent */
  remaining: number
  /** spent / limit */
  ratio: number
  status: BudgetStatus
  /** 年度预算月均 = limit / 12 */
  monthlyAvg: number
}

export const DEFAULT_ADVANCE_CONFIG: AdvanceBudgetConfig = {
  monthlyLimit: 0,
  annualLimit: 0,
  rollover: false,
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 某月总流出（复用 budget-alert.monthOutflow，转账口径可选） */
export function monthOutflowTotal(
  records: RewardRecord[],
  transfers: Transfer[],
  month: string,
  mode: OutflowMode,
): number {
  return monthOutflow(records, transfers, month, mode).total
}

/** 返回给定月的前一个月 key（YYYY-MM，跨年回绕正确） */
export function prevMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/** 某月天数（month 为 YYYY-MM 或 YYYY-M） */
export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/**
 * 上月未用结转额：开启结转时 = max(0, 月度预算 − 上月支出)，
 * 否则恒为 0。以固定 monthlyLimit 为上期预算基线。
 */
export function prevMonthRollover(
  records: RewardRecord[],
  transfers: Transfer[],
  month: string,
  config: Pick<AdvanceBudgetConfig, 'monthlyLimit' | 'rollover'>,
  mode: OutflowMode,
): number {
  if (!config.rollover || config.monthlyLimit <= 0) return 0
  const prevSpent = monthOutflowTotal(records, transfers, prevMonthKey(month), mode)
  return Math.max(0, config.monthlyLimit - prevSpent)
}

/** 本月预算进阶：总额度含结转、剩余、日均可用与日均支出 */
export function monthBudgetAdvance(
  records: RewardRecord[],
  transfers: Transfer[],
  month: string,
  today: string,
  config: AdvanceBudgetConfig,
  mode: OutflowMode,
): MonthBudgetAdvance {
  const totalDays = daysInMonth(month)
  const todayD = Math.min(Math.max(1, Number(today.slice(8, 10))), totalDays)
  const baseLimit = config.monthlyLimit
  const rolledIn = prevMonthRollover(records, transfers, month, config, mode)
  const limit = baseLimit + rolledIn
  const spent = monthOutflowTotal(records, transfers, month, mode)
  const remaining = limit - spent
  const ratio = limit > 0 ? spent / limit : 0
  const status: BudgetStatus = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'
  const daysElapsed = todayD
  const daysRemaining = Math.max(0, totalDays - todayD)
  const dailyAvailable = Math.max(0, remaining) / Math.max(1, daysRemaining)
  const dailySpentSoFar = daysElapsed > 0 ? spent / daysElapsed : 0
  return { limit, baseLimit, rolledIn, spent, remaining, ratio, status, daysElapsed, daysRemaining, dailyAvailable, dailySpentSoFar }
}

/** 某年支出（口径同 monthOutflow：expense 或含转账） */
export function annualSpent(
  records: RewardRecord[],
  transfers: Transfer[],
  year: string,
  mode: OutflowMode,
): number {
  let spent = 0
  for (const r of records) {
    if (r.type === 'expense' && r.at.slice(0, 4) === year) spent += r.amount
  }
  if (mode === 'withTransfer') {
    for (const t of transfers) {
      if (t.at.slice(0, 4) === year) spent += t.amount
    }
  }
  return spent
}

/** 年度预算进阶：年初至今进度 + 月均可用 */
export function yearBudgetAdvance(
  records: RewardRecord[],
  transfers: Transfer[],
  year: string,
  config: AdvanceBudgetConfig,
  mode: OutflowMode,
): YearBudgetAdvance {
  const limit = config.annualLimit
  const spent = annualSpent(records, transfers, year, mode)
  const remaining = Math.max(0, limit - spent)
  const ratio = limit > 0 ? spent / limit : 0
  const status: BudgetStatus = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'
  return { limit, spent, remaining, ratio, status, monthlyAvg: limit / 12 }
}

/** 预算进阶配置存储钩子：读/写 hf:reward_budget_advance */
export function useBudgetAdvance() {
  const KEY = REWARD_STORAGE_KEYS.BUDGET_ADVANCE
  function load(): AdvanceBudgetConfig {
    const raw = storage.getKV<Partial<AdvanceBudgetConfig>>(KEY, {})
    return {
      monthlyLimit: Number(raw.monthlyLimit) || 0,
      annualLimit: Number(raw.annualLimit) || 0,
      rollover: Boolean(raw.rollover),
    }
  }
  function save(config: AdvanceBudgetConfig): void {
    storage.setKV(KEY, config)
  }
  return { load, save }
}