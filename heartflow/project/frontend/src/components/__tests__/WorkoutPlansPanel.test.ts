import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel() {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {} }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../WorkoutPlansPanel.vue')
  return mount(mod.default)
}

describe('WorkoutPlansPanel 运动计划', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('渲染标题与计划列表', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('运动计划')
    expect(wrapper.text()).toContain('计划列表')
  })

  it('展示预设计划', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('初心者步行计划')
    expect(wrapper.text()).toContain('5 公里跑步计划')
    expect(wrapper.text()).toContain('流瑜伽日常')
  })

  it('未激活时显示提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('激活一个计划后')
  })

  it('可激活计划', async () => {
    const wrapper = await mountPanel()
    const activateBtn = wrapper.findAll('.wpp-btn').find(b => b.text() === '激活')
    expect(activateBtn).toBeTruthy()
    await activateBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('进行中')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const plans = saved.kvStore['hf:movement:plans']
    expect(plans.filter((p: any) => p.active).length).toBe(1)
  })

  it('可创建自定义计划', async () => {
    const wrapper = await mountPanel()
    const nameInput = wrapper.find('.wpp-input')
    await nameInput.setValue('我的计划')
    await wrapper.find('form.wpp-form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('我的计划')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const plans = saved.kvStore['hf:movement:plans']
    expect(plans.some((p: any) => p.name === '我的计划')).toBe(true)
  })
})
