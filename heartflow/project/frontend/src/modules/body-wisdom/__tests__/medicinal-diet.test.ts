// ============================================================
// 藏象阁 · 药膳食谱测试
// 食谱库完整性 + 检索筛选 + 今日药膳 + 收藏单例 + 洞察
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import {
  MEDICINAL_RECIPES,
  RECIPE_EFFECT_META,
  searchRecipes,
  recipesByEffect,
  recipesByConstitution,
  recipesBySolarTerm,
  recipeOfTheDay,
  randomRecipe,
  effectStats,
  useMedicinalDietStore,
  getMedicinalDietStore,
  medicinalDietInsights,
} from '../medicinal-diet'
import { storage } from '../../../engine/storage'

const STORAGE_KEY = 'hf:body-wisdom:recipe-favorites'

describe('MEDICINAL_RECIPES - 食谱库完整性', () => {
  it('包含至少 15 道食谱', () => {
    expect(MEDICINAL_RECIPES.length).toBeGreaterThanOrEqual(15)
  })

  it('id 唯一', () => {
    const ids = MEDICINAL_RECIPES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每道食谱字段完整', () => {
    for (const r of MEDICINAL_RECIPES) {
      expect(r.name.length).toBeGreaterThan(0)
      expect(RECIPE_EFFECT_META[r.effect]).toBeDefined()
      expect(r.constitutions.length).toBeGreaterThan(0)
      expect(r.solarTerms.length).toBeGreaterThan(0)
      expect(r.ingredients.length).toBeGreaterThan(0)
      expect(r.steps.length).toBeGreaterThan(0)
      expect(r.frequency.length).toBeGreaterThan(0)
      expect(r.taboo.length).toBeGreaterThan(0)
      expect([1, 2, 3]).toContain(r.difficulty)
      expect(r.description.length).toBeGreaterThan(0)
    }
  })

  it('RECIPE_EFFECT_META 覆盖全部功效', () => {
    const effects = new Set(MEDICINAL_RECIPES.map(r => r.effect))
    for (const e of effects) {
      expect(RECIPE_EFFECT_META[e]).toBeDefined()
    }
    expect(Object.keys(RECIPE_EFFECT_META).length).toBeGreaterThanOrEqual(8)
  })

  it('覆盖 10 种功效', () => {
    const effects = new Set(MEDICINAL_RECIPES.map(r => r.effect))
    expect(effects.size).toBe(10)
  })
})

describe('searchRecipes - 检索', () => {
  it('空关键词返回全部', () => {
    expect(searchRecipes('')).toHaveLength(MEDICINAL_RECIPES.length)
  })

  it('按名称检索', () => {
    const result = searchRecipes('四神汤')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].name).toContain('四神汤')
  })

  it('按功效检索', () => {
    const result = searchRecipes('健脾')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(r =>
      r.effect === '健脾' ||
      r.name.includes('健脾') ||
      r.description.includes('健脾') ||
      r.constitutions.some(c => c.includes('健脾')),
    )).toBe(true)
  })

  it('按体质检索', () => {
    const result = searchRecipes('阳虚')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(r => r.constitutions.some(c => c.includes('阳虚')))).toBe(true)
  })

  it('按节气检索', () => {
    const result = searchRecipes('冬至')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(r => r.solarTerms.includes('冬至'))).toBe(true)
  })

  it('按食材检索', () => {
    const result = searchRecipes('银耳')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(r => r.ingredients.some(i => i.includes('银耳')))).toBe(true)
  })

  it('无匹配返回空数组', () => {
    expect(searchRecipes('不存在的食材xyz')).toHaveLength(0)
  })
})

describe('recipesByEffect / recipesByConstitution / recipesBySolarTerm - 筛选', () => {
  it('按功效筛选', () => {
    const result = recipesByEffect('补气')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(r => r.effect === '补气')).toBe(true)
  })

  it('null 功效返回全部', () => {
    expect(recipesByEffect(null)).toHaveLength(MEDICINAL_RECIPES.length)
  })

  it('按体质筛选', () => {
    const result = recipesByConstitution('痰湿质')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(r => r.constitutions.includes('痰湿质'))).toBe(true)
  })

  it('按节气筛选', () => {
    const result = recipesBySolarTerm('冬至')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(r => r.solarTerms.includes('冬至'))).toBe(true)
  })
})

