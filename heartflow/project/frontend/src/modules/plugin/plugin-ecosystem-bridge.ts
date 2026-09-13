// ============================================================
// 插件生态层 · 视图桥接层（P22）
// 聚合插件管理、沙箱、调度器、市场，提供统一视图
// 计算属性：pluginOverview / pluginList / pluginCategories
//           sandboxStatus / schedulerStatus / marketplaceOverview
//           permissionSummary / recommendations
// 操作入口：enablePlugin / disablePlugin / loadPlugin / unloadPlugin
//           getPluginDetails / getViolations / refreshAll
// ============================================================

import { computed, ref } from 'vue'
import { usePluginManager } from './index'
import { usePluginMarketplace } from './plugin-marketplace'
import { usePluginScheduler } from './plugin-scheduler'
import {
  sandboxIsolator,
  runtimeGuard,
  DEFAULT_GUARD_CONFIG,
} from './sandbox'
import type { PluginPermission, PluginTier } from './types'
import { CORE_PLUGINS } from './types'
import type {
  ScheduleStats,
} from './plugin-scheduler'
import type {
  MarketplaceStats,
} from './plugin-marketplace'
import type {
  SandboxTier,
  ViolationRecord,
  DowngradeRecord,
  GuardState,
} from './sandbox'

// ============================================================
// 类型定义
// ============================================================

/** 插件生态概览 */
export interface PluginEcosystemOverview {
  /** 插件总数 */
  totalPlugins: number
  /** 已启用数 */
  enabledPlugins: number
  /** 已加载数 */
  loadedPlugins: number
  /** 核心插件数 */
  corePlugins: number
  /** 社区插件数 */
  communityPlugins: number
  /** 实验性插件数 */
  experimentalPlugins: number
  /** 按分类统计 */
  categoryCounts: Record<string, number>
  /** 按分级统计 */
  tierCounts: Record<PluginTier, number>
  /** 系统健康状态 */
  healthStatus: 'healthy' | 'warning' | 'critical'
  /** 健康评分 0-100 */
  healthScore: number
}

/** 桥接层插件项（增强版运行时） */
export interface PluginBridgeItem {
  /** 插件 ID */
  id: string
  /** 插件名称 */
  name: string
  /** 版本 */
  version: string
  /** 分类 */
  category: string
  /** 分级 */
  tier: PluginTier
  /** 图标 */
  icon: string
  /** 描述 */
  description: string
  /** 是否启用 */
  enabled: boolean
  /** 是否已加载 */
  loaded: boolean
  /** 加载错误 */
  loadError?: string
  /** 是否核心插件 */
  isCore: boolean
  /** 权限列表 */
  permissions: PluginPermission[]
  /** 沙箱隔离状态 */
  sandbox: {
    isolateFS: boolean
    isolateNetwork: boolean
    isolateDOM: boolean
  }
  /** 安装时间 */
  installedAt: string
  /** 沙箱安全等级 */
  sandboxTier?: SandboxTier
  /** 沙箱违规次数 */
  violationCount: number
  /** 调度任务数 */
  taskCount: number
}

/** 沙箱桥接状态 */
export interface SandboxBridgeStatus {
  /** 总沙箱数 */
  totalSandboxes: number
  /** 活跃沙箱数 */
  activeSandboxes: number
  /** 已隔离计数 */
  isolatedCount: number
  /** 守卫运行状态 */
  guardRunning: boolean
  /** 守卫违规数 */
  guardViolations: number
  /** 按等级分布 */
  tierDistribution: Record<SandboxTier, number>
  /** 降级记录数 */
  downgradeCount: number
  /** 违规记录（最近） */
  recentViolations: ViolationRecord[]
  /** 守卫配置 */
  guardConfig: {
    memoryWarningThreshold: number
    storageWarningThreshold: number
    autoDowngrade: boolean
    violationThreshold: number
  }
}

/** 插件生态建议 */
export interface PluginRecommendation {
  type: 'security' | 'performance' | 'maintenance' | 'discovery' | 'usage'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: string
  targetPluginId?: string
}

// ============================================================
// 辅助函数
// ============================================================

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    timer: '计时',
    note: '笔记',
    emotion: '情绪',
    health: '健康',
    knowledge: '知识',
    visual: '视觉',
    automation: '自动化',
    other: '其他',
  }
  return labels[category] ?? category
}

