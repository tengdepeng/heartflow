// ============================================================
// 心流工坊 · 空间编排引擎
// 统一管理所有功能空间的编排逻辑
// 包括：依赖关系、启动顺序、空间分组、状态机、生命周期
// ============================================================

import { ref, computed } from 'vue'
import { getAllRooms, getRoom, type RoomNode, type RoomGroup } from '../../engine/room-graph'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 空间状态 */
export type SpaceStatus = 'idle' | 'loading' | 'active' | 'inactive' | 'error' | 'hidden' | 'maintenance'

/** 空间分类 */
export type SpaceCategory =
  | 'gravity'     // 引力场核心
  | 'main-path'   // 主链路
  | 'work'        // 工作类
  | 'world'       // 世界类
  | 'system'      // 系统类
  | 'tool'        // 工具类
  | 'supplement'  // 补充类

/** 空间依赖关系 */
export interface SpaceDependency {
  /** 依赖的空间 ID */
  spaceId: string
  /** 依赖类型 */
  type: 'required' | 'optional' | 'recommended'
  /** 依赖说明 */
  description: string
}

/** 空间生命周期钩子 */
export interface SpaceLifecycleHooks {
  onBeforeEnter?: () => Promise<void> | void
  onAfterEnter?: () => Promise<void> | void
  onBeforeLeave?: () => Promise<void> | void
  onAfterLeave?: () => Promise<void> | void
  onActivate?: () => Promise<void> | void
  onDeactivate?: () => Promise<void> | void
  onError?: (error: Error) => void
}

/** 空间编排配置 */
export interface SpaceOrchestrationConfig {
  /** 空间ID */
  spaceId: string
  /** 空间分类 */
  category: SpaceCategory
  /** 加载优先级（数字越小越优先） */
  priority: number
  /** 是否支持懒加载 */
  lazyLoad: boolean
  /** 是否预加载 */
  preload: boolean
  /** 依赖关系 */
  dependencies: SpaceDependency[]
  /** 生命周期钩子 */
  lifecycle?: SpaceLifecycleHooks
  /** 空间状态 */
  status: SpaceStatus
  /** 上次活跃时间 */
  lastActiveAt: string | null
  /** 进入次数 */
  enterCount: number
  /** 累计停留时间（毫秒） */
  totalStayMs: number
}

/** 空间编排快照 */
export interface OrchestrationSnapshot {
  timestamp: string
  spaces: Record<string, SpaceOrchestrationConfig>
  activeSpaceId: string | null
}

/** 空间分组信息 */
export interface SpaceGroupInfo {
  category: SpaceCategory
  label: string
  icon: string
  spaces: SpaceOrchestrationConfig[]
  totalCount: number
  activeCount: number
}

/** 空间转换事件 */
export interface SpaceTransitionEvent {
  fromSpaceId: string | null
  toSpaceId: string
  timestamp: string
  transitionMs: number
  success: boolean
  error?: string
}

// ============================================================
// 常量
// ============================================================

const STORAGE_KEYS = {
  orchestration: 'hf_space_orchestration',
  transitions: 'hf_space_transitions',
  snapshots: 'hf_space_snapshots',
  stats: 'hf_space_stats',
} as const

/** 空间分类标签 */
export const CATEGORY_LABELS: Record<SpaceCategory, string> = {
  gravity: '引力场',
  'main-path': '主链路',
  work: '工作',
  world: '世界',
  system: '系统',
  tool: '工具',
  supplement: '补充',
}

/** 空间分类图标 */
export const CATEGORY_ICONS: Record<SpaceCategory, string> = {
  gravity: '⊙',
  'main-path': '◈',
  work: '⚒',
  world: '🌐',
  system: '⚙',
  tool: '🛠',
  supplement: '📦',
}

