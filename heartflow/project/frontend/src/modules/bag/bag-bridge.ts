// ============================================================
// 行囊 · 视图桥接层（P22-2）
// 蓝图定义：
//   统一状态聚合、技能雷达、成长趋势、学习路径、熟练度预测、
//   行囊健康度、技能推荐、操作入口
// ============================================================

import { computed } from 'vue'
import { useBagStore } from './index'
import { useBagAnalytics } from './bag-analytics'
import { storage } from '../../engine/storage'
import type { BagItem, CategoryItem, CategoryType } from './types'
import { CATEGORY_TYPES } from './defaults'
import type {
  SkillRadarData,
  GrowthTrend,
  LearningPath,
  LearningStep,
  ProficiencyPrediction,
  SkillHealth,
} from './bag-analytics'

// ---- 重新导出上游类型 ----

export type {
  SkillRadarData,
  GrowthTrend,
  LearningPath,
  LearningStep,
  ProficiencyPrediction,
  SkillHealth,
}

// ---- 技能概览 ----

export interface SkillOverview {
  name: string
  icon: string
  color: string
  proficiency: number
  itemCount: number
  masteredCount: number
  growthDirection: 'up' | 'down' | 'stable'
  categoryType: CategoryType
}

// ---- 行囊健康度 ----

export interface BagHealth {
  /** 综合评分 0-100 */
  score: number
  /** 总物品数 */
  totalItems: number
  /** 平均熟练度 */
  avgProficiency: number
  /** 精通数量（>=80） */
  masteredCount: number
  /** 薄弱数量（<30） */
  weakCount: number
  /** 技能多样性 0-1 */
  diversity: number
  /** 健康评分 */
  healthScore: number
  /** 最强技能 */
  topSkill: { name: string; proficiency: number } | null
  /** 最弱技能 */
  weakestSkill: { name: string; proficiency: number } | null
  /** 改善建议 */
  suggestions: string[]
}

// ---- 行囊推荐 ----

export interface BagRecommendation {
  type: 'improve_proficiency' | 'add_item' | 'explore_category' | 'learn_path' | 'focus_weakness'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  targetCategory?: CategoryType
  targetCategoryName?: string
  expectedBenefit: string
}

// ============================================================
// useBagBridge
// ============================================================

