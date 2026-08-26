// ============================================================
// 守护室 · 护眼方案引擎（夜间模式/暮光）
// ============================================================

export {
  useEyeShield,
  dayPhaseFor,
  warmthForPhase,
  effectiveWarmth,
  shieldStateAt,
  buildDayCurve,
  eyeBreakPoint,
  DAY_PHASE_META,
  SHIELD_PRESETS,
  DEFAULT_EYE_SHIELD_CONFIG,
} from './eye-shield'
export type {
  DayPhase,
  ShieldPresetId,
  EyeShieldConfig,
  EyeShieldState,
  EyeBreakPoint,
} from './eye-shield'