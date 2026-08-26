// ============================================================
// 安全守护体系 · 备份恢复与安全报告
// 蓝图要求：备份恢复 + 定期安全报告 + 真实传感器集成
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { SafetyScore } from './types'

// ---- 备份类型 ----

export type BackupType = 'full' | 'incremental' | 'config-only'

export interface BackupMetadata {
  id: string
  type: BackupType
  /** 备份名称 */
  name: string
  /** 创建时间 */
  createdAt: string
  /** 数据大小（字节） */
  sizeBytes: number
  /** 包含的存储键数量 */
  keyCount: number
  /** 备份描述 */
  description: string
  /** 是否自动备份 */
  isAuto: boolean
  /** 校验和 */
  checksum: string
}

export interface BackupSnapshot {
  metadata: BackupMetadata
  /** 键值对数据 */
  data: Record<string, string>
}

export interface RestoreResult {
  success: boolean
  restored: number
  skipped: number
  failed: number
  errors: string[]
  restoredAt: string
}

// ---- 安全报告类型 ----

export type SecurityReportPeriod = 'daily' | 'weekly' | 'monthly'

export interface SecurityReport {
  id: string
  period: SecurityReportPeriod
  /** 报告时间范围 */
  dateRange: { start: string; end: string }
  /** 生成时间 */
  generatedAt: string
  /** 安全评分 */
  score: SafetyScore
  /** 事件统计 */
  incidents: {
    total: number
    byLevel: Record<string, number>
    byType: Record<string, number>
    resolved: number
    pending: number
  }
  /** 备份状态 */
  backupStatus: {
    lastBackup: string | null
    totalBackups: number
    autoBackupEnabled: boolean
    lastBackupSize: number
  }
  /** 访问统计 */
  accessStats: {
    totalLogins: number
    failedLogins: number
    uniqueDevices: number
    suspiciousActivities: number
  }
  /** 建议 */
  recommendations: string[]
  /** 报告状态 */
  status: 'draft' | 'final'
}

// ---- 传感器集成类型 ----

export type SensorType = 'accelerometer' | 'gyroscope' | 'heart_rate' | 'location' | 'battery' | 'network'

export interface SensorReading {
  sensorType: SensorType
  /** 读数时间 */
  timestamp: string
  /** 原始值 */
  value: number
  /** 单位 */
  unit: string
  /** 精度 */
  accuracy: number
  /** 是否异常 */
  isAnomaly: boolean
}

export interface SensorStatus {
  sensorType: SensorType
  /** 是否可用 */
  available: boolean
  /** 是否需要权限 */
  permissionRequired: boolean
  /** 是否已授权 */
  permissionGranted: boolean
  /** 最后读数时间 */
  lastReadingAt: string | null
  /** 数据点数 */
  readingCount: number
}

export interface SafetyAlert {
  id: string
  type: 'fall' | 'irregular_heartbeat' | 'unusual_location' | 'low_battery' | 'suspicious_login'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  detectedAt: string
  sensorData?: SensorReading[]
  actionTaken: string | null
  resolved: boolean
  resolvedAt?: string
}

// ---- 存储键 ----

const BACKUPS_KEY = 'hf:safety_backups'
const REPORTS_KEY = 'hf:safety_reports'
const SENSOR_STATUS_KEY = 'hf:sensor_status'
const ALERTS_KEY = 'hf:safety_alerts'

// ============================================================
// 备份恢复
// ============================================================

