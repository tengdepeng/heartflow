// ============================================================
// 根脉之庭 · 溯源树编织 + 节点连接建议
// 蓝图定义：
//   溯源树编织：三层结构（根系→树干→枝桠），自动连线
//   节点连接建议：基于标签/时期/文本相似度的智能建议
// ============================================================

import type { Root, RootLayer } from './types'
import { LAYER_CONFIG } from './types'

// ---- 溯源树 ----

export interface TraceTreeNode {
  /** 根系节点 */
  root: Root
  /** 子节点 */
  children: TraceTreeNode[]
  /** 该节点在树中的层级深度 */
  depth: number
}

export interface TraceTree {
  /** 三层根节点 */
  soil: TraceTreeNode[]
  /** 树干层节点 */
  era: TraceTreeNode[]
  /** 枝桠层节点 */
  branch: TraceTreeNode[]
  /** 所有节点扁平列表 */
  flatNodes: TraceTreeNode[]
  /** 连线列表 */
  threads: TraceThread[]
}

export interface TraceThread {
  sourceId: string
  targetId: string
  /** 连线原因 */
  reason: ThreadReason
  /** 连线强度 0-1 */
  strength: number
}

export type ThreadReason =
  | 'shared_tag'       // 共享标签
  | 'same_era'         // 相同时期
  | 'manual'           // 手动关联
  | 'text_similarity'  // 文本相似
  | 'layer_bridge'     // 跨层桥接

/** 编织溯源树 */
export function weaveTraceTree(roots: Root[]): TraceTree {
  const soilNodes = roots
    .filter(r => r.layer === 'soil')
    .map(r => createTreeNode(r, 0))
  const eraNodes = roots
    .filter(r => r.layer === 'era')
    .map(r => createTreeNode(r, 0))
  const branchNodes = roots
    .filter(r => r.layer === 'branch')
    .map(r => createTreeNode(r, 0))

  const allNodes = [...soilNodes, ...eraNodes, ...branchNodes]
  const flatNodes = allNodes

  // 构建连线
  const threads = buildThreads(roots)

  // 构建父子关系：跨层连接
  buildParentChild(soilNodes, eraNodes, threads)
  buildParentChild(eraNodes, branchNodes, threads)

  return { soil: soilNodes, era: eraNodes, branch: branchNodes, flatNodes, threads }
}

function createTreeNode(root: Root, depth: number): TraceTreeNode {
  return { root, children: [], depth }
}

// ---- 连线构建 ----

function buildThreads(roots: Root[]): TraceThread[] {
  const threads: TraceThread[] = []
  const seen = new Set<string>()

  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i]
      const b = roots[j]
      const pairKey = [a.id, b.id].sort().join('::')

      if (seen.has(pairKey)) continue

      // 手动关联
      if (a.connections.includes(b.id) || b.connections.includes(a.id)) {
        seen.add(pairKey)
        threads.push({
          sourceId: a.id,
          targetId: b.id,
          reason: 'manual',
          strength: 0.9,
        })
        continue
      }

      // 共享标签
      const sharedTags = a.tags.filter(t => b.tags.includes(t))
      if (sharedTags.length > 0) {
        seen.add(pairKey)
        threads.push({
          sourceId: a.id,
          targetId: b.id,
          reason: 'shared_tag',
          strength: Math.min(0.8, 0.3 + sharedTags.length * 0.15),
        })
        continue
      }

      // 相同时期
      if (a.era && b.era && a.era === b.era) {
        seen.add(pairKey)
        threads.push({
          sourceId: a.id,
          targetId: b.id,
          reason: 'same_era',
          strength: 0.5,
        })
        continue
      }

      // 跨层桥接：不同层但文本相似
      if (a.layer !== b.layer && textSimilarity(a.text, b.text) > 0.3) {
        seen.add(pairKey)
        threads.push({
          sourceId: a.id,
          targetId: b.id,
          reason: 'layer_bridge',
          strength: 0.4,
        })
      }
    }
  }

  return threads
}

// ---- 父子关系构建 ----

function buildParentChild(
  parents: TraceTreeNode[],
  children: TraceTreeNode[],
  threads: TraceThread[],
) {
  for (const child of children) {
    let bestParent: TraceTreeNode | null = null
    let bestStrength = 0

    for (const parent of parents) {
      // 找到连接到此父节点的最长连线
      const thread = threads.find(
        t =>
          (t.sourceId === parent.root.id && t.targetId === child.root.id) ||
          (t.sourceId === child.root.id && t.targetId === parent.root.id),
      )
      if (thread && thread.strength > bestStrength) {
        bestStrength = thread.strength
        bestParent = parent
      }
    }

    if (bestParent) {
      child.depth = bestParent.depth + 1
      bestParent.children.push(child)
    }
  }
}

