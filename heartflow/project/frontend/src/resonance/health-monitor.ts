// ============================================================
// 共鸣协议层 · 版本管理与健康监控
// 协议版本迁移、错误恢复、桥接健康监控
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import type { InterfaceType, ResonanceResult } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 协议版本 */
export interface ProtocolVersion {
  /** 主版本 */
  major: number
  /** 次版本 */
  minor: number
  /** 补丁版本 */
  patch: number
  /** 版本标签 */
  label?: string
}

/** 版本迁移 */
export interface VersionMigration {
  /** 迁移ID */
  id: string
  /** 从哪个版本 */
  fromVersion: ProtocolVersion
  /** 到哪个版本 */
  toVersion: ProtocolVersion
  /** 迁移描述 */
  description: string
  /** 迁移函数 */
  migrate: (data: unknown) => unknown
  /** 是否可逆 */
  reversible: boolean
  /** 创建时间 */
  createdAt: string
}

/** 桥接健康状态 */
export interface BridgeHealth {
  bridgeId: string
  /** 桥接名称 */
  name: string
  /** 连接的接口类型 */
  interfaceType: InterfaceType
  /** 状态 */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  /** 上次心跳 */
  lastHeartbeat: string
  /** 响应时间（毫秒） */
  responseTime: number
  /** 错误计数 */
  errorCount: number
  /** 成功调用次数 */
  successCount: number
  /** 失败调用次数 */
  failureCount: number
  /** 健康分数 0-100 */
  healthScore: number
  /** 依赖的桥接 */
  dependencies: string[]
  /** 最后错误 */
  lastError?: string
}

/** 错误恢复策略 */
export interface RecoveryStrategy {
  id: string
  name: string
  /** 重试次数 */
  maxRetries: number
  /** 重试间隔（毫秒） */
  retryDelay: number
  /** 退避策略 */
  backoff: 'fixed' | 'linear' | 'exponential'
  /** 是否启用熔断 */
  circuitBreaker: boolean
  /** 熔断阈值 */
  circuitBreakerThreshold: number
  /** 熔断恢复时间（毫秒） */
  circuitBreakerRecovery: number
}

/** 错误事件 */
export interface ErrorEvent {
  id: string
  bridgeId: string
  /** 错误类型 */
  type: 'timeout' | 'connection' | 'validation' | 'permission' | 'internal' | 'unknown'
  /** 错误消息 */
  message: string
  /** 错误堆栈 */
  stack?: string
  /** 发生时间 */
  timestamp: string
  /** 是否已恢复 */
  recovered: boolean
  /** 恢复时间 */
  recoveredAt?: string
}

/** 协议健康报告 */
export interface HealthReport {
  /** 总桥接数 */
  totalBridges: number
  /** 健康桥接数 */
  healthyBridges: number
  /** 降级桥接数 */
  degradedBridges: number
  /** 不健康桥接数 */
  unhealthyBridges: number
  /** 总体健康分数 */
  overallScore: number
  /** 总调用次数 */
  totalCalls: number
  /** 总失败次数 */
  totalFailures: number
  /** 成功率 */
  successRate: number
  /** 各桥接详情 */
  bridgeDetails: BridgeHealth[]
  /** 近期错误 */
  recentErrors: ErrorEvent[]
  /** 生成时间 */
  generatedAt: string
}

// ============================================================
// 常量
// ============================================================

/** 当前协议版本 */
export const CURRENT_PROTOCOL_VERSION: ProtocolVersion = {
  major: 2,
  minor: 1,
  patch: 0,
  label: 'stable',
}

/** 默认恢复策略 */
export const DEFAULT_RECOVERY_STRATEGY: RecoveryStrategy = {
  id: 'default',
  name: '默认恢复策略',
  maxRetries: 3,
  retryDelay: 1000,
  backoff: 'exponential',
  circuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerRecovery: 30000,
}

/** 存储键 */
const RESONANCE_HEALTH_KEY = 'hf:resonance:health'
const RESONANCE_ERRORS_KEY = 'hf:resonance:errors'
const RESONANCE_MIGRATIONS_KEY = 'hf:resonance:migrations'

// ============================================================
// 共鸣协议增强引擎
// ============================================================

