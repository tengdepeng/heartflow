// ============================================================
// 藏象阁 · 模块导出
// ============================================================

export { useMeridianTracker, getCurrentMeridian } from './meridians'
export { useConstitutionAnalyzer } from './constitution'
export { useFiveMovements, useSutraAnnotations, useWellnessPlan, useMeridianCheck } from './five-movements'
export {
  ANNOTATION_TYPE_META,
} from './five-movements'
export type {
  HeavenlyStem,
  EarthlyBranch,
  SixQi,
  FiveMovement,
  SolarTerm,
  YearlyMovement,
  AnnotationType,
  SutraAnnotation,
  MeditationGuide,
  WellnessPlan,
  MeridianIssue,
  MeridianCheckReport,
} from './five-movements'

// ---- 健康分析引擎 ----
export { useHealthAnalysis, HEALTH_DIMENSION_META } from './health-analysis'
export type {
  HealthDimension,
  HealthAnalysisReport,
  MeridianHealthDetail,
  ConstitutionTrendPoint,
  MoodOrganLink,
  HealthRecommendation,
} from './health-analysis'

// ---- P21-1: 视图桥接 + 经络可视化 + 体质趋势 ----
export { useBodyWisdomBridge } from './body-wisdom-bridge'
export type { BodyWisdomBridgeState } from './body-wisdom-bridge'
export { useMeridianVisualization } from './meridian-visualization'
export type {
  MeridianClockNode,
  MeridianHeatmapData,
  FiveElementRelation,
  MeridianTrendPoint,
  MeridianHourReminder,
  MeridianVisualizationConfig,
} from './meridian-visualization'
export { useConstitutionTrend, getConstitutionTrendStore } from './constitution-trend'
export type {
  ConstitutionShiftPrediction,
  WellnessScore,
  WellnessDimension,
  PersonalizedWellnessAdvice,
  ConstitutionChangeDetection,
} from './constitution-trend'

export {
  BODY_WISDOM_STORAGE_KEYS,
  ORGAN_ELEMENT_MAP,
  CONSTITUTION_META,
  MERIDIAN_HOURS,
} from './types'

// ---- #86 被动健康意象数据源 ----
export { derivePassiveHealthImagery } from './passive-health-imagery'
export type {
  IHealthImagerySignal,
  IPassiveBodyLog,
  IPassiveMeridianLog,
  IPassiveHealthImageryInput,
} from './passive-health-imagery'

export type {
  OrganType,
  FiveElement,
  MeridianType,
  MeridianFeeling,
  MeridianRecord,
  ConstitutionType,
  ConstitutionAnalysis,
  FiveMovementsSixQi,
  MeridianHour,
  MoodRecord,
  SutraEntry,
  SutraReadingRecord,
  BodyWisdomState,
  MeridianStats,
} from './types'