// ============================================================
// 行囊 · 技能分析引擎
// 技能雷达图、成长趋势、学习路径、熟练度预测
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { CategoryItem, CategoryType } from './types'
import { CATEGORY_TYPES } from './defaults'

// ============================================================
// 类型定义
// ============================================================

/** 技能雷达数据 */
export interface SkillRadarData {
  category: CategoryType
  label: string
  proficiency: number
  itemCount: number
  /** 与上次相比的变化 */
  change: number
}

/** 成长趋势 */
export interface GrowthTrend {
  date: string
  totalProficiency: number
  avgProficiency: number
  newItems: number
  masteredItems: number
}

/** 学习路径 */
export interface LearningPath {
  id: string
  name: string
  description: string
  /** 目标类别 */
  targetCategory: CategoryType
  /** 步骤 */
  steps: LearningStep[]
  /** 当前步骤 */
  currentStep: number
  /** 完成状态 */
  completed: boolean
  createdAt: string
}

/** 学习步骤 */
export interface LearningStep {
  name: string
  description: string
  /** 目标熟练度 */
  targetProficiency: number
  /** 是否完成 */
  completed: boolean
  /** 完成时间 */
  completedAt?: string
}

/** 熟练度预测 */
export interface ProficiencyPrediction {
  category: CategoryType
  label: string
  currentProficiency: number
  /** 预测30天后熟练度 */
  predicted30Days: number
  /** 预测90天后熟练度 */
  predicted90Days: number
  /** 达到80所需天数 */
  daysTo80: number | null
  /** 增长率（每天） */
  dailyGrowthRate: number
}

/** 技能健康度 */
export interface SkillHealth {
  /** 总物品数 */
  totalItems: number
  /** 平均熟练度 */
  avgProficiency: number
  /** 精通物品数（>=80） */
  masteredItems: number
  /** 薄弱物品数（<30） */
  weakItems: number
  /** 覆盖类别数 */
  coveredCategories: number
  /** 技能多样性 0-1 */
  diversity: number
  /** 整体健康评分 0-100 */
  healthScore: number
}

/** 存储键 */
const GROWTH_TREND_KEY = 'hf:bag:growth_trend'
const LEARNING_PATHS_KEY = 'hf:bag:learning_paths'

// ============================================================
// 技能分析引擎
// ============================================================

