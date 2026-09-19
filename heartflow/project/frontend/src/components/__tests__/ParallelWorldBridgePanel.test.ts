// ============================================================
// ParallelWorldBridgePanel 平行世界·桥接总览组件测试（INCR-376）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'

const BRANCHES_KEY = 'hf:parallel-world:branches'
const CHECKPOINTS_KEY = 'hf:parallel-world:checkpoints'
const SNAPSHOTS_KEY = 'hf:parallel-world:snapshots'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: { getKV: (...args: any[]) => (mockGetKV as any)(...args), setKV: (...args: any[]) => (mockSetKV as any)(...args) },
}))

async function mountPanel() {
  vi.resetModules()
  ;(globalThis as any).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../engine/storage/core')
  invalidateCache()
  const { default: Panel } = await import('../ParallelWorldBridgePanel.vue')
  const wrapper = mount(Panel)
  await flushPromises()
  return wrapper
}

function seedData(opts: { branches?: any[]; checkpoints?: any[]; snapshots?: any[] } = {}) {
  if (opts.branches !== undefined) mockStore[BRANCHES_KEY] = opts.branches
  if (opts.checkpoints !== undefined) mockStore[CHECKPOINTS_KEY] = opts.checkpoints
  if (opts.snapshots !== undefined) mockStore[SNAPSHOTS_KEY] = opts.snapshots
}

function makeBranch(overrides: Record<string, any> = {}) {
  return {
    id: `pw_${Math.random().toString(36).slice(2, 6)}`,
    name: '测试分支',
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
    id: `cp_${Math.random().toString(36).slice(2, 6)}`,
    branchId: 'pw_trunk',
    label: '检查点',
    description: '',
    snapshot: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    ...overrides,
  }
}

describe('ParallelWorldBridgePanel 平行世界·桥接总览（INCR-376）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('空态：标题与摘要渲染，仅默认主干，合并/时间线/对照不渲染', async () => {
    seedData({ branches: [], checkpoints: [], snapshots: [] })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="parallel-world-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('平行世界 · 桥接总览')
    expect(wrapper.find('[data-test="pwb-count-badge"]').text()).toBe('1 个时间分支')
    // 空存储初始化默认主干分支（分支全景渲染主干）
    expect(wrapper.find('[data-test="pwb-branch-panorama"]').text()).toContain('主干')
    expect(wrapper.text()).toContain('世界摘要')
    // 合并/时间线/对照守卫
    expect(wrapper.find('[data-test="pwb-merges"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pwb-timeline"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pwb-comparisons"]').exists()).toBe(false)
  })

  it('有分支时世界摘要更新（分支/检查点/快照/深度）', async () => {
    seedData({
      branches: [
        makeBranch({ id: 'pw_trunk', name: '主干' }),
        makeBranch({ id: 'b1', name: '副业线', parentBranchId: 'pw_trunk', isActive: true }),
        makeBranch({ id: 'b2', name: '爱好线', parentBranchId: 'pw_trunk' }),
      ],
      checkpoints: [
        makeCheckpoint({ branchId: 'b1' }),
        makeCheckpoint({ branchId: 'b1' }),
        makeCheckpoint({ branchId: 'b2' }),
      ],
      snapshots: [{ timestamp: '2026-06-01T00:00:00.000Z', activeBranchId: 'b1', branches: [], metadata: { label: '六月', totalCheckpoints: 3 } }],
    })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="pwb-branches"]').text()).toBe('3') // 摘要卡分支数
    expect(wrapper.find('[data-test="pwb-checkpoints"]').text()).toBe('3')
    expect(wrapper.find('[data-test="pwb-summary"]').text()).toContain('1') // 快照数
    expect(wrapper.find('[data-test="pwb-summary"]').text()).toContain('1') // 最大深度（主干0/子分支1）
    expect(wrapper.text()).toContain('活跃 · 副业线')
    expect(wrapper.text()).toContain('主干 · 主干')
  })

  it('分支全景列出子分支/检查点/深度并可合并标记', async () => {
    seedData({
      branches: [
        makeBranch({ id: 'pw_trunk', name: '主干', isActive: true }),
        makeBranch({ id: 'b1', name: '副业线', parentBranchId: 'pw_trunk' }),
      ],
      checkpoints: [makeCheckpoint({ branchId: 'b1' })],
      snapshots: [],
    })
    const wrapper = await mountPanel()
    const list = wrapper.find('[data-test="pwb-branch-panorama"]')
    expect(list.text()).toContain('副业线')
    expect(list.text()).toContain('1 子分支')
    expect(list.text()).toContain('1 检查点')
    expect(list.text()).toContain('深度 1')
  })

  it('合并机会卡渲染建议行（优先级标签+理由）', async () => {
    seedData({
      branches: [
        makeBranch({ id: 'pw_trunk', name: '主干' }),
        makeBranch({ id: 'b1', name: '副业线', parentBranchId: 'pw_trunk', isActive: true }),
        makeBranch({ id: 'b2', name: '爱好线', parentBranchId: 'pw_trunk' }),
      ],
      checkpoints: [
        makeCheckpoint({ id: 'c1', branchId: 'b1', label: '进阶', tags: ['career'] }),
        makeCheckpoint({ id: 'c2', branchId: 'b2', label: '探索', tags: ['career'] }),
      ],
      snapshots: [],
    })
    const wrapper = await mountPanel()
    const merges = wrapper.find('[data-test="pwb-merges"]')
    expect(merges.exists()).toBe(true)
    expect(merges.text()).toContain('合并机会')
    expect(merges.text()).toContain('共享 1 个标签')
    expect(merges.text()).toContain('优先级')
  })

  it('有时间线节点时渲染时间线卡（label+分支名）', async () => {
    seedData({
      branches: [
        makeBranch({ id: 'pw_trunk', name: '主干', isActive: true }),
        makeBranch({ id: 'b1', name: '副业线', parentBranchId: 'pw_trunk', isActive: true }),
      ],
      checkpoints: [
        makeCheckpoint({ id: 'c1', branchId: 'b1', label: '第一个里程碑' }),
      ],
      snapshots: [],
    })
    const wrapper = await mountPanel()
    const tl = wrapper.find('[data-test="pwb-timeline"]')
    expect(tl.exists()).toBe(true)
    expect(tl.text()).toContain('分支时间线')
  })
})
