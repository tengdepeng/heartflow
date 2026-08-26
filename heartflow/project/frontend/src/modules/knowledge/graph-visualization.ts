// ============================================================
// 经略阁 · 图谱可视化 + 间隔复习 + 版本管理
// 蓝图：图谱可视化、间隔复习、版本管理
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { KnowledgeNode, KnowledgeRelation, RelationType } from './types'
import { CATEGORY_PALETTE } from '../../theme/categoryColors'

// ---- 图谱可视化 ----

export interface GraphNode {
  id: string
  label: string
  /** 知识节点引用 */
  knowledgeId: string
  /** 布局坐标 */
  x: number
  y: number
  /** 节点大小 */
  radius: number
  /** 颜色 */
  color: string
  /** 分类 */
  category: string
  /** 标签 */
  tags: string[]
  /** 重要度 0-1 */
  importance: number
  /** 连接数 */
  degree: number
  /** 是否选中 */
  selected: boolean
  /** 是否高亮 */
  highlighted: boolean
  /** 是否固定 */
  pinned: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  /** 关系类型 */
  relationType: RelationType
  /** 关系标签 */
  label: string
  /** 关系强度 0-1 */
  strength: number
  /** 颜色 */
  color: string
  /** 是否高亮 */
  highlighted: boolean
}

export interface GraphLayout {
  type: 'force' | 'radial' | 'hierarchical' | 'grid' | 'circular'
  /** 节点列表 */
  nodes: GraphNode[]
  /** 边列表 */
  edges: GraphEdge[]
  /** 布局参数 */
  params: LayoutParams
  /** 生成时间 */
  generatedAt: string
}

export interface LayoutParams {
  width: number
  height: number
  /** 节点间距 */
  spacing: number
  /** 中心引力 */
  gravity: number
  /** 排斥力 */
  repulsion: number
  /** 边弹簧力 */
  springLength: number
  /** 迭代次数 */
  iterations: number
}

export interface GraphFilter {
  /** 按分类筛选 */
  categories?: string[]
  /** 按标签筛选 */
  tags?: string[]
  /** 按重要度筛选 */
  minImportance?: number
  /** 搜索关键词 */
  searchQuery?: string
  /** 最大节点数 */
  maxNodes?: number
}

export interface GraphStats {
  nodeCount: number
  edgeCount: number
  density: number // 图密度
  averageDegree: number
  maxDegree: number
  categoryDistribution: Record<string, number>
  isolatedNodes: number
  largestComponentSize: number
}

// ---- 间隔复习 ----

export interface ReviewItem {
  nodeId: string
  title: string
  category: string
  /** 复习次数 */
  reviewCount: number
  /** 上次复习时间 */
  lastReviewedAt: string | null
  /** 下次复习时间 */
  nextReviewAt: string
  /** 是否到期 */
  due: boolean
  /** 熟练度 0-1 */
  mastery: number
  /** 难度 0-1 */
  difficulty: number
}

export interface ReviewPlan {
  id: string
  items: ReviewItem[]
  date: string
  completed: boolean
  completedAt?: string
  correctCount: number
  incorrectCount: number
  totalCount: number
}

export interface ReviewStats {
  totalReviews: number
  todayDue: number
  thisWeekDue: number
  averageMastery: number
  streak: number
  lastReviewDate: string | null
  masteryDistribution: {
    low: number // 0-0.3
    medium: number // 0.3-0.7
    high: number // 0.7-1
  }
}

// ---- 版本管理 ----

export interface KnowledgeVersion {
  id: string
  nodeId: string
  version: number
  title: string
  desc: string
  tags: string[]
  category: string
  /** 变更说明 */
  changeDescription: string
  /** 变更时间 */
  changedAt: string
  /** 变更类型 */
  changeType: 'create' | 'update' | 'major_update' | 'merge' | 'split'
  /** 关联的旧版本 ID */
  previousVersionId?: string
}

export interface VersionDiff {
  nodeId: string
  fromVersion: number
  toVersion: number
  titleChanged: boolean
  descChanged: boolean
  tagsChanged: boolean
  categoryChanged: boolean
  /** 差异摘要 */
  summary: string
}

// ---- 存储键 ----

const GRAPH_KEYS = {
  VERSIONS: 'hf:knowledge:versions',
  REVIEW_PLANS: 'hf:knowledge:review_plans',
} as const

// ---- 艾宾浩斯间隔 ----

const SPACED_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120]

// ---- 分类颜色 ----

const CATEGORY_COLORS: Record<string, string> = {
  concept: CATEGORY_PALETTE[12],
  rule: CATEGORY_PALETTE[11],
  frame: CATEGORY_PALETTE[8],
  insight: CATEGORY_PALETTE[10],
  pitfall: CATEGORY_PALETTE[14],
  metaphor: CATEGORY_PALETTE[5],
}

// ============================================================
// useGraphVisualization
// ============================================================

