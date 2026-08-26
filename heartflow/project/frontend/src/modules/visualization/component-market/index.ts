// ============================================================
// 数据可视化基础框架 · 组件市场注册表
// 注册、查找、安装/卸载可视化组件
// ============================================================

// ============================================================
// 类型定义
// ============================================================

/** 组件市场中的可视化组件条目 */
export interface ComponentMarketItem {
  id: string
  type: string
  name: string
  description: string
  category: 'chart' | 'diagram' | 'widget'
  color: string
  size: 'small' | 'medium' | 'large'
  enabled: boolean
  showLegend: boolean
  showGrid: boolean
  animated: boolean
  /** 组件版本号 */
  version?: string
  /** 组件作者 */
  author?: string
  /** 组件标签 */
  tags?: string[]
}

/** 组件创建配置 */
export interface ComponentRegistration {
  id: string
  type: string
  name: string
  description: string
  category: 'chart' | 'diagram' | 'widget'
  color?: string
  size?: 'small' | 'medium' | 'large'
  version?: string
  author?: string
  tags?: string[]
  /** 初始启用状态 */
  enabled?: boolean
}

/** 组件更新字段 */
export type ComponentUpdates = Partial<Pick<ComponentMarketItem, 'name' | 'description' | 'color' | 'size' | 'showLegend' | 'showGrid' | 'animated' | 'tags' | 'version'>>

// ============================================================
// 内部状态
// ============================================================

/** 组件注册表 */
const registry = new Map<string, ComponentMarketItem>()

/** 内置组件分类 */
const CATEGORY_DISPLAY: Record<string, { icon: string; label: string }> = {
  chart: { icon: '📊', label: '图表' },
  diagram: { icon: '🔷', label: '示意图' },
  widget: { icon: '🧩', label: '小部件' },
}

// ============================================================
// 内置预设组件
// ============================================================

const BUILTIN_COMPONENTS: ComponentRegistration[] = [
  { id: 'line-chart', type: 'line', name: '折线图', description: '展示数据随时间或顺序的变化趋势', category: 'chart', color: '#d4a574', enabled: true },
  { id: 'bar-chart', type: 'bar', name: '柱状图', description: '比较不同类别之间的数值差异', category: 'chart', color: '#e8c49a', enabled: true },
  { id: 'ring-chart', type: 'ring', name: '环状图', description: '展示各部分占整体的比例关系', category: 'chart', color: '#f0d6b0', enabled: false },
  { id: 'scatter-plot', type: 'scatter', name: '散点图', description: '探索两个变量之间的相关性', category: 'chart', color: '#7a9ec8', enabled: false },
  { id: 'area-chart', type: 'area', name: '面积图', description: '强调数值随时间变化的幅度和趋势', category: 'chart', color: '#6abf8a', enabled: false },
  { id: 'waterfall', type: 'waterfall', name: '瀑布图', description: '展示数值的逐步增减过程', category: 'chart', color: '#c8a8e8', enabled: false },
  { id: 'boxplot', type: 'boxplot', name: '箱线图', description: '展示数据的分布特征和异常值', category: 'chart', color: '#e8a070', enabled: false },
  { id: 'heatmap', type: 'heatmap', name: '热力图', description: '用颜色密度展示二维数据的分布', category: 'diagram', color: '#d97757', enabled: false },
  { id: 'radar-chart', type: 'radar', name: '雷达图', description: '多维度数据的综合对比展示', category: 'diagram', color: '#6a9bcc', enabled: false },
  { id: 'sankey', type: 'sankey', name: '桑基图', description: '展示数据流动和转化关系', category: 'diagram', color: '#788c5d', enabled: false },
  { id: 'timeline', type: 'timeline', name: '时间线', description: '按时间顺序展示事件序列', category: 'widget', color: '#5ab8a0', enabled: false },
  { id: 'gauge', type: 'gauge', name: '仪表盘', description: '实时显示关键指标的当前数值', category: 'widget', color: '#f0c040', enabled: false },
  { id: 'stats-card', type: 'stats-card', name: '统计卡片', description: '概览关键指标的聚合数值', category: 'widget', color: '#a07c8c', enabled: true },
]

// ============================================================
// 公共 API
// ============================================================

/**
 * 注册单个组件
 *
 * @param config - 组件注册配置
 * @returns 注册后的 ComponentMarketItem
 *
 * @example
 * ```ts
 * registerComponent({
 *   id: 'my-chart',
 *   type: 'bar',
 *   name: '我的柱状图',
 *   description: '自定义柱状图组件',
 *   category: 'chart',
 *   color: '#ff6b6b',
 * })
 * ```
 */
export function registerComponent(config: ComponentRegistration): ComponentMarketItem {
  const item: ComponentMarketItem = {
    id: config.id,
    type: config.type,
    name: config.name,
    description: config.description,
    category: config.category,
    color: config.color ?? '#d4a574',
    size: config.size ?? 'medium',
    enabled: config.enabled ?? false,
    showLegend: true,
    showGrid: true,
    animated: true,
    version: config.version,
    author: config.author,
    tags: config.tags,
  }
  registry.set(item.id, item)
  return item
}

