// ============================================================
// SpaceOrchestrationPanel 空间编排面板测试（INCR-98）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockIsTransitioning = ref(false)
const mockTransitionError = ref<string | null>(null)

const mockSpacesByCategory = computed<any[]>(() => [
  {
    category: 'gravity',
    label: '引力场',
    icon: '⊙',
    spaces: [{ spaceId: 'focus', status: 'active' }],
    totalCount: 1,
    activeCount: 1,
  },
  {
    category: 'work',
    label: '工作',
    icon: '⚒',
    spaces: [
      { spaceId: 'tasks', status: 'idle' },
      { spaceId: 'notes', status: 'idle' },
    ],
    totalCount: 2,
    activeCount: 0,
  },
])

const mockOrchestrationStats = computed(() => ({
  total: 3,
  active: 1,
  idle: 2,
  loading: 0,
  error: 0,
  hidden: 0,
  totalEnters: 5,
  totalStayMinutes: 120,
}))

const mockRecentTransitions = computed<any[]>(() => [
  { fromSpaceId: null, toSpaceId: 'focus', timestamp: '2026-09-03T10:00:00.000Z', transitionMs: 120, success: true },
  { fromSpaceId: 'focus', toSpaceId: 'tasks', timestamp: '2026-09-03T10:05:00.000Z', transitionMs: 80, success: false, error: 'boom' },
])

const mockConfigs: any[] = [
  {
    spaceId: 'focus',
    category: 'gravity',
    priority: -1,
    lazyLoad: false,
    preload: true,
    dependencies: [{ spaceId: 'tasks', type: 'recommended', description: '相邻' }],
    status: 'active',
    lastActiveAt: '2026-09-03T10:00:00.000Z',
    enterCount: 3,
    totalStayMs: 60000,
  },
  {
    spaceId: 'tasks',
    category: 'work',
    priority: 50,
    lazyLoad: false,
    preload: false,
    dependencies: [],
    status: 'idle',
    lastActiveAt: null,
    enterCount: 0,
    totalStayMs: 0,
  },
  {
    spaceId: 'notes',
    category: 'work',
    priority: 50,
    lazyLoad: true,
    preload: false,
    dependencies: [],
    status: 'idle',
    lastActiveAt: null,
    enterCount: 0,
    totalStayMs: 0,
  },
]

const mockGetAllConfigs = vi.fn(() => mockConfigs)
const mockGetConfig = vi.fn((id: string) => mockConfigs.find(c => c.spaceId === id))
const mockAreDependenciesMet = vi.fn(() => ({ met: true, missing: [] }))
const mockGetDependencyChain = vi.fn(() => ['tasks', 'focus'])
const mockGetLoadOrder = vi.fn(() => ['focus', 'tasks', 'notes'])
const mockTransitionTo = vi.fn()
const mockPreloadAll = vi.fn()
const mockSetPriority = vi.fn()
const mockSetLazyLoad = vi.fn()
const mockCreateSnapshot = vi.fn()
const mockRestoreSnapshot = vi.fn()
const mockGetSnapshots = vi.fn<() => any[]>(() => [])
const mockReset = vi.fn()

vi.mock('../../modules/space/space-orchestrator', () => ({
  useSpaceOrchestrator: () => ({
    isTransitioning: mockIsTransitioning,
    transitionError: mockTransitionError,
    spacesByCategory: mockSpacesByCategory,
    orchestrationStats: mockOrchestrationStats,
    recentTransitions: mockRecentTransitions,
    getAllConfigs: mockGetAllConfigs,
    getConfig: mockGetConfig,
    areDependenciesMet: mockAreDependenciesMet,
    getDependencyChain: mockGetDependencyChain,
    getLoadOrder: mockGetLoadOrder,
    transitionTo: mockTransitionTo,
    preloadAll: mockPreloadAll,
    setPriority: mockSetPriority,
    setLazyLoad: mockSetLazyLoad,
    createSnapshot: mockCreateSnapshot,
    restoreSnapshot: mockRestoreSnapshot,
    getSnapshots: mockGetSnapshots,
    reset: mockReset,
  }),
}))

import SpaceOrchestrationPanel from '../SpaceOrchestrationPanel.vue'

async function mountPanel() {
  const wrapper = mount(SpaceOrchestrationPanel)
  await nextTick()
  return wrapper
}

