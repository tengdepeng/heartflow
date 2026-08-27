// ============================================================
// 守护室 · 白噪音面板测试
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
  const mod = await import('../WhiteNoisePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function kvStore() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('WhiteNoisePanel 白噪音', () => {
  it('默认停止状态与全部声景', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('白噪音')
    expect(wrapper.text()).toContain('已停止')
    for (const label of ['白噪音', '粉红噪音', '棕噪音', '雨声', '海浪', '森林']) {
      expect(wrapper.text()).toContain(label)
    }
  })

  it('加载已保存的声景选中态', async () => {
    const wrapper = await mountPanel({
      'hf:white_noise': { id: 'rain' },
      'hf:white_noise_volume': 0.7,
    })
    expect(wrapper.text()).toContain('70%')
    const activeScenes = wrapper.findAll('.wn-scene.active')
    expect(activeScenes.length).toBe(1)
    expect(activeScenes[0].text()).toContain('雨声')
  })

  it('点击声景不崩溃（无 AudioContext 时安全降级）', async () => {
    const wrapper = await mountPanel()
    const scene = wrapper.findAll('button.wn-scene').find(b => b.text().includes('海浪'))!
    await scene.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已停止')
  })

  it('音量调整持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.wn-row input[type="range"]').setValue('0.4')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('40%')
    expect(kvStore()['hf:white_noise_volume']).toBe(0.4)
  })
})
