import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel() {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../HanziLookupPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('HanziLookupPanel 字源随手查面板', () => {
  it('渲染标题并展示库内字数', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('字源随手查')
    expect(wrapper.text()).toContain('字')
  })

  it('默认查找模式下按汉字/拼音检索', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.hz-input')
    await input.setValue('心')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('心')
    expect(wrapper.text()).toContain('xīn')
  })

  it('无匹配时给出空态文案', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.hz-input')
    await input.setValue('不存在之字')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('没有匹配的汉字')
  })

  it('部首模式下按部首分组查字', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('button.hz-mode')[1].trigger('click')
    await wrapper.vm.$nextTick()
    // 点选「日」部首
    const radicalBtn = wrapper.findAll('button.hz-o').find((b) => b.text().startsWith('日'))
    expect(radicalBtn).toBeTruthy()
    await (radicalBtn as any).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('日')
    expect(wrapper.text()).toContain('象形')
  })

  it('笔画模式下按笔画分桶检索', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('button.hz-mode')[2].trigger('click')
    await wrapper.vm.$nextTick()
    const bucketBtn = wrapper.findAll('button.hz-o').find((b) => b.text().includes('6-10 画'))
    expect(bucketBtn).toBeTruthy()
    await (bucketBtn as any).trigger('click')
    await wrapper.vm.$nextTick()
    // 6-10 画的字，如「地」(6画)
    expect(wrapper.text()).toContain('地')
  })

  it('点击结果展开单字详解，包含部首/画数/构字/释义', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.hz-input')
    await input.setValue('水')
    await wrapper.vm.$nextTick()
    const card = wrapper.find('div.hz-card')
    await card.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('构字')
    expect(wrapper.text()).toContain('象形')
    expect(wrapper.text()).toContain('组词')
  })
})