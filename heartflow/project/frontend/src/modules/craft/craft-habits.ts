// ============================================================
// 匠庐 · 习惯组合自动推荐（P16-3）
// 创作习惯分析、组合推荐、节奏优化、协同建议
// ============================================================

import { ref } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import type { CraftWork, WorkType } from './types'

// ---- 类型定义 ----

/** 创作时段 */
export type CreativePeriod = 'morning' | 'afternoon' | 'evening' | 'night'

/** 习惯模式 */
export interface HabitPattern {
  /** 时段 */
  period: CreativePeriod
  /** 偏好作品类型 */
  preferredType: WorkType
  /** 该时段创作数 */
  count: number
  /** 该时段平均进化值 */
  avgEvolution: number
  /** 该时段完成率 */
  completionRate: number
  /** 该时段效率评分 */
  efficiencyScore: number
}

/** 习惯组合 */
export interface HabitCombo {
  id: string
  /** 组合名称 */
  name: string
  /** 组合描述 */
  description: string
  /** 包含的作品类型 */
  types: WorkType[]
  /** 推荐时段 */
  recommendedPeriod: CreativePeriod
  /** 协同效应描述 */
  synergyEffect: string
  /** 组合评分 0-100 */
  score: number
  /** 匹配原因 */
  matchReason: string
  /** 建议行动 */
  suggestedAction: string
}

/** 创作节奏分析 */
export interface CreativeRhythm {
  /** 最活跃时段 */
  peakPeriod: CreativePeriod
  /** 最高效时段 */
  mostEfficientPeriod: CreativePeriod
  /** 最频繁类型 */
  mostFrequentType: WorkType
  /** 最高进化类型 */
  highestEvolutionType: WorkType
  /** 平均每日创作数 */
  avgDailyCreations: number
  /** 最佳创作日 */
  bestDayOfWeek: string
  /** 习惯稳定性 0-1 */
  habitStability: number
  /** 时段分布 */
  periodDistribution: { period: CreativePeriod; count: number; percent: number }[]
  /** 类型分布 */
  typeDistribution: { type: WorkType; count: number; avgEvolution: number }[]
}

/** 习惯推荐 */
export interface HabitRecommendation {
  id: string
  title: string
  description: string
  category: 'schedule' | 'type_switch' | 'combo' | 'rest' | 'challenge'
  priority: 'high' | 'medium' | 'low'
  /** 关联的时段 */
  targetPeriod?: CreativePeriod
  /** 关联的类型 */
  targetType?: WorkType
  /** 预期效果 */
  expectedEffect: string
  /** 难度 */
  difficulty: 'easy' | 'medium' | 'hard'
}

// ---- 预设习惯组合 ----

const PRESET_COMBOS: Omit<HabitCombo, 'id' | 'score' | 'matchReason' | 'suggestedAction'>[] = [
  {
    name: '晨间灵感流',
    description: '清晨写作 + 规划，利用大脑最清醒的时刻',
    types: ['writing', 'plan'],
    recommendedPeriod: 'morning',
    synergyEffect: '写作前先规划可提升 30% 完成率',
  },
  {
    name: '午后构建流',
    description: '下午进行代码和设计，利用午后持续专注力',
    types: ['code', 'design'],
    recommendedPeriod: 'afternoon',
    synergyEffect: '代码与设计交替进行可减少疲劳感',
  },
  {
    name: '晚间反思流',
    description: '晚间写洞见和总结，回顾一天收获',
    types: ['insight', 'writing'],
    recommendedPeriod: 'evening',
    synergyEffect: '洞见转化为写作可加深理解',
  },
  {
    name: '深夜创作流',
    description: '深夜进行深度设计和代码，利用安静环境',
    types: ['design', 'code'],
    recommendedPeriod: 'night',
    synergyEffect: '深夜专注力可提升代码质量',
  },
  {
    name: '全能创作流',
    description: '全天候多类型创作，保持创作多样性',
    types: ['writing', 'code', 'design', 'plan', 'insight'],
    recommendedPeriod: 'afternoon',
    synergyEffect: '多类型切换可激发创造力',
  },
  {
    name: '规划执行流',
    description: '先规划再执行，提高完成率',
    types: ['plan', 'code'],
    recommendedPeriod: 'morning',
    synergyEffect: '规划后执行可使完成率提升 40%',
  },
  {
    name: '设计写作流',
    description: '设计搭配写作，视觉与文字互补',
    types: ['design', 'writing'],
    recommendedPeriod: 'afternoon',
    synergyEffect: '视觉设计激发文字灵感',
  },
  {
    name: '洞见编码流',
    description: '从洞见出发编写代码，灵感驱动',
    types: ['insight', 'code'],
    recommendedPeriod: 'morning',
    synergyEffect: '灵感驱动的代码质量更高',
  },
]

