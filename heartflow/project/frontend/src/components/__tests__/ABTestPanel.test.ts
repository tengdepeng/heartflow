// ============================================================
// ABTestPanel A/B 测试面板测试（INCR-96）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockExperiments = ref<any[]>([])
const mockReports = ref<any[]>([])
const mockRunning = computed(() => mockExperiments.value.filter((e: any) => e.status === 'running'))
const mockCompleted = computed(() => mockExperiments.value.filter((e: any) => e.status === 'completed'))

const mockCreateFromTemplate = vi.fn()
const mockStartExperiment = vi.fn()
const mockStopExperiment = vi.fn()
const mockCompleteExperiment = vi.fn()
const mockArchiveExperiment = vi.fn()
const mockDeleteExperiment = vi.fn()
const mockTestSignificance = vi.fn()
const mockAutoDetermineWinner = vi.fn()
const mockGenerateReport = vi.fn()

vi.mock('../../modules/touchpoints/ab-test-engine', () => ({
  useABTestEngine: () => ({
    experiments: mockExperiments,
    reports: mockReports,
    runningExperiments: mockRunning,
    completedExperiments: mockCompleted,
    createFromTemplate: mockCreateFromTemplate,
    startExperiment: mockStartExperiment,
    stopExperiment: mockStopExperiment,
    completeExperiment: mockCompleteExperiment,
    archiveExperiment: mockArchiveExperiment,
    deleteExperiment: mockDeleteExperiment,
    testSignificance: mockTestSignificance,
    autoDetermineWinner: mockAutoDetermineWinner,
    generateReport: mockGenerateReport,
  }),
  EXPERIMENT_TEMPLATES: [
    { id: 'template_timing', name: '触达时段实验', description: '测试不同推送时段对点击率的影响' },
    { id: 'template_channel', name: '渠道组合实验', description: '测试不同推送渠道组合对转化率的影响' },
  ],
  METRIC_LABELS: {
    clickRate: '点击率',
    openRate: '打开率',
    conversionRate: '转化率',
    responseTime: '响应时间',
    dismissRate: '关闭率',
  },
}))

import ABTestPanel from '../ABTestPanel.vue'

const sampleExperiment = {
  id: 'exp_1',
  name: '触达时段实验',
  description: '测试不同推送时段对点击率的影响',
  status: 'running',
  startedAt: '2026-08-01T08:00:00Z',
  endedAt: null,
  targetMetric: 'clickRate',
  minSampleSize: 100,
  minDurationDays: 7,
  significanceLevel: 0.05,
  variants: [
    { id: 'var_a', name: '早间触达', weight: 1 },
    { id: 'var_b', name: '午间触达', weight: 1 },
  ],
  variantMetrics: {
    var_a: {
      deliveries: 60, opens: 30, clicks: 12, conversions: 0, dismissals: 0,
      responseTimes: [], primaryMetric: 0.2, lift: 0.5, ciLower: 0.1, ciUpper: 0.4,
      pValue: 0.03, isSignificant: true,
    },
    var_b: {
      deliveries: 60, opens: 30, clicks: 8, conversions: 0, dismissals: 0,
      responseTimes: [], primaryMetric: 0.133, lift: null, ciLower: null, ciUpper: null,
      pValue: null, isSignificant: false,
    },
  },
  winnerId: 'var_a',
  winnerConfidence: 0.97,
  resultSummary: '胜者: 早间触达（点击率 提升 50.0%，置信度 97%）',
  createdAt: '2026-08-01T08:00:00Z',
  updatedAt: '2026-08-02T08:00:00Z',
}

const sampleReport = {
  experimentId: 'exp_1',
  experimentName: '触达时段实验',
  status: 'completed',
  duration: 7,
  totalSamples: 120,
  variants: [],
  winner: { variantId: 'var_a', variantName: '早间触达', confidence: 0.97, lift: 0.5, effectSize: 0.8 },
  recommendation: '胜者: 早间触达（点击率 提升 50.0%，置信度 97%）',
  generatedAt: '2026-08-08T08:00:00Z',
}

async function mountPanel() {
  const wrapper = mount(ABTestPanel)
  await nextTick()
  return wrapper
}

