// ============================================================
// 平行世界 · 场景模拟 + 决策树
// 蓝图：场景模拟引擎、决策树构建、假设分析、结果预测
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'

// ---- 场景定义 ----

export interface Scenario {
  id: string
  title: string
  description: string
  branchId: string
  conditions: ScenarioCondition[]
  createdAt: string
  updatedAt: string
}

export interface ScenarioCondition {
  id: string
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'between'
  value: unknown
  label: string
}

export interface ScenarioOutcome {
  id: string
  scenarioId: string
  label: string
  description: string
  probability: number // 0-1
  impact: 'very-low' | 'low' | 'medium' | 'high' | 'very-high'
  impactScore: number // 1-10
  resultDescription: string
  tags: string[]
}

// ---- 决策树 ----

export interface DecisionNode {
  id: string
  label: string
  description: string
  question: string
  parentId: string | null
  children: DecisionNode[]
  depth: number
  isLeaf: boolean
  choiceLabel?: string
  outcomeId?: string
  metadata: Record<string, unknown>
}

export interface DecisionTree {
  id: string
  title: string
  description: string
  branchId: string
  rootNode: DecisionNode
  totalNodes: number
  maxDepth: number
  leafCount: number
  createdAt: string
  updatedAt: string
}

// ---- 模拟结果 ----

export interface SimulationResult {
  id: string
  scenarioId: string
  branchId: string
  outcomeAssignments: Record<string, number> // outcomeId -> probability
  expectedImpact: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
  confidence: number // 0-1
  simulatedAt: string
  assumptions: string[]
}

export interface WhatIfAnalysis {
  id: string
  title: string
  description: string
  baseBranchId: string
  alternatives: WhatIfAlternative[]
  createdAt: string
}

export interface WhatIfAlternative {
  id: string
  label: string
  description: string
  parameterChanges: Record<string, unknown>
  expectedOutcomes: ScenarioOutcome[]
  pros: string[]
  cons: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  feasibilityScore: number // 0-1
}

// ---- 存储键 ----

const SIM_STORAGE_KEYS = {
  SCENARIOS: 'hf:parallel-world:scenarios',
  OUTCOMES: 'hf:parallel-world:outcomes',
  DECISION_TREES: 'hf:parallel-world:decision-trees',
  SIMULATIONS: 'hf:parallel-world:simulations',
  WHATIF: 'hf:parallel-world:whatif',
} as const

// ---- 影响映射 ----

const IMPACT_SCORES: Record<ScenarioOutcome['impact'], number> = {
  'very-low': 1,
  'low': 3,
  'medium': 5,
  'high': 7,
  'very-high': 9,
}

const IMPACT_LABELS: Record<ScenarioOutcome['impact'], string> = {
  'very-low': '极低',
  'low': '低',
  'medium': '中',
  'high': '高',
  'very-high': '极高',
}

// ============================================================
// useScenarioSimulation
// ============================================================

