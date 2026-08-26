// ============================================================
// 自律工坊 · 习惯预测引擎（P18-2）
// 完成率预测、中断预警、趋势预测、健康度评分、干预建议
// ============================================================

import type { Habit } from './types'
import { HABIT_DIFFICULTY_META } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 预测结果 */
export interface PredictionResult {
  /** 习惯 ID */
  habitId: string
  /** 习惯名称 */
  habitName: string
  /** 预测类型 */
  type: PredictionType
  /** 预测置信度 0-1 */
  confidence: number
  /** 预测详情 */
  details: PredictionDetail[]
  /** 建议 */
  suggestions: string[]
  /** 预测时间 */
  predictedAt: string
}

/** 预测类型 */
export type PredictionType = 'streak' | 'completion' | 'break_risk' | 'trend' | 'health'

/** 预测详情 */
export interface PredictionDetail {
  label: string
  value: number | string
  /** 预测值 */
  predicted: number | string
  /** 变化趋势 */
  trend: 'up' | 'down' | 'stable'
  /** 单位 */
  unit?: string
}

/** 连续预测 */
export interface StreakPrediction {
  /** 当前连续 */
  currentStreak: number
  /** 预测连续（7天后） */
  predictedStreak7d: number
  /** 预测连续（30天后） */
  predictedStreak30d: number
  /** 达到下一个里程碑的天数 */
  daysToNextMilestone: number
  /** 下一个里程碑 */
  nextMilestone: number
  /** 连续中断概率 */
  breakProbability: number
  /** 关键风险因素 */
  riskFactors: string[]
}

/** 完成率预测 */
export interface CompletionPrediction {
  /** 当前完成率 */
  currentRate: number
  /** 预测完成率（7天） */
  predictedRate7d: number
  /** 预测完成率（30天） */
  predictedRate30d: number
  /** 置信区间 */
  confidenceInterval: { lower: number; upper: number }
  /** 季节性因素 */
  seasonalFactors: string[]
}

/** 中断预警 */
export interface BreakWarning {
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  /** 风险分数 0-100 */
  riskScore: number
  /** 预计中断时间 */
  estimatedBreakDate?: string
  /** 风险因素 */
  factors: RiskFactor[]
  /** 预防建议 */
  preventionTips: string[]
  /** 紧急程度 */
  urgency: 'immediate' | 'soon' | 'monitor' | 'ok'
}

/** 风险因素 */
export interface RiskFactor {
  factor: string
  weight: number
  /** 当前值 */
  currentValue: number | string
  /** 阈值 */
  threshold: number | string
  /** 是否超标 */
  exceeded: boolean
}

/** 趋势预测 */
export interface TrendPrediction {
  /** 短期趋势 */
  shortTerm: TrendDirection
  /** 中期趋势 */
  mediumTerm: TrendDirection
  /** 长期趋势 */
  longTerm: TrendDirection
  /** 趋势稳定性 */
  stability: number
  /** 转折点预测 */
  turningPoints: PredictedTurningPoint[]
}

/** 趋势方向 */
export interface TrendDirection {
  direction: 'improving' | 'declining' | 'stable' | 'volatile'
  strength: number
  description: string
  /** 线性回归斜率 */
  slope: number
}

/** 预测转折点 */
export interface PredictedTurningPoint {
  /** 预计日期 */
  estimatedDate: string
  /** 转折类型 */
  type: 'breakthrough' | 'decline' | 'recovery' | 'plateau'
  /** 概率 */
  probability: number
  /** 描述 */
  description: string
}

/** 健康度评分 */
export interface HealthScore {
  /** 总体评分 0-100 */
  overall: number
  /** 连续性评分 */
  consistency: number
  /** 完成率评分 */
  completion: number
  /** 多样性评分 */
  diversity: number
  /** 成长性评分 */
  growth: number
  /** 韧性评分 */
  resilience: number
  /** 健康等级 */
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  /** 改进建议 */
  improvements: string[]
  /** 评估时间 */
  assessedAt: string
}

