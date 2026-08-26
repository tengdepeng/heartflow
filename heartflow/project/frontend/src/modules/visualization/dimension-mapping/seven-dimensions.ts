// ============================================================
// 数据可视化基础框架 · 七维映射规则引擎
// 模块〇：七维映射规则（蓝图定义）
//
// 七个维度：
//   1. 数据源与过滤 (DataSourceFilter)
//   2. 形状原子   (ShapeAtom)
//   3. 大小映射   (SizeMapping)
//   4. 颜色映射   (ColorMapping)
//   5. 关系映射   (RelationMapping)
//   6. 时间映射   (TimeMapping)
//   7. 交互与响应映射 (InteractionMapping)
// ============================================================

import type { ColorMapping as BaseColorMapping } from '../types'
import { getColorFromMapping } from '../color'

// ============================================================
// 1. 数据源与过滤 (DataSourceFilter)
// ============================================================

/** 数据源筛选模式 */
export type DataSourceMode = 'single' | 'multi-overlay'

/** 时间范围筛选 */
export interface TimeRangeFilter {
  /** 起始时间戳 (ms) */
  start: number
  /** 结束时间戳 (ms) */
  end: number
  /** 是否启用 */
  enabled: boolean
}

/** 分面/分组配置 */
export interface FacetingConfig {
  /** 分组字段 */
  field: string
  /** 分组方式 */
  mode: 'group' | 'facet'
  /** 最大分组数 */
  maxGroups?: number
  /** 排序方式 */
  sortBy?: 'count' | 'label' | 'value'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
}

/** 数据源与过滤配置 */
export interface DataSourceFilterConfig {
  /** 数据源选择模式 */
  mode: DataSourceMode
  /** 数据源 ID 列表 */
  sourceIds: string[]
  /** 时间范围 */
  timeRange: TimeRangeFilter
  /** 分面/分组配置 */
  faceting?: FacetingConfig
  /** 多源叠加时的融合策略 */
  overlayStrategy?: 'blend' | 'stack' | 'side-by-side'
}

/** 数据源筛选结果 */
export interface DataSourceFilterResult {
  /** 筛选后的数据项数量 */
  filteredCount: number
  /** 分组信息 */
  groups: FacetingGroup[]
  /** 应用的时间范围 */
  appliedTimeRange: { start: number; end: number } | null
}

/** 分面分组 */
export interface FacetingGroup {
  key: string
  label: string
  count: number
  items: unknown[]
}

// ============================================================
// 2. 形状原子 (ShapeAtom)
// ============================================================

/** 形状原子类型 */
export type ShapeAtomType =
  | 'light-point'
  | 'light-thread'
  | 'light-arc'
  | 'light-column'
  | 'glow'
  | 'light-bubble'
  | 'light-rectangle'
  | 'light-sphere'
  | 'light-flow'
  | 'custom-svg'

/** 形状原子标签（中文） */
export const SHAPE_ATOM_LABELS: Record<ShapeAtomType, string> = {
  'light-point': '光点',
  'light-thread': '光丝',
  'light-arc': '光弧',
  'light-column': '光柱',
  'glow': '光晕',
  'light-bubble': '光泡',
  'light-rectangle': '光矩',
  'light-sphere': '光球',
  'light-flow': '光流',
  'custom-svg': '自定义 SVG',
}

/** 形状原子配置 */
export interface ShapeAtomConfig {
  /** 形状类型 */
  type: ShapeAtomType
  /** 自定义 SVG 路径（type 为 custom-svg 时使用） */
  customSvg?: string
  /** 形状的基础属性 */
  baseProps?: Record<string, number | string>
  /** 形状是否由数据字段决定 */
  dynamicByField?: string
  /** 动态形状映射表（字段值→形状类型） */
  dynamicShapeMap?: Record<string, ShapeAtomType>
}

/** 形状原子渲染参数 */
export interface ShapeAtomRenderParams {
  type: ShapeAtomType
  label: string
  /** SVG 路径定义 */
  pathDef: string
  /** 默认渲染尺寸 */
  defaultSize: { width: number; height: number }
  /** 自定义 SVG（仅 custom-svg 类型） */
  customSvg?: string
}

// ============================================================
// 3. 大小映射 (SizeMapping)
// ============================================================

/** 大小映射模式 */
export type SizeMappingMode =
  | 'size-by-value'
  | 'color-depth-by-value'
  | 'glow-spread-by-value'
  | 'opacity-by-value'
  | 'line-thickness-by-value'
  | 'height-length-by-value'
  | 'area-by-value'

/** 大小映射模式标签（中文） */
export const SIZE_MAPPING_LABELS: Record<SizeMappingMode, string> = {
  'size-by-value': '按数值映射形状大小',
  'color-depth-by-value': '按数值映射颜色深度',
  'glow-spread-by-value': '按数值映射光晕扩散',
  'opacity-by-value': '按数值映射透明度',
  'line-thickness-by-value': '按数值映射线条粗细',
  'height-length-by-value': '按数值映射高度/长度',
  'area-by-value': '按数值映射面积',
}

/** 大小映射配置 */
export interface SizeMappingConfig {
  /** 映射模式 */
  mode: SizeMappingMode
  /** 数据字段 */
  field: string
  /** 数据域 [min, max] */
  domain: [number, number]
  /** 输出范围 [min, max] */
  range: [number, number]
  /** 映射函数 */
  scale?: 'linear' | 'sqrt' | 'log' | 'pow'
  /** 幂指数（scale=pow 时使用） */
  exponent?: number
  /** 是否反转 */
  reverse?: boolean
}

/** 大小映射渲染结果 */
export interface SizeMappingResult {
  mode: SizeMappingMode
  /** 归一化值 0-1 */
  normalized: number
  /** 实际渲染值 */
  value: number
  /** 影响的目标属性 */
  targetProperty: string
}

