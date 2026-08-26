// ============================================================
// 字镜阁 · 词汇联想网络（P18-5）
// 多跳联想 + 联想强度评分 + 可视化图数据 + 联想路径
// ============================================================

import type { WordEntry } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 联想节点 */
export interface AssociationNode {
  id: string
  word: string
  /** 节点类型 */
  type: 'seed' | 'direct' | 'indirect' | 'bridge'
  /** 联想强度 0-1 */
  strength: number
  /** 距离种子词的跳数 */
  hop: number
  /** 定义 */
  definition?: string
  /** 熟练度 */
  proficiency?: number
}

/** 联想边 */
export interface AssociationEdge {
  source: string
  target: string
  /** 关系类型 */
  relation: AssociationRelation
  /** 关系强度 0-1 */
  strength: number
  /** 关系描述 */
  label: string
}

/** 联想关系类型 */
export type AssociationRelation =
  | 'semantic'      // 语义关联
  | 'phonetic'      // 音韵关联
  | 'radical'       // 部首关联
  | 'contextual'    // 语境关联
  | 'emotional'     // 情感关联
  | 'etymological'  // 词源关联
  | 'collocation'   // 搭配关联
  | 'thematic'      // 主题关联

/** 联想网络图数据 */
export interface AssociationGraph {
  nodes: AssociationNode[]
  edges: AssociationEdge[]
  /** 种子词 */
  seed: string
  /** 总节点数 */
  nodeCount: number
  /** 总边数 */
  edgeCount: number
  /** 最大跳数 */
  maxHop: number
  /** 平均联想强度 */
  avgStrength: number
}

/** 联想路径 */
export interface AssociationPath {
  /** 路径节点 */
  nodes: string[]
  /** 路径边 */
  edges: { from: string; to: string; relation: AssociationRelation }[]
  /** 路径总强度 */
  totalStrength: number
  /** 路径长度 */
  length: number
}

/** 联想配置 */
export interface AssociationConfig {
  /** 最大跳数 */
  maxHops: number
  /** 最小联想强度阈值 */
  minStrength: number
  /** 每层最大节点数 */
  maxNodesPerLayer: number
  /** 是否包含已掌握词汇 */
  includeMastered: boolean
}

