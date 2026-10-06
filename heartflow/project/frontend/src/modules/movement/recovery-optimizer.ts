// ============================================================
// 动律之间 · 恢复优化引擎（P20-1）
// 恢复评分、过度训练检测、恢复计划、周期化训练建议
// ============================================================

import { ref } from 'vue'
import { getLocalMonthKey, getLocalDateKey } from '../../utils/time'
import type { MovementRecord, MovementType, MovementIntensity } from './types'
import { MOVEMENT_INTENSITY_META } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 恢复评分 */
export interface RecoveryScore {
  /** 综合恢复评分 0-100 */
  overall: number
  /** 肌肉恢复 0-100 */
  muscleRecovery: number
  /** 神经恢复 0-100 */
  nervousRecovery: number
  /** 心血管恢复 0-100 */
  cardiovascularRecovery: number
  /** 心理恢复 0-100 */
  mentalRecovery: number
  /** 评估时间 */
  assessedAt: string
  /** 距上次高强度运动的小时数 */
  hoursSinceIntense: number
  /** 建议休息时长（小时） */
  recommendedRestHours: number
}

/** 过度训练信号 */
export interface OvertrainingSignal {
  /** 信号类型 */
  type: 'performance_drop' | 'fatigue_accumulation' | 'mood_decline' | 'sleep_disturbance' | 'injury_risk'
  /** 严重级别 0-1 */
  severity: number
  /** 描述 */
  description: string
  /** 检测到的模式 */
  pattern: string
  /** 建议 */
  suggestion: string
}

/** 主动恢复活动 */
export interface ActiveRecovery {
  /** 活动 ID */
  id: string
  /** 活动类型 */
  type: MovementType
  /** 强度 */
  intensity: MovementIntensity
  /** 建议时长（分钟） */
  duration: number
  /** 活动名称 */
  name: string
  /** 描述 */
  description: string
  /** 预期效果 */
  expectedBenefit: string
  /** 适用场景 */
  suitableFor: string[]
}

/** 周期化训练阶段 */
export type PeriodizationPhase = 'preparation' | 'build' | 'peak' | 'taper' | 'recovery'

/** 周期化训练计划 */
export interface PeriodizationPlan {
  /** 当前阶段 */
  currentPhase: PeriodizationPhase
  /** 阶段描述 */
  phaseDescription: string
  /** 周计划 */
  weeklySchedule: DaySchedule[]
  /** 阶段目标 */
  phaseGoal: string
  /** 阶段时长（周） */
  phaseDurationWeeks: number
  /** 当前周 */
  currentWeek: number
  /** 强度分布建议 */
  intensityDistribution: { intensity: MovementIntensity; percentage: number }[]
  /** 关键注意事项 */
  keyNotes: string[]
}

/** 每日训练安排 */
export interface DaySchedule {
  /** 星期几 */
  dayOfWeek: string
  /** 训练类型 */
  workoutType: 'primary' | 'secondary' | 'active_recovery' | 'rest'
  /** 建议运动 */
  suggestedActivity?: {
    type: MovementType
    duration: number
    intensity: MovementIntensity
    description: string
  }
  /** 焦点 */
  focus: string
}

/** 恢复计划 */
export interface RecoveryPlan {
  /** 计划 ID */
  id: string
  /** 创建时间 */
  createdAt: string
  /** 恢复目标 */
  goal: string
  /** 每日活动 */
  dailyActivities: {
    day: number
    activities: ActiveRecovery[]
    nutrition: string[]
    hydration: string
    sleepTarget: number
  }[]
  /** 预计完全恢复时间 */
  estimatedFullRecovery: string
  /** 进度里程碑 */
  milestones: { day: number; description: string }[]
}

// ============================================================
// 常量
// ============================================================

