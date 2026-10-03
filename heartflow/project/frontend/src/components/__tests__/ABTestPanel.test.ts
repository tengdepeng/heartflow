// ============================================================
// ABTestPanel A/B 测试面板测试（INCR-96）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'
import { estimateSampleSize } from '../../modules/touchpoints/ab-test-engine'

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

vi.mock('../../modules/touchpoints/ab-test-engine', async (importOriginal) => {
  // INCR-464：面板开始消费 estimateSampleSize / getVariantPrimaryMetric，
  // 原有工厂只返回 useABTestEngine 的桩，会把这两个真函数吞成 undefined。
  // 这里透传真模块，只替换与存储相关的部分。
  const actual = await importOriginal<typeof import('../../modules/touchpoints/ab-test-engine')>()
  // getVariantPrimaryMetric 没有模块级导出（只在 useABTestEngine() 的返回值里），
  // 因此从真实 composable 实例上取，避免测试另写一份口径。
  const realEngine = actual.useABTestEngine()
  return {
    ...actual,
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
      getVariantPrimaryMetric: realEngine.getVariantPrimaryMetric,
    }),
    // 以下两项沿用本文件既定夹具，避免改动既有用例的预期
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
  }
})

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

// ============================================================
// INCR-464 · 样本量估算上盘（实验卡片「样本进度」行）
// ============================================================

interface ProgressFixture {
  /** 对照组投递数 */
  deliveriesA?: number
  /** 对照组点击数（clickRate 指标下 clicks/deliveries 即基线率） */
  clicksA?: number
  /** 实验组投递数 */
  deliveriesB?: number
  minSampleSize?: number
  significanceLevel?: number
  targetMetric?: string
}

function makeProgressExperiment(f: ProgressFixture = {}) {
  const {
    deliveriesA = 60,
    clicksA = 12,
    deliveriesB = 60,
    minSampleSize = 100,
    significanceLevel = 0.05,
    targetMetric = 'clickRate',
  } = f
  return {
    id: 'exp_progress',
    name: '样本量进度实验',
    description: '验证样本量进度行',
    status: 'running',
    startedAt: '2026-08-01T08:00:00Z',
    endedAt: null,
    targetMetric,
    minSampleSize,
    minDurationDays: 7,
    significanceLevel,
    variants: [
      { id: 'var_a', name: '对照组', weight: 1 },
      { id: 'var_b', name: '实验组', weight: 1 },
    ],
    variantMetrics: {
      var_a: {
        deliveries: deliveriesA, opens: 0, clicks: clicksA, conversions: 0, dismissals: 0,
        responseTimes: [], primaryMetric: 0, lift: null, ciLower: null, ciUpper: null,
        pValue: null, isSignificant: false,
      },
      var_b: {
        deliveries: deliveriesB, opens: 0, clicks: 0, conversions: 0, dismissals: 0,
        responseTimes: [], primaryMetric: 0, lift: null, ciLower: null, ciUpper: null,
        pValue: null, isSignificant: false,
      },
    },
    winnerId: null,
    winnerConfidence: 0,
    resultSummary: null,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-02T08:00:00Z',
  }
}

