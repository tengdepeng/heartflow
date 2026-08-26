// ============================================================
// 守护室 · 审计时间线可视化 (P16-15)
// 审计事件时间线、聚合分析、趋势检测、导出能力
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { AuditLogEntry } from './incident-response'

// ---- 类型定义 ----

/** 时间线事件（增强版审计条目） */
export interface TimelineEvent {
  /** 审计日志原始条目 */
  entry: AuditLogEntry
  /** 事件分组标签 */
  group: string
  /** 事件严重程度 */
  severity: 'info' | 'warning' | 'danger' | 'critical'
  /** 是否异常 */
  isAnomaly: boolean
  /** 关联事件ID列表 */
  relatedEventIds: string[]
}

/** 时间线分段 */
export interface TimelineSegment {
  /** 分段标识 */
  id: string
  /** 时间标签 */
  label: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 该时间段内的事件 */
  events: TimelineEvent[]
  /** 事件计数 */
  eventCount: number
  /** 成功率 */
  successRate: number
  /** 是否有高危事件 */
  hasCriticalEvents: boolean
}

/** 事件聚合 */
export interface EventAggregation {
  /** 聚合维度 */
  dimension: 'action' | 'actor' | 'result' | 'hour' | 'day'
  /** 聚合键 */
  key: string
  /** 标签 */
  label: string
  /** 计数 */
  count: number
  /** 占比 */
  percentage: number
  /** 子聚合 */
  children?: EventAggregation[]
}

/** 趋势分析 */
export interface TrendAnalysis {
  /** 时间序列数据点 */
  dataPoints: TrendDataPoint[]
  /** 趋势方向 */
  direction: 'rising' | 'falling' | 'stable'
  /** 变化率（百分比） */
  changeRate: number
  /** 异常点 */
  anomalies: TrendAnomaly[]
}

export interface TrendDataPoint {
  timestamp: string
  label: string
  total: number
  success: number
  failure: number
  blocked: number
  /** 该时间段的事件类型分布 */
  typeDistribution: Record<string, number>
}

export interface TrendAnomaly {
  timestamp: string
  label: string
  type: 'spike' | 'drop' | 'pattern_change'
  description: string
  deviationScore: number
}

/** 热力图数据 */
export interface HeatmapData {
  /** 行标签（日期） */
  rows: string[]
  /** 列标签（小时） */
  columns: string[]
  /** 数据矩阵 [row][col] = count */
  data: number[][]
  /** 最大值 */
  maxValue: number
  /** 最小值 */
  minValue: number
}

/** 时间线配置 */
export interface TimelineConfig {
  /** 分段粒度 */
  segmentGranularity: 'hour' | 'day' | 'week' | 'month'
  /** 最大事件数 */
  maxEvents: number
  /** 是否显示已解决事件 */
  showResolved: boolean
  /** 是否显示低风险事件 */
  showLowRisk: boolean
  /** 是否启用自动刷新 */
  autoRefresh: boolean
  /** 刷新间隔（秒） */
  refreshInterval: number
}

/** 时间线导出格式 */
export type ExportFormat = 'json' | 'csv' | 'markdown'

export interface ExportResult {
  format: ExportFormat
  content: string
  filename: string
  sizeBytes: number
}

// ---- 存储键 ----

const TIMELINE_CONFIG_KEY = 'hf:safety:timeline_config'

// ---- 默认配置 ----

const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  segmentGranularity: 'hour',
  maxEvents: 500,
  showResolved: true,
  showLowRisk: true,
  autoRefresh: false,
  refreshInterval: 30,
}

// ---- 事件严重程度映射 ----

/** 根据操作类型推断严重程度 */
function inferSeverity(action: string, result: 'success' | 'failure' | 'blocked'): TimelineEvent['severity'] {
  if (result === 'blocked') return 'critical'
  if (result === 'failure') {
    const criticalActions = ['login', 'auth', 'encrypt', 'decrypt', 'key_rotate', 'data_export']
    if (criticalActions.some(a => action.toLowerCase().includes(a))) return 'danger'
    return 'warning'
  }
  return 'info'
}

/** 事件分组规则 */
function groupEvent(action: string): string {
  const groupMap: Record<string, string> = {
    login: '认证',
    logout: '认证',
    auth: '认证',
    encrypt: '加密',
    decrypt: '加密',
    key_rotate: '加密',
    key_generate: '加密',
    backup: '备份',
    restore: '备份',
    export: '数据',
    import: '数据',
    config: '配置',
    settings: '配置',
    access: '访问',
    permission: '权限',
    delete: '删除',
    update: '更新',
    create: '创建',
    read: '读取',
  }

  for (const [keyword, group] of Object.entries(groupMap)) {
    if (action.toLowerCase().includes(keyword)) return group
  }
  return '其他'
}

