// ============================================================
// 插件管理器
// 模块注册 / 启停 / 权限管理
// Phase 1: 表单化现有的核心模块为"插件"，提供开关界面
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PluginManifest, PluginRuntime, PluginPermission } from '../modules/plugin/types'
import { CORE_PLUGINS } from '../modules/plugin/types'
import { storage } from '../engine/storage'

export { CORE_PLUGINS }
export type { PluginManifest, PluginRuntime, PluginPermission }

export const usePluginStore = defineStore('plugin', () => {
  // ---- 状态 ----
  const plugins = ref<PluginRuntime[]>([])
  const initialized = ref(false)

  // ---- 计算 ----
  const enabledPlugins = computed(() => plugins.value.filter(p => p.enabled))
  const disabledPlugins = computed(() => plugins.value.filter(p => !p.enabled))
  const officialPlugins = computed(() => plugins.value.filter(p => p.manifest.meta.tier === 'official'))
  const communityPlugins = computed(() => plugins.value.filter(p => p.manifest.meta.tier === 'community'))
  const experimentalPlugins = computed(() => plugins.value.filter(p => p.manifest.meta.tier === 'experimental'))

  // ---- 初始化 ----
  function init() {
    if (initialized.value) return
    const registry = storage.getPluginRegistry()

    plugins.value = CORE_PLUGINS.map(manifest => {
      const saved = registry[manifest.meta.id]
      return {
        id: manifest.meta.id,
        name: manifest.meta.name,
        version: manifest.meta.version,
        manifest,
        enabled: saved?.enabled ?? true,
        loaded: true, // 核心插件直接标记 loaded
        installedAt: new Date().toISOString(),
        hooks: new Map(),
        sandbox: { ...manifest.sandbox },
      }
    })

    initialized.value = true
  }

  // ---- 启用/禁用 ----
  function enable(id: string) {
    const p = plugins.value.find(p => p.manifest.meta.id === id)
    if (!p) return false
    p.enabled = true
    persist()
    return true
  }

  function disable(id: string) {
    const p = plugins.value.find(p => p.manifest.meta.id === id)
    if (!p) return false
    // 核心插件不允许禁用（Phase 1 保护）
    if (p.manifest.meta.tier === 'official' && p.manifest.meta.id.startsWith('core-')) {
      return false
    }
    p.enabled = false
    persist()
    return true
  }

  function toggle(id: string) {
    const p = plugins.value.find(p => p.manifest.meta.id === id)
    if (!p) return
    if (p.enabled) {
      disable(id)
    } else {
      enable(id)
    }
  }

  // ---- 安装/卸载（外部插件） ----
  function installPlugin(manifest: PluginManifest) {
    if (plugins.value.some(p => p.manifest.meta.id === manifest.meta.id)) {
      return false
    }
    plugins.value.push({
      id: manifest.meta.id,
      name: manifest.meta.name,
      version: manifest.meta.version,
      manifest,
      enabled: true,
      loaded: false,
      installedAt: new Date().toISOString(),
      hooks: new Map(),
      sandbox: { ...manifest.sandbox },
    })
    persist()
    return true
  }

  function uninstallPlugin(id: string) {
    const p = plugins.value.find(p => p.manifest.meta.id === id)
    if (!p) return false
    // 核心插件不可卸载
    if (p.manifest.meta.tier === 'official' && p.manifest.meta.id.startsWith('core-')) {
      return false
    }
    plugins.value = plugins.value.filter(p => p.manifest.meta.id !== id)
    persist()
    return true
  }

  // ---- 持久化 ----
  function persist() {
    const registry: Record<string, { enabled: boolean; permissions: string[] }> = {}
    for (const p of plugins.value) {
      registry[p.manifest.meta.id] = {
        enabled: p.enabled,
        permissions: p.manifest.permissions,
      }
    }
    storage.setPluginRegistry(registry)
  }

  return {
    plugins,
    initialized,
    enabledPlugins,
    disabledPlugins,
    officialPlugins,
    communityPlugins,
    experimentalPlugins,
    init,
    enable,
    disable,
    toggle,
    installPlugin,
    uninstallPlugin,
  }
})