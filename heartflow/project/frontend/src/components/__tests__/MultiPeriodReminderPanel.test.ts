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
  const mod = await import('../MultiPeriodReminderPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('MultiPeriodReminderPanel 多时段提醒', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('渲染面板、默认时段与时间进度条', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.find('.mpr-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('多时段提醒')
    expect(wrapper.text()).toContain('晨起')
    expect(wrapper.text()).toContain('睡前')
    expect(wrapper.find('.mpr-track').exists()).toBe(true)
    expect(wrapper.findAll('.mpr-item').length).toBe(5)
    wrapper.unmount()
  })

  it('新增时段后出现在列表并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.mpr-add-label').setValue('下午茶')
    await wrapper.find('.mpr-add-time').setValue('16:00')
    await wrapper.find('.mpr-add-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('下午茶')
    expect(wrapper.findAll('.mpr-item').length).toBe(6)
    expect(storedKV()['hf:multi_reminder'].slots.some((s: any) => s.label === '下午茶')).toBe(true)
    wrapper.unmount()
  })

  it('空时段名时不新增并提示错误', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.mpr-add-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.mpr-err').exists()).toBe(true)
    expect(wrapper.findAll('.mpr-item').length).toBe(5)
    wrapper.unmount()
  })

  it('切换开关改变启用状态文案', async () => {
    const wrapper = await mountPanel({})
    const firstToggle = wrapper.findAll('.mpr-toggle')[0]
    expect(firstToggle.text()).toBe('已开')
    await firstToggle.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.mpr-toggle')[0].text()).toBe('已关')
    wrapper.unmount()
  })

  it('删除时段后列表减少', async () => {
    const wrapper = await mountPanel({})
    await wrapper.findAll('.mpr-del')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.mpr-item').length).toBe(4)
    wrapper.unmount()
  })
})
