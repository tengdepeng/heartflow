// ============================================================
// 劳酬 · 预算优化引擎（P20-2）
// 智能预算分配、超支预警、储蓄建议、预算模板
// ============================================================

import { ref } from 'vue'
import type { RewardRecord, ExpenseCategory, Budget, RewardStats } from './types'
import { EXPENSE_CATEGORY_META } from './types'
import { categoryLabelAny } from './custom-category'

// ============================================================
// 类型定义
// ============================================================

/** 预算分配建议 */
export interface BudgetAllocation {
  /** 类别 */
  category: ExpenseCategory
  /** 标签 */
  label: string
  /** 建议月度预算 */
  suggestedAmount: number
  /** 占比 */
  percentage: number
  /** 上月实际支出 */
  lastMonthSpent: number
  /** 调整建议 */
  adjustment: 'increase' | 'decrease' | 'maintain'
  /** 调整金额 */
  adjustmentAmount: number
  /** 调整原因 */
  reason: string
}

/** 超支预警 */
export interface OverspendAlert {
  /** 预警 ID */
  id: string
  /** 类别（INCR-23：可为内置键或用户自定义分类键） */
  category: string
  /** 标签 */
  label: string
  /** 预算 */
  budget: number
  /** 已支出 */
  spent: number
  /** 使用率 */
  usageRate: number
  /** 严重级别 */
  severity: 'info' | 'warning' | 'critical'
  /** 预计月底支出 */
  projectedEndOfMonth: number
  /** 建议 */
  suggestion: string
  /** 是否已确认 */
  acknowledged: boolean
}

/** 储蓄策略 */
export interface SavingsStrategy {
  /** 策略 ID */
  id: string
  /** 策略名称 */
  name: string
  /** 描述 */
  description: string
  /** 建议储蓄率 */
  suggestedRate: number
  /** 当前储蓄率 */
  currentRate: number
  /** 每月可节省金额 */
  monthlySavable: number
  /** 年度预计储蓄 */
  annualProjection: number
  /** 具体步骤 */
  steps: SavingsStep[]
  /** 难度 */
  difficulty: 'easy' | 'moderate' | 'challenging'
}

/** 储蓄步骤 */
export interface SavingsStep {
  /** 类别 */
  category: ExpenseCategory
  /** 当前支出 */
  currentSpending: number
  /** 目标支出 */
  targetSpending: number
  /** 可节省金额 */
  savingAmount: number
  /** 具体措施 */
  actions: string[]
}

/** 预算模板 */
export interface BudgetTemplate {
  /** 模板 ID */
  id: string
  /** 模板名称 */
  name: string
  /** 描述 */
  description: string
  /** 适用人群 */
  targetAudience: string
  /** 预算分配 */
  allocations: { category: ExpenseCategory; percentage: number; label: string }[]
  /** 月收入基准 */
  incomeBracket: { min: number; max: number }
}

/** 预算优化报告 */
export interface BudgetOptimizationReport {
  /** 报告 ID */
  id: string
  /** 生成时间 */
  generatedAt: string
  /** 总预算 */
  totalBudget: number
  /** 总支出 */
  totalSpent: number
  /** 预算执行率 */
  executionRate: number
  /** 预算分配建议 */
  allocations: BudgetAllocation[]
  /** 超支预警 */
  alerts: OverspendAlert[]
  /** 储蓄策略 */
  savingsStrategy: SavingsStrategy
  /** 综合评分 0-100 */
  overallScore: number
  /** 总结 */
  summary: string
}

// ============================================================
// 常量
// ============================================================

