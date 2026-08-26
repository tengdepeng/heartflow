// ============================================================
// 业脉 · 学习路径 + 影响力分析 + 可视化数据
// 增强功能：
//   1. 学习路径（技能树路径规划+推荐课程+进度追踪）
//   2. 影响力分析（网络中心度+传播力+影响力评分）
//   3. 可视化数据（网络图+职业路径图+技能雷达图+影响力热力图）
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { Contact, CareerConnection, NetworkTier, NodeType, ConnectionType } from './types'
import type { SkillNode, SkillCategory, ProficiencyLevel } from './skill-map'

// ---- 学习路径 ----

/** 学习路径类型 */
export type LearningPathType = 'linear' | 'branching' | 'spiral' | 't-shaped' | 'pi-shaped'

/** 学习路径节点 */
export interface LearningPathNode {
  id: string
  /** 关联技能 */
  skillId: string
  skillName: string
  /** 在路径中的层级 */
  level: number
  /** 前置节点 ID */
  prerequisites: string[]
  /** 估计学习时长（小时） */
  estimatedHours: number
  /** 实际学习时长（小时） */
  actualHours: number
  /** 是否完成 */
  completed: boolean
  /** 完成时间 */
  completedAt?: string
  /** 学习资源 */
  resources: LearningResource[]
  /** 节点描述 */
  description: string
}

/** 学习资源 */
export interface LearningResource {
  type: 'course' | 'book' | 'article' | 'video' | 'project' | 'mentor'
  title: string
  url?: string
  duration?: string
  rating?: number
  completed: boolean
}

/** 学习路径 */
export interface LearningPath {
  id: string
  type: LearningPathType
  name: string
  description: string
  /** 目标职位/角色 */
  targetRole: string
  /** 路径节点 */
  nodes: LearningPathNode[]
  /** 总估计时长 */
  totalEstimatedHours: number
  /** 总实际时长 */
  totalActualHours: number
  /** 整体进度 0-100 */
  progress: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 预计完成时间 */
  estimatedCompletionDate?: string
}

/** 技能缺口 */
export interface SkillGap {
  /** 当前技能 */
  currentSkill: SkillNode
  /** 目标熟练度 */
  targetProficiency: ProficiencyLevel
  /** 缺口大小 */
  gapSize: number
  /** 建议学习资源 */
  recommendedResources: LearningResource[]
  /** 估计学习时长 */
  estimatedHours: number
}

/** 学习路径类型元数据 */
export const LEARNING_PATH_TYPE_META: Record<LearningPathType, { label: string; icon: string; description: string }> = {
  linear: { label: '线性路径', icon: '➡️', description: '按顺序逐步掌握技能' },
  branching: { label: '分支路径', icon: '🌿', description: '多条路径可选，适合探索' },
  spiral: { label: '螺旋路径', icon: '🌀', description: '循环深入，逐步精进' },
  't-shaped': { label: 'T型路径', icon: '📐', description: '一专多能，深度+广度' },
  'pi-shaped': { label: 'Π型路径', icon: 'Π', description: '双核心能力并重' },
}

/** 存储键 */
const SKILL_PATH_KEYS = {
  LEARNING_PATHS: 'hf:career_learning_paths',
  INFLUENCE: 'hf:career_influence',
} as const

/** 熟练度排序 */
const PROFICIENCY_ORDER: ProficiencyLevel[] = ['novice', 'beginner', 'intermediate', 'advanced', 'expert', 'master']

