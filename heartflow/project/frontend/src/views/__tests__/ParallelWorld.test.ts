// ============================================================
// ParallelWorld 视图测试 - 平行世界
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: ParallelWorld } = await import('../ParallelWorld.vue')
  return mount(ParallelWorld, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('ParallelWorld 平行世界', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('平行世界')
    expect(wrapper.text()).toContain('平行世界中的你，也在闪闪发光')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('平行自我')
    expect(wrapper.text()).toContain('时间胶囊')
    expect(wrapper.text()).toContain('抉择分叉')
  })

  it('显示可能性自我区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('可能性自我')
    expect(wrapper.text()).toContain('映照另一个你')
  })

  it('显示时间胶囊区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间胶囊')
    expect(wrapper.text()).toContain('给未来的自己写一段话')
  })

  it('显示抉择分叉区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('抉择分叉')
  })

  it('时间胶囊封存按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const capsuleBtn = wrapper.find('.pw-add-row .pw-btn')
    expect(capsuleBtn.exists()).toBe(true)
    expect(capsuleBtn.attributes('disabled')).toBeDefined()
  })

  // ============================================================
  // 批量收口：分支管理面板（INCR-176）
  // ============================================================

  it('集成渲染分支管理面板 BranchManagementPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BranchManagementPanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：分支回放面板（INCR-176）
  // ============================================================

  it('集成渲染分支回放面板 BranchReplayPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BranchReplayPanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：分支时间线面板（INCR-176）
  // ============================================================

  it('集成渲染分支时间线面板 BranchTimelinePanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BranchTimelinePanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：分支可视化面板（INCR-176）
  // ============================================================

  it('集成渲染分支可视化面板 BranchVisualizationPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({
      name: 'BranchVisualizationPanel'
    }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：场景同步面板（INCR-222 薄委托化）
  // ============================================================

  it('集成渲染场景同步面板 SceneSyncPanel', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'SceneSyncPanel' }).exists()).toBe(true)
  })

  it('场景同步面板：默认仅主干分支时展示空态提示', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wrapper.findComponent({ name: 'SceneSyncPanel' })
    expect(panel.text()).toContain('场景同步')
    expect(panel.text()).toContain('至少需要两个时间分支才能同步')
  })

  it('场景同步面板：多分支时展示同步表单与差异预览', async () => {
    mockStore['hf:parallel-world:branches'] = [
      { id: 'pw_trunk', name: '主干', description: '', color: '#4A90D9', createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined, isActive: true, checkpointCount: 2 },
      { id: 'pw_b', name: '抉择分支', description: '', color: '#2E8B57', createdAt: '2026-01-02T00:00:00.000Z', parentBranchId: 'pw_trunk', isActive: false, checkpointCount: 1 },
    ]
    mockStore['hf:parallel-world:checkpoints'] = [
      { id: 'cp1', branchId: 'pw_trunk', label: '起点', description: '', snapshot: { a: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['重要'] },
      { id: 'cp2', branchId: 'pw_trunk', label: '转折', description: '', snapshot: { b: 2 }, createdAt: '2026-01-02T00:00:00.000Z', tags: [] },
      { id: 'cp3', branchId: 'pw_b', label: '另一种人生', description: '', snapshot: { c: 3 }, createdAt: '2026-01-03T00:00:00.000Z', tags: [] },
    ]
    mockStore['hf:parallel-world:snapshots'] = []

    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wrapper.findComponent({ name: 'SceneSyncPanel' })
    // 两个分支 → 源/目标两个下拉
    expect(panel.findAll('.ssy-input').length).toBe(2)
    // 默认选中不同分支 → 按钮可用
    const pushBtn = panel.findAll('button').find(b => b.text().includes('推送'))
    expect(pushBtn?.attributes('disabled')).toBeUndefined()
    // 差异预览
    expect(panel.text()).toContain('差异预览')
    expect(panel.text()).toContain('独有')
  })

  it('场景同步面板：推送同步经宿主回调持久化检查点', async () => {
    mockStore['hf:parallel-world:branches'] = [
      { id: 'pw_trunk', name: '主干', description: '', color: '#4A90D9', createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined, isActive: true, checkpointCount: 2 },
      { id: 'pw_b', name: '抉择分支', description: '', color: '#2E8B57', createdAt: '2026-01-02T00:00:00.000Z', parentBranchId: 'pw_trunk', isActive: false, checkpointCount: 1 },
    ]
    mockStore['hf:parallel-world:checkpoints'] = [
      { id: 'cp1', branchId: 'pw_trunk', label: '起点', description: '', snapshot: { a: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['重要'] },
      { id: 'cp2', branchId: 'pw_trunk', label: '转折', description: '', snapshot: { b: 2 }, createdAt: '2026-01-02T00:00:00.000Z', tags: [] },
      { id: 'cp3', branchId: 'pw_b', label: '另一种人生', description: '', snapshot: { c: 3 }, createdAt: '2026-01-03T00:00:00.000Z', tags: [] },
    ]
    mockStore['hf:parallel-world:snapshots'] = []

    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wrapper.findComponent({ name: 'SceneSyncPanel' })
    const pushBtn = panel.findAll('button').find(b => b.text().includes('推送'))!
    await pushBtn.trigger('click')
    await flushPromises()
    // 宿主回调持久化：主干 2 个独有检查点推送到目标分支 → 3 + 2 = 5
    expect(mockStore['hf:parallel-world:checkpoints'].length).toBe(5)
    expect(mockStore['hf:parallel-world:checkpoints'].some((c: any) => c.branchId === 'pw_b' && c.label === '起点')).toBe(true)
    // 面板展示最近同步记录
    expect(panel.text()).toContain('最近同步')
    expect(panel.text()).toContain('完成')
  })
})