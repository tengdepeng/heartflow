// ============================================================
// 插件沙箱 · 隔离器
// 蓝图定义：
//   沙箱隔离 — 核心隔离逻辑
//   创建和管理沙箱环境，执行权限检查，拦截 API 调用
//   支持三级隔离：L0(只读) / L1(受限) / L2(完全监控)
// ============================================================

import type {
  SandboxTier,
  SandboxPermission,
  SandboxConfig,
  SandboxEnvironment,
  ResourceLimits,
  ResourceUsage,
  AuditEntry,
  Violation,
  ViolationType,
  ViolationHandler,
  SandboxEvent,
  SandboxEventType,
  SandboxEventListener,
} from './types'
import {
  TIER_PERMISSIONS,
  TIER_RESOURCE_LIMITS,
  SANDBOX_TIER_LABELS,
} from './types'

// ---- 沙箱隔离器 ----

export class SandboxIsolator {
  private environments = new Map<string, SandboxEnvironment>()
  private violationHandlers: ViolationHandler[] = []
  private eventListeners: SandboxEventListener[] = []

  // ---- 沙箱环境管理 ----

  /** 创建沙箱环境 */
  createSandbox(
    pluginId: string,
    tier: SandboxTier = 'L0',
    config?: Partial<SandboxConfig>,
  ): SandboxEnvironment {
    const sandboxId = `sandbox_${pluginId}_${Date.now()}`

    const defaultPermissions = TIER_PERMISSIONS[tier]
    const defaultLimits = { ...TIER_RESOURCE_LIMITS[tier] }

    const sandboxConfig: SandboxConfig = {
      tier,
      enabled: true,
      grantedPermissions: [...defaultPermissions],
      deniedPermissions: [],
      resourceLimits: defaultLimits,
      auditEnabled: tier !== 'L0',
      apiInterception: true,
      ...config,
    }

    const env: SandboxEnvironment = {
      id: sandboxId,
      pluginId,
      tier,
      config: sandboxConfig,
      active: true,
      createdAt: new Date().toISOString(),
      resourceUsage: this.createEmptyUsage(),
      auditLog: [],
      apiCallCount: new Map(),
    }

    this.environments.set(sandboxId, env)
    this.emitEvent('sandbox_created', env)

    return env
  }

  /** 销毁沙箱环境 */
  destroySandbox(sandboxId: string): boolean {
    const env = this.environments.get(sandboxId)
    if (!env) return false

    this.environments.delete(sandboxId)
    this.emitEvent('sandbox_destroyed', env)
    return true
  }

  /** 获取沙箱环境 */
  getSandbox(sandboxId: string): SandboxEnvironment | undefined {
    return this.environments.get(sandboxId)
  }

  /** 按插件 ID 获取沙箱 */
  getSandboxByPlugin(pluginId: string): SandboxEnvironment | undefined {
    for (const env of this.environments.values()) {
      if (env.pluginId === pluginId) return env
    }
    return undefined
  }

  /** 获取所有沙箱 */
  getAllSandboxes(): SandboxEnvironment[] {
    return [...this.environments.values()]
  }

  // ---- 权限检查 ----

  /** 检查权限 */
  checkPermission(
    sandboxId: string,
    permission: SandboxPermission,
  ): { allowed: boolean; reason?: string } {
    const env = this.environments.get(sandboxId)
    if (!env) return { allowed: false, reason: '沙箱不存在' }
    if (!env.active) return { allowed: false, reason: '沙箱未激活' }

    // 拒绝列表优先
    if (env.config.deniedPermissions.includes(permission)) {
      this.audit(env, `permission_check:${permission}`, 'denied', '在拒绝列表中')
      this.emitViolation(env, 'permission_denied', `权限 ${permission} 被拒绝`)
      return { allowed: false, reason: `权限 ${permission} 被拒绝` }
    }

    // 授予列表检查
    if (env.config.grantedPermissions.includes(permission)) {
      this.audit(env, `permission_check:${permission}`, 'allowed')
      return { allowed: true }
    }

    // 等级默认权限
    const tierPermissions = TIER_PERMISSIONS[env.tier]
    if (tierPermissions.includes(permission)) {
      this.audit(env, `permission_check:${permission}`, 'allowed')
      return { allowed: true }
    }

    this.audit(env, `permission_check:${permission}`, 'denied', '权限不足')
    this.emitViolation(env, 'permission_denied', `权限 ${permission} 超出 ${env.tier} 等级`)
    return { allowed: false, reason: `权限 ${permission} 超出 ${SANDBOX_TIER_LABELS[env.tier]} 等级` }
  }