export function useLearningPath() {
  const learningPaths = ref<LearningPath[]>([])

  function loadAll(): void {
    learningPaths.value = storage.getKV<LearningPath[]>(SKILL_PATH_KEYS.LEARNING_PATHS, []) || []
  }

  function saveAll(): void {
    storage.setKV(SKILL_PATH_KEYS.LEARNING_PATHS, learningPaths.value)
  }

  /** 创建学习路径 */
  function createLearningPath(
    type: LearningPathType,
    name: string,
    targetRole: string,
    description: string,
    nodes: Omit<LearningPathNode, 'id'>[],
  ): LearningPath {
    const pathNodes = nodes.map((n, i) => ({
      ...n,
      id: `learning-path-node-${Date.now()}-${i}`,
    }))

    const totalEstimated = pathNodes.reduce((sum, n) => sum + n.estimatedHours, 0)
    const totalActual = pathNodes.reduce((sum, n) => sum + n.actualHours, 0)
    const completedCount = pathNodes.filter(n => n.completed).length
    const progress = pathNodes.length > 0
      ? Math.round((completedCount / pathNodes.length) * 100)
      : 0

    const path: LearningPath = {
      id: `learning-path-${Date.now()}`,
      type,
      name,
      description,
      targetRole,
      nodes: pathNodes,
      totalEstimatedHours: totalEstimated,
      totalActualHours: totalActual,
      progress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    learningPaths.value.push(path)
    saveAll()
    return path
  }

  /** 更新节点完成状态 */
  function completeNode(pathId: string, nodeId: string): boolean {
    const path = learningPaths.value.find(p => p.id === pathId)
    if (!path) return false

    const node = path.nodes.find(n => n.id === nodeId)
    if (!node) return false

    node.completed = true
    node.completedAt = new Date().toISOString()

    // 更新路径进度
    const completedCount = path.nodes.filter(n => n.completed).length
    path.progress = Math.round((completedCount / path.nodes.length) * 100)
    path.totalActualHours = path.nodes.reduce((sum, n) => sum + n.actualHours, 0)
    path.updatedAt = new Date().toISOString()

    saveAll()
    return true
  }

  /** 添加学习资源 */
  function addResource(
    pathId: string,
    nodeId: string,
    resource: LearningResource,
  ): boolean {
    const path = learningPaths.value.find(p => p.id === pathId)
    if (!path) return false

    const node = path.nodes.find(n => n.id === nodeId)
    if (!node) return false

    node.resources.push(resource)
    path.updatedAt = new Date().toISOString()
    saveAll()
    return true
  }

  /** 分析技能缺口 */
  function analyzeSkillGaps(
    currentSkills: SkillNode[],
    _targetRole: string,
    requiredSkills: { name: string; category: SkillCategory; targetProficiency: ProficiencyLevel }[],
  ): SkillGap[] {
    const gaps: SkillGap[] = []

    requiredSkills.forEach(req => {
      const existing = currentSkills.find(
        s => s.name.toLowerCase() === req.name.toLowerCase() && s.category === req.category,
      )

      const currentProficiencyLevel = existing
        ? PROFICIENCY_ORDER.indexOf(existing.proficiency)
        : -1
      const targetProficiencyLevel = PROFICIENCY_ORDER.indexOf(req.targetProficiency)

      const gapSize = targetProficiencyLevel - currentProficiencyLevel

      if (gapSize > 0) {
        gaps.push({
          currentSkill: existing || {
            id: '',
            name: req.name,
            category: req.category,
            proficiency: 'novice',
            proficiencyScore: 0,
            yearsOfExperience: 0,
            relatedPositions: [],
            prerequisites: [],
            complements: [],
            isCore: false,
          },
          targetProficiency: req.targetProficiency,
          gapSize,
          recommendedResources: generateDefaultResources(req.name, req.category),
          estimatedHours: gapSize * 40, // 每级约 40 小时
        })
      }
    })

    return gaps.sort((a, b) => b.gapSize - a.gapSize)
  }

  /** 根据技能缺口生成推荐学习路径 */
  function generatePathFromGaps(
    gaps: SkillGap[],
    targetRole: string,
    type: LearningPathType = 'linear',
  ): LearningPath {
    const nodes: Omit<LearningPathNode, 'id'>[] = gaps.map((gap, i) => ({
      skillId: gap.currentSkill.id,
      skillName: gap.currentSkill.name,
      level: i + 1,
      prerequisites: i > 0 ? [`learning-path-node-${Date.now()}-${i - 1}`] : [],
      estimatedHours: gap.estimatedHours,
      actualHours: 0,
      completed: false,
      resources: gap.recommendedResources,
      description: `从 ${gap.currentSkill.proficiency} 提升到 ${gap.targetProficiency}`,
    }))

    return createLearningPath(
      type,
      `通往 ${targetRole} 的学习路径`,
      targetRole,
      `基于 ${gaps.length} 个技能缺口的自动生成路径`,
      nodes,
    )
  }

  return {
    learningPaths,
    loadAll,
    createLearningPath,
    completeNode,
    addResource,
    analyzeSkillGaps,
    generatePathFromGaps,
  }
}

/** 生成默认学习资源 */
function generateDefaultResources(skillName: string, category: SkillCategory): LearningResource[] {
  const categoryResources: Record<SkillCategory, LearningResource[]> = {
    technical: [
      { type: 'course', title: `${skillName} 入门课程`, completed: false },
      { type: 'project', title: `${skillName} 实战项目`, completed: false },
      { type: 'book', title: `${skillName} 深入理解`, completed: false },
    ],
    soft: [
      { type: 'book', title: `${skillName} 经典书籍`, completed: false },
      { type: 'video', title: `${skillName} TED 演讲`, completed: false },
      { type: 'mentor', title: `寻找 ${skillName} 导师`, completed: false },
    ],
    domain: [
      { type: 'course', title: `${skillName} 领域知识课程`, completed: false },
      { type: 'article', title: `${skillName} 行业洞察`, completed: false },
      { type: 'project', title: `${skillName} 行业分析项目`, completed: false },
    ],
    leadership: [
      { type: 'book', title: `${skillName} 领导力书籍`, completed: false },
      { type: 'course', title: `${skillName} 管理课程`, completed: false },
      { type: 'mentor', title: `寻找 ${skillName} 导师`, completed: false },
    ],
    creative: [
      { type: 'project', title: `${skillName} 创意项目`, completed: false },
      { type: 'course', title: `${skillName} 创意课程`, completed: false },
      { type: 'video', title: `${skillName} 灵感来源`, completed: false },
    ],
  }

  return categoryResources[category] || categoryResources.technical
}

// ---- 影响力分析 ----

/** 网络中心度指标 */
export interface CentralityMetrics {
  /** 度中心度（直接连接数） */
  degreeCentrality: number
  /** 介数中心度（作为桥梁的次数） */
  betweennessCentrality: number
  /** 接近中心度（到所有节点的平均距离倒数） */
  closenessCentrality: number
  /** 特征向量中心度（连接的质量） */
  eigenvectorCentrality: number
  /** 综合中心度 0-100 */
  compositeCentrality: number
}

/** 影响力评分 */
export interface InfluenceScore {
  /** 联系人 ID */
  contactId: string
  /** 联系人姓名 */
  contactName: string
  /** 网络影响力 */
  networkInfluence: number
  /** 知识影响力 */
  knowledgeInfluence: number
  /** 社交影响力 */
  socialInfluence: number
  /** 综合影响力 0-100 */
  overallInfluence: number
  /** 影响力趋势（上升/下降/稳定） */
  trend: 'rising' | 'declining' | 'stable'
  /** 影响力排名 */
  rank: number
}

/** 传播力分析 */
export interface PropagationAnalysis {
  /** 源节点 */
  sourceId: string
  /** 可达节点数 */
  reachableNodes: number
  /** 平均传播距离 */
  avgPropagationDistance: number
  /** 传播效率 */
  propagationEfficiency: number
  /** 关键传播路径 */
  criticalPaths: string[][]
}

/** 网络健康度 */
export interface NetworkHealth {
  /** 网络密度 */
  density: number
  /** 平均聚类系数 */
  avgClusteringCoefficient: number
  /** 连通分量数 */
  connectedComponents: number
  /** 最大连通分量大小 */
  largestComponentSize: number
  /** 网络直径 */
  diameter: number
  /** 平均路径长度 */
  avgPathLength: number
  /** 健康评分 0-100 */
  healthScore: number
}

export function useInfluenceAnalysis() {
  const influenceScores = ref<InfluenceScore[]>([])
  const networkHealth = ref<NetworkHealth | null>(null)

  /** 计算所有联系人的影响力评分 */
  function computeInfluenceScores(
    contacts: Contact[],
    connections: CareerConnection[],
  ): InfluenceScore[] {
    const scores: InfluenceScore[] = []

    contacts.forEach(contact => {
      // 网络影响力：基于连接数和连接强度
      const contactConnections = connections.filter(
        c => c.fromId === contact.id || c.toId === contact.id,
      )
      const networkInfluence = computeNetworkInfluence(contact, contactConnections)

      // 知识影响力：基于节点类型和亲密度
      const knowledgeInfluence = computeKnowledgeInfluence(contact)

      // 社交影响力：基于活跃度和圈层
      const socialInfluence = computeSocialInfluence(contact)

      // 综合影响力
      const overallInfluence = Math.round(
        networkInfluence * 0.35 + knowledgeInfluence * 0.30 + socialInfluence * 0.35,
      )

      // 趋势判断
      const trend = computeInfluenceTrend(contact, contactConnections)

      scores.push({
        contactId: contact.id,
        contactName: contact.name,
        networkInfluence,
        knowledgeInfluence,
        socialInfluence,
        overallInfluence,
        trend,
        rank: 0, // 稍后排序
      })
    })

    // 排序并分配排名
    scores.sort((a, b) => b.overallInfluence - a.overallInfluence)
    scores.forEach((s, i) => { s.rank = i + 1 })

    influenceScores.value = scores
    return scores
  }

  /** 计算网络中心度 */
  function computeCentrality(
    contactId: string,
    contacts: Contact[],
    connections: CareerConnection[],
  ): CentralityMetrics {
    const contactIds = contacts.map(c => c.id)
    const n = contactIds.length
    if (n <= 1) {
      return {
        degreeCentrality: 0,
        betweennessCentrality: 0,
        closenessCentrality: 0,
        eigenvectorCentrality: 0,
        compositeCentrality: 0,
      }
    }

    // 度中心度
    const directConnections = connections.filter(
      c => c.fromId === contactId || c.toId === contactId,
    )
    const degreeCentrality = directConnections.length / (n - 1)

    // 介数中心度（简化计算）
    const betweennessCentrality = computeBetweennessCentrality(contactId, contactIds, connections)

    // 接近中心度（简化计算）
    const closenessCentrality = computeClosenessCentrality(contactId, contactIds, connections)

    // 特征向量中心度（简化：连接的节点的度中心度之和）
    const eigenvectorCentrality = computeEigenvectorCentrality(contactId, contacts, connections)

    // 综合
    const compositeCentrality = Math.round(
      (degreeCentrality * 0.25 + betweennessCentrality * 0.25 + closenessCentrality * 0.25 + eigenvectorCentrality * 0.25) * 100,
    )

    return {
      degreeCentrality: Math.round(degreeCentrality * 100),
      betweennessCentrality: Math.round(betweennessCentrality * 100),
      closenessCentrality: Math.round(closenessCentrality * 100),
      eigenvectorCentrality: Math.round(eigenvectorCentrality * 100),
      compositeCentrality,
    }
  }

  /** 计算传播力 */
  function computePropagation(
    sourceId: string,
    contacts: Contact[],
    connections: CareerConnection[],
  ): PropagationAnalysis {
    const contactIds = contacts.map(c => c.id)
    const n = contactIds.length

    // BFS 计算可达节点
    const visited = new Set<string>()
    const distances = new Map<string, number>()
    const queue: string[] = [sourceId]
    visited.add(sourceId)
    distances.set(sourceId, 0)

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentDist = distances.get(current)!

      connections
        .filter(c => c.fromId === current || c.toId === current)
        .forEach(c => {
          const neighbor = c.fromId === current ? c.toId : c.fromId
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            distances.set(neighbor, currentDist + 1)
            queue.push(neighbor)
          }
        })
    }

    const reachable = visited.size - 1 // 排除自身
    const totalDist = [...distances.values()].reduce((a, b) => a + b, 0)
    const avgDist = reachable > 0 ? totalDist / reachable : 0

    // 传播效率
    const propagationEfficiency = reachable > 0
      ? Math.round((reachable / (n - 1)) * (1 / Math.max(avgDist, 1)) * 100)
      : 0

    // 关键传播路径（到最远节点的路径）
    const maxDist = Math.max(...distances.values())
    const criticalPaths = findCriticalPaths(sourceId, contacts, connections, maxDist)

    return {
      sourceId,
      reachableNodes: reachable,
      avgPropagationDistance: Math.round(avgDist * 100) / 100,
      propagationEfficiency,
      criticalPaths,
    }
  }

  /** 计算网络健康度 */
  function computeNetworkHealth(
    contacts: Contact[],
    connections: CareerConnection[],
  ): NetworkHealth {
    const n = contacts.length
    if (n <= 1) {
      return {
        density: 0,
        avgClusteringCoefficient: 0,
        connectedComponents: n,
        largestComponentSize: n,
        diameter: 0,
        avgPathLength: 0,
        healthScore: 0,
      }
    }

    const maxEdges = n * (n - 1) / 2
    const density = connections.length / maxEdges

    // 聚类系数
    const clusteringCoeff = computeClusteringCoefficient(contacts, connections)

    // 连通分量
    const components = findConnectedComponents(contacts, connections)
    const largestSize = Math.max(...components.map(c => c.length))

    // 直径和平均路径长度
    const { diameter, avgPathLength } = computeDiameterAndAvgPath(contacts, connections)

    // 健康评分
    const healthScore = Math.round(
      Math.min(density * 100, 30) + // 密度贡献 30%
      Math.min(clusteringCoeff * 100, 25) + // 聚类贡献 25%
      Math.min((largestSize / n) * 100, 25) + // 连通性贡献 25%
      Math.min(100 / Math.max(diameter, 1), 20) + // 直径倒数贡献 20%
      0,
    )

    const health: NetworkHealth = {
      density: Math.round(density * 1000) / 1000,
      avgClusteringCoefficient: Math.round(clusteringCoeff * 1000) / 1000,
      connectedComponents: components.length,
      largestComponentSize: largestSize,
      diameter,
      avgPathLength: Math.round(avgPathLength * 100) / 100,
      healthScore,
    }

    networkHealth.value = health
    return health
  }

  return {
    influenceScores,
    networkHealth,
    computeInfluenceScores,
    computeCentrality,
    computePropagation,
    computeNetworkHealth,
  }
}

