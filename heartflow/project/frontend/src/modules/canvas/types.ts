// ============================================================
// 画布模块 · 类型定义
// ============================================================

import type { TimeCrystal } from '../../types'

/** 画布布局模式 */
export type CanvasLayoutMode = 'gravity' | 'grid'

/** 引力配置 */
export interface GravityConfig {
  /** 引力中心 x（归一化 0-1） */
  centerX: number
  /** 引力中心 y（归一化 0-1） */
  centerY: number
  /** 引力强度 */
  attraction: number
  /** 斥力强度（结晶之间） */
  repulsion: number
  /** 阻尼 */
  damping: number
  /** 最小距离 */
  minDist: number
}

/** 画布上单个结晶的展示状态 */
export interface CanvasCrystal {
  crystal: TimeCrystal
  /** 当前展示位置 x */
  x: number
  /** 当前展示位置 y */
  y: number
  /** 目标位置 x（用于动画过渡） */
  targetX: number
  /** 目标位置 y */
  targetY: number
  /** 尺寸缩放 */
  scale: number
  /** 透明度 */
  opacity: number
  /** 浮动偏移相位 */
  floatPhase: number
}

/** 画布状态 */
export interface CanvasState {
  /** 当前布局模式 */
  layoutMode: CanvasLayoutMode
  /** 是否显示结晶 */
  visible: boolean
  /** 选中的结晶 ID */
  selectedCrystalId: string | null
}

/** 默认引力配置 */
export const DEFAULT_GRAVITY_CONFIG: GravityConfig = {
  centerX: 0.5,
  centerY: 0.48,
  attraction: 0.008,
  repulsion: 60,
  damping: 0.92,
  minDist: 40,
}
