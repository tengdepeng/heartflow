// ============================================================
// 动律之间 · 运动计划与成就系统
// 运动计划 + 成就系统 + 节奏分析
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { MovementType, MovementIntensity, MovementRecord, MovementRhythm } from './types'
import { MOVEMENT_INTENSITY_META } from './types'

// ---- 类型定义 ----

/** 运动计划 */
export interface WorkoutPlan {
  id: string
  name: string
  description: string
  /** 计划类型 */
  planType: PlanType
  /** 每周目标（分钟） */
  weeklyTarget: number
  /** 每日安排 */
  dailySchedule: DailyWorkout[]
  /** 难度 */
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme'
  /** 持续时间（周） */
  durationWeeks: number
  /** 当前周 */
  currentWeek: number
  /** 是否激活 */
  active: boolean
  /** 标签 */
  tags: string[]
}

/** 计划类型 */
export type PlanType = 'weight_loss' | 'muscle_build' | 'endurance' | 'flexibility' | 'general_health' | 'stress_relief' | 'custom'

/** 每日训练 */
export interface DailyWorkout {
  dayOfWeek: number // 0=周日, 1=周一, ...
  activities: PlannedActivity[]
  /** 备注 */
  note?: string
}

/** 计划活动 */
export interface PlannedActivity {
  type: MovementType
  duration: number // 分钟
  intensity: MovementIntensity
  /** 组数/次数说明 */
  description?: string
}

/** 运动成就 */
export interface MovementAchievement {
  id: string
  name: string
  description: string
  /** 成就图标 */
  icon: string
  /** 解锁条件 */
  condition: AchievementCondition
  /** 是否已解锁 */
  unlocked: boolean
  /** 解锁时间 */
  unlockedAt?: string
  /** 等级 */
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
}

/** 成就条件 */
export interface AchievementCondition {
  type: 'total_minutes' | 'streak_days' | 'type_count' | 'calories' | 'distance' | 'weekly_goal' | 'custom'
  threshold: number
  /** 当前进度 */
  progress: number
}

/** 节奏分析 */
export interface RhythmAnalysis {
  /** 运动频率评分 0-100 */
  frequencyScore: number
  /** 运动多样性评分 0-100 */
  varietyScore: number
  /** 强度分布 */
  intensityDistribution: Record<MovementIntensity, number>
  /** 运动类型分布 */
  typeDistribution: { type: MovementType; minutes: number; percentage: number }[]
  /** 周度趋势 */
  weeklyTrend: { week: string; minutes: number; sessions: number }[]
  /** 身体唤醒度趋势 */
  awakeningTrend: { date: string; score: number }[]
  /** 最佳运动日 */
  bestDayOfWeek: string
  /** 最佳运动时段 */
  bestTimeOfDay: string
  /** 恢复建议 */
  recoverySuggestion: string
  /** 下一个目标建议 */
  nextGoalSuggestion: string
}

// ---- 元数据 ----

export const PLAN_TYPE_META: Record<PlanType, { label: string; icon: string; desc: string }> = {
  weight_loss: { label: '减脂', icon: '⚖️', desc: '以减脂为目标的运动计划' },
  muscle_build: { label: '增肌', icon: '💪', desc: '以增肌为目标的运动计划' },
  endurance: { label: '耐力', icon: '🏃', desc: '提升心肺耐力' },
  flexibility: { label: '柔韧', icon: '🤸', desc: '提升身体柔韧性' },
  general_health: { label: '健康', icon: '❤️', desc: '维持整体健康水平' },
  stress_relief: { label: '减压', icon: '🧘', desc: '以减压放松为目标' },
  custom: { label: '自定义', icon: '🎯', desc: '自定义运动计划' },
}

export const ACHIEVEMENT_TIER_META: Record<string, { label: string; color: string }> = {
  bronze: { label: '青铜', color: '#cd7f32' },
  silver: { label: '白银', color: '#c0c0c0' },
  gold: { label: '黄金', color: '#f0c040' },
  platinum: { label: '铂金', color: '#e5e4e2' },
  diamond: { label: '钻石', color: '#b9f2ff' },
}

export const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// ---- 预设运动计划 ----

