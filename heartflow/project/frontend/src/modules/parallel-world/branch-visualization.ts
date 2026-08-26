// ============================================================
// 平行世界 · 分支可视化引擎 + 概率预测 + 知识迁移
// 蓝图：分支树渲染数据、概率预测、分支权重、知识迁移
// ============================================================

import { ref } from 'vue'
import type { WorldBranch } from './types'

// ---- 分支可视化节点 ----

export interface BranchVisualNode {
  id: string
  branchId: string
  label: string
  x: number
  y: number
  width: number
  height: number
  color: string
  depth: number
  parentId: string | null
  children: BranchVisualNode[]
  isActive: boolean
  weight: number
  strength: number
  metadata: {
    createdAt: string
    eventCount: number
    divergenceIndex: number
    probability: number
  }
}

export interface BranchVisualEdge {
  id: string
  source: string
  target: string
  strength: number
  color: string
  style: 'solid' | 'dashed' | 'dotted'
  label?: string
}

export interface BranchVisualTree {
  id: string
  rootNode: BranchVisualNode
  nodes: BranchVisualNode[]
  edges: BranchVisualEdge[]
  layout: 'radial' | 'tree' | 'timeline' | 'force'
  metadata: {
    totalBranches: number
    maxDepth: number
    activeBranchId: string
    createdAt: string
  }
}

// ---- 分支概率预测 ----

export interface BranchProbability {
  branchId: string
  label: string
  /** 维持概率（继续当前分支不变） */
  continuationProb: number
  /** 分叉概率（产生新分支） */
  divergenceProb: number
  /** 合并概率（与其他分支合并） */
  mergeProb: number
  /** 终止概率 */
  terminationProb: number
  /** 预测的未来状态 */
  predictedStates: PredictedState[]
  /** 影响因素 */
  factors: ProbabilityFactor[]
  /** 预测时间 */
  predictedAt: string
  /** 置信度 0-1 */
  confidence: number
}

export interface PredictedState {
  stateId: string
  label: string
  probability: number
  expectedTime: string
  description: string
  impact: 'positive' | 'neutral' | 'negative'
  impactScore: number
}

export interface ProbabilityFactor {
  factor: string
  weight: number
  direction: 'positive' | 'negative'
  description: string
}

// ---- 分支权重系统 ----

export interface BranchWeightConfig {
  branchId: string
  /** 用户设置权重 0-1 */
  userWeight: number
  /** 自动计算权重（基于活跃度） */
  autoWeight: number
  /** 综合权重 */
  compositeWeight: number
  /** 权重标签 */
  priority: 'critical' | 'high' | 'medium' | 'low' | 'archived'
  /** 关注度评分 */
  attentionScore: number
  /** 上次活跃时间 */
  lastActiveAt: string
  /** 权重更新历史 */
  weightHistory: WeightHistoryEntry[]
}

export interface WeightHistoryEntry {
  weight: number
  changedAt: string
  reason: string
}

// ---- 分支间知识迁移 ----

export interface KnowledgeTransfer {
  id: string
  /** 源分支 */
  sourceBranchId: string
  /** 目标分支 */
  targetBranchId: string
  /** 迁移的知识点 */
  knowledge: string
  /** 知识类型 */
  type: 'lesson' | 'skill' | 'insight' | 'pattern' | 'decision'
  /** 适用性评分 0-1 */
  applicabilityScore: number
  /** 迁移结果 */
  result: 'pending' | 'applied' | 'rejected' | 'adapted'
  /** 迁移后的反馈 */
  feedback?: string
  /** 迁移时间 */
  transferredAt: string
  /** 应用时间 */
  appliedAt?: string
}

// ============================================================
// useBranchVisualization
// ============================================================