/** 预测引擎配置 */
export interface PredictorConfig {
  /** 预测窗口（天） */
  predictionWindow: number
  /** 最小数据点 */
  minDataPoints: number
  /** 趋势检测灵敏度 */
  trendSensitivity: number
  /** 中断预警阈值 */
  breakRiskThreshold: number
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: PredictorConfig = {
  predictionWindow: 30,
  minDataPoints: 7,
  trendSensitivity: 0.5,
  breakRiskThreshold: 0.5,
}

// ============================================================
// useHabitPredictor
// ============================================================

export function useHabitPredictor() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<PredictorConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 连续预测 ----

  /**
   * 预测连续趋势
   */
  function predictStreak(habit: Habit): StreakPrediction {
    const completedDates = [...habit.completedDates].sort()
    const currentStreak = habit.streak
    const totalDays = getTotalDays(completedDates)

    // 计算完成率趋势
    const completionRate = totalDays > 0
      ? completedDates.length / totalDays
      : 0

    // 预测连续天数
    const predictedStreak7d = currentStreak + Math.round(7 * completionRate)
    const predictedStreak30d = currentStreak + Math.round(30 * completionRate)

    // 下一个里程碑
    const milestones = [7, 14, 21, 30, 60, 90, 180, 365]
    const nextMilestone = milestones.find(m => m > currentStreak) || currentStreak + 100
    const daysToNextMilestone = completionRate > 0
      ? Math.ceil((nextMilestone - currentStreak) / completionRate)
      : 999

    // 中断概率
    const breakProbability = calculateBreakProbability(habit, completionRate)

    // 风险因素
    const riskFactors = identifyRiskFactors(habit, completionRate)

    return {
      currentStreak,
      predictedStreak7d,
      predictedStreak30d,
      daysToNextMilestone,
      nextMilestone,
      breakProbability: Math.round(breakProbability * 100) / 100,
      riskFactors,
    }
  }

  // ---- 完成率预测 ----

  /**
   * 预测完成率
   */
  function predictCompletion(habit: Habit): CompletionPrediction {
    const completedDates = [...habit.completedDates].sort()
    if (completedDates.length < config.minDataPoints) {
      return {
        currentRate: 0,
        predictedRate7d: 0,
        predictedRate30d: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        seasonalFactors: [],
      }
    }

    const totalDays = getTotalDays(completedDates)
    const currentRate = totalDays > 0 ? completedDates.length / totalDays : 0

    // 最近7天趋势
    const recent7 = completedDates.filter(d => {
      const daysAgo = (Date.now() - new Date(d).getTime()) / 86400000
      return daysAgo <= 7
    })
    const recentRate = recent7.length / 7

    // 最近30天趋势
    const recent30 = completedDates.filter(d => {
      const daysAgo = (Date.now() - new Date(d).getTime()) / 86400000
      return daysAgo <= 30
    })
    const recentRate30 = recent30.length / 30

    // 预测：使用近期趋势加权
    const predictedRate7d = recentRate * 0.7 + currentRate * 0.3
    const predictedRate30d = recentRate30 * 0.5 + currentRate * 0.5

    // 置信区间
    const stdDev = Math.sqrt(predictedRate30d * (1 - predictedRate30d) / 30)
    const confidenceInterval = {
      lower: Math.max(0, Math.round((predictedRate30d - 1.96 * stdDev) * 100) / 100),
      upper: Math.min(1, Math.round((predictedRate30d + 1.96 * stdDev) * 100) / 100),
    }

    // 季节性因素
    const seasonalFactors = detectSeasonalFactors(completedDates)

    return {
      currentRate: Math.round(currentRate * 100) / 100,
      predictedRate7d: Math.round(predictedRate7d * 100) / 100,
      predictedRate30d: Math.round(predictedRate30d * 100) / 100,
      confidenceInterval,
      seasonalFactors,
    }
  }

  // ---- 中断预警 ----

