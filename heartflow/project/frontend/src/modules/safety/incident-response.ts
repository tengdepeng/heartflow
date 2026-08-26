// ============================================================
// 守护室 · 安全事件响应与威胁检测
// 安全事件日志 + 威胁检测引擎 + 事件响应处理
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型定义 ----

/** 威胁等级 */
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

/** 威胁类型 */
export type ThreatType =
  | 'unauthorized_access'
  | 'data_leak'
  | 'suspicious_pattern'
  | 'device_compromise'
  | 'privacy_breach'
  | 'permission_abuse'
  | 'unusual_behavior'
  | 'external_attack'

/** 安全事件 */
export interface SecurityIncident {
  id: string
  type: ThreatType
  level: ThreatLevel
  /** 事件描述 */
  description: string
  /** 触发来源 */
  source: string
  /** 是否已解决 */
  resolved: boolean
  /** 解决方式 */
  resolution?: string
  /** 时间戳 */
  timestamp: string
  /** 关联数据 */
  relatedData?: Record<string, unknown>
}

/** 威胁检测规则 */
export interface ThreatRule {
  id: string
  name: string
  type: ThreatType
  /** 检测条件描述 */
  condition: string
  /** 匹配的威胁等级 */
  level: ThreatLevel
  /** 是否启用 */
  enabled: boolean
  /** 冷却时间（秒），避免重复触发 */
  cooldown: number
  /** 上次触发时间 */
  lastTriggered?: number
}

/** 安全审计日志条目 */
export interface AuditLogEntry {
  id: string
  /** 操作类型 */
  action: string
  /** 操作主体 */
  actor: string
  /** 操作目标 */
  target: string
  /** 操作结果 */
  result: 'success' | 'failure' | 'blocked'
  /** 详情 */
  detail: string
  /** IP/设备标识 */
  deviceInfo?: string
  timestamp: string
}

/** 安全仪表盘摘要 */
export interface SecurityDashboard {
  /** 总事件数 */
  totalIncidents: number
  /** 未解决事件数 */
  unresolvedIncidents: number
  /** 本周事件数 */
  weeklyIncidents: number
  /** 威胁等级分布 */
  threatDistribution: Record<ThreatLevel, number>
  /** 最近事件 */
  recentIncidents: SecurityIncident[]
  /** 活跃威胁 */
  activeThreats: ThreatType[]
  /** 安全评分 0-100 */
  securityScore: number
}

// ---- 元数据 ----

export const THREAT_LEVEL_META: Record<ThreatLevel, { label: string; icon: string; color: string }> = {
  none: { label: '无威胁', icon: '✅', color: '#2ecc71' },
  low: { label: '低', icon: '🟢', color: '#27ae60' },
  medium: { label: '中', icon: '🟡', color: '#f39c12' },
  high: { label: '高', icon: '🟠', color: '#e67e22' },
  critical: { label: '严重', icon: '🔴', color: '#e74c3c' },
}

export const THREAT_TYPE_META: Record<ThreatType, { label: string; icon: string; desc: string }> = {
  unauthorized_access: { label: '未授权访问', icon: '🔑', desc: '检测到未经授权的访问尝试' },
  data_leak: { label: '数据泄露', icon: '💧', desc: '敏感数据可能已被泄露' },
  suspicious_pattern: { label: '可疑模式', icon: '🔍', desc: '检测到异常行为模式' },
  device_compromise: { label: '设备入侵', icon: '📱', desc: '设备可能已被入侵' },
  privacy_breach: { label: '隐私泄露', icon: '👁️', desc: '个人隐私数据面临风险' },
  permission_abuse: { label: '权限滥用', icon: '🛡️', desc: '检测到权限异常使用' },
  unusual_behavior: { label: '异常行为', icon: '⚠️', desc: '用户行为模式异常' },
  external_attack: { label: '外部攻击', icon: '🌐', desc: '检测到外部攻击尝试' },
}

// ---- 存储键 ----

const INCIDENT_KEY = 'hf:safety:incidents'
const AUDIT_LOG_KEY = 'hf:safety:audit_log'
const RULES_KEY = 'hf:safety:threat_rules'

// ---- 默认检测规则 ----

