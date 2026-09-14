// ============================================================
// NarrativeReportPanel 叙事报告面板测试（INCR-103）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

const mockReports = ref<any[]>([])
const mockExportResult = ref<any>(null)

const mockLoadReports = vi.fn()
const mockGenerateDailyNarrative = vi.fn()
const mockGenerateWeeklyReport = vi.fn()
const mockGenerateMonthlyReport = vi.fn()
const mockGenerateYearlyReport = vi.fn()
const mockExportReport = vi.fn()

vi.mock('../../modules/timeline/narrative-generator', () => ({
  useNarrativeGenerator: () => ({
    reports: mockReports,
    loadReports: mockLoadReports,
    generateDailyNarrative: mockGenerateDailyNarrative,
    generateWeeklyReport: mockGenerateWeeklyReport,
    generateMonthlyReport: mockGenerateMonthlyReport,
    generateYearlyReport: mockGenerateYearlyReport,
  }),
  useReportExporter: () => ({
    exportResult: mockExportResult,
    exportReport: mockExportReport,
  }),
}))

vi.mock('../../modules/timeline/river', () => ({
  getRiverSource: () => ({
    crystals: [], sessions: [], notes: [], emotions: [], anchors: [],
    bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
  }),
}))

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'narrative-daily-2026-01-05',
    title: '1月5日 · 时间长廊叙事',
    type: 'daily',
    dateRange: { start: '2026-01-05', end: '2026-01-05' },
    segments: [
      {
        date: '2026-01-05',
        label: '上午',
        highlight: '专注时段',
        emotion: '平静',
        insight: '专注了 25 分钟，保持节奏',
        items: [{ type: 'session', summary: '专注 25 分钟' }],
      },
    ],
    summary: '今天你专注了 25 分钟，产生了 1 个时间结晶。',
    stats: {
      totalFocusMinutes: 25,
      totalCrystals: 1,
      totalNotes: 2,
      totalEmotions: 3,
      totalAnchors: 2,
      completedAnchors: 1,
      anchorCompletionRate: 50,
      averageDailyFocus: 25,
      mostProductiveDay: '2026-01-05',
      mostProductiveDayMinutes: 25,
      dominantEmotion: '平静',
      topTags: ['工作'],
    },
    emotionTrend: [
      { date: '2026-01-05', label: '1月5日', happy: 0, calm: 1, sad: 0, anxious: 0, angry: 0, dominant: 'calm' },
    ],
    createdAt: '2026-01-05T10:00:00Z',
    exported: false,
    milestones: [
      { id: 'streak-3', type: 'streak', title: '连续专注', description: '连续 3 天保持专注记录', date: '2026-01-05', value: 3, unit: '天', significance: 30, icon: 'flame' },
    ],
    suggestions: [
      { id: 'focus-low', category: 'focus', priority: 'high', title: '提升每日专注', description: '日均专注不足 30 分钟', dataInsight: '日均专注 25 分钟', actionable: true, relatedMetrics: [] },
    ],
    wordCloud: [
      { text: '工作', weight: 1, category: 'tag' },
    ],
    ...overrides,
  }
}

async function getWrapper() {
  const { default: NarrativeReportPanel } = await import('../NarrativeReportPanel.vue')
  return mount(NarrativeReportPanel, {
    global: { stubs: { Teleport: true, Transition: true } },
  })
}

