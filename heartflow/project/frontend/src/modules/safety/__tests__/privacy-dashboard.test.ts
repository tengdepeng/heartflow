// ============================================================
// 守护室 · 隐私仪表盘测试（P15-6）
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePrivacyDashboard, DATA_CATEGORY_META, SENSITIVITY_META, EXPOSURE_STATUS_META } from '../privacy-dashboard'
import type { DataCategory } from '../privacy-dashboard'

// Mock storage
const storageMock = new Map<string, unknown>()

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? val as T : defaultValue
    },
    setKV: (key: string, value: unknown) => {
      storageMock.set(key, value)
    },
    removeKV: (key: string) => {
      storageMock.delete(key)
    },
    getKeys: () => Array.from(storageMock.keys()),
  },
}))

beforeEach(() => {
  storageMock.clear()
  // 模拟 localStorage
  globalThis.localStorage = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn().mockReturnValue(null),
    length: 0,
  } as unknown as Storage
})

// ============================================================
// 数据暴露面测试
// ============================================================

describe('数据暴露面 (Data Exposure)', () => {
  it('初始化后应该包含 10 个数据类别', () => {
    const { exposures } = usePrivacyDashboard()
    expect(exposures.value.length).toBe(10)
  })

  it('敏感数据（日记、健康、个人信息）应该标记为敏感或机密', () => {
    const { exposures } = usePrivacyDashboard()
    const diary = exposures.value.find(e => e.category === 'diary')
    const health = exposures.value.find(e => e.category === 'health')
    const personal = exposures.value.find(e => e.category === 'personal')

    expect(diary?.sensitivity).toBe('confidential')
    expect(health?.sensitivity).toBe('critical')
    expect(personal?.sensitivity).toBe('confidential')
  })

  it('updateExposure 应该能更新暴露面状态', () => {
    const { updateExposure } = usePrivacyDashboard()
    const result = updateExposure('emotion', {
      exposureStatus: 'at_risk',
      encrypted: false,
    })

    expect(result).not.toBeNull()
    expect(result?.exposureStatus).toBe('at_risk')
    expect(result?.encrypted).toBe(false)
    expect(result?.riskScore).toBeGreaterThan(0)
  })

  it('updateExposure 对不存在的类别应该返回 null', () => {
    const { updateExposure } = usePrivacyDashboard()
    const result = updateExposure('nonexistent' as DataCategory, {})
    expect(result).toBeNull()
  })

  it('recordAccess 应该增加访问计数', () => {
    const { exposures, recordAccess } = usePrivacyDashboard()
    const before = exposures.value.find(e => e.category === 'emotion')?.recentAccessCount ?? 0

    recordAccess('emotion')
    const after = exposures.value.find(e => e.category === 'emotion')?.recentAccessCount ?? 0

    expect(after).toBe(before + 1)
  })

  it('getExposureSummary 应该返回正确的摘要', () => {
    const { getExposureSummary } = usePrivacyDashboard()
    const summary = getExposureSummary()

    expect(summary.totalCategories).toBe(10)
    expect(summary.safeCategories).toBeGreaterThanOrEqual(0)
    expect(summary.totalRiskScore).toBeGreaterThanOrEqual(0)
    expect(summary.totalRiskScore).toBeLessThanOrEqual(100)
  })
})

// ============================================================
// 权限审计测试
// ============================================================

