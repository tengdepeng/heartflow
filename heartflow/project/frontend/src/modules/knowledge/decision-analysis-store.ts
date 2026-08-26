// ============================================================
// 经略阁 · 决策分析数据层（P18-6 三引擎的持久化存储）
// 为 useStrategyEvaluator / useDecisionTree / useScenarioPlanner
// 三个纯函数引擎提供 storage 背书：策略、决策树、场景均落盘，
// 使「策略评估 / 决策树 / 场景规划」面板成为数据背书的真缺口补全。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { StrategyOption } from './strategy-evaluator'
import type { DecisionTree, DecisionTreeNode } from './decision-tree'
import type { ScenarioPlan } from './scenario-planner'

export const STRATEGIES_KEY = 'hf:knowledge:strategies'
export const DECISION_TREES_KEY = 'hf:knowledge:decision_trees'
export const SCENARIOS_KEY = 'hf:knowledge:scenarios'

/** 决策树 nodes 是 Map，JSON 无法直接序列化，落盘前转为 Record */
interface SerializedDecisionTree {
  id: string
  name: string
  description: string
  rootId: string
  nodes: Record<string, DecisionTreeNode>
  createdAt: string
  updatedAt: string
}

function serializeTree(tree: DecisionTree): SerializedDecisionTree {
  return {
    id: tree.id,
    name: tree.name,
    description: tree.description,
    rootId: tree.rootId,
    nodes: Object.fromEntries(tree.nodes),
    createdAt: tree.createdAt,
    updatedAt: tree.updatedAt,
  }
}

function deserializeTree(data: SerializedDecisionTree): DecisionTree {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    rootId: data.rootId,
    nodes: new Map(Object.entries(data.nodes ?? {})),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function useDecisionAnalysisStore() {
  const strategies = ref<StrategyOption[]>(storage.getKV<StrategyOption[]>(STRATEGIES_KEY, []))
  const trees = ref<DecisionTree[]>(
    storage
      .getKV<SerializedDecisionTree[]>(DECISION_TREES_KEY, [])
      .map(deserializeTree),
  )
  const scenarios = ref<ScenarioPlan[]>(storage.getKV<ScenarioPlan[]>(SCENARIOS_KEY, []))

  function load() {
    strategies.value = storage.getKV<StrategyOption[]>(STRATEGIES_KEY, [])
    trees.value = storage
      .getKV<SerializedDecisionTree[]>(DECISION_TREES_KEY, [])
      .map(deserializeTree)
    scenarios.value = storage.getKV<ScenarioPlan[]>(SCENARIOS_KEY, [])
  }

  function saveStrategies() {
    storage.setKV(STRATEGIES_KEY, strategies.value)
  }

  function saveTrees() {
    storage.setKV(DECISION_TREES_KEY, trees.value.map(serializeTree))
  }

  function saveScenarios() {
    storage.setKV(SCENARIOS_KEY, scenarios.value)
  }

  function persistAll() {
    saveStrategies()
    saveTrees()
    saveScenarios()
  }

  return {
    strategies,
    trees,
    scenarios,
    load,
    saveStrategies,
    saveTrees,
    saveScenarios,
    persistAll,
  }
}

/** 单例模式（与 body-wisdom getConstitutionTrendStore 一致）：跨组件共享决策分析状态 */
let _instance: ReturnType<typeof useDecisionAnalysisStore> | null = null

export function getDecisionAnalysisStore() {
  if (!_instance) {
    _instance = useDecisionAnalysisStore()
    _instance.load()
  }
  return _instance
}
