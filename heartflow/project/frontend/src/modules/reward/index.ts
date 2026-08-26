// ============================================================
// 劳酬 · 模块导出
// ============================================================

export { useRewardMilestones } from './milestones'
export { useFinanceGoals, useInvestmentTracker, useFinanceHealth, useFinanceTimeline } from './finance-goals'
export {
  GOAL_TYPE_META,
  GOAL_TERM_META,
  INVESTMENT_TYPE_META,
  HEALTH_GRADE_META,
} from './finance-goals'
export type {
  FinanceGoalType,
  GoalTerm,
  FinanceGoal,
  InvestmentType,
  InvestmentRecord,
  HealthDimension,
  FinanceHealthScore,
  FinanceTimelineEvent,
} from './finance-goals'

export {
  REWARD_STORAGE_KEYS,
  INCOME_CATEGORY_META,
  EXPENSE_CATEGORY_META,
  DEFAULT_MILESTONES,
} from './types'

export type {
  RewardType,
  IncomeCategory,
  ExpenseCategory,
  RewardMilestone,
  Budget,
  RewardStats,
} from './types'

// ---- 财务分析 ----

export {
  useFinanceFilter,
  usePeriodicAnalysis,
  useChartData,
  DEFAULT_FILTER,
  DEFAULT_PAGINATION,
  FINANCE_ANALYSIS_STORAGE_KEYS,
} from './finance-analysis'

export type {
  SortField,
  SortOrder,
  FinanceFilter,
  PaginationConfig,
  FilteredResult,
  PeriodType,
  PeriodicRecord,
  PeriodicAnalysis,
  ChartDataPoint,
  CategoryChartData,
  TrendChartData,
  BudgetChartData,
  FilterPreset,
} from './finance-analysis'

// ---- 工作日志联动桥接 (P16-9) ----

export {
  useWorklogRewardBridge,
  DEFAULT_BRIDGE_CONFIG,
  LOG_TYPE_TO_INCOME,
  MOOD_MULTIPLIER,
} from './worklog-bridge'

export type {
  WorklogRewardConfig,
  BridgeMapping,
  BridgeStats,
} from './worklog-bridge'

// ---- 预算优化引擎 (P20-2) ----

export { useBudgetOptimizer } from './budget-optimizer'
export type {
  BudgetAllocation,
  OverspendAlert,
  SavingsStrategy,
  SavingsStep,
  BudgetTemplate,
  BudgetOptimizationReport,
} from './budget-optimizer'

// ---- 财务预测引擎 (P20-2) ----

export { useFinancialForecast } from './financial-forecast'
export type {
  ForecastPoint,
  FinancialForecast,
  FinanceHealthCheck,
  HealthCheckDetail,
  IncomeSourceAnalysis,
} from './financial-forecast'

// ---- 视图桥接层 (P20-2) ----

export { useRewardBridge } from './reward-bridge'
export type {
  RewardBridgeState,
  RewardQuickStats,
} from './reward-bridge'

// ---- 视图数据层（Reward.vue 下沉：收支记录列表）----
export { useReward } from './reward-list'
export type { RewardRecord } from './reward-list'