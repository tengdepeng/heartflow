// ============================================================
// 劳酬 · 视图桥接层（P20-2）
// 为 Reward.vue 提供标准化模块接口，替代直接 storage 调用
// ============================================================

import { ref, computed } from 'vue'
import { useRewardMilestones } from './milestones'
import { useFinanceGoals, useFinanceHealth, useFinanceTimeline } from './finance-goals'
import { useFinanceFilter, usePeriodicAnalysis, useChartData } from './finance-analysis'
import { useBudgetOptimizer } from './budget-optimizer'
import { useFinancialForecast } from './financial-forecast'
import type { RewardRecord, RewardType, IncomeCategory, ExpenseCategory, RewardMilestone, Budget, RewardStats } from './types'
import { INCOME_CATEGORY_META, EXPENSE_CATEGORY_META, REWARD_STORAGE_KEYS } from './types'
import type { BudgetOptimizationReport, OverspendAlert, SavingsStrategy } from './budget-optimizer'
import type { FinancialForecast, FinanceHealthCheck, IncomeSourceAnalysis } from './financial-forecast'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 桥接层返回的完整状态 */
export interface RewardBridgeState {
  /** 记录列表 */
  records: RewardRecord[]
  /** 统计 */
  stats: RewardStats
  /** 里程碑 */
  milestones: RewardMilestone[]
  /** 预算优化报告 */
  budgetReport: BudgetOptimizationReport | null
  /** 财务预测 */
  forecast: FinancialForecast | null
  /** 财务健康检查 */
  healthCheck: FinanceHealthCheck | null
  /** 收入来源分析 */
  incomeAnalysis: IncomeSourceAnalysis[]
  /** 超支预警 */
  overspendAlerts: OverspendAlert[]
}

/** 快捷统计 */
export interface RewardQuickStats {
  /** 本月收入 */
  monthlyIncome: number
  /** 本月支出 */
  monthlyExpense: number
  /** 本月净收入 */
  monthlyNet: number
  /** 储蓄率 */
  savingsRate: number
  /** 已达成里程碑数 */
  achievedMilestones: number
  /** 总里程碑数 */
  totalMilestones: number
  /** 最近记录 */
  recentRecords: RewardRecord[]
}

// ============================================================
// useRewardBridge Composable
// ============================================================

