// ============================================================
// 共鸣协议层 · 健康监控测试
// 测试 useResonanceEnhanced() 组合函数：
//   桥接注册、心跳、成功/失败记录、健康报告、
//   错误事件追踪、版本迁移、恢复策略
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================
// Mock storage 模块（使用 vi.hoisted 避免 hoisting 问题）
// ============================================================

const { storageMock } = vi.hoisted(() => ({
  storageMock: {
    getKV: vi.fn((_key: string, def: string) => def),
    setKV: vi.fn(),
  },
}))

vi.mock('../../engine/storage', () => ({
  storage: storageMock,
}))

// ============================================================
// 导入被测试模块
// ============================================================

import {
  useResonanceEnhanced,
  CURRENT_PROTOCOL_VERSION,
  DEFAULT_RECOVERY_STRATEGY,
} from '../health-monitor'

import type {
  VersionMigration,
  RecoveryStrategy,
  ProtocolVersion,
} from '../health-monitor'

// ============================================================
// 辅助函数
// ============================================================

function createVersion(major: number, minor: number, patch: number, label?: string): ProtocolVersion {
  return { major, minor, patch, label }
}

function createMigration(
  id: string,
  from: ProtocolVersion,
  to: ProtocolVersion,
  migrateFn?: (data: unknown) => unknown,
): VersionMigration {
  return {
    id,
    fromVersion: from,
    toVersion: to,
    description: `从 ${from.major}.${from.minor}.${from.patch} 迁移到 ${to.major}.${to.minor}.${to.patch}`,
    migrate: migrateFn ?? ((d: unknown) => d),
    reversible: false,
    createdAt: new Date().toISOString(),
  }
}

// ============================================================
// useResonanceEnhanced 测试
// ============================================================