describe('权限审计 (Permission Audit)', () => {
  it('初始化后应该包含默认权限条目', () => {
    const { permissions } = usePrivacyDashboard()
    expect(permissions.value.length).toBeGreaterThan(0)
  })

  it('应该包含默认授予的系统权限', () => {
    const { permissions } = usePrivacyDashboard()
    const grantedPerms = permissions.value.filter(p => p.granted)
    expect(grantedPerms.length).toBeGreaterThan(0)
  })

  it('grantPermission 应该能授予权限', () => {
    const { permissions, grantPermission } = usePrivacyDashboard()
    const ungranted = permissions.value.find(p => !p.granted)
    expect(ungranted).toBeDefined()

    if (ungranted) {
      const result = grantPermission(ungranted.id)
      expect(result).toBe(true)
      const updated = permissions.value.find(p => p.id === ungranted.id)
      expect(updated?.granted).toBe(true)
    }
  })

  it('grantPermission 对不存在的权限应该返回 false', () => {
    const { grantPermission } = usePrivacyDashboard()
    const result = grantPermission('nonexistent_id')
    expect(result).toBe(false)
  })

  it('revokePermission 应该能撤销可撤销的权限', () => {
    const { permissions, revokePermission } = usePrivacyDashboard()
    const revocable = permissions.value.find(p => p.granted && p.revocable)
    expect(revocable).toBeDefined()

    if (revocable) {
      const result = revokePermission(revocable.id)
      expect(result).toBe(true)
      const updated = permissions.value.find(p => p.id === revocable.id)
      expect(updated?.granted).toBe(false)
    }
  })

  it('revokePermission 对不可撤销的权限应该返回 false', () => {
    const { permissions, revokePermission } = usePrivacyDashboard()
    const nonRevocable = permissions.value.find(p => p.granted && !p.revocable)
    expect(nonRevocable).toBeDefined()

    if (nonRevocable) {
      const result = revokePermission(nonRevocable.id)
      expect(result).toBe(false)
    }
  })

  it('recordPermissionUse 应该记录使用时间', () => {
    const { permissions, recordPermissionUse } = usePrivacyDashboard()
    const perm = permissions.value.find(p => p.granted)
    expect(perm).toBeDefined()

    if (perm) {
      recordPermissionUse(perm.id)
      const updated = permissions.value.find(p => p.id === perm.id)
      expect(updated?.lastUsedAt).not.toBeNull()
    }
  })

  it('performPermissionAudit 应该生成审计报告', () => {
    const { performPermissionAudit } = usePrivacyDashboard()
    const audit = performPermissionAudit()

    expect(audit.totalPermissions).toBeGreaterThan(0)
    expect(audit.grantedPermissions).toBeGreaterThan(0)
    expect(audit.auditedAt).toBeDefined()
    expect(audit.permissions.length).toBeGreaterThan(0)
  })

  it('getLatestAudit 应该返回最近审计', () => {
    const { performPermissionAudit, getLatestAudit } = usePrivacyDashboard()
    expect(getLatestAudit()).toBeNull()

    performPermissionAudit()
    const audit = getLatestAudit()
    expect(audit).not.toBeNull()
    expect(audit?.totalPermissions).toBeGreaterThan(0)
  })
})

// ============================================================
// 隐私评分测试
// ============================================================

describe('隐私评分 (Privacy Score)', () => {
  it('calculatePrivacyScore 应该返回完整的评分结果', () => {
    const { calculatePrivacyScore } = usePrivacyDashboard()
    const score = calculatePrivacyScore()

    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(score.grade).toMatch(/^[A-F]$/)
    expect(score.dimensions.length).toBe(4)
    expect(score.scoredAt).toBeDefined()
  })

  it('评分应该有四个维度', () => {
    const { calculatePrivacyScore } = usePrivacyDashboard()
    const score = calculatePrivacyScore()

    const dimensionNames = score.dimensions.map(d => d.name)
    expect(dimensionNames).toContain('数据加密保护')
    expect(dimensionNames).toContain('暴露面控制')
    expect(dimensionNames).toContain('权限管理')
    expect(dimensionNames).toContain('泄露风险')
  })

  it('每个维度应该有正确的权重', () => {
    const { calculatePrivacyScore } = usePrivacyDashboard()
    const score = calculatePrivacyScore()

    const totalWeight = score.dimensions.reduce((sum, d) => sum + d.weight, 0)
    expect(totalWeight).toBe(100)
  })

  it('getLatestScore 应该返回最近评分', () => {
    const { calculatePrivacyScore, getLatestScore } = usePrivacyDashboard()
    expect(getLatestScore()).toBeNull()

    calculatePrivacyScore()
    const score = getLatestScore()
    expect(score).not.toBeNull()
    expect(score?.dimensions.length).toBe(4)
  })

  it('评分应该有趋势信息', () => {
    const { calculatePrivacyScore, getLatestScore } = usePrivacyDashboard()
    calculatePrivacyScore()
    const score = getLatestScore()
    expect(score?.trend).toBeDefined()
    expect(['improving', 'stable', 'declining']).toContain(score?.trend)
  })
})

// ============================================================
// 泄露预警测试
// ============================================================

