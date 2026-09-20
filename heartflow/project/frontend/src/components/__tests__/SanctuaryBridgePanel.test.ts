// ============================================================
// SanctuaryBridgePanel 安全岛·中枢总览（INCR-389）
// mock 直接子路径 ../../modules/sanctuary/sanctuary-bridge 注入受控 ref
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

function baseStats() {
  return {
    totalActivations: 0,
    totalDuration: 0,
    avgDuration: 0,
    lastActivation: null,
    sessionsToday: 0,
    longestSession: 0,
    shortestSession: 0,
  }
}
function baseConfig() {
  return { tapCount: 5, windowMs: 2000, autoExit: false, progress: 0 }
}

const sessionStats = ref<any>(baseStats())
const triggerConfig = ref<any>(baseConfig())
const recommendations = ref<any[]>([])
const sanctuaryState = ref<any>({ isActive: false, activationCount: 0, currentSessionStart: null, sessionDuration: 0 })
const historyRef = ref<any[]>([])

const getSessionHistory = vi.fn((n?: number) => historyRef.value.slice(0, n))

vi.mock('../../modules/sanctuary/sanctuary-bridge', () => ({
  useSanctuaryBridge: () => ({
    sessionStats,
    triggerConfig,
    recommendations,
    sanctuaryState,
    getSessionHistory,
  }),
}))

async function mountPanel() {
  const mod = await import('../SanctuaryBridgePanel.vue')
  return mount(mod.default)
}

function sess(over: Record<string, any> = {}) {
  return { id: 'sanc-1', startTime: new Date(2026, 4, 15, 9, 30).toISOString(), endTime: null, duration: 75, reason: '用户触发', ...over }
}

describe('SanctuaryBridgePanel 安全岛·中枢总览（INCR-389）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStats.value = baseStats()
    triggerConfig.value = baseConfig()
    recommendations.value = []
    sanctuaryState.value = { isActive: false, activationCount: 0, currentSessionStart: null, sessionDuration: 0 }
    historyRef.value = []
  })

  it('空态：标题 + 徽标待触发 + 会话/配置区块归零 + 建议空 + 历史空 + 空态引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="sanctuary-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.find('.snb-title').text()).toContain('安全岛·中枢总览')
    expect(wrapper.find('[data-test="snb-status"]').classes()).toContain('idle')
    expect(wrapper.text()).toContain('待触发')
    expect(wrapper.find('[data-test="snb-stats"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="snb-config"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="snb-recs"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="snb-history"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="snb-recs-empty"]').text()).toContain('还没有建议')
    expect(wrapper.find('[data-test="snb-history-empty"]').text()).toContain('尚无激活记录')
    expect(wrapper.find('[data-test="snb-empty"]').text()).toContain('中枢尚在待命')
  })

  it('会话统计：总激活/今日/平均/最长/最短 数值 + 徽标有回响', async () => {
    sessionStats.value = { ...baseStats(), totalActivations: 6, sessionsToday: 2, avgDuration: 100, longestSession: 350, shortestSession: 30 }
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="snb-status"]').classes()).toContain('echo')
    expect(wrapper.text()).toContain('有回响')
    const cells = wrapper.findAll('[data-test="snb-cell"]')
    expect(cells[0].text()).toContain('6')
    expect(cells[1].text()).toContain('2')
    expect(cells[2].text()).toContain('1m40s')
    expect(cells[3].text()).toContain('5m50s')
    expect(cells[4].text()).toContain('30s')
  })

  it('触发配置：触发次数/窗口/自动退出/进度', async () => {
    triggerConfig.value = { tapCount: 3, windowMs: 1500, autoExit: true, progress: 0.75 }
    const wrapper = await mountPanel()
    const cells = wrapper.findAll('[data-test="snb-cell"]')
    expect(cells[5].text()).toContain('3')
    expect(cells[6].text()).toContain('1500ms')
    expect(cells[7].text()).toContain('开')
    expect(cells[8].text()).toContain('75%')
  })

  it('使用建议：标题/描述/动作 + 优先级标签', async () => {
    recommendations.value = [
      { type: 'usage', priority: 'high', title: '初次体验安全岛', description: '五击屏幕任意位置即可激活', action: '尝试五击激活' },
      { type: 'wellness', priority: 'low', title: '建立安全岛使用习惯', description: '将安全岛融入日常', action: '每天使用 1-2 次' },
    ]
    const wrapper = await mountPanel()
    const recs = wrapper.findAll('[data-test="snb-rec"]')
    expect(recs.length).toBe(2)
    expect(recs[0].text()).toContain('初次体验安全岛')
    expect(recs[0].text()).toContain('五击屏幕任意位置即可激活')
    expect(recs[0].text()).toContain('尝试五击激活')
    expect(recs[0].find('.snb-rec-pri').text()).toBe('高')
    expect(recs[0].find('.snb-rec-pri').classes()).toContain('pri--high')
    expect(recs[1].find('.snb-rec-pri').text()).toBe('低')
    expect(wrapper.find('[data-test="snb-recs-empty"]').exists()).toBe(false)
  })

  it('激活历史：理由/时间/时长 + 安住中(active) 徽标 + 无空态引导', async () => {
    sanctuaryState.value = { isActive: true, activationCount: 1, currentSessionStart: new Date().toISOString(), sessionDuration: 12 }
    sessionStats.value = { ...baseStats(), totalActivations: 2, sessionsToday: 1, avgDuration: 60, longestSession: 75, shortestSession: 45 }
    historyRef.value = [sess(), sess({ id: 'sanc-2', reason: '压力释放', duration: 45, startTime: new Date(2026, 4, 15, 8, 0).toISOString() })]
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="snb-status"]').classes()).toContain('resting')
    expect(wrapper.text()).toContain('安住中')
    const items = wrapper.findAll('[data-test="snb-history-item"]')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('用户触发')
    expect(items[0].text()).toContain('1m15s')
    expect(items[1].text()).toContain('压力释放')
    expect(wrapper.find('[data-test="snb-history-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="snb-empty"]').exists()).toBe(false)
  })
})