/** 计算网络影响力 */
function computeNetworkInfluence(
  contact: Contact,
  connections: CareerConnection[],
): number {
  const connectionCount = connections.length
  const totalStrength = connections.reduce((sum, c) => sum + c.strength, 0)
  const avgStrength = connectionCount > 0 ? totalStrength / connectionCount : 0

  const score = Math.min(
    (connectionCount / 10) * 30 + // 连接数 30%
    (avgStrength / 10) * 40 + // 连接强度 40%
    (contact.affinity / 10) * 30, // 亲密度 30%
    100,
  )

  return Math.round(score)
}

/** 计算知识影响力 */
function computeKnowledgeInfluence(contact: Contact): number {
  const knowledgeTypes: NodeType[] = ['mentor', 'colleague', 'peer', 'superior']

  let score = 0
  if (knowledgeTypes.includes(contact.nodeType)) {
    score += 40
  }
  if (contact.nodeType === 'mentor') {
    score += 30
  }
  if (contact.nodeType === 'superior') {
    score += 20
  }

  score += (contact.affinity / 10) * 30

  return Math.round(Math.min(score, 100))
}

/** 计算社交影响力 */
function computeSocialInfluence(contact: Contact): number {
  let score = 0

  // 圈层权重
  const tierWeights: Record<NetworkTier, number> = {
    core: 40,
    active: 30,
    extended: 20,
    peripheral: 10,
  }
  score += tierWeights[contact.tier]

  // 联系频率
  score += (contact.contactCount / 20) * 30

  // 活跃度
  if (contact.lastContactAt) {
    const daysSince = Math.floor(
      (Date.now() - new Date(contact.lastContactAt).getTime()) / 86400000,
    )
    score += Math.max(0, 30 - daysSince)
  }

  return Math.round(Math.min(score, 100))
}