describe('recipeOfTheDay - 今日药膳', () => {
  it('同一天返回同一道', () => {
    const a = recipeOfTheDay(new Date(2026, 7, 24))
    const b = recipeOfTheDay(new Date(2026, 7, 24))
    expect(a.id).toBe(b.id)
  })

  it('不同日期可能不同', () => {
    const a = recipeOfTheDay(new Date(2026, 7, 24))
    const b = recipeOfTheDay(new Date(2026, 7, 25))
    expect(a.id).not.toBe(b.id)
  })

  it('返回的食谱存在于库中', () => {
    const r = recipeOfTheDay(new Date())
    expect(MEDICINAL_RECIPES.some(x => x.id === r.id)).toBe(true)
  })
})

describe('randomRecipe - 随机药膳', () => {
  it('返回库中存在的食谱', () => {
    const r = randomRecipe()
    expect(MEDICINAL_RECIPES.some(x => x.id === r.id)).toBe(true)
  })
})

describe('effectStats - 功效统计', () => {
  it('统计各功效数量', () => {
    const stats = effectStats()
    const total = stats.reduce((sum, s) => sum + s.count, 0)
    expect(total).toBe(MEDICINAL_RECIPES.length)
    expect(stats.length).toBe(10)
  })

  it('按数量降序排列', () => {
    const stats = effectStats()
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i - 1].count).toBeGreaterThanOrEqual(stats[i].count)
    }
  })
})

describe('getMedicinalDietStore - 收藏单例', () => {
  beforeEach(() => {
    storage.setKV(STORAGE_KEY, [])
  })

  it('多次调用返回同一实例', () => {
    const a = getMedicinalDietStore()
    const b = getMedicinalDietStore()
    expect(a).toBe(b)
  })

  it('收藏与取消收藏', () => {
    const store = getMedicinalDietStore()
    expect(store.isFavorite('sishen-soup')).toBe(false)
    store.toggleFavorite('sishen-soup')
    expect(store.isFavorite('sishen-soup')).toBe(true)
    expect(store.favorites.value).toHaveLength(1)
    store.toggleFavorite('sishen-soup')
    expect(store.isFavorite('sishen-soup')).toBe(false)
    expect(store.favorites.value).toHaveLength(0)
  })

  it('favoriteRecipes 解析收藏的食谱', () => {
    const store = getMedicinalDietStore()
    store.toggleFavorite('sishen-soup')
    store.toggleFavorite('danggui-lamb')
    expect(store.favoriteRecipes.value).toHaveLength(2)
    expect(store.favoriteRecipes.value[0].name).toBe('四神汤')
  })

  it('收藏持久化', () => {
    const store = getMedicinalDietStore()
    store.toggleFavorite('sishen-soup')
    const saved = storage.getKV<unknown[]>('hf:body-wisdom:recipe-favorites', [])
    expect(saved).toHaveLength(1)
  })

  it('load() 从存储重载', () => {
    const writer = useMedicinalDietStore()
    writer.toggleFavorite('sishen-soup')

    const store = getMedicinalDietStore()
    store.load()
    expect(store.favorites.value).toHaveLength(1)
  })
})

describe('medicinalDietInsights - 药膳洞察', () => {
  it('返回今日药膳与功效统计', () => {
    const insight = medicinalDietInsights(new Date(2026, 7, 24))
    expect(insight.today.id.length).toBeGreaterThan(0)
    expect(insight.byEffect.length).toBe(10)
  })

  it('返回收藏数与节气推荐', () => {
    const insight = medicinalDietInsights(new Date(2026, 7, 24))
    expect(insight.favoriteCount).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(insight.seasonal)).toBe(true)
  })
})