describe('SpaceOrchestrationPanel 空间编排', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsTransitioning.value = false
    mockTransitionError.value = null
    mockGetSnapshots.mockReturnValue([])
  })

  it('标题徽标与四个 tab 渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('空间编排')
    expect(wrapper.text()).toContain('总览 · 转换 · 依赖 · 快照')
    expect(wrapper.findAll('.sop-tab').length).toBe(4)
  })

  it('总览 tab：渲染统计摘要', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('空间')
    expect(wrapper.text()).toContain('活跃')
    expect(wrapper.text()).toContain('进入')
    expect(wrapper.text()).toContain('停留分')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('120')
  })

  it('总览 tab：渲染分类分组', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('引力场')
    expect(wrapper.text()).toContain('工作')
    expect(wrapper.text()).toContain('focus')
    expect(wrapper.text()).toContain('tasks')
    expect(wrapper.text()).toContain('notes')
  })

  it('转换 tab：渲染最近转换', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('— → focus')
    expect(wrapper.text()).toContain('focus → tasks')
    expect(wrapper.text()).toContain('120ms')
    expect(wrapper.text()).toContain('boom')
  })

  it('转换 tab：点击转换调用 transitionTo', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[1].trigger('click')
    await nextTick()
    const select = wrapper.find('.sop-select')
    await select.setValue('tasks')
    const transitionBtn = wrapper.findAll('.sop-btn').find(b => b.text() === '转换')
    await transitionBtn!.trigger('click')
    expect(mockTransitionTo).toHaveBeenCalledWith('tasks')
  })

  it('转换 tab：批量预加载调用 preloadAll', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[1].trigger('click')
    await nextTick()
    const preloadBtn = wrapper.findAll('.sop-btn').find(b => b.text() === '批量预加载')
    await preloadBtn!.trigger('click')
    expect(mockPreloadAll).toHaveBeenCalled()
  })

  it('依赖 tab：渲染加载顺序', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('加载顺序')
    expect(wrapper.text()).toContain('1. focus')
    expect(wrapper.text()).toContain('2. tasks')
    expect(wrapper.text()).toContain('3. notes')
  })

  it('依赖 tab：渲染空间依赖与操作', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('优先级 -1')
    expect(wrapper.text()).toContain('1 依赖')
    expect(wrapper.text()).toContain('预加载')
    expect(wrapper.text()).toContain('懒加载')
    expect(wrapper.text()).toContain('检查依赖')
    expect(wrapper.text()).toContain('优先级+1')
    expect(wrapper.text()).toContain('切换懒加载')
  })

  it('依赖 tab：检查依赖调用 areDependenciesMet', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[2].trigger('click')
    await nextTick()
    const checkBtn = wrapper.findAll('.sop-btn--small').find(b => b.text() === '检查依赖')
    await checkBtn!.trigger('click')
    expect(mockAreDependenciesMet).toHaveBeenCalledWith('focus')
    expect(wrapper.text()).toContain('依赖满足')
  })

  it('依赖 tab：优先级+1 调用 setPriority', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[2].trigger('click')
    await nextTick()
    const prioBtn = wrapper.findAll('.sop-btn--small').find(b => b.text() === '优先级+1')
    await prioBtn!.trigger('click')
    expect(mockSetPriority).toHaveBeenCalledWith('focus', 0)
  })

  it('依赖 tab：切换懒加载调用 setLazyLoad', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[2].trigger('click')
    await nextTick()
    const lazyBtn = wrapper.findAll('.sop-btn--small').find(b => b.text() === '切换懒加载')
    await lazyBtn!.trigger('click')
    expect(mockSetLazyLoad).toHaveBeenCalledWith('focus', true)
  })

  it('快照 tab：渲染空态', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('暂无快照')
  })

  it('快照 tab：渲染快照列表', async () => {
    mockGetSnapshots.mockReturnValue([
      { timestamp: '2026-09-03T10:00:00.000Z', spaces: { focus: {}, tasks: {}, notes: {} }, activeSpaceId: 'focus' },
    ])
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('3 空间')
    expect(wrapper.text()).toContain('focus')
    expect(wrapper.text()).toContain('恢复')
  })

  it('快照 tab：创建快照调用 createSnapshot', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[3].trigger('click')
    await nextTick()
    const createBtn = wrapper.findAll('.sop-btn').find(b => b.text() === '创建快照')
    await createBtn!.trigger('click')
    expect(mockCreateSnapshot).toHaveBeenCalled()
  })

  it('快照 tab：恢复快照调用 restoreSnapshot', async () => {
    const snap = { timestamp: '2026-09-03T10:00:00.000Z', spaces: { focus: {} }, activeSpaceId: 'focus' }
    mockGetSnapshots.mockReturnValue([snap])
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[3].trigger('click')
    await nextTick()
    const restoreBtn = wrapper.findAll('.sop-btn--small').find(b => b.text() === '恢复')
    await restoreBtn!.trigger('click')
    expect(mockRestoreSnapshot).toHaveBeenCalledWith(snap)
  })

  it('快照 tab：重置编排调用 reset', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.sop-tab')[3].trigger('click')
    await nextTick()
    const resetBtn = wrapper.findAll('.sop-btn').find(b => b.text() === '重置编排')
    await resetBtn!.trigger('click')
    expect(mockReset).toHaveBeenCalled()
  })
})
