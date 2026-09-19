// ============================================================
// OldDreamPanel 组件测试（INCR-373 旧梦潭接线）
// 直引 goal/old-dream 引擎：检索 / 统计 / 分组陈列 / 复苏
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OldDreamPanel from '../OldDreamPanel.vue'
import type { Goal } from '../../modules/goal/types'

function makeGoal(partial: Partial<Goal> & { id: string; title: string }): Goal {
  return {
    description: '',
    tier: 'target',
    status: 'bloom',
    domain: 'growth',
    order: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-15T00:00:00Z',
    anchorCount: 0,
    anchorDone: 0,
    ...partial,
  } as Goal
}

const goalsA: Goal[] = [
  makeGoal({
    id: 'g1',
    title: '完成的目标A',
    status: 'bloom',
    domain: 'growth',
    completedAt: '2026-06-15T00:00:00Z',
    updatedAt: '2026-06-15T00:00:00Z',
  }),
  makeGoal({
    id: 'g2',
    title: '完成的目标B',
    status: 'bloom',
    domain: 'health',
    completedAt: '2026-05-20T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z',
  }),
]

async function mountPanel(goals: Goal[] = []) {
  return mount(OldDreamPanel, {
    props: { goals },
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('OldDreamPanel 旧梦潭（INCR-373）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空态：无已完成目标时显示引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="old-dream-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('旧梦潭')
    expect(wrapper.find('[data-test="odp-count"]').text()).toBe('0')
    expect(wrapper.find('[data-test="odp-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无已完成的目标')
  })

  it('有已完成目标时按月分组展示，并给出陈列统计', async () => {
    const wrapper = await mountPanel(goalsA)
    expect(wrapper.find('[data-test="odp-count"]').text()).toBe('2')
    // 统计：总数 2 / 覆盖 2 个月 / 近 30 天完成数
    expect(wrapper.text()).toContain('共 2 个')
    expect(wrapper.text()).toContain('覆盖 2 个月')
    // 分组展示
    const groups = wrapper.findAll('[data-test="odp-month-group"]')
    expect(groups.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.text()).toContain('完成的目标A')
    expect(wrapper.text()).toContain('完成的目标B')
    expect(wrapper.text()).toContain('已完成')
  })

  it('领域分布条形图按领域聚合', async () => {
    const wrapper = await mountPanel(goalsA)
    expect(wrapper.find('[data-test="odp-domain-bars"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('成长')
    expect(wrapper.text()).toContain('健康')
  })

  it('关键词检索：过滤出标题匹配的旧梦', async () => {
    const wrapper = await mountPanel(goalsA)
    await wrapper.find('[data-test="odp-search"]').setValue('目标B')
    expect(wrapper.find('[data-test="odp-card-g1"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="odp-card-g2"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('完成的目标A')
  })

  it('领域过滤：点击领域 chip 只显示该领域旧梦', async () => {
    const wrapper = await mountPanel(goalsA)
    await wrapper.find('[data-test="odp-chip-health"]').trigger('click')
    expect(wrapper.find('[data-test="odp-card-g1"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="odp-card-g2"]').exists()).toBe(true)
    // 再次点击取消过滤
    await wrapper.find('[data-test="odp-chip-health"]').trigger('click')
    expect(wrapper.find('[data-test="odp-card-g1"]').exists()).toBe(true)
  })

  it('检索无结果时显示无匹配提示', async () => {
    const wrapper = await mountPanel(goalsA)
    await wrapper.find('[data-test="odp-search"]').setValue('不存在的目标')
    expect(wrapper.find('[data-test="odp-no-match"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="odp-empty"]').exists()).toBe(false)
  })

  it('复苏按钮：emit revive 事件携带目标 id', async () => {
    const wrapper = await mountPanel(goalsA)
    const revive = wrapper.find('[data-test="odp-revive-g1"]')
    expect(revive.exists()).toBe(true)
    // 可复苏徽标
    expect(wrapper.text()).toContain('可复苏')
    await revive.trigger('click')
    const emitted = wrapper.emitted('revive')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual(['g1'])
  })
})