/** 计算影响力趋势 */
function computeInfluenceTrend(
  contact: Contact,
  _connections: CareerConnection[],
): 'rising' | 'declining' | 'stable' {
  if (contact.lastContactAt) {
    const daysSince = Math.floor(
      (Date.now() - new Date(contact.lastContactAt).getTime()) / 86400000,
    )
    if (daysSince < 7) return 'rising'
    if (daysSince > 30) return 'declining'
  }
  if (contact.contactCount > 10) return 'rising'
  if (contact.contactCount < 3) return 'declining'
  return 'stable'
}

/** 计算介数中心度（简化） */
function computeBetweennessCentrality(
  nodeId: string,
  allIds: string[],
  connections: CareerConnection[],
): number {
  const n = allIds.length
  if (n <= 2) return 0

  let totalPaths = 0
  let pathsThroughNode = 0

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (allIds[i] === nodeId || allIds[j] === nodeId) continue

      // 简化：使用 BFS 找最短路径
      const path = findShortestPath(allIds[i], allIds[j], allIds, connections)
      if (path) {
        totalPaths++
        if (path.includes(nodeId)) {
          pathsThroughNode++
        }
      }
    }
  }

  return totalPaths > 0 ? pathsThroughNode / totalPaths : 0
}

/** 计算接近中心度 */
function computeClosenessCentrality(
  nodeId: string,
  allIds: string[],
  connections: CareerConnection[],
): number {
  let totalDist = 0
  let reachable = 0

  allIds.forEach(targetId => {
    if (targetId === nodeId) return
    const path = findShortestPath(nodeId, targetId, allIds, connections)
    if (path) {
      totalDist += path.length - 1
      reachable++
    }
  })

  return reachable > 0 ? reachable / totalDist : 0
}