// ============================================================
// 4. 颜色映射 (ColorMapping) - 增强版
// ============================================================

/** 颜色映射模式 */
export type ColorMappingMode =
  | 'category'
  | 'continuous'
  | 'time-period'
  | 'unified'
  | 'custom-bar'

/** 颜色映射模式标签（中文） */
export const COLOR_MAPPING_LABELS: Record<ColorMappingMode, string> = {
  'category': '按类别色系',
  'continuous': '按连续值渐变',
  'time-period': '按时段色',
  'unified': '统一单色',
  'custom-bar': '用户自定义色带',
}

/** 类别色系配置 */
export interface CategoryColorConfig {
  /** 类别字段 */
  field: string
  /** 类别→颜色映射表 */
  colorMap: Record<string, string>
  /** 默认颜色（未匹配类别时） */
  defaultColor: string
}

/** 连续渐变配置 */
export interface ContinuousColorConfig {
  /** 数值字段 */
  field: string
  /** 色标 */
  stops: [number, string][]
  /** 数据域 */
  domain: [number, number]
}

/** 时段色配置 */
export interface TimePeriodColorConfig {
  /** 时间字段 */
  field: string
  /** 时段→颜色映射 */
  periodMap: Record<string, string>
  /** 时段划分方式 */
  periodType: 'hour' | 'day' | 'week' | 'month' | 'season'
}

/** 统一单色配置 */
export interface UnifiedColorConfig {
  color: string
}

/** 自定义色带配置 */
export interface CustomColorBarConfig {
  /** 色带名称 */
  name: string
  /** 色标 */
  stops: [number, string][]
}

/** 增强版颜色映射配置 */
export interface EnhancedColorMappingConfig {
  /** 映射模式 */
  mode: ColorMappingMode
  /** 类别色系配置 */
  category?: CategoryColorConfig
  /** 连续渐变配置 */
  continuous?: ContinuousColorConfig
  /** 时段色配置 */
  timePeriod?: TimePeriodColorConfig
  /** 统一单色配置 */
  unified?: UnifiedColorConfig
  /** 自定义色带配置 */
  customBar?: CustomColorBarConfig
  /** 引用基础颜色映射（兼容旧版） */
  baseColorMapping?: BaseColorMapping
}

/** 颜色映射渲染结果 */
export interface ColorMappingResult {
  mode: ColorMappingMode
  color: string
  /** 类别标签（类别模式时） */
  categoryLabel?: string
  /** 归一化值（连续模式时） */
  normalized?: number
}

// ============================================================
// 5. 关系映射 (RelationMapping)
// ============================================================

/** 关系映射模式 */
export type RelationMappingMode =
  | 'around-same-center'
  | 'left-to-right'
  | 'top-to-bottom'
  | 'center-outward-radial'
  | 'stacked'
  | 'nested'
  | 'free-scatter'
  | 'grid'
  | 'spiral'
  | 'light-thread-connected'

/** 关系映射模式标签（中文） */
export const RELATION_MAPPING_LABELS: Record<RelationMappingMode, string> = {
  'around-same-center': '围绕同一圆心',
  'left-to-right': '从左到右',
  'top-to-bottom': '从上到下',
  'center-outward-radial': '从中心向外辐射',
  'stacked': '堆叠',
  'nested': '嵌套',
  'free-scatter': '自由散点',
  'grid': '网格',
  'spiral': '螺旋',
  'light-thread-connected': '光丝连接',
}

/** 关系映射配置 */
export interface RelationMappingConfig {
  /** 关系排列模式 */
  mode: RelationMappingMode
  /** 中心点坐标 [x, y]（圆形/辐射/螺旋布局时使用） */
  center?: [number, number]
  /** 间距 */
  spacing?: number
  /** 连接线样式（light-thread-connected 时使用） */
  threadStyle?: {
    color: string
    width: number
    opacity: number
    dashArray?: string
  }
  /** 顺序字段 */
  orderBy?: string
  /** 网格列数（grid 模式时使用） */
  gridColumns?: number
  /** 螺旋圈数（spiral 模式时使用） */
  spiralTurns?: number
}

/** 关系映射渲染结果 */
export interface RelationMappingResult {
  mode: RelationMappingMode
  /** 每个数据项的位置 [x, y] */
  positions: [number, number][]
  /** 连接线定义（light-thread-connected 时） */
  connections?: Array<{ from: number; to: number; path: string }>
  /** 布局边界框 */
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
}

// ============================================================
// 6. 时间映射 (TimeMapping)
// ============================================================

/** 时间映射模式 */
export type TimeMappingMode =
  | 'left-to-right'
  | 'top-to-bottom'
  | 'center-outward'
  | 'spiral-outward'
  | 'none'

/** 时间映射模式标签（中文） */
export const TIME_MAPPING_LABELS: Record<TimeMappingMode, string> = {
  'left-to-right': '从左到右按时间',
  'top-to-bottom': '从上到下按时间',
  'center-outward': '从中心向外按时间',
  'spiral-outward': '螺旋向外按时间',
  'none': '无时间维度',
}

/** 时间映射配置 */
export interface TimeMappingConfig {
  /** 时间映射模式 */
  mode: TimeMappingMode
  /** 时间字段 */
  field: string
  /** 时间范围 */
  timeRange?: { start: number; end: number }
  /** 时间粒度 */
  granularity?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute'
  /** 动画速度（ms） */
  animationSpeed?: number
  /** 是否启用时间播放 */
  playable?: boolean
}

/** 时间映射渲染结果 */
export interface TimeMappingResult {
  mode: TimeMappingMode
  /** 归一化时间位置 0-1 */
  normalizedTime: number
  /** 时间标签 */
  label: string
  /** 是否在动画中可见 */
  visible: boolean
}