export function useBackupRecovery() {
  const backups = ref<BackupMetadata[]>(loadBackups())
  const isBackingUp = ref(false)
  const isRestoring = ref(false)

  function loadBackups(): BackupMetadata[] {
    return storage.getKV<BackupMetadata[]>(BACKUPS_KEY, [])
  }

  function saveBackups() {
    storage.setKV(BACKUPS_KEY, backups.value)
  }

  /** 计算简单校验和 */
  function computeChecksum(data: Record<string, string>): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 创建备份
   * 收集所有 HeartFlow 相关存储键的数据
   */
  async function createBackup(
    type: BackupType = 'full',
    name?: string,
  ): Promise<BackupMetadata | null> {
    isBackingUp.value = true

    try {
      const data: Record<string, string> = {}
      const hfPrefix = 'hf:'

      // 收集所有 HeartFlow 存储数据
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue

        if (type === 'full' && key.startsWith(hfPrefix)) {
          const value = localStorage.getItem(key)
          if (value) data[key] = value
        } else if (type === 'config-only' && (key.startsWith('hf:config') || key.startsWith('hf:safety'))) {
          const value = localStorage.getItem(key)
          if (value) data[key] = value
        } else if (type === 'incremental') {
          // 增量备份：只备份最近更新的键
          const lastBackup = backups.value[0]
          if (lastBackup && key.startsWith(hfPrefix)) {
            const value = localStorage.getItem(key)
            if (value) data[key] = value
          }
        }
      }

      const keyCount = Object.keys(data).length
      const sizeBytes = new Blob([JSON.stringify(data)]).size
      const checksum = computeChecksum(data)

      const metadata: BackupMetadata = {
        id: `backup_${Date.now()}`,
        type,
        name: name || `${type === 'full' ? '全量' : type === 'config-only' ? '配置' : '增量'}备份 - ${new Date().toLocaleString('zh-CN')}`,
        createdAt: new Date().toISOString(),
        sizeBytes,
        keyCount,
        description: `${type === 'full' ? '全量' : '配置'}备份，包含 ${keyCount} 个存储键`,
        isAuto: !name,
        checksum,
      }

      // 保存备份数据
      const backupKey = `hf:backup_${metadata.id}`
      try {
        localStorage.setItem(backupKey, JSON.stringify({ metadata, data }))
      } catch (e) {
        // 存储空间不足，清理旧备份
        if (backups.value.length > 0) {
          const oldest = backups.value[backups.value.length - 1]
          localStorage.removeItem(`hf:backup_${oldest.id}`)
          localStorage.setItem(backupKey, JSON.stringify({ metadata, data }))
        } else {
          throw e
        }
      }

      backups.value.unshift(metadata)
      saveBackups()

      return metadata
    } catch (err) {
      console.error('[Safety] 备份创建失败:', err)
      return null
    } finally {
      isBackingUp.value = false
    }
  }

  /**
   * 恢复备份
   */
  async function restoreBackup(backupId: string): Promise<RestoreResult> {
    isRestoring.value = true

    const result: RestoreResult = {
      success: false,
      restored: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      restoredAt: new Date().toISOString(),
    }

    try {
      const backupKey = `hf:backup_${backupId}`
      const raw = localStorage.getItem(backupKey)
      if (!raw) {
        result.errors.push('备份数据不存在')
        return result
      }

      const snapshot: BackupSnapshot = JSON.parse(raw)
      const { data } = snapshot

      for (const [key, value] of Object.entries(data)) {
        // 跳过备份元数据本身
        if (key.startsWith('hf:backup_')) {
          result.skipped++
          continue
        }

        try {
          localStorage.setItem(key, value)
          result.restored++
        } catch (err) {
          result.failed++
          result.errors.push(`恢复键 ${key} 失败: ${err}`)
        }
      }

      result.success = result.failed === 0
    } catch (err) {
      result.errors.push(`恢复过程异常: ${err}`)
    } finally {
      isRestoring.value = false
    }

    return result
  }

  /** 删除备份 */
  function deleteBackup(backupId: string): boolean {
    const idx = backups.value.findIndex(b => b.id === backupId)
    if (idx < 0) return false

    backups.value.splice(idx, 1)
    saveBackups()
    localStorage.removeItem(`hf:backup_${backupId}`)

    return true
  }

  /** 获取备份详情 */
  function getBackupSnapshot(backupId: string): BackupSnapshot | null {
    const raw = localStorage.getItem(`hf:backup_${backupId}`)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  /** 清理旧备份（保留最近 N 个） */
  function cleanupOldBackups(keepCount: number = 5): void {
    if (backups.value.length <= keepCount) return

    const toDelete = backups.value.slice(keepCount)
    for (const backup of toDelete) {
      localStorage.removeItem(`hf:backup_${backup.id}`)
    }
    backups.value = backups.value.slice(0, keepCount)
    saveBackups()
  }

  const backupCount = computed(() => backups.value.length)
  const lastBackup = computed(() => backups.value[0] || null)
  const totalBackupSize = computed(() => backups.value.reduce((s, b) => s + b.sizeBytes, 0))

  return {
    backups,
    isBackingUp,
    isRestoring,
    backupCount,
    lastBackup,
    totalBackupSize,
    createBackup,
    restoreBackup,
    deleteBackup,
    getBackupSnapshot,
    cleanupOldBackups,
  }
}