export function useScenarioSimulation() {
  const scenarios = ref<Scenario[]>([])
  const outcomes = ref<ScenarioOutcome[]>([])
  const decisionTrees = ref<DecisionTree[]>([])
  const simulations = ref<SimulationResult[]>([])
  const whatIfAnalyses = ref<WhatIfAnalysis[]>([])

  // ---- 持久化 ----

  function loadAll(): void {
    scenarios.value = storage.getKV<Scenario[]>(SIM_STORAGE_KEYS.SCENARIOS, []) || []
    outcomes.value = storage.getKV<ScenarioOutcome[]>(SIM_STORAGE_KEYS.OUTCOMES, []) || []
    decisionTrees.value = storage.getKV<DecisionTree[]>(SIM_STORAGE_KEYS.DECISION_TREES, []) || []
    simulations.value = storage.getKV<SimulationResult[]>(SIM_STORAGE_KEYS.SIMULATIONS, []) || []
    whatIfAnalyses.value = storage.getKV<WhatIfAnalysis[]>(SIM_STORAGE_KEYS.WHATIF, []) || []
  }

  function saveScenarios(): void {
    storage.setKV(SIM_STORAGE_KEYS.SCENARIOS, scenarios.value)
  }

  function saveOutcomes(): void {
    storage.setKV(SIM_STORAGE_KEYS.OUTCOMES, outcomes.value)
  }

  function saveDecisionTrees(): void {
    storage.setKV(SIM_STORAGE_KEYS.DECISION_TREES, decisionTrees.value)
  }

  function saveSimulations(): void {
    storage.setKV(SIM_STORAGE_KEYS.SIMULATIONS, simulations.value)
  }

  function saveWhatIf(): void {
    storage.setKV(SIM_STORAGE_KEYS.WHATIF, whatIfAnalyses.value)
  }

  // ---- 场景管理 ----

  function createScenario(
    title: string,
    description: string,
    branchId: string,
    conditions: Omit<ScenarioCondition, 'id'>[] = [],
  ): Scenario {
    const scenario: Scenario = {
      id: `scn-${Date.now()}`,
      title,
      description,
      branchId,
      conditions: conditions.map((c, i) => ({ ...c, id: `cond-${Date.now()}-${i}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    scenarios.value.push(scenario)
    saveScenarios()
    return scenario
  }

  function updateScenario(scenarioId: string, updates: Partial<Scenario>): Scenario | undefined {
    const idx = scenarios.value.findIndex((s) => s.id === scenarioId)
    if (idx === -1) return undefined
    scenarios.value[idx] = { ...scenarios.value[idx], ...updates, updatedAt: new Date().toISOString() }
    saveScenarios()
    return scenarios.value[idx]
  }

  function removeScenario(scenarioId: string): void {
    scenarios.value = scenarios.value.filter((s) => s.id !== scenarioId)
    outcomes.value = outcomes.value.filter((o) => o.scenarioId !== scenarioId)
    saveScenarios()
    saveOutcomes()
  }

  function getScenariosForBranch(branchId: string): Scenario[] {
    return scenarios.value.filter((s) => s.branchId === branchId)
  }

  // ---- 结果管理 ----

  function addOutcome(
    scenarioId: string,
    label: string,
    description: string,
    probability: number,
    impact: ScenarioOutcome['impact'],
    resultDescription: string,
    tags: string[] = [],
  ): ScenarioOutcome {
    const outcome: ScenarioOutcome = {
      id: `out-${Date.now()}`,
      scenarioId,
      label,
      description,
      probability: Math.max(0, Math.min(1, probability)),
      impact,
      impactScore: IMPACT_SCORES[impact],
      resultDescription,
      tags,
    }
    outcomes.value.push(outcome)
    saveOutcomes()
    return outcome
  }

  function updateOutcome(outcomeId: string, updates: Partial<ScenarioOutcome>): ScenarioOutcome | undefined {
    const idx = outcomes.value.findIndex((o) => o.id === outcomeId)
    if (idx === -1) return undefined
    const updated = { ...outcomes.value[idx], ...updates }
    if (updates.impact) {
      updated.impactScore = IMPACT_SCORES[updates.impact]
    }
    outcomes.value[idx] = updated
    saveOutcomes()
    return outcomes.value[idx]
  }

  function removeOutcome(outcomeId: string): void {
    outcomes.value = outcomes.value.filter((o) => o.id !== outcomeId)
    saveOutcomes()
  }

  function getOutcomesForScenario(scenarioId: string): ScenarioOutcome[] {
    return outcomes.value
      .filter((o) => o.scenarioId === scenarioId)
      .sort((a, b) => b.probability - a.probability)
  }

  // ---- 决策树构建 ----

  function createDecisionTree(
    title: string,
    description: string,
    branchId: string,
    rootQuestion: string,
  ): DecisionTree {
    const rootNode: DecisionNode = {
      id: `dnode-${Date.now()}`,
      label: '起点',
      description: rootQuestion,
      question: rootQuestion,
      parentId: null,
      children: [],
      depth: 0,
      isLeaf: false,
      metadata: {},
    }

    const tree: DecisionTree = {
      id: `dtree-${Date.now()}`,
      title,
      description,
      branchId,
      rootNode,
      totalNodes: 1,
      maxDepth: 0,
      leafCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    decisionTrees.value.push(tree)
    saveDecisionTrees()
    return tree
  }

  function addDecisionNode(
    treeId: string,
    parentId: string,
    label: string,
    description: string,
    question: string,
    isLeaf: boolean = false,
    choiceLabel?: string,
    outcomeId?: string,
  ): DecisionNode | undefined {
    const tree = decisionTrees.value.find((t) => t.id === treeId)
    if (!tree) return undefined

    const parentNode = findNode(tree.rootNode, parentId)
    if (!parentNode) return undefined

    const node: DecisionNode = {
      id: `dnode-${Date.now()}`,
      label,
      description,
      question,
      parentId,
      children: [],
      depth: parentNode.depth + 1,
      isLeaf,
      choiceLabel,
      outcomeId,
      metadata: {},
    }

    parentNode.children.push(node)
    parentNode.isLeaf = false

    // 更新树统计
    recalcTreeStats(tree)

    saveDecisionTrees()
    return node
  }

  function removeDecisionNode(treeId: string, nodeId: string): boolean {
    const tree = decisionTrees.value.find((t) => t.id === treeId)
    if (!tree) return false

    if (tree.rootNode.id === nodeId) return false // 不能删除根节点

    const parent = findParentNode(tree.rootNode, nodeId)
    if (!parent) return false

    parent.children = parent.children.filter((c) => c.id !== nodeId)
    if (parent.children.length === 0) {
      parent.isLeaf = true
    }

    recalcTreeStats(tree)
    saveDecisionTrees()
    return true
  }

  function findNode(root: DecisionNode, nodeId: string): DecisionNode | undefined {
    if (root.id === nodeId) return root
    for (const child of root.children) {
      const found = findNode(child, nodeId)
      if (found) return found
    }
    return undefined
  }

  function findParentNode(root: DecisionNode, nodeId: string): DecisionNode | undefined {
    for (const child of root.children) {
      if (child.id === nodeId) return root
      const found = findParentNode(child, nodeId)
      if (found) return found
    }
    return undefined
  }

  function recalcTreeStats(tree: DecisionTree): void {
    let totalNodes = 0
    let maxDepth = 0
    let leafCount = 0

    function traverse(node: DecisionNode): void {
      totalNodes++
      maxDepth = Math.max(maxDepth, node.depth)
      if (node.isLeaf) leafCount++
      node.children.forEach(traverse)
    }

    traverse(tree.rootNode)
    tree.totalNodes = totalNodes
    tree.maxDepth = maxDepth
    tree.leafCount = leafCount
    tree.updatedAt = new Date().toISOString()
  }

  function getDecisionTree(treeId: string): DecisionTree | undefined {
    return decisionTrees.value.find((t) => t.id === treeId)
  }

  function getDecisionTreesForBranch(branchId: string): DecisionTree[] {
    return decisionTrees.value.filter((t) => t.branchId === branchId)
  }

  function removeDecisionTree(treeId: string): void {
    decisionTrees.value = decisionTrees.value.filter((t) => t.id !== treeId)
    saveDecisionTrees()
  }

  // ---- 场景模拟 ----

  function runSimulation(
    scenarioId: string,
    branchId: string,
    assumptions: string[] = [],
  ): SimulationResult {
    const scenarioOutcomes = getOutcomesForScenario(scenarioId)

    if (scenarioOutcomes.length === 0) {
      return {
        id: `sim-${Date.now()}`,
        scenarioId,
        branchId,
        outcomeAssignments: {},
        expectedImpact: 0,
        riskLevel: 'low',
        recommendation: '暂无结果数据，请先添加场景结果',
        confidence: 0,
        simulatedAt: new Date().toISOString(),
        assumptions,
      }
    }

    // 归一化概率
    const totalProb = scenarioOutcomes.reduce((sum, o) => sum + o.probability, 0)
    const normalizedOutcomes = scenarioOutcomes.map((o) => ({
      ...o,
      normalizedProb: totalProb > 0 ? o.probability / totalProb : 1 / scenarioOutcomes.length,
    }))

    // 计算期望影响
    const expectedImpact = normalizedOutcomes.reduce(
      (sum, o) => sum + o.impactScore * o.normalizedProb,
      0,
    )

    // 风险评估
    const riskLevel = determineRiskLevel(expectedImpact, normalizedOutcomes)

    // 生成建议
    const recommendation = generateRecommendation(expectedImpact, riskLevel, normalizedOutcomes)

    // 置信度（基于结果数量和数据质量）
    const confidence = calculateConfidence(normalizedOutcomes)

    const result: SimulationResult = {
      id: `sim-${Date.now()}`,
      scenarioId,
      branchId,
      outcomeAssignments: Object.fromEntries(
        normalizedOutcomes.map((o) => [o.id, o.normalizedProb]),
      ),
      expectedImpact: Math.round(expectedImpact * 100) / 100,
      riskLevel,
      recommendation,
      confidence: Math.round(confidence * 100) / 100,
      simulatedAt: new Date().toISOString(),
      assumptions,
    }

    simulations.value.push(result)
    saveSimulations()
    return result
  }

  function determineRiskLevel(
    expectedImpact: number,
    outcomes: (ScenarioOutcome & { normalizedProb: number })[],
  ): SimulationResult['riskLevel'] {
    // 高影响高概率结果的数量
    const highRiskCount = outcomes.filter(
      (o) => o.impactScore >= 7 && o.normalizedProb > 0.3,
    ).length

    if (expectedImpact >= 7 && highRiskCount >= 1) return 'critical'
    if (expectedImpact >= 6) return 'high'
    if (expectedImpact >= 3.5) return 'medium'
    return 'low'
  }

  function generateRecommendation(
    expectedImpact: number,
    riskLevel: string,
    outcomes: (ScenarioOutcome & { normalizedProb: number })[],
  ): string {
    const topOutcome = outcomes[0]
    const worstOutcome = outcomes.reduce((worst, o) =>
      o.impactScore > worst.impactScore ? o : worst,
    )

    if (riskLevel === 'critical') {
      return `高风险场景：最可能的结果是"${topOutcome.label}"（概率 ${Math.round(topOutcome.normalizedProb * 100)}%），最坏情况是"${worstOutcome.label}"。建议制定风险缓解计划，考虑备选方案。`
    }
    if (riskLevel === 'high') {
      return `较高风险：预期影响 ${expectedImpact.toFixed(1)}/10。主要关注"${worstOutcome.label}"的潜在影响。建议准备应急方案。`
    }
    if (riskLevel === 'medium') {
      return `中等风险：预期影响 ${expectedImpact.toFixed(1)}/10。最可能的结果是"${topOutcome.label}"。建议持续监控关键指标。`
    }
    return `低风险：预期影响 ${expectedImpact.toFixed(1)}/10。建议按计划推进，定期复查。`
  }

  function calculateConfidence(
    outcomes: (ScenarioOutcome & { normalizedProb: number })[],
  ): number {
    if (outcomes.length === 0) return 0
    if (outcomes.length === 1) return 0.5

    // 基于结果数量、概率分布均匀度、以及是否有极端值
    const countScore = Math.min(outcomes.length / 5, 1) * 0.3

    // 概率分布均匀度（熵）
    const entropy = -outcomes.reduce(
      (sum, o) => sum + o.normalizedProb * Math.log2(o.normalizedProb + 0.001),
      0,
    )
    const maxEntropy = Math.log2(outcomes.length)
    const entropyScore = maxEntropy > 0 ? (entropy / maxEntropy) * 0.4 : 0.4

    // 基础分
    const baseScore = 0.3

    return Math.min(baseScore + countScore + entropyScore, 1)
  }

  function getSimulationsForScenario(scenarioId: string): SimulationResult[] {
    return simulations.value.filter((s) => s.scenarioId === scenarioId)
  }

  function getLatestSimulation(scenarioId: string): SimulationResult | undefined {
    return simulations.value
      .filter((s) => s.scenarioId === scenarioId)
      .sort((a, b) => new Date(b.simulatedAt).getTime() - new Date(a.simulatedAt).getTime())[0]
  }

  // ---- What-If 分析 ----

  function createWhatIfAnalysis(
    title: string,
    description: string,
    baseBranchId: string,
  ): WhatIfAnalysis {
    const analysis: WhatIfAnalysis = {
      id: `wi-${Date.now()}`,
      title,
      description,
      baseBranchId,
      alternatives: [],
      createdAt: new Date().toISOString(),
    }
    whatIfAnalyses.value.push(analysis)
    saveWhatIf()
    return analysis
  }

  function addAlternative(
    analysisId: string,
    label: string,
    description: string,
    parameterChanges: Record<string, unknown>,
  ): WhatIfAlternative | undefined {
    const analysis = whatIfAnalyses.value.find((a) => a.id === analysisId)
    if (!analysis) return undefined

    const alternative: WhatIfAlternative = {
      id: `alt-${Date.now()}`,
      label,
      description,
      parameterChanges,
      expectedOutcomes: [],
      pros: [],
      cons: [],
      riskLevel: 'medium',
      feasibilityScore: 0.5,
    }

    analysis.alternatives.push(alternative)
    saveWhatIf()
    return alternative
  }

  function updateAlternative(
    analysisId: string,
    alternativeId: string,
    updates: Partial<WhatIfAlternative>,
  ): WhatIfAlternative | undefined {
    const analysis = whatIfAnalyses.value.find((a) => a.id === analysisId)
    if (!analysis) return undefined

    const altIdx = analysis.alternatives.findIndex((a) => a.id === alternativeId)
    if (altIdx === -1) return undefined

    analysis.alternatives[altIdx] = { ...analysis.alternatives[altIdx], ...updates }
    saveWhatIf()
    return analysis.alternatives[altIdx]
  }

  function removeAlternative(analysisId: string, alternativeId: string): void {
    const analysis = whatIfAnalyses.value.find((a) => a.id === analysisId)
    if (!analysis) return

    analysis.alternatives = analysis.alternatives.filter((a) => a.id !== alternativeId)
    saveWhatIf()
  }

  function evaluateAlternatives(analysisId: string): {
    ranked: (WhatIfAlternative & { score: number })[]
    best: WhatIfAlternative | undefined
  } {
    const analysis = whatIfAnalyses.value.find((a) => a.id === analysisId)
    if (!analysis || analysis.alternatives.length === 0) {
      return { ranked: [], best: undefined }
    }

    const ranked = analysis.alternatives
      .map((alt) => {
        // 综合评分：可行性 40% + 风险 30% + 正面因素 30%
        const riskScore = mapRiskToScore(alt.riskLevel)
        const prosScore = Math.min(alt.pros.length / 5, 1) * 0.3
        const score =
          alt.feasibilityScore * 0.4 +
          riskScore * 0.3 +
          prosScore * 0.3

        return { ...alt, score: Math.round(score * 100) / 100 }
      })
      .sort((a, b) => b.score - a.score)

    return { ranked, best: ranked[0] }
  }

  function mapRiskToScore(riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return 1
      case 'medium': return 0.7
      case 'high': return 0.4
      case 'critical': return 0.1
      default: return 0.5
    }
  }

  function getWhatIfAnalysis(analysisId: string): WhatIfAnalysis | undefined {
    return whatIfAnalyses.value.find((a) => a.id === analysisId)
  }

  function removeWhatIfAnalysis(analysisId: string): void {
    whatIfAnalyses.value = whatIfAnalyses.value.filter((a) => a.id !== analysisId)
    saveWhatIf()
  }

  // ---- 统计 ----

  function getSimulationStats(): {
    totalScenarios: number
    totalSimulations: number
    totalDecisionTrees: number
    totalWhatIfAnalyses: number
    avgConfidence: number
    riskDistribution: Record<string, number>
  } {
    const riskDist: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    simulations.value.forEach((s) => {
      riskDist[s.riskLevel] = (riskDist[s.riskLevel] || 0) + 1
    })

    const avgConf =
      simulations.value.length > 0
        ? simulations.value.reduce((sum, s) => sum + s.confidence, 0) / simulations.value.length
        : 0

    return {
      totalScenarios: scenarios.value.length,
      totalSimulations: simulations.value.length,
      totalDecisionTrees: decisionTrees.value.length,
      totalWhatIfAnalyses: whatIfAnalyses.value.length,
      avgConfidence: Math.round(avgConf * 100) / 100,
      riskDistribution: riskDist,
    }
  }

  // ---- 初始化 ----

  loadAll()

  return {
    scenarios,
    outcomes,
    decisionTrees,
    simulations,
    whatIfAnalyses,
    // 场景
    createScenario,
    updateScenario,
    removeScenario,
    getScenariosForBranch,
    // 结果
    addOutcome,
    updateOutcome,
    removeOutcome,
    getOutcomesForScenario,
    // 决策树
    createDecisionTree,
    addDecisionNode,
    removeDecisionNode,
    findNode,
    getDecisionTree,
    getDecisionTreesForBranch,
    removeDecisionTree,
    // 模拟
    runSimulation,
    getSimulationsForScenario,
    getLatestSimulation,
    // What-If
    createWhatIfAnalysis,
    addAlternative,
    updateAlternative,
    removeAlternative,
    evaluateAlternatives,
    getWhatIfAnalysis,
    removeWhatIfAnalysis,
    // 统计
    getSimulationStats,
    loadAll,
  }
}

export { IMPACT_SCORES, IMPACT_LABELS }