export function useRewardBridge() {
  // ---- 子模块 ----
  const milestones = useRewardMilestones()
  const financeGoals = useFinanceGoals()
  const financeHealth = useFinanceHealth()
  const financeTimeline = useFinanceTimeline()

  // 需要 getRecords 参数的模块，传入 milestones.records 的 getter
  const getRecords = () => milestones.records.value
  const financeFilter = useFinanceFilter(getRecords)
  const periodicAnalysis = usePeriodicAnalysis(getRecords)
  const chartData = useChartData(getRecords)

  const budgetOptimizer = useBudgetOptimizer()
  const forecast = useFinancialForecast()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 初始化 ----

  function initialize(existingRecords?: RewardRecord[]): void {
    if (existingRecords && existingRecords.length > 0) {
      refreshAll(existingRecords)
    }
  }

  function refreshAll(records: RewardRecord[]): void {
    // 更新里程碑（checkMilestones 内部使用 milestones.records.value，无需传参）
    milestones.checkMilestones()

    // 预算优化
    const stats = computeStats(records)
    const budgets = milestones.budgets?.value ?? []
    const totalBudget = budgets.reduce((s: number, b: Budget) => s + b.monthlyLimit, 0)
    budgetOptimizer.generateReport(records, stats, budgets, totalBudget || stats.totalIncome * 0.7)

    // 财务预测
    if (records.length >= 5) {
      forecast.predictFinances(records)
      forecast.checkFinanceHealth(records, stats)
      forecast.analyzeIncomeSources(records)
    }
  }

  // ============================================================
  // 记录操作
  // ============================================================

  function addRecord(params: {
    type: RewardType
    category: IncomeCategory | ExpenseCategory
    amount: number
    description: string
    projectId?: string
    worklogId?: string
  }): RewardRecord {
    const record: RewardRecord = {
      id: `rw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: params.type,
      category: params.category,
      amount: params.amount,
      description: params.description,
      recordedAt: new Date().toISOString(),
      projectId: params.projectId,
      worklogId: params.worklogId,
    }
    return record
  }

  // ============================================================
  // 快捷统计
  // ============================================================

  function computeStats(records: RewardRecord[]): RewardStats {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const monthIncome = records
      .filter(r => r.type === 'income' && r.recordedAt.startsWith(currentMonth))
      .reduce((s, r) => s + r.amount, 0)
    const monthExpense = records
      .filter(r => r.type === 'expense' && r.recordedAt.startsWith(currentMonth))
      .reduce((s, r) => s + r.amount, 0)

    const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

    // 收入分布
    const incomeDistribution: Record<string, number> = {}
    for (const r of records.filter(r => r.type === 'income')) {
      incomeDistribution[r.category] = (incomeDistribution[r.category] || 0) + r.amount
    }

    // 支出分布
    const expenseDistribution: Record<string, number> = {}
    for (const r of records.filter(r => r.type === 'expense')) {
      expenseDistribution[r.category] = (expenseDistribution[r.category] || 0) + r.amount
    }

    // 月度趋势（最近12个月）
    const monthlyTrend: { month: string; income: number; expense: number; balance: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = getLocalMonthKey(d)
      const mi = records.filter(r => r.type === 'income' && getLocalMonthKey(r.recordedAt) === m).reduce((s, r) => s + r.amount, 0)
      const me = records.filter(r => r.type === 'expense' && getLocalMonthKey(r.recordedAt) === m).reduce((s, r) => s + r.amount, 0)
      monthlyTrend.push({ month: m, income: mi, expense: me, balance: mi - me })
    }

    const allDates = records.map(r => getLocalDateKey(new Date(r.recordedAt)))
    const uniqueDays = new Set(allDates).size

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      recordCount: records.length,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      savingsRate: monthIncome > 0 ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100) : 0,
      incomeDistribution,
      expenseDistribution,
      monthlyTrend,
      career: {
        totalIncome,
        totalExpense,
        totalBalance: totalIncome - totalExpense,
        workingDays: uniqueDays,
        avgDailyIncome: uniqueDays > 0 ? Math.round(totalIncome / uniqueDays) : 0,
        incomeExpenseRatio: totalExpense > 0 ? Math.round((totalIncome / totalExpense) * 100) / 100 : 0,
      },
    }
  }

  const quickStats = computed<RewardQuickStats>(() => {
    const stats = computeStats(milestones.records?.value ?? [])
    const achievedMilestones = milestones.milestones?.value?.filter((m: RewardMilestone) => m.achieved).length ?? 0
    const totalMilestones = milestones.milestones?.value?.length ?? 0

    return {
      monthlyIncome: stats.monthIncome,
      monthlyExpense: stats.monthExpense,
      monthlyNet: stats.monthIncome - stats.monthExpense,
      savingsRate: stats.savingsRate,
      achievedMilestones,
      totalMilestones,
      recentRecords: (milestones.records?.value ?? []).slice(-10).reverse(),
    }
  })

  // ============================================================
  // 完整状态
  // ============================================================

  const bridgeState = computed<RewardBridgeState>(() => {
    const records = milestones.records?.value ?? []
    const stats = computeStats(records)

    return {
      records,
      stats,
      milestones: milestones.milestones?.value ?? [],
      budgetReport: budgetOptimizer.report.value,
      forecast: forecast.forecast.value,
      healthCheck: forecast.healthCheck.value,
      incomeAnalysis: forecast.incomeAnalysis.value,
      overspendAlerts: budgetOptimizer.alerts.value,
    }
  })

  return {
    // 状态
    isLoading,
    quickStats,
    bridgeState,

    // 记录操作
    addRecord,

    // 子模块
    milestones,
    financeGoals,
    financeHealth,
    financeTimeline,
    financeFilter,
    periodicAnalysis,
    chartData,
    budgetOptimizer,
    forecast,

    // 生命周期
    initialize,
    refreshAll,
  }
}

// ============================================================
// 导出常量
// ============================================================

export { INCOME_CATEGORY_META, EXPENSE_CATEGORY_META, REWARD_STORAGE_KEYS }
export type { RewardRecord, RewardType, IncomeCategory, ExpenseCategory, RewardMilestone, Budget, RewardStats }
export type { BudgetOptimizationReport, OverspendAlert, SavingsStrategy }
export type { FinancialForecast, FinanceHealthCheck, IncomeSourceAnalysis }