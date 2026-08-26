// ============================================================
// 插件沙箱 · 类型定义
// 蓝图定义：
//   沙箱隔离 — 三级安全分级
//   L0: 只读沙箱 — 仅可读取当前上下文，不允许任何写入
//   L1: 受限沙箱 — 可读写数据，但受配额和资源限制
//   L2: 完全沙箱 — 完整访问权限，但受监控和审计
// ============================================================

// ---- 三级安全等级 ----

export type SandboxTier = 'L0' | 'L1' | 'L2'

export const SANDBOX_TIER_LABELS: Record<SandboxTier, string> = {
  L0: '只读沙箱',
  L1: '受限沙箱',
  L2: '完全沙箱',
}

export const SANDBOX_TIER_DESCRIPTIONS: Record<SandboxTier, string> = {
  L0: '仅可读取当前上下文数据，不允许任何写入操作。适用于社区实验性插件。',
  L1: '可读写数据，但受配额和资源限制。适用于经过审核的社区插件。',
  L2: '完整访问权限，所有操作受监控和审计。适用于官方插件和可信插件。',
}

// ---- 沙箱权限 ----

export type SandboxPermission =
  // L0 权限
  | 'context:read'        // 读取当前上下文
  | 'session:read'        // 读取当前会话
  // L1 权限
  | 'data:read'           // 读取用户数据
  | 'data:write'          // 写入用户数据
  | 'storage:read'        // 读取存储
  | 'storage:write'       // 写入存储
  | 'notification:send'   // 发送通知
  // L2 权限
  | 'network:access'      // 网络访问
  | 'file:read'           // 文件读取
  | 'file:write'          // 文件写入
  | 'ai:chat'             // AI 对话
  | 'ai:config'           // AI 配置
  | 'navigation'          // 导航
  | 'interaction'         // 交互事件
  | 'system:config'       // 系统配置

/** 三级权限映射 */
export const TIER_PERMISSIONS: Record<SandboxTier, SandboxPermission[]> = {
  L0: [
    'context:read',
    'session:read',
  ],
  L1: [
    'context:read',
    'session:read',
    'data:read',
    'data:write',
    'storage:read',
    'storage:write',
    'notification:send',
  ],
  L2: [
    'context:read',
    'session:read',
    'data:read',
    'data:write',
    'storage:read',
    'storage:write',
    'notification:send',
    'network:access',
    'file:read',
    'file:write',
    'ai:chat',
    'ai:config',
    'navigation',
    'interaction',
    'system:config',
  ],
}

// ---- 沙箱配置 ----

export interface SandboxConfig {
  /** 安全等级 */
  tier: SandboxTier
  /** 是否启用沙箱 */
  enabled: boolean
  /** 允许的权限列表（覆盖默认等级权限） */
  grantedPermissions: SandboxPermission[]
  /** 拒绝的权限列表 */
  deniedPermissions: SandboxPermission[]
  /** 资源限制 */
  resourceLimits: ResourceLimits
  /** 是否启用审计日志 */
  auditEnabled: boolean
  /** 是否启用 API 调用拦截 */
  apiInterception: boolean
}

export interface ResourceLimits {
  /** 最大内存 (MB) */
  maxMemoryMB: number
  /** 最大存储 (MB) */
  maxStorageMB: number
  /** 最大 DOM 操作数/秒 */
  maxDOMopsPerSecond: number
  /** 最大 API 调用数/分钟 */
  maxAPICallsPerMinute: number
  /** 最大网络请求数/分钟 */
  maxNetworkRequestsPerMinute: number
  /** 最大执行时间 (ms) */
  maxExecutionTimeMs: number
}

/** 三级默认资源限制 */
export const TIER_RESOURCE_LIMITS: Record<SandboxTier, ResourceLimits> = {
  L0: {
    maxMemoryMB: 10,
    maxStorageMB: 1,
    maxDOMopsPerSecond: 0,
    maxAPICallsPerMinute: 10,
    maxNetworkRequestsPerMinute: 0,
    maxExecutionTimeMs: 1000,
  },
  L1: {
    maxMemoryMB: 50,
    maxStorageMB: 10,
    maxDOMopsPerSecond: 10,
    maxAPICallsPerMinute: 60,
    maxNetworkRequestsPerMinute: 0,
    maxExecutionTimeMs: 5000,
  },
  L2: {
    maxMemoryMB: 200,
    maxStorageMB: 100,
    maxDOMopsPerSecond: 100,
    maxAPICallsPerMinute: 600,
    maxNetworkRequestsPerMinute: 30,
    maxExecutionTimeMs: 30000,
  },
}

// ---- 沙箱环境 ----

export interface SandboxEnvironment {
  /** 沙箱 ID */
  id: string
  /** 插件 ID */
  pluginId: string
  /** 安全等级 */
  tier: SandboxTier
  /** 配置 */
  config: SandboxConfig
  /** 是否活跃 */
  active: boolean
  /** 创建时间 */
  createdAt: string
  /** 当前资源使用 */
  resourceUsage: ResourceUsage
  /** 审计日志 */
  auditLog: AuditEntry[]
  /** API 调用计数 */
  apiCallCount: Map<string, number>
}

export interface ResourceUsage {
  memoryMB: number
  storageMB: number
  domOpsThisSecond: number
  apiCallsThisMinute: number
  networkRequestsThisMinute: number
  activeExecutionTimeMs: number
  lastResetAt: string
}

export interface AuditEntry {
  timestamp: string
  action: string
  details: string
  result: 'allowed' | 'denied' | 'error'
  tier: SandboxTier
}

// ---- 沙箱违规 ----

export type ViolationType =
  | 'permission_denied'
  | 'memory_exceeded'
  | 'storage_exceeded'
  | 'api_rate_exceeded'
  | 'network_rate_exceeded'
  | 'execution_timeout'
  | 'dom_manipulation_blocked'
  | 'unauthorized_access'

export interface Violation {
  type: ViolationType
  message: string
  timestamp: string
  pluginId: string
  sandboxId: string
  tier: SandboxTier
  details?: Record<string, unknown>
}

export interface ViolationHandler {
  (violation: Violation): 'allow' | 'block' | 'warn'
}

// ---- 沙箱事件 ----

export type SandboxEventType =
  | 'sandbox_created'
  | 'sandbox_destroyed'
  | 'permission_granted'
  | 'permission_revoked'
  | 'violation_detected'
  | 'resource_warning'
  | 'tier_changed'
  | 'api_intercepted'

export interface SandboxEvent {
  type: SandboxEventType
  timestamp: string
  sandboxId: string
  pluginId: string
  tier: SandboxTier
  data?: Record<string, unknown>
}

export type SandboxEventListener = (event: SandboxEvent) => void