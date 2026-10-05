// ============================================================
// 劳酬 · 财务目标 + 投资追踪
// 增强功能：
//   1. 财务目标系统（短期/中期/长期目标+进度追踪）
//   2. 投资组合追踪（投资类型+收益率+风险评估）
//   3. 财务健康评分（多维度评估+改进建议）
//   4. 财务时间线（里程碑+预测+回顾）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { RewardRecord, RewardMilestone } from './types'
import { getLocalDateKey } from '../../utils/time'

// ---- 财务目标 ----

/** 目标类型 */
export type FinanceGoalType = 'savings' | 'debt-reduction' | 'investment' | 'income-growth' | 'expense-control'

/** 目标期限 */
export type GoalTerm = 'short' | 'medium' | 'long'

/** 财务目标 */
export interface FinanceGoal {
  id: string
  type: FinanceGoalType
  name: string
  description: string
  /** 目标金额 */
  targetAmount: number
  /** 当前金额 */
  currentAmount: number
  /** 期限 */
  term: GoalTerm
  /** 目标日期 */
  targetDate: string
  /** 创建日期 */
  createdAt: string
  /** 是否完成 */
  achieved: boolean
  /** 完成日期 */
  achievedAt?: string
  /** 优先级 1-10 */
  priority: number
  /** 每月自动存入金额 */
  monthlyContribution: number
}

// ---- 投资追踪 ----

/** 投资类型 */
export type InvestmentType = 'stock' | 'fund' | 'bond' | 'crypto' | 'real-estate' | 'deposit' | 'other'

/** 投资记录 */
export interface InvestmentRecord {
  id: string
  type: InvestmentType
  name: string
  /** 投入本金 */
  principal: number
  /** 当前市值 */
  currentValue: number
  /** 收益率 */
  returnRate: number
  /** 年化收益率 */
  annualizedReturn: number
  /** 风险等级 1-5 */
  riskLevel: number
  /** 购入日期 */
  purchasedAt: string
  /** 最后更新 */
  updatedAt: string
  /** 备注 */
  note?: string
}

// ---- 财务健康评分 ----

/** 评分维度 */
export type HealthDimension = 'savings-rate' | 'debt-ratio' | 'emergency-fund' | 'income-diversity' | 'investment-ratio'

/** 财务健康评分 */
export interface FinanceHealthScore {
  /** 总分 0-100 */
  total: number
  /** 各维度分数 */
  dimensions: Record<HealthDimension, number>
  /** 评级 */
  grade: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  /** 改进建议 */
  suggestions: string[]
  /** 评估时间 */
  assessedAt: string
}

// ---- 财务时间线 ----

/** 财务时间线事件 */
export interface FinanceTimelineEvent {
  id: string
  type: 'milestone' | 'goal-achieved' | 'investment-change' | 'income-change' | 'expense-spike'
  title: string
  description: string
  amount: number
  date: string
  /** 关联里程碑/目标 ID */
  relatedId?: string
}

// ---- 存储键 ----

const FINANCE_STORAGE_KEYS = {
  GOALS: 'hf:reward:finance-goals',
  INVESTMENTS: 'hf:reward:investments',
  HEALTH_SCORES: 'hf:reward:health-scores',
} as const

// ---- 元数据 ----

export const GOAL_TYPE_META: Record<FinanceGoalType, { label: string; icon: string; color: string }> = {
  savings: { label: '储蓄', icon: '🏦', color: '#8a9a7a' },
  'debt-reduction': { label: '减债', icon: '📉', color: '#ef4444' },
  investment: { label: '投资', icon: '📈', color: '#6b9fc4' },
  'income-growth': { label: '增收', icon: '💰', color: '#f0c040' },
  'expense-control': { label: '节流', icon: '✂️', color: '#f59e0b' },
}

export const GOAL_TERM_META: Record<GoalTerm, { label: string; months: number; color: string }> = {
  short: { label: '短期', months: 6, color: '#8a9a7a' },
  medium: { label: '中期', months: 24, color: '#f0c040' },
  long: { label: '长期', months: 60, color: '#6b9fc4' },
}

export const INVESTMENT_TYPE_META: Record<InvestmentType, { label: string; icon: string; color: string; defaultRisk: number }> = {
  stock: { label: '股票', icon: '📊', color: '#ef4444', defaultRisk: 4 },
  fund: { label: '基金', icon: '📦', color: '#6b9fc4', defaultRisk: 3 },
  bond: { label: '债券', icon: '📜', color: '#8a9a7a', defaultRisk: 2 },
  crypto: { label: '加密货币', icon: '₿', color: '#f0c040', defaultRisk: 5 },
  'real-estate': { label: '房产', icon: '🏠', color: '#f59e0b', defaultRisk: 3 },
  deposit: { label: '存款', icon: '💳', color: '#8a9a7a', defaultRisk: 1 },
  other: { label: '其他', icon: '📋', color: '#94a3b8', defaultRisk: 3 },
}

