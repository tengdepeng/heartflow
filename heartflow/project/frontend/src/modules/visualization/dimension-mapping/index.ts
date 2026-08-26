// ============================================================
// 数据可视化基础框架 · 维度映射引擎
// 7 个数据维度到视觉维度的映射规则
// ============================================================

import type { ColorMapping, MetaphorConfig } from '../types'
import { getColorFromMapping } from '../color'

// ============================================================
// 类型定义
// ============================================================

/** 数据维度标识 */
export type DataDimension =
  | 'value'
  | 'trend'
  | 'magnitude'
  | 'density'
  | 'complexity'
  | 'urgency'
  | 'progress'

/** 视觉维度标识 */
export type VisualDimension =
  | 'color'
  | 'direction'
  | 'size'
  | 'opacity'
  | 'texture'
  | 'glow'
  | 'position'

/** 趋势方向 */
export type TrendDirection = 'up' | 'down' | 'flat'

/** 纹理密度 */
export type TextureDensity = 'sparse' | 'medium' | 'dense'

/** 维度映射定义 */
export interface DimensionMappingDef {
  /** 数据维度标识 */
  dataDimension: DataDimension
  /** 视觉维度标识 */
  visualDimension: VisualDimension
  /** 映射名称（中文） */
  name: string
  /** 映射描述 */
  description: string
  /** 默认映射范围 */
  defaultRange: [number, number]
}

/** 趋势→方向映射结果 */
export interface DirectionResult {
  direction: TrendDirection
  /** 角度（度），向上=-90，向下=90，水平=0 */
  angle: number
  /** 箭头标识 */
  arrow: string
}

/** 纹理映射结果 */
export interface TextureResult {
  density: TextureDensity
  /** 纹理图案的 SVG 路径描述 */
  pattern: string
  /** 纹理间距 */
  spacing: number
}

/** 发光映射结果 */
export interface GlowResult {
  intensity: number
  /** 发光半径（px） */
  radius: number
  color: string
}

/** 位置映射结果 */
export interface PositionResult {
  /** 归一化位置 0-1 */
  normalized: number
  /** 实际坐标（由外部图表尺寸决定） */
  coordinate: number
}

/** 单个维度映射的视觉结果 */
export type DimensionMappingResult =
  | { dimension: 'color'; value: string }
  | { dimension: 'direction'; value: DirectionResult }
  | { dimension: 'size'; value: number }
  | { dimension: 'opacity'; value: number }
  | { dimension: 'texture'; value: TextureResult }
  | { dimension: 'glow'; value: GlowResult }
  | { dimension: 'position'; value: PositionResult }

/** 可视化配置上下文（用于维度映射） */
export interface VisualConfigContext {
  /** 颜色映射规则（用于 value→color） */
  colorMapping?: ColorMapping
  /** 隐喻配置（用于获取调色板） */
  metaphor?: Partial<MetaphorConfig>
  /** 图表范围（用于 position 映射） */
  chartRange?: { width: number; height: number }
  /** 基础尺寸（用于 size 映射） */
  baseSize?: number
}

/** 激活的维度映射配置 */
export interface ActiveMappings {
  value?: boolean
  trend?: boolean
  magnitude?: boolean
  density?: boolean
  complexity?: boolean
  urgency?: boolean
  progress?: boolean
}

/** 数据输入 */
export interface DimensionData {
  value: number
  trend: number
  magnitude: number
  density: number
  complexity: number
  urgency: number
  progress: number
}

// ============================================================
// 维度映射定义
// ============================================================

/** 所有 7 个维度映射定义 */
const DIMENSION_MAPPINGS: readonly DimensionMappingDef[] = [
  {
    dataDimension: 'value',
    visualDimension: 'color',
    name: '数值→颜色',
    description: '将数据数值映射到颜色，通过色标插值实现连续色彩过渡',
    defaultRange: [0, 1],
  },
  {
    dataDimension: 'trend',
    visualDimension: 'direction',
    name: '趋势→方向',
    description: '将趋势数据映射到方向，上升/下降/持平对应向上/向下/水平',
    defaultRange: [-1, 1],
  },
  {
    dataDimension: 'magnitude',
    visualDimension: 'size',
    name: '幅度→尺寸',
    description: '将幅度映射到视觉元素半径或宽度，幅度越大尺寸越大',
    defaultRange: [0, 1],
  },
  {
    dataDimension: 'density',
    visualDimension: 'opacity',
    name: '密度→透明度',
    description: '将密度映射到透明度，高密度低透明度，低密度高透明度',
    defaultRange: [0, 1],
  },
  {
    dataDimension: 'complexity',
    visualDimension: 'texture',
    name: '复杂度→纹理',
    description: '将复杂度映射到纹理密度，简单/中等/复杂对应不同纹理',
    defaultRange: [0, 1],
  },
  {
    dataDimension: 'urgency',
    visualDimension: 'glow',
    name: '紧急度→发光',
    description: '将紧急度映射到发光强度，紧急度越高发光越强',
    defaultRange: [0, 1],
  },
  {
    dataDimension: 'progress',
    visualDimension: 'position',
    name: '进度→位置',
    description: '将进度 0-1 映射到视觉元素在图表中的位置',
    defaultRange: [0, 1],
  },
]