const DEFAULT_RULES: ThreatRule[] = [
  {
    id: 'rule_001',
    name: '频繁失败登录',
    type: 'unauthorized_access',
    condition: '短时间内多次登录失败',
    level: 'medium',
    enabled: true,
    cooldown: 300,
  },
  {
    id: 'rule_002',
    name: '大体积数据导出',
    type: 'data_leak',
    condition: '一次性导出超过阈值的数据量',
    level: 'high',
    enabled: true,
    cooldown: 600,
  },
  {
    id: 'rule_003',
    name: '异常时段访问',
    type: 'suspicious_pattern',
    condition: '在非正常时段频繁访问敏感数据',
    level: 'low',
    enabled: true,
    cooldown: 1800,
  },
  {
    id: 'rule_004',
    name: '新设备登录',
    type: 'device_compromise',
    condition: '从未知设备登录',
    level: 'medium',
    enabled: true,
    cooldown: 3600,
  },
  {
    id: 'rule_005',
    name: '权限提升尝试',
    type: 'permission_abuse',
    condition: '尝试获取超出正常范围的权限',
    level: 'high',
    enabled: true,
    cooldown: 600,
  },
  {
    id: 'rule_006',
    name: '异常行为序列',
    type: 'unusual_behavior',
    condition: '检测到与常规行为模式显著偏离的操作序列',
    level: 'medium',
    enabled: true,
    cooldown: 900,
  },
]

// ---- 响应式状态 ----

const incidents = ref<SecurityIncident[]>(loadIncidents())
const auditLog = ref<AuditLogEntry[]>(loadAuditLog())
const rules = ref<ThreatRule[]>(loadRules())

function loadIncidents(): SecurityIncident[] {
  try { return storage.getKV<SecurityIncident[]>(INCIDENT_KEY, []) }
  catch { return [] }
}

function loadAuditLog(): AuditLogEntry[] {
  try { return storage.getKV<AuditLogEntry[]>(AUDIT_LOG_KEY, []) }
  catch { return [] }
}

function loadRules(): ThreatRule[] {
  try { return storage.getKV<ThreatRule[]>(RULES_KEY, DEFAULT_RULES) }
  catch { return [...DEFAULT_RULES] }
}

function persistIncidents() { storage.setKV(INCIDENT_KEY, incidents.value) }
function persistAuditLog() { storage.setKV(AUDIT_LOG_KEY, auditLog.value) }
function persistRules() { storage.setKV(RULES_KEY, rules.value) }

// ---- 事件管理 ----

let incidentCounter = 0

function generateId(prefix: string): string {
  incidentCounter++
  return `${prefix}_${Date.now()}_${incidentCounter}`
}

/**
 * 安全事件响应系统
 */
export function useIncidentResponse() {
  /** 创建安全事件 */
  function createIncident(
    type: ThreatType,
    level: ThreatLevel,
    description: string,
    source: string,
    relatedData?: Record<string, unknown>,
  ): SecurityIncident {
    const incident: SecurityIncident = {
      id: generateId('incident'),
      type,
      level,
      description,
      source,
      resolved: false,
      timestamp: new Date().toISOString(),
      relatedData,
    }
    incidents.value.unshift(incident)
    // 最多保留 500 条
    if (incidents.value.length > 500) {
      incidents.value = incidents.value.slice(0, 500)
    }
    persistIncidents()
    return incident
  }

  /** 解决事件 */
  function resolveIncident(incidentId: string, resolution: string): boolean {
    const incident = incidents.value.find(i => i.id === incidentId)
    if (!incident) return false
    incident.resolved = true
    incident.resolution = resolution
    persistIncidents()
    return true
  }

  /** 获取所有事件 */
  function getIncidents(filter?: {
    resolved?: boolean
    level?: ThreatLevel
    type?: ThreatType
  }): SecurityIncident[] {
    let result = incidents.value
    if (filter?.resolved !== undefined) {
      result = result.filter(i => i.resolved === filter.resolved)
    }
    if (filter?.level) {
      result = result.filter(i => i.level === filter.level)
    }
    if (filter?.type) {
      result = result.filter(i => i.type === filter.type)
    }
    return result
  }

  /** 清除已解决事件 */
  function clearResolvedIncidents(): number {
    const before = incidents.value.length
    incidents.value = incidents.value.filter(i => !i.resolved)
    persistIncidents()
    return before - incidents.value.length
  }

  return {
    incidents: computed(() => incidents.value),
    createIncident,
    resolveIncident,
    getIncidents,
    clearResolvedIncidents,
  }
}

// ---- 威胁检测引擎 ----

/**
 * 威胁检测引擎
 * 基于规则匹配检测安全威胁
 */
