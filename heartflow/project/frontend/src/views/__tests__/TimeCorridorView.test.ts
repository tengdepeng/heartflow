// ============================================================
// TimeCorridorView 视图测试 - 时间长廊独立视图
// ============================================================
import { ref } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 vue-router ----
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// ---- 模拟 storage ----
const mockStorageVersion = ref(1)
const mockSessions = [] as any[]
const mockCrystals = [] as any[]

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => mockSessions,
    getCrystals: () => mockCrystals,
  },
  storageVersion: mockStorageVersion,
}))

// ---- 模拟 TimeCorridor 组件 ----
vi.mock('../../components/TimeCorridor.vue', () => ({
  default: {
    name: 'TimeCorridor',
    props: ['sessionMap'],
    template: '<div class="time-corridor-stub">TimeCorridor</div>',
  },
}))

async function getWrapper() {
  const { default: TimeCorridorView } = await import('../TimeCorridorView.vue')
  return mount(TimeCorridorView, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('TimeCorridorView 时间长廊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessions.length = 0
  })

  it('渲染标题"时间长廊"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间长廊')
  })

  it('渲染导航栏按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间之河')
    expect(wrapper.text()).toContain('时间线索引')
  })

  it('有数据时显示统计卡片', async () => {
    mockSessions.push(
      { id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000, startedAt: '2026-01-05T09:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-01-05T09:25:00Z', tags: [], note: '', carrierId: null },
      { id: 's2', status: 'completed', mode: 'focus', plannedDuration: 3600000, elapsed: 3600000, startedAt: '2026-01-06T09:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-01-06T10:00:00Z', tags: [], note: '', carrierId: null },
    )
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总结晶')
    expect(wrapper.text()).toContain('活跃天数')
  })

  it('渲染 TimeCorridor 组件', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.time-corridor-stub').exists()).toBe(true)
  })

  it('无数据时仍渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间长廊')
  })

  it('显示总专注统计', async () => {
    mockSessions.push(
      { id: 's1', status: 'completed', mode: 'focus', plannedDuration: 3600000, elapsed: 3600000, startedAt: '2026-01-05T09:00:00Z', pausedDuration: 0, pausedAt: null, completedAt: '2026-01-05T10:00:00Z', tags: [], note: '', carrierId: null },
    )
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总专注')
  })

  it('渲染天文日历面板（INCR-05 观星时节）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('天文日历')
    expect(wrapper.find('.astro-panel').exists()).toBe(true)
  })

  it('渲染时间星图面板（INCR-185 四季回溯）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.sg-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('时间星图')
    expect(wrapper.text()).toContain('四季')
  })

  it('时间星图显示可见星数与季节切换', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('星可见')
    expect(wrapper.find('.sg-toolbar').exists()).toBe(true)
  })

  it('渲染月相历面板（INCR-193 逐月观星）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.acld-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('月相历')
    expect(wrapper.text()).toContain('逐月观星')
  })

  it('月相历渲染月历格与月份导航', async () => {
    const wrapper = await getWrapper()
    const grid = wrapper.find('.acld-grid')
    expect(grid.exists()).toBe(true)
    expect(wrapper.findAll('.acld-day').length).toBeGreaterThan(0)
    expect(wrapper.find('.acld-nav').exists()).toBe(true)
  })
})