export function useBranchVisualization() {
  const visualTrees = ref<BranchVisualTree[]>([])
  const currentLayout = ref<BranchVisualTree['layout']>('tree')

  /** 构建分支可视化树 */
  function buildVisualTree(
    branches: WorldBranch[],
    activeBranchId: string,
    layout: BranchVisualTree['layout'] = 'tree',
  ): BranchVisualTree {
    const branchMap = new Map<string, WorldBranch>()
    branches.forEach((b) => branchMap.set(b.id, b))

    // 找到根分支（没有父分支的）
    const rootBranches = branches.filter((b) => !b.parentBranchId)

    const nodes: BranchVisualNode[] = []
    const edges: BranchVisualEdge[] = []

    // 递归构建节点
    function buildNode(branch: WorldBranch, depth: number, parentId: string | null): BranchVisualNode {
      const divergenceIndex = computeDivergenceIndex(branch, branches)
      const probability = computeBranchProbability(branch, branches)

      const node: BranchVisualNode = {
        id: `vn-${branch.id}`,
        branchId: branch.id,
        label: branch.name,
        x: 0,
        y: 0,
        width: 120,
        height: 60,
        color: branch.color || getDepthColor(depth),
        depth,
        parentId,
        children: [],
        isActive: branch.id === activeBranchId,
        weight: branch.weight || 1,
        strength: computeBranchStrength(branch),
        metadata: {
          createdAt: branch.createdAt,
          eventCount: branch.events?.length || 0,
          divergenceIndex,
          probability,
        },
      }

      // 构建子节点
      const childBranches = branches.filter((b) => b.parentBranchId === branch.id)
      childBranches.forEach((child) => {
        const childNode = buildNode(child, depth + 1, node.id)
        node.children.push(childNode)
        nodes.push(childNode)

        edges.push({
          id: `edge-${node.id}-${childNode.id}`,
          source: node.id,
          target: childNode.id,
          strength: child.weight || 0.5,
          color: child.color || '#6b9fc4',
          style: child.isActive ? 'solid' : 'dashed',
        })
      })

      return node
    }

    rootBranches.forEach((root) => {
      const rootNode = buildNode(root, 0, null)
      nodes.push(rootNode)
    })

    // 应用布局
    applyLayout(nodes, edges, layout)

    // 找到根节点
    const rootNode = nodes.find((n) => n.depth === 0) || nodes[0]

    const tree: BranchVisualTree = {
      id: `vt-${Date.now()}`,
      rootNode: rootNode || {
        id: 'empty',
        branchId: '',
        label: '空',
        x: 0,
        y: 0,
        width: 120,
        height: 60,
        color: '#666',
        depth: 0,
        parentId: null,
        children: [],
        isActive: false,
        weight: 0,
        strength: 0,
        metadata: { createdAt: '', eventCount: 0, divergenceIndex: 0, probability: 0 },
      },
      nodes,
      edges,
      layout,
      metadata: {
        totalBranches: branches.length,
        maxDepth: Math.max(...nodes.map((n) => n.depth), 0),
        activeBranchId,
        createdAt: new Date().toISOString(),
      },
    }

    visualTrees.value.push(tree)
    currentLayout.value = layout
    return tree
  }

  /** 获取最近的可视化树 */
  function getLatestTree(): BranchVisualTree | undefined {
    return visualTrees.value[visualTrees.value.length - 1]
  }

  /** 清除可视化缓存 */
  function clearVisualTrees(): void {
    visualTrees.value = []
  }

  return {
    visualTrees,
    currentLayout,
    buildVisualTree,
    getLatestTree,
    clearVisualTrees,
  }
}

// ---- 辅助函数 ----

function computeDivergenceIndex(branch: WorldBranch, allBranches: WorldBranch[]): number {
  const children = allBranches.filter((b) => b.parentBranchId === branch.id)
  if (children.length === 0) return 0

  // 计算子分支之间的差异度
  let totalDiff = 0
  let pairCount = 0
  for (let i = 0; i < children.length; i++) {
    for (let j = i + 1; j < children.length; j++) {
      totalDiff += computeBranchSimilarity(children[i], children[j])
      pairCount++
    }
  }

  return pairCount > 0 ? 1 - totalDiff / pairCount : 0
}

function computeBranchSimilarity(a: WorldBranch, b: WorldBranch): number {
  let score = 0
  let dimensions = 0

  // 标签相似度
  const aTags = new Set(a.tags || [])
  const bTags = new Set(b.tags || [])
  if (aTags.size > 0 || bTags.size > 0) {
    const intersection = new Set([...aTags].filter((t) => bTags.has(t)))
    const union = new Set([...aTags, ...bTags])
    score += union.size > 0 ? intersection.size / union.size : 0
    dimensions++
  }

  // 事件数量相似度
  const aEvents = a.events?.length || 0
  const bEvents = b.events?.length || 0
  if (aEvents > 0 || bEvents > 0) {
    score += 1 - Math.abs(aEvents - bEvents) / Math.max(aEvents, bEvents, 1)
    dimensions++
  }

  return dimensions > 0 ? score / dimensions : 0.5
}

