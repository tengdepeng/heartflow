// ============================================================
// 劳酬 · 里程碑系统 + 预算管理
// 成就追踪 + 自动检测 + 预算预警
// ============================================================

import { storage } from '@/engine/storage'
import type {
  RewardRecord, RewardMilestone, Budget, RewardStats,
  IncomeCategory, ExpenseCategory, RewardType,
} from './types'
import {
  REWARD_STORAGE_KEYS, DEFAULT_MILESTONES,
  EXPENSE_CATEGORY_META,
} from './types'

/**
 * 劳酬里程碑引擎
 */
export function useRewardMilestones() {
  const records = ref<RewardRecord[]>([])
  const milestones = ref<RewardMilestone[]>([])
  const budgets = ref<Budget[]>([])

  async function load(): Promise<void> {
    const [savedRecords, savedMilestones, savedBudgets] = await Promise.all([
      storage.getKV<RewardRecord[]>(REWARD_STORAGE_KEYS.RECORDS, []),
      storage.getKV<RewardMilestone[]>(REWARD_STORAGE_KEYS.MILESTONES, []),
      storage.getKV<Budget[]>(REWARD_STORAGE_KEYS.BUDGETS, []),
    ])
    records.value = savedRecords
    milestones.value = savedMilestones.length > 0 ? savedMilestones : [...DEFAULT_MILESTONES]
    budgets.value = savedBudgets
  }

  /**
   * 添加收支记录
   */
  async function addRecord(
    type: RewardType,
    category: IncomeCategory | ExpenseCategory,
    amount: number,
    description: string,
    projectId?: string,
    worklogId?: string
  ): Promise<RewardRecord> {
    const record: RewardRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      category,
      amount,
      description,
      recordedAt: new Date().toISOString(),
      projectId,
      worklogId,
    }
    records.value.unshift(record)

    // 更新预算
    if (type === 'expense') {
      updateBudget(category as ExpenseCategory, amount)
    }

    // 检查里程碑
    await checkMilestones()

    await persistRecords()
    return record
  }

  /**
   * 更新预算使用量
   */
  function updateBudget(category: ExpenseCategory, amount: number): void {
    const month = new Date().toISOString().slice(0, 7)
    const budget = budgets.value.find((b) => b.category === category && b.month === month)
    if (budget) {
      budget.currentSpent += amount
    }
  }

  /**
   * 设置预算
   */
  async function setBudget(category: ExpenseCategory, monthlyLimit: number): Promise<Budget> {
    const month = new Date().toISOString().slice(0, 7)
    const existing = budgets.value.find((b) => b.category === category && b.month === month)

    if (existing) {
      existing.monthlyLimit = monthlyLimit
      await persistBudgets()
      return existing
    }

    const budget: Budget = {
      id: Date.now().toString(36),
      category,
      monthlyLimit,
      currentSpent: 0,
      month,
    }
    budgets.value.push(budget)
    await persistBudgets()
    return budget
  }

  /**
   * 获取预算预警
   */
  function getBudgetAlerts(): { category: ExpenseCategory; label: string; spent: number; limit: number; percentage: number; level: 'safe' | 'warning' | 'danger' }[] {
    const month = new Date().toISOString().slice(0, 7)
    const alerts: { category: ExpenseCategory; label: string; spent: number; limit: number; percentage: number; level: 'safe' | 'warning' | 'danger' }[] = []

    for (const budget of budgets.value) {
      if (budget.month !== month) continue
      if (budget.monthlyLimit <= 0) continue

      const percentage = Math.round((budget.currentSpent / budget.monthlyLimit) * 100)
      const level: 'safe' | 'warning' | 'danger' =
        percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'safe'

      alerts.push({
        category: budget.category,
        label: EXPENSE_CATEGORY_META[budget.category].label,
        spent: budget.currentSpent,
        limit: budget.monthlyLimit,
        percentage,
        level,
      })
    }

    return alerts.sort((a, b) => b.percentage - a.percentage)
  }

  /**
   * 检查并更新里程碑
   */
  async function checkMilestones(): Promise<RewardMilestone[]> {
    const newlyAchieved: RewardMilestone[] = []
    const today = new Date().toISOString().slice(0, 7)

    for (const milestone of milestones.value) {
      if (milestone.achieved) continue

      let currentValue = 0
      switch (milestone.triggerType) {
        case 'income-total': {
          currentValue = records.value
            .filter((r) => r.type === 'income')
            .reduce((sum, r) => sum + r.amount, 0)
          break
        }
        case 'income-single': {
          currentValue = Math.max(
            ...records.value
              .filter((r) => r.type === 'income')
              .map((r) => r.amount),
            0
          )
          break
        }
        case 'savings-rate': {
          const monthIncome = records.value
            .filter((r) => r.type === 'income' && r.recordedAt.startsWith(today))
            .reduce((sum, r) => sum + r.amount, 0)
          const monthExpense = records.value
            .filter((r) => r.type === 'expense' && r.recordedAt.startsWith(today))
            .reduce((sum, r) => sum + r.amount, 0)
          currentValue = monthIncome > 0
            ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
            : 0
          break
        }
        case 'streak': {
          // 计算连续有收入的月份数
          const months = new Set<string>()
          for (const r of records.value) {
            if (r.type === 'income') {
              months.add(r.recordedAt.slice(0, 7))
            }
          }
          const sortedMonths = Array.from(months).sort().reverse()
          currentValue = 1
          for (let i = 1; i < sortedMonths.length; i++) {
            const prev = new Date(sortedMonths[i - 1] + '-01')
            const curr = new Date(sortedMonths[i] + '-01')
            const diffMonths = (prev.getFullYear() - curr.getFullYear()) * 12 + (prev.getMonth() - curr.getMonth())
            if (diffMonths === 1) {
              currentValue++
            } else {
              break
            }
          }
          break
        }
        case 'project-count': {
          const categories = new Set(
            records.value
              .filter((r) => r.type === 'income')
              .map((r) => r.category)
          )
          currentValue = categories.size
          break
        }
      }

      if (currentValue >= milestone.threshold) {
        milestone.achieved = true
        milestone.achievedAt = new Date().toISOString()
        newlyAchieved.push(milestone)
      }
    }

    if (newlyAchieved.length > 0) {
      await persistMilestones()
    }

    return newlyAchieved
  }

  /**
   * 获取统计
   */
  function getStats(): RewardStats {
    const now = new Date()
    const monthPrefix = now.toISOString().slice(0, 7)

    const totalIncome = records.value
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
    const totalExpense = records.value
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)

    const monthIncome = records.value
      .filter((r) => r.type === 'income' && r.recordedAt.startsWith(monthPrefix))
      .reduce((sum, r) => sum + r.amount, 0)
    const monthExpense = records.value
      .filter((r) => r.type === 'expense' && r.recordedAt.startsWith(monthPrefix))
      .reduce((sum, r) => sum + r.amount, 0)

    // 收入分布
    const incomeDistribution: Record<string, number> = {}
    for (const r of records.value.filter((r) => r.type === 'income')) {
      incomeDistribution[r.category] = (incomeDistribution[r.category] || 0) + r.amount
    }

    // 支出分布
    const expenseDistribution: Record<string, number> = {}
    for (const r of records.value.filter((r) => r.type === 'expense')) {
      expenseDistribution[r.category] = (expenseDistribution[r.category] || 0) + r.amount
    }

    // 月度趋势（最近12个月）
    const monthlyTrend: { month: string; income: number; expense: number; balance: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.toISOString().slice(0, 7)
      const mi = records.value
        .filter((r) => r.type === 'income' && r.recordedAt.startsWith(m))
        .reduce((sum, r) => sum + r.amount, 0)
      const me = records.value
        .filter((r) => r.type === 'expense' && r.recordedAt.startsWith(m))
        .reduce((sum, r) => sum + r.amount, 0)
      monthlyTrend.push({ month: m, income: mi, expense: me, balance: mi - me })
    }

    // 生涯统计
    const allDates = records.value.map((r) => r.recordedAt.slice(0, 10))
    const uniqueDays = new Set(allDates).size

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      recordCount: records.value.length,
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

  /**
   * 删除记录
   */
  async function removeRecord(id: string): Promise<void> {
    records.value = records.value.filter((r) => r.id !== id)
    await persistRecords()
  }

  async function persistRecords(): Promise<void> {
    await storage.setKV(REWARD_STORAGE_KEYS.RECORDS, records.value)
  }
  async function persistMilestones(): Promise<void> {
    await storage.setKV(REWARD_STORAGE_KEYS.MILESTONES, milestones.value)
  }
  async function persistBudgets(): Promise<void> {
    await storage.setKV(REWARD_STORAGE_KEYS.BUDGETS, budgets.value)
  }

  load()

  return {
    records,
    milestones,
    budgets,
    addRecord,
    setBudget,
    getBudgetAlerts,
    getStats,
    checkMilestones,
    removeRecord,
    load,
  }
}

import { ref } from 'vue'