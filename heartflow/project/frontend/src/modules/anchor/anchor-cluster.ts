// ============================================================
// 逐日心锚 · 锚点聚类（P18-4）
// 基于标签、分类、优先级、时间接近度的多维度锚点分组
// ============================================================

import type { Anchor } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 聚类维度 */
export type ClusterDimension = 'tags' | 'category' | 'priority' | 'time' | 'all'

/** 锚点聚类结果 */
export interface AnchorCluster {
  /** 簇 ID */
  id: string
  /** 簇标签（自动生成） */
  label: string
  /** 成员锚点 ID 列表 */
  memberIds: string[]
  /** 聚类维度 */
  dimension: ClusterDimension
  /** 凝聚度 0-1（越高越紧密） */
  cohesion: number
  /** 成员数量 */
  size: number
  /** 聚类时间 */
  clusteredAt: string
}

/** 聚类配置 */
export interface ClusterConfig {
  /** 最小簇大小 */
  minClusterSize: number
  /** 标签相似度阈值 0-1 */
  tagSimilarityThreshold: number
  /** 时间接近度阈值（天） */
  timeProximityDays: number
  /** 是否包含已完成锚点 */
  includeDone: boolean
}

/** 聚类概览 */
export interface ClusterOverview {
  totalClusters: number
  totalClusteredAnchors: number
  unclusteredCount: number
  avgCohesion: number
  largestCluster: AnchorCluster | null
  clustersByDimension: Record<ClusterDimension, number>
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  minClusterSize: 2,
  tagSimilarityThreshold: 0.3,
  timeProximityDays: 7,
  includeDone: false,
}

// ============================================================
// 工具函数
// ============================================================

/** Jaccard 相似度 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  const intersection = new Set([...a].filter(x => b.has(x)))
  const union = new Set([...a, ...b])
  return intersection.size / union.size
}

/** 时间接近度（天） */
function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000
}

// ============================================================
// useAnchorClustering
// ============================================================

