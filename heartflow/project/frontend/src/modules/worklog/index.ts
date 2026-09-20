// ============================================================
// 更漏 · 工作日志 · 导出入口
// 更漏是工作相关房间（工痕/劳酬/匠庐/业脉/行囊/息壤）的入口枢纽
// ============================================================

export { useWorklog } from './entries'
export {
  LOG_TYPE_META,
  MOOD_TONE_META,
  WORKLOG_STORAGE_KEYS,
} from './types'
export type {
  LogEntryType,
  MoodTone,
  LogEntry,
  WorklogDailySummary,
  WeeklySummary,
  WorklogStats,
} from './types'

// ---- 工作日志分析 ----
export { useWorklogAnalytics } from './worklog-analytics'
export type {
  WorklogAnalytics,
  ProductivityReport,
  KeywordExtraction,
} from './worklog-analytics'

// ---- 工作习惯分析（P19-1） ----
export { useWorklogHabits } from './worklog-habits'
export type {
  TimeSlot,
  TimeSlotProductivity,
  WorkHabitProfile,
  StreakPattern,
  WorkRhythm,
  HabitInsight,
  FocusBlock,
} from './worklog-habits'

// ---- 生产力预测（P19-1） ----
export { useProductivityPrediction } from './productivity-prediction'
export type {
  ProductivityPrediction,
  EfficiencyScore,
  EfficiencyDimension,
  ProductivityTrend,
  SmartSuggestion,
  GoalTracker,
} from './productivity-prediction'

// ---- 导出增强（P19-1） ----
export { useWorklogExport, EXPORT_FORMAT_META, REPORT_TEMPLATES } from './worklog-export'
export type {
  ExportFormat,
  ExportConfig,
  ExportResult,
  ReportTemplate,
  ReportOptions,
} from './worklog-export'

// ---- 视图数据层 · 班次 / 时薪（替代 WorkLog.vue 的裸 storage 调用） ----
export { useWorkLog } from './worklog-shifts'
export type { WorkShift } from './worklog-shifts'

// ---- 视图桥接层（INCR-390 接线：更漏·桥接总览） ----
export { useWorklogModuleBridge } from './worklog-module-bridge'
export type { WorklogSummary } from './worklog-module-bridge'