export function useThreatDetection() {
  /** 检查单个规则是否匹配 */
  function checkRule(rule: ThreatRule, context: Record<string, unknown>): boolean {
    if (!rule.enabled) return false

    // 冷却检查
    if (rule.lastTriggered && (Date.now() - rule.lastTriggered) < rule.cooldown * 1000) {
      return false
    }

    // 根据规则类型进行检测
    switch (rule.type) {
      case 'unauthorized_access':
        return checkUnauthorizedAccess(context)
      case 'data_leak':
        return checkDataLeak(context)
      case 'suspicious_pattern':
        return checkSuspiciousPattern(context)
      case 'device_compromise':
        return checkDeviceCompromise(context)
      case 'privacy_breach':
        return checkPrivacyBreach(context)
      case 'permission_abuse':
        return checkPermissionAbuse(context)
      case 'unusual_behavior':
        return checkUnusualBehavior(context)
      case 'external_attack':
        return checkExternalAttack(context)
      default:
        return false
    }
  }

  /** 运行所有规则进行全方位检测 */
  function runDetection(context: Record<string, unknown>): {
    triggered: ThreatRule[]
    threats: { type: ThreatType; level: ThreatLevel }[]
  } {
    const triggered: ThreatRule[] = []
    const threats: { type: ThreatType; level: ThreatLevel }[] = []

    for (const rule of rules.value) {
      if (checkRule(rule, context)) {
        rule.lastTriggered = Date.now()
        triggered.push(rule)
        threats.push({ type: rule.type, level: rule.level })
      }
    }

    if (triggered.length > 0) {
      persistRules()
    }

    return { triggered, threats }
  }

  /** 获取所有规则 */
  function getRules() {
    return rules
  }

  /** 更新规则 */
  function updateRule(ruleId: string, updates: Partial<ThreatRule>) {
    const idx = rules.value.findIndex(r => r.id === ruleId)
    if (idx >= 0) {
      rules.value[idx] = { ...rules.value[idx], ...updates }
      persistRules()
    }
  }

  /** 启用/禁用规则 */
  function toggleRule(ruleId: string, enabled: boolean) {
    updateRule(ruleId, { enabled })
  }

  /** 重置规则到默认值 */
  function resetRules() {
    rules.value = DEFAULT_RULES.map(r => ({ ...r }))
    persistRules()
  }

  return {
    rules: computed(() => rules.value),
    checkRule,
    runDetection,
    getRules,
    updateRule,
    toggleRule,
    resetRules,
  }
}

// ---- 检测函数 ----

function checkUnauthorizedAccess(context: Record<string, unknown>): boolean {
  const failedAttempts = (context.failedLoginAttempts as number) || 0
  const timeWindow = (context.loginTimeWindow as number) || 300
  return failedAttempts >= 5 && timeWindow <= 300
}

function checkDataLeak(context: Record<string, unknown>): boolean {
  const exportSize = (context.exportDataSize as number) || 0
  const threshold = (context.exportThreshold as number) || 1000
  return exportSize > threshold
}

function checkSuspiciousPattern(context: Record<string, unknown>): boolean {
  const hour = (context.accessHour as number) ?? new Date().getHours()
  const accessCount = (context.accessCount as number) || 0
  return (hour >= 0 && hour <= 4) && accessCount > 10
}

function checkDeviceCompromise(context: Record<string, unknown>): boolean {
  const isKnownDevice = context.isKnownDevice as boolean
  const locationChanged = context.locationChanged as boolean
  return (isKnownDevice === false) || (locationChanged === true)
}

function checkPrivacyBreach(context: Record<string, unknown>): boolean {
  const personalDataAccessed = context.personalDataAccessed as boolean
  const withoutConsent = context.withoutConsent as boolean
  return personalDataAccessed === true && withoutConsent === true
}

function checkPermissionAbuse(context: Record<string, unknown>): boolean {
  const requestedPermission = (context.requestedPermission as string) || ''
  const currentLevel = (context.currentPermissionLevel as string) || 'basic'
  const sensitivePermissions = ['admin', 'full_access', 'data_export', 'system_config']
  return sensitivePermissions.includes(requestedPermission) && currentLevel !== 'admin'
}

function checkUnusualBehavior(context: Record<string, unknown>): boolean {
  const deviationScore = (context.behaviorDeviationScore as number) || 0
  return deviationScore > 0.8
}

function checkExternalAttack(context: Record<string, unknown>): boolean {
  const externalRequests = (context.externalConnectionAttempts as number) || 0
  const unusualPorts = context.unusualPortsDetected as boolean
  return externalRequests > 50 || unusualPorts === true
}

// ---- 审计日志 ----

/**
 * 安全审计日志
 */