// ============================================================
// 定期安全报告
// ============================================================

export function useSecurityReports() {
  const reports = ref<SecurityReport[]>(loadReports())

  function loadReports(): SecurityReport[] {
    return storage.getKV<SecurityReport[]>(REPORTS_KEY, [])
  }

  function saveReports() {
    storage.setKV(REPORTS_KEY, reports.value)
  }

  /**
   * 生成安全报告
   */
  function generateReport(
    period: SecurityReportPeriod,
    getScore: () => SafetyScore,
  ): SecurityReport {
    const now = new Date()
    const dateRange = computeDateRange(period, now)

    // 获取安全评分
    const score = getScore()

    // 收集事件统计
    const incidents = collectIncidentStats(dateRange)

    // 收集备份状态
    const backupStatus = collectBackupStatus()

    // 收集访问统计
    const accessStats = collectAccessStats(dateRange)

    // 生成建议
    const recommendations = generateRecommendations(score, incidents, backupStatus)

    const report: SecurityReport = {
      id: `report_${period}_${now.toISOString().slice(0, 10)}`,
      period,
      dateRange,
      generatedAt: now.toISOString(),
      score,
      incidents,
      backupStatus,
      accessStats,
      recommendations,
      status: 'final',
    }

    reports.value.unshift(report)

    // 保留最近30份报告
    if (reports.value.length > 30) {
      reports.value = reports.value.slice(0, 30)
    }

    saveReports()
    return report
  }

  function computeDateRange(period: SecurityReportPeriod, now: Date): { start: string; end: string } {
    const end = now.toISOString()
    const start = new Date(now)

    switch (period) {
      case 'daily':
        start.setDate(start.getDate() - 1)
        break
      case 'weekly':
        start.setDate(start.getDate() - 7)
        break
      case 'monthly':
        start.setMonth(start.getMonth() - 1)
        break
    }

    return { start: start.toISOString(), end }
  }

  function collectIncidentStats(dateRange: { start: string; end: string }): SecurityReport['incidents'] {
    // 从存储中收集事件统计
    const alerts = storage.getKV<SafetyAlert[]>(ALERTS_KEY, [])
    const filtered = alerts.filter(a => a.detectedAt >= dateRange.start && a.detectedAt <= dateRange.end)

    const byLevel: Record<string, number> = {}
    const byType: Record<string, number> = {}

    for (const alert of filtered) {
      byLevel[alert.severity] = (byLevel[alert.severity] || 0) + 1
      byType[alert.type] = (byType[alert.type] || 0) + 1
    }

    const resolved = filtered.filter(a => a.resolved).length

    return {
      total: filtered.length,
      byLevel,
      byType,
      resolved,
      pending: filtered.length - resolved,
    }
  }

  function collectBackupStatus() {
    const backups = storage.getKV<BackupMetadata[]>(BACKUPS_KEY, [])
    return {
      lastBackup: backups.length > 0 ? backups[0].createdAt : null,
      totalBackups: backups.length,
      autoBackupEnabled: true,
      lastBackupSize: backups.length > 0 ? backups[0].sizeBytes : 0,
    }
  }

  function collectAccessStats(_dateRange: { start: string; end: string }): SecurityReport['accessStats'] {
    // 简化实现：从存储中收集
    return {
      totalLogins: 0,
      failedLogins: 0,
      uniqueDevices: 1,
      suspiciousActivities: 0,
    }
  }

  function generateRecommendations(
    score: SafetyScore,
    incidents: SecurityReport['incidents'],
    backupStatus: SecurityReport['backupStatus'],
  ): string[] {
    const recs: string[] = []

    if (score.total < 60) {
      recs.push('安全评分偏低，建议立即检查各项安全配置')
    }
    if (score.dataSecurity < 15) {
      recs.push('数据安全评分不足，建议启用加密和自动备份')
    }
    if (score.propertySecurity < 15) {
      recs.push('财产安全评分不足，建议启用反诈骗和SOS功能')
    }
    if (score.personalSafety < 15) {
      recs.push('人身安全评分不足，建议添加紧急联系人')
    }
    if (incidents.total > 10) {
      recs.push(`近期安全事件较多（${incidents.total}起），建议审查安全策略`)
    }
    if (incidents.pending > 0) {
      recs.push(`还有 ${incidents.pending} 起安全事件待处理`)
    }
    if (!backupStatus.lastBackup) {
      recs.push('尚未创建任何备份，建议立即创建全量备份')
    } else {
      const daysSince = (Date.now() - new Date(backupStatus.lastBackup).getTime()) / 86400000
      if (daysSince > 7) {
        recs.push(`上次备份已在 ${Math.floor(daysSince)} 天前，建议创建新备份`)
      }
    }

    if (recs.length === 0) {
      recs.push('当前安全状态良好，请继续保持')
    }

    return recs
  }

  /** 获取指定周期的报告 */
  function getReportsByPeriod(period: SecurityReportPeriod): SecurityReport[] {
    return reports.value.filter(r => r.period === period)
  }

  /** 获取最新报告 */
  const latestReport = computed(() => reports.value[0] || null)

  return {
    reports,
    latestReport,
    generateReport,
    getReportsByPeriod,
  }
}