/** 联想统计 */
export interface AssociationStats {
  totalAssociations: number
  avgStrength: number
  strongestLink: { source: string; target: string; strength: number } | null
  relationDistribution: Record<AssociationRelation, number>
  bridgeWords: string[]
  isolatedWords: string[]
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: AssociationConfig = {
  maxHops: 3,
  minStrength: 0.2,
  maxNodesPerLayer: 12,
  includeMastered: true,
}

// ============================================================
// 联想关系元数据
// ============================================================

export const ASSOCIATION_RELATION_META: Record<AssociationRelation, { label: string; color: string; weight: number }> = {
  semantic: { label: '语义', color: '#8a9a7a', weight: 1.0 },
  phonetic: { label: '音韵', color: '#f0c040', weight: 0.6 },
  radical: { label: '部首', color: '#6b9fc4', weight: 0.8 },
  contextual: { label: '语境', color: '#d98c7a', weight: 0.7 },
  emotional: { label: '情感', color: '#c46a5a', weight: 0.5 },
  etymological: { label: '词源', color: '#b5707a', weight: 0.9 },
  collocation: { label: '搭配', color: '#6b9fc4', weight: 0.7 },
  thematic: { label: '主题', color: '#e0a96d', weight: 0.8 },
}

// ============================================================
// 内置联想词库
// ============================================================

interface RawAssociation {
  word: string
  associations: { target: string; relation: AssociationRelation; strength: number }[]
}

const BUILTIN_ASSOCIATIONS: RawAssociation[] = [
  // ---- 自然 ----
  {
    word: '山',
    associations: [
      { target: '水', relation: 'semantic', strength: 0.9 },
      { target: '峰', relation: 'semantic', strength: 0.8 },
      { target: '岭', relation: 'semantic', strength: 0.7 },
      { target: '岳', relation: 'semantic', strength: 0.7 },
      { target: '岩', relation: 'radical', strength: 0.6 },
      { target: '高', relation: 'contextual', strength: 0.5 },
      { target: '登', relation: 'collocation', strength: 0.7 },
    ],
  },
  {
    word: '水',
    associations: [
      { target: '山', relation: 'semantic', strength: 0.9 },
      { target: '河', relation: 'semantic', strength: 0.8 },
      { target: '海', relation: 'semantic', strength: 0.8 },
      { target: '流', relation: 'semantic', strength: 0.7 },
      { target: '泉', relation: 'semantic', strength: 0.6 },
      { target: '冰', relation: 'radical', strength: 0.6 },
      { target: '喝', relation: 'collocation', strength: 0.5 },
    ],
  },
  {
    word: '月',
    associations: [
      { target: '日', relation: 'semantic', strength: 0.9 },
      { target: '星', relation: 'semantic', strength: 0.8 },
      { target: '夜', relation: 'contextual', strength: 0.8 },
      { target: '光', relation: 'contextual', strength: 0.6 },
      { target: '明', relation: 'radical', strength: 0.5 },
      { target: '圆', relation: 'collocation', strength: 0.7 },
      { target: '思乡', relation: 'emotional', strength: 0.6 },
    ],
  },
  {
    word: '风',
    associations: [
      { target: '雨', relation: 'semantic', strength: 0.8 },
      { target: '云', relation: 'semantic', strength: 0.7 },
      { target: '吹', relation: 'collocation', strength: 0.7 },
      { target: '轻', relation: 'contextual', strength: 0.5 },
      { target: '自由', relation: 'emotional', strength: 0.6 },
      { target: '春', relation: 'thematic', strength: 0.5 },
    ],
  },
  // ---- 情感 ----
  {
    word: '爱',
    associations: [
      { target: '情', relation: 'semantic', strength: 0.9 },
      { target: '心', relation: 'semantic', strength: 0.8 },
      { target: '恨', relation: 'semantic', strength: 0.7 },
      { target: '喜欢', relation: 'semantic', strength: 0.8 },
      { target: '温暖', relation: 'emotional', strength: 0.7 },
      { target: '家', relation: 'contextual', strength: 0.6 },
      { target: '奉献', relation: 'thematic', strength: 0.5 },
    ],
  },
  {
    word: '梦',
    associations: [
      { target: '想', relation: 'semantic', strength: 0.8 },
      { target: '醒', relation: 'semantic', strength: 0.7 },
      { target: '幻', relation: 'semantic', strength: 0.6 },
      { target: '夜', relation: 'contextual', strength: 0.7 },
      { target: '追求', relation: 'emotional', strength: 0.6 },
      { target: '未来', relation: 'thematic', strength: 0.5 },
    ],
  },
  // ---- 智慧 ----
  {
    word: '知',
    associations: [
      { target: '道', relation: 'semantic', strength: 0.9 },
      { target: '识', relation: 'semantic', strength: 0.8 },
      { target: '智', relation: 'semantic', strength: 0.8 },
      { target: '学', relation: 'contextual', strength: 0.7 },
      { target: '悟', relation: 'thematic', strength: 0.6 },
      { target: '行', relation: 'semantic', strength: 0.7 },
    ],
  },
  {
    word: '思',
    associations: [
      { target: '想', relation: 'semantic', strength: 0.9 },
      { target: '考', relation: 'semantic', strength: 0.8 },
      { target: '虑', relation: 'semantic', strength: 0.7 },
      { target: '念', relation: 'semantic', strength: 0.6 },
      { target: '深', relation: 'contextual', strength: 0.5 },
      { target: '哲学', relation: 'thematic', strength: 0.5 },
    ],
  },
  // ---- 行动 ----
  {
    word: '行',
    associations: [
      { target: '走', relation: 'semantic', strength: 0.8 },
      { target: '动', relation: 'semantic', strength: 0.8 },
      { target: '知', relation: 'semantic', strength: 0.7 },
      { target: '路', relation: 'contextual', strength: 0.6 },
      { target: '实践', relation: 'thematic', strength: 0.7 },
      { target: '旅', relation: 'semantic', strength: 0.5 },
    ],
  },
  {
    word: '建',
    associations: [
      { target: '造', relation: 'semantic', strength: 0.9 },
      { target: '设', relation: 'semantic', strength: 0.8 },
      { target: '立', relation: 'semantic', strength: 0.7 },
      { target: '筑', relation: 'semantic', strength: 0.7 },
      { target: '创', relation: 'thematic', strength: 0.6 },
      { target: '基础', relation: 'contextual', strength: 0.5 },
    ],
  },
  // ---- 时间 ----
  {
    word: '时',
    associations: [
      { target: '间', relation: 'semantic', strength: 0.9 },
      { target: '光', relation: 'semantic', strength: 0.7 },
      { target: '刻', relation: 'semantic', strength: 0.7 },
      { target: '代', relation: 'semantic', strength: 0.6 },
      { target: '流逝', relation: 'emotional', strength: 0.6 },
      { target: '珍惜', relation: 'thematic', strength: 0.5 },
    ],
  },
  // ---- 关系 ----
  {
    word: '友',
    associations: [
      { target: '朋', relation: 'semantic', strength: 0.9 },
      { target: '谊', relation: 'semantic', strength: 0.8 },
      { target: '情', relation: 'semantic', strength: 0.7 },
      { target: '伴', relation: 'semantic', strength: 0.6 },
      { target: '信任', relation: 'emotional', strength: 0.7 },
      { target: '陪伴', relation: 'contextual', strength: 0.6 },
    ],
  },
  {
    word: '家',
    associations: [
      { target: '庭', relation: 'semantic', strength: 0.9 },
      { target: '人', relation: 'semantic', strength: 0.8 },
      { target: '园', relation: 'semantic', strength: 0.7 },
      { target: '温暖', relation: 'emotional', strength: 0.8 },
      { target: '归属', relation: 'emotional', strength: 0.7 },
      { target: '根', relation: 'thematic', strength: 0.6 },
    ],
  },
  // ---- 美学 ----
  {
    word: '美',
    associations: [
      { target: '丽', relation: 'semantic', strength: 0.8 },
      { target: '好', relation: 'semantic', strength: 0.7 },
      { target: '善', relation: 'semantic', strength: 0.7 },
      { target: '艺术', relation: 'thematic', strength: 0.6 },
      { target: '欣赏', relation: 'contextual', strength: 0.5 },
      { target: '和谐', relation: 'emotional', strength: 0.6 },
    ],
  },
  {
    word: '静',
    associations: [
      { target: '安', relation: 'semantic', strength: 0.8 },
      { target: '宁', relation: 'semantic', strength: 0.8 },
      { target: '谧', relation: 'semantic', strength: 0.7 },
      { target: '默', relation: 'semantic', strength: 0.6 },
      { target: '平和', relation: 'emotional', strength: 0.7 },
      { target: '禅', relation: 'thematic', strength: 0.5 },
    ],
  },
  // ---- 抽象 ----
  {
    word: '道',
    associations: [
      { target: '德', relation: 'semantic', strength: 0.8 },
      { target: '路', relation: 'semantic', strength: 0.7 },
      { target: '理', relation: 'semantic', strength: 0.7 },
      { target: '法', relation: 'semantic', strength: 0.6 },
      { target: '自然', relation: 'thematic', strength: 0.7 },
      { target: '修行', relation: 'contextual', strength: 0.5 },
    ],
  },
  {
    word: '真',
    associations: [
      { target: '实', relation: 'semantic', strength: 0.8 },
      { target: '诚', relation: 'semantic', strength: 0.8 },
      { target: '理', relation: 'semantic', strength: 0.7 },
      { target: '善', relation: 'semantic', strength: 0.6 },
      { target: '纯粹', relation: 'emotional', strength: 0.6 },
      { target: '本', relation: 'thematic', strength: 0.5 },
    ],
  },
]

// ============================================================
// useWordAssociation
// ============================================================

export function useWordAssociation() {
  // ---- 用户自定义联想 ----
  let customAssociations: RawAssociation[] = []

  /** 加载自定义联想 */
  function loadCustom(associations: RawAssociation[]) {
    customAssociations = associations
  }

  /** 添加自定义联想 */
  function addCustom(word: string, target: string, relation: AssociationRelation, strength: number) {
    const existing = customAssociations.find(a => a.word === word)
    if (existing) {
      const dup = existing.associations.find(a => a.target === target)
      if (dup) {
        dup.relation = relation
        dup.strength = strength
      } else {
        existing.associations.push({ target, relation, strength })
      }
    } else {
      customAssociations.push({ word, associations: [{ target, relation, strength }] })
    }
  }

  /** 获取某词的所有联想 */
  function getAssociations(word: string): { target: string; relation: AssociationRelation; strength: number }[] {
    const builtin = BUILTIN_ASSOCIATIONS.find(a => a.word === word)
    const custom = customAssociations.find(a => a.word === word)
    const results: { target: string; relation: AssociationRelation; strength: number }[] = []

    if (builtin) results.push(...builtin.associations)
    if (custom) {
      for (const c of custom.associations) {
        const idx = results.findIndex(r => r.target === c.target)
        if (idx >= 0) {
          results[idx] = c // 自定义覆盖内置
        } else {
          results.push(c)
        }
      }
    }

    return results.sort((a, b) => b.strength - a.strength)
  }

  // ---- 构建联想网络图 ----
  function buildGraph(
    seedWord: string,
    userWords: WordEntry[] = [],
    config: Partial<AssociationConfig> = {},
  ): AssociationGraph {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    const nodes = new Map<string, AssociationNode>()
    const edges: AssociationEdge[] = []
    const visited = new Set<string>()

    // 种子节点
    const seedDef = userWords.find(w => w.word === seedWord)
    nodes.set(seedWord, {
      id: seedWord,
      word: seedWord,
      type: 'seed',
      strength: 1.0,
      hop: 0,
      definition: seedDef?.definition,
      proficiency: seedDef?.proficiency,
    })
    visited.add(seedWord)

    // BFS 构建多层联想
    const queue: { word: string; hop: number }[] = [{ word: seedWord, hop: 0 }]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.hop >= cfg.maxHops) continue

      const associations = getAssociations(current.word)
      let layerCount = 0

      for (const assoc of associations) {
        if (assoc.strength < cfg.minStrength) continue
        if (layerCount >= cfg.maxNodesPerLayer) break

        // 添加目标节点
        if (!visited.has(assoc.target)) {
          const targetDef = userWords.find(w => w.word === assoc.target)
          const hop = current.hop + 1
          const nodeType: AssociationNode['type'] = hop === 1 ? 'direct' : hop === 2 ? 'indirect' : 'bridge'

          nodes.set(assoc.target, {
            id: assoc.target,
            word: assoc.target,
            type: nodeType,
            strength: assoc.strength,
            hop,
            definition: targetDef?.definition,
            proficiency: targetDef?.proficiency,
          })
          visited.add(assoc.target)
          queue.push({ word: assoc.target, hop })
          layerCount++
        }

        // 添加边
        edges.push({
          source: current.word,
          target: assoc.target,
          relation: assoc.relation,
          strength: assoc.strength,
          label: ASSOCIATION_RELATION_META[assoc.relation].label,
        })
      }
    }

