// ============================================================
// 知微阁 · 诗词卡片面板测试
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
  const mod = await import('../PoetryCardPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('PoetryCardPanel 诗词卡片', () => {
  it('渲染今日一诗', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('诗词卡片')
    expect(wrapper.text()).toContain('今日一诗')
    expect(wrapper.find('.pcp-poem-title').exists()).toBe(true)
    expect(wrapper.find('.pcp-poem-meta').exists()).toBe(true)
  })

  it('收藏切换并持久化', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('♡ 收藏')
    await wrapper.find('.pcp-fav').trigger('click')
    expect(wrapper.text()).toContain('♥ 已收藏')
    expect(wrapper.findAll('.pcp-fav-list .pcp-result').length).toBe(1)
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:poetry_favorites']).toHaveLength(1)
    await wrapper.find('.pcp-fav').trigger('click')
    expect(wrapper.text()).toContain('♡ 收藏')
  })

  it('检索按作者过滤', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.pcp-input').setValue('李白')
    const results = wrapper.findAll('.pcp-results .pcp-result')
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.text()).toContain('李白')
    }
  })

  it('朝代筛选', async () => {
    const wrapper = await mountPanel()
    const selects = wrapper.findAll('.pcp-select')
    await selects[0].setValue('宋')
    const results = wrapper.findAll('.pcp-results .pcp-result')
    expect(results.length).toBeGreaterThan(0)
  })

  it('无匹配时显示空提示', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.pcp-input').setValue('不存在的诗词xyz')
    expect(wrapper.text()).toContain('没有匹配的诗词')
  })

  it('点击结果切换当前展示', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.pcp-input').setValue('静夜思')
    const first = wrapper.findAll('.pcp-results .pcp-result')[0]
    await first.trigger('click')
    expect(wrapper.find('.pcp-poem-title').text()).toContain('静夜思')
  })

  it('收藏为空时显示提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('还没有收藏')
  })
})
