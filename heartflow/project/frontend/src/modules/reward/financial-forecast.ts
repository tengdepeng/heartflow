// ============================================================
// 劳酬 · 财务预测引擎（P20-2）
// 收入预测、支出预测、趋势分析、财务健康评分
// ============================================================

import { ref } from 'vue'
import type { RewardRecord, RewardStats } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 预测数据点 */
export interface ForecastPoint {
  /** 月份 */
  month: string
  /** 预测收入 */
  predictedIncome: number
  /** 预测支出 */
  predictedExpense: number
  /** 预测净收入 */
  predictedNet: number
  /** 置信区间下限 */
  lowerBound: number
  /** 置信区间上限 */
  upperBound: number
  /** 置信度 */
  confidence: number
}

/** 财务预测 */
export interface FinancialForecast {
  /** 预测周期 */
  period: { start: string; end: string }
  /** 预测数据点 */
  dataPoints: ForecastPoint[]
  /** 预测总净收入 */
  totalPredictedNet: number
  /** 平均月收入预测 */
  avgMonthlyIncome: number
  /** 平均月支出预测 */
  avgMonthlyExpense: number
  /** 收入趋势 */
  incomeTrend: 'rising' | 'falling' | 'stable'
  /** 支出趋势 */
  expenseTrend: 'rising' | 'falling' | 'stable'
  /** 预测置信度 */
  overallConfidence: number
  /** 生成时间 */
  generatedAt: string
}

/** 财务健康评分 */
export interface FinanceHealthCheck {
  /** 综合评分 0-100 */
  overallScore: number
  /** 储蓄率评分 */
  savingsRateScore: number
  /** 收入稳定性评分 */
  incomeStabilityScore: number
  /** 支出可控性评分 */
  expenseControlScore: number
  /** 增长潜力评分 */
  growthPotentialScore: number
  /** 各维度详情 */
  details: HealthCheckDetail[]
  /** 健康等级 */
  grade: 'excellent' | 'good' | 'fair' | 'poor'
  /** 关键发现 */
  findings: string[]
  /** 改进建议 */
  recommendations: string[]
}

/** 健康检查详情 */
export interface HealthCheckDetail {
  /** 维度 */
  dimension: string
  /** 得分 */
  score: number
  /** 权重 */
  weight: number
  /** 分析 */
  analysis: string
  /** 状态 */
  status: 'good' | 'warning' | 'danger'
}

/** 收入来源分析 */
export interface IncomeSourceAnalysis {
  /** 来源类型 */
  category: string
  /** 标签 */
  label: string
  /** 总收入 */
  totalAmount: number
  /** 占比 */
  percentage: number
  /** 稳定性 0-1 */
  stability: number
  /** 趋势 */
  trend: 'rising' | 'falling' | 'stable'
  /** 月均值 */
  monthlyAverage: number
  /** 标准差 */
  stdDev: number
}

// ============================================================
// useFinancialForecast Composable
// ============================================================