function computeBranchProbability(branch: WorldBranch, allBranches: WorldBranch[]): number {
  const children = allBranches.filter((b) => b.parentBranchId === branch.id)
  const eventCount = branch.events?.length || 0

  // 基于活跃度和分叉数量计算概率权重
  let prob = 0.5
  if (eventCount > 0) prob += Math.min(eventCount / 50, 0.2)
  if (children.length > 0) prob += 0.1
  if (branch.isActive) prob += 0.1

  return Math.min(prob, 0.95)
}

function computeBranchStrength(branch: WorldBranch): number {
  let strength = 0.5
  const eventCount = branch.events?.length || 0
  strength += Math.min(eventCount * 0.02, 0.3)
  if (branch.isActive) strength += 0.1
  if (branch.weight) strength += branch.weight * 0.1
  return Math.min(strength, 1)
}

function getDepthColor(depth: number): string {
  const colors = [
    '#6b9fc4', '#f59e6c', '#8a9a7a', '#d98c7a',
    '#b5707a', '#f0c040', '#6b9fc4', '#d98c7a',
  ]
  return colors[depth % colors.length]
}

// ---- 布局算法 ----

function applyLayout(
  nodes: BranchVisualNode[],
  _edges: BranchVisualEdge[],
  layout: BranchVisualTree['layout'],
): void {
  switch (layout) {
    case 'tree':
      applyTreeLayout(nodes)
      break
    case 'radial':
      applyRadialLayout(nodes)
      break
    case 'timeline':
      applyTimelineLayout(nodes)
      break
    case 'force':
      applyForceLayout(nodes)
      break
  }
}

function applyTreeLayout(nodes: BranchVisualNode[]): void {
  const levelGroups = new Map<number, BranchVisualNode[]>()
  nodes.forEach((n) => {
    const group = levelGroups.get(n.depth) || []
    group.push(n)
    levelGroups.set(n.depth, group)
  })

  const xSpacing = 200
  const ySpacing = 100

  levelGroups.forEach((levelNodes, depth) => {
    const totalWidth = (levelNodes.length - 1) * xSpacing
    levelNodes.forEach((node, idx) => {
      node.x = idx * xSpacing - totalWidth / 2
      node.y = depth * ySpacing
    })
  })
}

function applyRadialLayout(nodes: BranchVisualNode[]): void {
  const centerX = 400
  const centerY = 300
  const radiusPerDepth = 120

  nodes.forEach((node) => {
    const siblings = nodes.filter((n) => n.parentId === node.parentId)
    const idx = siblings.indexOf(node)
    const angle = siblings.length > 1
      ? (idx / siblings.length) * 2 * Math.PI - Math.PI / 2
      : 0

    node.x = centerX + Math.cos(angle) * (node.depth + 1) * radiusPerDepth
    node.y = centerY + Math.sin(angle) * (node.depth + 1) * radiusPerDepth
  })
}

function applyTimelineLayout(nodes: BranchVisualNode[]): void {
  const ySpacing = 80
  nodes.sort((a, b) => new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime())

  nodes.forEach((node, idx) => {
    node.x = 100 + node.depth * 180
    node.y = idx * ySpacing + 50
  })
}

function applyForceLayout(nodes: BranchVisualNode[]): void {
  // 简单的力导向布局
  const centerX = 400
  const centerY = 300

  nodes.forEach((node, idx) => {
    const angle = (idx / nodes.length) * 2 * Math.PI
    const radius = 100 + node.depth * 80 + Math.random() * 40
    node.x = centerX + Math.cos(angle) * radius
    node.y = centerY + Math.sin(angle) * radius
  })
}

// ============================================================
// useBranchProbability
// ============================================================

