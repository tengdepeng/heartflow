// ============================================================
// 时间长廊 · 观星指数
// ============================================================

export {
  computeObservingScore,
  useObserving,
  ratingForScore,
  tipForScore,
  DEFAULT_OBSERVING_CONFIG,
  OBSERVING_META,
} from './observing'
export type {
  ObservingInput,
  ObservingScore,
  ObservingFactors,
  ObservingDay,
  ObservingConfig,
  ObservingRating,
} from './observing'

export {
  buildObservationPlan,
  effectiveMagnitudeLimit,
  deepSkyAlt,
} from './observation-plan'
export type {
  ObservationPlan,
  PlanPhase,
  PlanTarget,
  PlanConfig,
} from './observation-plan'