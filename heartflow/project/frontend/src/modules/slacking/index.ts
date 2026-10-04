// ============================================================
// 摸鱼计算机 · barrel export
// ============================================================

export {
  useSlackingWage,
  defaultSlackingConfig,
  clampHour,
  isWorkHours,
  msUntilOffWork,
  workedMsToday,
  earnedToday,
  workProgress,
} from './slacking'

export type { SlackingConfig, SlackingState } from './slacking'
