// ============================================================
// ParallelWorld 视图测试 - 平行世界
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

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
    expect(wrapper.findComponent({ name: 'BranchVisualizationPanel' }).exists()).toBe(true)
  })
})