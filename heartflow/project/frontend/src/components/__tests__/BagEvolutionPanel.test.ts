import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type {
  EvolutionPath,
  EvolutionStage,
  EvolutionProgress,
  EvolutionStats,
} from '../../modules/bag/evolution'

// ---- 进化引擎 mock（保留真实 EVOLUTION_STAGE_META / STAGE_THRESHOLDS） ----
const paths: Ref<EvolutionPath[]> = ref([])

const stats = computed<EvolutionStats>(() => {
  const total = paths.value.length
  const completed = paths.value.filter((p) => p.currentStage === 'harvest').length
  const dist: Record<EvolutionStage, number> = { seed: 0, sprout: 0, bloom: 0, fruit: 0, harvest: 0 }
  for (const p of paths.value) dist[p.currentStage]++
  return { totalPaths: total, activePaths: total - completed, completedPaths: completed, stageDistribution: dist }
})

function makePath(id: string, itemName: string, currentStage: EvolutionStage): EvolutionPath {
  return {
    id,
    itemName,
    currentStage,
    stages: [],
    startedAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

const addPath = vi.fn((itemName: string) => {
  const p = makePath(`evo-${paths.value.length + 1}`, itemName, 'seed')
  paths.value = [...paths.value, p]
  return p
})
const removePath = vi.fn((id: string) => {
  const before = paths.value.length
  paths.value = paths.value.filter((p) => p.id !== id)
  return paths.value.length < before
})
const checkProgress = vi.fn((pathId: string, values: { proficiency: number; count: number }): EvolutionProgress => {
  const p = paths.value.find((x) => x.id === pathId)
  if (!p || p.currentStage === 'harvest') {
    return { canEvolve: false, nextStage: null, requirements: [], unmetRequirements: [] }
  }
  const next: EvolutionStage =
    p.currentStage === 'seed' ? 'sprout'
      : p.currentStage === 'sprout' ? 'bloom'
        : p.currentStage === 'bloom' ? 'fruit'
          : 'harvest'
  const requirements = [
    { type: 'proficiency' as const, target: 20, current: values?.proficiency ?? 0 },
    { type: 'count' as const, target: 1, current: values?.count ?? 0 },
  ]
  const unmetRequirements = requirements.filter((r) => r.current < r.target)
  return { canEvolve: unmetRequirements.length === 0, nextStage: next, requirements, unmetRequirements }
})
const evolveItem = vi.fn((pathId: string, values: { proficiency: number; count: number }) => {
  const progress = checkProgress(pathId, values)
  const p = paths.value.find((x) => x.id === pathId)
  if (!p || !progress.canEvolve || !progress.nextStage) return { success: false }
  p.currentStage = progress.nextStage
  return { success: true, path: p, nextStage: progress.nextStage }
})
const getAvailableEvolutions = vi.fn((itemData: Record<string, { proficiency: number; count: number }>) =>
  paths.value.filter((p) => checkProgress(p.id, itemData[p.itemName] ?? { proficiency: 0, count: 0 }).canEvolve),
)
const load = vi.fn()
const persist = vi.fn()

vi.mock('../../modules/bag/evolution', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/bag/evolution')>()
  return {
    ...actual,
    useBagEvolution: () => ({
      paths,
      addPath,
      removePath,
      checkProgress,
      evolveItem,
      getEvolutionStats: stats,
      getAvailableEvolutions,
      load,
      persist,
    }),
  }
})

import BagEvolutionPanel from '../BagEvolutionPanel.vue'

beforeEach(() => {
  paths.value = []
  addPath.mockClear()
  removePath.mockClear()
  checkProgress.mockClear()
  evolveItem.mockClear()
  getAvailableEvolutions.mockClear()
  load.mockClear()
  persist.mockClear()
})

describe('BagEvolutionPanel · 物品进化接线', () => {
  it('空态：标题 + 副题 + 统计 0 + 空态提示', async () => {
    const wrapper = mount(BagEvolutionPanel)
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('物品进化')
    expect(text).toContain('种子 · 萌芽 · 绽放 · 硕果 · 丰收')
    expect(text).toContain('总路径')
    expect(text).toContain('进行中')
    expect(text).toContain('已丰收')
    expect(text).toContain('暂无进化路径')
  })

  it('添加路径：输入名称点添加 → addPath 接线 + 列表渲染', async () => {
    const wrapper = mount(BagEvolutionPanel)
    await nextTick()
    const input = wrapper.find('.bep-input')
    await input.setValue('吉他')
    const addBtn = wrapper.findAll('.bep-btn').find((b) => b.text().includes('添加'))
    await addBtn!.trigger('click')
    expect(addPath).toHaveBeenCalledWith('吉他')
    await nextTick()
    expect(wrapper.text()).toContain('吉他')
    expect(wrapper.text()).toContain('种子')
  })

  it('删除路径：点删除 → removePath 接线', async () => {
    paths.value = [makePath('evo-1', '吉他', 'seed')]
    const wrapper = mount(BagEvolutionPanel)
    await nextTick()
    const delBtn = wrapper.findAll('.bep-btn').find((b) => b.text().includes('删除'))
    await delBtn!.trigger('click')
    expect(removePath).toHaveBeenCalledWith('evo-1')
  })

  it('需求列表：渲染熟练度/数量 current/target + 未满足高亮', async () => {
    paths.value = [makePath('evo-1', '吉他', 'seed')]
    const wrapper = mount(BagEvolutionPanel, {
      props: { itemData: { 吉他: { proficiency: 10, count: 1 } } },
    })
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('熟练度')
    expect(text).toContain('数量')
    expect(text).toContain('10 / 20')
    expect(text).toContain('1 / 1')
    // 熟练度未满足 → 该需求行带 unmet 类
    const reqs = wrapper.findAll('.bep-req')
    expect(reqs[0].classes()).toContain('unmet')
    expect(reqs[1].classes()).not.toContain('unmet')
  })

  it('可进化：满足条件时显示可进化徽标 + 进化按钮 → evolveItem 接线', async () => {
    paths.value = [makePath('evo-1', '吉他', 'seed')]
    const wrapper = mount(BagEvolutionPanel, {
      props: { itemData: { 吉他: { proficiency: 20, count: 1 } } },
    })
    await nextTick()
    expect(wrapper.text()).toContain('可进化')
    const evolveBtn = wrapper.findAll('.bep-btn').find((b) => b.text().includes('进化至萌芽'))
    await evolveBtn!.trigger('click')
    expect(evolveItem).toHaveBeenCalledWith('evo-1', { proficiency: 20, count: 1 })
    expect(persist).toHaveBeenCalled()
  })

  it('进化后阶段推进：列表显示新阶段', async () => {
    paths.value = [makePath('evo-1', '吉他', 'seed')]
    const wrapper = mount(BagEvolutionPanel, {
      props: { itemData: { 吉他: { proficiency: 20, count: 1 } } },
    })
    await nextTick()
    const evolveBtn = wrapper.findAll('.bep-btn').find((b) => b.text().includes('进化至萌芽'))
    await evolveBtn!.trigger('click')
    await nextTick()
    // mock evolveItem 已把 currentStage 推进为 sprout
    expect(wrapper.text()).toContain('萌芽')
  })

  it('可进化物品列表：getAvailableEvolutions 渲染', async () => {
    paths.value = [
      makePath('evo-1', '吉他', 'seed'),
      makePath('evo-2', '钢琴', 'sprout'),
    ]
    const wrapper = mount(BagEvolutionPanel, {
      props: { itemData: { 吉他: { proficiency: 20, count: 1 }, 钢琴: { proficiency: 0, count: 0 } } },
    })
    await nextTick()
    // 吉他满足 seed→sprout，钢琴不满足
    expect(wrapper.text()).toContain('可进化物品')
    const avail = wrapper.findAll('.bep-avail')
    expect(avail.length).toBe(1)
    expect(avail[0].text()).toContain('吉他')
  })

  it('阶段分布统计：按当前阶段计数渲染', async () => {
    paths.value = [
      makePath('evo-1', '吉他', 'seed'),
      makePath('evo-2', '钢琴', 'harvest'),
    ]
    const wrapper = mount(BagEvolutionPanel)
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('总路径')
    expect(text).toContain('2')
    expect(text).toContain('已丰收')
    expect(text).toContain('1')
  })

  it('已达最终阶段：显示丰收提示且无进化按钮', async () => {
    paths.value = [makePath('evo-1', '吉他', 'harvest')]
    const wrapper = mount(BagEvolutionPanel)
    await nextTick()
    expect(wrapper.text()).toContain('已达最终阶段')
    const evolveBtn = wrapper.findAll('.bep-btn').find((b) => b.text().includes('进化'))
    expect(evolveBtn).toBeUndefined()
  })
})
