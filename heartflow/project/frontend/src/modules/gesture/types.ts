// ============================================================
// 手势识别 - 类型定义
// ============================================================

/** 手势类型 */
export type GestureType =
  | 'tap'
  | 'long-press'
  | 'circle-cw'
  | 'circle-ccw'
  | 'cross'
  | 'wave'
  | 'horizontal-swipe-left'
  | 'horizontal-swipe-right'

/** 轨迹点 */
export interface TrajectoryPoint {
  x: number
  y: number
  t: number
}

/** 手势事件 */
export interface GestureEvent {
  type: GestureType
  start: TrajectoryPoint
  end: TrajectoryPoint
  trail: TrajectoryPoint[]
  originalEvent: PointerEvent
}

/** 手势配置 */
export interface GestureConfig {
  /** 采样间隔（ms） */
  sampleInterval: number
  /** 长按触发阈值（ms） */
  longPressThreshold: number
  /** 最小移动距离（px），低于此值视为 tap */
  minMoveDistance: number
}

/** 默认手势配置 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  sampleInterval: 50,
  longPressThreshold: 1500,
  minMoveDistance: 10,
}