const PRESET_PLANS: WorkoutPlan[] = [
  {
    id: 'plan_beginner_walk',
    name: '初心者步行计划',
    description: '适合运动新手的四周步行计划，循序渐进建立运动习惯',
    planType: 'general_health',
    weeklyTarget: 120,
    difficulty: 'easy',
    durationWeeks: 4,
    currentWeek: 1,
    active: false,
    dailySchedule: [
      { dayOfWeek: 1, activities: [{ type: 'walking', duration: 20, intensity: 'light', description: '轻松步行' }] },
      { dayOfWeek: 3, activities: [{ type: 'walking', duration: 25, intensity: 'light', description: '稍快步速' }] },
      { dayOfWeek: 5, activities: [{ type: 'walking', duration: 20, intensity: 'light', description: '放松步行' }] },
      { dayOfWeek: 6, activities: [{ type: 'stretching', duration: 15, intensity: 'light', description: '全身拉伸' }] },
    ],
    tags: ['入门', '步行', '习惯养成'],
  },
  {
    id: 'plan_runner_5k',
    name: '5 公里跑步计划',
    description: '八周训练计划，从零到完成 5 公里跑步',
    planType: 'endurance',
    weeklyTarget: 150,
    difficulty: 'moderate',
    durationWeeks: 8,
    currentWeek: 1,
    active: false,
    dailySchedule: [
      { dayOfWeek: 1, activities: [{ type: 'running', duration: 20, intensity: 'moderate', description: '慢跑+快走交替' }] },
      { dayOfWeek: 3, activities: [{ type: 'running', duration: 25, intensity: 'moderate', description: '持续慢跑' }] },
      { dayOfWeek: 5, activities: [{ type: 'strength', duration: 15, intensity: 'moderate', description: '核心力量训练' }] },
      { dayOfWeek: 6, activities: [{ type: 'running', duration: 30, intensity: 'moderate', description: '长距离慢跑' }] },
    ],
    tags: ['跑步', '5K', '耐力'],
  },
  {
    id: 'plan_yoga_flow',
    name: '流瑜伽日常',
    description: '每日瑜伽练习，提升柔韧性和身心平衡',
    planType: 'flexibility',
    weeklyTarget: 180,
    difficulty: 'easy',
    durationWeeks: 6,
    currentWeek: 1,
    active: false,
    dailySchedule: [
      { dayOfWeek: 1, activities: [{ type: 'yoga', duration: 30, intensity: 'light', description: '晨间唤醒流' }] },
      { dayOfWeek: 2, activities: [{ type: 'yoga', duration: 20, intensity: 'light', description: '基础体式练习' }] },
      { dayOfWeek: 3, activities: [{ type: 'yoga', duration: 30, intensity: 'moderate', description: '力量流' }] },
      { dayOfWeek: 4, activities: [{ type: 'yoga', duration: 20, intensity: 'light', description: '修复瑜伽' }] },
      { dayOfWeek: 5, activities: [{ type: 'yoga', duration: 30, intensity: 'moderate', description: '平衡与倒立' }] },
      { dayOfWeek: 6, activities: [{ type: 'yoga', duration: 45, intensity: 'moderate', description: '完整流瑜伽' }] },
      { dayOfWeek: 0, activities: [{ type: 'stretching', duration: 15, intensity: 'light', description: '深度拉伸' }] },
    ],
    tags: ['瑜伽', '柔韧', '每日'],
  },
  {
    id: 'plan_hiit_fire',
    name: 'HIIT 燃脂',
    description: '高强度间歇训练，四周高效燃脂',
    planType: 'weight_loss',
    weeklyTarget: 120,
    difficulty: 'hard',
    durationWeeks: 4,
    currentWeek: 1,
    active: false,
    dailySchedule: [
      { dayOfWeek: 1, activities: [{ type: 'hiit', duration: 20, intensity: 'vigorous', description: '全身HIIT' }] },
      { dayOfWeek: 2, activities: [{ type: 'walking', duration: 30, intensity: 'light', description: '恢复步行' }] },
      { dayOfWeek: 3, activities: [{ type: 'hiit', duration: 25, intensity: 'vigorous', description: '下肢HIIT' }] },
      { dayOfWeek: 4, activities: [{ type: 'stretching', duration: 20, intensity: 'light', description: '恢复拉伸' }] },
      { dayOfWeek: 5, activities: [{ type: 'hiit', duration: 20, intensity: 'vigorous', description: '核心HIIT' }] },
      { dayOfWeek: 6, activities: [{ type: 'strength', duration: 30, intensity: 'moderate', description: '力量训练' }] },
    ],
    tags: ['HIIT', '燃脂', '高强度'],
  },
  {
    id: 'plan_tai_chi_calm',
    name: '太极养心',
    description: '每日太极练习，调和身心，颐养元气',
    planType: 'stress_relief',
    weeklyTarget: 210,
    difficulty: 'easy',
    durationWeeks: 8,
    currentWeek: 1,
    active: false,
    dailySchedule: [
      { dayOfWeek: 1, activities: [{ type: 'tai_chi', duration: 30, intensity: 'light', description: '太极基本功' }] },
      { dayOfWeek: 2, activities: [{ type: 'tai_chi', duration: 30, intensity: 'light', description: '二十四式' }] },
      { dayOfWeek: 3, activities: [{ type: 'walking', duration: 30, intensity: 'light', description: '散步' }] },
      { dayOfWeek: 4, activities: [{ type: 'tai_chi', duration: 30, intensity: 'light', description: '太极基本功' }] },
      { dayOfWeek: 5, activities: [{ type: 'tai_chi', duration: 30, intensity: 'light', description: '二十四式' }] },
      { dayOfWeek: 6, activities: [{ type: 'tai_chi', duration: 30, intensity: 'light', description: '复习' }] },
      { dayOfWeek: 0, activities: [{ type: 'stretching', duration: 15, intensity: 'light', description: '放松拉伸' }] },
    ],
    tags: ['太极', '养心', '传统'],
  },
]