describe('ABTestPanel A/B 测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExperiments.value = []
    mockReports.value = []
  })

  it('标题徽标与三个 tab 渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('A/B 测试')
    expect(wrapper.text()).toContain('实验 · 分析 · 报告')
    expect(wrapper.findAll('.abp-tab').length).toBe(3)
  })

  it('实验空态：提示从模板创建', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('暂无实验')
  })

  it('创建实验：调用 createFromTemplate', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.abp-input').setValue('我的实验')
    await wrapper.find('.abp-btn').trigger('click')
    expect(mockCreateFromTemplate).toHaveBeenCalledWith('template_timing', '我的实验')
  })

  it('实验列表：渲染状态与操作按钮', async () => {
    mockExperiments.value = [sampleExperiment]
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('触达时段实验')
    expect(wrapper.text()).toContain('运行中')
    expect(wrapper.text()).toContain('点击率')
    expect(wrapper.text()).toContain('2 个变体')
    expect(wrapper.text()).toContain('胜者: 早间触达')
    // running 实验显示停止/完成按钮
    expect(wrapper.text()).toContain('停止')
    expect(wrapper.text()).toContain('完成')
  })

  it('运行中实验可停止', async () => {
    mockExperiments.value = [{ ...sampleExperiment, status: 'running' }]
    const wrapper = await mountPanel()
    const stopBtn = wrapper.findAll('.abp-btn--small').find(b => b.text() === '停止')
    expect(stopBtn).toBeTruthy()
    await stopBtn!.trigger('click')
    expect(mockStopExperiment).toHaveBeenCalledWith('exp_1')
  })

  it('草稿实验可开始', async () => {
    mockExperiments.value = [{ ...sampleExperiment, status: 'draft' }]
    const wrapper = await mountPanel()
    const startBtn = wrapper.findAll('.abp-btn--small').find(b => b.text() === '开始')
    expect(startBtn).toBeTruthy()
    await startBtn!.trigger('click')
    expect(mockStartExperiment).toHaveBeenCalledWith('exp_1')
  })

  it('已完成实验可归档', async () => {
    mockExperiments.value = [{ ...sampleExperiment, status: 'completed' }]
    const wrapper = await mountPanel()
    const archiveBtn = wrapper.findAll('.abp-btn--small').find(b => b.text() === '归档')
    expect(archiveBtn).toBeTruthy()
    await archiveBtn!.trigger('click')
    expect(mockArchiveExperiment).toHaveBeenCalledWith('exp_1')
  })

  it('分析 tab：渲染变体指标与胜者', async () => {
    mockExperiments.value = [sampleExperiment]
    const wrapper = await mountPanel()
    await wrapper.findAll('.abp-tab')[1].trigger('click')
    await nextTick()
    // 从下拉框选中实验
    await wrapper.find('.abp-select-row .abp-select').setValue('exp_1')
    await nextTick()
    expect(wrapper.text()).toContain('早间触达')
    expect(wrapper.text()).toContain('🏆 胜者')
    expect(wrapper.text()).toContain('显著')
    expect(wrapper.text()).toContain('提升 50.0%')
    expect(wrapper.text()).toContain('p=0.030')
  })

  it('分析 tab：可触发显著性检验/胜者判定/报告生成', async () => {
    mockExperiments.value = [sampleExperiment]
    const wrapper = await mountPanel()
    await wrapper.findAll('.abp-tab')[1].trigger('click')
    await nextTick()
    await wrapper.find('.abp-select-row .abp-select').setValue('exp_1')
    await nextTick()
    const buttons = wrapper.findAll('.abp-select-row .abp-btn')
    expect(buttons.length).toBe(3)
    await buttons[0].trigger('click')
    expect(mockTestSignificance).toHaveBeenCalledWith('exp_1')
    await buttons[1].trigger('click')
    expect(mockAutoDetermineWinner).toHaveBeenCalledWith('exp_1')
    await buttons[2].trigger('click')
    expect(mockGenerateReport).toHaveBeenCalledWith('exp_1')
  })

  it('报告 tab：渲染实验报告', async () => {
    mockReports.value = [sampleReport]
    const wrapper = await mountPanel()
    await wrapper.findAll('.abp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('触达时段实验')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('时长 7 天')
    expect(wrapper.text()).toContain('样本 120')
    expect(wrapper.text()).toContain('早间触达')
    expect(wrapper.text()).toContain('置信度 97%')
  })

  it('报告空态：提示暂无报告', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.abp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('暂无实验报告')
  })
})
