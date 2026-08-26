// ============================================================
// 心流工坊 · 应用空间管理仪表盘
// 统一管理所有应用空间的状态、统计、活动
// 提供快捷操作入口、使用分析、空间对比
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getActiveConfig, getSpaceConfigs } from '../customization/engine'

// ============================================================
// 类型定义
// ============================================================

/** 应用空间入口 */
export interface AppSpaceEntry {
  /** 入口ID */
  id: string
  /** 入口名称 */
  name: string
  /** 描述 */
  description: string
  /** 图标 */
  icon: string
  /** 路由路径 */
  route: string
  /** 分类 */
  category: 'space' | 'design' | 'editor' | 'config' | 'market'
  /** 状态 */
  status: 'active' | 'ready' | 'wip'
  /** 标签 */
  tags: string[]
  /** 使用次数 */
  useCount: number
  /** 最后访问时间 */
  lastAccessedAt?: string
}

/** 应用空间使用统计 */
export interface AppSpaceUsageStats {
  /** 总配置数 */
  totalConfigs: number
  /** 活跃配置数 */
  activeConfigs: number
  /** 预设模板数 */
  presetCount: number
  /** 已安装布局数 */
  layoutCount: number
  /** 已安装主题数 */
  themeCount: number
  /** 总访问次数 */
  totalAccesses: number
  /** 最近7天活跃天数 */
  activeDays7d: number
  /** 最近一次活跃时间 */
  lastActiveAt?: string
}

/** 空间活动记录 */
export interface AppSpaceActivity {
  /** 活动ID */
  id: string
  /** 活动类型 */
  type: 'config_created' | 'config_updated' | 'config_deleted' | 'preset_applied' |
        'layout_installed' | 'theme_installed' | 'scene_created' | 'dimension_edited'
  /** 关联配置ID */
  configId?: string
  /** 活动描述 */
  description: string
  /** 发生时间 */
  timestamp: string
}

/** 空间对比条目 */
export interface SpaceComparison {
  configId: string
  configName: string
  roomCount: number
  featureCount: number
  styleTheme: string
  lastModified: string
  useCount: number
}

// ============================================================
// 常量
// ============================================================

const STORAGE_KEYS = {
  activities: 'hf_appspace_activities',
  entryAccess: 'hf_appspace_entry_access',
} as const

/** 应用空间入口列表 */
export const APP_SPACE_ENTRIES: AppSpaceEntry[] = [
  {
    id: 'space-customizer',
    name: '空间自定义',
    description: '调整空间结构、功能、交互、风格等7个维度',
    icon: '⚙️',
    route: '/space-customizer',
    category: 'space',
    status: 'active',
    tags: ['空间', '定制', '维度'],
    useCount: 0,
  },
  {
    id: 'scene-editor',
    name: '场景编辑器',
    description: '编辑房间场景、光照、氛围',
    icon: '🎬',
    route: '/scene-editor',
    category: 'editor',
    status: 'active',
    tags: ['场景', '编辑', '氛围'],
    useCount: 0,
  },
  {
    id: 'environment-editor',
    name: '环境编辑器',
    description: '调整环境参数、背景、音效',
    icon: '🌿',
    route: '/environment-editor',
    category: 'editor',
    status: 'ready',
    tags: ['环境', '编辑', '音效'],
    useCount: 0,
  },
  {
    id: 'decoration-workshop',
    name: '殿堂装修工坊',
    description: '统一装修入口：材质、光影、布局一站式管理',
    icon: '🏗️',
    route: '/decoration-workshop',
    category: 'design',
    status: 'active',
    tags: ['装修', '材质', '光影'],
    useCount: 0,
  },
  {
    id: 'interaction-config',
    name: '交互配置',
    description: '配置手势、快捷键、触觉反馈等交互规则',
    icon: '🖐️',
    route: '/interaction-config',
    category: 'config',
    status: 'ready',
    tags: ['交互', '配置', '手势'],
    useCount: 0,
  },
  {
    id: 'template-market',
    name: '模板市场',
    description: '浏览和安装房间模板、幕僚性格模板',
    icon: '🛒',
    route: '/template-market',
    category: 'market',
    status: 'active',
    tags: ['模板', '市场', '安装'],
    useCount: 0,
  },
  {
    id: 'style-market',
    name: '风格包市场',
    description: '浏览和安装主题风格包',
    icon: '🎨',
    route: '/style-market',
    category: 'market',
    status: 'active',
    tags: ['风格', '市场', '主题'],
    useCount: 0,
  },
  {
    id: 'plugin-market',
    name: '插件市场',
    description: '发现和安装功能插件',
    icon: '🧩',
    route: '/plugin-market',
    category: 'market',
    status: 'active',
    tags: ['插件', '市场', '扩展'],
    useCount: 0,
  },
  {
    id: 'component-market',
    name: '组件市场',
    description: '浏览和管理可视化组件',
    icon: '📊',
    route: '/component-market',
    category: 'market',
    status: 'active',
    tags: ['组件', '可视化', '图表'],
    useCount: 0,
  },
]

// ============================================================
// 可组合函数
// ============================================================

