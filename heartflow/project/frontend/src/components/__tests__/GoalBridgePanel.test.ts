// ============================================================
// 留光阁 · 桥接总览面板（INCR-380）组件测试
// 真实引擎（goal-bridge → useGoal → storage 全链路）+ mock localStorage 种子
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const OLD_DREAMS_KEY = 'goal_old_dreams'

function goal(overrides: Record<string, any> = {}) {
  return {
    id: `goal_${Math.random().toString(36).slice(2, 8)}`,
    title: '读完十本书',
    description: '',
    tier: 'target',
    parentId: undefined,
    status: 'growing',
    domain: 'growth',
    order: 0,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    anchorCount: 4,
    anchorDone: 2,
    ...overrides,
  }
}

/** 构建一个种子集：5 目标 2 开花 → 完成率 40%，含 1 个低健康度目标、1 个旧梦 */
function seedGoals() {
  return [
    goal({ id: 'v1', title: '人生愿景', tier: 'vision', status: 'growing', anchorCount: 0, anchorDone: 0 }),
    goal({ id: 't1', title: '读完十本书', tier: 'target', status: 'growing', domain: 'growth' }),
    goal({ id: 't2', title: '晨跑健身', tier: 'target', status: 'seed', domain: 'health', createdAt: '2020-01-01T08:00:00.000Z', updatedAt: '2020-01-01T08:00:00.000Z', anchorCount: 0, anchorDone: 0 }),
    goal({ id: 't3', title: '沙龙工作坊', tier: 'target', status: 'bloom', domain: 'work' }),
    goal({ id: 'p1', title: '制定阅读清单', tier: 'plan', status: 'bloom', parentId: 't1', domain: 'growth' }),
  ]
}

async function mountPanel(goals: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
    goals,
  }))
  if (goals.length) {
    storageMock.setItem(OLD_DREAMS_KEY, JSON.stringify([{
      goal: goal({ id: 'sunk1', title: '尘封旧旅', status: 'bloom', domain: 'other' }),
      sunkAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      daysInPool: 2,
      reviveCount: 0,
    }]))
  }
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../GoalBridgePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('GoalBridgePanel 留光阁·桥接总览（INCR-380）', () => {
  it('空态：徽标归零，梯度/状态/活跃/健康区块不渲染，旧梦潭显示空提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.find('[data-test="goal-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('留光阁 · 桥接总览')
    expect(wrapper.find('[data-test="gbp-badge"]').text()).toBe('共 0 个目标 · 完成 0%')
    expect(wrapper.find('[data-test="gbp-summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="gbp-total"]').text()).toBe('0')
    expect(wrapper.find('[data-test="gbp-tiers"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gbp-status"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gbp-active"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gbp-unhealthy"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gbp-olddreams"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="gbp-olddreams"]').text()).toContain('旧梦潭空着')
  })

  it('总览与徽标：总数/完成率/活跃/关注/旧梦', async () => {
    const wrapper = await mountPanel(seedGoals())
    expect(wrapper.find('[data-test="gbp-badge"]').text()).toBe('共 5 个目标 · 完成 40%')
    const summary = wrapper.find('[data-test="gbp-summary"]')
    expect(summary.find('[data-test="gbp-total"]').text()).toBe('5')
    expect(summary.text()).toContain('活跃目标')
    expect(summary.text()).toContain('旧梦')
  })

  it('梯度与状态分布：三梯度计数与状态标注', async () => {
    const wrapper = await mountPanel(seedGoals())
    const tiers = wrapper.find('[data-test="gbp-tiers"]')
    expect(tiers.exists()).toBe(true)
    expect(tiers.text()).toContain('愿景1')
    expect(tiers.text()).toContain('目标3')
    expect(tiers.text()).toContain('计划1')
    const status = wrapper.find('[data-test="gbp-status"]')
    expect(status.exists()).toBe(true)
    expect(status.text()).toContain('生长中')
    expect(status.text()).toContain('已开花')
  })

  it('活跃目标清单：非休眠非开花的目标', async () => {
    const wrapper = await mountPanel(seedGoals())
    const active = wrapper.find('[data-test="gbp-active"]')
    expect(active.exists()).toBe(true)
    expect(active.text()).toContain('读完十本书')
    expect(active.text()).toContain('晨跑健身')
    // 开花的沙龙与休眠不在活跃清单
    expect(active.text()).not.toContain('沙龙工作坊')
  })

  it('健康关注：低健康度目标标为关注', async () => {
    const wrapper = await mountPanel(seedGoals())
    const unhealthy = wrapper.find('[data-test="gbp-unhealthy"]')
    expect(unhealthy.exists()).toBe(true)
    expect(unhealthy.text()).toContain('晨跑健身')
    expect(unhealthy.text()).toContain('关注')
  })

  it('旧梦潭：沉梦标题与月数', async () => {
    const wrapper = await mountPanel(seedGoals())
    const old = wrapper.find('[data-test="gbp-olddreams"]')
    expect(old.text()).toContain('沉梦 1')
    expect(old.text()).toContain('尘封旧旅')
  })
})