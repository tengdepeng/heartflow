// ============================================================
// timeline 模块入口
// 统一导出时间线聚合相关的类型和函数
// ============================================================

// ---- 基础河流 ----
export {
  getRiverItemKey,
  createRiverItems,
  getRiverSource,
  createReplayTimer,
  getAllTags,
  filterByTag,
  computeDailySummaries,
} from './river'

export type {
  RiverItem,
  RiverItemType,
  RiverSource,
  DailySummary,
} from './river'

// ---- 增强过滤与搜索 ----
export {
  filterByTimeRange,
  filterByTypes,
  searchTimeline,
  findEventCorrelations,
  computeTimelineStats,
  groupByDate,
  getItemsOnDate,
  // 高级搜索（P18-1）
  advancedSearch,
  levenshteinDistance,
  stringSimilarity,
  fuzzyMatch,
  DEFAULT_ADVANCED_OPTIONS,
  createSearchHistoryManager,
  createSavedSearchManager,
} from './timeline-filters'

export type {
  TimeRange,
  TimelineSearchOptions,
  SearchHit,
  EventCorrelation,
  TimelineStats,
  DateGroup,
  // 高级搜索类型（P18-1）
  AdvancedSearchOptions,
  SearchHistoryEntry,
  SavedSearch,
} from './timeline-filters'

// ---- 叙事生成 ----
export {
  useNarrativeGenerator,
  useReportExporter,
  // P18-1 增强
  detectMilestones,
  comparePeriods,
  generateSuggestions,
  generateWordCloud,
} from './narrative-generator'

export type {
  NarrativeReport,
  NarrativeSegment,
  NarrativeStats,
  // P18-1 增强类型
  Milestone,
  PeriodComparison,
  PersonalizedSuggestion,
  WordCloudItem,
} from './narrative-generator'

// ---- 模式发现（P16-1） ----
export {
  discoverWeeklyPattern,
  discoverSeasonalPatterns,
  discoverYearlyTrend,
  discoverPatterns,
} from './timeline-patterns'

export type {
  DayOfWeek,
  Season,
  WeeklyPattern,
  SeasonalPattern,
  YearlyTrend,
  PatternDiscoveryResult,
} from './timeline-patterns'

// ---- 时间线雷达（P18-1） ----
export {
  generateRadarChart,
  generateDayHourHeatmap,
  generateEmotionHeatmap,
  generateTagRadar,
  generateFocusRadar,
  generateTimelineRadarReport,
} from './timeline-radar'

export type {
  RadarDimension,
  RadarPoint,
  RadarChart,
  DayHourCell,
  DayHourHeatmap,
  EmotionHeatPoint,
  EmotionHeatmap,
  TagCluster,
  TagRadar,
  FocusRadarEntry,
  FocusRadar,
  TimelineRadarReport,
} from './timeline-radar'

// ---- 情感曲线可视化（P18-1） ----
export { useEmotionCurve } from './emotion-curve'

export type {
  EmotionDataPoint,
  EmotionCurve,
  EmotionCurveStats,
  EmotionTrend,
  TurningPoint,
  EmotionCurveConfig,
  EmotionComparison,
  EmotionInsight,
} from './emotion-curve'

// ---- 年度回顾报告（P18-1） ----
export { useAnnualReview } from './annual-review'

export type {
  AnnualReview,
  AnnualStats,
  MonthlyStat,
  GrowthTrajectory,
  TrendPoint,
  GrowthPhase,
  AnnualKeyword,
  YearComparison,
  AnnualInsight,
  AnnualOutlook,
  AnnualGoal,
  AnnualReviewConfig,
} from './annual-review'

// ---- 导出增强（P18-1） ----
export { useExportEngine } from './export-enhance'

export type {
  ExportFormat,
  ExportTarget,
  ExportItem,
  ExportConfig,
  ExportResult,
  ExportTemplate,
  ExportHistory,
  ExportHistoryItem,
  BatchExportTask,
  ExportEngineConfig,
} from './export-enhance'

// ---- 视图桥接聚合（INCR-14 时光档案） ----
export { useTimelineBridge } from './timeline-bridge'

export type {
  TimelineOverview,
  PatternInsights,
  TimelineRecommendation,
  EmotionAnalysisSummary,
  NarrativeSummaryBag,
  BridgeFilterOptions,
  BridgeExportOptions,
} from './timeline-bridge'