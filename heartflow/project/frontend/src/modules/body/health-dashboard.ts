// ============================================================
// 身体温室 · 健康仪表盘 + 趋势分析 + 目标追踪 + 提醒系统
// 蓝图：指标趋势图、健康目标、生物钟分析、温室植物交互、健康提醒
// ============================================================

import { ref } from 'vue'
import type { BodyMetric, BodyMetricType, SleepRecord } from './types'
import { BODY_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'
import { computeNutritionScoreFromMetrics } from './nutrition-scoring'

// ---- 健康目标 ----

export interface HealthGoal {
  id: string
  type: BodyMetricType
  /** 目标名称 */
  name: string
  /** 目标值 */
  targetValue: number
  /** 当前值 */
  currentValue: number
  /** 单位 */
  unit: string
  /** 起始日期 */
  startDate: string
  /** 目标日期 */
  targetDate: string
  /** 进度 0-1 */
  progress: number
  /** 状态 */
  status: 'active' | 'achieved' | 'failed' | 'paused'
  /** 每日目标 */
  dailyTarget?: number
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 提醒频率 */
  reminderFrequency: 'daily' | 'weekly' | 'none'
  createdAt: string
  updatedAt: string
}

// ---- 趋势数据 ----

export interface TrendPoint {
  date: string
  value: number
  movingAverage?: number
  trend?: 'up' | 'down' | 'stable'
}

export interface MetricTrend {
  type: BodyMetricType
  label: string
  unit: string
  /** 趋势数据点 */
  points: TrendPoint[]
  /** 当前值 */
  currentValue: number
  /** 7天平均值 */
  weeklyAverage: number
  /** 30天平均值 */
  monthlyAverage: number
  /** 变化方向 */
  direction: 'improving' | 'declining' | 'stable'
  /** 变化率 */
  changeRate: number
  /** 目标范围 */
  targetRange: [number, number]
  /** 是否在目标范围内 */
  inRange: boolean
}

// ---- 生物钟分析 ----

export interface ChronotypeAnalysis {
  /** 生物钟类型 */
  chronotype: 'morning_lark' | 'night_owl' | 'intermediate' | 'bimodal'
  /** 最佳入睡时间 */
  optimalBedtime: string
  /** 最佳起床时间 */
  optimalWakeTime: string
  /** 平均睡眠时长（小时） */
  averageSleepDuration: number
  /** 睡眠效率 */
  sleepEfficiency: number
  /** 睡眠规律性 0-1 */
  sleepRegularity: number
  /** 社会时差（周末与工作日睡眠中点的差异） */
  socialJetlag: number
  /** 分析置信度 */
  confidence: number
  /** 建议 */
  recommendations: ChronotypeRecommendation[]
}

export interface ChronotypeRecommendation {
  category: 'sleep' | 'activity' | 'nutrition' | 'light' | 'routine'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

// ---- 温室植物交互 ----

export interface PlantInteraction {
  plantId: string
  plantName: string
  /** 植物状态 */
  health: number // 0-1
  growthStage: 'seed' | 'sprout' | 'growing' | 'blooming' | 'wilting'
  /** 与身体指标的关联 */
  linkedMetric: BodyMetricType
  /** 当前指标值 */
  metricValue: number
  /** 指标目标值 */
  metricTarget: number
  /** 植物反应 */
  reaction: 'thriving' | 'normal' | 'needs_care' | 'wilting'
  /** 反应描述 */
  reactionDescription: string
  /** 视觉效果 */
  visualEffect: string
  lastUpdated: string
}

// ---- 健康提醒 ----

export interface HealthReminder {
  id: string
  type: 'water' | 'move' | 'stretch' | 'eye_rest' | 'posture' | 'medication' | 'custom'
  title: string
  message: string
  /** 间隔（分钟） */
  intervalMinutes: number
  /** 是否启用 */
  enabled: boolean
  /** 生效时段 */
  activeHours: { start: string; end: string }
  /** 生效日期 */
  activeDays: number[] // 0=周日, 1=周一...
  /** 上次提醒时间 */
  lastRemindedAt?: string
  /** 今日提醒次数 */
  todayCount: number
  createdAt: string
}

// ---- 综合健康评分 ----

export interface HealthDashboard {
  /** 综合健康评分 0-100 */
  overallScore: number
  /** 各维度评分 */
  dimensionScores: Record<string, number>
  /** 趋势概览 */
  trends: MetricTrend[]
  /** 活跃目标 */
  activeGoals: HealthGoal[]
  /** 达标率 */
  achievementRate: number
  /** 温室健康度 */
  greenhouseHealth: number
  /** 连续健康天数 */
  streak: number
  /** 最近更新 */
  lastUpdated: string
}

// ============================================================
// useHealthDashboard
// ============================================================

export function useHealthDashboard() {
  const dashboard = ref<HealthDashboard>({
    overallScore: 0,
    dimensionScores: {},
    trends: [],
    activeGoals: [],
    achievementRate: 0,
    greenhouseHealth: 0,
    streak: 0,
    lastUpdated: new Date().toISOString(),
  })

  /** 计算综合健康仪表盘 */
  function computeDashboard(
    metrics: BodyMetric[],
    goals: HealthGoal[],
  ): HealthDashboard {
    // 各维度评分
    const dimensionScores: Record<string, number> = {
      sleep: computeSleepScore(metrics),
      activity: computeActivityScore(metrics),
      hydration: computeHydrationScore(metrics),
      nutrition: computeNutritionScore(metrics),
      consistency: computeConsistencyScore(metrics),
    }

    // 综合评分（加权平均）
    const weights = { sleep: 0.3, activity: 0.25, hydration: 0.2, nutrition: 0.15, consistency: 0.1 }
    const overallScore = Object.entries(dimensionScores).reduce(
      (sum, [key, score]) => sum + score * (weights[key as keyof typeof weights] || 0),
      0,
    )

    // 趋势数据
    const trends = generateTrends(metrics)

    // 达标率
    const activeGoals = goals.filter((g) => g.status === 'active')
    const achievementRate = activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length
      : 0

    // 温室健康度
    const greenhouseHealth = computeGreenhouseHealth(metrics)

    dashboard.value = {
      overallScore: Math.round(overallScore),
      dimensionScores,
      trends,
      activeGoals,
      achievementRate,
      greenhouseHealth,
      streak: computeStreak(metrics),
      lastUpdated: new Date().toISOString(),
    }

    return dashboard.value
  }

  /** 获取仪表盘分数 */
  function getScoreGrade(score: number): { label: string; color: string; emoji: string } {
    if (score >= 90) return { label: '优秀', color: '#5ab8a0', emoji: '🌟' }
    if (score >= 75) return { label: '良好', color: '#6b9fc4', emoji: '💚' }
    if (score >= 60) return { label: '一般', color: '#f0c040', emoji: '💛' }
    if (score >= 40) return { label: '需关注', color: '#f59e6c', emoji: '🧡' }
    return { label: '需改善', color: '#ef4444', emoji: '❤️' }
  }

  return {
    dashboard,
    computeDashboard,
    getScoreGrade,
  }
}

// ---- 评分计算 ----

function computeSleepScore(metrics: BodyMetric[]): number {
  const sleepMetrics = metrics.filter((m) => m.type === 'sleep')
  if (sleepMetrics.length === 0) return 50

  const recent = sleepMetrics.slice(-7)
  const avgDuration = recent.reduce((sum, m) => sum + (m.value || 0), 0) / recent.length
  const idealDuration = 7.5 // 理想睡眠时长

  const durationScore = 100 - Math.abs(avgDuration - idealDuration) * 20
  return Math.max(0, Math.min(100, durationScore))
}

function computeActivityScore(metrics: BodyMetric[]): number {
  const activityMetrics = metrics.filter((m) => m.type === 'exercise')
  if (activityMetrics.length === 0) return 50

  const recent = activityMetrics.slice(-7)
  const avgValue = recent.reduce((sum, m) => sum + (m.value || 0), 0) / recent.length
  return Math.min(100, avgValue * 1.5 + 30)
}

function computeHydrationScore(metrics: BodyMetric[]): number {
  const waterMetrics = metrics.filter((m) => m.type === 'water')
  if (waterMetrics.length === 0) return 50

  const recent = waterMetrics.slice(-7)
  const avgWater = recent.reduce((sum, m) => sum + (m.value || 0), 0) / recent.length
  const target = 2000 // 目标 2000ml

  return Math.min(100, (avgWater / target) * 100)
}

function computeNutritionScore(metrics: BodyMetric[]): number {
  return computeNutritionScoreFromMetrics(metrics)
}

function computeConsistencyScore(metrics: BodyMetric[]): number {
  if (metrics.length === 0) return 0

  // 检查最近 7 天有多少天有记录
  const now = new Date()
  let daysWithRecords = 0
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0]
    const hasRecord = metrics.some((m) => m.timestamp?.startsWith(date))
    if (hasRecord) daysWithRecords++
  }

  return (daysWithRecords / 7) * 100
}

