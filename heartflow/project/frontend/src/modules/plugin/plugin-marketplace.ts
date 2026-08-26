// ============================================================
// 插件管理器 · 市场与依赖管理增强
// 依赖解析、市场评分、更新管理
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

/** 插件评分 */
export interface PluginRating {
  pluginId: string
  /** 平均评分 1-5 */
  averageRating: number
  /** 评分人数 */
  ratingCount: number
  /** 各星级分布 */
  distribution: { stars: number; count: number }[]
  /** 用户评论 */
  reviews: PluginReview[]
}

/** 用户评论 */
export interface PluginReview {
  id: string
  pluginId: string
  userId: string
  rating: number
  title: string
  content: string
  /** 有用投票 */
  helpfulCount: number
  createdAt: string
  updatedAt?: string
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
  /** 热门插件 */
  popularPlugins: string[]
  /** 分类统计 */
  categoryStats: { category: string; count: number }[]
  /** 总下载量 */
  totalDownloads: number
  /** 平均评分 */
  averageRating: number
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
const PLUGIN_RATINGS_KEY = 'hf:plugin:ratings'
const PLUGIN_UPDATES_KEY = 'hf:plugin:updates'
const PLUGIN_POLICY_KEY = 'hf:plugin:policy'

// ============================================================
// 插件市场与依赖管理引擎
// ============================================================

export function usePluginMarketplace() {
  // ---- 状态 ----
  const ratings = ref<Map<string, PluginRating>>(new Map(loadRatings()))
  const updates = ref<PluginUpdate[]>(loadUpdates())
  const updatePolicy = ref<UpdatePolicy>(loadPolicy())
  const installedPlugins = ref<Map<string, string>>(new Map()) // pluginId -> version

  // ---- 持久化 ----

  function loadRatings(): [string, PluginRating][] {
    try {
      const raw = storage.getKV<string>(PLUGIN_RATINGS_KEY, '[]')
      return JSON.parse(raw).map((r: PluginRating) => [r.pluginId, r] as [string, PluginRating])
    } catch { return [] }
  }

  function saveRatings() {
    storage.setKV(PLUGIN_RATINGS_KEY, JSON.stringify([...ratings.value.values()]))
  }

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

  // ---- 依赖解析 ----

  /** 解析依赖图 */
  function resolveDependencies(
    plugins: { id: string; version: string; dependencies: PluginDependency[] }[],
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
          if (!dep.optional) {
            missing.push(dep)
          }
          continue
        }
        // 检查版本
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

  /** 获取依赖树 */
  function getDependencyTree(
    plugins: { id: string; version: string; dependencies: PluginDependency[] }[],
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

  // ---- 评分系统 ----

  /** 添加评分 */
  function addRating(
    pluginId: string,
    userId: string,
    rating: number,
    title: string,
    content: string,
  ): PluginRating {
    let pluginRating = ratings.value.get(pluginId)
    if (!pluginRating) {
      pluginRating = {
        pluginId,
        averageRating: 0,
        ratingCount: 0,
        distribution: [1, 2, 3, 4, 5].map(stars => ({ stars, count: 0 })),
        reviews: [],
      }
    }

    // 检查是否已有评分
    const existingReview = pluginRating.reviews.find(r => r.userId === userId)
    const review: PluginReview = {
      id: existingReview?.id ?? `review_${Date.now()}`,
      pluginId,
      userId,
      rating,
      title,
      content,
      helpfulCount: existingReview?.helpfulCount ?? 0,
      createdAt: existingReview?.createdAt ?? new Date().toISOString(),
      updatedAt: existingReview ? new Date().toISOString() : undefined,
    }

    if (existingReview) {
      // 更新旧评分
      const oldRating = existingReview.rating
      const distEntry = pluginRating.distribution.find(d => d.stars === oldRating)
      if (distEntry) distEntry.count--
      const idx = pluginRating.reviews.indexOf(existingReview)
      pluginRating.reviews[idx] = review
    } else {
      pluginRating.reviews.push(review)
      pluginRating.ratingCount++
    }

    // 更新分布
    const newDistEntry = pluginRating.distribution.find(d => d.stars === rating)
    if (newDistEntry) newDistEntry.count++

    // 重新计算平均分
    const totalStars = pluginRating.reviews.reduce((s, r) => s + r.rating, 0)
    pluginRating.averageRating = Math.round((totalStars / pluginRating.reviews.length) * 10) / 10

    ratings.value.set(pluginId, pluginRating)
    saveRatings()
    return pluginRating
  }

  /** 获取插件评分 */
  function getRating(pluginId: string): PluginRating | undefined {
    return ratings.value.get(pluginId)
  }

  /** 标记评论有用 */
  function markReviewHelpful(pluginId: string, reviewId: string): void {
    const rating = ratings.value.get(pluginId)
    if (!rating) return
    const review = rating.reviews.find(r => r.id === reviewId)
    if (review) {
      review.helpfulCount++
      saveRatings()
    }
  }

  /** 热门插件 */
  const topRatedPlugins = computed(() => {
    return [...ratings.value.values()]
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10)
      .map(r => r.pluginId)
  })

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

    const allRatings = [...ratings.value.values()]
    const avgRating = allRatings.length > 0
      ? Math.round(allRatings.reduce((s, r) => s + r.averageRating, 0) / allRatings.length * 10) / 10
      : 0

    return {
      totalPlugins: plugins.length,
      installedCount: installedPlugins.value.size,
      availableUpdates: availableUpdates.value.length,
      popularPlugins: topRatedPlugins.value,
      categoryStats: [...categories.entries()].map(([category, count]) => ({ category, count })),
      totalDownloads: 0,
      averageRating: avgRating,
    }
  }

  /** 注册已安装插件 */
  function registerInstalled(pluginId: string, version: string): void {
    installedPlugins.value.set(pluginId, version)
  }

  return {
    // 状态
    ratings,
    updates,
    updatePolicy,
    installedPlugins,

    // 计算属性
    topRatedPlugins,
    availableUpdates,
    pendingUpdateCount,

    // 依赖
    resolveDependencies,
    getDependencyTree,

    // 评分
    addRating,
    getRating,
    markReviewHelpful,

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