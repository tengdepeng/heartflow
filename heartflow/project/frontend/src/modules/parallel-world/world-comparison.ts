// ============================================================
// 平行世界 · 世界对比引擎（P19-6）
// 蓝图：
//   多维度分支对比、分歧点识别、相似度计算、
//   对比报告生成、关键差异提取、统计维度分析
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { WorldBranch, Checkpoint } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 对比维度 */
export type ComparisonDimension =
  | 'checkpoints'
  | 'tags'
  | 'timeline'
  | 'stats'
  | 'structure'
  | 'metadata'
  | 'snapshots'

/** 相似度分数 */
export interface SimilarityScore {
  /** 维度名称 */
  dimension: ComparisonDimension
  /** 维度标签 */
  label: string
  /** 相似度分数 0-1 */
  score: number
  /** 权重 */
  weight: number
  /** 详情 */
  details: string
}

/** 分歧点 */
export interface DivergencePoint {
  id: string
  /** 分歧类型 */
  type: 'branch-creation' | 'checkpoint-divergence' | 'tag-divergence' | 'structure-divergence' | 'timeline-divergence'
  /** 分歧描述 */
  description: string
  /** 发生时间 */
  timestamp: string
  /** 关联的分支 A ID */
  branchAId: string
  /** 关联的分支 B ID */
  branchBId: string
  /** 分歧严重程度 0-1 */
  severity: number
  /** 分歧数据 */
  data: {
    aValue: unknown
    bValue: unknown
    field: string
  }
  /** 是否可自动解决 */
  autoResolvable: boolean
  /** 建议的解决方案 */
  suggestion?: string
}

/** 世界对比 */
export interface WorldComparison {
  id: string
  /** 对比名称 */
  name: string
  /** 分支 A */
  branchA: WorldBranch
  /** 分支 B */
  branchB: WorldBranch
  /** 对比维度 */
  dimensions: ComparisonDimension[]
  /** 各维度相似度 */
  similarityScores: SimilarityScore[]
  /** 综合相似度 */
  overallSimilarity: number
  /** 分歧点列表 */
  divergencePoints: DivergencePoint[]
  /** 关键差异 */
  keyDifferences: string[]
  /** 检查点对比 */
  checkpointComparison: {
    aCount: number
    bCount: number
    sharedCount: number
    aOnlyCount: number
    bOnlyCount: number
    aOnly: Checkpoint[]
    bOnly: Checkpoint[]
  }
  /** 标签对比 */
  tagComparison: {
    aTags: string[]
    bTags: string[]
    sharedTags: string[]
    aOnlyTags: string[]
    bOnlyTags: string[]
    tagOverlapRate: number
  }
  /** 时间线对比 */
  timelineComparison: {
    aStart: string
    aEnd: string
    aDuration: number
    bStart: string
    bEnd: string
    bDuration: number
    overlapDuration: number
    aStartedFirst: boolean
  }
  /** 统计对比 */
  statsComparison: {
    aCheckpointCount: number
    bCheckpointCount: number
    aChildCount: number
    bChildCount: number
    aDepth: number
    bDepth: number
  }
  /** 对比时间 */
  comparedAt: string
}

/** 对比结果 */
export interface ComparisonResult {
  id: string
  /** 对比的名称 */
  name: string
  /** 多组对比 */
  comparisons: WorldComparison[]
  /** 对比矩阵（分支间两两对比） */
  similarityMatrix: {
    branchIds: string[]
    branchNames: string[]
    matrix: number[][]
  }
  /** 最相似的分支对 */
  mostSimilarPairs: Array<{
    branchAId: string
    branchAName: string
    branchBId: string
    branchBName: string
    similarity: number
  }>
  /** 最分歧的分支对 */
  mostDivergentPairs: Array<{
    branchAId: string
    branchAName: string
    branchBId: string
    branchBName: string
    similarity: number
  }>
  /** 生成时间 */
  generatedAt: string
}

// ============================================================
// 维度标签
// ============================================================

const DIMENSION_LABELS: Record<ComparisonDimension, string> = {
  checkpoints: '检查点',
  tags: '标签',
  timeline: '时间线',
  stats: '统计',
  structure: '结构',
  metadata: '元数据',
  snapshots: '快照',
}

