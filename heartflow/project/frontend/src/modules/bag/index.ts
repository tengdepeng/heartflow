// ============================================================
// 行囊 · 模块出口（barrel）
// ⚠️ 真实状态定义已下沉 ./bag-store，本文件只做转发：
//    barrel 若自身定义符号、又被 bridge 反向引用，会构成 index ↔ bridge 循环依赖。
// ============================================================

export { useBagStore } from './bag-store'
export type {
  BagItem,
  CategoryItem,
  CategoryType,
  CategoryTypeInfo,
  EvolutionEntry,
  BagOverview,
} from './types'
export { CATEGORY_TYPES } from './defaults'

// ---- 物品进化系统 ----
export {
  useBagEvolution,
  EVOLUTION_STAGE_META,
  STAGE_THRESHOLDS,
  BAG_STORAGE_KEYS,
} from './evolution'
export type {
  EvolutionStage,
  EvolutionRequirement,
  EvolutionStageEntry,
  EvolutionPath,
  EvolutionStats,
  EvolutionProgress,
} from './evolution'

// ---- 技能分析引擎 ----
export { useBagAnalytics } from './bag-analytics'
export type {
  SkillRadarData,
  GrowthTrend,
  LearningPath,
  LearningStep,
  ProficiencyPrediction,
  SkillHealth,
} from './bag-analytics'

// ---- 行囊视图桥接层（INCR-379 补孤儿桥接导出：聚合驾驶舱零消费） ----
export { useBagBridge } from './bag-bridge'
export type {
  SkillOverview,
  BagHealth,
  BagRecommendation,
} from './bag-bridge'

// ---- 背包整理系统 ----
export { useBagOrganize } from './organize'
export type {
  SortStrategy,
  SortConfig,
  OrganizeRule,
  OrganizeCondition,
  OrganizeResult,
  CleanupSuggestion,
  BatchOperation,
} from './organize'
