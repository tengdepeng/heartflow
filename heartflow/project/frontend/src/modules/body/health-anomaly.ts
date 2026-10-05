// ============================================================
// 身体温室 · 健康异常检测（P16-2）
// 指标偏离检测、睡眠异常、趋势预警、异常报告生成
// ============================================================

import type { BodyMetric, BodyMetricType, SleepRecord } from './types'
import { getLocalDateKey } from '../../utils/time'

// ---- 异常类型 ----

/** 异常严重级别 */
export type AnomalySeverity = 'critical' | 'warning' | 'info'

/** 异常类别 */
export type AnomalyCategory =
  | 'metric_deviation'    // 指标偏离
  | 'sleep_disorder'       // 睡眠异常
  | 'trend_reversal'       // 趋势反转
  | 'correlation_alert'    // 关联异常
  | 'consistency_break'    // 规律中断
  | 'threshold_breach'     // 阈值突破

/** 单条异常检测结果 */
export interface HealthAnomaly {
  id: string
  category: AnomalyCategory
  severity: AnomalySeverity
  /** 相关指标类型 */
  metricType: BodyMetricType
  /** 异常标题 */
  title: string
  /** 异常描述 */
  description: string
  /** 检测值 */
  detectedValue: number
  /** 期望范围 */
  expectedRange: [number, number]
  /** 偏差百分比 */
  deviationPercent: number
  /** 检测时间 */
  detectedAt: string
  /** 相关数据点 */
  relatedDataPoints: number
  /** 建议操作 */
  suggestedAction: string
  /** 是否已确认 */
  acknowledged: boolean
  /** 是否已解决 */
  resolved: boolean
}

/** 异常检测配置 */
export interface AnomalyDetectionConfig {
  /** 指标偏离阈值（标准差倍数） */
  deviationStdMultiplier: number
  /** 睡眠异常最小变化量（分钟） */
  sleepMinChangeMinutes: number
  /** 趋势反转所需连续天数 */
  trendReversalDays: number
  /** 规律中断最大间隔（天） */
  consistencyMaxGap: number
  /** 是否启用关联检测 */
  enableCorrelation: boolean
  /** 预警灵敏度 0-1（越高越敏感） */
  sensitivity: number
}

/** 异常检测报告 */
export interface AnomalyReport {
  /** 总计异常数 */
  totalAnomalies: number
  /** 按严重级别分组 */
  bySeverity: {
    critical: number
    warning: number
    info: number
  }
  /** 按类别分组 */
  byCategory: Record<AnomalyCategory, number>
  /** 异常列表 */
  anomalies: HealthAnomaly[]
  /** 健康风险评分 0-100（越高越危险） */
  riskScore: number
  /** 报告生成时间 */
  generatedAt: string
  /** 整体评估 */
  overallAssessment: string
  /** 优先处理建议 */
  priorityActions: string[]
}

/** 指标统计摘要（用于异常检测） */
interface MetricStats {
  mean: number
  stdDev: number
  min: number
  max: number
  count: number
  recent: number[]  // 最近 N 个值
}

// ---- 默认配置 ----

const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  deviationStdMultiplier: 2.0,
  sleepMinChangeMinutes: 60,
  trendReversalDays: 3,
  consistencyMaxGap: 2,
  enableCorrelation: true,
  sensitivity: 0.5,
}

// ---- 指标参考范围 ----

const METRIC_REFERENCE_RANGES: Record<BodyMetricType, [number, number]> = {
  sleep: [6, 9],           // 小时
  weight: [45, 120],       // kg
  heart_rate: [50, 100],   // bpm
  energy: [1, 5],          // 级别
  mood: [1, 10],           // 分
  exercise: [0, 180],      // 分钟/天
  water: [0, 5000],        // ml/天
  nutrition: [0, 100],     // 分
  custom: [0, 100],
}

// ============================================================
// 异常检测引擎
// ============================================================

/**
 * 执行全面健康异常检测
 */
