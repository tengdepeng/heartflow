// ============================================================
// 经略阁 · 决策树分析（P18-6）
// 决策树构建、期望值计算、路径分析、敏感度测试
// ============================================================

import type { KnowledgeNode } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 决策树节点类型 */
export type DecisionTreeNodeType = 'decision' | 'chance' | 'outcome'

/** 决策树节点 */
export interface DecisionTreeNode {
  id: string
  /** 节点名称 */
  label: string
  /** 节点类型 */
  type: DecisionTreeNodeType
  /** 父节点 ID */
  parentId: string | null
  /** 子节点 ID 列表 */
  childrenIds: string[]
  /** 描述 */
  description: string
  /** 结果值（仅 outcome 节点有意义） */
  value: number
  /** 概率（仅 chance 节点的子节点有意义，0-1） */
  probability: number
  /** 关联的知识节点 ID */
  knowledgeNodeId?: string
  /** 标签 */
  tags: string[]
  /** 是否折叠 */
  collapsed: boolean
  /** 创建时间 */
  createdAt: string
}

/** 决策树 */
export interface DecisionTree {
  id: string
  /** 树名称 */
  name: string
  /** 描述 */
  description: string
  /** 根节点 ID */
  rootId: string
  /** 所有节点 */
  nodes: Map<string, DecisionTreeNode>
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 决策路径 */
export interface DecisionPath {
  /** 路径 ID */
  id: string
  /** 路径上的节点 ID 序列 */
  nodeIds: string[]
  /** 路径节点详情 */
  nodes: DecisionTreeNode[]
  /** 路径概率（所有 chance 概率的乘积） */
  probability: number
  /** 最终结果值 */
  outcomeValue: number
  /** 期望值 */
  expectedValue: number
  /** 路径标签 */
  label: string
}

/** 灵敏度分析结果 */
export interface SensitivityResult {
  /** 变量名 */
  variable: string
  /** 基准值 */
  baseValue: number
  /** 变化范围 */
  range: { min: number; max: number; step: number }
  /** 各变化点的期望值 */
  dataPoints: { value: number; expectedValue: number }[]
  /** 盈亏平衡点 */
  breakEvenPoint?: number
  /** 敏感度指标 */
  elasticity: number
}

/** 决策树统计 */
export interface DecisionTreeStats {
  /** 总节点数 */
  totalNodes: number
  /** 决策节点数 */
  decisionNodes: number
  /** 机会节点数 */
  chanceNodes: number
  /** 结果节点数 */
  outcomeNodes: number
  /** 最大深度 */
  maxDepth: number
  /** 总路径数 */
  totalPaths: number
  /** 最优路径 */
  bestPath: DecisionPath | null
  /** 最差路径 */
  worstPath: DecisionPath | null
  /** 期望值 */
  overallExpectedValue: number
}

/** 决策树配置 */
export interface DecisionTreeConfig {
  /** 默认概率 */
  defaultProbability: number
  /** 最大深度 */
  maxDepth: number
  /** 风险偏好系数 0-1（0=风险厌恶，1=风险偏好） */
  riskTolerance: number
}

/** 决策分析报告 */
export interface DecisionAnalysisReport {
  treeName: string
  stats: DecisionTreeStats
  /** 推荐路径 */
  recommendedPath: DecisionPath | null
  /** 风险提示 */
  risks: string[]
  /** 建议 */
  recommendations: string[]
  /** 生成时间 */
  generatedAt: string
}

// ============================================================
// 常量
// ============================================================

const NODE_TYPE_META: Record<DecisionTreeNodeType, { label: string; icon: string; color: string }> = {
  decision: { label: '决策点', icon: '◆', color: '#6b9fc4' },
  chance: { label: '机会点', icon: '◇', color: '#f0c040' },
  outcome: { label: '结果', icon: '○', color: '#8a9a7a' },
}

const DEFAULT_CONFIG: DecisionTreeConfig = {
  defaultProbability: 0.5,
  maxDepth: 10,
  riskTolerance: 0.5,
}

// ============================================================
// useDecisionTree
// ============================================================

export function useDecisionTree() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<DecisionTreeConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 创建树 ----