export function useAppSpaceManager() {
  // ---- 状态 ----
  const entries = ref<AppSpaceEntry[]>(
    storage.getKV<AppSpaceEntry[]>('hf_appspace_entries', [...APP_SPACE_ENTRIES]),
  )
  const activities = ref<AppSpaceActivity[]>(
    storage.getKV<AppSpaceActivity[]>(STORAGE_KEYS.activities, []),
  )
  const entryAccessCounts = ref<Record<string, number>>(
    storage.getKV<Record<string, number>>(STORAGE_KEYS.entryAccess, {}),
  )

  // ---- Computed ----

  /** 按分类分组 */
  const entriesByCategory = computed<Record<string, AppSpaceEntry[]>>(() => {
    const result: Record<string, AppSpaceEntry[]> = {
      space: [],
      design: [],
      editor: [],
      config: [],
      market: [],
    }
    for (const entry of entries.value) {
      if (!result[entry.category]) result[entry.category] = []
      result[entry.category].push(entry)
    }
    return result
  })

  /** 使用统计 */
  const usageStats = computed<AppSpaceUsageStats>(() => {
    const configs = getSpaceConfigs()
    const activeConfig = getActiveConfig()

    const totalAccesses = Object.values(entryAccessCounts.value).reduce((s, c) => s + c, 0)

    // 计算最近7天活跃天数
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const recentActivities = activities.value.filter(a =>
      new Date(a.timestamp).getTime() > sevenDaysAgo,
    )
    const activeDays = new Set(recentActivities.map(a => a.timestamp.slice(0, 10))).size

    // 最近活跃时间
    const sortedActivities = [...activities.value].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )

    return {
      totalConfigs: configs.length,
      activeConfigs: activeConfig ? 1 : 0,
      presetCount: 8, // 8个预置模板
      layoutCount: 6, // 6种布局
      themeCount: 3,  // 3种主题
      totalAccesses,
      activeDays7d: activeDays,
      lastActiveAt: sortedActivities[0]?.timestamp,
    }
  })

  /** 热门入口（按使用次数） */
  const hotEntries = computed<AppSpaceEntry[]>(() => {
    return [...entries.value].sort((a, b) => b.useCount - a.useCount).slice(0, 5)
  })

  /** 最近活动 */
  const recentActivities = computed<AppSpaceActivity[]>(() => {
    return activities.value.slice(-10).reverse()
  })

  /** 快捷建议（基于使用频率） */
  const quickSuggestions = computed<AppSpaceEntry[]>(() => {
    return entries.value
      .filter(e => e.status === 'active')
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 4)
  })

  // ---- 入口管理 ----

  /** 记录入口访问 */
  function recordEntryAccess(entryId: string): void {
    const entry = entries.value.find(e => e.id === entryId)
    if (entry) {
      entry.useCount++
      entry.lastAccessedAt = new Date().toISOString()
    }
    entryAccessCounts.value[entryId] = (entryAccessCounts.value[entryId] || 0) + 1
    persist()
  }

  /** 获取入口 */
  function getEntry(entryId: string): AppSpaceEntry | undefined {
    return entries.value.find(e => e.id === entryId)
  }

  /** 更新入口状态 */
  function updateEntryStatus(entryId: string, status: AppSpaceEntry['status']): void {
    const entry = entries.value.find(e => e.id === entryId)
    if (entry) {
      entry.status = status
      persist()
    }
  }

  // ---- 活动记录 ----

  /** 记录活动 */
  function recordActivity(
    type: AppSpaceActivity['type'],
    description: string,
    configId?: string,
  ): AppSpaceActivity {
    const activity: AppSpaceActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      configId,
      description,
      timestamp: new Date().toISOString(),
    }
    activities.value.push(activity)

    // 只保留最近 200 条
    if (activities.value.length > 200) {
      activities.value = activities.value.slice(-200)
    }
    persist()
    return activity
  }

  // ---- 空间对比 ----

  /** 获取空间对比数据 */
  function getSpaceComparisons(): SpaceComparison[] {
    const configs = getSpaceConfigs()
    return configs.map(c => ({
      configId: c.id,
      configName: c.name,
      roomCount: c.dimensions.find(d => d.dimension === 'structure')?.options?.rooms?.length ?? 0,
      featureCount: c.dimensions.find(d => d.dimension === 'features')?.options?.length ?? 0,
      styleTheme: c.dimensions.find(d => d.dimension === 'style')?.options?.theme ?? '默认',
      lastModified: c.updatedAt,
      useCount: activities.value.filter(a => a.configId === c.id).length,
    }))
  }

  // ---- 重置 ----

  function reset(): void {
    entries.value = [...APP_SPACE_ENTRIES]
    activities.value = []
    entryAccessCounts.value = {}
    persist()
  }

  // ---- 持久化 ----

  function persist(): void {
    storage.setKV('hf_appspace_entries', entries.value)
    storage.setKV(STORAGE_KEYS.activities, activities.value)
    storage.setKV(STORAGE_KEYS.entryAccess, entryAccessCounts.value)
  }

  return {
    // 状态
    entries,
    activities,
    entryAccessCounts,

    // 计算属性
    entriesByCategory,
    usageStats,
    hotEntries,
    recentActivities,
    quickSuggestions,

    // 入口管理
    recordEntryAccess,
    getEntry,
    updateEntryStatus,

    // 活动
    recordActivity,

    // 对比
    getSpaceComparisons,

    // 管理
    reset,
    persist,
  }
}