export function useBagBridge() {
  // ---- 子模块 ----
  const store = useBagStore()
  const analytics = useBagAnalytics()

  // ---- 技能概览 ----

  const skillOverviews = computed<SkillOverview[]>(() => {
    return store.categories.map((cat: CategoryItem) => {
      const masteredCount = cat.items.filter((i: BagItem) => i.proficiency >= 80).length
      return {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        proficiency: cat.proficiency,
        itemCount: cat.items.length,
        masteredCount,
        growthDirection: 'stable' as const,
        categoryType: cat.categoryType,
      }
    })
  })

  // ---- 行囊健康度 ----

  const bagHealth = computed<BagHealth>(() => {
    const cats = store.categories
    const health = analytics.calculateSkillHealth(cats as any)

    let topSkill: { name: string; proficiency: number } | null = null
    let weakestSkill: { name: string; proficiency: number } | null = null

    for (const cat of cats) {
      if (!topSkill || cat.proficiency > topSkill.proficiency) {
        topSkill = { name: cat.name, proficiency: cat.proficiency }
      }
      if (!weakestSkill || cat.proficiency < weakestSkill.proficiency) {
        weakestSkill = { name: cat.name, proficiency: cat.proficiency }
      }
    }

    const suggestions: string[] = []
    if (cats.length === 0) {
      suggestions.push('开始添加你的技能分类，构建行囊')
    } else {
      if (health.weakItems > 0) {
        suggestions.push(`有 ${health.weakItems} 个类别熟练度偏低，需要加强练习`)
      }
      if (health.diversity < 0.5) {
        suggestions.push('技能多样性偏低，建议拓展新的技能类别')
      }
      if (health.healthScore < 40) {
        suggestions.push('整体技能健康度较低，建议制定系统学习计划')
      }
      if (health.masteredItems === 0) {
        suggestions.push('还没有精通级别的技能，循序渐进提升熟练度')
      }
      if (health.healthScore >= 60 && health.weakItems === 0) {
        suggestions.push('技能健康度良好，继续保持学习节奏')
      }
    }

    return {
      score: health.healthScore,
      totalItems: health.totalItems,
      avgProficiency: health.avgProficiency,
      masteredCount: health.masteredItems,
      weakCount: health.weakItems,
      diversity: health.diversity,
      healthScore: health.healthScore,
      topSkill,
      weakestSkill,
      suggestions,
    }
  })

  // ---- 雷达数据 ----

  const radarData = computed<SkillRadarData[]>(() => {
    return analytics.calculateSkillRadar(store.categories as any)
  })

  // ---- 成长趋势（最近 90 天） ----

  const growthTrendData = computed<GrowthTrend[]>(() => {
    return analytics.getGrowthTrend(90)
  })

  // ---- 熟练度预测 ----

  const predictions = computed<ProficiencyPrediction[]>(() => {
    return analytics.predictProficiency(store.categories as any)
  })

  // ---- 活跃学习路径 ----

  const activePaths = computed(() => {
    return analytics.activePaths.value
  })

  // ---- 技能推荐 ----

  const recommendations = computed<BagRecommendation[]>(() => {
    const recs: BagRecommendation[] = []
    const cats = store.categories
    const health = analytics.calculateSkillHealth(cats as any)
    const preds = predictions.value

    // 1. 关注薄弱技能（优先级最高）
    const weakCats = (cats as CategoryItem[]).filter((c: CategoryItem) => c.proficiency < 30)
    if (weakCats.length > 0) {
      const weakest = weakCats.sort((a: CategoryItem, b: CategoryItem) => a.proficiency - b.proficiency)[0]
      recs.push({
        type: 'focus_weakness',
        priority: 'high',
        title: '关注薄弱技能',
        description: `「${weakest.name}」熟练度仅为 ${weakest.proficiency}%，需要重点提升`,
        targetCategory: weakest.categoryType,
        targetCategoryName: weakest.name,
        expectedBenefit: '补齐短板，提升整体技能健康度',
      })
    }

    // 2. 冲击精通
    const midCats = cats.filter((c) => c.proficiency >= 30 && c.proficiency < 80)
    if (midCats.length > 0) {
      const closest = midCats.sort((a, b) => b.proficiency - a.proficiency)[0]
      recs.push({
        type: 'improve_proficiency',
        priority: 'medium',
        title: '冲击精通',
        description: `「${closest.name}」熟练度 ${closest.proficiency}%，距离精通（80%）仅差 ${80 - closest.proficiency}%`,
        targetCategory: closest.categoryType,
        targetCategoryName: closest.name,
        expectedBenefit: '将已有技能推向精通水平',
      })
    }

    // 3. 丰富技能库
    const emptyishCats = (cats as CategoryItem[]).filter((c: CategoryItem) => c.items.length < 3)
    if (emptyishCats.length > 0) {
      recs.push({
        type: 'add_item',
        priority: 'medium',
        title: '丰富技能库',
        description: `有 ${emptyishCats.length} 个类别物品较少，添加更多技能项`,
        expectedBenefit: '充实技能库，增加技能多样性',
      })
    }

    // 4. 探索新领域
    if (health.diversity < 0.6) {
      const uncovered = CATEGORY_TYPES.filter(
        (t) => !cats.some((c) => c.categoryType === t.value),
      )
      if (uncovered.length > 0) {
        recs.push({
          type: 'explore_category',
          priority: 'medium',
          title: '探索新领域',
          description: `还有 ${uncovered.length} 个技能类别未被覆盖：${uncovered.map((u) => u.label).join('、')}`,
          expectedBenefit: '拓展技能边界，提升综合竞争力',
        })
      }
    }

    // 5. 创建学习路径
    if (analytics.activePaths.value.length === 0 && cats.length > 0) {
      recs.push({
        type: 'learn_path',
        priority: 'low',
        title: '创建学习路径',
        description: '为技能成长制定系统化的学习路径，让进步更有方向',
        expectedBenefit: '结构化学习过程，提高学习效率',
      })
    }

    // 6. 基于预测的加速建议
    const slowGrowth = preds.filter(
      (p: ProficiencyPrediction) => p.dailyGrowthRate < 0.05 && p.currentProficiency < 80,
    )
    if (slowGrowth.length > 0 && cats.length > 0) {
      recs.push({
        type: 'improve_proficiency',
        priority: 'low',
        title: '加速成长',
        description: `${slowGrowth.length} 个类别的增长速率偏低，建议增加练习频率`,
        expectedBenefit: '提升学习效率，加快技能成长速度',
      })
    }

    return recs.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ---- 操作入口 ----

  /**
   * 添加物品到指定分类
   */
  function addItem(
    categoryId: string,
    name: string,
    proficiency: number = 1,
    note?: string,
  ): boolean {
    const target = store.savedCategories.find(
      (c: any) => c.id === categoryId,
    ) as CategoryItem | undefined
    if (!target) return false
    target.items.push({ name, proficiency: Math.max(1, Math.min(100, proficiency)), note })
    storage.setKV('bag:categories', store.savedCategories)
    return true
  }

  /**
   * 更新分类熟练度（以 5 为步长，0-100）
   */
  function updateProficiency(categoryId: string, proficiency: number): boolean {
    const stepped = Math.round(proficiency / 5) * 5
    const clamped = Math.max(0, Math.min(100, stepped))
    const target = store.savedCategories.find(
      (c: any) => c.id === categoryId,
    ) as CategoryItem | undefined
    if (!target) return false
    target.proficiency = clamped
    storage.setKV('bag:categories', store.savedCategories)
    return true
  }

  /**
   * 记录成长节点
   */
  function recordGrowthPoint(): void {
    analytics.recordGrowthPoint(store.categories as any)
  }

  /**
   * 创建学习路径
   */
  function createLearningPath(
    name: string,
    description: string,
    targetCategory: CategoryType,
  ): LearningPath {
    return analytics.createLearningPath(name, description, targetCategory)
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 聚合状态
    skillOverviews,
    bagHealth,
    radarData,
    growthTrendData,
    predictions,
    activePaths,
    recommendations,

    // 子模块直通（供高级场景使用）
    store,
    analytics,

    // 操作入口
    addItem,
    updateProficiency,
    recordGrowthPoint,
    createLearningPath,
  }
}