export function useGraphVisualization() {
  const currentLayout = ref<GraphLayout | null>(null)
  const graphFilter = ref<GraphFilter>({})
  const graphStats = ref<GraphStats | null>(null)

  /** 构建图谱节点和边 */
  function buildGraph(
    nodes: KnowledgeNode[],
    relations: KnowledgeRelation[],
    layoutType: GraphLayout['type'] = 'force',
    params?: Partial<LayoutParams>,
    filter?: GraphFilter,
  ): GraphLayout {
    // 过滤节点
    let filteredNodes = applyFilter(nodes, filter)

    // 限制节点数
    if (filter?.maxNodes && filteredNodes.length > filter.maxNodes) {
      // 按重要度排序取前 N 个
      filteredNodes = filteredNodes
        .map(n => ({ node: n, importance: computeNodeImportance(n, relations) }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, filter.maxNodes)
        .map(item => item.node)
    }

    const nodeIdSet = new Set(filteredNodes.map(n => n.id))

    // 过滤边（只保留两端节点都在过滤结果中的边）
    const filteredRelations = relations.filter(
      r => nodeIdSet.has(r.sourceId) && nodeIdSet.has(r.targetId),
    )

    const defaultParams: LayoutParams = {
      width: 800,
      height: 600,
      spacing: 100,
      gravity: 0.1,
      repulsion: 5000,
      springLength: 150,
      iterations: 100,
    }

    const mergedParams = { ...defaultParams, ...params }

    // 构建 GraphNode
    const graphNodes: GraphNode[] = filteredNodes.map(n => {
      const degree = filteredRelations.filter(
        r => r.sourceId === n.id || r.targetId === n.id,
      ).length

      const importance = computeNodeImportance(n, relations)

      return {
        id: `gn-${n.id}`,
        label: n.title,
        knowledgeId: n.id,
        x: 0,
        y: 0,
        radius: 10 + Math.min(degree * 3, 30),
        color: CATEGORY_COLORS[n.cat] || '#d4a574',
        category: n.cat,
        tags: n.tags,
        importance,
        degree,
        selected: false,
        highlighted: false,
        pinned: false,
      }
    })

    // 构建 GraphEdge
    const graphEdges: GraphEdge[] = filteredRelations.map(r => ({
      id: `ge-${r.id}`,
      source: `gn-${r.sourceId}`,
      target: `gn-${r.targetId}`,
      relationType: r.type,
      label: r.label,
      strength: 0.5,
      color: getRelationColor(r.type),
      highlighted: false,
    }))

    // 应用布局算法
    applyLayout(graphNodes, graphEdges, layoutType, mergedParams)

    const layout: GraphLayout = {
      type: layoutType,
      nodes: graphNodes,
      edges: graphEdges,
      params: mergedParams,
      generatedAt: new Date().toISOString(),
    }

    currentLayout.value = layout
    graphStats.value = computeGraphStats(graphNodes, graphEdges)

    return layout
  }

  /** 获取节点 */
  function getNode(nodeId: string): GraphNode | undefined {
    return currentLayout.value?.nodes.find(n => n.id === nodeId)
  }

  /** 高亮节点及其邻居 */
  function highlightNode(nodeId: string): void {
    if (!currentLayout.value) return

    const node = currentLayout.value.nodes.find(n => n.id === nodeId)
    if (!node) return

    // 找邻居节点 ID
    const neighborIds = new Set<string>()
    currentLayout.value.edges.forEach(e => {
      if (e.source === nodeId) neighborIds.add(e.target)
      if (e.target === nodeId) neighborIds.add(e.source)
    })

    // 应用高亮
    currentLayout.value.nodes.forEach(n => {
      n.highlighted = n.id === nodeId || neighborIds.has(n.id)
    })
    currentLayout.value.edges.forEach(e => {
      e.highlighted = e.source === nodeId || e.target === nodeId
    })
  }

  /** 清除高亮 */
  function clearHighlight(): void {
    if (!currentLayout.value) return
    currentLayout.value.nodes.forEach(n => { n.highlighted = false })
    currentLayout.value.edges.forEach(e => { e.highlighted = false })
  }

  /** 搜索节点 */
  function searchNodes(query: string): GraphNode[] {
    if (!currentLayout.value || !query.trim()) return []
    const q = query.toLowerCase()
    return currentLayout.value.nodes.filter(
      n =>
        n.label.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        n.category.toLowerCase().includes(q),
    )
  }

  /** 更新过滤器 */
  function updateFilter(filter: Partial<GraphFilter>): void {
    graphFilter.value = { ...graphFilter.value, ...filter }
  }

  return {
    currentLayout,
    graphFilter,
    graphStats,
    buildGraph,
    getNode,
    highlightNode,
    clearHighlight,
    searchNodes,
    updateFilter,
  }
}

// ============================================================
// useSpacedReview
// ============================================================

export function useSpacedReview() {
  const reviewPlans = ref<ReviewPlan[]>([])
  const reviewStats = ref<ReviewStats>({
    totalReviews: 0,
    todayDue: 0,
    thisWeekDue: 0,
    averageMastery: 0,
    streak: 0,
    lastReviewDate: null,
    masteryDistribution: { low: 0, medium: 0, high: 0 },
  })

  function loadPlans(): void {
    reviewPlans.value = storage.getKV<ReviewPlan[]>(GRAPH_KEYS.REVIEW_PLANS, []) || []
  }

  function savePlans(): void {
    storage.setKV(GRAPH_KEYS.REVIEW_PLANS, reviewPlans.value)
  }

  /** 生成复习计划 */
  function generateReviewPlan(
    nodes: KnowledgeNode[],
    today: Date = new Date(),
  ): ReviewPlan {
    const todayStr = today.toISOString().split('T')[0]
    const items: ReviewItem[] = nodes.map(node => {
      const reviewCount = 0 // 从知识节点中没有 reviewCount，默认 0
      const lastReviewedAt = null // 同上
      const interval = SPACED_INTERVALS[Math.min(reviewCount, SPACED_INTERVALS.length - 1)]
      const nextReviewAt = new Date(today.getTime() + interval * 86400000).toISOString().split('T')[0]
      const due = true // 新节点总是到期

      // 基于标签和连接数估算难度
      const difficulty = Math.min(node.tags.length * 0.1 + 0.3, 0.9)

      return {
        nodeId: node.id,
        title: node.title,
        category: node.cat,
        reviewCount,
        lastReviewedAt,
        nextReviewAt,
        due,
        mastery: 0,
        difficulty: Math.round(difficulty * 100) / 100,
      }
    })

    // 按难度和分类排序
    items.sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1
      return b.difficulty - a.difficulty
    })

    const plan: ReviewPlan = {
      id: `review-plan-${todayStr}`,
      items,
      date: todayStr,
      completed: false,
      correctCount: 0,
      incorrectCount: 0,
      totalCount: items.length,
    }

    // 避免重复
    const existingIdx = reviewPlans.value.findIndex(p => p.id === plan.id)
    if (existingIdx >= 0) {
      reviewPlans.value[existingIdx] = plan
    } else {
      reviewPlans.value.push(plan)
    }
    savePlans()

    return plan
  }

  /** 获取今日复习计划 */
  function getTodayPlan(): ReviewPlan | undefined {
    const today = new Date().toISOString().split('T')[0]
    return reviewPlans.value.find(p => p.date === today)
  }

  /** 记录复习结果 */
  function recordReview(
    planId: string,
    nodeId: string,
    correct: boolean,
  ): void {
    const plan = reviewPlans.value.find(p => p.id === planId)
    if (!plan) return

    const item = plan.items.find(i => i.nodeId === nodeId)
    if (!item) return

    if (correct) {
      plan.correctCount++
      item.mastery = Math.min(item.mastery + 0.15, 1)
      item.reviewCount++
      item.lastReviewedAt = new Date().toISOString()

      // 更新下次复习时间
      const interval = SPACED_INTERVALS[Math.min(item.reviewCount, SPACED_INTERVALS.length - 1)]
      item.nextReviewAt = new Date(Date.now() + interval * 86400000).toISOString().split('T')[0]
      item.due = false
    } else {
      plan.incorrectCount++
      item.mastery = Math.max(item.mastery - 0.05, 0)
      // 错误时缩短间隔
      item.nextReviewAt = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      item.due = true
    }

    // 检查是否完成
    if (plan.correctCount + plan.incorrectCount >= plan.totalCount) {
      plan.completed = true
      plan.completedAt = new Date().toISOString()
    }

    savePlans()
  }

  /** 计算复习统计 */
  function computeReviewStats(): ReviewStats {
    const today = new Date().toISOString().split('T')[0]
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    let todayDue = 0
    let thisWeekDue = 0
    let totalMastery = 0
    let masteryCount = 0

    const allItems = reviewPlans.value.flatMap(p => p.items)
    const uniqueItems = new Map<string, ReviewItem>()
    allItems.forEach(item => {
      const existing = uniqueItems.get(item.nodeId)
      if (!existing || existing.reviewCount < item.reviewCount) {
        uniqueItems.set(item.nodeId, item)
      }
    })

    uniqueItems.forEach(item => {
      if (item.nextReviewAt <= today) todayDue++
      if (item.nextReviewAt <= weekEnd) thisWeekDue++
      totalMastery += item.mastery
      masteryCount++
    })

    const averageMastery = masteryCount > 0
      ? Math.round((totalMastery / masteryCount) * 100) / 100
      : 0

    // 连续天数
    const reviewDates = new Set(
      reviewPlans.value
        .filter(p => p.completed)
        .map(p => p.date),
    )
    let streak = 0
    const checkDate = new Date()
    while (reviewDates.has(checkDate.toISOString().split('T')[0])) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    const sortedDates = [...reviewDates].sort().reverse()
    const lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : null

    // 熟练度分布
    let low = 0
    let medium = 0
    let high = 0
    uniqueItems.forEach(item => {
      if (item.mastery < 0.3) low++
      else if (item.mastery < 0.7) medium++
      else high++
    })

    const stats: ReviewStats = {
      totalReviews: reviewPlans.value.length,
      todayDue,
      thisWeekDue,
      averageMastery,
      streak,
      lastReviewDate,
      masteryDistribution: { low, medium, high },
    }

    reviewStats.value = stats
    return stats
  }

  return {
    reviewPlans,
    reviewStats,
    loadPlans,
    generateReviewPlan,
    getTodayPlan,
    recordReview,
    computeReviewStats,
  }
}