/** 主动恢复活动库 */
const ACTIVE_RECOVERY_LIBRARY: ActiveRecovery[] = [
  {
    id: 'ar_walk', type: 'walking', intensity: 'light', duration: 20,
    name: '轻松散步', description: '在自然环境中轻松散步，促进血液循环',
    expectedBenefit: '加速乳酸清除，缓解肌肉酸痛', suitableFor: ['高强度运动后', '久坐后'],
  },
  {
    id: 'ar_stretch', type: 'stretching', intensity: 'light', duration: 15,
    name: '全身拉伸', description: '针对主要肌群的静态拉伸',
    expectedBenefit: '改善柔韧性，减少肌肉紧张', suitableFor: ['运动后', '晨间'],
  },
  {
    id: 'ar_yoga', type: 'yoga', intensity: 'light', duration: 30,
    name: '恢复瑜伽', description: '以呼吸和放松为重点的温和瑜伽',
    expectedBenefit: '身心放松，改善睡眠质量', suitableFor: ['高强度训练期', '压力大时'],
  },
  {
    id: 'ar_taichi', type: 'tai_chi', intensity: 'light', duration: 20,
    name: '太极放松', description: '缓慢流畅的太极动作，注重呼吸',
    expectedBenefit: '改善平衡，降低压力水平', suitableFor: ['恢复日', '清晨'],
  },
  {
    id: 'ar_swim', type: 'swimming', intensity: 'light', duration: 20,
    name: '轻松游泳', description: '低强度游泳，水的浮力减轻关节压力',
    expectedBenefit: '全身放松，关节友好', suitableFor: ['关节不适时', '全身恢复'],
  },
  {
    id: 'ar_cycle', type: 'cycling', intensity: 'light', duration: 25,
    name: '休闲骑行', description: '平坦路段轻松骑行',
    expectedBenefit: '促进下肢血液循环', suitableFor: ['跑步后恢复', '周末放松'],
  },
]

/** 周期化阶段配置 */
const PERIODIZATION_CONFIG: Record<PeriodizationPhase, {
  label: string
  description: string
  intensityMix: { intensity: MovementIntensity; percentage: number }[]
  weeks: number
}> = {
  preparation: {
    label: '准备期',
    description: '建立基础体能，逐步增加训练量',
    intensityMix: [
      { intensity: 'light', percentage: 50 },
      { intensity: 'moderate', percentage: 40 },
      { intensity: 'vigorous', percentage: 10 },
      { intensity: 'extreme', percentage: 0 },
    ],
    weeks: 4,
  },
  build: {
    label: '建设期',
    description: '提升训练强度和专项能力',
    intensityMix: [
      { intensity: 'light', percentage: 20 },
      { intensity: 'moderate', percentage: 40 },
      { intensity: 'vigorous', percentage: 30 },
      { intensity: 'extreme', percentage: 10 },
    ],
    weeks: 4,
  },
  peak: {
    label: '巅峰期',
    description: '达到最佳竞技状态',
    intensityMix: [
      { intensity: 'light', percentage: 15 },
      { intensity: 'moderate', percentage: 25 },
      { intensity: 'vigorous', percentage: 40 },
      { intensity: 'extreme', percentage: 20 },
    ],
    weeks: 2,
  },
  taper: {
    label: '减量期',
    description: '减少训练量，保持强度，为比赛做准备',
    intensityMix: [
      { intensity: 'light', percentage: 40 },
      { intensity: 'moderate', percentage: 40 },
      { intensity: 'vigorous', percentage: 20 },
      { intensity: 'extreme', percentage: 0 },
    ],
    weeks: 1,
  },
  recovery: {
    label: '恢复期',
    description: '充分休息和恢复，为下一周期做准备',
    intensityMix: [
      { intensity: 'light', percentage: 100 },
      { intensity: 'moderate', percentage: 0 },
      { intensity: 'vigorous', percentage: 0 },
      { intensity: 'extreme', percentage: 0 },
    ],
    weeks: 1,
  },
}

// ============================================================
// useRecoveryOptimizer Composable
// ============================================================