  /**
   * 生成中断预警
   */
  function warnBreak(habit: Habit): BreakWarning {
    const completedDates = [...habit.completedDates].sort()
    const factors: RiskFactor[] = []
    let riskScore = 0

    // 1. 检查最近是否中断
    const lastCompleted = completedDates[completedDates.length - 1] || ''

    const daysSinceLast = lastCompleted
      ? Math.round((Date.now() - new Date(lastCompleted).getTime()) / 86400000)
      : 999

    const gapFactor: RiskFactor = {
      factor: '最近完成间隔',
      weight: 0.3,
      currentValue: daysSinceLast,
      threshold: 2,
      exceeded: daysSinceLast > 2,
    }
    factors.push(gapFactor)
    if (gapFactor.exceeded) riskScore += 30

    // 2. 连续天数趋势
    const streakTrend = detectTrend(completedDates)
    const trendFactor: RiskFactor = {
      factor: '连续趋势',
      weight: 0.25,
      currentValue: streakTrend > 0 ? '上升' : streakTrend < 0 ? '下降' : '稳定',
      threshold: '下降',
      exceeded: streakTrend < -0.1,
    }
    factors.push(trendFactor)
    if (trendFactor.exceeded) riskScore += 25

    // 3. 完成率
    const totalDays = getTotalDays(completedDates)
    const completionRate = totalDays > 0 ? completedDates.length / totalDays : 0
    const rateFactor: RiskFactor = {
      factor: '整体完成率',
      weight: 0.25,
      currentValue: `${Math.round(completionRate * 100)}%`,
      threshold: '50%',
      exceeded: completionRate < 0.5,
    }
    factors.push(rateFactor)
    if (rateFactor.exceeded) riskScore += 25

    // 4. 难度
    const diffScore = HABIT_DIFFICULTY_META[habit.difficulty]?.basePoints ?? 1
    const diffFactor: RiskFactor = {
      factor: '习惯难度',
      weight: 0.2,
      currentValue: HABIT_DIFFICULTY_META[habit.difficulty]?.label || '未知',
      threshold: '困难',
      exceeded: diffScore >= 5,
    }
    factors.push(diffFactor)
    if (diffFactor.exceeded) riskScore += 20

    // 风险等级
    let riskLevel: BreakWarning['riskLevel'] = 'low'
    let urgency: BreakWarning['urgency'] = 'ok'
    if (riskScore >= 80) { riskLevel = 'critical'; urgency = 'immediate' }
    else if (riskScore >= 60) { riskLevel = 'high'; urgency = 'soon' }
    else if (riskScore >= 30) { riskLevel = 'medium'; urgency = 'monitor' }

    // 预计中断日期
    let estimatedBreakDate: string | undefined
    if (riskScore >= 60 && completionRate > 0) {
      const daysUntilBreak = Math.ceil(habit.streak / (1 - completionRate))
      if (daysUntilBreak < 90) {
        const breakDate = new Date(Date.now() + daysUntilBreak * 86400000)
        estimatedBreakDate = breakDate.toISOString().split('T')[0]
      }
    }

    // 预防建议
    const preventionTips = generatePreventionTips(habit, riskLevel, factors)

    return {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      estimatedBreakDate,
      factors,
      preventionTips,
      urgency,
    }
  }

  // ---- 趋势预测 ----

  /**
   * 预测习惯趋势
   */
  function predictTrend(habit: Habit): TrendPrediction {
    const completedDates = [...habit.completedDates].sort()

    // 按周分组
    const weeklyData = groupByWeek(completedDates)

    const shortTerm = analyzeTrendDirection(weeklyData.slice(-2))
    const mediumTerm = analyzeTrendDirection(weeklyData.slice(-4))
    const longTerm = analyzeTrendDirection(weeklyData)

    // 稳定性
    const stability = calculateStability(weeklyData)

    // 转折点
    const turningPoints = detectPredictedTurningPoints(weeklyData, habit.streak)

    return {
      shortTerm,
      mediumTerm,
      longTerm,
      stability: Math.round(stability * 100) / 100,
      turningPoints,
    }
  }

  // ---- 健康度评分 ----

