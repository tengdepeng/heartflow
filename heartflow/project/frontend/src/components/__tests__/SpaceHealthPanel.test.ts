// ============================================================
// SpaceHealthPanel 空间健康面板测试（INCR-92）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

const mockOverview = ref<any>(null)
const mockActiveIssues = ref<any[]>([])
const mockUnreadAlerts = ref<any[]>([])
const mockErrorTrend = ref<any[]>([])
const mockReports: any[] = []
const mockResolveIssue = vi.fn()
const mockMarkAlertRead = vi.fn()
const mockResolveAlert = vi.fn()
const mockGenerateAll = vi.fn()

vi.mock('../../modules/space/space-health', () => ({
  HEALTH_LEVELS: {
    excellent: { label: '优秀', color: '#34d399', minScore: 90, maxScore: 100 },
    good: { label: '良好', color: '#6b9fc4', minScore: 75, maxScore: 89 },
    fair: { label: '一般', color: '#f0c040', minScore: 60, maxScore: 74 },
    poor: { label: '较差', color: '#f59e6c', minScore: 40, maxScore: 59 },
    critical: { label: '危急', color: '#ef4444', minScore: 0, maxScore: 39 },
  },
  useSpaceHealth: () => ({
    healthOverview: mockOverview,
    activeIssues: mockActiveIssues,
    unreadAlerts: mockUnreadAlerts,
    errorTrend: mockErrorTrend,
    getAllReports: () => mockReports,
    generateAllReports: mockGenerateAll,
    resolveIssue: mockResolveIssue,
    markAlertRead: mockMarkAlertRead,
    resolveAlert: mockResolveAlert,
  }),
}))

import SpaceHealthPanel from '../SpaceHealthPanel.vue'

async function mountPanel() {
  const wrapper = mount(SpaceHealthPanel)
  await nextTick()
  return wrapper
}

describe('SpaceHealthPanel 空间健康', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOverview.value = null
    mockActiveIssues.value = []
    mockUnreadAlerts.value = []
    mockErrorTrend.value = []
    mockReports.length = 0
  })

  it('标题徽标渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('空间健康')
    expect(wrapper.text()).toContain('报告 · 问题 · 告警 · 趋势')
    expect(wrapper.findAll('.shp-tab').length).toBe(4)
  })

  it('概览空态：提示生成报告', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('尚未生成健康报告')
    expect(wrapper.find('.shp-btn').text()).toContain('生成全部报告')
  })

  it('概览填充态：平均分与等级分布', async () => {
    mockOverview.value = {
      avgScore: 82,
      totalSpaces: 2,
      levelCounts: { excellent: 1, good: 1, fair: 0, poor: 0, critical: 0 },
      activeIssueCount: 1,
      unreadAlertCount: 2,
      totalErrors: 3,
      bestSpace: { spaceId: 'home', score: 95 },
      worstSpace: { spaceId: 'study', score: 70 },
    }
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('82')
    expect(wrapper.text()).toContain('2 个空间')
    expect(wrapper.text()).toContain('最佳 home')
    expect(wrapper.text()).toContain('最需关注 study')
    expect(wrapper.findAll('.shp-level-row').length).toBe(5)
  })

  it('点击生成全部报告触发引擎', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.shp-btn').trigger('click')
    expect(mockGenerateAll).toHaveBeenCalled()
  })

  it('报告 Tab：展示报告列表', async () => {
    mockReports.push(
      { spaceId: 'home', level: 'excellent', score: 95, metrics: [{}], activeIssues: [], scoreDelta: 5 },
      { spaceId: 'study', level: 'fair', score: 68, metrics: [{}], activeIssues: [{}], scoreDelta: -3 },
    )
    const wrapper = await mountPanel()
    await wrapper.findAll('.shp-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('home')
    expect(wrapper.text()).toContain('study')
    expect(wrapper.text()).toContain('优秀')
    expect(wrapper.text()).toContain('一般')
    expect(wrapper.text()).toContain('+5')
    expect(wrapper.text()).toContain('-3')
  })

  it('问题 Tab：展示活跃问题并可解决', async () => {
    mockActiveIssues.value = [
      { id: 'i1', type: 'performance', severity: 'high', description: '加载时间过长', suggestion: '优化加载' },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.shp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('加载时间过长')
    expect(wrapper.text()).toContain('优化加载')
    await wrapper.find('.shp-btn--small').trigger('click')
    expect(mockResolveIssue).toHaveBeenCalledWith('i1')
  })

  it('告警 Tab：展示未读告警并可标读/解除', async () => {
    mockUnreadAlerts.value = [
      { id: 'a1', level: 'warning', title: '空间健康下降', description: '分数下降' },
    ]
    mockErrorTrend.value = [{ date: '2026-09-01', count: 2 }]
    const wrapper = await mountPanel()
    await wrapper.findAll('.shp-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('空间健康下降')
    expect(wrapper.text()).toContain('错误趋势')
    const buttons = wrapper.findAll('.shp-btn--small')
    await buttons[0].trigger('click')
    expect(mockMarkAlertRead).toHaveBeenCalledWith('a1')
    await buttons[1].trigger('click')
    expect(mockResolveAlert).toHaveBeenCalledWith('a1')
  })
})