// ============================================================
// 7. 交互与响应映射 (InteractionMapping)
// ============================================================

/** 交互行为类型 */
export type InteractionType =
  | 'click-expand'
  | 'click-highlight'
  | 'click-navigate'
  | 'hover-label'
  | 'long-press-menu'
  | 'zoom-time-scale'
  | 'drag-relayout'
  | 'swipe-respond'
  | 'none'

/** 交互行为标签（中文） */
export const INTERACTION_LABELS: Record<InteractionType, string> = {
  'click-expand': '点击展开详情',
  'click-highlight': '点击高亮关联',
  'click-navigate': '点击导航',
  'hover-label': '悬停显示标签',
  'long-press-menu': '长按菜单',
  'zoom-time-scale': '缩放切换时间尺度',
  'drag-relayout': '拖拽重排布局',
  'swipe-respond': '滑动响应',
  'none': '无响应',
}

/** 交互行为配置 */
export interface InteractionConfig {
  /** 交互类型 */
  type: InteractionType
  /** 是否启用 */
  enabled: boolean
  /** 交互参数 */
  params?: Record<string, unknown>
}

/** 交互与响应映射配置 */
export interface InteractionMappingConfig {
  /** 激活的交互行为列表 */
  interactions: InteractionConfig[]
  /** 全局是否响应 */
  responsive: boolean
  /** 防抖延迟（ms） */
  debounceMs?: number
}

/** 交互映射事件定义 */
export interface InteractionEvent {
  type: InteractionType
  targetIndex: number
  payload: Record<string, unknown>
}

// ============================================================
// 综合输入/输出类型
// ============================================================

/** 单个数据项 */
export interface SevenDimensionDataItem {
  /** 唯一标识 */
  id: string
  /** 标签 */
  label?: string
  /** 数值字段 */
  values: Record<string, number>
  /** 类别字段 */
  categories: Record<string, string>
  /** 时间字段 */
  timestamp?: number
  /** 自由数据字段 */
  metadata?: Record<string, unknown>
}

/** 七维映射总配置 */
export interface SevenDimensionConfig {
  /** 数据源与过滤 */
  dataSource?: DataSourceFilterConfig
  /** 形状原子 */
  shape?: ShapeAtomConfig
  /** 大小映射 */
  size?: SizeMappingConfig
  /** 颜色映射 */
  color?: EnhancedColorMappingConfig
  /** 关系映射 */
  relation?: RelationMappingConfig
  /** 时间映射 */
  time?: TimeMappingConfig
  /** 交互与响应映射 */
  interaction?: InteractionMappingConfig
}

/** 单个数据项的七维渲染参数 */
export interface SevenDimensionRenderParams {
  itemId: string
  /** 形状原子渲染参数 */
  shape: ShapeAtomRenderParams
  /** 大小映射结果 */
  size: SizeMappingResult
  /** 颜色映射结果 */
  color: ColorMappingResult
  /** 位置 [x, y] */
  position: [number, number]
  /** 时间映射结果 */
  time: TimeMappingResult
  /** 交互行为配置 */
  interaction: InteractionConfig[]
  /** 透明度 */
  opacity: number
  /** 原始数据 */
  raw: SevenDimensionDataItem
}

/** 七维映射引擎输出 */
export interface SevenDimensionOutput {
  /** 数据源筛选结果 */
  dataSource: DataSourceFilterResult
  /** 全局关系映射结果 */
  relation: RelationMappingResult
  /** 每个数据项的渲染参数 */
  items: SevenDimensionRenderParams[]
  /** 原始数据项 */
  rawItems: SevenDimensionDataItem[]
}

// ============================================================
// 自然语言解析模式
// ============================================================

/** 自然语言解析结果 */
export interface NLParsedConfig {
  /** 解析出的形状类型 */
  shape: ShapeAtomType | null
  /** 解析出的主题（数据项代表什么） */
  subject: string | null
  /** 大小映射字段→模式映射 */
  sizeMappings: Array<{ field: string; mode: SizeMappingMode }>
  /** 颜色映射字段→模式映射 */
  colorMappings: Array<{ field: string; mode: ColorMappingMode }>
  /** 关系映射模式 */
  relation: RelationMappingMode | null
  /** 时间映射模式 */
  time: TimeMappingMode | null
  /** 解析是否成功 */
  success: boolean
  /** 未识别的部分 */
  unrecognized: string[]
}

// ============================================================
// 引擎内部常量
// ============================================================

/** 形状原子 SVG 路径定义 */
const SHAPE_PATH_DEFS: Record<ShapeAtomType, string> = {
  'light-point': 'M 0,-6 A 6,6 0 1,1 0,6 A 6,6 0 1,1 0,-6 Z',
  'light-thread': 'M 0,0 L 20,0',
  'light-arc': 'M 0,-20 A 20,20 0 0,1 20,0',
  'light-column': 'M -4,0 L 4,0 L 4,-20 L -4,-20 Z',
  'glow': 'M 0,-12 A 12,12 0 1,1 0,12 A 12,12 0 1,1 0,-12 Z',
  'light-bubble': 'M 0,-10 A 10,10 0 1,1 0,10 A 10,10 0 1,1 0,-10 Z',
  'light-rectangle': 'M -8,-6 L 8,-6 L 8,6 L -8,6 Z',
  'light-sphere': 'M 0,-10 A 10,10 0 1,1 0,10 A 10,10 0 1,1 0,-10 Z',
  'light-flow': 'M 0,0 Q 10,-10 20,0 T 40,0',
  'custom-svg': '',
}

