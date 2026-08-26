// ============================================================
// MovementRoom 动律之间视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}

const mockGetKV = vi.fn((key: string, def: any) => mockStore[key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getConfig: () => ({
      display: {
        trendNoteCount: 20,
        titleTruncateLength: 8,
        excerptTruncateLength: 80,
        tagDisplayCount: 2,
        statsWindowDays: 30,
        searchResultLimit: 10,
        dreamStorageLimit: 100,
        cleanupThresholdDays: 30,
        moveTrajectoryCount: 20,
        healthRecentSleepCount: 14,
        healthRecentExerciseCount: 30,
        healthRecentMealCount: 5,
        noteMaxLength: 100,
      },
      health: {
        exerciseTarget: 150,
        sleepTarget: 7,
        sleepMinThreshold: 6,
        sleepCriticalThreshold: 5,
        sleepExcellentThreshold: 7.5,
      },
      worklog: {
        overtimeRate: 1.5,
        nightRate: 1.3,
        defaultStart: '09:00',
        defaultEnd: '18:00',
        trendDays: 30,
        trendMonths: 6,
        recentShiftLimit: 15,
      },
    }),
  },
}))

// ---- 辅助函数 ----
function makeMove(overrides: Record<string, any> = {}) {
  return {
    id: `mv${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    type: 'run',
    duration: 30,
    withWhom: '',
    location: '',
    note: '',
    isMoment: false,
    at: new Date().toISOString(),
    ...overrides,
  }
}

async function createWrapper() {
  const { default: MovementRoom } = await import('../MovementRoom.vue')
  return mount(MovementRoom)
}

// ---- 测试 ----
describe('MovementRoom 动律之间视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:moves_v2'] = []
  })

  // ------- 渲染标题 -------
  it('渲染标题"动律之间"和副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('动律之间')
    expect(wrapper.text()).toContain('记录每一次身体的律动')
  })

  // ------- 空状态 -------
  it('无数据时显示空状态提示', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('记录你的每一次身体律动')
  })

  // ------- 渲染运动记录 -------
  it('渲染运动记录列表', async () => {
    mockStore['hf:moves_v2'] = [
      makeMove({ id: 'm1', type: 'run', duration: 30, note: '晨跑' }),
      makeMove({ id: 'm2', type: 'swim', duration: 45, note: '游泳' }),
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('晨跑')
    expect(wrapper.text()).toContain('游泳')
    expect(wrapper.text()).toContain('跑步')
    expect(wrapper.text()).toContain('游泳')
  })

  // ------- 统计信息 -------
  it('统计信息显示正确', async () => {
    mockStore['hf:moves_v2'] = [
      makeMove({ id: 'm1', type: 'run', duration: 30 }),
      makeMove({ id: 'm2', type: 'swim', duration: 45 }),
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('总次数')
    expect(wrapper.text()).toContain('总分钟')
    expect(wrapper.text()).toContain('本周')
  })

  // ============== 5.5-7 增强：搜索 + 类型筛选 + 周趋势 ==============

  // ---- 搜索 ----

  it('有数据时显示搜索输入框', async () => {
    mockStore['hf:moves_v2'] = [makeMove({ id: 'm1', type: 'run' })]
    const wrapper = await createWrapper()
    expect(wrapper.find('.mv-search-input').exists()).toBe(true)
  })

  it('搜索过滤运动记录', async () => {
    mockStore['hf:moves_v2'] = [
      makeMove({ id: 'm1', type: 'run', note: '晨跑打卡' }),
      makeMove({ id: 'm2', type: 'swim', note: '游泳训练' }),
    ]
    const wrapper = await createWrapper()
    const input = wrapper.find('.mv-search-input')
    await input.setValue('晨跑')
    expect(wrapper.text()).toContain('晨跑打卡')
    expect(wrapper.text()).not.toContain('游泳训练')
  })

  it('搜索匹配地点', async () => {
    mockStore['hf:moves_v2'] = [
      makeMove({ id: 'm1', type: 'run', location: '奥林匹克公园' }),
      makeMove({ id: 'm2', type: 'run', location: '小区' }),
    ]
    const wrapper = await createWrapper()
    const input = wrapper.find('.mv-search-input')
    await input.setValue('奥林匹克')
    expect(wrapper.text()).toContain('奥林匹克公园')
    expect(wrapper.text()).not.toContain('小区')
  })

  // ---- 类型筛选 ----

  it('有数据时显示类型筛选按钮', async () => {
    mockStore['hf:moves_v2'] = [makeMove({ id: 'm1', type: 'run' })]
    const wrapper = await createWrapper()
    const filters = wrapper.findAll('.mv-type-filter')
    expect(filters.length).toBe(10) // 全部 + 9种运动
  })

  it('类型筛选"全部"默认激活', async () => {
    mockStore['hf:moves_v2'] = [makeMove({ id: 'm1', type: 'run' })]
    const wrapper = await createWrapper()
    const allBtn = wrapper.findAll('.mv-type-filter')[0]
    expect(allBtn.classes()).toContain('active')
  })

  it('点击筛选图标只显示对应类型', async () => {
    mockStore['hf:moves_v2'] = [
      makeMove({ id: 'm1', type: 'run', note: '跑步记录' }),
      makeMove({ id: 'm2', type: 'swim', note: '游泳记录' }),
    ]
    const wrapper = await createWrapper()
    // 第2个 filter 是 🏃 (run)
    const runBtn = wrapper.findAll('.mv-type-filter')[1]
    await runBtn.trigger('click')
    expect(runBtn.classes()).toContain('active')
    expect(wrapper.text()).toContain('跑步记录')
    expect(wrapper.text()).not.toContain('游泳记录')
  })

  // ---- 周趋势 ----

  it('有数据时显示周趋势图', async () => {
    mockStore['hf:moves_v2'] = [makeMove({ id: 'm1', type: 'run', duration: 30 })]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('周趋势')
  })

  it('周趋势包含时长/次数切换标签', async () => {
    mockStore['hf:moves_v2'] = [makeMove({ id: 'm1', type: 'run', duration: 30 })]
    const wrapper = await createWrapper()
    const tabs = wrapper.findAll('.mv-weekly-tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].text()).toBe('时长')
    expect(tabs[1].text()).toBe('次数')
  })

  it('周趋势"时长"标签默认激活', async () => {
    mockStore['hf:moves_v2'] = [makeMove({ id: 'm1', type: 'run', duration: 30 })]
    const wrapper = await createWrapper()
    const durationTab = wrapper.findAll('.mv-weekly-tab')[0]
    expect(durationTab.classes()).toContain('active')
  })

  // ---- 无数据时隐藏 ----

  it('无数据时隐藏搜索栏和筛选按钮', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.mv-search-input').exists()).toBe(false)
    expect(wrapper.find('.mv-type-filter').exists()).toBe(false)
    expect(wrapper.find('.mv-weekly-section').exists()).toBe(false)
  })
})