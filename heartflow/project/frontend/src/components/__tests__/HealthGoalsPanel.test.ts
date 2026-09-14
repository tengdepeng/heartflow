import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const GOALS_KEY = 'hf:body:goals'
const METRICS_KEY = 'hf:body:metrics'

function seedGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hg-1',
    type: 'sleep',
    name: '睡够 8 小时',
    targetValue: 8,
    currentValue: 0,
    unit: '小时',
    startDate: new Date().toISOString(),
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    progress: 0,
    status: 'active',
    priority: 'medium',
    reminderFrequency: 'daily',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function seedMetric(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    type: 'sleep',
    value: 7.5,
    unit: '小时',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    ...overrides,
  }
}

async function mountPanel(seed: { goals?: any[]; metrics?: any[] } = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, unknown> = {}
  if (seed.goals) kvStore[GOALS_KEY] = JSON.stringify(seed.goals)
  if (seed.metrics) kvStore[METRICS_KEY] = JSON.stringify(seed.metrics)
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../HealthGoalsPanel.vue')
  return mount(mod.default)
}

describe('HealthGoalsPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无目标时显示空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.hgp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有健康目标')
  })

  it('渲染统计概览', async () => {
    const wrapper = await mountPanel({ goals: [seedGoal()] })
    expect(wrapper.find('.hgp-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('进行中')
  })

  it('展示进行中目标', async () => {
    const wrapper = await mountPanel({ goals: [seedGoal()] })
    expect(wrapper.find('.hgp-goal').exists()).toBe(true)
    expect(wrapper.text()).toContain('睡够 8 小时')
  })

  it('可展开表单并创建目标', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.hgp-toggle').trigger('click')
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.hgp-input')
    await inputs[0].setValue('每日喝水 2000ml')
    await wrapper.find('.hgp-form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hgp-goal').exists()).toBe(true)
    expect(wrapper.text()).toContain('每日喝水 2000ml')
  })

  it('可更新目标进度', async () => {
    const wrapper = await mountPanel({ goals: [seedGoal()] })
    const input = wrapper.find('.hgp-goal-actions .hgp-input')
    await input.setValue(6)
    await wrapper.findAll('.hgp-goal-actions .hgp-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('6/8')
  })

  it('可暂停与恢复目标', async () => {
    const wrapper = await mountPanel({ goals: [seedGoal()] })
    // 暂停：进行中列表消失
    await wrapper.findAll('.hgp-goal-actions .hgp-btn')[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hgp-goal').exists()).toBe(false)
    // 切到已暂停 tab：目标出现
    await wrapper.findAll('.hgp-tab')[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hgp-goal').exists()).toBe(true)
    // 恢复：暂停列表消失
    await wrapper.findAll('.hgp-goal-actions .hgp-btn')[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hgp-goal').exists()).toBe(false)
    // 切回进行中：目标出现
    await wrapper.findAll('.hgp-tab')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hgp-goal').exists()).toBe(true)
  })

  it('可删除目标', async () => {
    const wrapper = await mountPanel({ goals: [seedGoal()] })
    await wrapper.findAll('.hgp-goal-actions .hgp-btn')[3].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hgp-goal').exists()).toBe(false)
    expect(wrapper.find('.hgp-empty').exists()).toBe(true)
  })

  it('可从指标同步当前值', async () => {
    const wrapper = await mountPanel({
      goals: [seedGoal()],
      metrics: [seedMetric({ type: 'sleep', value: 7.5 })],
    })
    await wrapper.findAll('.hgp-goal-actions .hgp-btn')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('7.5/8')
  })
})
