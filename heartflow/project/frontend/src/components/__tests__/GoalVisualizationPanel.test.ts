// ============================================================
// 留光阁 · 目标可视化面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const HISTORY_KEY = 'hf:goal_progress_history'
const MILESTONES_KEY = 'hf:goal_milestones'

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
  const mod = await import('../GoalVisualizationPanel.vue')
  const wrapper = mount(mod.default, { props: { goals } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('GoalVisualizationPanel 目标可视化', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({}, [])
    expect(wrapper.text()).toContain('目标可视化')
    expect(wrapper.text()).toContain('暂无目标')
  })

  it('展示目标树', async () => {
    const wrapper = await mountPanel({}, [
      goal({ title: '读完十本书', status: 'growing', anchorCount: 4, anchorDone: 2 }),
    ])
    expect(wrapper.text()).toContain('目标树')
    expect(wrapper.text()).toContain('读完十本书')
    expect(wrapper.text()).toContain('50%')
  })

  it('展示领域进度', async () => {
    const wrapper = await mountPanel({}, [
      goal({ title: '读完十本书', domain: 'growth', status: 'bloom' }),
      goal({ title: '跑步健身', domain: 'health', status: 'seed' }),
    ])
    const domainTab = wrapper.findAll('button.gv-tab').find(b => b.text() === '领域')
    await domainTab!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('领域进度')
    expect(wrapper.text()).toContain('成长')
    expect(wrapper.text()).toContain('健康')
  })

  it('拍摄进度快照并持久化', async () => {
    const wrapper = await mountPanel({}, [
      goal({ title: '读完十本书', status: 'growing', anchorCount: 4, anchorDone: 2 }),
    ])
    const historyTab = wrapper.findAll('button.gv-tab').find(b => b.text() === '历史')
    await historyTab!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('button.gv-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[HISTORY_KEY].snapshots).toHaveLength(1)
    expect(kv[HISTORY_KEY].snapshots[0].overallProgress).toBe(0)
  })

  it('自动生成里程碑', async () => {
    const wrapper = await mountPanel({}, [
      goal({ title: '读完十本书', status: 'growing', anchorCount: 4, anchorDone: 2 }),
    ])
    const msTab = wrapper.findAll('button.gv-tab').find(b => b.text() === '里程碑')
    await msTab!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('button.gv-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[MILESTONES_KEY].length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('开始旅程')
  })

  it('展示已有里程碑', async () => {
    const wrapper = await mountPanel({
      [MILESTONES_KEY]: [
        {
          id: 'ms_1_start',
          goalId: 'g1',
          goalTitle: '读完十本书',
          title: '开始旅程',
          description: '目标已创建',
          targetProgress: 0,
          currentProgress: 0,
          achieved: true,
          achievedAt: '2026-08-01T08:00:00.000Z',
          type: 'start',
        },
      ],
    }, [goal({ id: 'g1', title: '读完十本书' })])
    const msTab = wrapper.findAll('button.gv-tab').find(b => b.text() === '里程碑')
    await msTab!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已达成')
    expect(wrapper.text()).toContain('开始旅程')
  })
})