function computeStreak(metrics: BodyMetric[]): number {
  if (metrics.length === 0) return 0

  let streak = 0
  const now = new Date()
  for (let i = 0; i < 365; i++) {
    const date = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0]
    const hasRecord = metrics.some((m) => m.timestamp?.startsWith(date))
    if (hasRecord) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}

function computeGreenhouseHealth(metrics: BodyMetric[]): number {
  const scores = [
    computeSleepScore(metrics),
    computeActivityScore(metrics),
    computeHydrationScore(metrics),
  ]
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

function generateTrends(metrics: BodyMetric[]): MetricTrend[] {
  const metricTypes: BodyMetricType[] = ['sleep', 'exercise', 'water', 'weight', 'heart_rate']
  const trends: MetricTrend[] = []

  metricTypes.forEach((type) => {
    const typeMetrics = metrics.filter((m) => m.type === type).sort(
      (a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime(),
    )

    if (typeMetrics.length === 0) return

    const points: TrendPoint[] = typeMetrics.slice(-30).map((m, idx) => {
      const window = typeMetrics.slice(Math.max(0, idx - 6), idx + 1)
      const movingAvg = window.reduce((sum, w) => sum + (w.value || 0), 0) / window.length

      return {
        date: m.timestamp || '',
        value: m.value || 0,
        movingAverage: movingAvg,
        trend: idx > 0
          ? (m.value || 0) > (typeMetrics[idx - 1].value || 0) ? 'up'
          : (m.value || 0) < (typeMetrics[idx - 1].value || 0) ? 'down' : 'stable'
          : 'stable',
      }
    })

    const currentValue = typeMetrics[typeMetrics.length - 1]?.value || 0
    const weeklyValues = typeMetrics.slice(-7)
    const weeklyAverage = weeklyValues.reduce((sum, m) => sum + (m.value || 0), 0) / weeklyValues.length
    const monthlyValues = typeMetrics.slice(-30)
    const monthlyAverage = monthlyValues.reduce((sum, m) => sum + (m.value || 0), 0) / monthlyValues.length

    const changeRate = monthlyAverage > 0
      ? (currentValue - monthlyAverage) / monthlyAverage
      : 0

    trends.push({
      type,
      label: getMetricLabel(type),
      unit: getMetricUnit(type),
      points,
      currentValue,
      weeklyAverage,
      monthlyAverage,
      direction: changeRate > 0.05 ? 'improving' : changeRate < -0.05 ? 'declining' : 'stable',
      changeRate,
      targetRange: getTargetRange(type),
      inRange: isInRange(currentValue, getTargetRange(type)),
    })
  })

  return trends
}

function getMetricLabel(type: BodyMetricType): string {
  const labels: Record<string, string> = {
    sleep: '睡眠', exercise: '运动', water: '饮水',
    weight: '体重', heart_rate: '心率', steps: '步数',
    calories: '卡路里', mood: '心情', energy: '精力',
  }
  return labels[type] || type
}

function getMetricUnit(type: BodyMetricType): string {
  const units: Record<string, string> = {
    sleep: '小时', exercise: '分钟', water: 'ml',
    weight: 'kg', heart_rate: 'bpm', steps: '步',
    calories: 'kcal', mood: '分', energy: '分',
  }
  return units[type] || ''
}

function getTargetRange(type: BodyMetricType): [number, number] {
  const ranges: Record<string, [number, number]> = {
    sleep: [7, 9], exercise: [30, 60], water: [1500, 2500],
    weight: [50, 80], heart_rate: [60, 100], steps: [8000, 12000],
    calories: [1800, 2500], mood: [6, 10], energy: [6, 10],
  }
  return ranges[type] || [0, 100]
}

function isInRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1]
}