  /**
   * 计算习惯健康度评分
   */
  function calculateHealthScore(habits: Habit[]): HealthScore {
    const active = habits.filter(h => h.enabled)
    if (active.length === 0) {
      return {
        overall: 0, consistency: 0, completion: 0, diversity: 0, growth: 0, resilience: 0,
        grade: 'F', improvements: ['请先添加至少一个习惯'], assessedAt: new Date().toISOString(),
      }
    }

    // 连续性评分
    const avgStreak = active.reduce((s, h) => s + h.streak, 0) / active.length
    const consistency = Math.min(100, Math.round(avgStreak * 5))

    // 完成率评分
    const totalCompletions = active.reduce((s, h) => s + h.totalCompleted, 0)
    const possibleDays = active.length * Math.max(1, getTotalDays([...active.flatMap(h => h.completedDates)]))
    const completionRate = possibleDays > 0 ? totalCompletions / possibleDays : 0
    const completion = Math.round(completionRate * 100)

    // 多样性评分
    const difficulties = new Set(active.map(h => h.difficulty)).size
    const frequencies = new Set(active.map(h => h.frequency)).size
    const diversity = Math.round(((difficulties / 4 + frequencies / 4) / 2) * 100)

    // 成长性评分
    const growth = calculateGrowthScore(active)

    // 韧性评分
    const resilience = calculateResilienceScore(active)

    // 总体评分
    const overall = Math.round(
      consistency * 0.3 + completion * 0.25 + diversity * 0.15 + growth * 0.15 + resilience * 0.15,
    )

    // 等级
    let grade: HealthScore['grade'] = 'F'
    if (overall >= 90) grade = 'A'
    else if (overall >= 75) grade = 'B'
    else if (overall >= 60) grade = 'C'
    else if (overall >= 40) grade = 'D'

    // 改进建议
    const improvements = generateHealthImprovements(consistency, completion, diversity, growth, resilience)

    return {
      overall,
      consistency,
      completion,
      diversity,
      growth,
      resilience,
      grade,
      improvements,
      assessedAt: new Date().toISOString(),
    }
  }

  // ---- 综合预测 ----

  /**
   * 生成综合预测结果
   */
  function predictAll(habits: Habit[]): PredictionResult[] {
    const results: PredictionResult[] = []

    for (const habit of habits.filter(h => h.enabled)) {
      const streak = predictStreak(habit)
      const completion = predictCompletion(habit)
      const warning = warnBreak(habit)
      const trend = predictTrend(habit)

      const details: PredictionDetail[] = [
        { label: '当前连续', value: streak.currentStreak, predicted: streak.predictedStreak7d, trend: 'stable', unit: '天' },
        { label: '完成率', value: completion.currentRate, predicted: completion.predictedRate7d, trend: completion.predictedRate7d > completion.currentRate ? 'up' : 'down', unit: '%' },
        { label: '中断风险', value: warning.riskScore, predicted: warning.riskScore, trend: 'stable', unit: '分' },
      ]

      const suggestions: string[] = [
        ...warning.preventionTips,
        ...trend.turningPoints.slice(0, 2).map(tp => tp.description),
      ]

      results.push({
        habitId: habit.id,
        habitName: habit.title,
        type: 'health',
        confidence: Math.round((1 - streak.breakProbability) * 100) / 100,
        details,
        suggestions,
        predictedAt: new Date().toISOString(),
      })
    }

    return results.sort((a, b) => a.confidence - b.confidence)
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  function getTotalDays(dates: string[]): number {
    if (dates.length === 0) return 0
    const sorted = dates.sort()
    const start = new Date(sorted[0])
    const end = new Date(sorted[sorted.length - 1])
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
  }

  function calculateBreakProbability(habit: Habit, completionRate: number): number {
    let probability = 0

    // 基于完成率
    probability += (1 - completionRate) * 0.5

    // 基于难度
    const diffScore = HABIT_DIFFICULTY_META[habit.difficulty]?.basePoints ?? 1
    probability += diffScore * 0.05

    // 基于连续天数（越长越容易中断）
    if (habit.streak > 30) probability += 0.15
    else if (habit.streak > 14) probability += 0.1
    else if (habit.streak > 7) probability += 0.05

    // 基于最近活动
    const lastCompleted = habit.completedDates[habit.completedDates.length - 1]
    if (lastCompleted) {
      const daysSince = Math.round((Date.now() - new Date(lastCompleted).getTime()) / 86400000)
      if (daysSince > 2) probability += 0.2
      else if (daysSince > 1) probability += 0.1
    }

    return Math.min(1, probability)
  }

  function identifyRiskFactors(habit: Habit, completionRate: number): string[] {
    const factors: string[] = []

    if (completionRate < 0.5) factors.push('完成率偏低')
    if (habit.streak > 30) factors.push('连续天数过长，疲劳风险增加')
    if (habit.difficulty === 'hard' || habit.difficulty === 'extreme') factors.push('高难度习惯，持续性挑战大')
    if (habit.streak === 0) factors.push('当前连续已中断')

    const lastCompleted = habit.completedDates[habit.completedDates.length - 1]
    if (lastCompleted) {
      const daysSince = Math.round((Date.now() - new Date(lastCompleted).getTime()) / 86400000)
      if (daysSince > 2) factors.push('已有中断迹象')
    }

    return factors.length > 0 ? factors : ['暂无显著风险']
  }

  function detectTrend(dates: string[]): number {
    if (dates.length < 7) return 0

    const weekly = groupByWeek(dates)
    if (weekly.length < 2) return 0

    const n = weekly.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += weekly[i]
      sumXY += i * weekly[i]
      sumX2 += i * i
    }

    const denom = n * sumX2 - sumX * sumX
    return denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
  }

