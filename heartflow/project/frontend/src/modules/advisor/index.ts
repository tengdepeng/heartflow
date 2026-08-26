// ============================================================
// 幕僚体系 · barrel export
// 统一导出幕僚互动、作息、庆祝退休、见证引擎
// ============================================================

export { useAdvisorInteraction } from './interaction'
export { useAdvisorDailyLife } from './daily-life'
export { useAdvisorCelebration } from './celebration'
export { useAdvisorWitness } from './witness'

export {
  INTERACTION_TYPE_META,
  TIME_SLOT_META,
  ACTIVITY_META,
  CELEBRATION_TYPE_META,
  RETIREMENT_PHASE_META,
  WITNESS_EVENT_META,
  ADVISOR_STORAGE_KEYS,
} from './types'

export type {
  InteractionType,
  InteractionIntensity,
  AdvisorRelation,
  InteractionRecord,
  ActivityType,
  TimeSlot,
  AdvisorActivity,
  LifeScene,
  DailySchedule,
  CelebrationType,
  CelebrationEvent,
  CelebrationRitual,
  RetirementPhase,
  RetirementCeremony,
  AdvisorLegacy,
  WitnessEventType,
  AdvisorWitnessRecord,
  WitnessStats,
} from './types'
export { DEFAULT_ADVISOR_PRESETS, PRESET_ADVISOR_ID_PREFIX, isPresetAdvisorId } from './presets'
export {
  readImageAsDataURL,
  exportCarrierFile,
  parseCarrierFile,
  downloadCarrierFile,
  sanitizeCarrier,
  CARRIER_FILE_SCHEMA,
  CARRIER_FILE_VERSION,
} from './carrier-io'
export type { CarrierFilePayload } from './carrier-io'