describe('泄露预警 (Leak Warning)', () => {
  it('generateWarning 应该创建预警', () => {
    const { warnings, generateWarning } = usePrivacyDashboard()
    const before = warnings.value.length

    generateWarning(
      'high',
      '测试预警',
      '这是一个测试预警',
      ['emotion'],
      0.8,
      'significant',
      ['建议修复'],
    )

    expect(warnings.value.length).toBe(before + 1)
    const warning = warnings.value[0]
    expect(warning.level).toBe('high')
    expect(warning.title).toBe('测试预警')
    expect(warning.autoGenerated).toBe(true)
  })

  it('acknowledgeWarning 应该确认预警', () => {
    const { generateWarning, acknowledgeWarning, warnings } = usePrivacyDashboard()
    const warning = generateWarning(
      'medium',
      '待确认预警',
      '测试',
      ['diary'],
      0.5,
      'moderate',
      ['建议'],
    )

    const result = acknowledgeWarning(warning.id)
    expect(result).toBe(true)
    const updated = warnings.value.find(w => w.id === warning.id)
    expect(updated?.acknowledged).toBe(true)
  })

  it('resolveWarning 应该解决预警', () => {
    const { generateWarning, resolveWarning, warnings } = usePrivacyDashboard()
    const warning = generateWarning(
      'low',
      '待解决预警',
      '测试',
      ['system'],
      0.3,
      'minimal',
      ['建议'],
    )

    const result = resolveWarning(warning.id)
    expect(result).toBe(true)
    const updated = warnings.value.find(w => w.id === warning.id)
    expect(updated?.resolved).toBe(true)
    expect(updated?.acknowledged).toBe(true)
  })

  it('getActiveWarnings 应该只返回未解决的预警', () => {
    const { generateWarning, resolveWarning, getActiveWarnings } = usePrivacyDashboard()

    const w1 = generateWarning('high', '预警1', '测试', ['emotion'], 0.8, 'significant', [])
    const w2 = generateWarning('medium', '预警2', '测试', ['diary'], 0.5, 'moderate', [])

    resolveWarning(w1.id)

    const active = getActiveWarnings()
    expect(active.length).toBe(1)
    expect(active[0].id).toBe(w2.id)
  })

  it('runLeakDetection 应该检测未加密的敏感数据', () => {
    const { updateExposure, runLeakDetection } = usePrivacyDashboard()

    // 将健康数据设为未加密
    updateExposure('health', { encrypted: false })

    const warnings = runLeakDetection()
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('acknowledgeWarning 对不存在的预警应该返回 false', () => {
    const { acknowledgeWarning } = usePrivacyDashboard()
    const result = acknowledgeWarning('nonexistent_id')
    expect(result).toBe(false)
  })
})

// ============================================================
// 一键锁定测试
// ============================================================

describe('一键锁定 (One-Click Lock)', () => {
  it('lock 应该锁定系统', () => {
    const { lockState, lock } = usePrivacyDashboard()
    const result = lock('all', 0, '测试锁定')

    expect(result).toBe(true)
    expect(lockState.value.locked).toBe(true)
    expect(lockState.value.reason).toBe('测试锁定')
    expect(lockState.value.scope).toBe('all')
  })

  it('已锁定状态下再次锁定应该返回 false', () => {
    const { lock } = usePrivacyDashboard()
    lock('all')
    const result = lock('all')
    expect(result).toBe(false)
  })

  it('lock 应该撤销高风险权限', () => {
    const { permissions, lock, grantPermission } = usePrivacyDashboard()

    // 先授予一个高风险权限
    const criticalPerm = permissions.value.find(p => p.riskLevel === 'critical')
    if (criticalPerm) {
      grantPermission(criticalPerm.id)
    }

    lock('all')

    // 检查高风险权限是否被撤销
    const updatedPerms = permissions.value.filter(
      p => (p.riskLevel === 'high' || p.riskLevel === 'critical') && p.revocable,
    )
    for (const perm of updatedPerms) {
      expect(perm.granted).toBe(false)
    }
  })

  it('unlock 应该解锁（无密码）', () => {
    const { lockState, lock, unlock } = usePrivacyDashboard()
    lock('all')
    expect(lockState.value.locked).toBe(true)

    const result = unlock()
    expect(result).toBe(true)
    expect(lockState.value.locked).toBe(false)
  })

  it('unlock 密码错误应该返回 false', () => {
    const { lockState, lock, unlock, setLockPassword } = usePrivacyDashboard()
    setLockPassword('correct_password')
    lock('all')
    expect(lockState.value.locked).toBe(true)

    const result = unlock('wrong_password')
    expect(result).toBe(false)
    expect(lockState.value.locked).toBe(true)
  })

  it('unlock 密码正确应该返回 true', () => {
    const { lockState, lock, unlock, setLockPassword } = usePrivacyDashboard()
    setLockPassword('correct_password')
    lock('all')
    expect(lockState.value.locked).toBe(true)

    const result = unlock('correct_password')
    expect(result).toBe(true)
    expect(lockState.value.locked).toBe(false)
  })

  it('sensitive_only 锁定范围应该只影响敏感数据', () => {
    const { lockState, lock } = usePrivacyDashboard()
    lock('sensitive_only')

    expect(lockState.value.locked).toBe(true)
    expect(lockState.value.scope).toBe('sensitive_only')
  })

  it('外部锁定范围设置正确', () => {
    const { lockState, lock } = usePrivacyDashboard()
    lock('external_only')

    expect(lockState.value.locked).toBe(true)
    expect(lockState.value.scope).toBe('external_only')
  })
})

// ============================================================
// 综合仪表盘测试
// ============================================================

describe('综合仪表盘 (Dashboard)', () => {
  it('getDashboard 应该返回完整仪表盘数据', () => {
    const { getDashboard } = usePrivacyDashboard()
    const dashboard = getDashboard()

    expect(dashboard.exposureSummary).toBeDefined()
    expect(dashboard.exposureSummary.totalCategories).toBe(10)
    expect(dashboard.lockState).toBeDefined()
    expect(dashboard.activeWarnings).toBeDefined()
    expect(dashboard.overallStatus).toBeDefined()
    expect(['safe', 'warning', 'danger']).toContain(dashboard.overallStatus)
  })

  it('初始状态应该是 safe', () => {
    const { getDashboard } = usePrivacyDashboard()
    const dashboard = getDashboard()
    expect(dashboard.overallStatus).toBe('safe')
  })

  it('有 critical 预警时状态应该是 danger', () => {
    const { generateWarning, getDashboard } = usePrivacyDashboard()
    generateWarning('critical', '严重预警', '测试', ['health'], 0.9, 'severe', ['立即修复'])
    const dashboard = getDashboard()
    expect(dashboard.overallStatus).toBe('danger')
  })
})

// ============================================================
// 配置测试
// ============================================================

describe('配置管理', () => {
  it('默认配置应该正确', () => {
    const { config } = usePrivacyDashboard()
    expect(config.value.autoScoring).toBe(true)
    expect(config.value.scoringInterval).toBe(7)
    expect(config.value.leakWarningEnabled).toBe(true)
    expect(config.value.warningSensitivity).toBe(0.7)
    expect(config.value.autoLockTimeout).toBe(30)
  })

  it('updateConfig 应该能更新配置', () => {
    const { config, updateConfig } = usePrivacyDashboard()
    updateConfig({ autoLockTimeout: 60, warningSensitivity: 0.9 })

    expect(config.value.autoLockTimeout).toBe(60)
    expect(config.value.warningSensitivity).toBe(0.9)
    // 未更新的字段应保持不变
    expect(config.value.autoScoring).toBe(true)
  })
})

// ============================================================
// 辅助函数测试
// ============================================================

describe('辅助函数与元数据', () => {
  it('DATA_CATEGORY_META 应该包含所有数据类别', () => {
    const categories = ['emotion', 'diary', 'personal', 'behavior', 'health', 'location', 'social', 'system', 'creative', 'financial']
    for (const cat of categories) {
      expect(DATA_CATEGORY_META[cat as DataCategory]).toBeDefined()
      expect(DATA_CATEGORY_META[cat as DataCategory].label).toBeDefined()
      expect(DATA_CATEGORY_META[cat as DataCategory].icon).toBeDefined()
    }
  })

  it('SENSITIVITY_META 应该包含所有敏感度级别', () => {
    const levels = ['public', 'internal', 'sensitive', 'confidential', 'critical']
    for (const level of levels) {
      expect(SENSITIVITY_META[level as 'public' | 'internal' | 'sensitive' | 'confidential' | 'critical']).toBeDefined()
      expect(SENSITIVITY_META[level as 'public' | 'internal' | 'sensitive' | 'confidential' | 'critical'].score).toBeGreaterThanOrEqual(0)
    }
  })

  it('EXPOSURE_STATUS_META 应该包含所有暴露状态', () => {
    const statuses = ['safe', 'monitored', 'exposed', 'at_risk', 'breached']
    for (const status of statuses) {
      expect(EXPOSURE_STATUS_META[status as 'safe' | 'monitored' | 'exposed' | 'at_risk' | 'breached']).toBeDefined()
      expect(EXPOSURE_STATUS_META[status as 'safe' | 'monitored' | 'exposed' | 'at_risk' | 'breached'].label).toBeDefined()
    }
  })
})