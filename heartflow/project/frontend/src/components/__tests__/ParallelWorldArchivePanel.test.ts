// ============================================================
// 平行世界档案面板测试（桩面板恢复：消费 parallel-analytics）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Fork } from '../../modules/parallel-world/parallel-selves'
import type { AltSelf } from '../../modules/parallel-world/parallel-selves'
import type { Capsule } from '../../modules/parallel-world/time-capsule'
import type { WorldBranch } from '../../modules/parallel-world/types'
import ParallelWorldArchivePanel from '../ParallelWorldArchivePanel.vue'

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString()
}

function makeFork(overrides: Partial<Fork> = {}): Fork {
  return {
    id: 'f-1',
    description: '要不要换工作',
    chosen: '留下',
    alternative: '跳槽',
    date: daysAgo(3).split('T')[0],
    at: daysAgo(3),
    ...overrides,
  }
}

function makeAlt(overrides: Partial<AltSelf> = {}): AltSelf {
  return {
    id: 'a-1',
    title: '自由职业的我',
    desc: '在远方',
    icon: '🌊',
    color: '#6b9fc4',
    expanded: false,
    originForkId: null,
    ...overrides,
  }
}

function makeCapsule(overrides: Partial<Capsule> = {}): Capsule {
  return {
    id: 'c-1',
    title: '给未来的自己',
    note: '你好',
    message: '你好',
    items: [],
    createdAt: daysAgo(5),
    at: daysAgo(5),
    openDate: daysAgo(0).split('T')[0],
    openedAt: null,
    opened: false,
    scope: 'free',
    ...overrides,
  }
}

function makeBranch(overrides: Partial<WorldBranch> = {}): WorldBranch {
  return {
    id: 'b-1',
    name: '主干',
    description: '',
    color: '#4A90D9',
    createdAt: daysAgo(10),
    isActive: true,
    checkpointCount: 2,
    ...overrides,
  }
}

function getWrapper(forks: Fork[], alts: AltSelf[], capsules: Capsule[], branches: WorldBranch[]) {
  return mount(ParallelWorldArchivePanel, { props: { forks, alts, capsules, branches } })
}

describe('ParallelWorldArchivePanel · 平行世界档案（桩恢复）', () => {
  it('空态：无任何数据时显示引导文案', () => {
    const wrapper = getWrapper([], [], [], [])
    expect(wrapper.find('.pwap-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('平行世界还是空的')
  })

  it('概览统计：渲染分叉/自我/胶囊/分支/检查点五格', () => {
    const wrapper = getWrapper(
      [makeFork()],
      [makeAlt()],
      [makeCapsule()],
      [makeBranch()],
    )
    expect(wrapper.findAll('.pwap-stat')).toHaveLength(5)
    expect(wrapper.text()).toContain('抉择分叉')
    expect(wrapper.text()).toContain('平行自我')
    expect(wrapper.text()).toContain('时间胶囊')
    expect(wrapper.text()).toContain('时间分支')
    expect(wrapper.text()).toContain('检查点')
  })

  it('分布：渲染平行自我来源与时间胶囊状态行', () => {
    const wrapper = getWrapper(
      [],
      [
        makeAlt({ originForkId: 'f-1' }),
        makeAlt({ id: 'a-2', title: '自由的我', originForkId: null }),
      ],
      [
        makeCapsule({ opened: true, openedAt: daysAgo(1) }),
        makeCapsule({ id: 'c-2', title: '等待中' }),
      ],
      [makeBranch()],
    )
    expect(wrapper.text()).toContain('平行自我来源')
    expect(wrapper.text()).toContain('分叉映照')
    expect(wrapper.text()).toContain('自由映照')
    expect(wrapper.text()).toContain('时间胶囊状态')
    expect(wrapper.text()).toContain('已开启')
  })

  it('节奏：渲染近 7/30 天分叉与平均封存等待', () => {
    const wrapper = getWrapper(
      [makeFork({ at: daysAgo(2) }), makeFork({ id: 'f-2', at: daysAgo(20) })],
      [],
      [makeCapsule()],
      [],
    )
    expect(wrapper.text()).toContain('抉择节奏')
    expect(wrapper.text()).toContain('近 7 天分叉')
    expect(wrapper.text()).toContain('近 30 天分叉')
    expect(wrapper.text()).toContain('平均封存等待')
  })

  it('健康：渲染健康评分与三维度', () => {
    const wrapper = getWrapper(
      [makeFork()],
      [makeAlt()],
      [makeCapsule()],
      [makeBranch()],
    )
    expect(wrapper.find('.pwap-health').exists()).toBe(true)
    expect(wrapper.text()).toContain('探索广度')
    expect(wrapper.text()).toContain('抉择深度')
    expect(wrapper.text()).toContain('时间延续')
  })

  it('温和回看：有数据时渲染建议列表', () => {
    const wrapper = getWrapper(
      [makeFork()],
      [makeAlt()],
      [makeCapsule()],
      [makeBranch()],
    )
    expect(wrapper.text()).toContain('温和回看')
    expect(wrapper.findAll('.pwap-insight').length).toBeGreaterThan(0)
  })
})
