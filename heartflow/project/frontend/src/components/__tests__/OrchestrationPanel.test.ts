// ============================================================
// OrchestrationPanel 触角编排面板测试（INCR-97）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockCurrentScene = ref<any>({
  type: 'idle',
  name: '空闲',
  activeApp: null,
  timeOfDay: 'morning',
  isFocusing: false,
  isResting: false,
  idleTime: 0,
  screenSize: { width: 1920, height: 1080 },
  custom: {},
})
const mockScenePresets = ref<any[]>([])
const mockLinkageRules = ref<any[]>([])
const mockAdaptiveLayouts = ref<any[]>([])
const mockStatsSummary = computed(() => ({
  totalImpressions: 10,
  totalInteractions: 3,
  avgRate: 0.3,
  recordCount: 2,
}))
const mockPerformanceMetrics = ref<any>({
  renderTime: 0,
  memoryUsage: 0,
  activeTouchpoints: 2,
  fps: 60,
  isSmooth: true,
  grade: 'excellent',
  suggestions: [],
})

const mockUpdateScene = vi.fn()
const mockDetectScene = vi.fn(() => 'focus')
const mockTriggerLinkage = vi.fn()
const mockToggleLinkageRule = vi.fn()
const mockResetLinkageRules = vi.fn()
const mockUpdateScreenSize = vi.fn()
const mockRecordImpression = vi.fn()
const mockRecordInteraction = vi.fn()
const mockGetStatsSummary = vi.fn(() => ({
  byType: {
    widget: { impressions: 8, interactions: 2, rate: 0.25 },
    glow: { impressions: 2, interactions: 1, rate: 0.5 },
  },
  total: { impressions: 10, interactions: 3, rate: 0.3 },
}))
const mockClearStats = vi.fn()
const mockMonitorPerformance = vi.fn()
const mockDegradePerformance = vi.fn()
const mockRestorePerformance = vi.fn()

vi.mock('../../modules/touchpoints/orchestration-engine', () => ({
  useOrchestrationEngine: () => ({
    currentScene: mockCurrentScene,
    scenePresets: mockScenePresets,
    linkageRules: mockLinkageRules,
    adaptiveLayouts: mockAdaptiveLayouts,
    statsSummary: mockStatsSummary,
    performanceMetrics: mockPerformanceMetrics,
    updateScene: mockUpdateScene,
    detectScene: mockDetectScene,
    triggerLinkage: mockTriggerLinkage,
    toggleLinkageRule: mockToggleLinkageRule,
    resetLinkageRules: mockResetLinkageRules,
    updateScreenSize: mockUpdateScreenSize,
    recordImpression: mockRecordImpression,
    recordInteraction: mockRecordInteraction,
    getStatsSummary: mockGetStatsSummary,
    clearStats: mockClearStats,
    monitorPerformance: mockMonitorPerformance,
    degradePerformance: mockDegradePerformance,
    restorePerformance: mockRestorePerformance,
  }),
}))

import OrchestrationPanel from '../OrchestrationPanel.vue'

const samplePreset = {
  id: 'scene_preset_0',
  type: 'focus',
  name: '专注模式',
  description: '专注时只显示番茄钟，光痕增强',
  widgetConfig: { visibleTypes: ['pomodoro'], hiddenTypes: ['daily-anchor', 'quote'] },
  glowOverride: {},
  floatingOverride: {},
}

const sampleRule = {
  id: 'linkage_rule_0',
  name: '专注开始-光痕增强',
  sourceType: 'widget',
  trigger: { type: 'state-change', params: {} },
  targets: [{ targetType: 'glow', action: 'intensify', params: {}, delay: 0 }],
  enabled: true,
  priority: 10,
  cooldown: 5000,
  lastTriggeredAt: null,
}

const sampleLayout = {
  id: 'adaptive_layout_0',
  screenRange: { minWidth: 0, maxWidth: 640, minHeight: 0, maxHeight: Infinity },
  name: '移动端布局',
  columns: 2,
  rows: 3,
  gap: 8,
  padding: 12,
  maxWidgets: 4,
  sizeMapping: {},
}

async function mountPanel() {
  const wrapper = mount(OrchestrationPanel)
  await nextTick()
  return wrapper
}