export function detectHealthAnomalies(
  metrics: BodyMetric[],
  sleepRecords: SleepRecord[],
  config: Partial<AnomalyDetectionConfig> = {},
): AnomalyReport {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const anomalies: HealthAnomaly[] = []
  const now = new Date().toISOString()

  // 按指标类型分组
  const metricsByType = groupMetricsByType(metrics)

  // 对每种指标类型执行检测
  for (const [type, typeMetrics] of Object.entries(metricsByType)) {
    if (typeMetrics.length < 3) continue // 数据太少无法检测

    const metricType = type as BodyMetricType
    const stats = computeMetricStats(typeMetrics)

    // 1. 指标偏离检测
    const deviationAnomalies = detectMetricDeviations(metricType, typeMetrics, stats, cfg, now)
    anomalies.push(...deviationAnomalies)

    // 2. 趋势反转检测
    const reversalAnomalies = detectTrendReversal(metricType, typeMetrics, stats, cfg, now)
    anomalies.push(...reversalAnomalies)

    // 3. 阈值突破检测
    const thresholdAnomalies = detectThresholdBreach(metricType, typeMetrics, cfg, now)
    anomalies.push(...thresholdAnomalies)

    // 4. 规律中断检测
    const consistencyAnomalies = detectConsistencyBreak(metricType, typeMetrics, cfg, now)
    anomalies.push(...consistencyAnomalies)
  }

  // 5. 睡眠异常检测
  const sleepAnomalies = detectSleepDisorders(sleepRecords, cfg, now)
  anomalies.push(...sleepAnomalies)

  // 6. 关联异常检测
  if (cfg.enableCorrelation) {
    const correlationAnomalies = detectCorrelationAlerts(metricsByType, sleepRecords, cfg, now)
    anomalies.push(...correlationAnomalies)
  }

  // 按严重程度排序
  const severityOrder: Record<AnomalySeverity, number> = { critical: 0, warning: 1, info: 2 }
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // 统计
  const bySeverity = { critical: 0, warning: 0, info: 0 }
  const byCategory: Record<AnomalyCategory, number> = {
    metric_deviation: 0,
    sleep_disorder: 0,
    trend_reversal: 0,
    correlation_alert: 0,
    consistency_break: 0,
    threshold_breach: 0,
  }

  for (const a of anomalies) {
    bySeverity[a.severity]++
    byCategory[a.category]++
  }

  // 风险评分
  const riskScore = computeRiskScore(anomalies, cfg)

  // 整体评估
  const overallAssessment = generateOverallAssessment(anomalies, riskScore)

  // 优先处理建议
  const priorityActions = generatePriorityActions(anomalies)

  return {
    totalAnomalies: anomalies.length,
    bySeverity,
    byCategory,
    anomalies,
    riskScore,
    generatedAt: now,
    overallAssessment,
    priorityActions,
  }
}

// ============================================================
// 检测器：指标偏离
// ============================================================

