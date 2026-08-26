// ============================================================
// 数据可视化基础框架 · 类型定义
// 视觉材质工坊核心类型体系
// ============================================================

// ---- 视觉元素 ----

/** 基础视觉元素形态 */
export type VisualElementType = 'point' | 'line' | 'surface' | 'bar' | 'ring' | 'grid'

/** 点元素配置 */
export interface PointConfig {
  radius: number
  color: string
  opacity: number
  glow?: { radius: number; color: string; opacity: number }
  hoverScale?: number
}

/** 线元素配置 */
export interface LineConfig {
  strokeWidth: number
  color: string
  opacity: number
  dashArray?: string
  smooth?: boolean
  fill?: string
  fillOpacity?: number
}

/** 面元素配置 */
export interface SurfaceConfig {
  color: string
  opacity: number
  gradient?: { from: string; to: string; angle?: number }
  border?: { width: number; color: string; opacity: number }
}

/** 柱状图元素配置 */
export interface BarConfig {
  width: number
  color: string
  hoverColor?: string
  radius?: number
  gap?: number
}

/** 环状图元素配置 */
export interface RingConfig {
  radius: number
  thickness: number
  color: string
  bgColor?: string
  gap?: number
}

// ---- 数据映射 ----

/** 数值映射模式 */
export type MappingMode = 'linear' | 'log' | 'pow' | 'sqrt' | 'step' | 'quantile'

/** 数值映射规则 */
export interface MappingRule {
  /** 数据域 */
  dataKey: string
  /** 映射模式 */
  mode: MappingMode
  /** 输入范围 */
  domain: [number, number]
  /** 输出范围 */
  range: [number, number]
  /** 分段阈值（step/quantile 模式用） */
  thresholds?: number[]
  /** 幂次（pow 模式用） */
  exponent?: number
}

/** 颜色映射规则 */
export interface ColorMapping {
  dataKey: string
  /** 色标: [position, color][] */
  stops: [number, string][]
  /** 默认颜色（无数据时） */
  defaultColor?: string
  /** 空值颜色 */
  nullColor?: string
}

// ---- 隐喻系统 ----

/** 视觉隐喻类型 */
export type MetaphorType = 'light' | 'ink' | 'wood' | 'fire' | 'water' | 'earth' | 'metal' | 'mist' | 'star' | 'crystal'

/** 隐喻配置 */
export interface MetaphorConfig {
  type: MetaphorType
  name: string
  description: string
  /** 调色板 */
  palette: MetaphorPalette
  /** 默认视觉元素配置 */
  defaults: Partial<Record<VisualElementType, Record<string, string>>>
}

/** 隐喻调色板 */
export interface MetaphorPalette {
  primary: string
  secondary: string
  accent: string
  muted: string
  bg: string
  surface: string
  border: string
  /** 语义色 */
  positive: string
  negative: string
  neutral: string
  /** 渐变色标 */
  gradient: [number, string][]
}

// ---- 风格包 ----

/** 可视化风格包 */
export interface VisualizationStylePack {
  id: string
  name: string
  /** 风格包描述 */
  description?: string
  metaphor: MetaphorType
  /** 是否预置 */
  isBuiltIn: boolean
  /** 自定义覆盖 */
  overrides?: Partial<MetaphorConfig>
}

// ---- 图表容器 ----

/** 图表尺寸 */
export interface ChartSize {
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
}

/** 坐标轴配置 */
export interface AxisConfig {
  show: boolean
  label?: string
  tickCount?: number
  tickFormat?: (v: number) => string
  grid?: { show: boolean; color?: string; dashArray?: string }
}

/** 图例配置 */
export interface LegendConfig {
  show: boolean
  position: 'top' | 'right' | 'bottom' | 'left'
  itemWidth?: number
  itemGap?: number
}

// ---- 数据点 ----

/** 二维坐标点 */
export interface Point2D {
  x: number
  y: number
}

/** 带标签的数据点 */
export interface DataPoint extends Point2D {
  label?: string
  value: number
  color?: string
  metadata?: Record<string, unknown>
}

// ---- 工具函数类型 ----

/** 曲线插值函数 */
export type Interpolator = (points: Point2D[]) => string