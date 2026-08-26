// ============================================================
// 应用空间自定义引擎 · 类型定义
// ============================================================

/** 自定义维度 */
export type CustomDimension =
  | 'structure'
  | 'features'
  | 'interaction'
  | 'style'
  | 'data'
  | 'permission'
  | 'scene'

/** 维度配置 */
export interface DimensionConfig {
  /** 维度标识 */
  dimension: CustomDimension
  /** 显示标签 */
  label: string
  /** 图标标识 */
  icon: string
  /** 配置选项 */
  options: Record<string, any>
}

/** 空间配置 */
export interface SpaceConfig {
  /** 唯一标识 */
  id: string
  /** 空间名称 */
  name: string
  /** 描述 */
  description: string
  /** 关联预设 ID */
  presetId: string
  /** 各维度配置 */
  dimensions: DimensionConfig[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 空间预设模板 */
export interface SpacePreset {
  /** 预设标识 */
  id: string
  /** 预设名称 */
  name: string
  /** 描述 */
  description: string
  /** 图标 */
  icon: string
  /** 维度配置 */
  dimensions: DimensionConfig[]
}

/** 维度元数据 */
export interface DimensionMeta {
  label: string
  icon: string
  desc: string
}

/** 7 个维度的元数据常量 */
export const DIMENSION_META: Record<CustomDimension, DimensionMeta> = {
  structure:   { label: '空间结构',   icon: 'Layout',   desc: '控制空间布局与房间结构' },
  features:    { label: '功能特性',   icon: 'Zap',      desc: '配置功能模块与工具集' },
  interaction: { label: '交互方式',   icon: 'Hand',     desc: '自定义交互模式与手势' },
  style:       { label: '视觉风格',   icon: 'Palette',  desc: '选择视觉主题与样式' },
  data:        { label: '数据管理',   icon: 'Database', desc: '管理数据存储与同步策略' },
  permission:  { label: '权限配置',   icon: 'Shield',   desc: '配置访问权限与角色' },
  scene:       { label: '场景预设',   icon: 'Image',    desc: '切换场景模板与背景' },
}