function detectMetricDeviations(
  type: BodyMetricType,
  metrics: BodyMetric[],
  stats: MetricStats,
  config: AnomalyDetectionConfig,
  now: string,
): HealthAnomaly[] {
  const anomalies: HealthAnomaly[] = []
  const sorted = [...metrics].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  const recent = sorted.slice(0, 7)
  if (recent.length === 0) return anomalies

  const latest = recent[0]
  const latestValue = latest.value

  // 检查是否偏离均值超过 N 个标准差
  const threshold = config.deviationStdMultiplier * (1 / (config.sensitivity + 0.5))
  const deviation = Math.abs(latestValue - stats.mean)

  if (stats.stdDev > 0 && deviation > threshold * stats.stdDev) {
    const deviationPercent = stats.mean > 0
      ? Math.round((deviation / stats.mean) * 100)
      : 0

    const direction = latestValue > stats.mean ? '偏高' : '偏低'
    const severity: AnomalySeverity = deviationPercent > 50 ? 'critical'
      : deviationPercent > 25 ? 'warning' : 'info'

    const refRange = METRIC_REFERENCE_RANGES[type]
    const inRefRange = latestValue >= refRange[0] && latestValue <= refRange[1]

    const metricLabel = getMetricLabel(type)
    const unit = getMetricUnit(type)

    anomalies.push({
      id: `deviation-${type}-${Date.now()}`,
      category: 'metric_deviation',
      severity,
      metricType: type,
      title: `${metricLabel}异常${direction}`,
      description: `最近${metricLabel}值 ${latestValue}${unit}，${direction}于历史均值 ${stats.mean.toFixed(1)}${unit}（偏差 ${deviationPercent}%），${inRefRange ? '仍在参考范围内' : '已超出参考范围'}`,
      detectedValue: latestValue,
      expectedRange: [Math.max(0, stats.mean - stats.stdDev), stats.mean + stats.stdDev],
      deviationPercent,
      detectedAt: now,
      relatedDataPoints: recent.length,
      suggestedAction: deviationPercent > 50
        ? `建议尽快关注${metricLabel}变化，如有不适请咨询医生`
        : `建议持续观察${metricLabel}变化趋势，保持规律作息`,
      acknowledged: false,
      resolved: false,
    })
  }

  return anomalies
}

// ============================================================
// 检测器：趋势反转
// ============================================================

function detectTrendReversal(
  type: BodyMetricType,
  metrics: BodyMetric[],
  _stats: MetricStats,
  config: AnomalyDetectionConfig,
  now: string,
): HealthAnomaly[] {
  const anomalies: HealthAnomaly[] = []
  const sorted = [...metrics].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  if (sorted.length < config.trendReversalDays * 2) return anomalies

  // 分析最近 N 天 vs 前 N 天的趋势
  const n = config.trendReversalDays
  const recent = sorted.slice(-n)
  const previous = sorted.slice(-n * 2, -n)

  if (recent.length < n || previous.length < n) return anomalies

  const recentAvg = recent.reduce((s, m) => s + m.value, 0) / recent.length
  const previousAvg = previous.reduce((s, m) => s + m.value, 0) / previous.length

  // 检查趋势是否反转
  const change = recentAvg - previousAvg
  const changePercent = previousAvg > 0 ? Math.abs(change / previousAvg) * 100 : 0

  // 变化超过 20% 且持续多天
  if (changePercent > 20 * (1 / (config.sensitivity + 0.5))) {
    const direction = change > 0 ? '上升' : '下降'
    const metricLabel = getMetricLabel(type)
    const prevDirection = getPreviousTrend(sorted.slice(0, -n))
    const isReversal = (change > 0 && prevDirection === 'down') || (change < 0 && prevDirection === 'up')

    if (isReversal || changePercent > 40) {
      anomalies.push({
        id: `reversal-${type}-${Date.now()}`,
        category: 'trend_reversal',
        severity: changePercent > 40 ? 'warning' : 'info',
        metricType: type,
        title: `${metricLabel}趋势${isReversal ? '反转' : '显著变化'}`,
        description: `最近${n}天${metricLabel}均值 ${recentAvg.toFixed(1)}，相比前${n}天（${previousAvg.toFixed(1)}）${direction}了 ${changePercent.toFixed(0)}%${isReversal ? '，趋势出现反转' : ''}`,
        detectedValue: recentAvg,
        expectedRange: [previousAvg * 0.8, previousAvg * 1.2],
        deviationPercent: Math.round(changePercent),
        detectedAt: now,
        relatedDataPoints: n * 2,
        suggestedAction: isReversal
          ? `趋势反转需要关注，建议回顾最近的生活习惯变化`
          : `持续${direction}趋势，建议保持观察`,
        acknowledged: false,
        resolved: false,
      })
    }
  }

  return anomalies
}

// ============================================================
// 检测器：阈值突破
// ============================================================

