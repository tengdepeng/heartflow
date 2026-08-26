// ============================================================
// 匠庐 · 材料合成系统
// 蓝图：合成配方、材料组合、成功率计算、特殊效果
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { CraftWork } from './types'

// ---- 合成配方 ----

export interface SynthesisRecipe {
  id: string
  name: string
  description: string
  /** 所需材料：materialId -> 数量 */
  inputs: Record<string, number>
  /** 产出材料：materialId -> 数量 */
  outputs: Record<string, number>
  /** 基础成功率 0-1 */
  baseSuccessRate: number
  /** 合成时长（分钟），0 表示即时 */
  duration: number
  /** 配方分类 */
  category: 'basic' | 'advanced' | 'master' | 'legendary'
  /** 是否已解锁 */
  unlocked: boolean
  /** 解锁条件 */
  unlockCondition?: {
    type: 'work_count' | 'material_quantity' | 'specific_material' | 'evolution_level'
    value: number
    materialId?: string
  }
  /** 特殊效果 */
  effects: SynthesisEffect[]
  createdAt: string
}

export interface SynthesisEffect {
  type: 'bonus_yield' | 'quality_up' | 'speed_boost' | 'cost_reduction' | 'special_output'
  description: string
  chance: number // 0-1
  magnitude: number // 效果倍率
}

export interface SynthesisResult {
  id: string
  recipeId: string
  recipeName: string
  success: boolean
  actualRate: number
  inputsUsed: Record<string, number>
  outputsProduced: Record<string, number>
  effectsTriggered: SynthesisEffect[]
  wastedMaterials: Record<string, number>
  timestamp: string
  duration: number
}

export interface SynthesisStats {
  totalAttempts: number
  successCount: number
  failureCount: number
  overallSuccessRate: number
  byRecipe: Record<string, { attempts: number; successes: number }>
  mostUsedRecipe: string | null
  totalMaterialsProduced: number
  totalMaterialsWasted: number
}

// ---- 合成队列 ----

export interface SynthesisQueueItem {
  id: string
  recipeId: string
  recipeName: string
  startTime: string
  endTime: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-1
}

// ---- 存储键 ----

const SYNTHESIS_STORAGE_KEYS = {
  RECIPES: 'craft:synthesis:recipes',
  RESULTS: 'craft:synthesis:results',
  QUEUE: 'craft:synthesis:queue',
} as const

// ---- 默认配方 ----

const DEFAULT_RECIPES: Omit<SynthesisRecipe, 'id' | 'createdAt'>[] = [
  {
    name: '灵感结晶',
    description: '将2个灵感碎片合成为1个灵感结晶',
    inputs: { 'inspiration-shard': 2 },
    outputs: { 'inspiration-crystal': 1 },
    baseSuccessRate: 0.85,
    duration: 5,
    category: 'basic',
    unlocked: true,
    effects: [
      { type: 'bonus_yield', description: '有概率额外产出1个', chance: 0.1, magnitude: 1 },
    ],
  },
  {
    name: '时间精华',
    description: '将3个时间结晶浓缩为1个时间精华',
    inputs: { 'time-crystal': 3 },
    outputs: { 'time-essence': 1 },
    baseSuccessRate: 0.75,
    duration: 10,
    category: 'advanced',
    unlocked: true,
    effects: [
      { type: 'quality_up', description: '有概率提升品质等级', chance: 0.15, magnitude: 1 },
    ],
  },
  {
    name: '专注灵药',
    description: '专注精华+宁静之露合成专注灵药',
    inputs: { 'focus-essence': 1, 'serenity-dew': 1 },
    outputs: { 'focus-elixir': 1 },
    baseSuccessRate: 0.7,
    duration: 15,
    category: 'advanced',
    unlocked: true,
    effects: [
      { type: 'speed_boost', description: '有概率缩短下次合成时间', chance: 0.2, magnitude: 0.5 },
      { type: 'bonus_yield', description: '有概率双倍产出', chance: 0.05, magnitude: 2 },
    ],
  },
  {
    name: '创意熔炉',
    description: '创意火花+知识之泉合成创意熔炉',
    inputs: { 'creative-spark': 1, 'knowledge-spring': 1 },
    outputs: { 'creative-forge': 1 },
    baseSuccessRate: 0.65,
    duration: 20,
    category: 'master',
    unlocked: true,
    effects: [
      { type: 'special_output', description: '有概率产出随机稀有材料', chance: 0.08, magnitude: 1 },
    ],
  },
  {
    name: '匠心之魂',
    description: '匠心之锤+突破之星合成匠心之魂',
    inputs: { 'craft-hammer': 1, 'breakthrough-star': 1 },
    outputs: { 'craft-soul': 1 },
    baseSuccessRate: 0.5,
    duration: 30,
    category: 'legendary',
    unlocked: true,
    effects: [
      { type: 'quality_up', description: '有概率产出传说品质', chance: 0.1, magnitude: 2 },
      { type: 'bonus_yield', description: '有概率额外产出匠心之锤', chance: 0.15, magnitude: 1 },
    ],
  },
]

