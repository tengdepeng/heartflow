// ============================================================
// 插件管理器 · 状态管理与生命周期
// ============================================================

import { ref, computed } from 'vue'
import type { PluginRuntime, PluginPermission } from './types'
import { CORE_PLUGINS } from './types'
import { storage } from '../../engine/storage'
import { initPluginAPIs } from './api'

export type { PluginManifest, PluginRuntime, PluginPermission } from './types'
export { CORE_PLUGINS, PERMISSION_LABELS } from './types'
export { loadPlugin, unloadPlugin, getLoadedPlugins, registerPluginAPI, getPluginAPI, getRegisteredAPIs, hasPluginPermission as hasPermission, createExternalManifest } from './loader'

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
export type {
  PluginDependency,
  DependencyResolution,
  VersionConflict,
  PluginRating,
  PluginReview,
  PluginUpdate,
  MarketplaceStats,
  UpdatePolicy,
} from './plugin-marketplace'

function loadRegistry(): Record<string, { enabled: boolean; permissions: string[] }> {
  return storage.getPluginRegistry?.() ?? {}
}

function saveRegistry(reg: Record<string, { enabled: boolean; permissions: string[] }>) {
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

/** 检查插件是否有所需权限 */
function checkPermission(id: string, permission: PluginPermission): boolean {
  const rt = runtimes.value.find(r => r.manifest.meta.id === id)
  if (!rt || !rt.enabled) return false
  return rt.manifest.permissions.includes(permission)
}

/** 按分类获取插件 */
function getByCategory(category: string): PluginRuntime[] {
  return runtimes.value.filter(r => r.manifest.meta.category === category)
}

/** 持久化注册表 */
function persist() {
  const reg: Record<string, { enabled: boolean; permissions: string[] }> = {}
  for (const rt of runtimes.value) {
    reg[rt.manifest.meta.id] = {
      enabled: rt.enabled,
      permissions: rt.manifest.permissions,
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

// 自动初始化
init()