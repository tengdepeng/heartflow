// ============================================================
// 全局 UI · 分步引导蒙层 barrel（INCR-500）
// ============================================================

export {
  useGuideTour,
  reloadGuideTour,
  computeTooltip,
  clampTooltip,
  GUIDE_TOURS,
  DEFAULT_GUIDE_TOUR,
} from './guide-tour'

export type {
  TourStep,
  TourDef,
  TourPlacement,
  GuideTourState,
  Rect,
  Size,
  Point,
} from './guide-tour'
