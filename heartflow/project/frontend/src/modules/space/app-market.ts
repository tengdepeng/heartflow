// ============================================================
// 心流工坊 · 应用市场模块
// 管理可安装的应用、模板、主题、组件市场
// 提供浏览、搜索、安装、卸载功能
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 市场条目类型 */
export type MarketItemType = 'template' | 'theme' | 'component' | 'plugin' | 'layout' | 'scene'

/** 市场条目状态 */
export type MarketItemStatus = 'installed' | 'not_installed' | 'installing' | 'updating'

/** 市场条目 */
export interface MarketItem {
  /** 条目ID */
  id: string
  /** 条目名称 */
  name: string
  /** 描述 */
  description: string
  /** 图标 */
  icon: string
  /** 类型 */
  type: MarketItemType
  /** 作者 */
  author: string
  /** 版本 */
  version: string
  /** 标签 */
  tags: string[]
  /** 安装次数 */
  installCount: number
  /** 预览图 */
  previewUrl?: string
  /** 安装状态 */
  status: MarketItemStatus
  /** 最后更新时间 */
  updatedAt: string
  /** 是否免费 */
  isFree: boolean
  /** 兼容性 */
  compatibility: string[]
}

/** 市场筛选条件 */
export interface MarketFilter {
  /** 类型筛选 */
  type?: MarketItemType | 'all'
  /** 排序方式 */
  sortBy: 'newest'
  /** 搜索关键词 */
  query: string
  /** 是否只显示已安装 */
  installedOnly: boolean
  /** 是否只显示免费 */
  freeOnly: boolean
}

/** 市场统计 */
export interface MarketStats {
  /** 总条目数 */
  totalItems: number
  /** 已安装数 */
  installedCount: number
  /** 按类型分布 */
  byType: Record<MarketItemType, number>
  /** 最近更新条目数 */
  recentlyUpdated: number
}

/** 安装记录 */
export interface InstallRecord {
  /** 记录ID */
  id: string
  /** 条目ID */
  itemId: string
  /** 操作类型 */
  action: 'install' | 'uninstall' | 'update'
  /** 版本 */
  version: string
  /** 操作时间 */
  timestamp: string
}

// ============================================================
// 常量
// ============================================================

const STORAGE_KEYS = {
  installedItems: 'hf_market_installed',
  installHistory: 'hf_market_history',
  favorites: 'hf_market_favorites',
} as const

