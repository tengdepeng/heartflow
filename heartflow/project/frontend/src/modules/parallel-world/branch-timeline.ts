// ============================================================
// 平行世界 · 分支时间线可视化 + 分支对比
// 增强功能：
//   1. 分支时间线渲染（多分支并列时间轴）
//   2. 分支对比分析（差异度计算+相似度矩阵）
//   3. 分支合并建议（自动检测可合并分支）
//   4. 分支演变图谱（祖先-后代关系可视化）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { WorldBranch, Checkpoint } from './types'

// ---- 分支时间线节点 ----

/** 时间线节点（检查点在时间轴上的表示） */
export interface TimelineNode {
  id: string
  branchId: string
  branchName: string
  branchColor: string
  label: string
  timestamp: string
  /** 相对时间位置（距起点的天数） */
  dayOffset: number
  /** 是否为分支点 */
  isBranchPoint: boolean
  /** 是否为合并点 */
  isMergePoint: boolean
  tags: string[]
}

/** 分支时间线配置 */
export interface TimelineConfig {
  /** 分支 ID 列表 */
  branchIds: string[]
  /** 时间范围 [开始, 结束] */
  timeRange: [string, string]
  /** 是否显示分支点标记 */
  showBranchPoints: boolean
  /** 是否显示合并点标记 */
  showMergePoints: boolean
  /** 分组方式 */
  groupBy: 'branch' | 'tag' | 'month'
}

// ---- 分支对比 ----

/** 分支差异维度 */
export type DiffDimension =
  | 'checkpointCount' | 'tagDiversity' | 'timeSpan'
  | 'activityDensity' | 'complexity'

/** 分支差异条目 */
export interface BranchDiffEntry {
  dimension: DiffDimension
  label: string
  branchAValue: number
  branchBValue: number
  difference: number
  /** 差异百分比 */
  diffPercent: number
}

/** 分支对比结果 */
export interface BranchComparison {
  branchA: { id: string; name: string; color: string }
  branchB: { id: string; name: string; color: string }
  /** 综合相似度 0-1 */
  similarity: number
  /** 各维度差异 */
  diffs: BranchDiffEntry[]
  /** 共享标签 */
  sharedTags: string[]
  /** 共享检查点数量 */
  sharedCheckpoints: number
  /** 对比时间 */
  comparedAt: string
}

// ---- 分支合并建议 ----

/** 合并建议 */
export interface MergeSuggestion {
  /** 源分支 */
  sourceBranchId: string
  /** 目标分支 */
  targetBranchId: string
  /** 建议合并的理由 */
  reason: string
  /** 合并优先级 1-10 */
  priority: number
  /** 潜在冲突点 */
  conflicts: string[]
}

// ---- 分支演变图谱 ----

/** 分支演变节点 */
export interface EvolutionNode {
  branchId: string
  branchName: string
  branchColor: string
  /** 层级（0 = 根） */
  level: number
  /** 父分支 ID */
  parentId?: string
  /** 子分支 ID 列表 */
  childrenIds: string[]
  /** 检查点数量 */
  checkpointCount: number
  /** 生命周期 */
  lifespan: { start: string; end?: string }
}

/** 分支演变图谱 */
export interface EvolutionGraph {
  nodes: EvolutionNode[]
  /** 根分支 ID */
  rootId: string
  /** 最大深度 */
  maxDepth: number
  /** 总分枝数 */
  totalBranches: number
}

// ---- 存储键 ----

const BRANCH_TIMELINE_STORAGE_KEYS = {
  TIMELINE_CONFIGS: 'hf:parallel-world:timeline-configs',
  COMPARISONS: 'hf:parallel-world:comparisons',
} as const

// ============================================================
// useBranchTimeline — 分支时间线可视化
// ============================================================