// ============================================================
// useVersionManager
// ============================================================

export function useVersionManager() {
  const versions = ref<KnowledgeVersion[]>([])

  function loadVersions(): void {
    versions.value = storage.getKV<KnowledgeVersion[]>(GRAPH_KEYS.VERSIONS, []) || []
  }

  function saveVersions(): void {
    storage.setKV(GRAPH_KEYS.VERSIONS, versions.value)
  }

  /** 创建版本快照 */
  function createVersion(
    node: KnowledgeNode,
    changeType: KnowledgeVersion['changeType'] = 'update',
    changeDescription: string = '更新节点',
  ): KnowledgeVersion {
    const existingVersions = versions.value
      .filter(v => v.nodeId === node.id)
      .sort((a, b) => b.version - a.version)

    const previousVersionId = existingVersions.length > 0
      ? existingVersions[0].id
      : undefined

    const version: KnowledgeVersion = {
      id: `version-${node.id}-${Date.now()}`,
      nodeId: node.id,
      version: (existingVersions[0]?.version || 0) + 1,
      title: node.title,
      desc: node.desc,
      tags: [...node.tags],
      category: node.cat,
      changeDescription,
      changedAt: new Date().toISOString(),
      changeType,
      previousVersionId,
    }

    versions.value.push(version)
    saveVersions()
    return version
  }

  /** 获取节点所有版本 */
  function getVersions(nodeId: string): KnowledgeVersion[] {
    return versions.value
      .filter(v => v.nodeId === nodeId)
      .sort((a, b) => b.version - a.version)
  }

  /** 获取最新版本 */
  function getLatestVersion(nodeId: string): KnowledgeVersion | undefined {
    const nodeVersions = getVersions(nodeId)
    return nodeVersions[0]
  }

  /** 回滚到指定版本 */
  function rollbackToVersion(
    versionId: string,
    currentNode: KnowledgeNode,
  ): { version: KnowledgeVersion; restoredNode: Partial<KnowledgeNode> } | null {
    const version = versions.value.find(v => v.id === versionId)
    if (!version || version.nodeId !== currentNode.id) return null

    const restoredNode: Partial<KnowledgeNode> = {
      title: version.title,
      desc: version.desc,
      tags: [...version.tags],
      // cat 不能随意修改，需要保持类型一致
    }

    // 创建回滚记录
    createVersion(currentNode, 'major_update', `回滚到版本 ${version.version}`)

    return { version, restoredNode }
  }

  /** 比较两个版本 */
  function compareVersions(
    versionIdA: string,
    versionIdB: string,
  ): VersionDiff | null {
    const versionA = versions.value.find(v => v.id === versionIdA)
    const versionB = versions.value.find(v => v.id === versionIdB)

    if (!versionA || !versionB || versionA.nodeId !== versionB.nodeId) return null

    const changes: string[] = []

    if (versionA.title !== versionB.title) changes.push('标题')
    if (versionA.desc !== versionB.desc) changes.push('描述')
    if (versionA.category !== versionB.category) changes.push('分类')
    if (JSON.stringify(versionA.tags.sort()) !== JSON.stringify(versionB.tags.sort())) {
      changes.push('标签')
    }

    const summary = changes.length > 0
      ? `变更了: ${changes.join('、')}`
      : '无实质性变更'

    return {
      nodeId: versionA.nodeId,
      fromVersion: Math.min(versionA.version, versionB.version),
      toVersion: Math.max(versionA.version, versionB.version),
      titleChanged: versionA.title !== versionB.title,
      descChanged: versionA.desc !== versionB.desc,
      tagsChanged: JSON.stringify(versionA.tags.sort()) !== JSON.stringify(versionB.tags.sort()),
      categoryChanged: versionA.category !== versionB.category,
      summary,
    }
  }

  /** 获取版本统计 */
  function getVersionStats(): { totalVersions: number; nodesWithVersions: number; averageVersionsPerNode: number } {
    const nodeIds = new Set(versions.value.map(v => v.nodeId))
    const totalVersions = versions.value.length
    const nodesWithVersions = nodeIds.size

    return {
      totalVersions,
      nodesWithVersions,
      averageVersionsPerNode: nodesWithVersions > 0
        ? Math.round((totalVersions / nodesWithVersions) * 100) / 100
        : 0,
    }
  }

  return {
    versions,
    loadVersions,
    createVersion,
    getVersions,
    getLatestVersion,
    rollbackToVersion,
    compareVersions,
    getVersionStats,
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 计算节点重要度 */
function computeNodeImportance(
  node: KnowledgeNode,
  relations: KnowledgeRelation[],
): number {
  const degree = relations.filter(
    r => r.sourceId === node.id || r.targetId === node.id,
  ).length

  // 基于连接数和标签数计算
  const tagScore = Math.min(node.tags.length * 0.05, 0.3)
  const degreeScore = Math.min(degree * 0.1, 0.5)
  const recencyScore = 0.2 // 基于最近更新时间

  return Math.round(Math.min(tagScore + degreeScore + recencyScore, 1) * 100) / 100
}

/** 应用过滤器 */
function applyFilter(
  nodes: KnowledgeNode[],
  filter?: GraphFilter,
): KnowledgeNode[] {
  if (!filter) return nodes

  let result = [...nodes]

  if (filter.categories && filter.categories.length > 0) {
    result = result.filter(n => filter.categories!.includes(n.cat))
  }

  if (filter.tags && filter.tags.length > 0) {
    result = result.filter(n =>
      n.tags.some(t => filter.tags!.includes(t)),
    )
  }

  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase()
    result = result.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.desc.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)),
    )
  }

  return result
}

