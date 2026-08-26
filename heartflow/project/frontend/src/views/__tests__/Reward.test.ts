// ============================================================
// Reward 视图测试
// 劳酬：记录收入与支出，支持搜索、筛选和月度趋势
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

interface RewardRecord {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  at: string
}

const mockRecords: RewardRecord[] = [
  { id: 'r1', type: 'income', category: 'salary', amount: 15000, description: '月度薪资', at: '2026-06-15T08:00:00.000Z' },
  { id: 'r2', type: 'expense', category: 'tool', amount: 500, description: '购买开发工具', at: '2026-06-20T10:00:00.000Z' },
  { id: 'r3', type: 'income', category: 'freelance', amount: 3000, description: '外包项目', at: '2026-07-10T08:00:00.000Z' },
  { id: 'r4', type: 'expense', category: 'course', amount: 1200, description: '在线课程', at: '2026-07-18T10:00:00.000Z' },
  { id: 'r5', type: 'income', category: 'gift', amount: 500, description: '生日红包', at: '2026-07-22T08:00:00.000Z' },
]

const mockKV = new Map<string, any>()
mockKV.set('rewards', [...mockRecords])

const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => mockKV.set(key, val))

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
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

async function getWrapper() {
  const { default: Reward } = await import('../Reward.vue')
  return mount(Reward)
}

describe('Reward 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.set('rewards', [...mockRecords])
  })

  // ---- 渲染 ----

  it('渲染标题"劳酬"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('劳酬')
  })

  it('渲染天平对比概览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('收入')
    expect(wrapper.text()).toContain('支出')
  })

  it('渲染统计概览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录数')
    expect(wrapper.text()).toContain('本月收入')
    expect(wrapper.text()).toContain('本月支出')
    expect(wrapper.text()).toContain('净结余')
  })

  it('有记录时显示记录时间线', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录时间线')
    expect(wrapper.text()).toContain('月度薪资')
    expect(wrapper.text()).toContain('购买开发工具')
  })

  it('无记录时显示空状态', async () => {
    mockKV.set('rewards', [])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('尚无记录')
  })

  // ---- 搜索 ----

  it('存在搜索输入框', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rw-search-input').exists()).toBe(true)
  })

  it('搜索过滤记录', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.rw-search-input')
    await input.setValue('薪资')
    // 应该只显示匹配的记录
    expect(wrapper.text()).toContain('月度薪资')
    expect(wrapper.text()).not.toContain('购买开发工具')
  })

  // ---- 类型筛选 ----

  it('存在类型筛选下拉框', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rw-filter-select').exists()).toBe(true)
  })

  it('类型筛选"收入"只显示收入记录', async () => {
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('.rw-filter-select')
    const typeSelect = selects[0]
    await typeSelect.setValue('income')
    expect(wrapper.text()).toContain('月度薪资')
    expect(wrapper.text()).not.toContain('购买开发工具')
  })

  it('类型筛选"支出"只显示支出记录', async () => {
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('.rw-filter-select')
    const typeSelect = selects[0]
    await typeSelect.setValue('expense')
    expect(wrapper.text()).toContain('购买开发工具')
    expect(wrapper.text()).not.toContain('月度薪资')
  })

  // ---- 月度趋势 ----

  it('有记录时显示月度趋势区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('月度趋势')
  })

  it('趋势标签切换存在', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rw-trend-tab')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toContain('收入')
    expect(tabs[1].text()).toContain('支出')
    expect(tabs[2].text()).toContain('净结余')
  })

  it('无记录时隐藏月度趋势', async () => {
    mockKV.set('rewards', [])
    const wrapper = await getWrapper()
    expect(wrapper.text()).not.toContain('月度趋势')
  })

  // ---- 天平 SVG ----

  it('渲染光质天平 SVG', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rw-anvil-svg').exists()).toBe(true)
  })

  it('有记录时渲染天平粒子动画组', async () => {
    const wrapper = await getWrapper()
    const incomeGroup = wrapper.find('.rw-pg-income')
    const expenseGroup = wrapper.find('.rw-pg-expense')
    expect(incomeGroup.exists()).toBe(true)
    expect(expenseGroup.exists()).toBe(true)
    // 收入方应有5个粒子
    const incomeParticles = incomeGroup.findAll('.rw-particle')
    expect(incomeParticles.length).toBe(5)
    // 支出方应有5个粒子
    const expenseParticles = expenseGroup.findAll('.rw-particle')
    expect(expenseParticles.length).toBe(5)
  })

  it('无记录时隐藏粒子动画组', async () => {
    mockKV.set('rewards', [])
    const wrapper = await getWrapper()
    expect(wrapper.find('.rw-pg-income').exists()).toBe(false)
    expect(wrapper.find('.rw-pg-expense').exists()).toBe(false)
  })

  it('天平光晕径向渐变定义存在', async () => {
    const wrapper = await getWrapper()
    const html = wrapper.html()
    expect(html).toContain('rw-glow-gold')
    expect(html).toContain('rw-glow-red')
  })

  // ---- 工作生涯总结 ----

  it('有记录时显示工作生涯总结', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('工作生涯总结')
    expect(wrapper.text()).toContain('生涯总览')
    expect(wrapper.text()).toContain('收支比')
    expect(wrapper.text()).toContain('日均收入')
    expect(wrapper.text()).toContain('工作天数')
  })

  it('无记录时隐藏工作生涯总结', async () => {
    mockKV.set('rewards', [])
    const wrapper = await getWrapper()
    expect(wrapper.text()).not.toContain('工作生涯总结')
  })
})