export function useFinancialForecast() {
  // ---- 状态 ----
  const forecast = ref<FinancialForecast | null>(null)
  const healthCheck = ref<FinanceHealthCheck | null>(null)
  const incomeAnalysis = ref<IncomeSourceAnalysis[]>([])

  // ============================================================
  // 财务预测
  // ============================================================

  /**
   * 预测未来财务状况
   */
  function predictFinances(
    records: RewardRecord[],
    monthsAhead: number = 3,
  ): FinancialForecast {
    // 按月份聚合历史数据
    const monthlyData = aggregateMonthlyData(records)

    // 线性回归预测
    const incomeSlope = calculateSlope(monthlyData.map(d => d.income))
    const expenseSlope = calculateSlope(monthlyData.map(d => d.expense))
    const incomeIntercept = calculateIntercept(monthlyData.map(d => d.income))
    const expenseIntercept = calculateIntercept(monthlyData.map(d => d.expense))

    // 计算波动性
    const incomeVolatility = calculateVolatility(monthlyData.map(d => d.income))
    const expenseVolatility = calculateVolatility(monthlyData.map(d => d.expense))

    const dataPoints: ForecastPoint[] = []
    const n = monthlyData.length

    for (let i = 0; i < monthsAhead; i++) {
      const futureMonth = getFutureMonth(i + 1)
      const x = n + i

      const predictedIncome = Math.max(0, Math.round(incomeSlope * x + incomeIntercept))
      const predictedExpense = Math.max(0, Math.round(expenseSlope * x + expenseIntercept))
      const predictedNet = predictedIncome - predictedExpense

      // 置信区间
      const confidence = Math.max(0.3, 1 - (i * 0.15))
      const incomeMargin = Math.round(incomeVolatility * 1.96)
      const expenseMargin = Math.round(expenseVolatility * 1.96)

      dataPoints.push({
        month: futureMonth,
        predictedIncome,
        predictedExpense,
        predictedNet,
        lowerBound: predictedNet - incomeMargin - expenseMargin,
        upperBound: predictedNet + incomeMargin + expenseMargin,
        confidence: Math.round(confidence * 100) / 100,
      })
    }

    const totalPredictedNet = dataPoints.reduce((s, d) => s + d.predictedNet, 0)
    const avgIncome = Math.round(dataPoints.reduce((s, d) => s + d.predictedIncome, 0) / monthsAhead)
    const avgExpense = Math.round(dataPoints.reduce((s, d) => s + d.predictedExpense, 0) / monthsAhead)

    const result: FinancialForecast = {
      period: {
        start: getFutureMonth(1),
        end: getFutureMonth(monthsAhead),
      },
      dataPoints,
      totalPredictedNet,
      avgMonthlyIncome: avgIncome,
      avgMonthlyExpense: avgExpense,
      incomeTrend: incomeSlope > 50 ? 'rising' : incomeSlope < -50 ? 'falling' : 'stable',
      expenseTrend: expenseSlope > 50 ? 'rising' : expenseSlope < -50 ? 'falling' : 'stable',
      overallConfidence: Math.round((1 - Math.min(monthsAhead * 0.1, 0.5)) * 100) / 100,
      generatedAt: new Date().toISOString(),
    }

    forecast.value = result
    return result
  }

  // ============================================================
  // 财务健康检查
  // ============================================================

  /**
   * 执行财务健康检查
   */
  function checkFinanceHealth(
    records: RewardRecord[],
    stats: RewardStats,
  ): FinanceHealthCheck {
    const details: HealthCheckDetail[] = []

    // 1. 储蓄率评分
    const savingsRate = stats.totalIncome > 0
      ? (stats.totalIncome - stats.totalExpense) / stats.totalIncome
      : 0
    const savingsRateScore = Math.min(100, Math.round(savingsRate * 200))
    details.push({
      dimension: '储蓄率',
      score: savingsRateScore,
      weight: 0.3,
      analysis: `当前储蓄率 ${Math.round(savingsRate * 100)}%，${savingsRate > 0.3 ? '表现优秀' : savingsRate > 0.1 ? '表现一般' : '需要改善'}`,
      status: savingsRate > 0.3 ? 'good' : savingsRate > 0.1 ? 'warning' : 'danger',
    })

    // 2. 收入稳定性评分
    const incomeStabilityScore = calculateIncomeStability(records)
    details.push({
      dimension: '收入稳定性',
      score: incomeStabilityScore,
      weight: 0.25,
      analysis: incomeStabilityScore > 70 ? '收入来源稳定' : incomeStabilityScore > 40 ? '收入有一定波动' : '收入不稳定，需要关注',
      status: incomeStabilityScore > 70 ? 'good' : incomeStabilityScore > 40 ? 'warning' : 'danger',
    })

    // 3. 支出可控性评分
    const expenseControlScore = calculateExpenseControl(records)
    details.push({
      dimension: '支出可控性',
      score: expenseControlScore,
      weight: 0.25,
      analysis: expenseControlScore > 70 ? '支出控制良好' : expenseControlScore > 40 ? '部分支出需要关注' : '支出失控，需要立即调整',
      status: expenseControlScore > 70 ? 'good' : expenseControlScore > 40 ? 'warning' : 'danger',
    })

    // 4. 增长潜力评分
    const growthPotentialScore = calculateGrowthPotential(records)
    details.push({
      dimension: '增长潜力',
      score: growthPotentialScore,
      weight: 0.2,
      analysis: growthPotentialScore > 70 ? '增长趋势良好' : growthPotentialScore > 40 ? '增长平缓' : '增长乏力',
      status: growthPotentialScore > 70 ? 'good' : growthPotentialScore > 40 ? 'warning' : 'danger',
    })

    // 综合评分
    const overallScore = Math.round(
      details.reduce((s, d) => s + d.score * d.weight, 0),
    )

    let grade: FinanceHealthCheck['grade']
    if (overallScore >= 80) grade = 'excellent'
    else if (overallScore >= 60) grade = 'good'
    else if (overallScore >= 40) grade = 'fair'
    else grade = 'poor'

    const findings = generateFindings(details, savingsRate)
    const recommendations = generateRecommendations(details)

    const result: FinanceHealthCheck = {
      overallScore,
      savingsRateScore,
      incomeStabilityScore,
      expenseControlScore,
      growthPotentialScore,
      details,
      grade,
      findings,
      recommendations,
    }

    healthCheck.value = result
    return result
  }

  // ============================================================
  // 收入来源分析
  // ============================================================

  /**
   * 分析收入来源
   */
  function analyzeIncomeSources(records: RewardRecord[]): IncomeSourceAnalysis[] {
    const incomeRecords = records.filter(r => r.type === 'income')
    const categoryMap = new Map<string, RewardRecord[]>()

    for (const r of incomeRecords) {
      const list = categoryMap.get(r.category) ?? []
      list.push(r)
      categoryMap.set(r.category, list)
    }

    const totalIncome = incomeRecords.reduce((s, r) => s + r.amount, 0)
    const results: IncomeSourceAnalysis[] = []

    for (const [category, catRecords] of categoryMap) {
      const total = catRecords.reduce((s, r) => s + r.amount, 0)
      const months = new Set(catRecords.map(r => r.recordedAt.slice(0, 7))).size
      const monthlyAvg = months > 0 ? total / months : 0

      // 稳定性：基于月度金额的标准差
      const monthlyAmounts = calculateMonthlyAmounts(catRecords)
      const values = Object.values(monthlyAmounts)
      const avg = values.reduce((s, v) => s + v, 0) / (values.length || 1)
      const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length || 1)
      const stdDev = Math.sqrt(variance)
      const stability = avg > 0 ? Math.max(0, 1 - stdDev / avg) : 0

      // 趋势
      const recentValues = values.slice(-3)
      let trend: IncomeSourceAnalysis['trend'] = 'stable'
      if (recentValues.length >= 2) {
        const diff = recentValues[recentValues.length - 1] - recentValues[0]
        if (diff > avg * 0.1) trend = 'rising'
        else if (diff < -avg * 0.1) trend = 'falling'
      }

      results.push({
        category,
        label: getCategoryLabel(category),
        totalAmount: total,
        percentage: totalIncome > 0 ? Math.round(total / totalIncome * 100) : 0,
        stability: Math.round(stability * 100) / 100,
        trend,
        monthlyAverage: Math.round(monthlyAvg),
        stdDev: Math.round(stdDev),
      })
    }

    results.sort((a, b) => b.totalAmount - a.totalAmount)
    incomeAnalysis.value = results
    return results
  }

  return {
    forecast,
    healthCheck,
    incomeAnalysis,
    predictFinances,
    checkFinanceHealth,
    analyzeIncomeSources,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function aggregateMonthlyData(records: RewardRecord[]): { month: string; income: number; expense: number }[] {
  const map = new Map<string, { income: number; expense: number }>()

  for (const r of records) {
    const month = r.recordedAt.slice(0, 7)
    const entry = map.get(month) ?? { income: 0, expense: 0 }
    if (r.type === 'income') entry.income += r.amount
    else entry.expense += r.amount
    map.set(month, entry)
  }

  return [...map.entries()]
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const xSum = (n - 1) * n / 2
  const ySum = values.reduce((s, v) => s + v, 0)
  const xySum = values.reduce((s, v, i) => s + v * i, 0)
  const xSqSum = Array.from({ length: n }, (_, i) => i * i).reduce((s, v) => s + v, 0)

  const denominator = n * xSqSum - xSum * xSum
  if (denominator === 0) return 0
  return (n * xySum - xSum * ySum) / denominator
}

function calculateIntercept(values: number[]): number {
  if (values.length < 2) return values[0] ?? 0
  const n = values.length
  const slope = calculateSlope(values)
  const xSum = (n - 1) * n / 2
  const ySum = values.reduce((s, v) => s + v, 0)
  return (ySum - slope * xSum) / n
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0
  const avg = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function getFutureMonth(monthsAhead: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsAhead)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function calculateIncomeStability(records: RewardRecord[]): number {
  const incomeRecords = records.filter(r => r.type === 'income')
  if (incomeRecords.length < 3) return 50

  const monthlyAmounts = calculateMonthlyAmounts(incomeRecords)
  const values = Object.values(monthlyAmounts)
  if (values.length < 2) return 50

  const avg = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 1

  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)))
}

