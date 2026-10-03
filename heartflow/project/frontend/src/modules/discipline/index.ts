// ============================================================
// 自律工坊 · barrel export（P16-3 增强版）
// ============================================================

// ---- 核心引擎 ----
export { useDisciplineWorkshop, getHabits } from './workshop'

// ---- 连续打卡 + 成就徽章 + 习惯建议 + 失败分析 + 习惯组合 ----
export {
  useStreakTracker,
  useAchievementBadges,
  useHabitSuggestions,
  useHabitFailureAnalysis,
  useHabitBundles,
  STREAK_LEVELS,
} from './streak-system'
export type {
  StreakRecord,
  StreakSegment,
  StreakLevel,
  AchievementBadge,
  AchievementCondition,
  HabitSuggestion,
  HabitFailure,
  HabitBundle,
} from './streak-system'

// ---- 集成桥接 ----
export {
  useDisciplineBridge,
  getHabitTemplatesByCategory,
  getChallengeTemplatesByDifficulty,
} from './workshop-bridge'
export type {
  HabitCompletionResult,
  DisciplineStats,
} from './workshop-bridge'

// ---- 预设库 ----
export {
  EXTENDED_BADGES,
  HABIT_TEMPLATES,
  CHALLENGE_TEMPLATES,
  RITUAL_TEMPLATES,
  BUNDLE_PRESETS,
} from './preset-library'
export type {
  BadgePreset,
  HabitTemplate,
  ChallengeTemplate,
  RitualTemplate,
  BundlePreset,
} from './preset-library'

// ---- 类型 ----
export { HABIT_DIFFICULTY_META, HABIT_FREQUENCY_META, DISCIPLINE_STORAGE_KEYS } from './types'
export type {
  HabitDifficulty,
  HabitFrequency,
  Habit,
  DisciplineChallenge,
  DailyRitual,
} from './types'

// ============================================================
// ---- P18-2 新增：习惯关联分析 ----
// ============================================================

export { useHabitCorrelation } from './habit-correlation'
export type {
  CorrelationType,
  HabitCorrelation,
  CorrelationNode,
  CorrelationNetwork,
  HabitCluster,
  TimeCrossAnalysis,
  TimeCrossPoint,
  LeadLagResult,
  CorrelationConfig,
} from './habit-correlation'

// ---- P18-2 新增：智能挑战推荐 ----
export { useChallengeRecommender } from './challenge-recommender'
export type {
  ChallengeRecommendation,
  HabitProfile,
  DifficultyAssessment,
  ChallengeRecommenderConfig,
} from './challenge-recommender'

// ---- P18-2 新增：习惯预测引擎 ----
export { useHabitPredictor } from './habit-predictor'
export type {
  PredictionResult,
  PredictionType,
  PredictionDetail,
  StreakPrediction,
  CompletionPrediction,
  BreakWarning,
  RiskFactor,
  TrendPrediction,
  TrendDirection,
  PredictedTurningPoint,
  HealthScore,
  PredictorConfig,
} from './habit-predictor'