// ============================================================
// 内部映射函数
// ============================================================

/**
 * 数值→颜色映射
 * 通过 ColorMapping 色标插值计算颜色值
 */
function mapValueToColor(
  data: number,
  config: VisualConfigContext,
): string {
  if (config.colorMapping) {
    return getColorFromMapping(data, config.colorMapping)
  }
  // 无颜色映射时，使用隐喻配置的渐变色标
  const gradient = config.metaphor?.palette?.gradient
  if (gradient && gradient.length > 0) {
    const t = Math.max(0, Math.min(1, data))
    const sorted = [...gradient].sort((a, b) => a[0] - b[0])
    if (t <= sorted[0][0]) return sorted[0][1]
    if (t >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1]
    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i][0] && t <= sorted[i + 1][0]) {
        return sorted[i][1]
      }
    }
    return sorted[sorted.length - 1][1]
  }
  return config.metaphor?.palette?.primary ?? '#888888'
}

/**
 * 趋势→方向映射
 * 上升/下降/持平 对应 向上/向下/水平
 */
function mapTrendToDirection(data: number): DirectionResult {
  if (data > 0.1) {
    return {
      direction: 'up',
      angle: -90,
      arrow: '↑',
    }
  }
  if (data < -0.1) {
    return {
      direction: 'down',
      angle: 90,
      arrow: '↓',
    }
  }
  return {
    direction: 'flat',
    angle: 0,
    arrow: '→',
  }
}

/**
 * 幅度→尺寸映射
 * 线性映射到视觉元素半径/宽度范围
 */
function mapMagnitudeToSize(
  data: number,
  config: VisualConfigContext,
): number {
  const t = Math.max(0, Math.min(1, data))
  const baseSize = config.baseSize ?? 10
  const minSize = baseSize * 0.3
  const maxSize = baseSize * 2.5
  return minSize + t * (maxSize - minSize)
}

/**
 * 密度→透明度映射
 * 高密度 → 低透明度，低密度 → 高透明度
 */
function mapDensityToOpacity(data: number): number {
  const t = Math.max(0, Math.min(1, data))
  // 高密度时透明度低（更不透明），低密度时透明度高
  return 1 - t * 0.7
}

/**
 * 复杂度→纹理映射
 * 简单/中等/复杂 对应不同纹理密度
 */
function mapComplexityToTexture(data: number): TextureResult {
  const t = Math.max(0, Math.min(1, data))

  if (t < 0.33) {
    return {
      density: 'sparse',
      pattern: 'M0,0 L4,4 M4,0 L0,4',
      spacing: 8,
    }
  }
  if (t < 0.66) {
    return {
      density: 'medium',
      pattern: 'M0,0 L4,4 M4,0 L0,4 M2,0 L2,4 M0,2 L4,2',
      spacing: 4,
    }
  }
  return {
    density: 'dense',
    pattern: 'M0,0 L4,4 M4,0 L0,4 M2,0 L2,4 M0,2 L4,2 M0,0 L4,0 M0,4 L4,4',
    spacing: 2,
  }
}

/**
 * 紧急度→发光映射
 * 紧急度越高发光强度越高
 */
function mapUrgencyToGlow(
  data: number,
  config: VisualConfigContext,
): GlowResult {
  const t = Math.max(0, Math.min(1, data))
  const primaryColor = config.metaphor?.palette?.primary ?? '#888888'
  const accentColor = config.metaphor?.palette?.accent ?? '#cccccc'

  return {
    intensity: t,
    radius: t * 20,
    color: t > 0.5 ? accentColor : primaryColor,
  }
}

/**
 * 进度→位置映射
 * 0-1 映射到视觉元素在图表中的位置
 */
