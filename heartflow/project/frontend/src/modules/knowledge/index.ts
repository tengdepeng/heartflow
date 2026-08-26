// ============================================================
// 经略阁 · 知识关系引擎 · 导出入口（P16-5 + P18-6 扩展）
// ============================================================

export type {
  KnowledgeCategory,
  RelationType,
  KnowledgeNode,
  KnowledgeRelation,
  RelationTypeMeta,
} from './types'

export {
  RELATION_TYPE_META,
} from './types'

export {
  getNodes,
  createNode,
  updateNode,
  deleteNode,
  getRelations,
  createRelation,
  deleteRelation,
  getNodeRelations,
} from './relation'

// ---- AI 知识管家 ----
export {
  suggestConnections,
  generateQuestions,
  detectBlindSpots,
  calculateHealthScore,
} from './ai-steward'
export type {
  ConnectionSuggestion,
  CategoryCoverage,
  HealthBreakdown,
  HealthScoreResult,
} from './ai-steward'

// ---- 内容导入 ----
export {
  createImportSource,
  IMPORT_SOURCE_TYPES,
  IMPORT_SOURCE_ICONS,
  IMPORT_SOURCE_LABELS,
} from './importer'
export type {
  ImportSourceType,
  ImportSource,
} from './importer'

// ---- 图谱可视化（P16-5） ----
export {
  useGraphVisualization,
  useSpacedReview,
  useVersionManager,
  useAutoLayoutSelector,
  useLayoutQualityScorer,
  applyEnhancedForceLayout,
} from './graph-visualization'
export type {
  GraphNode,
  GraphEdge,
  GraphLayout,
  LayoutParams,
  GraphFilter,
  GraphStats,
  ReviewItem,
  ReviewPlan,
  ReviewStats,
  KnowledgeVersion,
  VersionDiff,
  GraphCharacteristics,
  LayoutRecommendation,
  LayoutQualityReport,
  EnhancedForceParams,
  EnhancedForceResult,
} from './graph-visualization'

// ============================================================
// ---- P18-6 新增：策略评估引擎 ----
// ============================================================

export { useStrategyEvaluator } from './strategy-evaluator'
export type {
  EvalDimension,
  DimensionWeights,
  DimensionScore,
  StrategyOption,
  EvaluationResult,
  EvalGrade,
  StrategyComparison,
  SWOTAnalysis,
  SWOTItem,
  EvaluatorConfig,
  StrategyRecommendation,
} from './strategy-evaluator'

// ---- P18-6 新增：决策树分析 ----
export { useDecisionTree } from './decision-tree'
export type {
  DecisionTreeNodeType,
  DecisionTreeNode,
  DecisionTree,
  DecisionPath,
  SensitivityResult,
  DecisionTreeStats,
  DecisionTreeConfig,
  DecisionAnalysisReport,
} from './decision-tree'

// ---- P18-6 新增：场景规划模板 ----
export { useScenarioPlanner } from './scenario-planner'
export type {
  ScenarioType,
  TimeHorizon,
  UncertaintyLevel,
  ScenarioDriver,
  ScenarioFactor,
  ScenarioPlan,
  ScenarioImpact,
  ScenarioComparisonMatrix,
  WhatIfAnalysis,
  ScenarioTemplate,
  ScenarioConfig,
  FutureProjection,
} from './scenario-planner'

// ---- 经略阁视图数据层（裸 storage 下沉）----
export {
  useKnowledgeTower,
  KNOWLEDGE_NODES_KEY,
  KNOWLEDGE_IMPORT_SOURCES_KEY,
  KNOWLEDGE_STAR_POSITIONS_KEY,
} from './knowledge-tower'
export type { KNode, StarPositions } from './knowledge-tower'