export function useAnchorClustering() {
  // ---- 基于标签聚类 ----
  function clusterByTags(anchors: Anchor[], config: Partial<ClusterConfig> = {}): AnchorCluster[] {
    const cfg = { ...DEFAULT_CLUSTER_CONFIG, ...config }
    const clusters: AnchorCluster[] = []
    const used = new Set<string>()

    for (let i = 0; i < anchors.length; i++) {
      if (used.has(anchors[i].id)) continue
      const aTags = new Set(anchors[i].tags || [])
      if (aTags.size === 0) continue

      const members: Anchor[] = [anchors[i]]
      used.add(anchors[i].id)

      for (let j = i + 1; j < anchors.length; j++) {
        if (used.has(anchors[j].id)) continue
        const bTags = new Set(anchors[j].tags || [])
        if (bTags.size === 0) continue

        const similarity = jaccardSimilarity(aTags, bTags)
        if (similarity >= cfg.tagSimilarityThreshold) {
          members.push(anchors[j])
          used.add(anchors[j].id)
        }
      }

      if (members.length >= cfg.minClusterSize) {
        const allTags = new Set(members.flatMap(a => a.tags || []))
        const label = [...allTags].slice(0, 3).join('·')
        clusters.push({
          id: `cluster_tag_${clusters.length}`,
          label: label || '未命名分组',
          memberIds: members.map(a => a.id),
          dimension: 'tags',
          cohesion: calculateCohesion(members, 'tags'),
          size: members.length,
          clusteredAt: new Date().toISOString(),
        })
      }
    }

    return clusters
  }

  // ---- 基于分类聚类 ----
  function clusterByCategory(anchors: Anchor[], config: Partial<ClusterConfig> = {}): AnchorCluster[] {
    const cfg = { ...DEFAULT_CLUSTER_CONFIG, ...config }
    const groups = new Map<string, Anchor[]>()

    for (const anchor of anchors) {
      const cat = anchor.category || '未分类'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(anchor)
    }

    const clusters: AnchorCluster[] = []
    for (const [cat, members] of groups) {
      if (members.length >= cfg.minClusterSize) {
        clusters.push({
          id: `cluster_cat_${cat}`,
          label: cat,
          memberIds: members.map(a => a.id),
          dimension: 'category',
          cohesion: 1.0, // 同分类完全凝聚
          size: members.length,
          clusteredAt: new Date().toISOString(),
        })
      }
    }

    return clusters
  }

  // ---- 基于优先级聚类 ----
  function clusterByPriority(anchors: Anchor[], config: Partial<ClusterConfig> = {}): AnchorCluster[] {
    const cfg = { ...DEFAULT_CLUSTER_CONFIG, ...config }
    const groups = new Map<string, Anchor[]>()

    for (const anchor of anchors) {
      if (!groups.has(anchor.priority)) groups.set(anchor.priority, [])
      groups.get(anchor.priority)!.push(anchor)
    }

    const labels: Record<string, string> = { must: '必锚', can: '可锚', float: '浮锚' }
    const clusters: AnchorCluster[] = []
    for (const [pri, members] of groups) {
      if (members.length >= cfg.minClusterSize) {
        clusters.push({
          id: `cluster_pri_${pri}`,
          label: labels[pri] || pri,
          memberIds: members.map(a => a.id),
          dimension: 'priority',
          cohesion: 1.0,
          size: members.length,
          clusteredAt: new Date().toISOString(),
        })
      }
    }

    return clusters
  }

  // ---- 基于时间接近度聚类 ----
  function clusterByTime(anchors: Anchor[], config: Partial<ClusterConfig> = {}): AnchorCluster[] {
    const cfg = { ...DEFAULT_CLUSTER_CONFIG, ...config }
    const sorted = [...anchors].sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    const clusters: AnchorCluster[] = []
    const used = new Set<string>()

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(sorted[i].id)) continue
      const members: Anchor[] = [sorted[i]]
      used.add(sorted[i].id)

      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(sorted[j].id)) continue
        if (daysBetween(sorted[i].targetDate, sorted[j].targetDate) <= cfg.timeProximityDays) {
          members.push(sorted[j])
          used.add(sorted[j].id)
        }
      }

      if (members.length >= cfg.minClusterSize) {
        const dates = members.map(a => a.targetDate).sort()
        clusters.push({
          id: `cluster_time_${clusters.length}`,
          label: `${dates[0]} ~ ${dates[dates.length - 1]}`,
          memberIds: members.map(a => a.id),
          dimension: 'time',
          cohesion: Math.max(0, 1 - (members.length > 1
            ? daysBetween(dates[0], dates[dates.length - 1]) / (cfg.timeProximityDays * members.length)
            : 0)),
          size: members.length,
          clusteredAt: new Date().toISOString(),
        })
      }
    }

    return clusters
  }

  // ---- 综合聚类（所有维度） ----
  function clusterAll(anchors: Anchor[], config: Partial<ClusterConfig> = {}): AnchorCluster[] {
    return [
      ...clusterByTags(anchors, config),
      ...clusterByCategory(anchors, config),
      ...clusterByPriority(anchors, config),
      ...clusterByTime(anchors, config),
    ]
  }

  // ---- 计算凝聚度 ----
  function calculateCohesion(members: Anchor[], dimension: string): number {
    if (members.length <= 1) return 1.0

    if (dimension === 'tags') {
      let totalSim = 0
      let pairs = 0
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          totalSim += jaccardSimilarity(
            new Set(members[i].tags || []),
            new Set(members[j].tags || []),
          )
          pairs++
        }
      }
      return pairs > 0 ? Math.round(totalSim / pairs * 100) / 100 : 0
    }

    return 1.0
  }

  // ---- 聚类概览 ----
  function getOverview(clusters: AnchorCluster[], totalAnchors: number): ClusterOverview {
    const clusteredIds = new Set(clusters.flatMap(c => c.memberIds))
    const dims = clusters.reduce((acc, c) => {
      acc[c.dimension] = (acc[c.dimension] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalClusters: clusters.length,
      totalClusteredAnchors: clusteredIds.size,
      unclusteredCount: totalAnchors - clusteredIds.size,
      avgCohesion: clusters.length > 0
        ? Math.round(clusters.reduce((s, c) => s + c.cohesion, 0) / clusters.length * 100) / 100
        : 0,
      largestCluster: clusters.length > 0
        ? clusters.reduce((max, c) => c.size > max.size ? c : max)
        : null,
      clustersByDimension: {
        tags: dims.tags || 0,
        category: dims.category || 0,
        priority: dims.priority || 0,
        time: dims.time || 0,
        all: 0,
      },
    }
  }

  // ---- 获取锚点的聚类成员 ----
  function getRelatedAnchors(
    anchorId: string,
    anchors: Anchor[],
    config: Partial<ClusterConfig> = {},
  ): Anchor[] {
    const anchor = anchors.find(a => a.id === anchorId)
    if (!anchor) return []

    const related: Anchor[] = []
    const anchorTags = new Set(anchor.tags || [])

    for (const other of anchors) {
      if (other.id === anchorId) continue
      let score = 0

      // 同分类
      if (anchor.category && other.category === anchor.category) score += 2
      // 标签相似度
      if (anchorTags.size > 0) {
        const otherTags = new Set(other.tags || [])
        score += jaccardSimilarity(anchorTags, otherTags) * 3
      }
      // 同优先级
      if (anchor.priority === other.priority) score += 1
      // 时间接近
      const days = daysBetween(anchor.targetDate, other.targetDate)
      if (days <= (config.timeProximityDays || 7)) score += 1

      if (score >= 2) related.push(other)
    }

    return related.sort((a, b) => {
      // 按综合关联度排序
      const aScore = getRelationScore(anchor, a, config)
      const bScore = getRelationScore(anchor, b, config)
      return bScore - aScore
    })
  }

  // ---- 关联度评分 ----
  function getRelationScore(
    a: Anchor,
    b: Anchor,
    config: Partial<ClusterConfig> = {},
  ): number {
    let score = 0
    if (a.category && b.category === a.category) score += 2
    const aTags = new Set(a.tags || [])
    const bTags = new Set(b.tags || [])
    if (aTags.size > 0 && bTags.size > 0) {
      score += jaccardSimilarity(aTags, bTags) * 3
    }
    if (a.priority === b.priority) score += 1
    const days = daysBetween(a.targetDate, b.targetDate)
    if (days <= (config.timeProximityDays || 7)) score += 1
    return score
  }

  return {
    clusterByTags,
    clusterByCategory,
    clusterByPriority,
    clusterByTime,
    clusterAll,
    getOverview,
    getRelatedAnchors,
    getRelationScore,
  }
}