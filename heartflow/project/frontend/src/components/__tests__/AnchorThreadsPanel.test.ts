import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockKV = new Map<string, unknown>()

vi.mock('../../engine/storage', () => ({
  storage: {
    getGoals: vi.fn(() => {
      const v = mockKV.get('hf:goals')
      return v ? JSON.parse(JSON.stringify(v)) : []
    }),
  },
}))

import AnchorThreadsPanel from '../AnchorThreadsPanel.vue'
import type { Anchor } from '../../modules/anchor/types'
import type { Goal } from '../../modules/goal/types'

function makeAnchor(partial: Partial<Anchor> & { id: string; text: string }): Anchor {
  return {
    done: false,
    targetDate: '2026-09-20',
    createdAt: '2026-09-20T08:00:00.000Z',
    priority: 'must',
    driftCount: 0,
    stage: 'active',
    ...partial,
  }
}

function makeGoal(partial: Partial<Goal> & { id: string; title: string }): Goal {
  return {
    description: '',
    tier: 'target',
    status: 'growing',
    domain: 'growth',
    order: 0,
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
    anchorCount: 0,
    anchorDone: 0,
    ...partial,
  }
}

beforeEach(() => {
  mockKV.clear()
})

describe('AnchorThreadsPanel', () => {
  it('空态：无锚点时显示空提示，无光丝/联动', () => {
    const wrapper = mount(AnchorThreadsPanel, { props: { anchors: [] } })
    expect(wrapper.find('.atl-empty').exists()).toBe(true)
    expect(wrapper.findAll('.atl-item').length).toBe(0)
  })

  it('共享标签光丝：同标签锚点产生 same_tag 光丝', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', text: '完成项目原型', tags: ['工作', '专注'], targetDate: '2026-09-20' }),
      makeAnchor({ id: 'a2', text: '专注写代码', tags: ['工作', '心流'], targetDate: '2026-09-21' }),
      makeAnchor({ id: 'a3', text: '散步放松', tags: ['健康'], targetDate: '2026-09-22' }),
    ]
    const wrapper = mount(AnchorThreadsPanel, { props: { anchors } })
    // a1-a2 共享「工作」→ 1 条光丝；a1-a3 / a2-a3 无共享
    const items = wrapper.findAll('.atl-item')
    expect(items.length).toBe(1)
    expect(items[0].find('.atl-item-a').text()).toContain('完成项目原型')
  })

  it('同分类与同日光丝：相同 category / targetDate 各产生光丝', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', text: '晨间复盘', category: '工作', targetDate: '2026-09-20' }),
      makeAnchor({ id: 'a2', text: '晚间复盘', category: '工作', targetDate: '2026-09-20' }),
    ]
    const wrapper = mount(AnchorThreadsPanel, { props: { anchors } })
    // 同分类 + 同日 → 2 条
    expect(wrapper.findAll('.atl-item').length).toBe(2)
  })

  it('目标联动：锚点标签命中目标标题 → anchor_goal 联动列表', async () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', text: '读完整本书', tags: ['读书'], targetDate: '2026-09-20' }),
    ]
    const goals: Goal[] = [
      makeGoal({ id: 'g1', title: '读书 计划', anchorCount: 2, anchorDone: 0 }),
    ]
    mockKV.set('hf:goals', goals)
    const wrapper = mount(AnchorThreadsPanel, { props: { anchors } })
    // 面板 mount 时 refresh 读取 storage.getGoals
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.atl-item').length).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('读书 计划')
  })

  it('完成推进预览：已完成的锚点对关联目标显示推进（只读模拟）', async () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', text: '读完整本书', tags: ['读书'], done: true, targetDate: '2026-09-20' }),
    ]
    const goals: Goal[] = [
      makeGoal({ id: 'g1', title: '读书 计划', anchorCount: 2, anchorDone: 0 }),
    ]
    mockKV.set('hf:goals', goals)
    const wrapper = mount(AnchorThreadsPanel, { props: { anchors } })
    await wrapper.vm.$nextTick()
    // 完成推进预览块存在且显示 0 → 1
    expect(wrapper.text()).toContain('完成推进预览')
    expect(wrapper.text()).toContain('0 → 1')
  })

  it('锚点池倒入预览：pool 锚点显示安放预览', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'p1', text: '待定事项', stage: 'pool', tags: [], targetDate: '2026-09-20' }),
    ]
    const wrapper = mount(AnchorThreadsPanel, { props: { anchors } })
    expect(wrapper.text()).toContain('锚点池一键倒入预览')
    expect(wrapper.text()).toContain('待定事项')
  })

  it('KPI 概览：活跃锚点 / 光丝 / 联动 / 推进 计数正确', async () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', text: '读完整本书', tags: ['读书'], targetDate: '2026-09-20' }),
      makeAnchor({ id: 'a2', text: '摘抄笔记', tags: ['读书'], done: true, targetDate: '2026-09-21' }),
    ]
    const goals: Goal[] = [
      makeGoal({ id: 'g1', title: '读书 计划', anchorCount: 2, anchorDone: 0 }),
    ]
    mockKV.set('hf:goals', goals)
    const wrapper = mount(AnchorThreadsPanel, { props: { anchors } })
    await wrapper.vm.$nextTick()
    const nums = wrapper.findAll('.atl-kpi-num').map(n => n.text())
    // 活跃锚点 2 / 光丝 1（同标签，targetDate 不同无同日）/ 联动 1 / 完成可推进 1
    expect(nums[0]).toBe('2')
    expect(nums[1]).toBe('1')
    expect(nums[2]).toBe('1')
    expect(nums[3]).toBe('1')
  })
})

