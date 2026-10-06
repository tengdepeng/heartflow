// ============================================================
// 心流工坊 · 空间健康度监控
// 监控所有功能空间的健康指标
// 包括：性能指标、依赖校验、错误追踪、健康评分、智能告警
// ============================================================

import { ref, computed } from 'vue'
import { getAllRooms } from '../../engine/room-graph'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 健康等级 */
export type HealthLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

/** 健康指标类型 */
export type HealthMetricType =
  | 'performance'   // 性能
  | 'dependency'    // 依赖
  | 'error'         // 错误
  | 'usage'         // 使用率
  | 'stability'     // 稳定性
  | 'accessibility' // 可访问性

/** 健康指标 */
export interface HealthMetric {
  /** 指标名称 */
  name: string
  /** 指标类型 */
  type: HealthMetricType
  /** 当前值 */
  value: number
  /** 目标值 */
  target: number
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 权重（0-1） */
  weight: number
  /** 单位 */
  unit: string
  /** 是否为越高越好 */
  higherIsBetter: boolean
  /** 最后更新时间 */
  lastUpdated: string
}

/** 空间健康报告 */
export interface SpaceHealthReport {
  /** 空间ID */
  spaceId: string
  /** 健康等级 */
  level: HealthLevel
  /** 健康分数（0-100） */
  score: number
  /** 各项指标 */
  metrics: HealthMetric[]
  /** 活跃问题 */
  activeIssues: HealthIssue[]
  /** 报告时间 */
  reportedAt: string
  /** 上次报告时间 */
  lastReportedAt?: string
  /** 分数变化 */
  scoreDelta?: number
}

/** 健康问题 */
export interface HealthIssue {
  /** 问题ID */
  id: string
  /** 问题类型 */
  type: HealthMetricType
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** 问题描述 */
  description: string
  /** 建议措施 */
  suggestion: string
  /** 发现时间 */
  detectedAt: string
  /** 是否已解决 */
  resolved: boolean
  /** 解决时间 */
  resolvedAt?: string
}

/** 性能快照 */
export interface PerformanceSnapshot {
  /** 快照ID */
  id: string
  /** 空间ID */
  spaceId: string
  /** 快照时间 */
  timestamp: string
  /** 加载时间（毫秒） */
  loadTimeMs: number
  /** 渲染时间（毫秒） */
  renderTimeMs: number
  /** 内存使用（MB） */
  memoryUsageMB: number
  /** 组件数量 */
  componentCount: number
  /** 事件监听器数量 */
  listenerCount: number
  /** FPS */
  fps: number
}

/** 依赖校验结果 */
export interface DependencyValidationResult {
  spaceId: string
  /** 依赖是否满足 */
  satisfied: boolean
  /** 缺失的依赖 */
  missingDeps: string[]
  /** 循环依赖 */
  circularDeps: string[][]
  /** 版本不匹配 */
  versionMismatches: Array<{ dep: string; expected: string; actual: string }>
}

/** 错误追踪条目 */
export interface ErrorTrackingEntry {
  /** 错误ID */
  id: string
  /** 空间ID */
  spaceId: string
  /** 错误消息 */
  message: string
  /** 错误堆栈 */
  stack?: string
  /** 错误类型 */
  type: 'runtime' | 'network' | 'render' | 'data' | 'unknown'
  /** 发生时间 */
  timestamp: string
  /** 发生次数 */
  count: number
  /** 是否已解决 */
  resolved: boolean
}

/** 健康告警 */
export interface HealthAlert {
  /** 告警ID */
  id: string
  /** 告警等级 */
  level: 'info' | 'warning' | 'error' | 'critical'
  /** 告警标题 */
  title: string
  /** 告警描述 */
  description: string
  /** 关联空间 */
  spaceId?: string
  /** 触发时间 */
  triggeredAt: string
  /** 是否已读 */
  isRead: boolean
  /** 是否已解除 */
  isResolved: boolean
}

// ============================================================
// 常量
// ============================================================

const STORAGE_KEYS = {
  healthReports: 'hf_space_health_reports',
  healthIssues: 'hf_space_health_issues',
  performanceSnapshots: 'hf_perf_snapshots',
  errorTracking: 'hf_error_tracking',
  healthAlerts: 'hf_health_alerts',
} as const

