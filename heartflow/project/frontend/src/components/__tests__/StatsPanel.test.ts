// ============================================================
// StatsPanel 组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'

// 模拟 storage
const mockGetSessions = vi.fn()
const mockGetCrystals = vi.fn()

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => mockGetSessions(...args),
    getCrystals: (...args: any[]) => mockGetCrystals(...args),
  },
}))

// 模拟 config store（使用 ref 以便测试中修改后能生效）
const mockConfigState = ref({
  stats: { dailyGoal: 30, showTrendChart: true, showPanel: true, weeklyGoal: 120 },
})
const mockStore = reactive({ config: mockConfigState })

vi.mock('../../stores/config', () => ({
  useConfigStore: () => mockStore,
}))

async function getWrapper() {
  const { default: StatsPanel } = await import('../StatsPanel.vue')
  return mount(StatsPanel, {
    global: {
      stubs: { HeatmapGrid: true },
    },
  })
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 's1',
    status: 'completed',
    mode: 'focus',
    elapsed: 1500000, // 25 min
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    tags: ['学习'],
    note: '',
    plannedDuration: 1500000,
    pausedDuration: 0,
    pausedAt: null,
    carrierId: null,
    ...overrides,
  }
}

describe('StatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessions.mockReturnValue([])
    mockGetCrystals.mockReturnValue([])
    mockConfigState.value = { stats: { dailyGoal: 30, showTrendChart: true, showPanel: true, weeklyGoal: 120 } }
  })

  it('渲染4个统计卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.stat-card')
    expect(cards).toHaveLength(4)
  })

  it('显示总专注时间', async () => {
    const now = new Date()
    const twoHoursAgo = new Date(now)
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
    mockGetSessions.mockReturnValue([
      makeSession({ elapsed: 7200000, completedAt: now.toISOString() }), // 2 hours
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总专注时间')
    expect(wrapper.text()).toContain('2小时')
  })

  it('显示今日专注时间', async () => {
    mockGetSessions.mockReturnValue([
      makeSession({ elapsed: 1800000 }), // 30 min
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('今日专注')
    expect(wrapper.text()).toContain('30分钟')
  })

  it('显示连续天数', async () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    mockGetSessions.mockReturnValue([
      makeSession({ completedAt: today.toISOString() }),
      makeSession({ id: 's2', completedAt: yesterday.toISOString() }),
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('连续天数')
    // 至少包含数字（连续天数 >= 1）
    expect(wrapper.text()).toMatch(/\d+天/)
  })

  it('显示结晶总数', async () => {
    mockGetCrystals.mockReturnValue([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('结晶总数')
    expect(wrapper.text()).toContain('3')
  })

  it('今日目标进度条显示正确的百分比', async () => {
    // 30分钟目标，今日专注 15分钟 → 50%
    mockGetSessions.mockReturnValue([
      makeSession({ elapsed: 900000 }), // 15 min
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('今日专注目标')
    expect(wrapper.text()).toContain('15 / 30 分钟')
    const fill = wrapper.find('.goal-progress-fill')
    expect(fill.attributes('style')).toContain('width: 50%')
  })

  it('今日专注达到目标时显示已完成', async () => {
    // 30分钟目标，今日专注 35分钟 → 超过100%
    mockGetSessions.mockReturnValue([
      makeSession({ elapsed: 2100000 }), // 35 min
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已完成')
    const fill = wrapper.find('.goal-progress-fill')
    expect(fill.attributes('style')).toContain('width: 100%')
  })

  it('showTrendChart 为 true 时显示趋势图表', async () => {
    const wrapper = await getWrapper()
    const trendSection = wrapper.findAll('.trend-section')
    // 至少有一个趋势 section（目标进度 + 趋势图）
    expect(trendSection.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('近7天专注趋势')
  })

  it('showTrendChart 为 false 时隐藏趋势图表', async () => {
    mockConfigState.value = { stats: { dailyGoal: 30, showTrendChart: false, showPanel: true, weeklyGoal: 120 } }
    const wrapper = await getWrapper()
    expect(wrapper.text()).not.toContain('近7天专注趋势')
  })

  it('dailyGoal 为 0 时隐藏目标进度条', async () => {
    mockConfigState.value = { stats: { dailyGoal: 0, showTrendChart: true, showPanel: true, weeklyGoal: 120 } }
    const wrapper = await getWrapper()
    expect(wrapper.text()).not.toContain('今日专注目标')
  })

  it('所有数据为 0 时显示 0 值', async () => {
    mockGetSessions.mockReturnValue([])
    mockGetCrystals.mockReturnValue([])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('0秒')
    expect(wrapper.text()).toContain('0天')
    expect(wrapper.text()).toContain('0')
  })

  it('大数值显示正常', async () => {
    const now = new Date()
    mockGetSessions.mockReturnValue([
      makeSession({ elapsed: 86400000, completedAt: now.toISOString() }), // 24 hours
    ])
    mockGetCrystals.mockReturnValue(
      Array.from({ length: 999 }, (_, i) => ({ id: `c${i}` }))
    )
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('24小时')
    expect(wrapper.text()).toContain('999')
  })

  it('渲染 HeatmapGrid 子组件', async () => {
    const wrapper = await getWrapper()
    const heatmap = wrapper.findComponent({ name: 'HeatmapGrid' })
    expect(heatmap.exists()).toBe(true)
  })
})