describe('NarrativeReportPanel 叙事报告', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReports.value = []
    mockExportResult.value = null
  })

  it('标题徽标与副题渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.nrp').exists()).toBe(true)
    expect(wrapper.text()).toContain('叙事报告')
    expect(wrapper.text()).toContain('日 · 周 · 月 · 年 · 生成与导出')
  })

  it('渲染四个生成按钮', async () => {
    const wrapper = await getWrapper()
    const buttons = wrapper.findAll('.nrp-generate .nrp-btn')
    expect(buttons.length).toBe(4)
    expect(wrapper.text()).toContain('生成今日叙事')
    expect(wrapper.text()).toContain('生成本周周报')
    expect(wrapper.text()).toContain('生成本月月报')
    expect(wrapper.text()).toContain('生成年度报告')
  })

  it('空态：无报告时显示提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无报告')
  })

  it('点击生成今日叙事调用 generateDailyNarrative 并展示详情', async () => {
    const report = makeReport()
    mockReports.value = [report]
    mockGenerateDailyNarrative.mockReturnValue(report)
    const wrapper = await getWrapper()
    await wrapper.findAll('.nrp-generate .nrp-btn')[0].trigger('click')
    await nextTick()
    expect(mockGenerateDailyNarrative).toHaveBeenCalled()
    expect(wrapper.text()).toContain(report.summary)
    expect(wrapper.text()).toContain('专注分钟')
  })

  it('点击生成本周周报调用 generateWeeklyReport', async () => {
    const report = makeReport({ id: 'narrative-weekly-2026-01-05', type: 'weekly', title: '周报' })
    mockReports.value = [report]
    mockGenerateWeeklyReport.mockReturnValue(report)
    const wrapper = await getWrapper()
    await wrapper.findAll('.nrp-generate .nrp-btn')[1].trigger('click')
    await nextTick()
    expect(mockGenerateWeeklyReport).toHaveBeenCalled()
    expect(wrapper.text()).toContain('周报')
  })

  it('点击生成本月月报调用 generateMonthlyReport', async () => {
    const report = makeReport({ id: 'narrative-monthly-2026-1', type: 'monthly', title: '月报' })
    mockReports.value = [report]
    mockGenerateMonthlyReport.mockReturnValue(report)
    const wrapper = await getWrapper()
    await wrapper.findAll('.nrp-generate .nrp-btn')[2].trigger('click')
    await nextTick()
    expect(mockGenerateMonthlyReport).toHaveBeenCalled()
    expect(wrapper.text()).toContain('月报')
  })

  it('点击生成年度报告调用 generateYearlyReport', async () => {
    const report = makeReport({ id: 'narrative-yearly-2026', type: 'yearly', title: '年度报告' })
    mockReports.value = [report]
    mockGenerateYearlyReport.mockReturnValue(report)
    const wrapper = await getWrapper()
    await wrapper.findAll('.nrp-generate .nrp-btn')[3].trigger('click')
    await nextTick()
    expect(mockGenerateYearlyReport).toHaveBeenCalled()
    expect(wrapper.text()).toContain('年度报告')
  })

  it('报告列表渲染并可选中查看详情', async () => {
    const report = makeReport()
    mockReports.value = [report]
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.findAll('.nrp-item').length).toBe(1)
    expect(wrapper.text()).toContain(report.title)
    await wrapper.find('.nrp-item').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('报告详情')
    expect(wrapper.text()).toContain(report.summary)
  })

  it('详情渲染统计、段落、里程碑、建议与词云', async () => {
    const report = makeReport()
    mockReports.value = [report]
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.nrp-item').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('25')
    expect(wrapper.text()).toContain('上午')
    expect(wrapper.text()).toContain('连续专注')
    expect(wrapper.text()).toContain('提升每日专注')
    expect(wrapper.text()).toContain('工作')
  })

  it('导出调用 exportReport 并显示导出结果', async () => {
    const report = makeReport()
    mockReports.value = [report]
    mockExportReport.mockImplementation((_r: unknown, format: string) => {
      const ext = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt'
      const result = { format, content: '# 报告', filename: `narrative-daily-2026-01-05.${ext}`, size: 12 }
      mockExportResult.value = result
      return result
    })
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.nrp-item').trigger('click')
    await nextTick()
    await wrapper.findAll('.nrp-export .nrp-btn')[1].trigger('click')
    await nextTick()
    expect(mockExportReport).toHaveBeenCalledWith(report, 'markdown')
    expect(wrapper.text()).toContain('narrative-daily-2026-01-05.md')
  })

  it('onMounted 调用 loadReports', async () => {
    await getWrapper()
    expect(mockLoadReports).toHaveBeenCalled()
  })
})