// ---- 预设成就 ----

const PRESET_ACHIEVEMENTS: MovementAchievement[] = [
  { id: 'ach_first_step', name: '第一步', description: '完成第一次运动记录', icon: '👣', condition: { type: 'total_minutes', threshold: 1, progress: 0 }, unlocked: false, tier: 'bronze' },
  { id: 'ach_100_min', name: '百分钟战士', description: '累计运动 100 分钟', icon: '⏱️', condition: { type: 'total_minutes', threshold: 100, progress: 0 }, unlocked: false, tier: 'bronze' },
  { id: 'ach_500_min', name: '五百分钟修行', description: '累计运动 500 分钟', icon: '🔥', condition: { type: 'total_minutes', threshold: 500, progress: 0 }, unlocked: false, tier: 'silver' },
  { id: 'ach_1000_min', name: '千分钟大师', description: '累计运动 1000 分钟', icon: '💎', condition: { type: 'total_minutes', threshold: 1000, progress: 0 }, unlocked: false, tier: 'gold' },
  { id: 'ach_5000_min', name: '五千分钟传奇', description: '累计运动 5000 分钟', icon: '👑', condition: { type: 'total_minutes', threshold: 5000, progress: 0 }, unlocked: false, tier: 'platinum' },
  { id: 'ach_10000_min', name: '万分钟不朽', description: '累计运动 10000 分钟', icon: '🌟', condition: { type: 'total_minutes', threshold: 10000, progress: 0 }, unlocked: false, tier: 'diamond' },
  { id: 'ach_streak_3', name: '三日坚持', description: '连续运动 3 天', icon: '🌱', condition: { type: 'streak_days', threshold: 3, progress: 0 }, unlocked: false, tier: 'bronze' },
  { id: 'ach_streak_7', name: '一周全勤', description: '连续运动 7 天', icon: '📅', condition: { type: 'streak_days', threshold: 7, progress: 0 }, unlocked: false, tier: 'silver' },
  { id: 'ach_streak_21', name: '习惯养成', description: '连续运动 21 天', icon: '🏆', condition: { type: 'streak_days', threshold: 21, progress: 0 }, unlocked: false, tier: 'gold' },
  { id: 'ach_streak_60', name: '钢铁意志', description: '连续运动 60 天', icon: '🦾', condition: { type: 'streak_days', threshold: 60, progress: 0 }, unlocked: false, tier: 'platinum' },
  { id: 'ach_calories_1000', name: '千卡燃烧', description: '累计消耗 1000 卡路里', icon: '🔥', condition: { type: 'calories', threshold: 1000, progress: 0 }, unlocked: false, tier: 'bronze' },
  { id: 'ach_calories_10000', name: '万卡熔炉', description: '累计消耗 10000 卡路里', icon: '🌋', condition: { type: 'calories', threshold: 10000, progress: 0 }, unlocked: false, tier: 'gold' },
  { id: 'ach_distance_42', name: '马拉松距离', description: '累计跑步 42 公里', icon: '🏅', condition: { type: 'distance', threshold: 42, progress: 0 }, unlocked: false, tier: 'silver' },
  { id: 'ach_distance_100', name: '百公里行者', description: '累计运动 100 公里', icon: '🛣️', condition: { type: 'distance', threshold: 100, progress: 0 }, unlocked: false, tier: 'gold' },
  { id: 'ach_type_3', name: '三项全能', description: '尝试 3 种不同运动类型', icon: '🎯', condition: { type: 'type_count', threshold: 3, progress: 0 }, unlocked: false, tier: 'bronze' },
  { id: 'ach_type_5', name: '五项全能', description: '尝试 5 种不同运动类型', icon: '⭐', condition: { type: 'type_count', threshold: 5, progress: 0 }, unlocked: false, tier: 'silver' },
  { id: 'ach_type_8', name: '八面玲珑', description: '尝试 8 种不同运动类型', icon: '🌈', condition: { type: 'type_count', threshold: 8, progress: 0 }, unlocked: false, tier: 'gold' },
  { id: 'ach_weekly_goal_4', name: '月度达标', description: '连续 4 周达成周目标', icon: '📊', condition: { type: 'weekly_goal', threshold: 4, progress: 0 }, unlocked: false, tier: 'silver' },
  { id: 'ach_weekly_goal_12', name: '季度之星', description: '连续 12 周达成周目标', icon: '🏅', condition: { type: 'weekly_goal', threshold: 12, progress: 0 }, unlocked: false, tier: 'gold' },
  { id: 'ach_weekly_goal_52', name: '全年无休', description: '连续 52 周达成周目标', icon: '👑', condition: { type: 'weekly_goal', threshold: 52, progress: 0 }, unlocked: false, tier: 'diamond' },
]

