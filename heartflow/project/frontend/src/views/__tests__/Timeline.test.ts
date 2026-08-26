// ============================================================
// Timeline 视图测试 - 时间长廊（时间之河）
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
vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => [],
    getKV: () => '[]',
    setKV: vi.fn(),
  },
  storageVersion: mockStorageVersion,
}))

// ---- 模拟 useDataPort ----
vi.mock('../../composables/useDataPort', () => ({
  useDataPort: () => ({
    downloadMarkdown: vi.fn(),
    downloadJSON: vi.fn(),
    importJSON: () => ({ sessions: 0, crystals: 0, notes: 0, emotions: 0, anchors: 0 }),
  }),
}))

// ---- 模拟 river 模块 ----
vi.mock('../../modules/timeline/river', () => ({
  createReplayTimer: () => ({ start: vi.fn(), stop: vi.fn() }),
  createRiverItems: () => [],
  getRiverItemKey: (item: any) => item?.id || '',
  getRiverSource: () => ({
    sessions: [], crystals: [], notes: [], emotions: [], anchors: [],
    bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
  }),
}))

// ---- 模拟组件 ----
vi.mock('../../components/CalendarView.vue', () => ({
  default: { name: 'CalendarView', template: '<div class="calendar-stub">Calendar</div>' },
}))
vi.mock('../../components/StatsPanel.vue', () => ({
  default: { name: 'StatsPanel', template: '<div class="stats-stub">Stats</div>' },
}))
vi.mock('../../components/RecordList.vue', () => ({
  default: { name: 'RecordList', template: '<div class="record-list-stub">Records</div>' },
}))
vi.mock('../../components/TimelineFragment.vue', () => ({
  default: { name: 'TimelineFragment', template: '<div class="fragment-stub">Fragment</div>' },
}))
vi.mock('../../components/TimeCorridor.vue', () => ({
  default: { name: 'TimeCorridor', template: '<div class="corridor-stub">Corridor</div>' },
}))

async function getWrapper() {
  const { default: Timeline } = await import('../Timeline.vue')
  return mount(Timeline, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('Timeline 时间长廊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染标题"时间长廊"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间长廊')
  })

  it('渲染标签导航 - 时间之河', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间之河')
  })

  it('渲染标签导航 - 日历', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('日历')
  })

  it('渲染标签导航 - 统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('统计')
  })

  it('渲染标签导航 - 记录', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录')
  })

  it('渲染标签导航 - 身体（统一时间线增强）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('身体')
  })

  it('渲染标签导航 - 习惯（统一时间线增强）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('习惯')
  })

  it('渲染标签导航 - 运动（统一时间线增强）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('运动')
  })

  it('渲染标签导航 - 休息（统一时间线增强）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('休息')
  })

  it('渲染标签导航 - 对话（统一时间线增强）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('对话')
  })

  it('渲染标签导航 - 时间长廊', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    const hasCorridor = text.includes('时间长廊')
    expect(hasCorridor).toBe(true)
  })

  it('渲染枢纽导航按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间线索引')
  })

  it('显示统计卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总记录数')
  })
})