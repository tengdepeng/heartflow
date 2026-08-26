// ============================================================
// 思绪书房 · 知识图谱桥接层（P16-8）
// 连接搜索与知识图谱，提供关联推荐、知识发现、路径查找
// ============================================================

import type { Note } from '../../types'
import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge } from './knowledge-graph'
import { useKnowledgeGraph } from './knowledge-graph'
import { useFulltextSearch } from './fulltext-search'

// ---- 桥接类型 ----

/** 关联推荐 */
export interface RelatedRecommendation {
  /** 源笔记 */
  source: Note
  /** 推荐笔记 */
  target: Note
  /** 关联分数 0-100 */
  score: number
  /** 关联原因 */
  reasons: RecommendationReason[]
}

/** 关联原因 */
export interface RecommendationReason {
  /** 原因类型 */
  type: 'shared-tag' | 'content-similar' | 'sequential' | 'graph-path' | 'co-cited'
  /** 描述 */
  detail: string
  /** 贡献权重 */
  weight: number
}

/** 知识发现 */
export interface KnowledgeDiscovery {
  /** 发现类型 */
  type: 'cluster' | 'bridge' | 'isolated' | 'hub'
  /** 涉及节点 */
  nodes: KnowledgeNode[]
  /** 发现描述 */
  description: string
  /** 重要性评分 */
  importance: number
  /** 建议操作 */
  action: string
}

/** 知识路径 */
export interface KnowledgePath {
  /** 路径节点 */
  nodes: KnowledgeNode[]
  /** 路径边 */
  edges: KnowledgeEdge[]
  /** 路径总权重 */
  totalWeight: number
  /** 路径长度 */
  length: number
  /** 路径描述 */
  description: string
}

/** 笔记关联图谱上下文 */
export interface NoteGraphContext {
  /** 笔记对应的图谱节点 */
  selfNode: KnowledgeNode | null
  /** 直接邻居 */
  neighbors: KnowledgeNode[]
  /** 连接的边 */
  connections: KnowledgeEdge[]
  /** 所属聚类 */
  cluster: KnowledgeNode[]
  /** 聚类标签 */
  clusterLabel: string
  /** 在图中的中心度 */
  centrality: number
  /** 是否为知识枢纽 */
  isHub: boolean
}

/** 桥接统计 */
export interface BridgeStats {
  /** 图谱节点数 */
  nodeCount: number
  /** 图谱边数 */
  edgeCount: number
  /** 图谱密度 */
  density: number
  /** 连通分量数 */
  components: number
  /** 最大连通分量大小 */
  largestComponentSize: number
  /** 孤立节点数 */
  isolatedNodes: number
  /** 枢纽节点数 */
  hubCount: number
  /** 平均聚类系数 */
  avgClusteringCoefficient: number
}

// ============================================================
// 知识图谱桥接层
// ============================================================

