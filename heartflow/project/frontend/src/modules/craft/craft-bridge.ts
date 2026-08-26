// ============================================================
// 匠庐 · 视图桥接层（P21-5）
// 聚合 craft store、材料、合成、徽章、习惯、高级分析
// 提供统一状态、可视化数据、健康度评分、操作入口
// ============================================================

import { computed, ref } from 'vue'
import { useCraftStore } from './craft-store'
import { useCraftMaterials } from './materials'
import { useSynthesis } from './synthesis'
import { useCraftBadges } from './craft-badges'
import { useCraftAdvanced } from './craft-advanced'
import { useHabitAnalyzer } from './craft-habits'
import type { WorkStatus, WorkType, CraftWork } from './types'
import type { MaterialRarity } from './materials'
import type { BadgeRarity, BadgeCategory } from './craft-badges'

// ---- 类型定义 ----

/** 匠庐综合健康度 */
export interface CraftHealth {
  /** 综合评分 0-100 */
  score: number
  /** 作品产出率 */
  workProductivity: number
  /** 完成率 */
  completionRate: number
  /** 进化效率 */
  evolutionEfficiency: number
  /** 材料丰裕度 */
  materialAbundance: number
  /** 合成成功率 */
  synthesisSuccessRate: number
  /** 徽章收集率 */
  badgeCollectionRate: number
  /** 习惯稳定性 */
  habitStability: number
  /** 建议列表 */
  suggestions: string[]
}

/** 作品概览（增强版） */
export interface WorkOverview {
  work: CraftWork
  /** 使用的材料数量 */
  materialCount: number
  /** 是否有进化历史 */
  hasEvolution: boolean
  /** 版本数 */
  versionCount: number
  /** 关联的灵感数 */
  inspirationCount: number
}

/** 工坊仪表盘 */
export interface CraftDashboard {
  /** 活跃作品数 */
  activeWorks: number
  /** 本月新增 */
  newThisMonth: number
  /** 本月完成 */
  completedThisMonth: number
  /** 总进化值 */
  totalEvolution: number
  /** 材料种类数 */
  materialTypes: number
  /** 总材料数量 */
  totalMaterials: number
  /** 已解锁徽章数 */
  unlockedBadges: number
  /** 可用配方数 */
  availableRecipes: number
  /** 合成进行中数 */
  activeSynthesis: number
  /** 未使用灵感数 */
  pendingInspirations: number
  /** 当前连续创作天数 */
  currentStreak: number
}

/** 可视化数据：作品趋势 */
export interface WorkTrend {
  month: string
  created: number
  completed: number
  evolution: number
}

/** 可视化数据：类型分布 */
export interface TypeDistribution {
  type: WorkType
  label: string
  count: number
  totalEvolution: number
  avgEvolution: number
  percent: number
}

/** 可视化数据：材料分布 */
export interface MaterialDistribution {
  rarity: MaterialRarity
  label: string
  color: string
  count: number
  totalQuantity: number
}

/** 可视化数据：徽章进度 */
export interface BadgeProgress {
  badgeId: string
  name: string
  description: string
  rarity: BadgeRarity
  category: BadgeCategory
  icon: string
  unlocked: boolean
  unlockedAt?: string
  /** 进度 0-100（未解锁的估算） */
  progress: number
}

/** 可视化数据：合成效率 */
export interface SynthesisEfficiency {
  recipeId: string
  recipeName: string
  category: string
  attempts: number
  successes: number
  successRate: number
  totalOutputs: number
  totalWasted: number
}

/** 作品推荐 */
export interface WorkRecommendation {
  type: 'continue' | 'start_new' | 'refine' | 'archive' | 'explore_type'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  targetWorkId?: string
  targetType?: WorkType
  expectedBenefit: string
}

// ============================================================
// 辅助函数
// ============================================================

function getTypeLabel(type: WorkType): string {
  const labels: Record<WorkType, string> = {
    writing: '写作',
    code: '代码',
    design: '设计',
    plan: '规划',
    insight: '洞见',
  }
  return labels[type]
}