function detectThresholdBreach(
  type: BodyMetricType,
  metrics: BodyMetric[],
  _config: AnomalyDetectionConfig,
  now: string,
): HealthAnomaly[] {
  const anomalies: HealthAnomaly[] = []
  const refRange = METRIC_REFERENCE_RANGES[type]
  const sorted = [...metrics].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  const recent = sorted.slice(0, 3)
  if (recent.length === 0) return anomalies

  // 检查最近值是否持续超出参考范围
  const outOfRange = recent.filter(m => m.value < refRange[0] || m.value > refRange[1])
  const breachRatio = outOfRange.length / recent.length

  if (breachRatio >= 0.67) {
    const latest = recent[0]
    const metricLabel = getMetricLabel(type)
    const unit = getMetricUnit(type)
    const direction = latest.value < refRange[0] ? '低于' : '高于'

    const severity: AnomalySeverity = breachRatio >= 1 ? 'warning'
      : breachRatio >= 0.67 ? 'info' : 'info'

    anomalies.push({
      id: `threshold-${type}-${Date.now()}`,
      category: 'threshold_breach',
      severity,
      metricType: type,
      title: `${metricLabel}持续${direction}参考范围`,
      description: `最近${recent.length}次${metricLabel}记录中，${outOfRange.length}次${direction}参考范围 [${refRange[0]}, ${refRange[1]}]${unit}`,
      detectedValue: latest.value,
      expectedRange: refRange,
      deviationPercent: latest.value < refRange[0]
        ? Math.round(((refRange[0] - latest.value) / refRange[0]) * 100)
        : Math.round(((latest.value - refRange[1]) / refRange[1]) * 100),
      detectedAt: now,
      relatedDataPoints: recent.length,
      suggestedAction: latest.value < refRange[0]
        ? `建议增加${metricLabel}相关活动`
        : `建议适当减少${metricLabel}相关活动`,
      acknowledged: false,
      resolved: false,
    })
  }

  return anomalies
}

// ============================================================
// 检测器：规律中断
// ============================================================

function detectConsistencyBreak(
  type: BodyMetricType,
  metrics: BodyMetric[],
  _config: AnomalyDetectionConfig,
  now: string,
): HealthAnomaly[] {
  const anomalies: HealthAnomaly[] = []

  // 检查最近是否有连续多天没有记录
  const sorted = [...metrics].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  if (sorted.length < 5) return anomalies

  // 获取最近记录日期
  const dates = new Set<string>()
  for (const m of sorted.slice(0, 30)) {
    dates.add(getLocalDateKey(new Date(m.timestamp)))
  }

  // 检查最近 7 天是否有连续缺失
  const nowDate = new Date()
  let missingDays = 0
  let maxConsecutiveMissing = 0
  let currentConsecutive = 0

  for (let i = 0; i < 7; i++) {
    // 逐日回退用 setDate：-86400000 毫秒减法在 DST 时区会落到前一天
    const checkDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = getLocalDateKey(checkDate)
    if (!dates.has(dateStr)) {
      currentConsecutive++
      missingDays++
      maxConsecutiveMissing = Math.max(maxConsecutiveMissing, currentConsecutive)
    } else {
      currentConsecutive = 0
    }
  }

  const maxGap = _config.consistencyMaxGap

  if (maxConsecutiveMissing > maxGap) {
    const metricLabel = getMetricLabel(type)
    anomalies.push({
      id: `consistency-${type}-${Date.now()}`,
      category: 'consistency_break',
      severity: maxConsecutiveMissing > 4 ? 'warning' : 'info',
      metricType: type,
      title: `${metricLabel}记录中断`,
      description: `最近 7 天中有 ${missingDays} 天没有${metricLabel}记录，最长连续中断 ${maxConsecutiveMissing} 天`,
      detectedValue: maxConsecutiveMissing,
      expectedRange: [0, maxGap],
      deviationPercent: Math.round((maxConsecutiveMissing / 7) * 100),
      detectedAt: now,
      relatedDataPoints: 7,
      suggestedAction: `建议恢复${metricLabel}的记录习惯，保持数据连续性有助于更好地追踪健康`,
      acknowledged: false,
      resolved: false,
    })
  }

  return anomalies
}

