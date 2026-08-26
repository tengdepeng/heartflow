// ============================================================
// 释光阁 · 认知模块类型定义
// 冥想分析、环境音推荐、连续追踪、洞察生成
// ============================================================

import type { MeditationType } from '../light/types'

// ---- 冥想会话 ----

/** 冥想会话记录 */
export interface MeditationSession {
  id: string
  /** 冥想日期 */
  date: string
  /** 时间戳 */
  timestamp: string
  /** 时长（分钟） */
  duration: number
  /** 冥想类型 */
  type: MeditationType
  /** 冥想前情绪 */
  mood: string
  /** 冥想后情绪 */
  moodAfter: string
  /** 洞见/感悟 */
  insight?: string
  /** 是否完成 */
  completed: boolean
  /** 是否中断 */
  interrupted: boolean
  /** 中断原因 */
  interruptReason?: string
}

// ---- 冥想统计 ----

/** 冥想统计 */
export interface MeditationStats {
  /** 总会话次数 */
  totalSessions: number
  /** 总冥想时长（分钟） */
  totalDuration: number
  /** 平均时长 */
  averageDuration: number
  /** 最长会话 */
  longestSession: number
  /** 最短会话 */
  shortestSession: number
  /** 每周平均频率 */
  sessionFrequency: number
  /** 完成率 */
  completionRate: number
  /** 中断率 */
  interruptionRate: number
  /** 情绪转变分布 */
  moodShiftDistribution: Record<string, number>
  /** 时段分布 */
  timeOfDayDistribution: Record<string, number>
  /** 每日时长趋势 */
  dailyDurationTrend: { date: string; duration: number }[]
  /** 每周时长趋势 */
  weeklyDurationTrend: { week: string; duration: number }[]
  /** 每月时长趋势 */
  monthlyDurationTrend: { month: string; duration: number }[]
  /** 偏好类型分布 */
  preferredTypes: { type: MeditationType; count: number; totalDuration: number }[]
  /** 最佳冥想时段 */
  bestTimeOfDay: string
  /** 平均情绪改善分数 */
  averageMoodImprovement: number
  /** 情绪改善率 */
  moodImprovementRate: number
}

// ---- 冥想连续追踪 ----

/** 冥想连续记录 */
export interface MeditationStreak {
  /** 当前连续天数 */
  currentStreak: number
  /** 最长连续天数 */
  longestStreak: number
  /** 连续记录历史 */
  streakHistory: StreakSegment[]
  /** 当前连续开始日期 */
  streakStartDate: string | null
  /** 上次冥想日期 */
  lastMeditationDate: string | null
  /** 连续是否活跃（今天是否在连续中） */
  isStreakActive: boolean
  /** 今年完成的连续段数 */
  streaksThisYear: number
  /** 平均连续长度 */
  averageStreakLength: number
}

/** 连续段 */
export interface StreakSegment {
  startDate: string
  endDate: string
  length: number
  isActive: boolean
}

// ---- 环境音 ----

/** 环境音类别 */
export type AmbientSoundCategory =
  | 'nature'
  | 'water'
  | 'wind'
  | 'fire'
  | 'music'
  | 'ambient'
  | 'binaural'
  | 'silence'

/** 环境音 */
export interface AmbientSound {
  id: string
  /** 名称 */
  name: string
  /** 类别 */
  category: AmbientSoundCategory
  /** 描述 */
  description: string
  /** 关联情绪标签 */
  moodTags: string[]
  /** 适用时段标签 */
  timeTags: string[]
  /** 时长（秒） */
  duration: number
  /** 图标 */
  icon: string
  /** 推荐场景 */
  scenarios: string[]
}

// ---- 冥想洞察 ----

/** 冥想洞察 */
export interface MeditationInsight {
  id: string
  /** 洞察标题 */
  title: string
  /** 洞察描述 */
  description: string
  /** 洞察类型 */
  type: 'pattern' | 'achievement' | 'suggestion' | 'warning' | 'milestone'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 相关数据 */
  data?: Record<string, any>
  /** 生成时间 */
  generatedAt: string
}

