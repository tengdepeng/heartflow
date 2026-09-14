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
  const mod = await import('../NutritionPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('NutritionPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('挂载即依据默认档案计算并展示能量目标', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.np').exists()).toBe(true)
    expect(wrapper.text()).toContain('营养计算')
    expect(wrapper.find('.np-energy').exists()).toBe(true)
    // 默认档案计算后不为占位符
    expect(wrapper.find('.np-energy-val').text()).not.toBe('—')
  })

  it('展示 BMR/TDEE/目标热量指标', async () => {
    const wrapper = await mountPanel()
    const labels = wrapper.findAll('.np-energy-label').map(v => v.text())
    expect(labels).toContain('BMR')
    expect(labels).toContain('TDEE')
    expect(labels).toContain('目标摄入')
    const units = wrapper.findAll('.np-energy-unit').map(v => v.text())
    expect(units.some(u => u.includes('kcal'))).toBe(true)
  })

  it('展示宏量营养素目标', async () => {
    const wrapper = await mountPanel()
    const names = wrapper.findAll('.np-macro-name').map(v => v.text())
    expect(names).toContain('蛋白质')
    expect(names).toContain('碳水')
    expect(names).toContain('脂肪')
  })

  it('展示餐次分布与饮水目标', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.findAll('.np-meal').length).toBe(4)
    expect(wrapper.text()).toContain('饮水')
  })
})