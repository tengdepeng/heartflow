// ============================================================
// 经略阁 · 视图桥接层
// 蓝图定义：
//   知识图谱状态聚合、AI 管家健康评分、图谱可视化、策略评估、
//   决策树分析、场景规划、导入管理
//   服务于 KnowledgeGraph.vue, KnowledgeImport.vue,
//   KnowledgeStrategy.vue, KnowledgeDecision.vue, KnowledgeScenario.vue
// ============================================================

import { ref, computed } from 'vue'
import {
  getNodes,
  createNode,
  updateNode,
  deleteNode,
  getRelations,
  createRelation,
  deleteRelation,
  getNodeRelations,
} from './relation'
import {
  suggestConnections,
  generateQuestions,
  detectBlindSpots,
  calculateHealthScore,
} from './ai-steward'
import { useStrategyEvaluator } from './strategy-evaluator'
import { useDecisionTree } from './decision-tree'
import { useScenarioPlanner } from './scenario-planner'
import {
  useGraphVisualization,
  useSpacedReview,
  useVersionManager,
  useAutoLayoutSelector,
  useLayoutQualityScorer,
  applyEnhancedForceLayout,
} from './graph-visualization'
import {
  IMPORT_SOURCE_TYPES,
  IMPORT_SOURCE_ICONS,
  IMPORT_SOURCE_LABELS,
} from './importer'
import { RELATION_TYPE_META } from './types'
import type {
  KnowledgeCategory,
  RelationType,
  KnowledgeNode,
  KnowledgeRelation,
  RelationTypeMeta,
} from './types'
import type {
  ConnectionSuggestion,
  CategoryCoverage,
  HealthBreakdown,
  HealthScoreResult,
} from './ai-steward'
import type {
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
import type {
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
import type {
  DecisionTreeNodeType,
  DecisionTreeNode,
  DecisionTree,
  DecisionPath,
  SensitivityResult,
  DecisionTreeStats,
  DecisionTreeConfig,
  DecisionAnalysisReport,
} from './decision-tree'
import type {
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
import type {
  ImportSourceType,
  ImportSource,
} from './importer'

// ---- 重新导出上游类型 ----

export type {
  KnowledgeCategory,
  RelationType,
  KnowledgeNode,
  KnowledgeRelation,
  RelationTypeMeta,
  ConnectionSuggestion,
  CategoryCoverage,
  HealthBreakdown,
  HealthScoreResult,
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
  DecisionTreeNodeType,
  DecisionTreeNode,
  DecisionTree,
  DecisionPath,
  SensitivityResult,
  DecisionTreeStats,
  DecisionTreeConfig,
  DecisionAnalysisReport,
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
  ImportSourceType,
  ImportSource,
}

export { RELATION_TYPE_META, IMPORT_SOURCE_TYPES, IMPORT_SOURCE_ICONS, IMPORT_SOURCE_LABELS }

// ---- 知识图谱概览 ----

export interface KnowledgeGraphOverview {
  totalNodes: number
  totalRelations: number
  /** 按分类统计 */
  nodeByCategory: { category: KnowledgeCategory; label: string; icon: string; count: number }[]
  /** 按关系类型统计 */
  relationsByType: { type: RelationType; label: string; icon: string; color: string; count: number }[]
  /** 孤立节点数 */
  orphanNodes: number
  /** 健康评分 */
  healthScore: HealthScoreResult
  /** 连接建议 */
  connectionSuggestions: ConnectionSuggestion[]
  /** 盲区 */
  blindSpots: CategoryCoverage[]
}

// ---- 导入状态 ----

export interface ImportStatus {
  sources: ImportSource[]
  totalSources: number
  /** 按状态统计 */
  byStatus: { pending: number; processing: number; completed: number; failed: number }
  /** 最近导入 */
  recentSources: ImportSource[]
}

// ---- 策略评估摘要 ----

export interface StrategyEvaluationSummary {
  options: StrategyOption[]
  evaluationCount: number
  /** 最近评估 */
  recentEvaluation: EvaluationResult | null
  /** 推荐策略 */
  recommendations: StrategyRecommendation[]
  /** 平均评分 */
  averageScore: number
}

// ---- 决策树摘要 ----

export interface DecisionTreeSummary {
  trees: DecisionTree[]
  totalTrees: number
  totalNodes: number
  /** 最近决策 */
  recentTree: DecisionTree | null
  /** 敏感度分析 */
  sensitivityResult: SensitivityResult | null
}

// ---- 场景规划摘要 ----

export interface ScenarioPlanSummary {
  plans: ScenarioPlan[]
  totalPlans: number
  /** 按类型统计 */
  byType: { type: ScenarioType; count: number }[]
  /** 未来预测 */
  projections: FutureProjection[]
}

// ============================================================
// useKnowledgeBridge
// ============================================================

export function useKnowledgeBridge() {
  // ---- 子模块 ----
  const graphVis = useGraphVisualization()
  const spacedReview = useSpacedReview()
  const versionManager = useVersionManager()
  const autoLayout = useAutoLayoutSelector()
  const layoutScorer = useLayoutQualityScorer()
  const strategyEvaluator = useStrategyEvaluator()
  const decisionTree = useDecisionTree()
  const scenarioPlanner = useScenarioPlanner()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 知识图谱概览 ----

  const graphOverview = computed<KnowledgeGraphOverview>(() => {
    const nodes = getNodes()
    const relations = getRelations()
    const health = calculateHealthScore(nodes, relations)
    // suggestConnections takes (nodeId, nodes, relations) - call for the first node if available
    const connections = nodes.length > 0
      ? suggestConnections(nodes[0].id, nodes, relations)
      : []
    const blindSpots = detectBlindSpots(nodes)

    // 按分类统计节点
    const categoryLabels: Record<KnowledgeCategory, string> = {
      concept: '概念',
      rule: '法则',
      frame: '框架',
      insight: '直觉',
      pitfall: '误区',
      metaphor: '比喻',
    }
    const categoryIcons: Record<KnowledgeCategory, string> = {
      concept: '💡',
      rule: '📏',
      frame: '🔲',
      insight: '✨',
      pitfall: '⚠️',
      metaphor: '🎭',
    }

    const categoryCounts = new Map<KnowledgeCategory, number>()
    for (const n of nodes) {
      categoryCounts.set(n.cat, (categoryCounts.get(n.cat) ?? 0) + 1)
    }
    const nodeByCategory = Array.from(categoryCounts.entries()).map(([cat, count]) => ({
      category: cat,
      label: categoryLabels[cat] ?? cat,
      icon: categoryIcons[cat] ?? '📌',
      count,
    }))

    // 按关系类型统计
    const relationTypeCounts = new Map<RelationType, number>()
    for (const r of relations) {
      relationTypeCounts.set(r.type, (relationTypeCounts.get(r.type) ?? 0) + 1)
    }
    const relationsByType = Array.from(relationTypeCounts.entries()).map(([type, count]) => {
      const meta = RELATION_TYPE_META[type]
      return {
        type,
        label: meta?.label ?? type,
        icon: meta?.icon ?? '🔗',
        color: meta?.color ?? '#999',
        count,
      }
    })

    // 孤立节点（没有任何关系的节点）
    const connectedNodeIds = new Set<string>()
    for (const r of relations) {
      connectedNodeIds.add(r.sourceId)
      connectedNodeIds.add(r.targetId)
    }
    const orphanNodes = nodes.filter(n => !connectedNodeIds.has(n.id)).length

    return {
      totalNodes: nodes.length,
      totalRelations: relations.length,
      nodeByCategory,
      relationsByType,
      orphanNodes,
      healthScore: health,
      connectionSuggestions: connections,
      blindSpots,
    }
  })

  // ---- 导入状态 ----

  const importStatus = computed<ImportStatus>(() => {
    const sources: ImportSource[] = [] // 由 importer 模块管理，此处从 storage 读取
    const byStatus = { pending: 0, processing: 0, completed: 0, failed: 0 }
    const recentSources = sources.slice(0, 5)

    return {
      sources,
      totalSources: sources.length,
      byStatus,
      recentSources,
    }
  })

  // ---- 策略评估摘要 ----
  // Strategy evaluator is pure functions; maintain state in the bridge
  const strategyOptions = ref<StrategyOption[]>([])
  const evaluationResult = ref<EvaluationResult | null>(null)

  const strategySummary = computed<StrategyEvaluationSummary>(() => {
    const options = strategyOptions.value
    const evaluation = evaluationResult.value

    const averageScore = evaluation?.totalScore ?? 0

    const recommendations: StrategyRecommendation[] = evaluation
      ? [{
          strategyId: evaluation.strategyId,
          strategyName: evaluation.strategyName,
          totalScore: evaluation.totalScore,
          grade: evaluation.grade,
          rank: 1,
          reasons: evaluation.dimensions.filter(d => d.score >= 7).map(d => `${d.label}(${d.score}分)`),
          bestScenarios: [],
          risks: evaluation.dimensions.filter(d => d.score <= 4).map(d => `${d.label}(${d.score}分)`),
        }]
      : []

    return {
      options,
      evaluationCount: options.length,
      recentEvaluation: evaluation,
      recommendations,
      averageScore: Math.round(averageScore * 10) / 10,
    }
  })

  // ---- 决策树摘要 ----
  // Decision tree is pure functions; maintain state in the bridge
  const decisionTrees = ref<DecisionTree[]>([])
  const sensitivityResult = ref<SensitivityResult | null>(null)

  const decisionSummary = computed<DecisionTreeSummary>(() => {
    const trees = decisionTrees.value
    const totalNodes = trees.reduce((s, t) => s + t.nodes.size, 0)

    return {
      trees,
      totalTrees: trees.length,
      totalNodes,
      recentTree: trees.length > 0 ? trees[trees.length - 1] : null,
      sensitivityResult: sensitivityResult.value,
    }
  })

  // ---- 场景规划摘要 ----
  // Scenario planner is pure functions; maintain state in the bridge
  const scenarioPlans = ref<ScenarioPlan[]>([])
  const futureProjections = ref<FutureProjection[]>([])

  const scenarioSummary = computed<ScenarioPlanSummary>(() => {
    const plans = scenarioPlans.value
    const projections = futureProjections.value

    const typeCounts = new Map<ScenarioType, number>()
    for (const p of plans) {
      typeCounts.set(p.type, (typeCounts.get(p.type) ?? 0) + 1)
    }
    const byType = Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      count,
    }))

    return {
      plans,
      totalPlans: plans.length,
      byType,
      projections,
    }
  })

  // ---- 图谱数据 ----

  const graphData = computed(() => {
    const nodes = getNodes()
    const relations = getRelations()
    const layout = graphVis.buildGraph(nodes, relations)
    return { nodes: layout.nodes, edges: layout.edges }
  })

  // ---- 间隔复习概览 ----

  const reviewOverview = computed(() => {
    const stats = spacedReview.reviewStats.value
    return {
      totalItems: stats.totalReviews,
      dueToday: stats.todayDue,
      overdue: 0,
      completed: stats.totalReviews,
    }
  })

  // ---- Socratic 问题生成 ----

  function generateSocraticQuestions(nodeId: string): string[] {
    const nodes = getNodes()
    return generateQuestions(nodeId, nodes)
  }

  // ---- 操作入口 ----

  /**
   * 添加知识节点
   */
  function addNode(
    title: string,
    desc: string,
    cat: KnowledgeCategory,
    tags: string[] = [],
  ): KnowledgeNode {
    const node: KnowledgeNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      desc,
      cat,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return createNode(node)
  }

  /**
   * 编辑知识节点
   */
  function editNode(
    id: string,
    data: Partial<Omit<KnowledgeNode, 'id' | 'createdAt'>>,
  ): KnowledgeNode | null {
    return updateNode(id, data)
  }

  /**
   * 删除知识节点
   */
  function removeNode(id: string): boolean {
    return deleteNode(id)
  }

  /**
   * 添加关系
   */
  function addRelation(
    sourceId: string,
    targetId: string,
    type: RelationType,
    label: string = '',
  ): KnowledgeRelation {
    const relation: KnowledgeRelation = {
      id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceId,
      targetId,
      type,
      label,
      createdAt: new Date().toISOString(),
    }
    return createRelation(relation)
  }

  /**
   * 删除关系
   */
  function removeRelation(id: string): boolean {
    return deleteRelation(id)
  }

  /**
   * 刷新图谱可视化
   */
  function refreshGraph(): void {
    const nodes = getNodes()
    const relations = getRelations()
    graphVis.buildGraph(nodes, relations)
  }

  /**
   * 应用增强力导向布局
   */
  function applyLayout(params?: Partial<EnhancedForceParams>): EnhancedForceResult {
    const nodes = getNodes()
    const relations = getRelations()
    const layout = graphVis.buildGraph(nodes, relations)
    const defaultParams: EnhancedForceParams = {
      width: 800,
      height: 600,
      spacing: 100,
      gravity: 0.1,
      repulsion: 5000,
      springLength: 150,
      iterations: 100,
      convergenceThreshold: 0.01,
      maxIterations: 200,
      minIterations: 10,
      adaptiveCooling: true,
      ...params,
    }
    return applyEnhancedForceLayout(layout.nodes, layout.edges, defaultParams)
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 聚合状态
    isLoading,
    graphOverview,
    importStatus,
    strategySummary,
    decisionSummary,
    scenarioSummary,
    graphData,
    reviewOverview,

    // 操作入口
    addNode,
    editNode,
    removeNode,
    addRelation,
    removeRelation,
    generateSocraticQuestions,
    refreshGraph,
    applyLayout,

    // 子模块直通（供高级场景使用）
    getNodes,
    getRelations,
    getNodeRelations,
    graphVis,
    spacedReview,
    versionManager,
    autoLayout,
    layoutScorer,
    strategyEvaluator,
    decisionTree,
    scenarioPlanner,
  }
}