    const nodeList = [...nodes.values()]
    const avgStrength = nodeList.length > 1
      ? Math.round(nodeList.slice(1).reduce((s, n) => s + n.strength, 0) / (nodeList.length - 1) * 100) / 100
      : 0

    return {
      nodes: nodeList,
      edges,
      seed: seedWord,
      nodeCount: nodeList.length,
      edgeCount: edges.length,
      maxHop: nodeList.reduce((max, n) => Math.max(max, n.hop), 0),
      avgStrength,
    }
  }

  // ---- 查找联想路径 ----
  function findPaths(
    graph: AssociationGraph,
    from: string,
    to: string,
    maxPaths: number = 3,
  ): AssociationPath[] {
    const paths: AssociationPath[] = []
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]))

    if (!nodeMap.has(from) || !nodeMap.has(to)) return paths

    // DFS 查找所有路径
    const visited = new Set<string>()
    const currentPath: string[] = []

    function dfs(current: string) {
      if (paths.length >= maxPaths) return
      if (current === to) {
        const pathEdges: AssociationPath['edges'] = []
        let totalStrength = 0
        for (let i = 0; i < currentPath.length - 1; i++) {
          const edge = graph.edges.find(
            e => e.source === currentPath[i] && e.target === currentPath[i + 1],
          )
          if (edge) {
            pathEdges.push({ from: edge.source, to: edge.target, relation: edge.relation })
            totalStrength += edge.strength
          }
        }
        paths.push({
          nodes: [...currentPath],
          edges: pathEdges,
          totalStrength: Math.round(totalStrength * 100) / 100,
          length: currentPath.length - 1,
        })
        return
      }

      const outgoing = graph.edges.filter(e => e.source === current)
      for (const edge of outgoing) {
        if (visited.has(edge.target)) continue
        if (currentPath.length > 6) continue // 最大路径长度

        visited.add(edge.target)
        currentPath.push(edge.target)
        dfs(edge.target)
        currentPath.pop()
        visited.delete(edge.target)
      }
    }

    visited.add(from)
    currentPath.push(from)
    dfs(from)

    return paths.sort((a, b) => b.totalStrength - a.totalStrength)
  }

  // ---- 联想统计 ----
  function getStats(graph: AssociationGraph): AssociationStats {
    const relationDist: Record<string, number> = {}
    for (const edge of graph.edges) {
      relationDist[edge.relation] = (relationDist[edge.relation] || 0) + 1
    }

    // 最强关联
    let strongestLink: AssociationStats['strongestLink'] = null
    for (const edge of graph.edges) {
      if (!strongestLink || edge.strength > strongestLink.strength) {
        strongestLink = { source: edge.source, target: edge.target, strength: edge.strength }
      }
    }

    // 桥接词（连接多个不同方向的词）
    const connections = new Map<string, Set<string>>()
    for (const edge of graph.edges) {
      if (!connections.has(edge.source)) connections.set(edge.source, new Set())
      if (!connections.has(edge.target)) connections.set(edge.target, new Set())
      connections.get(edge.source)!.add(edge.target)
      connections.get(edge.target)!.add(edge.source)
    }

    const avgConnections = [...connections.values()].reduce((s, c) => s + c.size, 0) / connections.size
    const bridgeWords = [...connections.entries()]
      .filter(([_, c]) => c.size >= avgConnections * 1.5 && c.size >= 3)
      .map(([word]) => word)

    const isolatedWords = [...connections.entries()]
      .filter(([_, c]) => c.size <= 1)
      .map(([word]) => word)

    return {
      totalAssociations: graph.edgeCount,
      avgStrength: graph.avgStrength,
      strongestLink,
      relationDistribution: relationDist as Record<AssociationRelation, number>,
      bridgeWords,
      isolatedWords,
    }
  }

  // ---- 获取联想簇 ----
  function getClusters(graph: AssociationGraph): { center: string; members: string[]; theme: string }[] {
    const clusters: { center: string; members: string[]; theme: string }[] = []

    // 按关系类型聚类
    const byRelation = new Map<AssociationRelation, Set<string>>()
    for (const edge of graph.edges) {
      if (!byRelation.has(edge.relation)) byRelation.set(edge.relation, new Set())
      byRelation.get(edge.relation)!.add(edge.source)
      byRelation.get(edge.relation)!.add(edge.target)
    }

    for (const [relation, members] of byRelation) {
      if (members.size >= 2) {
        clusters.push({
          center: [...members][0],
          members: [...members],
          theme: ASSOCIATION_RELATION_META[relation].label,
        })
      }
    }

    return clusters
  }

  // ---- 反向联想（哪些词能联想到目标词） ----
  function getReverseAssociations(targetWord: string, graph: AssociationGraph): AssociationNode[] {
    const incoming = graph.edges
      .filter(e => e.target === targetWord)
      .map(e => graph.nodes.find(n => n.id === e.source))
      .filter((n): n is AssociationNode => n !== undefined)

    return incoming.sort((a, b) => b.strength - a.strength)
  }

  return {
    buildGraph,
    findPaths,
    getStats,
    getClusters,
    getAssociations,
    getReverseAssociations,
    addCustom,
    loadCustom,
    BUILTIN_ASSOCIATIONS,
    ASSOCIATION_RELATION_META,
  }
}