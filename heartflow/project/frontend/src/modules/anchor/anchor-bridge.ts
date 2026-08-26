// ============================================================
// 逐日心锚 · 视图桥接层
// 蓝图定义：
//   锚点状态聚合、时间尺度管理、光丝串联、锚点聚类、
//   回顾分析、批量管理、庆祝系统
//   服务于 AnchorRoom.vue, AnchorJournal.vue, AnchorCluster.vue,
//   AnchorReview.vue, AnchorBatch.vue, AnchorTimeScale.vue
// ============================================================

import { ref, computed } from 'vue'
import { useAnchor } from './index'
import { useAnchorClustering } from './anchor-cluster'
import { useAnchorReview } from './anchor-review'
import { useAnchorBatch } from './anchor-batch'
import {
  computeScaleSummary,
  computeScaleDistribution,
  createScaleNavigation,
} from './anchor-time-scale'
import {
  THREAD_COLORS,
} from './anchor-threads'
import type { Anchor } from './types'
import { PRIORITY_LABELS, PRIORITY_COLORS } from './types'
import type {
  AnchorScale,
  ScaleSummary,
  ScaleDistribution,
  ScaleNavigation,
} from './anchor-time-scale'
import type {
  AnchorThread,
  AnchorGoalLink,
  PoolDumpResult,
} from './anchor-threads'
import type {
  AnchorCluster,
  ClusterConfig,
  ClusterDimension,
  ClusterOverview,
} from './anchor-cluster'
import type {
  AnchorReview,
  ReviewPeriod,
  ReviewConfig,
  ReviewTemplate,
  DailyReviewTrend,
  PeriodComparison,
  PeriodSnapshot,
  StreakStats,
} from './anchor-review'
import type {
  BatchOperation,
  BatchOperationType,
  BatchOperationParams,
  BatchOperationResult,
  BatchPreview,
  SelectionState,
  SelectionMode,
  SelectionFilter,
} from './anchor-batch'

// ---- 重新导出上游类型 ----

export type {
  Anchor,
  AnchorScale,
  ScaleSummary,
  ScaleDistribution,
  ScaleNavigation,
  AnchorThread,
  AnchorGoalLink,
  PoolDumpResult,
  AnchorCluster,
  ClusterConfig,
  ClusterDimension,
  ClusterOverview,
  AnchorReview,
  ReviewPeriod,
  ReviewConfig,
  ReviewTemplate,
  DailyReviewTrend,
  PeriodComparison,
  PeriodSnapshot,
  StreakStats,
  BatchOperation,
  BatchOperationType,
  BatchOperationParams,
  BatchOperationResult,
  BatchPreview,
  SelectionState,
  SelectionMode,
  SelectionFilter,
}

export { PRIORITY_LABELS, PRIORITY_COLORS, THREAD_COLORS }

// ---- 锚点健康度 ----

export interface AnchorHealth {
  /** 综合评分 0-100 */
  score: number
  /** 今日锚点总数 */
  todayTotal: number
  /** 今日已完成 */
  todayDone: number
  /** 今日完成率 */
  todayCompletionRate: number
  /** 今日待完成 */
  todayPending: number
  /** 必锚完成率 */
  mustCompletionRate: number
  /** 锚点池数量 */
  poolCount: number
  /** 总漂移次数 */
  totalDrifts: number
  /** 标签数量 */
  tagCount: number
  /** 分类数量 */
  categoryCount: number
  /** 健康等级 */
  level: { label: string; color: string }
  /** 改善建议 */
  suggestions: string[]
}

// ---- 时间尺度摘要 ----

export interface TimeScaleSummary {
  /** 当前尺度 */
  currentScale: AnchorScale
  /** 尺度摘要 */
  summary: ScaleSummary
  /** 分布数据 */
  distribution: ScaleDistribution
  /** 导航信息 */
  navigation: ScaleNavigation
}

// ---- 光丝网络概览 ----

export interface ThreadNetworkOverview {
  threads: AnchorThread[]
  totalThreads: number
  /** 按类型统计 */
  byType: { type: AnchorThread['type']; color: string; count: number }[]
  /** 平均强度 */
  averageStrength: number
  /** 最强连接 */
  strongestThreads: AnchorThread[]
}

// ---- 回顾摘要 ----

export interface ReviewSummary {
  /** 最新回顾 */
  latestReview: AnchorReview | null
  /** 回顾总数 */
  totalReviews: number
  /** 各周期完成率 */
  periodCompletionRates: { period: ReviewPeriod; label: string; rate: number }[]
  /** 最高产日 */
  mostProductiveDay: { date: string; count: number } | null
  /** 连续完成天数 */
  currentStreak: number
  /** 反思建议 */
  suggestions: string[]
}

