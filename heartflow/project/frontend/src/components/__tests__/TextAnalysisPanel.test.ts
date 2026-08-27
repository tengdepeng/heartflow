// ============================================================
// 字镜阁 · 文字分析面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel() {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../TextAnalysisPanel.vue')
  const wrapper = mount(mod.default, { props: { words: [] } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('TextAnalysisPanel 文字分析', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('文字分析')
    expect(wrapper.text()).toContain('输入文字并点击')
  })

  it('分析文本展示词频与情绪', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.ta-textarea').setValue('今天天气很好，心情快乐，阳光温暖，生活美好。')
    await wrapper.find('.ta-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('词频')
    expect(wrapper.text()).toContain('情绪基调')
  })

  it('分析文本展示写作风格', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.ta-textarea').setValue('今天天气很好，心情快乐，阳光温暖，生活美好。')
    await wrapper.find('.ta-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('写作风格')
    expect(wrapper.text()).toContain('风格得分')
    expect(wrapper.text()).toContain('词汇丰富度')
  })

  it('空文本禁用分析', async () => {
    const wrapper = await mountPanel()
    const btn = wrapper.find('.ta-btn-primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })
})