/** 应用布局算法 */
function applyLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  type: GraphLayout['type'],
  params: LayoutParams,
): void {
  switch (type) {
    case 'force':
      applyForceLayout(nodes, edges, params)
      break
    case 'radial':
      applyRadialLayout(nodes, params)
      break
    case 'hierarchical':
      applyHierarchicalLayout(nodes, edges, params)
      break
    case 'grid':
      applyGridLayout(nodes, params)
      break
    case 'circular':
      applyCircularLayout(nodes, params)
      break
  }
}

/** 力导向布局 */
function applyForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  params: LayoutParams,
): void {
  const { width, height, gravity, repulsion, springLength, iterations } = params
  const centerX = width / 2
  const centerY = height / 2

  // 随机初始化位置
  nodes.forEach(n => {
    n.x = Math.random() * width
    n.y = Math.random() * height
  })

  // 构建邻接表
  const adjacency = new Map<string, Set<string>>()
  nodes.forEach(n => adjacency.set(n.id, new Set()))
  edges.forEach(e => {
    adjacency.get(e.source)?.add(e.target)
    adjacency.get(e.target)?.add(e.source)
  })

  // 迭代
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { dx: number; dy: number }>()
    nodes.forEach(n => forces.set(n.id, { dx: 0, dy: 0 }))

    // 排斥力
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        const fa = forces.get(a.id)!
        const fb = forces.get(b.id)!
        fa.dx += fx
        fa.dy += fy
        fb.dx -= fx
        fb.dy -= fy
      }
    }

    // 弹簧力
    edges.forEach(e => {
      const source = nodes.find(n => n.id === e.source)
      const target = nodes.find(n => n.id === e.target)
      if (!source || !target) return

      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - springLength) * 0.1
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      const fs = forces.get(source.id)!
      const ft = forces.get(target.id)!
      fs.dx += fx
      fs.dy += fy
      ft.dx -= fx
      ft.dy -= fy
    })

    // 中心引力
    nodes.forEach(n => {
      const f = forces.get(n.id)!
      f.dx += (centerX - n.x) * gravity
      f.dy += (centerY - n.y) * gravity
    })

    // 应用力（冷却因子）
    const cooling = 1 - iter / iterations
    nodes.forEach(n => {
      const f = forces.get(n.id)!
      n.x += f.dx * cooling
      n.y += f.dy * cooling
      // 边界钳制
      n.x = Math.max(n.radius, Math.min(width - n.radius, n.x))
      n.y = Math.max(n.radius, Math.min(height - n.radius, n.y))
    })
  }
}

/** 径向布局 */
function applyRadialLayout(nodes: GraphNode[], params: LayoutParams): void {
  const { width, height } = params
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.4

  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    n.x = centerX + radius * Math.cos(angle)
    n.y = centerY + radius * Math.sin(angle)
  })
}

/** 层次布局 */
function applyHierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  params: LayoutParams,
): void {
  const { width, spacing } = params

  // 计算每个节点的层级（基于入度）
  const levels = new Map<string, number>()
  const inDegree = new Map<string, number>()

  nodes.forEach(n => {
    inDegree.set(n.id, 0)
  })

  edges.forEach(e => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  })

  // 根节点层级为 0
  const roots = nodes.filter(n => inDegree.get(n.id) === 0)
  roots.forEach(n => levels.set(n.id, 0))

  // BFS 分配层级
  const queue = [...roots]
  while (queue.length > 0) {
    const current = queue.shift()!
    const currentLevel = levels.get(current.id) || 0
    const neighbors = edges
      .filter(e => e.source === current.id)
      .map(e => nodes.find(n => n.id === e.target))
      .filter((n): n is GraphNode => n !== undefined)

    neighbors.forEach(neighbor => {
      if (!levels.has(neighbor.id) || levels.get(neighbor.id)! < currentLevel + 1) {
        levels.set(neighbor.id, currentLevel + 1)
        queue.push(neighbor)
      }
    })
  }

  // 未分配层级的节点放在最后
  nodes.forEach(n => {
    if (!levels.has(n.id)) levels.set(n.id, 0)
  })

  // 按层级分组
  const levelGroups = new Map<number, GraphNode[]>()
  levels.forEach((level, nodeId) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      if (!levelGroups.has(level)) levelGroups.set(level, [])
      levelGroups.get(level)!.push(node)
    }
  })

  // 布局
  levelGroups.forEach((group, level) => {
    const y = 100 + level * spacing
    const groupWidth = group.length * spacing
    const startX = (width - groupWidth) / 2 + spacing / 2

    group.forEach((node, i) => {
      node.x = startX + i * spacing
      node.y = y
    })
  })
}

/** 网格布局 */
function applyGridLayout(nodes: GraphNode[], params: LayoutParams): void {
  const { width, spacing } = params
  const cols = Math.ceil(Math.sqrt(nodes.length))
  const startX = (width - (cols - 1) * spacing) / 2

  nodes.forEach((n, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    n.x = startX + col * spacing
    n.y = 100 + row * spacing
  })
}

/** 圆形布局 */
function applyCircularLayout(nodes: GraphNode[], params: LayoutParams): void {
  const { width, height } = params
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.4

  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    n.x = centerX + radius * Math.cos(angle)
    n.y = centerY + radius * Math.sin(angle)
  })
}

/** 计算图谱统计 */
function computeGraphStats(nodes: GraphNode[], edges: GraphEdge[]): GraphStats {
  const nodeCount = nodes.length
  const edgeCount = edges.length

  // 图密度
  const maxEdges = nodeCount > 1 ? (nodeCount * (nodeCount - 1)) / 2 : 0
  const density = maxEdges > 0 ? Math.round((edgeCount / maxEdges) * 1000) / 1000 : 0

  // 度分布
  const degrees = nodes.map(n => n.degree)
  const averageDegree = nodeCount > 0
    ? Math.round((degrees.reduce((a, b) => a + b, 0) / nodeCount) * 100) / 100
    : 0
  const maxDegree = Math.max(...degrees, 0)

  // 分类分布
  const categoryDistribution: Record<string, number> = {}
  nodes.forEach(n => {
    categoryDistribution[n.category] = (categoryDistribution[n.category] || 0) + 1
  })

  // 孤立节点
  const isolatedNodes = nodes.filter(n => n.degree === 0).length

  // 最大连通分量大小（简化：使用 BFS）
  const visited = new Set<string>()
  let largestComponentSize = 0

  nodes.forEach(n => {
    if (visited.has(n.id)) return
    const component = new Set<string>()
    const queue = [n.id]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      component.add(current)

      edges.forEach(e => {
        if (e.source === current && !visited.has(e.target)) queue.push(e.target)
        if (e.target === current && !visited.has(e.source)) queue.push(e.source)
      })
    }

    largestComponentSize = Math.max(largestComponentSize, component.size)
  })

  return {
    nodeCount,
    edgeCount,
    density,
    averageDegree,
    maxDegree,
    categoryDistribution,
    isolatedNodes,
    largestComponentSize,
  }
}