/** 默认空间编排配置 */
function defaultOrchestrationConfig(spaceId: string, room: RoomNode): SpaceOrchestrationConfig {
  const category = mapRoomGroupToCategory(room.group)
  return {
    spaceId,
    category,
    priority: room.isMainPath ? 0 : room.group === 'gravity' ? -1 : room.group === 'system' ? 100 : 50,
    lazyLoad: room.group === 'world',
    preload: room.isMainPath || room.group === 'gravity',
    dependencies: room.adjacentTo
      .filter(aid => aid !== spaceId)
      .map(aid => ({
        spaceId: aid,
        type: 'recommended' as const,
        description: `与 ${getRoom(aid)?.name ?? aid} 相邻`,
      })),
    lifecycle: undefined,
    status: 'idle',
    lastActiveAt: null,
    enterCount: 0,
    totalStayMs: 0,
  }
}

function mapRoomGroupToCategory(group: RoomGroup): SpaceCategory {
  switch (group) {
    case 'gravity': return 'gravity'
    case 'main-path': return 'main-path'
    case 'world': return 'world'
    case 'system': return 'system'
    default: return 'world'
  }
}

// ============================================================
// 可组合函数
// ============================================================

export function useSpaceOrchestrator() {
  // ---- 状态 ----
  const configs = ref<Record<string, SpaceOrchestrationConfig>>(
    storage.getKV<Record<string, SpaceOrchestrationConfig>>(STORAGE_KEYS.orchestration, {}),
  )
  const activeSpaceId = ref<string | null>(null)
  const transitions = ref<SpaceTransitionEvent[]>(
    storage.getKV<SpaceTransitionEvent[]>(STORAGE_KEYS.transitions, []),
  )
  const isTransitioning = ref(false)
  const transitionError = ref<string | null>(null)

  // ---- 初始化 ----
  function initialize(): void {
    const rooms = getAllRooms()
    const merged: Record<string, SpaceOrchestrationConfig> = {}

    for (const room of rooms) {
      const existing = configs.value[room.id]
      if (existing) {
        merged[room.id] = {
          ...existing,
          // 更新可能变化的字段
          dependencies: room.adjacentTo
            .filter(aid => aid !== room.id)
            .map(aid => ({
              spaceId: aid,
              type: 'recommended' as const,
              description: `与 ${getRoom(aid)?.name ?? aid} 相邻`,
            })),
        }
      } else {
        merged[room.id] = defaultOrchestrationConfig(room.id, room)
      }
    }

    configs.value = merged
    persist()
  }

  // ---- 查询 ----

  /** 获取所有空间配置 */
  function getAllConfigs(): SpaceOrchestrationConfig[] {
    return Object.values(configs.value)
  }

  /** 获取指定空间配置 */
  function getConfig(spaceId: string): SpaceOrchestrationConfig | undefined {
    return configs.value[spaceId]
  }

  /** 获取当前活跃空间 */
  function getActiveConfig(): SpaceOrchestrationConfig | undefined {
    return activeSpaceId.value ? configs.value[activeSpaceId.value] : undefined
  }

  // ---- Computed ----

  /** 按分类分组的空间 */
  const spacesByCategory = computed<SpaceGroupInfo[]>(() => {
    const categories: SpaceCategory[] = ['gravity', 'main-path', 'work', 'world', 'system', 'tool', 'supplement']
    return categories.map(cat => {
      const spaces = Object.values(configs.value).filter(c => c.category === cat)
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        icon: CATEGORY_ICONS[cat],
        spaces,
        totalCount: spaces.length,
        activeCount: spaces.filter(s => s.status === 'active').length,
      }
    })
  })

  /** 预加载空间列表 */
  const preloadSpaces = computed<SpaceOrchestrationConfig[]>(() => {
    return Object.values(configs.value).filter(c => c.preload)
  })

  /** 懒加载空间列表 */
  const lazyLoadSpaces = computed<SpaceOrchestrationConfig[]>(() => {
    return Object.values(configs.value).filter(c => c.lazyLoad)
  })

  /** 活跃空间列表 */
  const activeSpaces = computed<SpaceOrchestrationConfig[]>(() => {
    return Object.values(configs.value).filter(c => c.status === 'active')
  })

  /** 出错空间列表 */
  const errorSpaces = computed<SpaceOrchestrationConfig[]>(() => {
    return Object.values(configs.value).filter(c => c.status === 'error')
  })

  /** 编排统计 */
  const orchestrationStats = computed(() => {
    const all = Object.values(configs.value)
    return {
      total: all.length,
      active: all.filter(c => c.status === 'active').length,
      idle: all.filter(c => c.status === 'idle').length,
      loading: all.filter(c => c.status === 'loading').length,
      error: all.filter(c => c.status === 'error').length,
      hidden: all.filter(c => c.status === 'hidden').length,
      totalEnters: all.reduce((sum, c) => sum + c.enterCount, 0),
      totalStayMinutes: Math.round(all.reduce((sum, c) => sum + c.totalStayMs, 0) / 60000),
    }
  })

  /** 转换历史（最近20条） */
  const recentTransitions = computed<SpaceTransitionEvent[]>(() => {
    return transitions.value.slice(-20).reverse()
  })

  // ---- 空间状态管理 ----

  /** 设置空间状态 */
  function setStatus(spaceId: string, status: SpaceStatus): void {
    const config = configs.value[spaceId]
    if (!config) {
      console.warn(`[SpaceOrchestrator] 空间 ${spaceId} 不存在`)
      return
    }
    config.status = status
    if (status === 'active') {
      config.lastActiveAt = new Date().toISOString()
    }
    persist()
  }

  /** 检查依赖是否满足 */
  function areDependenciesMet(spaceId: string): { met: boolean; missing: string[] } {
    const config = configs.value[spaceId]
    if (!config) return { met: false, missing: [spaceId] }

    const missing: string[] = []
    for (const dep of config.dependencies) {
      if (dep.type === 'required') {
        const depConfig = configs.value[dep.spaceId]
        if (!depConfig || depConfig.status !== 'active') {
          missing.push(dep.spaceId)
        }
      }
    }

    return { met: missing.length === 0, missing }
  }

  /** 获取依赖链（拓扑排序） */
  function getDependencyChain(spaceId: string): string[] {
    const visited = new Set<string>()
    const result: string[] = []

    function dfs(id: string): void {
      if (visited.has(id)) return
      visited.add(id)

      const config = configs.value[id]
      if (!config) return

      for (const dep of config.dependencies) {
        if (dep.type === 'required') {
          dfs(dep.spaceId)
        }
      }
      result.push(id)
    }

    dfs(spaceId)
    return result
  }

  /** 获取加载顺序（按优先级+依赖） */
  function getLoadOrder(): string[] {
    const all = Object.values(configs.value)
    const withDeps = new Map<string, number>()

    function calcDepth(id: string, visited: Set<string> = new Set()): number {
      if (visited.has(id)) return 0
      visited.add(id)
      if (withDeps.has(id)) return withDeps.get(id)!

      const config = configs.value[id]
      if (!config) return 0

      let maxDepth = 0
      for (const dep of config.dependencies) {
        if (dep.type === 'required') {
          maxDepth = Math.max(maxDepth, calcDepth(dep.spaceId, new Set(visited)) + 1)
        }
      }
      withDeps.set(id, maxDepth)
      return maxDepth
    }

    for (const c of all) {
      calcDepth(c.spaceId)
    }

    return all
      .sort((a, b) => {
        const depthDiff = (withDeps.get(a.spaceId) ?? 0) - (withDeps.get(b.spaceId) ?? 0)
        if (depthDiff !== 0) return depthDiff
        return a.priority - b.priority
      })
      .map(c => c.spaceId)
  }

  // ---- 空间转换 ----

  /** 转换到指定空间 */
  async function transitionTo(spaceId: string): Promise<boolean> {
    if (isTransitioning.value) {
      console.warn('[SpaceOrchestrator] 正在转换中，请等待')
      return false
    }

    const fromSpaceId = activeSpaceId.value
    const toConfig = configs.value[spaceId]
    if (!toConfig) {
      transitionError.value = `空间 ${spaceId} 不存在`
      return false
    }

    const startTime = performance.now()
    isTransitioning.value = true
    transitionError.value = null

    try {
      // 离开当前空间
      if (fromSpaceId && fromSpaceId !== spaceId) {
        const fromConfig = configs.value[fromSpaceId]
        if (fromConfig) {
          await fromConfig.lifecycle?.onBeforeLeave?.()
          setStatus(fromSpaceId, 'inactive')
          await fromConfig.lifecycle?.onAfterLeave?.()
        }
      }

      // 进入目标空间
      setStatus(spaceId, 'loading')
      await toConfig.lifecycle?.onBeforeEnter?.()

      setStatus(spaceId, 'active')
      toConfig.enterCount++
      toConfig.lastActiveAt = new Date().toISOString()
      activeSpaceId.value = spaceId

      await toConfig.lifecycle?.onAfterEnter?.()

      // 记录转换
      const transitionMs = Math.round(performance.now() - startTime)
      const event: SpaceTransitionEvent = {
        fromSpaceId,
        toSpaceId: spaceId,
        timestamp: new Date().toISOString(),
        transitionMs,
        success: true,
      }
      transitions.value.push(event)
      if (transitions.value.length > 200) {
        transitions.value = transitions.value.slice(-200)
      }
      persist()

      return true
    } catch (err) {
      setStatus(spaceId, 'error')
      const errorMsg = err instanceof Error ? err.message : String(err)
      transitionError.value = errorMsg

      toConfig.lifecycle?.onError?.(err instanceof Error ? err : new Error(errorMsg))

      const event: SpaceTransitionEvent = {
        fromSpaceId,
        toSpaceId: spaceId,
        timestamp: new Date().toISOString(),
        transitionMs: Math.round(performance.now() - startTime),
        success: false,
        error: errorMsg,
      }
      transitions.value.push(event)
      persist()

      return false
    } finally {
      isTransitioning.value = false
    }
  }

  /** 记录停留时间 */
  function recordStayTime(spaceId: string, ms: number): void {
    const config = configs.value[spaceId]
    if (config) {
      config.totalStayMs += ms
      persist()
    }
  }

  // ---- 生命周期管理 ----

  /** 注册生命周期钩子 */
  function registerLifecycle(spaceId: string, hooks: SpaceLifecycleHooks): void {
    const config = configs.value[spaceId]
    if (config) {
      config.lifecycle = hooks
      persist()
    }
  }

  /** 预加载空间 */
  async function preloadSpace(spaceId: string): Promise<void> {
    const config = configs.value[spaceId]
    if (!config) return

    setStatus(spaceId, 'loading')
    try {
      // 预加载依赖
      for (const dep of config.dependencies) {
        if (dep.type === 'required') {
          const depConfig = configs.value[dep.spaceId]
          if (depConfig && depConfig.status === 'idle') {
            await preloadSpace(dep.spaceId)
          }
        }
      }
      setStatus(spaceId, 'idle')
    } catch {
      setStatus(spaceId, 'error')
    }
  }

  /** 批量预加载 */
  async function preloadAll(): Promise<{ success: number; failed: number }> {
    const order = getLoadOrder()
    let success = 0
    let failed = 0

    for (const id of order) {
      const config = configs.value[id]
      if (!config?.preload) continue
      try {
        await preloadSpace(id)
        success++
      } catch {
        failed++
      }
    }

    return { success, failed }
  }

  // ---- 配置管理 ----

  /** 更新空间配置 */
  function updateConfig(spaceId: string, updates: Partial<SpaceOrchestrationConfig>): void {
    const config = configs.value[spaceId]
    if (!config) return
    Object.assign(config, updates)
    persist()
  }

  /** 设置空间优先级 */
  function setPriority(spaceId: string, priority: number): void {
    updateConfig(spaceId, { priority })
  }

  /** 设置懒加载 */
  function setLazyLoad(spaceId: string, lazyLoad: boolean): void {
    updateConfig(spaceId, { lazyLoad })
  }

  /** 隐藏空间 */
  function hideSpace(spaceId: string): void {
    setStatus(spaceId, 'hidden')
  }

  /** 显示空间 */
  function showSpace(spaceId: string): void {
    const config = configs.value[spaceId]
    if (config && config.status === 'hidden') {
      setStatus(spaceId, 'idle')
    }
  }

  /** 添加依赖 */
  function addDependency(spaceId: string, dep: SpaceDependency): void {
    const config = configs.value[spaceId]
    if (!config) return
    if (!config.dependencies.some(d => d.spaceId === dep.spaceId)) {
      config.dependencies.push(dep)
      persist()
    }
  }

  /** 移除依赖 */
  function removeDependency(spaceId: string, depSpaceId: string): void {
    const config = configs.value[spaceId]
    if (!config) return
    config.dependencies = config.dependencies.filter(d => d.spaceId !== depSpaceId)
    persist()
  }

  // ---- 快照 ----

  /** 创建快照 */
  function createSnapshot(): OrchestrationSnapshot {
    const snapshot: OrchestrationSnapshot = {
      timestamp: new Date().toISOString(),
      spaces: JSON.parse(JSON.stringify(configs.value)),
      activeSpaceId: activeSpaceId.value,
    }
    const snapshots = storage.getKV<OrchestrationSnapshot[]>(STORAGE_KEYS.snapshots, [])
    snapshots.push(snapshot)
    if (snapshots.length > 10) {
      snapshots.shift()
    }
    storage.setKV(STORAGE_KEYS.snapshots, snapshots)
    return snapshot
  }

  /** 恢复快照 */
  function restoreSnapshot(snapshot: OrchestrationSnapshot): void {
    configs.value = snapshot.spaces
    activeSpaceId.value = snapshot.activeSpaceId
    persist()
  }

  /** 获取所有快照 */
  function getSnapshots(): OrchestrationSnapshot[] {
    return storage.getKV<OrchestrationSnapshot[]>(STORAGE_KEYS.snapshots, [])
  }

  // ---- 重置 ----

  function reset(): void {
    const rooms = getAllRooms()
    const fresh: Record<string, SpaceOrchestrationConfig> = {}
    for (const room of rooms) {
      fresh[room.id] = defaultOrchestrationConfig(room.id, room)
    }
    configs.value = fresh
    activeSpaceId.value = null
    transitions.value = []
    persist()
  }

  // ---- 持久化 ----

  function persist(): void {
    storage.setKV(STORAGE_KEYS.orchestration, configs.value)
    storage.setKV(STORAGE_KEYS.transitions, transitions.value)
  }

  // ---- 初始化 ----
  if (Object.keys(configs.value).length === 0) {
    initialize()
  }

  return {
    // 状态
    configs,
    activeSpaceId,
    transitions,
    isTransitioning,
    transitionError,

    // 计算属性
    spacesByCategory,
    preloadSpaces,
    lazyLoadSpaces,
    activeSpaces,
    errorSpaces,
    orchestrationStats,
    recentTransitions,

    // 查询
    getAllConfigs,
    getConfig,
    getActiveConfig,

    // 状态管理
    setStatus,
    areDependenciesMet,
    getDependencyChain,
    getLoadOrder,

    // 空间转换
    transitionTo,
    recordStayTime,

    // 生命周期
    registerLifecycle,
    preloadSpace,
    preloadAll,

    // 配置
    updateConfig,
    setPriority,
    setLazyLoad,
    hideSpace,
    showSpace,
    addDependency,
    removeDependency,

    // 快照
    createSnapshot,
    restoreSnapshot,
    getSnapshots,

    // 管理
    initialize,
    reset,
    persist,
  }
}