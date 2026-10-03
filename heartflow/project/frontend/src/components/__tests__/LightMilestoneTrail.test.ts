// ============================================================
// 留光阁 · 成就路线面板测试（INCR-442）
// 复用 goal-visualization 引擎 useGoalMilestones/useProgressHistory
// 真实引擎 + mock localStorage 种子（与 GoalVisualizationPanel.test 同法）。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const MILESTONES_KEY = 'hf:goal_milestones'
const HISTORY_KEY = 'hf:goal_progress_history'

function goal(overrides: Record<string, any> = {}) {
  return {
    id: `goal_${Math.random().toString(36).slice(2, 8)}`,
    title: '读完十本书',
    description: '',
    tier: 'target',
    status: 'growing',
    domain: 'growth',
    order: 0,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    anchorCount: 4,
    anchorDone: 2,
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}, goals: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../LightMilestoneTrail.vue')
  const wrapper = mount(mod.default, { props: { goals } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('LightMilestoneTrail 成就路线', () => {
  it('无里程碑时显示空态引导', async () => {
    const wrapper = await mountPanel({}, [])
    expect(wrapper.find('.lmt-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('成就路线')
    expect(wrapper.text()).toContain('尚无里程碑轨迹')
  })

  it('渲染已达成与即将达成两类路线节点', async () => {
    const wrapper = await mountPanel({
      [MILESTONES_KEY]: [
        {
          id: 'ms_a', goalId: 'g1', goalTitle: '读完十本书', title: '开始旅程',
          targetProgress: 0, currentProgress: 0, achieved: true,
          achievedAt: '2026-08-01T08:00:00.000Z', type: 'start',
        },
        {
          id: 'ms_b', goalId: 'g1', goalTitle: '读完十本书', title: '过半里程',
          targetProgress: 50, currentProgress: 85, achieved: false, type: 'halfway',
        },
      ],
    }, [goal({ id: 'g1' })])
    const achieved = wrapper.findAll('.lmt-achieved')
    const upcoming = wrapper.findAll('.lmt-upcoming')
    expect(achieved.length).toBe(1)
    expect(upcoming.length).toBe(1)
    expect(achieved[0].text()).toContain('开始旅程')
    expect(upcoming[0].text()).toContain('过半里程')
    expect(upcoming[0].text()).toContain('85%')
  })

  it('点击「同步成就路线」为所有目标生成里程碑并落持久化', async () => {
    const wrapper = await mountPanel({}, [goal({ id: 'g1', title: '读完十本书' })])
    await wrapper.find('.lmt-sync-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[MILESTONES_KEY].length).toBeGreaterThan(0)
    // 自动生成的「开始旅程」应出现
    expect(wrapper.text()).toContain('开始旅程')
  })

  it('点击「拍摄快照」写入进度历史', async () => {
    const wrapper = await mountPanel({}, [goal({ id: 'g1', title: '读完十本书', status: 'growing', anchorCount: 4, anchorDone: 2 })])
    await wrapper.find('.lmt-snap-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[HISTORY_KEY].snapshots).toHaveLength(1)
    expect(kv[HISTORY_KEY].snapshots[0].overallProgress).toBe(0)
  })
})
