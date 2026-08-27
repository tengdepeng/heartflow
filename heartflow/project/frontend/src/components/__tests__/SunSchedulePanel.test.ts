// ============================================================
// 守护室 · 日出日落自动启停面板测试
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
  const mod = await import('../SunSchedulePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function kvStore() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('SunSchedulePanel 日出日落自动启停', () => {
  it('默认未开启，提示使用自定义时段', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('日出日落自动启停')
    expect(wrapper.text()).toContain('自动未开')
    expect(wrapper.text()).toContain('未设置位置，将使用自定义夜间时段判断')
  })

  it('开启自动启停并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('button.ss-btn').find(b => b.text() === '开启自动启停')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('自动已开')
    expect(wrapper.text()).toContain('关闭自动启停')
    expect(kvStore()['hf:guard:sun_schedule'].autoEnabled).toBe(true)
  })

  it('设置位置后展示日出日落', async () => {
    const wrapper = await mountPanel()
    const nums = wrapper.findAll('input.ss-num')
    await nums[0].setValue('31.23')
    await nums[1].setValue('121.47')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button.ss-btn').find(b => b.text() === '定位')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('日出')
    expect(wrapper.text()).toContain('日落')
    const s = kvStore()['hf:guard:sun_schedule']
    expect(s.lat).toBe(31.23)
    expect(s.lng).toBe(121.47)
  })

  it('自定义时段输入持久化', async () => {
    const wrapper = await mountPanel()
    const times = wrapper.findAll('input[type="time"]')
    const start = times[0]
    const end = times[1]
    await start.setValue('20:00')
    await start.trigger('change')
    await end.setValue('06:30')
    await end.trigger('change')
    await wrapper.vm.$nextTick()
    expect(kvStore()['hf:guard:sun_schedule'].customNightStart).toBe('20:00')
    expect(kvStore()['hf:guard:sun_schedule'].customNightEnd).toBe('06:30')
  })
})