/** 健康等级配置 */
export const HEALTH_LEVELS: Record<HealthLevel, { label: string; color: string; minScore: number; maxScore: number }> = {
  excellent: { label: '优秀', color: '#34d399', minScore: 90, maxScore: 100 },
  good: { label: '良好', color: '#6b9fc4', minScore: 75, maxScore: 89 },
  fair: { label: '一般', color: '#f0c040', minScore: 60, maxScore: 74 },
  poor: { label: '较差', color: '#f59e6c', minScore: 40, maxScore: 59 },
  critical: { label: '危急', color: '#ef4444', minScore: 0, maxScore: 39 },
}

/** 默认健康指标权重 */
const DEFAULT_METRIC_WEIGHTS: Record<HealthMetricType, number> = {
  performance: 0.25,
  dependency: 0.20,
  error: 0.25,
  usage: 0.15,
  stability: 0.10,
  accessibility: 0.05,
}

/** 性能阈值 */
const PERF_THRESHOLDS = {
  loadTimeMs: { excellent: 500, good: 1000, fair: 2000, poor: 4000 },
  renderTimeMs: { excellent: 100, good: 300, fair: 600, poor: 1000 },
  memoryUsageMB: { excellent: 50, good: 100, fair: 200, poor: 400 },
  fps: { excellent: 55, good: 45, fair: 30, poor: 15 },
}

// ============================================================
// 工具函数
// ============================================================

/** 根据分数计算健康等级 */
function scoreToLevel(score: number): HealthLevel {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'fair'
  if (score >= 40) return 'poor'
  return 'critical'
}

/** 根据阈值和指标值计算分数 */
function thresholdToScore(value: number, thresholds: Record<string, number>, higherIsBetter: boolean): number {
  const levels = ['excellent', 'good', 'fair', 'poor']
  for (let i = 0; i < levels.length; i++) {
    const threshold = thresholds[levels[i]]
    if (higherIsBetter ? value >= threshold : value <= threshold) {
      // 在阈值区间内线性插值
      const prevThreshold = i > 0 ? thresholds[levels[i - 1]] : (higherIsBetter ? Infinity : 0)
      const minScore = i === 0 ? 90 : i === 1 ? 75 : i === 2 ? 60 : 40
      const maxScore = i === 0 ? 100 : i === 1 ? 90 : i === 2 ? 75 : 60
      const ratio = higherIsBetter
        ? (value - threshold) / (prevThreshold - threshold)
        : (threshold - value) / (threshold - prevThreshold)
      return Math.round(minScore + ratio * (maxScore - minScore))
    }
  }
  return higherIsBetter ? 0 : 100
}

/** 生成唯一ID */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ============================================================
// 可组合函数
// ============================================================