// ============================================================
// useHealthGoals
// ============================================================

export function useHealthGoals() {
  const goals = ref<HealthGoal[]>(loadGoals())

  function loadGoals(): HealthGoal[] {
    try { return JSON.parse(storage.getKV<string>(BODY_STORAGE_KEYS.goals, '[]')) } catch { return [] }
  }
  function saveGoals(): void {
    storage.setKV(BODY_STORAGE_KEYS.goals, JSON.stringify(goals.value))
  }

  /** 创建健康目标 */
  function createGoal(
    type: BodyMetricType,
    name: string,
    targetValue: number,
    unit: string,
    targetDate: string,
    priority: HealthGoal['priority'] = 'medium',
    reminderFrequency: HealthGoal['reminderFrequency'] = 'daily',
    dailyTarget?: number,
  ): HealthGoal {
    const goal: HealthGoal = {
      id: `hg-${Date.now()}`,
      type,
      name,
      targetValue,
      currentValue: 0,
      unit,
      startDate: new Date().toISOString(),
      targetDate,
      progress: 0,
      status: 'active',
      dailyTarget,
      priority,
      reminderFrequency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    goals.value.push(goal)
    saveGoals()
    return goal
  }

  /** 更新目标进度 */
  function updateProgress(goalId: string, currentValue: number): HealthGoal | undefined {
    const goal = goals.value.find((g) => g.id === goalId)
    if (!goal || goal.status !== 'active') return undefined

    goal.currentValue = currentValue

    // 计算进度
    const startValue = 0 // 假设从 0 开始
    const totalDelta = goal.targetValue - startValue
    const currentDelta = currentValue - startValue
    goal.progress = totalDelta > 0 ? Math.min(currentDelta / totalDelta, 1) : 0

    // 检查是否达成
    if (goal.progress >= 1) {
      goal.status = 'achieved'
    }

    goal.updatedAt = new Date().toISOString()
    saveGoals()
    return goal
  }

  /** 获取活跃目标 */
  function getActiveGoals(): HealthGoal[] {
    return goals.value.filter((g) => g.status === 'active')
  }

  /** 获取已达成目标 */
  function getAchievedGoals(): HealthGoal[] {
    return goals.value.filter((g) => g.status === 'achieved')
  }

  /** 暂停目标 */
  function pauseGoal(goalId: string): HealthGoal | undefined {
    const goal = goals.value.find((g) => g.id === goalId)
    if (!goal) return undefined
    goal.status = 'paused'
    goal.updatedAt = new Date().toISOString()
    saveGoals()
    return goal
  }

  /** 恢复目标 */
  function resumeGoal(goalId: string): HealthGoal | undefined {
    const goal = goals.value.find((g) => g.id === goalId)
    if (!goal) return undefined
    goal.status = 'active'
    goal.updatedAt = new Date().toISOString()
    saveGoals()
    return goal
  }

  /** 删除目标 */
  function removeGoal(goalId: string): boolean {
    const idx = goals.value.findIndex((g) => g.id === goalId)
    if (idx === -1) return false
    goals.value.splice(idx, 1)
    saveGoals()
    return true
  }

  return {
    goals,
    createGoal,
    updateProgress,
    getActiveGoals,
    getAchievedGoals,
    pauseGoal,
    resumeGoal,
    removeGoal,
  }
}

// ============================================================
// useChronotypeAnalysis
// ============================================================

export function useChronotypeAnalysis() {
  const analysis = ref<ChronotypeAnalysis | null>(null)

  /** 分析生物钟类型 */
  function analyzeChronotype(sleepRecords: SleepRecord[]): ChronotypeAnalysis {
    if (sleepRecords.length < 7) {
      analysis.value = createDefaultAnalysis()
      return analysis.value
    }

    // 计算平均入睡和起床时间
    const bedtimes = sleepRecords.map((r) => {
      const bed = new Date(r.sleepAt)
      return bed.getHours() * 60 + bed.getMinutes()
    })
    const waketimes = sleepRecords.map((r) => {
      const wake = new Date(r.wakeAt)
      return wake.getHours() * 60 + wake.getMinutes()
    })

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length
    const avgWaketime = waketimes.reduce((a, b) => a + b, 0) / waketimes.length
    // 起床早于入睡时刻时视为跨日（如 22:00 入睡、次日 6:00 起床），中点须加 24h 再折算
    const effectiveWaketime = avgWaketime < avgBedtime ? avgWaketime + 24 * 60 : avgWaketime
    const midpoint = ((avgBedtime + effectiveWaketime) / 2) % (24 * 60)

    // 判断生物钟类型
    let chronotype: ChronotypeAnalysis['chronotype']
    if (midpoint < 150) chronotype = 'morning_lark' // 凌晨2:30前
    else if (midpoint > 330) chronotype = 'night_owl' // 凌晨5:30后
    else if (midpoint > 210 && midpoint < 270) chronotype = 'bimodal'
    else chronotype = 'intermediate'

    // 睡眠规律性
    const bedtimeVariance = bedtimes.reduce((sum, b) => sum + (b - avgBedtime) ** 2, 0) / bedtimes.length
    const sleepRegularity = Math.max(0, 1 - Math.sqrt(bedtimeVariance) / 120)

    // 睡眠效率
    const avgDuration = sleepRecords.reduce((sum, r) => sum + r.duration, 0) / sleepRecords.length
    const sleepEfficiency = Math.min(1, avgDuration / 8)

    // 社会时差
    const weekdayRecords = sleepRecords.filter((r) => {
      const day = new Date(r.sleepAt).getDay()
      return day >= 1 && day <= 5
    })
    const weekendRecords = sleepRecords.filter((r) => {
      const day = new Date(r.sleepAt).getDay()
      return day === 0 || day === 6
    })

    let socialJetlag = 0
    if (weekdayRecords.length > 0 && weekendRecords.length > 0) {
      const wdMidpoint = weekdayRecords.reduce((sum, r) => {
        const b = new Date(r.sleepAt)
        const w = new Date(r.wakeAt)
        return sum + ((b.getHours() * 60 + b.getMinutes()) + (w.getHours() * 60 + w.getMinutes())) / 2
      }, 0) / weekdayRecords.length

      const weMidpoint = weekendRecords.reduce((sum, r) => {
        const b = new Date(r.sleepAt)
        const w = new Date(r.wakeAt)
        return sum + ((b.getHours() * 60 + b.getMinutes()) + (w.getHours() * 60 + w.getMinutes())) / 2
      }, 0) / weekendRecords.length

      socialJetlag = Math.abs(weMidpoint - wdMidpoint) / 60
    }

    const recommendations = generateChronotypeRecommendations(chronotype)

    analysis.value = {
      chronotype,
      optimalBedtime: minutesToTime(avgBedtime),
      optimalWakeTime: minutesToTime(avgWaketime),
      averageSleepDuration: avgDuration,
      sleepEfficiency,
      sleepRegularity,
      socialJetlag,
      confidence: Math.min(0.9, sleepRecords.length / 30),
      recommendations,
    }

    return analysis.value
  }

  return {
    analysis,
    analyzeChronotype,
  }
}

function createDefaultAnalysis(): ChronotypeAnalysis {
  return {
    chronotype: 'intermediate',
    optimalBedtime: '23:00',
    optimalWakeTime: '07:00',
    averageSleepDuration: 7.5,
    sleepEfficiency: 0.8,
    sleepRegularity: 0.5,
    socialJetlag: 0,
    confidence: 0.3,
    recommendations: [],
  }
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = Math.floor(minutes % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function generateChronotypeRecommendations(chronotype: string): ChronotypeRecommendation[] {
  const map: Record<string, ChronotypeRecommendation[]> = {
    morning_lark: [
      { category: 'routine', title: '保持早起习惯', description: '继续维持早起节奏，将重要任务安排在上午', priority: 'high' },
      { category: 'light', title: '傍晚光照', description: '傍晚适当增加光照暴露，延迟褪黑素分泌', priority: 'medium' },
      { category: 'sleep', title: '避免过早入睡', description: '尽量在 22:00 后入睡，避免凌晨醒来', priority: 'medium' },
    ],
    night_owl: [
      { category: 'light', title: '晨间光照', description: '起床后立即接触自然光 15-30 分钟', priority: 'high' },
      { category: 'routine', title: '逐步调整', description: '每天提前 15 分钟入睡和起床', priority: 'high' },
      { category: 'sleep', title: '限制晚间屏幕', description: '睡前 1 小时减少蓝光暴露', priority: 'medium' },
    ],
    intermediate: [
      { category: 'routine', title: '保持规律', description: '固定入睡和起床时间，周末差异不超过 1 小时', priority: 'high' },
      { category: 'activity', title: '定时运动', description: '下午 4-6 点运动有助于提升睡眠质量', priority: 'medium' },
    ],
    bimodal: [
      { category: 'routine', title: '核心睡眠', description: '确保核心睡眠时段（凌晨 2-6 点）不受打扰', priority: 'high' },
      { category: 'sleep', title: '午间小憩', description: '午间安排 20 分钟小憩补充精力', priority: 'medium' },
    ],
  }

  return map[chronotype] || []
}

// ============================================================
// useHealthReminders
// ============================================================

export function useHealthReminders() {
  const reminders = ref<HealthReminder[]>([])
  const defaultReminders: Omit<HealthReminder, 'id' | 'createdAt'>[] = [
    {
      type: 'water', title: '喝水提醒', message: '该喝水了！保持水分充足 💧',
      intervalMinutes: 60, enabled: true, activeHours: { start: '08:00', end: '22:00' },
      activeDays: [0, 1, 2, 3, 4, 5, 6], todayCount: 0,
    },
    {
      type: 'move', title: '活动提醒', message: '起来活动一下吧！久坐不利于健康 🚶',
      intervalMinutes: 90, enabled: true, activeHours: { start: '09:00', end: '18:00' },
      activeDays: [1, 2, 3, 4, 5], todayCount: 0,
    },
    {
      type: 'stretch', title: '拉伸提醒', message: '做一组拉伸，缓解肌肉紧张 🧘',
      intervalMinutes: 120, enabled: true, activeHours: { start: '09:00', end: '18:00' },
      activeDays: [1, 2, 3, 4, 5], todayCount: 0,
    },
    {
      type: 'eye_rest', title: '护眼提醒', message: '遵循 20-20-20 法则：看远处 20 秒 👀',
      intervalMinutes: 30, enabled: true, activeHours: { start: '08:00', end: '22:00' },
      activeDays: [0, 1, 2, 3, 4, 5, 6], todayCount: 0,
    },
    {
      type: 'posture', title: '姿势提醒', message: '调整坐姿：挺直腰背，放松肩膀 💪',
      intervalMinutes: 45, enabled: false, activeHours: { start: '09:00', end: '18:00' },
      activeDays: [1, 2, 3, 4, 5], todayCount: 0,
    },
  ]

  function initReminders(): void {
    if (reminders.value.length === 0) {
      reminders.value = defaultReminders.map((r) => ({
        ...r,
        id: `hr-${Date.now()}-${r.type}`,
        createdAt: new Date().toISOString(),
      }))
    }
  }

  function toggleReminder(reminderId: string): void {
    const reminder = reminders.value.find((r) => r.id === reminderId)
    if (reminder) reminder.enabled = !reminder.enabled
  }

  function recordReminderSent(reminderId: string): void {
    const reminder = reminders.value.find((r) => r.id === reminderId)
    if (reminder) {
      reminder.lastRemindedAt = new Date().toISOString()
      reminder.todayCount++
    }
  }

  function resetDailyCounts(): void {
    reminders.value.forEach((r) => { r.todayCount = 0 })
  }

  function getEnabledReminders(): HealthReminder[] {
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()

    return reminders.value.filter((r) => {
      if (!r.enabled) return false
      if (!r.activeDays.includes(currentDay)) return false
      const [startH] = r.activeHours.start.split(':').map(Number)
      const [endH] = r.activeHours.end.split(':').map(Number)
      return currentHour >= startH && currentHour < endH
    })
  }

  return {
    reminders,
    initReminders,
    toggleReminder,
    recordReminderSent,
    resetDailyCounts,
    getEnabledReminders,
  }
}