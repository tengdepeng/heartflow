// ============================================================
// incident-response 引擎测试（INCR-83：安全事件响应）
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

const storageMock = new Map<string, unknown>()

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? (val as T) : defaultValue
    },
    setKV: (key: string, value: unknown) => { storageMock.set(key, value) },
    removeKV: (key: string) => { storageMock.delete(key) },
  },
}))

type Mod = typeof import('../incident-response')
import type { ThreatRule, ThreatType } from '../incident-response'

async function load(): Promise<Mod> {
  vi.resetModules()
  storageMock.clear()
  return await import('../incident-response')
}

beforeEach(() => {
  storageMock.clear()
})

describe('useIncidentResponse', () => {
  it('创建事件并持久化，未解决计数正确', async () => {
    const { useIncidentResponse, SAFETY_ADVANCED_STORAGE_KEYS } = await load()
    const { createIncident, getIncidents } = useIncidentResponse()
    const inc = createIncident('unauthorized_access', 'high', '检测到未授权访问', '登录模块')
    expect(inc.id).toContain('incident_')
    expect(inc.resolved).toBe(false)
    expect(getIncidents()).toHaveLength(1)
    expect(storageMock.get(SAFETY_ADVANCED_STORAGE_KEYS.INCIDENTS)).toHaveLength(1)
  })

  it('按 resolved/level/type 过滤事件', async () => {
    const { useIncidentResponse } = await load()
    const { createIncident, resolveIncident, getIncidents } = useIncidentResponse()
    createIncident('data_leak', 'high', '数据导出', '导出')
    const second = createIncident('unusual_behavior', 'low', '行为异常', '行为')
    resolveIncident(second.id, '已处置')
    expect(getIncidents({ resolved: false })).toHaveLength(1)
    expect(getIncidents({ resolved: true })).toHaveLength(1)
    expect(getIncidents({ level: 'high' })).toHaveLength(1)
    expect(getIncidents({ type: 'data_leak' })).toHaveLength(1)
  })

  it('解决事件写入 resolution，清除已解决只保留未解决', async () => {
    const { useIncidentResponse } = await load()
    const { createIncident, resolveIncident, clearResolvedIncidents, getIncidents } = useIncidentResponse()
    const a = createIncident('privacy_breach', 'critical', '隐私泄露', '隐私')
    createIncident('permission_abuse', 'medium', '权限滥用', '权限')
    expect(resolveIncident(a.id, '已人工处置')).toBe(true)
    expect(resolveIncident('nonexistent', 'x')).toBe(false)
    const cleared = clearResolvedIncidents()
    expect(cleared).toBe(1)
    expect(getIncidents()).toHaveLength(1)
    expect(getIncidents()[0].id).not.toBe(a.id)
  })

  it('事件上限 500 条', async () => {
    const { useIncidentResponse } = await load()
    const { createIncident, getIncidents } = useIncidentResponse()
    for (let i = 0; i < 505; i++) {
      createIncident('suspicious_pattern', 'low', `事件${i}`, '批量')
    }
    expect(getIncidents()).toHaveLength(500)
  })
})

describe('useThreatDetection', () => {
  it('默认加载 6 条规则', async () => {
    const { useThreatDetection } = await load()
    const { rules } = useThreatDetection()
    expect(rules.value).toHaveLength(6)
    expect(rules.value[0].name).toBe('频繁失败登录')
  })

  it('runDetection 命中匹配规则并写入 lastTriggered', async () => {
    const { useThreatDetection } = await load()
    const { runDetection } = useThreatDetection()
    const res = runDetection({ failedLoginAttempts: 6, loginTimeWindow: 60 })
    expect(res.triggered.length).toBeGreaterThan(0)
    expect(res.threats[0].type).toBe('unauthorized_access')
    expect(res.threats[0].level).toBe('medium')
  })

  it('冷却期内同规则不重复触发', async () => {
    const { useThreatDetection } = await load()
    const { runDetection } = useThreatDetection()
    const first = runDetection({ failedLoginAttempts: 6, loginTimeWindow: 60 })
    const second = runDetection({ failedLoginAttempts: 6, loginTimeWindow: 60 })
    expect(first.triggered.length).toBeGreaterThan(0)
    expect(second.triggered.length).toBe(0)
  })

  it('禁用规则后不再触发', async () => {
    const { useThreatDetection } = await load()
    const { runDetection, toggleRule } = useThreatDetection()
    toggleRule('rule_001', false)
    const res = runDetection({ failedLoginAttempts: 6, loginTimeWindow: 60 })
    expect(res.triggered.find(r => r.id === 'rule_001')).toBeUndefined()
  })

  it('updateRule 更新规则字段，resetRules 恢复默认', async () => {
    const { useThreatDetection } = await load()
    const { updateRule, resetRules, rules } = useThreatDetection()
    updateRule('rule_001', { level: 'critical' })
    expect(rules.value.find(r => r.id === 'rule_001')?.level).toBe('critical')
    resetRules()
    expect(rules.value.find(r => r.id === 'rule_001')?.level).toBe('medium')
  })

  it('各威胁类型检测函数生效', async () => {
    const { useThreatDetection } = await load()
    const { checkRule } = useThreatDetection()
    const mk = (type: string): ThreatRule => ({
      id: `r_${type}`,
      name: type,
      type: type as ThreatType,
      condition: '',
      level: 'medium',
      enabled: true,
      cooldown: 0,
    })
    expect(checkRule(mk('unauthorized_access'), { failedLoginAttempts: 6, loginTimeWindow: 60 })).toBe(true)
    expect(checkRule(mk('data_leak'), { exportDataSize: 5000, exportThreshold: 1000 })).toBe(true)
    expect(checkRule(mk('suspicious_pattern'), { accessHour: 2, accessCount: 20 })).toBe(true)
    expect(checkRule(mk('device_compromise'), { isKnownDevice: false })).toBe(true)
    expect(checkRule(mk('privacy_breach'), { personalDataAccessed: true, withoutConsent: true })).toBe(true)
    expect(checkRule(mk('permission_abuse'), { requestedPermission: 'admin', currentPermissionLevel: 'basic' })).toBe(true)
    expect(checkRule(mk('unusual_behavior'), { behaviorDeviationScore: 0.95 })).toBe(true)
    expect(checkRule(mk('external_attack'), { externalConnectionAttempts: 100 })).toBe(true)
    expect(checkRule(mk('data_leak'), { exportDataSize: 100, exportThreshold: 1000 })).toBe(false)
  })
})

