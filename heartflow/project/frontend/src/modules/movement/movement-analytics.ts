// ============================================================
// 动律之间 · 运动分析引擎
// 运动数据统计、体能评估、节奏优化、恢复建议
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { MovementRecord, MovementType, MovementIntensity, MovementRhythm } from './types'
import { getLocalMonthKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 运动分析 */
export interface MovementAnalytics {
  /** 总运动次数 */
  totalSessions: number
  /** 总运动时长（分钟） */
  totalDuration: number
  /** 总消耗卡路里 */
  totalCalories: number
  /** 总距离（公里） */
  totalDistance: number
  /** 本月运动天数 */
  monthlyActiveDays: number
  /** 本周运动时间 */
  weeklyDuration: number
  /** 平均心率 */
  avgHeartRate: number
  /** 运动类型分布 */
  typeDistribution: { type: MovementType; count: number; duration: number; calories: number }[]
  /** 强度分布 */
  intensityDistribution: { intensity: MovementIntensity; count: number }[]
  /** 月度趋势 */
  monthlyTrend: { month: string; duration: number; sessions: number; calories: number }[]
  /** 最佳运动日 */
  bestDay: { date: string; duration: number; type: MovementType }
  /** 当前连续运动天数 */
  streak: number
}

/** 本地时区日期字符串（YYYY-MM-DD），与周/月切分逻辑统一 */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 体能评估 */
export interface FitnessAssessment {
  /** 心肺耐力 0-100 */
  cardioEndurance: number
  /** 力量 0-100 */
  strength: number
  /** 柔韧性 0-100 */
  flexibility: number
  /** 平衡性 0-100 */
  balance: number
  /** 综合体能 0-100 */
  overall: number
  /** 评估时间 */
  assessedAt: string
  /** 与上周对比 */
  weeklyChange: number
}

/** 运动建议 */
export interface MovementRecommendation {
  id: string
  type: MovementType
  intensity: MovementIntensity
  duration: number
  reason: string
  priority: 'high' | 'medium' | 'low'
}

/** 恢复状态 */
export interface RecoveryStatus {
  /** 上次运动时间 */
  lastExerciseAt: string
  /** 距上次运动的小时数 */
  hoursSinceLastExercise: number
  /** 恢复状态 0-100 */
  recoveryScore: number
  /** 是否需要休息 */
  needsRest: boolean
  /** 建议恢复活动 */
  suggestedActivity?: string
}

/** 存储键 */
const MOVEMENT_ANALYTICS_KEY = 'hf:movement:analytics'
const FITNESS_ASSESSMENT_KEY = 'hf:movement:fitness'

// ============================================================
// 运动分析引擎
// ============================================================

export function useMovementAnalytics() {
  const analytics = ref<MovementAnalytics>(loadAnalytics())
  const fitness = ref<FitnessAssessment>(loadFitness())

  // ---- 持久化 ----

  function loadAnalytics(): MovementAnalytics {
    try {
      const raw = storage.getKV<string>(MOVEMENT_ANALYTICS_KEY, '')
      if (!raw) return createDefaultAnalytics()
      return JSON.parse(raw)
    } catch { return createDefaultAnalytics() }
  }

  function saveAnalytics() {
    storage.setKV(MOVEMENT_ANALYTICS_KEY, JSON.stringify(analytics.value))
  }

  function loadFitness(): FitnessAssessment {
    try {
      const raw = storage.getKV<string>(FITNESS_ASSESSMENT_KEY, '')
      if (!raw) {
        return {
          cardioEndurance: 50, strength: 50, flexibility: 50, balance: 50,
          overall: 50, assessedAt: '', weeklyChange: 0,
        }
      }
      return JSON.parse(raw)
    } catch {
      return {
        cardioEndurance: 50, strength: 50, flexibility: 50, balance: 50,
        overall: 50, assessedAt: '', weeklyChange: 0,
      }
    }
  }

  function saveFitness() {
    storage.setKV(FITNESS_ASSESSMENT_KEY, JSON.stringify(fitness.value))
  }

  function createDefaultAnalytics(): MovementAnalytics {
    return {
      totalSessions: 0, totalDuration: 0, totalCalories: 0, totalDistance: 0,
      monthlyActiveDays: 0, weeklyDuration: 0, avgHeartRate: 0,
      typeDistribution: [], intensityDistribution: [], monthlyTrend: [],
      bestDay: { date: '', duration: 0, type: 'custom' },
      streak: 0,
    }
  }

  // ---- 运动分析 ----

  /** 更新运动分析 */
  function updateAnalytics(records: MovementRecord[], rhythm: MovementRhythm) {
    const a = analytics.value
    a.totalSessions = records.length
    a.totalDuration = records.reduce((sum, r) => sum + r.duration, 0)
    a.totalCalories = records.reduce((sum, r) => sum + (r.calories ?? 0), 0)
    a.totalDistance = records.reduce((sum, r) => sum + (r.distance ?? 0), 0)

    // 心率相关
    const hrRecords = records.filter(r => r.avgHeartRate)
    a.avgHeartRate = hrRecords.length > 0
      ? Math.round(hrRecords.reduce((sum, r) => sum + (r.avgHeartRate ?? 0), 0) / hrRecords.length)
      : 0

    // 本月活跃天数（本地时区日期字符串切分）
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = localDateStr(monthStart)
    const monthDates = new Set(
      records.filter(r => r.date >= monthStartStr).map(r => r.date)
    )
    a.monthlyActiveDays = monthDates.size

    // 本周运动时间
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const weekStartStr = localDateStr(weekStart)
    a.weeklyDuration = records
      .filter(r => r.date >= weekStartStr)
      .reduce((sum, r) => sum + r.duration, 0)

    // 类型分布
    const typeMap = new Map<string, { count: number; duration: number; calories: number }>()
    for (const r of records) {
      const entry = typeMap.get(r.type) || { count: 0, duration: 0, calories: 0 }
      entry.count++
      entry.duration += r.duration
      entry.calories += r.calories ?? 0
      typeMap.set(r.type, entry)
    }
    a.typeDistribution = [...typeMap.entries()]
      .map(([type, data]) => ({ type: type as MovementType, ...data }))
      .sort((x, y) => y.duration - x.duration)

    // 强度分布
    const intensityMap = new Map<string, number>()
    for (const r of records) {
      intensityMap.set(r.intensity, (intensityMap.get(r.intensity) ?? 0) + 1)
    }
    a.intensityDistribution = [...intensityMap.entries()]
      .map(([intensity, count]) => ({ intensity: intensity as MovementIntensity, count }))

    // 月度趋势
    const monthlyMap = new Map<string, { duration: number; sessions: number; calories: number }>()
    for (const r of records) {
      const month = getLocalMonthKey(r.date)
      const entry = monthlyMap.get(month) || { duration: 0, sessions: 0, calories: 0 }
      entry.duration += r.duration
      entry.sessions++
      entry.calories += r.calories ?? 0
      monthlyMap.set(month, entry)
    }
    a.monthlyTrend = [...monthlyMap.entries()]
      .map(([month, data]) => ({ month, ...data }))
      .sort((x, y) => x.month.localeCompare(y.month))
      .slice(-12)

    // 最佳运动日
    if (records.length > 0) {
      const best = records.reduce((max, cur) => cur.duration > max.duration ? cur : max)
      a.bestDay = { date: best.date, duration: best.duration, type: best.type }
    }

    a.streak = rhythm.streak
    saveAnalytics()
  }

  // ---- 体能评估 ----

  /** 评估体能 */
  function assessFitness(records: MovementRecord[]): FitnessAssessment {
    const recent = records
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 90)

    const cardio = calculateCardioEndurance(recent)
    const strength = calculateStrengthScore(recent)
    const flexibility = calculateFlexibilityScore(recent)
    const balance = 50 // 默认值，需要特定数据
    const overall = Math.round((cardio + strength + flexibility + balance) / 4)

    const prevFitness = fitness.value.overall
    const weeklyChange = prevFitness > 0 ? overall - prevFitness : 0

    const assessment: FitnessAssessment = {
      cardioEndurance: cardio,
      strength,
      flexibility,
      balance,
      overall,
      assessedAt: new Date().toISOString(),
      weeklyChange,
    }

    fitness.value = assessment
    saveFitness()
    return assessment
  }

  // ---- 恢复状态 ----

  /** 获取恢复状态 */
  function getRecoveryStatus(records: MovementRecord[]): RecoveryStatus {
    const sorted = [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const lastExercise = sorted[0]

    if (!lastExercise) {
      return { lastExerciseAt: '', hoursSinceLastExercise: 0, recoveryScore: 100, needsRest: false }
    }

    const hoursSince = (Date.now() - new Date(lastExercise.timestamp).getTime()) / (1000 * 60 * 60)
    const recoveryScore = Math.min(100, Math.round(hoursSince * 4))

    let needsRest = false
    let suggestedActivity: string | undefined
    if (hoursSince < 6) {
      needsRest = true
      suggestedActivity = '建议休息，进行轻度拉伸'
    } else if (hoursSince < 12 && lastExercise.intensity === 'vigorous') {
      needsRest = true
      suggestedActivity = '高强度运动后建议充分休息，可尝试瑜伽或散步'
    }

    return {
      lastExerciseAt: lastExercise.timestamp,
      hoursSinceLastExercise: Math.round(hoursSince * 10) / 10,
      recoveryScore,
      needsRest,
      suggestedActivity,
    }
  }

  // ---- 运动建议 ----

  /** 生成运动建议 */
  function generateRecommendations(records: MovementRecord[]): MovementRecommendation[] {
    const recommendations: MovementRecommendation[] = []
    const recent = records.slice(-30)
    const typeDistribution = analytics.value.typeDistribution

    // 运动多样性建议
    if (typeDistribution.length === 1) {
      recommendations.push({
        id: 'rec_variety',
        type: 'yoga',
        intensity: 'light',
        duration: 20,
        reason: '你主要进行单一类型运动，建议增加瑜伽提升柔韧性',
        priority: 'high',
      })
    }

    // 强度分布建议
    const highIntensityCount = recent.filter(r => r.intensity === 'vigorous' || r.intensity === 'extreme').length
    if (highIntensityCount > 10) {
      recommendations.push({
        id: 'rec_rest',
        type: 'stretching',
        intensity: 'light',
        duration: 15,
        reason: '高强度运动较多，建议增加拉伸和恢复性训练',
        priority: 'high',
      })
    }

    // 活跃度建议
    if (recent.length < 5) {
      recommendations.push({
        id: 'rec_activity',
        type: 'walking',
        intensity: 'light',
        duration: 30,
        reason: '运动频率偏低，建议从散步开始养成习惯',
        priority: 'medium',
      })
    }

    return recommendations
  }

  return {
    analytics,
    fitness,
    updateAnalytics,
    assessFitness,
    getRecoveryStatus,
    generateRecommendations,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function calculateCardioEndurance(records: MovementRecord[]): number {
  const cardioTypes: MovementType[] = ['running', 'cycling', 'swimming', 'hiit']
  const cardioRecords = records.filter(r => cardioTypes.includes(r.type))
  if (cardioRecords.length === 0) return 30
  const avgDuration = cardioRecords.reduce((sum, r) => sum + r.duration, 0) / cardioRecords.length
  return Math.min(100, Math.round(avgDuration * 2))
}

function calculateStrengthScore(records: MovementRecord[]): number {
  const strengthRecords = records.filter(r => r.type === 'strength')
  if (strengthRecords.length === 0) return 30
  const total = strengthRecords.reduce((sum, r) => sum + r.duration, 0)
  return Math.min(100, Math.round(total / 3))
}

function calculateFlexibilityScore(records: MovementRecord[]): number {
  const flexRecords = records.filter(r => r.type === 'yoga' || r.type === 'stretching')
  if (flexRecords.length === 0) return 30
  const total = flexRecords.reduce((sum, r) => sum + r.duration, 0)
  return Math.min(100, Math.round(total / 2))
}