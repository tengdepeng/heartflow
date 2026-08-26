// ============================================================
// 共鸣协议层 · 注册表 & 统一导出
// 第二层架构：管理所有模块的注册、发现、通信
// 不实现具体功能，只提供注册表机制
// ============================================================

import type {
  IResonanceProtocol,
  ModuleIdentity,
  ModuleRegistration,
  ModuleFilter,
  ResonanceResult,
  ResonanceRegistryState,
  InterfaceType,
} from './types'

// ---- 重新导出所有接口类型 ----

export * from './types'
export * from './interaction'
export * from './capability'
export * from './ai'
export * from './knowledge'
export * from './data-transfer'
export * from './automation'
export * from './thread'
export * from './extension'

// ---- 共鸣协议注册表（单例实现） ----

const ALL_INTERFACE_TYPES: InterfaceType[] = [
  'interaction', 'capability', 'ai', 'knowledge',
  'data-transfer', 'automation', 'thread', 'extension',
]

/**
 * 共鸣协议注册表
 * 管理所有模块的注册、发现、状态查询
 * 建议通过 useResonance() 获取单例
 */
class ResonanceRegistry implements IResonanceProtocol {
  private modules = new Map<string, ModuleRegistration>()
  private initialized = false

  // ========== 模组注册 ==========

  register(module: ModuleIdentity, instance: unknown): ResonanceResult<void> {
    if (this.modules.has(module.id)) {
      return { success: false, error: `模块 "${module.id}" 已注册` }
    }

    // 检查依赖是否满足（所有 requires 的接口必须有活跃提供者）
    for (const required of module.requires) {
      const providers = this.findByInterface(required)
      if (providers.length === 0) {
        return {
          success: false,
          error: `模块 "${module.id}" 依赖的接口 "${required}" 当前无可用提供者`,
        }
      }
    }

    this.modules.set(module.id, {
      identity: module,
      instance,
      registeredAt: Date.now(),
      status: 'active',
    })

    return { success: true }
  }

  unregister(moduleId: string): ResonanceResult<void> {
    if (!this.modules.has(moduleId)) {
      return { success: false, error: `模块 "${moduleId}" 未注册` }
    }
    this.modules.delete(moduleId)
    return { success: true }
  }

  updateStatus(moduleId: string, status: ModuleRegistration['status'], error?: string): ResonanceResult<void> {
    const reg = this.modules.get(moduleId)
    if (!reg) {
      return { success: false, error: `模块 "${moduleId}" 未注册` }
    }
    reg.status = status
    if (error) reg.error = error
    return { success: true }
  }

  // ========== 模块发现 ==========

  findById(moduleId: string): ModuleRegistration | undefined {
    return this.modules.get(moduleId)
  }

  findByInterface(type: InterfaceType): ModuleRegistration[] {
    return [...this.modules.values()]
      .filter(m => m.status === 'active' && m.identity.provides.includes(type))
  }

  query(filter: ModuleFilter): ModuleRegistration[] {
    let results = [...this.modules.values()]

    if (filter.provides && filter.provides.length > 0) {
      results = results.filter(m =>
        filter.provides!.some(iface => m.identity.provides.includes(iface)),
      )
    }

    if (filter.status) {
      results = results.filter(m => m.status === filter.status)
    }

    if (filter.nameKeyword) {
      const kw = filter.nameKeyword.toLowerCase()
      results = results.filter(m =>
        m.identity.name.toLowerCase().includes(kw) ||
        m.identity.description.toLowerCase().includes(kw),
      )
    }

    return results
  }

  getAll(): ModuleRegistration[] {
    return [...this.modules.values()]
  }

  // ========== 状态查询 ==========

  getState(): ResonanceRegistryState {
    const allModules = this.getAll()
    const activeModules = allModules.filter(m => m.status === 'active')

    const interfaceCounts = {} as Record<InterfaceType, number>
    for (const iface of ALL_INTERFACE_TYPES) {
      interfaceCounts[iface] = this.findByInterface(iface).length
    }

    return {
      moduleCount: allModules.length,
      activeModuleCount: activeModules.length,
      interfaceCounts,
      lastRegisteredAt: allModules.length > 0
        ? Math.max(...allModules.map(m => m.registeredAt))
        : null,
      initialized: this.initialized,
    }
  }

  isInterfaceAvailable(type: InterfaceType): boolean {
    return this.findByInterface(type).length > 0
  }

  isRegistered(moduleId: string): boolean {
    return this.modules.has(moduleId)
  }

  // ========== 生命周期 ==========

  initialize(): void {
    this.initialized = true
  }

  destroy(): void {
    this.modules.clear()
    this.initialized = false
  }
}

/** 全局单例实例 */
const registry = new ResonanceRegistry()

// ---- 便捷导出 ----

/**
 * 获取共鸣协议注册表单例
 * 在应用入口（main.ts / App.vue）调用 initialize()
 */
export function useResonance(): IResonanceProtocol {
  return registry
}

/**
 * 创建模块标识的便捷方法
 */
export function defineModule(options: {
  id: string
  name: string
  version?: string
  description?: string
  provides?: InterfaceType[]
  requires?: InterfaceType[]
}): ModuleIdentity {
  return {
    id: options.id,
    name: options.name,
    version: options.version || '1.0.0',
    description: options.description || '',
    provides: options.provides || [],
    requires: options.requires || [],
  }
}

/**
 * 创建成功响应的便捷方法
 */
export function success<T>(data?: T): ResonanceResult<T> {
  return { success: true, data }
}

/**
 * 创建失败响应的便捷方法
 */
export function failure(error: string): ResonanceResult<never> {
  return { success: false, error }
}

// ---- 健康监控与版本管理 ----
export { useResonanceEnhanced, CURRENT_PROTOCOL_VERSION, DEFAULT_RECOVERY_STRATEGY } from './health-monitor'
export type {
  ProtocolVersion,
  VersionMigration,
  BridgeHealth,
  RecoveryStrategy,
  ErrorEvent,
  HealthReport,
} from './health-monitor'