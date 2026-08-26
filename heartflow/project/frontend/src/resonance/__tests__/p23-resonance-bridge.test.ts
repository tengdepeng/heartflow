// ============================================================
// P23 共鸣协议视图桥接层测试
// 测试 useResonanceBridge() 组合函数：
//   初始化、桥接注册、状态刷新、健康报告、
//   错误恢复、版本管理、建议生成
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// ============================================================
// 模块级变量（在 beforeEach 中初始化为 Vue ref）
// ============================================================

let mockProtocol: any
let mockEnhanced: any

// 用于重置 mock 状态的原始数据引用
let _allBridges: any
let _unhealthyBridges: any
let _migrations: any
let _errorEvents: any
let _unrecoveredErrors: any

// ============================================================
// vi.mock 声明（使用闭包引用模块级变量）
// ============================================================

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((_key: string, def: any) => def),
    setKV: vi.fn(),
  },
}))

vi.mock('../index', () => ({
  useResonance: () => mockProtocol,
}))

vi.mock('../health-monitor', () => {
  const CURRENT_PROTOCOL_VERSION = { major: 2, minor: 1, patch: 0, label: 'stable' }
  return {
    useResonanceEnhanced: () => mockEnhanced,
    CURRENT_PROTOCOL_VERSION,
    DEFAULT_RECOVERY_STRATEGY: {
      id: 'default', name: '默认恢复策略', maxRetries: 3, retryDelay: 1000,
      backoff: 'exponential', circuitBreaker: true, circuitBreakerThreshold: 5, circuitBreakerRecovery: 30000,
    },
  }
})

// ============================================================
// 辅助函数
// ============================================================

/** 创建 mock 协议注册表 */
function createMockProtocol() {
  const _internalState = {
    moduleCount: 0,
    activeModuleCount: 0,
    interfaceCounts: {
      interaction: 0, capability: 0, ai: 0, knowledge: 0,
      'data-transfer': 0, automation: 0, thread: 0, extension: 0,
    } as Record<string, number>,
    lastRegisteredAt: null as number | null,
    initialized: true,
  }
  let _modules: any[] = []

  return {
    getState: vi.fn(() => ({ ..._internalState })),
    getAll: vi.fn(() => [..._modules]),
    initialize: vi.fn(() => { _internalState.initialized = true }),
    destroy: vi.fn(() => { _internalState.initialized = false; _modules = [] }),
    register: vi.fn((mod: any, _instance: any) => {
      _modules.push({
        identity: mod,
        instance: _instance,
        registeredAt: Date.now(),
        status: 'active' as const,
      })
      _internalState.moduleCount = _modules.length
      _internalState.activeModuleCount = _modules.filter((m: any) => m.status === 'active').length
      return { success: true }
    }),
    unregister: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
    findByInterface: vi.fn(() => []),
    query: vi.fn(() => []),
    isInterfaceAvailable: vi.fn(() => false),
    isRegistered: vi.fn(() => false),
  }
}