function mapProgressToPosition(
  data: number,
  config: VisualConfigContext,
): PositionResult {
  const t = Math.max(0, Math.min(1, data))
  const chartWidth = config.chartRange?.width ?? 100
  return {
    normalized: t,
    coordinate: t * chartWidth,
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 获取所有 7 个维度映射定义
 *
 * @returns 只读的维度映射定义数组
 *
 * @example
 * ```ts
 * const mappings = getDimensionMappings()
 * mappings.forEach(m => console.log(m.name, '→', m.visualDimension))
 * ```
 */
export function getDimensionMappings(): readonly DimensionMappingDef[] {
  return DIMENSION_MAPPINGS
}

/**
 * 根据数据维度标识获取对应的映射定义
 *
 * @param dimension - 数据维度标识
 * @returns 对应的维度映射定义，未找到时返回 undefined
 */
export function getMappingByDimension(
  dimension: DataDimension,
): DimensionMappingDef | undefined {
  return DIMENSION_MAPPINGS.find((m) => m.dataDimension === dimension)
}

/**
 * 根据视觉维度标识获取对应的映射定义
 *
 * @param dimension - 视觉维度标识
 * @returns 对应的维度映射定义，未找到时返回 undefined
 */
export function getMappingByVisualDimension(
  dimension: VisualDimension,
): DimensionMappingDef | undefined {
  return DIMENSION_MAPPINGS.find((m) => m.visualDimension === dimension)
}

/**
 * 对单个数据维度应用映射
 *
 * @param data - 数据值
 * @param mappingType - 数据维度类型
 * @param visualConfig - 可视化配置上下文
 * @returns 维度映射的视觉结果
 *
 * @example
 * ```ts
 * const result = applyDimensionMapping(0.75, 'value', {
 *   colorMapping: { dataKey: 'x', stops: [[0, '#000'], [1, '#fff']] }
 * })
 * // { dimension: 'color', value: '#bfbfbf' }
 * ```
 */
export function applyDimensionMapping(
  data: number,
  mappingType: DataDimension,
  visualConfig: VisualConfigContext = {},
): DimensionMappingResult {
  switch (mappingType) {
    case 'value':
      return { dimension: 'color', value: mapValueToColor(data, visualConfig) }
    case 'trend':
      return { dimension: 'direction', value: mapTrendToDirection(data) }
    case 'magnitude':
      return { dimension: 'size', value: mapMagnitudeToSize(data, visualConfig) }
    case 'density':
      return { dimension: 'opacity', value: mapDensityToOpacity(data) }
    case 'complexity':
      return { dimension: 'texture', value: mapComplexityToTexture(data) }
    case 'urgency':
      return { dimension: 'glow', value: mapUrgencyToGlow(data, visualConfig) }
    case 'progress':
      return { dimension: 'position', value: mapProgressToPosition(data, visualConfig) }
  }
}

/**
 * 批量应用所有激活的维度映射
 *
 * 遍历 activeMappings 中标记为 true 的维度，依次对数据应用映射。
 * 返回一个包含所有映射结果的记录，键为数据维度名。
 *
 * @param data - 包含所有 7 个数据维度的输入数据
 * @param activeMappings - 激活的映射配置，控制哪些维度参与映射
 * @param config - 可视化配置上下文
 * @returns 数据维度到映射结果的记录
 *
 * @example
 * ```ts
 * const results = applyAllMappings(
 *   { value: 0.8, trend: 0.5, magnitude: 0.3, density: 0.6, complexity: 0.2, urgency: 0.9, progress: 0.4 },
 *   { value: true, trend: true, magnitude: false, density: true, complexity: false, urgency: true, progress: false },
 *   { baseSize: 12 }
 * )
 * // results 包含 value, trend, density, urgency 四个映射结果
 * ```
 */
export function applyAllMappings(
  data: DimensionData,
  activeMappings: ActiveMappings,
  config: VisualConfigContext = {},
): Partial<Record<DataDimension, DimensionMappingResult>> {
  const results: Partial<Record<DataDimension, DimensionMappingResult>> = {}

  const mappingEntries: [DataDimension, boolean | undefined][] = [
    ['value', activeMappings.value],
    ['trend', activeMappings.trend],
    ['magnitude', activeMappings.magnitude],
    ['density', activeMappings.density],
    ['complexity', activeMappings.complexity],
    ['urgency', activeMappings.urgency],
    ['progress', activeMappings.progress],
  ]

  for (const [dim, active] of mappingEntries) {
    if (active) {
      results[dim] = applyDimensionMapping(data[dim], dim, config)
    }
  }

  return results
}