// ============================================================
// 审计时间线
// ============================================================

export function useAuditTimeline(
  _getEntries: () => AuditLogEntry[],
) {
  const config = ref<TimelineConfig>(loadConfig())

  function loadConfig(): TimelineConfig {
    return storage.getKV<TimelineConfig>(TIMELINE_CONFIG_KEY, DEFAULT_TIMELINE_CONFIG)
  }

  function saveConfig() {
    storage.setKV(TIMELINE_CONFIG_KEY, config.value)
  }

  /** 将审计日志转换为时间线事件 */
  function toTimelineEvents(entries: AuditLogEntry[]): TimelineEvent[] {
    return entries.map((entry, idx) => {
      const severity = inferSeverity(entry.action, entry.result)
      const group = groupEvent(entry.action)

      // 查找关联事件（相同时段内同类操作）
      const relatedEventIds = entries
        .filter((e, i) => {
          if (i === idx) return false
          const timeDiff = Math.abs(
            new Date(e.timestamp).getTime() - new Date(entry.timestamp).getTime()
          )
          return timeDiff < 60000 && e.action === entry.action
        })
        .map(e => e.id)

      return {
        entry,
        group,
        severity,
        isAnomaly: severity === 'critical' || severity === 'danger',
        relatedEventIds,
      }
    })
  }

  /** 创建时间线分段 */
  function createSegments(events: TimelineEvent[]): TimelineSegment[] {
    if (events.length === 0) return []

    const granularity = config.value.segmentGranularity
    const segments: TimelineSegment[] = []
    let currentSegment: TimelineSegment | null = null
    let segmentBoundary = 0

    const getBoundary = (date: Date): number => {
      switch (granularity) {
        case 'hour': return date.getHours()
        case 'day': return date.getDate()
        case 'week': {
          const start = new Date(date.getFullYear(), 0, 1)
          const diff = date.getTime() - start.getTime()
          return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
        }
        case 'month': return date.getMonth()
      }
    }

    const formatLabel = (date: Date, boundary: number): string => {
      switch (granularity) {
        case 'hour':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(boundary).padStart(2, '0')}:00`
        case 'day':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(boundary).padStart(2, '0')}`
        case 'week':
          return `${date.getFullYear()} 第${boundary}周`
        case 'month':
          return `${date.getFullYear()}-${String(boundary + 1).padStart(2, '0')}`
      }
    }

    // 按时间排序（从旧到新）
    const sorted = [...events].sort(
      (a, b) => new Date(a.entry.timestamp).getTime() - new Date(b.entry.timestamp).getTime()
    )

    for (const event of sorted) {
      const date = new Date(event.entry.timestamp)
      const boundary = getBoundary(date)

      if (!currentSegment || boundary !== segmentBoundary) {
        if (currentSegment) {
          segments.push(currentSegment)
        }

        segmentBoundary = boundary
        currentSegment = {
          id: `seg_${Date.now()}_${segments.length}`,
          label: formatLabel(date, boundary),
          startTime: event.entry.timestamp,
          endTime: event.entry.timestamp,
          events: [],
          eventCount: 0,
          successRate: 0,
          hasCriticalEvents: false,
        }
      }

      currentSegment!.events.push(event)
      currentSegment!.endTime = event.entry.timestamp
    }

    if (currentSegment) {
      segments.push(currentSegment)
    }

    // 计算每个分段的统计信息
    for (const seg of segments) {
      seg.eventCount = seg.events.length
      const successCount = seg.events.filter(e => e.entry.result === 'success').length
      seg.successRate = seg.eventCount > 0
        ? Math.round((successCount / seg.eventCount) * 100)
        : 100
      seg.hasCriticalEvents = seg.events.some(
        e => e.severity === 'critical' || e.severity === 'danger'
      )
    }

    return segments
  }

  /** 事件聚合分析 */
  function aggregateEvents(
    events: TimelineEvent[],
    dimension: EventAggregation['dimension'],
  ): EventAggregation[] {
    const total = events.length
    const groups = new Map<string, { count: number; label: string }>()

    for (const event of events) {
      let key: string
      let label: string

      switch (dimension) {
        case 'action':
          key = event.entry.action
          label = event.entry.action
          break
        case 'actor':
          key = event.entry.actor
          label = event.entry.actor
          break
        case 'result':
          key = event.entry.result
          label = event.entry.result
          break
        case 'hour': {
          const hour = new Date(event.entry.timestamp).getHours()
          key = String(hour)
          label = `${String(hour).padStart(2, '0')}:00`
          break
        }
        case 'day': {
          const day = new Date(event.entry.timestamp).getDay()
          const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
          key = String(day)
          label = dayNames[day]
          break
        }
      }

      const existing = groups.get(key)
      if (existing) {
        existing.count++
      } else {
        groups.set(key, { count: 1, label })
      }
    }

    return Array.from(groups.entries())
      .map(([key, { count, label }]) => ({
        dimension,
        key,
        label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }

  /** 趋势分析 */
  function analyzeTrends(
    entries: AuditLogEntry[],
    windowHours: number = 24,
  ): TrendAnalysis {
    if (entries.length === 0) {
      return {
        dataPoints: [],
        direction: 'stable',
        changeRate: 0,
        anomalies: [],
      }
    }

    const now = Date.now()
    const windowMs = windowHours * 60 * 60 * 1000
    const startTime = now - windowMs

    // 按小时分组
    const hourlyData = new Map<string, { total: number; success: number; failure: number; blocked: number; types: Record<string, number> }>()

    for (const entry of entries) {
      const entryTime = new Date(entry.timestamp).getTime()
      if (entryTime < startTime) continue

      const hourKey = new Date(entryTime).toISOString().slice(0, 13) + ':00'
      const existing = hourlyData.get(hourKey) || { total: 0, success: 0, failure: 0, blocked: 0, types: {} }

      existing.total++
      if (entry.result === 'success') existing.success++
      else if (entry.result === 'failure') existing.failure++
      else if (entry.result === 'blocked') existing.blocked++

      existing.types[entry.action] = (existing.types[entry.action] || 0) + 1
      hourlyData.set(hourKey, existing)
    }

    // 生成时间序列
    const dataPoints: TrendDataPoint[] = []
    const sortedHours = Array.from(hourlyData.keys()).sort()

    for (const hour of sortedHours) {
      const d = hourlyData.get(hour)!
      dataPoints.push({
        timestamp: hour,
        label: hour.slice(11),
        ...d,
        typeDistribution: d.types,
      })
    }

    // 计算趋势方向
    let direction: TrendAnalysis['direction'] = 'stable'
    let changeRate = 0

    if (dataPoints.length >= 2) {
      const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2))
      const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2))

      const firstAvg = firstHalf.reduce((s, dp) => s + dp.total, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((s, dp) => s + dp.total, 0) / secondHalf.length

      if (firstAvg > 0) {
        changeRate = Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
      }

      if (changeRate > 20) direction = 'rising'
      else if (changeRate < -20) direction = 'falling'
      else direction = 'stable'
    }

    // 异常检测
    const anomalies: TrendAnomaly[] = []
    if (dataPoints.length >= 3) {
      const values = dataPoints.map(dp => dp.total)
      const mean = values.reduce((s, v) => s + v, 0) / values.length
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
      const stdDev = Math.sqrt(variance)

      const threshold = 2.5 // z-score 阈值

      for (const dp of dataPoints) {
        const zScore = stdDev > 0 ? Math.abs(dp.total - mean) / stdDev : 0
        if (zScore > threshold) {
          let type: TrendAnomaly['type'] = 'spike'
          if (dp.total < mean) type = 'drop'

          // 检查是否模式变化
          if (dp.failure / dp.total > 0.5 && dp.total > 5) {
            type = 'pattern_change'
          }

          anomalies.push({
            timestamp: dp.timestamp,
            label: dp.label,
            type,
            description: dp.total > mean
              ? `事件数量突增（${dp.total}，均值 ${Math.round(mean)}）`
              : `事件数量骤降（${dp.total}，均值 ${Math.round(mean)}）`,
            deviationScore: Math.round(zScore * 100) / 100,
          })
        }
      }
    }

    return { dataPoints, direction, changeRate, anomalies }
  }

  /** 生成热力图数据 */
  function generateHeatmap(
    entries: AuditLogEntry[],
    days: number = 7,
  ): HeatmapData {
    const now = new Date()
    const rows: string[] = []
    const columns: string[] = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

    // 生成日期行
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      rows.push(`${d.getMonth() + 1}/${d.getDate()}`)
    }

    // 初始化数据矩阵
    const data: number[][] = Array.from({ length: days }, () =>
      Array.from({ length: 24 }, () => 0)
    )

    let maxValue = 0
    let minValue = Infinity

    for (const entry of entries) {
      const entryDate = new Date(entry.timestamp)
      const dayDiff = Math.floor((now.getTime() - entryDate.getTime()) / (24 * 60 * 60 * 1000))
      if (dayDiff < 0 || dayDiff >= days) continue

      const row = days - 1 - dayDiff
      const col = entryDate.getHours()

      if (row >= 0 && row < days && col >= 0 && col < 24) {
        data[row][col]++
        if (data[row][col] > maxValue) maxValue = data[row][col]
      }
    }

    // 计算最小值
    for (const row of data) {
      for (const val of row) {
        if (val < minValue) minValue = val
      }
    }
    if (minValue === Infinity) minValue = 0

    return { rows, columns, data, maxValue, minValue }
  }

  /** 异常事件摘要 */
  function getAnomalySummary(events: TimelineEvent[]): {
    totalAnomalies: number
    bySeverity: Record<string, number>
    byGroup: Record<string, number>
    recentAnomalies: TimelineEvent[]
  } {
    const anomalies = events.filter(e => e.isAnomaly)
    const bySeverity: Record<string, number> = {}
    const byGroup: Record<string, number> = {}

    for (const a of anomalies) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1
      byGroup[a.group] = (byGroup[a.group] || 0) + 1
    }

    return {
      totalAnomalies: anomalies.length,
      bySeverity,
      byGroup,
      recentAnomalies: anomalies.slice(0, 20),
    }
  }

  /** 导出时间线 */
  function exportTimeline(
    events: TimelineEvent[],
    format: ExportFormat,
  ): ExportResult {
    const now = new Date().toISOString().slice(0, 10)
    let content = ''
    let filename = ''

    switch (format) {
      case 'json':
        content = JSON.stringify(events.map(e => ({
          id: e.entry.id,
          action: e.entry.action,
          actor: e.entry.actor,
          target: e.entry.target,
          result: e.entry.result,
          detail: e.entry.detail,
          severity: e.severity,
          group: e.group,
          timestamp: e.entry.timestamp,
        })), null, 2)
        filename = `audit_timeline_${now}.json`
        break

      case 'csv': {
        const headers = 'ID,时间,操作,主体,目标,结果,详情,严重程度,分组'
        const rows = events.map(e =>
          [
            e.entry.id,
            e.entry.timestamp,
            e.entry.action,
            e.entry.actor,
            e.entry.target,
            e.entry.result,
            `"${(e.entry.detail || '').replace(/"/g, '""')}"`,
            e.severity,
            e.group,
          ].join(',')
        )
        content = [headers, ...rows].join('\n')
        filename = `audit_timeline_${now}.csv`
        break
      }

      case 'markdown': {
        const lines: string[] = [
          '# 审计时间线报告',
          `> 生成时间: ${new Date().toLocaleString('zh-CN')}`,
          `> 事件总数: ${events.length}`,
          '',
          '| 时间 | 操作 | 主体 | 目标 | 结果 | 严重程度 |',
          '|------|------|------|------|------|----------|',
        ]

        for (const e of events.slice(0, 200)) {
          const time = new Date(e.entry.timestamp).toLocaleString('zh-CN')
          lines.push(
            `| ${time} | ${e.entry.action} | ${e.entry.actor} | ${e.entry.target} | ${e.entry.result} | ${e.severity} |`
          )
        }

        if (events.length > 200) {
          lines.push(`| ... | ... | ... | ... | ... | ... |`)
          lines.push(`| *仅显示前200条，共${events.length}条* | | | | | |`)
        }

        content = lines.join('\n')
        filename = `audit_timeline_${now}.md`
        break
      }
    }

    return {
      format,
      content,
      filename,
      sizeBytes: new Blob([content]).size,
    }
  }

  /** 搜索时间线事件 */
  function searchEvents(
    events: TimelineEvent[],
    query: string,
  ): TimelineEvent[] {
    const q = query.toLowerCase()
    return events.filter(e =>
      e.entry.action.toLowerCase().includes(q) ||
      e.entry.actor.toLowerCase().includes(q) ||
      e.entry.target.toLowerCase().includes(q) ||
      e.entry.detail.toLowerCase().includes(q) ||
      e.group.toLowerCase().includes(q) ||
      e.severity.toLowerCase().includes(q)
    )
  }

  /** 更新时间线配置 */
  function updateConfig(partial: Partial<TimelineConfig>) {
    config.value = { ...config.value, ...partial }
    saveConfig()
  }

  return {
    config,
    toTimelineEvents,
    createSegments,
    aggregateEvents,
    analyzeTrends,
    generateHeatmap,
    getAnomalySummary,
    exportTimeline,
    searchEvents,
    updateConfig,
  }
}

// ---- 存储键 ----

export const AUDIT_TIMELINE_STORAGE_KEYS = {
  TIMELINE_CONFIG: TIMELINE_CONFIG_KEY,
} as const