// ---- 情绪评分映射 ----

/** 情绪分值映射表 */
export const MOOD_SCORE_MAP: Record<string, number> = {
  anxious: 1,
  stressed: 1,
  sad: 2,
  tired: 2,
  restless: 2,
  frustrated: 2,
  neutral: 3,
  calm: 4,
  peaceful: 4,
  content: 4,
  grateful: 5,
  joyful: 5,
  energized: 5,
  blissful: 5,
}

/** 时段标签 */
export const TIME_OF_DAY_LABELS: Record<string, string> = {
  dawn: '凌晨',
  morning: '清晨',
  forenoon: '上午',
  noon: '午后',
  afternoon: '下午',
  evening: '傍晚',
  night: '夜晚',
}

// ---- 环境音预设 ----

export const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: 'rain_gentle',
    name: '细雨',
    category: 'water',
    description: '轻柔的雨声，适合放松和专注',
    moodTags: ['anxious', 'stressed', 'restless', 'neutral'],
    timeTags: ['evening', 'night'],
    duration: 3600,
    icon: '🌧️',
    scenarios: ['放松', '阅读', '睡前'],
  },
  {
    id: 'ocean_waves',
    name: '海浪',
    category: 'water',
    description: '有节奏的海浪声，帮助呼吸同步',
    moodTags: ['anxious', 'stressed', 'tired', 'neutral'],
    timeTags: ['morning', 'afternoon', 'evening'],
    duration: 3600,
    icon: '🌊',
    scenarios: ['呼吸冥想', '身体扫描', '放松'],
  },
  {
    id: 'stream_brook',
    name: '溪流',
    category: 'water',
    description: '清澈的溪水声，带来内心的澄明',
    moodTags: ['calm', 'peaceful', 'neutral', 'content'],
    timeTags: ['morning', 'forenoon'],
    duration: 3600,
    icon: '💧',
    scenarios: ['静坐冥想', '观想', '反思'],
  },
  {
    id: 'forest_birds',
    name: '林间鸟鸣',
    category: 'nature',
    description: '清晨森林中的鸟鸣声，充满生机',
    moodTags: ['tired', 'neutral', 'calm'],
    timeTags: ['dawn', 'morning'],
    duration: 3600,
    icon: '🌳',
    scenarios: ['晨间冥想', '慈心冥想', '行走冥想'],
  },
  {
    id: 'bamboo_grove',
    name: '竹林',
    category: 'wind',
    description: '风吹竹叶的沙沙声，宁静致远',
    moodTags: ['restless', 'frustrated', 'neutral', 'calm'],
    timeTags: ['forenoon', 'afternoon'],
    duration: 3600,
    icon: '🎋',
    scenarios: ['静坐冥想', '持咒', '书写'],
  },
  {
    id: 'mountain_wind',
    name: '山风',
    category: 'wind',
    description: '高山之巅的清风，涤荡心灵',
    moodTags: ['stressed', 'frustrated', 'sad', 'neutral'],
    timeTags: ['forenoon', 'afternoon'],
    duration: 3600,
    icon: '🏔️',
    scenarios: ['呼吸冥想', '释怀仪式', '反思'],
  },
  {
    id: 'crackling_fire',
    name: '篝火',
    category: 'fire',
    description: '温暖的柴火噼啪声，带来安全感',
    moodTags: ['sad', 'tired', 'lonely', 'neutral'],
    timeTags: ['evening', 'night'],
    duration: 3600,
    icon: '🔥',
    scenarios: ['慈心冥想', '反思', '晚间放松'],
  },
  {
    id: 'candle_flame',
    name: '烛光',
    category: 'fire',
    description: '安静的烛火摇曳声，适合深度冥想',
    moodTags: ['calm', 'peaceful', 'content', 'neutral'],
    timeTags: ['evening', 'night'],
    duration: 3600,
    icon: '🕯️',
    scenarios: ['静坐冥想', '观想', '持咒'],
  },
  {
    id: 'tibetan_bowl',
    name: '颂钵',
    category: 'music',
    description: '西藏颂钵的悠远音波，帮助进入深度状态',
    moodTags: ['anxious', 'stressed', 'restless', 'neutral'],
    timeTags: ['morning', 'evening', 'night'],
    duration: 3600,
    icon: '🔔',
    scenarios: ['身体扫描', '深度冥想', '睡前放松'],
  },
  {
    id: 'guqin',
    name: '古琴',
    category: 'music',
    description: '悠远的古琴曲，营造东方禅意氛围',
    moodTags: ['calm', 'peaceful', 'content', 'grateful'],
    timeTags: ['afternoon', 'evening'],
    duration: 3600,
    icon: '🎵',
    scenarios: ['静坐冥想', '观想', '书法'],
  },
  {
    id: 'zen_temple',
    name: '禅院',
    category: 'ambient',
    description: '禅院中的环境音，偶有钟声与木鱼声',
    moodTags: ['stressed', 'restless', 'neutral', 'calm'],
    timeTags: ['morning', 'forenoon', 'afternoon'],
    duration: 3600,
    icon: '🏯',
    scenarios: ['静坐冥想', '持咒', '颂钵冥想'],
  },
  {
    id: 'cosmic_drone',
    name: '宇宙低吟',
    category: 'ambient',
    description: '低沉持续的宇宙背景音，帮助超越日常思绪',
    moodTags: ['sad', 'tired', 'neutral', 'content'],
    timeTags: ['night'],
    duration: 3600,
    icon: '🌌',
    scenarios: ['深度冥想', '观想', '星际漫游'],
  },
  {
    id: 'alpha_waves',
    name: 'Alpha 波',
    category: 'binaural',
    description: '8-12Hz Alpha 脑波，促进放松与创造力',
    moodTags: ['anxious', 'stressed', 'tired', 'neutral'],
    timeTags: ['morning', 'afternoon'],
    duration: 1800,
    icon: '🧠',
    scenarios: ['创意冥想', '放松', '观想'],
  },
  {
    id: 'theta_waves',
    name: 'Theta 波',
    category: 'binaural',
    description: '4-8Hz Theta 脑波，引导深度冥想状态',
    moodTags: ['restless', 'frustrated', 'neutral', 'calm'],
    timeTags: ['evening', 'night'],
    duration: 1800,
    icon: '🌙',
    scenarios: ['深度冥想', '身体扫描', '睡前'],
  },
  {
    id: 'pure_silence',
    name: '纯静',
    category: 'silence',
    description: '完全的静默，让内在声音浮现',
    moodTags: ['calm', 'peaceful', 'content', 'grateful', 'joyful'],
    timeTags: ['morning', 'forenoon', 'afternoon', 'evening', 'night'],
    duration: 3600,
    icon: '🕊️',
    scenarios: ['静坐冥想', '内观', '高级修习'],
  },
]

// ---- 环境音类别元数据 ----

export const AMBIENT_CATEGORY_META: Record<AmbientSoundCategory, { label: string; icon: string; color: string }> = {
  nature: { label: '自然', icon: '🌿', color: '#27ae60' },
  water: { label: '水声', icon: '💧', color: '#3498db' },
  wind: { label: '风声', icon: '🌬️', color: '#95a5a6' },
  fire: { label: '火声', icon: '🔥', color: '#e67e22' },
  music: { label: '音乐', icon: '🎵', color: '#9b59b6' },
  ambient: { label: '环境', icon: '🌐', color: '#1abc9c' },
  binaural: { label: '双耳', icon: '🧠', color: '#e74c3c' },
  silence: { label: '静默', icon: '🕊️', color: '#bdc3c7' },
}

// ---- 存储键 ----

export const MEDITATION_STORAGE_KEYS = {
  sessions: 'hf:cognition:sessions',
  stats: 'hf:cognition:stats',
  streak: 'hf:cognition:streak',
  insights: 'hf:cognition:insights',
  preferences: 'hf:cognition:preferences',
} as const