// ============================================================
// 身体温室 · barrel export
// ============================================================

export { useBodyGreenhouse } from './greenhouse'
export { useBodyBridge } from './body-bridge'
export { BODY_METRIC_META, ENERGY_LEVEL_META, BODY_STORAGE_KEYS } from './types'
export type { BodyMetricType, BodyMetric, SleepRecord, EnergyLevel, BodyGreenhouseState } from './types'

// ---- 健康仪表盘 ----
export {
  useHealthDashboard,
  useHealthGoals,
  useChronotypeAnalysis,
  useHealthReminders,
} from './health-dashboard'

export type {
  HealthGoal,
  TrendPoint,
  MetricTrend,
  ChronotypeAnalysis,
  ChronotypeRecommendation,
  PlantInteraction,
  HealthReminder,
  HealthDashboard,
} from './health-dashboard'

// ---- 营养评分（P16-2） ----
export {
  scoreNutrition,
  computeWeeklyNutritionTrend,
  computeNutritionScoreFromMetrics,
  FOOD_DATABASE,
} from './nutrition-scoring'

export type {
  MealType,
  FoodCategory,
  FoodItem,
  MealRecord,
  NutritionScore,
  NutritionRecommendation,
  WeeklyNutritionTrend,
} from './nutrition-scoring'

// ---- 健康异常检测（P16-2） ----
export {
  detectHealthAnomalies,
  quickCheckMetric,
} from './health-anomaly'

export type {
  AnomalySeverity,
  AnomalyCategory,
  HealthAnomaly,
  AnomalyDetectionConfig,
  AnomalyReport,
} from './health-anomaly'

// ---- 个性化营养引擎（P16-2） ----
export {
  useNutritionEngine,
  DEFAULT_USER_PROFILE,
} from './nutrition-engine'

export type {
  UserProfile,
  DietaryPreference,
  NutritionTargets,
  MacroTarget,
  MealDistribution,
  MicronutrientStatus,
  MealPlan,
  MealPlanItem,
  FoodSuggestion,
  NutritionComparison,
} from './nutrition-engine'

// ---- 运动追踪引擎（P19-4） ----
export { useExerciseTracker } from './exercise-tracker'

export type {
  ExerciseType,
  ExerciseIntensity,
  ExerciseRecord,
  ExerciseStats,
  ExerciseGoal,
  ExerciseTrend,
  ExerciseRecommendation,
} from './exercise-tracker'

// ---- 健康报告生成器（P19-4） ----
export { useHealthReport } from './health-report'

export type {
  HealthReport,
  ReportSection,
  ReportPeriod,
  HealthSummary,
  HealthRecommendation,
  ReportTemplate,
} from './health-report'

// ---- 指标趋势分析（P19-4） ----
export { useMetricTrends } from './metric-trends'

export type {
  TrendDirection,
  MetricTrendData,
  TrendDataPoint,
  TrendAnalysis,
  MetricCorrelation,
  TrendAlert,
  TrendPrediction,
} from './metric-trends'