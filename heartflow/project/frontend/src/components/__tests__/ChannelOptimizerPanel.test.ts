// ============================================================
// ChannelOptimizerPanel 渠道优化面板测试（INCR-95）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockState = ref<any>({
  autoOptimizeEnabled: false,
  lastOptimizedAt: null,
  optimizeIntervalHours: 24,
  history: [],
  totalOptimizations: 0,
  cumulativeImprovement: 0,
})
const mockSuggestions = ref<any[]>([])
const mockRecommendations = ref<any[]>([])
const mockTimeSlots = ref<any>(null)

const mockRefreshSuggestions = vi.fn()
const mockRefreshRecommendations = vi.fn()
const mockAnalyzeTimeSlots = vi.fn()
const mockApplySuggestion = vi.fn()
const mockEnableAutoOptimize = vi.fn()
const mockDisableAutoOptimize = vi.fn()

const mockActiveSuggestions = computed(() => mockSuggestions.value)
const mockRecentHistory = computed(() => mockState.value.history.slice(-5).reverse())
const mockNeedsOptimization = computed(() => mockActiveSuggestions.value.length > 0)

vi.mock('../../modules/touchpoints/channel-optimizer', () => ({
  useChannelOptimizer: () => ({
    optimizerState: mockState,
    suggestions: mockSuggestions,
    recommendations: mockRecommendations,
    timeSlots: mockTimeSlots,
    activeSuggestions: mockActiveSuggestions,
    recentHistory: mockRecentHistory,
    needsOptimization: mockNeedsOptimization,
    scoreChannel: vi.fn(),
    scoreAllChannels: vi.fn(),
    generateOptimizationSuggestions: vi.fn(),
    refreshSuggestions: mockRefreshSuggestions,
    applySuggestion: mockApplySuggestion,
    generateChannelCombos: vi.fn(),
    refreshRecommendations: mockRefreshRecommendations,
    analyzeTimeSlots: mockAnalyzeTimeSlots,
    evaluateOptimization: vi.fn(),
    rollbackOptimization: vi.fn(),
    enableAutoOptimize: mockEnableAutoOptimize,
    disableAutoOptimize: mockDisableAutoOptimize,
    autoOptimize: vi.fn(),
    persist: vi.fn(),
  }),
}))

import ChannelOptimizerPanel from '../ChannelOptimizerPanel.vue'

const sampleSuggestions = [
  {
    id: 's1',
    targetChannel: 'email',
    action: 'decrease_priority',
    title: '邮件渠道效果不佳',
    description: '邮件渠道点击率偏低，建议降低优先级',
    currentValue: '优先级 3',
    suggestedValue: '优先级 1',
    expectedImprovement: '12%',
    confidence: 0.82,
    severity: 'warning',
    autoApplicable: true,
    createdAt: '2026-06-01T08:00:00Z',
  },
]

const sampleCombos = [
  {
    id: 'c1',
    name: '高交互组合',
    description: '优先使用交互率高的渠道',
    channels: ['in-app', 'desktop'],
    channelPriorities: { 'in-app': 5, desktop: 4 },
    expectedScore: 85,
    scenarios: ['成就通知', '重要提醒'],
    advantages: ['交互率高'],
    disadvantages: ['可能打扰'],
    confidence: 0.85,
  },
]

const sampleTimeSlots = {
  bestHours: [
    { hour: 9, label: '09:00', score: 90 },
    { hour: 20, label: '20:00', score: 85 },
  ],
  worstHours: [
    { hour: 3, label: '03:00', score: 10 },
  ],
  recommendedWindows: [{ start: 9, end: 11, label: '09:00 - 11:00' }],
  avoidWindows: [{ start: 23, end: 6, label: '23:00 - 06:00' }],
}

const emptyProps = {
  performances: [],
  hourlyPerformance: [],
  channels: [],
  records: [],
}

async function mountPanel(props: any = emptyProps) {
  const wrapper = mount(ChannelOptimizerPanel, { props })
  await nextTick()
  return wrapper
}

describe('ChannelOptimizerPanel 渠道优化', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.value = {
      autoOptimizeEnabled: false,
      lastOptimizedAt: null,
      optimizeIntervalHours: 24,
      history: [],
      totalOptimizations: 0,
      cumulativeImprovement: 0,
    }
    mockSuggestions.value = []
    mockRecommendations.value = []
    mockTimeSlots.value = null
  })

  it('标题徽标与五个 tab 渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('渠道优化')
    expect(wrapper.text()).toContain('概览 · 建议 · 组合 · 时段 · 历史')
    expect(wrapper.findAll('.cop-tab').length).toBe(5)
  })

  it('概览空态：无历史提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('暂无优化历史')
  })

  it('概览填充态：统计与自动优化切换', async () => {
    mockState.value = {
      autoOptimizeEnabled: false,
      lastOptimizedAt: '2026-06-01T08:00:00Z',
      optimizeIntervalHours: 24,
      history: [],
      totalOptimizations: 5,
      cumulativeImprovement: 18,
    }
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('18%')
    expect(wrapper.text()).toContain('已停用')
    const toggle = wrapper.find('.cop-toggle')
    await toggle.trigger('click')
    expect(mockEnableAutoOptimize).toHaveBeenCalledWith(24)
  })

  it('建议 tab：渲染建议并可应用', async () => {
    mockSuggestions.value = sampleSuggestions
    const wrapper = await mountPanel()
    await wrapper.findAll('.cop-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('邮件渠道效果不佳')
    expect(wrapper.text()).toContain('警告')
    const applyBtn = wrapper.find('.cop-btn--small')
    await applyBtn.trigger('click')
    expect(mockApplySuggestion).toHaveBeenCalledWith('s1', [])
  })

  it('组合 tab：渲染组合推荐', async () => {
    mockRecommendations.value = sampleCombos
    const wrapper = await mountPanel()
    await wrapper.findAll('.cop-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('高交互组合')
    expect(wrapper.text()).toContain('85 分')
    expect(wrapper.text()).toContain('应用内')
    expect(wrapper.text()).toContain('桌面')
  })

  it('时段 tab：渲染最佳/最差时段与窗口', async () => {
    mockTimeSlots.value = sampleTimeSlots
    const wrapper = await mountPanel()
    await wrapper.findAll('.cop-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('最佳时段')
    expect(wrapper.text()).toContain('09:00')
    expect(wrapper.text()).toContain('最差时段')
    expect(wrapper.text()).toContain('03:00')
    expect(wrapper.text()).toContain('建议推送窗口')
    expect(wrapper.text()).toContain('避开窗口')
  })

  it('历史 tab：渲染优化记录', async () => {
    mockState.value = {
      autoOptimizeEnabled: false,
      lastOptimizedAt: '2026-06-01T08:00:00Z',
      optimizeIntervalHours: 24,
      history: [
        {
          id: 'h1',
          suggestionId: 's1',
          action: 'decrease_priority',
          channel: 'email',
          beforeValue: '{"priority":3}',
          afterValue: '{"priority":1}',
          effect: 'improved',
          metricChange: 12,
          appliedAt: '2026-06-01T08:00:00Z',
        },
      ],
      totalOptimizations: 1,
      cumulativeImprovement: 12,
    }
    const wrapper = await mountPanel()
    await wrapper.findAll('.cop-tab')[4].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('降低优先级')
    expect(wrapper.text()).toContain('邮件')
    expect(wrapper.text()).toContain('改善')
  })
})