export function useBranchTimeline() {
  // 内部状态
  const timelineNodes = ref<TimelineNode[]>([])
  const timelineConfig = ref<TimelineConfig>({
    branchIds: [],
    timeRange: ['', ''],
    showBranchPoints: true,
    showMergePoints: true,
    groupBy: 'branch',
  })

  /** 加载分支数据并生成时间线 */
  function buildTimeline(branches: WorldBranch[], checkpoints: Checkpoint[]): TimelineNode[] {
    const branchMap = new Map(branches.map(b => [b.id, b]))
    const allTimestamps = checkpoints.map(cp => new Date(cp.createdAt).getTime())

    if (allTimestamps.length === 0) {
      timelineNodes.value = []
      return []
    }

    const minTime = Math.min(...allTimestamps)
    const msPerDay = 86400000

    const nodes: TimelineNode[] = checkpoints
      .filter(cp => branchMap.has(cp.branchId))
      .map(cp => {
        const branch = branchMap.get(cp.branchId)!
        const dayOffset = Math.round((new Date(cp.createdAt).getTime() - minTime) / msPerDay)
        return {
          id: cp.id,
          branchId: cp.branchId,
          branchName: branch.name,
          branchColor: branch.color,
          label: cp.label,
          timestamp: cp.createdAt,
          dayOffset,
          isBranchPoint: branch.parentBranchId !== undefined && cp.id === checkpoints[0]?.id,
          isMergePoint: false,
          tags: cp.tags,
        }
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    timelineNodes.value = nodes
    return nodes
  }

  /** 获取按分支分组的时间线 */
  const nodesByBranch = computed(() => {
    const groups: Record<string, TimelineNode[]> = {}
    for (const node of timelineNodes.value) {
      if (!groups[node.branchId]) groups[node.branchId] = []
      groups[node.branchId].push(node)
    }
    return groups
  })

  /** 获取按月份分组的时间线 */
  const nodesByMonth = computed(() => {
    const groups: Record<string, TimelineNode[]> = {}
    for (const node of timelineNodes.value) {
      const month = node.timestamp.substring(0, 7)
      if (!groups[month]) groups[month] = []
      groups[month].push(node)
    }
    return groups
  })

  /** 获取按标签分组的时间线 */
  const nodesByTag = computed(() => {
    const groups: Record<string, TimelineNode[]> = {}
    for (const node of timelineNodes.value) {
      for (const tag of node.tags) {
        if (!groups[tag]) groups[tag] = []
        groups[tag].push(node)
      }
    }
    return groups
  })

  /** 获取分支时间跨度 */
  function getBranchTimeSpan(branchId: string, checkpoints: Checkpoint[]): { start: string; end: string; days: number } {
    const branchCPs = checkpoints
      .filter(cp => cp.branchId === branchId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (branchCPs.length === 0) return { start: '', end: '', days: 0 }

    const start = branchCPs[0].createdAt
    const end = branchCPs[branchCPs.length - 1].createdAt
    const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)

    return { start, end, days }
  }

  /** 获取分支活动密度 */
  function getActivityDensity(branchId: string, checkpoints: Checkpoint[]): number {
    const span = getBranchTimeSpan(branchId, checkpoints)
    if (span.days <= 0) return 0

    const count = checkpoints.filter(cp => cp.branchId === branchId).length
    return Math.round((count / Math.max(span.days, 1)) * 100) / 100
  }

  return {
    timelineNodes,
    timelineConfig,
    buildTimeline,
    nodesByBranch,
    nodesByMonth,
    nodesByTag,
    getBranchTimeSpan,
    getActivityDensity,
  }
}

// ============================================================
// useBranchComparison — 分支对比分析
// ============================================================

export function useBranchComparison() {
  const comparisons = ref<BranchComparison[]>([])

  /** 计算两个分支的复杂度（平均描述长度） */
  function getComplexity(branchId: string, checkpoints: Checkpoint[]): number {
    const cpList = checkpoints.filter(cp => cp.branchId === branchId)
    if (cpList.length === 0) return 0
    const avgLen = cpList.reduce((sum, cp) => sum + cp.description.length, 0) / cpList.length
    return Math.round(avgLen)
  }

  /** 在两个分支间进行比较 */
  function compareBranches(
    branchA: WorldBranch,
    branchB: WorldBranch,
    allCheckpoints: Checkpoint[],
  ): BranchComparison {
    const aCPs = allCheckpoints.filter(cp => cp.branchId === branchA.id)
    const bCPs = allCheckpoints.filter(cp => cp.branchId === branchB.id)

    const aTags = new Set(aCPs.flatMap(cp => cp.tags))
    const bTags = new Set(bCPs.flatMap(cp => cp.tags))

    const sharedTags = [...aTags].filter(t => bTags.has(t))
    const sharedCheckpoints = aCPs.filter(cp =>
      bCPs.some(bcp => bcp.label === cp.label)
    ).length

    const aCount = aCPs.length
    const bCount = bCPs.length
    const aTagDiv = aTags.size
    const bTagDiv = bTags.size
    const aComplexity = getComplexity(branchA.id, allCheckpoints)
    const bComplexity = getComplexity(branchB.id, allCheckpoints)

    const diffs: BranchDiffEntry[] = [
      {
        dimension: 'checkpointCount',
        label: '检查点数量',
        branchAValue: aCount,
        branchBValue: bCount,
        difference: Math.abs(aCount - bCount),
        diffPercent: Math.max(aCount, bCount) > 0
          ? Math.round(Math.abs(aCount - bCount) / Math.max(aCount, bCount) * 100)
          : 0,
      },
      {
        dimension: 'tagDiversity',
        label: '标签多样性',
        branchAValue: aTagDiv,
        branchBValue: bTagDiv,
        difference: Math.abs(aTagDiv - bTagDiv),
        diffPercent: Math.max(aTagDiv, bTagDiv) > 0
          ? Math.round(Math.abs(aTagDiv - bTagDiv) / Math.max(aTagDiv, bTagDiv) * 100)
          : 0,
      },
      {
        dimension: 'complexity',
        label: '描述复杂度',
        branchAValue: aComplexity,
        branchBValue: bComplexity,
        difference: Math.abs(aComplexity - bComplexity),
        diffPercent: Math.max(aComplexity, bComplexity) > 0
          ? Math.round(Math.abs(aComplexity - bComplexity) / Math.max(aComplexity, bComplexity) * 100)
          : 0,
      },
    ]

    // 综合相似度：基于标签重叠和检查点数量差异
    const tagSimilarity = Math.max(aTags.size, bTags.size) > 0
      ? sharedTags.length / Math.max(aTags.size, bTags.size)
      : 0
    const countSimilarity = Math.max(aCount, bCount) > 0
      ? 1 - Math.abs(aCount - bCount) / Math.max(aCount, bCount)
      : 0
    const similarity = Math.round((tagSimilarity * 0.6 + countSimilarity * 0.4) * 100) / 100

    const comparison: BranchComparison = {
      branchA: { id: branchA.id, name: branchA.name, color: branchA.color },
      branchB: { id: branchB.id, name: branchB.name, color: branchB.color },
      similarity,
      diffs,
      sharedTags,
      sharedCheckpoints,
      comparedAt: new Date().toISOString(),
    }

    comparisons.value.push(comparison)
    return comparison
  }

  /** 比较所有分支对，生成相似度矩阵 */
  function buildSimilarityMatrix(
    branches: WorldBranch[],
    allCheckpoints: Checkpoint[],
  ): { rows: string[]; cols: string[]; matrix: number[][] } {
    const names = branches.map(b => b.name)
    const matrix: number[][] = []

    for (const a of branches) {
      const row: number[] = []
      for (const b of branches) {
        if (a.id === b.id) {
          row.push(1)
        } else {
          const comp = compareBranches(a, b, allCheckpoints)
          row.push(comp.similarity)
        }
      }
      matrix.push(row)
    }

    return { rows: names, cols: names, matrix }
  }

  /** 获取分支对比历史 */
  function getComparisonHistory(): BranchComparison[] {
    const stored = storage.getKV<BranchComparison[]>(BRANCH_TIMELINE_STORAGE_KEYS.COMPARISONS, [])
    if (stored) {
      comparisons.value = stored
    }
    return comparisons.value
  }

  /** 保存对比历史 */
  function saveComparisonHistory(): void {
    storage.setKV(BRANCH_TIMELINE_STORAGE_KEYS.COMPARISONS, comparisons.value)
  }

  return {
    comparisons,
    compareBranches,
    buildSimilarityMatrix,
    getComparisonHistory,
    saveComparisonHistory,
  }
}

// ============================================================
// useMergeSuggestions — 分支合并建议
// ============================================================

export function useMergeSuggestions() {
  const suggestions = ref<MergeSuggestion[]>([])

  /** 检测可合并的分支对 */
  function detectMergeOpportunities(
    branches: WorldBranch[],
    checkpoints: Checkpoint[],
    similarityThreshold: number = 0.6,
  ): MergeSuggestion[] {
    const results: MergeSuggestion[] = []

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const a = branches[i]
        const b = branches[j]

        const aCPs = checkpoints.filter(cp => cp.branchId === a.id)
        const bCPs = checkpoints.filter(cp => cp.branchId === b.id)

        const aTags = new Set(aCPs.flatMap(cp => cp.tags))
        const bTags = new Set(bCPs.flatMap(cp => cp.tags))
        const sharedTags = [...aTags].filter(t => bTags.has(t))

        const tagOverlap = Math.max(aTags.size, bTags.size) > 0
          ? sharedTags.length / Math.max(aTags.size, bTags.size)
          : 0

        if (tagOverlap >= similarityThreshold) {
          const conflicts: string[] = []

          // 检查时间重叠
          const aStart = aCPs.length > 0 ? new Date(aCPs[0].createdAt).getTime() : 0
          const aEnd = aCPs.length > 0 ? new Date(aCPs[aCPs.length - 1].createdAt).getTime() : 0
          const bStart = bCPs.length > 0 ? new Date(bCPs[0].createdAt).getTime() : 0
          const bEnd = bCPs.length > 0 ? new Date(bCPs[bCPs.length - 1].createdAt).getTime() : 0

          if (aStart < bEnd && bStart < aEnd) {
            conflicts.push('时间范围重叠')
          }
          if (a.isActive && b.isActive) {
            conflicts.push('两个分支均处于活跃状态')
          }

          results.push({
            sourceBranchId: a.id,
            targetBranchId: b.id,
            reason: `共享 ${sharedTags.length} 个标签 (${sharedTags.join(', ')})，标签重叠度 ${Math.round(tagOverlap * 100)}%`,
            priority: Math.round(tagOverlap * 10),
            conflicts,
          })
        }
      }
    }

    suggestions.value = results.sort((a, b) => b.priority - a.priority)
    return suggestions.value
  }

  return {
    suggestions,
    detectMergeOpportunities,
  }
}

