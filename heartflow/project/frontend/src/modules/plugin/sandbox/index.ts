// ============================================================
// 插件沙箱 · 导出入口
// 蓝图定义：
//   沙箱隔离 — 三级安全分级系统
//   L0(只读) / L1(受限) / L2(完全监控)
//   提供沙箱环境管理、权限检查、资源限制、运行时守卫
// ============================================================

// 类型
export type {
  SandboxTier,
  SandboxPermission,
  SandboxConfig,
  ResourceLimits,
  SandboxEnvironment,
  ResourceUsage,
  AuditEntry,
  ViolationType,
  Violation,
  ViolationHandler,
  SandboxEventType,
  SandboxEvent,
  SandboxEventListener,
} from './types'

export {
  SANDBOX_TIER_LABELS,
  SANDBOX_TIER_DESCRIPTIONS,
  TIER_PERMISSIONS,
  TIER_RESOURCE_LIMITS,
} from './types'

// 隔离器
export {
  SandboxIsolator,
  sandboxIsolator,
} from './isolator'

// 运行时守卫
export {
  RuntimeGuard,
  runtimeGuard,
  DEFAULT_GUARD_CONFIG,
} from './guard'

export type {
  GuardConfig,
  GuardState,
  ViolationRecord,
  DowngradeRecord,
} from './guard'