/** 创建 mock 增强引擎（使用 Vue ref 实现响应式） */
function createMockEnhanced() {
  _allBridges = ref<any[]>([])
  _unhealthyBridges = ref<any[]>([])
  _migrations = ref<any[]>([])
  _errorEvents = ref<any[]>([])
  _unrecoveredErrors = ref<any[]>([])

  return {
    allBridges: _allBridges,
    unhealthyBridges: _unhealthyBridges,
    migrations: _migrations,
    errorEvents: _errorEvents,
    unrecoveredErrors: _unrecoveredErrors,

    registerBridge: vi.fn((bridgeId: string, name: string, interfaceType: string, deps: string[] = []) => {
      const health = {
        bridgeId,
        name,
        interfaceType,
        status: 'unknown' as const,
        lastHeartbeat: new Date().toISOString(),
        responseTime: 0,
        errorCount: 0,
        successCount: 0,
        failureCount: 0,
        healthScore: 100,
        dependencies: deps,
      }
      _allBridges.value = [..._allBridges.value, health]
      return health
    }),

    heartbeat: vi.fn((bridgeId: string, responseTime: number = 0) => {
      const health = _allBridges.value.find((b: any) => b.bridgeId === bridgeId)
      if (health) {
        health.lastHeartbeat = new Date().toISOString()
        health.responseTime = responseTime
        health.status = 'healthy'
        health.healthScore = Math.min(100, health.healthScore + 5)
        _allBridges.value = [..._allBridges.value]
        // 同步更新 unhealthyBridges
        _unhealthyBridges.value = _allBridges.value.filter(
          (b: any) => b.status === 'unhealthy' || b.status === 'degraded'
        )
      }
    }),

    recordSuccess: vi.fn((bridgeId: string) => {
      const health = _allBridges.value.find((b: any) => b.bridgeId === bridgeId)
      if (health) {
        health.successCount++
        health.healthScore = Math.min(100, health.healthScore + 1)
        if (health.status === 'unknown') health.status = 'healthy'
        _allBridges.value = [..._allBridges.value]
      }
    }),

    recordFailure: vi.fn((bridgeId: string, error: string, errorType: string = 'unknown') => {
      const health = _allBridges.value.find((b: any) => b.bridgeId === bridgeId)
      if (health) {
        health.failureCount++
        health.errorCount++
        health.lastError = error
        health.healthScore = Math.max(0, health.healthScore - 10)
        if (health.healthScore <= 30) health.status = 'unhealthy'
        else if (health.healthScore <= 60) health.status = 'degraded'

        const event = {
          id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          bridgeId,
          type: errorType,
          message: error,
          timestamp: new Date().toISOString(),
          recovered: false,
        }
        _errorEvents.value = [..._errorEvents.value, event]
        _unrecoveredErrors.value = [..._unrecoveredErrors.value, event]
        _allBridges.value = [..._allBridges.value]
        // 同步更新 unhealthyBridges
        _unhealthyBridges.value = _allBridges.value.filter(
          (b: any) => b.status === 'unhealthy' || b.status === 'degraded'
        )
      }
    }),

    generateReport: vi.fn(() => {
      const bridges = _allBridges.value
      const healthy = bridges.filter((b: any) => b.status === 'healthy')
      const degraded = bridges.filter((b: any) => b.status === 'degraded')
      const unhealthy = bridges.filter((b: any) => b.status === 'unhealthy')
      const totalCalls = bridges.reduce((s: number, b: any) => s + b.successCount + b.failureCount, 0)
      const totalFailures = bridges.reduce((s: number, b: any) => s + b.failureCount, 0)
      return {
        totalBridges: bridges.length,
        healthyBridges: healthy.length,
        degradedBridges: degraded.length,
        unhealthyBridges: unhealthy.length,
        overallScore: bridges.length > 0
          ? Math.round(bridges.reduce((s: number, b: any) => s + b.healthScore, 0) / bridges.length)
          : 100,
        totalCalls,
        totalFailures,
        successRate: totalCalls > 0 ? Math.round(((totalCalls - totalFailures) / totalCalls) * 100) : 100,
        bridgeDetails: bridges,
        recentErrors: _unrecoveredErrors.value.slice(-10),
        generatedAt: new Date().toISOString(),
      }
    }),

    resetBridgeHealth: vi.fn((bridgeId: string) => {
      const health = _allBridges.value.find((b: any) => b.bridgeId === bridgeId)
      if (health) {
        health.status = 'healthy'
        health.healthScore = 100
        health.errorCount = 0
        health.lastError = undefined
        health.lastHeartbeat = new Date().toISOString()
        _allBridges.value = [..._allBridges.value]
        // 同步更新 unhealthyBridges
        _unhealthyBridges.value = _allBridges.value.filter(
          (b: any) => b.status === 'unhealthy' || b.status === 'degraded'
        )
      }
    }),

    markRecovered: vi.fn((errorId: string) => {
      const event = _errorEvents.value.find((e: any) => e.id === errorId)
      if (event) {
        event.recovered = true
        event.recoveredAt = new Date().toISOString()
      }
      _unrecoveredErrors.value = _errorEvents.value.filter((e: any) => !e.recovered)
    }),

    registerMigration: vi.fn((migration: any) => {
      _migrations.value = [..._migrations.value, migration]
    }),

    setRecoveryStrategy: vi.fn(),
  }
}

/** 注册一个测试模块（直接操作内部状态） */
function registerTestModule(id: string, name: string, provides: string[] = []) {
  const mod = { id, name, version: '1.0.0', description: '', provides, requires: [] }
  const instance = {}
  mockProtocol.register(mod, instance)
}

