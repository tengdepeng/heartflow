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

// ---- 多账户与转账（记账 v2）----
export { useAccounts, DEFAULT_ACCOUNT_ID } from './accounts'
export type { Account, AccountType, Transfer, AccountSummary } from './accounts'

// ---- 预算预警引擎（记账 v2）----
export { categorizeExpense, computeBudgetProgress, monthOutflow, budgetsForMonth } from './budget-alert'
export type { OutflowMode, BudgetStatus, BudgetProgress, MonthOutflow } from './budget-alert'

// ---- 预算进阶引擎（INCR-28：总/年度预算 + 日均动态 + 滚动结余）----
export {
  monthOutflowTotal,
  prevMonthKey,
  daysInMonth,
  prevMonthRollover,
  monthBudgetAdvance,
  annualSpent,
  yearBudgetAdvance,
  useBudgetAdvance,
  DEFAULT_ADVANCE_CONFIG,
} from './budget-advance'
export type {
  AdvanceBudgetConfig,
  MonthBudgetAdvance,
  YearBudgetAdvance,
} from './budget-advance'

// ---- 记账明细引擎（v2 记录 过滤/排序/分页）----
export {
  applyRecordFilter,
  tagCounts,
  accountOptions,
  toggleArchived,
} from './record-detail'
export type {
  RecordSortField,
  RecordSortOrder,
  RecordFilterOptions,
  RecordFilteredResult,
} from './record-detail'

// ---- 月结单引擎（记账 v2）----
export { monthStatement, toMarkdown, toCsv } from './statement'
export type { MonthStatement } from './statement'

// ---- 记账导入器（记账 v2）支付宝/微信 CSV ----
export { detectSource, parseCsv, mapAlipay, mapWechat, dedupe, guessCategory } from './importer'
export type { ImportSource, ImportRow } from './importer'

// ---- 周期/重复记账（INCR-22）----
export {
  useRecurring,
  nextOccurrence,
  nextOccurrenceAfter,
  occurrencesInRange,
  dueRules,
  toRecurringDraft,
} from './recurring'
export type { RecurringRule, RecurringDraft, RecurFreq, RecurType } from './recurring'

// ---- 自定义分类（INCR-23）----
export {
  useCustomCategories,
  resetCategoryRegistry,
  buildMerged,
  customOnly,
  descendantIds,
  resolveMeta,
  resolveMetaAny,
  categoryOptions,
  categoryLabel,
  categoryIcon,
  categoryColor,
  categoryLabelAny,
  categoryIconAny,
  categoryOptionsFor,
} from './custom-category'
export type { CustomCategory, CategoryOption, CategoryMeta, CategoryKind } from './custom-category'

// ---- 自然语言快速记账（INCR-24）----
export {
  parseQuickEntry,
  quickEntryToRecord,
  extractAmount,
  extractDate,
  matchAccount,
  matchCategories,
  cleanDescription,
  localToday,
} from './nlp-entry'
export type { QuickEntryContext, QuickEntryDraft } from './nlp-entry'

// ---- 借贷/往来管理（INCR-25）----
export {
  useLoans,
  remaining,
  loanStatus,
  overdueDays,
  netSummary,
  LOAN_DIRECTION_META,
} from './loan'
export type { LoanDirection, LoanSettlement, LoanRecord, LoanNetSummary } from './loan'

// ---- 信用卡/负债账户管理（INCR-26）----
export {
  useCreditCards,
  cardBalance,
  cleared,
  availableCredit,
  nextDueDate,
  isOverdue,
  overdueDays as cardOverdueDays,
  dueInDays as cardDueInDays,
  minimumPayment,
  payoffPlan,
  liabilitySummary,
  CARD_KIND_META,
} from './credit-card'
export type { CreditCardKind, Repayment, CreditCardRecord, PayoffPlan, LiabilitySummary } from './credit-card'

// ---- 资产负债净资产总览（INCR-27）----
export {
  netAssetSummary,
  netAssetTrend,
  accountBalanceAt,
  liabilityAt,
  cardTrendStartMonth,
} from './net-asset'
export type { NetAssetSide, NetAssetItem, NetAssetSummary, NetAssetTrendPoint } from './net-asset'

// ---- 报表可视化引擎（INCR-29：同比环比 + 分类占比/趋势/排行榜 + 年度热力图）----
export {
  monthStat,
  compareMonth,
  categoryShare,
  categoryTrend,
  categoryRanking,
  yearHeatmap,
} from './report-visual'
export type {
  RangeStat,
  Compare,
  ShareItem,
  CategoryShare,
  MonthlyTrendPoint,
  CategoryTrendSeries,
  TrendResult,
  RankItem,
  HeatCell,
  HeatWeek,
  YearHeatmap,
  Kind,
  MetaResolver,
} from './report-visual'

// ---- 记账习惯引擎（INCR-30：存钱计划 + 每日提醒/连续打卡 + Excel 导出）----
export {
  weekDepositAmount,
  weekPlanTotal,
  totalDeposited,
  planProgress,
  nextWeek,
  weeksDeposited,
  applyDeposit,
  applyWeek,
  buildPlan,
  SAVING_MODE_META,
  useSavingPlans,
} from './saving-plan'
export type {
  SavingMode,
  SavingDeposit,
  SavingPlan,
  PlanProgress,
  SavingPlanCreate,
} from './saving-plan'

export {
  recordedDays,
  hasRecordToday,
  recordStreak,
  monthActivity,
  DEFAULT_REMINDER_TIME,
  useDailyReminder,
} from './daily-reminder'
export type { DailyReminderConfig, MonthActivity } from './daily-reminder'

export {
  buildExportRows,
  toCsv as recordsToCsv,
  toExcelXls as recordsToXls,
  downloadText as downloadExport,
} from './export'
export type { ExportRow, ExportScope, ExportOptions } from './export'

// ---- 隐私锁（INCR-31 数据安全：主密码守护 + 会话锁定）----
export {
  usePrivacyLock,
  fingerprintPassword,
  verifyPassword,
  isConfigured,
  sessionLocked,
  setSessionLocked,
  isSessionLocked,
} from './privacy-lock'
export type { PrivacyLockConfig } from './privacy-lock'

// ---- 数据加密（INCR-31 数据安全：账本加密备份/恢复）----
export {
  useDataEncryption,
  encryptText,
  decryptText,
  encryptRecords,
  decryptRecords,
  boxToJson,
  boxFromJson,
} from './data-encryption'
export type { EncryptedBox, EncryptedBackup } from './data-encryption'

// ---- 多币种/汇率（INCR-31 数据扩展：基准币 + 汇率换算）----
export {
  useMultiCurrency,
  CURRENCY_LIST,
  DEFAULT_RATES,
  DEFAULT_CURRENCY_CONFIG,
  normalizeRates,
  toBase,
  convertAmount,
  currencySymbol,
  formatMoney,
  moneyLabel,
  moneyInBase,
} from './multi-currency'
export type { CurrencyEntry, CurrencyConfig } from './multi-currency'

// ---- 投资持仓收益（INCR-31 数据扩展：持仓市值/盈亏/收益率）----
export {
  useHoldings,
  HOLDING_KIND_META,
  holdingCost,
  holdingValue,
  holdingPnl,
  holdingYield,
  holdingSummary,
  portfolioSummary,
  holdingKindMeta,
} from './investment'
export type { HoldingKind, Holding, HoldingKindMeta } from './investment'