// ============================================================
// 留光阁 · barrel export
// ============================================================

export { useLightPavilion } from './pavilion'
export { useGuidedMeditation, useReleaseRituals, useClarityDashboard, MEDITATION_DIFFICULTY_META, STEP_PHASE_META, LIGHT_ADVANCED_STORAGE_KEYS } from './guided-meditation'
export { MEDITATION_TYPE_META, RELEASE_METHOD_META, CLARITY_LEVEL_META, LIGHT_STORAGE_KEYS } from './types'
export type { MeditationType, MeditationRecord, ReleaseEntry, ClarityLevel, LightState } from './types'
export type { GuidedMeditation, MeditationStep, ReleaseRitual, ClarityStats } from './guided-meditation'

// ---- 修习实践引擎 ----
export { useLightPractice, MEDITATION_SEQUENCES, RELEASE_RITUALS } from './light-practice'
export type {
  MeditationSequence,
  MeditationSequenceStep,
  LightPoint,
  ClarityTracker,
} from './light-practice'

// ---- P21-3: 视图桥接层 ----
export { useLightBridge } from './light-bridge'
export type { LightBridgeState } from './light-bridge'

// ---- 视图数据层（LightPavilion.vue 下沉：财富目标 + 专项规划）----
export { useLightPavilionData } from './pavilion-data'