/** 计算特征向量中心度 */
function computeEigenvectorCentrality(
  nodeId: string,
  contacts: Contact[],
  connections: CareerConnection[],
): number {
  const neighbors = connections
    .filter(c => c.fromId === nodeId || c.toId === nodeId)
    .map(c => c.fromId === nodeId ? c.toId : c.fromId)

  if (neighbors.length === 0) return 0

  // 邻居的度中心度之和
  let sum = 0
  neighbors.forEach(nId => {
    const nConnections = connections.filter(
      c => c.fromId === nId || c.toId === nId,
    ).length
    sum += nConnections
  })

  return Math.min(sum / (neighbors.length * contacts.length), 1)
}

/** BFS 最短路径 */
function findShortestPath(
  start: string,
  end: string,
  _allIds: string[],
  connections: CareerConnection[],
): string[] | null {
  const visited = new Set<string>()
  const queue: { node: string; path: string[] }[] = [{ node: start, path: [start] }]
  visited.add(start)

  while (queue.length > 0) {
    const { node, path } = queue.shift()!

    if (node === end) return path

    connections
      .filter(c => c.fromId === node || c.toId === node)
      .forEach(c => {
        const neighbor = c.fromId === node ? c.toId : c.fromId
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push({ node: neighbor, path: [...path, neighbor] })
        }
      })
  }

  return null
}

