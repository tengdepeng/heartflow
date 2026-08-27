// ============================================================
// 守护室 · 护眼模式面板测试
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
  const mod = await import('../EyeCarePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function kvStore() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('EyeCarePanel 护眼模式', () => {
  it('默认关闭状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('护眼模式')
    expect(wrapper.text()).toContain('已关闭')
    expect(wrapper.text()).toContain('开启护眼')
    // 预设可见
    expect(wrapper.text()).toContain('柔和夜间')
    expect(wrapper.text()).toContain('极致护眼')
    expect(wrapper.text()).toContain('灰度专注')
  })

  it('应用预设开启并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('button.ec-chip').find(b => b.text().includes('柔和夜间'))!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已开启')
    expect(wrapper.text()).toContain('关闭护眼')
    expect(kvStore()['hf:eye_care']).toMatchObject({ enabled: true, blueLight: 45, grayscale: 0, brightness: 25 })
  })

  it('开关切换', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('button.ec-btn').find(b => b.text() === '开启护眼')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已开启')
    await wrapper.findAll('button.ec-btn').find(b => b.text() === '关闭护眼')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已关闭')
  })

  it('重置恢复默认', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('button.ec-chip').find(b => b.text().includes('极致护眼'))!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button.ec-btn').find(b => b.text() === '重置')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已关闭')
    expect(kvStore()['hf:eye_care']).toMatchObject({ enabled: false, blueLight: 0, grayscale: 0, brightness: 0 })
  })

  it('滑杆微调持久化', async () => {
    const wrapper = await mountPanel()
    const blueLightRange = wrapper.findAll('input[type="range"]')[0]
    await blueLightRange.setValue('60')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('60')
    expect(kvStore()['hf:eye_care'].blueLight).toBe(60)
  })
})