// ============================================================
// 检测器：睡眠异常
// ============================================================

function detectSleepDisorders(
  sleepRecords: SleepRecord[],
  config: AnomalyDetectionConfig,
  now: string,
): HealthAnomaly[] {
  const anomalies: HealthAnomaly[] = []
  if (sleepRecords.length < 7) return anomalies

  const sorted = [...sleepRecords].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  const recent = sorted.slice(0, 7)
  const avgDuration = recent.reduce((s, r) => s + r.duration, 0) / recent.length
  const avgQuality = recent.reduce((s, r) => s + r.quality, 0) / recent.length

  const latest = recent[0]

  // 1. 睡眠时长异常
  const minChange = config.sleepMinChangeMinutes
  if (Math.abs(latest.duration - avgDuration) > minChange) {
    const direction = latest.duration > avgDuration ? '增加' : '减少'
    const hours = Math.round(latest.duration / 60 * 10) / 10
    const avgHours = Math.round(avgDuration / 60 * 10) / 10

    anomalies.push({
      id: `sleep-duration-${Date.now()}`,
      category: 'sleep_disorder',
      severity: Math.abs(latest.duration - avgDuration) > minChange * 2 ? 'warning' : 'info',
      metricType: 'sleep',
      title: `睡眠时长异常${direction}`,
      description: `最近一晚睡眠 ${hours} 小时，相比 7 天均值（${avgHours} 小时）${direction}了 ${Math.round(Math.abs(latest.duration - avgDuration))} 分钟`,
      detectedValue: latest.duration,
      expectedRange: [avgDuration - minChange, avgDuration + minChange],
      deviationPercent: Math.round(Math.abs(latest.duration - avgDuration) / avgDuration * 100),
      detectedAt: now,
      relatedDataPoints: 7,
      suggestedAction: direction === '减少'
        ? '建议今晚提前入睡，保证充足睡眠时间'
        : '注意睡眠不要过长，7-9 小时为最佳范围',
      acknowledged: false,
      resolved: false,
    })
  }

  // 2. 睡眠质量下降
  if (latest.quality < avgQuality - 1 && latest.quality <= 2) {
    anomalies.push({
      id: `sleep-quality-${Date.now()}`,
      category: 'sleep_disorder',
      severity: latest.quality === 1 ? 'critical' : 'warning',
      metricType: 'sleep',
      title: '睡眠质量下降',
      description: `最近一晚睡眠质量评分 ${latest.quality}/5，低于 7 天均值 ${avgQuality.toFixed(1)}/5`,
      detectedValue: latest.quality,
      expectedRange: [3, 5],
      deviationPercent: Math.round((avgQuality - latest.quality) / avgQuality * 100),
      detectedAt: now,
      relatedDataPoints: 7,
      suggestedAction: '建议睡前避免屏幕蓝光，尝试冥想或深呼吸放松，必要时咨询睡眠专家',
      acknowledged: false,
      resolved: false,
    })
  }

  // 3. 入睡时间异常
  const bedtimes = recent.map(r => {
    const b = new Date(r.sleepAt)
    return b.getHours() * 60 + b.getMinutes()
  })
  const avgBedtime = bedtimes.reduce((s, t) => s + t, 0) / bedtimes.length
  const latestBedtime = bedtimes[0]

  if (Math.abs(latestBedtime - avgBedtime) > 90) {
    const direction = latestBedtime > avgBedtime ? '推迟' : '提前'
    const latestHour = Math.floor(latestBedtime / 60)
    const latestMin = Math.floor(latestBedtime % 60)
    const avgHour = Math.floor(avgBedtime / 60)
    const avgMin = Math.floor(avgBedtime % 60)

    anomalies.push({
      id: `sleep-bedtime-${Date.now()}`,
      category: 'sleep_disorder',
      severity: 'info',
      metricType: 'sleep',
      title: `入睡时间${direction}`,
      description: `最近入睡时间 ${String(latestHour).padStart(2, '0')}:${String(latestMin).padStart(2, '0')}，相比平均入睡时间 ${String(avgHour).padStart(2, '0')}:${String(avgMin).padStart(2, '0')} ${direction}了约 ${Math.round(Math.abs(latestBedtime - avgBedtime))} 分钟`,
      detectedValue: latestBedtime,
      expectedRange: [avgBedtime - 60, avgBedtime + 60],
      deviationPercent: Math.round(Math.abs(latestBedtime - avgBedtime) / avgBedtime * 100),
      detectedAt: now,
      relatedDataPoints: 7,
      suggestedAction: `建议尽量保持固定的入睡时间，周末与工作日差异不超过 1 小时`,
      acknowledged: false,
      resolved: false,
    })
  }

  return anomalies
}