/** 形状默认尺寸 */
const SHAPE_DEFAULT_SIZES: Record<ShapeAtomType, { width: number; height: number }> = {
  'light-point': { width: 12, height: 12 },
  'light-thread': { width: 20, height: 2 },
  'light-arc': { width: 20, height: 20 },
  'light-column': { width: 8, height: 20 },
  'glow': { width: 24, height: 24 },
  'light-bubble': { width: 20, height: 20 },
  'light-rectangle': { width: 16, height: 12 },
  'light-sphere': { width: 20, height: 20 },
  'light-flow': { width: 40, height: 10 },
  'custom-svg': { width: 20, height: 20 },
}

// ============================================================
// 数据源与过滤
// ============================================================

/**
 * 应用数据源筛选
 */
export function applyDataSourceFilter(
  items: SevenDimensionDataItem[],
  config: DataSourceFilterConfig,
): DataSourceFilterResult {
  let filtered = [...items]

  // 时间范围筛选
  if (config.timeRange.enabled) {
    filtered = filtered.filter((item) => {
      if (item.timestamp == null) return true
      return item.timestamp >= config.timeRange.start && item.timestamp <= config.timeRange.end
    })
  }

  // 分组
  const groups: FacetingGroup[] = []
  if (config.faceting) {
    const { field, maxGroups, sortBy, sortOrder } = config.faceting
    const groupMap = new Map<string, unknown[]>()

    for (const item of filtered) {
      const key = item.categories[field] ?? item.metadata?.[field] as string ?? '__ungrouped__'
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(item)
    }

    for (const [key, items] of groupMap) {
      groups.push({
        key,
        label: key,
        count: items.length,
        items,
      })
    }

    // 排序
    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1
      groups.sort((a, b) => {
        if (sortBy === 'count') return (a.count - b.count) * order
        if (sortBy === 'label') return a.label.localeCompare(b.label) * order
        return 0
      })
    }

    // 限制分组数
    if (maxGroups && groups.length > maxGroups) {
      groups.splice(maxGroups)
    }
  }

  return {
    filteredCount: filtered.length,
    groups,
    appliedTimeRange: config.timeRange.enabled
      ? { start: config.timeRange.start, end: config.timeRange.end }
      : null,
  }
}

// ============================================================
// 形状原子
// ============================================================

/**
 * 获取形状原子渲染参数
 */
export function getShapeAtomRenderParams(
  config: ShapeAtomConfig,
  _item?: SevenDimensionDataItem,
): ShapeAtomRenderParams {
  let type = config.type

  // 动态形状映射
  if (config.dynamicByField && config.dynamicShapeMap && _item) {
    const fieldValue = _item.categories[config.dynamicByField] ??
      _item.metadata?.[config.dynamicByField] as string
    if (fieldValue && config.dynamicShapeMap[fieldValue]) {
      type = config.dynamicShapeMap[fieldValue]
    }
  }

  return {
    type,
    label: SHAPE_ATOM_LABELS[type],
    pathDef: SHAPE_PATH_DEFS[type],
    defaultSize: SHAPE_DEFAULT_SIZES[type],
    customSvg: config.customSvg,
  }
}

// ============================================================
// 大小映射
// ============================================================

/**
 * 应用大小映射
 */
export function applySizeMapping(
  item: SevenDimensionDataItem,
  config: SizeMappingConfig,
): SizeMappingResult {
  const rawValue = item.values[config.field] ?? 0
  const [dMin, dMax] = config.domain
  const dRange = dMax - dMin || 1
  let t = (rawValue - dMin) / dRange
  t = Math.max(0, Math.min(1, t))

  if (config.reverse) {
    t = 1 - t
  }

  // 应用缩放函数
  let scaledT = t
  switch (config.scale) {
    case 'sqrt':
      scaledT = Math.sqrt(t)
      break
    case 'log':
      scaledT = Math.log(1 + t * 9) / Math.log(10)
      break
    case 'pow':
      scaledT = Math.pow(t, config.exponent ?? 2)
      break
    default:
      scaledT = t
  }

  const [rMin, rMax] = config.range
  const value = rMin + scaledT * (rMax - rMin)

  const targetPropertyMap: Record<SizeMappingMode, string> = {
    'size-by-value': 'shapeSize',
    'color-depth-by-value': 'colorDepth',
    'glow-spread-by-value': 'glowRadius',
    'opacity-by-value': 'opacity',
    'line-thickness-by-value': 'lineWidth',
    'height-length-by-value': 'height',
    'area-by-value': 'area',
  }

  return {
    mode: config.mode,
    normalized: scaledT,
    value,
    targetProperty: targetPropertyMap[config.mode],
  }
}

// ============================================================
// 颜色映射（增强版）
// ============================================================

/**
 * 应用增强版颜色映射
 */
