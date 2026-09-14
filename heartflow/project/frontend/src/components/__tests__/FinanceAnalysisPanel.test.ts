import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeRecord(overrides: Record<string, any> = {}) {
  return {
    id: `r${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    type: 'income',
    category: 'salary',
    amount: 1000,
    description: '测试记录',
    at: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(records: any[]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: { 'hf:reward_filter_presets': [] } }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../FinanceAnalysisPanel.vue')
  return mount(mod.default, { props: { records } })
}

describe('FinanceAnalysisPanel 财务分析', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('渲染标题与三个标签页', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('财务分析')
    expect(wrapper.text()).toContain('筛选')
    expect(wrapper.text()).toContain('周期')
    expect(wrapper.text()).toContain('图表')
  })

  it('筛选页展示筛选结果与金额', async () => {
    const wrapper = await mountPanel([
      makeRecord({ id: 'r1', type: 'income', category: 'salary', amount: 1000, description: '薪资' }),
      makeRecord({ id: 'r2', type: 'expense', category: 'tools', amount: 200, description: '工具' }),
    ])
    expect(wrapper.text()).toContain('2 条')
    expect(wrapper.text()).toContain('薪资')
    expect(wrapper.text()).toContain('工具')
    expect(wrapper.text()).toContain('¥1,000')
  })

  it('周期页展示周期统计', async () => {
    const wrapper = await mountPanel([
      makeRecord({ id: 'r1', type: 'income', category: 'salary', amount: 1000 }),
      makeRecord({ id: 'r2', type: 'expense', category: 'tools', amount: 200 }),
    ])
    await wrapper.findAll('.fap-tab')[1].trigger('click')
    expect(wrapper.text()).toContain('总收入')
    expect(wrapper.text()).toContain('总支出')
    expect(wrapper.text()).toContain('净结余')
    expect(wrapper.text()).toContain('最佳周期')
  })

  it('图表页展示类别分布与趋势', async () => {
    const wrapper = await mountPanel([
      makeRecord({ id: 'r1', type: 'income', category: 'salary', amount: 1000 }),
      makeRecord({ id: 'r2', type: 'expense', category: 'tools', amount: 200 }),
    ])
    await wrapper.findAll('.fap-tab')[2].trigger('click')
    expect(wrapper.text()).toContain('收入类别分布')
    expect(wrapper.text()).toContain('支出类别分布')
    expect(wrapper.text()).toContain('月度收支趋势')
    expect(wrapper.text()).toContain('本月预算执行')
  })

  it('无数据时展示空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('没有符合筛选条件的记录')
  })
})
