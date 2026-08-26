// ============================================================
// 身体温室 · 运动追踪引擎（P19-4）
// 运动记录、统计分析、趋势预测、目标管理、个性化推荐
// ============================================================

import { ref } from 'vue'
import type { BodyMetric } from './types'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 运动类型 */
export type ExerciseType =
  | 'cardio'       // 有氧运动
  | 'strength'     // 力量训练
  | 'flexibility'  // 柔韧性训练
  | 'balance'      // 平衡训练
  | 'hiit'         // 高强度间歇训练
  | 'walking'      // 步行
  | 'running'      // 跑步
  | 'cycling'      // 骑行
  | 'swimming'     // 游泳
  | 'yoga'         // 瑜伽
  | 'dance'        // 舞蹈
  | 'sports'       // 球类运动
  | 'other'        // 其他

/** 运动强度 */
export type ExerciseIntensity = 'light' | 'moderate' | 'vigorous' | 'extreme'

/** 单条运动记录 */
export interface ExerciseRecord {
  id: string
  /** 运动类型 */
  type: ExerciseType
  /** 运动名称 */
  name: string
  /** 持续时间（分钟） */
  duration: number
  /** 运动强度 */
  intensity: ExerciseIntensity
  /** 消耗热量（千卡） */
  calories: number
  /** 运动后情绪评分 1-10 */
  moodAfter: number
  /** 运动后精力评分 1-5 */
  energyAfter: number
  /** 备注 */
  note?: string
  /** 日期 */
  date: string
  /** 时间戳 */
  timestamp: string
  /** 完成度 0-1 */
  completion: number
  /** 心率数据（可选） */
  heartRate?: {
    avg: number
    max: number
    min: number
  }
  /** 运动地点 */
  location?: string
}

/** 运动统计 */
export interface ExerciseStats {
  /** 总运动次数 */
  totalWorkouts: number
  /** 总运动时长（分钟） */
  totalDuration: number
  /** 总消耗热量（千卡） */
  totalCalories: number
  /** 平均强度 */
  avgIntensity: ExerciseIntensity
  /** 最常运动类型 */
  favoriteType: ExerciseType | null
  /** 连续运动天数 */
  streak: number
  /** 最长连续运动天数 */
  longestStreak: number
  /** 本周运动次数 */
  weeklyWorkouts: number
  /** 本周运动时长（分钟） */
  weeklyDuration: number
  /** 本月运动次数 */
  monthlyWorkouts: number
  /** 本月运动时长（分钟） */
  monthlyDuration: number
  /** 平均运动后情绪 */
  avgMoodAfter: number
  /** 情绪-运动关联度 0-1 */
  moodCorrelation: number
  /** 运动达标率 0-1 */
  goalAchievementRate: number
  /** 各类型运动分布 */
  typeDistribution: Record<ExerciseType, number>
  /** 按周分布 */
  weeklyDistribution: { weekStart: string; workouts: number; duration: number }[]
}

/** 运动目标 */
export interface ExerciseGoal {
  id: string
  /** 目标名称 */
  name: string
  /** 目标类型 */
  targetType: 'weekly_workouts' | 'weekly_duration' | 'daily_duration' | 'calories' | 'streak' | 'type_specific'
  /** 目标值 */
  targetValue: number
  /** 当前值 */
  currentValue: number
  /** 单位 */
  unit: string
  /** 运动类型（仅 type_specific） */
  exerciseType?: ExerciseType
  /** 起始日期 */
  startDate: string
  /** 目标日期 */
  targetDate: string
  /** 进度 0-1 */
  progress: number
  /** 状态 */
  status: 'active' | 'achieved' | 'failed' | 'paused'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt: string
}

/** 运动趋势 */
export interface ExerciseTrend {
  /** 周期 */
  period: 'week' | 'month' | 'quarter'
  /** 周期起始 */
  periodStart: string
  /** 周期结束 */
  periodEnd: string
  /** 每日数据 */
  dailyData: {
    date: string
    duration: number
    calories: number
    workouts: number
    avgIntensity: number
  }[]
  /** 趋势方向 */
  direction: 'improving' | 'declining' | 'stable'
  /** 趋势斜率（每周变化量） */
  slope: number
  /** 总运动时长 */
  totalDuration: number
  /** 总消耗热量 */
  totalCalories: number
  /** 日均运动时长 */
  avgDailyDuration: number
  /** 运动频率 */
  workoutFrequency: number
  /** 趋势洞察 */
  insight: string
}

