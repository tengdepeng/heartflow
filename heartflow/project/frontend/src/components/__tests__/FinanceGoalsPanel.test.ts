// ============================================================
// 财务目标面板测试（reward · useFinanceGoals / useInvestmentTracker / useFinanceHealth / useFinanceTimeline）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const GOALS_KEY = 'hf:reward:finance-goals'
const INV_KEY = 'hf:reward:investments'
const HEALTH_KEY = 'hf:reward:health-scores'

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

async function mountPanel(kv: Record<string, any> = {}) {
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../FinanceGoalsPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function inputByPlaceholder(wrapper: any, placeholder: string) {
  const el = wrapper.findAll('input').find((i: any) => i.attributes('placeholder') === placeholder)
  expect(el, `input[placeholder=${placeholder}] 应存在`).toBeTruthy()
  return el!
}

function buttonByText(wrapper: any, text: string) {
  const el = wrapper.findAll('button').find((b: any) => b.text().trim() === text)
  expect(el, `button[${text}] 应存在`).toBeTruthy()
  return el!
}

describe('FinanceGoalsPanel 财务目标', () => {
  it('渲染标题与空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('财务目标')
    expect(wrapper.text()).toContain('投资追踪')
    expect(wrapper.text()).toContain('还没有财务目标')
  })

  it('创建目标并持久化', async () => {
    const wrapper = await mountPanel()
    await inputByPlaceholder(wrapper, '目标名称').setValue('应急基金')
    await inputByPlaceholder(wrapper, '目标金额').setValue('10000')
    await buttonByText(wrapper, '创建').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('应急基金')
    expect(wrapper.text()).toContain('¥0 / ¥10,000')
    const goals = readKv()[GOALS_KEY]
    expect(goals).toHaveLength(1)
    expect(goals[0].name).toBe('应急基金')
    expect(goals[0].targetAmount).toBe(10000)
  })

  it('更新进度达成目标', async () => {
    const wrapper = await mountPanel({
      [GOALS_KEY]: [{
        id: 'goal_x', type: 'savings', name: '应急基金', description: '',
        targetAmount: 100, currentAmount: 0, term: 'short',
        targetDate: '2027-01-01', createdAt: '2026-01-01',
        achieved: false, priority: 5, monthlyContribution: 0,
      }],
    })
    await inputByPlaceholder(wrapper, '进度').setValue('100')
    await buttonByText(wrapper, '更新').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('✅ 已完成')
    const goals = readKv()[GOALS_KEY]
    expect(goals[0].achieved).toBe(true)
    expect(goals[0].currentAmount).toBe(100)
  })

  it('添加投资并展示组合概览', async () => {
    const wrapper = await mountPanel()
    await inputByPlaceholder(wrapper, '名称').setValue('沪深300指数')
    await inputByPlaceholder(wrapper, '本金').setValue('5000')
    await inputByPlaceholder(wrapper, '市值').setValue('5500')
    await buttonByText(wrapper, '添加').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('沪深300指数')
    expect(wrapper.text()).toContain('10%')
    expect(wrapper.text()).toContain('¥5,500')
    const invs = readKv()[INV_KEY]
    expect(invs).toHaveLength(1)
    expect(invs[0].returnRate).toBe(10)
  })

  it('更新投资市值计算收益率', async () => {
    const wrapper = await mountPanel({
      [INV_KEY]: [{
        id: 'inv_x', type: 'fund', name: '指数基金', principal: 1000, currentValue: 1000,
        returnRate: 0, annualizedReturn: 0, riskLevel: 3,
        purchasedAt: '2026-01-01', updatedAt: '2026-01-01',
      }],
    })
    await inputByPlaceholder(wrapper, '新市值').setValue('1200')
    await buttonByText(wrapper, '更新').trigger('click')
    await wrapper.vm.$nextTick()

    const invs = readKv()[INV_KEY]
    expect(invs[0].currentValue).toBe(1200)
    expect(invs[0].returnRate).toBe(20)
  })

  it('财务健康评估展示评分与评级', async () => {
    const wrapper = await mountPanel()
    await inputByPlaceholder(wrapper, '月收入').setValue('10000')
    await inputByPlaceholder(wrapper, '总储蓄').setValue('30000')
    await inputByPlaceholder(wrapper, '总负债').setValue('0')
    await inputByPlaceholder(wrapper, '月支出').setValue('6000')
    await buttonByText(wrapper, '评估').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('健康评分')
    expect(wrapper.text()).toContain('良好')
    const scores = readKv()[HEALTH_KEY]
    expect(scores).toHaveLength(1)
    expect(scores[0].grade).toBe('good')
  })

  it('目标达成后时间线生成事件', async () => {
    const wrapper = await mountPanel({
      [GOALS_KEY]: [{
        id: 'goal_y', type: 'savings', name: '购房首付', description: '',
        targetAmount: 100, currentAmount: 100, term: 'long',
        targetDate: '2027-01-01', createdAt: '2026-01-01',
        achieved: true, achievedAt: '2026-08-01T00:00:00.000Z', priority: 5, monthlyContribution: 0,
      }],
    })
    await buttonByText(wrapper, '刷新').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('目标达成')
    expect(wrapper.text()).toContain('购房首付')
  })
})