/** 获取关系颜色 */
function getRelationColor(type: RelationType): string {
  const colors: Record<RelationType, string> = {
    related: '#6b9fc4',
    causal: '#E67E22',
    belongs: '#8a9a7a',
    contrast: '#a07c8c',
  }
  return colors[type] || '#94a3b8'
}

// ============================================================
// 图谱特征分析（P16-5）
// ============================================================

/** 图谱特征 */
export interface GraphCharacteristics {
  nodeCount: number
  edgeCount: number
  density: number
  maxDegree: number
  isolatedNodeCount: number
  /** 是否有明显的层级结构 */
  hasHierarchy: boolean
  /** 层级深度 */
  hierarchyDepth: number
  /** 是否为树结构 */
  isTreeLike: boolean
  /** 是否为星型结构 */
  isStarLike: boolean
  /** 连通分量数 */
  componentCount: number
  /** 平均聚类系数 */
  clusteringCoefficient: number
  /** 直径 */
  diameter: number
}

/** 布局推荐 */
export interface LayoutRecommendation {
  /** 推荐布局类型 */
  layoutType: GraphLayout['type']
  /** 推荐原因 */
  reason: string
  /** 匹配度 0-100 */
  confidence: number
  /** 备选布局 */
  alternatives: { type: GraphLayout['type']; reason: string; confidence: number }[]
  /** 推荐参数 */
  suggestedParams: Partial<LayoutParams>
}

/** 布局质量报告 */
export interface LayoutQualityReport {
  /** 综合评分 0-100 */
  overallScore: number
  /** 各维度评分 */
  dimensions: {
    /** 边交叉数（越少越好） */
    edgeCrossings: { count: number; score: number }
    /** 节点重叠（越少越好） */
    nodeOverlaps: { count: number; score: number }
    /** 边长度均匀度 */
    edgeLengthUniformity: { variance: number; score: number }
    /** 角度分辨率（边分布均匀度） */
    angularResolution: { averageAngle: number; score: number }
    /** 空间利用率 */
    spaceUtilization: { usedRatio: number; score: number }
    /** 对称性 */
    symmetry: { score: number }
  }
  /** 改进建议 */
  suggestions: string[]
}

// ============================================================
// useAutoLayoutSelector（P16-5）
// ============================================================

export function useAutoLayoutSelector() {
  const lastRecommendation = ref<LayoutRecommendation | null>(null)

  /** 分析图谱特征 */
  function analyzeCharacteristics(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): GraphCharacteristics {
    const nodeCount = nodes.length
    const edgeCount = edges.length

    // 密度
    const maxEdges = nodeCount > 1 ? (nodeCount * (nodeCount - 1)) / 2 : 0
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0

    // 度分布
    const degrees = new Map<string, number>()
    nodes.forEach(n => degrees.set(n.id, 0))
    edges.forEach(e => {
      degrees.set(e.source, (degrees.get(e.source) || 0) + 1)
      degrees.set(e.target, (degrees.get(e.target) || 0) + 1)
    })
    const maxDegree = Math.max(...degrees.values(), 0)

    // 孤立节点
    const isolatedNodeCount = nodes.filter(n => (degrees.get(n.id) || 0) === 0).length

    // 层级分析
    const hierarchyResult = analyzeHierarchy(nodes, edges)
    const hasHierarchy = hierarchyResult.depth > 2
    const hierarchyDepth = hierarchyResult.depth

    // 是否为树结构（边数 = 节点数 - 1 且连通）
    const isTreeLike = edgeCount === nodeCount - 1 && hierarchyResult.isConnected

    // 是否为星型结构（一个中心节点连接所有其他节点）
    const isStarLike = maxDegree >= nodeCount - 1 && nodeCount > 3

    // 连通分量
    const componentResult = countComponents(nodes, edges)
    const componentCount = componentResult.componentCount

    // 平均聚类系数
    const clusteringCoefficient = computeAverageClusteringCoefficient(nodes, edges, degrees)

    // 直径
    const diameter = computeGraphDiameter(nodes, edges)

    return {
      nodeCount,
      edgeCount,
      density: Math.round(density * 1000) / 1000,
      maxDegree,
      isolatedNodeCount,
      hasHierarchy,
      hierarchyDepth,
      isTreeLike,
      isStarLike,
      componentCount,
      clusteringCoefficient: Math.round(clusteringCoefficient * 1000) / 1000,
      diameter,
    }
  }

  /** 推荐最佳布局 */
  function recommendLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): LayoutRecommendation {
    const chars = analyzeCharacteristics(nodes, edges)
    const candidates: { type: GraphLayout['type']; reason: string; confidence: number }[] = []

    // 规则 1: 层级结构 → 层次布局
    if (chars.hasHierarchy && chars.hierarchyDepth >= 3) {
      candidates.push({
        type: 'hierarchical',
        reason: `检测到 ${chars.hierarchyDepth} 层层级结构，层次布局最适合展示父子关系`,
        confidence: Math.min(95, 60 + chars.hierarchyDepth * 10),
      })
    }

    // 规则 2: 树结构 → 径向布局
    if (chars.isTreeLike) {
      candidates.push({
        type: 'radial',
        reason: '树形结构用径向布局可清晰展示根节点与分支的关系',
        confidence: 85,
      })
    }

    // 规则 3: 星型结构 → 圆形布局
    if (chars.isStarLike) {
      candidates.push({
        type: 'circular',
        reason: '星型结构用圆形布局可突出中心节点并均匀分布叶节点',
        confidence: 90,
      })
    }

    // 规则 4: 小规模图 → 力导向布局
    if (chars.nodeCount <= 20) {
      candidates.push({
        type: 'force',
        reason: '小规模图谱用力导向布局可获得最自然的视觉效果',
        confidence: 80,
      })
    }

    // 规则 5: 大规模图 → 力导向布局（高性能）
    if (chars.nodeCount > 20 && chars.nodeCount <= 100) {
      candidates.push({
        type: 'force',
        reason: `中规模图谱（${chars.nodeCount} 节点），力导向布局可自适应关系密度`,
        confidence: 75,
      })
    }

    // 规则 6: 超大规模 → 网格布局
    if (chars.nodeCount > 100) {
      candidates.push({
        type: 'grid',
        reason: `大规模图谱（${chars.nodeCount} 节点），网格布局可避免视觉混乱`,
        confidence: 82,
      })
    }

    // 规则 7: 低密度、高连通分量 → 力导向
    if (chars.density < 0.1 && chars.componentCount > 1) {
      candidates.push({
        type: 'force',
        reason: '低密度多连通分量，力导向布局可自然分离各分量',
        confidence: 78,
      })
    }

    // 规则 8: 高密度 → 力导向（调整参数）
    if (chars.density > 0.3) {
      candidates.push({
        type: 'force',
        reason: '高密度图谱需要力导向布局的斥力来避免节点重叠',
        confidence: 85,
      })
    }

    // 如果没有候选，默认力导向
    if (candidates.length === 0) {
      candidates.push({
        type: 'force',
        reason: '通用推荐：力导向布局适用于大多数图谱结构',
        confidence: 60,
      })
    }

    // 按置信度排序
    candidates.sort((a, b) => b.confidence - a.confidence)

    const best = candidates[0]
    const alternatives = candidates.slice(1, 4).map(c => ({
      type: c.type,
      reason: c.reason,
      confidence: c.confidence,
    }))

    // 根据特征推荐参数
    const suggestedParams = suggestParams(chars, best.type)

    const recommendation: LayoutRecommendation = {
      layoutType: best.type,
      reason: best.reason,
      confidence: best.confidence,
      alternatives,
      suggestedParams,
    }

    lastRecommendation.value = recommendation
    return recommendation
  }

  /** 根据特征建议布局参数 */
  function suggestParams(
    chars: GraphCharacteristics,
    layoutType: GraphLayout['type'],
  ): Partial<LayoutParams> {
    const base: Partial<LayoutParams> = {}

    switch (layoutType) {
      case 'force': {
        // 根据密度调整斥力
        if (chars.density > 0.3) {
          base.repulsion = 10000
          base.springLength = 80
        } else if (chars.density < 0.05) {
          base.repulsion = 3000
          base.springLength = 200
        }
        // 根据节点数调整迭代次数
        if (chars.nodeCount > 50) {
          base.iterations = 200
        } else if (chars.nodeCount < 10) {
          base.iterations = 50
        }
        break
      }
      case 'hierarchical': {
        base.spacing = chars.nodeCount > 30 ? 80 : 120
        break
      }
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(chars.nodeCount))
        base.spacing = Math.max(80, Math.min(150, 800 / cols))
        break
      }
      case 'radial':
      case 'circular': {
        // 不需要特殊参数
        break
      }
    }

    return base
  }

  return {
    lastRecommendation,
    analyzeCharacteristics,
    recommendLayout,
    suggestParams,
  }
}

