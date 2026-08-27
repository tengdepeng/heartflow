// ============================================================
// 成长庭院 · 进度统计面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { Goal } from '../../modules/goal'

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: `g_${Math.random().toString(36).slice(2, 8)}`,
    title: '学习一门新语言',
    description: '',
    tier: 'target',
    status: 'growing',
    domain: 'growth',
    order: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    anchorCount: 10,
    anchorDone: 4,
    ...overrides,
  }
}

async function mountPanel(goals: any[] = [], kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../GoalProgressPanel.vue')
  const wrapper = mount(mod.default, { props: { goals } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('GoalProgressPanel 进度统计', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('进度统计')
    expect(wrapper.text()).toContain('暂无目标数据')
  })

  it('展示目标统计概览', async () => {
    const wrapper = await mountPanel([
      goal({ status: 'growing', anchorCount: 10, anchorDone: 5 }),
      goal({ status: 'bloom', anchorCount: 5, anchorDone: 5 }),
      goal({ status: 'dormant', anchorCount: 0, anchorDone: 0 }),
    ])
    const nums = wrapper.findAll('.gp-stat-num').map(n => n.text())
    expect(nums[0]).toBe('3')      // 总目标
    expect(nums[1]).toBe('1')      // 活跃
    expect(nums[2]).toBe('1')      // 已开花
    expect(nums[3]).toBe('1')      // 休眠
    expect(nums[4]).toBe('75%')    // 平均进度（休眠目标无锚点被排除）
    expect(nums[5]).toBe('10/15')  // 锚点
    expect(wrapper.text()).toContain('生长中')
  })

  it('展示生长日志', async () => {
    const logs = [{
      id: 'log_1',
      goalId: 'g_log',
      event: 'status_change',
      detail: '状态从 seed 变为 growing',
      fromStatus: 'seed',
      toStatus: 'growing',
      progress: 0.4,
      recordedAt: '2026-08-20T08:00:00.000Z',
    }]
    const wrapper = await mountPanel([], { 'hf:goal_progress_logs': logs })
    // 触发 watch 加载日志
    await wrapper.setProps({ goals: [goal({ id: 'g_log', title: '写一本书' })] })
    const logsTab = wrapper.findAll('.gp-tab')[1]
    await logsTab.trigger('click')
    expect(wrapper.text()).toContain('生长日志')
    expect(wrapper.text()).toContain('状态变化')
    expect(wrapper.text()).toContain('写一本书')
  })

  it('拍摄快照并持久化', async () => {
    const wrapper = await mountPanel([])
    const g = goal({ id: 'g_snap', title: '跑完马拉松', anchorCount: 4, anchorDone: 2 })
    await wrapper.setProps({ goals: [g] })
    const snapTab = wrapper.findAll('.gp-tab')[2]
    await snapTab.trigger('click')
    await wrapper.find('.gp-select').setValue('g_snap')
    await wrapper.find('.gp-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('50%')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:goal_progress_snapshots'].length).toBe(1)
    expect(saved.kvStore['hf:goal_progress_snapshots'][0].goalId).toBe('g_snap')
  })
})
