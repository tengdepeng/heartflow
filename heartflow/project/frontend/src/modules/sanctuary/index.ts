// ============================================================
// 安全岛模块 · barrel export
// 安全岛是全局系统状态层，非主路径房间
// 通过五击快速触发，提供呼吸、释放、记录功能
// ============================================================

export { default as SanctuaryOverlay } from './SanctuaryOverlay.vue'
export { useSanctuaryTrigger } from './composables/useSanctuaryTrigger'
export type { SanctuaryTriggerConfig } from './composables/useSanctuaryTrigger'
export { useSanctuary } from './useSanctuary'
export type { SanctuaryNote, SanctuaryLog } from './useSanctuary'

// ---- 安全岛档案分析（INCR-19）----
export {
  sanctuaryOverview,
  retreatRhythm,
  sanctuaryGrowth,
  sanctuaryInsights,
} from './sanctuary-analytics'
export type {
  SanctuaryOverview,
  RetreatRhythm,
  SanctuaryGrowth,
} from './sanctuary-analytics'
export {
  useDesktopSilentOverlay,
  DESKTOP_SILENT_OVERLAY_KEY,
  LOCK_MODE_KEY,
  OVERLAY_FORM_KEY,
  OVERLAY_SHOW_BEACON_KEY,
  OVERLAY_SHOW_HINT_KEY,
  OVERLAY_GLOW_INTENSITY_KEY,
  OVERLAY_FORMS,
} from './useDesktopSilentOverlay'
export type { OverlayForm, OverlayFormDef, OverlayContentPref } from './useDesktopSilentOverlay'

// ---- 视图桥接层（INCR-389 接线：安全岛·中枢总览） ----
export { useSanctuaryBridge } from './sanctuary-bridge'
export type {
  SanctuaryState,
  TriggerConfig,
  SanctuarySession,
  SanctuaryStats,
  SanctuaryRecommendation,
} from './sanctuary-bridge'