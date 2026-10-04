import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const m = createMockStorage()
  m.setItem(
    'heartflow:storage',
    JSON.stringify({ version: 10, kvStore: kv, sessions: [], crystals: [] }),
  )
  ;(globalThis as any).localStorage = m
  invalidateCache()
  const mod = await import('../SlackingPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('SlackingPanel 摸鱼计算机', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('渲染面板与核心文案', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.find('.slk-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日已赚')
    expect(wrapper.text()).toContain('距下班')
    expect(wrapper.text()).toContain('今日摸鱼')
    wrapper.unmount()
  })

  it('开始摸鱼后按钮切换为收手', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.find('.slk-btn-stop').exists()).toBe(false)
    await wrapper.find('.slk-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.slk-btn-stop').exists()).toBe(true)
    wrapper.unmount()
  })

  it('设置时薪写入持久化', async () => {
    const wrapper = await mountPanel({})
    const rateInput = wrapper.findAll('.slk-input')[0]
    await rateInput.setValue('88')
    await wrapper.vm.$nextTick()
    expect(storedKV()['hf:slacking'].config.hourlyRate).toBe(88)
    wrapper.unmount()
  })
})
