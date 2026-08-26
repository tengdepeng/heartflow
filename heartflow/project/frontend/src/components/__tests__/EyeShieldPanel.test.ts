import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const CONFIG_KEY = 'hf:eye_shield_config'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../EyeShieldPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('EyeShieldPanel 护眼盾', () => {
  it('展示护眼配置与状态', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('护眼盾')
    expect(wrapper.text()).toContain('启用护眼盾')
    expect(wrapper.text()).toContain('随昼夜自动调节')
    expect(wrapper.text()).toContain('色温')
    expect(wrapper.text()).toContain('一日色温曲线')
  })

  it('展示当前昼夜时段', async () => {
    const wrapper = await mountPanel({})
    const phase = wrapper.find('.es-phase').text()
    expect(['清晨', '白昼', '黄昏', '夜色'].some((p) => phase.includes(p))).toBe(true)
  })

  it('切换启用开关并持久化', async () => {
    const wrapper = await mountPanel({})
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(false)
    await wrapper.vm.$nextTick()
    const cfg = storedKV()[CONFIG_KEY]
    expect(cfg.enabled).toBe(false)
    expect(wrapper.text()).toContain('已停用')
  })

  it('调整暖色温并持久化', async () => {
    const wrapper = await mountPanel({})
    const slider = wrapper.find('input[type="range"]')
    await slider.setValue('70')
    await wrapper.vm.$nextTick()
    const cfg = storedKV()[CONFIG_KEY]
    expect(cfg.warmth).toBe(70)
  })

  it('切换灰度模式并持久化', async () => {
    const wrapper = await mountPanel({})
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[2].setValue(true)
    await wrapper.vm.$nextTick()
    const cfg = storedKV()[CONFIG_KEY]
    expect(cfg.grayscale).toBe(true)
    expect(wrapper.text()).toContain('灰度')
  })

  it('选择用眼休息间隔并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('select').setValue('30')
    await wrapper.vm.$nextTick()
    const cfg = storedKV()[CONFIG_KEY]
    expect(cfg.eyeBreakMinutes).toBe(30)
  })
})
