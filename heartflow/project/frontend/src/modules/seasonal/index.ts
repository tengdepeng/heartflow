// ⚠️ 本文件是纯 barrel（模块出口）：真实状态定义已下沉 ./seasonal-store。
//    barrel 若自身定义符号、又被 bridge 反向引用，会构成 index ↔ bridge 循环依赖，
//    故本地定义一律外置，此处只做转发。

export { useSeasonalRituals, usePrivateRituals, useSolarTerms } from './seasonal-store'

// ============================================================
// 岁时阁 · 业务逻辑模块
// ============================================================

// ---- 蜕变光茧 ----
export {
  createCocoon,
  advanceCocoon,
  regressCocoon,
  cocoonFromLifeRitual,
  onLifeRitualCompleted,
  getAvailableNextStages,
  computeCocoonStats,
  COCOON_STAGE_LABELS,
  COCOON_STAGE_ICONS,
  COCOON_STAGE_COLORS,
} from './cocoon'
export type { Cocoon, CocoonStage, StageLog, CocoonStats } from './cocoon'

// ---- 俯瞰模式 ----
export {
  buildYearOverview,
  getAvailableYears,
  buildYearComparison,
  yearOverviewInsights,
} from './overview'
export type { YearOverview, MonthSummary, YearStats, YearComparison } from './overview'

// ==================== 导出 ====================

export {
  SOLAR_TERMS,
  FESTIVALS,
  SEASON_META,
  TERM_CUSTOMS,
  FESTIVAL_INFO,
  getTermCustoms,
  getFestivalInfo,
} from './data'

export type { Season, SeasonalRitual, Ritual, LifeRitual, SeasonalStats, SolarTerm, Festival, SeasonMeta } from './types'

// ---- 岁时档案分析（INCR-15）----
export {
  seasonalOverview,
  seasonRows,
  seasonHealth,
  seasonalInsights,
} from './seasonal-analytics'
export type {
  SeasonalOverview,
  SeasonRow,
  SeasonalHealth,
} from './seasonal-analytics'

// ---- 季节日志 ----
export {
  getCurrentSeason,
  getSeasonalPrompts,
  createJournalEntry,
  updateJournalEntry,
  addKeyEvent,
  linkRitual,
  linkCocoon,
  analyzeSeasonalMood,
  generateMoodTrend,
  generateSeasonTransition,
  generateYearReview,
  MOOD_LABELS,
  MOOD_ICONS,
  MOOD_INTENSITY,
  SEASONAL_PROMPTS,
} from './seasonal-journal'
export type {
  SeasonalJournalEntry,
  SeasonalPrompt,
  SeasonalMood,
  MoodTrend,
  SeasonTransition,
  YearReview,
} from './seasonal-journal'

// ---- 视图桥接层（INCR-374）----
export { useSeasonalBridge } from './seasonal-bridge'
export type {
  RitualStats,
  SeasonalRecommendation,
  SeasonalOverview as SeasonalBridgeOverview,
} from './seasonal-bridge'