// ============================================================
// useLayoutQualityScorer（P16-5）
// ============================================================

export function useLayoutQualityScorer() {
  const lastReport = ref<LayoutQualityReport | null>(null)

  /** 评估布局质量 */
  function evaluateLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
    params: LayoutParams,
  ): LayoutQualityReport {
    const suggestions: string[] = []

    // 1. 边交叉检测
    const edgeCrossingResult = countEdgeCrossings(nodes, edges)
    const edgeCrossingScore = edgeCrossingResult === 0
      ? 100
      : Math.max(0, 100 - edgeCrossingResult * 5)

    if (edgeCrossingResult > 3) {
      suggestions.push(`检测到 ${edgeCrossingResult} 处边交叉，建议增加斥力或使用层次布局`)
    }

    // 2. 节点重叠检测
    const nodeOverlapResult = countNodeOverlaps(nodes)
    const nodeOverlapScore = nodeOverlapResult === 0
      ? 100
      : Math.max(0, 100 - nodeOverlapResult * 15)

    if (nodeOverlapResult > 2) {
      suggestions.push(`检测到 ${nodeOverlapResult} 处节点重叠，建议增加节点间距或斥力`)
    }

    // 3. 边长度均匀度
    const edgeLengths = edges.map(e => {
      const source = nodes.find(n => n.id === e.source)
      const target = nodes.find(n => n.id === e.target)
      if (!source || !target) return 0
      return Math.sqrt((target.x - source.x) ** 2 + (target.y - source.y) ** 2)
    }).filter(l => l > 0)

    const avgLength = edgeLengths.length > 0
      ? edgeLengths.reduce((a, b) => a + b, 0) / edgeLengths.length
      : 0
    const variance = edgeLengths.length > 0
      ? edgeLengths.reduce((sum, l) => sum + (l - avgLength) ** 2, 0) / edgeLengths.length
      : 0
    const normalizedVariance = avgLength > 0 ? variance / (avgLength * avgLength) : 0
    const edgeLengthScore = Math.max(0, 100 - normalizedVariance * 200)

    if (normalizedVariance > 0.5) {
      suggestions.push('边长度差异较大，建议调整弹簧力参数使边长更均匀')
    }

    // 4. 角度分辨率
    const angularResult = computeAngularResolution(nodes, edges)
    const angularScore = Math.max(0, Math.min(100, angularResult * 100 / Math.PI))

    if (angularResult < Math.PI / 4) {
      suggestions.push('节点周围边分布不均匀，部分区域过于拥挤')
    }

    // 5. 空间利用率
    const spaceResult = computeSpaceUtilization(nodes, params)
    const spaceScore = spaceResult >= 0.3 && spaceResult <= 0.8
      ? 100
      : spaceResult < 0.3
        ? Math.round(spaceResult / 0.3 * 70)
        : Math.round((1 - spaceResult) / 0.2 * 70)

    if (spaceResult < 0.2) {
      suggestions.push('空间利用率过低，节点过于集中，建议增加斥力或扩展画布')
    } else if (spaceResult > 0.9) {
      suggestions.push('空间利用率过高，部分节点可能超出可视范围')
    }

    // 6. 对称性评分
    const symmetryScore = computeSymmetryScore(nodes, params)

    // 综合评分（加权平均）
    const weights = {
      edgeCrossings: 0.25,
      nodeOverlaps: 0.20,
      edgeUniformity: 0.15,
      angularResolution: 0.15,
      spaceUtilization: 0.10,
      symmetry: 0.15,
    }

    const overallScore = Math.round(
      edgeCrossingScore * weights.edgeCrossings +
      nodeOverlapScore * weights.nodeOverlaps +
      edgeLengthScore * weights.edgeUniformity +
      angularScore * weights.angularResolution +
      spaceScore * weights.spaceUtilization +
      symmetryScore * weights.symmetry,
    )

    const report: LayoutQualityReport = {
      overallScore,
      dimensions: {
        edgeCrossings: { count: edgeCrossingResult, score: edgeCrossingScore },
        nodeOverlaps: { count: nodeOverlapResult, score: nodeOverlapScore },
        edgeLengthUniformity: { variance: Math.round(normalizedVariance * 1000) / 1000, score: edgeLengthScore },
        angularResolution: { averageAngle: Math.round(angularResult * 180 / Math.PI), score: angularScore },
        spaceUtilization: { usedRatio: Math.round(spaceResult * 1000) / 1000, score: spaceScore },
        symmetry: { score: symmetryScore },
      },
      suggestions,
    }

    lastReport.value = report
    return report
  }

  /** 基准测试：比较不同布局的质量 */
  function benchmarkLayouts(
    nodes: GraphNode[],
    edges: GraphEdge[],
    baseParams: LayoutParams,
    layoutTypes: GraphLayout['type'][] = ['force', 'radial', 'hierarchical', 'grid', 'circular'],
  ): { type: GraphLayout['type']; score: number; report: LayoutQualityReport }[] {
    return layoutTypes.map(type => {
      const testNodes = nodes.map(n => ({ ...n }))
      const testEdges = edges.map(e => ({ ...e }))
      applyLayout(testNodes, testEdges, type, baseParams)
      const report = evaluateLayout(testNodes, testEdges, baseParams)
      return { type, score: report.overallScore, report }
    }).sort((a, b) => b.score - a.score)
  }

  return {
    lastReport,
    evaluateLayout,
    benchmarkLayouts,
  }
}