/** 查找关键传播路径 */
function findCriticalPaths(
  sourceId: string,
  contacts: Contact[],
  connections: CareerConnection[],
  maxDist: number,
): string[][] {
  const paths: string[][] = []

  contacts.forEach(contact => {
    if (contact.id === sourceId) return
    const path = findShortestPath(
      sourceId,
      contact.id,
      contacts.map(c => c.id),
      connections,
    )
    if (path && path.length - 1 === maxDist) {
      paths.push(path)
    }
  })

  return paths.slice(0, 5) // 最多 5 条
}

/** 计算聚类系数 */
function computeClusteringCoefficient(
  contacts: Contact[],
  connections: CareerConnection[],
): number {
  let totalCoefficient = 0
  let nodesWithNeighbors = 0

  contacts.forEach(contact => {
    const neighbors = connections
      .filter(c => c.fromId === contact.id || c.toId === contact.id)
      .map(c => c.fromId === contact.id ? c.toId : c.fromId)

    if (neighbors.length < 2) return

    // 计算邻居之间的连接数
    let edgesBetweenNeighbors = 0
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const hasEdge = connections.some(
          c => (c.fromId === neighbors[i] && c.toId === neighbors[j]) ||
               (c.fromId === neighbors[j] && c.toId === neighbors[i]),
        )
        if (hasEdge) edgesBetweenNeighbors++
      }
    }

    const possible = neighbors.length * (neighbors.length - 1) / 2
    totalCoefficient += edgesBetweenNeighbors / possible
    nodesWithNeighbors++
  })

  return nodesWithNeighbors > 0 ? totalCoefficient / nodesWithNeighbors : 0
}