// ---- 存储键 ----

const PLANS_KEY = 'hf:movement:plans'
const ACHIEVEMENTS_KEY = 'hf:movement:achievements'

// ---- 响应式状态 ----

const plans = ref<WorkoutPlan[]>(loadPlans())
const achievements = ref<MovementAchievement[]>(loadAchievements())

function loadPlans(): WorkoutPlan[] {
  try {
    const saved = storage.getKV<WorkoutPlan[]>(PLANS_KEY, [])
    return saved.length > 0 ? saved : PRESET_PLANS.map(p => ({ ...p }))
  } catch { return PRESET_PLANS.map(p => ({ ...p })) }
}

function loadAchievements(): MovementAchievement[] {
  try {
    const saved = storage.getKV<MovementAchievement[]>(ACHIEVEMENTS_KEY, [])
    return saved.length > 0 ? saved : PRESET_ACHIEVEMENTS.map(a => ({ ...a }))
  } catch { return PRESET_ACHIEVEMENTS.map(a => ({ ...a })) }
}

function persistPlans() { storage.setKV(PLANS_KEY, plans.value) }
function persistAchievements() { storage.setKV(ACHIEVEMENTS_KEY, achievements.value) }

let counter = 0
function generateId(prefix: string): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}

// ---- 运动计划 ----

/**
 * 运动计划系统
 */
