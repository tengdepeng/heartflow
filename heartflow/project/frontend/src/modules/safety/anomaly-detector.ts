// ============================================================
// 守护室 · 实时异常检测 (P16-15)
// 统计异常检测 + 行为基线 + 滑动窗口分析 + 自适应阈值
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型定义 ----

/** 异常检测维度 */
export type AnomalyDimension =
  | 'login_frequency'
  | 'data_access_volume'
  | 'permission_changes'
  | 'config_modifications'
  | 'api_call_rate'
  | 'error_rate'
  | 'response_time'
  | 'storage_usage'

/** 异常严重程度 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

/** 检测数据点 */
export interface DetectionDataPoint {
  timestamp: string
  dimension: AnomalyDimension
  value: number
  metadata?: Record<string, unknown>
}

/** 异常检测结果 */
export interface AnomalyResult {
  id: string
  dimension: AnomalyDimension
  severity: AnomalySeverity
  detectedAt: string
  value: number
  expectedValue: number
  deviation: number
  zScore: number
  threshold: number
  description: string
  suggestion: string
  isResolved: boolean
  resolvedAt?: string
}

/** 行为基线 */
export interface BehavioralBaseline {
  dimension: AnomalyDimension
  /** 均值 */
  mean: number
  /** 标准差 */
  stdDev: number
  /** 中位数 */
  median: number
  /** 第25百分位 */
  p25: number
  /** 第75百分位 */
  p75: number
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 样本数量 */
  sampleCount: number
  /** 基线计算时间 */
  calculatedAt: string
  /** 数据窗口（小时） */
  windowHours: number
}

/** 滑动窗口配置 */
export interface SlidingWindowConfig {
  /** 窗口大小（数据点数） */
  windowSize: number
  /** 滑动步长 */
  stepSize: number
  /** 最小数据点数 */
  minDataPoints: number
  /** 异常检测灵敏度 (0-1) */
  sensitivity: number
}

/** 检测规则 */
export interface DetectionRule {
  id: string
  dimension: AnomalyDimension
  name: string
  /** 规则类型 */
  type: 'threshold' | 'statistical' | 'pattern' | 'rate'
  /** 阈值（用于threshold类型） */
  threshold?: number
  /** z-score阈值（用于statistical类型） */
  zScoreThreshold?: number
  /** 是否启用 */
  enabled: boolean
  /** 严重程度 */
  severity: AnomalySeverity
  /** 冷却时间（秒） */
  cooldown: number
  /** 上次触发时间 */
  lastTriggered?: number
}

/** 检测统计 */
export interface DetectionStats {
  /** 总检测次数 */
  totalDetections: number
  /** 总异常数 */
  totalAnomalies: number
  /** 异常率 */
  anomalyRate: number
  /** 各维度异常数 */
  byDimension: Record<string, number>
  /** 各严重程度异常数 */
  bySeverity: Record<string, number>
  /** 最近异常 */
  recentAnomalies: AnomalyResult[]
  /** 未解决异常数 */
  unresolvedCount: number
}

// ---- 存储键 ----

const ANOMALIES_KEY = 'hf:safety:anomalies'
const BASELINES_KEY = 'hf:safety:baselines'
const RULES_KEY = 'hf:safety:detection_rules'
const DATA_POINTS_KEY = 'hf:safety:detection_data'
const WINDOW_CONFIG_KEY = 'hf:safety:window_config'

// ---- 维度元数据 ----

export const ANOMALY_DIMENSION_META: Record<AnomalyDimension, {
  label: string
  unit: string
  icon: string
  description: string
}> = {
  login_frequency: { label: '登录频率', unit: '次/小时', icon: '🔑', description: '单位时间内的登录尝试次数' },
  data_access_volume: { label: '数据访问量', unit: '条', icon: '📊', description: '单位时间内的数据访问记录数' },
  permission_changes: { label: '权限变更', unit: '次', icon: '🛡️', description: '权限配置变更次数' },
  config_modifications: { label: '配置修改', unit: '次', icon: '⚙️', description: '系统配置修改次数' },
  api_call_rate: { label: 'API调用率', unit: '次/分钟', icon: '🔗', description: 'API调用频率' },
  error_rate: { label: '错误率', unit: '%', icon: '❌', description: '操作失败率' },
  response_time: { label: '响应时间', unit: 'ms', icon: '⏱️', description: '操作平均响应时间' },
  storage_usage: { label: '存储用量', unit: 'MB', icon: '💾', description: '存储空间使用量' },
}