export function useBranchProbability() {
  const probabilities = ref<BranchProbability[]>([])

  /** 预测分支概率 */
  function predictBranch(
    branch: WorldBranch,
    allBranches: WorldBranch[],
  ): BranchProbability {
    const eventCount = branch.events?.length || 0
    const children = allBranches.filter((b) => b.parentBranchId === branch.id)
    const age = Date.now() - new Date(branch.createdAt).getTime()
    const ageDays = age / (1000 * 60 * 60 * 24)

    // 基于历史数据计算概率
    const continuationProb = Math.max(0.3, 0.7 - ageDays * 0.01 - children.length * 0.05)
    const divergenceProb = Math.min(0.3, 0.1 + eventCount * 0.02)
    const mergeProb = children.length > 0 ? 0.1 : 0.05
    const terminationProb = Math.max(0.05, 1 - continuationProb - divergenceProb - mergeProb)

    const predictedStates: PredictedState[] = [
      {
        stateId: 'continue',
        label: '保持当前方向',
        probability: continuationProb,
        expectedTime: new Date(Date.now() + 7 * 86400000).toISOString(),
        description: '分支将沿当前方向继续发展',
        impact: 'positive',
        impactScore: 0.3,
      },
      {
        stateId: 'diverge',
        label: '产生新分支',
        probability: divergenceProb,
        expectedTime: new Date(Date.now() + 14 * 86400000).toISOString(),
        description: '可能产生新的平行分支',
        impact: 'neutral',
        impactScore: 0,
      },
    ]

    // 如果有其他分支，添加合并预测
    const otherBranches = allBranches.filter((b) => b.id !== branch.id)
    if (otherBranches.length > 0) {
      const mostSimilar = otherBranches.reduce((best, curr) => {
        const sim = computeBranchSimilarity(branch, curr)
        return sim > (best ? computeBranchSimilarity(branch, best) : 0) ? curr : best
      }, otherBranches[0])

      predictedStates.push({
        stateId: 'merge',
        label: `可能与「${mostSimilar.name}」合并`,
        probability: mergeProb,
        expectedTime: new Date(Date.now() + 30 * 86400000).toISOString(),
        description: '两个分支可能融合',
        impact: 'positive',
        impactScore: 0.5,
      })
    }

    const factors: ProbabilityFactor[] = [
      { factor: '活跃度', weight: 0.3, direction: eventCount > 10 ? 'positive' : 'negative', description: `当前有 ${eventCount} 个事件` },
      { factor: '分支年龄', weight: 0.25, direction: ageDays < 30 ? 'positive' : 'negative', description: `已存在 ${Math.floor(ageDays)} 天` },
      { factor: '子分支数', weight: 0.2, direction: children.length > 0 ? 'positive' : 'negative', description: `${children.length} 个子分支` },
      { factor: '活跃状态', weight: 0.15, direction: branch.isActive ? 'positive' : 'negative', description: branch.isActive ? '当前活跃' : '已归档' },
      { factor: '分支权重', weight: 0.1, direction: (branch.weight || 0.5) > 0.5 ? 'positive' : 'negative', description: `权重 ${(branch.weight || 0.5).toFixed(2)}` },
    ]

    const prediction: BranchProbability = {
      branchId: branch.id,
      label: branch.name,
      continuationProb,
      divergenceProb,
      mergeProb,
      terminationProb,
      predictedStates,
      factors,
      predictedAt: new Date().toISOString(),
      confidence: 0.6 + Math.min(eventCount * 0.02, 0.3),
    }

    probabilities.value.push(prediction)
    return prediction
  }

  /** 获取分支的最新预测 */
  function getPrediction(branchId: string): BranchProbability | undefined {
    return probabilities.value.find((p) => p.branchId === branchId)
  }

  /** 清除预测缓存 */
  function clearPredictions(): void {
    probabilities.value = []
  }

  return {
    probabilities,
    predictBranch,
    getPrediction,
    clearPredictions,
  }
}

// ============================================================
// useBranchWeights
// ============================================================

export function useBranchWeights() {
  const weightConfigs = ref<BranchWeightConfig[]>([])

  /** 设置分支权重 */
  function setWeight(
    branchId: string,
    userWeight: number,
    priority: BranchWeightConfig['priority'] = 'medium',
    reason: string = '手动调整',
  ): BranchWeightConfig {
    const existing = weightConfigs.value.find((c) => c.branchId === branchId)

    const autoWeight = computeAutoWeight(branchId)
    const compositeWeight = userWeight * 0.6 + autoWeight * 0.4

    const config: BranchWeightConfig = {
      branchId,
      userWeight,
      autoWeight,
      compositeWeight,
      priority,
      attentionScore: compositeWeight * (priority === 'critical' ? 1.5 : priority === 'high' ? 1.2 : 1),
      lastActiveAt: new Date().toISOString(),
      weightHistory: [
        ...(existing?.weightHistory || []),
        { weight: compositeWeight, changedAt: new Date().toISOString(), reason },
      ],
    }

    if (existing) {
      const idx = weightConfigs.value.indexOf(existing)
      weightConfigs.value[idx] = config
    } else {
      weightConfigs.value.push(config)
    }

    return config
  }

  /** 获取分支权重 */
  function getWeight(branchId: string): BranchWeightConfig | undefined {
    return weightConfigs.value.find((c) => c.branchId === branchId)
  }

  /** 按优先级排序 */
  function getSortedByPriority(): BranchWeightConfig[] {
    const priorityOrder: Record<string, number> = {
      critical: 0, high: 1, medium: 2, low: 3, archived: 4,
    }
    return [...weightConfigs.value].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    )
  }

  /** 获取需要关注的权重配置 */
  function getAttentionNeeded(): BranchWeightConfig[] {
    return weightConfigs.value.filter(
      (c) => c.priority === 'critical' || c.priority === 'high',
    )
  }

  return {
    weightConfigs,
    setWeight,
    getWeight,
    getSortedByPriority,
    getAttentionNeeded,
  }
}

