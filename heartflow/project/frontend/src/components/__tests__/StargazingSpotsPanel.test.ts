import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import { CURATED_SPOTS } from '../../modules/sky'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const m = createMockStorage()
  m.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = m
  invalidateCache()
  const mod = await import('../StargazingSpotsPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('StargazingSpotsPanel 观星地点库', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('渲染全部精选地点', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.findAll('.sgs-item').length).toBe(CURATED_SPOTS.length)
    expect(wrapper.text()).toContain('观星地点库')
  })

  it('按关键词搜索过滤', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.sgs-search').setValue('丽江')
    const items = wrapper.findAll('.sgs-item')
    expect(items.length).toBeLessThan(CURATED_SPOTS.length)
    expect(wrapper.text()).toContain('丽江高美古')
  })

  it('按省份筛选', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.sgs-prov').setValue('西藏')
    const items = wrapper.findAll('.sgs-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.every(i => i.text().includes('西藏'))).toBe(true)
  })

  it('设为观测地写入持久化并展示当前地', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.sgs-pick').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sgs-current').exists()).toBe(true)
    expect(storedKV()['hf:stargazing_spot']).toBeTruthy()
  })

  it('清除观测地', async () => {
    const wrapper = await mountPanel({ 'hf:stargazing_spot': CURATED_SPOTS[1].id })
    expect(wrapper.find('.sgs-current').exists()).toBe(true)
    await wrapper.find('.sgs-clear').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sgs-current').exists()).toBe(false)
    expect(storedKV()['hf:stargazing_spot']).toBeNull()
  })
})
