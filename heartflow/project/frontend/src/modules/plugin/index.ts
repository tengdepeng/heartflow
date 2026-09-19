// ============================================================
// 插件管理器 · 状态管理与生命周期
// ============================================================

import { ref, computed } from 'vue'
import type { PluginRuntime, PluginPermission } from './types'
import { CORE_PLUGINS } from './types'
import { storage } from '../../engine/storage'
import { initPluginAPIs } from './api'
import { registerCorePluginCapabilities } from './capability-impls'

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

function loadRegistry(): Record<string, { enabled: boolean; permissions: string[]; granted?: string[] }> {
  return storage.getPluginRegistry?.() ?? {}
}

function saveRegistry(reg: Record<string, { enabled: boolean; permissions: string[]; granted?: string[] }>) {
  storage.setPluginRegistry?.(reg)
}

const runtimes = ref<PluginRuntime[]>([])

/** 初始化插件系统（加载核心插件 + 注册表状态） */
function init() {
  const registry = loadRegistry()
  runtimes.value = CORE_PLUGINS.map(m => {
    const entry = registry[m.meta.id]
    return {
      id: m.meta.id,
      name: m.meta.name,
      version: m.meta.version,
      manifest: m,
      enabled: entry?.enabled ?? true,
      loaded: false,
      installedAt: new Date().toISOString(),
      hooks: new Map(),
      sandbox: { ...m.sandbox },
      granted: (entry?.granted ?? entry?.permissions ?? m.permissions) as PluginPermission[],
    }
  })
}

/** 获取所有运行时 */
function getAll(): PluginRuntime[] {
  return runtimes.value
}

/** 获取已启用的插件 */
const enabledPlugins = computed(() =>
  runtimes.value.filter(r => r.enabled),
)

/** 启用/禁用插件 */
function toggle(id: string): boolean {
  const rt = runtimes.value.find(r => r.manifest.meta.id === id)
  if (!rt) return false
  rt.enabled = !rt.enabled
  persist()
  return rt.enabled
}

/**
 * 检查插件是否有所需权限（运行时门控唯一真相）
 * 直接读持久化注册表里的 granted 子集，使 UI 的逐项开关实时生效，
 * 不依赖内存中 runtimes 是否与 store 同步。
 */
function checkPermission(id: string, permission: PluginPermission): boolean {
  const rt = runtimes.value.find(r => r.manifest.meta.id === id)
  if (!rt) return false
  const entry = loadRegistry()[id]
  const enabled = entry?.enabled ?? rt.enabled
  if (!enabled) return false
  const granted = entry?.granted ?? entry?.permissions ?? rt.manifest.permissions
  return granted.includes(permission)
}

/** 按分类获取插件 */
function getByCategory(category: string): PluginRuntime[] {
  return runtimes.value.filter(r => r.manifest.meta.category === category)
}

/** 持久化注册表（合并写入，保留其它来源管理的条目） */
function persist() {
  const reg = loadRegistry()
  for (const rt of runtimes.value) {
    reg[rt.manifest.meta.id] = {
      enabled: rt.enabled,
      permissions: rt.manifest.permissions,
      granted: rt.granted ?? rt.manifest.permissions,
    }
  }
  saveRegistry(reg)
}

export function usePluginManager() {
  /** 加载插件（模拟沙箱加载） */
  function load(id: string): boolean {
    const rt = runtimes.value.find(r => r.manifest.meta.id === id)
    if (!rt || !rt.enabled) return false
    if (rt.loaded) return true
    rt.loaded = true
    rt.loadError = undefined
    return true
  }

  /** 卸载插件 */
  function unload(id: string) {
    const rt = runtimes.value.find(r => r.manifest.meta.id === id)
    if (rt) rt.loaded = false
  }

  /** 获取单个插件 */
  function get(id: string): PluginRuntime | undefined {
    return runtimes.value.find(r => r.manifest.meta.id === id)
  }

  /** 更新插件配置（如启用状态、权限列表） */
  function update(id: string, data: { enabled?: boolean; permissions?: PluginPermission[] }): boolean {
    const rt = runtimes.value.find(r => r.manifest.meta.id === id)
    if (!rt) return false
    if (data.enabled !== undefined) rt.enabled = data.enabled
    if (data.permissions) rt.manifest.permissions = data.permissions
    persist()
    return true
  }

  /** 从系统中移除插件 */
  function remove(id: string): boolean {
    const idx = runtimes.value.findIndex(r => r.manifest.meta.id === id)
    if (idx === -1) return false
    runtimes.value.splice(idx, 1)
    persist()
    return true
  }

  return {
    runtimes,
    enabledPlugins,
    init,
    getAll,
    get,
    toggle,
    load,
    unload,
    update,
    remove,
    hasPermission: checkPermission,
    getByCategory,
  }
}

// 初始化插件API
initPluginAPIs()

// 注册内置核心插件的能力实现（能力声明见 types.CORE_PLUGINS）
registerCorePluginCapabilities()

// 自动初始化
init()