/** 市场条目列表 */
export const MARKET_ITEMS: MarketItem[] = [
  // ---- 模板 ----
  {
    id: 'tpl-minimal-dashboard',
    name: '极简仪表盘',
    description: '干净利落的数据仪表盘模板，适合日常快速查看关键指标',
    icon: '📊',
    type: 'template',
    author: '心流官方',
    version: '1.2.0',
    tags: ['仪表盘', '数据', '极简'],
    installCount: 3420,
    status: 'not_installed',
    updatedAt: '2026-07-15T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'tpl-journal-daily',
    name: '日记·日常',
    description: '专注每日记录的日记模板，支持心情标记和天气记录',
    icon: '📓',
    type: 'template',
    author: '心流官方',
    version: '1.0.0',
    tags: ['日记', '记录', '日常'],
    installCount: 2100,
    status: 'not_installed',
    updatedAt: '2026-06-20T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'tpl-project-kanban',
    name: '项目看板',
    description: '可视化项目管理的看板模板，支持拖拽和状态流转',
    icon: '📋',
    type: 'template',
    author: '心流官方',
    version: '1.1.0',
    tags: ['项目管理', '看板', '拖拽'],
    installCount: 1800,
    status: 'not_installed',
    updatedAt: '2026-07-01T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'tpl-reading-tracker',
    name: '阅读追踪',
    description: '书架管理和阅读进度追踪模板，支持读书笔记关联',
    icon: '📚',
    type: 'template',
    author: '心流官方',
    version: '1.0.0',
    tags: ['阅读', '追踪', '笔记'],
    installCount: 950,
    status: 'not_installed',
    updatedAt: '2026-05-10T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },

  // ---- 主题 ----
  {
    id: 'thm-amber-warm',
    name: '暖琥珀',
    description: '温暖的琥珀色主题，营造舒适放松的氛围',
    icon: '🌅',
    type: 'theme',
    author: '心流官方',
    version: '2.0.0',
    tags: ['温暖', '琥珀', '舒适'],
    installCount: 5200,
    status: 'not_installed',
    updatedAt: '2026-07-20T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'thm-midnight-canteen',
    name: '深夜食堂',
    description: '深色主题搭配柔和暖光，适合夜间使用',
    icon: '🌙',
    type: 'theme',
    author: '心流官方',
    version: '1.5.0',
    tags: ['深色', '夜间', '柔和'],
    installCount: 4300,
    status: 'not_installed',
    updatedAt: '2026-07-10T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'thm-forest-zen',
    name: '森林禅意',
    description: '自然绿色系主题，适合冥想与专注场景',
    icon: '🌲',
    type: 'theme',
    author: '心流官方',
    version: '1.0.0',
    tags: ['自然', '绿色', '禅意'],
    installCount: 2800,
    status: 'not_installed',
    updatedAt: '2026-06-15T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },

  // ---- 组件 ----
  {
    id: 'cmp-progress-ring',
    name: '进度环',
    description: '环形进度指示器组件，支持自定义颜色和动画',
    icon: '⭕',
    type: 'component',
    author: '心流官方',
    version: '1.0.0',
    tags: ['进度', '环形', '动画'],
    installCount: 1600,
    status: 'not_installed',
    updatedAt: '2026-04-20T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'cmp-timeline-chart',
    name: '时间线图表',
    description: '时间轴可视化组件，支持缩放、标注和事件标记',
    icon: '📈',
    type: 'component',
    author: '心流官方',
    version: '1.2.0',
    tags: ['时间线', '图表', '可视化'],
    installCount: 2100,
    status: 'not_installed',
    updatedAt: '2026-07-05T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'cmp-mood-picker',
    name: '心情选择器',
    description: '可视化心情选择组件，支持自定义情绪标签',
    icon: '😊',
    type: 'component',
    author: '心流官方',
    version: '1.0.0',
    tags: ['心情', '选择器', '情绪'],
    installCount: 1200,
    status: 'not_installed',
    updatedAt: '2026-05-25T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },

  // ---- 插件 ----
  {
    id: 'plg-weather-widget',
    name: '天气小部件',
    description: '在空间中显示实时天气信息，支持多城市',
    icon: '🌤️',
    type: 'plugin',
    author: '社区开发者',
    version: '1.1.0',
    tags: ['天气', '小部件', '实时'],
    installCount: 3800,
    status: 'not_installed',
    updatedAt: '2026-06-30T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'plg-pomodoro-timer',
    name: '番茄钟',
    description: '专注计时器插件，支持自定义工作和休息时长',
    icon: '🍅',
    type: 'plugin',
    author: '心流官方',
    version: '2.0.0',
    tags: ['番茄钟', '专注', '计时'],
    installCount: 6800,
    status: 'not_installed',
    updatedAt: '2026-07-25T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'plg-quote-daily',
    name: '每日一言',
    description: '每天展示一句精选名言，支持分类和收藏',
    icon: '💬',
    type: 'plugin',
    author: '社区开发者',
    version: '1.0.0',
    tags: ['名言', '每日', '收藏'],
    installCount: 2500,
    status: 'not_installed',
    updatedAt: '2026-05-15T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },

  // ---- 布局 ----
  {
    id: 'lyt-split-pane',
    name: '双栏布局',
    description: '左右分栏布局，适合同时查看两个面板',
    icon: '🪟',
    type: 'layout',
    author: '心流官方',
    version: '1.0.0',
    tags: ['双栏', '分栏', '布局'],
    installCount: 800,
    status: 'not_installed',
    updatedAt: '2026-04-10T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'lyt-grid-dashboard',
    name: '网格仪表盘',
    description: '可拖拽的网格布局，自由排列卡片位置',
    icon: '🔲',
    type: 'layout',
    author: '心流官方',
    version: '1.1.0',
    tags: ['网格', '仪表盘', '拖拽'],
    installCount: 1500,
    status: 'not_installed',
    updatedAt: '2026-06-01T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },

  // ---- 场景 ----
  {
    id: 'scn-library-scene',
    name: '图书馆场景',
    description: '静谧的图书馆场景预设，适合阅读和专注',
    icon: '🏛️',
    type: 'scene',
    author: '心流官方',
    version: '1.0.0',
    tags: ['图书馆', '静谧', '阅读'],
    installCount: 1900,
    status: 'not_installed',
    updatedAt: '2026-06-10T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'scn-cafe-scene',
    name: '咖啡馆场景',
    description: '温暖的咖啡馆氛围，适合创意工作',
    icon: '☕',
    type: 'scene',
    author: '社区开发者',
    version: '1.0.0',
    tags: ['咖啡', '温暖', '创意'],
    installCount: 1200,
    status: 'not_installed',
    updatedAt: '2026-05-20T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
]

// ============================================================
// 可组合函数
// ============================================================

export function useAppMarket() {
  // ---- 状态 ----
  const items = ref<MarketItem[]>(
    storage.getKV<MarketItem[]>('hf_market_items', [...MARKET_ITEMS]),
  )
  const installedIds = ref<Set<string>>(
    new Set(storage.getKV<string[]>(STORAGE_KEYS.installedItems, [])),
  )
  const installHistory = ref<InstallRecord[]>(
    storage.getKV<InstallRecord[]>(STORAGE_KEYS.installHistory, []),
  )
  const favorites = ref<Set<string>>(
    new Set(storage.getKV<string[]>(STORAGE_KEYS.favorites, [])),
  )
  const filter = ref<MarketFilter>({
    sortBy: 'newest',
    query: '',
    installedOnly: false,
    freeOnly: false,
  })

  // ---- Computed ----

  /** 筛选后的条目列表 */
  const filteredItems = computed<MarketItem[]>(() => {
    let result = [...items.value]

    // 类型筛选
    if (filter.value.type && filter.value.type !== 'all') {
      result = result.filter(i => i.type === filter.value.type)
    }

    // 搜索
    if (filter.value.query) {
      const q = filter.value.query.toLowerCase()
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some(t => t.toLowerCase().includes(q)),
      )
    }

    // 已安装筛选
    if (filter.value.installedOnly) {
      result = result.filter(i => installedIds.value.has(i.id))
    }

    // 免费筛选
    if (filter.value.freeOnly) {
      result = result.filter(i => i.isFree)
    }

    // 排序：仅按最近更新（最新上架），不做排行/评分
    if (filter.value.sortBy === 'newest') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }

    return result
  })

  /** 按类型分组 */
  const itemsByType = computed<Record<MarketItemType, MarketItem[]>>(() => {
    const result: Record<MarketItemType, MarketItem[]> = {
      template: [],
      theme: [],
      component: [],
      plugin: [],
      layout: [],
      scene: [],
    }
    for (const item of items.value) {
      result[item.type].push(item)
    }
    return result
  })

  /** 市场统计 */
  const marketStats = computed<MarketStats>(() => {
    const byType = {} as Record<MarketItemType, number>
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    for (const type of ['template', 'theme', 'component', 'plugin', 'layout', 'scene'] as MarketItemType[]) {
      byType[type] = items.value.filter(i => i.type === type).length
    }

    const recentlyUpdated = items.value.filter(
      i => new Date(i.updatedAt).getTime() > thirtyDaysAgo,
    ).length

    return {
      totalItems: items.value.length,
      installedCount: installedIds.value.size,
      byType,
      recentlyUpdated,
    }
  })

  /** 已安装条目 */
  const installedItems = computed<MarketItem[]>(() => {
    return items.value.filter(i => installedIds.value.has(i.id))
  })

  /** 收藏条目 */
  const favoriteItems = computed<MarketItem[]>(() => {
    return items.value.filter(i => favorites.value.has(i.id))
  })

  // ---- 筛选操作 ----

  /** 设置筛选条件 */
  function setFilter(partial: Partial<MarketFilter>): void {
    filter.value = { ...filter.value, ...partial }
  }

  /** 重置筛选 */
  function resetFilter(): void {
    filter.value = {
      sortBy: 'newest',
      query: '',
      installedOnly: false,
      freeOnly: false,
    }
  }

  // ---- 安装操作 ----

  /** 安装条目 */
  function installItem(itemId: string): boolean {
    const item = items.value.find(i => i.id === itemId)
    if (!item || installedIds.value.has(itemId)) return false

    // 更新状态
    item.status = 'installing'
    persist()

    // 模拟安装延迟
    setTimeout(() => {
      item.status = 'installed'
      installedIds.value.add(itemId)
      item.installCount++

      // 记录安装历史
      const record: InstallRecord = {
        id: `install_${Date.now()}`,
        itemId,
        action: 'install',
        version: item.version,
        timestamp: new Date().toISOString(),
      }
      installHistory.value.push(record)
      if (installHistory.value.length > 100) {
        installHistory.value = installHistory.value.slice(-100)
      }

      persist()
    }, 500)

    persist()
    return true
  }

  /** 卸载条目 */
  function uninstallItem(itemId: string): boolean {
    const item = items.value.find(i => i.id === itemId)
    if (!item || !installedIds.value.has(itemId)) return false

    item.status = 'not_installed'
    installedIds.value.delete(itemId)

    const record: InstallRecord = {
      id: `uninstall_${Date.now()}`,
      itemId,
      action: 'uninstall',
      version: item.version,
      timestamp: new Date().toISOString(),
    }
    installHistory.value.push(record)
    if (installHistory.value.length > 100) {
      installHistory.value = installHistory.value.slice(-100)
    }

    persist()
    return true
  }

  /** 更新条目 */
  function updateItem(itemId: string): boolean {
    const item = items.value.find(i => i.id === itemId)
    if (!item || !installedIds.value.has(itemId)) return false

    item.status = 'updating'

    setTimeout(() => {
      item.status = 'installed'

      const record: InstallRecord = {
        id: `update_${Date.now()}`,
        itemId,
        action: 'update',
        version: item.version,
        timestamp: new Date().toISOString(),
      }
      installHistory.value.push(record)
      if (installHistory.value.length > 100) {
        installHistory.value = installHistory.value.slice(-100)
      }

      persist()
    }, 500)

    persist()
    return true
  }

  // ---- 收藏 ----

  /** 切换收藏 */
  function toggleFavorite(itemId: string): void {
    if (favorites.value.has(itemId)) {
      favorites.value.delete(itemId)
    } else {
      favorites.value.add(itemId)
    }
    persist()
  }

  /** 是否已收藏 */
  function isFavorite(itemId: string): boolean {
    return favorites.value.has(itemId)
  }

  // ---- 查询 ----

  /** 获取条目 */
  function getItem(itemId: string): MarketItem | undefined {
    return items.value.find(i => i.id === itemId)
  }

  /** 按类型获取条目 */
  function getItemsByType(type: MarketItemType): MarketItem[] {
    return items.value.filter(i => i.type === type)
  }

  /** 搜索条目 */
  function searchItems(query: string): MarketItem[] {
    const q = query.toLowerCase()
    return items.value.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)),
    )
  }

  /** 获取安装历史 */
  function getInstallHistory(itemId?: string): InstallRecord[] {
    if (itemId) {
      return installHistory.value.filter(r => r.itemId === itemId)
    }
    return [...installHistory.value].reverse()
  }

  // ---- 管理 ----

  function reset(): void {
    items.value = [...MARKET_ITEMS]
    installedIds.value = new Set()
    installHistory.value = []
    favorites.value = new Set()
    persist()
  }

  function persist(): void {
    storage.setKV('hf_market_items', items.value)
    storage.setKV(STORAGE_KEYS.installedItems, [...installedIds.value])
    storage.setKV(STORAGE_KEYS.installHistory, installHistory.value)
    storage.setKV(STORAGE_KEYS.favorites, [...favorites.value])
  }

  return {
    // 状态
    items,
    filter,
    installedIds,
    installHistory,
    favorites,

    // 计算属性
    filteredItems,
    itemsByType,
    marketStats,
    installedItems,
    favoriteItems,

    // 筛选
    setFilter,
    resetFilter,

    // 安装
    installItem,
    uninstallItem,
    updateItem,

    // 收藏
    toggleFavorite,
    isFavorite,

    // 查询
    getItem,
    getItemsByType,
    searchItems,
    getInstallHistory,

    // 管理
    reset,
    persist,
  }
}