export function useWorkoutPlans() {
  /** 获取所有计划 */
  function getPlans(): WorkoutPlan[] {
    return plans.value
  }

  /** 获取活跃计划 */
  function getActivePlan(): WorkoutPlan | undefined {
    return plans.value.find(p => p.active)
  }

  /** 获取今日训练 */
  function getTodayWorkout(): DailyWorkout | undefined {
    const activePlan = getActivePlan()
    if (!activePlan) return undefined
    const today = new Date().getDay()
    return activePlan.dailySchedule.find(d => d.dayOfWeek === today)
  }

  /** 激活计划 */
  function activatePlan(planId: string): boolean {
    // 停用其他计划
    for (const p of plans.value) {
      p.active = p.id === planId
    }
    persistPlans()
    return true
  }

  /** 停用计划 */
  function deactivatePlan(): boolean {
    for (const p of plans.value) {
      p.active = false
    }
    persistPlans()
    return true
  }

  /** 创建自定义计划 */
  function createPlan(
    name: string,
    planType: PlanType,
    weeklyTarget: number,
    difficulty: 'easy' | 'moderate' | 'hard' | 'extreme',
    durationWeeks: number,
    dailySchedule: DailyWorkout[],
    tags: string[] = [],
  ): WorkoutPlan {
    const plan: WorkoutPlan = {
      id: generateId('plan'),
      name,
      description: '',
      planType,
      weeklyTarget,
      difficulty,
      durationWeeks,
      currentWeek: 1,
      active: false,
      dailySchedule,
      tags,
    }
    plans.value.push(plan)
    persistPlans()
    return plan
  }

  /** 更新计划进度 */
  function advanceWeek(planId: string): boolean {
    const plan = plans.value.find(p => p.id === planId)
    if (!plan || plan.currentWeek >= plan.durationWeeks) return false
    plan.currentWeek++
    persistPlans()
    return true
  }

  /** 按类型获取预设计划 */
  function getPresetPlansByType(planType: PlanType): WorkoutPlan[] {
    return plans.value.filter(p => p.planType === planType && p.id.startsWith('plan_'))
  }

  return {
    plans: computed(() => plans.value),
    getPlans,
    getActivePlan,
    getTodayWorkout,
    activatePlan,
    deactivatePlan,
    createPlan,
    advanceWeek,
    getPresetPlansByType,
  }
}

// ---- 成就系统 ----

/**
 * 运动成就系统
 */
export function useMovementAchievements() {
  /** 获取所有成就 */
  function getAchievements(): MovementAchievement[] {
    return achievements.value
  }

  /** 获取已解锁成就 */
  function getUnlockedAchievements(): MovementAchievement[] {
    return achievements.value.filter(a => a.unlocked)
  }

  /** 获取未解锁成就 */
  function getLockedAchievements(): MovementAchievement[] {
    return achievements.value.filter(a => !a.unlocked)
  }

  /** 按等级获取 */
  function getByTier(tier: string): MovementAchievement[] {
    return achievements.value.filter(a => a.tier === tier)
  }

  /** 根据运动数据更新成就进度 */
  function updateAchievements(records: MovementRecord[], rhythm: MovementRhythm) {
    const totalMinutes = records.reduce((sum, r) => sum + r.duration, 0)
    const totalCalories = records.reduce((sum, r) => sum + (r.calories || 0), 0)
    const totalDistance = records.reduce((sum, r) => sum + (r.distance || 0), 0)
    const uniqueTypes = new Set(records.map(r => r.type)).size
    const streak = rhythm.streak

    let hasNewUnlock = false

    for (const achievement of achievements.value) {
      if (achievement.unlocked) continue

      let progress = 0
      switch (achievement.condition.type) {
        case 'total_minutes':
          progress = totalMinutes
          break
        case 'streak_days':
          progress = streak
          break
        case 'type_count':
          progress = uniqueTypes
          break
        case 'calories':
          progress = totalCalories
          break
        case 'distance':
          progress = Math.round(totalDistance)
          break
        case 'weekly_goal':
          progress = calculateWeeklyGoalStreak(records, rhythm)
          break
      }

      achievement.condition.progress = Math.min(progress, achievement.condition.threshold)

      if (progress >= achievement.condition.threshold) {
        achievement.unlocked = true
        achievement.unlockedAt = new Date().toISOString()
        hasNewUnlock = true
      }
    }

    if (hasNewUnlock) {
      persistAchievements()
    }

    return hasNewUnlock
  }

  /** 获取成就统计 */
  function getAchievementStats(): {
    total: number
    unlocked: number
    completionRate: number
    tierBreakdown: Record<string, { total: number; unlocked: number }>
  } {
    const total = achievements.value.length
    const unlocked = achievements.value.filter(a => a.unlocked).length
    const tierBreakdown: Record<string, { total: number; unlocked: number }> = {}

    for (const a of achievements.value) {
      if (!tierBreakdown[a.tier]) tierBreakdown[a.tier] = { total: 0, unlocked: 0 }
      tierBreakdown[a.tier].total++
      if (a.unlocked) tierBreakdown[a.tier].unlocked++
    }

    return {
      total,
      unlocked,
      completionRate: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      tierBreakdown,
    }
  }

  return {
    achievements: computed(() => achievements.value),
    getAchievements,
    getUnlockedAchievements,
    getLockedAchievements,
    getByTier,
    updateAchievements,
    getAchievementStats,
  }
}