// ============================================================
// 检测器：关联异常
// ============================================================

function detectCorrelationAlerts(
  metricsByType: Record<string, BodyMetric[]>,
  _sleepRecords: SleepRecord[],
  _config: AnomalyDetectionConfig,
  now: string,
): HealthAnomaly[] {
  const anomalies: HealthAnomaly[] = []

  // 睡眠不足 + 情绪低落
  const sleepMetrics = metricsByType['sleep'] || []
  const moodMetrics = metricsByType['mood'] || []

  if (sleepMetrics.length >= 3 && moodMetrics.length >= 3) {
    const recentSleep = sleepMetrics.slice(-3)
    const recentMood = moodMetrics.slice(-3)

    const avgSleep = recentSleep.reduce((s, m) => s + m.value, 0) / recentSleep.length
    const avgMood = recentMood.reduce((s, m) => s + m.value, 0) / recentMood.length

    if (avgSleep < 6 && avgMood < 5) {
      anomalies.push({
        id: `correlation-sleep-mood-${Date.now()}`,
        category: 'correlation_alert',
        severity: 'warning',
        metricType: 'sleep',
        title: '睡眠不足可能影响情绪',
        description: `近 3 天平均睡眠仅 ${avgSleep.toFixed(1)} 小时，同时情绪评分偏低（${avgMood.toFixed(1)} 分），睡眠不足可能正在影响情绪状态`,
        detectedValue: avgSleep,
        expectedRange: [7, 9],
        deviationPercent: Math.round((1 - avgSleep / 7) * 100),
        detectedAt: now,
        relatedDataPoints: 6,
        suggestedAction: '优先保证睡眠时长，充足睡眠是情绪稳定的基础',
        acknowledged: false,
        resolved: false,
      })
    }
  }

  // 运动过量 + 精力下降
  const exerciseMetrics = metricsByType['exercise'] || []
  const energyMetrics = metricsByType['energy'] || []

  if (exerciseMetrics.length >= 3 && energyMetrics.length >= 3) {
    const recentExercise = exerciseMetrics.slice(-3)
    const recentEnergy = energyMetrics.slice(-3)

    const avgExercise = recentExercise.reduce((s, m) => s + m.value, 0) / recentExercise.length
    const avgEnergy = recentEnergy.reduce((s, m) => s + m.value, 0) / recentEnergy.length

    if (avgExercise > 90 && avgEnergy < 3) {
      anomalies.push({
        id: `correlation-exercise-energy-${Date.now()}`,
        category: 'correlation_alert',
        severity: 'info',
        metricType: 'exercise',
        title: '运动量偏高但精力不足',
        description: `近 3 天平均运动 ${avgExercise.toFixed(0)} 分钟，但精力评分仅 ${avgEnergy.toFixed(1)}/5，可能运动过量或恢复不足`,
        detectedValue: avgExercise,
        expectedRange: [30, 60],
        deviationPercent: Math.round((avgExercise / 60 - 1) * 100),
        detectedAt: now,
        relatedDataPoints: 6,
        suggestedAction: '建议适当减少运动强度，增加休息和恢复时间',
        acknowledged: false,
        resolved: false,
      })
    }
  }

  // 饮水不足 + 多种指标异常
  const waterMetrics = metricsByType['water'] || []
  if (waterMetrics.length >= 3) {
    const recentWater = waterMetrics.slice(-3)
    const avgWater = recentWater.reduce((s, m) => s + m.value, 0) / recentWater.length

    if (avgWater < 1000) {
      // 检查是否有其他指标异常
      let relatedIssues = 0
      if (energyMetrics.length > 0) {
        const avgEnergy = energyMetrics.slice(-3).reduce((s, m) => s + m.value, 0) / energyMetrics.length
        if (avgEnergy < 3) relatedIssues++
      }
      if (moodMetrics.length > 0) {
        const avgMood = moodMetrics.slice(-3).reduce((s, m) => s + m.value, 0) / moodMetrics.length
        if (avgMood < 5) relatedIssues++
      }

      if (relatedIssues >= 1) {
        anomalies.push({
          id: `correlation-water-${Date.now()}`,
          category: 'correlation_alert',
          severity: 'warning',
          metricType: 'water',
          title: '饮水严重不足，可能影响多项健康指标',
          description: `近 3 天平均饮水仅 ${avgWater.toFixed(0)}ml（推荐 1500-2500ml），同时伴有 ${relatedIssues} 项指标异常，脱水可能加剧健康问题`,
          detectedValue: avgWater,
          expectedRange: [1500, 2500],
          deviationPercent: Math.round((1 - avgWater / 1500) * 100),
          detectedAt: now,
          relatedDataPoints: 3 + relatedIssues * 3,
          suggestedAction: '立即增加水分摄入，保持每日 1500-2000ml 饮水量',
          acknowledged: false,
          resolved: false,
        })
      }
    }
  }

  return anomalies
}

