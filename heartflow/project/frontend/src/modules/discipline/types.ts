// ============================================================
// 自律工坊 · 类型定义
// 习惯追踪、自律挑战、连续记录、仪式管理
// ============================================================

/** 习惯难度 */
export type HabitDifficulty = 'easy' | 'medium' | 'hard' | 'extreme'

/** 习惯频率 */
export type HabitFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

/** 习惯记录 */
export interface Habit {
  id: string
  title: string
  description: string
  icon: string
  /** 难度 */
  difficulty: HabitDifficulty
  /** 频率 */
  frequency: HabitFrequency
  /** 自定义频率描述 */
  customFrequency?: string
  /** 目标次数 */
  target: number
  /** 当前连续天数 */
  streak: number
  /** 最长连续天数 */
  bestStreak: number
  /** 总完成次数 */
  totalCompleted: number
  /** 是否启用 */
  enabled: boolean
  /** 创建时间 */
  createdAt: string
  /** 完成记录日期 */
  completedDates: string[]
  /** 计时↔习惯直连：专注会话（mode==='focus'）完成后是否自动打卡此习惯。默认关闭，用户显式开启。 */
  autoCheckInOnFocus?: boolean
}

/** 自律挑战 */
export interface DisciplineChallenge {
  id: string
  title: string
  description: string
  /** 挑战天数 */
  duration: number
  /** 关联习惯 */
  habits: string[]
  /** 开始日期 */
  startDate: string
  /** 结束日期 */
  endDate: string
  /** 当前进度 */
  currentDay: number
  /** 是否完成 */
  completed: boolean
  /** 奖励 */
  reward?: string
}

/** 每日仪式 */
export interface DailyRitual {
  id: string
  title: string
  description: string
  icon: string
  /** 仪式步骤 */
  steps: string[]
  /** 预估时长（分钟） */
  estimatedDuration: number
  /** 触发时段 */
  triggerTime: 'morning' | 'afternoon' | 'evening' | 'anytime'
  /** 是否启用 */
  enabled: boolean
  /** 最近完成日期 */
  lastCompleted?: string
  /** 完成次数 */
  completionCount: number
}

/** 习惯难度元数据 */
export const HABIT_DIFFICULTY_META: Record<HabitDifficulty, { label: string; color: string; basePoints: number }> = {
  easy: { label: '简单', color: '#2ecc71', basePoints: 1 },
  medium: { label: '中等', color: '#3498db', basePoints: 3 },
  hard: { label: '困难', color: '#f39c12', basePoints: 5 },
  extreme: { label: '极限', color: '#e74c3c', basePoints: 10 },
}

/** 习惯频率元数据 */
export const HABIT_FREQUENCY_META: Record<HabitFrequency, { label: string; tasksPerPeriod: number }> = {
  daily: { label: '每日', tasksPerPeriod: 1 },
  weekly: { label: '每周', tasksPerPeriod: 7 },
  monthly: { label: '每月', tasksPerPeriod: 30 },
  custom: { label: '自定义', tasksPerPeriod: 0 },
}

export const DISCIPLINE_STORAGE_KEYS = {
  habits: 'hf:discipline:habits',
  challenges: 'hf:discipline:challenges',
  rituals: 'hf:discipline:rituals',
} as const