// ============================================================
// 平行世界 · 模块导出
// ============================================================

// ---- 桥接层（视图桥接总览，INCR-376） ----
export { useParallelWorldBridge } from './parallel-world-bridge'
export type {
  ParallelWorldSummary,
  BranchDetail,
} from './parallel-world-bridge'

export { useParallelWorld } from './worlds'
export type { BranchTreeNode } from './worlds'

// ---- 可能性自我 & 抉择分叉（数据层下沉，P 重构） ----
export { useParallelSelves } from './parallel-selves'
export type { Fork, AltSelf } from './parallel-selves'

// ---- 时间胶囊（蓝图29 梦境区 / 模块13 岁时阁） ----
export { useTimeCapsule } from './time-capsule'
export type { Capsule, CapsuleScope } from './time-capsule'

export { useBranchTimeline, useBranchComparison, useMergeSuggestions, useEvolutionGraph } from './branch-timeline'
export type {
  TimelineNode,
  TimelineConfig,
  DiffDimension,
  BranchDiffEntry,
  BranchComparison,
  MergeSuggestion,
  EvolutionNode,
  EvolutionGraph,
} from './branch-timeline'

export {
  BRANCH_COLORS,
  PARALLEL_WORLD_STORAGE_KEYS,
} from './types'

export type {
  WorldBranch,
  Checkpoint,
  WorldSnapshot,
  BranchStats,
  ParallelWorldState,
  BranchColorPreset,
} from './types'

// ---- 世界融合引擎（P15-5） ----
export {
  useWorldMergeEngine,
  DEFAULT_MERGE_ENGINE_CONFIG,
} from './world-merge-engine'
export type {
  MergeStrategy,
  ConflictType,
  ConflictSeverity,
  MergeConflict,
  MergePreview,
  LegacyItem,
  MergeResult,
  RollbackAction,
  MergeEngineConfig,
} from './world-merge-engine'

// ---- 场景模拟引擎 ----
export {
  useScenarioSimulation,
  IMPACT_SCORES,
  IMPACT_LABELS,
} from './scenario-sim'
export type {
  Scenario,
  ScenarioCondition,
  ScenarioOutcome,
  DecisionNode,
  DecisionTree,
  SimulationResult,
  WhatIfAnalysis,
  WhatIfAlternative,
} from './scenario-sim'

// ---- 分支可视化引擎 ----
export {
  useBranchVisualization,
  useBranchProbability,
  useBranchWeights,
  useKnowledgeTransfer,
} from './branch-visualization'
export type {
  BranchVisualNode,
  BranchVisualEdge,
  BranchVisualTree,
  BranchProbability,
  PredictedState,
  ProbabilityFactor,
  BranchWeightConfig,
  WeightHistoryEntry,
  KnowledgeTransfer,
} from './branch-visualization'

// ---- 场景同步引擎（P16-11） ----
export {
  useSceneSync,
  DEFAULT_SYNC_CONFIG,
} from './scene-sync'
export type {
  SyncTarget,
  SyncDirection,
  SyncStrategy,
  SyncConflictType,
  SyncResolution,
  SyncConflict,
  SyncEvent,
  SyncConfig,
} from './scene-sync'

// ---- 分支回放引擎（P19-6） ----
export {
  useBranchReplay,
  SPEED_DELAY_MAP,
  SPEED_LABELS,
  REPLAY_STORAGE_KEYS,
} from './branch-replay'
export type {
  BranchReplay,
  ReplayEvent,
  ReplaySpeed,
  ReplayState,
  ReplayMarker,
} from './branch-replay'

// ---- 自动冲突解决引擎（P19-6） ----
export {
  useAutoConflictResolution,
  STRATEGY_LABELS,
  RESOLUTION_LABELS,
  RESOLUTION_STORAGE_KEYS,
} from './auto-conflict-resolution'
export type {
  ConflictStrategy,
  ConflictResolution,
  ResolutionRule,
  ResolutionResult,
  AutoConflictType,
  ResolutionStrategy,
} from './auto-conflict-resolution'

// ---- 平行档案分析引擎（ParallelWorldArchivePanel） ----
export {
  parallelOverview,
  altSelfSourceRows,
  capsuleStatusRows,
  parallelRhythm,
  branchDepthLabel,
  parallelWorldHealth,
  parallelInsights,
} from './parallel-analytics'
export type {
  ParallelOverview,
  ParallelRow,
  ParallelRhythm,
  ParallelArchiveHealth,
  BranchExplorationRows,
} from './parallel-analytics'

// ---- 世界对比引擎（P19-6） ----
export {
  useWorldComparison,
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
  COMPARISON_STORAGE_KEYS,
} from './world-comparison'
export type {
  WorldComparison,
  ComparisonDimension,
  ComparisonResult,
  DivergencePoint,
  SimilarityScore,
} from './world-comparison'