export function useAuditLog() {
  /** 记录审计日志 */
  function log(
    action: string,
    actor: string,
    target: string,
    result: 'success' | 'failure' | 'blocked',
    detail: string,
    deviceInfo?: string,
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: generateId('audit'),
      action,
      actor,
      target,
      result,
      detail,
      deviceInfo,
      timestamp: new Date().toISOString(),
    }
    auditLog.value.unshift(entry)
    // 最多保留 1000 条
    if (auditLog.value.length > 1000) {
      auditLog.value = auditLog.value.slice(0, 1000)
    }
    persistAuditLog()
    return entry
  }

  /** 查询审计日志 */
  function queryLogs(filter?: {
    action?: string
    actor?: string
    result?: 'success' | 'failure' | 'blocked'
    startTime?: string
    endTime?: string
    limit?: number
  }): AuditLogEntry[] {
    let result = auditLog.value

    if (filter?.action) {
      result = result.filter(e => e.action.includes(filter.action!))
    }
    if (filter?.actor) {
      result = result.filter(e => e.actor === filter.actor)
    }
    if (filter?.result) {
      result = result.filter(e => e.result === filter.result)
    }
    if (filter?.startTime) {
      result = result.filter(e => e.timestamp >= filter.startTime!)
    }
    if (filter?.endTime) {
      result = result.filter(e => e.timestamp <= filter.endTime!)
    }

    return result.slice(0, filter?.limit || 100)
  }

  /** 获取审计统计 */
  function getAuditStats(): {
    total: number
    successCount: number
    failureCount: number
    blockedCount: number
    topActions: { action: string; count: number }[]
  } {
    const total = auditLog.value.length
    let successCount = 0
    let failureCount = 0
    let blockedCount = 0
    const actionCounts: Record<string, number> = {}

    for (const entry of auditLog.value) {
      if (entry.result === 'success') successCount++
      else if (entry.result === 'failure') failureCount++
      else if (entry.result === 'blocked') blockedCount++

      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1
    }

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { total, successCount, failureCount, blockedCount, topActions }
  }

  /** 清除旧日志 */
  function purgeOldLogs(beforeDays: number): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - beforeDays)
    const cutoffStr = cutoff.toISOString()
    const before = auditLog.value.length
    auditLog.value = auditLog.value.filter(e => e.timestamp >= cutoffStr)
    persistAuditLog()
    return before - auditLog.value.length
  }

  return {
    auditLog: computed(() => auditLog.value),
    log,
    queryLogs,
    getAuditStats,
    purgeOldLogs,
  }
}

// ---- 安全仪表盘 ----

/**
 * 安全仪表盘
 * 综合安全态势总览
 */
export function useSecurityDashboard() {
  const { getIncidents } = useIncidentResponse()
  const { getAuditStats } = useAuditLog()

  function getDashboard(): SecurityDashboard {
    const allIncidents = getIncidents()
    const unresolved = getIncidents({ resolved: false })
    const auditStats = getAuditStats()

    // 本周事件
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekStr = weekAgo.toISOString()
    const weeklyIncidents = allIncidents.filter(i => i.timestamp >= weekStr).length

    // 威胁分布
    const threatDistribution: Record<ThreatLevel, number> = {
      none: 0, low: 0, medium: 0, high: 0, critical: 0,
    }
    for (const i of allIncidents) {
      threatDistribution[i.level] = (threatDistribution[i.level] || 0) + 1
    }

    // 活跃威胁类型
    const activeThreats = [...new Set(unresolved.map(i => i.type))]

    // 最近 10 条事件
    const recentIncidents = allIncidents.slice(0, 10)

    // 安全评分
    const unresolvedScore = Math.max(0, 100 - unresolved.length * 5)
    const auditScore = auditStats.failureCount > 0 ? Math.max(40, 80 - auditStats.failureCount * 2) : 85
    const threatScore = activeThreats.length === 0 ? 100 : Math.max(30, 100 - activeThreats.length * 15)
    const securityScore = Math.round((unresolvedScore * 0.4 + auditScore * 0.3 + threatScore * 0.3))

    return {
      totalIncidents: allIncidents.length,
      unresolvedIncidents: unresolved.length,
      weeklyIncidents,
      threatDistribution,
      recentIncidents,
      activeThreats,
      securityScore,
    }
  }

  return {
    getDashboard,
  }
}

// ---- 存储键 ----

export const SAFETY_ADVANCED_STORAGE_KEYS = {
  INCIDENTS: INCIDENT_KEY,
  AUDIT_LOG: AUDIT_LOG_KEY,
  RULES: RULES_KEY,
} as const