// ============================================================
// 辅助函数
// ============================================================

function groupMetricsByType(metrics: BodyMetric[]): Record<string, BodyMetric[]> {
  const groups: Record<string, BodyMetric[]> = {}
  for (const m of metrics) {
    if (!groups[m.type]) groups[m.type] = []
    groups[m.type].push(m)
  }
  return groups
}

function computeMetricStats(metrics: BodyMetric[]): MetricStats {
  const values = metrics.map(m => m.value)
  const n = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n

  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  const sorted = [...values].sort((a, b) => a - b)

  return {
    mean,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: n,
    recent: values.slice(-7),
  }
}

function getPreviousTrend(metrics: BodyMetric[]): 'up' | 'down' | 'stable' {
  if (metrics.length < 4) return 'stable'
  const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2))
  const secondHalf = metrics.slice(Math.floor(metrics.length / 2))
  const firstAvg = firstHalf.reduce((s, m) => s + m.value, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((s, m) => s + m.value, 0) / secondHalf.length
  const diff = secondAvg - firstAvg
  if (diff > firstAvg * 0.05) return 'up'
  if (diff < -firstAvg * 0.05) return 'down'
  return 'stable'
}

function computeRiskScore(anomalies: HealthAnomaly[], config: AnomalyDetectionConfig): number {
  if (anomalies.length === 0) return 0

  let score = 0
  const severityWeights = { critical: 30, warning: 15, info: 5 }

  for (const a of anomalies) {
    score += severityWeights[a.severity]
  }

  // 灵敏度调节
  score = Math.round(score * (0.5 + config.sensitivity))

  return Math.min(100, score)
}

function generateOverallAssessment(anomalies: HealthAnomaly[], riskScore: number): string {
  if (anomalies.length === 0) {
    return '各项健康指标正常，未检测到异常。继续保持良好的健康习惯！'
  }

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length
  const warningCount = anomalies.filter(a => a.severity === 'warning').length

  if (riskScore >= 70) {
    return `检测到 ${anomalies.length} 项健康异常（${criticalCount} 项严重，${warningCount} 项警告），健康风险评分 ${riskScore}/100，建议尽快关注并采取改善措施。`
  }

  if (riskScore >= 40) {
    return `检测到 ${anomalies.length} 项健康异常（${warningCount} 项需要注意），健康风险评分 ${riskScore}/100，建议关注异常指标并逐步改善。`
  }

  return `检测到 ${anomalies.length} 项轻微健康异常，健康风险评分 ${riskScore}/100，整体状况良好，建议持续观察。`
}

