import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeGoal(overrides: Record<string, any> = {}) {
  return {
    id: 'goal-1',
    title: '学习 Vue',
    description: '',
    tier: 'target',
    status: 'growing',
    domain: 'growth',
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    anchorCount: 4,
    anchorDone: 2,
    ...overrides,
  }
}

function makeLog(overrides: Record<string, any> = {}) {
  return {
    id: 'log-1',
    goalId: 'goal-1',
    event: 'progress_update',
    detail: '锚点进度 2/4',
    recordedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeTimeline(overrides: Record<string, any> = {}) {
  return {
    goalId: 'goal-1',
    title: '学习 Vue',
    milestones: [
      { id: 'ms-1', label: '完成基础', date: '2026-06-01', status: 'achieved', type: 'checkpoint' },
      { id: 'ms-2', label: '完成进阶', date: '2026-08-01', status: 'pending', type: 'checkpoint' },
    ],
    ...overrides,
  }
}

async function mountPanel(goals: any[], storageOverrides: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {
      'hf:goal_progress_snapshots': [],
      'hf:goal_progress_logs': [],
      'hf:goal_milestones': [],
      ...storageOverrides,
    },
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../GrowthTrailPanel.vue')
  return mount(mod.default, { props: { goals } })
}

describe('GrowthTrailPanel 生长轨迹', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('渲染标题与生长统计', async () => {
    const wrapper = await mountPanel([makeGoal()])
    expect(wrapper.text()).toContain('生长轨迹')
    expect(wrapper.text()).toContain('生长中')
    expect(wrapper.text()).toContain('已开花')
    expect(wrapper.text()).toContain('50%')
  })

  it('选择目标后展示里程碑并支持达成标记', async () => {
    const wrapper = await mountPanel([makeGoal()], {
      'hf:goal_milestones': [makeTimeline()],
    })
    await wrapper.find('.gtp-select').setValue('goal-1')
    expect(wrapper.text()).toContain('完成基础')
    expect(wrapper.text()).toContain('完成进阶')
    expect(wrapper.text()).toContain('里程碑进度 1/2')
    await wrapper.find('.gtp-mini--ok').trigger('click')
    expect(wrapper.text()).toContain('里程碑进度 2/2')
  })

  it('未选择目标时展示空状态提示', async () => {
    const wrapper = await mountPanel([makeGoal()])
    expect(wrapper.text()).toContain('选择一个目标')
  })

  it('展示生长日志', async () => {
    const wrapper = await mountPanel([makeGoal()], {
      'hf:goal_progress_logs': [makeLog()],
    })
    expect(wrapper.text()).toContain('生长日志')
    expect(wrapper.text()).toContain('进度更新')
    expect(wrapper.text()).toContain('锚点进度 2/4')
    expect(wrapper.text()).toContain('学习 Vue')
  })

  it('无数据时展示空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('还没有生长记录')
  })
})