export function useSpaceHealth() {
  // ---- 状态 ----
  const healthReports = ref<Record<string, SpaceHealthReport>>(
    storage.getKV<Record<string, SpaceHealthReport>>(STORAGE_KEYS.healthReports, {}),
  )
  const healthIssues = ref<HealthIssue[]>(
    storage.getKV<HealthIssue[]>(STORAGE_KEYS.healthIssues, []),
  )
  const performanceSnapshots = ref<PerformanceSnapshot[]>(
    storage.getKV<PerformanceSnapshot[]>(STORAGE_KEYS.performanceSnapshots, []),
  )
  const errorTracking = ref<ErrorTrackingEntry[]>(
    storage.getKV<ErrorTrackingEntry[]>(STORAGE_KEYS.errorTracking, []),
  )
  const healthAlerts = ref<HealthAlert[]>(
    storage.getKV<HealthAlert[]>(STORAGE_KEYS.healthAlerts, []),
  )

  // ---- 健康报告 ----

  /** 为空间生成健康报告 */
  function generateHealthReport(spaceId: string): SpaceHealthReport {
    const previous = healthReports.value[spaceId]

    const metrics = generateMetrics(spaceId)
    const score = calculateScore(metrics)
    const level = scoreToLevel(score)
    const spaceIssues = healthIssues.value.filter(i => !i.resolved)

    const report: SpaceHealthReport = {
      spaceId,
      level,
      score,
      metrics,
      activeIssues: spaceIssues,
      reportedAt: new Date().toISOString(),
      lastReportedAt: previous?.reportedAt,
      scoreDelta: previous ? score - previous.score : undefined,
    }

    healthReports.value[spaceId] = report
    persist()

    // 检查是否需要告警
    checkAlertConditions(report)

    return report
  }

  /** 批量生成所有空间健康报告 */
  function generateAllReports(): SpaceHealthReport[] {
    const rooms = getAllRooms()
    return rooms.map(room => generateHealthReport(room.id))
  }

  /** 获取空间健康报告 */
  function getHealthReport(spaceId: string): SpaceHealthReport | undefined {
    return healthReports.value[spaceId]
  }

  /** 获取所有健康报告 */
  function getAllReports(): SpaceHealthReport[] {
    return Object.values(healthReports.value)
  }

  // ---- 指标生成 ----

  /** 生成空间的健康指标 */
  function generateMetrics(spaceId: string): HealthMetric[] {
    const now = new Date().toISOString()
    const snapshots = performanceSnapshots.value.filter(s => s.spaceId === spaceId)
    const errors = errorTracking.value.filter(e => e.spaceId === spaceId && !e.resolved)

    // 性能指标
    const recentSnapshots = snapshots.slice(-10)
    const avgLoadTime = recentSnapshots.length > 0
      ? recentSnapshots.reduce((s, n) => s + n.loadTimeMs, 0) / recentSnapshots.length
      : 0
    const avgRenderTime = recentSnapshots.length > 0
      ? recentSnapshots.reduce((s, n) => s + n.renderTimeMs, 0) / recentSnapshots.length
      : 0
    const avgMemory = recentSnapshots.length > 0
      ? recentSnapshots.reduce((s, n) => s + n.memoryUsageMB, 0) / recentSnapshots.length
      : 0
    const avgFps = recentSnapshots.length > 0
      ? recentSnapshots.reduce((s, n) => s + n.fps, 0) / recentSnapshots.length
      : 60

    // 依赖指标
    const depResult = validateDependencies(spaceId)
    const depScore = depResult.satisfied ? 100 : depResult.missingDeps.length === 0 ? 80 : 50

    // 错误指标
    const errorRate = errors.length > 0 ? Math.min(errors.length, 10) * 10 : 0

    return [
      {
        name: '加载时间',
        type: 'performance',
        value: Math.round(avgLoadTime),
        target: 500,
        min: 0,
        max: 10000,
        weight: DEFAULT_METRIC_WEIGHTS.performance,
        unit: 'ms',
        higherIsBetter: false,
        lastUpdated: now,
      },
      {
        name: '渲染时间',
        type: 'performance',
        value: Math.round(avgRenderTime),
        target: 100,
        min: 0,
        max: 5000,
        weight: DEFAULT_METRIC_WEIGHTS.performance * 0.5,
        unit: 'ms',
        higherIsBetter: false,
        lastUpdated: now,
      },
      {
        name: '内存使用',
        type: 'performance',
        value: Math.round(avgMemory),
        target: 50,
        min: 0,
        max: 1000,
        weight: DEFAULT_METRIC_WEIGHTS.performance * 0.3,
        unit: 'MB',
        higherIsBetter: false,
        lastUpdated: now,
      },
      {
        name: '帧率',
        type: 'performance',
        value: Math.round(avgFps),
        target: 60,
        min: 0,
        max: 120,
        weight: DEFAULT_METRIC_WEIGHTS.performance * 0.2,
        unit: 'fps',
        higherIsBetter: true,
        lastUpdated: now,
      },
      {
        name: '依赖健康度',
        type: 'dependency',
        value: depScore,
        target: 100,
        min: 0,
        max: 100,
        weight: DEFAULT_METRIC_WEIGHTS.dependency,
        unit: '%',
        higherIsBetter: true,
        lastUpdated: now,
      },
      {
        name: '错误率',
        type: 'error',
        value: 100 - errorRate,
        target: 100,
        min: 0,
        max: 100,
        weight: DEFAULT_METRIC_WEIGHTS.error,
        unit: '%',
        higherIsBetter: true,
        lastUpdated: now,
      },
      {
        name: '稳定性',
        type: 'stability',
        value: snapshots.length > 0 ? 100 : 80,
        target: 100,
        min: 0,
        max: 100,
        weight: DEFAULT_METRIC_WEIGHTS.stability,
        unit: '%',
        higherIsBetter: true,
        lastUpdated: now,
      },
      {
        name: '可访问性',
        type: 'accessibility',
        value: 100,
        target: 100,
        min: 0,
        max: 100,
        weight: DEFAULT_METRIC_WEIGHTS.accessibility,
        unit: '%',
        higherIsBetter: true,
        lastUpdated: now,
      },
    ]
  }

  /** 计算综合健康分数 */
  function calculateScore(metrics: HealthMetric[]): number {
    let totalWeight = 0
    let weightedScore = 0

    for (const metric of metrics) {
      totalWeight += metric.weight
      const score = thresholdToScore(metric.value, getThresholdsForMetric(metric.name), metric.higherIsBetter)
      weightedScore += score * metric.weight
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100
  }

  function getThresholdsForMetric(name: string): Record<string, number> {
    switch (name) {
      case '加载时间': return PERF_THRESHOLDS.loadTimeMs
      case '渲染时间': return PERF_THRESHOLDS.renderTimeMs
      case '内存使用': return PERF_THRESHOLDS.memoryUsageMB
      case '帧率': return PERF_THRESHOLDS.fps
      default: return { excellent: 90, good: 75, fair: 60, poor: 40 }
    }
  }

  // ---- 依赖校验 ----

  /** 校验空间依赖 */
  function validateDependencies(spaceId: string): DependencyValidationResult {
    const room = getAllRooms().find(r => r.id === spaceId)
    if (!room) {
      return {
        spaceId,
        satisfied: false,
        missingDeps: [spaceId],
        circularDeps: [],
        versionMismatches: [],
      }
    }

    const missingDeps: string[] = []
    const visited = new Set<string>()
    const inStack = new Set<string>()
    const circularDeps: string[][] = []

    function detectCycles(id: string, path: string[]): void {
      if (inStack.has(id)) {
        const cycleStart = path.indexOf(id)
        circularDeps.push([...path.slice(cycleStart), id])
        return
      }
      if (visited.has(id)) return

      visited.add(id)
      inStack.add(id)
      path.push(id)

      const node = getAllRooms().find(r => r.id === id)
      if (node) {
        for (const adjId of node.adjacentTo) {
          detectCycles(adjId, [...path])
        }
      }

      inStack.delete(id)
    }

    detectCycles(spaceId, [])

    // 检查邻接依赖
    for (const adjId of room.adjacentTo) {
      const adjRoom = getAllRooms().find(r => r.id === adjId)
      if (!adjRoom) {
        missingDeps.push(adjId)
      }
    }

    return {
      spaceId,
      satisfied: missingDeps.length === 0 && circularDeps.length === 0,
      missingDeps,
      circularDeps,
      versionMismatches: [],
    }
  }

  // ---- 性能快照 ----

  /** 记录性能快照 */
  function recordPerformanceSnapshot(snapshot: Omit<PerformanceSnapshot, 'id'>): PerformanceSnapshot {
    const full: PerformanceSnapshot = {
      ...snapshot,
      id: generateId('perf'),
    }
    performanceSnapshots.value.push(full)

    // 只保留最近 500 条
    if (performanceSnapshots.value.length > 500) {
      performanceSnapshots.value = performanceSnapshots.value.slice(-500)
    }

    persist()
    return full
  }

  /** 获取空间的性能快照 */
  function getPerformanceSnapshots(spaceId: string, limit = 20): PerformanceSnapshot[] {
    return performanceSnapshots.value
      .filter(s => s.spaceId === spaceId)
      .slice(-limit)
  }

  /** 获取性能趋势 */
  function getPerformanceTrend(spaceId: string, metric: keyof PerformanceSnapshot, window = 20): number[] {
    return performanceSnapshots.value
      .filter(s => s.spaceId === spaceId)
      .slice(-window)
      .map(s => s[metric] as number)
  }

  // ---- 错误追踪 ----

  /** 记录错误 */
  function trackError(
    spaceId: string,
    message: string,
    options: { stack?: string; type?: ErrorTrackingEntry['type'] } = {},
  ): ErrorTrackingEntry {
    // 查找相同错误
    const existing = errorTracking.value.find(
      e => e.spaceId === spaceId && e.message === message && !e.resolved,
    )

    if (existing) {
      existing.count++
      existing.timestamp = new Date().toISOString()
      persist()
      return existing
    }

    const entry: ErrorTrackingEntry = {
      id: generateId('err'),
      spaceId,
      message,
      stack: options.stack,
      type: options.type ?? 'unknown',
      timestamp: new Date().toISOString(),
      count: 1,
      resolved: false,
    }

    errorTracking.value.push(entry)

    // 只保留最近 200 条
    if (errorTracking.value.length > 200) {
      errorTracking.value = errorTracking.value.slice(-200)
    }

    // 创建健康问题
    createIssue({
      type: 'error',
      severity: 'medium',
      description: `错误: ${message}`,
      suggestion: '请检查相关功能并修复',
      detectedAt: entry.timestamp,
    })

    persist()
    return entry
  }

  /** 解决错误 */
  function resolveError(errorId: string): boolean {
    const entry = errorTracking.value.find(e => e.id === errorId)
    if (!entry) return false
    entry.resolved = true
    persist()
    return true
  }

  /** 获取空间错误 */
  function getSpaceErrors(spaceId: string): ErrorTrackingEntry[] {
    return errorTracking.value.filter(e => e.spaceId === spaceId && !e.resolved)
  }

  // ---- 健康问题 ----

  /** 创建健康问题 */
  function createIssue(
    issue: Omit<HealthIssue, 'id' | 'resolved' | 'resolvedAt'>,
  ): HealthIssue {
    const full: HealthIssue = {
      ...issue,
      id: generateId('issue'),
      resolved: false,
    }
    healthIssues.value.push(full)

    // 只保留最近 100 条
    if (healthIssues.value.length > 100) {
      healthIssues.value = healthIssues.value.slice(-100)
    }

    persist()
    return full
  }

  /** 解决问题 */
  function resolveIssue(issueId: string): boolean {
    const issue = healthIssues.value.find(i => i.id === issueId)
    if (!issue) return false
    issue.resolved = true
    issue.resolvedAt = new Date().toISOString()
    persist()
    return true
  }

  /** 获取活跃问题 */
  const activeIssues = computed<HealthIssue[]>(() => {
    return healthIssues.value.filter(i => !i.resolved)
  })

  // ---- 告警 ----

  /** 检查告警条件 */
  function checkAlertConditions(report: SpaceHealthReport): void {
    if (report.level === 'critical') {
      createAlert({
        level: 'critical',
        title: `空间健康度危急: ${report.spaceId}`,
        description: `健康分数 ${report.score}，请立即检查`,
        spaceId: report.spaceId,
      })
    } else if (report.level === 'poor') {
      createAlert({
        level: 'error',
        title: `空间健康度较差: ${report.spaceId}`,
        description: `健康分数 ${report.score}，建议尽快优化`,
        spaceId: report.spaceId,
      })
    } else if (report.scoreDelta !== undefined && report.scoreDelta < -10) {
      createAlert({
        level: 'warning',
        title: `空间健康度下降: ${report.spaceId}`,
        description: `健康分数下降 ${Math.abs(report.scoreDelta)} 分`,
        spaceId: report.spaceId,
      })
    }
  }

  /** 创建告警 */
  function createAlert(
    alert: Omit<HealthAlert, 'id' | 'triggeredAt' | 'isRead' | 'isResolved'>,
  ): HealthAlert {
    const full: HealthAlert = {
      ...alert,
      id: generateId('alert'),
      triggeredAt: new Date().toISOString(),
      isRead: false,
      isResolved: false,
    }
    healthAlerts.value.push(full)

    // 只保留最近 50 条
    if (healthAlerts.value.length > 50) {
      healthAlerts.value = healthAlerts.value.slice(-50)
    }

    persist()
    return full
  }

  /** 标记告警已读 */
  function markAlertRead(alertId: string): boolean {
    const alert = healthAlerts.value.find(a => a.id === alertId)
    if (!alert) return false
    alert.isRead = true
    persist()
    return true
  }

  /** 解除告警 */
  function resolveAlert(alertId: string): boolean {
    const alert = healthAlerts.value.find(a => a.id === alertId)
    if (!alert) return false
    alert.isResolved = true
    persist()
    return true
  }

  /** 未读告警 */
  const unreadAlerts = computed<HealthAlert[]>(() => {
    return healthAlerts.value.filter(a => !a.isRead && !a.isResolved)
  })

  // ---- 统计 ----

  /** 整体健康概览 */
  const healthOverview = computed(() => {
    const reports = Object.values(healthReports.value)
    if (reports.length === 0) return null

    const avgScore = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)
    const levelCounts: Record<HealthLevel, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0,
    }
    for (const r of reports) {
      levelCounts[r.level]++
    }

    return {
      avgScore,
      totalSpaces: reports.length,
      levelCounts,
      activeIssueCount: activeIssues.value.length,
      unreadAlertCount: unreadAlerts.value.length,
      totalErrors: errorTracking.value.filter(e => !e.resolved).length,
      worstSpace: [...reports].sort((a, b) => a.score - b.score)[0],
      bestSpace: [...reports].sort((a, b) => b.score - a.score)[0],
    }
  })

  /** 错误趋势 */
  const errorTrend = computed<Array<{ date: string; count: number }>>(() => {
    const trend: Record<string, number> = {}
    for (const err of errorTracking.value) {
      const date = getLocalDateKey(new Date(err.timestamp))
      trend[date] = (trend[date] || 0) + 1
    }
    return Object.entries(trend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
  })

  // ---- 清理 ----

  /** 清理旧数据 */
  function cleanup(daysToKeep = 30): { removed: number } {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString()

    const beforeSnapshots = performanceSnapshots.value.length
    performanceSnapshots.value = performanceSnapshots.value.filter(s => s.timestamp >= cutoff)
    const removedSnapshots = beforeSnapshots - performanceSnapshots.value.length

    const beforeErrors = errorTracking.value.length
    errorTracking.value = errorTracking.value.filter(e => e.timestamp >= cutoff || !e.resolved)
    const removedErrors = beforeErrors - errorTracking.value.length

    persist()
    return { removed: removedSnapshots + removedErrors }
  }

  /** 清除所有已解决数据 */
  function clearResolved(): { issues: number; errors: number; alerts: number } {
    const issuesBefore = healthIssues.value.length
    healthIssues.value = healthIssues.value.filter(i => !i.resolved)
    const removedIssues = issuesBefore - healthIssues.value.length

    const errorsBefore = errorTracking.value.length
    errorTracking.value = errorTracking.value.filter(e => !e.resolved)
    const removedErrors = errorsBefore - errorTracking.value.length

    const alertsBefore = healthAlerts.value.length
    healthAlerts.value = healthAlerts.value.filter(a => !a.isResolved)
    const removedAlerts = alertsBefore - healthAlerts.value.length

    persist()
    return { issues: removedIssues, errors: removedErrors, alerts: removedAlerts }
  }

  // ---- 重置 ----

  function reset(): void {
    healthReports.value = {}
    healthIssues.value = []
    performanceSnapshots.value = []
    errorTracking.value = []
    healthAlerts.value = []
    persist()
  }

  // ---- 持久化 ----

  function persist(): void {
    storage.setKV(STORAGE_KEYS.healthReports, healthReports.value)
    storage.setKV(STORAGE_KEYS.healthIssues, healthIssues.value)
    storage.setKV(STORAGE_KEYS.performanceSnapshots, performanceSnapshots.value)
    storage.setKV(STORAGE_KEYS.errorTracking, errorTracking.value)
    storage.setKV(STORAGE_KEYS.healthAlerts, healthAlerts.value)
  }

  return {
    // 状态
    healthReports,
    healthIssues,
    performanceSnapshots,
    errorTracking,
    healthAlerts,

    // 计算属性
    activeIssues,
    unreadAlerts,
    healthOverview,
    errorTrend,

    // 健康报告
    generateHealthReport,
    generateAllReports,
    getHealthReport,
    getAllReports,

    // 依赖校验
    validateDependencies,

    // 性能快照
    recordPerformanceSnapshot,
    getPerformanceSnapshots,
    getPerformanceTrend,

    // 错误追踪
    trackError,
    resolveError,
    getSpaceErrors,

    // 问题管理
    createIssue,
    resolveIssue,

    // 告警
    createAlert,
    markAlertRead,
    resolveAlert,

    // 清理
    cleanup,
    clearResolved,

    // 管理
    reset,
    persist,
  }
}