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
})
