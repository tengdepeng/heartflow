import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BRANCHES_KEY = 'hf:parallel-world:branches'
const CHECKPOINTS_KEY = 'hf:parallel-world:checkpoints'
const COMPARISONS_KEY = 'hf:parallel-world:comparisons'

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
  const mod = await import('../BranchTimelinePanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

function storedKey(key: string): any {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  const data = JSON.parse(raw)
  return data.kvStore[key]
}

function makeWorld() {
  const branches = [
    makeBranch({ id: 'bA', name: '工作线', color: '#4A90D9', isActive: true }),
    makeBranch({ id: 'bB', name: '生活线', color: '#7B68EE', parentBranchId: 'bA' }),
  ]
  const checkpoints = [
    makeCheckpoint({ id: 'cpA1', branchId: 'bA', label: '入职', tags: ['工作'], createdAt: '2026-01-01T00:00:00.000Z' }),
    makeCheckpoint({ id: 'cpA2', branchId: 'bA', label: '升职', tags: ['工作', '成长'], createdAt: '2026-03-01T00:00:00.000Z' }),
    makeCheckpoint({ id: 'cpB1', branchId: 'bB', label: '搬家', tags: ['生活'], createdAt: '2026-02-01T00:00:00.000Z' }),
  ]
  return { branches, checkpoints }
}

describe('BranchTimelinePanel 分支时间线', () => {
  it('无检查点时展示空态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('分支时间线')
    expect(wrapper.text()).toContain('还没有检查点')
  })

  it('构建时间线并展示分支节点', async () => {
    const { branches, checkpoints } = makeWorld()
    const wrapper = await mountPanel(branches, checkpoints)

    expect(wrapper.findAll('.btl-branch').length).toBe(2)
    expect(wrapper.text()).toContain('工作线')
    expect(wrapper.text()).toContain('生活线')
    expect(wrapper.findAll('.btl-node').length).toBe(3)
    expect(wrapper.text()).toContain('升职')
  })

  it('分支对比展示相似度与差异', async () => {
    const { branches, checkpoints } = makeWorld()
    const wrapper = await mountPanel(branches, checkpoints)

    const selects = wrapper.findAll('.btl-compare select')
    await selects[0].setValue('bA')
    await selects[1].setValue('bB')
    await wrapper.find('.btl-compare-btn').trigger('click')

    expect(wrapper.find('.btl-compare-result').exists()).toBe(true)
    expect(wrapper.text()).toContain('相似度')
    expect(wrapper.findAll('.btl-diff').length).toBe(3)
    expect(wrapper.text()).toContain('检查点数量')
  })

  it('对比结果持久化到历史', async () => {
    const { branches, checkpoints } = makeWorld()
    const wrapper = await mountPanel(branches, checkpoints)

    const selects = wrapper.findAll('.btl-compare select')
    await selects[0].setValue('bA')
    await selects[1].setValue('bB')
    await wrapper.find('.btl-compare-btn').trigger('click')

    expect(storedKey(COMPARISONS_KEY).length).toBe(1)
    expect(storedKey(COMPARISONS_KEY)[0].branchA.id).toBe('bA')
  })

  it('检测合并建议', async () => {
    // 两个分支共享标签「工作」
    const branches = [
      makeBranch({ id: 'bA', name: '工作线', isActive: true }),
      makeBranch({ id: 'bB', name: '副业线' }),
    ]
    const checkpoints = [
      makeCheckpoint({ branchId: 'bA', label: '入职', tags: ['工作'], createdAt: '2026-01-01T00:00:00.000Z' }),
      makeCheckpoint({ branchId: 'bB', label: '接单', tags: ['工作'], createdAt: '2026-02-01T00:00:00.000Z' }),
    ]
    const wrapper = await mountPanel(branches, checkpoints)

    expect(wrapper.findAll('.btl-suggest').length).toBe(1)
    expect(wrapper.text()).toContain('共享 1 个标签')
  })

  it('演变图谱按层级展示分支', async () => {
    const { branches, checkpoints } = makeWorld()
    const wrapper = await mountPanel(branches, checkpoints)

    expect(wrapper.find('.btl-evo').exists()).toBe(true)
    expect(wrapper.findAll('.btl-evo-node').length).toBe(2)
    expect(wrapper.text()).toContain('最大深度')
  })
})