export function applyEnhancedColorMapping(
  item: SevenDimensionDataItem,
  config: EnhancedColorMappingConfig,
): ColorMappingResult {
  switch (config.mode) {
    case 'category': {
      if (!config.category) {
        return { mode: 'category', color: '#888888' }
      }
      const catValue = item.categories[config.category.field] ?? '__unknown__'
      const color = config.category.colorMap[catValue] ?? config.category.defaultColor
      return {
        mode: 'category',
        color,
        categoryLabel: catValue,
      }
    }

    case 'continuous': {
      if (!config.continuous) {
        return { mode: 'continuous', color: '#888888' }
      }
      const rawValue = item.values[config.continuous.field] ?? 0
      const [dMin, dMax] = config.continuous.domain
      const dRange = dMax - dMin || 1
      const t = Math.max(0, Math.min(1, (rawValue - dMin) / dRange))

      if (config.continuous.stops.length > 0) {
        const tempMapping: BaseColorMapping = {
          dataKey: config.continuous.field,
          stops: config.continuous.stops,
        }
        const color = getColorFromMapping(t, tempMapping)
        return { mode: 'continuous', color, normalized: t }
      }

      return { mode: 'continuous', color: '#888888', normalized: t }
    }

    case 'time-period': {
      if (!config.timePeriod || item.timestamp == null) {
        return { mode: 'time-period', color: '#888888' }
      }
      const date = new Date(item.timestamp)
      let periodKey: string
      switch (config.timePeriod.periodType) {
        case 'hour':
          periodKey = String(date.getHours())
          break
        case 'day':
          periodKey = String(date.getDay())
          break
        case 'month':
          periodKey = String(date.getMonth())
          break
        case 'season':
          periodKey = String(Math.floor(date.getMonth() / 3))
          break
        default:
          periodKey = String(date.getDay())
      }
      const color = config.timePeriod.periodMap[periodKey] ?? '#888888'
      return { mode: 'time-period', color, categoryLabel: periodKey }
    }

    case 'unified': {
      const color = config.unified?.color ?? '#888888'
      return { mode: 'unified', color }
    }

    case 'custom-bar': {
      if (!config.customBar || config.customBar.stops.length === 0) {
        return { mode: 'custom-bar', color: '#888888' }
      }
      const tempMapping: BaseColorMapping = {
        dataKey: 'custom',
        stops: config.customBar.stops,
      }
      const color = getColorFromMapping(0.5, tempMapping)
      return { mode: 'custom-bar', color }
    }

    default:
      return { mode: 'unified', color: '#888888' }
  }
}

// ============================================================
// 关系映射
// ============================================================

/**
 * 应用关系映射，计算每个数据项的位置
 */
export function applyRelationMapping(
  items: SevenDimensionDataItem[],
  config: RelationMappingConfig,
  chartSize: { width: number; height: number },
): RelationMappingResult {
  const n = items.length
  if (n === 0) {
    return {
      mode: config.mode,
      positions: [],
      boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    }
  }

  const cx = config.center?.[0] ?? chartSize.width / 2
  const cy = config.center?.[1] ?? chartSize.height / 2
  const spacing = config.spacing ?? 20
  const positions: [number, number][] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  const track = (x: number, y: number): [number, number] => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    return [x, y]
  }

  switch (config.mode) {
    case 'around-same-center': {
      const radius = Math.min(chartSize.width, chartSize.height) * 0.35
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        positions.push(track(x, y))
      }
      break
    }

    case 'left-to-right': {
      const startX = spacing
      const totalWidth = chartSize.width - spacing * 2
      const stepX = n > 1 ? totalWidth / (n - 1) : 0
      for (let i = 0; i < n; i++) {
        positions.push(track(startX + i * stepX, cy))
      }
      break
    }

    case 'top-to-bottom': {
      const startY = spacing
      const totalHeight = chartSize.height - spacing * 2
      const stepY = n > 1 ? totalHeight / (n - 1) : 0
      for (let i = 0; i < n; i++) {
        positions.push(track(cx, startY + i * stepY))
      }
      break
    }

    case 'center-outward-radial': {
      const maxRadius = Math.min(chartSize.width, chartSize.height) * 0.4
      for (let i = 0; i < n; i++) {
        const r = maxRadius * ((i + 1) / n)
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        positions.push(track(cx + r * Math.cos(angle), cy + r * Math.sin(angle)))
      }
      break
    }

    case 'stacked': {
      const barWidth = Math.min(40, (chartSize.width - spacing * 2) / n)
      for (let i = 0; i < n; i++) {
        const x = spacing + i * barWidth + barWidth / 2
        const y = cy
        positions.push(track(x, y))
      }
      break
    }

    case 'nested': {
      for (let i = 0; i < n; i++) {
        const r = ((i + 1) / n) * Math.min(chartSize.width, chartSize.height) * 0.4
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        positions.push(track(cx + r * Math.cos(angle), cy + r * Math.sin(angle)))
      }
      break
    }

    case 'free-scatter': {
      for (let i = 0; i < n; i++) {
        const x = spacing + Math.random() * (chartSize.width - spacing * 2)
        const y = spacing + Math.random() * (chartSize.height - spacing * 2)
        positions.push(track(x, y))
      }
      break
    }

    case 'grid': {
      const cols = config.gridColumns ?? Math.ceil(Math.sqrt(n))
      const rows = Math.ceil(n / cols)
      const cellW = (chartSize.width - spacing * 2) / cols
      const cellH = (chartSize.height - spacing * 2) / rows
      for (let i = 0; i < n; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = spacing + col * cellW + cellW / 2
        const y = spacing + row * cellH + cellH / 2
        positions.push(track(x, y))
      }
      break
    }

    case 'spiral': {
      const turns = config.spiralTurns ?? 3
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1 || 1)
        const angle = t * turns * 2 * Math.PI - Math.PI / 2
        const maxRadius = Math.min(chartSize.width, chartSize.height) * 0.4
        const r = t * maxRadius
        positions.push(track(cx + r * Math.cos(angle), cy + r * Math.sin(angle)))
      }
      break
    }

    case 'light-thread-connected': {
      const radius = Math.min(chartSize.width, chartSize.height) * 0.35
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        positions.push(track(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)))
      }
      break
    }
  }

  // 生成连接线（light-thread-connected 模式）
  const connections: Array<{ from: number; to: number; path: string }> = []
  if (config.mode === 'light-thread-connected' && n > 1) {
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n
      const [x1, y1] = positions[i]
      const [x2, y2] = positions[next]
      connections.push({
        from: i,
        to: next,
        path: `M ${x1} ${y1} L ${x2} ${y2}`,
      })
    }
  }

  return {
    mode: config.mode,
    positions,
    connections: connections.length > 0 ? connections : undefined,
    boundingBox: {
      minX: minX === Infinity ? 0 : minX,
      minY: minY === Infinity ? 0 : minY,
      maxX: maxX === -Infinity ? 0 : maxX,
      maxY: maxY === -Infinity ? 0 : maxY,
    },
  }
}