// ---- 节奏分析 ----

/**
 * 运动节奏分析
 */
export function useRhythmAnalysis() {
  /** 分析运动节奏 */
  function analyzeRhythm(
    records: MovementRecord[],
    rhythm: MovementRhythm,
  ): RhythmAnalysis {
    if (records.length === 0) {
      return {
        frequencyScore: 0,
        varietyScore: 0,
        intensityDistribution: { light: 0, moderate: 0, vigorous: 0, extreme: 0 },
        typeDistribution: [],
        weeklyTrend: [],
        awakeningTrend: [],
        bestDayOfWeek: '暂无数据',
        bestTimeOfDay: '暂无数据',
        recoverySuggestion: '尚未开始运动，建议从轻度运动开始',
        nextGoalSuggestion: '设定每周 150 分钟的运动目标',
      }
    }

    const totalMinutes = records.reduce((sum, r) => sum + r.duration, 0)
    const totalSessions = records.length

    // 频率评分
    const daysActive = new Set(records.map(r => r.date)).size
    const daysInRange = Math.max(1, daysActive)
    const frequencyScore = Math.min(100, Math.round((daysActive / Math.min(daysInRange, 30)) * 100))

    // 多样性评分
    const uniqueTypes = new Set(records.map(r => r.type)).size
    const varietyScore = Math.min(100, Math.round((uniqueTypes / 12) * 100))

    // 强度分布
    const intensityDistribution: Record<MovementIntensity, number> = {
      light: 0, moderate: 0, vigorous: 0, extreme: 0,
    }
    for (const r of records) {
      intensityDistribution[r.intensity] = (intensityDistribution[r.intensity] || 0) + 1
    }

    // 类型分布
    const typeMinutes: Record<string, number> = {}
    for (const r of records) {
      typeMinutes[r.type] = (typeMinutes[r.type] || 0) + r.duration
    }
    const typeDistribution = Object.entries(typeMinutes)
      .map(([type, minutes]) => ({
        type: type as MovementType,
        minutes,
        percentage: Math.round((minutes / totalMinutes) * 100),
      }))
      .sort((a, b) => b.minutes - a.minutes)

    // 周度趋势
    const weeklyTrend = generateWeeklyTrend(records)

    // 唤醒度趋势
    const awakeningTrend = generateAwakeningTrend(records)

    // 最佳运动日
    const dayCounts: Record<number, number> = {}
    for (const r of records) {
      const day = new Date(r.timestamp).getDay()
      dayCounts[day] = (dayCounts[day] || 0) + 1
    }
    let bestDay = 0
    let maxDayCount = 0
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxDayCount) {
        maxDayCount = count
        bestDay = parseInt(day)
      }
    }

    // 最佳时段
    const hourCounts: Record<number, number> = {}
    for (const r of records) {
      const hour = new Date(r.timestamp).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }
    let bestHour = 7
    let maxHourCount = 0
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxHourCount) {
        maxHourCount = count
        bestHour = parseInt(hour)
      }
    }
    let bestTimeOfDay = '上午'
    if (bestHour < 6) bestTimeOfDay = '凌晨'
    else if (bestHour < 9) bestTimeOfDay = '清晨'
    else if (bestHour < 12) bestTimeOfDay = '上午'
    else if (bestHour < 14) bestTimeOfDay = '中午'
    else if (bestHour < 18) bestTimeOfDay = '下午'
    else bestTimeOfDay = '晚上'

    // 恢复建议
    let recoverySuggestion = '保持当前运动节奏'
    if (intensityDistribution.vigorous + intensityDistribution.extreme > totalSessions * 0.5) {
      recoverySuggestion = '高强度运动较多，建议增加恢复日和轻度运动'
    } else if (intensityDistribution.light > totalSessions * 0.8) {
      recoverySuggestion = '运动强度偏低，可适当增加中等强度运动'
    } else {
      recoverySuggestion = '运动强度分布合理，继续保持'
    }

    // 下一个目标
    let nextGoalSuggestion = '保持每周运动习惯'
    if (uniqueTypes < 3) {
      nextGoalSuggestion = '尝试新的运动类型，增加运动多样性'
    } else if (rhythm.streak < 7) {
      nextGoalSuggestion = '挑战连续运动 7 天'
    } else if (rhythm.weeklyCompleted < rhythm.weeklyTarget) {
      nextGoalSuggestion = `本周还需 ${rhythm.weeklyTarget - rhythm.weeklyCompleted} 分钟达成周目标`
    } else {
      nextGoalSuggestion = '尝试提高运动强度或时长，挑战新成就'
    }

    return {
      frequencyScore,
      varietyScore,
      intensityDistribution,
      typeDistribution,
      weeklyTrend,
      awakeningTrend,
      bestDayOfWeek: DAY_NAMES[bestDay],
      bestTimeOfDay,
      recoverySuggestion,
      nextGoalSuggestion,
    }
  }

  return {
    analyzeRhythm,
  }
}