  function groupByWeek(dates: string[]): number[] {
    const weekMap = new Map<string, number>()
    for (const date of dates) {
      const d = new Date(date)
      const weekStart = new Date(d.getTime() - d.getDay() * 86400000)
      const key = weekStart.toISOString().split('T')[0]
      weekMap.set(key, (weekMap.get(key) || 0) + 1)
    }
    return [...weekMap.values()]
  }

  function detectSeasonalFactors(dates: string[]): string[] {
    const factors: string[] = []
    const dayOfWeek = new Map<number, number>()
    const monthMap = new Map<number, number>()

    for (const date of dates) {
      const d = new Date(date)
      dayOfWeek.set(d.getDay(), (dayOfWeek.get(d.getDay()) || 0) + 1)
      monthMap.set(d.getMonth() + 1, (monthMap.get(d.getMonth() + 1) || 0) + 1)
    }

    // 周末效应
    const weekend = (dayOfWeek.get(0) || 0) + (dayOfWeek.get(6) || 0)
    const weekday = (dayOfWeek.get(1) || 0) + (dayOfWeek.get(2) || 0) + (dayOfWeek.get(3) || 0) + (dayOfWeek.get(4) || 0) + (dayOfWeek.get(5) || 0)
    if (weekend > 0 && weekday > 0) {
      const ratio = weekend / weekday
      if (ratio > 1.5) factors.push('周末完成率更高')
      else if (ratio < 0.5) factors.push('工作日完成率更高')
    }

    return factors
  }

  function analyzeTrendDirection(weeklyData: number[]): TrendDirection {
    if (weeklyData.length < 2) {
      return { direction: 'stable', strength: 0, description: '数据不足', slope: 0 }
    }

    const n = weeklyData.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += weeklyData[i]
      sumXY += i * weeklyData[i]
      sumX2 += i * i
    }

    const denom = n * sumX2 - sumX * sumX
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0

    const mean = sumY / n
    const variance = weeklyData.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n
    const strength = Math.min(1, Math.abs(slope * n) / (mean || 1))

    let direction: TrendDirection['direction'] = 'stable'
    let description = '趋势稳定'

    if (slope > 0.5) {
      direction = 'improving'
      description = strength > 0.5 ? '明显改善中' : '略有改善'
    } else if (slope < -0.5) {
      direction = 'declining'
      description = strength > 0.5 ? '明显下降中' : '略有下降'
    } else if (variance > mean * 2) {
      direction = 'volatile'
      description = '波动较大'
    }