  /** 授予权限 */
  grantPermission(sandboxId: string, permission: SandboxPermission): boolean {
    const env = this.environments.get(sandboxId)
    if (!env) return false

    // 移除拒绝列表中的该权限
    env.config.deniedPermissions = env.config.deniedPermissions.filter(p => p !== permission)

    if (!env.config.grantedPermissions.includes(permission)) {
      env.config.grantedPermissions.push(permission)
    }

    this.emitEvent('permission_granted', env, { permission })
    return true
  }

  /** 撤销权限 */
  revokePermission(sandboxId: string, permission: SandboxPermission): boolean {
    const env = this.environments.get(sandboxId)
    if (!env) return false

    env.config.grantedPermissions = env.config.grantedPermissions.filter(p => p !== permission)
    if (!env.config.deniedPermissions.includes(permission)) {
      env.config.deniedPermissions.push(permission)
    }

    this.emitEvent('permission_revoked', env, { permission })
    return true
  }

  // ---- 资源检查 ----

  /** 检查资源是否超限 */
  checkResourceLimits(sandboxId: string): Violation | null {
    const env = this.environments.get(sandboxId)
    if (!env) return null

    const limits = env.config.resourceLimits
    const usage = env.resourceUsage

    if (usage.memoryMB > limits.maxMemoryMB) {
      return this.createViolation(env, 'memory_exceeded',
        `内存使用 ${usage.memoryMB}MB 超过限制 ${limits.maxMemoryMB}MB`)
    }

    if (usage.storageMB > limits.maxStorageMB) {
      return this.createViolation(env, 'storage_exceeded',
        `存储使用 ${usage.storageMB}MB 超过限制 ${limits.maxStorageMB}MB`)
    }

    if (usage.apiCallsThisMinute > limits.maxAPICallsPerMinute) {
      return this.createViolation(env, 'api_rate_exceeded',
        `API 调用频率 ${usage.apiCallsThisMinute}/min 超过限制 ${limits.maxAPICallsPerMinute}/min`)
    }

    if (usage.networkRequestsThisMinute > limits.maxNetworkRequestsPerMinute) {
      return this.createViolation(env, 'network_rate_exceeded',
        `网络请求 ${usage.networkRequestsThisMinute}/min 超过限制 ${limits.maxNetworkRequestsPerMinute}/min`)
    }

    if (usage.activeExecutionTimeMs > limits.maxExecutionTimeMs) {
      return this.createViolation(env, 'execution_timeout',
        `执行时间 ${usage.activeExecutionTimeMs}ms 超过限制 ${limits.maxExecutionTimeMs}ms`)
    }

    if (limits.maxDOMopsPerSecond > 0 && usage.domOpsThisSecond > limits.maxDOMopsPerSecond) {
      return this.createViolation(env, 'dom_manipulation_blocked',
        `DOM 操作 ${usage.domOpsThisSecond}/s 超过限制 ${limits.maxDOMopsPerSecond}/s`)
    }

    return null
  }

  /** 记录 API 调用 */
  recordAPICall(sandboxId: string, apiName: string): void {
    const env = this.environments.get(sandboxId)
    if (!env) return

    const count = env.apiCallCount.get(apiName) || 0
    env.apiCallCount.set(apiName, count + 1)
    env.resourceUsage.apiCallsThisMinute++
  }

  /** 记录资源使用 */
  recordResourceUsage(sandboxId: string, usage: Partial<ResourceUsage>): void {
    const env = this.environments.get(sandboxId)
    if (!env) return

    Object.assign(env.resourceUsage, usage)
  }

  /** 重置资源计数 */
  resetResourceCounters(sandboxId: string): void {
    const env = this.environments.get(sandboxId)
    if (!env) return

    env.resourceUsage = this.createEmptyUsage()
  }

  // ---- 等级变更 ----

