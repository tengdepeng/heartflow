// ============================================================
// 念珠载体 · 类型定义
// ============================================================

import type { JadeBeadCarrier, LifecycleStage } from '../../types'

export type { JadeBeadCarrier }
export type { CarrierType, LifecycleStage } from '../../types'

/** 载体计数模式 */
export type BeadCountMode = 'forward' | 'backward'

/** 载体状态快照 */
export interface CarrierState {
  currentBead: number
  currentSegment: number
  totalSegments: number
  beadsPerSegment: number
  mode: BeadCountMode
}

/** 生命周期阶段定义 */
export interface LifecycleStageDef {
  value: LifecycleStage
  label: string
  description: string
  color: string
}

/** 生命周期阶段配置 */
export const LIFECYCLE_STAGES: LifecycleStageDef[] = [
  { value: 'newborn', label: '新生', description: '初生的载体，充满可能性', color: '#a07c8c' },
  { value: 'growing', label: '成长', description: '正在积累专注之力', color: '#6b9fc4' },
  { value: 'mature', label: '成熟', description: '珠满圆满，光华内敛', color: '#f0c040' },
  { value: 'aging', label: '衰老', description: '久未使用，逐渐暗淡', color: '#a0846c' },
  { value: 'retired', label: '退休', description: '已完成使命，存入档案', color: '#666666' },
]

/** 默认颜色方案 */
export const DEFAULT_CARRIER_COLORS = {
  primary: '#a07c8c',
  secondary: '#6b9fc4',
  accent: '#f0c040',
}

/** 常见珠子配置 */
export const BEAD_PRESETS = [
  { label: '标准 108', beadCount: 108, maxBeads: 108, segments: 4 },
  { label: '半串 54', beadCount: 54, maxBeads: 54, segments: 3 },
  { label: '简约 27', beadCount: 27, maxBeads: 27, segments: 3 },
  { label: '手串 18', beadCount: 18, maxBeads: 18, segments: 3 },
  { label: '随心 7', beadCount: 7, maxBeads: 7, segments: 1 },
] as const

/** 创建默认载体 */
export function createDefaultCarrier(
  name: string,
  presets: typeof BEAD_PRESETS[number] = BEAD_PRESETS[0],
): JadeBeadCarrier {
  return {
    id: `carrier_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    type: 'jade-bead',
    beadCount: 0,
    maxBeads: presets.maxBeads,
    segment: 1,
    colors: { ...DEFAULT_CARRIER_COLORS },
    active: false,
    advisorId: null,
    createdAt: new Date().toISOString(),
    lifecycleStage: 'newborn',
    lastUsedAt: null,
    usageCount: 0,
    inheritedTo: null,
    inheritedFrom: null,
  }
}
