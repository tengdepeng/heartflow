// ============================================================
// 根脉之庭 · 类型定义
// ============================================================

export type RootLayer = 'soil' | 'era' | 'branch'

export interface Root {
  id: string
  /** 所属层：soil=根系, era=树干, branch=枝桠 */
  layer: RootLayer
  /** 一句话描述 */
  text: string
  /** 展开详情 */
  detail: string
  /** 时期（如「小时候」「大学」） */
  era: string
  /** 图标 */
  icon: string
  /** 强度 (0-1)，默认 0.5 */
  strength: number
  /** 关联的其他根系 ID 列表 */
  connections: string[]
  /** 标签列表 */
  tags: string[]
  /** 显示颜色 */
  color: string
  /** 关联的遗志 ID（若有） */
  willId: string | null
  /** 最后更新时间 */
  lastUpdatedAt: string
  /** 是否展开详情 */
  _expanded: boolean
}

/** 层级配置 */
export interface LayerConfig {
  label: string
  description: string
  color: string
  icon: string
}

export const LAYER_CONFIG: Record<RootLayer, LayerConfig> = {
  soil: {
    label: '根系 · 原生土壤',
    description: '家庭、故乡、童年——那些你最初生长的土壤',
    color: '#8B6F47',
    icon: '🌳',
  },
  era: {
    label: '树干 · 时代与成长',
    description: '时代背景、成长环境、迁移与变动',
    color: '#6B8E6B',
    icon: '🪵',
  },
  branch: {
    label: '枝桠 · 分化与选择',
    description: '信念锚点、三观形成、对你影响深远的人和书',
    color: '#4A7C6F',
    icon: '🌿',
  },
}

/** 默认强度值 */
export const DEFAULT_STRENGTH = 0.5

/** 存储键名 */
export const STORAGE_KEY = 'hf:roots_v2'