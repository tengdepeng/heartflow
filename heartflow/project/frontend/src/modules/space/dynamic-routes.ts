// ============================================================
// 心流工坊 · 动态路由配置引擎
// 基于空间模板和编排规则动态注册/注销路由
// 支持路由元数据注入、懒加载、过渡管理、权限守卫
// ============================================================

import { ref, computed } from 'vue'
import type { RouteRecordRaw, Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { getAllRooms, getRoomByPath } from '../../engine/room-graph'
import { storage } from '../../engine/storage'
import type { SpaceCategory } from './space-orchestrator'

// ============================================================
// 类型定义
// ============================================================

/** 路由注册来源 */
export type RouteSource = 'static' | 'dynamic' | 'template' | 'plugin' | 'user'

/** 路由加载策略 */
export type RouteLoadStrategy = 'eager' | 'lazy' | 'preload' | 'idle'

/** 动态路由配置 */
export interface DynamicRouteConfig {
  /** 路由路径 */
  path: string
  /** 路由名称 */
  name: string
  /** 路由来源 */
  source: RouteSource
  /** 加载策略 */
  loadStrategy: RouteLoadStrategy
  /** 空间分类 */
  category?: SpaceCategory
  /** 所属分组 */
  group?: string
  /** 加载优先级 */
  priority: number
  /** 是否启用 */
  enabled: boolean
  /** 组件路径（懒加载用） */
  componentPath?: string
  /** 路由元数据 */
  meta: Record<string, unknown>
  /** 注册时间 */
  registeredAt?: string
  /** 最后访问时间 */
  lastAccessedAt?: string
  /** 访问次数 */
  accessCount: number
  /** 平均加载时间（毫秒） */
  avgLoadTimeMs?: number
}

/** 路由注册事件 */
export interface RouteRegistrationEvent {
  type: 'register' | 'unregister' | 'update' | 'preload'
  routeName: string
  timestamp: string
  source: RouteSource
  success: boolean
  error?: string
}

/** 路由守卫配置 */
export interface RouteGuardConfig {
  /** 守卫名称 */
  name: string
  /** 守卫优先级（数字越小越先执行） */
  priority: number
  /** 守卫函数 */
  guard: (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => void | Promise<void>
  /** 适用路由（空数组表示全部） */
  applyTo?: string[]
  /** 是否启用 */
  enabled: boolean
}

/** 路由统计 */
export interface RouteStats {
  totalRoutes: number
  staticRoutes: number
  dynamicRoutes: number
  templateRoutes: number
  pluginRoutes: number
  userRoutes: number
  activeRoutes: number
  failedRoutes: number
  totalAccesses: number
  avgLoadTimeMs: number
}

/** 路由预加载任务 */
export interface RoutePreloadTask {
  routeName: string
  priority: number
  status: 'pending' | 'loading' | 'done' | 'failed'
  startedAt?: string
  completedAt?: string
  error?: string
}

// ============================================================
// 常量
// ============================================================

const STORAGE_KEYS = {
  dynamicRoutes: 'hf_dynamic_routes',
  routeEvents: 'hf_route_events',
  routeStats: 'hf_route_stats',
} as const

/** 路由加载策略标签 */
export const LOAD_STRATEGY_LABELS: Record<RouteLoadStrategy, string> = {
  eager: '立即加载',
  lazy: '按需加载',
  preload: '预加载',
  idle: '空闲加载',
}

// ============================================================
// 可组合函数
// ============================================================

export function useDynamicRoutes(router?: Router) {
  // ---- 状态 ----
  const dynamicRouteConfigs = ref<Record<string, DynamicRouteConfig>>(
    storage.getKV<Record<string, DynamicRouteConfig>>(STORAGE_KEYS.dynamicRoutes, {}),
  )
  const registrationEvents = ref<RouteRegistrationEvent[]>(
    storage.getKV<RouteRegistrationEvent[]>(STORAGE_KEYS.routeEvents, []),
  )
  const guards = ref<RouteGuardConfig[]>([])
  const preloadQueue = ref<RoutePreloadTask[]>([])
  const isPreloading = ref(false)

  // ---- 初始化 ----

  /** 从 room-graph 初始化静态路由配置 */
  function initializeStaticRoutes(): void {
    const rooms = getAllRooms()
    const merged: Record<string, DynamicRouteConfig> = {}

    for (const room of rooms) {
      const existing = dynamicRouteConfigs.value[room.id]
      if (existing) {
        merged[room.id] = { ...existing }
      } else {
        merged[room.id] = {
          path: room.path,
          name: room.name,
          source: 'static',
          loadStrategy: room.isMainPath || room.group === 'gravity' ? 'eager' : 'lazy',
          category: mapRoomGroupToCategory(room.group),
          priority: room.isMainPath ? 0 : room.group === 'gravity' ? -1 : 50,
          enabled: true,
          meta: {
            roomId: room.id,
            title: room.name,
            icon: room.icon,
            color: room.color,
          },
          accessCount: 0,
        }
      }
    }

    dynamicRouteConfigs.value = merged
    persist()
  }

  function mapRoomGroupToCategory(group: string): SpaceCategory {
    switch (group) {
      case 'gravity': return 'gravity'
      case 'main-path': return 'main-path'
      case 'world': return 'world'
      case 'system': return 'system'
      default: return 'world'
    }
  }

  // ---- 查询 ----

  /** 获取所有路由配置 */
  function getAllRouteConfigs(): DynamicRouteConfig[] {
    return Object.values(dynamicRouteConfigs.value)
  }

  /** 获取指定路由配置 */
  function getRouteConfig(routeName: string): DynamicRouteConfig | undefined {
    return dynamicRouteConfigs.value[routeName]
  }

  /** 按来源分组 */
  const routesBySource = computed<Record<RouteSource, DynamicRouteConfig[]>>(() => {
    const result: Record<string, DynamicRouteConfig[]> = {
      static: [],
      dynamic: [],
      template: [],
      plugin: [],
      user: [],
    }
    for (const config of Object.values(dynamicRouteConfigs.value)) {
      if (!result[config.source]) result[config.source] = []
      result[config.source].push(config)
    }
    return result as Record<RouteSource, DynamicRouteConfig[]>
  })

  /** 按加载策略分组 */
  const routesByStrategy = computed<Record<RouteLoadStrategy, DynamicRouteConfig[]>>(() => {
    const result: Record<string, DynamicRouteConfig[]> = {
      eager: [],
      lazy: [],
      preload: [],
      idle: [],
    }
    for (const config of Object.values(dynamicRouteConfigs.value)) {
      result[config.loadStrategy].push(config)
    }
    return result as Record<RouteLoadStrategy, DynamicRouteConfig[]>
  })

  /** 路由统计 */
  const routeStats = computed<RouteStats>(() => {
    const all = Object.values(dynamicRouteConfigs.value)
    const bySource = (s: RouteSource) => all.filter(c => c.source === s).length

    const totalAccesses = all.reduce((sum, c) => sum + c.accessCount, 0)
    const loadTimes = all.filter(c => c.avgLoadTimeMs !== undefined).map(c => c.avgLoadTimeMs!)
    const avgLoadTimeMs = loadTimes.length > 0
      ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
      : 0

    return {
      totalRoutes: all.length,
      staticRoutes: bySource('static'),
      dynamicRoutes: bySource('dynamic'),
      templateRoutes: bySource('template'),
      pluginRoutes: bySource('plugin'),
      userRoutes: bySource('user'),
      activeRoutes: all.filter(c => c.enabled).length,
      failedRoutes: all.filter(c => !c.enabled && c.registeredAt).length,
      totalAccesses,
      avgLoadTimeMs,
    }
  })

  /** 最近注册事件 */
  const recentEvents = computed<RouteRegistrationEvent[]>(() => {
    return registrationEvents.value.slice(-20).reverse()
  })

  // ---- 动态路由注册 ----

  /** 注册动态路由 */
  function registerRoute(
    path: string,
    name: string,
    component: () => Promise<unknown>,
    options: Partial<Omit<DynamicRouteConfig, 'path' | 'name'>> = {},
  ): DynamicRouteConfig {
    const now = new Date().toISOString()

    const config: DynamicRouteConfig = {
      path,
      name,
      source: options.source ?? 'dynamic',
      loadStrategy: options.loadStrategy ?? 'lazy',
      category: options.category,
      group: options.group,
      priority: options.priority ?? 50,
      enabled: true,
      componentPath: options.componentPath,
      meta: options.meta ?? {},
      registeredAt: now,
      accessCount: 0,
    }

    dynamicRouteConfigs.value[name] = config

    // 注册到 Vue Router
    if (router) {
      try {
        const route: RouteRecordRaw = {
          path,
          name,
          component,
          meta: {
            ...config.meta,
            dynamicSource: config.source,
            dynamicCategory: config.category,
            dynamicPriority: config.priority,
          },
        }
        router.addRoute(route)

        const event: RouteRegistrationEvent = {
          type: 'register',
          routeName: name,
          timestamp: now,
          source: config.source,
          success: true,
        }
        registrationEvents.value.push(event)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const event: RouteRegistrationEvent = {
          type: 'register',
          routeName: name,
          timestamp: now,
          source: config.source,
          success: false,
          error: errorMsg,
        }
        registrationEvents.value.push(event)
        config.enabled = false
      }
    }

    persist()
    return config
  }

  /** 注销动态路由 */
  function unregisterRoute(routeName: string): boolean {
    const config = dynamicRouteConfigs.value[routeName]
    if (!config) return false

    if (router) {
      try {
        router.removeRoute(routeName)

        const event: RouteRegistrationEvent = {
          type: 'unregister',
          routeName,
          timestamp: new Date().toISOString(),
          source: config.source,
          success: true,
        }
        registrationEvents.value.push(event)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const event: RouteRegistrationEvent = {
          type: 'unregister',
          routeName,
          timestamp: new Date().toISOString(),
          source: config.source,
          success: false,
          error: errorMsg,
        }
        registrationEvents.value.push(event)
        return false
      }
    }

    delete dynamicRouteConfigs.value[routeName]
    persist()
    return true
  }

  /** 批量注册（从模板） */
  function registerFromTemplate(
    templateId: string,
    routeConfigs: Array<{ path: string; name: string; component: () => Promise<unknown> }>,
  ): { success: number; failed: number } {
    let success = 0
    let failed = 0

    for (const rc of routeConfigs) {
      try {
        registerRoute(rc.path, rc.name, rc.component, {
          source: 'template',
          group: templateId,
        })
        success++
      } catch {
        failed++
      }
    }

    return { success, failed }
  }

  /** 批量注销（从模板） */
  function unregisterFromTemplate(templateId: string): number {
    let count = 0
    for (const [name, config] of Object.entries(dynamicRouteConfigs.value)) {
      if (config.source === 'template' && config.group === templateId) {
        if (unregisterRoute(name)) count++
      }
    }
    return count
  }

  // ---- 路由更新 ----

  /** 更新路由配置 */
  function updateRouteConfig(routeName: string, updates: Partial<DynamicRouteConfig>): DynamicRouteConfig | null {
    const config = dynamicRouteConfigs.value[routeName]
    if (!config) return null

    Object.assign(config, updates)

    const event: RouteRegistrationEvent = {
      type: 'update',
      routeName,
      timestamp: new Date().toISOString(),
      source: config.source,
      success: true,
    }
    registrationEvents.value.push(event)

    persist()
    return config
  }

  /** 启用路由 */
  function enableRoute(routeName: string): boolean {
    const config = dynamicRouteConfigs.value[routeName]
    if (!config) return false
    config.enabled = true
    persist()
    return true
  }

  /** 禁用路由 */
  function disableRoute(routeName: string): boolean {
    const config = dynamicRouteConfigs.value[routeName]
    if (!config) return false
    config.enabled = false
    persist()
    return true
  }

  /** 设置加载策略 */
  function setLoadStrategy(routeName: string, strategy: RouteLoadStrategy): void {
    updateRouteConfig(routeName, { loadStrategy: strategy })
  }

  /** 记录访问 */
  function recordAccess(routeName: string, loadTimeMs?: number): void {
    const config = dynamicRouteConfigs.value[routeName]
    if (!config) return

    config.accessCount++
    config.lastAccessedAt = new Date().toISOString()

    if (loadTimeMs !== undefined) {
      if (config.avgLoadTimeMs === undefined) {
        config.avgLoadTimeMs = loadTimeMs
      } else {
        // 指数移动平均
        config.avgLoadTimeMs = config.avgLoadTimeMs * 0.8 + loadTimeMs * 0.2
      }
    }

    persist()
  }

  // ---- 路由守卫 ----

  /** 注册路由守卫 */
  function registerGuard(guardConfig: RouteGuardConfig): void {
    const existing = guards.value.findIndex(g => g.name === guardConfig.name)
    if (existing !== -1) {
      guards.value[existing] = guardConfig
    } else {
      guards.value.push(guardConfig)
    }

    // 按优先级排序
    guards.value.sort((a, b) => a.priority - b.priority)

    if (router) {
      router.beforeEach(async (to, from, next) => {
        for (const guard of guards.value) {
          if (!guard.enabled) continue
          if (guard.applyTo && guard.applyTo.length > 0 && !guard.applyTo.includes(to.name as string)) continue

          try {
            await guard.guard(to, from, next)
          } catch {
            // 守卫出错时放行
            next()
          }
        }
        next()
      })
    }
  }

  /** 注销路由守卫 */
  function unregisterGuard(guardName: string): boolean {
    const idx = guards.value.findIndex(g => g.name === guardName)
    if (idx === -1) return false
    guards.value.splice(idx, 1)
    return true
  }

  /** 获取所有守卫 */
  function getAllGuards(): RouteGuardConfig[] {
    return guards.value
  }

  // ---- 预加载 ----

  /** 获取预加载顺序 */
  function getPreloadOrder(): RoutePreloadTask[] {
    const tasks: RoutePreloadTask[] = []

    for (const config of Object.values(dynamicRouteConfigs.value)) {
      if (config.loadStrategy === 'preload' || config.loadStrategy === 'eager') {
        tasks.push({
          routeName: config.name,
          priority: config.priority,
          status: 'pending',
        })
      }
    }

    return tasks.sort((a, b) => a.priority - b.priority)
  }

  /** 执行预加载 */
  async function preloadRoutes(): Promise<{ success: number; failed: number }> {
    if (isPreloading.value) return { success: 0, failed: 0 }

    isPreloading.value = true
    preloadQueue.value = getPreloadOrder()
    let success = 0
    let failed = 0

    for (const task of preloadQueue.value) {
      task.status = 'loading'
      task.startedAt = new Date().toISOString()

      try {
        const config = dynamicRouteConfigs.value[task.routeName]
        if (config?.componentPath) {
          // 触发懒加载组件的预加载
          await import(/* @vite-ignore */ config.componentPath)
        }
        task.status = 'done'
        task.completedAt = new Date().toISOString()
        success++

        const event: RouteRegistrationEvent = {
          type: 'preload',
          routeName: task.routeName,
          timestamp: task.completedAt,
          source: config?.source ?? 'static',
          success: true,
        }
        registrationEvents.value.push(event)
      } catch (err) {
        task.status = 'failed'
        task.error = err instanceof Error ? err.message : String(err)
        failed++
      }
    }

    isPreloading.value = false
    persist()
    return { success, failed }
  }

  /** 空闲时预加载 */
  function preloadOnIdle(): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        preloadRoutes()
      }, { timeout: 2000 })
    } else {
      setTimeout(() => {
        preloadRoutes()
      }, 100)
    }
  }

  // ---- 路由验证 ----

  /** 验证路由完整性 */
  function validateRoutes(): { valid: boolean; issues: Array<{ routeName: string; issue: string }> } {
    const issues: Array<{ routeName: string; issue: string }> = []

    for (const config of Object.values(dynamicRouteConfigs.value)) {
      if (!config.enabled) continue

      // 检查路径格式
      if (!config.path.startsWith('/')) {
        issues.push({ routeName: config.name, issue: '路径必须以 / 开头' })
      }

      // 检查静态路由是否存在于 room-graph
      if (config.source === 'static') {
        const room = getRoomByPath(config.path)
        if (!room) {
          issues.push({ routeName: config.name, issue: `路径 ${config.path} 在 room-graph 中不存在` })
        }
      }
    }

    return { valid: issues.length === 0, issues }
  }

  /** 获取所有路由路径（用于调试） */
  function getAllPaths(): string[] {
    return Object.values(dynamicRouteConfigs.value)
      .filter(c => c.enabled)
      .map(c => c.path)
  }

  // ---- 路由分析 ----

  /** 获取热度最高的路由 */
  function getHotRoutes(limit = 10): DynamicRouteConfig[] {
    return Object.values(dynamicRouteConfigs.value)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
  }

  /** 获取最近访问的路由 */
  function getRecentRoutes(limit = 10): DynamicRouteConfig[] {
    return Object.values(dynamicRouteConfigs.value)
      .filter(c => c.lastAccessedAt)
      .sort((a, b) => new Date(b.lastAccessedAt!).getTime() - new Date(a.lastAccessedAt!).getTime())
      .slice(0, limit)
  }

  /** 获取加载最慢的路由 */
  function getSlowestRoutes(limit = 10): DynamicRouteConfig[] {
    return Object.values(dynamicRouteConfigs.value)
      .filter(c => c.avgLoadTimeMs !== undefined)
      .sort((a, b) => (b.avgLoadTimeMs ?? 0) - (a.avgLoadTimeMs ?? 0))
      .slice(0, limit)
  }

  // ---- 重置 ----

  function reset(): void {
    dynamicRouteConfigs.value = {}
    registrationEvents.value = []
    guards.value = []
    preloadQueue.value = []
    initializeStaticRoutes()
    persist()
  }

  // ---- 持久化 ----

  function persist(): void {
    storage.setKV(STORAGE_KEYS.dynamicRoutes, dynamicRouteConfigs.value)
    storage.setKV(STORAGE_KEYS.routeEvents, registrationEvents.value)
  }

  // ---- 初始化 ----
  if (Object.keys(dynamicRouteConfigs.value).length === 0) {
    initializeStaticRoutes()
  }

  return {
    // 状态
    dynamicRouteConfigs,
    registrationEvents,
    guards,
    preloadQueue,
    isPreloading,

    // 计算属性
    routesBySource,
    routesByStrategy,
    routeStats,
    recentEvents,

    // 查询
    getAllRouteConfigs,
    getRouteConfig,

    // 注册/注销
    registerRoute,
    unregisterRoute,
    registerFromTemplate,
    unregisterFromTemplate,

    // 更新
    updateRouteConfig,
    enableRoute,
    disableRoute,
    setLoadStrategy,
    recordAccess,

    // 守卫
    registerGuard,
    unregisterGuard,
    getAllGuards,

    // 预加载
    getPreloadOrder,
    preloadRoutes,
    preloadOnIdle,

    // 验证
    validateRoutes,
    getAllPaths,

    // 分析
    getHotRoutes,
    getRecentRoutes,
    getSlowestRoutes,

    // 管理
    initializeStaticRoutes,
    reset,
    persist,
  }
}