  /** 变更沙箱等级 */
  changeTier(sandboxId: string, newTier: SandboxTier): boolean {
    const env = this.environments.get(sandboxId)
    if (!env) return false

    const oldTier = env.tier
    env.tier = newTier
    env.config.resourceLimits = { ...TIER_RESOURCE_LIMITS[newTier] }
    env.resourceUsage = this.createEmptyUsage()

    this.audit(env, 'tier_change', 'allowed', `等级从 ${oldTier} 变更为 ${newTier}`)
    this.emitEvent('tier_changed', env, { oldTier, newTier })

    return true
  }

  // ---- 违规处理 ----

  /** 注册违规处理器 */
  onViolation(handler: ViolationHandler): void {
    this.violationHandlers.push(handler)
  }

  /** 移除违规处理器 */
  offViolation(handler: ViolationHandler): void {
    this.violationHandlers = this.violationHandlers.filter(h => h !== handler)
  }

  private createViolation(
    env: SandboxEnvironment,
    type: ViolationType,
    message: string,
  ): Violation {
    return {
      type,
      message,
      timestamp: new Date().toISOString(),
      pluginId: env.pluginId,
      sandboxId: env.id,
      tier: env.tier,
    }
  }

  private emitViolation(
    env: SandboxEnvironment,
    type: ViolationType,
    message: string,
  ): void {
    const violation = this.createViolation(env, type, message)

    // 调用处理器
    let result: 'allow' | 'block' | 'warn' = 'block'
    for (const handler of this.violationHandlers) {
      const r = handler(violation)
      if (r === 'block') { result = 'block'; break }
      if (r === 'warn') result = 'warn'
    }

    this.audit(env, `violation:${type}`, result === 'block' ? 'denied' : 'allowed', message)

    // 严重违规时停用沙箱
    if (result === 'block' && (type === 'memory_exceeded' || type === 'api_rate_exceeded')) {
      env.active = false
    }

    this.emitEvent('violation_detected', env, { violation, result })
  }

  // ---- 审计 ----

  private audit(env: SandboxEnvironment, action: string, result: AuditEntry['result'], details?: string): void {
    if (!env.config.auditEnabled) return

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      details: details || '',
      result,
      tier: env.tier,
    }

    env.auditLog.push(entry)

    // 限制审计日志大小
    if (env.auditLog.length > 1000) {
      env.auditLog = env.auditLog.slice(-500)
    }
  }

  /** 获取审计日志 */
  getAuditLog(sandboxId: string): AuditEntry[] {
    const env = this.environments.get(sandboxId)
    if (!env) return []
    return [...env.auditLog]
  }

  // ---- 事件 ----

  private emitEvent(
    type: SandboxEventType,
    env: SandboxEnvironment,
    data?: Record<string, unknown>,
  ): void {
    const event: SandboxEvent = {
      type,
      timestamp: new Date().toISOString(),
      sandboxId: env.id,
      pluginId: env.pluginId,
      tier: env.tier,
      data,
    }

    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('[Sandbox] 事件监听器出错:', err)
      }
    }
  }

  /** 注册事件监听器 */
  onEvent(listener: SandboxEventListener): void {
    this.eventListeners.push(listener)
  }

  /** 移除事件监听器 */
  offEvent(listener: SandboxEventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener)
  }

  // ---- 工具方法 ----

  /** 根据插件来源推荐安全等级 */
  static recommendTier(source: string): SandboxTier {
    if (source === 'builtin' || source === 'official') return 'L2'
    if (source === 'market') return 'L1'
    return 'L0'
  }

  /** 获取安全等级对应的权限列表 */
  static getTierPermissions(tier: SandboxTier): SandboxPermission[] {
    return [...TIER_PERMISSIONS[tier]]
  }

  /** 获取安全等级对应的资源限制 */
  static getTierResourceLimits(tier: SandboxTier): ResourceLimits {
    return { ...TIER_RESOURCE_LIMITS[tier] }
  }

  private createEmptyUsage(): ResourceUsage {
    return {
      memoryMB: 0,
      storageMB: 0,
      domOpsThisSecond: 0,
      apiCallsThisMinute: 0,
      networkRequestsThisMinute: 0,
      activeExecutionTimeMs: 0,
      lastResetAt: new Date().toISOString(),
    }
  }
}

/** 全局单例 */
export const sandboxIsolator = new SandboxIsolator()