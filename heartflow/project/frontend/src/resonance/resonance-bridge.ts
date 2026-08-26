// ============================================================
// 共鸣协议层 · 视图桥接层
// 蓝图定义：
//   聚合注册表状态、接口覆盖、健康报告、桥接健康列表、
//   不健康桥接分析、错误事件追踪、协议版本信息、
//   版本迁移、智能建议
// ============================================================

import { ref, computed } from 'vue'
import { useResonance } from './index'
import { useResonanceEnhanced, CURRENT_PROTOCOL_VERSION } from './health-monitor'
import type {
  ModuleRegistration,
  ResonanceRegistryState,
  InterfaceType,
} from './types'
import type {
  BridgeHealth,
  HealthReport,
  ErrorEvent,
  RecoveryStrategy,
  ProtocolVersion,
  VersionMigration,
} from './health-monitor'

// ============================================================
// 常量
// ============================================================

/** 全部 8 类接口类型 */
const ALL_INTERFACE_TYPES: InterfaceType[] = [
  'interaction',
  'capability',
  'ai',
  'knowledge',
  'data-transfer',
  'automation',
  'thread',
  'extension',
]

/** 接口类型中文标签映射 */
const INTERFACE_LABELS: Record<InterfaceType, string> = {
  'interaction': '交互引擎',
  'capability': '业务能力',
  'ai': 'AI 能力',
  'knowledge': '知识接引',
  'data-transfer': '数据引渡',
  'automation': '自动化引擎',
  'thread': '线程管理',
  'extension': '扩展接口',
}

// ============================================================
// 导出类型
// ============================================================

/** 共鸣桥接聚合状态 */
export interface ResonanceBridgeState {
  /** 已注册模块总数 */
  moduleCount: number
  /** 活跃模块数 */
  activeModuleCount: number
  /** 注册桥接数 */
  bridgeCount: number
  /** 健康桥接数 */
  healthyBridgeCount: number
  /** 整体健康评分 0-100 */
  overallHealthScore: number
  /** 注册表是否已初始化 */
  initialized: boolean
}

/** 接口覆盖概览 */
export interface InterfaceOverview {
  /** 接口类型 */
  type: InterfaceType
  /** 中文标签 */
  label: string
  /** 提供者数量 */
  providerCount: number
  /** 提供者模块名称列表 */
  providers: string[]
  /** 是否可用（至少有一个活跃提供者） */
  isAvailable: boolean
}

/** 协议版本信息 */
export interface ProtocolVersionInfo {
  /** 当前协议版本 */
  current: ProtocolVersion
  /** 版本字符串 */
  versionString: string
  /** 已注册迁移数量 */
  migrationsAvailable: number
  /** 迁移列表 */
  migrations: VersionMigration[]
}

/** 共鸣建议 */
export interface ResonanceRecommendation {
  /** 建议类型 */
  type: 'health_warning' | 'interface_gap' | 'error_investigation' | 'performance' | 'all_clear'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 目标桥接 ID */
  targetBridgeId?: string
  /** 目标接口类型 */
  targetInterfaceType?: InterfaceType
}

/** 模块分组（按状态） */
export interface ModuleGroup {
  status: ModuleRegistration['status']
  modules: ModuleRegistration[]
}

// ============================================================
// useResonanceBridge
// ============================================================

