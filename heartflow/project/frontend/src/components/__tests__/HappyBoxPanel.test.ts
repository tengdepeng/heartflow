// ============================================================
// 情绪花房 · 快乐盒子面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(seed: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: seed,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../HappyBoxPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function kvStore() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('HappyBoxPanel 快乐盒子', () => {
  it('空盒子状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('快乐盒子')
    expect(wrapper.text()).toContain('0 件')
    expect(wrapper.text()).toContain('盒子还空着')
  })

  it('收集一条快乐并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('textarea.hb-textarea').setValue('喝到一杯很棒的咖啡')
    await wrapper.findAll('span.hb-tag').find(t => t.text() === '小确幸')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button.hb-btn').find(b => b.text() === '收进盒子')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1 件')
    expect(wrapper.text()).toContain('喝到一杯很棒的咖啡')
    expect(wrapper.text()).toContain('今日已收集 1 条')
    expect(kvStore()['hf:happy_box']).toHaveLength(1)
    expect(kvStore()['hf:happy_box'][0].tags).toContain('小确幸')
  })

  it('随机回顾已收集的快乐', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('textarea.hb-textarea').setValue('阳光很好')
    await wrapper.findAll('button.hb-btn').find(b => b.text() === '收进盒子')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button.hb-btn').find(b => b.text() === '随机回顾')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('阳光很好')
    expect(wrapper.text()).toContain('被回顾 1 次')
  })

  it('删除快乐', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('textarea.hb-textarea').setValue('要删除的一条')
    await wrapper.findAll('button.hb-btn').find(b => b.text() === '收进盒子')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('button.hb-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('0 件')
    expect(wrapper.text()).toContain('盒子还空着')
    expect(kvStore()['hf:happy_box']).toHaveLength(0)
  })
})