// ============================================================
// useSynthesis
// ============================================================

export function useSynthesis() {
  const recipes = ref<SynthesisRecipe[]>([])
  const results = ref<SynthesisResult[]>([])
  const queue = ref<SynthesisQueueItem[]>([])

  // ---- 持久化 ----

  function loadAll(): void {
    const storedRecipes = storage.getKV<SynthesisRecipe[]>(SYNTHESIS_STORAGE_KEYS.RECIPES, [])
    if (storedRecipes && storedRecipes.length > 0) {
      recipes.value = storedRecipes
    } else {
      // 初始化默认配方
      recipes.value = DEFAULT_RECIPES.map((r) => ({
        ...r,
        id: `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      }))
      saveRecipes()
    }

    results.value = storage.getKV<SynthesisResult[]>(SYNTHESIS_STORAGE_KEYS.RESULTS, []) || []
    queue.value = storage.getKV<SynthesisQueueItem[]>(SYNTHESIS_STORAGE_KEYS.QUEUE, []) || []
  }

  function saveRecipes(): void {
    storage.setKV(SYNTHESIS_STORAGE_KEYS.RECIPES, recipes.value)
  }

  function saveResults(): void {
    storage.setKV(SYNTHESIS_STORAGE_KEYS.RESULTS, results.value)
  }

  function saveQueue(): void {
    storage.setKV(SYNTHESIS_STORAGE_KEYS.QUEUE, queue.value)
  }

  // ---- 配方管理 ----

  function addRecipe(recipe: Omit<SynthesisRecipe, 'id' | 'createdAt'>): SynthesisRecipe {
    const newRecipe: SynthesisRecipe = {
      ...recipe,
      id: `recipe-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    recipes.value.push(newRecipe)
    saveRecipes()
    return newRecipe
  }

  function updateRecipe(recipeId: string, updates: Partial<SynthesisRecipe>): SynthesisRecipe | undefined {
    const idx = recipes.value.findIndex((r) => r.id === recipeId)
    if (idx === -1) return undefined
    recipes.value[idx] = { ...recipes.value[idx], ...updates }
    saveRecipes()
    return recipes.value[idx]
  }

  function removeRecipe(recipeId: string): void {
    recipes.value = recipes.value.filter((r) => r.id !== recipeId)
    saveRecipes()
  }

  function getRecipe(recipeId: string): SynthesisRecipe | undefined {
    return recipes.value.find((r) => r.id === recipeId)
  }

  function getRecipesByCategory(category: SynthesisRecipe['category']): SynthesisRecipe[] {
    return recipes.value.filter((r) => r.category === category)
  }

  function getUnlockedRecipes(): SynthesisRecipe[] {
    return recipes.value.filter((r) => r.unlocked)
  }

  // ---- 配方解锁 ----

  function checkUnlockConditions(
    recipe: SynthesisRecipe,
    works: CraftWork[],
    materialQuantities: Record<string, number>,
  ): boolean {
    if (!recipe.unlockCondition) return true

    const condition = recipe.unlockCondition

    switch (condition.type) {
      case 'work_count':
        return works.length >= condition.value
      case 'material_quantity':
        if (condition.materialId) {
          return (materialQuantities[condition.materialId] || 0) >= condition.value
        }
        return Object.values(materialQuantities).reduce((sum, q) => sum + q, 0) >= condition.value
      case 'specific_material':
        return condition.materialId ? (materialQuantities[condition.materialId] || 0) > 0 : false
      case 'evolution_level':
        return works.some((w) => w.evolution >= condition.value)
      default:
        return false
    }
  }

  function unlockRecipe(recipeId: string): SynthesisRecipe | undefined {
    const recipe = recipes.value.find((r) => r.id === recipeId)
    if (!recipe) return undefined
    recipe.unlocked = true
    saveRecipes()
    return recipe
  }

  function autoUnlockRecipes(works: CraftWork[], materialQuantities: Record<string, number>): SynthesisRecipe[] {
    const newlyUnlocked: SynthesisRecipe[] = []
    recipes.value.forEach((recipe) => {
      if (!recipe.unlocked && checkUnlockConditions(recipe, works, materialQuantities)) {
        recipe.unlocked = true
        newlyUnlocked.push(recipe)
      }
    })
    if (newlyUnlocked.length > 0) saveRecipes()
    return newlyUnlocked
  }

  // ---- 合成执行 ----

  function executeSynthesis(
    recipeId: string,
    availableMaterials: Record<string, number>,
  ): SynthesisResult | null {
    const recipe = recipes.value.find((r) => r.id === recipeId)
    if (!recipe || !recipe.unlocked) return null

    // 检查材料是否足够
    const inputsUsed: Record<string, number> = {}
    for (const [matId, required] of Object.entries(recipe.inputs)) {
      const available = availableMaterials[matId] || 0
      if (available < required) return null
      inputsUsed[matId] = required
    }

    // 计算实际成功率
    const actualRate = calculateSuccessRate(recipe)

    // 判断是否成功
    const success = Math.random() < actualRate

    // 计算产出
    const outputsProduced: Record<string, number> = {}
    const effectsTriggered: SynthesisEffect[] = []
    const wastedMaterials: Record<string, number> = {}

    if (success) {
      // 基础产出
      for (const [matId, qty] of Object.entries(recipe.outputs)) {
        outputsProduced[matId] = qty
      }

      // 检查特殊效果
      recipe.effects.forEach((effect) => {
        if (Math.random() < effect.chance) {
          effectsTriggered.push(effect)

          switch (effect.type) {
            case 'bonus_yield':
              // 额外产出
              for (const [matId, qty] of Object.entries(recipe.outputs)) {
                outputsProduced[matId] = (outputsProduced[matId] || 0) + Math.ceil(qty * effect.magnitude)
              }
              break
            case 'quality_up':
              // 品质提升（标记在产出上）
              break
            case 'special_output':
              // 随机稀有产出
              outputsProduced['random-rare-material'] = 1
              break
          }
        }
      })
    } else {
      // 失败：材料浪费
      for (const [matId, required] of Object.entries(recipe.inputs)) {
        wastedMaterials[matId] = Math.ceil(required * 0.5) // 失败损失50%材料
      }
    }

    const result: SynthesisResult = {
      id: `syn-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      success,
      actualRate: Math.round(actualRate * 100) / 100,
      inputsUsed,
      outputsProduced,
      effectsTriggered,
      wastedMaterials,
      timestamp: new Date().toISOString(),
      duration: recipe.duration,
    }

    results.value.push(result)
    saveResults()

    return result
  }

  function calculateSuccessRate(recipe: SynthesisRecipe): number {
    let rate = recipe.baseSuccessRate

    // 历史合成加成（每成功合成10次同配方，+5%成功率，上限+20%）
    const historyResults = results.value.filter((r) => r.recipeId === recipe.id)
    const successCount = historyResults.filter((r) => r.success).length
    const historyBonus = Math.min(Math.floor(successCount / 10) * 0.05, 0.2)
    rate += historyBonus

    // 连续失败补偿（每次失败+3%，上限+15%）
    let consecutiveFailures = 0
    for (let i = historyResults.length - 1; i >= 0; i--) {
      if (!historyResults[i].success) consecutiveFailures++
      else break
    }
    const failureBonus = Math.min(consecutiveFailures * 0.03, 0.15)
    rate += failureBonus

    return Math.min(rate, 0.95) // 上限95%
  }

  // ---- 合成队列 ----

  function enqueueSynthesis(recipeId: string): SynthesisQueueItem | null {
    const recipe = recipes.value.find((r) => r.id === recipeId)
    if (!recipe || !recipe.unlocked) return null

    const now = new Date()
    const endTime = new Date(now.getTime() + recipe.duration * 60 * 1000)

    const item: SynthesisQueueItem = {
      id: `sq-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      status: 'pending',
      progress: 0,
    }

    queue.value.push(item)
    saveQueue()
    return item
  }

  function updateQueueProgress(itemId: string): SynthesisQueueItem | undefined {
    const item = queue.value.find((q) => q.id === itemId)
    if (!item) return undefined

    const now = new Date().getTime()
    const start = new Date(item.startTime).getTime()
    const end = new Date(item.endTime).getTime()

    if (now >= end) {
      item.progress = 1
      item.status = 'completed'
    } else {
      item.progress = (now - start) / (end - start)
      if (item.status === 'pending') item.status = 'in_progress'
    }

    saveQueue()
    return item
  }

  function cancelQueueItem(itemId: string): SynthesisQueueItem | undefined {
    const item = queue.value.find((q) => q.id === itemId)
    if (!item || item.status === 'completed' || item.status === 'failed') return undefined

    item.status = 'cancelled'
    saveQueue()
    return item
  }

  function getActiveQueueItems(): SynthesisQueueItem[] {
    return queue.value.filter((q) => q.status === 'pending' || q.status === 'in_progress')
  }

  function clearCompletedQueue(): void {
    queue.value = queue.value.filter((q) => q.status !== 'completed' && q.status !== 'cancelled')
    saveQueue()
  }

  // ---- 统计 ----

  function getSynthesisStats(): SynthesisStats {
    const totalAttempts = results.value.length
    const successCount = results.value.filter((r) => r.success).length
    const failureCount = totalAttempts - successCount

    const byRecipe: Record<string, { attempts: number; successes: number }> = {}
    results.value.forEach((r) => {
      if (!byRecipe[r.recipeId]) {
        byRecipe[r.recipeId] = { attempts: 0, successes: 0 }
      }
      byRecipe[r.recipeId].attempts++
      if (r.success) byRecipe[r.recipeId].successes++
    })

    let mostUsedRecipe: string | null = null
    let maxAttempts = 0
    for (const [recipeId, data] of Object.entries(byRecipe)) {
      if (data.attempts > maxAttempts) {
        maxAttempts = data.attempts
        mostUsedRecipe = recipeId
      }
    }

    const totalProduced = results.value.reduce(
      (sum, r) => sum + Object.values(r.outputsProduced).reduce((s, q) => s + q, 0),
      0,
    )
    const totalWasted = results.value.reduce(
      (sum, r) => sum + Object.values(r.wastedMaterials).reduce((s, q) => s + q, 0),
      0,
    )

    return {
      totalAttempts,
      successCount,
      failureCount,
      overallSuccessRate: totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 100) / 100 : 0,
      byRecipe,
      mostUsedRecipe,
      totalMaterialsProduced: totalProduced,
      totalMaterialsWasted: totalWasted,
    }
  }

  function getRecentResults(limit: number = 10): SynthesisResult[] {
    return results.value
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // ---- 初始化 ----

  loadAll()

  return {
    recipes,
    results,
    queue,
    // 配方
    addRecipe,
    updateRecipe,
    removeRecipe,
    getRecipe,
    getRecipesByCategory,
    getUnlockedRecipes,
    unlockRecipe,
    autoUnlockRecipes,
    checkUnlockConditions,
    // 合成
    executeSynthesis,
    calculateSuccessRate,
    // 队列
    enqueueSynthesis,
    updateQueueProgress,
    cancelQueueItem,
    getActiveQueueItems,
    clearCompletedQueue,
    // 统计
    getSynthesisStats,
    getRecentResults,
    loadAll,
  }
}