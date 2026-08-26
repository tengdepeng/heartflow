// ============================================================
// 经略阁 · 决策分析 P18-6 · 单元测试
// 存储层（策略/决策树/场景持久化）+ 三引擎核心逻辑
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { storage } from '../../../engine/storage'
import {
  useDecisionAnalysisStore,
  STRATEGIES_KEY,
  DECISION_TREES_KEY,
  SCENARIOS_KEY,
} from '../decision-analysis-store'
import { useStrategyEvaluator } from '../strategy-evaluator'
import { useDecisionTree } from '../decision-tree'
import { useScenarioPlanner } from '../scenario-planner'
import type { KnowledgeNode } from '../types'

function makeNode(id: string, cat: KnowledgeNode['cat'] = 'concept'): KnowledgeNode {
  return {
    id,
    title: `节点 ${id}`,
    desc: `描述 ${id}`,
    cat,
    tags: [],
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  }
}

beforeEach(() => {
  storage.removeKV(STRATEGIES_KEY)
  storage.removeKV(DECISION_TREES_KEY)
  storage.removeKV(SCENARIOS_KEY)
})

// ============================================================
// 1. 存储层
// ============================================================

describe('决策分析存储层', () => {
  it('策略持久化往返', () => {
    const store = useDecisionAnalysisStore()
    const api = useStrategyEvaluator()
    const s = api.createStrategy('转行产品', '评估', ['n1'], { impact: 8 })
    store.strategies.value.push(s)
    store.saveStrategies()

    const reloaded = useDecisionAnalysisStore()
    expect(reloaded.strategies.value).toHaveLength(1)
    expect(reloaded.strategies.value[0].name).toBe('转行产品')
    expect(reloaded.strategies.value[0].scores.impact).toBe(8)
  })

  it('决策树 Map 序列化往返', () => {
    const store = useDecisionAnalysisStore()
    const api = useDecisionTree()
    const tree = api.createTree('是否跳槽')
    api.addChild(tree, tree.rootId, '留下', 'outcome', { value: 5 })
    api.addChild(tree, tree.rootId, '跳槽', 'chance', { probability: 0.6 })
    store.trees.value.push(tree)
    store.saveTrees()

    const reloaded = useDecisionAnalysisStore()
    expect(reloaded.trees.value).toHaveLength(1)
    const t = reloaded.trees.value[0]
    expect(t.nodes).toBeInstanceOf(Map)
    expect(t.nodes.size).toBe(3)
    expect(t.nodes.get(tree.rootId)?.childrenIds).toHaveLength(2)
  })

  it('场景持久化往返', () => {
    const store = useDecisionAnalysisStore()
    const api = useScenarioPlanner()
    const sc = api.createScenario('三年后', 'best_case')
    api.addDriver(sc, '市场需求')
    store.scenarios.value.push(sc)
    store.saveScenarios()

    const reloaded = useDecisionAnalysisStore()
    expect(reloaded.scenarios.value).toHaveLength(1)
    expect(reloaded.scenarios.value[0].drivers[0].name).toBe('市场需求')
  })

  it('persistAll 一次写入三类数据', () => {
    const store = useDecisionAnalysisStore()
    store.strategies.value.push(useStrategyEvaluator().createStrategy('A', ''))
    store.trees.value.push(useDecisionTree().createTree('T'))
    store.scenarios.value.push(useScenarioPlanner().createScenario('S'))
    store.persistAll()

    const reloaded = useDecisionAnalysisStore()
    expect(reloaded.strategies.value).toHaveLength(1)
    expect(reloaded.trees.value).toHaveLength(1)
    expect(reloaded.scenarios.value).toHaveLength(1)
  })
})

// ============================================================
// 2. 策略评估引擎
// ============================================================