function getRarityLabel(rarity: MaterialRarity): string {
  const labels: Record<MaterialRarity, string> = {
    common: '普通',
    uncommon: '非凡',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
  }
  return labels[rarity]
}

function getRarityColor(rarity: MaterialRarity): string {
  const colors: Record<MaterialRarity, string> = {
    common: '#9CA3AF',
    uncommon: '#22C55E',
    rare: '#6b9fc4',
    epic: '#a07c8c',
    legendary: '#e0a96d',
  }
  return colors[rarity]
}

// ============================================================
// useCraftBridge
// ============================================================

export function useCraftBridge() {
  // ---- 子模块 ----
  const store = useCraftStore()
  const materials = useCraftMaterials()
  const synthesis = useSynthesis()
  const badges = useCraftBadges()
  const advanced = useCraftAdvanced()
  const habits = useHabitAnalyzer()

  // 初始化合成系统
  synthesis.loadAll()

  // ---- 活跃状态 ----
  const activeWorkId = ref<string | null>(null)

  // ---- 作品概览 ----
  const workOverviews = computed<WorkOverview[]>(() => {
    return store.works.map(work => {
      const workMaterials = materials.getMaterialsForWork(work.id)
      const workVersions = advanced.getWorkVersions(work.id)
      const relatedInspirations = advanced.inspirations.value.filter(
        i => i.relatedWorkId === work.id
      )

      return {
        work,
        materialCount: workMaterials.length,
        hasEvolution: (work.evolutionHistory?.length ?? 0) > 0,
        versionCount: workVersions.length,
        inspirationCount: relatedInspirations.length,
      }
    })
  })

  const currentWorkOverview = computed(() => {
    if (!activeWorkId.value) return null
    return workOverviews.value.find(w => w.work.id === activeWorkId.value) ?? null
  })

  // ---- 排序视图 ----
  const worksByEvolution = computed(() => {
    return [...workOverviews.value].sort((a, b) => b.work.evolution - a.work.evolution)
  })

  const worksByRecent = computed(() => {
    return [...workOverviews.value].sort(
      (a, b) => b.work.updatedAt.localeCompare(a.work.updatedAt)
    )
  })

  const worksByStatus = computed(() => {
    const groups: Record<WorkStatus, WorkOverview[]> = {
      draft: [],
      refining: [],
      completed: [],
      archived: [],
    }
    for (const overview of workOverviews.value) {
      groups[overview.work.status].push(overview)
    }
    return groups
  })

  // ---- 工坊仪表盘 ----
  const dashboard = computed<CraftDashboard>(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const activeWorks = store.works.filter(
      w => w.status === 'draft' || w.status === 'refining'
    ).length
    const newThisMonth = store.works.filter(w => w.createdAt >= monthStart).length
    const completedThisMonth = store.works.filter(
      w => w.status === 'completed' && w.updatedAt >= monthStart
    ).length
    const totalEvolution = store.works.reduce((sum, w) => sum + w.evolution, 0)

    const materialStats = materials.getStats.value
    const badgeStats = badges.badgeStats.value
    const unlockedRecipes = synthesis.getUnlockedRecipes()
    const activeQueue = synthesis.getActiveQueueItems()

    return {
      activeWorks,
      newThisMonth,
      completedThisMonth,
      totalEvolution,
      materialTypes: materialStats.totalMaterials,
      totalMaterials: materialStats.totalQuantity,
      unlockedBadges: badgeStats.unlocked,
      availableRecipes: unlockedRecipes.length,
      activeSynthesis: activeQueue.length,
      pendingInspirations: advanced.pendingInspirations.value.length,
      currentStreak: 0, // 由 habits 计算
    }
  })

  // ---- 匠庐健康度 ----
  const craftHealth = computed<CraftHealth>(() => {
    const stats = store.stats
    const totalWorks = stats.totalWorks

    // 作品产出率（近30天日均创作）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const recentWorks = store.works.filter(w => w.createdAt >= thirtyDaysAgo).length
    const workProductivity = Math.min(100, Math.round((recentWorks / 30) * 100))

    // 完成率
    const completionRate = totalWorks > 0
      ? Math.round((stats.totalCompleted / totalWorks) * 100)
      : 0

    // 进化效率
    const evolutionEfficiency = totalWorks > 0
      ? Math.min(100, Math.round(stats.averageEvolution * 2))
      : 0

    // 材料丰裕度
    const matStats = materials.getStats.value
    const materialAbundance = matStats.totalMaterials > 0
      ? Math.min(100, Math.round((matStats.totalQuantity / (matStats.totalMaterials * 10)) * 100))
      : 0

    // 合成成功率
    const synthStats = synthesis.getSynthesisStats()
    const synthesisSuccessRate = synthStats.totalAttempts > 0
      ? Math.round(synthStats.overallSuccessRate * 100)
      : 0

    // 徽章收集率
    const badgeCollectionRate = badges.badgeStats.value.completionPercent

    // 习惯稳定性
    const rhythm = habits.rhythm.value
    const habitStability = rhythm ? Math.round(rhythm.habitStability * 100) : 0

    // 综合评分
    const score = Math.round(
      workProductivity * 0.15 +
      completionRate * 0.15 +
      evolutionEfficiency * 0.15 +
      materialAbundance * 0.15 +
      synthesisSuccessRate * 0.10 +
      badgeCollectionRate * 0.15 +
      habitStability * 0.15
    )

    // 建议
    const suggestions: string[] = []
    if (completionRate < 30) suggestions.push('完成率偏低，尝试将草稿作品推进到完成状态')
    if (evolutionEfficiency < 20) suggestions.push('作品进化值较低，多花时间打磨作品质量')
    if (materialAbundance < 30) suggestions.push('材料储备不足，通过创作获取更多材料')
    if (badgeCollectionRate < 10) suggestions.push('还有很多徽章等待解锁，尝试不同的创作方式')
    if (habitStability < 30) suggestions.push('创作习惯不够稳定，尝试固定每天创作时段')
    if (totalWorks === 0) suggestions.push('开始你的第一件作品吧，匠庐等待你的到来')

    return {
      score,
      workProductivity,
      completionRate,
      evolutionEfficiency,
      materialAbundance,
      synthesisSuccessRate,
      badgeCollectionRate,
      habitStability,
      suggestions,
    }
  })

  // ---- 可视化数据：作品趋势 ----
  const workTrends = computed<WorkTrend[]>(() => {
    return advanced.analytics.value.monthlyTrend
  })

  // ---- 可视化数据：类型分布 ----
  const typeDistributions = computed<TypeDistribution[]>(() => {
    const typeCounts = store.typeCounts
    const total = store.stats.totalWorks
    const types: WorkType[] = ['writing', 'code', 'design', 'plan', 'insight']

    return types.map(type => {
      const count = typeCounts[type]
      const worksOfType = store.works.filter(w => w.type === type)
      const totalEvolution = worksOfType.reduce((sum, w) => sum + w.evolution, 0)

      return {
        type,
        label: getTypeLabel(type),
        count,
        totalEvolution,
        avgEvolution: count > 0 ? Math.round(totalEvolution / count) : 0,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    })
  })

  // ---- 可视化数据：材料分布 ----
  const materialDistributions = computed<MaterialDistribution[]>(() => {
    const rarities: MaterialRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
    const matStats = materials.getStats.value

    return rarities.map(rarity => ({
      rarity,
      label: getRarityLabel(rarity),
      color: getRarityColor(rarity),
      count: matStats.byRarity[rarity],
      totalQuantity: materials.materials.value
        .filter(m => m.rarity === rarity)
        .reduce((sum, m) => sum + m.quantity, 0),
    }))
  })

  // ---- 可视化数据：徽章进度 ----
  const badgeProgressList = computed<BadgeProgress[]>(() => {
    const allBadges = badges.unlockedBadgeDetails.value.map(ub => {
      const def = ub.definition
      return {
        badgeId: ub.badgeId,
        name: def?.name ?? '',
        description: def?.description ?? '',
        rarity: (def?.rarity ?? 'common') as BadgeRarity,
        category: (def?.category ?? 'milestone') as BadgeCategory,
        icon: def?.icon ?? '',
        unlocked: true,
        unlockedAt: ub.unlockedAt,
        progress: 100,
      }
    })

    const lockedBadges = badges.lockedBadges.value.map(badge => {
      // 估算进度
      let progress = 0
      const works = store.works

      if (badge.category === 'milestone') {
        if (badge.id === 'first_work') progress = works.length >= 1 ? 100 : 0
        else if (badge.id === 'ten_works') progress = Math.min(100, Math.round((works.length / 10) * 100))
        else if (badge.id === 'fifty_works') progress = Math.min(100, Math.round((works.length / 50) * 100))
        else if (badge.id === 'hundred_works') progress = Math.min(100, Math.round((works.length / 100) * 100))
        else if (badge.id === 'first_complete') {
          const completed = works.filter(w => w.status === 'completed').length
          progress = completed >= 1 ? 100 : 0
        } else if (badge.id === 'ten_completed') {
          const completed = works.filter(w => w.status === 'completed').length
          progress = Math.min(100, Math.round((completed / 10) * 100))
        }
      } else if (badge.category === 'evolution') {
        const totalEvo = works.reduce((s, w) => s + w.evolution, 0)
        if (badge.id === 'evo_100') progress = Math.min(100, Math.round((totalEvo / 100) * 100))
        else if (badge.id === 'evo_500') progress = Math.min(100, Math.round((totalEvo / 500) * 100))
        else if (badge.id === 'evo_1000') progress = Math.min(100, Math.round((totalEvo / 1000) * 100))
        else if (badge.id === 'evo_5000') progress = Math.min(100, Math.round((totalEvo / 5000) * 100))
      } else if (badge.category === 'skill') {
        const typeCounts = store.typeCounts
        if (badge.id === 'master_writing') progress = Math.min(100, Math.round((typeCounts.writing / 20) * 100))
        else if (badge.id === 'master_code') progress = Math.min(100, Math.round((typeCounts.code / 20) * 100))
        else if (badge.id === 'master_design') progress = Math.min(100, Math.round((typeCounts.design / 20) * 100))
        else if (badge.id === 'master_plan') progress = Math.min(100, Math.round((typeCounts.plan / 20) * 100))
        else if (badge.id === 'master_insight') progress = Math.min(100, Math.round((typeCounts.insight / 20) * 100))
      }

      return {
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        rarity: badge.rarity,
        category: badge.category,
        icon: badge.icon,
        unlocked: false,
        progress,
      }
    })

    return [...allBadges, ...lockedBadges]
  })

  // ---- 可视化数据：合成效率 ----
  const synthesisEfficiencies = computed<SynthesisEfficiency[]>(() => {
    const results = synthesis.results.value

    return synthesis.recipes.value.map(recipe => {
      const recipeResults = results.filter(r => r.recipeId === recipe.id)
      const attempts = recipeResults.length
      const successes = recipeResults.filter(r => r.success).length

      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        category: recipe.category,
        attempts,
        successes,
        successRate: attempts > 0 ? Math.round((successes / attempts) * 100) : 0,
        totalOutputs: recipeResults
          .filter(r => r.success)
          .reduce((sum, r) => sum + Object.values(r.outputsProduced).reduce((a, b) => a + b, 0), 0),
        totalWasted: recipeResults
          .reduce((sum, r) => sum + Object.values(r.wastedMaterials).reduce((a, b) => a + b, 0), 0),
      }
    })
  })

  // ---- 作品推荐 ----
  const workRecommendations = computed<WorkRecommendation[]>(() => {
    const recommendations: WorkRecommendation[] = []
    const works = store.works

    // 1. 继续草稿
    const drafts = works.filter(w => w.status === 'draft')
    if (drafts.length > 0) {
      const oldestDraft = drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
      recommendations.push({
        type: 'continue',
        priority: 'high',
        title: '继续未完成的作品',
        description: `「${oldestDraft.name}」还是草稿状态，继续打磨它吧`,
        targetWorkId: oldestDraft.id,
        expectedBenefit: '推进作品完成，提升完成率',
      })
    }

    // 2. 打磨进行中的作品
    const refining = works.filter(w => w.status === 'refining')
    if (refining.length > 0) {
      const lowestEvo = refining.sort((a, b) => a.evolution - b.evolution)[0]
      recommendations.push({
        type: 'refine',
        priority: 'medium',
        title: '打磨低进化作品',
        description: `「${lowestEvo.name}」进化值较低，花时间提升它的品质`,
        targetWorkId: lowestEvo.id,
        expectedBenefit: '提升作品进化值，可能解锁进化徽章',
      })
    }

    // 3. 探索未使用的类型
    const usedTypes = new Set(works.map(w => w.type))
    const allTypes: WorkType[] = ['writing', 'code', 'design', 'plan', 'insight']
    const unusedTypes = allTypes.filter(t => !usedTypes.has(t))
    if (unusedTypes.length > 0 && works.length >= 5) {
      recommendations.push({
        type: 'explore_type',
        priority: 'medium',
        title: '尝试新的创作类型',
        description: `你还没有${getTypeLabel(unusedTypes[0])}类作品，拓展创作边界`,
        targetType: unusedTypes[0],
        expectedBenefit: '解锁更多类型相关徽章，丰富创作多样性',
      })
    }

    // 4. 开始新作品
    if (works.length < 5 || (drafts.length === 0 && refining.length === 0)) {
      recommendations.push({
        type: 'start_new',
        priority: 'low',
        title: '开始一件新作品',
        description: '灵感需要被记录，创建你的下一件作品',
        expectedBenefit: '增加作品数量，推进里程碑徽章进度',
      })
    }

    // 5. 归档旧作品
    const completed = works.filter(w => w.status === 'completed')
    if (completed.length > 10) {
      const oldestCompleted = completed.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0]
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(oldestCompleted.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceUpdate > 30) {
        recommendations.push({
          type: 'archive',
          priority: 'low',
          title: '整理已完成的作品',
          description: `「${oldestCompleted.name}」已完成${daysSinceUpdate}天，考虑归档整理`,
          targetWorkId: oldestCompleted.id,
          expectedBenefit: '保持工坊整洁，可能解锁归档徽章',
        })
      }
    }

    return recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ============================================================
  // 操作入口
  // ============================================================

  /** 创建新作品 */
  function createWork(
    name: string,
    type: WorkType,
    description: string,
    tags: string[] = [],
  ): CraftWork | null {
    const now = new Date().toISOString()
    const work: CraftWork = {
      id: `work_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      icon: '🔨',
      description,
      color: '#b8a080',
      status: 'draft',
      type,
      date: now.slice(0, 7),
      evolution: 0,
      tags,
      createdAt: now,
      updatedAt: now,
    }

    const added = store.addWork(work)
    if (!added) return null

    // 更新分析
    advanced.updateAnalytics(store.works, store.stats)

    // 检查徽章
    badges.checkAndUnlock(store.works)

    // 分析习惯
    habits.analyzeHabits(store.works)

    return work
  }

  /** 聚焦作品 */
  function focusWork(workId: string): WorkOverview | null {
    activeWorkId.value = workId
    return currentWorkOverview.value
  }

  /** 完成作品 */
  function completeWork(workId: string): boolean {
    const updated = store.updateWork(workId, {
      status: 'completed',
      evolution: (store.works.find(w => w.id === workId)?.evolution ?? 0) + 5,
    })
    if (!updated) return false

    // 更新分析和徽章
    advanced.updateAnalytics(store.works, store.stats)
    badges.checkAndUnlock(store.works)
    habits.analyzeHabits(store.works)

    return true
  }

  /** 打磨作品 */
  function refineWork(workId: string, evolutionIncrement: number): boolean {
    const work = store.works.find(w => w.id === workId)
    if (!work) return false

    const updated = store.updateWork(workId, {
      status: 'refining',
      evolution: work.evolution + evolutionIncrement,
    })
    if (!updated) return false

    // 记录进化
    if (!work.evolutionHistory) {
      work.evolutionHistory = []
    }
    work.evolutionHistory.push({
      date: new Date().toISOString(),
      evolution: work.evolution + evolutionIncrement,
      milestone: evolutionIncrement >= 20 ? '重大突破' : undefined,
    })

    advanced.updateAnalytics(store.works, store.stats)
    badges.checkAndUnlock(store.works)
    habits.analyzeHabits(store.works)

    return true
  }

  /** 归档作品 */
  function archiveWork(workId: string): boolean {
    const updated = store.updateWork(workId, { status: 'archived' })
    if (!updated) return false

    advanced.updateAnalytics(store.works, store.stats)
    badges.checkAndUnlock(store.works)

    return true
  }

  /** 删除作品 */
  function deleteWork(workId: string): boolean {
    const removed = store.removeWork(workId)
    if (!removed) return false

    if (activeWorkId.value === workId) {
      activeWorkId.value = null
    }

    advanced.updateAnalytics(store.works, store.stats)
    return true
  }

  /** 添加灵感并关联作品 */
  function addInspirationToWork(
    workId: string,
    title: string,
    content: string,
    source: string,
  ) {
    return advanced.addInspiration(title, content, source, workId)
  }

  /** 执行合成 */
  function executeSynthesis(recipeId: string) {
    const materialQuantities: Record<string, number> = {}
    for (const m of materials.materials.value) {
      materialQuantities[m.id] = m.quantity
    }

    const result = synthesis.executeSynthesis(recipeId, materialQuantities)
    if (result) {
      // 消耗材料
      for (const [matId, quantity] of Object.entries(result.inputsUsed)) {
        materials.recordUsage(matId, 'synthesis', quantity)
      }
      // 产出材料
      for (const [matId, quantity] of Object.entries(result.outputsProduced)) {
        const existing = materials.getMaterial(matId)
        if (existing) {
          materials.updateMaterial(matId, {
            quantity: existing.quantity + quantity,
          })
        }
      }
    }
    return result
  }

  /** 刷新所有分析 */
  function refreshAll() {
    advanced.updateAnalytics(store.works, store.stats)
    badges.checkAndUnlock(store.works)
    habits.analyzeHabits(store.works)
    habits.recommendCombos(store.works)
    habits.generateRecommendations(store.works)
  }

  return {
    // 状态
    activeWorkId,
    workOverviews,
    currentWorkOverview,
    worksByEvolution,
    worksByRecent,
    worksByStatus,

    // 仪表盘
    dashboard,
    craftHealth,

    // 子模块直通
    store,
    materials,
    synthesis,
    badges,
    advanced,
    habits,

    // 可视化数据
    workTrends,
    typeDistributions,
    materialDistributions,
    badgeProgressList,
    synthesisEfficiencies,
    workRecommendations,

    // 操作入口
    createWork,
    focusWork,
    completeWork,
    refineWork,
    archiveWork,
    deleteWork,
    addInspirationToWork,
    executeSynthesis,
    refreshAll,

    // 按类型筛选
    getWorksByType: (type: WorkType) => workOverviews.value.filter(w => w.work.type === type),
    getWorksByStatus: (status: WorkStatus) => workOverviews.value.filter(w => w.work.status === status),
    getTopEvolutionWorks: (n: number = 5) => worksByEvolution.value.slice(0, n),
    getRecentWorks: (n: number = 5) => worksByRecent.value.slice(0, n),
  }
}