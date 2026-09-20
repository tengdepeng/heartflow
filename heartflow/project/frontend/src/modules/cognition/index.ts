// ============================================================
// 释光阁 · 认知模块 barrel export
// 冥想分析、环境音推荐、连续追踪、洞察生成
// ============================================================

// ---- 核心类型与常量 ----
export {
  AMBIENT_SOUNDS,
  AMBIENT_CATEGORY_META,
  MOOD_SCORE_MAP,
  TIME_OF_DAY_LABELS,
  MEDITATION_STORAGE_KEYS,
} from './types'
export type {
  MeditationSession,
  MeditationStats,
  MeditationStreak,
  StreakSegment,
  AmbientSound,
  AmbientSoundCategory,
  MeditationInsight,
} from './types'

// ---- 冥想分析引擎 ----
export { useMeditationAnalytics } from './meditation-analytics'

// ---- 视图桥接层（INCR-382）----
export { useCognitionBridge } from './cognition-bridge'
export type {
  MeditationHealth,
  StreakSummary,
  InsightSummary,
  AmbientSoundRecommendation,
  MoodMeditationCorrelation,
} from './cognition-bridge'

// ---- 反思笔记（视图数据层下沉）----
export { useCognitionReflections, COGNITION_REFLECTIONS_KEY } from './reflections'
export type { Reflection } from './reflections'

// ---- 四束光 本地规则推理引擎（纯函数）----
export { evaluateFourLights, LIGHT_META, LIGHT_ORDER } from './four-lights'
export type { FourLightsInput, LightKey } from './four-lights'