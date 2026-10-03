import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const FAV_KEY = 'hf:body-wisdom:recipe-favorites'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../MedicinalDietPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('MedicinalDietPanel 药膳食谱', () => {
  it('展示今日药膳', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('药膳食谱')
    expect(wrapper.text()).toContain('今日药膳')
  })

  it('药膳库展示全部食谱', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('药膳库 · 18')
    expect(wrapper.text()).toContain('四神汤')
  })

  it('搜索过滤食谱', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.mdp-input').setValue('银耳')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.mdp-recipe').length).toBe(1)
    expect(wrapper.text()).toContain('银耳莲子羹')
  })

  it('按功效筛选', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.mdp-select').setValue('安神')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.mdp-recipe').length).toBe(2)
    expect(wrapper.text()).toContain('酸枣仁安神汤')
  })

  it('展开食谱详情', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.mdp-recipe-head').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('食材')
    expect(wrapper.text()).toContain('做法')
  })

  it('收藏食谱并持久化', async () => {
    const wrapper = await mountPanel({})
    const favBtns = wrapper.findAll('.mdp-recipe .mdp-fav-btn')
    await favBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('我的收藏 · 1')
    const favs = storedKV()[FAV_KEY]
    expect(favs.length).toBe(1)
  })

  it('展示既有收藏', async () => {
    const wrapper = await mountPanel({
      [FAV_KEY]: [{ recipeId: 'sishen-soup', favoritedAt: '2026-08-01T00:00:00.000Z' }],
    })
    expect(wrapper.text()).toContain('我的收藏 · 1')
    expect(wrapper.text()).toContain('四神汤')
  })

  it('展示功效分布', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('功效分布')
    expect(wrapper.text()).toContain('健脾')
  })

  // ============================================================
  // INCR-452：接线 recipesByConstitution（按体质筛选）——引擎早已实现，
  // 但面板零 UI 消费。体质清单取自 MEDICINAL_RECIPES 的 constitutions 并集。
  // ============================================================
  it('INCR-452 体质筛选器列出全部体质并可筛选食谱', async () => {
    const wrapper = await mountPanel({})
    const selects = wrapper.findAll('.mdp-select')
    const constitutionSelect = selects[selects.length - 1]
    const values = constitutionSelect.findAll('option').map(o => o.attributes('value'))
    expect(values).toContain('')            // 全部体质
    expect(values).toContain('痰湿质')
    expect(values).toContain('气虚质')
    // 未选体质时仍是全部 18 条
    expect(wrapper.findAll('.mdp-recipe').length).toBe(18)
    // 选「阳虚质」后应只剩对应食谱（<= 18 且不含不适用者）
    await constitutionSelect.setValue('阳虚质')
    await wrapper.vm.$nextTick()
    const names = wrapper.findAll('.mdp-recipe-name').map(n => n.text())
    expect(names.length).toBeGreaterThan(0)
    expect(names.length).toBeLessThan(18)
    expect(names).toContain('当归生姜羊肉汤')  // 阳虚质专属
  })

  it('INCR-452 体质与功效筛选可叠加', async () => {
    const wrapper = await mountPanel({})
    const selects = wrapper.findAll('.mdp-select')
    await selects[0].setValue('安神')                 // 功效
    await selects[selects.length - 1].setValue('阳虚质') // 体质
    await wrapper.vm.$nextTick()
    const names = wrapper.findAll('.mdp-recipe-name').map(n => n.text())
    // 阳虚质 ∩ 安神 —— 当归生姜羊肉汤为阳虚质，其功效未必为安神，故结果应更少
    expect(names.length).toBeLessThanOrEqual(2)
  })
})
