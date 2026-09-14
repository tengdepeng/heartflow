// ============================================================
// ObservationPlanPanel 今夜观测计划面板测试
// ============================================================
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
  const mod = await import('../ObservationPlanPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ObservationPlanPanel 今夜观测计划面板', () => {
  it('渲染观测计划标题与概况三格', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.opp').exists()).toBe(true)
    expect(wrapper.text()).toContain('今夜观测计划')
    expect(wrapper.text()).toContain('月相')
    expect(wrapper.text()).toContain('观星指数')
    expect(wrapper.text()).toContain('星等上限')
    expect(wrapper.findAll('.opp-cell').length).toBe(3)
  })

  it('渲染开场摘要与分时段建议', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.opp-summary').exists()).toBe(true)
    expect(wrapper.text()).toContain('分时段建议')
    expect(wrapper.findAll('.opp-phase').length).toBeGreaterThanOrEqual(3)
  })

  it('渲染今夜最值得看清单', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('今夜最值得看')
    expect(wrapper.findAll('.opp-best').length).toBeGreaterThan(0)
  })

  it('温和洞察不超过 4 条', async () => {
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.opp-insights li')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('重新生成按钮可刷新计划', async () => {
    const wrapper = await mountPanel()
    const btn = wrapper.find('.opp-btn')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.opp-summary').exists()).toBe(true)
  })
})
