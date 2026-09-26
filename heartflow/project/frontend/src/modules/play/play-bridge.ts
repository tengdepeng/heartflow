// ============================================================
// 逸趣阁 · 视图桥接层 (P22-5)
// 蓝图定义：
//   聚合 play 子模块提供统一视图模型，
//   连接 play-advanced / time-seed / seed-share，
//   为 UI 组件提供直接可用的衍生数据与操作方法
// ============================================================

import { computed } from 'vue'
// ⚠️ 指向真实定义文件，**不要**从 './index' 取符号：
// index.ts 会 re-export 本文件，barrel 自引用会构成 index ↔ bridge 循环依赖
import { usePlayGallery } from './play-store'
import {
  checkMilestones,
  computePlaySummary,
  buildPlayTrend,
  computeTimeInvestmentROI,
  computeCollectionHeatmap,
  computePreferenceProfile,
} from './play-advanced'
import type {
  PlayMilestone,
  PlayTrend,
  PlaySummary,
  TimeInvestmentROI,
  CollectionHeatmap,
  PreferenceProfile,
} from './play-advanced'
import {
  seedFromGame,
  seedFromToy,
  seedFromModel,
  seedFromOther,
  computeSeedStats,
  computeLODLevel,
  applyLOD,
} from './time-seed'
import type { TimeSeed, LODLevel } from './time-seed'
import { exportSeed as exportSeedFn, buildLineage, buildSeedGraph } from './seed-share'
import type { SeedSharePayload } from './seed-share'
import type { MonthlyStat, DistBuckets, RecentItem } from './types'

// ==================== 导出类型 ====================

/** 画廊统计快照 */
export interface GalleryStats {
  monthlyStats: MonthlyStat[]
  distBuckets: DistBuckets
  recentItems: RecentItem[]
  isEmpty: boolean
}

/** 种子概览 */
export interface SeedOverview {
  total: number
  byRarity: { rarity: string; label: string; count: number; color: string }[]
  lodLevel: LODLevel
}

