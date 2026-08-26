// ============================================================
// 知微阁 · 渐进式背诵引擎（背书匠）
// ============================================================

export {
  useRecite,
  segmentText,
  maskText,
  normalize,
  evaluateAccuracy,
  nextCoverStep,
  reciteDisplay,
  RECITE_STEPS,
  PASS_THRESHOLD,
} from './recite'
export type {
  TextLang,
  ReciteCard,
  TextTokens,
  MaskedResult,
  ReciteResult,
} from './recite'

export {
  reciteOverview,
  reciteStepDistribution,
  reciteRhythm,
  reciteInsights,
} from './recite-analytics'
export type {
  ReciteOverview,
  ReciteStepRow,
  ReciteRhythm,
} from './recite-analytics'