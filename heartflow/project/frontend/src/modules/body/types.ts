// ============================================================
// 身体温室 · 类型定义
// 健康追踪、身体指标、睡眠、运动、能量管理
// ============================================================

/** 身体指标类型 */
export type BodyMetricType = 'sleep' | 'weight' | 'heart_rate' | 'energy' | 'mood' | 'exercise' | 'water' | 'nutrition' | 'custom'

/** 身体指标记录 */
export interface BodyMetric {
  id: string
  type: BodyMetricType
  value: number
  unit: string
  note?: string
  timestamp: string
  date: string
}

/** 睡眠记录 */
export interface SleepRecord {
  id: string
  /** 入睡时间 */
  sleepAt: string
  /** 起床时间 */
  wakeAt: string
  /** 睡眠时长（分钟） */
  duration: number
  /** 睡眠质量 1-5 */
  quality: number
  /** 深度睡眠时长（分钟） */
  deepSleep?: number
  /** 梦境备注 */
  dreamNote?: string
  date: string
}

/** 能量等级 */
export type EnergyLevel = 'depleted' | 'low' | 'moderate' | 'high' | 'peak'

/** 身体温室状态 */
export interface BodyGreenhouseState {
  /** 当前能量等级 */
  energy: EnergyLevel
  /** 最近7天睡眠平均 */
  sleepAvg7d: number
  /** 运动频率（每周次数） */
  exerciseFrequency: number
  /** 水分摄入（杯/天） */
  waterIntake: number
  /** 身体评分 0-100 */
  bodyScore: number
  /** 温室植物健康度 0-100 */
  plantHealth: number
}

/** 指标元数据 */
export const BODY_METRIC_META: Record<BodyMetricType, { label: string; icon: string; unit: string; target: number }> = {
  sleep: { label: '睡眠', icon: '😴', unit: '小时', target: 8 },
  weight: { label: '体重', icon: '⚖️', unit: 'kg', target: 0 },
  heart_rate: { label: '心率', icon: '💓', unit: 'bpm', target: 70 },
  energy: { label: '精力', icon: '⚡', unit: '级', target: 4 },
  mood: { label: '情绪', icon: '😊', unit: '分', target: 7 },
  exercise: { label: '运动', icon: '🏃', unit: '分钟', target: 30 },
  water: { label: '饮水', icon: '💧', unit: '杯', target: 8 },
  nutrition: { label: '营养', icon: '🥗', unit: '餐', target: 3 },
  custom: { label: '自定义', icon: '📝', unit: '', target: 0 },
}

/** 能量等级元数据 */
export const ENERGY_LEVEL_META: Record<EnergyLevel, { label: string; icon: string; color: string; description: string }> = {
  depleted: { label: '枯竭', icon: '🪫', color: '#e74c3c', description: '需要立即休息与恢复' },
  low: { label: '低落', icon: '🔋', color: '#f39c12', description: '能量偏低，适合轻度活动' },
  moderate: { label: '平稳', icon: '🌤️', color: '#3498db', description: '能量适中，可正常运作' },
  high: { label: '充沛', icon: '☀️', color: '#2ecc71', description: '能量充足，适合高强度活动' },
  peak: { label: '巅峰', icon: '🔥', color: '#e67e22', description: '能量巅峰，创造力旺盛' },
}

export const BODY_STORAGE_KEYS = {
  metrics: 'hf:body:metrics',
  sleep: 'hf:body:sleep',
  state: 'hf:body:state',
  goals: 'hf:body:goals',
} as const