export function useResonanceBridge() {
  // ---- 子模块 ----
  const protocol = useResonance()
  const enhanced = useResonanceEnhanced()

  // ---- 响应式状态快照 ----
  // 注册表是单例，非响应式，通过 refreshState() 手动刷新
  const stateSnapshot = ref<ResonanceRegistryState>(protocol.getState())
  const allModulesSnapshot = ref<ModuleRegistration[]>(protocol.getAll())

  // ============================================================
  // 计算属性
  // ============================================================

  // ---- 1. resonanceState - 注册表状态 ----

  const resonanceState = computed<ResonanceBridgeState>(() => {
    const state = stateSnapshot.value
    const bridges = enhanced.allBridges.value
    const healthy = bridges.filter(b => b.status === 'healthy')

    return {
      moduleCount: state.moduleCount,
      activeModuleCount: state.activeModuleCount,
      bridgeCount: bridges.length,
      healthyBridgeCount: healthy.length,
      overallHealthScore: bridges.length > 0
        ? Math.round(bridges.reduce((s, b) => s + b.healthScore, 0) / bridges.length)
        : 100,
      initialized: state.initialized,
    }
  })

  // ---- 2. moduleList - 按状态分组的模块列表 ----

  const moduleList = computed<ModuleGroup[]>(() => {
    const modules = allModulesSnapshot.value
    const groups = new Map<ModuleRegistration['status'], ModuleRegistration[]>()

    for (const mod of modules) {
      const list = groups.get(mod.status) || []
      list.push(mod)
      groups.set(mod.status, list)
    }

    const statusOrder: ModuleRegistration['status'][] = ['active', 'inactive', 'error']
    return statusOrder
      .filter(s => groups.has(s))
      .map(s => ({ status: s, modules: groups.get(s)! }))
  })

  // ---- 3. interfaceOverview - 8 种接口类型的覆盖情况 ----

  const interfaceOverview = computed<InterfaceOverview[]>(() => {
    const modules = allModulesSnapshot.value

    return ALL_INTERFACE_TYPES.map(type => {
      const providers = modules
        .filter(m => m.status === 'active' && m.identity.provides.includes(type))

      return {
        type,
        label: INTERFACE_LABELS[type],
        providerCount: providers.length,
        providers: providers.map(m => m.identity.name),
        isAvailable: providers.length > 0,
      }
    })
  })

  // ---- 4. healthReport - 健康报告 ----

  const healthReport = computed<HealthReport>(() => {
    return enhanced.generateReport()
  })

  // ---- 5. bridgeHealthList - 所有桥接的健康状态 ----

  const bridgeHealthList = computed<BridgeHealth[]>(() => {
    return enhanced.allBridges.value
  })

  // ---- 6. unhealthyBridges - 不健康/降级的桥接 ----

  const unhealthyBridges = computed<BridgeHealth[]>(() => {
    return enhanced.unhealthyBridges.value
  })

  // ---- 7. recentErrorEvents - 最近错误事件 ----

  const recentErrorEvents = computed<ErrorEvent[]>(() => {
    return enhanced.unrecoveredErrors.value.slice(-20)
  })

  // ---- 8. protocolVersionInfo - 当前协议版本信息 ----

  const protocolVersionInfo = computed<ProtocolVersionInfo>(() => {
    const v = CURRENT_PROTOCOL_VERSION
    const labelPart = v.label ? `-${v.label}` : ''

    return {
      current: v,
      versionString: `v${v.major}.${v.minor}.${v.patch}${labelPart}`,
      migrationsAvailable: enhanced.migrations.value.length,
      migrations: enhanced.migrations.value,
    }
  })

  // ---- 9. registeredMigrations - 已注册的版本迁移 ----

  const registeredMigrations = computed<VersionMigration[]>(() => {
    return enhanced.migrations.value
  })

  // ---- 10. recommendations - 基于健康状态的建议 ----

  const recommendations = computed<ResonanceRecommendation[]>(() => {
    const recs: ResonanceRecommendation[] = []
    const state = resonanceState.value
    const overviews = interfaceOverview.value
    const unhealthy = unhealthyBridges.value
    const report = healthReport.value

    // 1. 不健康桥接告警（优先级最高）
    if (unhealthy.length > 0) {
      for (const bridge of unhealthy.slice(0, 3)) {
        recs.push({
          type: 'health_warning',
          priority: 'high',
          title: `桥接「${bridge.name}」健康异常`,
          description: bridge.status === 'unhealthy'
            ? `健康评分 ${bridge.healthScore}，最近错误: ${bridge.lastError || '未知'}`
            : `桥接降级，健康评分 ${bridge.healthScore}，响应时间 ${bridge.responseTime}ms`,
          targetBridgeId: bridge.bridgeId,
          targetInterfaceType: bridge.interfaceType,
        })
      }
    }

    // 2. 接口覆盖缺口
    const uncovered = overviews.filter(o => !o.isAvailable)
    if (uncovered.length > 0) {
      recs.push({
        type: 'interface_gap',
        priority: uncovered.length >= 3 ? 'high' : 'medium',
        title: '接口覆盖不足',
        description: `${uncovered.length} 个接口类型暂无活跃提供者：${uncovered.map(u => u.label).join('、')}`,
        targetInterfaceType: uncovered[0].type,
      })
    }

    // 3. 错误率过高
    if (report.totalCalls > 0 && report.successRate < 80) {
      const highErrorBridges = report.bridgeDetails
        .filter(b => b.failureCount > 0)
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, 3)

      recs.push({
        type: 'error_investigation',
        priority: 'high',
        title: '错误率偏高',
        description: `成功率仅 ${report.successRate}%，${highErrorBridges.length} 个桥接存在错误记录，建议排查`,
      })
    }

    // 4. 性能问题（高响应时间）
    const slowBridges = report.bridgeDetails
      .filter(b => b.responseTime > 1000 && b.status !== 'unhealthy')
      .slice(0, 3)
    if (slowBridges.length > 0) {
      recs.push({
        type: 'performance',
        priority: 'medium',
        title: '桥接响应延迟',
        description: `${slowBridges.length} 个桥接响应时间超过 1000ms，建议优化`,
        targetBridgeId: slowBridges[0].bridgeId,
      })
    }

    // 5. 未初始化
    if (!state.initialized) {
      recs.push({
        type: 'interface_gap',
        priority: 'high',
        title: '注册表未初始化',
        description: '共鸣协议注册表尚未初始化，请在应用入口调用 initialize()',
      })
    }

    // 6. 一切正常
    if (recs.length === 0) {
      recs.push({
        type: 'all_clear',
        priority: 'low',
        title: '系统运行正常',
        description: `所有 ${state.bridgeCount} 个桥接运行正常，整体健康评分 ${state.overallHealthScore}`,
      })
    }

    return recs.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ============================================================
  // 操作方法
  // ============================================================

  /**
   * 刷新状态快照
   * 从单例注册表拉取最新数据
   */
  function refreshState(): void {
    stateSnapshot.value = protocol.getState()
    allModulesSnapshot.value = protocol.getAll()
  }

  /**
   * 注册新桥接
   * @param name 桥接名称
   * @param interfaceType 连接的接口类型
   * @param deps 依赖的桥接 ID 列表
   * @returns 创建的桥接健康对象
   */
  function registerBridge(
    name: string,
    interfaceType: InterfaceType,
    deps: string[] = [],
  ): BridgeHealth {
    const bridgeId = `bridge_${name}_${Date.now()}`
    const health = enhanced.registerBridge(bridgeId, name, interfaceType, deps)
    refreshState()
    return health
  }

  /**
   * 发送心跳
   * @param bridgeId 桥接 ID
   * @param responseTime 响应时间（毫秒）
   */
  function heartbeat(bridgeId: string, responseTime: number = 0): void {
    enhanced.heartbeat(bridgeId, responseTime)
  }

  /**
   * 记录成功调用
   * @param bridgeId 桥接 ID
   */
  function recordSuccess(bridgeId: string): void {
    enhanced.recordSuccess(bridgeId)
  }

  /**
   * 记录失败调用
   * @param bridgeId 桥接 ID
   * @param error 错误消息
   * @param type 错误类型
   */
  function recordFailure(
    bridgeId: string,
    error: string,
    type: ErrorEvent['type'] = 'unknown',
  ): void {
    enhanced.recordFailure(bridgeId, error, type)
  }

  /**
   * 生成健康报告
   */
  function generateHealthReport(): HealthReport {
    refreshState()
    return enhanced.generateReport()
  }

  /**
   * 重置所有桥接健康状态
   */
  function resetAllHealth(): void {
    const bridges = enhanced.allBridges.value
    for (const bridge of bridges) {
      enhanced.resetBridgeHealth(bridge.bridgeId)
    }
    // 清除所有错误事件
    for (const err of enhanced.errorEvents.value) {
      if (!err.recovered) {
        enhanced.markRecovered(err.id)
      }
    }
  }

  /**
   * 标记错误已恢复
   * @param errorId 错误事件 ID
   */
  function markErrorRecovered(errorId: string): void {
    enhanced.markRecovered(errorId)
  }

  /**
   * 重置单个桥接健康
   * @param bridgeId 桥接 ID
   */
  function resetBridgeHealth(bridgeId: string): void {
    enhanced.resetBridgeHealth(bridgeId)
  }

  /**
   * 注册版本迁移
   * @param migration 迁移定义
   */
  function registerMigration(migration: VersionMigration): void {
    enhanced.registerMigration(migration)
  }

  /**
   * 设置恢复策略
   * @param bridgeId 桥接 ID
   * @param strategy 恢复策略
   */
  function setRecoveryStrategy(bridgeId: string, strategy: RecoveryStrategy): void {
    enhanced.setRecoveryStrategy(bridgeId, strategy)
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 聚合计算属性
    resonanceState,
    moduleList,
    interfaceOverview,
    healthReport,
    bridgeHealthList,
    unhealthyBridges,
    recentErrorEvents,
    protocolVersionInfo,
    registeredMigrations,
    recommendations,

    // 操作方法
    refreshState,
    registerBridge,
    heartbeat,
    recordSuccess,
    recordFailure,
    generateHealthReport,
    resetAllHealth,
    resetBridgeHealth,
    markErrorRecovered,
    registerMigration,
    setRecoveryStrategy,

    // 子模块直通（供高级场景使用）
    protocol,
    enhanced,
  }
}