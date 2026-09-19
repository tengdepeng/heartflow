// ============================================================
// 插件管理器 · 市场与依赖管理增强
// 依赖解析、更新管理
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { PluginManifest } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 插件依赖 */
export interface PluginDependency {
  /** 依赖插件ID */
  pluginId: string
  /** 所需最低版本 */
  minVersion: string
  /** 是否可选 */
  optional: boolean
  /** 依赖描述 */
  description: string
}

/** 依赖解析结果 */
export interface DependencyResolution {
  /** 是否解析成功 */
  resolved: boolean
  /** 安装顺序 */
  installOrder: string[]
  /** 缺失的依赖 */
  missing: PluginDependency[]
  /** 版本冲突 */
  conflicts: VersionConflict[]
  /** 循环依赖 */
  cycles: string[][]
}

/** 版本冲突 */
export interface VersionConflict {
  pluginId: string
  requiredBy: string
  requiredVersion: string
  actualVersion: string
}

/** 插件更新 */
export interface PluginUpdate {
  id: string
  pluginId: string
  /** 当前版本 */
  fromVersion: string
  /** 目标版本 */
  toVersion: string
  /** 更新类型 */
  type: 'major' | 'minor' | 'patch'
  /** 更新描述 */
  description: string
  /** 变更日志 */
  changelog: string[]
  /** 是否破坏性更新 */
  breaking: boolean
  /** 迁移指南 */
  migrationGuide?: string
  /** 发布时间 */
  publishedAt: string
  /** 是否已安装 */
  installed: boolean
}

/** 插件市场统计 */
export interface MarketplaceStats {
  /** 总插件数 */
  totalPlugins: number
  /** 已安装数 */
  installedCount: number
  /** 可用更新数 */
  availableUpdates: number
  /** 分类统计 */
  categoryStats: { category: string; count: number }[]
  /** 总下载量 */
  totalDownloads: number
}

/** 更新策略 */
export interface UpdatePolicy {
  /** 自动更新 */
  autoUpdate: boolean
  /** 允许的更新类型 */
  allowedTypes: ('major' | 'minor' | 'patch')[]
  /** 更新前备份 */
  backupBeforeUpdate: boolean
  /** 更新检查频率（小时） */
  checkInterval: number
  /** 上次检查时间 */
  lastCheckAt: string | null
}

// ============================================================
// 常量
// ============================================================

/** 存储键 */
const PLUGIN_UPDATES_KEY = 'hf:plugin:updates'
const PLUGIN_POLICY_KEY = 'hf:plugin:policy'

// ============================================================
// 插件市场与依赖管理引擎
// ============================================================