export function useResonanceEnhanced() {
  // ---- 状态 ----
  const bridgeHealthMap = ref<Map<string, BridgeHealth>>(new Map(loadBridgeHealth()))
  const errorEvents = ref<ErrorEvent[]>(loadErrors())
  const migrations = ref<VersionMigration[]>(loadMigrations())
  const recoveryStrategies = ref<Map<string, RecoveryStrategy>>(new Map([['default', DEFAULT_RECOVERY_STRATEGY]]))

  // ---- 持久化 ----

  function loadBridgeHealth(): [string, BridgeHealth][] {
    try {
      const raw = storage.getKV<string>(RESONANCE_HEALTH_KEY, '[]')
      return JSON.parse(raw).map((h: BridgeHealth) => [h.bridgeId, h] as [string, BridgeHealth])
    } catch { return [] }
  }

  function saveBridgeHealth() {
    storage.setKV(RESONANCE_HEALTH_KEY, JSON.stringify([...bridgeHealthMap.value.values()]))
  }

  function loadErrors(): ErrorEvent[] {
    try {
      const raw = storage.getKV<string>(RESONANCE_ERRORS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveErrors() {
    storage.setKV(RESONANCE_ERRORS_KEY, JSON.stringify(errorEvents.value.slice(-200)))
  }

  function loadMigrations(): VersionMigration[] {
    try {
      const raw = storage.getKV<string>(RESONANCE_MIGRATIONS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveMigrations() {
    storage.setKV(RESONANCE_MIGRATIONS_KEY, JSON.stringify(migrations.value))
  }

  // ---- 版本管理 ----

  /** 比较版本 */
  function compareVersions(a: ProtocolVersion, b: ProtocolVersion): number {
    if (a.major !== b.major) return a.major - b.major
    if (a.minor !== b.minor) return a.minor - b.minor
    return a.patch - b.patch
  }

  /** 版本是否兼容 */
  function isCompatible(a: ProtocolVersion, b: ProtocolVersion): boolean {
    return a.major === b.major && a.minor >= b.minor
  }

  /** 注册迁移 */
  function registerMigration(migration: VersionMigration): void {
    migrations.value.push(migration)
    saveMigrations()
  }

  /** 查找迁移路径 */
  function findMigrationPath(from: ProtocolVersion, to: ProtocolVersion): VersionMigration[] {
    return migrations.value.filter(m => {
      const fromCmp = compareVersions(m.fromVersion, from)
      const toCmp = compareVersions(m.toVersion, to)
      return fromCmp >= 0 && toCmp <= 0
    }).sort((a, b) => compareVersions(a.fromVersion, b.fromVersion))
  }

  /** 执行版本迁移 */
  function executeMigration(data: unknown, from: ProtocolVersion, to: ProtocolVersion): ResonanceResult<unknown> {
    const path = findMigrationPath(from, to)
    if (path.length === 0) {
      return { success: false, error: `未找到从 ${versionToString(from)} 到 ${versionToString(to)} 的迁移路径` }
    }
    let current = data
    for (const migration of path) {
      try {
        current = migration.migrate(current)
      } catch (e) {
        return { success: false, error: `迁移 "${migration.id}" 失败: ${String(e)}` }
      }
    }
    return { success: true, data: current }
  }

  /** 版本字符串 */
  function versionToString(v: ProtocolVersion): string {
    return v.label ? `v${v.major}.${v.minor}.${v.patch}-${v.label}` : `v${v.major}.${v.minor}.${v.patch}`
  }

  // ---- 桥接健康监控 ----

  /** 注册桥接 */
  function registerBridge(
    bridgeId: string,
    name: string,
    interfaceType: InterfaceType,
    dependencies: string[] = [],
  ): BridgeHealth {
    const health: BridgeHealth = {
      bridgeId,
      name,
      interfaceType,
      status: 'unknown',
      lastHeartbeat: new Date().toISOString(),
      responseTime: 0,
      errorCount: 0,
      successCount: 0,
      failureCount: 0,
      healthScore: 100,
      dependencies,
    }
    bridgeHealthMap.value.set(bridgeId, health)
    saveBridgeHealth()
    return health
  }

  /** 记录心跳 */
  function heartbeat(bridgeId: string, responseTime: number = 0): void {
    const health = bridgeHealthMap.value.get(bridgeId)
    if (!health) return
    health.lastHeartbeat = new Date().toISOString()
    health.responseTime = responseTime
    health.status = 'healthy'
    health.healthScore = Math.min(100, health.healthScore + 5)
    saveBridgeHealth()
  }

  /** 记录成功调用 */
  function recordSuccess(bridgeId: string): void {
    const health = bridgeHealthMap.value.get(bridgeId)
    if (!health) return
    health.successCount++
    health.healthScore = Math.min(100, health.healthScore + 1)
    if (health.status === 'unknown') health.status = 'healthy'
    saveBridgeHealth()
  }

  /** 记录失败调用 */
  function recordFailure(bridgeId: string, error: string, errorType: ErrorEvent['type'] = 'unknown'): void {
    const health = bridgeHealthMap.value.get(bridgeId)
    if (!health) return
    health.failureCount++
    health.errorCount++
    health.lastError = error
    health.healthScore = Math.max(0, health.healthScore - 10)

    // 更新状态
    if (health.healthScore <= 30) {
      health.status = 'unhealthy'
    } else if (health.healthScore <= 60) {
      health.status = 'degraded'
    }

    // 记录错误事件
    const event: ErrorEvent = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      bridgeId,
      type: errorType,
      message: error,
      timestamp: new Date().toISOString(),
      recovered: false,
    }
    errorEvents.value.push(event)
    saveErrors()
    saveBridgeHealth()
  }

  /** 标记错误已恢复 */
  function markRecovered(errorId: string): void {
    const event = errorEvents.value.find(e => e.id === errorId)
    if (event) {
      event.recovered = true
      event.recoveredAt = new Date().toISOString()
      saveErrors()
    }
  }

  /** 重置桥接健康 */
  function resetBridgeHealth(bridgeId: string): void {
    const health = bridgeHealthMap.value.get(bridgeId)
    if (health) {
      health.status = 'healthy'
      health.healthScore = 100
      health.errorCount = 0
      health.lastError = undefined
      health.lastHeartbeat = new Date().toISOString()
      saveBridgeHealth()
    }
  }

  // ---- 错误恢复 ----

  /** 设置恢复策略 */
  function setRecoveryStrategy(bridgeId: string, strategy: RecoveryStrategy): void {
    recoveryStrategies.value.set(bridgeId, strategy)
  }

  /** 获取恢复策略 */
  function getRecoveryStrategy(bridgeId: string): RecoveryStrategy {
    return recoveryStrategies.value.get(bridgeId) ?? DEFAULT_RECOVERY_STRATEGY
  }

  /** 计算退避延迟 */
  function calculateBackoff(strategy: RecoveryStrategy, attempt: number): number {
    switch (strategy.backoff) {
      case 'fixed':
        return strategy.retryDelay
      case 'linear':
        return strategy.retryDelay * attempt
      case 'exponential':
        return strategy.retryDelay * Math.pow(2, attempt - 1)
      default:
        return strategy.retryDelay
    }
  }

  /** 检查熔断 */
  function isCircuitBreakerOpen(bridgeId: string): boolean {
    const health = bridgeHealthMap.value.get(bridgeId)
    const strategy = getRecoveryStrategy(bridgeId)
    if (!strategy.circuitBreaker || !health) return false
    return health.errorCount >= strategy.circuitBreakerThreshold
  }

  // ---- 健康报告 ----

  /** 生成健康报告 */
  function generateReport(): HealthReport {
    const bridges = [...bridgeHealthMap.value.values()]
    const healthy = bridges.filter(b => b.status === 'healthy')
    const degraded = bridges.filter(b => b.status === 'degraded')
    const unhealthy = bridges.filter(b => b.status === 'unhealthy')

    const totalCalls = bridges.reduce((s, b) => s + b.successCount + b.failureCount, 0)
    const totalFailures = bridges.reduce((s, b) => s + b.failureCount, 0)

    const report: HealthReport = {
      totalBridges: bridges.length,
      healthyBridges: healthy.length,
      degradedBridges: degraded.length,
      unhealthyBridges: unhealthy.length,
      overallScore: bridges.length > 0
        ? Math.round(bridges.reduce((s, b) => s + b.healthScore, 0) / bridges.length)
        : 100,
      totalCalls,
      totalFailures,
      successRate: totalCalls > 0 ? Math.round(((totalCalls - totalFailures) / totalCalls) * 100) : 100,
      bridgeDetails: bridges,
      recentErrors: errorEvents.value.filter(e => !e.recovered).slice(-10),
      generatedAt: new Date().toISOString(),
    }

    return report
  }

  /** 获取桥接健康 */
  function getBridgeHealth(bridgeId: string): BridgeHealth | undefined {
    return bridgeHealthMap.value.get(bridgeId)
  }

  // ---- 计算属性 ----

  /** 所有桥接 */
  const allBridges = computed(() => [...bridgeHealthMap.value.values()])

  /** 健康桥接 */
  const healthyBridges = computed(() => allBridges.value.filter(b => b.status === 'healthy'))

  /** 不健康桥接 */
  const unhealthyBridges = computed(() => allBridges.value.filter(b => b.status === 'unhealthy' || b.status === 'degraded'))

  /** 未恢复的错误 */
  const unrecoveredErrors = computed(() => errorEvents.value.filter(e => !e.recovered))

  return {
    // 状态
    bridgeHealthMap,
    errorEvents,
    migrations,
    recoveryStrategies,

    // 计算属性
    allBridges,
    healthyBridges,
    unhealthyBridges,
    unrecoveredErrors,

    // 版本
    compareVersions,
    isCompatible,
    registerMigration,
    findMigrationPath,
    executeMigration,
    versionToString,

    // 健康
    registerBridge,
    heartbeat,
    recordSuccess,
    recordFailure,
    markRecovered,
    resetBridgeHealth,
    getBridgeHealth,

    // 恢复
    setRecoveryStrategy,
    getRecoveryStrategy,
    calculateBackoff,
    isCircuitBreakerOpen,

    // 报告
    generateReport,
  }
}

// ============================================================
// 辅助函数
// ============================================================