function calculateExpenseControl(records: RewardRecord[]): number {
  const expenseRecords = records.filter(r => r.type === 'expense')
  if (expenseRecords.length < 5) return 60

  const monthlyAmounts = calculateMonthlyAmounts(expenseRecords)
  const values = Object.values(monthlyAmounts)
  if (values.length < 2) return 60

  // 检查支出是否在增长
  const slope = calculateSlope(values)
  const avg = values.reduce((s, v) => s + v, 0) / values.length

  let score = 70
  if (avg > 0 && slope / avg > 0.1) score -= 25 // 支出增长过快
  else if (avg > 0 && slope / avg < -0.05) score += 15 // 支出在下降

  // 波动性
  const cv = avg > 0 ? calculateVolatility(values) / avg : 1
  score -= Math.round(cv * 20)

  return Math.max(0, Math.min(100, score))
}

function calculateGrowthPotential(records: RewardRecord[]): number {
  const incomeRecords = records.filter(r => r.type === 'income')
  if (incomeRecords.length < 3) return 50

  const monthlyAmounts = calculateMonthlyAmounts(incomeRecords)
  const values = Object.values(monthlyAmounts)
  if (values.length < 2) return 50

  const slope = calculateSlope(values)
  const avg = values.reduce((s, v) => s + v, 0) / values.length

  if (avg <= 0) return 30

  const growthRate = slope / avg
  let score = 50 + Math.round(growthRate * 200)
  return Math.max(0, Math.min(100, score))
}