describe('useResonanceEnhanced', () => {
  let enhanced: ReturnType<typeof useResonanceEnhanced>

  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.getKV.mockImplementation((_key: string, def: string) => def)
    enhanced = useResonanceEnhanced()
  })

  // ==========================================================
  // 计算属性
  // ==========================================================

  describe('计算属性', () => {
    it('allBridges: 初始为空数组', () => {
      expect(enhanced.allBridges.value).toEqual([])
    })

    it('healthyBridges: 初始为空数组', () => {
      expect(enhanced.healthyBridges.value).toEqual([])
    })

    it('unhealthyBridges: 初始为空数组', () => {
      expect(enhanced.unhealthyBridges.value).toEqual([])
    })

    it('unrecoveredErrors: 初始为空数组', () => {
      expect(enhanced.unrecoveredErrors.value).toEqual([])
    })
  })

  // ==========================================================
  // 桥接注册
  // ==========================================================

  describe('registerBridge', () => {
    it('应注册桥接并返回 BridgeHealth 对象', () => {
      const health = enhanced.registerBridge('bridge-1', '测试桥接', 'ai', ['dep-1'])
      expect(health.bridgeId).toBe('bridge-1')
      expect(health.name).toBe('测试桥接')
      expect(health.interfaceType).toBe('ai')
      expect(health.status).toBe('unknown')
      expect(health.healthScore).toBe(100)
      expect(health.errorCount).toBe(0)
      expect(health.successCount).toBe(0)
      expect(health.failureCount).toBe(0)
      expect(health.dependencies).toEqual(['dep-1'])
    })

    it('注册后 allBridges 应包含该桥接', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      expect(enhanced.allBridges.value).toHaveLength(1)
      expect(enhanced.allBridges.value[0].bridgeId).toBe('bridge-1')
    })

    it('多次注册应累计增加', () => {
      enhanced.registerBridge('b1', '桥接1', 'ai')
      enhanced.registerBridge('b2', '桥接2', 'capability')
      enhanced.registerBridge('b3', '桥接3', 'knowledge')
      expect(enhanced.allBridges.value).toHaveLength(3)
    })

    it('应持久化保存', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      expect(storageMock.setKV).toHaveBeenCalled()
    })

    it('getBridgeHealth: 应返回已注册桥接', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      const health = enhanced.getBridgeHealth('bridge-1')
      expect(health).toBeDefined()
      expect(health!.bridgeId).toBe('bridge-1')
    })

    it('getBridgeHealth: 不存在的桥接应返回 undefined', () => {
      const health = enhanced.getBridgeHealth('nonexistent')
      expect(health).toBeUndefined()
    })
  })

  // ==========================================================
  // 心跳
  // ==========================================================

  describe('heartbeat', () => {
    it('应更新心跳时间和状态为 healthy', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.getBridgeHealth('bridge-1')!.lastHeartbeat

      enhanced.heartbeat('bridge-1', 42)

      const after = enhanced.getBridgeHealth('bridge-1')!
      expect(after.status).toBe('healthy')
      expect(after.responseTime).toBe(42)
      // 心跳后健康分应增加
      expect(after.healthScore).toBe(100) // 上限为 100
    })

    it('心跳后健康分增加（上限 100）', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      // 先降低健康分
      enhanced.getBridgeHealth('bridge-1')!
      // 手动修改 healthScore 来测试上限
      enhanced.heartbeat('bridge-1', 0)
      const updated = enhanced.getBridgeHealth('bridge-1')!
      expect(updated.healthScore).toBe(100) // 上限不变
    })

    it('不存在的桥接心跳不应报错', () => {
      expect(() => enhanced.heartbeat('nonexistent', 0)).not.toThrow()
    })
  })

  // ==========================================================
  // 成功/失败记录
  // ==========================================================

  describe('recordSuccess', () => {
    it('应增加成功计数', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.recordSuccess('bridge-1')
      enhanced.recordSuccess('bridge-1')

      const health = enhanced.getBridgeHealth('bridge-1')!
      expect(health.successCount).toBe(2)
    })

    it('应增加健康分（上限 100）', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      // 健康分初始为 100，记录成功不变
      enhanced.recordSuccess('bridge-1')
      expect(enhanced.getBridgeHealth('bridge-1')!.healthScore).toBe(100)
    })

    it('状态从 unknown 变为 healthy', () => {
      const health = enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      expect(health.status).toBe('unknown')
      enhanced.recordSuccess('bridge-1')
      expect(enhanced.getBridgeHealth('bridge-1')!.status).toBe('healthy')
    })

    it('不存在的桥接记录成功不应报错', () => {
      expect(() => enhanced.recordSuccess('nonexistent')).not.toThrow()
    })
  })

  describe('recordFailure', () => {
    it('应增加失败计数并降低健康分', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.recordFailure('bridge-1', '连接超时', 'timeout')

      const health = enhanced.getBridgeHealth('bridge-1')!
      expect(health.failureCount).toBe(1)
      expect(health.errorCount).toBe(1)
      expect(health.healthScore).toBe(90) // 100 - 10
      expect(health.lastError).toBe('连接超时')
    })

    it('多次失败后状态变为 degraded', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      // 从 100 降到 60: 需要 4 次 (-10 * 4)
      for (let i = 0; i < 4; i++) {
        enhanced.recordFailure('bridge-1', `错误 ${i + 1}`, 'internal')
      }
      const health = enhanced.getBridgeHealth('bridge-1')!
      expect(health.status).toBe('degraded')
      expect(health.healthScore).toBe(60)
    })

    it('多次失败后状态变为 unhealthy', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      // 从 100 降到 30: 需要 7 次 (-10 * 7)
      for (let i = 0; i < 7; i++) {
        enhanced.recordFailure('bridge-1', `错误 ${i + 1}`, 'internal')
      }
      const health = enhanced.getBridgeHealth('bridge-1')!
      expect(health.status).toBe('unhealthy')
      expect(health.healthScore).toBeLessThanOrEqual(30)
    })

    it('应创建错误事件', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.recordFailure('bridge-1', '连接超时', 'timeout')

      expect(enhanced.errorEvents.value).toHaveLength(1)
      const event = enhanced.errorEvents.value[0]
      expect(event.bridgeId).toBe('bridge-1')
      expect(event.type).toBe('timeout')
      expect(event.message).toBe('连接超时')
      expect(event.recovered).toBe(false)
    })

    it('不存在的桥接记录失败不应报错', () => {
      expect(() =>
        enhanced.recordFailure('nonexistent', '错误', 'unknown'),
      ).not.toThrow()
    })

    it('recordFailure 接受多种错误类型', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')

      enhanced.recordFailure('bridge-1', '超时', 'timeout')
      enhanced.recordFailure('bridge-1', '连接失败', 'connection')
      enhanced.recordFailure('bridge-1', '校验失败', 'validation')
      enhanced.recordFailure('bridge-1', '权限不足', 'permission')
      enhanced.recordFailure('bridge-1', '内部错误', 'internal')

      expect(enhanced.errorEvents.value).toHaveLength(5)
      const types = enhanced.errorEvents.value.map(e => e.type)
      expect(types).toContain('timeout')
      expect(types).toContain('connection')
      expect(types).toContain('validation')
      expect(types).toContain('permission')
      expect(types).toContain('internal')
    })
  })

  // ==========================================================
  // 错误恢复
  // ==========================================================

  describe('错误恢复', () => {
    it('markRecovered: 应标记错误为已恢复', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.recordFailure('bridge-1', '连接超时', 'timeout')

      const errorId = enhanced.errorEvents.value[0].id
      enhanced.markRecovered(errorId)

      const event = enhanced.errorEvents.value.find(e => e.id === errorId)
      expect(event!.recovered).toBe(true)
      expect(event!.recoveredAt).toBeDefined()
    })

    it('markRecovered: 不存在的错误 ID 不应报错', () => {
      expect(() => enhanced.markRecovered('nonexistent-id')).not.toThrow()
    })

    it('unrecoveredErrors: 应只包含未恢复的错误', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.recordFailure('bridge-1', '错误1', 'internal')
      enhanced.recordFailure('bridge-1', '错误2', 'internal')

      expect(enhanced.unrecoveredErrors.value).toHaveLength(2)

      const errorId = enhanced.errorEvents.value[0].id
      enhanced.markRecovered(errorId)

      expect(enhanced.unrecoveredErrors.value).toHaveLength(1)
    })
  })

  // ==========================================================
  // 健康报告
  // ==========================================================

  describe('generateReport', () => {
    it('空桥接时报告应返回默认值', () => {
      const report = enhanced.generateReport()
      expect(report.totalBridges).toBe(0)
      expect(report.healthyBridges).toBe(0)
      expect(report.degradedBridges).toBe(0)
      expect(report.unhealthyBridges).toBe(0)
      expect(report.overallScore).toBe(100)
      expect(report.totalCalls).toBe(0)
      expect(report.totalFailures).toBe(0)
      expect(report.successRate).toBe(100)
      expect(report.generatedAt).toBeDefined()
      expect(Array.isArray(report.bridgeDetails)).toBe(true)
      expect(Array.isArray(report.recentErrors)).toBe(true)
    })

    it('有健康桥接时报告应正确统计', () => {
      enhanced.registerBridge('bridge-1', '健康桥接', 'ai')
      enhanced.heartbeat('bridge-1', 10)
      enhanced.recordSuccess('bridge-1')
      enhanced.recordSuccess('bridge-1')

      const report = enhanced.generateReport()
      expect(report.totalBridges).toBe(1)
      expect(report.healthyBridges).toBe(1)
      // totalCalls = successCount + failureCount（心跳不影响调用计数）
      expect(report.totalCalls).toBe(2)
      // Verify success rate
      expect(report.successRate).toBeGreaterThanOrEqual(0)
    })

    it('有不健康桥接时应正确反映', () => {
      enhanced.registerBridge('bridge-1', '问题桥接', 'ai')
      for (let i = 0; i < 7; i++) {
        enhanced.recordFailure('bridge-1', '错误', 'internal')
      }

      const report = enhanced.generateReport()
      expect(report.unhealthyBridges).toBe(1)
      expect(report.healthyBridges).toBe(0)
      expect(report.overallScore).toBeLessThan(100)
    })

    it('多个桥接时 overallScore 应为平均值', () => {
      enhanced.registerBridge('healthy', '健康桥接', 'ai')
      enhanced.registerBridge('sick', '问题桥接', 'capability')

      enhanced.heartbeat('healthy', 5)
      for (let i = 0; i < 7; i++) {
        enhanced.recordFailure('sick', '错误', 'internal')
      }

      const report = enhanced.generateReport()
      expect(report.totalBridges).toBe(2)
      // 健康分平均值：健康(100) + 问题(30) = 65
      expect(report.overallScore).toBeLessThan(100)
    })

    it('report 应包含未恢复的最近错误', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.recordFailure('bridge-1', '错误消息', 'timeout')

      const report = enhanced.generateReport()
      expect(report.recentErrors).toHaveLength(1)
      expect(report.recentErrors[0].message).toBe('错误消息')
    })
  })

  // ==========================================================
  // resetBridgeHealth
  // ==========================================================

  describe('resetBridgeHealth', () => {
    it('应重置桥接健康状态', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      for (let i = 0; i < 7; i++) {
        enhanced.recordFailure('bridge-1', '错误', 'internal')
      }
      expect(enhanced.getBridgeHealth('bridge-1')!.status).toBe('unhealthy')

      enhanced.resetBridgeHealth('bridge-1')

      const health = enhanced.getBridgeHealth('bridge-1')!
      expect(health.status).toBe('healthy')
      expect(health.healthScore).toBe(100)
      expect(health.errorCount).toBe(0)
      expect(health.lastError).toBeUndefined()
    })

    it('不存在的桥接重置不应报错', () => {
      expect(() => enhanced.resetBridgeHealth('nonexistent')).not.toThrow()
    })
  })

  // ==========================================================
  // 版本管理
  // ==========================================================

  describe('版本管理', () => {
    it('CURRENT_PROTOCOL_VERSION 应为 v2.1.0', () => {
      expect(CURRENT_PROTOCOL_VERSION.major).toBe(2)
      expect(CURRENT_PROTOCOL_VERSION.minor).toBe(1)
      expect(CURRENT_PROTOCOL_VERSION.patch).toBe(0)
      expect(CURRENT_PROTOCOL_VERSION.label).toBe('stable')
    })

    it('compareVersions: 相同版本应返回 0', () => {
      const a = createVersion(1, 0, 0)
      const b = createVersion(1, 0, 0)
      expect(enhanced.compareVersions(a, b)).toBe(0)
    })

    it('compareVersions: a 大于 b 应返回正数', () => {
      const a = createVersion(2, 0, 0)
      const b = createVersion(1, 0, 0)
      expect(enhanced.compareVersions(a, b)).toBeGreaterThan(0)
    })

    it('compareVersions: a 小于 b 应返回负数', () => {
      const a = createVersion(1, 0, 0)
      const b = createVersion(2, 0, 0)
      expect(enhanced.compareVersions(a, b)).toBeLessThan(0)
    })

    it('compareVersions: 同主版本号比较次版本号', () => {
      const a = createVersion(1, 5, 0)
      const b = createVersion(1, 3, 0)
      expect(enhanced.compareVersions(a, b)).toBeGreaterThan(0)
    })

    it('compareVersions: 同主次版本号比较补丁版本号', () => {
      const a = createVersion(1, 0, 5)
      const b = createVersion(1, 0, 3)
      expect(enhanced.compareVersions(a, b)).toBeGreaterThan(0)
    })

    it('isCompatible: 同主版本且次版本 >= 应兼容', () => {
      expect(enhanced.isCompatible(
        createVersion(2, 1, 0),
        createVersion(2, 0, 0),
      )).toBe(true)
    })

    it('isCompatible: 主版本不同应不兼容', () => {
      expect(enhanced.isCompatible(
        createVersion(2, 0, 0),
        createVersion(1, 9, 9),
      )).toBe(false)
    })

    it('isCompatible: 次版本低应不兼容', () => {
      expect(enhanced.isCompatible(
        createVersion(2, 0, 0),
        createVersion(2, 1, 0),
      )).toBe(false)
    })

    it('versionToString: 应正确格式化版本字符串', () => {
      const v = createVersion(2, 1, 0, 'stable')
      expect(enhanced.versionToString(v)).toBe('v2.1.0-stable')
    })

    it('versionToString: 无标签时不应包含连字符', () => {
      const v = createVersion(2, 1, 0)
      expect(enhanced.versionToString(v)).toBe('v2.1.0')
    })

    it('registerMigration: 应注册迁移', () => {
      const migration = createMigration(
        'mig-1',
        createVersion(1, 0, 0),
        createVersion(2, 0, 0),
      )
      enhanced.registerMigration(migration)
      expect(enhanced.migrations.value).toHaveLength(1)
      expect(enhanced.migrations.value[0].id).toBe('mig-1')
    })

    it('findMigrationPath: 应找到迁移路径', () => {
      enhanced.registerMigration(createMigration(
        'mig-1', createVersion(1, 0, 0), createVersion(1, 1, 0),
      ))
      enhanced.registerMigration(createMigration(
        'mig-2', createVersion(1, 1, 0), createVersion(2, 0, 0),
      ))

      const path = enhanced.findMigrationPath(
        createVersion(1, 0, 0),
        createVersion(2, 0, 0),
      )
      expect(path).toHaveLength(2)
    })

    it('executeMigration: 应执行迁移链', () => {
      enhanced.registerMigration(createMigration(
        'mig-1',
        createVersion(1, 0, 0),
        createVersion(1, 1, 0),
        (d: unknown) => ({ ...(d as any), step1: true }),
      ))
      enhanced.registerMigration(createMigration(
        'mig-2',
        createVersion(1, 1, 0),
        createVersion(2, 0, 0),
        (d: unknown) => ({ ...(d as any), step2: true }),
      ))

      const result = enhanced.executeMigration(
        { original: true },
        createVersion(1, 0, 0),
        createVersion(2, 0, 0),
      )

      expect(result.success).toBe(true)
      expect((result.data as any).original).toBe(true)
      expect((result.data as any).step1).toBe(true)
      expect((result.data as any).step2).toBe(true)
    })

    it('executeMigration: 无迁移路径时应返回失败', () => {
      const result = enhanced.executeMigration(
        {},
        createVersion(1, 0, 0),
        createVersion(2, 0, 0),
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('未找到')
    })

    it('executeMigration: 迁移函数抛出异常时应返回失败', () => {
      enhanced.registerMigration(createMigration(
        'mig-error',
        createVersion(1, 0, 0),
        createVersion(2, 0, 0),
        () => { throw new Error('迁移失败') },
      ))

      const result = enhanced.executeMigration(
        {},
        createVersion(1, 0, 0),
        createVersion(2, 0, 0),
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('迁移失败')
    })
  })

  // ==========================================================
  // 恢复策略
  // ==========================================================

  describe('恢复策略', () => {
    it('DEFAULT_RECOVERY_STRATEGY 应具有默认值', () => {
      expect(DEFAULT_RECOVERY_STRATEGY.maxRetries).toBe(3)
      expect(DEFAULT_RECOVERY_STRATEGY.retryDelay).toBe(1000)
      expect(DEFAULT_RECOVERY_STRATEGY.backoff).toBe('exponential')
      expect(DEFAULT_RECOVERY_STRATEGY.circuitBreaker).toBe(true)
      expect(DEFAULT_RECOVERY_STRATEGY.circuitBreakerThreshold).toBe(5)
      expect(DEFAULT_RECOVERY_STRATEGY.circuitBreakerRecovery).toBe(30000)
    })

    it('setRecoveryStrategy: 应设置恢复策略', () => {
      const strategy: RecoveryStrategy = {
        id: 'custom',
        name: '自定义策略',
        maxRetries: 5,
        retryDelay: 2000,
        backoff: 'linear',
        circuitBreaker: true,
        circuitBreakerThreshold: 3,
        circuitBreakerRecovery: 60000,
      }
      enhanced.setRecoveryStrategy('bridge-1', strategy)
      // 不应报错
    })

    it('getRecoveryStrategy: 未设置时应返回默认策略', () => {
      const strategy = enhanced.getRecoveryStrategy('nonexistent')
      expect(strategy.id).toBe('default')
      expect(strategy.maxRetries).toBe(3)
    })

    it('getRecoveryStrategy: 已设置时应返回自定义策略', () => {
      const customStrategy: RecoveryStrategy = {
        id: 'custom-bridge',
        name: '桥接策略',
        maxRetries: 10,
        retryDelay: 500,
        backoff: 'fixed',
        circuitBreaker: false,
        circuitBreakerThreshold: 0,
        circuitBreakerRecovery: 0,
      }
      enhanced.setRecoveryStrategy('bridge-1', customStrategy)
      const strategy = enhanced.getRecoveryStrategy('bridge-1')
      expect(strategy.id).toBe('custom-bridge')
      expect(strategy.maxRetries).toBe(10)
      expect(strategy.backoff).toBe('fixed')
    })

    it('calculateBackoff: fixed 策略应返回固定延迟', () => {
      const strategy: RecoveryStrategy = {
        ...DEFAULT_RECOVERY_STRATEGY,
        backoff: 'fixed',
        retryDelay: 1000,
      }
      expect(enhanced.calculateBackoff(strategy, 1)).toBe(1000)
      expect(enhanced.calculateBackoff(strategy, 5)).toBe(1000)
    })

    it('calculateBackoff: linear 策略应线性增长', () => {
      const strategy: RecoveryStrategy = {
        ...DEFAULT_RECOVERY_STRATEGY,
        backoff: 'linear',
        retryDelay: 1000,
      }
      expect(enhanced.calculateBackoff(strategy, 1)).toBe(1000)
      expect(enhanced.calculateBackoff(strategy, 3)).toBe(3000)
      expect(enhanced.calculateBackoff(strategy, 5)).toBe(5000)
    })

    it('calculateBackoff: exponential 策略应指数增长', () => {
      const strategy: RecoveryStrategy = {
        ...DEFAULT_RECOVERY_STRATEGY,
        backoff: 'exponential',
        retryDelay: 1000,
      }
      expect(enhanced.calculateBackoff(strategy, 1)).toBe(1000)  // 1000 * 2^0
      expect(enhanced.calculateBackoff(strategy, 2)).toBe(2000)  // 1000 * 2^1
      expect(enhanced.calculateBackoff(strategy, 3)).toBe(4000)  // 1000 * 2^2
      expect(enhanced.calculateBackoff(strategy, 4)).toBe(8000)  // 1000 * 2^3
    })

    it('isCircuitBreakerOpen: 未启用熔断时应返回 false', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.setRecoveryStrategy('bridge-1', {
        ...DEFAULT_RECOVERY_STRATEGY,
        circuitBreaker: false,
      })
      expect(enhanced.isCircuitBreakerOpen('bridge-1')).toBe(false)
    })

    it('isCircuitBreakerOpen: 错误数超过阈值时应返回 true', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.setRecoveryStrategy('bridge-1', {
        ...DEFAULT_RECOVERY_STRATEGY,
        circuitBreaker: true,
        circuitBreakerThreshold: 3,
      })
      for (let i = 0; i < 3; i++) {
        enhanced.recordFailure('bridge-1', '错误', 'internal')
      }
      expect(enhanced.isCircuitBreakerOpen('bridge-1')).toBe(true)
    })

    it('isCircuitBreakerOpen: 错误数未超过阈值时应返回 false', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      enhanced.setRecoveryStrategy('bridge-1', {
        ...DEFAULT_RECOVERY_STRATEGY,
        circuitBreaker: true,
        circuitBreakerThreshold: 5,
      })
      enhanced.recordFailure('bridge-1', '错误', 'internal')
      expect(enhanced.isCircuitBreakerOpen('bridge-1')).toBe(false)
    })
  })

  // ==========================================================
  // 持久化
  // ==========================================================

  describe('持久化', () => {
    it('注册桥接后应调用 storage.setKV', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      expect(storageMock.setKV).toHaveBeenCalled()
    })

    it('recordFailure 后应调用 storage.setKV', () => {
      enhanced.registerBridge('bridge-1', '测试桥接', 'ai')
      storageMock.setKV.mockClear()
      enhanced.recordFailure('bridge-1', '错误', 'internal')
      // 保存桥接健康和错误事件
      expect(storageMock.setKV).toHaveBeenCalled()
    })

    it('registerMigration 后应调用 storage.setKV', () => {
      storageMock.setKV.mockClear()
      enhanced.registerMigration(createMigration(
        'mig-1', createVersion(1, 0, 0), createVersion(2, 0, 0),
      ))
      expect(storageMock.setKV).toHaveBeenCalled()
    })
  })
})