// ============================================================
// 时间映射
// ============================================================

/**
 * 应用时间映射
 */
export function applyTimeMapping(
  item: SevenDimensionDataItem,
  config: TimeMappingConfig,
  currentTime?: number,
): TimeMappingResult {
  if (config.mode === 'none' || item.timestamp == null) {
    return {
      mode: config.mode,
      normalizedTime: 0,
      label: '',
      visible: true,
    }
  }

  const { start, end } = config.timeRange ?? { start: 0, end: 1 }
  const range = end - start || 1
  const t = Math.max(0, Math.min(1, (item.timestamp - start) / range))

  // 时间标签
  const date = new Date(item.timestamp)
  let label: string
  switch (config.granularity) {
    case 'year':
      label = String(date.getFullYear())
      break
    case 'month':
      label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      break
    case 'week':
      label = `W${Math.ceil(date.getDate() / 7)}`
      break
    case 'day':
      label = `${date.getMonth() + 1}/${date.getDate()}`
      break
    case 'hour':
      label = `${String(date.getHours()).padStart(2, '0')}:00`
      break
    case 'minute':
      label = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      break
    default:
      label = date.toLocaleDateString()
  }

  // 动画可见性
  const visible = currentTime == null || t <= currentTime

  return {
    mode: config.mode,
    normalizedTime: t,
    label,
    visible,
  }
}

// ============================================================
// 交互与响应映射
// ============================================================

/**
 * 获取交互配置列表
 */
export function getInteractionConfigs(
  config: InteractionMappingConfig,
): InteractionConfig[] {
  return config.interactions.filter((i) => i.enabled)
}

/**
 * 创建交互事件
 */
export function createInteractionEvent(
  type: InteractionType,
  targetIndex: number,
  payload: Record<string, unknown> = {},
): InteractionEvent {
  return { type, targetIndex, payload }
}

// ============================================================
// 七维映射引擎
// ============================================================

/** 引擎默认配置 */
const DEFAULT_CONFIG: SevenDimensionConfig = {
  dataSource: {
    mode: 'single',
    sourceIds: [],
    timeRange: { start: 0, end: Date.now(), enabled: false },
  },
  shape: {
    type: 'light-point',
  },
  size: {
    mode: 'size-by-value',
    field: 'value',
    domain: [0, 100],
    range: [4, 40],
    scale: 'linear',
  },
  color: {
    mode: 'unified',
    unified: { color: '#d4a574' },
  },
  relation: {
    mode: 'free-scatter',
    spacing: 20,
  },
  time: {
    mode: 'none',
    field: 'timestamp',
  },
  interaction: {
    interactions: [],
    responsive: false,
  },
}

/**
 * 七维映射引擎
 *
 * 接收数据输入和维度配置，依次应用七维映射规则，
 * 返回每个数据项的可视化渲染参数。
 */
export class SevenDimensionEngine {
  private config: SevenDimensionConfig

  constructor(config: Partial<SevenDimensionConfig> = {}) {
    this.config = this.mergeConfig(config)
  }

  /**
   * 更新引擎配置
   */
  updateConfig(config: Partial<SevenDimensionConfig>): void {
    this.config = this.mergeConfig(config)
  }

  /**
   * 获取当前配置
   */
  getConfig(): SevenDimensionConfig {
    return { ...this.config }
  }

  /**
   * 执行七维映射
   *
   * @param items - 输入数据项
   * @param chartSize - 图表尺寸
   * @param currentTime - 当前时间（用于时间动画，0-1 归一化）
   * @returns 七维映射输出
   */
  apply(
    items: SevenDimensionDataItem[],
    chartSize: { width: number; height: number } = { width: 800, height: 600 },
    currentTime?: number,
  ): SevenDimensionOutput {
    // 维度 1: 数据源与过滤
    const dataSource = applyDataSourceFilter(items, this.config.dataSource!)

    // 使用全部数据项（筛选已在 dataSource 中体现）
    const workingItems = items

    // 维度 6: 关系映射（先计算位置，因为后续维度可能依赖位置）
    const relation = applyRelationMapping(workingItems, this.config.relation!, chartSize)

    // 逐项映射
    const renderParams: SevenDimensionRenderParams[] = workingItems.map((item, index) => {
      // 维度 2: 形状原子
      const shape = getShapeAtomRenderParams(this.config.shape!, item)

      // 维度 3: 大小映射
      const size = applySizeMapping(item, this.config.size!)

      // 维度 4: 颜色映射
      const color = applyEnhancedColorMapping(item, this.config.color!)

      // 维度 5: 位置（来自关系映射）
      const position = relation.positions[index] ?? [0, 0]

      // 维度 6: 时间映射
      const time = applyTimeMapping(item, this.config.time!, currentTime)

      // 维度 7: 交互与响应映射
      const interaction = getInteractionConfigs(this.config.interaction!)

      // 透明度计算（综合大小映射中的透明度 + 时间可见性）
      const opacityFromSize = size.mode === 'opacity-by-value' ? size.value : 1
      const opacityFromTime = time.visible ? 1 : 0
      const opacity = opacityFromSize * opacityFromTime

      return {
        itemId: item.id,
        shape,
        size,
        color,
        position,
        time,
        interaction,
        opacity,
        raw: item,
      }
    })

    return {
      dataSource,
      relation,
      items: renderParams,
      rawItems: workingItems,
    }
  }