export const ANOMALY_SEVERITY_META: Record<AnomalySeverity, {
  label: string
  color: string
  icon: string
}> = {
  low: { label: '低', color: '#27ae60', icon: '🟢' },
  medium: { label: '中', color: '#f39c12', icon: '🟡' },
  high: { label: '高', color: '#e67e22', icon: '🟠' },
  critical: { label: '严重', color: '#e74c3c', icon: '🔴' },
}

// ---- 默认规则 ----

const DEFAULT_RULES: DetectionRule[] = [
  {
    id: 'rule_login_spike',
    dimension: 'login_frequency',
    name: '登录频率异常',
    type: 'statistical',
    zScoreThreshold: 3.0,
    enabled: true,
    severity: 'medium',
    cooldown: 300,
  },
  {
    id: 'rule_data_access_surge',
    dimension: 'data_access_volume',
    name: '数据访问量突增',
    type: 'statistical',
    zScoreThreshold: 2.5,
    enabled: true,
    severity: 'high',
    cooldown: 600,
  },
  {
    id: 'rule_permission_anomaly',
    dimension: 'permission_changes',
    name: '权限变更异常',
    type: 'threshold',
    threshold: 5,
    enabled: true,
    severity: 'high',
    cooldown: 300,
  },
  {
    id: 'rule_config_anomaly',
    dimension: 'config_modifications',
    name: '配置修改异常',
    type: 'threshold',
    threshold: 10,
    enabled: true,
    severity: 'medium',
    cooldown: 600,
  },
  {
    id: 'rule_api_rate_spike',
    dimension: 'api_call_rate',
    name: 'API调用率异常',
    type: 'statistical',
    zScoreThreshold: 3.0,
    enabled: true,
    severity: 'medium',
    cooldown: 300,
  },
  {
    id: 'rule_error_rate_high',
    dimension: 'error_rate',
    name: '错误率过高',
    type: 'threshold',
    threshold: 20,
    enabled: true,
    severity: 'high',
    cooldown: 600,
  },
  {
    id: 'rule_response_time_slow',
    dimension: 'response_time',
    name: '响应时间过长',
    type: 'threshold',
    threshold: 5000,
    enabled: true,
    severity: 'medium',
    cooldown: 300,
  },
  {
    id: 'rule_storage_critical',
    dimension: 'storage_usage',
    name: '存储用量告警',
    type: 'threshold',
    threshold: 500,
    enabled: true,
    severity: 'high',
    cooldown: 3600,
  },
]

// ---- 默认窗口配置 ----

const DEFAULT_WINDOW_CONFIG: SlidingWindowConfig = {
  windowSize: 100,
  stepSize: 10,
  minDataPoints: 20,
  sensitivity: 0.7,
}

// ============================================================
// 实时异常检测
// ============================================================

