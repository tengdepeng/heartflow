// ⚠️ 本文件是纯 barrel（模块出口）：真实状态定义已下沉 ./plugin-store。
//    barrel 若自身定义符号、又被 bridge 反向引用，会构成 index ↔ bridge 循环依赖，
//    故本地定义一律外置，此处只做转发。

export { usePluginManager } from './plugin-store'

// ============================================================
// 插件管理器 · 状态管理与生命周期
// ============================================================

export type { PluginManifest, PluginRuntime, PluginPermission } from './types'
export { CORE_PLUGINS, PERMISSION_LABELS } from './types'
export { loadPlugin, unloadPlugin, getLoadedPlugins, registerPluginAPI, getPluginAPI, getRegisteredAPIs, hasPluginPermission as hasPermission, createExternalManifest } from './loader'

// ---- Manifest 校验 ----
export {
  validatePluginManifest,
  isValidPluginManifest,
} from './manifest-validator'
export type {
  ManifestValidationIssue,
  ManifestIssueSeverity,
} from './manifest-validator'

// ---- 能力 API 文档（开发指南结构化数据源，从真实常量派生） ----
export { getCapabilityApiDocs } from './capability-docs'
export type {
  CapabilityApiDocs,
  PermissionDocRow,
  SandboxTierDocRow,
  TierMappingRow,
  CapabilityApiDoc,
  RuntimeGateDoc,
  ManifestFieldDoc,
} from './capability-docs'

// ---- 插件调度器 ----
export { usePluginScheduler, DEFAULT_SCHEDULER_CONFIG, PRIORITY_META, PRIORITY_WEIGHT } from './plugin-scheduler'
export type {
  ScheduleTask,
  SchedulePriority,
  ScheduleTaskStatus,
  SchedulerConfig,
  ScheduleStats,
} from './plugin-scheduler'

// ---- 沙箱隔离 ----
export {
  SandboxIsolator,
  sandboxIsolator,
  RuntimeGuard,
  runtimeGuard,
  DEFAULT_GUARD_CONFIG,
  SANDBOX_TIER_LABELS,
  SANDBOX_TIER_DESCRIPTIONS,
  TIER_PERMISSIONS,
  TIER_RESOURCE_LIMITS,
} from './sandbox'
export type {
  SandboxTier,
  SandboxPermission,
  SandboxConfig,
  ResourceLimits,
  SandboxEnvironment,
  ResourceUsage,
  AuditEntry,
  Violation,
  ViolationHandler,
  SandboxEvent,
  SandboxEventListener,
  GuardConfig,
  GuardState,
  ViolationRecord,
  DowngradeRecord,
} from './sandbox'

// ---- 插件市场与依赖管理 ----
export { usePluginMarketplace } from './plugin-marketplace'

// ---- 插件市场源注册表（市场源单一数据源） ----
export { pluginMarketplaceRegistry, CATEGORY_LABELS, CATEGORY_ORDER } from './plugin-registry'
export type { PluginCategoryId, MarketplaceCategory, MarketplaceEntry } from './plugin-registry'

// ---- 视图桥接层（INCR-384）----
export { usePluginEcosystemBridge } from './plugin-ecosystem-bridge'
export type {
  PluginEcosystemOverview,
  PluginBridgeItem,
  SandboxBridgeStatus,
  PluginRecommendation,
} from './plugin-ecosystem-bridge'

// ---- 插件能力通道（蓝图 L10612：经能力扩展对话分身） ----
export {
  registerPluginCapability,
  invokePluginCapability,
  listAvailableCapabilities,
  findCapabilityByKeyword,
  getPluginCapabilities,
  resolvePluginState,
} from './capability-registry'
export type {
  CapabilityInvocationResult,
  CapabilityFailure,
  AvailableCapability,
} from './capability-registry'
export type {
  PluginDependency,
  DependencyResolution,
  VersionConflict,
  PluginUpdate,
  MarketplaceStats,
  UpdatePolicy,
} from './plugin-marketplace'