export function useRecoveryOptimizer() {
  // ---- 状态 ----
  const recoveryScore = ref<RecoveryScore | null>(null)
  const overtrainingSignals = ref<OvertrainingSignal[]>([])
  const recoveryPlan = ref<RecoveryPlan | null>(null)
  const periodizationPlan = ref<PeriodizationPlan | null>(null)

  // ============================================================
  // 恢复评分
  // ============================================================

  /**
   * 计算恢复评分
   */
  function computeRecoveryScore(records: MovementRecord[]): RecoveryScore {
    const now = Date.now()
    const sorted = [...records].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )

    // 肌肉恢复：基于最近运动强度和时长
    const recent7d = sorted.filter(
      r => now - new Date(r.timestamp).getTime() < 7 * 86400000,
    )
    const totalLoad = recent7d.reduce((sum, r) => {
      const intensityWeight = MOVEMENT_INTENSITY_META[r.intensity].multiplier
      return sum + r.duration * intensityWeight
    }, 0)

    // 肌肉恢复：负荷越高，恢复越低
    const muscleRecovery = Math.max(0, Math.min(100, 100 - totalLoad * 0.8))

    // 神经恢复：基于高强度运动频率
    const intenseRecent = recent7d.filter(
      r => r.intensity === 'vigorous' || r.intensity === 'extreme',
    )
    const nervousRecovery = Math.max(0, Math.min(100, 100 - intenseRecent.length * 15))

    // 心血管恢复：基于有氧运动总量
    const cardioTypes: MovementType[] = ['running', 'cycling', 'swimming', 'hiit', 'dance']
    const cardioLoad = recent7d
      .filter(r => cardioTypes.includes(r.type))
      .reduce((sum, r) => sum + r.duration, 0)
    const cardiovascularRecovery = Math.max(0, Math.min(100, 100 - cardioLoad * 0.5))

    // 心理恢复：基于运动频率和感受
    const goodFeeling = recent7d.filter(r =>
      r.feeling && ['精力充沛', '愉悦', '满足', '放松'].some(f => r.feeling!.includes(f)),
    ).length
    const mentalRecovery = Math.max(20, Math.min(100, 50 + goodFeeling * 10))

    // 综合评分
    const overall = Math.round(
      muscleRecovery * 0.35 + nervousRecovery * 0.25 +
      cardiovascularRecovery * 0.2 + mentalRecovery * 0.2,
    )

    // 距上次高强度运动时间
    const lastIntense = sorted.find(
      r => r.intensity === 'vigorous' || r.intensity === 'extreme',
    )
    const hoursSinceIntense = lastIntense
      ? Math.round((now - new Date(lastIntense.timestamp).getTime()) / 3600000)
      : 72

    // 建议休息时长
    const recommendedRestHours = Math.max(0, Math.round((100 - overall) * 0.24))

    const score: RecoveryScore = {
      overall,
      muscleRecovery: Math.round(muscleRecovery),
      nervousRecovery: Math.round(nervousRecovery),
      cardiovascularRecovery: Math.round(cardiovascularRecovery),
      mentalRecovery: Math.round(mentalRecovery),
      assessedAt: new Date().toISOString(),
      hoursSinceIntense,
      recommendedRestHours,
    }

    recoveryScore.value = score
    return score
  }

  // ============================================================
  // 过度训练检测
  // ============================================================

  /**
   * 检测过度训练信号
   */
  function detectOvertraining(records: MovementRecord[]): OvertrainingSignal[] {
    const signals: OvertrainingSignal[] = []
    const now = Date.now()
    const recent14d = records.filter(
      r => now - new Date(r.timestamp).getTime() < 14 * 86400000,
    )
    const recent7d = recent14d.filter(
      r => now - new Date(r.timestamp).getTime() < 7 * 86400000,
    )

    // 1. 表现下降检测
    if (recent14d.length >= 5) {
      const firstHalf = recent14d.slice(0, Math.floor(recent14d.length / 2))
      const secondHalf = recent14d.slice(Math.floor(recent14d.length / 2))
      const firstAvg = firstHalf.reduce((s, r) => s + r.duration, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((s, r) => s + r.duration, 0) / secondHalf.length

      if (firstAvg > 0 && secondAvg / firstAvg < 0.7) {
        signals.push({
          type: 'performance_drop',
          severity: Math.min(1, (1 - secondAvg / firstAvg)),
          description: '近期运动时长明显下降，可能存在体能下降',
          pattern: `运动时长从 ${Math.round(firstAvg)} 分钟降至 ${Math.round(secondAvg)} 分钟`,
          suggestion: '建议减少高强度训练，增加恢复日，确保充足睡眠',
        })
      }
    }

    // 2. 疲劳积累检测
    const intenseCount7d = recent7d.filter(
      r => r.intensity === 'vigorous' || r.intensity === 'extreme',
    ).length
    if (intenseCount7d >= 4) {
      signals.push({
        type: 'fatigue_accumulation',
        severity: Math.min(1, intenseCount7d * 0.2),
        description: '高强度运动频率过高，疲劳正在积累',
        pattern: `过去7天进行了 ${intenseCount7d} 次高强度运动`,
        suggestion: '建议将高强度运动减少到每周2-3次，中间安排恢复日',
      })
    }

    // 3. 运动多样性不足
    const typeCount = new Set(recent7d.map(r => r.type)).size
    if (recent7d.length >= 5 && typeCount <= 1) {
      signals.push({
        type: 'injury_risk',
        severity: 0.6,
        description: '运动类型过于单一，增加过度使用损伤风险',
        pattern: `过去7天仅进行了 ${typeCount} 种运动类型`,
        suggestion: '建议交叉训练，加入不同类型的运动以平衡肌肉群使用',
      })
    }

    // 4. 连续高强度
    const consecutiveIntense = getConsecutiveIntenseDays(recent14d)
    if (consecutiveIntense >= 3) {
      signals.push({
        type: 'injury_risk',
        severity: Math.min(1, consecutiveIntense * 0.25),
        description: '连续高强度运动天数过多，受伤风险升高',
        pattern: `连续 ${consecutiveIntense} 天进行高强度运动`,
        suggestion: '建议至少间隔48小时再进行同类型高强度运动',
      })
    }

    overtrainingSignals.value = signals
    return signals
  }

  // ============================================================
  // 主动恢复推荐
  // ============================================================

  /**
   * 获取主动恢复活动推荐
   */
  function getActiveRecoveryRecommendations(
    records: MovementRecord[],
    recoveryScore: RecoveryScore,
    topN: number = 3,
  ): ActiveRecovery[] {
    const recent = records.slice(-7)
    const recentTypes = new Set(recent.map(r => r.type))

    // 过滤掉最近做过的运动类型，优先推荐恢复性活动
    const scored = ACTIVE_RECOVERY_LIBRARY.map(activity => {
      let score = 0

      // 恢复评分越低，越需要恢复活动
      score += (100 - recoveryScore.overall) * 0.5

      // 最近没做过的类型加分
      if (!recentTypes.has(activity.type)) score += 20

      // 根据恢复维度调整
      if (recoveryScore.muscleRecovery < 50 && activity.type === 'stretching') score += 30
      if (recoveryScore.mentalRecovery < 50 && (activity.type === 'yoga' || activity.type === 'tai_chi')) score += 30
      if (recoveryScore.cardiovascularRecovery < 50 && activity.type === 'walking') score += 20

      return { activity, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(s => s.activity)
  }

  // ============================================================
  // 恢复计划生成
  // ============================================================

  /**
   * 生成个性化恢复计划
   */
  function generateRecoveryPlan(
    records: MovementRecord[],
    recoveryScore: RecoveryScore,
    overtrainingSignals: OvertrainingSignal[],
  ): RecoveryPlan {
    const severity = overtrainingSignals.reduce((max, s) => Math.max(max, s.severity), 0)
    const planDays = severity > 0.7 ? 7 : severity > 0.4 ? 5 : 3

    const dailyActivities: RecoveryPlan['dailyActivities'] = []
    const activities = getActiveRecoveryRecommendations(records, recoveryScore, 4)

    for (let day = 0; day < planDays; day++) {
      const dayActivities = day === 0
        ? activities.slice(0, 2) // 第一天以最轻活动为主
        : activities.slice(0, Math.min(3, day + 1))

      dailyActivities.push({
        day: day + 1,
        activities: dayActivities,
        nutrition: getDayNutrition(day, planDays),
        hydration: `${2000 + day * 200}ml`,
        sleepTarget: severity > 0.5 ? 8.5 : 8,
      })
    }

    const plan: RecoveryPlan = {
      id: `rp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      goal: severity > 0.7
        ? '深度恢复：重置身体状态，修复过度训练损伤'
        : severity > 0.4
          ? '积极恢复：减轻疲劳积累，恢复运动表现'
          : '维持恢复：保持良好状态，预防过度训练',
      dailyActivities,
      estimatedFullRecovery: new Date(Date.now() + planDays * 86400000).toISOString(),
      milestones: generateMilestones(planDays, severity),
    }

    recoveryPlan.value = plan
    return plan
  }

  // ============================================================
  // 周期化训练计划
  // ============================================================

  /**
   * 生成周期化训练计划
   */
  function generatePeriodizationPlan(
    records: MovementRecord[],
    targetPhase?: PeriodizationPhase,
  ): PeriodizationPlan {
    // 基于运动历史自动判断当前阶段
    const phase = targetPhase ?? detectCurrentPhase(records)
    const config = PERIODIZATION_CONFIG[phase]

    const weeklySchedule: DaySchedule[] = [
      {
        dayOfWeek: '周一',
        workoutType: phase === 'recovery' ? 'active_recovery' : 'primary',
        focus: phase === 'recovery' ? '轻度拉伸' : '主要训练日',
        suggestedActivity: phase === 'recovery'
          ? { type: 'stretching', duration: 20, intensity: 'light', description: '全身拉伸+呼吸练习' }
          : { type: 'running', duration: 30, intensity: 'moderate', description: '中等强度跑步' },
      },
      {
        dayOfWeek: '周二',
        workoutType: phase === 'recovery' ? 'rest' : 'secondary',
        focus: phase === 'recovery' ? '充分休息' : '交叉训练',
        suggestedActivity: phase === 'recovery'
          ? undefined
          : { type: 'strength', duration: 25, intensity: 'moderate', description: '核心力量训练' },
      },
      {
        dayOfWeek: '周三',
        workoutType: phase === 'peak' ? 'primary' : 'active_recovery',
        focus: '主动恢复',
        suggestedActivity: { type: 'yoga', duration: 30, intensity: 'light', description: '恢复瑜伽' },
      },
      {
        dayOfWeek: '周四',
        workoutType: phase === 'recovery' ? 'active_recovery' : 'primary',
        focus: phase === 'recovery' ? '轻松散步' : '专项训练',
        suggestedActivity: phase === 'recovery'
          ? { type: 'walking', duration: 30, intensity: 'light', description: '自然散步' }
          : { type: 'cycling', duration: 35, intensity: 'vigorous', description: '间歇骑行' },
      },
      {
        dayOfWeek: '周五',
        workoutType: phase === 'recovery' ? 'rest' : 'secondary',
        focus: phase === 'recovery' ? '充分休息' : '补充训练',
        suggestedActivity: phase === 'recovery'
          ? undefined
          : { type: 'swimming', duration: 25, intensity: 'moderate', description: '技术游泳' },
      },
      {
        dayOfWeek: '周六',
        workoutType: phase === 'recovery' ? 'active_recovery' : 'primary',
        focus: '长距离/户外',
        suggestedActivity: { type: 'running', duration: 45, intensity: 'moderate', description: '长距离慢跑' },
      },
      {
        dayOfWeek: '周日',
        workoutType: 'rest',
        focus: '完全休息',
      },
    ]

    const plan: PeriodizationPlan = {
      currentPhase: phase,
      phaseDescription: config.description,
      weeklySchedule,
      phaseGoal: `${config.label}目标：${config.description}`,
      phaseDurationWeeks: config.weeks,
      currentWeek: 1,
      intensityDistribution: config.intensityMix,
      keyNotes: getKeyNotesForPhase(phase),
    }

    periodizationPlan.value = plan
    return plan
  }

  // ============================================================
  // 运动模式识别
  // ============================================================

  /**
   * 识别运动模式
   */
  function identifyMovementPatterns(records: MovementRecord[]): {
    pattern: string
    consistency: number
    preferredTime: string
    preferredDays: string[]
    seasonalTrend: string
  } {
    if (records.length < 5) {
      return {
        pattern: '数据不足',
        consistency: 0,
        preferredTime: '未知',
        preferredDays: [],
        seasonalTrend: '数据不足',
      }
    }

    // 一致性：计算运动间隔的标准差
    const sorted = [...records].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(
        (new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime()) / 86400000,
      )
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length
    const variance = intervals.reduce((s, v) => s + (v - avgInterval) ** 2, 0) / intervals.length
    const stdDev = Math.sqrt(variance)
    const consistency = Math.max(0, Math.min(100, 100 - stdDev * 20))

    // 偏好时间
    const hourCounts: Record<string, number> = {}
    for (const r of records) {
      const hour = new Date(r.timestamp).getHours()
      const period = hour < 8 ? '清晨' : hour < 12 ? '上午' : hour < 17 ? '下午' : '晚上'
      hourCounts[period] = (hourCounts[period] ?? 0) + 1
    }
    const preferredTime = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '未知'

    // 偏好日期
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dayCounts: Record<string, number> = {}
    for (const r of records) {
      const day = dayNames[new Date(r.date).getDay()]
      dayCounts[day] = (dayCounts[day] ?? 0) + 1
    }
    const preferredDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([d]) => d)

    // 季节趋势
    const seasonalTrend = analyzeSeasonalTrend(records)

    // 模式描述
    let pattern = '不规律'
    if (consistency > 80) pattern = '非常规律'
    else if (consistency > 60) pattern = '比较规律'
    else if (consistency > 40) pattern = '一般规律'

    return {
      pattern,
      consistency: Math.round(consistency),
      preferredTime,
      preferredDays,
      seasonalTrend,
    }
  }

  return {
    recoveryScore,
    overtrainingSignals,
    recoveryPlan,
    periodizationPlan,
    computeRecoveryScore,
    detectOvertraining,
    getActiveRecoveryRecommendations,
    generateRecoveryPlan,
    generatePeriodizationPlan,
    identifyMovementPatterns,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function getConsecutiveIntenseDays(records: MovementRecord[]): number {
  const dateMap = new Map<string, MovementRecord[]>()
  for (const r of records) {
    if (r.intensity === 'vigorous' || r.intensity === 'extreme') {
      const list = dateMap.get(r.date) ?? []
      list.push(r)
      dateMap.set(r.date, list)
    }
  }

  const dates = [...dateMap.keys()].sort().reverse()
  let consecutive = 0
  const today = new Date()
  for (let i = 0; i < dates.length; i++) {
    const expected = getLocalDateKey(new Date(today.getTime() - i * 86400000))
    if (dates[i] === expected) consecutive++
    else break
  }
  return consecutive
}

function getDayNutrition(day: number, totalDays: number): string[] {
  if (day === 0) {
    return ['高蛋白食物（鸡蛋、鱼肉）', '抗炎食物（蓝莓、姜黄）', '充足碳水补充能量']
  }
  if (day < totalDays - 1) {
    return ['均衡蛋白质+碳水', '补充维生素C', '适量健康脂肪']
  }
  return ['恢复正常饮食', '保持水分摄入', '补充微量元素']
}

function generateMilestones(days: number, _severity: number): { day: number; description: string }[] {
  const milestones: { day: number; description: string }[] = []

  if (days >= 3) {
    milestones.push({ day: 1, description: '完成首次轻度恢复活动' })
    milestones.push({ day: 2, description: '肌肉酸痛明显减轻' })
  }
  if (days >= 5) {
    milestones.push({ day: 3, description: '精力恢复至正常水平80%' })
    milestones.push({ day: 4, description: '可以进行中等强度训练' })
  }
  if (days >= 7) {
    milestones.push({ day: 5, description: '全面恢复，可恢复正常训练' })
    milestones.push({ day: 7, description: '体能超越恢复前水平' })
  }

  return milestones
}

function detectCurrentPhase(records: MovementRecord[]): PeriodizationPhase {
  const recent30d = records.filter(
    r => Date.now() - new Date(r.timestamp).getTime() < 30 * 86400000,
  )

  if (recent30d.length < 3) return 'preparation'

  const recent7d = recent30d.filter(
    r => Date.now() - new Date(r.timestamp).getTime() < 7 * 86400000,
  )

  const totalDuration7d = recent7d.reduce((s, r) => s + r.duration, 0)
  const intenseCount7d = recent7d.filter(
    r => r.intensity === 'vigorous' || r.intensity === 'extreme',
  ).length

  if (totalDuration7d < 60) return 'recovery'
  if (intenseCount7d >= 3) return 'peak'
  if (totalDuration7d > 200) return 'build'

  return 'preparation'
}

function analyzeSeasonalTrend(records: MovementRecord[]): string {
  const monthlyData: Record<string, number> = {}
  for (const r of records) {
    const month = getLocalMonthKey(r.date)
    monthlyData[month] = (monthlyData[month] ?? 0) + r.duration
  }

  const months = Object.keys(monthlyData).sort()
  if (months.length < 3) return '数据不足'

  const recent3 = months.slice(-3).map(m => monthlyData[m])
  const trend = recent3[2] - recent3[0]

  if (trend > 60) return '运动量上升趋势'
  if (trend < -60) return '运动量下降趋势'
  return '运动量稳定'
}

function getKeyNotesForPhase(phase: PeriodizationPhase): string[] {
  switch (phase) {
    case 'preparation':
      return ['循序渐进增加训练量', '注重动作技术', '每周增加不超过10%的训练量', '保证充足睡眠']
    case 'build':
      return ['保持高强度训练质量', '注意营养补充', '监测疲劳信号', '定期进行体能评估']
    case 'peak':
      return ['以比赛配速训练', '减少辅助训练', '保证赛前恢复', '心理准备同样重要']
    case 'taper':
      return ['训练量减半但保持强度', '增加碳水摄入', '充分休息', '避免尝试新运动']
    case 'recovery':
      return ['完全休息或轻度活动', '按摩和拉伸', '补充营养', '反思和规划下一周期']
    default:
      return []
  }
}