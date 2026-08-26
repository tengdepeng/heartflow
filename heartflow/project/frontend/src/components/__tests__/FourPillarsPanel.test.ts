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
  const mod = await import('../FourPillarsPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('FourPillarsPanel 四柱画像', () => {
  it('展示四柱标题', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('四柱画像')
    expect(wrapper.text()).toContain('年柱')
    expect(wrapper.text()).toContain('月柱')
    expect(wrapper.text()).toContain('日柱')
    expect(wrapper.text()).toContain('时柱')
  })

  it('展示整体图景', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('整体图景')
    expect(wrapper.text()).toContain('自我图景')
  })

  it('展示生肖与星座', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('生肖')
    expect(wrapper.text()).toContain('星座')
  })

  it('重置出生信息不抛错', async () => {
    const wrapper = await mountPanel()
    const resetBtn = wrapper.findAll('.sm-btn').find(b => b.text() === '重置')
    await resetBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('四柱画像')
  })
})