// ============================================================
// useEvolutionGraph — 分支演变图谱
// ============================================================

export function useEvolutionGraph() {
  const evolutionGraph = ref<EvolutionGraph | null>(null)

  /** 从分支数据构建演变图谱 */
  function buildEvolutionGraph(
    branches: WorldBranch[],
    checkpoints: Checkpoint[],
  ): EvolutionGraph {
    const nodeMap = new Map<string, EvolutionNode>()

    // 先创建所有节点
    for (const branch of branches) {
      const cpCount = checkpoints.filter(cp => cp.branchId === branch.id).length
      const branchCPs = checkpoints
        .filter(cp => cp.branchId === branch.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      nodeMap.set(branch.id, {
        branchId: branch.id,
        branchName: branch.name,
        branchColor: branch.color,
        level: 0,
        parentId: branch.parentBranchId,
        childrenIds: [],
        checkpointCount: cpCount,
        lifespan: {
          start: branchCPs[0]?.createdAt || branch.createdAt,
          end: branchCPs[branchCPs.length - 1]?.createdAt,
        },
      })
    }

    // 建立父子关系
    for (const branch of branches) {
      if (branch.parentBranchId && nodeMap.has(branch.parentBranchId)) {
        const parent = nodeMap.get(branch.parentBranchId)!
        parent.childrenIds.push(branch.id)
      }
    }

    // 计算层级
    function assignLevel(nodeId: string, level: number): void {
      const node = nodeMap.get(nodeId)
      if (!node) return
      node.level = level
      for (const childId of node.childrenIds) {
        assignLevel(childId, level + 1)
      }
    }

    // 找根节点
    const rootBranch = branches.find(b => !b.parentBranchId || !nodeMap.has(b.parentBranchId))
    if (rootBranch) {
      assignLevel(rootBranch.id, 0)
    }

    const nodes = [...nodeMap.values()]
    const maxDepth = Math.max(...nodes.map(n => n.level), 0)

    evolutionGraph.value = {
      nodes,
      rootId: rootBranch?.id || '',
      maxDepth,
      totalBranches: branches.length,
    }

    return evolutionGraph.value
  }

  /** 获取某一层级的所有分支 */
  function getNodesByLevel(level: number): EvolutionNode[] {
    if (!evolutionGraph.value) return []
    return evolutionGraph.value.nodes.filter(n => n.level === level)
  }

  /** 获取分支的祖先链 */
  function getAncestorChain(branchId: string): EvolutionNode[] {
    const chain: EvolutionNode[] = []
    const nodeMap = new Map(evolutionGraph.value?.nodes.map(n => [n.branchId, n]) || [])

    let currentId: string | undefined = branchId
    while (currentId) {
      const node = nodeMap.get(currentId)
      if (!node) break
      chain.unshift(node)
      currentId = node.parentId
    }

    return chain
  }

  return {
    evolutionGraph,
    buildEvolutionGraph,
    getNodesByLevel,
    getAncestorChain,
  }
}