export function useAnomalyDetector() {
  const windowConfig = ref<SlidingWindowConfig>(loadWindowConfig())
  const rules = ref<DetectionRule[]>(loadRules())
  const dataPoints = ref<DetectionDataPoint[]>(loadDataPoints())
  const anomalies = ref<AnomalyResult[]>(loadAnomalies())
  const baselines = ref<Map<AnomalyDimension, BehavioralBaseline>>(new Map(loadBaselines()))

  let detectionCounter = 0

  // ---- 持久化 ----

  function loadWindowConfig(): SlidingWindowConfig {
    return storage.getKV<SlidingWindowConfig>(WINDOW_CONFIG_KEY, DEFAULT_WINDOW_CONFIG)
  }

  function saveWindowConfig() {
    storage.setKV(WINDOW_CONFIG_KEY, windowConfig.value)
  }

  function loadRules(): DetectionRule[] {
    return storage.getKV<DetectionRule[]>(RULES_KEY, DEFAULT_RULES)
  }

  function saveRules() {
    storage.setKV(RULES_KEY, rules.value)
  }

  function loadDataPoints(): DetectionDataPoint[] {
    return storage.getKV<DetectionDataPoint[]>(DATA_POINTS_KEY, [])
  }

  function saveDataPoints() {
    // 限制数据点数量
    const maxPoints = windowConfig.value.windowSize * 5
    if (dataPoints.value.length > maxPoints) {
      dataPoints.value = dataPoints.value.slice(-maxPoints)
    }
    storage.setKV(DATA_POINTS_KEY, dataPoints.value)
  }

  function loadAnomalies(): AnomalyResult[] {
    return storage.getKV<AnomalyResult[]>(ANOMALIES_KEY, [])
  }

  function saveAnomalies() {
    if (anomalies.value.length > 500) {
      anomalies.value = anomalies.value.slice(0, 500)
    }
    storage.setKV(ANOMALIES_KEY, anomalies.value)
  }

  function loadBaselines(): [AnomalyDimension, BehavioralBaseline][] {
    const saved = storage.getKV<Record<string, BehavioralBaseline>>(BASELINES_KEY, {})
    return Object.entries(saved).map(([k, v]) => [k as AnomalyDimension, v])
  }

  function saveBaselines() {
    const obj: Record<string, BehavioralBaseline> = {}
    for (const [k, v] of baselines.value) {
      obj[k] = v
    }
    storage.setKV(BASELINES_KEY, obj)
  }

  // ---- 数据采集 ----

  /** 记录数据点 */
  function recordDataPoint(
    dimension: AnomalyDimension,
    value: number,
    metadata?: Record<string, unknown>,
  ): DetectionDataPoint {
    const point: DetectionDataPoint = {
      timestamp: new Date().toISOString(),
      dimension,
      value,
      metadata,
    }

    dataPoints.value.push(point)
    saveDataPoints()

    // 实时检测
    detectAnomaly(point)

    return point
  }

  /** 批量记录数据点 */
  function recordBatch(
    points: { dimension: AnomalyDimension; value: number; metadata?: Record<string, unknown> }[],
  ): DetectionDataPoint[] {
    const results = points.map(p => {
      const point: DetectionDataPoint = {
        timestamp: new Date().toISOString(),
        dimension: p.dimension,
        value: p.value,
        metadata: p.metadata,
      }
      dataPoints.value.push(point)
      return point
    })

    saveDataPoints()

    // 批量检测
    for (const point of results) {
      detectAnomaly(point)
    }

    return results
  }

  // ---- 基线计算 ----

  /** 计算行为基线 */
  function calculateBaseline(
    dimension: AnomalyDimension,
    windowHours: number = 24,
  ): BehavioralBaseline | null {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - windowHours)
    const cutoffStr = cutoff.toISOString()

    const values = dataPoints.value
      .filter(dp => dp.dimension === dimension && dp.timestamp >= cutoffStr)
      .map(dp => dp.value)
      .sort((a, b) => a - b)

    if (values.length < windowConfig.value.minDataPoints) return null

    const n = values.length
    const mean = values.reduce((s, v) => s + v, 0) / n
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
    const stdDev = Math.sqrt(variance)

    const median = n % 2 === 0
      ? (values[n / 2 - 1] + values[n / 2]) / 2
      : values[Math.floor(n / 2)]

    const p25 = values[Math.floor(n * 0.25)]
    const p75 = values[Math.floor(n * 0.75)]

    const baseline: BehavioralBaseline = {
      dimension,
      mean,
      stdDev,
      median,
      p25,
      p75,
      min: values[0],
      max: values[n - 1],
      sampleCount: n,
      calculatedAt: new Date().toISOString(),
      windowHours,
    }

    baselines.value.set(dimension, baseline)
    saveBaselines()

    return baseline
  }

  /** 计算所有维度的基线 */
  function calculateAllBaselines(windowHours: number = 24): BehavioralBaseline[] {
    const dimensions: AnomalyDimension[] = [
      'login_frequency', 'data_access_volume', 'permission_changes',
      'config_modifications', 'api_call_rate', 'error_rate',
      'response_time', 'storage_usage',
    ]

    return dimensions
      .map(d => calculateBaseline(d, windowHours))
      .filter((b): b is BehavioralBaseline => b !== null)
  }

  /** 更新基线（增量更新） */
  function updateBaseline(newPoint: DetectionDataPoint): void {
    const existing = baselines.value.get(newPoint.dimension)
    if (!existing) {
      calculateBaseline(newPoint.dimension)
      return
    }

    // 使用 Welford 在线算法增量更新均值和方差
    const n = existing.sampleCount + 1
    const delta = newPoint.value - existing.mean
    const newMean = existing.mean + delta / n
    const delta2 = newPoint.value - newMean
    const newVariance = ((existing.sampleCount * existing.stdDev ** 2) + delta * delta2) / n

    // 更新值列表（简化：只保留最近窗口内的值）
    const values = dataPoints.value
      .filter(dp => dp.dimension === newPoint.dimension)
      .map(dp => dp.value)
      .sort((a, b) => a - b)

    const updated: BehavioralBaseline = {
      ...existing,
      mean: newMean,
      stdDev: Math.sqrt(newVariance),
      median: values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)],
      p25: values[Math.floor(values.length * 0.25)],
      p75: values[Math.floor(values.length * 0.75)],
      min: values[0],
      max: values[values.length - 1],
      sampleCount: n,
      calculatedAt: new Date().toISOString(),
    }

    baselines.value.set(newPoint.dimension, updated)
    saveBaselines()
  }

  // ---- 异常检测 ----

  /** 检测单个数据点 */
  function detectAnomaly(point: DetectionDataPoint): AnomalyResult | null {
    detectionCounter++

    const applicableRules = rules.value.filter(
      r => r.dimension === point.dimension && r.enabled
    )

    for (const rule of applicableRules) {
      // 冷却检查
      if (rule.lastTriggered && (Date.now() - rule.lastTriggered) < rule.cooldown * 1000) {
        continue
      }

      let isAnomaly = false
      let severity = rule.severity
      let zScore = 0
      let expectedValue = 0
      let description = ''

      switch (rule.type) {
        case 'threshold': {
          if (rule.threshold !== undefined && point.value > rule.threshold) {
            isAnomaly = true
            expectedValue = rule.threshold
            description = `${ANOMALY_DIMENSION_META[point.dimension].label} 值 ${point.value} 超过阈值 ${rule.threshold}`
          }
          break
        }

        case 'statistical': {
          const baseline = baselines.value.get(point.dimension)
          if (baseline && baseline.stdDev > 0) {
            zScore = Math.abs(point.value - baseline.mean) / baseline.stdDev
            const threshold = rule.zScoreThreshold || 2.5
            if (zScore > threshold) {
              isAnomaly = true
              expectedValue = baseline.mean
              description = `${ANOMALY_DIMENSION_META[point.dimension].label} 偏离基线 ${zScore.toFixed(1)} 个标准差（值: ${point.value}, 均值: ${baseline.mean.toFixed(1)}）`
            }
          }
          break
        }

        case 'pattern': {
          // 模式检测：检查最近N个数据点是否形成异常模式
          const recentPoints = dataPoints.value
            .filter(dp => dp.dimension === point.dimension)
            .slice(-10)

          if (recentPoints.length >= 5) {
            const allIncreasing = recentPoints.every((p, i) => {
              if (i === 0) return true
              return p.value > recentPoints[i - 1].value
            })
            const allDecreasing = recentPoints.every((p, i) => {
              if (i === 0) return true
              return p.value < recentPoints[i - 1].value
            })

            if (allIncreasing || allDecreasing) {
              isAnomaly = true
              description = `${ANOMALY_DIMENSION_META[point.dimension].label} 出现持续${allIncreasing ? '上升' : '下降'}趋势`
            }
          }
          break
        }

        case 'rate': {
          // 变化率检测
          const recentPoints = dataPoints.value
            .filter(dp => dp.dimension === point.dimension)
            .slice(-3)

          if (recentPoints.length >= 2) {
            const prev = recentPoints[recentPoints.length - 2]
            if (prev.value > 0) {
              const changeRate = Math.abs(point.value - prev.value) / prev.value
              const sensitivity = windowConfig.value.sensitivity
              if (changeRate > sensitivity * 2) {
                isAnomaly = true
                description = `${ANOMALY_DIMENSION_META[point.dimension].label} 变化率 ${(changeRate * 100).toFixed(0)}% 超过阈值`
              }
            }
          }
          break
        }
      }

      if (isAnomaly) {
        rule.lastTriggered = Date.now()
        saveRules()

        // 根据z-score调整严重程度
        if (zScore > 5) severity = 'critical'
        else if (zScore > 4) severity = 'high'
        else if (zScore > 3) severity = 'medium'

        const anomaly: AnomalyResult = {
          id: `anomaly_${Date.now()}_${detectionCounter}`,
          dimension: point.dimension,
          severity,
          detectedAt: new Date().toISOString(),
          value: point.value,
          expectedValue,
          deviation: point.value - expectedValue,
          zScore: Math.round(zScore * 100) / 100,
          threshold: rule.zScoreThreshold || rule.threshold || 0,
          description,
          suggestion: generateSuggestion(point.dimension, severity),
          isResolved: false,
        }

        anomalies.value.unshift(anomaly)
        saveAnomalies()

        return anomaly
      }
    }

    // 无异常，更新基线
    updateBaseline(point)
    return null
  }

  /** 滑动窗口批量检测 */
  function slidingWindowDetection(
    dimension: AnomalyDimension,
  ): AnomalyResult[] {
    const points = dataPoints.value
      .filter(dp => dp.dimension === dimension)
      .slice(-windowConfig.value.windowSize)

    const results: AnomalyResult[] = []
    for (const point of points) {
      const result = detectAnomaly(point)
      if (result) results.push(result)
    }

    return results
  }

  /** 全维度检测 */
  function runFullDetection(): AnomalyResult[] {
    const dimensions: AnomalyDimension[] = [
      'login_frequency', 'data_access_volume', 'permission_changes',
      'config_modifications', 'api_call_rate', 'error_rate',
      'response_time', 'storage_usage',
    ]

    const results: AnomalyResult[] = []
    for (const dim of dimensions) {
      results.push(...slidingWindowDetection(dim))
    }

    return results
  }

  // ---- 建议生成 ----

  function generateSuggestion(dimension: AnomalyDimension, severity: AnomalySeverity): string {
    const suggestions: Record<AnomalyDimension, Record<AnomalySeverity, string>> = {
      login_frequency: {
        low: '登录频率略有波动，建议持续观察',
        medium: '登录频率异常，建议检查是否为正常用户行为',
        high: '登录频率显著异常，建议启用额外验证措施',
        critical: '检测到可能的暴力破解攻击，建议立即限制登录',
      },
      data_access_volume: {
        low: '数据访问量轻微波动',
        medium: '数据访问量异常，建议检查访问来源',
        high: '数据访问量显著异常，建议审查访问日志',
        critical: '检测到数据泄露风险，建议立即限制数据访问',
      },
      permission_changes: {
        low: '权限变更轻微增加',
        medium: '权限变更频繁，建议审查变更记录',
        high: '权限变更异常，建议锁定权限配置',
        critical: '检测到权限滥用风险，建议立即审查所有权限',
      },
      config_modifications: {
        low: '配置修改轻微增加',
        medium: '配置修改频繁，建议审查修改内容',
        high: '配置修改异常，建议回滚最近变更',
        critical: '检测到配置篡改风险，建议立即恢复安全配置',
      },
      api_call_rate: {
        low: 'API调用率轻微波动',
        medium: 'API调用率异常，建议检查调用来源',
        high: 'API调用率显著异常，建议启用限流',
        critical: '检测到API滥用，建议立即限流并审查',
      },
      error_rate: {
        low: '错误率轻微上升',
        medium: '错误率异常，建议检查系统日志',
        high: '错误率显著上升，建议排查系统问题',
        critical: '系统错误率极高，建议立即进行故障排查',
      },
      response_time: {
        low: '响应时间轻微增加',
        medium: '响应时间异常，建议检查系统负载',
        high: '响应时间显著增加，建议优化性能',
        critical: '系统响应严重延迟，建议立即扩容或限流',
      },
      storage_usage: {
        low: '存储使用量轻微增加',
        medium: '存储使用量增长较快，建议清理旧数据',
        high: '存储使用量接近上限，建议立即清理或扩容',
        critical: '存储空间严重不足，建议立即清理并扩容',
      },
    }

    return suggestions[dimension]?.[severity] || '建议检查系统状态'
  }

  // ---- 查询与统计 ----

  /** 获取检测统计 */
  function getDetectionStats(): DetectionStats {
    const total = dataPoints.value.length
    const anomalyCount = anomalies.value.length
    const unresolved = anomalies.value.filter(a => !a.isResolved)

    const byDimension: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}

    for (const a of anomalies.value) {
      byDimension[a.dimension] = (byDimension[a.dimension] || 0) + 1
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1
    }

    return {
      totalDetections: total,
      totalAnomalies: anomalyCount,
      anomalyRate: total > 0 ? Math.round((anomalyCount / total) * 1000) / 10 : 0,
      byDimension,
      bySeverity,
      recentAnomalies: anomalies.value.slice(0, 20),
      unresolvedCount: unresolved.length,
    }
  }

  /** 获取指定维度的数据点 */
  function getDataPointsByDimension(
    dimension: AnomalyDimension,
    limit?: number,
  ): DetectionDataPoint[] {
    const filtered = dataPoints.value.filter(dp => dp.dimension === dimension)
    return limit ? filtered.slice(-limit) : filtered
  }

  /** 获取指定维度的异常 */
  function getAnomaliesByDimension(
    dimension: AnomalyDimension,
    onlyUnresolved: boolean = false,
  ): AnomalyResult[] {
    return anomalies.value.filter(a =>
      a.dimension === dimension && (!onlyUnresolved || !a.isResolved)
    )
  }

  /** 解决异常 */
  function resolveAnomaly(anomalyId: string): boolean {
    const anomaly = anomalies.value.find(a => a.id === anomalyId)
    if (!anomaly) return false

    anomaly.isResolved = true
    anomaly.resolvedAt = new Date().toISOString()
    saveAnomalies()
    return true
  }

  /** 获取未解决的严重异常 */
  function getCriticalAnomalies(): AnomalyResult[] {
    return anomalies.value.filter(
      a => !a.isResolved && (a.severity === 'critical' || a.severity === 'high')
    )
  }

  // ---- 规则管理 ----

  /** 更新规则 */
  function updateRule(ruleId: string, updates: Partial<DetectionRule>) {
    const idx = rules.value.findIndex(r => r.id === ruleId)
    if (idx >= 0) {
      rules.value[idx] = { ...rules.value[idx], ...updates }
      saveRules()
    }
  }

  /** 切换规则启用状态 */
  function toggleRule(ruleId: string, enabled: boolean) {
    updateRule(ruleId, { enabled })
  }

  /** 重置规则 */
  function resetRules() {
    rules.value = DEFAULT_RULES.map(r => ({ ...r }))
    saveRules()
  }

  /** 更新窗口配置 */
  function updateWindowConfig(partial: Partial<SlidingWindowConfig>) {
    windowConfig.value = { ...windowConfig.value, ...partial }
    saveWindowConfig()
  }

  /** 清除旧数据 */
  function purgeOldData(beforeDays: number): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - beforeDays)
    const cutoffStr = cutoff.toISOString()

    const before = dataPoints.value.length
    dataPoints.value = dataPoints.value.filter(dp => dp.timestamp >= cutoffStr)
    saveDataPoints()

    const anomaliesBefore = anomalies.value.length
    anomalies.value = anomalies.value.filter(a => {
      if (a.isResolved && a.resolvedAt && a.resolvedAt < cutoffStr) return false
      return true
    })
    saveAnomalies()

    return (before - dataPoints.value.length) + (anomaliesBefore - anomalies.value.length)
  }

  // ---- 响应式计算 ----

  const unresolvedAnomalies = computed(() =>
    anomalies.value.filter(a => !a.isResolved)
  )

  const criticalUnresolved = computed(() =>
    unresolvedAnomalies.value.filter(a => a.severity === 'critical')
  )

  const stats = computed(() => getDetectionStats())

  return {
    // 状态
    windowConfig,
    rules,
    dataPoints,
    anomalies,
    baselines,
    unresolvedAnomalies,
    criticalUnresolved,
    stats,

    // 数据采集
    recordDataPoint,
    recordBatch,

    // 基线
    calculateBaseline,
    calculateAllBaselines,
    updateBaseline,

    // 检测
    detectAnomaly,
    slidingWindowDetection,
    runFullDetection,

    // 查询
    getDetectionStats,
    getDataPointsByDimension,
    getAnomaliesByDimension,
    getCriticalAnomalies,
    resolveAnomaly,

    // 管理
    updateRule,
    toggleRule,
    resetRules,
    updateWindowConfig,
    purgeOldData,
  }
}

// ---- 存储键 ----

export const ANOMALY_DETECTOR_STORAGE_KEYS = {
  ANOMALIES: ANOMALIES_KEY,
  BASELINES: BASELINES_KEY,
  RULES: RULES_KEY,
  DATA_POINTS: DATA_POINTS_KEY,
  WINDOW_CONFIG: WINDOW_CONFIG_KEY,
} as const