export function usePluginMarketplace() {
  // ---- 状态 ----
  const updates = ref<PluginUpdate[]>(loadUpdates())
  const updatePolicy = ref<UpdatePolicy>(loadPolicy())
  const installedPlugins = ref<Map<string, string>>(new Map()) // pluginId -> version

  // ---- 持久化 ----

  function loadUpdates(): PluginUpdate[] {
    try {
      const raw = storage.getKV<string>(PLUGIN_UPDATES_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveUpdates() {
    storage.setKV(PLUGIN_UPDATES_KEY, JSON.stringify(updates.value))
  }

  function loadPolicy(): UpdatePolicy {
    try {
      const raw = storage.getKV<string>(PLUGIN_POLICY_KEY, '')
      if (!raw) {
        return {
          autoUpdate: false,
          allowedTypes: ['patch'],
          backupBeforeUpdate: true,
          checkInterval: 24,
          lastCheckAt: null,
        }
      }
      return JSON.parse(raw)
    } catch {
      return {
        autoUpdate: false,
        allowedTypes: ['patch'],
        backupBeforeUpdate: true,
        checkInterval: 24,
        lastCheckAt: null,
      }
    }
  }

  function savePolicy() {
    storage.setKV(PLUGIN_POLICY_KEY, JSON.stringify(updatePolicy.value))
  }

  // ---- 依赖解析（实现见模块级 resolveDependencies/getDependencyTree） ----

  // ---- 更新管理 ----

  /** 检查更新 */
  function checkForUpdates(availableVersions: Map<string, { version: string; type: PluginUpdate['type']; breaking: boolean }>): PluginUpdate[] {
    const newUpdates: PluginUpdate[] = []
    for (const [pluginId, currentVersion] of installedPlugins.value) {
      const available = availableVersions.get(pluginId)
      if (available && available.version !== currentVersion) {
        const update: PluginUpdate = {
          id: `update_${pluginId}_${available.version}`,
          pluginId,
          fromVersion: currentVersion,
          toVersion: available.version,
          type: available.type,
          description: `从 ${currentVersion} 更新到 ${available.version}`,
          changelog: [],
          breaking: available.breaking,
          publishedAt: new Date().toISOString(),
          installed: false,
        }
        newUpdates.push(update)
      }
    }
    updates.value = [...updates.value.filter(u => !newUpdates.find(nu => nu.pluginId === u.pluginId)), ...newUpdates]
    updatePolicy.value.lastCheckAt = new Date().toISOString()
    saveUpdates()
    savePolicy()
    return newUpdates
  }

  /** 安装更新 */
  function installUpdate(updateId: string): boolean {
    const update = updates.value.find(u => u.id === updateId)
    if (!update) return false
    update.installed = true
    installedPlugins.value.set(update.pluginId, update.toVersion)
    saveUpdates()
    return true
  }

  /** 批量更新 */
  function installAllUpdates(): number {
    let count = 0
    const allowedTypes = updatePolicy.value.allowedTypes
    for (const update of updates.value) {
      if (!update.installed && allowedTypes.includes(update.type)) {
        update.installed = true
        installedPlugins.value.set(update.pluginId, update.toVersion)
        count++
      }
    }
    saveUpdates()
    return count
  }

  /** 可用更新 */
  const availableUpdates = computed(() =>
    updates.value.filter(u => !u.installed)
  )

  /** 待处理更新数 */
  const pendingUpdateCount = computed(() => availableUpdates.value.length)

  // ---- 更新策略 ----

  /** 更新策略 */
  function updatePolicySettings(partial: Partial<UpdatePolicy>): void {
    Object.assign(updatePolicy.value, partial)
    savePolicy()
  }

  // ---- 市场统计 ----

  /** 生成市场统计 */
  function generateMarketStats(plugins: PluginManifest[]): MarketplaceStats {
    const categories = new Map<string, number>()
    for (const p of plugins) {
      const cat = p.meta.category
      categories.set(cat, (categories.get(cat) || 0) + 1)
    }

    return {
      totalPlugins: plugins.length,
      installedCount: installedPlugins.value.size,
      availableUpdates: availableUpdates.value.length,
      categoryStats: [...categories.entries()].map(([category, count]) => ({ category, count })),
      totalDownloads: 0,
    }
  }

  /** 注册已安装插件 */
  function registerInstalled(pluginId: string, version: string): void {
    installedPlugins.value.set(pluginId, version)
  }

  return {
    // 状态
    updates,
    updatePolicy,
    installedPlugins,

    // 计算属性
    availableUpdates,
    pendingUpdateCount,

    // 依赖
    resolveDependencies,
    getDependencyTree,

    // 更新
    checkForUpdates,
    installUpdate,
    installAllUpdates,

    // 策略
    updatePolicySettings,

    // 统计
    generateMarketStats,
    registerInstalled,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function isVersionSatisfied(actual: string, required: string): boolean {
  const aParts = actual.split('.').map(Number)
  const rParts = required.split('.').map(Number)
  for (let i = 0; i < Math.max(aParts.length, rParts.length); i++) {
    const a = aParts[i] || 0
    const r = rParts[i] || 0
    if (a > r) return true
    if (a < r) return false
  }
  return true
}

// ============================================================
// 模块级依赖解析（纯函数，供桥接层 / 视图 / 测试直接消费）
// ============================================================

/** 依赖图节点 */
export type DependencyNode = { id: string; version: string; dependencies: PluginDependency[] }

/** 解析依赖图：返回安装顺序、缺失依赖、版本冲突与循环依赖 */
export function resolveDependencies(
  plugins: DependencyNode[],
  targetPluginId: string,
): DependencyResolution {
  const pluginMap = new Map(plugins.map(p => [p.id, p]))
  const resolved = new Set<string>()
  const missing: PluginDependency[] = []
  const conflicts: VersionConflict[] = []
  const cycles: string[][] = []
  const visiting = new Set<string>()
  const installOrder: string[] = []

  function resolve(id: string, path: string[]): boolean {
    if (visiting.has(id)) {
      cycles.push([...path, id])
      return false
    }

    const plugin = pluginMap.get(id)
    if (!plugin) {
      missing.push({ pluginId: id, minVersion: '0.0.0', optional: false, description: '未找到插件' })
      return false
    }

    if (resolved.has(id)) return true

    visiting.add(id)
    const newPath = [...path, id]

    for (const dep of plugin.dependencies) {
      if (resolved.has(dep.pluginId)) continue
      const depPlugin = pluginMap.get(dep.pluginId)
      if (!depPlugin) {
        if (!dep.optional) missing.push(dep)
        continue
      }
      if (!isVersionSatisfied(depPlugin.version, dep.minVersion)) {
        conflicts.push({
          pluginId: dep.pluginId,
          requiredBy: id,
          requiredVersion: dep.minVersion,
          actualVersion: depPlugin.version,
        })
      }
      resolve(dep.pluginId, newPath)
    }

    visiting.delete(id)
    resolved.add(id)
    installOrder.push(id)
    return true
  }

  resolve(targetPluginId, [])

  return {
    resolved: missing.length === 0 && conflicts.length === 0 && cycles.length === 0,
    installOrder,
    missing,
    conflicts,
    cycles,
  }
}

/** 获取依赖树（嵌套结构，供依赖关系可视化） */
export function getDependencyTree(
  plugins: DependencyNode[],
  pluginId: string,
): { id: string; version: string; dependencies: ReturnType<typeof getDependencyTree>[] } {
  const plugin = plugins.find(p => p.id === pluginId)
  if (!plugin) return { id: pluginId, version: '0.0.0', dependencies: [] }
  return {
    id: plugin.id,
    version: plugin.version,
    dependencies: plugin.dependencies.map(dep => getDependencyTree(plugins, dep.pluginId)),
  }
}