/** 注册所有 8 种接口类型的模块，确保接口覆盖完整 */
function registerAllInterfaceModules() {
  const types = ['interaction', 'capability', 'ai', 'knowledge', 'data-transfer', 'automation', 'thread', 'extension']
  types.forEach((type, i) => {
    registerTestModule(`mod-${type}`, `模块${i + 1}`, [type])
  })
}

/** 初始化 mock 状态 */
function initMockState() {
  mockProtocol = createMockProtocol()
  mockEnhanced = createMockEnhanced()
}

// ============================================================
// P23 共鸣协议视图桥接层
// ============================================================

describe('P23 共鸣协议视图桥接层', () => {
  let bridge: any

  // ==========================================================
  // 初始化
  // ==========================================================
  describe('初始化', () => {
    beforeEach(async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
    })

    it('resonanceState 默认值正确', () => {
      expect(bridge.resonanceState.value).toBeDefined()
      expect(bridge.resonanceState.value.moduleCount).toBe(0)
      expect(bridge.resonanceState.value.activeModuleCount).toBe(0)
      expect(bridge.resonanceState.value.bridgeCount).toBe(0)
      expect(bridge.resonanceState.value.healthyBridgeCount).toBe(0)
      expect(bridge.resonanceState.value.overallHealthScore).toBe(100)
      expect(bridge.resonanceState.value.initialized).toBe(true)
    })

    it('moduleList 为分组对象（空时为空数组）', () => {
      expect(Array.isArray(bridge.moduleList.value)).toBe(true)
      expect(bridge.moduleList.value.length).toBe(0)
    })

    it('interfaceOverview 为数组，包含 8 种接口类型', () => {
      expect(Array.isArray(bridge.interfaceOverview.value)).toBe(true)
      expect(bridge.interfaceOverview.value.length).toBe(8)
      const types = bridge.interfaceOverview.value.map((o: any) => o.type)
      expect(types).toContain('interaction')
      expect(types).toContain('capability')
      expect(types).toContain('ai')
      expect(types).toContain('knowledge')
      expect(types).toContain('data-transfer')
      expect(types).toContain('automation')
      expect(types).toContain('thread')
      expect(types).toContain('extension')
    })

    it('interfaceOverview 每个条目包含 label 和 providerCount', () => {
      bridge.interfaceOverview.value.forEach((o: any) => {
        expect(o.type).toBeDefined()
        expect(o.label).toBeDefined()
        expect(typeof o.label).toBe('string')
        expect(typeof o.providerCount).toBe('number')
        expect(Array.isArray(o.providers)).toBe(true)
        expect(typeof o.isAvailable).toBe('boolean')
      })
    })

    it('healthReport 存在', () => {
      expect(bridge.healthReport.value).toBeDefined()
      expect(bridge.healthReport.value.totalBridges).toBe(0)
      expect(bridge.healthReport.value.overallScore).toBe(100)
    })

    it('bridgeHealthList 为空数组', () => {
      expect(Array.isArray(bridge.bridgeHealthList.value)).toBe(true)
      expect(bridge.bridgeHealthList.value.length).toBe(0)
    })

    it('protocolVersionInfo 包含 current 版本', () => {
      expect(bridge.protocolVersionInfo.value).toBeDefined()
      expect(bridge.protocolVersionInfo.value.current).toBeDefined()
      expect(bridge.protocolVersionInfo.value.current.major).toBe(2)
      expect(bridge.protocolVersionInfo.value.current.minor).toBe(1)
      expect(bridge.protocolVersionInfo.value.current.patch).toBe(0)
      expect(bridge.protocolVersionInfo.value.versionString).toBe('v2.1.0-stable')
      expect(bridge.protocolVersionInfo.value.migrationsAvailable).toBe(0)
    })

    it('recommendations 包含初始化建议（注册表已初始化，接口全覆蓋）', () => {
      // 注册所有接口类型模块，确保推荐为 all_clear
      registerAllInterfaceModules()
      bridge.refreshState()
      expect(Array.isArray(bridge.recommendations.value)).toBe(true)
      const allClear = bridge.recommendations.value.find((r: any) => r.type === 'all_clear')
      expect(allClear).toBeDefined()
      expect(allClear.priority).toBe('low')
    })

    it('unhealthyBridges 为空数组', () => {
      expect(Array.isArray(bridge.unhealthyBridges.value)).toBe(true)
      expect(bridge.unhealthyBridges.value.length).toBe(0)
    })

    it('recentErrorEvents 为空数组', () => {
      expect(Array.isArray(bridge.recentErrorEvents.value)).toBe(true)
      expect(bridge.recentErrorEvents.value.length).toBe(0)
    })

    it('registeredMigrations 为空数组', () => {
      expect(Array.isArray(bridge.registeredMigrations.value)).toBe(true)
      expect(bridge.registeredMigrations.value.length).toBe(0)
    })
  })

  // ==========================================================
  // 桥接注册
  // ==========================================================
  describe('桥接注册', () => {
    beforeEach(async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
    })

    it('registerBridge 后 bridgeHealthList 增加一项', () => {
      const health = bridge.registerBridge('AI桥接', 'ai', [])
      expect(health).toBeDefined()
      expect(health.name).toBe('AI桥接')
      expect(health.interfaceType).toBe('ai')
      expect(bridge.bridgeHealthList.value.length).toBe(1)
      expect(bridge.bridgeHealthList.value[0].bridgeId).toBe(health.bridgeId)
    })

    it('registerBridge 返回的桥接 status 为 unknown', () => {
      const health = bridge.registerBridge('交互桥接', 'interaction')
      expect(health.status).toBe('unknown')
      expect(health.healthScore).toBe(100)
    })

    it('多次注册 bridgeHealthList 累计增加', () => {
      bridge.registerBridge('桥接A', 'ai')
      bridge.registerBridge('桥接B', 'capability')
      bridge.registerBridge('桥接C', 'knowledge')
      expect(bridge.bridgeHealthList.value.length).toBe(3)
    })

    it('registerBridge 后 resonanceState 反映桥接数', () => {
      bridge.registerBridge('桥接A', 'ai')
      bridge.registerBridge('桥接B', 'capability')
      expect(bridge.resonanceState.value.bridgeCount).toBe(2)
    })

    it('heartbeat 更新状态为 healthy', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.heartbeat(health.bridgeId, 42)
      const updated = bridge.bridgeHealthList.value.find((b: any) => b.bridgeId === health.bridgeId)
      expect(updated.status).toBe('healthy')
      expect(updated.responseTime).toBe(42)
    })

    it('recordSuccess 增加成功计数（健康分上限为 100）', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.recordSuccess(health.bridgeId)
      bridge.recordSuccess(health.bridgeId)
      const updated = bridge.bridgeHealthList.value.find((b: any) => b.bridgeId === health.bridgeId)
      expect(updated.successCount).toBe(2)
      expect(updated.healthScore).toBe(100)
    })

    it('recordFailure 降低健康分', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.recordFailure(health.bridgeId, '连接超时', 'timeout')
      const updated = bridge.bridgeHealthList.value.find((b: any) => b.bridgeId === health.bridgeId)
      expect(updated.healthScore).toBe(90)
      expect(updated.failureCount).toBe(1)
      expect(updated.lastError).toBe('连接超时')
    })

    it('recordFailure 多次后状态变为 degraded', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      // 从 100 降到 60: 需要 4 次 (-10 * 4 = -40, score = 60)
      for (let i = 0; i < 4; i++) {
        bridge.recordFailure(health.bridgeId, `错误 ${i + 1}`, 'internal')
      }
      const updated = bridge.bridgeHealthList.value.find((b: any) => b.bridgeId === health.bridgeId)
      expect(updated.status).toBe('degraded')
      expect(updated.healthScore).toBe(60)
    })

    it('recordFailure 多次后状态变为 unhealthy', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      // 从 100 降到 30: 需要 7 次
      for (let i = 0; i < 7; i++) {
        bridge.recordFailure(health.bridgeId, `错误 ${i + 1}`, 'internal')
      }
      const updated = bridge.bridgeHealthList.value.find((b: any) => b.bridgeId === health.bridgeId)
      expect(updated.status).toBe('unhealthy')
      expect(updated.healthScore).toBeLessThanOrEqual(30)
    })
  })

  // ==========================================================
  // 状态刷新
  // ==========================================================
  describe('状态刷新', () => {
    beforeEach(async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
    })

    it('refreshState 更新 resonanceState', () => {
      registerTestModule('mod-a', '模块A', ['interaction'])
      bridge.refreshState()
      expect(bridge.resonanceState.value.moduleCount).toBe(1)
      expect(bridge.resonanceState.value.activeModuleCount).toBe(1)
    })

    it('refreshState 后 moduleList 反映已注册模块', () => {
      registerTestModule('mod-a', '模块A', ['interaction'])
      registerTestModule('mod-b', '模块B', ['capability'])
      bridge.refreshState()
      expect(bridge.moduleList.value.length).toBeGreaterThan(0)
      const activeGroup = bridge.moduleList.value.find((g: any) => g.status === 'active')
      expect(activeGroup).toBeDefined()
      expect(activeGroup.modules.length).toBe(2)
    })

    it('refreshState 后 interfaceOverview 更新', () => {
      registerTestModule('mod-a', '模块A', ['interaction'])
      bridge.refreshState()
      const interactionOverview = bridge.interfaceOverview.value.find((o: any) => o.type === 'interaction')
      expect(interactionOverview.providerCount).toBe(1)
      expect(interactionOverview.isAvailable).toBe(true)
    })

    it('registerBridge 内部调用 refreshState', () => {
      registerTestModule('mod-a', '模块A', ['interaction'])
      bridge.registerBridge('桥接A', 'interaction')
      expect(bridge.resonanceState.value.moduleCount).toBe(1)
    })
  })

  // ==========================================================
  // 健康报告
  // ==========================================================
  describe('健康报告', () => {
    beforeEach(async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
    })

    it('generateHealthReport 返回完整报告', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.recordSuccess(health.bridgeId)
      bridge.recordSuccess(health.bridgeId)
      const report = bridge.generateHealthReport()
      expect(report).toBeDefined()
      expect(report.totalBridges).toBe(1)
      expect(report.healthyBridges).toBe(1)
      expect(report.totalCalls).toBe(2)
      expect(report.successRate).toBe(100)
      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.generatedAt).toBeDefined()
      expect(Array.isArray(report.bridgeDetails)).toBe(true)
      expect(Array.isArray(report.recentErrors)).toBe(true)
    })

    it('resetAllHealth 清空健康状态', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.recordFailure(health.bridgeId, '错误', 'internal')
      bridge.recordFailure(health.bridgeId, '错误2', 'internal')
      bridge.resetAllHealth()
      const updated = bridge.bridgeHealthList.value.find((b: any) => b.bridgeId === health.bridgeId)
      expect(updated.status).toBe('healthy')
      expect(updated.healthScore).toBe(100)
      expect(updated.errorCount).toBe(0)
      expect(updated.lastError).toBeUndefined()
    })

    it('resetAllHealth 清除所有错误事件', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.recordFailure(health.bridgeId, '错误', 'internal')
      expect(bridge.recentErrorEvents.value.length).toBeGreaterThan(0)
      bridge.resetAllHealth()
      expect(bridge.recentErrorEvents.value.length).toBe(0)
    })
  })

  // ==========================================================
  // 错误恢复
  // ==========================================================
  describe('错误恢复', () => {
    beforeEach(async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
    })

    it('recordFailure 创建错误事件', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.recordFailure(health.bridgeId, '连接超时', 'timeout')
      expect(bridge.recentErrorEvents.value.length).toBe(1)
      const errorEvent = bridge.recentErrorEvents.value[0]
      expect(errorEvent.bridgeId).toBe(health.bridgeId)
      expect(errorEvent.type).toBe('timeout')
      expect(errorEvent.message).toBe('连接超时')
      expect(errorEvent.recovered).toBe(false)
    })

    it('markErrorRecovered 标记恢复', () => {
      const health = bridge.registerBridge('测试桥接', 'ai')
      bridge.recordFailure(health.bridgeId, '连接超时', 'timeout')
      const errorId = bridge.recentErrorEvents.value[0].id
      bridge.markErrorRecovered(errorId)
      expect(bridge.recentErrorEvents.value.length).toBe(0)
    })
  })

  // ==========================================================
  // 版本管理
  // ==========================================================
  describe('版本管理', () => {
    beforeEach(async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
    })

    it('registerMigration 注册迁移', () => {
      const migration = {
        id: 'mig_v1_to_v2',
        fromVersion: { major: 1, minor: 0, patch: 0 },
        toVersion: { major: 2, minor: 0, patch: 0 },
        description: '从 v1 迁移到 v2',
        migrate: (data: unknown) => data,
        reversible: false,
        createdAt: new Date().toISOString(),
      }
      bridge.registerMigration(migration)
      expect(bridge.registeredMigrations.value.length).toBe(1)
      expect(bridge.registeredMigrations.value[0].id).toBe('mig_v1_to_v2')
    })

    it('protocolVersionInfo 反映迁移数量', () => {
      bridge.registerMigration({
        id: 'mig_v1_to_v2',
        fromVersion: { major: 1, minor: 0, patch: 0 },
        toVersion: { major: 2, minor: 0, patch: 0 },
        description: '迁移',
        migrate: (data: unknown) => data,
        reversible: false,
        createdAt: new Date().toISOString(),
      })
      expect(bridge.protocolVersionInfo.value.migrationsAvailable).toBe(1)
      expect(bridge.protocolVersionInfo.value.migrations.length).toBe(1)
    })

    it('多次注册迁移 protocolVersionInfo 正确反映', () => {
      bridge.registerMigration({
        id: 'mig_a', fromVersion: { major: 1, minor: 0, patch: 0 },
        toVersion: { major: 1, minor: 1, patch: 0 },
        description: '迁移 A', migrate: (d: unknown) => d, reversible: true, createdAt: new Date().toISOString(),
      })
      bridge.registerMigration({
        id: 'mig_b', fromVersion: { major: 1, minor: 1, patch: 0 },
        toVersion: { major: 2, minor: 0, patch: 0 },
        description: '迁移 B', migrate: (d: unknown) => d, reversible: false, createdAt: new Date().toISOString(),
      })
      expect(bridge.protocolVersionInfo.value.migrationsAvailable).toBe(2)
    })
  })

  // ==========================================================
  // 建议生成
  // ==========================================================
  describe('建议生成', () => {
    it('空桥接且接口全覆蓋时建议为 all_clear', async () => {
      vi.resetModules()
      initMockState()
      // 注册所有接口类型的模块，确保无接口缺口
      registerAllInterfaceModules()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
      const recs = bridge.recommendations.value
      const allClear = recs.find((r: any) => r.type === 'all_clear')
      expect(allClear).toBeDefined()
      expect(allClear.priority).toBe('low')
    })

    it('不健康桥接建议警告', async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
      const health = bridge.registerBridge('问题桥接', 'ai')
      for (let i = 0; i < 7; i++) {
        bridge.recordFailure(health.bridgeId, '持续错误', 'internal')
      }
      const recs = bridge.recommendations.value
      const warning = recs.find((r: any) => r.type === 'health_warning')
      expect(warning).toBeDefined()
      expect(warning.priority).toBe('high')
      expect(warning.targetBridgeId).toBe(health.bridgeId)
    })

    it('接口缺口建议', async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
      // 无任何模块注册，所有接口都不可用
      const recs = bridge.recommendations.value
      const gap = recs.find((r: any) => r.type === 'interface_gap')
      expect(gap).toBeDefined()
      expect(gap.description).toContain('接口')
    })

    it('建议按优先级排序（high > medium > low）', async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
      const health = bridge.registerBridge('问题桥接', 'ai')
      for (let i = 0; i < 7; i++) {
        bridge.recordFailure(health.bridgeId, '错误', 'internal')
      }
      const recs = bridge.recommendations.value
      const order = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < recs.length; i++) {
        expect(order[recs[i - 1].priority as keyof typeof order]).toBeLessThanOrEqual(order[recs[i].priority as keyof typeof order])
      }
    })
  })

  // ==========================================================
  // 子模块直通
  // ==========================================================
  describe('子模块直通', () => {
    beforeEach(async () => {
      vi.resetModules()
      initMockState()
      const mod = await import('../resonance-bridge')
      bridge = mod.useResonanceBridge()
    })

    it('bridge 暴露 protocol 子模块', () => {
      expect(bridge.protocol).toBeDefined()
      expect(bridge.protocol).toBe(mockProtocol)
    })

    it('bridge 暴露 enhanced 子模块', () => {
      expect(bridge.enhanced).toBeDefined()
      expect(bridge.enhanced).toBe(mockEnhanced)
    })
  })
})