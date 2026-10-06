// ============================================================
// 藏象阁 · 体质趋势追踪（P21-1）
// 蓝图定义：
//   体质历史趋势（多次分析结果对比）
//   体质偏移预测（基于五运六气+季节性+经络记录）
//   养生评分（综合评分+各维度评分）
//   个性化调理建议（基于体质+运气+经络+情绪的个性化建议）
//   体质转变检测（质变检测+预警）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type {
  ConstitutionType,
  ConstitutionAnalysis,
  MeridianRecord,
  MoodRecord,
  FiveElement,
} from './types'
import type { YearlyMovement } from './five-movements'
import { CONSTITUTION_META } from './types'

// ---- 类型定义 ----

/** 体质趋势点 */
export interface ConstitutionTrendPoint {
  date: string
  type: ConstitutionType
  label: string
  /** 各体质得分 */
  scores: Record<ConstitutionType, number>
  /** 主要体质得分 */
  primaryScore: number
  /** 体质稳定性 */
  stability: number
}

/** 体质偏移预测 */
export interface ConstitutionShiftPrediction {
  /** 当前体质 */
  currentType: ConstitutionType
  /** 预测方向 */
  predictedShift: ConstitutionType | null
  /** 偏移概率 */
  shiftProbability: number
  /** 触发因素 */
  triggers: string[]
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high'
  /** 预防建议 */
  preventionAdvice: string[]
}

/** 养生评分维度 */
export type WellnessDimension = 'physical' | 'emotional' | 'seasonal' | 'meridian' | 'lifestyle'

/** 养生评分 */
export interface WellnessScore {
  overall: number
  dimensions: Record<WellnessDimension, number>
  labels: Record<WellnessDimension, string>
  /** 相比上次变化 */
  change: number
  /** 趋势 */
  trend: 'improving' | 'stable' | 'declining'
  /** 评估时间 */
  assessedAt: string
}

/** 个性化调理建议 */
export interface PersonalizedWellnessAdvice {
  /** 饮食建议 */
  diet: { food: string; reason: string; frequency: string }[]
  /** 运动建议 */
  exercise: { type: string; duration: string; frequency: string; reason: string }[]
  /** 穴位按摩 */
  acupressure: { point: string; location: string; technique: string; benefit: string }[]
  /** 作息建议 */
  lifestyle: string[]
  /** 情绪调节 */
  emotional: string[]
  /** 季节适配 */
  seasonal: string[]
  /** 基于五运六气 */
  fiveSixBased: string[]
}

/** 体质转变检测 */
export interface ConstitutionChangeDetection {
  /** 是否发生质变 */
  hasChanged: boolean
  /** 之前体质 */
  previousType: ConstitutionType | null
  /** 当前体质 */
  currentType: ConstitutionType
  /** 转变类型 */
  changeType: 'stable' | 'gradual' | 'sudden' | 'seasonal'
  /** 转变方向 */
  direction: 'improved' | 'worsened' | 'shifted'
  /** 置信度 */
  confidence: number
  /** 检测时间 */
  detectedAt: string
  /** 建议 */
  recommendations: string[]
}

// ---- 存储键 ----

const STORAGE_KEYS = {
  trendHistory: 'hf:body-wisdom:constitution-trend-history',
  wellnessScores: 'hf:body-wisdom:wellness-scores',
  changeLog: 'hf:body-wisdom:constitution-change-log',
} as const

// ---- 常量 ----

/** 体质稳定性阈值 */
const STABILITY_THRESHOLD = 0.7

/** 体质转变检测阈值 */
const CHANGE_THRESHOLD = 0.3

/** 五运六气对体质的影响 */
const FIVE_ELEMENT_CONSTITUTION_MAP: Record<FiveElement, ConstitutionType[]> = {
  wood: ['qi-stagnation', 'blood-stasis'],
  fire: ['yin-deficiency', 'damp-heat'],
  earth: ['phlegm-dampness', 'qi-deficiency'],
  metal: ['qi-deficiency', 'yin-deficiency'],
  water: ['yang-deficiency', 'blood-stasis'],
}

