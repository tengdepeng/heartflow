// ============================================================
// 更漏 · 工作记录空间模块导出
// ============================================================

export {
  WORK_CATEGORY_META,
  intensityLabel,
  windowStart,
  inWindow,
  recordSeconds,
  computeSummary,
  computeState,
  formatSeconds,
  genId,
  useClepsydra,
  resetClepsydra,
  STORAGE_KEY,
} from './clepsydra'
export type {
  WorkCategory,
  WorkRecord,
  CategoryMeta,
  ClepsydraState,
  ClepsydraSummary,
} from './clepsydra'

// ---- 时间哨塔（倒计时）----
export {
  createCountdown,
  countdownRemaining,
  tickCountdown,
  startCountdown,
  pauseCountdown,
  resumeCountdown,
  resetCountdown,
  countdownStatusLabel,
  countdownToRecord,
  countdownRepeatLabel,
  COUNTDOWN_REPEAT_META,
  useClepsydraCountdown,
  COUNTDOWN_STORAGE_KEY,
} from './countdown'
export type { CountdownStatus, CountdownTimer, CountdownRepeat } from './countdown'

// ---- 自然语言任务解析 ----
export { parseTaskText, TASK_CATEGORY_KEYWORDS } from './task-parse'
export type { ParsedTask } from './task-parse'

// ---- 时间块日规划 ----
export {
  TASK_STORAGE_KEY,
  BLOCK_STORAGE_KEY,
  minutesToLabel,
  labelToMinutes,
  blockEndMin,
  mergeIntervals,
  freeGaps,
  sortTasksForSchedule,
  autoSchedule,
  scheduledMinutes,
  dayCoverage,
  weekCoverage,
  weekDaysOf,
  blocksForWeek,
  WEEK_START_DOW,
  detectOverlapIds,
  buildTemplate,
  instantiateTemplate,
  TEMPLATE_STORAGE_KEY,
  localDateKey,
  todayKey,
  blockToRecordInput,
  computePlanActual,
  useTimeBlock,
} from './time-block'
export type {
  PlannedTask,
  TimeBlock,
  Interval,
  AutoScheduleOptions,
  BlockTemplate,
  PlanActualReport,
  PlanActualCategoryRow,
} from './time-block'