// ---- 辅助函数 ----

function calculateWeeklyGoalStreak(records: MovementRecord[], rhythm: MovementRhythm): number {
  // 简单实现：检查连续达标周数
  const weeklyMinutes: Record<string, number> = {}
  for (const r of records) {
    const d = new Date(r.timestamp)
    const weekStart = new Date(d.getTime() - d.getDay() * 24 * 60 * 60 * 1000)
    const weekKey = getLocalDateKey(weekStart)
    weeklyMinutes[weekKey] = (weeklyMinutes[weekKey] || 0) + r.duration
  }

  let streak = 0
  const sortedWeeks = Object.keys(weeklyMinutes).sort()
  for (const week of sortedWeeks) {
    if (weeklyMinutes[week] >= rhythm.weeklyTarget) {
      streak++
    } else {
      streak = 0
    }
  }
  return streak
}

function generateWeeklyTrend(records: MovementRecord[]): { week: string; minutes: number; sessions: number }[] {
  const weeklyData: Record<string, { minutes: number; sessions: number }> = {}
  for (const r of records) {
    const d = new Date(r.timestamp)
    const weekStart = new Date(d.getTime() - d.getDay() * 24 * 60 * 60 * 1000)
    const weekKey = getLocalDateKey(weekStart)
    if (!weeklyData[weekKey]) weeklyData[weekKey] = { minutes: 0, sessions: 0 }
    weeklyData[weekKey].minutes += r.duration
    weeklyData[weekKey].sessions++
  }

  return Object.entries(weeklyData)
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12)
}

function generateAwakeningTrend(records: MovementRecord[]): { date: string; score: number }[] {
  const dailyScores: Record<string, number> = {}
  for (const r of records) {
    const date = r.date
    const intensityMul = MOVEMENT_INTENSITY_META[r.intensity].multiplier
    dailyScores[date] = (dailyScores[date] || 0) + r.duration * intensityMul
  }

  const now = new Date()
  const trend: { date: string; score: number }[] = []
  for (let d = 29; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
    const dateStr = getLocalDateKey(date)
    trend.push({
      date: dateStr,
      score: Math.min(100, Math.round((dailyScores[dateStr] || 0) * 0.5)),
    })
  }
  return trend
}

// ---- 存储键 ----

export const MOVEMENT_ADVANCED_STORAGE_KEYS = {
  PLANS: PLANS_KEY,
  ACHIEVEMENTS: ACHIEVEMENTS_KEY,
} as const