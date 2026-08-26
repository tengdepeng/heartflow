// ============================================================
// RestSleepPanel 视图测试 - 睡眠仪表盘面板
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

// ---- 模拟 sleep-quality 模块 ----
const mockReport = ref({
  totalDays: 0,
  avgDuration: 0,
  avgQuality: 0,
  sleepEfficiency: 0,
  consistencyScore: 0,
  weekTrend: [] as any[],
  suggestions: [] as string[],
  sleepDebt: 0,
  chronotype: 'unknown',
})

const mockRecentRecords = ref([] as any[])
const mockAlarmConfigs = ref([] as any[])
const mockHygieneItems = ref([] as any[])

vi.mock('../../modules/rest/sleep-quality', () => ({
  useSleepQuality: () => ({
    init: vi.fn(),
    analyzeSleepQuality: () => mockReport.value,
    recentRecords: mockRecentRecords,
    alarmConfigs: mockAlarmConfigs,
    deleteSleepRecord: vi.fn(),
    addSleepRecord: vi.fn(),
    toggleAlarm: vi.fn(),
    calculateHygieneScore: () => 0,
    hygieneItems: mockHygieneItems,
    toggleHygieneItem: vi.fn(),
    calculateOptimalWakeTimes: () => [],
    calculateOptimalBedtimes: () => [],
  }),
}))

async function getWrapper() {
  const { default: RestSleepPanel } = await import('../RestSleepPanel.vue')
  return mount(RestSleepPanel, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('RestSleepPanel 睡眠仪表盘面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReport.value = {
      totalDays: 0,
      avgDuration: 0,
      avgQuality: 0,
      sleepEfficiency: 0,
      consistencyScore: 0,
      weekTrend: [],
      suggestions: [],
      sleepDebt: 0,
      chronotype: 'unknown',
    }
  })

  it('渲染"睡眠仪表盘"标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('睡眠')
  })

  it('无数据时显示空状态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('开始记录你的睡眠')
  })

  it('显示记录表单按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录')
  })

  it('有数据时显示睡眠统计卡片', async () => {
    mockReport.value = {
      totalDays: 7,
      avgDuration: 450,
      avgQuality: 4,
      sleepEfficiency: 85,
      consistencyScore: 80,
      weekTrend: [],
      suggestions: [],
      sleepDebt: 0,
      chronotype: 'early_bird',
    }
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('7h')
    expect(wrapper.text()).toContain('85')
    expect(wrapper.text()).toContain('早鸟型')
  })

  it('有建议时显示睡眠建议', async () => {
    mockReport.value = {
      totalDays: 7,
      avgDuration: 420,
      avgQuality: 3,
      sleepEfficiency: 75,
      consistencyScore: 60,
      weekTrend: [],
      suggestions: ['保持规律作息', '睡前避免咖啡因'],
      sleepDebt: 0,
      chronotype: 'balanced',
    }
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('保持规律作息')
    expect(wrapper.text()).toContain('睡前避免咖啡因')
  })

  it('有睡眠债务时显示债务提示', async () => {
    mockReport.value = {
      totalDays: 7,
      avgDuration: 400,
      avgQuality: 3,
      sleepEfficiency: 70,
      consistencyScore: 50,
      weekTrend: [],
      suggestions: [],
      sleepDebt: 330,
      chronotype: 'night_owl',
    }
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('5h')
  })

  it('显示最佳作息计算器', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('最佳作息')
  })

  it('显示智能闹钟设置', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('智能闹钟')
  })
})