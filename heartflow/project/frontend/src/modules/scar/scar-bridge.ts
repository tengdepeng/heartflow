// ============================================================
// 工痕 · 视图桥接层（P20-3）
// 为 Scar.vue 提供标准化模块接口，替代直接 storage 调用
// ============================================================

import { ref, computed } from 'vue'
import { useScarHealing } from './healing'
import { useScarStories, useCommunitySupport, useScarMap, useForgingRituals } from './scar-story'
import { useNarrativeTemplate, useResonanceAlgorithm, useScarVisualization } from './narrative-template'
import { useCausalChain } from './causal-chain'
import { useHealingPredictor } from './healing-predict'
import { useHealingJourney } from './healing-journey'
import { useNarrativeEnhancer } from './narrative-enhancer'
import type {
  BodyMark, GrowthRecord, ForgingRecord, ScarStats,
  BodyPart, ScarType, SeverityLevel, HealingStage,
} from './types'
import { SCAR_STORAGE_KEYS, HEALING_STAGES, BODY_PART_META, SCAR_TYPE_META } from './types'
import type {
  StoryChapter, ScarStory, CommunityShare, CommunityResponse,
  ScarMap, RitualType, ForgingRitual,
} from './scar-story'
import type {
  NarrativeTemplateType, NarrativeTemplate, NarrativeDraft,
  ResonanceMatch, CommunityResonance, ResonanceStats,
  ScarVisualizationData,
} from './narrative-template'
import type {
  CausalEvent, CausalLink, ScarCausalChain, CausalChainAnalysis,
} from './causal-chain'
import type { HealingPrediction, PredictionFactors } from './healing-predict'
import type { HealingJourney, JourneyMilestone, JourneyStage } from './healing-journey'
import type { NarrativeEnhancement, PatternMatch, NarrativePattern } from './narrative-enhancer'

// ============================================================
// 类型定义
// ============================================================

/** 桥接层返回的完整状态 */
export interface ScarBridgeState {
  /** 伤痕列表 */
  marks: BodyMark[]
  /** 成长记录 */
  growthRecords: GrowthRecord[]
  /** 锻造记录 */
  forgingRecords: ForgingRecord[]
  /** 统计 */
  stats: ScarStats
  /** 伤痕故事 */
  stories: ScarStory[]
  /** 社区分享 */
  communityShares: CommunityShare[]
  /** 伤痕地图 */
  scarMap: ScarMap | null
  /** 因果链分析 */
  causalChain: CausalChainAnalysis | null
  /** 愈合预测 */
  prediction: HealingPrediction | null
  /** 愈合旅程 */
  journey: HealingJourney | null
  /** 叙事增强 */
  narrativeEnhancement: NarrativeEnhancement | null
  /** 可视化数据 */
  visualizationData: ScarVisualizationData | null
  /** 共鸣统计 */
  resonanceStats: ResonanceStats | null
}

/** 快捷统计 */
export interface ScarQuickStats {
  /** 总伤痕数 */
  totalMarks: number
  /** 新鲜伤痕数 */
  freshMarks: number
  /** 愈合中伤痕数 */
  healingMarks: number
  /** 已结疤伤痕数 */
  scarredMarks: number
  /** 已转化伤痕数 */
  transformedMarks: number
  /** 转化率 */
  transformationRate: number
  /** 平均愈合进度 */
  avgHealingProgress: number
  /** 锻造连续天数 */
  forgingStreak: number
  /** 最近伤痕 */
  recentMarks: BodyMark[]
  /** 最严重部位 */
  mostAffectedPart: string
}

// ============================================================
// useScarBridge Composable
// ============================================================