// ---- 辅助函数 ----

function getPeriodFromHour(hour: number): CreativePeriod {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

function getPeriodLabel(period: CreativePeriod): string {
  const labels: Record<CreativePeriod, string> = {
    morning: '清晨 (06:00-12:00)',
    afternoon: '午后 (12:00-17:00)',
    evening: '傍晚 (17:00-22:00)',
    night: '深夜 (22:00-06:00)',
  }
  return labels[period]
}

function getDayLabel(day: number): string {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return labels[day]
}

// ============================================================
// 习惯分析引擎
// ============================================================

export function useHabitAnalyzer() {
  const rhythm = ref<CreativeRhythm | null>(null)
  const combos = ref<HabitCombo[]>([])
  const recommendations = ref<HabitRecommendation[]>([])

  /** 分析创作习惯 */
  function analyzeHabits(works: CraftWork[]): CreativeRhythm {
    if (works.length === 0) {
      return createEmptyRhythm()
    }

    // 时段分布
    const periodCount: Record<CreativePeriod, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    const periodEvo: Record<CreativePeriod, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    const periodCompleted: Record<CreativePeriod, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }

    // 类型分布
    const typeCount: Record<string, number> = {}
    const typeEvo: Record<string, number> = {}

    // 日期分布
    const dayCount: Record<number, number> = {}

    for (const w of works) {
      const hour = new Date(w.createdAt).getHours()
      const day = new Date(w.createdAt).getDay()
      const period = getPeriodFromHour(hour)

      periodCount[period]++
      periodEvo[period] += w.evolution
      if (w.status === 'completed') periodCompleted[period]++

      typeCount[w.type] = (typeCount[w.type] || 0) + 1
      typeEvo[w.type] = (typeEvo[w.type] || 0) + w.evolution

      dayCount[day] = (dayCount[day] || 0) + 1
    }

    // 时段效率评分
    const periodEfficiency: Record<CreativePeriod, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    for (const p of Object.keys(periodCount) as CreativePeriod[]) {
      const count = periodCount[p]
      const evo = periodEvo[p]
      const completed = periodCompleted[p]
      if (count > 0) {
        const evoScore = Math.min(100, (evo / count / 20) * 100)
        const completionScore = count > 0 ? (completed / count) * 100 : 0
        periodEfficiency[p] = Math.round(evoScore * 0.6 + completionScore * 0.4)
      }
    }

    // 找出峰值
    let peakPeriod: CreativePeriod = 'afternoon'
    let maxCount = 0
    let mostEfficientPeriod: CreativePeriod = 'afternoon'
    let maxEfficiency = 0

    for (const p of Object.keys(periodCount) as CreativePeriod[]) {
      if (periodCount[p] > maxCount) {
        maxCount = periodCount[p]
        peakPeriod = p
      }
      if (periodEfficiency[p] > maxEfficiency) {
        maxEfficiency = periodEfficiency[p]
        mostEfficientPeriod = p
      }
    }

    // 最频繁类型
    let mostFrequentType: WorkType = 'insight'
    let maxType = 0
    for (const [type, count] of Object.entries(typeCount)) {
      if (count > maxType) {
        maxType = count
        mostFrequentType = type as WorkType
      }
    }

    // 最高进化类型
    let highestEvolutionType: WorkType = 'insight'
    let maxEvo = 0
    for (const [type, evo] of Object.entries(typeEvo)) {
      if (evo > maxEvo) {
        maxEvo = evo
        highestEvolutionType = type as WorkType
      }
    }

    // 最佳创作日
    let bestDay = 1
    let maxDay = 0
    for (const [day, count] of Object.entries(dayCount)) {
      if (count > maxDay) {
        maxDay = count
        bestDay = parseInt(day)
      }
    }

    // 平均每日创作数
    const dates = new Set(works.map(w => getLocalDateKey(new Date(w.createdAt))))
    const avgDailyCreations = dates.size > 0
      ? Math.round((works.length / dates.size) * 10) / 10
      : 0

    // 习惯稳定性
    const dateList = [...dates].sort()
    const habitStability = dates.size > 1
      ? computeHabitStability(dateList)
      : 0

    // 时段分布百分比
    const total = works.length
    const periodDistribution = (Object.keys(periodCount) as CreativePeriod[]).map(p => ({
      period: p,
      count: periodCount[p],
      percent: Math.round((periodCount[p] / total) * 100),
    }))

    // 类型分布
    const typeDistribution = (Object.keys(typeCount) as WorkType[]).map(t => ({
      type: t,
      count: typeCount[t],
      avgEvolution: Math.round(typeEvo[t] / typeCount[t]),
    }))

    rhythm.value = {
      peakPeriod,
      mostEfficientPeriod,
      mostFrequentType,
      highestEvolutionType,
      avgDailyCreations,
      bestDayOfWeek: getDayLabel(bestDay),
      habitStability,
      periodDistribution,
      typeDistribution,
    }

    return rhythm.value
  }

  /** 生成习惯组合推荐 */
  function recommendCombos(works: CraftWork[]): HabitCombo[] {
    if (works.length === 0) return []

    const rhythm = analyzeHabits(works)
    const scored: HabitCombo[] = []

    for (const preset of PRESET_COMBOS) {
      let score = 50

      // 如果时段匹配用户的峰值时段，加分
      if (preset.recommendedPeriod === rhythm.peakPeriod) {
        score += 20
      }

      // 如果包含用户最频繁的类型，加分
      if (preset.types.includes(rhythm.mostFrequentType)) {
        score += 15
      }

      // 如果包含用户最高进化类型，加分
      if (preset.types.includes(rhythm.highestEvolutionType)) {
        score += 15
      }

      // 生成匹配原因
      const reasons: string[] = []
      if (preset.recommendedPeriod === rhythm.peakPeriod) {
        reasons.push(`与你最活跃的${getPeriodLabel(rhythm.peakPeriod)}匹配`)
      }
      if (preset.types.includes(rhythm.mostFrequentType)) {
        reasons.push(`包含你最常创作的「${rhythm.mostFrequentType}」类型`)
      }
      if (preset.types.includes(rhythm.highestEvolutionType)) {
        reasons.push(`包含你进化最高的「${rhythm.highestEvolutionType}」类型`)
      }

      // 生成建议行动
      const suggestedAction = generateSuggestedAction(preset, rhythm)

      scored.push({
        ...preset,
        id: `combo_${preset.name}`,
        score: Math.min(100, score),
        matchReason: reasons.length > 0 ? reasons.join('；') : '通用推荐组合',
        suggestedAction,
      })
    }

    combos.value = scored.sort((a, b) => b.score - a.score)
    return combos.value
  }

  /** 生成习惯优化建议 */
  function generateRecommendations(works: CraftWork[]): HabitRecommendation[] {
    if (works.length === 0) return []

    const rhythm = analyzeHabits(works)
    const recs: HabitRecommendation[] = []

    // 1. 时段优化建议
    if (rhythm.habitStability < 0.5) {
      recs.push({
        id: 'rec_schedule_stability',
        title: '建立固定创作时段',
        description: '你的创作习惯不够稳定，建议每天固定一个时间段进行创作',
        category: 'schedule',
        priority: 'high',
        targetPeriod: rhythm.peakPeriod,
        expectedEffect: '习惯稳定性提升 30%',
        difficulty: 'medium',
      })
    }

    // 2. 空档时段建议
    const emptyPeriods = rhythm.periodDistribution.filter(p => p.count === 0)
    if (emptyPeriods.length > 0) {
      recs.push({
        id: 'rec_schedule_explore',
        title: `尝试在${getPeriodLabel(emptyPeriods[0].period)}创作`,
        description: `你在${emptyPeriods.map(p => getPeriodLabel(p.period)).join('、')}还没有创作记录，尝试在不同时段创作可能发现新的高效时段`,
        category: 'schedule',
        priority: 'medium',
        targetPeriod: emptyPeriods[0].period,
        expectedEffect: '发现新的创作节奏',
        difficulty: 'easy',
      })
    }

    // 3. 类型多样化建议
    const activeTypes = rhythm.typeDistribution.filter(t => t.count > 0)
    if (activeTypes.length < 3 && works.length >= 10) {
      const allTypes: WorkType[] = ['writing', 'code', 'design', 'plan', 'insight']
      const usedTypes = new Set(activeTypes.map(t => t.type))
      const unusedTypes = allTypes.filter(t => !usedTypes.has(t))
      if (unusedTypes.length > 0) {
        recs.push({
          id: 'rec_type_diversity',
          title: '尝试新的创作类型',
          description: `你还没有尝试过${unusedTypes.map(t => typeLabel(t)).join('、')}，拓展创作类型可以激发新的灵感`,
          category: 'type_switch',
          priority: 'medium',
          targetType: unusedTypes[0],
          expectedEffect: '创作多样性提升，可能发现新的兴趣领域',
          difficulty: 'easy',
        })
      }
    }

    // 4. 高效时段聚焦建议
    if (rhythm.peakPeriod !== rhythm.mostEfficientPeriod) {
      recs.push({
        id: 'rec_efficiency_focus',
        title: '将重要创作移至高效时段',
        description: `你最高效的创作时段是${getPeriodLabel(rhythm.mostEfficientPeriod)}，但最活跃的时段是${getPeriodLabel(rhythm.peakPeriod)}。建议将重要作品安排在高效时段`,
        category: 'schedule',
        priority: 'high',
        targetPeriod: rhythm.mostEfficientPeriod,
        expectedEffect: '创作效率提升 20%',
        difficulty: 'medium',
      })
    }

    // 5. 休息建议
    if (rhythm.avgDailyCreations > 5) {
      recs.push({
        id: 'rec_rest',
        title: '注意创作节奏',
        description: `你平均每天创作 ${rhythm.avgDailyCreations} 个作品，建议适当休息，质量比数量更重要`,
        category: 'rest',
        priority: 'medium',
        expectedEffect: '防止创作疲劳，保持长期动力',
        difficulty: 'easy',
      })
    }

    // 6. 挑战建议
    if (rhythm.habitStability > 0.7 && works.length >= 20) {
      recs.push({
        id: 'rec_challenge',
        title: '30 天创作挑战',
        description: '你的创作习惯非常稳定，试试挑战连续 30 天创作一个全新类型的作品',
        category: 'challenge',
        priority: 'low',
        expectedEffect: '突破舒适区，解锁传说徽章',
        difficulty: 'hard',
      })
    }

    recommendations.value = recs
    return recs
  }

  return {
    rhythm,
    combos,
    recommendations,
    analyzeHabits,
    recommendCombos,
    generateRecommendations,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function createEmptyRhythm(): CreativeRhythm {
  return {
    peakPeriod: 'afternoon',
    mostEfficientPeriod: 'afternoon',
    mostFrequentType: 'insight',
    highestEvolutionType: 'insight',
    avgDailyCreations: 0,
    bestDayOfWeek: '未知',
    habitStability: 0,
    periodDistribution: [
      { period: 'morning', count: 0, percent: 0 },
      { period: 'afternoon', count: 0, percent: 0 },
      { period: 'evening', count: 0, percent: 0 },
      { period: 'night', count: 0, percent: 0 },
    ],
    typeDistribution: [],
  }
}

function computeHabitStability(sortedDates: string[]): number {
  if (sortedDates.length < 2) return 0

  const gaps: number[] = []
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]).getTime()
    const curr = new Date(sortedDates[i]).getTime()
    const gap = (curr - prev) / (1000 * 60 * 60 * 24)
    gaps.push(gap)
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length
  const variance = gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length
  const stdDev = Math.sqrt(variance)

  // 间隔越规律，稳定性越高
  return Math.max(0, Math.min(1, 1 - stdDev / 7))
}

function typeLabel(type: WorkType): string {
  const labels: Record<WorkType, string> = {
    writing: '写作',
    code: '代码',
    design: '设计',
    plan: '规划',
    insight: '洞见',
  }
  return labels[type]
}

function generateSuggestedAction(
  combo: Omit<HabitCombo, 'id' | 'score' | 'matchReason' | 'suggestedAction'>,
  _rhythm: CreativeRhythm,
): string {
  const periodLabel = getPeriodLabel(combo.recommendedPeriod)
  const typeNames = combo.types.map(t => typeLabel(t)).join(' + ')
  return `在${periodLabel}时段，尝试先做${typeNames}的创作组合`
}