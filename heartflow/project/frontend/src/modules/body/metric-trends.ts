// ============================================================
// 身体温室 · 指标趋势分析（P19-4）
// 多指标趋势计算、异常检测、关联分析、趋势预测、预警系统
// ============================================================

import { ref } from 'vue'
import type { BodyMetric, BodyMetricType } from './types'
import { BODY_METRIC_META } from './types'
import { getLocalDateKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 趋势方向 */
export type TrendDirection = 'up' | 'down' | 'stable' | 'fluctuating'

/** 指标趋势数据 */
export interface MetricTrendData {
  /** 指标类型 */
  metricType: BodyMetricType
  /** 指标标签 */
  label: string
  /** 单位 */
  unit: string
  /** 数据点 */
  dataPoints: TrendDataPoint[]
  /** 趋势方向 */
  direction: TrendDirection
  /** 趋势斜率（线性回归斜率） */
  slope: number
  /** 趋势截距 */
  intercept: number
  /** R² 拟合度 */
  rSquared: number
  /** 当前值 */
  currentValue: number
  /** 周期均值 */
  periodAverage: number
  /** 周期标准差 */
  periodStdDev: number
  /** 最小值 */
  minValue: number
  /** 最大值 */
  maxValue: number
  /** 波动率 */
  volatility: number
  /** 目标值 */
  targetValue: number
  /** 与目标值的偏差 */
  targetDeviation: number
  /** 达标状态 */
  targetStatus: 'on_target' | 'below_target' | 'above_target'
}

/** 趋势数据点 */
export interface TrendDataPoint {
  /** 日期 */
  date: string
  /** 原始值 */
  value: number
  /** 移动平均值（7天窗口） */
  movingAverage: number
  /** 趋势预测值 */
  trendLine: number
  /** 是否异常点 */
  isAnomaly: boolean
  /** Z-score */
  zScore: number
}

/** 趋势分析结果 */
export interface TrendAnalysis {
  /** 分析周期 */
  period: { start: string; end: string }
  /** 各指标趋势 */
  metricTrends: MetricTrendData[]
  /** 整体趋势评估 */
  overallAssessment: string
  /** 最佳指标 */
  bestMetric: { type: BodyMetricType; label: string; score: number } | null
  /** 最需关注指标 */
  worstMetric: { type: BodyMetricType; label: string; score: number } | null
  /** 整体健康趋势 */
  overallTrend: TrendDirection
  /** 生成时间 */
  generatedAt: string
}

/** 指标相关性 */
export interface MetricCorrelation {
  /** 指标 A */
  metricA: BodyMetricType
  /** 指标 A 标签 */
  metricALabel: string
  /** 指标 B */
  metricB: BodyMetricType
  /** 指标 B 标签 */
  metricBLabel: string
  /** 相关系数 -1 到 1 */
  coefficient: number
  /** 相关性强度 */
  strength: 'strong_positive' | 'moderate_positive' | 'weak_positive' | 'none' | 'weak_negative' | 'moderate_negative' | 'strong_negative'
  /** 显著性 p 值 */
  pValue: number
  /** 是否显著 */
  isSignificant: boolean
  /** 样本量 */
  sampleSize: number
  /** 相关性解释 */
  interpretation: string
  /** 滞后天数（0 表示同期） */
  lagDays: number
}

/** 趋势预警 */
export interface TrendAlert {
  /** 预警 ID */
  id: string
  /** 相关指标 */
  metricType: BodyMetricType
  /** 指标标签 */
  metricLabel: string
  /** 预警类型 */
  type: 'declining_trend' | 'rapid_change' | 'approaching_threshold' | 'volatility_spike' | 'trend_reversal' | 'target_divergence'
  /** 严重级别 */
  severity: 'critical' | 'warning' | 'info'
  /** 预警标题 */
  title: string
  /** 预警描述 */
  description: string
  /** 当前值 */
  currentValue: number
  /** 阈值 */
  threshold: number
  /** 变化速率 */
  changeRate: number
  /** 预测到达阈值的时间 */
  estimatedTimeToThreshold?: string
  /** 建议 */
  suggestion: string
  /** 生成时间 */
  generatedAt: string
  /** 是否已确认 */
  acknowledged: boolean
}

/** 预测结果 */
export interface TrendPrediction {
  /** 指标类型 */
  metricType: BodyMetricType
  /** 预测日期 */
  predictionDate: string
  /** 预测值 */
  predictedValue: number
  /** 预测下限 */
  lowerBound: number
  /** 预测上限 */
  upperBound: number
  /** 置信度 0-1 */
  confidence: number
  /** 预测方法 */
  method: 'linear_regression' | 'moving_average' | 'exponential_smoothing'
}

// ============================================================
// 常量
// ============================================================

/** 各指标目标值和参考范围 */
const METRIC_TARGETS: Record<BodyMetricType, { target: number; range: [number, number]; unit: string }> = {
  sleep: { target: 8, range: [7, 9], unit: '小时' },
  weight: { target: 70, range: [50, 90], unit: 'kg' },
  heart_rate: { target: 70, range: [60, 100], unit: 'bpm' },
  energy: { target: 4, range: [3, 5], unit: '级' },
  mood: { target: 7, range: [5, 10], unit: '分' },
  exercise: { target: 30, range: [20, 60], unit: '分钟' },
  water: { target: 2000, range: [1500, 2500], unit: 'ml' },
  nutrition: { target: 70, range: [50, 100], unit: '分' },
  custom: { target: 50, range: [0, 100], unit: '' },
}

/** 趋势分析追踪的指标类型 */
const TRACKED_METRICS: BodyMetricType[] = ['sleep', 'exercise', 'nutrition', 'mood', 'energy', 'water', 'weight', 'heart_rate']

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `ta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// useMetricTrends Composable
// ============================================================

export function useMetricTrends() {
  // ---- 状态 ----
  const analysis = ref<TrendAnalysis | null>(null)
  const correlations = ref<MetricCorrelation[]>([])
  const alerts = ref<TrendAlert[]>([])
  const acknowledgedAlerts = ref<Set<string>>(new Set())

  // ============================================================
  // 趋势计算
  // ============================================================

  /**
   * 计算指标趋势
   */
  function computeTrend(
    metrics: BodyMetric[],
    options: {
      days?: number
      metricTypes?: BodyMetricType[]
    } = {},
  ): TrendAnalysis {
    const days = options.days ?? 30
    const metricTypes = options.metricTypes ?? TRACKED_METRICS
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 86400000)
    const periodStart = getLocalDateKey(startDate)
    const periodEnd = getLocalDateKey(endDate)

    const metricTrends: MetricTrendData[] = []

    for (const type of metricTypes) {
      const typeMetrics = metrics
        .filter(m => m.type === type && m.date >= periodStart && m.date <= periodEnd)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      if (typeMetrics.length < 3) continue

      const trend = computeMetricTrend(type, typeMetrics)
      metricTrends.push(trend)
    }

    // 整体评估
    const overallAssessment = generateOverallAssessment(metricTrends)
    const overallTrend = computeOverallTrend(metricTrends)

    // 最佳和最差指标
    let bestMetric: TrendAnalysis['bestMetric'] = null
    let worstMetric: TrendAnalysis['worstMetric'] = null

    if (metricTrends.length > 0) {
      const scored = metricTrends.map(t => ({
        type: t.metricType,
        label: t.label,
        score: computeMetricTrendScore(t),
      }))

      const best = scored.reduce((max, s) => s.score > max.score ? s : max, scored[0])
      const worst = scored.reduce((min, s) => s.score < min.score ? s : min, scored[0])

      bestMetric = best
      worstMetric = worst
    }

    analysis.value = {
      period: { start: periodStart, end: periodEnd },
      metricTrends,
      overallAssessment,
      bestMetric,
      worstMetric,
      overallTrend,
      generatedAt: new Date().toISOString(),
    }

    return analysis.value
  }

  /**
   * 计算单个指标的趋势
   */
  function computeMetricTrend(
    type: BodyMetricType,
    typeMetrics: BodyMetric[],
  ): MetricTrendData {
    const values = typeMetrics.map(m => m.value)
    const n = values.length

    // 基础统计
    const currentValue = values[n - 1]
    const periodAverage = values.reduce((s, v) => s + v, 0) / n
    const variance = values.reduce((s, v) => s + (v - periodAverage) ** 2, 0) / n
    const periodStdDev = Math.sqrt(variance)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const volatility = periodAverage > 0 ? periodStdDev / periodAverage : 0

    // 线性回归
    const { slope, intercept, rSquared } = linearRegression(values)

    // 趋势方向
    const direction = classifyTrendDirection(slope, rSquared, volatility, values)

    // 目标对比
    const targetConfig = METRIC_TARGETS[type]
    const targetValue = targetConfig.target
    const targetDeviation = targetValue > 0 ? (currentValue - targetValue) / targetValue : 0

    let targetStatus: MetricTrendData['targetStatus']
    if (targetDeviation > 0.15) targetStatus = 'above_target'
    else if (targetDeviation < -0.15) targetStatus = 'below_target'
    else targetStatus = 'on_target'

    // 数据点
    const dataPoints: TrendDataPoint[] = typeMetrics.map((m, i) => {
      const zScore = periodStdDev > 0 ? (m.value - periodAverage) / periodStdDev : 0
      const isAnomaly = Math.abs(zScore) > 2.5

      // 7天移动平均
      const window = typeMetrics.slice(Math.max(0, i - 6), i + 1)
      const movingAverage = window.reduce((s, w) => s + w.value, 0) / window.length

      // 趋势线值
      const trendLine = slope * i + intercept

      return {
        date: m.date,
        value: m.value,
        movingAverage: Math.round(movingAverage * 100) / 100,
        trendLine: Math.round(trendLine * 100) / 100,
        isAnomaly,
        zScore: Math.round(zScore * 100) / 100,
      }
    })

    const meta = BODY_METRIC_META[type]

    return {
      metricType: type,
      label: meta.label,
      unit: meta.unit,
      dataPoints,
      direction,
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round(intercept * 100) / 100,
      rSquared: Math.round(rSquared * 1000) / 1000,
      currentValue,
      periodAverage: Math.round(periodAverage * 100) / 100,
      periodStdDev: Math.round(periodStdDev * 100) / 100,
      minValue,
      maxValue,
      volatility: Math.round(volatility * 1000) / 1000,
      targetValue,
      targetDeviation: Math.round(targetDeviation * 100) / 100,
      targetStatus,
    }
  }

  // ============================================================
  // 异常检测
  // ============================================================

  /**
   * 检测指标趋势中的异常点
   */
  function detectAnomalies(
    metrics: BodyMetric[],
    options: {
      metricTypes?: BodyMetricType[]
      sensitivity?: number // 0-1, 越高越敏感
    } = {},
  ): { metricType: BodyMetricType; anomalies: TrendDataPoint[] }[] {
    const metricTypes = options.metricTypes ?? TRACKED_METRICS
    const sensitivity = options.sensitivity ?? 0.5
    const results: { metricType: BodyMetricType; anomalies: TrendDataPoint[] }[] = []

    // 先计算趋势
    const trendAnalysis = computeTrend(metrics, { metricTypes })
    const zThreshold = 3.0 - sensitivity * 1.5 // 灵敏度越高，阈值越低

    for (const trend of trendAnalysis.metricTrends) {
      const anomalies = trend.dataPoints.filter(
        dp => dp.isAnomaly || Math.abs(dp.zScore) > zThreshold,
      )
      if (anomalies.length > 0) {
        results.push({ metricType: trend.metricType, anomalies })
      }
    }

    return results
  }

  // ============================================================
  // 关联分析
  // ============================================================

  /**
   * 查找指标之间的相关性
   */
  function findCorrelations(
    metrics: BodyMetric[],
    options: {
      metricTypes?: BodyMetricType[]
      minSampleSize?: number
      maxLagDays?: number
    } = {},
  ): MetricCorrelation[] {
    const metricTypes = options.metricTypes ?? TRACKED_METRICS
    const minSampleSize = options.minSampleSize ?? 5
    const maxLagDays = options.maxLagDays ?? 3

    const results: MetricCorrelation[] = []

    // 按日期聚合数据
    const dateMap = new Map<string, Map<BodyMetricType, number[]>>()
    for (const m of metrics) {
      if (!metricTypes.includes(m.type)) continue
      if (!dateMap.has(m.date)) {
        dateMap.set(m.date, new Map())
      }
      const typeMap = dateMap.get(m.date)!
      if (!typeMap.has(m.type)) {
        typeMap.set(m.type, [])
      }
      typeMap.get(m.type)!.push(m.value)
    }

    // 计算每对指标的相关性
    for (let i = 0; i < metricTypes.length; i++) {
      for (let j = i + 1; j < metricTypes.length; j++) {
        const typeA = metricTypes[i]
        const typeB = metricTypes[j]

        // 同期相关性
        const correlation = computePairCorrelation(dateMap, typeA, typeB, 0, minSampleSize)
        if (correlation) results.push(correlation)

        // 滞后相关性（A 领先 B）
        for (let lag = 1; lag <= maxLagDays; lag++) {
          const lagCorrelation = computePairCorrelation(dateMap, typeA, typeB, lag, minSampleSize)
          if (lagCorrelation && Math.abs(lagCorrelation.coefficient) > Math.abs(correlation?.coefficient ?? 0)) {
            results.push(lagCorrelation)
          }
        }
      }
    }

    // 按相关系数绝对值排序
    results.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))

    correlations.value = results.slice(0, 20)
    return correlations.value
  }

  /**
   * 计算一对指标的相关性
   */
  function computePairCorrelation(
    dateMap: Map<string, Map<BodyMetricType, number[]>>,
    typeA: BodyMetricType,
    typeB: BodyMetricType,
    lagDays: number,
    minSampleSize: number,
  ): MetricCorrelation | null {
    const dates = Array.from(dateMap.keys()).sort()
    const pairs: { a: number; b: number }[] = []

    for (let i = 0; i < dates.length - lagDays; i++) {
      const dateA = dates[i]
      const dateB = dates[i + lagDays]

      const mapA = dateMap.get(dateA)
      const mapB = dateMap.get(dateB)
      if (!mapA || !mapB) continue

      const valuesA = mapA.get(typeA)
      const valuesB = mapB.get(typeB)
      if (!valuesA || !valuesB || valuesA.length === 0 || valuesB.length === 0) continue

      // 取当天均值
      const avgA = valuesA.reduce((s, v) => s + v, 0) / valuesA.length
      const avgB = valuesB.reduce((s, v) => s + v, 0) / valuesB.length

      pairs.push({ a: avgA, b: avgB })
    }

    if (pairs.length < minSampleSize) return null

    // 计算皮尔逊相关系数
    const { coefficient, pValue } = pearsonCorrelation(
      pairs.map(p => p.a),
      pairs.map(p => p.b),
    )

    // 相关性强度
    const absCoef = Math.abs(coefficient)
    let strength: MetricCorrelation['strength']
    if (absCoef >= 0.7) strength = coefficient > 0 ? 'strong_positive' : 'strong_negative'
    else if (absCoef >= 0.4) strength = coefficient > 0 ? 'moderate_positive' : 'moderate_negative'
    else if (absCoef >= 0.2) strength = coefficient > 0 ? 'weak_positive' : 'weak_negative'
    else strength = 'none'

    const isSignificant = pValue < 0.05

    // 解释
    const interpretation = generateCorrelationInterpretation(
      typeA, typeB, coefficient, strength, isSignificant, lagDays,
    )

    const metaA = BODY_METRIC_META[typeA]
    const metaB = BODY_METRIC_META[typeB]

    return {
      metricA: typeA,
      metricALabel: metaA.label,
      metricB: typeB,
      metricBLabel: metaB.label,
      coefficient: Math.round(coefficient * 1000) / 1000,
      strength,
      pValue: Math.round(pValue * 1000) / 1000,
      isSignificant,
      sampleSize: pairs.length,
      interpretation,
      lagDays,
    }
  }

  // ============================================================
  // 趋势预测
  // ============================================================

  /**
   * 预测下一个值
   */
  function predictNextValue(
    metrics: BodyMetric[],
    metricType: BodyMetricType,
    options: {
      forecastDays?: number
      method?: 'linear_regression' | 'moving_average' | 'exponential_smoothing'
    } = {},
  ): TrendPrediction[] {
    const forecastDays = options.forecastDays ?? 7
    const method = options.method ?? 'linear_regression'

    const typeMetrics = metrics
      .filter(m => m.type === metricType)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (typeMetrics.length < 5) return []

    const values = typeMetrics.map(m => m.value)
    const predictions: TrendPrediction[] = []

    switch (method) {
      case 'linear_regression': {
        const { slope, intercept, rSquared } = linearRegression(values)
        const n = values.length

        for (let i = 1; i <= forecastDays; i++) {
          const predictedValue = slope * (n + i - 1) + intercept
          const stdError = computeStdError(values, slope, intercept)
          const predictionDate = getFutureDate(typeMetrics[typeMetrics.length - 1].date, i)

          predictions.push({
            metricType,
            predictionDate,
            predictedValue: Math.round(predictedValue * 100) / 100,
            lowerBound: Math.round(Math.max(0, predictedValue - 1.96 * stdError) * 100) / 100,
            upperBound: Math.round((predictedValue + 1.96 * stdError) * 100) / 100,
            confidence: Math.round(rSquared * 100) / 100,
            method: 'linear_regression',
          })
        }
        break
      }

      case 'moving_average': {
        const windowSize = Math.min(7, values.length)
        const lastWindow = values.slice(-windowSize)
        const avgValue = lastWindow.reduce((s, v) => s + v, 0) / windowSize
        const stdDev = Math.sqrt(
          lastWindow.reduce((s, v) => s + (v - avgValue) ** 2, 0) / windowSize,
        )

        for (let i = 1; i <= forecastDays; i++) {
          const predictionDate = getFutureDate(typeMetrics[typeMetrics.length - 1].date, i)
          predictions.push({
            metricType,
            predictionDate,
            predictedValue: Math.round(avgValue * 100) / 100,
            lowerBound: Math.round(Math.max(0, avgValue - 1.96 * stdDev) * 100) / 100,
            upperBound: Math.round((avgValue + 1.96 * stdDev) * 100) / 100,
            confidence: 0.7,
            method: 'moving_average',
          })
        }
        break
      }

      case 'exponential_smoothing': {
        const alpha = 0.3
        let smoothed = values[0]
        for (let i = 1; i < values.length; i++) {
          smoothed = alpha * values[i] + (1 - alpha) * smoothed
        }

        const residuals = values.map((v, i) => {
          let s = values[0]
          for (let j = 1; j <= i; j++) {
            s = alpha * values[j] + (1 - alpha) * s
          }
          return v - s
        })
        const stdError = Math.sqrt(
          residuals.reduce((s, r) => s + r * r, 0) / residuals.length,
        )

        for (let i = 1; i <= forecastDays; i++) {
          const predictionDate = getFutureDate(typeMetrics[typeMetrics.length - 1].date, i)
          predictions.push({
            metricType,
            predictionDate,
            predictedValue: Math.round(smoothed * 100) / 100,
            lowerBound: Math.round(Math.max(0, smoothed - 1.96 * stdError * Math.sqrt(i)) * 100) / 100,
            upperBound: Math.round((smoothed + 1.96 * stdError * Math.sqrt(i)) * 100) / 100,
            confidence: Math.max(0.3, 0.9 - i * 0.05),
            method: 'exponential_smoothing',
          })
        }
        break
      }
    }

    return predictions
  }

  // ============================================================
  // 趋势预警
  // ============================================================

  /**
   * 生成趋势预警
   */
  function generateTrendAlerts(
    metrics: BodyMetric[],
    options: {
      metricTypes?: BodyMetricType[]
      sensitivity?: number
    } = {},
  ): TrendAlert[] {
    const metricTypes = options.metricTypes ?? TRACKED_METRICS
    const sensitivity = options.sensitivity ?? 0.5
    const newAlerts: TrendAlert[] = []

    // 计算趋势
    const trendAnalysis = computeTrend(metrics, { metricTypes })

    for (const trend of trendAnalysis.metricTrends) {
      const targetConfig = METRIC_TARGETS[trend.metricType]

      // 1. 下降趋势预警
      if (trend.direction === 'down' && trend.slope < -0.05) {
        const severity: TrendAlert['severity'] =
          Math.abs(trend.slope) > 0.2 ? 'warning' : 'info'

        newAlerts.push({
          id: generateId(),
          metricType: trend.metricType,
          metricLabel: trend.label,
          type: 'declining_trend',
          severity,
          title: `${trend.label}呈下降趋势`,
          description: `${trend.label}在过去 ${trend.dataPoints.length} 天中呈下降趋势，斜率 ${trend.slope.toFixed(3)}，当前值 ${trend.currentValue} ${trend.unit}`,
          currentValue: trend.currentValue,
          threshold: targetConfig.target,
          changeRate: trend.slope,
          suggestion: `建议关注${trend.label}变化，采取相应改善措施`,
          generatedAt: new Date().toISOString(),
          acknowledged: false,
        })
      }

      // 2. 快速变化预警
      if (trend.volatility > 0.3 * (1 / (sensitivity + 0.5))) {
        newAlerts.push({
          id: generateId(),
          metricType: trend.metricType,
          metricLabel: trend.label,
          type: 'volatility_spike',
          severity: trend.volatility > 0.5 ? 'warning' : 'info',
          title: `${trend.label}波动较大`,
          description: `${trend.label}的波动率 ${(trend.volatility * 100).toFixed(1)}%，变化幅度较大，标准差 ${trend.periodStdDev.toFixed(1)} ${trend.unit}`,
          currentValue: trend.currentValue,
          threshold: trend.periodStdDev * 2,
          changeRate: trend.volatility,
          suggestion: '建议保持规律的生活习惯，减少指标波动',
          generatedAt: new Date().toISOString(),
          acknowledged: false,
        })
      }

      // 3. 接近阈值预警
      if (trend.targetStatus === 'below_target' && trend.targetDeviation < -0.1) {
        newAlerts.push({
          id: generateId(),
          metricType: trend.metricType,
          metricLabel: trend.label,
          type: 'approaching_threshold',
          severity: trend.targetDeviation < -0.3 ? 'warning' : 'info',
          title: `${trend.label}低于目标值`,
          description: `${trend.label}当前值 ${trend.currentValue} ${trend.unit}，低于目标值 ${trend.targetValue} ${trend.unit}（偏差 ${Math.abs(trend.targetDeviation * 100).toFixed(0)}%）`,
          currentValue: trend.currentValue,
          threshold: trend.targetValue,
          changeRate: trend.targetDeviation,
          suggestion: `建议增加${trend.label}相关活动以达到目标`,
          generatedAt: new Date().toISOString(),
          acknowledged: false,
        })
      }

      // 4. 趋势反转预警
      if (trend.dataPoints.length >= 14 && trend.rSquared < 0.3 && trend.volatility > 0.2) {
        newAlerts.push({
          id: generateId(),
          metricType: trend.metricType,
          metricLabel: trend.label,
          type: 'trend_reversal',
          severity: 'info',
          title: `${trend.label}趋势不稳定`,
          description: `${trend.label}的趋势拟合度较低（R² = ${trend.rSquared.toFixed(2)}），可能存在趋势反转`,

          currentValue: trend.currentValue,
          threshold: 0,
          changeRate: trend.volatility,
          suggestion: '建议持续观察，暂时无需采取特别措施',
          generatedAt: new Date().toISOString(),
          acknowledged: false,
        })
      }

      // 5. 目标偏离预警
      if (trend.targetStatus === 'below_target' && trend.direction === 'down') {
        // 预测到达阈值的时间
        const daysToThreshold = trend.slope < 0
          ? Math.round((trend.currentValue - targetConfig.range[0]) / Math.abs(trend.slope))
          : null

        if (daysToThreshold !== null && daysToThreshold < 30) {
          newAlerts.push({
            id: generateId(),
            metricType: trend.metricType,
            metricLabel: trend.label,
            type: 'target_divergence',
            severity: daysToThreshold < 7 ? 'critical' : daysToThreshold < 14 ? 'warning' : 'info',
            title: `${trend.label}持续偏离目标`,
            description: `以当前趋势，${trend.label}预计在 ${daysToThreshold} 天后跌破参考范围下限`,
            currentValue: trend.currentValue,
            threshold: targetConfig.range[0],
            changeRate: trend.slope,
            estimatedTimeToThreshold: getFutureDate(
              getLocalDateKey(new Date()),
              daysToThreshold,
            ),
            suggestion: `建议立即采取措施改善${trend.label}，防止进一步恶化`,
            generatedAt: new Date().toISOString(),
            acknowledged: false,
          })
        }
      }
    }

    // 过滤已确认的预警
    const filtered = newAlerts.filter(a => !acknowledgedAlerts.value.has(a.id))

    alerts.value = [...filtered, ...alerts.value].slice(0, 50)
    return alerts.value
  }

  /**
   * 确认预警
   */
  function acknowledgeAlert(alertId: string): void {
    acknowledgedAlerts.value.add(alertId)
    const alert = alerts.value.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  /**
   * 清除预警
   */
  function clearAlerts(): void {
    alerts.value = []
    acknowledgedAlerts.value.clear()
  }

  // ============================================================
  // 统计分析
  // ============================================================

  /**
   * 线性回归
   */
  function linearRegression(values: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = values.length
    if (n < 2) return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 }

    const xSum = (n * (n - 1)) / 2
    const ySum = values.reduce((s, v) => s + v, 0)
    const xySum = values.reduce((s, v, i) => s + i * v, 0)
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
    const intercept = (ySum - slope * xSum) / n

    // R²
    const yMean = ySum / n
    const ssRes = values.reduce((s, v, i) => s + (v - (slope * i + intercept)) ** 2, 0)
    const ssTot = values.reduce((s, v) => s + (v - yMean) ** 2, 0)
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0

    return { slope, intercept, rSquared }
  }

  /**
   * 皮尔逊相关系数
   */
  function pearsonCorrelation(x: number[], y: number[]): { coefficient: number; pValue: number } {
    const n = x.length
    if (n < 3) return { coefficient: 0, pValue: 1 }

    const sumX = x.reduce((s, v) => s + v, 0)
    const sumY = y.reduce((s, v) => s + v, 0)
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0)
    const sumX2 = x.reduce((s, v) => s + v * v, 0)
    const sumY2 = y.reduce((s, v) => s + v * v, 0)

    const num = n * sumXY - sumX * sumY
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    if (den === 0) return { coefficient: 0, pValue: 1 }

    const coefficient = num / den

    // 简化的 p 值估计（t 检验）
    const t = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient))
    const pValue = Math.abs(coefficient) < 1
      ? 2 * (1 - tDistributionCDF(Math.abs(t), n - 2))
      : 0

    return { coefficient, pValue }
  }

  /**
   * 简化 t 分布 CDF
   */
  function tDistributionCDF(t: number, df: number): number {
    // 使用正态近似（对于大样本足够）
    const x = t * (1 - 1 / (4 * df)) / Math.sqrt(1 + t * t / (2 * df))
    return normalCDF(x)
  }

  /**
   * 正态分布 CDF 近似
   */
  function normalCDF(x: number): number {
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const sign = x < 0 ? -1 : 1
    x = Math.abs(x) / Math.sqrt(2)

    const t = 1 / (1 + p * x)
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return 0.5 * (1 + sign * y)
  }

  /**
   * 计算标准误
   */
  function computeStdError(values: number[], slope: number, intercept: number): number {
    const n = values.length
    if (n < 3) return 0
    const residuals = values.map((v, i) => v - (slope * i + intercept))
    const ssRes = residuals.reduce((s, r) => s + r * r, 0)
    return Math.sqrt(ssRes / (n - 2))
  }

  /**
   * 分类趋势方向
   */
  function classifyTrendDirection(
    slope: number,
    rSquared: number,
    volatility: number,
    values: number[],
  ): TrendDirection {
    const avgValue = values.reduce((s, v) => s + v, 0) / values.length

    // 如果波动率很高但拟合度低，说明波动剧烈
    if (volatility > 0.4 && rSquared < 0.3) return 'fluctuating'

    // 如果拟合度低，可能是不稳定
    if (rSquared < 0.2 && volatility > 0.2) return 'fluctuating'

    const threshold = avgValue * 0.02
    if (slope > threshold) return 'up'
    if (slope < -threshold) return 'down'
    return 'stable'
  }

  /**
   * 计算整体趋势
   */
  function computeOverallTrend(metricTrends: MetricTrendData[]): TrendDirection {
    if (metricTrends.length === 0) return 'stable'

    const directions = metricTrends.map(t => t.direction)
    const upCount = directions.filter(d => d === 'up').length
    const downCount = directions.filter(d => d === 'down').length
    const fluctuatingCount = directions.filter(d => d === 'fluctuating').length

    if (fluctuatingCount > metricTrends.length / 2) return 'fluctuating'
    if (upCount > downCount && upCount > metricTrends.length / 3) return 'up'
    if (downCount > upCount && downCount > metricTrends.length / 3) return 'down'
    return 'stable'
  }

  /**
   * 计算指标趋势评分
   */
  function computeMetricTrendScore(trend: MetricTrendData): number {
    let score = 50

    // 趋势方向加分
    if (trend.direction === 'up' && trend.metricType !== 'weight' && trend.metricType !== 'heart_rate') {
      score += 15
    } else if (trend.direction === 'down' && (trend.metricType === 'weight' || trend.metricType === 'heart_rate')) {
      score += 10
    } else if (trend.direction === 'stable') {
      score += 5
    } else if (trend.direction === 'fluctuating') {
      score -= 10
    }

    // 达标加分
    if (trend.targetStatus === 'on_target') {
      score += 20
    } else if (trend.targetStatus === 'below_target') {
      score -= 10
    }

    // 波动率减分
    if (trend.volatility > 0.5) score -= 15
    else if (trend.volatility > 0.3) score -= 5

    // R² 拟合度
    if (trend.rSquared > 0.7) score += 5
    else if (trend.rSquared < 0.2) score -= 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 生成整体评估
   */
  function generateOverallAssessment(metricTrends: MetricTrendData[]): string {
    if (metricTrends.length === 0) {
      return '暂无足够的趋势数据进行分析。开始记录健康指标将获得趋势分析。'
    }

    const onTarget = metricTrends.filter(t => t.targetStatus === 'on_target').length
    const belowTarget = metricTrends.filter(t => t.targetStatus === 'below_target').length
    const improving = metricTrends.filter(t => t.direction === 'up').length
    const declining = metricTrends.filter(t => t.direction === 'down').length
    const fluctuating = metricTrends.filter(t => t.direction === 'fluctuating').length

    const totalTracked = metricTrends.length

    let assessment = `共追踪 ${totalTracked} 项指标：`

    if (onTarget > 0) {
      assessment += `${onTarget} 项达标，`
    }
    if (improving > 0) {
      assessment += `${improving} 项呈上升趋势，`
    }
    if (declining > 0) {
      assessment += `${declining} 项呈下降趋势，`
    }
    if (belowTarget > 0) {
      assessment += `${belowTarget} 项低于目标值，`
    }
    if (fluctuating > 0) {
      assessment += `${fluctuating} 项波动较大，`
    }

    // 去掉末尾的逗号
    assessment = assessment.replace(/，$/, '。')

    if (onTarget >= totalTracked * 0.7) {
      assessment += '整体健康状况良好，多数指标达标。'
    } else if (declining + belowTarget >= totalTracked * 0.4) {
      assessment += '建议关注下降趋势的指标，采取改善措施。'
    } else if (fluctuating > totalTracked * 0.3) {
      assessment += '部分指标波动较大，建议保持规律的生活习惯。'
    } else {
      assessment += '整体趋势平稳，继续保持当前健康习惯。'
    }

    return assessment
  }

  /**
   * 生成相关性解释
   */
  function generateCorrelationInterpretation(
    typeA: BodyMetricType,
    typeB: BodyMetricType,
    coefficient: number,
    strength: MetricCorrelation['strength'],
    isSignificant: boolean,
    lagDays: number,
  ): string {
    const metaA = BODY_METRIC_META[typeA]
    const metaB = BODY_METRIC_META[typeB]

    const strengthText = {
      strong_positive: '强正相关',
      moderate_positive: '中等正相关',
      weak_positive: '弱正相关',
      none: '无明显相关',
      weak_negative: '弱负相关',
      moderate_negative: '中等负相关',
      strong_negative: '强负相关',
    }[strength]

    const sigText = isSignificant ? '（统计显著）' : '（未达统计显著）'
    const lagText = lagDays > 0 ? `，${metaA.label}领先${metaB.label} ${lagDays} 天` : ''

    return `${metaA.label}与${metaB.label}呈${strengthText}（r = ${coefficient.toFixed(2)}）${sigText}${lagText}`
  }

  /**
   * 获取未来日期
   */
  function getFutureDate(baseDate: string, daysAhead: number): string {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + daysAhead)
    return getLocalDateKey(d)
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    analysis,
    correlations,
    alerts,

    // 趋势计算
    computeTrend,

    // 异常检测
    detectAnomalies,

    // 关联分析
    findCorrelations,

    // 趋势预测
    predictNextValue,

    // 趋势预警
    generateTrendAlerts,
    acknowledgeAlert,
    clearAlerts,
  }
}

// ============================================================
// 温和洞察
// ============================================================

/**
 * 由趋势分析 / 显著关联 / 未确认预警生成不超过 4 条的温和观察。
 * 不给医疗结论、不制造焦虑；无分析时只给一句守候引导。
 */
export function metricTrendsInsights(
  analysis: TrendAnalysis | null,
  correlations: MetricCorrelation[] = [],
  alerts: TrendAlert[] = [],
): string[] {
  if (!analysis) return ['趋势还没生成，先多记录几天，曲线自然会浮出来。']

  const out: string[] = []
  const trends = analysis.metricTrends ?? []
  const onTarget = trends.filter((t) => t.targetStatus === 'on_target').length
  out.push(
    trends.length
      ? `共追踪 ${trends.length} 项指标，其中 ${onTarget} 项落在目标区间。`
      : '共追踪 0 项指标，再积累几天记录就能看出走向。',
  )

  if (analysis.bestMetric) {
    out.push(`${analysis.bestMetric.label} 是这段时间最稳的一项，值得保持。`)
  }

  const significant = (correlations ?? []).filter((c) => c.isSignificant)
  if (significant.length) {
    const c = significant[0]
    const dir = c.coefficient >= 0 ? '同向' : '反向'
    out.push(`关联线索：${c.metricALabel}与${c.metricBLabel}${dir}变化，${c.interpretation}。`)
  }

  const pending = (alerts ?? []).filter((a) => !a.acknowledged)
  if (pending.length) {
    const a = pending[0]
    out.push(`趋势预警：${a.metricLabel} ${a.title}，${a.suggestion}`)
  }

  return out.slice(0, 4)
}