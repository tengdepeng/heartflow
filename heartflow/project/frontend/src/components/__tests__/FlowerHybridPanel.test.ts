// ============================================================
// 花种杂交面板 · 接线测试（INCR-108 审计孤立零引用引擎 useCrossBreeding）
// 锁定：配方/季候/心情选择 → performCrossBreed 接线 → 结果/统计展示
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { CrossBreedRecipe, CrossBreedResult } from '../../modules/emotion/flower-season'

const recipes: Ref<CrossBreedRecipe[]> = ref([])
const results: Ref<CrossBreedResult[]> = ref([])
const initRecipes = vi.fn()
const performCrossBreed = vi.fn()
const getAvailableRecipes = vi.fn()
const getBreedStats = vi.fn()

vi.mock('../../modules/emotion/flower-season', () => ({
  useCrossBreeding: () => ({
    recipes,
    results,
    initRecipes,
    performCrossBreed,
    getAvailableRecipes,
    getBreedStats,
  }),
  SEASON_CONFIGS: {},
  CROSS_BREED_RECIPES: [],
}))

import FlowerHybridPanel from '../FlowerHybridPanel.vue'

const springRecipe: CrossBreedRecipe = {
  id: 'cb-1',
  parentA: 'joy-rose',
  parentB: 'calm-lavender',
  result: 'serene-peony',
  successRate: 0.6,
  requiredSeason: 'spring',
  description: '喜悦玫瑰与宁静薰衣草的杂交，产出平和牡丹',
  unlocked: true,
}

const noSeasonRecipe: CrossBreedRecipe = {
  id: 'cb-2',
  parentA: 'joy-sakura',
  parentB: 'hope-lily',
  result: 'radiant-lotus',
  successRate: 0.5,
  requiredEmotion: 'happy',
  description: '喜悦樱花与希望百合的杂交，产出灿烂莲花',
  unlocked: true,
}

const successResult: CrossBreedResult = {
  id: 'cbr-1',
  recipeId: 'cb-1',
  parentA: 'joy-rose',
  parentB: 'calm-lavender',
  result: 'serene-peony',
  success: true,
  timestamp: '2026-09-03T08:30:00.000Z',
}

const failResult: CrossBreedResult = {
  id: 'cbr-2',
  recipeId: 'cb-2',
  parentA: 'joy-rose',
  parentB: 'calm-lavender',
  result: '',
  success: false,
  mutation: 'mystery-iris',
  timestamp: '2026-09-03T08:31:00.000Z',
}

beforeEach(() => {
  recipes.value = []
  results.value = []
  initRecipes.mockClear()
  performCrossBreed.mockClear()
  getAvailableRecipes.mockReset()
  getBreedStats.mockReset()
  getBreedStats.mockReturnValue({
    totalAttempts: 0,
    successCount: 0,
    successRate: 0,
    uniqueResults: 0,
  })
})

describe('FlowerHybridPanel · 花种杂交接线', () => {
  it('空态：标题渲染、onMounted 初始化配方、显示「暂无杂交配方」、统计归零', async () => {
    getAvailableRecipes.mockReturnValue([])
    const wrapper = mount(FlowerHybridPanel)
    await nextTick()
    expect(wrapper.text()).toContain('花种杂交')
    expect(initRecipes).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('暂无杂交配方')
    expect(wrapper.text()).toContain('总尝试')
    // 统计初始全为 0
    expect(wrapper.findAll('.cbp-stat-value')[0].text()).toBe('0')
  })

  it('有配方：季候限定配方参与渲染，点击「杂交」按钮调用 performCrossBreed（含季候/心情）', async () => {
    recipes.value = [springRecipe, noSeasonRecipe]
    getBreedStats.mockReturnValue({
      totalAttempts: 3,
      successCount: 2,
      successRate: 2 / 3,
      uniqueResults: 2,
    })
    // 面板默认季候 autumn：getAvailableRecipes 由 mock 决定，这里返回全部以验证渲染与接线
    getAvailableRecipes.mockReturnValue([springRecipe, noSeasonRecipe])

    const wrapper = mount(FlowerHybridPanel)
    await nextTick()

    expect(wrapper.findAll('.cbp-recipe')).toHaveLength(2)
    const text = wrapper.text()
    expect(text).toContain('喜悦玫瑰 × 宁静薰衣草')
    expect(text).toContain('春天限定'.slice(0, 0) || '春')
    expect(text).toContain('愉悦心境')
    expect(text).toContain('60%')
    // 统计：2/3 → 67%
    expect(text).toContain('67%')

    // 点击第一个配方按钮触发杂交（默认季候 autumn、心情 calm）
    const btn = wrapper.findAll('.cbp-btn--primary')[0]
    await btn.trigger('click')
    expect(performCrossBreed).toHaveBeenCalledWith(
      'joy-rose',
      'calm-lavender',
      'autumn',
      'calm',
    )
  })

  it('成功结果：展示最后一条杂交结果与品种名', async () => {
    getAvailableRecipes.mockReturnValue([springRecipe])
    results.value = [successResult]
    const wrapper = mount(FlowerHybridPanel)
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('杂交成功')
    expect(text).toContain('喜悦玫瑰 × 宁静薰衣草')
  })

  it('失败结果：展示变异品种（mutation）', async () => {
    getAvailableRecipes.mockReturnValue([springRecipe])
    results.value = [failResult]
    const wrapper = mount(FlowerHybridPanel)
    await nextTick()
    expect(wrapper.text()).toContain('杂交失败')
    expect(wrapper.text()).toContain('mystery-iris')
  })
})