/** 查找连通分量 */
function findConnectedComponents(
  contacts: Contact[],
  connections: CareerConnection[],
): string[][] {
  const visited = new Set<string>()
  const components: string[][] = []

  contacts.forEach(contact => {
    if (visited.has(contact.id)) return

    const component: string[] = []
    const queue = [contact.id]
    visited.add(contact.id)

    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)

      connections
        .filter(c => c.fromId === current || c.toId === current)
        .forEach(c => {
          const neighbor = c.fromId === current ? c.toId : c.fromId
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        })
    }

    components.push(component)
  })

  return components
}

/** 计算网络直径和平均路径长度 */
function computeDiameterAndAvgPath(
  contacts: Contact[],
  connections: CareerConnection[],
): { diameter: number; avgPathLength: number } {
  let maxDist = 0
  let totalDist = 0
  let pathCount = 0

  const ids = contacts.map(c => c.id)

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const path = findShortestPath(ids[i], ids[j], ids, connections)
      if (path) {
        const dist = path.length - 1
        maxDist = Math.max(maxDist, dist)
        totalDist += dist
        pathCount++
      }
    }
  }

  return {
    diameter: maxDist,
    avgPathLength: pathCount > 0 ? totalDist / pathCount : 0,
  }
}

// ---- 可视化数据 ----

/** 网络图可视化数据 */
export interface NetworkVisualization {
  nodes: {
    id: string
    label: string
    tier: NetworkTier
    nodeType: NodeType
    x: number
    y: number
    radius: number
    color: string
    influence: number
  }[]
  edges: {
    source: string
    target: string
    type: ConnectionType
    strength: number
    color: string
  }[]
}

/** 职业路径可视化数据 */
export interface CareerPathVisualization {
  nodes: {
    id: string
    label: string
    organization: string
    level: number
    duration: string
    isPivot: boolean
    x: number
    y: number
  }[]
  edges: {
    source: string
    target: string
    label: string
  }[]
}

/** 技能雷达图数据 */
export interface SkillRadarData {
  category: SkillCategory
  label: string
  currentScore: number
  targetScore: number
  maxScore: number
}