function getPermissionLabel(permission: PluginPermission): string {
  const labels: Record<PluginPermission, string> = {
    'read:current': '读取当前上下文',
    'read:history': '读取历史数据',
    'write:data': '写入数据',
    'export:data': '导出数据',
    'network': '网络访问',
    'filesystem': '文件系统访问',
    'read_sessions': '读取会话数据',
    'read_notes': '读取笔记数据',
  }
  return labels[permission] ?? permission
}

/** 检测插件 ID 是否为核心插件 */
function isCorePlugin(id: string): boolean {
  return CORE_PLUGINS.some(p => p.meta.id === id)
}

// ============================================================
// usePluginEcosystemBridge
// ============================================================

export function usePluginEcosystemBridge() {
  // ---- 子模块 ----
  const manager = usePluginManager()
  const marketplace = usePluginMarketplace()
  const scheduler = usePluginScheduler()

  // 初始化
  manager.init()

  // ---- 活跃状态 ----
  const activePluginId = ref<string | null>(null)

  // ============================================================
  // 计算属性
  // ============================================================

  // ---- 1. pluginOverview - 插件生态概览 ----
  const pluginOverview = computed<PluginEcosystemOverview>(() => {
    const all = manager.getAll()
    const enabled = all.filter(r => r.enabled)
    const loaded = all.filter(r => r.loaded)
    const core = all.filter(r => isCorePlugin(r.id))
    const community = all.filter(r => r.manifest.meta.tier === 'community')
    const experimental = all.filter(r => r.manifest.meta.tier === 'experimental')

    // 分类统计
    const categoryCounts: Record<string, number> = {}
    for (const r of all) {
      const cat = r.manifest.meta.category
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }

    // 分级统计
    const tierCounts: Record<PluginTier, number> = {
      official: 0,
      community: 0,
      experimental: 0,
    }
    for (const r of all) {
      tierCounts[r.manifest.meta.tier]++
    }

    // 健康评分
    const loadedRatio = all.length > 0 ? loaded.length / all.length : 0
    const enabledRatio = all.length > 0 ? enabled.length / all.length : 0
    const guardState = runtimeGuard.getState()
    const violationCount = guardState.violationHistory.length
    const violationPenalty = Math.min(30, violationCount * 3)

    const healthScore = Math.min(100, Math.max(0, Math.round(
      (loadedRatio * 40) + (enabledRatio * 30) + (50 - violationPenalty)
    )))

    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (healthScore < 30) healthStatus = 'critical'
    else if (healthScore < 60) healthStatus = 'warning'

    return {
      totalPlugins: all.length,
      enabledPlugins: enabled.length,
      loadedPlugins: loaded.length,
      corePlugins: core.length,
      communityPlugins: community.length,
      experimentalPlugins: experimental.length,
      categoryCounts,
      tierCounts,
      healthStatus,
      healthScore,
    }
  })

  // ---- 2. pluginList - 所有插件列表（含运行时状态） ----
  const pluginList = computed<PluginBridgeItem[]>(() => {
    const all = manager.getAll()
    const sandboxes = sandboxIsolator.getAllSandboxes()

    return all.map(r => {
      const sandbox = sandboxes.find(s => s.pluginId === r.id)
      const guardStatus = sandbox
        ? runtimeGuard.getSandboxGuardStatus(sandbox.id)
        : { violationCount: 0, downgradeCount: 0, anomalies: [], active: false }
      const pluginTasks = scheduler.getTasksByPlugin(r.id)

      return {
        id: r.id,
        name: r.name,
        version: r.version,
        category: r.manifest.meta.category,
        tier: r.manifest.meta.tier,
        icon: r.manifest.meta.icon,
        description: r.manifest.meta.description,
        enabled: r.enabled,
        loaded: r.loaded,
        loadError: r.loadError,
        isCore: isCorePlugin(r.id),
        permissions: r.manifest.permissions,
        sandbox: { ...r.sandbox },
        installedAt: r.installedAt,
        sandboxTier: sandbox?.tier,
        violationCount: guardStatus.violationCount,
        taskCount: pluginTasks.length,
      }
    })
  })

  // ---- 3. pluginCategories - 按分类分组 ----
  const pluginCategories = computed(() => {
    const groups: Record<string, PluginBridgeItem[]> = {}
    for (const item of pluginList.value) {
      const cat = item.category
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    }
    return groups
  })

  /** 分类列表（含标签和计数） */
  const categoryList = computed(() => {
    return Object.entries(pluginCategories.value).map(([cat, items]) => ({
      category: cat,
      label: getCategoryLabel(cat),
      count: items.length,
      enabledCount: items.filter(i => i.enabled).length,
      loadedCount: items.filter(i => i.loaded).length,
      items,
    }))
  })

  // ---- 4. sandboxStatus - 沙箱状态 ----
  const sandboxStatus = computed<SandboxBridgeStatus>(() => {
    const sandboxes = sandboxIsolator.getAllSandboxes()
    const guardState = runtimeGuard.getState()

    // 按等级分布
    const tierDistribution: Record<SandboxTier, number> = {
      L0: 0,
      L1: 0,
      L2: 0,
    }
    for (const s of sandboxes) {
      tierDistribution[s.tier]++
    }

    // 已隔离计数（有沙箱且活跃的）
    const isolatedCount = sandboxes.filter(s => s.active).length

    return {
      totalSandboxes: sandboxes.length,
      activeSandboxes: sandboxes.filter(s => s.active).length,
      isolatedCount,
      guardRunning: guardState.running,
      guardViolations: guardState.violationHistory.length,
      tierDistribution,
      downgradeCount: guardState.downgradeHistory.length,
      recentViolations: guardState.violationHistory.slice(-20),
      guardConfig: {
        memoryWarningThreshold: DEFAULT_GUARD_CONFIG.memoryWarningThreshold,
        storageWarningThreshold: DEFAULT_GUARD_CONFIG.storageWarningThreshold,
        autoDowngrade: DEFAULT_GUARD_CONFIG.autoDowngrade,
        violationThreshold: DEFAULT_GUARD_CONFIG.violationThreshold,
      },
    }
  })

  // ---- 5. schedulerStatus - 调度器状态 ----
  const schedulerStatus = computed<ScheduleStats>(() => {
    return scheduler.stats.value
  })

  /** 调度器运行状态详情 */
  const schedulerDetails = computed(() => {
    return {
      stats: scheduler.stats.value,
      isRunning: scheduler.isRunning.value,
      config: scheduler.config.value,
      blockedTasks: scheduler.blockedTasks.value,
      readyTasks: scheduler.readyTasks.value,
      sortedPendingTasks: scheduler.sortedPendingTasks.value,
      failedTasks: scheduler.failedTasks.value,
    }
  })

  // ---- 6. marketplaceOverview - 市场概览 ----
  const marketplaceOverview = computed<MarketplaceStats | null>(() => {
    const all = manager.getAll()
    if (all.length === 0) return null
    return marketplace.generateMarketStats(all.map(r => r.manifest))
  })

  /** 市场健康度 */
  const marketplaceHealth = computed(() => {
    const overview = marketplaceOverview.value
    if (!overview) return { status: 'inactive' as const, message: '市场数据不可用' }

    const updateRatio = overview.totalPlugins > 0
      ? overview.availableUpdates / overview.totalPlugins
      : 0

    return {
      status: updateRatio > 0.3
        ? ('needs_attention' as const)
        : ('healthy' as const),
      message: updateRatio > 0.3
        ? `有 ${overview.availableUpdates} 个可用更新，建议检查`
        : '市场状态正常',
      availableUpdates: overview.availableUpdates,
      pendingUpdateCount: marketplace.pendingUpdateCount.value,
    }
  })

  // ---- 7. permissionSummary - 权限使用摘要 ----
  const permissionSummary = computed(() => {
    const all = manager.getAll()
    const usage: Record<string, { count: number; pluginIds: string[]; label: string }> = {}

    for (const r of all) {
      for (const perm of r.manifest.permissions) {
        if (!usage[perm]) {
          usage[perm] = { count: 0, pluginIds: [], label: getPermissionLabel(perm) }
        }
        usage[perm].count++
        usage[perm].pluginIds.push(r.id)
      }
    }

    // 按风险排序
    const highRiskPermissions: PluginPermission[] = ['network', 'filesystem', 'export:data']
    const mediumRiskPermissions: PluginPermission[] = ['write:data', 'read:history', 'read_sessions', 'read_notes']

    function getRiskLevel(perm: string): 'high' | 'medium' | 'low' {
      if (highRiskPermissions.includes(perm as PluginPermission)) return 'high'
      if (mediumRiskPermissions.includes(perm as PluginPermission)) return 'medium'
      return 'low'
    }

    const entries = Object.entries(usage).map(([perm, data]) => ({
      permission: perm,
      ...data,
      riskLevel: getRiskLevel(perm),
    }))

    return {
      permissions: entries.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 }
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      }),
      totalPermissionGrants: entries.reduce((sum, e) => sum + e.count, 0),
      highRiskCount: entries.filter(e => e.riskLevel === 'high').length,
      mediumRiskCount: entries.filter(e => e.riskLevel === 'medium').length,
      lowRiskCount: entries.filter(e => e.riskLevel === 'low').length,
    }
  })

  // ---- 8. recommendations - 插件生态建议 ----
  const recommendations = computed<PluginRecommendation[]>(() => {
    const recs: PluginRecommendation[] = []
    const overview = pluginOverview.value
    const sandbox = sandboxStatus.value
    const permSum = permissionSummary.value

    // === 安全建议 ===

    // 高权限插件过多
    if (permSum.highRiskCount > 3) {
      recs.push({
        type: 'security',
        priority: 'high',
        title: '高权限插件数量较多',
        description: `当前有 ${permSum.highRiskCount} 项高风险权限在使用中，建议审查不必要的权限`,
        action: '审查高风险权限配置',
      })
    }

    // 守卫违规过多
    if (sandbox.guardViolations > 10) {
      recs.push({
        type: 'security',
        priority: 'high',
        title: '沙箱违规次数较多',
        description: `守卫检测到 ${sandbox.guardViolations} 次违规，建议检查沙箱日志`,
        action: '查看违规详情',
      })
    }

    // 降级记录
    if (sandbox.downgradeCount > 0) {
      recs.push({
        type: 'security',
        priority: 'medium',
        title: '存在沙箱降级记录',
        description: `共 ${sandbox.downgradeCount} 次降级，部分插件可能行为异常`,
        action: '检查降级记录',
      })
    }

    // === 性能建议 ===

    // 加载率低
    if (overview.totalPlugins > 0 && overview.loadedPlugins / overview.totalPlugins < 0.5) {
      recs.push({
        type: 'performance',
        priority: 'medium',
        title: '插件加载率偏低',
        description: `${overview.loadedPlugins}/${overview.totalPlugins} 个插件已加载，未使用的插件可考虑卸载`,
        action: '清理未使用的插件',
      })
    }

    // 调度任务积压
    const schedStats = schedulerStatus.value
    if (schedStats.pendingTasks > 20) {
      recs.push({
        type: 'performance',
        priority: 'medium',
        title: '调度任务积压',
        description: `当前有 ${schedStats.pendingTasks} 个待处理调度任务`,
        action: '检查调度器状态',
      })
    }

    // 调度失败率高
    if (schedStats.totalTasks > 0 && schedStats.successRate < 50) {
      recs.push({
        type: 'performance',
        priority: 'high',
        title: '调度任务成功率低',
        description: `成功率仅 ${schedStats.successRate}%，${schedStats.failedTasks} 个任务失败`,
        action: '检查失败任务并重试',
      })
    }

    // === 维护建议 ===

    // 有可用更新
    const mktHealth = marketplaceHealth.value
    if (mktHealth.status === 'needs_attention') {
      recs.push({
        type: 'maintenance',
        priority: 'medium',
        title: '有可用插件更新',
        description: mktHealth.message,
        action: '查看可用更新',
      })
    }

    // 实验性插件
    if (overview.experimentalPlugins > 0) {
      recs.push({
        type: 'maintenance',
        priority: 'low',
        title: '存在实验性插件',
        description: `当前有 ${overview.experimentalPlugins} 个实验性插件，可能不稳定`,
        action: '关注实验性插件行为',
      })
    }

    // === 发现建议 ===

    // 分类覆盖
    const commonCategories = ['timer', 'note', 'emotion', 'health', 'knowledge', 'visual']
    const missingCategories = commonCategories.filter(cat => !overview.categoryCounts[cat])
    if (missingCategories.length > 0) {
      recs.push({
        type: 'discovery',
        priority: 'low',
        title: '发现未覆盖的插件分类',
        description: `以下分类暂无插件: ${missingCategories.map(c => getCategoryLabel(c)).join('、')}`,
        action: '浏览插件市场',
      })
    }

    // === 使用建议 ===

    if (overview.totalPlugins === 0) {
      recs.push({
        type: 'usage',
        priority: 'high',
        title: '尚未安装任何插件',
        description: '插件系统已就绪，初始化核心插件以开始使用',
        action: '初始化插件系统',
      })
    }

    // 有关闭的插件
    const disabledCount = overview.totalPlugins - overview.enabledPlugins
    if (disabledCount > 0 && overview.totalPlugins > 0) {
      recs.push({
        type: 'usage',
        priority: 'low',
        title: '有关闭的插件',
        description: `${disabledCount} 个插件处于关闭状态，如不再需要可考虑移除`,
        action: '管理插件状态',
      })
    }

    return recs.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ============================================================
  // 操作入口
  // ============================================================

  /** 启用插件 */
  function enablePlugin(id: string): boolean {
    const result = manager.toggle(id)
    return result === true
  }

  /** 禁用插件 */
  function disablePlugin(id: string): boolean {
    const rt = manager.get(id)
    if (!rt || !rt.enabled) return false
    manager.toggle(id)
    return true
  }

  /** 加载插件 */
  function loadPlugin(id: string): boolean {
    return manager.load(id)
  }

  /** 卸载插件 */
  function unloadPlugin(id: string): void {
    manager.unload(id)
  }

  /** 获取插件详情 */
  function getPluginDetails(id: string): PluginBridgeItem | null {
    activePluginId.value = id
    return pluginList.value.find(p => p.id === id) ?? null
  }

  /** 获取违规记录 */
  function getViolations(): {
    violationHistory: ViolationRecord[]
    downgradeHistory: DowngradeRecord[]
    guardState: GuardState
  } {
    const guardState = runtimeGuard.getState()
    return {
      violationHistory: guardState.violationHistory,
      downgradeHistory: guardState.downgradeHistory,
      guardState,
    }
  }

  /** 获取指定插件的违规记录 */
  function getPluginViolations(pluginId: string): ViolationRecord[] {
    const guardState = runtimeGuard.getState()
    return guardState.violationHistory.filter(
      v => v.violation.pluginId === pluginId
    )
  }

  /** 刷新所有 */
  function refreshAll(): void {
    // 重新初始化插件管理器
    manager.init()

    // 重启沙箱守卫
    runtimeGuard.stop()
    runtimeGuard.start()

    // 同步已安装插件到市场
    const all = manager.getAll()
    for (const r of all) {
      marketplace.registerInstalled(r.id, r.version)
    }
  }

  /** 检查所有插件权限 */
  function checkAllPermissions(): { pluginId: string; granted: PluginPermission[]; denied: PluginPermission[] }[] {
    const results: { pluginId: string; granted: PluginPermission[]; denied: PluginPermission[] }[] = []
    const all = manager.getAll()

    for (const r of all) {
      const granted: PluginPermission[] = []
      const denied: PluginPermission[] = []

      for (const perm of r.manifest.permissions) {
        if (manager.hasPermission(r.id, perm)) {
          granted.push(perm)
        } else {
          denied.push(perm)
        }
      }

      results.push({ pluginId: r.id, granted, denied })
    }

    return results
  }

  /** 按分级筛选插件 */
  function getPluginsByTier(tier: PluginTier): PluginBridgeItem[] {
    return pluginList.value.filter(p => p.tier === tier)
  }

  /** 按分类筛选插件 */
  function getPluginsByCategory(category: string): PluginBridgeItem[] {
    return pluginList.value.filter(p => p.category === category)
  }

  /** 获取核心插件 */
  function getCorePlugins(): PluginBridgeItem[] {
    return pluginList.value.filter(p => p.isCore)
  }

  /** 获取当前激活的插件 */
  function getActivePlugin(): PluginBridgeItem | null {
    if (!activePluginId.value) return null
    return pluginList.value.find(p => p.id === activePluginId.value) ?? null
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    activePluginId,

    // 计算属性：概览
    pluginOverview,
    pluginList,
    pluginCategories,
    categoryList,
    sandboxStatus,
    schedulerStatus,
    schedulerDetails,
    marketplaceOverview,
    marketplaceHealth,
    permissionSummary,
    recommendations,

    // 子模块直通
    manager,
    marketplace,
    scheduler,

    // 沙箱直通
    sandboxIsolator,
    runtimeGuard,

    // 操作入口
    enablePlugin,
    disablePlugin,
    loadPlugin,
    unloadPlugin,
    getPluginDetails,
    getViolations,
    getPluginViolations,
    refreshAll,
    checkAllPermissions,

    // 筛选
    getPluginsByTier,
    getPluginsByCategory,
    getCorePlugins,
    getActivePlugin,
  }
}