/** 季节对体质的影响 */
const SEASONAL_CONSTITUTION_INFLUENCE: Record<string, ConstitutionType[]> = {
  '春': ['qi-stagnation', 'blood-stasis'],
  '夏': ['yin-deficiency', 'damp-heat'],
  '长夏': ['phlegm-dampness', 'qi-deficiency'],
  '秋': ['qi-deficiency', 'yin-deficiency'],
  '冬': ['yang-deficiency', 'blood-stasis'],
}

// ============================================================
// useConstitutionTrend — 体质趋势追踪
// ============================================================

export function useConstitutionTrend() {
  const trendHistory = ref<ConstitutionTrendPoint[]>(
    storage.getKV<ConstitutionTrendPoint[]>(STORAGE_KEYS.trendHistory, []),
  )
  const wellnessScores = ref<WellnessScore[]>(
    storage.getKV<WellnessScore[]>(STORAGE_KEYS.wellnessScores, []),
  )
  const changeLog = ref<ConstitutionChangeDetection[]>(
    storage.getKV<ConstitutionChangeDetection[]>(STORAGE_KEYS.changeLog, []),
  )

  function persist() {
    storage.setKV(STORAGE_KEYS.trendHistory, trendHistory.value)
    storage.setKV(STORAGE_KEYS.wellnessScores, wellnessScores.value)
    storage.setKV(STORAGE_KEYS.changeLog, changeLog.value)
  }

  function load() {
    trendHistory.value = storage.getKV<ConstitutionTrendPoint[]>(STORAGE_KEYS.trendHistory, [])
    wellnessScores.value = storage.getKV<WellnessScore[]>(STORAGE_KEYS.wellnessScores, [])
    changeLog.value = storage.getKV<ConstitutionChangeDetection[]>(STORAGE_KEYS.changeLog, [])
  }

  // ---- 体质趋势 ----

  /** 添加体质分析到趋势历史 */
  function addTrendPoint(analysis: ConstitutionAnalysis): ConstitutionTrendPoint {
    // 计算稳定性
    const stability = trendHistory.value.length > 0
      ? computeStability(analysis, trendHistory.value[trendHistory.value.length - 1])
      : 1.0

    const point: ConstitutionTrendPoint = {
      date: analysis.analyzedAt,
      type: analysis.type,
      label: analysis.label,
      scores: analysis.scores,
      primaryScore: analysis.scores[analysis.type],
      stability,
    }

    trendHistory.value.push(point)
    // 限制历史长度
    if (trendHistory.value.length > 50) {
      trendHistory.value = trendHistory.value.slice(-50)
    }

    // 检测体质转变
    const change = detectChange(analysis)
    if (change) {
      changeLog.value.push(change)
      if (changeLog.value.length > 30) {
        changeLog.value = changeLog.value.slice(-30)
      }
    }

    persist()
    return point
  }

  /** 计算两次分析之间的稳定性 */
  function computeStability(current: ConstitutionAnalysis, previous: ConstitutionTrendPoint): number {
    const types = Object.keys(current.scores) as ConstitutionType[]
    let totalDiff = 0

    for (const type of types) {
      totalDiff += Math.abs(current.scores[type] - (previous.scores[type] ?? 0))
    }

    return Math.max(0, 1 - totalDiff / types.length)
  }

  /** 体质趋势数据（用于图表） */
  const trendChartData = computed(() => {
    if (trendHistory.value.length === 0) return null

    const labels = trendHistory.value.map(p => getLocalDateKey(new Date(p.date)))
    const types = Object.keys(trendHistory.value[0].scores) as ConstitutionType[]

    const datasets = types.map(type => ({
      type,
      label: CONSTITUTION_META[type]?.label ?? type,
      data: trendHistory.value.map(p => p.scores[type] ?? 0),
    }))

    return { labels, datasets }
  })

  /** 最近趋势 */
  const recentTrend = computed(() => {
    const recent = trendHistory.value.slice(-5)
    if (recent.length < 2) return null

    const firstScore = recent[0].primaryScore
    const lastScore = recent[recent.length - 1].primaryScore
    const change = lastScore - firstScore

    return {
      direction: change > 0.05 ? 'improving' : change < -0.05 ? 'declining' : 'stable' as const,
      change: Math.round(change * 100),
      trend: recent,
    }
  })

  // ---- 体质偏移预测 ----

  /** 预测体质偏移方向 */
  function predictShift(
    currentAnalysis: ConstitutionAnalysis,
    fiveSix: YearlyMovement | null,
    meridianRecords: MeridianRecord[],
    moodRecords: MoodRecord[],
  ): ConstitutionShiftPrediction {
    const triggers: string[] = []

    // 1. 五运六气影响
    if (fiveSix) {
      const atRiskTypes = FIVE_ELEMENT_CONSTITUTION_MAP[fiveSix.greatMovement] ?? []
      if (atRiskTypes.includes(currentAnalysis.type)) {
        triggers.push(`今年${fiveSix.greatMovement}运${fiveSix.isExcess ? '太过' : '不及'}，可能加重${currentAnalysis.label}体质`)
      }
    }

    // 2. 季节影响
    const now = new Date()
    const month = now.getMonth() + 1
    let season = '春'
    if (month >= 3 && month <= 5) season = '春'
    else if (month >= 6 && month <= 8) season = '夏'
    else if (month >= 9 && month <= 11) season = '秋'
    else season = '冬'

    const seasonalRisk = SEASONAL_CONSTITUTION_INFLUENCE[season] ?? []
    if (seasonalRisk.includes(currentAnalysis.type)) {
      triggers.push(`${season}季可能加重${currentAnalysis.label}体质倾向`)
    }

    // 3. 经络记录分析
    const badRate = meridianRecords.length > 0
      ? meridianRecords.filter(r => r.feeling === 'bad').length / meridianRecords.length
      : 0
    if (badRate > 0.3) {
      triggers.push(`经络不良率${Math.round(badRate * 100)}%，体质可能恶化`)
    }

    // 4. 情绪影响
    const negativeMoods = moodRecords.filter(m => m.mood === 'anxious' || m.mood === 'sad' || m.mood === 'angry' || m.mood === 'fearful')
    if (negativeMoods.length > moodRecords.length * 0.3) {
      triggers.push('近期负面情绪较多，可能影响体质')
    }

    // 计算偏移概率
    let shiftProbability = 0
    if (triggers.length >= 3) shiftProbability = 0.6
    else if (triggers.length >= 2) shiftProbability = 0.4
    else if (triggers.length >= 1) shiftProbability = 0.2

    // 预测偏移方向
    let predictedShift: ConstitutionType | null = null
    if (shiftProbability > 0.3) {
      // 找到最可能偏移的体质类型
      const scores = currentAnalysis.scores
      let maxAltScore = 0
      for (const [type, score] of Object.entries(scores)) {
        if (type !== currentAnalysis.type && score > maxAltScore) {
          maxAltScore = score
          predictedShift = type as ConstitutionType
        }
      }
    }

    const riskLevel: 'low' | 'medium' | 'high' =
      shiftProbability > 0.5 ? 'high' : shiftProbability > 0.3 ? 'medium' : 'low'

    const preventionAdvice: string[] = []
    if (riskLevel !== 'low') {
      preventionAdvice.push('加强体质调理，保持规律作息')
      preventionAdvice.push(`重点关注${currentAnalysis.label}体质的调理建议`)
      if (predictedShift) {
        const meta = CONSTITUTION_META[predictedShift]
        if (meta) {
          preventionAdvice.push(`预防向${meta.label}偏移：${meta.advice}`)
        }
      }
    }

    return {
      currentType: currentAnalysis.type,
      predictedShift,
      shiftProbability,
      triggers,
      riskLevel,
      preventionAdvice,
    }
  }

  // ---- 体质转变检测 ----

  /** 检测体质是否发生质变 */
  function detectChange(analysis: ConstitutionAnalysis): ConstitutionChangeDetection | null {
    if (trendHistory.value.length === 0) return null

    const previous = trendHistory.value[trendHistory.value.length - 1]

    // 类型没变
    if (previous.type === analysis.type) {
      // 检查得分变化
      const scoreChange = Math.abs(analysis.scores[analysis.type] - previous.scores[analysis.type])
      if (scoreChange < CHANGE_THRESHOLD) return null

      return {
        hasChanged: false,
        previousType: previous.type,
        currentType: analysis.type,
        changeType: 'gradual',
        direction: analysis.scores[analysis.type] > previous.scores[analysis.type] ? 'improved' : 'worsened',
        confidence: 0.8,
        detectedAt: new Date().toISOString(),
        recommendations: analysis.scores[analysis.type] > previous.scores[analysis.type]
          ? ['体质正在改善，继续保持良好习惯']
          : ['体质有恶化趋势，请加强调理'],
      }
    }

    // 类型改变
    const changeType = isSuddenChange(analysis, previous) ? 'sudden' : 'gradual'

    // 判断方向
    const isBalanced = analysis.type === 'balanced'
    const wasBalanced = previous.type === 'balanced'
    let direction: 'improved' | 'worsened' | 'shifted' = 'shifted'
    if (isBalanced && !wasBalanced) direction = 'improved'
    else if (!isBalanced && wasBalanced) direction = 'worsened'

    return {
      hasChanged: true,
      previousType: previous.type,
      currentType: analysis.type,
      changeType,
      direction,
      confidence: 0.85,
      detectedAt: new Date().toISOString(),
      recommendations: [
        `体质从${CONSTITUTION_META[previous.type]?.label ?? previous.type}转为${analysis.label}`,
        ...(direction === 'improved' ? ['体质正在改善，继续保持'] : ['体质发生变化，请关注调理']),
      ],
    }
  }

  /** 判断是否为突变 */
  function isSuddenChange(current: ConstitutionAnalysis, previous: ConstitutionTrendPoint): boolean {
    const scoreDiff = Math.abs(current.scores[current.type] - previous.scores[previous.type])
    const timeDiff = (new Date(current.analyzedAt).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24)
    return scoreDiff > 0.5 && timeDiff < 30
  }

  // ---- 养生评分 ----

  /** 计算养生综合评分 */
  function computeWellnessScore(
    constitutionAnalysis: ConstitutionAnalysis,
    meridianRecords: MeridianRecord[],
    moodRecords: MoodRecord[],
    fiveSix: YearlyMovement | null,
  ): WellnessScore {
    // 体质评分
    const physicalScore = constitutionAnalysis.type === 'balanced'
      ? 90
      : Math.round((1 - Math.max(0, constitutionAnalysis.scores[constitutionAnalysis.type] - 0.3)) * 100)

    // 情绪评分
    const positiveMoods = moodRecords.filter(m => m.mood === 'calm' || m.mood === 'happy').length
    const emotionalScore = moodRecords.length > 0
      ? Math.round((positiveMoods / moodRecords.length) * 100)
      : 50

    // 季节适配评分
    const seasonalScore = fiveSix ? 70 : 50

    // 经络评分
    const goodRecords = meridianRecords.filter(r => r.feeling === 'good').length
    const meridianScore = meridianRecords.length > 0
      ? Math.round((goodRecords / meridianRecords.length) * 100)
      : 50

    // 作息评分
    const lifestyleScore = 65

    const dimensions: Record<WellnessDimension, number> = {
      physical: physicalScore,
      emotional: emotionalScore,
      seasonal: seasonalScore,
      meridian: meridianScore,
      lifestyle: lifestyleScore,
    }

    const overall = Math.round(
      physicalScore * 0.3 + emotionalScore * 0.25 + seasonalScore * 0.15 + meridianScore * 0.2 + lifestyleScore * 0.1,
    )

    // 与上次比较
    const previous = wellnessScores.value.length > 0
      ? wellnessScores.value[wellnessScores.value.length - 1]
      : null
    const change = previous ? overall - previous.overall : 0
    const trend: 'improving' | 'stable' | 'declining' =
      change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable'

    const score: WellnessScore = {
      overall,
      dimensions,
      labels: {
        physical: '体质',
        emotional: '情绪',
        seasonal: '季节适配',
        meridian: '经络',
        lifestyle: '作息',
      },
      change,
      trend,
      assessedAt: new Date().toISOString(),
    }

    wellnessScores.value.push(score)
    if (wellnessScores.value.length > 30) {
      wellnessScores.value = wellnessScores.value.slice(-30)
    }
    persist()

    return score
  }

  /** 最新养生评分 */
  const latestWellnessScore = computed(() => {
    return wellnessScores.value.length > 0
      ? wellnessScores.value[wellnessScores.value.length - 1]
      : null
  })

  /** 养生评分趋势 */
  const wellnessTrend = computed(() => {
    return wellnessScores.value.slice(-14).map(s => ({
      date: getLocalDateKey(new Date(s.assessedAt)),
      overall: s.overall,
      physical: s.dimensions.physical,
      emotional: s.dimensions.emotional,
      meridian: s.dimensions.meridian,
    }))
  })

  // ---- 个性化调理建议 ----

  /** 生成个性化调理建议 */
  function generatePersonalizedAdvice(
    constitutionAnalysis: ConstitutionAnalysis,
    fiveSix: YearlyMovement | null,
    _meridianRecords: MeridianRecord[],
    _moodRecords: MoodRecord[],
  ): PersonalizedWellnessAdvice {
    const meta = CONSTITUTION_META[constitutionAnalysis.type]

    // 饮食建议
    const diet: PersonalizedWellnessAdvice['diet'] = [
      { food: '山药', reason: '健脾益气', frequency: '每周2-3次' },
      { food: '红枣', reason: '补血安神', frequency: '每日3-5颗' },
      { food: '枸杞', reason: '滋补肝肾', frequency: '每日泡水' },
    ]

    // 根据体质调整
    if (constitutionAnalysis.type === 'qi-deficiency') {
      diet.push({ food: '黄芪', reason: '大补元气', frequency: '每周煲汤' })
    } else if (constitutionAnalysis.type === 'yin-deficiency') {
      diet.push({ food: '银耳', reason: '滋阴润肺', frequency: '每周2-3次' })
    } else if (constitutionAnalysis.type === 'damp-heat') {
      diet.push({ food: '薏仁', reason: '清热利湿', frequency: '每周煮粥' })
    }

    // 运动建议
    const exercise: PersonalizedWellnessAdvice['exercise'] = [
      { type: '散步', duration: '30分钟', frequency: '每日', reason: '促进气血运行' },
      { type: '八段锦', duration: '15分钟', frequency: '每周3-5次', reason: '调和阴阳' },
    ]

    if (constitutionAnalysis.type === 'blood-stasis' || constitutionAnalysis.type === 'qi-stagnation') {
      exercise.push({ type: '太极', duration: '30分钟', frequency: '每周3次', reason: '活血化瘀，疏肝理气' })
    }

    // 穴位按摩
    const acupressure: PersonalizedWellnessAdvice['acupressure'] = [
      { point: '足三里', location: '膝盖外侧下方3寸', technique: '拇指按压5分钟', benefit: '健脾胃，补气血' },
      { point: '涌泉', location: '足底前1/3凹陷处', technique: '睡前揉搓至发热', benefit: '补肾固精，安神助眠' },
    ]

    if (constitutionAnalysis.type === 'qi-stagnation') {
      acupressure.push({ point: '太冲', location: '足背第一、二跖骨间', technique: '拇指按压3分钟', benefit: '疏肝解郁' })
    } else if (constitutionAnalysis.type === 'yang-deficiency') {
      acupressure.push({ point: '关元', location: '脐下3寸', technique: '艾灸或热敷', benefit: '温阳补气' })
    }

    // 作息建议
    const lifestyle: string[] = [
      '保持规律作息，早睡早起',
      '按子午流注时辰调整生活节奏',
      meta.advice,
    ]

    // 情绪调节
    const emotional: string[] = [
      '保持心情舒畅，避免情绪过激',
      '每日冥想或深呼吸10分钟',
    ]

    if (constitutionAnalysis.type === 'qi-stagnation') {
      emotional.push('多与朋友交流，避免独处')
      emotional.push('培养兴趣爱好，转移注意力')
    }

    // 季节适配
    const seasonal: string[] = []
    const now = new Date()
    const month = now.getMonth() + 1
    if (month >= 3 && month <= 5) {
      seasonal.push('春季养肝：多食绿色蔬菜，保持心情舒畅')
      seasonal.push('适当户外活动，舒展筋骨')
    } else if (month >= 6 && month <= 8) {
      seasonal.push('夏季养心：避免过度出汗，适当午休')
      seasonal.push('饮食清淡，多食苦味食物')
    } else if (month >= 9 && month <= 11) {
      seasonal.push('秋季润肺：多食白色食物，保持皮肤湿润')
      seasonal.push('防燥保湿，适当增加衣物')
    } else {
      seasonal.push('冬季补肾：早睡晚起，注意保暖')
      seasonal.push('多食黑色食物，减少消耗')
    }

    // 五运六气建议
    const fiveSixBased: string[] = []
    if (fiveSix) {
      fiveSixBased.push(fiveSix.healthAdvice)
      fiveSixBased.push(`当前主气${fiveSix.currentHostQi}，注意调适`)
    }

    return {
      diet,
      exercise,
      acupressure,
      lifestyle,
      emotional,
      seasonal,
      fiveSixBased,
    }
  }

  // ---- 体质稳定性分析 ----

  /** 体质稳定性分析 */
  const stabilityAnalysis = computed(() => {
    if (trendHistory.value.length < 2) return null

    const recent = trendHistory.value.slice(-10)
    const types = recent.map(p => p.type)
    const uniqueTypes = new Set(types)

    const sameTypeCount = types.filter(t => t === types[types.length - 1]).length
    const stability = sameTypeCount / types.length

    return {
      stable: stability >= STABILITY_THRESHOLD,
      stability,
      dominantType: types[types.length - 1],
      uniqueTypes: uniqueTypes.size,
      trend: recent.map(p => ({ date: getLocalDateKey(new Date(p.date)), score: p.primaryScore })),
      analysis: stability >= STABILITY_THRESHOLD
        ? '体质稳定，保持良好'
        : uniqueTypes.size > 2
          ? '体质波动较大，需要注意调理'
          : '体质有轻微波动',
    }
  })

  return {
    // 状态
    trendHistory,
    wellnessScores,
    changeLog,

    // 计算属性
    trendChartData,
    recentTrend,
    latestWellnessScore,
    wellnessTrend,
    stabilityAnalysis,

    // 操作
    addTrendPoint,
    predictShift,
    detectChange,
    computeWellnessScore,
    generatePersonalizedAdvice,
    persist,
    load,
  }
}

let _constitutionTrendInstance: ReturnType<typeof useConstitutionTrend> | null = null

export function getConstitutionTrendStore() {
  if (!_constitutionTrendInstance) {
    _constitutionTrendInstance = useConstitutionTrend()
  }
  return _constitutionTrendInstance
}