export function useKnowledgeBridge() {
  /** 内部图谱实例 */
  const graphEngine = useKnowledgeGraph(() => [])
  /** 内部搜索引擎 */
  const searchEngine = useFulltextSearch()

  /** 图谱缓存 */
  let cachedGraph: KnowledgeGraph | null = null
  /** 图谱 ↔ 笔记映射 */
  let noteToNodeMap = new Map<string, KnowledgeNode>()
  /** 节点索引 */
  let adjacencyMap = new Map<string, string[]>()

  /**
   * 初始化桥接层：构建图谱并建立索引
   */
  function initialize(notes: Note[]): KnowledgeGraph {
    // 构建图谱
    const getNotes = () => notes
    const engine = useKnowledgeGraph(getNotes)
    cachedGraph = engine.buildGraph()

    // 构建索引
    noteToNodeMap = new Map(
      cachedGraph.nodes
        .filter(n => n.type === 'note' && n.noteId)
        .map(n => [n.noteId!, n]),
    )

    adjacencyMap = new Map()
    for (const node of cachedGraph.nodes) {
      adjacencyMap.set(node.id, [])
    }
    for (const edge of cachedGraph.edges) {
      adjacencyMap.get(edge.source)?.push(edge.target)
      adjacencyMap.get(edge.target)?.push(edge.source)
    }

    // 构建搜索引擎索引
    searchEngine.buildIndex(notes)

    return cachedGraph
  }

  /**
   * 获取笔记的图谱上下文
   */
  function getNoteContext(noteId: string): NoteGraphContext {
    const graph = cachedGraph
    if (!graph) {
      return {
        selfNode: null,
        neighbors: [],
        connections: [],
        cluster: [],
        clusterLabel: '未初始化',
        centrality: 0,
        isHub: false,
      }
    }

    const selfNode = noteToNodeMap.get(noteId) || null
    const nodeId = selfNode?.id || `note:${noteId}`

    // 直接邻居
    const neighborIds = new Set(adjacencyMap.get(nodeId) || [])
    const neighbors = graph.nodes.filter(n => neighborIds.has(n.id))

    // 连接的边
    const connections = graph.edges.filter(
      e => e.source === nodeId || e.target === nodeId,
    )

    // 所属聚类（BFS 扩展 2 层）
    const cluster = findCluster(nodeId, graph, 2)

    // 聚类标签（使用最常见的标签节点）
    const tagNodes = cluster.filter(n => n.type === 'tag')
    let clusterLabel = '未分类'
    if (tagNodes.length > 0) {
      clusterLabel = tagNodes[0].label
    } else if (cluster.length > 1) {
      const noteNodes = cluster.filter(n => n.type === 'note')
      const groups = new Map<string, number>()
      for (const n of noteNodes) {
        groups.set(n.group, (groups.get(n.group) || 0) + 1)
      }
      let maxCount = 0
      for (const [g, c] of groups) {
        if (c > maxCount) {
          maxCount = c
          clusterLabel = g
        }
      }
    }

    // 中心度（度中心性）
    const degree = neighborIds.size
    const maxDegree = Math.max(...[...adjacencyMap.values()].map(a => a.length), 1)
    const centrality = Math.round((degree / maxDegree) * 1000) / 1000

    // 是否为枢纽（度 > 平均值 * 2）
    const avgDegree = graph.nodes.length > 0
      ? graph.edges.length * 2 / graph.nodes.length
      : 0
    const isHub = degree > avgDegree * 2

    return {
      selfNode,
      neighbors,
      connections,
      cluster,
      clusterLabel,
      centrality,
      isHub,
    }
  }

  /**
   * 获取关联推荐（多维度）
   */
  function getRelatedRecommendations(
    noteId: string,
    notes: Note[],
    limit: number = 10,
  ): RelatedRecommendation[] {
    const graph = cachedGraph
    const sourceNote = notes.find(n => n.id === noteId)
    if (!sourceNote || !graph) return []

    const nodeId = `note:${noteId}`
    const candidates = new Map<string, RelatedRecommendation>()

    // 1. 图谱邻居推荐（权重 40%）
    const neighborIds = adjacencyMap.get(nodeId) || []
    for (const neighborId of neighborIds) {
      const neighborNode = graph.nodes.find(n => n.id === neighborId)
      if (!neighborNode?.noteId || neighborNode.noteId === noteId) continue
      const neighborNote = notes.find(n => n.id === neighborNode.noteId)
      if (!neighborNote || neighborNote.deletedAt) continue

      // 找到连接的边
      const edge = graph.edges.find(
        e => (e.source === nodeId && e.target === neighborId) ||
             (e.target === nodeId && e.source === neighborId),
      )

      const reason: RecommendationReason = {
        type: 'graph-path',
        detail: edge?.type === 'tag-shared'
          ? `共享标签: ${neighborNode.label}`
          : edge?.type === 'content-similar'
            ? `内容相似`
            : edge?.type === 'sequence'
              ? '连续创建'
              : '图谱关联',
        weight: 0.4 * (edge?.strength || 1),
      }

      candidates.set(neighborNote.id, {
        source: sourceNote,
        target: neighborNote,
        score: 0,
        reasons: [reason],
      })
    }

    // 2. 标签共享推荐（权重 30%）
    const sourceTagSet = new Set(sourceNote.tags)
    for (const note of notes) {
      if (candidates.has(note.id) || note.id === noteId || note.deletedAt) continue
      const sharedTags = note.tags.filter(t => sourceTagSet.has(t))
      if (sharedTags.length > 0) {
        const reason: RecommendationReason = {
          type: 'shared-tag',
          detail: `共享 ${sharedTags.length} 个标签: ${sharedTags.slice(0, 3).join(', ')}`,
          weight: 0.3 * (sharedTags.length / Math.max(sourceNote.tags.length, 1)),
        }

        if (candidates.has(note.id)) {
          candidates.get(note.id)!.reasons.push(reason)
        } else {
          candidates.set(note.id, {
            source: sourceNote,
            target: note,
            score: 0,
            reasons: [reason],
          })
        }
      }
    }

    // 3. 文本搜索推荐（权重 30%）
    const query = sourceNote.title + ' ' + sourceNote.tags.join(' ')
    const searchResults = searchEngine.search(query, notes, {
      limit: 20,
      minScore: 10,
      titleWeight: 2.0,
      contentWeight: 1.0,
      tagWeight: 3.0,
    })

    for (const result of searchResults) {
      if (result.note.id === noteId || result.note.deletedAt) continue
      const reason: RecommendationReason = {
        type: 'content-similar',
        detail: `搜索相关性: ${result.score}%`,
        weight: 0.3 * (result.score / 100),
      }

      if (candidates.has(result.note.id)) {
        candidates.get(result.note.id)!.reasons.push(reason)
      } else {
        candidates.set(result.note.id, {
          source: sourceNote,
          target: result.note,
          score: 0,
          reasons: [reason],
        })
      }
    }

    // 计算综合分数
    for (const rec of candidates.values()) {
      rec.score = Math.round(
        rec.reasons.reduce((s, r) => s + r.weight * 100, 0),
      )
    }

    // 排序并返回
    return [...candidates.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * 知识发现：分析图谱中的结构模式
   */
  function discoverKnowledge(): KnowledgeDiscovery[] {
    const graph = cachedGraph
    if (!graph) return []

    const discoveries: KnowledgeDiscovery[] = []

    // 1. 发现知识聚类
    const clusters = findGraphClusters(graph)
    for (const cluster of clusters) {
      if (cluster.length >= 3) {
        const tagNodes = cluster.filter(n => n.type === 'tag').map(n => n.label)
        const noteNodes = cluster.filter(n => n.type === 'note')
        discoveries.push({
          type: 'cluster',
          nodes: cluster,
          description: `发现知识聚类：${tagNodes.slice(0, 3).join('、')}（${noteNodes.length} 篇笔记）`,
          importance: Math.min(100, noteNodes.length * 10),
          action: tagNodes.length > 0
            ? `建议创建标签 "${tagNodes[0]}" 的专题笔记`
            : '建议整理该聚类中的关联笔记',
        })
      }
    }

    // 2. 发现桥接节点
    const bridges = findBridges(graph)
    for (const bridge of bridges) {
      discoveries.push({
        type: 'bridge',
        nodes: [bridge],
        description: `知识桥接点: "${bridge.label}" 连接了 ${adjacencyMap.get(bridge.id)?.length || 0} 个不同领域`,
        importance: 60,
        action: '该节点连接了多个知识领域，建议深化关联',
      })
    }

    // 3. 发现孤立节点
    const isolated = graph.nodes.filter(n =>
      n.type === 'note' && (adjacencyMap.get(n.id)?.length || 0) === 0,
    )
    if (isolated.length > 0) {
      discoveries.push({
        type: 'isolated',
        nodes: isolated.slice(0, 5),
        description: `发现 ${isolated.length} 篇孤立笔记，缺少标签或关联`,
        importance: 80,
        action: '建议为这些笔记添加标签，建立知识关联',
      })
    }

    // 4. 发现知识枢纽
    const hubs = graph.nodes.filter(n => {
      const degree = adjacencyMap.get(n.id)?.length || 0
      const avgDegree = graph.nodes.length > 0
        ? graph.edges.length * 2 / graph.nodes.length
        : 0
      return degree > avgDegree * 3 && n.type === 'tag'
    })
    if (hubs.length > 0) {
      discoveries.push({
        type: 'hub',
        nodes: hubs.slice(0, 5),
        description: `发现 ${hubs.length} 个知识枢纽标签: ${hubs.map(h => h.label).join('、')}`,
        importance: 90,
        action: '这些标签是知识体系的核心，建议重点关注',
      })
    }

    return discoveries.sort((a, b) => b.importance - a.importance)
  }

  /**
   * 查找两个笔记之间的知识路径
   */
  function findPath(
    sourceId: string,
    targetId: string,
    maxLength: number = 5,
  ): KnowledgePath | null {
    const graph = cachedGraph
    if (!graph) return null

    const sourceNodeId = `note:${sourceId}`
    const targetNodeId = `note:${targetId}`

    // BFS 找最短路径
    const visited = new Set<string>()
    const parent = new Map<string, string>()
    const parentEdge = new Map<string, KnowledgeEdge>()
    const queue: string[] = [sourceNodeId]
    visited.add(sourceNodeId)

    let pathFound = false
    while (queue.length > 0 && !pathFound) {
      const current = queue.shift()!
      const neighbors = adjacencyMap.get(current) || []

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue
        visited.add(neighbor)
        parent.set(neighbor, current)

        // 找到连接边
        const edge = graph.edges.find(
          e => (e.source === current && e.target === neighbor) ||
               (e.target === current && e.source === neighbor),
        )
        if (edge) parentEdge.set(neighbor, edge)

        if (neighbor === targetNodeId) {
          pathFound = true
          break
        }

        queue.push(neighbor)
      }
    }

    if (!pathFound) return null

    // 回溯路径
    const pathNodeIds: string[] = []
    let current = targetNodeId
    while (current !== sourceNodeId) {
      pathNodeIds.unshift(current)
      current = parent.get(current)!
    }
    pathNodeIds.unshift(sourceNodeId)

    // 限制路径长度
    if (pathNodeIds.length > maxLength + 1) return null

    // 构建路径对象
    const pathNodes: KnowledgeNode[] = []
    const pathEdges: KnowledgeEdge[] = []

    for (let i = 0; i < pathNodeIds.length; i++) {
      const node = graph.nodes.find(n => n.id === pathNodeIds[i])
      if (node) pathNodes.push(node)
      if (i < pathNodeIds.length - 1) {
        const edge = graph.edges.find(
          e => (e.source === pathNodeIds[i] && e.target === pathNodeIds[i + 1]) ||
               (e.target === pathNodeIds[i] && e.source === pathNodeIds[i + 1]),
        )
        if (edge) pathEdges.push(edge)
      }
    }

    const totalWeight = pathEdges.reduce((s, e) => s + e.strength, 0)
    const labels = pathNodes.map(n => n.label).join(' → ')

    return {
      nodes: pathNodes,
      edges: pathEdges,
      totalWeight: Math.round(totalWeight * 100) / 100,
      length: pathEdges.length,
      description: `知识路径: ${labels}`,
    }
  }

  /**
   * 获取图谱统计
   */
  function getBridgeStats(): BridgeStats {
    const graph = cachedGraph
    if (!graph) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        density: 0,
        components: 0,
        largestComponentSize: 0,
        isolatedNodes: 0,
        hubCount: 0,
        avgClusteringCoefficient: 0,
      }
    }

    // 连通分量分析
    const componentSizes = findComponentSizes(graph)
    const largestComponentSize = componentSizes.length > 0
      ? Math.max(...componentSizes)
      : 0
    const isolatedNodes = graph.nodes.filter(
      n => (adjacencyMap.get(n.id)?.length || 0) === 0,
    ).length

    // 枢纽数
    const avgDegree = graph.nodes.length > 0
      ? graph.edges.length * 2 / graph.nodes.length
      : 0
    const hubCount = graph.nodes.filter(
      n => (adjacencyMap.get(n.id)?.length || 0) > avgDegree * 2,
    ).length

    // 平均聚类系数
    const avgClusteringCoefficient = computeAvgClusteringCoefficient(graph)

    return {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      density: graph.stats.density,
      components: componentSizes.length,
      largestComponentSize,
      isolatedNodes,
      hubCount,
      avgClusteringCoefficient,
    }
  }

  /**
   * 基于图谱的语义搜索
   */
  function semanticSearch(
    query: string,
    notes: Note[],
    limit: number = 10,
  ): RelatedRecommendation[] {
    const graph = cachedGraph
    if (!graph) return []

    // 先用全文搜索找到种子笔记
    const searchResults = searchEngine.search(query, notes, {
      limit: 5,
      minScore: 20,
    })

    if (searchResults.length === 0) return []

    // 扩展种子笔记的图谱邻居
    const expanded = new Map<string, RelatedRecommendation>()
    const seedIds = new Set(searchResults.map(r => r.note.id))

    for (const seed of searchResults) {
      const related = getRelatedRecommendations(seed.note.id, notes, 5)
      for (const rec of related) {
        if (seedIds.has(rec.target.id)) continue
        if (!expanded.has(rec.target.id)) {
          expanded.set(rec.target.id, rec)
        } else {
          // 合并分数
          const existing = expanded.get(rec.target.id)!
          existing.score = Math.max(existing.score, rec.score)
          existing.reasons.push(...rec.reasons)
        }
      }
    }

    // 排序
    return [...expanded.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  return {
    initialize,
    getNoteContext,
    getRelatedRecommendations,
    discoverKnowledge,
    findPath,
    semanticSearch,
    getBridgeStats,
    // 暴露底层引擎
    graphEngine,
    searchEngine,
  }
}

// ---- 内部函数 ----

/** 查找聚类（BFS 扩展） */
function findCluster(
  nodeId: string,
  graph: KnowledgeGraph,
  maxDepth: number,
): KnowledgeNode[] {
  const visited = new Set<string>()
  const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }]
  visited.add(nodeId)

  // 构建邻接表
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) adj.set(node.id, [])
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target)
    adj.get(edge.target)?.push(edge.source)
  }

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (depth >= maxDepth) continue

    for (const neighbor of adj.get(id) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push({ id: neighbor, depth: depth + 1 })
      }
    }
  }

  return graph.nodes.filter(n => visited.has(n.id))
}