export function useScarBridge() {
  // ---- 子模块 ----
  const healing = useScarHealing()
  const stories = useScarStories()
  const community = useCommunitySupport()
  const scarMapModule = useScarMap()
  const rituals = useForgingRituals()
  const narrative = useNarrativeTemplate()
  const resonance = useResonanceAlgorithm()
  const visualization = useScarVisualization()
  const causalChain = useCausalChain()
  const predictor = useHealingPredictor()
  const journey = useHealingJourney()
  const enhancer = useNarrativeEnhancer()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 初始化 ----

  function initialize(existingMarks?: BodyMark[]): void {
    if (existingMarks && existingMarks.length > 0) {
      refreshAll()
    }
  }

  function refreshAll(): void {
    const marks = healing.marks?.value ?? []
    const growthRecords = healing.growthRecords?.value ?? []
    const stats = healing.getStats()

    // 愈合旅程
    if (marks.length > 0) {
      journey.trackJourney(marks, growthRecords)
    }

    // 叙事增强
    if (marks.length > 0) {
      enhancer.enhanceNarrative(marks, stats)
    }
  }

  // ============================================================
  // 伤痕操作
  // ============================================================

  async function addMark(params: {
    bodyPart: BodyPart
    severity: SeverityLevel
    scarType: ScarType
    description: string
    worklogId?: string
  }): Promise<BodyMark> {
    const mark = await healing.addMark(
      params.bodyPart, params.severity, params.scarType,
      params.description, params.worklogId,
    )
    refreshAll()
    return mark
  }

  async function recordGrowth(params: {
    scarId: string
    reflection: string
    learned: string
    growthDirection: string
  }): Promise<GrowthRecord> {
    const record = await healing.recordGrowth(
      params.scarId, params.reflection, params.learned, params.growthDirection,
    )
    refreshAll()
    return record
  }

  // ============================================================
  // 快捷统计
  // ============================================================

  function computeStats(): ScarStats {
    return healing.getStats()
  }

  const quickStats = computed<ScarQuickStats>(() => {
    const stats = computeStats()
    const marks = healing.marks?.value ?? []

    // 找最严重部位
    let mostPart = ''
    let maxCount = 0
    for (const [part, count] of Object.entries(stats.bodyPartDistribution)) {
      if (count > maxCount) {
        maxCount = count
        mostPart = part
      }
    }

    return {
      totalMarks: stats.total,
      freshMarks: stats.fresh,
      healingMarks: stats.healing,
      scarredMarks: stats.scarred,
      transformedMarks: stats.transformed,
      transformationRate: stats.transformationRate,
      avgHealingProgress: stats.avgHealingProgress,
      forgingStreak: healing.getForgingStreak(),
      recentMarks: marks.slice(0, 5),
      mostAffectedPart: mostPart ? BODY_PART_META[mostPart as BodyPart]?.label || mostPart : '—',
    }
  })

  // ============================================================
  // 完整状态
  // ============================================================

  const bridgeState = computed<ScarBridgeState>(() => {
    const marks = healing.marks?.value ?? []
    const growthRecords = healing.growthRecords?.value ?? []
    const stats = computeStats()

    // 因果链分析
    let chainAnalysis: CausalChainAnalysis | null = null
    if (marks.length >= 2) {
      const chains = causalChain.buildAllChains(marks, growthRecords)
      chainAnalysis = causalChain.analyzeChains(chains)
    }

    // 愈合预测
    let prediction: HealingPrediction | null = null
    const latestMark = marks[0]
    if (latestMark) {
      prediction = predictor.predictHealing(latestMark, marks, growthRecords)
    }

    // 伤痕地图
    let scarMap: ScarMap | null = null
    if (marks.length > 0) {
      scarMap = scarMapModule.generateScarMap(marks)
    }

    // 可视化数据
    let vizData: ScarVisualizationData | null = null
    if (marks.length > 0) {
      vizData = visualization.generateVisualizationData(marks)
    }

    // 共鸣统计
    let resonanceStats: ResonanceStats | null = null
    if (marks.length > 0) {
      resonanceStats = resonance.computeResonanceStats(marks)
    }

    return {
      marks,
      growthRecords,
      forgingRecords: healing.forgingRecords?.value ?? [],
      stats,
      stories: stories.stories?.value ?? [],
      communityShares: community.shares?.value ?? [],
      scarMap,
      causalChain: chainAnalysis,
      prediction,
      journey: journey.journey?.value ?? null,
      narrativeEnhancement: enhancer.enhancement?.value ?? null,
      visualizationData: vizData,
      resonanceStats,
    }
  })

  return {
    // 状态
    isLoading,
    quickStats,
    bridgeState,

    // 伤痕操作
    addMark,
    recordGrowth,

    // 子模块
    healing,
    stories,
    community,
    scarMap: scarMapModule,
    rituals,
    narrative,
    resonance,
    visualization,
    causalChain,
    predictor,
    journey,
    enhancer,

    // 生命周期
    initialize,
    refreshAll,
  }
}

// ============================================================
// 导出常量
// ============================================================

export { SCAR_STORAGE_KEYS, HEALING_STAGES, BODY_PART_META, SCAR_TYPE_META }
export type { BodyMark, GrowthRecord, ForgingRecord, ScarStats, BodyPart, ScarType, SeverityLevel, HealingStage }
export type { StoryChapter, ScarStory, CommunityShare, CommunityResponse, ScarMap, RitualType, ForgingRitual }
export type { NarrativeTemplateType, NarrativeTemplate, NarrativeDraft, ResonanceMatch, CommunityResonance, ResonanceStats, ScarVisualizationData }
export type { CausalEvent, CausalLink, ScarCausalChain, CausalChainAnalysis }
export type { HealingPrediction, PredictionFactors }
export type { HealingJourney, JourneyMilestone, JourneyStage }
export type { NarrativeEnhancement, PatternMatch, NarrativePattern }