/**
 * 批量注册组件
 *
 * @param configs - 组件注册配置数组
 * @returns 注册后的组件数组
 */
export function registerComponents(configs: ComponentRegistration[]): ComponentMarketItem[] {
  return configs.map(c => registerComponent(c))
}

/**
 * 根据 ID 获取组件
 *
 * @param id - 组件 ID
 * @returns 对应的组件，未找到时返回 undefined
 */
export function getComponent(id: string): ComponentMarketItem | undefined {
  return registry.get(id)
}

/**
 * 按分类获取组件
 *
 * @param category - 组件分类
 * @returns 属于该分类的组件列表
 */
export function getComponentsByCategory(category: 'chart' | 'diagram' | 'widget'): ComponentMarketItem[] {
  return [...registry.values()].filter(c => c.category === category)
}

/**
 * 获取所有已注册组件
 *
 * @returns 按注册顺序排列的组件列表
 */
export function getAllComponents(): ComponentMarketItem[] {
  return [...registry.values()]
}

/**
 * 安装组件（启用）
 *
 * 将组件标记为已启用状态。如果组件已启用，则不做任何操作。
 *
 * @param id - 组件 ID
 * @returns 是否成功安装（false 表示组件不存在或已安装）
 */
export function installComponent(id: string): boolean {
  const item = registry.get(id)
  if (!item) return false
  if (item.enabled) return false
  item.enabled = true
  return true
}

/**
 * 卸载组件（禁用）
 *
 * 将组件标记为禁用状态。
 *
 * @param id - 组件 ID
 * @returns 是否成功卸载（false 表示组件不存在）
 */
export function uninstallComponent(id: string): boolean {
  const item = registry.get(id)
  if (!item) return false
  item.enabled = false
  return true
}

/**
 * 切换组件安装状态
 *
 * @param id - 组件 ID
 * @returns 切换后的启用状态，组件不存在时返回 undefined
 */
export function toggleComponent(id: string): boolean | undefined {
  const item = registry.get(id)
  if (!item) return undefined
  item.enabled = !item.enabled
  return item.enabled
}

/**
 * 更新组件配置
 *
 * 对指定组件的配置字段进行部分更新。
 *
 * @param id - 组件 ID
 * @param updates - 需要更新的字段
 * @returns 更新后的组件，组件不存在时返回 undefined
 */
export function updateComponent(id: string, updates: ComponentUpdates): ComponentMarketItem | undefined {
  const item = registry.get(id)
  if (!item) return undefined

  if (updates.name !== undefined) item.name = updates.name
  if (updates.description !== undefined) item.description = updates.description
  if (updates.color !== undefined) item.color = updates.color
  if (updates.size !== undefined) item.size = updates.size
  if (updates.showLegend !== undefined) item.showLegend = updates.showLegend
  if (updates.showGrid !== undefined) item.showGrid = updates.showGrid
  if (updates.animated !== undefined) item.animated = updates.animated
  if (updates.tags !== undefined) item.tags = updates.tags
  if (updates.version !== undefined) item.version = updates.version

  return item
}

/**
 * 删除组件注册
 *
 * 从注册表中移除指定组件。内置组件无法删除。
 *
 * @param id - 组件 ID
 * @returns 是否成功删除
 */
export function removeComponent(id: string): boolean {
  return registry.delete(id)
}

/**
 * 获取已安装（启用）的组件列表
 *
 * @returns 已启用的组件列表
 */
export function getInstalledComponents(): ComponentMarketItem[] {
  return [...registry.values()].filter(c => c.enabled)
}

/**
 * 获取组件总数
 *
 * @returns 注册的组件总数
 */
export function getComponentCount(): number {
  return registry.size
}

/**
 * 获取已安装的组件数量
 *
 * @returns 已启用的组件数量
 */
export function getInstalledCount(): number {
  return [...registry.values()].filter(c => c.enabled).length
}

/**
 * 获取分类显示信息
 *
 * @returns 分类名到显示信息的映射
 */
export function getCategoryDisplay(): Record<string, { icon: string; label: string }> {
  return { ...CATEGORY_DISPLAY }
}

/**
 * 搜索组件
 *
 * 按名称、描述、标签进行模糊搜索。
 *
 * @param query - 搜索关键词
 * @returns 匹配的组件列表
 */
export function searchComponents(query: string): ComponentMarketItem[] {
  const q = query.toLowerCase().trim()
  if (!q) return getAllComponents()

  return [...registry.values()].filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q) ||
    c.tags?.some(t => t.toLowerCase().includes(q)) ||
    c.category.toLowerCase().includes(q)
  )
}

/**
 * 清空注册表（主要用于测试）
 */
export function clearRegistry(): void {
  registry.clear()
}

/**
 * 初始化内置组件
 *
 * 将预设的 13 个组件注册到注册表中。
 * 通常在应用启动时调用一次。
 */
export function initBuiltinComponents(): ComponentMarketItem[] {
  // 仅在注册表为空时初始化
  if (registry.size > 0) return getAllComponents()
  return registerComponents(BUILTIN_COMPONENTS)
}