export function useCareerVisualization() {
  const networkViz = ref<NetworkVisualization | null>(null)
  const careerPathViz = ref<CareerPathVisualization | null>(null)
  const skillRadar = ref<SkillRadarData[]>([])

  /** 构建网络可视化数据 */
  function buildNetworkVisualization(
    contacts: Contact[],
    connections: CareerConnection[],
    influenceScores: InfluenceScore[],
    width: number = 800,
    height: number = 600,
  ): NetworkVisualization {
    const influenceMap = new Map(influenceScores.map(s => [s.contactId, s.overallInfluence]))

    // 圈层布局
    const tierRadius: Record<NetworkTier, number> = {
      core: 80,
      active: 160,
      extended: 240,
      peripheral: 320,
    }

    const nodes = contacts.map((contact, i) => {
      const r = tierRadius[contact.tier]
      const angle = (i / contacts.length) * 2 * Math.PI
      const nodeTypeDef = {
        mentor: '#f0c040', colleague: '#6b9fc4', superior: '#c46a5a',
        subordinate: '#8a9a7a', client: '#e0a96d', partner: '#b5707a',
        peer: '#6b9fc4', friend: '#d98c7a', supplier: '#cf8b6b',
        investor: '#8a9a7a', alumni: '#94a3b8',
      }

      return {
        id: contact.id,
        label: contact.name,
        tier: contact.tier,
        nodeType: contact.nodeType,
        x: width / 2 + Math.cos(angle) * r,
        y: height / 2 + Math.sin(angle) * r,
        radius: 6 + (contact.affinity / 10) * 8,
        color: nodeTypeDef[contact.nodeType] || '#94a3b8',
        influence: influenceMap.get(contact.id) || 0,
      }
    })

    const edges = connections.map(c => ({
      source: c.fromId,
      target: c.toId,
      type: c.type,
      strength: c.strength,
      color: {
        collaboration: '#6b9fc4', mentorship: '#f0c040', referral: '#8a9a7a',
        friendship: '#d98c7a', transaction: '#e0a96d', 'alumni-relation': '#b5707a',
      }[c.type] || '#94a3b8',
    }))

    const viz: NetworkVisualization = { nodes, edges }
    networkViz.value = viz
    return viz
  }

  /** 构建职业路径可视化数据 */
  function buildCareerPathVisualization(
    positions: { id: string; title: string; organization: string; startDate: string; endDate?: string; isPivot?: boolean }[],
    width: number = 800,
    height: number = 500,
  ): CareerPathVisualization {
    const sorted = positions.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )

    const margin = 80
    const usableWidth = width - 2 * margin
    const xStep = sorted.length > 1 ? usableWidth / (sorted.length - 1) : 0

    const nodes = sorted.map((pos, i) => ({
      id: pos.id,
      label: pos.title,
      organization: pos.organization,
      level: i,
      duration: pos.endDate
        ? `${pos.startDate} ~ ${pos.endDate}`
        : `${pos.startDate} ~ 至今`,
      isPivot: pos.isPivot || false,
      x: margin + i * xStep,
      y: height / 2 + (i % 2 === 0 ? -60 : 60),
    }))

    const edges: CareerPathVisualization['edges'] = []
    for (let i = 1; i < nodes.length; i++) {
      edges.push({
        source: nodes[i - 1].id,
        target: nodes[i].id,
        label: `${sorted[i - 1].title} → ${sorted[i].title}`,
      })
    }

    const viz: CareerPathVisualization = { nodes, edges }
    careerPathViz.value = viz
    return viz
  }

  /** 构建技能雷达图数据 */
  function buildSkillRadar(
    skills: SkillNode[],
    targetProficiencies?: Record<string, ProficiencyLevel>,
  ): SkillRadarData[] {
    const categoryScores = new Map<SkillCategory, { total: number; count: number; targetTotal: number; targetCount: number }>()

    skills.forEach(s => {
      if (!categoryScores.has(s.category)) {
        categoryScores.set(s.category, { total: 0, count: 0, targetTotal: 0, targetCount: 0 })
      }
      const entry = categoryScores.get(s.category)!
      entry.total += s.proficiencyScore
      entry.count++

      if (targetProficiencies?.[s.id]) {
        const targetLevel = PROFICIENCY_ORDER.indexOf(targetProficiencies[s.id])
        const targetScore = Math.round((targetLevel / 5) * 100)
        entry.targetTotal += targetScore
        entry.targetCount++
      }
    })

    const categoryLabels: Record<SkillCategory, string> = {
      technical: '技术能力',
      soft: '软技能',
      domain: '领域知识',
      leadership: '领导力',
      creative: '创造力',
    }

    const radar: SkillRadarData[] = []
    categoryScores.forEach((data, category) => {
      radar.push({
        category,
        label: categoryLabels[category],
        currentScore: Math.round(data.total / data.count),
        targetScore: data.targetCount > 0
          ? Math.round(data.targetTotal / data.targetCount)
          : Math.round(data.total / data.count) + 20, // 默认目标比当前高 20
        maxScore: 100,
      })
    })

    skillRadar.value = radar
    return radar
  }

  return {
    networkViz,
    careerPathViz,
    skillRadar,
    buildNetworkVisualization,
    buildCareerPathVisualization,
    buildSkillRadar,
  }
}