// ---- 批量操作状态 ----

export interface BatchOperationState {
  selectionState: SelectionState
  history: BatchOperation[]
  totalOperations: number
  /** 最近操作 */
  recentOperation: BatchOperation | null
  /** 待预览操作 */
  preview: BatchPreview | null
}

// ============================================================
// useAnchorBridge
// ============================================================

export function useAnchorBridge() {
  // ---- 子模块 ----
  const anchor = useAnchor()
  const clustering = useAnchorClustering()
  const review = useAnchorReview()
  const batch = useAnchorBatch()

  // ---- 状态 ----
  const isLoading = ref(false)
  const currentScale = ref<AnchorScale>('day')

  // ---- 初始化 ----

  function initialize(): void {
    anchor.load()
  }

  // ---- 锚点健康度 ----

  const anchorHealth = computed<AnchorHealth>(() => {
    const today = anchor.todayAnchors.value
    const done = anchor.done.value
    const pending = anchor.pending.value
    const all = anchor.allAnchors.value
    const pool = anchor.poolAnchors.value

    const todayTotal = today.length
    const todayDone = done.length
    const todayCompletionRate = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

    // 必锚完成率
    const mustTotal = today.filter(a => a.priority === 'must').length
    const mustDone = done.filter(a => a.priority === 'must').length
    const mustCompletionRate = mustTotal > 0 ? Math.round((mustDone / mustTotal) * 100) : 100

    // 总漂移次数
    const totalDrifts = all.reduce((s, a) => s + a.driftCount, 0)

    // 标签和分类统计
    const tags = anchor.getAllTags()
    const categories = anchor.getCategories()

    // 综合评分
    const completionScore = todayCompletionRate * 0.35
    const mustScore = mustCompletionRate * 0.25
    const diversityScore = Math.min(tags.length / 10, 1) * 100 * 0.15
    const driftScore = Math.max(0, 100 - totalDrifts * 5) * 0.15
    const poolScore = Math.max(0, 100 - pool.length * 10) * 0.10

    const score = Math.round(completionScore + mustScore + diversityScore + driftScore + poolScore)

    let level: { label: string; color: string }
    if (score >= 80) level = { label: '锚定稳固', color: '#27ae60' }
    else if (score >= 60) level = { label: '航行有序', color: '#3498db' }
    else if (score >= 40) level = { label: '需要调整', color: '#f39c12' }
    else if (score >= 20) level = { label: '锚点松动', color: '#e67e22' }
    else level = { label: '待抛锚', color: '#95a5a6' }

    const suggestions: string[] = []
    if (all.length === 0) {
      suggestions.push('投下你的第一个心锚，标记今日最重要的事')
    } else {
      if (todayCompletionRate < 50 && todayTotal > 0) {
        suggestions.push('今日完成率偏低，优先完成必锚事项')
      }
      if (mustCompletionRate < 100) {
        suggestions.push('有必锚事项尚未完成，它们是最优先的')
      }
      if (totalDrifts > 5) {
        suggestions.push(`有 ${totalDrifts} 次锚点漂移，考虑减少每日锚点数量或重新评估优先级`)
      }
      if (pool.length > 10) {
        suggestions.push(`锚点池中有 ${pool.length} 个待处理事项，及时清理或安放`)
      }
      if (tags.length < 3 && all.length > 10) {
        suggestions.push('建议使用更多标签分类锚点，便于回顾和聚类分析')
      }
      if (todayCompletionRate >= 80 && mustCompletionRate === 100) {
        suggestions.push('今日锚点完成得很好，继续保持这份节奏')
      }
    }

    return {
      score: Math.min(100, score),
      todayTotal,
      todayDone,
      todayCompletionRate,
      todayPending: pending.length,
      mustCompletionRate,
      poolCount: pool.length,
      totalDrifts,
      tagCount: tags.length,
      categoryCount: categories.length,
      level,
      suggestions,
    }
  })

  // ---- 时间尺度摘要 ----

  const timeScaleSummary = computed<TimeScaleSummary>(() => {
    const scale = currentScale.value
    const allAnchors = anchor.anchors.value
    const summary = computeScaleSummary(allAnchors)
    const distribution = computeScaleDistribution(allAnchors)
    const navigation = createScaleNavigation(scale, new Date())

    return {
      currentScale: scale,
      summary,
      distribution,
      navigation,
    }
  })

  // ---- 光丝网络概览 ----

  const threadNetwork = computed<ThreadNetworkOverview>(() => {
    const threads = anchor.anchorThreads.value

    const typeCounts = new Map<AnchorThread['type'], number>()
    for (const t of threads) {
      typeCounts.set(t.type, (typeCounts.get(t.type) ?? 0) + 1)
    }
    const byType = Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      color: THREAD_COLORS[type] ?? '#999',
      count,
    }))

    const averageStrength = threads.length > 0
      ? Math.round((threads.reduce((s, t) => s + t.strength, 0) / threads.length) * 100) / 100
      : 0

    // 最强连接（强度 > 0.5）
    const strongestThreads = threads
      .filter(t => t.strength > 0.5)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10)

    return {
      threads,
      totalThreads: threads.length,
      byType,
      averageStrength,
      strongestThreads,
    }
  })

  // ---- 聚类概览 ----

  const clusterOverview = computed<ClusterOverview>(() => {
    const allAnchors = anchor.anchors.value
    const clusters = clustering.clusterAll(allAnchors)
    return clustering.getOverview(clusters, allAnchors.length)
  })

  // ---- 回顾摘要 ----

  const reviewSummary = computed<ReviewSummary>(() => {
    const allAnchors = anchor.anchors.value
    const latestReview = review.generateReview(allAnchors, 'daily')
    const streakStats = review.getStreakStats(allAnchors)

    // 各周期完成率
    const periods: ReviewPeriod[] = ['daily', 'weekly', 'monthly']
    const periodCompletionRates = periods.map(p => {
      const r = review.generateReview(allAnchors, p)
      return { period: p, label: p, rate: r.completionRate }
    })

    return {
      latestReview,
      totalReviews: 0, // review module doesn't persist reviews; track in view layer if needed
      periodCompletionRates,
      mostProductiveDay: latestReview?.mostProductiveDay ?? null,
      currentStreak: streakStats?.currentStreak ?? 0,
      suggestions: latestReview?.suggestions ?? [],
    }
  })

  // ---- 批量操作状态 ----

  const batchState = computed<BatchOperationState>(() => {
    const selectionState = batch.selection.value
    const history = batch.getOperationHistory()
    const preview = batch.getBatchPreview(
      anchor.anchors.value,
      'complete',
      Array.from(selectionState.selectedIds),
    )

    return {
      selectionState,
      history,
      totalOperations: history.length,
      recentOperation: history.length > 0 ? history[history.length - 1] : null,
      preview,
    }
  })

  // ---- 操作入口 ----

  /**
   * 添加锚点（支持 NLP 解析）
   */
  function addAnchor(text: string, priority?: Anchor['priority']): Anchor {
    return anchor.add(text, priority)
  }

  /**
   * 快速添加锚点（不解析）
   */
  function addAnchorRaw(text: string, priority: Anchor['priority'] = 'can', extra?: Partial<Anchor>): Anchor {
    return anchor.addRaw(text, priority, extra)
  }

  /**
   * 标记完成
   */
  function markDone(id: string): void {
    anchor.markDone(id)
  }

  /**
   * 切换完成状态
   */
  function toggleDone(id: string): void {
    anchor.toggleDone(id)
  }

  /**
   * 删除锚点
   */
  function removeAnchor(id: string): void {
    anchor.remove(id)
  }

  /**
   * 更新锚点
   */
  function updateAnchor(id: string, updates: Partial<Anchor>): void {
    anchor.update(id, updates)
  }

  /**
   * 设置优先级
   */
  function setPriority(id: string, priority: Anchor['priority']): void {
    anchor.setPriority(id, priority)
  }

  /**
   * 添加标签
   */
  function addTag(id: string, tag: string): void {
    anchor.addTag(id, tag)
  }

  /**
   * 移除标签
   */
  function removeTag(id: string, tag: string): void {
    anchor.removeTag(id, tag)
  }

  /**
   * 推迟到明天
   */
  function postponeToTomorrow(id: string): void {
    anchor.postponeToTomorrow(id)
  }

  /**
   * 添加到锚点池
   */
  function addToPool(text: string): Anchor | null {
    return anchor.addToPool(text)
  }

  /**
   * 从锚点池安放
   */
  function placeFromPool(id: string, priority?: Anchor['priority']): void {
    anchor.placeFromPool(id, priority)
  }

  /**
   * 全部从锚点池安放
   */
  function placeAllFromPool(priority?: Anchor['priority']): void {
    anchor.placeAllFromPool(priority)
  }

  /**
   * 返回到锚点池
   */
  function returnToPool(id: string): void {
    anchor.returnToPool(id)
  }

  /**
   * 漂移未完成的锚点到今天
   */
  function driftPending(): void {
    anchor.driftPending()
  }

  /**
   * 切换时间尺度
   */
  function setScale(scale: AnchorScale): void {
    currentScale.value = scale
  }

  /**
   * 获取指定尺度的锚点
   */
  function getAnchorsByScale(scale: AnchorScale): Anchor[] {
    return anchor.getAnchorsByScale(scale)
  }

  /**
   * 生成回顾
   */
  function generateReview(period: ReviewPeriod): AnchorReview {
    return review.generateReview(anchor.anchors.value, period)
  }

  /**
   * 生成聚类
   */
  function generateClusters(config?: Partial<ClusterConfig>): AnchorCluster[] {
    return clustering.clusterAll(anchor.anchors.value, config)
  }

  /**
   * 批量操作
   */
  function executeBatchOperation(
    type: BatchOperationType,
    targetIds: string[],
    params?: BatchOperationParams,
  ): BatchOperationResult {
    const allAnchors = anchor.anchors.value
    switch (type) {
      case 'complete':
        return batch.batchComplete(allAnchors, targetIds, (id) => { anchor.markDone(id); return true })
      case 'postpone':
        return batch.batchPostpone(allAnchors, targetIds, anchor.postponeToTomorrow, params?.targetDate)
      case 'setPriority':
        return batch.batchSetPriority(allAnchors, targetIds, params?.priority ?? 'can', anchor.setPriority)
      case 'addTag':
        return batch.batchAddTag(allAnchors, targetIds, params?.tag ?? '', anchor.addTag)
      case 'removeTag':
        return batch.batchRemoveTag(allAnchors, targetIds, params?.tag ?? '', anchor.removeTag)
      case 'setCategory':
        return batch.batchSetCategory(allAnchors, targetIds, params?.category ?? '', anchor.update)
      case 'moveToPool':
        return batch.batchMoveToPool(allAnchors, targetIds, anchor.returnToPool)
      case 'placeFromPool':
        return batch.batchPlaceFromPool(allAnchors, targetIds, params?.priority, anchor.placeFromPool)
      case 'delete':
        return batch.batchDelete(allAnchors, targetIds, anchor.remove)
      case 'duplicate':
        return batch.batchDuplicate(allAnchors, targetIds, anchor.addRaw, params?.duplicateCount ?? 1)
      default:
        return {
          success: false,
          operation: {
            id: `batch_${Date.now()}`,
            type,
            targetIds,
            params: params ?? {},
            operatedAt: new Date().toISOString(),
            affectedCount: 0,
            reversible: false,
          },
          successCount: 0,
          failureCount: targetIds.length,
          errors: [`Unknown operation type: ${type}`],
        }
    }
  }

  /**
   * 设置选择模式
   */
  function setSelectionMode(mode: SelectionMode, filter?: SelectionFilter): void {
    if (mode === 'all') {
      batch.selectAll(anchor.anchors.value, filter)
    } else if (mode === 'none') {
      batch.clearSelection()
    }
    // For 'manual' mode, individual toggleSelection calls are used
    // For 'filtered' mode, selectAll with filter is used
  }

  /**
   * 切换选择
   */
  function toggleSelection(id: string): void {
    batch.toggleSelection(id)
  }

  /**
   * 全选/取消全选
   */
  function selectAll(selected: boolean): void {
    if (selected) {
      batch.selectAll(anchor.anchors.value)
    } else {
      batch.clearSelection()
    }
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 聚合状态
    isLoading,
    anchorHealth,
    timeScaleSummary,
    threadNetwork,
    clusterOverview,
    reviewSummary,
    batchState,

    // 原始数据（供视图直接使用）
    todayAnchors: anchor.todayAnchors,
    pending: anchor.pending,
    done: anchor.done,
    poolAnchors: anchor.poolAnchors,
    allAnchors: anchor.allAnchors,
    currentScale,

    // 操作入口
    initialize,
    addAnchor,
    addAnchorRaw,
    markDone,
    toggleDone,
    removeAnchor,
    updateAnchor,
    setPriority,
    addTag,
    removeTag,
    postponeToTomorrow,
    addToPool,
    placeFromPool,
    placeAllFromPool,
    returnToPool,
    driftPending,
    setScale,
    getAnchorsByScale,
    generateReview,
    generateClusters,
    executeBatchOperation,
    setSelectionMode,
    toggleSelection,
    selectAll,

    // 子模块直通（供高级场景使用）
    anchor,
    clustering,
    review,
    batch,
  }
}