// ---- 节点连接建议 ----

export interface SuggestedConnection {
  sourceId: string
  targetId: string
  sourceText: string
  targetText: string
  reason: string
  confidence: number
}

/** 为根系节点生成连接建议 */
export function suggestConnections(roots: Root[]): SuggestedConnection[] {
  const suggestions: SuggestedConnection[] = []
  const existingConnections = new Set<string>()

  // 收集已有连接
  for (const r of roots) {
    for (const c of r.connections) {
      existingConnections.add([r.id, c].sort().join('::'))
    }
  }

  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i]
      const b = roots[j]
      const pairKey = [a.id, b.id].sort().join('::')

      // 跳过已有连接
      if (existingConnections.has(pairKey)) continue

      // 共享标签建议
      const sharedTags = a.tags.filter(t => b.tags.includes(t))
      if (sharedTags.length > 0) {
        suggestions.push({
          sourceId: a.id,
          targetId: b.id,
          sourceText: a.text,
          targetText: b.text,
          reason: `共享标签: ${sharedTags.join(', ')}`,
          confidence: Math.min(0.9, 0.4 + sharedTags.length * 0.2),
        })
        continue
      }

      // 相同时期建议
      if (a.era && b.era && a.era === b.era) {
        suggestions.push({
          sourceId: a.id,
          targetId: b.id,
          sourceText: a.text,
          targetText: b.text,
          reason: `相同时期: ${a.era}`,
          confidence: 0.5,
        })
        continue
      }

      // 文本相似度建议
      const sim = textSimilarity(a.text, b.text)
      if (sim > 0.25) {
        suggestions.push({
          sourceId: a.id,
          targetId: b.id,
          sourceText: a.text,
          targetText: b.text,
          reason: '文本内容相似',
          confidence: sim,
        })
      }
    }
  }

  // 按置信度降序排列
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// ---- 文本相似度 ----

function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 1))
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 1))

  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let intersection = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++
  }

  const union = wordsA.size + wordsB.size - intersection
  return union > 0 ? intersection / union : 0
}

// ---- 溯源树统计 ----

export interface TreeStats {
  totalNodes: number
  byLayer: { layer: RootLayer; label: string; count: number; color: string }[]
  totalThreads: number
  /** 连线原因分布 */
  threadsByReason: { reason: ThreadReason; count: number }[]
  /** 平均连线强度 */
  avgThreadStrength: number
  /** 最深深度 */
  maxDepth: number
  /** 孤立节点（无连线） */
  isolatedNodes: number
}

export function computeTreeStats(tree: TraceTree): TreeStats {
  const byLayer = [
    { layer: 'soil' as RootLayer, label: LAYER_CONFIG.soil.label, count: tree.soil.length, color: LAYER_CONFIG.soil.color },
    { layer: 'era' as RootLayer, label: LAYER_CONFIG.era.label, count: tree.era.length, color: LAYER_CONFIG.era.color },
    { layer: 'branch' as RootLayer, label: LAYER_CONFIG.branch.label, count: tree.branch.length, color: LAYER_CONFIG.branch.color },
  ]

  // 连线原因分布
  const reasonMap = new Map<ThreadReason, number>()
  for (const t of tree.threads) {
    reasonMap.set(t.reason, (reasonMap.get(t.reason) || 0) + 1)
  }
  const threadsByReason = Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count }))

  const avgThreadStrength = tree.threads.length > 0
    ? tree.threads.reduce((s, t) => s + t.strength, 0) / tree.threads.length
    : 0

  const maxDepth = tree.flatNodes.reduce((max, n) => Math.max(max, n.depth), 0)

  // 孤立节点：没有任何连线
  const connectedIds = new Set<string>()
  for (const t of tree.threads) {
    connectedIds.add(t.sourceId)
    connectedIds.add(t.targetId)
  }
  const isolatedNodes = tree.flatNodes.filter(n => !connectedIds.has(n.root.id)).length

  return { totalNodes: tree.flatNodes.length, byLayer, totalThreads: tree.threads.length, threadsByReason, avgThreadStrength, maxDepth, isolatedNodes }
}