/** 运动推荐 */
export interface ExerciseRecommendation {
  /** 推荐运动类型 */
  type: ExerciseType
  /** 推荐名称 */
  name: string
  /** 推荐时长（分钟） */
  duration: number
  /** 推荐强度 */
  intensity: ExerciseIntensity
  /** 预计消耗热量 */
  estimatedCalories: number
  /** 推荐理由 */
  reason: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 适合时间 */
  suggestedTime: string
  /** 注意事项 */
  precautions: string[]
}

// ============================================================
// 常量
// ============================================================

/** 运动类型元数据 */
const EXERCISE_TYPE_META: Record<ExerciseType, {
  label: string
  icon: string
  caloriesPerMinute: Record<ExerciseIntensity, number>
  targetMuscles: string[]
}> = {
  cardio: {
    label: '有氧运动', icon: '🏃',
    caloriesPerMinute: { light: 4, moderate: 7, vigorous: 10, extreme: 14 },
    targetMuscles: ['心肺', '全身'],
  },
  strength: {
    label: '力量训练', icon: '🏋️',
    caloriesPerMinute: { light: 3, moderate: 5, vigorous: 8, extreme: 11 },
    targetMuscles: ['上肢', '下肢', '核心'],
  },
  flexibility: {
    label: '柔韧性训练', icon: '🧘',
    caloriesPerMinute: { light: 2, moderate: 3, vigorous: 5, extreme: 7 },
    targetMuscles: ['全身', '关节'],
  },
  balance: {
    label: '平衡训练', icon: '🦶',
    caloriesPerMinute: { light: 2, moderate: 3, vigorous: 4, extreme: 6 },
    targetMuscles: ['核心', '下肢'],
  },
  hiit: {
    label: 'HIIT', icon: '⚡',
    caloriesPerMinute: { light: 6, moderate: 10, vigorous: 14, extreme: 18 },
    targetMuscles: ['全身', '心肺'],
  },
  walking: {
    label: '步行', icon: '🚶',
    caloriesPerMinute: { light: 3, moderate: 4, vigorous: 6, extreme: 8 },
    targetMuscles: ['下肢', '心肺'],
  },
  running: {
    label: '跑步', icon: '🏃‍♂️',
    caloriesPerMinute: { light: 6, moderate: 9, vigorous: 12, extreme: 16 },
    targetMuscles: ['下肢', '心肺'],
  },
  cycling: {
    label: '骑行', icon: '🚴',
    caloriesPerMinute: { light: 4, moderate: 7, vigorous: 10, extreme: 14 },
    targetMuscles: ['下肢', '心肺'],
  },
  swimming: {
    label: '游泳', icon: '🏊',
    caloriesPerMinute: { light: 5, moderate: 8, vigorous: 11, extreme: 15 },
    targetMuscles: ['全身', '心肺'],
  },
  yoga: {
    label: '瑜伽', icon: '🧘‍♀️',
    caloriesPerMinute: { light: 2, moderate: 3, vigorous: 5, extreme: 6 },
    targetMuscles: ['全身', '柔韧性'],
  },
  dance: {
    label: '舞蹈', icon: '💃',
    caloriesPerMinute: { light: 3, moderate: 5, vigorous: 8, extreme: 11 },
    targetMuscles: ['全身', '心肺'],
  },
  sports: {
    label: '球类运动', icon: '⚽',
    caloriesPerMinute: { light: 4, moderate: 6, vigorous: 9, extreme: 13 },
    targetMuscles: ['全身', '协调性'],
  },
  other: {
    label: '其他', icon: '🎯',
    caloriesPerMinute: { light: 3, moderate: 5, vigorous: 7, extreme: 10 },
    targetMuscles: ['全身'],
  },
}

/** 运动存储键 */
const EXERCISE_STORAGE_KEY = 'hf:body:exercise:records'
const EXERCISE_GOALS_KEY = 'hf:body:exercise:goals'

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadExerciseRecords(): ExerciseRecord[] {
  try { return JSON.parse(storage.getKV<string>(EXERCISE_STORAGE_KEY, '[]')) } catch { return [] }
}
function saveExerciseRecords(data: ExerciseRecord[]) {
  storage.setKV(EXERCISE_STORAGE_KEY, JSON.stringify(data))
}

function loadExerciseGoals(): ExerciseGoal[] {
  try { return JSON.parse(storage.getKV<string>(EXERCISE_GOALS_KEY, '[]')) } catch { return [] }
}
function saveExerciseGoals(data: ExerciseGoal[]) {
  storage.setKV(EXERCISE_GOALS_KEY, JSON.stringify(data))
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function dayDiff(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000)
}

// ============================================================
// useExerciseTracker Composable
// ============================================================