/** 推荐条目 */
export interface PlayRecommendation {
  category: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

/** 桥接概览（聚合所有衍生数据） */
export interface PlayOverview {
  playSummary: PlaySummary
  galleryStats: GalleryStats
  milestones: PlayMilestone[]
  playTrend: PlayTrend
  timeROI: TimeInvestmentROI
  collectionHeatmap: CollectionHeatmap
  preferenceProfile: PreferenceProfile
  seedOverview: SeedOverview
  recommendations: PlayRecommendation[]
}

// ==================== 主 composable ====================

/**
 * 逸趣阁视图桥接 composable
 * 聚合 index / play-advanced / time-seed / seed-share，
 * 提供 UI 组件可直接使用的衍生数据与操作方法
 */
export function usePlayBridge() {
  // ---- 基础画廊（index.ts） ----
  const gallery = usePlayGallery()

  // ---- 播放数据快照（用于传给纯函数） ----
  const playData = computed(() => ({
    games: gallery.games.value,
    toys: gallery.toys.value,
    models: gallery.models.value,
    others: gallery.others.value,
  }))

  // ---- 时间种子生成 ----
  const allSeeds = computed<TimeSeed[]>(() => {
    const seeds: TimeSeed[] = []
    for (const g of gallery.games.value) seeds.push(seedFromGame(g))
    for (const t of gallery.toys.value) seeds.push(seedFromToy(t))
    for (const m of gallery.models.value) seeds.push(seedFromModel(m))
    for (const o of gallery.others.value) seeds.push(seedFromOther(o))
    return seeds
  })

  // ==================== 衍生属性 ====================

  /** 1. 游玩摘要 */
  const playSummary = computed<PlaySummary>(() => computePlaySummary(playData.value))

  /** 2. 画廊统计 */
  const galleryStats = computed<GalleryStats>(() => ({
    monthlyStats: gallery.monthlyStats.value,
    distBuckets: gallery.distBuckets.value,
    recentItems: gallery.recentItems.value,
    isEmpty: gallery.isEmpty.value,
  }))

  /** 3. 里程碑 */
  const milestones = computed<PlayMilestone[]>(() => {
    const result = checkMilestones(playData.value)
    return result.milestones
  })

  /** 4. 12 个月趋势 */
  const playTrend = computed<PlayTrend>(() => buildPlayTrend(playData.value, 12))

  /** 5. 时间投资回报 */
  const timeROI = computed<TimeInvestmentROI>(() => computeTimeInvestmentROI(playData.value))

  /** 6. 收藏热度 */
  const collectionHeatmap = computed<CollectionHeatmap>(() => computeCollectionHeatmap(playData.value))

  /** 7. 偏好画像 */
  const preferenceProfile = computed<PreferenceProfile>(() => computePreferenceProfile(playData.value))

  /** 8. 种子概览 */
  const seedOverview = computed<SeedOverview>(() => {
    const seeds = allSeeds.value
    const stats = computeSeedStats(seeds)
    const lodLevel = computeLODLevel(seeds.length)
    return {
      total: stats.total,
      byRarity: stats.byRarity.map(r => ({
        rarity: r.rarity,
        label: r.label,
        count: r.count,
        color: r.color,
      })),
      lodLevel,
    }
  })

  /** 9. 建议汇总 */
  const recommendations = computed<PlayRecommendation[]>(() => {
    const result: PlayRecommendation[] = []

    // 从时间投资回报中提取建议
    const roi = timeROI.value
    for (const s of roi.suggestions) {
      result.push({
        category: '时间投资',
        suggestion: s,
        priority: 'medium',
      })
    }

    // 从偏好画像中提取推荐
    const profile = preferenceProfile.value
    for (const s of profile.recommendations) {
      result.push({
        category: '偏好探索',
        suggestion: s,
        priority: 'low',
      })
    }

    // 基于集合热度补充建议
    const heatmap = collectionHeatmap.value
    if (heatmap.trend === 'declining') {
      result.push({
        category: '收藏活跃度',
        suggestion: '你的收藏活跃度近期有所下降，不妨重新发现收藏的乐趣',
        priority: 'high',
      })
    } else if (heatmap.trend === 'growing') {
      result.push({
        category: '收藏活跃度',
        suggestion: '你的收藏热情正在增长，注意合理规划空间与预算',
        priority: 'medium',
      })
    }

    // 基于种子数据补充建议
    const seeds = allSeeds.value
    if (seeds.length > 0 && seeds.every(s => s.rarity === 'common')) {
      result.push({
        category: '种子品质',
        suggestion: '你的时间种子均为普通品质，尝试投入更多时间或收藏高品质物品以生成稀有种子',
        priority: 'medium',
      })
    }

    return result
  })

  /** 聚合概览 */
  const overview = computed<PlayOverview>(() => ({
    playSummary: playSummary.value,
    galleryStats: galleryStats.value,
    milestones: milestones.value,
    playTrend: playTrend.value,
    timeROI: timeROI.value,
    collectionHeatmap: collectionHeatmap.value,
    preferenceProfile: preferenceProfile.value,
    seedOverview: seedOverview.value,
    recommendations: recommendations.value,
  }))

  // ==================== 操作方法 ====================

  /** 添加游戏 */
  function addGame() {
    gallery.addGame()
  }

  /** 添加玩具 */
  function addToy() {
    gallery.addToy()
  }

  /** 添加模型 */
  function addModel() {
    gallery.addModel()
  }

  /** 添加其他收藏 */
  function addOther() {
    gallery.addOther()
  }

  /** 移除任意类型的物品 */
  function removeItem(type: 'game' | 'toy' | 'model' | 'other', id: string) {
    switch (type) {
      case 'game':
        gallery.removeGame(id)
        break
      case 'toy':
        gallery.removeToy(id)
        break
      case 'model':
        gallery.removeModel(id)
        break
      case 'other':
        gallery.removeOther(id)
        break
    }
  }

  /** 导出指定物品的时间种子 */
  function exportSeed(type: 'game' | 'toy' | 'model' | 'other', id: string): SeedSharePayload | null {
    let item: any = null

    switch (type) {
      case 'game':
        item = gallery.games.value.find(g => g.id === id)
        if (item) return exportSeedFn(seedFromGame(item))
        break
      case 'toy':
        item = gallery.toys.value.find(t => t.id === id)
        if (item) return exportSeedFn(seedFromToy(item))
        break
      case 'model':
        item = gallery.models.value.find(m => m.id === id)
        if (item) return exportSeedFn(seedFromModel(item))
        break
      case 'other':
        item = gallery.others.value.find(o => o.id === id)
        if (item) return exportSeedFn(seedFromOther(item))
        break
    }

    return null
  }

  /** 重新检查里程碑（返回完整结果，含新解锁） */
  function checkMilestonesNow() {
    return checkMilestones(playData.value)
  }

  /** 构建指定根种子的遗传谱系 */
  function getLineage(rootSeedId: string) {
    const seeds = allSeeds.value
    const rootSeed = seeds.find(s => s.id === rootSeedId)
    if (!rootSeed) return null
    // 遗传记录暂由外部维护，此处传入空数组
    return buildLineage(rootSeed, seeds, [])
  }

  /** 构建种子图谱 */
  function getSeedGraph() {
    return buildSeedGraph(allSeeds.value)
  }

  /** 按 LOD 级别获取种子（降级后） */
  function getSeedsByLOD(level?: LODLevel): TimeSeed[] {
    const lod = level ?? seedOverview.value.lodLevel
    return applyLOD(allSeeds.value, lod)
  }

  // ==================== 返回 ====================

  return {
    // 基础数据（透传）
    games: gallery.games,
    toys: gallery.toys,
    models: gallery.models,
    others: gallery.others,

    // UI 状态（透传）
    tab: gallery.tab,
    tabs: gallery.tabs,
    fmt: gallery.fmt,
    toyFilter: gallery.toyFilter,
    toyFilters: gallery.toyFilters,
    otherSearch: gallery.otherSearch,
    searchQuery: gallery.searchQuery,
    sortField: gallery.sortField,
    sortOrder: gallery.sortOrder,

    // 表单（透传）
    gameForm: gallery.gameForm,
    toyForm: gallery.toyForm,
    modelForm: gallery.modelForm,
    otherForm: gallery.otherForm,

    // 衍生属性
    playSummary,
    galleryStats,
    milestones,
    playTrend,
    timeROI,
    collectionHeatmap,
    preferenceProfile,
    seedOverview,
    recommendations,
    overview,
    allSeeds,

    // 操作方法
    addGame,
    addToy,
    addModel,
    addOther,
    removeItem,
    exportSeed,
    checkMilestones: checkMilestonesNow,
    getLineage,
    getSeedGraph,
    getSeedsByLOD,

    // 透传其余辅助方法
    addGameDirect: gallery.addGame,
    removeGame: gallery.removeGame,
    addToyDirect: gallery.addToy,
    removeToy: gallery.removeToy,
    addModelDirect: gallery.addModel,
    removeModel: gallery.removeModel,
    addOtherDirect: gallery.addOther,
    removeOther: gallery.removeOther,
    totalGameHours: gallery.totalGameHours,
    topGame: gallery.topGame,
    topPlatform: gallery.topPlatform,
    gameBarWidth: gallery.gameBarWidth,
    setSort: gallery.setSort,
    sortedGames: gallery.sortedGames,
    filteredGames: gallery.filteredGames,
    platformDistribution: gallery.platformDistribution,
    filteredToys: gallery.filteredToys,
    modelGroups: gallery.modelGroups,
    filteredOthers: gallery.filteredOthers,
    totalItems: gallery.totalItems,
    valueLabel: gallery.valueLabel,
    statusLabel: gallery.statusLabel,
  }
}