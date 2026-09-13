// ============================================================
// 插件加载器 · 支持动态导入和沙箱模拟
// ============================================================

import type { PluginManifest, PluginRuntime } from './types'
import { storage } from '../../engine/storage'

/** 插件实例注册表 */
const loadedPlugins = new Map<string, PluginRuntime>()

/** 注册插件API */
const pluginAPIs = new Map<string, any>()

/** 注册一个插件API端点 */
export function registerPluginAPI(name: string, api: any) {
  pluginAPIs.set(name, api)
}

/** 获取已注册的插件API */
export function getPluginAPI<T = any>(name: string): T | null {
  return (pluginAPIs.get(name) as T) ?? null
}

/** 获取所有已注册的API端点名 */
export function getRegisteredAPIs(): string[] {
  return [...pluginAPIs.keys()]
}

/** 从 manifest 加载插件（模拟沙箱加载） */
export async function loadPlugin(manifest: PluginManifest): Promise<PluginRuntime> {
  if (loadedPlugins.has(manifest.meta.id)) {
    throw new Error(`插件 ${manifest.meta.id} 已加载`)
  }

  // 模拟沙箱加载
  const runtime: PluginRuntime = {
    id: manifest.meta.id,
    name: manifest.meta.name,
    version: manifest.meta.version,
    manifest,
    loaded: true,
    enabled: false,
    installedAt: new Date().toISOString(),
    hooks: new Map(),
    sandbox: {
      isolateFS: manifest.meta.tier === 'official',
      isolateNetwork: manifest.meta.tier === 'official',
      isolateDOM: manifest.meta.tier !== 'experimental',
    },
    granted: [...manifest.permissions],
  }

  loadedPlugins.set(manifest.meta.id, runtime)
  return runtime
}

/** 卸载插件 */
export function unloadPlugin(pluginId: string): boolean {
  const runtime = loadedPlugins.get(pluginId)
  if (!runtime) return false
  runtime.loaded = false
  runtime.enabled = false
  loadedPlugins.delete(pluginId)
  return true
}

/** 获取已加载的插件列表 */
export function getLoadedPlugins(): PluginRuntime[] {
  return [...loadedPlugins.values()]
}

/** 检查插件是否有权限 */
export function hasPluginPermission(pluginId: string, permission: string): boolean {
  const runtime = loadedPlugins.get(pluginId)
  if (runtime) {
    if (runtime.manifest.meta.tier === 'official') return true
    if (runtime.manifest.meta.tier === 'experimental') return false
    const granted = runtime.granted ?? runtime.manifest.permissions
    return granted.includes(permission as any)
  }
  // 回退：查持久化注册表（来自 UI 逐项开关）
  const reg = storage.getPluginRegistry?.()
  const entry = reg?.[pluginId]
  if (!entry) return false
  if (entry.enabled === false) return false
  const granted = entry.granted ?? entry.permissions ?? []
  return granted.includes(permission)
}

/** 重置加载器状态（仅用于测试） */
export function __resetLoader() {
  loadedPlugins.clear()
  pluginAPIs.clear()
}

/** 创建一个外部插件 manifest（用于社区插件） */
export function createExternalManifest(
  id: string,
  name: string,
  version: string,
  description: string,
  author: string,
): PluginManifest {
  return {
    meta: {
      id,
      name,
      version,
      description,
      author,
      tier: 'community',
      category: 'other',
      icon: '🧩',
    },
    permissions: ['read_sessions', 'read_notes'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
    entry: '',
    hooks: [],
  }
}