export function useBagAnalytics() {
  const growthTrend = ref<GrowthTrend[]>(loadGrowthTrend())
  const learningPaths = ref<LearningPath[]>(loadLearningPaths())

  // ---- 持久化 ----

  function loadGrowthTrend(): GrowthTrend[] {
    try {
      const raw = storage.getKV<string>(GROWTH_TREND_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveGrowthTrend() {
    storage.setKV(GROWTH_TREND_KEY, JSON.stringify(growthTrend.value))
  }

  function loadLearningPaths(): LearningPath[] {
    try {
      const raw = storage.getKV<string>(LEARNING_PATHS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveLearningPaths() {
    storage.setKV(LEARNING_PATHS_KEY, JSON.stringify(learningPaths.value))
  }

  // ---- 技能雷达 ----

  /** 计算技能雷达数据 */
  function calculateSkillRadar(categories: CategoryItem[]): SkillRadarData[] {
    return categories.map(cat => ({
      category: cat.categoryType,
      label: CATEGORY_TYPES.find(t => t.value === cat.categoryType)?.label ?? cat.name,
      proficiency: cat.proficiency,
      itemCount: cat.items.length,
      change: 0, // 需要历史数据对比
    }))
  }

  /** 获取技能雷达摘要 */
  const skillRadarSummary = computed(() => {
    const radar = calculateSkillRadar([])
    const avgProficiency = radar.length > 0
      ? Math.round(radar.reduce((sum, r) => sum + r.proficiency, 0) / radar.length)
      : 0
    const strongest = radar.reduce((max, r) => r.proficiency > max.proficiency ? r : max, radar[0] || { category: 'tool' as CategoryType, label: '', proficiency: 0, itemCount: 0, change: 0 })
    const weakest = radar.reduce((min, r) => r.proficiency < min.proficiency ? r : min, radar[0] || { category: 'tool' as CategoryType, label: '', proficiency: 100, itemCount: 0, change: 0 })
    return { avgProficiency, strongest, weakest, radar }
  })

  // ---- 成长趋势 ----

  /** 记录成长趋势点 */
  function recordGrowthPoint(categories: CategoryItem[]) {
    const totalProficiency = categories.reduce((sum, c) => sum + c.proficiency, 0)
    const avgProficiency = categories.length > 0 ? Math.round(totalProficiency / categories.length) : 0
    const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0)
    const masteredItems = categories.filter(c => c.proficiency >= 80).length

    const point: GrowthTrend = {
      date: getLocalDateKey(),
      totalProficiency,
      avgProficiency,
      newItems: totalItems,
      masteredItems,
    }

    // 避免同一天重复记录
    const existing = growthTrend.value.find(t => t.date === point.date)
    if (existing) {
      Object.assign(existing, point)
    } else {
      growthTrend.value.push(point)
    }
    if (growthTrend.value.length > 365) growthTrend.value = growthTrend.value.slice(-365)
    saveGrowthTrend()
  }

  /** 获取成长趋势（最近N天） */
  function getGrowthTrend(days: number = 90): GrowthTrend[] {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = getLocalDateKey(cutoff)
    return growthTrend.value
      .filter(t => t.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // ---- 学习路径 ----

  /** 创建学习路径 */
  function createLearningPath(name: string, description: string, targetCategory: CategoryType): LearningPath {
    const path: LearningPath = {
      id: `lp_${Date.now()}`,
      name,
      description,
      targetCategory,
      steps: [],
      currentStep: 0,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    learningPaths.value.push(path)
    saveLearningPaths()
    return path
  }

  /** 添加学习步骤 */
  function addLearningStep(pathId: string, name: string, description: string, targetProficiency: number): boolean {
    const path = learningPaths.value.find(p => p.id === pathId)
    if (!path) return false
    path.steps.push({ name, description, targetProficiency, completed: false })
    saveLearningPaths()
    return true
  }

  /** 完成学习步骤 */
  function completeStep(pathId: string, stepIndex: number): boolean {
    const path = learningPaths.value.find(p => p.id === pathId)
    if (!path || stepIndex >= path.steps.length) return false
    path.steps[stepIndex].completed = true
    path.steps[stepIndex].completedAt = new Date().toISOString()
    path.currentStep = Math.max(path.currentStep, stepIndex + 1)
    if (path.steps.every(s => s.completed)) {
      path.completed = true
    }
    saveLearningPaths()
    return true
  }

  /** 获取进行中的学习路径 */
  const activePaths = computed(() => {
    return learningPaths.value.filter(p => !p.completed)
  })

  // ---- 熟练度预测 ----

  /** 预测熟练度 */
  function predictProficiency(categories: CategoryItem[]): ProficiencyPrediction[] {
    const trend = growthTrend.value
    if (trend.length < 2) {
      return categories.map(cat => ({
        category: cat.categoryType,
        label: CATEGORY_TYPES.find(t => t.value === cat.categoryType)?.label ?? cat.name,
        currentProficiency: cat.proficiency,
        predicted30Days: cat.proficiency,
        predicted90Days: cat.proficiency,
        daysTo80: cat.proficiency >= 80 ? null : null,
        dailyGrowthRate: 0,
      }))
    }

    // 计算每日增长率
    const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
    const dailyGrowthRate = days > 0 ? (last.avgProficiency - first.avgProficiency) / days : 0

    return categories.map(cat => {
      const predicted30 = Math.min(100, Math.round(cat.proficiency + dailyGrowthRate * 30))
      const predicted90 = Math.min(100, Math.round(cat.proficiency + dailyGrowthRate * 90))
      const daysTo80 = cat.proficiency >= 80 ? null
        : dailyGrowthRate > 0 ? Math.ceil((80 - cat.proficiency) / dailyGrowthRate)
        : null

      return {
        category: cat.categoryType,
        label: CATEGORY_TYPES.find(t => t.value === cat.categoryType)?.label ?? cat.name,
        currentProficiency: cat.proficiency,
        predicted30Days: predicted30,
        predicted90Days: predicted90,
        daysTo80,
        dailyGrowthRate: Math.round(dailyGrowthRate * 100) / 100,
      }
    })
  }

  // ---- 技能健康度 ----

  /** 计算技能健康度 */
  function calculateSkillHealth(categories: CategoryItem[]): SkillHealth {
    const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0)
    const avgProficiency = categories.length > 0
      ? Math.round(categories.reduce((sum, c) => sum + c.proficiency, 0) / categories.length)
      : 0
    const masteredItems = categories.filter(c => c.proficiency >= 80).length
    const weakItems = categories.filter(c => c.proficiency < 30).length
    const coveredCategories = new Set(categories.map(c => c.categoryType)).size
    const diversity = CATEGORY_TYPES.length > 0 ? coveredCategories / CATEGORY_TYPES.length : 0

    // 健康评分
    const proficiencyScore = Math.min(40, avgProficiency * 0.4)
    const diversityScore = diversity * 30
    const masteryScore = categories.length > 0 ? (masteredItems / categories.length) * 30 : 0
    const healthScore = Math.round(proficiencyScore + diversityScore + masteryScore)

    return {
      totalItems,
      avgProficiency,
      masteredItems,
      weakItems,
      coveredCategories,
      diversity: Math.round(diversity * 100) / 100,
      healthScore,
    }
  }

  return {
    growthTrend,
    learningPaths,
    skillRadarSummary,
    activePaths,
    calculateSkillRadar,
    recordGrowthPoint,
    getGrowthTrend,
    createLearningPath,
    addLearningStep,
    completeStep,
    predictProficiency,
    calculateSkillHealth,
  }
}