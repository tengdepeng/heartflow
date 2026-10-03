// ============================================================
// 插件能力注册表 · 能力声明 → 门控调用
// 蓝图18 L1916（插件可开关）/ L10612（经能力扩展对话分身）
//
// 设计要点：
// 1. 能力「声明」写在 manifest.capabilities（见 types.CORE_PLUGINS）
// 2. 能力「实现」由插件模块注册（见 capability-impls.ts）
// 3. 调用经三重门控：插件启用 → 权限已授予 → 实现已注册
//    状态读取与 modules/plugin/index.ts::checkPermission 同源，
//    统一取持久化注册表（用户逐项开关的落地处），不另造一套真相。
// ============================================================

import { storage } from '../../engine/storage'
import { CORE_PLUGINS } from './types'
import type { PluginCapability, PluginManifest, PluginPermission } from './types'

/** 能力调用失败原因（供 UI 区分提示） */
export type CapabilityFailure =
  | 'capability-not-found'
  | 'plugin-disabled'
  | 'permission-denied'
  | 'impl-missing'
  | 'error'

/** 能力调用结果 */
export interface CapabilityInvocationResult<T = unknown> {
  ok: boolean
  value?: T
  error?: string
  reason?: CapabilityFailure
}

/** 一个「当前可用」的能力（插件已启用且权限已授予） */
export interface AvailableCapability {
  pluginId: string
  pluginName: string
  pluginTier: string
  capability: PluginCapability
}

type CapabilityImpl = (args: Record<string, unknown>) => unknown

/** 实现注册表：`pluginId:capabilityId` → impl */
const impls = new Map<string, CapabilityImpl>()

function implKey(pluginId: string, capabilityId: string): string {
  return `${pluginId}:${capabilityId}`
}

/** 注册一个插件能力的实现（由插件模块在初始化时调用，可覆盖） */
export function registerPluginCapability(
  pluginId: string,
  capabilityId: string,
  impl: CapabilityImpl,
): void {
  impls.set(implKey(pluginId, capabilityId), impl)
}

/** 查找内置插件的 manifest */
function findManifest(pluginId: string): PluginManifest | undefined {
  return CORE_PLUGINS.find(p => p.meta.id === pluginId)
}

/** 读取插件运行状态（与 index.ts::checkPermission 同源：持久化注册表） */
export function resolvePluginState(pluginId: string): {
  enabled: boolean
  granted: PluginPermission[]
} {
  const declared = findManifest(pluginId)?.permissions ?? []
  const entry = storage.getPluginRegistry?.()?.[pluginId]
  return {
    enabled: entry?.enabled ?? true,
    granted: (entry?.granted ?? entry?.permissions ?? declared) as PluginPermission[],
  }
}

/** 某插件对外声明的能力（不论是否启用） */
export function getPluginCapabilities(pluginId: string): PluginCapability[] {
  return findManifest(pluginId)?.capabilities ?? []
}

/** 列出当前真正可用的能力（插件已启用 + 权限已授予） */
export function listAvailableCapabilities(): AvailableCapability[] {
  const out: AvailableCapability[] = []
  for (const manifest of CORE_PLUGINS) {
    const caps = manifest.capabilities ?? []
    if (caps.length === 0) continue
    const state = resolvePluginState(manifest.meta.id)
    if (!state.enabled) continue
    for (const capability of caps) {
      if (!state.granted.includes(capability.permission)) continue
      out.push({
        pluginId: manifest.meta.id,
        pluginName: manifest.meta.name,
        pluginTier: manifest.meta.tier,
        capability,
      })
    }
  }
  return out
}

/** 按关键词从自然语言里命中一个可用能力（最长关键词优先） */
export function findCapabilityByKeyword(text: string): AvailableCapability | null {
  const q = (text || '').trim()
  if (!q) return null
  let best: AvailableCapability | null = null
  let bestLen = 0
  for (const item of listAvailableCapabilities()) {
    for (const kw of item.capability.keywords) {
      if (kw && kw.length > bestLen && q.includes(kw)) {
        best = item
        bestLen = kw.length
      }
    }
  }
  return best
}

/**
 * 调用插件能力。
 * 门控顺序：插件存在 → 能力已声明 → 插件已启用 → 权限已授予 → 实现已注册。
 */
export function invokePluginCapability<T = unknown>(
  pluginId: string,
  capabilityId: string,
  args: Record<string, unknown> = {},
): CapabilityInvocationResult<T> {
  const manifest = findManifest(pluginId)
  if (!manifest) {
    return { ok: false, reason: 'capability-not-found', error: `插件 ${pluginId} 不存在` }
  }

  const capability = (manifest.capabilities ?? []).find(c => c.id === capabilityId)
  if (!capability) {
    return {
      ok: false,
      reason: 'capability-not-found',
      error: `插件「${manifest.meta.name}」未声明能力 ${capabilityId}`,
    }
  }

  const state = resolvePluginState(pluginId)
  if (!state.enabled) {
    return {
      ok: false,
      reason: 'plugin-disabled',
      error: `「${manifest.meta.name}」插件已禁用，该能力不可用`,
    }
  }

  if (!state.granted.includes(capability.permission)) {
    return {
      ok: false,
      reason: 'permission-denied',
      error: `「${manifest.meta.name}」缺少「${capability.permission}」权限，请在插件管理器中授予`,
    }
  }

  const impl = impls.get(implKey(pluginId, capabilityId))
  if (!impl) {
    return {
      ok: false,
      reason: 'impl-missing',
      error: `能力 ${capabilityId} 的实现未注册`,
    }
  }

  try {
    return { ok: true, value: impl(args) as T }
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/** 重置实现注册表（仅用于测试） */
export function __resetCapabilityRegistry(): void {
  impls.clear()
}