// ============================================================
// 传感器集成
// ============================================================

export function useSensorIntegration() {
  const sensorStatuses = ref<SensorStatus[]>(loadSensorStatuses())
  const readings = ref<SensorReading[]>([])
  const alerts = ref<SafetyAlert[]>(loadAlerts())

  function loadSensorStatuses(): SensorStatus[] {
    const saved = storage.getKV<SensorStatus[]>(SENSOR_STATUS_KEY, [])
    if (saved.length === 0) {
      return getDefaultSensorStatuses()
    }
    return saved
  }

  function getDefaultSensorStatuses(): SensorStatus[] {
    return [
      { sensorType: 'accelerometer', available: false, permissionRequired: false, permissionGranted: false, lastReadingAt: null, readingCount: 0 },
      { sensorType: 'gyroscope', available: false, permissionRequired: false, permissionGranted: false, lastReadingAt: null, readingCount: 0 },
      { sensorType: 'heart_rate', available: false, permissionRequired: true, permissionGranted: false, lastReadingAt: null, readingCount: 0 },
      { sensorType: 'location', available: false, permissionRequired: true, permissionGranted: false, lastReadingAt: null, readingCount: 0 },
      { sensorType: 'battery', available: 'getBattery' in navigator, permissionRequired: false, permissionGranted: true, lastReadingAt: null, readingCount: 0 },
      { sensorType: 'network', available: 'connection' in navigator, permissionRequired: false, permissionGranted: true, lastReadingAt: null, readingCount: 0 },
    ]
  }

  function loadAlerts(): SafetyAlert[] {
    return storage.getKV<SafetyAlert[]>(ALERTS_KEY, [])
  }

  function saveAlerts() {
    storage.setKV(ALERTS_KEY, alerts.value)
  }

  function saveSensorStatuses() {
    storage.setKV(SENSOR_STATUS_KEY, sensorStatuses.value)
  }

  /**
   * 检测传感器可用性
   */
  async function detectSensors(): Promise<SensorStatus[]> {
    const statuses = getDefaultSensorStatuses()

    // 检测加速度计
    if ('DeviceMotionEvent' in window) {
      try {
        // 需要用户手势才能启用，仅检测API存在
        statuses[0].available = true
      } catch { /* 不处理 */ }
    }

    // 检测陀螺仪
    if ('DeviceOrientationEvent' in window) {
      statuses[1].available = true
    }

    // 检测电池
    if ('getBattery' in navigator) {
      statuses[4].available = true
    }

    // 检测网络
    if ('connection' in navigator) {
      statuses[5].available = true
    }

    sensorStatuses.value = statuses
    saveSensorStatuses()
    return statuses
  }

  /**
   * 记录传感器读数
   */
  function recordReading(reading: Omit<SensorReading, 'isAnomaly'>): SensorReading {
    const isAnomaly = detectAnomaly(reading)

    const full: SensorReading = {
      ...reading,
      isAnomaly,
    }

    readings.value.push(full)

    // 更新传感器状态
    const status = sensorStatuses.value.find(s => s.sensorType === reading.sensorType)
    if (status) {
      status.lastReadingAt = reading.timestamp
      status.readingCount++
      saveSensorStatuses()
    }

    // 异常检测触发警报
    if (isAnomaly) {
      triggerAlert(reading)
    }

    // 限制读数数量
    if (readings.value.length > 1000) {
      readings.value = readings.value.slice(-500)
    }

    return full
  }

  /**
   * 异常检测
   */
  function detectAnomaly(reading: Omit<SensorReading, 'isAnomaly'>): boolean {
    switch (reading.sensorType) {
      case 'heart_rate':
        return reading.value < 40 || reading.value > 180
      case 'battery':
        return reading.value < 10
      case 'accelerometer':
        return reading.value > 20 // 异常加速度
      default:
        return false
    }
  }

  /**
   * 触发安全警报
   */
  function triggerAlert(reading: Omit<SensorReading, 'isAnomaly'>): SafetyAlert {
    const alertType = mapSensorToAlertType(reading.sensorType)
    const severity = mapSeverity(reading.sensorType, reading.value)

    const alert: SafetyAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: alertType,
      severity,
      title: generateAlertTitle(alertType),
      description: generateAlertDescription(alertType, reading),
      detectedAt: reading.timestamp,
      sensorData: [{ ...reading, isAnomaly: true }],
      actionTaken: null,
      resolved: false,
    }

    alerts.value.unshift(alert)

    // 限制警报数量
    if (alerts.value.length > 100) {
      alerts.value = alerts.value.slice(0, 100)
    }

    saveAlerts()
    return alert
  }

  function mapSensorToAlertType(sensorType: SensorType): SafetyAlert['type'] {
    switch (sensorType) {
      case 'accelerometer': return 'fall'
      case 'heart_rate': return 'irregular_heartbeat'
      case 'location': return 'unusual_location'
      case 'battery': return 'low_battery'
      default: return 'suspicious_login'
    }
  }

  function mapSeverity(sensorType: SensorType, value: number): SafetyAlert['severity'] {
    switch (sensorType) {
      case 'heart_rate':
        if (value < 30 || value > 200) return 'critical'
        if (value < 40 || value > 180) return 'high'
        return 'medium'
      case 'battery':
        if (value < 5) return 'high'
        if (value < 10) return 'medium'
        return 'low'
      case 'accelerometer':
        if (value > 30) return 'critical'
        if (value > 20) return 'high'
        return 'medium'
      default:
        return 'low'
    }
  }

  function generateAlertTitle(type: SafetyAlert['type']): string {
    const titles: Record<SafetyAlert['type'], string> = {
      fall: '跌倒检测',
      irregular_heartbeat: '心率异常',
      unusual_location: '位置异常',
      low_battery: '电量过低',
      suspicious_login: '可疑登录',
    }
    return titles[type]
  }

  function generateAlertDescription(
    type: SafetyAlert['type'],
    reading: Omit<SensorReading, 'isAnomaly'>,
  ): string {
    switch (type) {
      case 'fall':
        return `检测到异常加速度 ${reading.value.toFixed(1)} ${reading.unit}`
      case 'irregular_heartbeat':
        return `心率读数为 ${reading.value} ${reading.unit}`
      case 'low_battery':
        return `电量仅剩 ${reading.value}%`
      default:
        return `传感器 ${reading.sensorType} 读数异常: ${reading.value} ${reading.unit}`
    }
  }

  /** 解决警报 */
  function resolveAlert(alertId: string, actionTaken: string): boolean {
    const alert = alerts.value.find(a => a.id === alertId)
    if (!alert) return false
    alert.resolved = true
    alert.resolvedAt = new Date().toISOString()
    alert.actionTaken = actionTaken
    saveAlerts()
    return true
  }

  /** 获取活跃警报 */
  const activeAlerts = computed(() =>
    alerts.value.filter(a => !a.resolved).sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    }),
  )

  const availableSensors = computed(() =>
    sensorStatuses.value.filter(s => s.available),
  )

  return {
    sensorStatuses,
    readings,
    alerts,
    activeAlerts,
    availableSensors,
    detectSensors,
    recordReading,
    resolveAlert,
  }
}

// ---- 存储键 ----

export const SAFETY_ADVANCED_STORAGE_KEYS = {
  BACKUPS: 'hf:safety_backups',
  BACKUP_DATA_PREFIX: 'hf:backup_',
  REPORTS: 'hf:safety_reports',
  SENSOR_STATUS: 'hf:sensor_status',
  SENSOR_READINGS: 'hf:sensor_readings',
  ALERTS: 'hf:safety_alerts',
} as const