describe('策略评估引擎', () => {
  it('加权总分与等级计算', () => {
    const api = useStrategyEvaluator()
    const s = api.createStrategy('方案A', '', [], {
      feasibility: 8,
      impact: 9,
      cost: 7,
      risk: 6,
      timeline: 8,
      sustainability: 7,
      alignment: 9,
    })
    const r = api.evaluate(s)
    expect(r.strategyId).toBe(s.id)
    expect(r.dimensions).toHaveLength(7)
    // totalScore 为 0-10 量纲的加权均值（方案A 各维度 7-9 分 → 约 7.8）
    expect(r.totalScore).toBeGreaterThan(7)
    // getGrade 阈值已对齐 0-10 量纲（A≥8.5…F≥0），7.8 → 'B'
    expect(r.grade).toBe('B')
  })

  it('低分策略评为 F', () => {
    const api = useStrategyEvaluator()
    const s = api.createStrategy('差方案', '', [], {
      feasibility: 1,
      impact: 1,
      cost: 1,
      risk: 1,
      timeline: 1,
      sustainability: 1,
      alignment: 1,
    })
    const r = api.evaluate(s)
    expect(r.totalScore).toBeLessThan(20)
    expect(r.grade).toBe('F')
  })

  it('批量评估按总分降序', () => {
    const api = useStrategyEvaluator()
    const a = api.createStrategy('A', '', [], { impact: 9, feasibility: 9, cost: 9, risk: 9, timeline: 9, sustainability: 9, alignment: 9 })
    const b = api.createStrategy('B', '', [], { impact: 2, feasibility: 2, cost: 2, risk: 2, timeline: 2, sustainability: 2, alignment: 2 })
    const results = api.evaluateAll([b, a])
    expect(results[0].strategyName).toBe('A')
    expect(results[1].strategyName).toBe('B')
  })

  it('SWOT 从知识节点生成优势与威胁', () => {
    const api = useStrategyEvaluator()
    const s = api.createStrategy('策略', '', ['n1', 'n2', 'n3'])
    const nodes = [
      makeNode('n1', 'insight'),
      makeNode('n2', 'rule'),
      makeNode('n3', 'pitfall'),
    ]
    const swot = api.swotAnalyze(s, nodes)
    expect(swot.strengths.some(i => i.content.includes('洞察'))).toBe(true)
    expect(swot.threats.some(i => i.content.includes('误区'))).toBe(true)
    expect(swot.recommendations.length).toBeGreaterThan(0)
  })

  it('对比生成综合排名与优势矩阵', () => {
    const api = useStrategyEvaluator()
    const a = api.createStrategy('A', '', [], { impact: 9, feasibility: 9, cost: 9, risk: 9, timeline: 9, sustainability: 9, alignment: 9 })
    const b = api.createStrategy('B', '', [], { impact: 3, feasibility: 3, cost: 3, risk: 3, timeline: 3, sustainability: 3, alignment: 3 })
    const cmp = api.compare([a, b])
    expect(cmp.overallRanking[0]).toBe(a.id)
    expect(cmp.radarData.series).toHaveLength(2)
    expect(cmp.advantageMatrix[0].strengths.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 3. 决策树引擎
// ============================================================

describe('决策树引擎', () => {
  it('创建树与添加节点', () => {
    const api = useDecisionTree()
    const tree = api.createTree('是否跳槽')
    const child = api.addChild(tree, tree.rootId, '跳槽', 'chance', { probability: 0.6 })
    expect(child).not.toBeNull()
    expect(tree.nodes.size).toBe(2)
    expect(tree.nodes.get(tree.rootId)?.childrenIds).toContain(child!.id)
  })

  it('结果节点不能添加子节点', () => {
    const api = useDecisionTree()
    const tree = api.createTree('测试')
    const outcome = api.addChild(tree, tree.rootId, '结果', 'outcome', { value: 5 })
    const grand = api.addChild(tree, outcome!.id, '非法', 'outcome')
    expect(grand).toBeNull()
  })

  it('期望值计算：决策取最大，机会取加权平均', () => {
    const api = useDecisionTree()
    const tree = api.createTree('投资')
    const safe = api.addChild(tree, tree.rootId, '稳健', 'outcome', { value: 5 })
    const risky = api.addChild(tree, tree.rootId, '激进', 'chance', { probability: 0.5 })
    api.addChild(tree, risky!.id, '大赚', 'outcome', { value: 20, probability: 0.5 })
    api.addChild(tree, risky!.id, '大亏', 'outcome', { value: -10, probability: 0.5 })

    const ev = api.calculateExpectedValue(tree, tree.rootId)
    // 稳健 5 vs 激进期望 (0.5*20 + 0.5*-10) = 5 → 决策取最大 5
    expect(ev).toBe(5)
    void safe
  })

  it('统计包含最佳路径', () => {
    const api = useDecisionTree()
    const tree = api.createTree('测试')
    api.addChild(tree, tree.rootId, '好结果', 'outcome', { value: 10 })
    api.addChild(tree, tree.rootId, '坏结果', 'outcome', { value: 1 })
    const stats = api.getStats(tree)
    expect(stats.totalNodes).toBe(3)
    expect(stats.outcomeNodes).toBe(2)
    expect(stats.bestPath).not.toBeNull()
    expect(stats.bestPath!.outcomeValue).toBe(10)
  })

  it('从知识节点构建决策树', () => {
    const api = useDecisionTree()
    const nodes = [
      makeNode('f1', 'frame'),
      makeNode('i1', 'insight'),
      makeNode('r1', 'rule'),
      makeNode('p1', 'pitfall'),
    ]
    const tree = api.buildFromKnowledge('知识决策', nodes)
    expect(tree.nodes.size).toBeGreaterThan(2)
    // 误区被写入根节点标签
    expect(tree.nodes.get(tree.rootId)?.tags).toContain('节点 p1')
  })

  it('生成决策报告含风险与建议', () => {
    const api = useDecisionTree()
    const tree = api.createTree('简单决策')
    api.addChild(tree, tree.rootId, '结果', 'outcome', { value: 5 })
    const report = api.generateReport(tree)
    expect(report.treeName).toBe('简单决策')
    expect(report.risks.length).toBeGreaterThan(0)
    expect(report.recommendations.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 4. 场景规划引擎
// ============================================================

describe('场景规划引擎', () => {
  it('创建场景与添加驱动因素', () => {
    const api = useScenarioPlanner()
    const sc = api.createScenario('三年后', 'best_case')
    const d = api.addDriver(sc, '市场需求', { uncertainty: 'high', impact: 0.8 })
    expect(sc.drivers).toHaveLength(1)
    expect(d.uncertainty).toBe('high')
    expect(sc.impactAssessment.overallScore).toBe(0)
  })

  it('影响评估随因子变化', () => {
    const api = useScenarioPlanner()
    const sc = api.createScenario('测试', 'best_case')
    api.addFactor(sc, '技术成熟', { value: '有利', probability: 0.8, impact: 0.9, trend: 'increasing' })
    api.addFactor(sc, '竞争加剧', { value: '不利', probability: 0.6, impact: 0.7, trend: 'decreasing' })
    const impact = api.assessImpact(sc)
    expect(impact.overallScore).toBeGreaterThan(0)
    expect(sc.impactAssessment.overallScore).toBe(impact.overallScore)
  })

  it('对比矩阵给出最佳场景', () => {
    const api = useScenarioPlanner()
    const good = api.createScenario('乐观', 'best_case')
    api.addFactor(good, '利好', { value: '有利', probability: 0.9, impact: 1, trend: 'increasing' })
    const bad = api.createScenario('悲观', 'worst_case')
    api.addFactor(bad, '利空', { value: '不利', probability: 0.9, impact: 1, trend: 'decreasing' })
    const matrix = api.compareScenarios([good, bad])
    expect(matrix.dimensions).toContain('总体评分')
    expect(matrix.matrix).toHaveLength(2)
    expect(matrix.overallRecommendation).toContain('乐观')
  })

  it('基于模板创建场景', () => {
    const api = useScenarioPlanner()
    const sc = api.createFromTemplate('template_decision', '重大决策')
    expect(sc).not.toBeNull()
    expect(sc!.drivers.length).toBeGreaterThan(0)
    expect(sc!.type).toBe('custom')
  })

  it('What-If 分析记录差异', () => {
    const api = useScenarioPlanner()
    const sc = api.createScenario('基准', 'custom')
    const f = api.addFactor(sc, '市场', { value: '中性' })
    const analysis = api.whatIf(sc, [{ factorId: f.id, newValue: '有利', reason: '政策支持' }])
    expect(analysis.changedFactors).toHaveLength(1)
    expect(analysis.changedFactors[0].originalValue).toBe('中性')
    expect(analysis.resultingScenario.name).toContain('What-If')
    expect(analysis.differences.length).toBeGreaterThan(0)
  })
})