/** 预算模板库 */
const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'template-50-30-20',
    name: '50/30/20 法则',
    description: '经典预算分配：50% 必需品、30% 个人消费、20% 储蓄',
    targetAudience: '通用',
    allocations: [
      { category: 'tools', percentage: 15, label: '工具' },
      { category: 'learning', percentage: 15, label: '学习' },
      { category: 'health', percentage: 15, label: '健康' },
      { category: 'social', percentage: 15, label: '社交' },
      { category: 'other-expense', percentage: 20, label: '其他' },
    ],
    incomeBracket: { min: 0, max: Infinity },
  },
  {
    id: 'template-frugal',
    name: '极简预算',
    description: '严格控制支出，最大化储蓄率',
    targetAudience: '储蓄目标人群',
    allocations: [
      { category: 'tools', percentage: 10, label: '工具' },
      { category: 'learning', percentage: 15, label: '学习' },
      { category: 'health', percentage: 10, label: '健康' },
      { category: 'social', percentage: 5, label: '社交' },
      { category: 'other-expense', percentage: 10, label: '其他' },
    ],
    incomeBracket: { min: 0, max: Infinity },
  },
  {
    id: 'template-growth',
    name: '成长型预算',
    description: '优先投资学习和工具，助力个人成长',
    targetAudience: '自由职业者/创业者',
    allocations: [
      { category: 'tools', percentage: 25, label: '工具' },
      { category: 'learning', percentage: 25, label: '学习' },
      { category: 'health', percentage: 15, label: '健康' },
      { category: 'social', percentage: 10, label: '社交' },
      { category: 'other-expense', percentage: 15, label: '其他' },
    ],
    incomeBracket: { min: 0, max: Infinity },
  },
  {
    id: 'template-balanced',
    name: '均衡预算',
    description: '各分类均衡分配，保持生活各方面平衡',
    targetAudience: '稳定收入人群',
    allocations: [
      { category: 'tools', percentage: 18, label: '工具' },
      { category: 'learning', percentage: 18, label: '学习' },
      { category: 'health', percentage: 18, label: '健康' },
      { category: 'social', percentage: 18, label: '社交' },
      { category: 'other-expense', percentage: 18, label: '其他' },
    ],
    incomeBracket: { min: 0, max: Infinity },
  },
]

// ============================================================
// useBudgetOptimizer Composable
// ============================================================

