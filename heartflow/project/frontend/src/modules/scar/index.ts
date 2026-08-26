// ============================================================
// 工痕 · 模块导出
// ============================================================

export { useScarHealing } from './healing'
export { useScarMarks } from './marks'
export type { ScarMark } from './marks'
export { useScarStories, useCommunitySupport, useScarMap, useForgingRituals } from './scar-story'
export {
  EMOTION_META,
  RITUAL_TYPE_META,
} from './scar-story'
export type {
  StoryChapter,
  ScarStory,
  CommunityShare,
  CommunityResponse,
  BodyHeatData,
  ScarMap,
  RitualType,
  ForgingRitual,
} from './scar-story'

export { useNarrativeTemplate, useResonanceAlgorithm, useScarVisualization } from './narrative-template'
export {
  NARRATIVE_TEMPLATE_META,
} from './narrative-template'
export type {
  NarrativeTemplateType,
  NarrativeStage,
  NarrativeTemplate,
  NarrativeDraft,
  ResonanceMatch,
  CommunityResonance,
  ResonanceStats,
  VisualizationType,
  ScarMapNode,
  HealingTimelineNode,
  GrowthCurveNode,
  TypeDistributionData,
  SeverityRadarData,
  ScarVisualizationData,
} from './narrative-template'

export {
  SCAR_STORAGE_KEYS,
  HEALING_STAGES,
  BODY_PART_META,
  SCAR_TYPE_META,
} from './types'

export type {
  BodyPart,
  ScarType,
  ScarState,
  HealingStage,
  SeverityLevel,
  BodyMark,
  HealingStageMeta,
  GrowthRecord,
  ForgingRecord,
  ScarStats,
} from './types'

// ---- P16-6 因果链分析 + 愈合预测 ----
export { useCausalChain } from './causal-chain'
export type {
  CausalEvent,
  CausalLink,
  ScarCausalChain,
  CausalChainAnalysis,
  CausalPattern,
} from './causal-chain'

export { useHealingPredictor } from './healing-predict'
export type {
  PredictionFactors,
  HealingPrediction,
  FactorContribution,
  PredictionHistory,
  HealingBaseline,
} from './healing-predict'

// ---- P20-3 视图桥接 + 愈合旅程 + 叙事增强 ----

export { useScarBridge } from './scar-bridge'
export type {
  ScarBridgeState,
  ScarQuickStats,
} from './scar-bridge'

export { useHealingJourney } from './healing-journey'
export {
  JOURNEY_STAGES,
  DEFAULT_JOURNEY_MILESTONES,
} from './healing-journey'
export type {
  JourneyStage,
  JourneyMilestone,
  HealingJourney,
  JourneyStageMeta,
} from './healing-journey'

export { useNarrativeEnhancer } from './narrative-enhancer'
export {
  NARRATIVE_PATTERNS,
} from './narrative-enhancer'
export type {
  NarrativePattern,
  PatternMeta,
  PatternMatch,
  NarrativeEnhancement,
  NarrativeArc,
  EnhancementSuggestion,
} from './narrative-enhancer'