describe('ABTestPanel 样本量估算（INCR-464）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExperiments.value = []
    mockReports.value = []
  })

  it('未达标：显示「还差 N」且状态为 pending', async () => {
    // 基线 12/60 = 0.2，α=0.05、MDE=0.05、功效 0.8 => 统计推荐 1094；模板下限 100 => 达标线 1094
    // （INCR-465：normalQuantile 修正前是 3955，偏高 3.6 倍；还差 = 1094 - 已收集 120 = 974）
    mockExperiments.value = [makeProgressExperiment()]
    const wrapper = await mountPanel()
    const state = wrapper.find('.abp-sample-need-state')
    expect(state.text()).toBe('还差 974')
    expect(state.classes()).toContain('is-pending')
    expect(state.classes()).not.toContain('is-reached')
    expect(wrapper.find('.abp-sample-need-required').text()).toBe('样本进度 120 / 需 1094')
  })

  it('已达标：已收集 >= 达标线时显示「已达标」且不再显示还差', async () => {
    // 基线仍为 0.2（400/2000），达标线 1094，已收集 4000
    mockExperiments.value = [makeProgressExperiment({ deliveriesA: 2000, clicksA: 400, deliveriesB: 2000 })]
    const wrapper = await mountPanel()
    const state = wrapper.find('.abp-sample-need-state')
    expect(state.text()).toBe('已达标')
    expect(state.classes()).toContain('is-reached')
    expect(wrapper.find('.abp-sample-need').text()).not.toContain('还差')
  })

  it('计数口径：已收集 = 所有变体 deliveries 之和，而非只看第一个变体', async () => {
    mockExperiments.value = [makeProgressExperiment({ deliveriesA: 60, deliveriesB: 100 })]
    const wrapper = await mountPanel()
    expect(wrapper.find('.abp-sample-need-required').text()).toContain('样本进度 160')
    // 只看第一个变体的话会显示 60；「样本进度 60 /」不得出现（160 不含该子串）
    expect(wrapper.find('.abp-sample-need-required').text()).not.toContain('样本进度 60 /')
  })

  it('未开始实验（deliveries 全 0）：还差等于全部所需，且不出现 NaN/负数/Infinity', async () => {
    mockExperiments.value = [makeProgressExperiment({ deliveriesA: 0, clicksA: 0, deliveriesB: 0 })]
    const wrapper = await mountPanel()
    const needRow = wrapper.find('.abp-sample-need')
    // 基线 0 => 统计推荐 152，达标线 max(100, 152) = 152，已收集 0 => 还差 152（即全部所需）
    // 算：p1=0、p2=0.05、p̄=0.025，n=(1.959964·√(2·0.025·0.975)+0.841621·√(0·1+0.05·0.95))²/0.0025
    //    =(0.432746+0.183404)²/0.0025 = 151.86 => 152（修正前 z 值偏大给出 548）
    expect(wrapper.find('.abp-sample-need-required').text()).toBe('样本进度 0 / 需 152')
    expect(wrapper.find('.abp-sample-need-state').text()).toBe('还差 152')
    expect(needRow.text()).not.toContain('NaN')
    expect(needRow.text()).not.toContain('Infinity')
    expect(needRow.text()).not.toContain('还差 -')
  })

  it('significanceLevel 走实验自带字段：不同显著性水平给出不同推荐值（未写死 0.05）', async () => {
    mockExperiments.value = [makeProgressExperiment({ significanceLevel: 0.05 })]
    const wrapper05 = await mountPanel()
    const stat05 = wrapper05.find('.abp-sample-need-stat').text()
    expect(stat05).toContain('统计推荐 1094')
    wrapper05.unmount()

    mockExperiments.value = [makeProgressExperiment({ significanceLevel: 0.01 })]
    const wrapper01 = await mountPanel()
    const stat01 = wrapper01.find('.abp-sample-need-stat').text()
    // α=0.01 更严，推荐值必须更大（1628），且不得仍是 0.05 那一档的 1094
    // 算：z(0.995)=2.575829 换掉 z(0.975)=1.959964，
    //     n=(2.575829·0.590550+0.841621·0.589491)²/0.0025 = (1.521340+0.496073)²/0.0025 = 1628.0
    expect(stat01).toContain('统计推荐 1628')
    expect(stat01).not.toContain('1094')
    expect(stat01).not.toBe(stat05)
  })

  it('UI 显示的统计推荐值 === 直接调用 estimateSampleSize 的返回值', async () => {
    mockExperiments.value = [makeProgressExperiment({ minSampleSize: 1 })]
    const wrapper = await mountPanel()
    // 同入参：baseline = 12/60 = 0.2，MDE = 0.05，α = exp.significanceLevel = 0.05，power = 0.8
    const expected = estimateSampleSize(0.2, 0.05, 0.05, 0.8)
    expect(expected).toBe(1094)
    expect(wrapper.find('.abp-sample-need-stat').text()).toContain(`统计推荐 ${expected}`)
    // minSampleSize 设为 1 时达标线即统计推荐值本身
    expect(wrapper.find('.abp-sample-need-required').text()).toBe(`样本进度 120 / 需 ${expected}`)
  })

  it('达标线 = max(模板下限, 统计推荐)：模板下限更高时以模板下限为准', async () => {
    mockExperiments.value = [makeProgressExperiment({ minSampleSize: 9999 })]
    const wrapper = await mountPanel()
    expect(wrapper.find('.abp-sample-need-required').text()).toBe('样本进度 120 / 需 9999')
    // 统计推荐值仍单独列出，两者都显示
    expect(wrapper.find('.abp-sample-need-stat').text()).toContain('统计推荐 1094')
  })

  it('responseTime 非比例指标：不编造基线，达标线退化为模板下限且不出现 NaN', async () => {
    mockExperiments.value = [makeProgressExperiment({ targetMetric: 'responseTime', minSampleSize: 100 })]
    const wrapper = await mountPanel()
    const needRow = wrapper.find('.abp-sample-need')
    expect(needRow.text()).not.toContain('NaN')
    expect(needRow.text()).not.toContain('Infinity')
    expect(wrapper.find('.abp-sample-need-stat').text()).toContain('非比例指标')
    expect(wrapper.find('.abp-sample-need-required').text()).toBe('样本进度 120 / 需 100')
    expect(wrapper.find('.abp-sample-need-state').text()).toBe('已达标')
  })
})