export function useBudgetOptimizer() {
  // ---- 状态 ----
  const alerts = ref<OverspendAlert[]>([])
  const report = ref<BudgetOptimizationReport | null>(null)
  const acknowledgedAlerts = ref<Set<string>>(new Set())

  // ============================================================
  // 预算分配建议
  // ============================================================

  /**
   * 计算预算分配建议
   */
  function calculateAllocations(
    records: RewardRecord[],
    totalBudget: number,
    templateId?: string,
  ): BudgetAllocation[] {
    const expenses = records.filter(r => r.type === 'expense')
    const template = templateId
      ? BUDGET_TEMPLATES.find(t => t.id === templateId)
      : BUDGET_TEMPLATES[0]

    // 上月实际支出
    const now = new Date()
    const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
    const lastMonthExpenses = expenses.filter(r => r.recordedAt.startsWith(lastMonth))

    const categories: ExpenseCategory[] = ['tools', 'learning', 'health', 'social', 'other-expense']
    const allocations: BudgetAllocation[] = []

    for (const cat of categories) {
      const meta = EXPENSE_CATEGORY_META[cat]
      const templateAlloc = template?.allocations.find(a => a.category === cat)
      const suggestedPercentage = templateAlloc?.percentage ?? 20
      const suggestedAmount = Math.round(totalBudget * suggestedPercentage / 100)

      const lastMonthSpent = lastMonthExpenses
        .filter(r => r.category === cat)
        .reduce((s, r) => s + r.amount, 0)

      let adjustment: BudgetAllocation['adjustment'] = 'maintain'
      let adjustmentAmount = 0
      let reason = '预算合理'

      if (lastMonthSpent > suggestedAmount * 1.2) {
        adjustment = 'increase'
        adjustmentAmount = Math.round(lastMonthSpent - suggestedAmount)
        reason = `上月支出超出预算 ${Math.round((lastMonthSpent / suggestedAmount - 1) * 100)}%`
      } else if (lastMonthSpent < suggestedAmount * 0.5 && lastMonthSpent > 0) {
        adjustment = 'decrease'
        adjustmentAmount = Math.round(suggestedAmount - lastMonthSpent)
        reason = `上月支出低于预算 ${Math.round((1 - lastMonthSpent / suggestedAmount) * 100)}%，可适当调减`
      }

      allocations.push({
        category: cat,
        label: meta.label,
        suggestedAmount,
        percentage: suggestedPercentage,
        lastMonthSpent,
        adjustment,
        adjustmentAmount,
        reason,
      })
    }

    return allocations
  }

  // ============================================================
  // 超支预警
  // ============================================================

  /**
   * 检测超支情况
   */
  function detectOverspends(
    records: RewardRecord[],
    budgets: Budget[],
  ): OverspendAlert[] {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const monthProgress = dayOfMonth / daysInMonth

    const currentMonthExpenses = records.filter(
      r => r.type === 'expense' && r.recordedAt.startsWith(currentMonth),
    )

    const newAlerts: OverspendAlert[] = []

    for (const budget of budgets) {
      const categoryExpenses = currentMonthExpenses.filter(r => r.category === budget.category)
      const spent = categoryExpenses.reduce((s, r) => s + r.amount, 0)
      const usageRate = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0

      // 预计月底支出
      const dailyAvg = monthProgress > 0 ? spent / dayOfMonth : 0
      const projectedEndOfMonth = Math.round(spent + dailyAvg * (daysInMonth - dayOfMonth))

      let severity: OverspendAlert['severity'] = 'info'
      let suggestion = ''

      if (usageRate > monthProgress * 1.5) {
        severity = 'critical'
        suggestion = `严重超支！建议立即停止 ${categoryLabelAny(budget.category)} 类支出`
      } else if (usageRate > monthProgress * 1.2) {
        severity = 'warning'
        suggestion = `支出进度超前，建议控制 ${categoryLabelAny(budget.category)} 类支出`
      } else if (usageRate > monthProgress) {
        severity = 'info'
        suggestion = '支出进度略快，保持关注'
      } else {
        continue // 未超支，不生成预警
      }

      newAlerts.push({
        id: `alert_${budget.category}_${Date.now()}`,
        category: budget.category,
        label: categoryLabelAny(budget.category),
        budget: budget.monthlyLimit,
        spent,
        usageRate: Math.round(usageRate * 100) / 100,
        severity,
        projectedEndOfMonth,
        suggestion,
        acknowledged: acknowledgedAlerts.value.has(budget.category),
      })
    }

    alerts.value = newAlerts
    return newAlerts
  }

  // ============================================================
  // 储蓄策略
  // ============================================================

  /**
   * 生成储蓄策略
   */
  function generateSavingsStrategy(
    records: RewardRecord[],
    stats: RewardStats,
  ): SavingsStrategy {
    const currentRate = stats.totalIncome > 0
      ? (stats.totalIncome - stats.totalExpense) / stats.totalIncome
      : 0

    const recentExpenses = records
      .filter(r => r.type === 'expense')
      .slice(-90)

    const steps: SavingsStep[] = []
    const categories: ExpenseCategory[] = ['tools', 'learning', 'health', 'social', 'other-expense']

    for (const cat of categories) {
      const catExpenses = recentExpenses.filter(r => r.category === cat)
      const currentSpending = catExpenses.reduce((s, r) => s + r.amount, 0) / 3 // 月均
      const targetSpending = Math.round(currentSpending * 0.85) // 目标减少15%

      const actions = generateSavingActions(cat, currentSpending)

      steps.push({
        category: cat,
        currentSpending: Math.round(currentSpending),
        targetSpending,
        savingAmount: Math.round(currentSpending - targetSpending),
        actions,
      })
    }

    const monthlySavable = steps.reduce((s, step) => s + step.savingAmount, 0)
    const suggestedRate = Math.min(0.5, currentRate + 0.1)

    let difficulty: SavingsStrategy['difficulty'] = 'easy'
    if (currentRate < 0.1) difficulty = 'challenging'
    else if (currentRate < 0.2) difficulty = 'moderate'

    return {
      id: `strategy_${Date.now()}`,
      name: currentRate < 0.1 ? '储蓄起步计划' : currentRate < 0.3 ? '储蓄加速计划' : '储蓄优化计划',
      description: generateStrategyDescription(currentRate, monthlySavable),
      suggestedRate: Math.round(suggestedRate * 100) / 100,
      currentRate: Math.round(currentRate * 100) / 100,
      monthlySavable,
      annualProjection: monthlySavable * 12,
      steps,
      difficulty,
    }
  }

  // ============================================================
  // 预算优化报告
  // ============================================================

  /**
   * 生成预算优化报告
   */
  function generateReport(
    records: RewardRecord[],
    stats: RewardStats,
    budgets: Budget[],
    totalBudget: number,
  ): BudgetOptimizationReport {
    const allocations = calculateAllocations(records, totalBudget)
    const overspendAlerts = detectOverspends(records, budgets)
    const savingsStrategy = generateSavingsStrategy(records, stats)

    const totalSpent = allocations.reduce((s, a) => s + a.lastMonthSpent, 0)
    const executionRate = totalBudget > 0 ? totalSpent / totalBudget : 0

    // 综合评分
    let overallScore = 70
    if (executionRate <= 0.9 && executionRate >= 0.7) overallScore += 15
    else if (executionRate > 0.9) overallScore -= 15
    if (overspendAlerts.length === 0) overallScore += 10
    else if (overspendAlerts.filter(a => a.severity === 'critical').length > 0) overallScore -= 20
    if (savingsStrategy.currentRate > 0.3) overallScore += 5

    const summary = generateReportSummary(executionRate, overspendAlerts, savingsStrategy)

    const optimizationReport: BudgetOptimizationReport = {
      id: `opt_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      totalBudget,
      totalSpent,
      executionRate: Math.round(executionRate * 100) / 100,
      allocations,
      alerts: overspendAlerts,
      savingsStrategy,
      overallScore: Math.max(0, Math.min(100, overallScore)),
      summary,
    }

    report.value = optimizationReport
    return optimizationReport
  }

  // ============================================================
  // 预算模板
  // ============================================================

  function getBudgetTemplates(): BudgetTemplate[] {
    return BUDGET_TEMPLATES
  }

  function getBudgetTemplateById(id: string): BudgetTemplate | undefined {
    return BUDGET_TEMPLATES.find(t => t.id === id)
  }

  return {
    alerts,
    report,
    calculateAllocations,
    detectOverspends,
    generateSavingsStrategy,
    generateReport,
    getBudgetTemplates,
    getBudgetTemplateById,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function generateSavingActions(category: ExpenseCategory, _currentSpending: number): string[] {
  switch (category) {
    case 'tools':
      return ['审查订阅服务，取消不常用的工具', '寻找免费或开源替代品', '考虑年度订阅替代月度订阅']
    case 'learning':
      return ['利用免费学习资源（公开课、图书馆）', '制定学习计划避免冲动购课', '参加学习小组分摊成本']
    case 'health':
      return ['选择户外运动替代健身房', '自己做饭替代外卖', '利用社区免费健康活动']
    case 'social':
      return ['选择低成本社交方式（野餐、徒步）', '轮流做东减少单次支出', '利用优惠活动提前规划']
    case 'other-expense':
      return ['记录每笔支出培养意识', '设置24小时冷静期避免冲动消费', '每月底复盘支出明细']
    default:
      return ['审查支出明细', '寻找节省空间']
  }
}

function generateStrategyDescription(currentRate: number, monthlySavable: number): string {
  if (currentRate < 0.1) {
    return `当前储蓄率偏低（${Math.round(currentRate * 100)}%），建议从每月可节省的 ${monthlySavable} 元开始，逐步建立储蓄习惯`
  }
  if (currentRate < 0.3) {
    return `当前储蓄率 ${Math.round(currentRate * 100)}%，通过优化每月可多存 ${monthlySavable} 元，年度可增加 ${monthlySavable * 12} 元储蓄`
  }
  return `储蓄率良好（${Math.round(currentRate * 100)}%），持续优化可每月多存 ${monthlySavable} 元`
}

function generateReportSummary(
  executionRate: number,
  alerts: OverspendAlert[],
  strategy: SavingsStrategy,
): string {
  const parts: string[] = []

  if (executionRate <= 0.9) {
    parts.push('预算执行良好，支出控制在预算范围内')
  } else if (executionRate <= 1.1) {
    parts.push('预算执行基本正常，部分类别略有超支')
  } else {
    parts.push('预算超支，建议重新审视各类别支出')
  }

  if (alerts.length === 0) {
    parts.push('暂无超支预警')
  } else {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length
    if (criticalCount > 0) {
      parts.push(`${criticalCount} 个类别严重超支，需立即处理`)
    }
  }

  parts.push(`每月可节省 ${strategy.monthlySavable} 元，年度预计 ${strategy.annualProjection} 元`)

  return parts.join('。')
}