describe('OrchestrationPanel 触角编排', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentScene.value = {
      type: 'idle',
      name: '空闲',
      activeApp: null,
      timeOfDay: 'morning',
      isFocusing: false,
      isResting: false,
      idleTime: 0,
      screenSize: { width: 1920, height: 1080 },
      custom: {},
    }
    mockScenePresets.value = []
    mockLinkageRules.value = []
    mockAdaptiveLayouts.value = []
    mockPerformanceMetrics.value = {
      renderTime: 0,
      memoryUsage: 0,
      activeTouchpoints: 2,
      fps: 60,
      isSmooth: true,
      grade: 'excellent',
      suggestions: [],
    }
  })

  it('标题徽标与四个 tab 渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('触角编排')
    expect(wrapper.text()).toContain('场景 · 联动 · 布局 · 统计')
    expect(wrapper.findAll('.ocp-tab').length).toBe(4)
  })

  it('场景 tab：渲染当前场景与预设', async () => {
    mockScenePresets.value = [samplePreset]
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('空闲')
    expect(wrapper.text()).toContain('专注模式')
    expect(wrapper.text()).toContain('显示 1 种')
    expect(wrapper.text()).toContain('隐藏 2 种')
  })

  it('场景 tab：检测场景调用 detectScene + updateScene', async () => {
    const wrapper = await mountPanel()
    const detectBtn = wrapper.findAll('.ocp-btn--small').find(b => b.text() === '检测场景')
    expect(detectBtn).toBeTruthy()
    await detectBtn!.trigger('click')
    expect(mockDetectScene).toHaveBeenCalled()
    expect(mockUpdateScene).toHaveBeenCalledWith({ type: 'focus', name: '专注' })
  })

  it('场景 tab：应用预设调用 updateScene', async () => {
    mockScenePresets.value = [samplePreset]
    const wrapper = await mountPanel()
    const applyBtn = wrapper.findAll('.ocp-btn--small').find(b => b.text() === '应用预设')
    expect(applyBtn).toBeTruthy()
    await applyBtn!.trigger('click')
    expect(mockUpdateScene).toHaveBeenCalledWith({ type: 'focus', name: '专注' })
  })

  it('联动 tab：渲染规则与空态', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('暂无联动规则')
  })

  it('联动 tab：渲染规则信息', async () => {
    mockLinkageRules.value = [sampleRule]
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('专注开始-光痕增强')
    expect(wrapper.text()).toContain('小组件')
    expect(wrapper.text()).toContain('状态变更')
    expect(wrapper.text()).toContain('1 个目标动作')
    expect(wrapper.text()).toContain('优先级 10')
    expect(wrapper.text()).toContain('未触发')
  })

  it('联动 tab：切换规则开关调用 toggleLinkageRule', async () => {
    mockLinkageRules.value = [sampleRule]
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[1].trigger('click')
    await nextTick()
    await wrapper.find('.ocp-toggle input').setValue(false)
    expect(mockToggleLinkageRule).toHaveBeenCalledWith('linkage_rule_0')
  })

  it('联动 tab：手动触发调用 triggerLinkage', async () => {
    mockLinkageRules.value = [sampleRule]
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[1].trigger('click')
    await nextTick()
    const triggerBtn = wrapper.findAll('.ocp-btn--small').find(b => b.text() === '手动触发')
    expect(triggerBtn).toBeTruthy()
    await triggerBtn!.trigger('click')
    expect(mockTriggerLinkage).toHaveBeenCalledWith('linkage_rule_0')
  })

  it('联动 tab：重置规则调用 resetLinkageRules', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[1].trigger('click')
    await nextTick()
    const resetBtn = wrapper.findAll('.ocp-btn').find(b => b.text() === '重置预设规则')
    expect(resetBtn).toBeTruthy()
    await resetBtn!.trigger('click')
    expect(mockResetLinkageRules).toHaveBeenCalled()
  })

  it('布局 tab：渲染布局与空态', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('暂无自适应布局')
  })

  it('布局 tab：渲染布局信息', async () => {
    mockAdaptiveLayouts.value = [sampleLayout]
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('移动端布局')
    expect(wrapper.text()).toContain('0–640px')
    expect(wrapper.text()).toContain('2×3 网格')
    expect(wrapper.text()).toContain('最多 4 个')
  })

  it('布局 tab：更新屏幕尺寸调用 updateScreenSize', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[2].trigger('click')
    await nextTick()
    const inputs = wrapper.findAll('.ocp-input')
    await inputs[0].setValue(1440)
    await inputs[1].setValue(900)
    const updateBtn = wrapper.findAll('.ocp-btn').find(b => b.text() === '更新屏幕尺寸')
    await updateBtn!.trigger('click')
    expect(mockUpdateScreenSize).toHaveBeenCalledWith(1440, 900)
  })

  it('统计 tab：渲染统计摘要', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('总展示')
    expect(wrapper.text()).toContain('总交互')
    expect(wrapper.text()).toContain('平均交互率')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('30%')
  })

  it('统计 tab：记录展示调用 recordImpression', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[3].trigger('click')
    await nextTick()
    const recordBtns = wrapper.findAll('.ocp-btn').filter(b => b.text().startsWith('记录'))
    expect(recordBtns.length).toBe(2)
    await recordBtns[0].trigger('click')
    expect(mockRecordImpression).toHaveBeenCalledWith('widget')
    await recordBtns[1].trigger('click')
    expect(mockRecordImpression).toHaveBeenCalledWith('glow')
  })

  it('统计 tab：清除统计调用 clearStats', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[3].trigger('click')
    await nextTick()
    const clearBtn = wrapper.findAll('.ocp-btn').find(b => b.text() === '清除统计')
    expect(clearBtn).toBeTruthy()
    await clearBtn!.trigger('click')
    expect(mockClearStats).toHaveBeenCalled()
  })

  it('统计 tab：按类型分布渲染', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('小组件')
    expect(wrapper.text()).toContain('光痕')
    expect(wrapper.text()).toContain('8 次 · 25%')
    expect(wrapper.text()).toContain('2 次 · 50%')
  })

  it('统计 tab：性能监控按钮触发', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ocp-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('等级 优秀')
    expect(wrapper.text()).toContain('活跃触角 2')
    expect(wrapper.text()).toContain('流畅')
    const smallBtns = wrapper.findAll('.ocp-btn--small')
    const monitorBtn = smallBtns.find(b => b.text() === '监控性能')
    const degradeBtn = smallBtns.find(b => b.text() === '性能降级')
    const restoreBtn = smallBtns.find(b => b.text() === '性能恢复')
    expect(monitorBtn).toBeTruthy()
    expect(degradeBtn).toBeTruthy()
    expect(restoreBtn).toBeTruthy()
    await monitorBtn!.trigger('click')
    expect(mockMonitorPerformance).toHaveBeenCalled()
    await degradeBtn!.trigger('click')
    expect(mockDegradePerformance).toHaveBeenCalled()
    await restoreBtn!.trigger('click')
    expect(mockRestorePerformance).toHaveBeenCalled()
  })
})