function computeAutoWeight(_branchId: string): number {
  // 基于分支活跃度的自动权重计算
  // 实际实现中会查询分支的事件数量和最近活跃时间
  return 0.5
}

// ============================================================
// useKnowledgeTransfer
// ============================================================

export function useKnowledgeTransfer() {
  const transfers = ref<KnowledgeTransfer[]>([])

  /** 创建知识迁移 */
  function createTransfer(
    sourceBranchId: string,
    targetBranchId: string,
    knowledge: string,
    type: KnowledgeTransfer['type'],
  ): KnowledgeTransfer {
    const transfer: KnowledgeTransfer = {
      id: `kt-${Date.now()}`,
      sourceBranchId,
      targetBranchId,
      knowledge,
      type,
      applicabilityScore: computeApplicability(sourceBranchId, targetBranchId, type),
      result: 'pending',
      transferredAt: new Date().toISOString(),
    }

    transfers.value.push(transfer)
    return transfer
  }

  /** 应用知识迁移 */
  function applyTransfer(transferId: string, feedback?: string): KnowledgeTransfer | undefined {
    const transfer = transfers.value.find((t) => t.id === transferId)
    if (!transfer) return undefined

    transfer.result = 'applied'
    transfer.appliedAt = new Date().toISOString()
    transfer.feedback = feedback
    return transfer
  }

  /** 拒绝知识迁移 */
  function rejectTransfer(transferId: string, feedback?: string): KnowledgeTransfer | undefined {
    const transfer = transfers.value.find((t) => t.id === transferId)
    if (!transfer) return undefined

    transfer.result = 'rejected'
    transfer.feedback = feedback
    return transfer
  }

  /** 自适应迁移（修改后应用） */
  function adaptTransfer(transferId: string, adaptedKnowledge: string): KnowledgeTransfer | undefined {
    const transfer = transfers.value.find((t) => t.id === transferId)
    if (!transfer) return undefined

    transfer.knowledge = adaptedKnowledge
    transfer.result = 'adapted'
    transfer.appliedAt = new Date().toISOString()
    return transfer
  }

  /** 获取从某个分支迁移的知识 */
  function getTransfersFrom(sourceBranchId: string): KnowledgeTransfer[] {
    return transfers.value.filter((t) => t.sourceBranchId === sourceBranchId)
  }

  /** 获取迁移到某个分支的知识 */
  function getTransfersTo(targetBranchId: string): KnowledgeTransfer[] {
    return transfers.value.filter((t) => t.targetBranchId === targetBranchId)
  }

  /** 获取成功应用的知识迁移 */
  function getSuccessfulTransfers(): KnowledgeTransfer[] {
    return transfers.value.filter((t) => t.result === 'applied' || t.result === 'adapted')
  }

  /** 计算迁移成功率 */
  function getTransferSuccessRate(): number {
    const total = transfers.value.length
    if (total === 0) return 0
    const success = transfers.value.filter((t) => t.result === 'applied' || t.result === 'adapted').length
    return success / total
  }

  return {
    transfers,
    createTransfer,
    applyTransfer,
    rejectTransfer,
    adaptTransfer,
    getTransfersFrom,
    getTransfersTo,
    getSuccessfulTransfers,
    getTransferSuccessRate,
  }
}

function computeApplicability(
  _sourceBranchId: string,
  _targetBranchId: string,
  type: KnowledgeTransfer['type'],
): number {
  // 基于分支相似度和知识类型计算适用性
  const baseScore = 0.5
  const typeBonus: Record<string, number> = {
    lesson: 0.15,
    pattern: 0.2,
    insight: 0.1,
    skill: 0.05,
    decision: 0.1,
  }
  return Math.min(baseScore + (typeBonus[type] || 0) + Math.random() * 0.1, 0.95)
}