  /**
   * 创建新的决策树
   */
  function createTree(name: string, description: string = ''): DecisionTree {
    const now = new Date().toISOString()
    const rootId = `node_${Date.now()}`
    const rootNode: DecisionTreeNode = {
      id: rootId,
      label: name,
      type: 'decision',
      parentId: null,
      childrenIds: [],
      description,
      value: 0,
      probability: 1,
      tags: [],
      collapsed: false,
      createdAt: now,
    }

    const nodes = new Map<string, DecisionTreeNode>()
    nodes.set(rootId, rootNode)

    return {
      id: `tree_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      rootId,
      nodes,
      createdAt: now,
      updatedAt: now,
    }
  }

  // ---- 节点操作 ----

  /**
   * 添加子节点
   */
  function addChild(
    tree: DecisionTree,
    parentId: string,
    label: string,
    type: DecisionTreeNodeType,
    options: {
      description?: string
      value?: number
      probability?: number
      knowledgeNodeId?: string
      tags?: string[]
    } = {},
  ): DecisionTreeNode | null {
    const parent = tree.nodes.get(parentId)
    if (!parent) return null
    if (parent.type === 'outcome') return null // 结果节点不能添加子节点

    const now = new Date().toISOString()
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const node: DecisionTreeNode = {
      id: nodeId,
      label,
      type,
      parentId,
      childrenIds: [],
      description: options.description || '',
      value: options.value ?? 0,
      probability: options.probability ?? config.defaultProbability,
      knowledgeNodeId: options.knowledgeNodeId,
      tags: options.tags || [],
      collapsed: false,
      createdAt: now,
    }

    tree.nodes.set(nodeId, node)
    parent.childrenIds.push(nodeId)
    tree.updatedAt = now

    return node
  }

  /**
   * 批量添加子节点（用于 chance 节点的多个分支）
   */
  function addChildren(
    tree: DecisionTree,
    parentId: string,
    children: {
      label: string
      type: DecisionTreeNodeType
      description?: string
      value?: number
      probability?: number
      knowledgeNodeId?: string
      tags?: string[]
    }[],
  ): DecisionTreeNode[] {
    return children
      .map(c => addChild(tree, parentId, c.label, c.type, c))
      .filter((n): n is DecisionTreeNode => n !== null)
  }

  /**
   * 移除节点及其子树
   */
  function removeNode(tree: DecisionTree, nodeId: string): boolean {
    const node = tree.nodes.get(nodeId)
    if (!node) return false
    if (nodeId === tree.rootId) return false // 不能删除根节点

    // 递归删除所有子节点
    for (const childId of node.childrenIds) {
      removeNode(tree, childId)
    }

    // 从父节点移除引用
    if (node.parentId) {
      const parent = tree.nodes.get(node.parentId)
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(id => id !== nodeId)
      }
    }

    tree.nodes.delete(nodeId)
    tree.updatedAt = new Date().toISOString()
    return true
  }

  /**
   * 更新节点
   */
  function updateNode(
    tree: DecisionTree,
    nodeId: string,
    updates: Partial<Pick<DecisionTreeNode, 'label' | 'description' | 'value' | 'probability' | 'tags' | 'collapsed' | 'knowledgeNodeId'>>,
  ): boolean {
    const node = tree.nodes.get(nodeId)
    if (!node) return false

    Object.assign(node, updates)
    tree.updatedAt = new Date().toISOString()
    return true
  }

  // ---- 路径遍历 ----

  /**
   * 获取所有决策路径
   */
  function getAllPaths(tree: DecisionTree): DecisionPath[] {
    const paths: DecisionPath[] = []
    const root = tree.nodes.get(tree.rootId)
    if (!root) return paths

    function traverse(
      nodeId: string,
      currentPath: string[],
      currentProb: number,
    ) {
      const node = tree.nodes.get(nodeId)
      if (!node) return

      const newPath = [...currentPath, nodeId]
      const newProb = currentProb * node.probability

      if (node.type === 'outcome' || node.childrenIds.length === 0) {
        const pathNodes = newPath.map(id => tree.nodes.get(id)!).filter(Boolean)
        paths.push({
          id: `path_${paths.length}`,
          nodeIds: newPath,
          nodes: pathNodes,
          probability: Math.round(newProb * 10000) / 10000,
          outcomeValue: node.value,
          expectedValue: Math.round(newProb * node.value * 100) / 100,
          label: pathNodes.map(n => n.label).join(' → '),
        })
        return
      }

      for (const childId of node.childrenIds) {
        traverse(childId, newPath, newProb)
      }
    }

    traverse(tree.rootId, [], 1)
    return paths
  }

  /**
   * 获取从根到指定节点的路径
   */
  function getPathToNode(tree: DecisionTree, nodeId: string): DecisionPath | null {
    const nodeIds: string[] = []
    let currentId: string | null = nodeId

    while (currentId) {
      nodeIds.unshift(currentId)
      const node = tree.nodes.get(currentId)
      currentId = node?.parentId ?? null
    }

    const nodes = nodeIds.map(id => tree.nodes.get(id)!).filter(Boolean)
    let prob = 1
    for (const n of nodes) prob *= n.probability

    const lastNode = nodes[nodes.length - 1]
    return {
      id: `path_to_${nodeId}`,
      nodeIds,
      nodes,
      probability: Math.round(prob * 10000) / 10000,
      outcomeValue: lastNode?.value ?? 0,
      expectedValue: Math.round(prob * (lastNode?.value ?? 0) * 100) / 100,
      label: nodes.map(n => n.label).join(' → '),
    }
  }

  // ---- 期望值计算 ----

  /**
   * 计算节点的期望值
   */
  function calculateExpectedValue(tree: DecisionTree, nodeId: string): number {
    const node = tree.nodes.get(nodeId)
    if (!node) return 0

    if (node.type === 'outcome' || node.childrenIds.length === 0) {
      return node.value
    }

    if (node.type === 'chance') {
      // 机会节点：加权平均
      let total = 0
      let totalProb = 0
      for (const childId of node.childrenIds) {
        const child = tree.nodes.get(childId)
        if (child) {
          total += child.probability * calculateExpectedValue(tree, childId)
          totalProb += child.probability
        }
      }
      // 归一化
      return totalProb > 0 ? total / totalProb : 0
    }

    if (node.type === 'decision') {
      // 决策节点：取最大值
      let maxVal = -Infinity
      for (const childId of node.childrenIds) {
        const val = calculateExpectedValue(tree, childId)
        if (val > maxVal) maxVal = val
      }
      return maxVal === -Infinity ? 0 : maxVal
    }

    return 0
  }

  // ---- 统计 ----

  /**
   * 获取决策树统计
   */
  function getStats(tree: DecisionTree): DecisionTreeStats {
    let decisionNodes = 0
    let chanceNodes = 0
    let outcomeNodes = 0
    let maxDepth = 0

    function traverse(nodeId: string, depth: number) {
      const node = tree.nodes.get(nodeId)
      if (!node) return

      switch (node.type) {
        case 'decision': decisionNodes++; break
        case 'chance': chanceNodes++; break
        case 'outcome': outcomeNodes++; break
      }

      if (depth > maxDepth) maxDepth = depth

      for (const childId of node.childrenIds) {
        traverse(childId, depth + 1)
      }
    }

    traverse(tree.rootId, 0)

    const allPaths = getAllPaths(tree)
    const sorted = [...allPaths].sort((a, b) => b.expectedValue - a.expectedValue)

    return {
      totalNodes: tree.nodes.size,
      decisionNodes,
      chanceNodes,
      outcomeNodes,
      maxDepth,
      totalPaths: allPaths.length,
      bestPath: sorted[0] || null,
      worstPath: sorted[sorted.length - 1] || null,
      overallExpectedValue: Math.round(calculateExpectedValue(tree, tree.rootId) * 100) / 100,
    }
  }

  // ---- 灵敏度分析 ----

  /**
   * 概率灵敏度分析
   */
  function sensitivityAnalysis(
    tree: DecisionTree,
    nodeId: string,
    range: { min: number; max: number; step: number } = { min: 0, max: 1, step: 0.1 },
  ): SensitivityResult {
    const node = tree.nodes.get(nodeId)
    if (!node) {
      return {
        variable: nodeId,
        baseValue: 0,
        range,
        dataPoints: [],
        elasticity: 0,
      }
    }

    const baseValue = node.probability
    const dataPoints: { value: number; expectedValue: number }[] = []
    let breakEvenPoint: number | undefined

    for (let v = range.min; v <= range.max; v += range.step) {
      const roundedV = Math.round(v * 100) / 100
      node.probability = roundedV
      const ev = Math.round(calculateExpectedValue(tree, tree.rootId) * 100) / 100
      dataPoints.push({ value: roundedV, expectedValue: ev })

      // 检测盈亏平衡点（期望值符号变化）
      if (breakEvenPoint === undefined && dataPoints.length >= 2) {
        const prev = dataPoints[dataPoints.length - 2]
        if (prev.expectedValue <= 0 && ev > 0) {
          breakEvenPoint = roundedV
        } else if (prev.expectedValue >= 0 && ev < 0) {
          breakEvenPoint = roundedV
        }
      }
    }

    // 恢复原值
    node.probability = baseValue

    // 计算弹性
    const pctChange = dataPoints.length >= 2
      ? (dataPoints[dataPoints.length - 1].expectedValue - dataPoints[0].expectedValue) /
        Math.max(0.01, Math.abs(dataPoints[0].expectedValue))
      : 0
    const valChange = range.max - range.min
    const elasticity = valChange > 0
      ? Math.round(pctChange / valChange * 100) / 100
      : 0

    return {
      variable: node.label,
      baseValue,
      range,
      dataPoints,
      breakEvenPoint,
      elasticity,
    }
  }

  // ---- 决策分析报告 ----

  /**
   * 生成决策分析报告
   */
  function generateReport(tree: DecisionTree): DecisionAnalysisReport {
    const stats = getStats(tree)
    const risks: string[] = []
    const recommendations: string[] = []

    // 风险分析
    if (stats.totalNodes < 3) {
      risks.push('决策树节点较少，可能遗漏重要分支')
    }
    if (stats.maxDepth < 2) {
      risks.push('决策深度不足，建议展开更多层级')
    }

    // 检查概率和
    const root = tree.nodes.get(tree.rootId)
    if (root) {
      for (const childId of root.childrenIds) {
        const child = tree.nodes.get(childId)
        if (child && child.type === 'chance') {
          let probSum = 0
          for (const gcId of child.childrenIds) {
            const gc = tree.nodes.get(gcId)
            if (gc) probSum += gc.probability
          }
          if (Math.abs(probSum - 1) > 0.01 && child.childrenIds.length > 0) {
            risks.push(`节点「${child.label}」的子节点概率之和为 ${Math.round(probSum * 100)}%，不等于 100%`)
          }
        }
      }
    }

    // 推荐
    if (stats.bestPath) {
      if (stats.bestPath.expectedValue > 0) {
        recommendations.push(`推荐路径: ${stats.bestPath.label}（期望值: ${stats.bestPath.expectedValue}）`)
      }
    }

    if (stats.totalNodes < 5) {
      recommendations.push('建议扩展决策树，增加更多分支以覆盖不同场景')
    }

    const hasKnowledgeNodes = [...tree.nodes.values()].some(n => n.knowledgeNodeId)
    if (!hasKnowledgeNodes) {
      recommendations.push('建议将决策节点与经略阁中的知识节点关联，增强决策依据')
    }

    // 风险偏好调整建议
    if (config.riskTolerance < 0.3) {
      recommendations.push('当前风险偏好较低，建议关注保守路径')
    } else if (config.riskTolerance > 0.7) {
      recommendations.push('当前风险偏好较高，建议关注高回报路径同时评估风险')
    }

    return {
      treeName: tree.name,
      stats,
      recommendedPath: stats.bestPath,
      risks,
      recommendations,
      generatedAt: new Date().toISOString(),
    }
  }

  // ---- 节点查询 ----

  /**
   * 获取节点的子树
   */
  function getSubtree(tree: DecisionTree, nodeId: string): DecisionTreeNode[] {
    const result: DecisionTreeNode[] = []
    const node = tree.nodes.get(nodeId)
    if (!node) return result

    result.push(node)
    for (const childId of node.childrenIds) {
      result.push(...getSubtree(tree, childId))
    }
    return result
  }

  /**
   * 获取所有叶子节点
   */
  function getLeafNodes(tree: DecisionTree): DecisionTreeNode[] {
    return [...tree.nodes.values()].filter(n => n.childrenIds.length === 0)
  }

  /**
   * 获取节点的兄弟节点
   */
  function getSiblings(tree: DecisionTree, nodeId: string): DecisionTreeNode[] {
    const node = tree.nodes.get(nodeId)
    if (!node || !node.parentId) return []

    const parent = tree.nodes.get(node.parentId)
    if (!parent) return []

    return parent.childrenIds
      .filter(id => id !== nodeId)
      .map(id => tree.nodes.get(id)!)
      .filter(Boolean)
  }

  // ---- 从知识节点构建 ----

  /**
   * 基于知识节点生成初始决策树
   * 将 insight 作为决策点，rule 作为机会点，pitfall 作为风险提示
   */
  function buildFromKnowledge(
    name: string,
    nodes: KnowledgeNode[],
    description: string = '',
  ): DecisionTree {
    const tree = createTree(name, description)
    const root = tree.nodes.get(tree.rootId)!
    root.description = `基于 ${nodes.length} 个知识节点生成`

    const insights = nodes.filter(n => n.cat === 'insight')
    const rules = nodes.filter(n => n.cat === 'rule')
    const pitfalls = nodes.filter(n => n.cat === 'pitfall')
    const frames = nodes.filter(n => n.cat === 'frame')

    // 为每个框架创建决策分支
    if (frames.length > 0) {
      for (const frame of frames) {
        addChild(tree, tree.rootId, frame.title, 'decision', {
          description: frame.desc,
          knowledgeNodeId: frame.id,
          tags: frame.tags,
        })
      }
    }

    // 为每个洞察创建机会节点
    if (insights.length > 0) {
      const parentId = root.childrenIds.length > 0 ? root.childrenIds[0] : tree.rootId
      for (const insight of insights) {
        addChild(tree, parentId, insight.title, 'chance', {
          description: insight.desc,
          probability: 0.5,
          knowledgeNodeId: insight.id,
          tags: insight.tags,
        })
      }
    }

    // 为每个法则创建结果节点
    if (rules.length > 0 && insights.length > 0) {
      const firstInsightId = root.childrenIds.length > 0
        ? tree.nodes.get(root.childrenIds[0])?.childrenIds[0]
        : undefined
      if (firstInsightId) {
        for (const rule of rules) {
          addChild(tree, firstInsightId, rule.title, 'outcome', {
            description: rule.desc,
            value: 5,
            knowledgeNodeId: rule.id,
            tags: rule.tags,
          })
        }
      }
    }

    // 如果有误区，在根节点添加警告
    if (pitfalls.length > 0) {
      root.tags = pitfalls.map(p => p.title)
      root.description += `\n⚠️ 注意误区: ${pitfalls.map(p => p.title).join('、')}`
    }

    tree.updatedAt = new Date().toISOString()
    return tree
  }

  return {
    config,
    setConfig,
    createTree,
    addChild,
    addChildren,
    removeNode,
    updateNode,
    getAllPaths,
    getPathToNode,
    calculateExpectedValue,
    getStats,
    sensitivityAnalysis,
    generateReport,
    getSubtree,
    getLeafNodes,
    getSiblings,
    buildFromKnowledge,
    NODE_TYPE_META,
  }
}