/** 查找桥接节点 */
function findBridges(graph: KnowledgeGraph): KnowledgeNode[] {
  const bridges: KnowledgeNode[] = []
  const tagNodes = graph.nodes.filter(n => n.type === 'tag')

  // 构建邻接表
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) adj.set(node.id, [])
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target)
    adj.get(edge.target)?.push(edge.source)
  }

  for (const node of tagNodes) {
    const neighbors = adj.get(node.id) || []
    if (neighbors.length <= 1) continue

    // 计算邻居的分组多样性
    const groups = new Set<string>()
    for (const neighborId of neighbors) {
      const neighbor = graph.nodes.find(n => n.id === neighborId)
      if (neighbor?.type === 'note') {
        groups.add(neighbor.group)
      }
    }

    if (groups.size >= 2) {
      bridges.push(node)
    }
  }

  return bridges.slice(0, 5)
}

/** 查找图谱聚类 */
function findGraphClusters(graph: KnowledgeGraph): KnowledgeNode[][] {
  const visited = new Set<string>()
  const clusters: KnowledgeNode[][] = []

  // 构建邻接表
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) adj.set(node.id, [])
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target)
    adj.get(edge.target)?.push(edge.source)
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      const cluster: KnowledgeNode[] = []
      const queue = [node.id]
      visited.add(node.id)

      while (queue.length > 0) {
        const current = queue.shift()!
        const currentNode = graph.nodes.find(n => n.id === current)
        if (currentNode) cluster.push(currentNode)

        for (const neighbor of adj.get(current) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }

      clusters.push(cluster)
    }
  }

  return clusters
}