  /**
   * 合并配置（deep merge 简化版）
   */
  private mergeConfig(partial: Partial<SevenDimensionConfig>): SevenDimensionConfig {
    return {
      dataSource: { ...DEFAULT_CONFIG.dataSource!, ...partial.dataSource },
      shape: { ...DEFAULT_CONFIG.shape!, ...partial.shape },
      size: { ...DEFAULT_CONFIG.size!, ...partial.size },
      color: { ...DEFAULT_CONFIG.color!, ...partial.color },
      relation: { ...DEFAULT_CONFIG.relation!, ...partial.relation },
      time: { ...DEFAULT_CONFIG.time!, ...partial.time },
      interaction: { ...DEFAULT_CONFIG.interaction!, ...partial.interaction },
    }
  }
}

// ============================================================
// 自然语言解析模式 (Natural Language Parsing)
// ============================================================

/** 形状关键词映射 */
const SHAPE_KEYWORDS: Array<{ keywords: string[]; shape: ShapeAtomType }> = [
  { keywords: ['光点', '点'], shape: 'light-point' },
  { keywords: ['光丝', '丝线', '光线'], shape: 'light-thread' },
  { keywords: ['光弧', '弧线', '弧'], shape: 'light-arc' },
  { keywords: ['光柱', '柱', '柱状'], shape: 'light-column' },
  { keywords: ['光晕', '晕'], shape: 'glow' },
  { keywords: ['光泡', '气泡', '泡'], shape: 'light-bubble' },
  { keywords: ['光矩', '矩形', '方块'], shape: 'light-rectangle' },
  { keywords: ['光球', '球', '球体'], shape: 'light-sphere' },
  { keywords: ['光流', '流', '流动'], shape: 'light-flow' },
]

/** 大小映射关键词 */
const SIZE_KEYWORDS: Array<{ keywords: string[]; mode: SizeMappingMode }> = [
  { keywords: ['长度', '长短', '高度'], mode: 'height-length-by-value' },
  { keywords: ['大小', '尺寸'], mode: 'size-by-value' },
  { keywords: ['粗细', '线条粗细', '厚度'], mode: 'line-thickness-by-value' },
  { keywords: ['透明度', '透明'], mode: 'opacity-by-value' },
  { keywords: ['光晕', '扩散', '光晕大小'], mode: 'glow-spread-by-value' },
  { keywords: ['面积', '大小'], mode: 'area-by-value' },
  { keywords: ['颜色深度', '深浅'], mode: 'color-depth-by-value' },
]

/** 颜色映射关键词 */
const COLOR_KEYWORDS: Array<{ keywords: string[]; mode: ColorMappingMode }> = [
  { keywords: ['类别', '种类', '分类', '类型', '颜色'], mode: 'category' },
  { keywords: ['连续', '渐变', '数值'], mode: 'continuous' },
  { keywords: ['时段', '时间', '时期'], mode: 'time-period' },
  { keywords: ['统一', '单色', '同一'], mode: 'unified' },
  { keywords: ['自定义', '色带', '调色'], mode: 'custom-bar' },
]

/** 关系映射关键词 */
const RELATION_KEYWORDS: Array<{ keywords: string[]; mode: RelationMappingMode }> = [
  { keywords: ['围绕', '圆心', '同一圆心', '环绕'], mode: 'around-same-center' },
  { keywords: ['从左到右', '横排', '水平'], mode: 'left-to-right' },
  { keywords: ['从上到下', '竖排', '垂直'], mode: 'top-to-bottom' },
  { keywords: ['辐射', '中心向外', '放射'], mode: 'center-outward-radial' },
  { keywords: ['堆叠', '叠加', '层叠'], mode: 'stacked' },
  { keywords: ['嵌套', '套嵌'], mode: 'nested' },
  { keywords: ['散点', '散布', '分散', '自由'], mode: 'free-scatter' },
  { keywords: ['网格', '格子', '方格'], mode: 'grid' },
  { keywords: ['螺旋', '盘旋'], mode: 'spiral' },
  { keywords: ['连接', '光丝', '连线'], mode: 'light-thread-connected' },
]

/** 时间映射关键词 */
const TIME_KEYWORDS: Array<{ keywords: string[]; mode: TimeMappingMode }> = [
  { keywords: ['从左到右', '水平时间'], mode: 'left-to-right' },
  { keywords: ['从上到下', '垂直时间'], mode: 'top-to-bottom' },
  { keywords: ['中心向外', '辐射时间'], mode: 'center-outward' },
  { keywords: ['螺旋', '螺旋时间'], mode: 'spiral-outward' },
]

/**
 * 解析自然语言描述为七维映射配置
 *
 * 支持的描述格式示例：
 * "用光弧来表示每个应用。应用的使用时长决定光弧的长度。应用的类别决定光弧的颜色。所有光弧围绕同一个圆心排列。"
 *
 * @param description - 自然语言描述
 * @returns 解析出的配置片段
 */