    return {
      direction,
      strength: Math.round(strength * 100) / 100,
      description,
      slope: Math.round(slope * 100) / 100,
    }
  }

  function calculateStability(weeklyData: number[]): number {
    if (weeklyData.length < 2) return 0
    const mean = weeklyData.reduce((s, v) => s + v, 0) / weeklyData.length
    const variance = weeklyData.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / weeklyData.length
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
    return Math.max(0, 1 - cv)
  }

  function detectPredictedTurningPoints(
    weeklyData: number[],
    currentStreak: number,
  ): PredictedTurningPoint[] {
    const points: PredictedTurningPoint[] = []

    if (weeklyData.length < 3) return points

    // 检测最近的趋势变化
    const recent = weeklyData.slice(-3)
    const trend = recent[2] - recent[0]

    if (trend > 3 && currentStreak >= 7) {
      points.push({
        estimatedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        type: 'breakthrough',
        probability: 0.7,
        description: '如果保持当前节奏，即将突破新高',
      })
    }

    if (trend < -3 && currentStreak > 0) {
      points.push({
        estimatedDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        type: 'decline',
        probability: 0.6,
        description: '近期趋势下降，建议加强执行力度',
      })
    }

    if (Math.abs(trend) < 1 && currentStreak > 14) {
      points.push({
        estimatedDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        type: 'plateau',
        probability: 0.5,
        description: '可能进入平台期，建议增加挑战性',
      })
    }

    return points
  }

  function generatePreventionTips(
    habit: Habit,
    riskLevel: BreakWarning['riskLevel'],
    factors: RiskFactor[],
  ): string[] {
    const tips: string[] = []

    if (riskLevel === 'critical' || riskLevel === 'high') {
      tips.push(`立即完成「${habit.title}」的今日打卡，避免中断`)
      tips.push('降低今日目标，完成最低标准即可')
      tips.push('设置手机提醒，确保不会遗忘')
    }

    if (factors.some(f => f.factor === '最近完成间隔' && f.exceeded)) {
      tips.push('已经中断超过2天，建议立即重新开始')
    }

    if (factors.some(f => f.factor === '习惯难度' && f.exceeded)) {
      tips.push('考虑暂时降低难度，专注于保持连续性')
    }

    if (tips.length === 0) {
      tips.push('当前状态良好，保持现有节奏')
      tips.push('可以适当增加挑战性')
    }

    return tips
  }

  function calculateGrowthScore(habits: Habit[]): number {
    let score = 0
    for (const h of habits) {
      if (h.bestStreak > h.streak) score += 20 // 有提升空间
      if (h.totalCompleted > 10) score += 30 // 有积累
      if (h.streak >= 7) score += 50 // 持续中
    }
    return Math.min(100, score / habits.length)
  }

  function calculateResilienceScore(habits: Habit[]): number {
    let score = 0
    for (const h of habits) {
      // 韧性 = 失败后恢复的能力
      if (h.bestStreak > 0 && h.streak > 0 && h.bestStreak > h.streak) {
        score += 50 // 曾经中断但重新开始
      }
      if (h.streak >= h.bestStreak && h.bestStreak > 0) {
        score += 50 // 正在创造新纪录
      }
    }
    return Math.min(100, habits.length > 0 ? score / habits.length : 0)
  }

  function generateHealthImprovements(
    consistency: number,
    completion: number,
    diversity: number,
    growth: number,
    resilience: number,
  ): string[] {
    const improvements: string[] = []

    if (consistency < 60) improvements.push('提升连续性：从每天坚持最小的习惯开始')
    if (completion < 60) improvements.push('提升完成率：设置合理的目标，确保可完成')
    if (diversity < 50) improvements.push('增加多样性：尝试不同难度和频率的习惯')
    if (growth < 50) improvements.push('促进成长：逐步增加习惯难度或目标')
    if (resilience < 50) improvements.push('增强韧性：中断后快速恢复，不追求完美')

    if (improvements.length === 0) {
      improvements.push('各方面表现优秀，继续保持')
    }

    return improvements
  }

  return {
    config,
    setConfig,
    predictStreak,
    predictCompletion,
    warnBreak,
    predictTrend,
    calculateHealthScore,
    predictAll,
  }
}