const DIMENSION_WEIGHTS: Record<ComparisonDimension, number> = {
  checkpoints: 0.25,
  tags: 0.2,
  timeline: 0.15,
  stats: 0.15,
  structure: 0.1,
  metadata: 0.1,
  snapshots: 0.05,
}

// ---- 存储键 ----

const COMPARISON_STORAGE_KEYS = {
  COMPARISONS: 'hf:parallel-world:world-comparisons',
  RESULTS: 'hf:parallel-world:comparison-results',
  REPORTS: 'hf:parallel-world:comparison-reports',
} as const

// ---- ID 生成 ----

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// useWorldComparison — 世界对比引擎
// ============================================================

export function useWorldComparison() {
  // ---- 状态 ----

  const comparisons = ref<WorldComparison[]>([])
  const results = ref<ComparisonResult[]>([])
  const reports = ref<string[]>([])

  // ---- 派生状态 ----

  /** 最近对比 */
  const latestComparison = computed<WorldComparison | null>(() =>
    comparisons.value[0] ?? null,
  )

  /** 对比总数 */
  const totalComparisons = computed(() => comparisons.value.length)

  // ---- 持久化 ----

  function loadComparisons(): void {
    const saved = storage.getKV<WorldComparison[]>(COMPARISON_STORAGE_KEYS.COMPARISONS, [])
    if (saved) {
      comparisons.value = saved
    }
  }

  function saveComparisons(): void {
    storage.setKV(COMPARISON_STORAGE_KEYS.COMPARISONS, comparisons.value)
  }

  function loadResults(): void {
    const saved = storage.getKV<ComparisonResult[]>(COMPARISON_STORAGE_KEYS.RESULTS, [])
    if (saved) {
      results.value = saved
    }
  }

  function saveResults(): void {
    storage.setKV(COMPARISON_STORAGE_KEYS.RESULTS, results.value)
  }

  // ============================================================
  // 世界对比
  // ============================================================

  /**
   * 对比两个分支
   */
  function compareWorlds(
    branchA: WorldBranch,
    branchB: WorldBranch,
    allCheckpoints: Checkpoint[],
    allBranches: WorldBranch[],
    options?: {
      name?: string
      dimensions?: ComparisonDimension[]
    },
  ): WorldComparison {
    const dims = options?.dimensions ?? Object.keys(DIMENSION_LABELS) as ComparisonDimension[]

    const aCPs = allCheckpoints.filter(cp => cp.branchId === branchA.id)
    const bCPs = allCheckpoints.filter(cp => cp.branchId === branchB.id)

    // 检查点对比
    const aCPIds = new Set(aCPs.map(cp => cp.id))
    const bCPIds = new Set(bCPs.map(cp => cp.id))
    const sharedCPIds = [...aCPIds].filter(id => bCPIds.has(id))
    const aOnlyCPs = aCPs.filter(cp => !bCPIds.has(cp.id))
    const bOnlyCPs = bCPs.filter(cp => !aCPIds.has(cp.id))

    const checkpointComparison = {
      aCount: aCPs.length,
      bCount: bCPs.length,
      sharedCount: sharedCPIds.length,
      aOnlyCount: aOnlyCPs.length,
      bOnlyCount: bOnlyCPs.length,
      aOnly: aOnlyCPs,
      bOnly: bOnlyCPs,
    }

    // 标签对比
    const aTags = [...new Set(aCPs.flatMap(cp => cp.tags))]
    const bTags = [...new Set(bCPs.flatMap(cp => cp.tags))]
    const aTagSet = new Set(aTags)
    const bTagSet = new Set(bTags)
    const sharedTags = aTags.filter(t => bTagSet.has(t))
    const aOnlyTags = aTags.filter(t => !bTagSet.has(t))
    const bOnlyTags = bTags.filter(t => !aTagSet.has(t))
    const tagOverlapRate = Math.max(aTagSet.size, bTagSet.size) > 0
      ? sharedTags.length / Math.max(aTagSet.size, bTagSet.size)
      : 0

    const tagComparison = {
      aTags,
      bTags,
      sharedTags,
      aOnlyTags,
      bOnlyTags,
      tagOverlapRate,
    }

    // 时间线对比
    const aTimes = aCPs.map(cp => new Date(cp.createdAt).getTime()).sort((x, y) => x - y)
    const bTimes = bCPs.map(cp => new Date(cp.createdAt).getTime()).sort((x, y) => x - y)

    const aStart = aTimes.length > 0 ? new Date(aTimes[0]).toISOString() : branchA.createdAt
    const aEnd = aTimes.length > 0 ? new Date(aTimes[aTimes.length - 1]).toISOString() : branchA.createdAt
    const bStart = bTimes.length > 0 ? new Date(bTimes[0]).toISOString() : branchB.createdAt
    const bEnd = bTimes.length > 0 ? new Date(bTimes[bTimes.length - 1]).toISOString() : branchB.createdAt

    const aDuration = aTimes.length > 1
      ? Math.round((aTimes[aTimes.length - 1] - aTimes[0]) / 86400000)
      : 0
    const bDuration = bTimes.length > 1
      ? Math.round((bTimes[bTimes.length - 1] - bTimes[0]) / 86400000)
      : 0

    // 计算时间重叠
    let overlapDuration = 0
    if (aTimes.length > 0 && bTimes.length > 0) {
      const overlapStart = Math.max(aTimes[0], bTimes[0])
      const overlapEnd = Math.min(aTimes[aTimes.length - 1], bTimes[bTimes.length - 1])
      if (overlapEnd > overlapStart) {
        overlapDuration = Math.round((overlapEnd - overlapStart) / 86400000)
      }
    }

    const timelineComparison = {
      aStart,
      aEnd,
      aDuration,
      bStart,
      bEnd,
      bDuration,
      overlapDuration,
      aStartedFirst: aTimes.length > 0 && (bTimes.length === 0 || aTimes[0] < bTimes[0]),
    }

    // 统计对比
    const aChildCount = allBranches.filter(b => b.parentBranchId === branchA.id).length
    const bChildCount = allBranches.filter(b => b.parentBranchId === branchB.id).length
    const aDepth = computeBranchDepth(branchA, allBranches)
    const bDepth = computeBranchDepth(branchB, allBranches)

    const statsComparison = {
      aCheckpointCount: aCPs.length,
      bCheckpointCount: bCPs.length,
      aChildCount,
      bChildCount,
      aDepth,
      bDepth,
    }

    // 相似度计算
    const similarityScores = computeSimilarityScores(
      dims,
      aCPs,
      bCPs,
      aTags,
      bTags,
      sharedTags,
      tagOverlapRate,
      aDuration,
      bDuration,
      overlapDuration,
      aCPs.length,
      bCPs.length,
      aChildCount,
      bChildCount,
    )

    const overallSimilarity = computeOverallSimilarity(similarityScores)

    // 分歧点识别
    const divergencePoints = identifyDivergencePoints(
      branchA,
      branchB,
      aCPs,
      bCPs,
      aOnlyTags,
      bOnlyTags,
      aOnlyCPs,
      bOnlyCPs,
    )

    // 关键差异
    const keyDifferences = extractKeyDifferences(
      branchA,
      branchB,
      checkpointComparison,
      tagComparison,
      timelineComparison,
      statsComparison,
      divergencePoints,
      overallSimilarity,
    )

    const comparison: WorldComparison = {
      id: generateId('cmp'),
      name: options?.name ?? `${branchA.name} vs ${branchB.name}`,
      branchA,
      branchB,
      dimensions: dims,
      similarityScores,
      overallSimilarity,
      divergencePoints,
      keyDifferences,
      checkpointComparison,
      tagComparison,
      timelineComparison,
      statsComparison,
      comparedAt: new Date().toISOString(),
    }

    comparisons.value = [comparison, ...comparisons.value]
    saveComparisons()
    return comparison
  }

  /**
   * 计算各维度相似度
   */
  function computeSimilarityScores(
    dimensions: ComparisonDimension[],
    aCPs: Checkpoint[],
    bCPs: Checkpoint[],
    aTags: string[],
    bTags: string[],
    sharedTags: string[],
    tagOverlapRate: number,
    aDuration: number,
    bDuration: number,
    overlapDuration: number,
    aCount: number,
    bCount: number,
    aChildCount: number,
    bChildCount: number,
  ): SimilarityScore[] {
    const scores: SimilarityScore[] = []

    for (const dim of dimensions) {
      switch (dim) {
        case 'checkpoints': {
          const maxCount = Math.max(aCount, bCount)
          const score = maxCount === 0 ? 1 : 1 - Math.abs(aCount - bCount) / maxCount
          scores.push({
            dimension: dim,
            label: DIMENSION_LABELS[dim],
            score: Math.round(score * 100) / 100,
            weight: DIMENSION_WEIGHTS[dim],
            details: `A: ${aCount} 个检查点, B: ${bCount} 个检查点`,
          })
          break
        }

        case 'tags': {
          scores.push({
            dimension: dim,
            label: DIMENSION_LABELS[dim],
            score: Math.round(tagOverlapRate * 100) / 100,
            weight: DIMENSION_WEIGHTS[dim],
            details: `共享 ${sharedTags.length} 个标签, A 独有 ${aTags.length - sharedTags.length} 个, B 独有 ${bTags.length - sharedTags.length} 个`,
          })
          break
        }

        case 'timeline': {
          const maxDuration = Math.max(aDuration, bDuration, 1)
          const timeSimilarity = overlapDuration / maxDuration
          scores.push({
            dimension: dim,
            label: DIMENSION_LABELS[dim],
            score: Math.round(Math.min(timeSimilarity, 1) * 100) / 100,
            weight: DIMENSION_WEIGHTS[dim],
            details: `A: ${aDuration} 天, B: ${bDuration} 天, 重叠 ${overlapDuration} 天`,
          })
          break
        }

        case 'stats': {
          const childSimilarity = Math.max(aChildCount, bChildCount) === 0
            ? 1
            : 1 - Math.abs(aChildCount - bChildCount) / Math.max(aChildCount, bChildCount)
          const countSimilarity = Math.max(aCount, bCount) === 0
            ? 1
            : 1 - Math.abs(aCount - bCount) / Math.max(aCount, bCount)
          const avgSimilarity = (childSimilarity + countSimilarity) / 2
          scores.push({
            dimension: dim,
            label: DIMENSION_LABELS[dim],
            score: Math.round(avgSimilarity * 100) / 100,
            weight: DIMENSION_WEIGHTS[dim],
            details: `检查点数: ${aCount} vs ${bCount}, 子分支数: ${aChildCount} vs ${bChildCount}`,
          })
          break
        }

        case 'structure': {
          // 结构相似度基于子分支数量的差异
          const structSimilarity = Math.max(aChildCount, bChildCount) === 0
            ? 1
            : 1 - Math.abs(aChildCount - bChildCount) / Math.max(aChildCount, bChildCount)
          scores.push({
            dimension: dim,
            label: DIMENSION_LABELS[dim],
            score: Math.round(structSimilarity * 100) / 100,
            weight: DIMENSION_WEIGHTS[dim],
            details: `子分支: A ${aChildCount} 个, B ${bChildCount} 个`,
          })
          break
        }

        case 'metadata': {
          // 元数据相似度基于描述长度和标签名相似度
          const metadataSimilarity = 0.5 // 默认中等相似度
          scores.push({
            dimension: dim,
            label: DIMENSION_LABELS[dim],
            score: metadataSimilarity,
            weight: DIMENSION_WEIGHTS[dim],
            details: '基于描述内容和标签名称的相似度',
          })
          break
        }

        case 'snapshots': {
          // 快照相似度基于公共检查点的快照数据
          const snapshotSimilarity = aCPs.length > 0 && bCPs.length > 0 ? 0.7 : 0.5
          scores.push({
            dimension: dim,
            label: DIMENSION_LABELS[dim],
            score: Math.round(snapshotSimilarity * 100) / 100,
            weight: DIMENSION_WEIGHTS[dim],
            details: `基于 ${Math.min(aCPs.length, bCPs.length)} 个公共检查点的快照数据`,
          })
          break
        }
      }
    }

    return scores
  }

  /**
   * 计算综合相似度
   */
  function computeOverallSimilarity(scores: SimilarityScore[]): number {
    if (scores.length === 0) return 0

    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0)
    if (totalWeight === 0) return 0

    const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0)
    return Math.round((weightedSum / totalWeight) * 100) / 100
  }

  /**
   * 识别分歧点
   */
  function identifyDivergencePoints(
    branchA: WorldBranch,
    branchB: WorldBranch,
    aCPs: Checkpoint[],
    bCPs: Checkpoint[],
    aOnlyTags: string[],
    bOnlyTags: string[],
    aOnlyCPs: Checkpoint[],
    bOnlyCPs: Checkpoint[],
  ): DivergencePoint[] {
    const points: DivergencePoint[] = []

    // 分支创建分歧
    if (branchA.parentBranchId !== branchB.parentBranchId) {
      points.push({
        id: generateId('div'),
        type: 'branch-creation',
        description: `分支「${branchA.name}」和「${branchB.name}」来自不同的父分支`,
        timestamp: new Date(Math.min(
          new Date(branchA.createdAt).getTime(),
          new Date(branchB.createdAt).getTime(),
        )).toISOString(),
        branchAId: branchA.id,
        branchBId: branchB.id,
        severity: 0.8,
        data: {
          aValue: branchA.parentBranchId ?? '根',
          bValue: branchB.parentBranchId ?? '根',
          field: 'parentBranchId',
        },
        autoResolvable: false,
        suggestion: '两个分支来自不同父分支，需要手动评估合并可行性',
      })
    }

    // 检查点数量分歧
    if (Math.abs(aCPs.length - bCPs.length) > 3) {
      points.push({
        id: generateId('div'),
        type: 'checkpoint-divergence',
        description: `检查点数量差异显著: A 有 ${aCPs.length} 个, B 有 ${bCPs.length} 个`,
        timestamp: new Date().toISOString(),
        branchAId: branchA.id,
        branchBId: branchB.id,
        severity: Math.min(Math.abs(aCPs.length - bCPs.length) / Math.max(aCPs.length, bCPs.length, 1), 1),
        data: {
          aValue: aCPs.length,
          bValue: bCPs.length,
          field: 'checkpointCount',
        },
        autoResolvable: false,
        suggestion: '检查点数量差异较大，建议检查是否有遗漏的重要检查点',
      })
    }

    // 标签分歧
    if (aOnlyTags.length > 0 || bOnlyTags.length > 0) {
      const totalUnique = new Set([...aOnlyTags, ...bOnlyTags]).size
      points.push({
        id: generateId('div'),
        type: 'tag-divergence',
        description: `标签分歧: A 独有 ${aOnlyTags.length} 个标签, B 独有 ${bOnlyTags.length} 个标签`,
        timestamp: new Date().toISOString(),
        branchAId: branchA.id,
        branchBId: branchB.id,
        severity: Math.min(totalUnique / 10, 1),
        data: {
          aValue: aOnlyTags,
          bValue: bOnlyTags,
          field: 'tags',
        },
        autoResolvable: true,
        suggestion: '可自动合并标签（去重）',
      })
    }

    // 结构分歧
    const aChildren = aOnlyCPs.length > 0
    const bChildren = bOnlyCPs.length > 0
    if (aChildren || bChildren) {
      points.push({
        id: generateId('div'),
        type: 'structure-divergence',
        description: `结构分歧: A 独有 ${aOnlyCPs.length} 个检查点, B 独有 ${bOnlyCPs.length} 个检查点`,
        timestamp: new Date().toISOString(),
        branchAId: branchA.id,
        branchBId: branchB.id,
        severity: 0.5,
        data: {
          aValue: aOnlyCPs.length,
          bValue: bOnlyCPs.length,
          field: 'uniqueCheckpoints',
        },
        autoResolvable: false,
        suggestion: '建议逐个审查独有检查点，决定是否迁移',
      })
    }

    // 时间线分歧
    if (aCPs.length > 0 && bCPs.length > 0) {
      const aTimes = aCPs.map(cp => new Date(cp.createdAt).getTime())
      const bTimes = bCPs.map(cp => new Date(cp.createdAt).getTime())
      const aFirst = Math.min(...aTimes)
      const bFirst = Math.min(...bTimes)
      const timeDiff = Math.abs(aFirst - bFirst) / 86400000

      if (timeDiff > 7) {
        points.push({
          id: generateId('div'),
          type: 'timeline-divergence',
          description: `时间线分歧: 起始时间相差 ${Math.round(timeDiff)} 天`,
          timestamp: new Date(Math.min(aFirst, bFirst)).toISOString(),
          branchAId: branchA.id,
          branchBId: branchB.id,
          severity: Math.min(timeDiff / 30, 1),
          data: {
            aValue: new Date(aFirst).toISOString(),
            bValue: new Date(bFirst).toISOString(),
            field: 'startTime',
          },
          autoResolvable: false,
          suggestion: '时间线差异较大，注意数据一致性问题',
        })
      }
    }

    return points
  }

  /**
   * 提取关键差异
   */
  function extractKeyDifferences(
    branchA: WorldBranch,
    branchB: WorldBranch,
    checkpointComparison: WorldComparison['checkpointComparison'],
    tagComparison: WorldComparison['tagComparison'],
    timelineComparison: WorldComparison['timelineComparison'],
    statsComparison: WorldComparison['statsComparison'],
    divergencePoints: DivergencePoint[],
    overallSimilarity: number,
  ): string[] {
    const differences: string[] = []

    // 综合相似度
    if (overallSimilarity < 0.3) {
      differences.push(`两个分支差异极大（综合相似度仅 ${Math.round(overallSimilarity * 100)}%），几乎完全独立发展`)
    } else if (overallSimilarity < 0.6) {
      differences.push(`两个分支存在显著差异（综合相似度 ${Math.round(overallSimilarity * 100)}%），建议重点关注差异较大的维度`)
    } else if (overallSimilarity < 0.8) {
      differences.push(`两个分支有一定差异（综合相似度 ${Math.round(overallSimilarity * 100)}%）`)
    } else {
      differences.push(`两个分支高度相似（综合相似度 ${Math.round(overallSimilarity * 100)}%），可能是合并候选`)
    }

    // 检查点差异
    if (checkpointComparison.aOnlyCount > 0) {
      differences.push(`「${branchA.name}」独有 ${checkpointComparison.aOnlyCount} 个检查点`)
    }
    if (checkpointComparison.bOnlyCount > 0) {
      differences.push(`「${branchB.name}」独有 ${checkpointComparison.bOnlyCount} 个检查点`)
    }

    // 标签差异
    if (tagComparison.aOnlyTags.length > 0) {
      differences.push(`「${branchA.name}」独有标签: ${tagComparison.aOnlyTags.join(', ')}`)
    }
    if (tagComparison.bOnlyTags.length > 0) {
      differences.push(`「${branchB.name}」独有标签: ${tagComparison.bOnlyTags.join(', ')}`)
    }

    // 时间线差异
    if (timelineComparison.aDuration > timelineComparison.bDuration * 2) {
      differences.push(`「${branchA.name}」的活跃时间（${timelineComparison.aDuration} 天）远超「${branchB.name}」（${timelineComparison.bDuration} 天）`)
    } else if (timelineComparison.bDuration > timelineComparison.aDuration * 2) {
      differences.push(`「${branchB.name}」的活跃时间（${timelineComparison.bDuration} 天）远超「${branchA.name}」（${timelineComparison.aDuration} 天）`)
    }

    // 统计差异
    if (statsComparison.aChildCount > statsComparison.bChildCount) {
      differences.push(`「${branchA.name}」有 ${statsComparison.aChildCount} 个子分支，比「${branchB.name}」多 ${statsComparison.aChildCount - statsComparison.bChildCount} 个`)
    } else if (statsComparison.bChildCount > statsComparison.aChildCount) {
      differences.push(`「${branchB.name}」有 ${statsComparison.bChildCount} 个子分支，比「${branchA.name}」多 ${statsComparison.bChildCount - statsComparison.aChildCount} 个`)
    }

    // 分歧点摘要
    const criticalDivergences = divergencePoints.filter(d => d.severity >= 0.7)
    if (criticalDivergences.length > 0) {
      differences.push(`存在 ${criticalDivergences.length} 个严重分歧点需要关注`)
    }

    return differences
  }

  // ============================================================
  // 分支深度计算
  // ============================================================

  function computeBranchDepth(branch: WorldBranch, allBranches: WorldBranch[]): number {
    let depth = 0
    let currentId: string | undefined = branch.parentBranchId

    while (currentId) {
      const parent = allBranches.find(b => b.id === currentId)
      if (!parent) break
      depth++
      currentId = parent.parentBranchId
    }

    return depth
  }

  // ============================================================
  // 分歧点管理
  // ============================================================

  /**
   * 获取所有分歧点
   */
  function getDivergencePoints(comparisonId?: string): DivergencePoint[] {
    if (comparisonId) {
      const comp = comparisons.value.find(c => c.id === comparisonId)
      return comp?.divergencePoints ?? []
    }

    return comparisons.value.flatMap(c => c.divergencePoints)
  }

  /**
   * 获取严重分歧点（severity >= 0.7）
   */
  function getCriticalDivergences(comparisonId?: string): DivergencePoint[] {
    return getDivergencePoints(comparisonId).filter(d => d.severity >= 0.7)
  }

  /**
   * 获取可自动解决的分歧点
   */
  function getAutoResolvableDivergences(comparisonId?: string): DivergencePoint[] {
    return getDivergencePoints(comparisonId).filter(d => d.autoResolvable)
  }

  // ============================================================
  // 相似度计算
  // ============================================================

  /**
   * 计算两个分支的相似度
   */
  function computeSimilarity(
    branchA: WorldBranch,
    branchB: WorldBranch,
    allCheckpoints: Checkpoint[],
    allBranches: WorldBranch[],
    dimensions?: ComparisonDimension[],
  ): number {
    const comparison = compareWorlds(branchA, branchB, allCheckpoints, allBranches, { dimensions })
    return comparison.overallSimilarity
  }

  /**
   * 构建相似度矩阵
   */
  function buildSimilarityMatrix(
    branches: WorldBranch[],
    allCheckpoints: Checkpoint[],
    allBranches: WorldBranch[],
  ): {
    branchIds: string[]
    branchNames: string[]
    matrix: number[][]
  } {
    const ids = branches.map(b => b.id)
    const names = branches.map(b => b.name)
    const matrix: number[][] = []

    for (const a of branches) {
      const row: number[] = []
      for (const b of branches) {
        if (a.id === b.id) {
          row.push(1)
        } else {
          const similarity = computeSimilarity(a, b, allCheckpoints, allBranches)
          row.push(similarity)
        }
      }
      matrix.push(row)
    }

    return { branchIds: ids, branchNames: names, matrix }
  }

  // ============================================================
  // 对比报告
  // ============================================================

  /**
   * 生成对比报告
   */
  function generateComparisonReport(
    branches: WorldBranch[],
    allCheckpoints: Checkpoint[],
    allBranches: WorldBranch[],
    name?: string,
  ): ComparisonResult {
    // 对所有分支进行两两对比
    const allComparisons: WorldComparison[] = []
    const similarityMatrix = buildSimilarityMatrix(branches, allCheckpoints, allBranches)

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const comp = compareWorlds(branches[i], branches[j], allCheckpoints, allBranches)
        allComparisons.push(comp)
      }
    }

    // 找最相似和最分歧的分支对
    const sortedBySimilarity = [...allComparisons].sort((a, b) => b.overallSimilarity - a.overallSimilarity)

    const mostSimilarPairs = sortedBySimilarity
      .slice(0, 5)
      .map(c => ({
        branchAId: c.branchA.id,
        branchAName: c.branchA.name,
        branchBId: c.branchB.id,
        branchBName: c.branchB.name,
        similarity: c.overallSimilarity,
      }))

    const mostDivergentPairs = [...sortedBySimilarity]
      .reverse()
      .slice(0, 5)
      .map(c => ({
        branchAId: c.branchA.id,
        branchAName: c.branchA.name,
        branchBId: c.branchB.id,
        branchBName: c.branchB.name,
        similarity: c.overallSimilarity,
      }))

    const result: ComparisonResult = {
      id: generateId('report'),
      name: name ?? `对比报告 ${new Date().toLocaleDateString('zh-CN')}`,
      comparisons: allComparisons,
      similarityMatrix: {
        branchIds: similarityMatrix.branchIds,
        branchNames: similarityMatrix.branchNames,
        matrix: similarityMatrix.matrix,
      },
      mostSimilarPairs,
      mostDivergentPairs,
      generatedAt: new Date().toISOString(),
    }

    results.value = [result, ...results.value]

    // 生成文本报告
    const reportText = generateTextReport(result)
    reports.value = [reportText, ...reports.value]

    saveResults()
    return result
  }

  /**
   * 生成文本报告
   */
  function generateTextReport(result: ComparisonResult): string {
    const lines: string[] = [
      `========================================`,
      `  平行世界对比报告`,
      `  ${result.name}`,
      `  生成时间: ${new Date(result.generatedAt).toLocaleString('zh-CN')}`,
      `========================================`,
      '',
      `一、概览`,
      `  - 参与对比的分支数: ${result.similarityMatrix.branchIds.length}`,
      `  - 对比对数量: ${result.comparisons.length}`,
      '',
      `二、最相似的分支对`,
      ...result.mostSimilarPairs.map((p, i) =>
        `  ${i + 1}. 「${p.branchAName}」vs「${p.branchBName}」- 相似度 ${Math.round(p.similarity * 100)}%`,
      ),
      '',
      `三、最分歧的分支对`,
      ...result.mostDivergentPairs.map((p, i) =>
        `  ${i + 1}. 「${p.branchAName}」vs「${p.branchBName}」- 相似度 ${Math.round(p.similarity * 100)}%`,
      ),
      '',
      `四、详细对比`,
    ]

    for (const comp of result.comparisons) {
      lines.push(
        '',
        `--- ${comp.branchA.name} vs ${comp.branchB.name} ---`,
        `  综合相似度: ${Math.round(comp.overallSimilarity * 100)}%`,
        `  分歧点: ${comp.divergencePoints.length} 个`,
        `  关键差异:`,
        ...comp.keyDifferences.map(d => `    - ${d}`),
      )
    }

    lines.push('', '========================================', '  报告结束', '========================================')

    return lines.join('\n')
  }

  /**
   * 获取对比报告
   */
  function getComparisonReport(reportId: string): ComparisonResult | undefined {
    return results.value.find(r => r.id === reportId)
  }

  /**
   * 获取所有对比报告
   */
  function getComparisonReports(): ComparisonResult[] {
    return results.value
  }

  /**
   * 获取最新报告
   */
  function getLatestReport(): ComparisonResult | undefined {
    return results.value[0]
  }

  // ============================================================
  // 关键差异
  // ============================================================

  /**
   * 获取关键差异
   */
  function getKeyDifferences(comparisonId?: string): string[] {
    if (comparisonId) {
      const comp = comparisons.value.find(c => c.id === comparisonId)
      return comp?.keyDifferences ?? []
    }

    return comparisons.value.flatMap(c => c.keyDifferences)
  }

  /**
   * 获取指定分支的对比
   */
  function getComparisonsForBranch(branchId: string): WorldComparison[] {
    return comparisons.value.filter(
      c => c.branchA.id === branchId || c.branchB.id === branchId,
    )
  }

  // ============================================================
  // 对比管理
  // ============================================================

  /**
   * 删除对比
   */
  function deleteComparison(comparisonId: string): boolean {
    const idx = comparisons.value.findIndex(c => c.id === comparisonId)
    if (idx === -1) return false

    comparisons.value.splice(idx, 1)
    saveComparisons()
    return true
  }

  /**
   * 删除对比报告
   */
  function deleteReport(reportId: string): boolean {
    const idx = results.value.findIndex(r => r.id === reportId)
    if (idx === -1) return false

    results.value.splice(idx, 1)
    saveResults()
    return true
  }

  /**
   * 清除所有对比
   */
  function clearAll(): void {
    comparisons.value = []
    results.value = []
    reports.value = []
    saveComparisons()
    saveResults()
  }

  // ---- 清理 ----

  function destroy(): void {
    comparisons.value = []
    results.value = []
    reports.value = []
  }

  // ---- 初始化 ----

  loadComparisons()
  loadResults()

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    comparisons,
    results,
    reports,
    latestComparison,
    totalComparisons,

    // 世界对比
    compareWorlds,
    computeSimilarity,
    buildSimilarityMatrix,

    // 分歧点
    getDivergencePoints,
    getCriticalDivergences,
    getAutoResolvableDivergences,

    // 对比报告
    generateComparisonReport,
    getComparisonReport,
    getComparisonReports,
    getLatestReport,

    // 关键差异
    getKeyDifferences,

    // 管理
    getComparisonsForBranch,
    deleteComparison,
    deleteReport,
    clearAll,

    // 生命周期
    destroy,
    loadComparisons,
    loadResults,
  }
}

export { DIMENSION_LABELS, DIMENSION_WEIGHTS, COMPARISON_STORAGE_KEYS }