export function parseNaturalLanguage(description: string): NLParsedConfig {
  const result: NLParsedConfig = {
    shape: null,
    subject: null,
    sizeMappings: [],
    colorMappings: [],
    relation: null,
    time: null,
    success: false,
    unrecognized: [],
  }

  const sentences = description
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  let shapeFound = false

  for (const sentence of sentences) {
    let recognized = false

    // 检测形状
    if (!shapeFound) {
      for (const { keywords, shape } of SHAPE_KEYWORDS) {
        if (keywords.some((kw) => sentence.includes(kw))) {
          result.shape = shape
          shapeFound = true
          recognized = true
          break
        }
      }
    }

    // 检测主题
    if (!result.subject) {
      const subjectMatch = sentence.match(/用\S{1,4}(?:来)?表示(?:每个|各个|各)?(\S{1,6})/)
      if (subjectMatch) {
        result.subject = subjectMatch[1]
        recognized = true
      }
    }

    // 提取字段名辅助函数：从句子的"决定"前提取最后有意义的部分
    const extractField = (s: string, defaultField: string): string => {
      const fieldMatch = s.match(/(\S{2,5})决定/)
      if (!fieldMatch) return defaultField
      // 去掉前缀"的"以及一切前面的修饰
      let field = fieldMatch[1].replace(/^.*的/, '')
      return field || defaultField
    }

    // 检测大小映射
    for (const { keywords, mode } of SIZE_KEYWORDS) {
      if (keywords.some((kw) => sentence.includes(kw))) {
        const field = extractField(sentence, 'value')
        if (!result.sizeMappings.find((m) => m.mode === mode)) {
          result.sizeMappings.push({ field, mode })
        }
        recognized = true
        break
      }
    }

    // 检测颜色映射
    for (const { keywords, mode } of COLOR_KEYWORDS) {
      if (keywords.some((kw) => sentence.includes(kw))) {
        const field = extractField(sentence, 'category')
        if (!result.colorMappings.find((m) => m.mode === mode)) {
          result.colorMappings.push({ field, mode })
        }
        recognized = true
        break
      }
    }

    // 检测关系映射（最后一个匹配的句子胜出）
    for (const { keywords, mode } of RELATION_KEYWORDS) {
      if (keywords.some((kw) => sentence.includes(kw))) {
        result.relation = mode
        recognized = true
        break
      }
    }

    // 检测时间映射（最后一个匹配的句子胜出）
    for (const { keywords, mode } of TIME_KEYWORDS) {
      if (keywords.some((kw) => sentence.includes(kw))) {
        result.time = mode
        recognized = true
        break
      }
    }

    // 检测"无时间维度"
    if (result.time === null && (sentence.includes('无时间') || sentence.includes('没有时间'))) {
      result.time = 'none'
      recognized = true
    }

    if (!recognized) {
      result.unrecognized.push(sentence)
    }
  }

  result.success = shapeFound || result.sizeMappings.length > 0 ||
    result.colorMappings.length > 0 || result.relation !== null || result.time !== null

  return result
}

/**
 * 将自然语言解析结果转换为 SevenDimensionConfig
 *
 * @param parsed - 解析结果
 * @param items - 数据项（用于推断 domain）
 * @returns 七维配置
 */
export function nlpConfigToSevenDimensionConfig(
  parsed: NLParsedConfig,
  items?: SevenDimensionDataItem[],
): Partial<SevenDimensionConfig> {
  const config: Partial<SevenDimensionConfig> = {}

  if (parsed.shape) {
    config.shape = { type: parsed.shape }
  }

  if (parsed.sizeMappings.length > 0) {
    const sizeMapping = parsed.sizeMappings[0]
    // 从数据中推断 domain
    let domain: [number, number] = [0, 100]
    if (items && items.length > 0) {
      const values = items
        .map((item) => item.values[sizeMapping.field] ?? 0)
        .filter((v) => !isNaN(v))
      if (values.length > 0) {
        domain = [Math.min(...values), Math.max(...values)]
        if (domain[0] === domain[1]) domain[1] = domain[0] + 1
      }
    }
    config.size = {
      mode: sizeMapping.mode,
      field: sizeMapping.field,
      domain,
      range: [4, 40],
      scale: 'linear',
    }
  }

  if (parsed.colorMappings.length > 0) {
    const colorMapping = parsed.colorMappings[0]
    if (colorMapping.mode === 'category') {
      config.color = {
        mode: 'category',
        category: {
          field: colorMapping.field,
          colorMap: {},
          defaultColor: '#888888',
        },
      }
    } else if (colorMapping.mode === 'continuous') {
      config.color = {
        mode: 'continuous',
        continuous: {
          field: colorMapping.field,
          domain: [0, 100],
          stops: [[0, '#2a2420'], [0.5, '#d4a574'], [1, '#f0d6b0']],
        },
      }
    } else {
      config.color = { mode: colorMapping.mode }
    }
  }

  if (parsed.relation) {
    config.relation = { mode: parsed.relation }
  }

  if (parsed.time) {
    config.time = { mode: parsed.time, field: 'timestamp' }
  }

  return config
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建七维映射引擎的便捷工厂函数
 */
export function createSevenDimensionEngine(
  config: Partial<SevenDimensionConfig> = {},
): SevenDimensionEngine {
  return new SevenDimensionEngine(config)
}

/**
 * 获取所有可用的形状原子类型
 */
export function getAllShapeAtomTypes(): ShapeAtomType[] {
  return Object.keys(SHAPE_ATOM_LABELS) as ShapeAtomType[]
}

/**
 * 获取所有可用的大小映射模式
 */
export function getAllSizeMappingModes(): SizeMappingMode[] {
  return Object.keys(SIZE_MAPPING_LABELS) as SizeMappingMode[]
}

/**
 * 获取所有可用的颜色映射模式
 */
export function getAllColorMappingModes(): ColorMappingMode[] {
  return Object.keys(COLOR_MAPPING_LABELS) as ColorMappingMode[]
}

/**
 * 获取所有可用的关系映射模式
 */
export function getAllRelationMappingModes(): RelationMappingMode[] {
  return Object.keys(RELATION_MAPPING_LABELS) as RelationMappingMode[]
}

/**
 * 获取所有可用的时间映射模式
 */
export function getAllTimeMappingModes(): TimeMappingMode[] {
  return Object.keys(TIME_MAPPING_LABELS) as TimeMappingMode[]
}

/**
 * 获取所有可用的交互类型
 */
export function getAllInteractionTypes(): InteractionType[] {
  return Object.keys(INTERACTION_LABELS) as InteractionType[]
}