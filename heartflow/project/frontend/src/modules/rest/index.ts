// ============================================================
// 息壤 · 模块导出
// ============================================================

export { useRestQuality, getBreakRecords } from './quality'
export { useRestRituals, usePlantGrowth, useRestCalendar, useRestPrescription } from './rest-rituals'
export {
  RITUAL_CATEGORY_META,
  GROWTH_PHASE_META,
  FATIGUE_LEVEL_META,
  PRESET_RITUALS,
} from './rest-rituals'
export type {
  RitualCategory,
  RitualStep,
  RestRitual,
  GrowthPhase,
  PlantAnimationState,
  CalendarDay,
  RestCalendar,
  FatigueLevel,
  RestPrescription,
} from './rest-rituals'

export {
  REST_STORAGE_KEYS,
  DEFAULT_PRACTICES,
  VEGETATION_MAP,
  SEASON_THEMES,
} from './types'

export type {
  RestSeason,
  RestActivityType,
  RestPractice,
  BreakRecord,
  PlantState,
  RestQualityAnalysis,
  RestTip,
  RestState,
} from './types'

// ---- P16-10: 高级休息管理 ----
export {
  useRestReminders,
  useRestAchievements,
  useFocusRestLink,
  useRestTrend,
  DEFAULT_REMINDERS,
  REST_ADVANCED_STORAGE_KEYS,
} from './rest-advanced'
export type {
  ReminderType,
  RestReminder,
  RestAchievementId,
  RestAchievement,
  FocusRestLink,
  RestTrendPoint,
  RestTrendData,
} from './rest-advanced'

// ---- P16-10: 浏览器通知集成 ----
export {
  useRestNotificationBridge,
  DEFAULT_NOTIFICATION_PREFERENCE,
} from './notification-bridge'
export type {
  NotificationPreference,
  NotificationRecord,
  NotificationStats,
} from './notification-bridge'

// ---- P18-3: 睡眠质量分析 + 智能闹钟 ----
export { useSleepQuality } from './sleep-quality'
export type {
  SleepStages,
  SleepRecord,
  SleepChronotype,
  SleepQualityReport,
  DaySleepSummary,
  SleepHygieneItem,
  SmartAlarmConfig,
} from './sleep-quality'

// ---- 休息数据层（休憩方式 + 休息记录） ----
export { useRest } from './rest-data'