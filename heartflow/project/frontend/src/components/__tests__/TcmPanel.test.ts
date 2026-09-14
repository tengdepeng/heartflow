// ============================================================
// 知微阁 · 经络穴位典籍面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../TcmPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('TcmPanel 经络穴位典籍', () => {
  it('渲染标题与核心区块', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('经络穴位典籍')
    expect(wrapper.text()).toContain('子午流注钟')
    expect(wrapper.text()).toContain('经络')
    expect(wrapper.text()).toContain('穴位')
    expect(wrapper.text()).toContain('经典原文对照')
    expect(wrapper.text()).toContain('穴位歌诀')
  })

  it('渲染 14 条经络', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('手太阴肺经')
    expect(wrapper.text()).toContain('任脉')
    expect(wrapper.text()).toContain('督脉')
    expect(wrapper.findAll('.tcp-meridian').length).toBe(14)
  })

  it('渲染子午流注钟活跃时段', async () => {
    const wrapper = await mountPanel()
    const active = wrapper.find('.tcp-clock-active')
    expect(active.exists()).toBe(true)
    expect(wrapper.findAll('.tcp-clock-slot').length).toBe(12)
  })

  it('渲染温和洞察', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.findAll('.tcp-insight-line').length).toBeGreaterThan(0)
  })

  it('渲染经典原文对照与歌诀', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.findAll('.tcp-excerpt').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('四总穴歌')
    expect(wrapper.findAll('.tcp-song').length).toBeGreaterThan(0)
  })

  it('穴位检索过滤', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tcp-input').setValue('合谷')
    expect(wrapper.findAll('.tcp-result').length).toBe(1)
    expect(wrapper.text()).toContain('合谷')
  })

  it('选择穴位展示详情', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tcp-input').setValue('足三里')
    await wrapper.find('.tcp-result').trigger('click')
    expect(wrapper.find('.tcp-detail').exists()).toBe(true)
    expect(wrapper.text()).toContain('犊鼻下 3 寸')
  })

  it('收藏穴位并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tcp-input').setValue('合谷')
    await wrapper.find('.tcp-result').trigger('click')
    await wrapper.find('.tcp-fav').trigger('click')
    expect(wrapper.find('.tcp-fav').text()).toContain('已收藏')
    expect(wrapper.text()).toContain('我的收藏（1）')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:tcm_favorites']).toContain('li4')
  })

  it('取消收藏', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tcp-input').setValue('合谷')
    await wrapper.find('.tcp-result').trigger('click')
    await wrapper.find('.tcp-fav').trigger('click')
    await wrapper.find('.tcp-fav').trigger('click')
    expect(wrapper.find('.tcp-fav').text()).toContain('收藏')
    expect(wrapper.text()).toContain('我的收藏（0）')
  })

  it('展开经络显示循行与主治', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tcp-meridian-head').trigger('click')
    expect(wrapper.find('.tcp-meridian-detail').exists()).toBe(true)
    expect(wrapper.text()).toContain('循行')
    expect(wrapper.text()).toContain('主治')
  })

  it('按经络筛选穴位', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tcp-meridian-head').trigger('click')
    await wrapper.find('.tcp-meridian-detail .tcp-btn').trigger('click')
    const results = wrapper.findAll('.tcp-result')
    expect(results.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('手太阴肺经')
  })
})
