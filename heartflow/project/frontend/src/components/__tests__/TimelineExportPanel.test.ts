import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => {
  const items = { value: [] as any[] }
  const engine = {
    historyItems: [] as any[],
    getHistory: () => ({
      items: [...engine.historyItems],
      totalExports: engine.historyItems.length,
      totalSize: 0,
      lastExportAt: engine.historyItems[0]?.exportedAt,
    }),
    clearHistory: () => {
      engine.historyItems = []
    },
    createBatchTask: (list: any[]) => ({
      id: 'batch_test',
      items: list.map((it, i) => ({
        id: `export_${i}_${Date.now()}`,
        target: it.target,
        format: it.format || 'markdown',
        data: it.data,
        config: it.config || {},
        status: 'pending',
        createdAt: new Date().toISOString(),
      })),
      status: 'pending',
      progress: 0,
      completed: 0,
      failed: 0,
      createdAt: new Date().toISOString(),
    }),
    executeBatchTask: (task: any) => {
      task.status = 'processing'
      for (const item of task.items) {
        item.result = {
          content: `# 导出内容 ${item.target}`,
          fileSize: 42,
          format: item.format,
          mimeType: 'text/markdown',
          filename: `${item.target}_test.md`,
          exportedAt: new Date().toISOString(),
          rowCount: item.target === 'raw_data' ? 2 : undefined,
        }
        item.status = 'completed'
        task.completed++
        engine.historyItems.unshift({
          id: `hist_${item.target}_${Date.now()}`,
          target: item.target,
          format: item.format,
          filename: `${item.target}_test.md`,
          fileSize: 42,
          exportedAt: new Date().toISOString(),
          dataSummary: `${item.target} - ${item.format}`,
        })
      }
      task.status = 'completed'
      task.completedAt = new Date().toISOString()
      return task
    },
  }
  return { items, engine }
})

vi.mock('../../modules/timeline/timeline-bridge', () => ({
  useTimelineBridge: () => ({
    items: h.items,
    radarCharts: { value: { generatedAt: '2026-01-01', radar: { points: [] } } },
    emotionAnalysis: { value: { curve: { name: '情感曲线', dataPoints: [{ date: '2026-01-01' }] } } },
    annualReviewModule: { generateReview: () => ({ title: '2026 年度回顾' }) },
    generateNarrative: () => ({ title: '叙事测试', dateRange: { start: '2026-01-01', end: '2026-12-31' }, stats: {}, segments: [] }),
    exportEngine: h.engine,
  }),
}))

async function mountPanel() {
  const { default: TimelineExportPanel } = await import('../TimelineExportPanel.vue')
  return mount(TimelineExportPanel)
}

describe('TimelineExportPanel 组件（INCR-369）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.items.value = []
    h.engine.historyItems = []
  })

  it('无数据时渲染空态引导', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    expect(wrapper.find('.tep').exists()).toBe(true)
    expect(wrapper.text()).toContain('时光导出')
    expect(wrapper.find('.tep-empty').exists()).toBe(true)
  })

  it('有数据时渲染五类导出卡片', async () => {
    h.items.value = [{ id: 'i1', type: 'crystal' }]
    const wrapper = await mountPanel()
    await nextTick()
    expect(wrapper.find('.tep-empty').exists()).toBe(false)
    expect(wrapper.find('[data-test="export-narrative"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="export-annual_review"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="export-emotion_curve"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="export-radar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="export-raw_data"]').exists()).toBe(true)
  })

  it('导出叙事报告后展示结果与历史记录', async () => {
    h.items.value = [{ id: 'i1', type: 'crystal' }]
    const wrapper = await mountPanel()
    await nextTick()
    // 默认格式 markdown
    await wrapper.find('[data-test="run-narrative"]').trigger('click')
    await nextTick()
    const result = wrapper.find('[data-test="tep-result"]')
    expect(result.exists()).toBe(true)
    expect(result.text()).toContain('narrative_test.md')
    expect(result.find('.tep-preview').text()).toContain('导出内容')
    // 历史
    const history = wrapper.find('[data-test="tep-history"]')
    expect(history.exists()).toBe(true)
    expect(history.findAll('.tep-history-item').length).toBe(1)
    expect(history.text()).toContain('narrative_test.md')
  })

  it('切换情感曲线格式为 json 并导出', async () => {
    h.items.value = [{ id: 'i1', type: 'emotion' }]
    const wrapper = await mountPanel()
    await nextTick()
    await wrapper.find('[data-test="fmt-emotion_curve"]').setValue('json')
    await wrapper.find('[data-test="run-emotion_curve"]').trigger('click')
    await nextTick()
    const result = wrapper.find('[data-test="tep-result"]')
    expect(result.exists()).toBe(true)
    expect(result.text()).toContain('emotion_curve_test.md')
    expect(wrapper.findAll('.tep-history-item').length).toBe(1)
  })

  it('清除历史后记录清空', async () => {
    h.items.value = [{ id: 'i1', type: 'crystal' }]
    const wrapper = await mountPanel()
    await nextTick()
    await wrapper.find('[data-test="run-radar"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="tep-history"]').exists()).toBe(true)
    await wrapper.find('.tep-history-head .tep-mini').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="tep-history"]').exists()).toBe(false)
  })
})