/** 查找连通分量大小 */
function findComponentSizes(graph: KnowledgeGraph): number[] {
  const visited = new Set<string>()
  const sizes: number[] = []

  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) adj.set(node.id, [])
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target)
    adj.get(edge.target)?.push(edge.source)
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      let size = 0
      const queue = [node.id]
      visited.add(node.id)

      while (queue.length > 0) {
        const current = queue.shift()!
        size++
        for (const neighbor of adj.get(current) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }

      sizes.push(size)
    }
  }

  return sizes
}

/** 计算平均聚类系数 */
function computeAvgClusteringCoefficient(graph: KnowledgeGraph): number {
  if (graph.nodes.length === 0) return 0

  const adj = new Map<string, Set<string>>()
  for (const node of graph.nodes) adj.set(node.id, new Set())
  for (const edge of graph.edges) {
    adj.get(edge.source)?.add(edge.target)
    adj.get(edge.target)?.add(edge.source)
  }

  let totalCoefficient = 0
  let nodeCount = 0

  for (const node of graph.nodes) {
    const neighbors = adj.get(node.id) || new Set()
    const k = neighbors.size

    if (k < 2) {
      // 孤立节点或单邻居节点，聚类系数为 0
      nodeCount++
      continue
    }

    let edgeCount = 0
    const neighborList = [...neighbors]
    for (let i = 0; i < neighborList.length; i++) {
      for (let j = i + 1; j < neighborList.length; j++) {
        if (adj.get(neighborList[i])?.has(neighborList[j])) {
          edgeCount++
        }
      }
    }

    const maxEdges = (k * (k - 1)) / 2
    totalCoefficient += edgeCount / maxEdges
    nodeCount++
  }

  return nodeCount > 0
    ? Math.round((totalCoefficient / nodeCount) * 1000) / 1000
    : 0
}