// ============================================================
// 图谱特征分析辅助函数
// ============================================================

/** 分析层级结构 */
function analyzeHierarchy(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { depth: number; isConnected: boolean } {
  if (nodes.length === 0) return { depth: 0, isConnected: false }

  const inDegree = new Map<string, number>()
  nodes.forEach(n => inDegree.set(n.id, 0))
  edges.forEach(e => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  })

  // 根节点（入度为 0）
  const roots = nodes.filter(n => inDegree.get(n.id) === 0)

  // BFS 计算深度
  const visited = new Set<string>()
  let maxDepth = 0
  const queue: { id: string; depth: number }[] = roots.map(r => ({ id: r.id, depth: 0 }))

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    maxDepth = Math.max(maxDepth, depth)

    edges
      .filter(e => e.source === id)
      .forEach(e => {
        if (!visited.has(e.target)) {
          queue.push({ id: e.target, depth: depth + 1 })
        }
      })
  }

  return { depth: maxDepth, isConnected: visited.size === nodes.length }
}

/** 统计连通分量 */
function countComponents(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { componentCount: number; components: number[][] } {
  const visited = new Set<string>()
  const components: number[][] = []

  // 构建邻接表
  const adjacency = new Map<string, string[]>()
  nodes.forEach(n => adjacency.set(n.id, []))
  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target)
    adjacency.get(e.target)?.push(e.source)
  })

  nodes.forEach(n => {
    if (visited.has(n.id)) return
    const component: string[] = []
    const queue = [n.id]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      component.push(current)

      adjacency.get(current)?.forEach(neighbor => {
        if (!visited.has(neighbor)) queue.push(neighbor)
      })
    }

    components.push(component.map(id => nodes.findIndex(n => n.id === id)))
  })

  return { componentCount: components.length, components }
}

/** 计算平均聚类系数 */
function computeAverageClusteringCoefficient(
  nodes: GraphNode[],
  edges: GraphEdge[],
  _degrees: Map<string, number>,
): number {
  if (nodes.length === 0) return 0

  // 构建邻接表
  const adjacency = new Map<string, Set<string>>()
  nodes.forEach(n => adjacency.set(n.id, new Set()))
  edges.forEach(e => {
    adjacency.get(e.source)?.add(e.target)
    adjacency.get(e.target)?.add(e.source)
  })

  let totalCoefficient = 0
  let nodesWithNeighbors = 0

  nodes.forEach(n => {
    const neighbors = [...(adjacency.get(n.id) || [])]
    const k = neighbors.length
    if (k < 2) return

    // 统计邻居之间的边数
    let neighborEdges = 0
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (adjacency.get(neighbors[i])?.has(neighbors[j])) {
          neighborEdges++
        }
      }
    }

    const maxPossible = (k * (k - 1)) / 2
    totalCoefficient += neighborEdges / maxPossible
    nodesWithNeighbors++
  })

  return nodesWithNeighbors > 0 ? totalCoefficient / nodesWithNeighbors : 0
}

/** 计算图直径 */
function computeGraphDiameter(
  nodes: GraphNode[],
  edges: GraphEdge[],
): number {
  if (nodes.length === 0) return 0

  const adjacency = new Map<string, string[]>()
  nodes.forEach(n => adjacency.set(n.id, []))
  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target)
    adjacency.get(e.target)?.push(e.source)
  })

  let diameter = 0
  const nodeIds = nodes.map(n => n.id)

  // 对每个节点做 BFS 找最远距离
  for (const startId of nodeIds) {
    const distances = new Map<string, number>()
    const queue = [startId]
    distances.set(startId, 0)

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentDist = distances.get(current)!

      adjacency.get(current)?.forEach(neighbor => {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, currentDist + 1)
          queue.push(neighbor)
        }
      })
    }

    const maxDist = Math.max(...distances.values())
    diameter = Math.max(diameter, maxDist)
  }

  return diameter
}

// ============================================================
// 布局质量评分辅助函数
// ============================================================

/** 计算边交叉数 */
function countEdgeCrossings(nodes: GraphNode[], edges: GraphEdge[]): number {
  let crossings = 0

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i]
      const e2 = edges[j]

      const s1 = nodes.find(n => n.id === e1.source)
      const t1 = nodes.find(n => n.id === e1.target)
      const s2 = nodes.find(n => n.id === e2.source)
      const t2 = nodes.find(n => n.id === e2.target)

      if (!s1 || !t1 || !s2 || !t2) continue

      // 共享端点的边不算交叉
      if (e1.source === e2.source || e1.source === e2.target ||
          e1.target === e2.source || e1.target === e2.target) continue

      if (segmentsIntersect(
        s1.x, s1.y, t1.x, t1.y,
        s2.x, s2.y, t2.x, t2.y,
      )) {
        crossings++
      }
    }
  }

  return crossings
}

/** 判断两条线段是否相交 */
function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  const d1 = crossProduct(x3, y3, x4, y4, x1, y1)
  const d2 = crossProduct(x3, y3, x4, y4, x2, y2)
  const d3 = crossProduct(x1, y1, x2, y2, x3, y3)
  const d4 = crossProduct(x1, y1, x2, y2, x4, y4)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }

  return false
}

/** 叉积 */
function crossProduct(
  x1: number, y1: number, x2: number, y2: number,
  px: number, py: number,
): number {
  return (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)
}

/** 计算节点重叠数 */
function countNodeOverlaps(nodes: GraphNode[]): number {
  let overlaps = 0

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = (a.radius + b.radius) * 0.8 // 允许 20% 重叠

      if (dist < minDist) {
        overlaps++
      }
    }
  }

  return overlaps
}

/** 计算角度分辨率 */
function computeAngularResolution(
  nodes: GraphNode[],
  edges: GraphEdge[],
): number {
  if (nodes.length === 0) return 0

  // 构建邻接表
  const adjacency = new Map<string, string[]>()
  nodes.forEach(n => adjacency.set(n.id, []))
  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target)
    adjacency.get(e.target)?.push(e.source)
  })

  let totalMinAngle = 0
  let nodesWithEdges = 0

  nodes.forEach(n => {
    const neighbors = adjacency.get(n.id) || []
    if (neighbors.length < 2) return

    const angles: number[] = []
    neighbors.forEach(neighborId => {
      const neighbor = nodes.find(nn => nn.id === neighborId)
      if (neighbor) {
        const angle = Math.atan2(neighbor.y - n.y, neighbor.x - n.x)
        angles.push(angle)
      }
    })

    angles.sort((a, b) => a - b)

    // 找最小角度差
    let minAngleDiff = Infinity
    for (let i = 0; i < angles.length; i++) {
      const diff = i === angles.length - 1
        ? angles[0] + 2 * Math.PI - angles[i]
        : angles[i + 1] - angles[i]
      minAngleDiff = Math.min(minAngleDiff, diff)
    }

    totalMinAngle += minAngleDiff
    nodesWithEdges++
  })

  return nodesWithEdges > 0 ? totalMinAngle / nodesWithEdges : 0
}