export function useExerciseTracker() {
  // ---- 状态 ----
  const records = ref<ExerciseRecord[]>(loadExerciseRecords())
  const goals = ref<ExerciseGoal[]>(loadExerciseGoals())

  // ============================================================
  // 运动记录
  // ============================================================

  /**
   * 记录一次运动
   */
  function logExercise(params: {
    type: ExerciseType
    name: string
    duration: number
    intensity: ExerciseIntensity
    moodAfter?: number
    energyAfter?: number
    note?: string
    completion?: number
    heartRate?: { avg: number; max: number; min: number }
    location?: string
  }): ExerciseRecord {
    const meta = EXERCISE_TYPE_META[params.type]
    const estCalories = Math.round(
      meta.caloriesPerMinute[params.intensity] * params.duration * (params.completion ?? 1),
    )

    const record: ExerciseRecord = {
      id: generateId(),
      type: params.type,
      name: params.name,
      duration: params.duration,
      intensity: params.intensity,
      calories: estCalories,
      moodAfter: params.moodAfter ?? 5,
      energyAfter: params.energyAfter ?? 3,
      note: params.note,
      date: getTodayStr(),
      timestamp: new Date().toISOString(),
      completion: params.completion ?? 1,
      heartRate: params.heartRate,
      location: params.location,
    }

    records.value = [...records.value, record]
    saveExerciseRecords(records.value)
    updateGoalProgress()
    return record
  }

  /**
   * 获取运动记录
   */
  function getRecords(options: {
    type?: ExerciseType
    dateFrom?: string
    dateTo?: string
    limit?: number
  } = {}): ExerciseRecord[] {
    let filtered = [...records.value]

    if (options.type) {
      filtered = filtered.filter(r => r.type === options.type)
    }
    if (options.dateFrom) {
      filtered = filtered.filter(r => r.date >= options.dateFrom!)
    }
    if (options.dateTo) {
      filtered = filtered.filter(r => r.date <= options.dateTo!)
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (options.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  /**
   * 获取今日运动记录
   */
  function getTodayRecords(): ExerciseRecord[] {
    return getRecords({ dateFrom: getTodayStr(), dateTo: getTodayStr() })
  }

  /**
   * 删除运动记录
   */
  function removeRecord(id: string): boolean {
    const idx = records.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    records.value = records.value.filter(r => r.id !== id)
    saveExerciseRecords(records.value)
    return true
  }

  // ============================================================
  // 运动统计
  // ============================================================

  /**
   * 获取运动统计
   */
  function getExerciseStats(period?: 'week' | 'month' | 'all'): ExerciseStats {
    const allRecords = records.value

    // 按周期过滤
    let filtered = allRecords
    if (period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      filtered = allRecords.filter(r => r.date >= weekAgo)
    } else if (period === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      filtered = allRecords.filter(r => r.date >= monthAgo)
    }

    // 本周/本月数据
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const weeklyRecords = allRecords.filter(r => r.date >= weekAgo)
    const monthlyRecords = allRecords.filter(r => r.date >= monthAgo)

    const totalDuration = filtered.reduce((s, r) => s + r.duration, 0)
    const totalCalories = filtered.reduce((s, r) => s + r.calories, 0)

    // 平均强度
    const intensityOrder: ExerciseIntensity[] = ['light', 'moderate', 'vigorous', 'extreme']
    const avgIntensityIdx = filtered.length > 0
      ? Math.round(filtered.reduce((s, r) => s + intensityOrder.indexOf(r.intensity), 0) / filtered.length)
      : 1
    const avgIntensity = intensityOrder[Math.min(avgIntensityIdx, intensityOrder.length - 1)]

    // 最常运动类型
    const typeCount: Record<string, number> = {}
    filtered.forEach(r => { typeCount[r.type] = (typeCount[r.type] || 0) + 1 })
    let favoriteType: ExerciseType | null = null
    let maxCount = 0
    for (const [t, c] of Object.entries(typeCount)) {
      if (c > maxCount) { maxCount = c; favoriteType = t as ExerciseType }
    }

    // 连续运动天数
    const streak = computeStreak(allRecords)
    const longestStreak = computeLongestStreak(allRecords)

    // 情绪关联
    const avgMoodAfter = filtered.length > 0
      ? Math.round(filtered.reduce((s, r) => s + r.moodAfter, 0) / filtered.length * 10) / 10
      : 0

    // 情绪-运动关联度
    const moodCorrelation = computeMoodCorrelation(allRecords)

    // 各类型运动分布
    const allTypes = Object.keys(EXERCISE_TYPE_META) as ExerciseType[]
    const typeDistribution: Record<ExerciseType, number> = {} as Record<ExerciseType, number>
    allTypes.forEach(t => {
      typeDistribution[t] = filtered.filter(r => r.type === t).length
    })

    // 按周分布
    const weeklyDistribution = computeWeeklyDistribution(allRecords)

    return {
      totalWorkouts: filtered.length,
      totalDuration,
      totalCalories,
      avgIntensity,
      favoriteType,
      streak,
      longestStreak,
      weeklyWorkouts: weeklyRecords.length,
      weeklyDuration: weeklyRecords.reduce((s, r) => s + r.duration, 0),
      monthlyWorkouts: monthlyRecords.length,
      monthlyDuration: monthlyRecords.reduce((s, r) => s + r.duration, 0),
      avgMoodAfter,
      moodCorrelation,
      goalAchievementRate: computeGoalAchievementRate(),
      typeDistribution,
      weeklyDistribution,
    }
  }

  // ============================================================
  // 运动趋势
  // ============================================================

  /**
   * 计算运动趋势
   */
  function computeExerciseTrend(
    period: 'week' | 'month' | 'quarter' = 'month',
  ): ExerciseTrend {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 86400000)
    const periodStart = startDate.toISOString().split('T')[0]
    const periodEnd = endDate.toISOString().split('T')[0]

    const allRecords = records.value.filter(r =>
      r.date >= periodStart && r.date <= periodEnd,
    )

    // 每日数据
    const dailyDataMap = new Map<string, { duration: number; calories: number; workouts: number; intensities: number[] }>()

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 86400000).toISOString().split('T')[0]
      dailyDataMap.set(date, { duration: 0, calories: 0, workouts: 0, intensities: [] })
    }

    const intensityOrder: ExerciseIntensity[] = ['light', 'moderate', 'vigorous', 'extreme']

    for (const r of allRecords) {
      const existing = dailyDataMap.get(r.date)
      if (existing) {
        existing.duration += r.duration
        existing.calories += r.calories
        existing.workouts++
        existing.intensities.push(intensityOrder.indexOf(r.intensity))
      }
    }

    const dailyData = Array.from(dailyDataMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        duration: data.duration,
        calories: data.calories,
        workouts: data.workouts,
        avgIntensity: data.intensities.length > 0
          ? Math.round(data.intensities.reduce((s, i) => s + i + 1, 0) / data.intensities.length * 10) / 10
          : 0,
      }))

    const totalDuration = dailyData.reduce((s, d) => s + d.duration, 0)
    const totalCalories = dailyData.reduce((s, d) => s + d.calories, 0)
    const avgDailyDuration = days > 0 ? Math.round(totalDuration / days * 10) / 10 : 0
    const workoutFrequency = days > 0 ? Math.round((dailyData.filter(d => d.workouts > 0).length / days) * 100) / 100 : 0

    // 趋势方向和斜率
    const { direction, slope } = computeTrendDirection(dailyData)

    // 洞察
    const insight = generateTrendInsight(direction, slope, avgDailyDuration, workoutFrequency, dailyData)

    return {
      period,
      periodStart,
      periodEnd,
      dailyData,
      direction,
      slope,
      totalDuration,
      totalCalories,
      avgDailyDuration,
      workoutFrequency,
      insight,
    }
  }

  // ============================================================
  // 运动目标管理
  // ============================================================

  /**
   * 设置运动目标
   */
  function setExerciseGoal(params: {
    name: string
    targetType: ExerciseGoal['targetType']
    targetValue: number
    unit: string
    exerciseType?: ExerciseType
    targetDate: string
    priority?: ExerciseGoal['priority']
  }): ExerciseGoal {
    const goal: ExerciseGoal = {
      id: generateId(),
      name: params.name,
      targetType: params.targetType,
      targetValue: params.targetValue,
      currentValue: 0,
      unit: params.unit,
      exerciseType: params.exerciseType,
      startDate: getTodayStr(),
      targetDate: params.targetDate,
      progress: 0,
      status: 'active',
      priority: params.priority ?? 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    goals.value = [...goals.value, goal]
    saveExerciseGoals(goals.value)
    updateGoalProgress()
    return goal
  }

  /**
   * 更新目标进度
   */
  function updateGoalProgress(): void {
    const stats = getExerciseStats()

    for (const goal of goals.value) {
      if (goal.status !== 'active') continue

      let currentValue = 0
      switch (goal.targetType) {
        case 'weekly_workouts':
          currentValue = stats.weeklyWorkouts
          break
        case 'weekly_duration':
          currentValue = stats.weeklyDuration
          break
        case 'daily_duration': {
          const today = getTodayRecords()
          currentValue = today.reduce((s, r) => s + r.duration, 0)
          break
        }
        case 'calories':
          currentValue = stats.totalCalories
          break
        case 'streak':
          currentValue = stats.streak
          break
        case 'type_specific': {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
          const typeRecords = records.value.filter(
            r => r.type === goal.exerciseType && r.date >= weekAgo,
          )
          currentValue = typeRecords.length
          break
        }
      }

      goal.currentValue = currentValue
      goal.progress = goal.targetValue > 0
        ? Math.min(1, currentValue / goal.targetValue)
        : 0

      if (goal.progress >= 1) {
        goal.status = 'achieved'
      }

      goal.updatedAt = new Date().toISOString()
    }

    saveExerciseGoals(goals.value)
  }

  /**
   * 获取活跃目标
   */
  function getActiveGoals(): ExerciseGoal[] {
    return goals.value.filter(g => g.status === 'active')
  }

  /**
   * 暂停/恢复目标
   */
  function toggleGoalStatus(goalId: string): ExerciseGoal | undefined {
    const goal = goals.value.find(g => g.id === goalId)
    if (!goal) return undefined
    goal.status = goal.status === 'active' ? 'paused' : 'active'
    goal.updatedAt = new Date().toISOString()
    saveExerciseGoals(goals.value)
    return goal
  }

  /**
   * 删除目标
   */
  function removeGoal(goalId: string): boolean {
    const idx = goals.value.findIndex(g => g.id === goalId)
    if (idx === -1) return false
    goals.value = goals.value.filter(g => g.id !== goalId)
    saveExerciseGoals(goals.value)
    return true
  }

  // ============================================================
  // 周总结
  // ============================================================

  /**
   * 获取每周运动总结
   */
  function getWeeklySummary(weekStart?: string): {
    weekStart: string
    weekEnd: string
    totalWorkouts: number
    totalDuration: number
    totalCalories: number
    avgDuration: number
    bestDay: { date: string; duration: number; calories: number } | null
    restDays: number
    typeBreakdown: { type: ExerciseType; label: string; count: number; duration: number }[]
    moodTrend: 'improving' | 'declining' | 'stable'
    summary: string
    nextWeekTips: string[]
  } {
    const start = weekStart
      ? new Date(weekStart)
      : (() => {
          const now = new Date()
          const day = now.getDay()
          const diff = now.getDate() - day + (day === 0 ? -6 : 1)
          return new Date(now.setDate(diff))
        })()

    const end = new Date(start.getTime() + 6 * 86400000)
    const weekStartStr = start.toISOString().split('T')[0]
    const weekEndStr = end.toISOString().split('T')[0]

    const weekRecords = records.value.filter(
      r => r.date >= weekStartStr && r.date <= weekEndStr,
    )

    const totalWorkouts = weekRecords.length
    const totalDuration = weekRecords.reduce((s, r) => s + r.duration, 0)
    const totalCalories = weekRecords.reduce((s, r) => s + r.calories, 0)
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / 7) : 0

    // 最佳日
    let bestDay: { date: string; duration: number; calories: number } | null = null
    const dayAgg: Record<string, { duration: number; calories: number }> = {}
    weekRecords.forEach(r => {
      if (!dayAgg[r.date]) dayAgg[r.date] = { duration: 0, calories: 0 }
      dayAgg[r.date].duration += r.duration
      dayAgg[r.date].calories += r.calories
    })
    for (const [date, data] of Object.entries(dayAgg)) {
      if (!bestDay || data.duration > bestDay.duration) {
        bestDay = { date, duration: data.duration, calories: data.calories }
      }
    }

    // 休息天数
    const activeDays = new Set(weekRecords.map(r => r.date))
    const restDays = 7 - activeDays.size

    // 类型细分
    const typeBreakdown: { type: ExerciseType; label: string; count: number; duration: number }[] = []
    const typeMap: Record<string, { count: number; duration: number }> = {}
    weekRecords.forEach(r => {
      if (!typeMap[r.type]) typeMap[r.type] = { count: 0, duration: 0 }
      typeMap[r.type].count++
      typeMap[r.type].duration += r.duration
    })
    for (const [type, data] of Object.entries(typeMap)) {
      typeBreakdown.push({
        type: type as ExerciseType,
        label: EXERCISE_TYPE_META[type as ExerciseType]?.label ?? type,
        count: data.count,
        duration: data.duration,
      })
    }
    typeBreakdown.sort((a, b) => b.duration - a.duration)

    // 情绪趋势
    const moodRecords = weekRecords.filter(r => r.moodAfter > 0).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    let moodTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (moodRecords.length >= 3) {
      const firstHalf = moodRecords.slice(0, Math.floor(moodRecords.length / 2))
      const secondHalf = moodRecords.slice(Math.floor(moodRecords.length / 2))
      const firstAvg = firstHalf.reduce((s, r) => s + r.moodAfter, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((s, r) => s + r.moodAfter, 0) / secondHalf.length
      if (secondAvg - firstAvg > 1) moodTrend = 'improving'
      else if (firstAvg - secondAvg > 1) moodTrend = 'declining'
    }

    // 总结
    const summary = totalWorkouts === 0
      ? '本周暂无运动记录，新的一周从今天开始动起来吧！'
      : totalWorkouts >= 5
        ? `本周运动 ${totalWorkouts} 次，共 ${Math.round(totalDuration / 60 * 10) / 10} 小时，表现非常出色！`
        : totalWorkouts >= 3
          ? `本周运动 ${totalWorkouts} 次，共 ${totalDuration} 分钟，继续保持良好节奏`
          : `本周运动 ${totalWorkouts} 次，共 ${totalDuration} 分钟，可以适当增加运动频率`

    // 下周建议
    const nextWeekTips: string[] = []
    if (totalWorkouts < 3) {
      nextWeekTips.push('建议下周至少安排 3 次运动，每次 30 分钟以上')
    }
    if (restDays > 4) {
      nextWeekTips.push('连续休息天数较多，可以尝试分散运动到不同天')
    }
    if (typeBreakdown.length < 2) {
      nextWeekTips.push('尝试增加不同类型的运动，提高全面性（如有氧+力量+柔韧）')
    }
    if (moodTrend === 'declining') {
      nextWeekTips.push('运动后情绪呈下降趋势，可以尝试更轻松愉快的运动类型')
    }
    if (nextWeekTips.length === 0) {
      nextWeekTips.push('继续保持当前良好的运动习惯！')
      nextWeekTips.push('可以尝试适当提高运动强度或延长运动时间')
    }

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      totalWorkouts,
      totalDuration,
      totalCalories,
      avgDuration,
      bestDay,
      restDays,
      typeBreakdown,
      moodTrend,
      summary,
      nextWeekTips,
    }
  }

  // ============================================================
  // 运动推荐
  // ============================================================

  /**
   * 获取个性化运动推荐
   */
  function getExerciseRecommendations(): ExerciseRecommendation[] {
    const stats = getExerciseStats('month')
    const recommendations: ExerciseRecommendation[] = []

    // 基于运动频率推荐
    if (stats.weeklyWorkouts < 3) {
      recommendations.push({
        type: 'walking',
        name: '每日快走',
        duration: 30,
        intensity: 'moderate',
        estimatedCalories: EXERCISE_TYPE_META.walking.caloriesPerMinute.moderate * 30,
        reason: '运动频率偏低，快走是最容易坚持的有氧运动，每天30分钟即可提升健康水平',
        priority: 'high',
        suggestedTime: '早晨 7:00-8:00 或傍晚 17:00-18:00',
        precautions: ['穿舒适运动鞋', '注意保持正确姿势', '循序渐进增加速度'],
      })
    }

    // 基于运动类型多样性推荐
    const typeCount = Object.values(stats.typeDistribution).filter(c => c > 0).length
    if (typeCount < 3) {
      const missingTypes = (Object.keys(EXERCISE_TYPE_META) as ExerciseType[]).filter(
        t => stats.typeDistribution[t] === 0 && t !== 'other',
      )

      if (missingTypes.includes('strength') || missingTypes.includes('flexibility')) {
        recommendations.push({
          type: 'strength',
          name: '全身力量训练',
          duration: 40,
          intensity: 'moderate',
          estimatedCalories: EXERCISE_TYPE_META.strength.caloriesPerMinute.moderate * 40,
          reason: '缺少力量训练，增加力量训练有助于提高基础代谢率，增强骨骼健康',
          priority: 'high',
          suggestedTime: '下午 15:00-17:00',
          precautions: ['从轻重量开始', '注意动作规范', '训练后充分拉伸'],
        })
      }

      if (missingTypes.includes('yoga') || missingTypes.includes('flexibility')) {
        recommendations.push({
          type: 'yoga',
          name: '基础瑜伽',
          duration: 30,
          intensity: 'light',
          estimatedCalories: EXERCISE_TYPE_META.yoga.caloriesPerMinute.light * 30,
          reason: '缺少柔韧性训练，瑜伽可以改善体态、缓解压力、提升睡眠质量',
          priority: 'medium',
          suggestedTime: '早晨 6:30-7:30 或睡前 21:00-22:00',
          precautions: ['选择适合自己的难度等级', '不要勉强完成高难度体式', '配合呼吸'],
        })
      }
    }

    // 基于情绪推荐
    if (stats.avgMoodAfter < 5 && stats.avgMoodAfter > 0) {
      recommendations.push({
        type: 'dance',
        name: '自由舞蹈',
        duration: 20,
        intensity: 'moderate',
        estimatedCalories: EXERCISE_TYPE_META.dance.caloriesPerMinute.moderate * 20,
        reason: '运动后情绪评分偏低，跳舞可以释放内啡肽，改善心情',
        priority: 'high',
        suggestedTime: '任意时间',
        precautions: ['选择喜欢的音乐', '不必追求动作标准', '以享受为主'],
      })
    }

    // 基于连续运动推荐
    if (stats.streak >= 5) {
      recommendations.push({
        type: 'hiit',
        name: 'HIIT 挑战',
        duration: 20,
        intensity: 'vigorous',
        estimatedCalories: EXERCISE_TYPE_META.hiit.caloriesPerMinute.vigorous * 20,
        reason: '连续运动 5 天以上，可以尝试 HIIT 提升运动效率',
        priority: 'medium',
        suggestedTime: '上午 10:00-11:00',
        precautions: ['确保充分热身', '间歇与运动时间比 1:2', '身体不适时立即停止'],
      })
    }

    // 避免重复推荐
    const seen = new Set<string>()
    const unique = recommendations.filter(r => {
      const key = `${r.type}-${r.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // 至少返回一条推荐
    if (unique.length === 0) {
      unique.push({
        type: 'walking',
        name: '轻松散步',
        duration: 20,
        intensity: 'light',
        estimatedCalories: EXERCISE_TYPE_META.walking.caloriesPerMinute.light * 20,
        reason: '任何运动都好过不运动，从散步开始培养运动习惯',
        priority: 'low',
        suggestedTime: '饭后 30 分钟',
        precautions: ['选择平坦路面', '保持舒适步伐'],
      })
    }

    return unique.slice(0, 5)
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  /** 计算连续运动天数 */
  function computeStreak(allRecords: ExerciseRecord[]): number {
    if (allRecords.length === 0) return 0

    const activeDates = new Set(allRecords.map(r => r.date))
    const today = new Date()
    let streak = 0

    for (let i = 0; i < 365; i++) {
      const date = new Date(today.getTime() - i * 86400000).toISOString().split('T')[0]
      if (activeDates.has(date)) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    return streak
  }

  /** 计算最长连续运动天数 */
  function computeLongestStreak(allRecords: ExerciseRecord[]): number {
    if (allRecords.length === 0) return 0

    const dates = [...new Set(allRecords.map(r => r.date))].sort()
    let maxStreak = 1
    let currentStreak = 1

    for (let i = 1; i < dates.length; i++) {
      if (dayDiff(dates[i - 1], dates[i]) === 1) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 1
      }
    }

    return maxStreak
  }

  /** 计算情绪-运动关联度 */
  function computeMoodCorrelation(allRecords: ExerciseRecord[]): number {
    const withMood = allRecords.filter(r => r.moodAfter > 0)
    if (withMood.length < 5) return 0

    // 计算运动时长与运动后情绪的相关性
    const durations = withMood.map(r => r.duration)
    const moods = withMood.map(r => r.moodAfter)
    const n = withMood.length

    const sumD = durations.reduce((s, v) => s + v, 0)
    const sumM = moods.reduce((s, v) => s + v, 0)
    const sumDM = durations.reduce((s, d, i) => s + d * moods[i], 0)
    const sumD2 = durations.reduce((s, d) => s + d * d, 0)
    const sumM2 = moods.reduce((s, m) => s + m * m, 0)

    const denom = Math.sqrt((n * sumD2 - sumD * sumD) * (n * sumM2 - sumM * sumM))
    if (denom === 0) return 0

    const correlation = (n * sumDM - sumD * sumM) / denom
    return Math.round(Math.abs(correlation) * 100) / 100
  }

  /** 计算按周分布 */
  function computeWeeklyDistribution(allRecords: ExerciseRecord[]): { weekStart: string; workouts: number; duration: number }[] {
    if (allRecords.length === 0) return []

    const sorted = [...allRecords].sort((a, b) => a.date.localeCompare(b.date))
    const firstDate = new Date(sorted[0].date)
    const lastDate = new Date(sorted[sorted.length - 1].date)

    // 找到第一个周一
    const firstMonday = new Date(firstDate)
    const dayOfWeek = firstMonday.getDay()
    firstMonday.setDate(firstMonday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))

    const weeks: { weekStart: string; workouts: number; duration: number }[] = []
    const current = new Date(firstMonday)

    while (current <= lastDate) {
      const weekStart = current.toISOString().split('T')[0]
      const weekEnd = new Date(current.getTime() + 6 * 86400000).toISOString().split('T')[0]
      const weekRecords = allRecords.filter(r => r.date >= weekStart && r.date <= weekEnd)

      weeks.push({
        weekStart,
        workouts: weekRecords.length,
        duration: weekRecords.reduce((s, r) => s + r.duration, 0),
      })

      current.setDate(current.getDate() + 7)
    }

    return weeks
  }

  /** 计算趋势方向 */
  function computeTrendDirection(
    dailyData: { date: string; duration: number; workouts: number }[],
  ): { direction: ExerciseTrend['direction']; slope: number } {
    if (dailyData.length < 7) return { direction: 'stable', slope: 0 }

    const n = dailyData.length
    const xSum = (n * (n - 1)) / 2
    const ySum = dailyData.reduce((s, d) => s + d.duration, 0)
    const xySum = dailyData.reduce((s, d, i) => s + i * d.duration, 0)
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = n > 1
      ? (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
      : 0

    const avgDuration = ySum / n
    const threshold = avgDuration * 0.1

    let direction: ExerciseTrend['direction']
    if (slope > threshold) direction = 'improving'
    else if (slope < -threshold) direction = 'declining'
    else direction = 'stable'

    return { direction, slope: Math.round(slope * 100) / 100 }
  }

  /** 生成趋势洞察 */
  function generateTrendInsight(
    direction: ExerciseTrend['direction'],
    _slope: number,
    avgDailyDuration: number,
    workoutFrequency: number,
    _dailyData: { date: string; duration: number }[],
  ): string {
    if (direction === 'improving') {
      return `运动趋势向好！日均运动 ${avgDailyDuration} 分钟，运动频率 ${Math.round(workoutFrequency * 100)}%，继续保持上升势头。`
    }
    if (direction === 'declining') {
      return `运动趋势有所下降，日均运动 ${avgDailyDuration} 分钟。建议重新规划运动计划，找回运动节奏。`
    }
    if (avgDailyDuration < 15) {
      return `运动量偏低，日均仅 ${avgDailyDuration} 分钟。建议从每天 20 分钟快走开始培养运动习惯。`
    }
    return `运动趋势稳定，日均运动 ${avgDailyDuration} 分钟，运动频率 ${Math.round(workoutFrequency * 100)}%。保持当前节奏，可以尝试增加多样性。`
  }

  /** 计算目标达成率 */
  function computeGoalAchievementRate(): number {
    const activeGoals = goals.value.filter(g => g.status === 'active' || g.status === 'achieved')
    if (activeGoals.length === 0) return 0
    const totalProgress = activeGoals.reduce((s, g) => s + g.progress, 0)
    return Math.round(totalProgress / activeGoals.length * 100) / 100
  }

  // ============================================================
  // 从 BodyMetric 同步运动数据
  // ============================================================

  /**
   * 从 BodyMetric 数据推断运动记录
   * 用于兼容旧数据或外部数据源
   */
  function importFromMetrics(metrics: BodyMetric[]): ExerciseRecord[] {
    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')

    const imported: ExerciseRecord[] = []
    for (const m of exerciseMetrics) {
      const existing = records.value.find(r =>
        r.date === m.date && Math.abs(r.duration - m.value) < 5,
      )
      if (existing) continue

      const record: ExerciseRecord = {
        id: generateId(),
        type: m.value >= 60 ? 'running' : m.value >= 30 ? 'cardio' : 'walking',
        name: '导入运动记录',
        duration: m.value,
        intensity: m.value >= 60 ? 'vigorous' : m.value >= 30 ? 'moderate' : 'light',
        calories: Math.round(m.value * 5),
        moodAfter: 5,
        energyAfter: 3,
        note: m.note ?? '从指标数据导入',
        date: m.date,
        timestamp: m.timestamp,
        completion: 1,
      }

      imported.push(record)
    }

    if (imported.length > 0) {
      records.value = [...records.value, ...imported]
      saveExerciseRecords(records.value)
    }

    return imported
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    records,
    goals,

    // 运动记录
    logExercise,
    getRecords,
    getTodayRecords,
    removeRecord,

    // 运动统计
    getExerciseStats,

    // 运动趋势
    computeExerciseTrend,

    // 运动目标
    setExerciseGoal,
    updateGoalProgress,
    getActiveGoals,
    toggleGoalStatus,
    removeGoal,

    // 周总结
    getWeeklySummary,

    // 运动推荐
    getExerciseRecommendations,

    // 数据导入
    importFromMetrics,

    // 常量
    EXERCISE_TYPE_META,
  }
}