function calculateMonthlyAmounts(records: RewardRecord[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const r of records) {
    const month = r.recordedAt.slice(0, 7)
    map[month] = (map[month] ?? 0) + r.amount
  }
  return map
}

function generateFindings(details: HealthCheckDetail[], savingsRate: number): string[] {
  const findings: string[] = []

  const dangerItems = details.filter(d => d.status === 'danger')
  const warningItems = details.filter(d => d.status === 'warning')

  if (dangerItems.length > 0) {
    findings.push(`${dangerItems.map(d => d.dimension).join('、')} 需要立即关注`)
  }
  if (warningItems.length > 0) {
    findings.push(`${warningItems.map(d => d.dimension).join('、')} 有改善空间`)
  }
  if (savingsRate > 0.3) {
    findings.push('储蓄率健康，继续保持')
  }

  return findings
}

function generateRecommendations(details: HealthCheckDetail[]): string[] {
  const recommendations: string[] = []

  for (const detail of details) {
    if (detail.status === 'danger') {
      switch (detail.dimension) {
        case '储蓄率':
          recommendations.push('设定每月储蓄目标，从收入的10%开始')
          break
        case '收入稳定性':
          recommendations.push('探索多元化收入来源，降低单一收入依赖')
          break
        case '支出可控性':
          recommendations.push('建立预算制度，使用记账工具追踪每笔支出')
          break
        case '增长潜力':
          recommendations.push('投资自我提升，学习新技能增加收入潜力')
          break
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('财务状况良好，继续保持当前理财习惯')
  }

  return recommendations
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    salary: '工资', freelance: '自由职业', investment: '投资',
    gift: '赠予', 'other-income': '其他收入',
    tools: '工具', learning: '学习', health: '健康',
    social: '社交', 'other-expense': '其他支出',
  }
  return labels[category] ?? category
}