/** 计算空间利用率 */
function computeSpaceUtilization(
  nodes: GraphNode[],
  params: LayoutParams,
): number {
  if (nodes.length === 0) return 0

  // 计算节点的包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  nodes.forEach(n => {
    minX = Math.min(minX, n.x - n.radius)
    minY = Math.min(minY, n.y - n.radius)
    maxX = Math.max(maxX, n.x + n.radius)
    maxY = Math.max(maxY, n.y + n.radius)
  })

  const usedWidth = maxX - minX
  const usedHeight = maxY - minY
  const usedArea = usedWidth * usedHeight
  const totalArea = params.width * params.height

  return Math.min(1, usedArea / totalArea)
}

/** 计算对称性评分 */
function computeSymmetryScore(
  nodes: GraphNode[],
  params: LayoutParams,
): number {
  if (nodes.length < 2) return 100

  const centerX = params.width / 2
  const centerY = params.height / 2

  // 计算节点关于中心点的镜像对称性
  let symmetrySum = 0

  for (const n of nodes) {
    // 找镜像位置最近的节点
    const mirrorX = 2 * centerX - n.x
    const mirrorY = 2 * centerY - n.y

    let minDist = Infinity
    for (const other of nodes) {
      if (other.id === n.id) continue
      const dx = other.x - mirrorX
      const dy = other.y - mirrorY
      const dist = Math.sqrt(dx * dx + dy * dy)
      minDist = Math.min(minDist, dist)
    }

    // 归一化距离
    const normalizedDist = minDist / Math.max(params.width, params.height)
    symmetrySum += Math.max(0, 1 - normalizedDist)
  }

  const avgSymmetry = symmetrySum / nodes.length

  return Math.round(avgSymmetry * 100)
}

// ============================================================
// 增强版力导向布局（带收敛检测，P16-5）
// ============================================================

/** 增强版力导向布局参数 */
export interface EnhancedForceParams extends LayoutParams {
  /** 收敛阈值（节点位移小于此值视为收敛） */
  convergenceThreshold: number
  /** 最大迭代次数 */
  maxIterations: number
  /** 最小迭代次数 */
  minIterations: number
  /** 是否启用自适应冷却 */
  adaptiveCooling: boolean
}

/** 增强版力导向布局结果 */
export interface EnhancedForceResult {
  nodes: GraphNode[]
  /** 实际迭代次数 */
  iterations: number
  /** 是否收敛 */
  converged: boolean
  /** 最终平均位移 */
  finalDisplacement: number
  /** 收敛历史 */
  convergenceHistory: { iteration: number; displacement: number }[]
}

/** 增强版力导向布局（带收敛检测） */
export function applyEnhancedForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  params: EnhancedForceParams,
): EnhancedForceResult {
  const {
    width, height, gravity, repulsion, springLength,
    convergenceThreshold = 0.5,
    maxIterations = 300,
    minIterations = 20,
    adaptiveCooling = true,
  } = params

  const centerX = width / 2
  const centerY = height / 2
  const convergenceHistory: { iteration: number; displacement: number }[] = []

  // 空节点提前返回
  if (nodes.length === 0) {
    return { nodes, iterations: 0, converged: true, finalDisplacement: 0, convergenceHistory }
  }

  // 随机初始化位置
  nodes.forEach(n => {
    n.x = Math.random() * width
    n.y = Math.random() * height
  })

  // 构建邻接表
  const adjacency = new Map<string, Set<string>>()
  nodes.forEach(n => adjacency.set(n.id, new Set()))
  edges.forEach(e => {
    adjacency.get(e.source)?.add(e.target)
    adjacency.get(e.target)?.add(e.source)
  })

  let converged = false
  let finalIteration = maxIterations

  for (let iter = 0; iter < maxIterations; iter++) {
    const forces = new Map<string, { dx: number; dy: number }>()
    nodes.forEach(n => forces.set(n.id, { dx: 0, dy: 0 }))

    // 排斥力（Barnes-Hut 简化：O(n²) 在小规模下足够）
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        // 使用改进的排斥力函数（避免极端力）
        const force = repulsion / (dist * dist + 100)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        const fa = forces.get(a.id)!
        const fb = forces.get(b.id)!
        fa.dx += fx
        fa.dy += fy
        fb.dx -= fx
        fb.dy -= fy
      }
    }

    // 弹簧力
    edges.forEach(e => {
      const source = nodes.find(n => n.id === e.source)
      const target = nodes.find(n => n.id === e.target)
      if (!source || !target) return

      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      // 对数弹簧力（避免远距离节点受力过大）
      const force = Math.log(dist / springLength + 1) * 5
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      const fs = forces.get(source.id)!
      const ft = forces.get(target.id)!
      fs.dx += fx
      fs.dy += fy
      ft.dx -= fx
      ft.dy -= fy
    })

    // 中心引力
    nodes.forEach(n => {
      const f = forces.get(n.id)!
      const dx = centerX - n.x
      const dy = centerY - n.y
      f.dx += dx * gravity
      f.dy += dy * gravity
    })

    // 自适应冷却
    let cooling: number
    if (adaptiveCooling) {
      // 初期快速冷却，后期缓慢
      cooling = Math.pow(1 - iter / maxIterations, 0.5)
    } else {
      cooling = 1 - iter / maxIterations
    }

    // 应用力并计算位移
    let totalDisplacement = 0
    nodes.forEach(n => {
      const f = forces.get(n.id)!
      const dx = f.dx * cooling
      const dy = f.dy * cooling

      n.x += dx
      n.y += dy

      // 边界钳制
      n.x = Math.max(n.radius, Math.min(width - n.radius, n.x))
      n.y = Math.max(n.radius, Math.min(height - n.radius, n.y))

      totalDisplacement += Math.sqrt(dx * dx + dy * dy)
    })

    const avgDisplacement = totalDisplacement / nodes.length
    convergenceHistory.push({ iteration: iter + 1, displacement: Math.round(avgDisplacement * 1000) / 1000 })

    // 收敛检测
    if (iter >= minIterations && avgDisplacement < convergenceThreshold) {
      converged = true
      finalIteration = iter + 1
      break
    }
  }

  return {
    nodes,
    iterations: finalIteration,
    converged,
    finalDisplacement: convergenceHistory.length > 0
      ? convergenceHistory[convergenceHistory.length - 1].displacement
      : 0,
    convergenceHistory,
  }
}