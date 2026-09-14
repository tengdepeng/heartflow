import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BRANCHES_KEY = 'hf:parallel-world:branches'
const CHECKPOINTS_KEY = 'hf:parallel-world:checkpoints'
const REPLAYS_KEY = 'hf:parallel-world:replays'

function makeBranch(overrides: Record<string, any> = {}) {
  return {
    id: 'b_' + Math.random().toString(36).slice(2, 7),
    name: '分支',
    description: '',
    color: '#4A90D9',
    createdAt: '2026-01-01T00:00:00.000Z',
    isActive: false,
    checkpointCount: 0,
    ...overrides,
  }
}

function makeCheckpoint(overrides: Record<string, any> = {}) {
  return {
    id: 'cp_' + Math.random().toString(36).slice(2, 7),
    branchId: '',
    label: '检查点',
    description: '',
    snapshot: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    ...overrides,
  }
}

async function mountPanel(branches: Record<string, any>[] = [], checkpoints: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (branches.length) kvStore[BRANCHES_KEY] = branches
  if (checkpoints.length) kvStore[CHECKPOINTS_KEY] = checkpoints
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../BranchReplayPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

function storedKey(key: string): any[] {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  const data = JSON.parse(raw)
  return data.kvStore[key] ?? []
}

async function createReplay(wrapper: any, name = '主线回放') {
  const inputs = wrapper.findAll('.brp-create input.brp-input')
  await inputs[0].setValue(name)
  await wrapper.find('.brp-create-btn').trigger('click')
}

describe('BranchReplayPanel 分支回放', () => {
  it('无回放时展示空态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('分支回放')
    expect(wrapper.text()).toContain('还没有回放会话')
    expect(wrapper.find('.brp-detail').exists()).toBe(false)
  })

  it('无分支时创建按钮禁用', async () => {
    const wrapper = await mountPanel([])
    const btn = wrapper.find('.brp-create-btn')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('从分支与检查点创建回放并持久化', async () => {
    const branches = [
      makeBranch({ id: 'bA', name: '工作线', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeBranch({ id: 'bB', name: '生活线', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]
    const checkpoints = [
      makeCheckpoint({ branchId: 'bA', label: '升职', createdAt: '2026-02-01T00:00:00.000Z' }),
      makeCheckpoint({ branchId: 'bB', label: '搬家', createdAt: '2026-03-01T00:00:00.000Z' }),
    ]
    const wrapper = await mountPanel(branches, checkpoints)
    await createReplay(wrapper, '工作线演化')

    expect(wrapper.text()).toContain('工作线演化')
    expect(storedKey(REPLAYS_KEY).length).toBe(1)
    expect(storedKey(REPLAYS_KEY)[0].totalEvents).toBe(4)
    expect(storedKey(REPLAYS_KEY)[0].events[0].type).toBe('branch-created')
  })

  it('创建后自动选中，展示当前事件与进度', async () => {
    const branches = [
      makeBranch({ id: 'bA', name: '工作线', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }),
    ]
    const checkpoints = [
      makeCheckpoint({ branchId: 'bA', label: '升职', createdAt: '2026-02-01T00:00:00.000Z' }),
    ]
    const wrapper = await mountPanel(branches, checkpoints)
    await createReplay(wrapper)

    expect(wrapper.find('.brp-detail').exists()).toBe(true)
    expect(wrapper.text()).toContain('创建分支')
    expect(wrapper.find('.brp-progress-bar').exists()).toBe(true)
    expect(wrapper.findAll('.brp-tl-item').length).toBe(2)
  })

  it('选择分支范围后仅回放所选分支', async () => {
    const branches = [
      makeBranch({ id: 'bA', name: '工作线', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeBranch({ id: 'bB', name: '生活线', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]
    const checkpoints = [
      makeCheckpoint({ branchId: 'bA', label: '升职', createdAt: '2026-02-01T00:00:00.000Z' }),
      makeCheckpoint({ branchId: 'bB', label: '搬家', createdAt: '2026-03-01T00:00:00.000Z' }),
    ]
    const wrapper = await mountPanel(branches, checkpoints)
    // 只勾选第一个分支（工作线）
    const checkboxes = wrapper.findAll('.brp-scope-opt input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await createReplay(wrapper)

    const saved = storedKey(REPLAYS_KEY)
    expect(saved[0].scope.branchIds).toEqual(['bA'])
    expect(saved[0].totalEvents).toBe(2)
  })

  it('开始回放后状态变为回放中，推进后完成', async () => {
    vi.useFakeTimers()
    try {
      const branches = [
        makeBranch({ id: 'bA', name: '工作线', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }),
      ]
      const checkpoints = [
        makeCheckpoint({ branchId: 'bA', label: '升职', createdAt: '2026-02-01T00:00:00.000Z' }),
      ]
      const wrapper = await mountPanel(branches, checkpoints)
      await createReplay(wrapper)
      await wrapper.find('.brp-play').trigger('click')

      expect(wrapper.text()).toContain('回放中')
      expect(wrapper.find('.brp-play').text()).toContain('暂停')

      vi.advanceTimersByTime(5000)
      await flushPromises()
      expect(wrapper.text()).toContain('已完成')
    } finally {
      vi.useRealTimers()
    }
  })

  it('事件导航：下一步与上一步切换当前事件', async () => {
    const branches = [
      makeBranch({ id: 'bA', name: '工作线', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeBranch({ id: 'bB', name: '生活线', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]
    const checkpoints = [
      makeCheckpoint({ branchId: 'bA', label: '升职', createdAt: '2026-02-01T00:00:00.000Z' }),
      makeCheckpoint({ branchId: 'bB', label: '搬家', createdAt: '2026-03-01T00:00:00.000Z' }),
    ]
    const wrapper = await mountPanel(branches, checkpoints)
    await createReplay(wrapper)

    // 初始在第 0 个事件
    expect(wrapper.findAll('.brp-tl-item')[0].classes()).toContain('current')

    await wrapper.find('.brp-nav-next').trigger('click')
    expect(wrapper.findAll('.brp-tl-item')[1].classes()).toContain('current')
    expect(wrapper.text()).toContain('创建分支「生活线」')

    await wrapper.find('.brp-nav-prev').trigger('click')
    expect(wrapper.findAll('.brp-tl-item')[0].classes()).toContain('current')
  })

  it('添加决策标记并跳转', async () => {
    const branches = [
      makeBranch({ id: 'bA', name: '工作线', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeBranch({ id: 'bB', name: '生活线', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]
    const checkpoints = [
      makeCheckpoint({ branchId: 'bA', label: '升职', createdAt: '2026-02-01T00:00:00.000Z' }),
      makeCheckpoint({ branchId: 'bB', label: '搬家', createdAt: '2026-03-01T00:00:00.000Z' }),
    ]
    const wrapper = await mountPanel(branches, checkpoints)
    await createReplay(wrapper)

    // 前进到第 1 个事件后标记
    await wrapper.find('.brp-nav-next').trigger('click')
    await wrapper.find('.brp-marker-add input.brp-input').setValue('关键抉择')
    await wrapper.find('.brp-marker-add-btn').trigger('click')

    expect(wrapper.findAll('.brp-marker').length).toBe(1)
    expect(wrapper.text()).toContain('关键抉择')
    expect(storedKey(REPLAYS_KEY)[0].markers.length).toBe(1)
    expect(storedKey(REPLAYS_KEY)[0].markers[0].eventIndex).toBe(1)

    // 跳回开头再点击标记，回到标记事件
    await wrapper.find('.brp-nav-start').trigger('click')
    expect(wrapper.findAll('.brp-tl-item')[0].classes()).toContain('current')
    await wrapper.find('.brp-marker-label').trigger('click')
    expect(wrapper.findAll('.brp-tl-item')[1].classes()).toContain('current')
  })

  it('删除回放后回到空态', async () => {
    const branches = [
      makeBranch({ id: 'bA', name: '工作线', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }),
    ]
    const wrapper = await mountPanel(branches)
    await createReplay(wrapper)
    expect(wrapper.findAll('.brp-item').length).toBe(1)

    await wrapper.find('.brp-item-del').trigger('click')
    expect(wrapper.findAll('.brp-item').length).toBe(0)
    expect(wrapper.text()).toContain('还没有回放会话')
    expect(storedKey(REPLAYS_KEY).length).toBe(0)
  })
})