export const HEALTH_GRADE_META: Record<FinanceHealthScore['grade'], { label: string; color: string; range: [number, number] }> = {
  excellent: { label: '优秀', color: '#34d399', range: [85, 100] },
  good: { label: '良好', color: '#6b9fc4', range: [70, 84] },
  fair: { label: '一般', color: '#f0c040', range: [50, 69] },
  poor: { label: '较差', color: '#f59e0b', range: [30, 49] },
  critical: { label: '危险', color: '#ef4444', range: [0, 29] },
}

// ============================================================
// useFinanceGoals — 财务目标管理
// ============================================================

export function useFinanceGoals() {
  const goals = ref<FinanceGoal[]>([])

  /** 加载目标 */
  function loadGoals(): FinanceGoal[] {
    const stored = storage.getKV<FinanceGoal[]>(FINANCE_STORAGE_KEYS.GOALS, [])
    if (stored) goals.value = stored
    return goals.value
  }

  /** 创建目标 */
  function createGoal(
    type: FinanceGoalType,
    name: string,
    description: string,
    targetAmount: number,
    term: GoalTerm,
    priority: number = 5,
    monthlyContribution: number = 0,
  ): FinanceGoal {
    const months = GOAL_TERM_META[term].months
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() + months)

    const goal: FinanceGoal = {
      id: `goal-${Date.now()}`,
      type,
      name,
      description,
      targetAmount,
      currentAmount: 0,
      term,
      targetDate: targetDate.toISOString(),
      createdAt: new Date().toISOString(),
      achieved: false,
      priority,
      monthlyContribution,
    }

    goals.value.push(goal)
    saveGoals()
    return goal
  }

  /** 更新目标进度 */
  function updateGoalProgress(goalId: string, amount: number): boolean {
    const goal = goals.value.find(g => g.id === goalId)
    if (!goal) return false

    goal.currentAmount = Math.min(amount, goal.targetAmount)
    if (goal.currentAmount >= goal.targetAmount && !goal.achieved) {
      goal.achieved = true
      goal.achievedAt = new Date().toISOString()
    }
    saveGoals()
    return true
  }

  /** 添加月度贡献 */
  function addMonthlyContribution(goalId: string): boolean {
    const goal = goals.value.find(g => g.id === goalId)
    if (!goal || goal.monthlyContribution <= 0) return false
    return updateGoalProgress(goalId, goal.currentAmount + goal.monthlyContribution)
  }

  /** 获取目标进度百分比 */
  function getGoalProgress(goal: FinanceGoal): number {
    if (goal.targetAmount <= 0) return 0
    return Math.min(Math.round(goal.currentAmount / goal.targetAmount * 100), 100)
  }

  /** 目标统计 */
  const goalStats = computed(() => {
    const total = goals.value.length
    const achieved = goals.value.filter(g => g.achieved).length
    const totalTarget = goals.value.reduce((s, g) => s + g.targetAmount, 0)
    const totalCurrent = goals.value.reduce((s, g) => s + g.currentAmount, 0)

    return {
      total,
      achieved,
      inProgress: total - achieved,
      totalTarget,
      totalCurrent,
      overallProgress: totalTarget > 0 ? Math.round(totalCurrent / totalTarget * 100) : 0,
      byType: goals.value.reduce((acc, g) => {
        acc[g.type] = (acc[g.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
  })

  /** 保存 */
  function saveGoals(): void {
    storage.setKV(FINANCE_STORAGE_KEYS.GOALS, goals.value)
  }

  return {
    goals,
    goalStats,
    loadGoals,
    createGoal,
    updateGoalProgress,
    addMonthlyContribution,
    getGoalProgress,
    saveGoals,
  }
}

// ============================================================
// useInvestmentTracker — 投资追踪
// ============================================================

export function useInvestmentTracker() {
  const investments = ref<InvestmentRecord[]>([])

  /** 加载投资 */
  function loadInvestments(): InvestmentRecord[] {
    const stored = storage.getKV<InvestmentRecord[]>(FINANCE_STORAGE_KEYS.INVESTMENTS, [])
    if (stored) investments.value = stored
    return investments.value
  }

  /** 添加投资 */
  function addInvestment(
    type: InvestmentType,
    name: string,
    principal: number,
    currentValue: number,
    riskLevel?: number,
    note?: string,
  ): InvestmentRecord {
    const defaultRisk = INVESTMENT_TYPE_META[type].defaultRisk
    const record: InvestmentRecord = {
      id: `inv-${Date.now()}`,
      type,
      name,
      principal,
      currentValue,
      returnRate: principal > 0 ? Math.round((currentValue - principal) / principal * 10000) / 100 : 0,
      annualizedReturn: 0,
      riskLevel: riskLevel ?? defaultRisk,
      purchasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note,
    }

    investments.value.push(record)
    saveInvestments()
    return record
  }

  /** 更新投资市值 */
  function updateInvestmentValue(investmentId: string, newValue: number): boolean {
    const inv = investments.value.find(i => i.id === investmentId)
    if (!inv) return false

    inv.currentValue = newValue
    inv.returnRate = inv.principal > 0
      ? Math.round((newValue - inv.principal) / inv.principal * 10000) / 100
      : 0
    inv.updatedAt = new Date().toISOString()

    // 计算年化收益率
    const daysHeld = Math.max((new Date().getTime() - new Date(inv.purchasedAt).getTime()) / 86400000, 1)
    inv.annualizedReturn = inv.principal > 0
      ? Math.round(((newValue / inv.principal) ** (365 / daysHeld) - 1) * 10000) / 100
      : 0

    saveInvestments()
    return true
  }

  /** 投资组合概览 */
  const portfolioOverview = computed(() => {
    const totalPrincipal = investments.value.reduce((s, i) => s + i.principal, 0)
    const totalValue = investments.value.reduce((s, i) => s + i.currentValue, 0)
    const totalReturn = totalValue - totalPrincipal
    const totalReturnRate = totalPrincipal > 0
      ? Math.round(totalReturn / totalPrincipal * 10000) / 100
      : 0

    const byType = investments.value.reduce((acc, i) => {
      if (!acc[i.type]) acc[i.type] = { principal: 0, value: 0, count: 0 }
      acc[i.type].principal += i.principal
      acc[i.type].value += i.currentValue
      acc[i.type].count++
      return acc
    }, {} as Record<string, { principal: number; value: number; count: number }>)

    const avgRisk = investments.value.length > 0
      ? Math.round(investments.value.reduce((s, i) => s + i.riskLevel, 0) / investments.value.length * 10) / 10
      : 0

    return {
      totalPrincipal,
      totalValue,
      totalReturn,
      totalReturnRate,
      investmentCount: investments.value.length,
      byType,
      avgRisk,
    }
  })

  /** 保存 */
  function saveInvestments(): void {
    storage.setKV(FINANCE_STORAGE_KEYS.INVESTMENTS, investments.value)
  }

  return {
    investments,
    portfolioOverview,
    loadInvestments,
    addInvestment,
    updateInvestmentValue,
    saveInvestments,
  }
}

// ============================================================
// useFinanceHealth — 财务健康评分
// ============================================================

export function useFinanceHealth() {
  const healthScores = ref<FinanceHealthScore[]>([])

  /** 加载评分历史 */
  function loadHealthScores(): FinanceHealthScore[] {
    const stored = storage.getKV<FinanceHealthScore[]>(FINANCE_STORAGE_KEYS.HEALTH_SCORES, [])
    if (stored) healthScores.value = stored
    return healthScores.value
  }

  /** 计算财务健康评分 */
  function calculateHealthScore(
    records: RewardRecord[],
    monthlyIncome: number,
    totalSavings: number,
    totalDebt: number,
    monthlyExpenses: number,
  ): FinanceHealthScore {
    const dimensions: Record<HealthDimension, number> = {
      'savings-rate': 0,
      'debt-ratio': 0,
      'emergency-fund': 0,
      'income-diversity': 0,
      'investment-ratio': 0,
    }

    // 储蓄率评分 (目标 > 30%)
    if (monthlyIncome > 0) {
      const savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome
      dimensions['savings-rate'] = Math.min(Math.round(savingsRate * 100 / 0.3 * 25), 25)
    }

    // 负债率评分 (目标 < 30%)
    if (monthlyIncome > 0 && totalDebt > 0) {
      const debtRatio = totalDebt / (monthlyIncome * 12)
      dimensions['debt-ratio'] = Math.max(0, Math.round((1 - debtRatio / 0.3) * 25))
    } else if (totalDebt === 0) {
      dimensions['debt-ratio'] = 25
    }

    // 应急基金评分 (目标 3-6 个月支出)
    if (monthlyExpenses > 0) {
      const monthsCovered = totalSavings / monthlyExpenses
      dimensions['emergency-fund'] = Math.min(Math.round(monthsCovered / 6 * 25), 25)
    }

    // 收入多样性评分
    const incomeSources = new Set(
      records.filter(r => r.type === 'income').map(r => r.category)
    ).size
    dimensions['income-diversity'] = Math.min(incomeSources * 5, 25)

    // 投资比例评分
    const investmentIncome = records
      .filter(r => r.type === 'income' && r.category === 'investment')
      .reduce((s, r) => s + r.amount, 0)
    if (monthlyIncome > 0) {
      const investmentRatio = investmentIncome / monthlyIncome
      dimensions['investment-ratio'] = Math.min(Math.round(investmentRatio / 0.2 * 25), 25)
    }

    const total = Object.values(dimensions).reduce((s, v) => s + v, 0)

    let grade: FinanceHealthScore['grade']
    if (total >= 85) grade = 'excellent'
    else if (total >= 70) grade = 'good'
    else if (total >= 50) grade = 'fair'
    else if (total >= 30) grade = 'poor'
    else grade = 'critical'

    // 生成建议
    const suggestions: string[] = []
    if (dimensions['savings-rate'] < 15) suggestions.push('建议将储蓄率提升至 30% 以上')
    if (dimensions['debt-ratio'] < 15) suggestions.push('负债率偏高，建议优先偿还高息债务')
    if (dimensions['emergency-fund'] < 15) suggestions.push('建议建立 3-6 个月的应急基金')
    if (dimensions['income-diversity'] < 15) suggestions.push('建议拓展收入来源，增加收入多样性')
    if (dimensions['investment-ratio'] < 10) suggestions.push('建议将收入的 20% 用于投资，实现财富增值')

    const score: FinanceHealthScore = {
      total,
      dimensions,
      grade,
      suggestions,
      assessedAt: new Date().toISOString(),
    }

    healthScores.value.push(score)
    saveScores()
    return score
  }

  /** 获取最新评分 */
  const latestScore = computed(() => {
    if (healthScores.value.length === 0) return null
    return healthScores.value[healthScores.value.length - 1]
  })

  /** 评分趋势 */
  const scoreTrend = computed(() => {
    return healthScores.value.slice(-12).map(s => ({
      date: getLocalDateKey(new Date(s.assessedAt)),
      total: s.total,
      grade: s.grade,
    }))
  })

  /** 保存 */
  function saveScores(): void {
    storage.setKV(FINANCE_STORAGE_KEYS.HEALTH_SCORES, healthScores.value)
  }

  return {
    healthScores,
    latestScore,
    scoreTrend,
    loadHealthScores,
    calculateHealthScore,
    saveScores,
  }
}

// ============================================================
// useFinanceTimeline — 财务时间线
// ============================================================

export function useFinanceTimeline() {
  const timeline = ref<FinanceTimelineEvent[]>([])

  /** 从记录和里程碑生成时间线 */
  function buildTimeline(
    records: RewardRecord[],
    milestones: RewardMilestone[],
    goals: FinanceGoal[],
  ): FinanceTimelineEvent[] {
    const events: FinanceTimelineEvent[] = []

    // 里程碑事件
    for (const ms of milestones) {
      if (ms.achieved && ms.achievedAt) {
        events.push({
          id: `tl-ms-${ms.id}`,
          type: 'milestone',
          title: ms.title,
          description: `${ms.description}已达成！${ms.reward}`,
          amount: 0,
          date: ms.achievedAt,
          relatedId: ms.id,
        })
      }
    }

    // 目标达成事件
    for (const goal of goals) {
      if (goal.achieved && goal.achievedAt) {
        events.push({
          id: `tl-goal-${goal.id}`,
          type: 'goal-achieved',
          title: `目标达成：${goal.name}`,
          description: `完成 ${GOAL_TYPE_META[goal.type].label} 目标，金额 ¥${goal.targetAmount.toLocaleString()}`,
          amount: goal.targetAmount,
          date: goal.achievedAt,
          relatedId: goal.id,
        })
      }
    }

    // 收入变化事件
    const incomeRecords = records
      .filter(r => r.type === 'income')
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())

    if (incomeRecords.length > 0) {
      const latest = incomeRecords[0]
      events.push({
        id: `tl-inc-${latest.id}`,
        type: 'income-change',
        title: '最新收入',
        description: latest.description,
        amount: latest.amount,
        date: latest.recordedAt,
        relatedId: latest.id,
      })
    }

    // 按时间排序
    timeline.value = events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return timeline.value
  }

  return {
    timeline,
    buildTimeline,
  }
}