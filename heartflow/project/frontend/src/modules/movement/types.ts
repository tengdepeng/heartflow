// ============================================================
// 动律之间 · 类型定义
// 运动追踪、身体律动、运动类型、节奏管理
// ============================================================

/** 运动类型 */
export type MovementType = 'running' | 'walking' | 'cycling' | 'swimming' | 'yoga' | 'strength' | 'dance' | 'stretching' | 'sports' | 'hiit' | 'tai_chi' | 'custom'

/** 运动强度 */
export type MovementIntensity = 'light' | 'moderate' | 'vigorous' | 'extreme'

/** 运动记录 */
export interface MovementRecord {
  id: string
  type: MovementType
  /** 时长（分钟） */
  duration: number
  /** 强度 */
  intensity: MovementIntensity
  /** 距离（公里） */
  distance?: number
  /** 消耗卡路里 */
  calories?: number
  /** 心率平均值 */
  avgHeartRate?: number
  /** 感受 */
  feeling?: string
  /** 备注 */
  note?: string
  date: string
  timestamp: string
}

/** 律动节奏 */
export interface MovementRhythm {
  /** 每周运动目标（分钟） */
  weeklyTarget: number
  /** 本周已完成（分钟） */
  weeklyCompleted: number
  /** 当前连续运动天数 */
  streak: number
  /** 最长连续运动天数 */
  bestStreak: number
  /** 偏好运动类型 */
  favoriteTypes: MovementType[]
  /** 身体唤醒度 0-100 */
  bodyAwakening: number
}

/** 运动类型元数据 */
export const MOVEMENT_TYPE_META: Record<MovementType, { label: string; icon: string; category: string; avgCaloriesPerMin: number }> = {
  running: { label: '跑步', icon: '🏃', category: '有氧', avgCaloriesPerMin: 10 },
  walking: { label: '散步', icon: '🚶', category: '轻度', avgCaloriesPerMin: 4 },
  cycling: { label: '骑行', icon: '🚴', category: '有氧', avgCaloriesPerMin: 8 },
  swimming: { label: '游泳', icon: '🏊', category: '有氧', avgCaloriesPerMin: 9 },
  yoga: { label: '瑜伽', icon: '🧘', category: '柔韧', avgCaloriesPerMin: 4 },
  strength: { label: '力量', icon: '🏋️', category: '力量', avgCaloriesPerMin: 7 },
  dance: { label: '舞蹈', icon: '💃', category: '有氧', avgCaloriesPerMin: 6 },
  stretching: { label: '拉伸', icon: '🤸', category: '柔韧', avgCaloriesPerMin: 3 },
  sports: { label: '球类', icon: '⚽', category: '综合', avgCaloriesPerMin: 8 },
  hiit: { label: 'HIIT', icon: '⚡', category: '高强度', avgCaloriesPerMin: 12 },
  tai_chi: { label: '太极', icon: '☯️', category: '柔和', avgCaloriesPerMin: 3 },
  custom: { label: '自定义', icon: '🎯', category: '自定义', avgCaloriesPerMin: 5 },
}

/** 运动强度元数据 */
export const MOVEMENT_INTENSITY_META: Record<MovementIntensity, { label: string; color: string; multiplier: number }> = {
  light: { label: '轻度', color: '#2ecc71', multiplier: 0.7 },
  moderate: { label: '中度', color: '#3498db', multiplier: 1.0 },
  vigorous: { label: '激烈', color: '#f39c12', multiplier: 1.5 },
  extreme: { label: '极限', color: '#e74c3c', multiplier: 2.0 },
}

export const MOVEMENT_STORAGE_KEYS = {
  records: 'hf:movement:records',
  rhythm: 'hf:movement:rhythm',
} as const