describe('useAuditLog', () => {
  it('记录审计日志并持久化', async () => {
    const { useAuditLog, SAFETY_ADVANCED_STORAGE_KEYS } = await load()
    const { log, auditLog } = useAuditLog()
    log('login', 'user', 'auth', 'success', '登录成功', 'device-1')
    expect(auditLog.value).toHaveLength(1)
    expect(storageMock.get(SAFETY_ADVANCED_STORAGE_KEYS.AUDIT_LOG)).toHaveLength(1)
  })

  it('queryLogs 按条件过滤', async () => {
    const { useAuditLog } = await load()
    const { log, queryLogs } = useAuditLog()
    log('login', 'user', 'auth', 'success', 'ok')
    log('login', 'user', 'auth', 'failure', 'bad')
    log('export', 'admin', 'data', 'blocked', 'no')
    expect(queryLogs({ result: 'failure' })).toHaveLength(1)
    expect(queryLogs({ action: 'login' })).toHaveLength(2)
    expect(queryLogs({ actor: 'admin' })).toHaveLength(1)
  })

  it('getAuditStats 统计结果分布与 topActions', async () => {
    const { useAuditLog } = await load()
    const { log, getAuditStats } = useAuditLog()
    log('login', 'user', 'auth', 'success', 'ok')
    log('login', 'user', 'auth', 'failure', 'bad')
    log('export', 'admin', 'data', 'blocked', 'no')
    const stats = getAuditStats()
    expect(stats.total).toBe(3)
    expect(stats.successCount).toBe(1)
    expect(stats.failureCount).toBe(1)
    expect(stats.blockedCount).toBe(1)
    expect(stats.topActions[0].action).toBe('login')
  })

  it('purgeOldLogs 清除早于指定天数的日志', async () => {
    const { useAuditLog } = await load()
    const { log, purgeOldLogs, auditLog } = useAuditLog()
    log('login', 'user', 'auth', 'success', 'now')
    const old = new Date()
    old.setDate(old.getDate() - 10)
    auditLog.value.push({
      id: 'old',
      action: 'old',
      actor: 'user',
      target: 'x',
      result: 'success',
      detail: 'old',
      timestamp: old.toISOString(),
    })
    expect(purgeOldLogs(7)).toBe(1)
    expect(auditLog.value).toHaveLength(1)
  })
})

describe('useSecurityDashboard', () => {
  it('空数据时安全评分与分布正确', async () => {
    const { useSecurityDashboard } = await load()
    const { getDashboard } = useSecurityDashboard()
    const d = getDashboard()
    expect(d.totalIncidents).toBe(0)
    expect(d.unresolvedIncidents).toBe(0)
    expect(d.weeklyIncidents).toBe(0)
    expect(d.securityScore).toBeGreaterThan(80)
    expect(d.threatDistribution.medium).toBe(0)
  })

  it('有未解决事件时评分下降且活跃威胁列出', async () => {
    const { useIncidentResponse, useSecurityDashboard } = await load()
    const { createIncident } = useIncidentResponse()
    createIncident('data_leak', 'high', '数据泄露', '导出')
    createIncident('external_attack', 'critical', '外部攻击', '网络')
    const { getDashboard } = useSecurityDashboard()
    const d = getDashboard()
    expect(d.totalIncidents).toBe(2)
    expect(d.unresolvedIncidents).toBe(2)
    expect(d.activeThreats).toContain('data_leak')
    expect(d.activeThreats).toContain('external_attack')
    expect(d.threatDistribution.high).toBe(1)
    expect(d.threatDistribution.critical).toBe(1)
    expect(d.securityScore).toBeLessThan(100)
  })
})

describe('元数据', () => {
  it('威胁等级与类型元数据齐全', async () => {
    const { THREAT_LEVEL_META, THREAT_TYPE_META } = await load()
    expect(Object.keys(THREAT_LEVEL_META)).toHaveLength(5)
    expect(Object.keys(THREAT_TYPE_META)).toHaveLength(8)
    expect(THREAT_LEVEL_META.critical.label).toBe('严重')
    expect(THREAT_TYPE_META.data_leak.label).toBe('数据泄露')
  })
})