function generatePriorityActions(anomalies: HealthAnomaly[]): string[] {
  const actions: string[] = []
  const seen = new Set<string>()

  // 优先处理严重异常
  const critical = anomalies.filter(a => a.severity === 'critical')
  for (const a of critical) {
    if (!seen.has(a.suggestedAction)) {
      seen.add(a.suggestedAction)
      actions.push(`[紧急] ${a.suggestedAction}`)
    }
  }

  // 然后处理警告
  const warnings = anomalies.filter(a => a.severity === 'warning')
  for (const a of warnings.slice(0, 3)) {
    if (!seen.has(a.suggestedAction)) {
      seen.add(a.suggestedAction)
      actions.push(`[注意] ${a.suggestedAction}`)
    }
  }

  // 最后处理提示
  const infos = anomalies.filter(a => a.severity === 'info')
  for (const a of infos.slice(0, 2)) {
    if (!seen.has(a.suggestedAction)) {
      seen.add(a.suggestedAction)
      actions.push(`[建议] ${a.suggestedAction}`)
    }
  }

  if (actions.length === 0) {
    actions.push('保持当前健康习惯，无需特殊处理')
  }

  return actions
}

function getMetricLabel(type: BodyMetricType): string {
  const labels: Record<string, string> = {
    sleep: '睡眠', weight: '体重', heart_rate: '心率',
    energy: '精力', mood: '情绪', exercise: '运动',
    water: '饮水', nutrition: '营养', custom: '自定义',
  }
  return labels[type] || type
}

function getMetricUnit(type: BodyMetricType): string {
  const units: Record<string, string> = {
    sleep: '小时', weight: 'kg', heart_rate: 'bpm',
    energy: '级', mood: '分', exercise: '分钟',
    water: 'ml', nutrition: '分', custom: '',
  }
  return units[type] || ''
}

// ============================================================
// 单指标快速检测
// ============================================================

/**
 * 快速检测单个指标是否异常
 * 返回 true 表示可能存在异常
 */
export function quickCheckMetric(
  type: BodyMetricType,
  value: number,
  historicalValues: number[],
  sensitivity: number = 0.5,
): { isAnomaly: boolean; severity: AnomalySeverity; description: string } {
  // 参考范围检查
  const refRange = METRIC_REFERENCE_RANGES[type]
  if (value < refRange[0] || value > refRange[1]) {
    const deviation = value < refRange[0]
      ? (refRange[0] - value) / refRange[0]
      : (value - refRange[1]) / refRange[1]
    if (deviation > 0.3) {
      return {
        isAnomaly: true,
        severity: 'warning',
        description: `${getMetricLabel(type)} ${value}${getMetricUnit(type)} 超出推荐范围`,
      }
    }
  }

  // 历史偏差检查
  if (historicalValues.length >= 5) {
    const mean = historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length
    const variance = historicalValues.reduce((s, v) => s + (v - mean) ** 2, 0) / historicalValues.length
    const stdDev = Math.sqrt(variance)

    if (stdDev > 0) {
      const zScore = Math.abs(value - mean) / stdDev
      const threshold = 2.5 * (1 / (sensitivity + 0.5))

      if (zScore > threshold) {
        return {
          isAnomaly: true,
          severity: zScore > 3.5 ? 'critical' : 'warning',
          description: `${getMetricLabel(type)} ${value}${getMetricUnit(type)} 显著偏离历史均值（Z-score: ${zScore.toFixed(1)}）`,
        }
      }
    }
  }

  return { isAnomaly: false, severity: 'info', description: '' }
}