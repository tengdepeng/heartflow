// ============================================================
// 动律之间 · barrel export
// ============================================================

export { useMovementRhythm, getMovementRecords } from './rhythm'
export { useWorkoutPlans, useMovementAchievements, useRhythmAnalysis, PLAN_TYPE_META, ACHIEVEMENT_TIER_META, DAY_NAMES, MOVEMENT_ADVANCED_STORAGE_KEYS } from './achievements'
export { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META, MOVEMENT_STORAGE_KEYS } from './types'
export type { MovementType, MovementIntensity, MovementRecord, MovementRhythm } from './types'
export type { WorkoutPlan, PlanType, DailyWorkout, PlannedActivity, MovementAchievement, AchievementCondition, RhythmAnalysis } from './achievements'

// ---- 运动分析引擎 ----
export { useMovementAnalytics } from './movement-analytics'
export type {
  MovementAnalytics,
  FitnessAssessment,
  MovementRecommendation,
  RecoveryStatus,
} from './movement-analytics'

// ---- 恢复优化引擎（P20-1） ----
export { useRecoveryOptimizer } from './recovery-optimizer'
export type {
  RecoveryScore,
  OvertrainingSignal,
  ActiveRecovery,
  PeriodizationPhase,
  PeriodizationPlan,
  DaySchedule,
  RecoveryPlan,
} from './recovery-optimizer'

// ---- 视图桥接层（P20-1） ----
export { useMovementBridge } from './movement-bridge'
export type {
  MovementBridgeState,
  QuickStats,
} from './movement-bridge'

// ---- 运动记录数据层（裸 storage 下沉） ----
export { useMovement, MOVES_KEY } from './movement-log'
export type { Move } from './movement-log'