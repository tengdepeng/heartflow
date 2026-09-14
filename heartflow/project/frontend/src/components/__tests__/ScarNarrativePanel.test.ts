// ============================================================
// ScarNarrativePanel 叙事工坊面板测试（INCR-105）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

const mockTemplates = ref<any[]>([])
const mockDrafts = ref<any[]>([])

const mockLoadAll = vi.fn()
const mockGetPresetTemplates = vi.fn()
const mockCreateDraft = vi.fn()
const mockUpdateDraftStage = vi.fn()
const mockAdvanceStage = vi.fn()
const mockGetDraftProgress = vi.fn()
const mockLoadResonances = vi.fn()
const mockFindResonanceMatches = vi.fn()
const mockCreateCommunityResonance = vi.fn()
const mockComputeResonanceStats = vi.fn()
const mockGenerateVisualizationData = vi.fn()

vi.mock('../../modules/scar/narrative-template', () => ({
  useNarrativeTemplate: () => ({
    templates: mockTemplates,
    drafts: mockDrafts,
    loadAll: mockLoadAll,
    getPresetTemplates: mockGetPresetTemplates,
    createDraft: mockCreateDraft,
    updateDraftStage: mockUpdateDraftStage,
    advanceStage: mockAdvanceStage,
    getDraftProgress: mockGetDraftProgress,
  }),
  useResonanceAlgorithm: () => ({
    communityResonances: ref([]),
    loadResonances: mockLoadResonances,
    findResonanceMatches: mockFindResonanceMatches,
    createCommunityResonance: mockCreateCommunityResonance,
    computeResonanceStats: mockComputeResonanceStats,
  }),
  useScarVisualization: () => ({
    visualizationData: ref(null),
    generateVisualizationData: mockGenerateVisualizationData,
  }),
}))

const marks = [
  { id: 'm1', bodyPart: 'waist', severity: 3, description: '久坐腰酸', scarType: 'wear', recordedAt: '2026-06-15T08:00:00.000Z', healingStage: 'matured', healingProgress: 100, transformed: true },
  { id: 'm2', bodyPart: 'shoulder', severity: 4, description: '握鼠标肩痛', scarType: 'wear', recordedAt: '2026-06-20T10:00:00.000Z', healingStage: 'remodeling', healingProgress: 80, transformed: false },
  { id: 'm3', bodyPart: 'eye', severity: 5, description: '熬夜眼干', scarType: 'burn', recordedAt: '2026-07-10T08:00:00.000Z', healingStage: 'proliferation', healingProgress: 50, transformed: false },
]

const template = {
  id: 't1',
  type: 'hero-journey',
  name: '英雄之旅',
  description: '以英雄的旅程为框架，从平凡世界出发，经历试炼',
  icon: '⚔️',
  preset: true,
  stages: [
    { order: 1, name: '平凡世界', description: '描述伤痕发生前的生活状态', prompts: ['当时的生活是怎样的？'], emotion: 'peace', suggestedWords: 150 },
    { order: 2, name: '冒险召唤', description: '伤痕事件的到来', prompts: ['发生了什么？'], emotion: 'pain', suggestedWords: 200 },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
}

const draft = {
  id: 'd1',
  templateId: 't1',
  scarIds: ['m1'],
  currentStage: 1,
  stageContents: {},
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const emptyStats = {
  totalResonances: 0,
  maxResonanceScore: 0,
  avgResonanceScore: 0,
  mostResonatedPart: null,
  mostResonatedType: null,
}

async function getWrapper(overrides: { marks?: any[] } = {}) {
  const { default: ScarNarrativePanel } = await import('../ScarNarrativePanel.vue')
  return mount(ScarNarrativePanel, {
    props: { marks: overrides.marks ?? marks },
  })
}

describe('ScarNarrativePanel 叙事工坊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplates.value = []
    mockDrafts.value = []
    mockGetPresetTemplates.mockReturnValue([])
    mockGetDraftProgress.mockReturnValue(0)
    mockComputeResonanceStats.mockReturnValue(emptyStats)
  })

  it('标题徽标与副题渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.snp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('叙事工坊')
    expect(wrapper.text()).toContain('模板 · 共鸣 · 可视化')
  })

  it('空态：无印记时显示提示', async () => {
    const wrapper = await getWrapper({ marks: [] })
    expect(wrapper.text()).toContain('工痕尚未开炉')
  })

  it('叙事模板列表渲染', async () => {
    mockGetPresetTemplates.mockReturnValue([template])
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.text()).toContain('英雄之旅')
    expect(wrapper.text()).toContain('以英雄的旅程为框架')
    expect(wrapper.text()).toContain('2 个阶段')
    expect(wrapper.text()).toContain('开始叙事')
  })

  it('开始叙事调用 createDraft 并展示草稿详情', async () => {
    mockGetPresetTemplates.mockReturnValue([template])
    mockTemplates.value = [template]
    mockDrafts.value = [draft]
    mockCreateDraft.mockReturnValue(draft)
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.snp-template-card .snp-btn').trigger('click')
    await nextTick()
    expect(mockCreateDraft).toHaveBeenCalledWith('t1', ['m1', 'm2', 'm3'])
    expect(wrapper.text()).toContain('阶段 1/2')
    expect(wrapper.text()).toContain('平凡世界')
  })

  it('草稿列表渲染名称、阶段、进度与已完成徽标', async () => {
    mockTemplates.value = [template]
    mockDrafts.value = [{ ...draft, completed: true }]
    mockGetDraftProgress.mockReturnValue(100)
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.text()).toContain('英雄之旅')
    expect(wrapper.text()).toContain('第 1 阶段')
    expect(wrapper.text()).toContain('100%')
    expect(wrapper.text()).toContain('已完成')
  })

  it('保存阶段调用 updateDraftStage', async () => {
    mockTemplates.value = [template]
    mockDrafts.value = [draft]
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.snp-draft-item').trigger('click')
    await nextTick()
    const textarea = wrapper.find('.snp-textarea')
    await textarea.setValue('我曾在平凡世界里安然生活')
    await wrapper.findAll('.snp-draft-actions .snp-btn')[0].trigger('click')
    expect(mockUpdateDraftStage).toHaveBeenCalledWith('d1', 1, '我曾在平凡世界里安然生活')
  })

  it('推进阶段调用 advanceStage', async () => {
    mockTemplates.value = [template]
    mockDrafts.value = [draft]
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.snp-draft-item').trigger('click')
    await nextTick()
    await wrapper.findAll('.snp-draft-actions .snp-btn')[1].trigger('click')
    expect(mockAdvanceStage).toHaveBeenCalledWith('d1')
  })

  it('共鸣统计渲染', async () => {
    mockComputeResonanceStats.mockReturnValue({
      totalResonances: 3,
      maxResonanceScore: 85,
      avgResonanceScore: 60,
      mostResonatedPart: 'waist',
      mostResonatedType: 'wear',
    })
    const wrapper = await getWrapper()
    await wrapper.findAll('.snp-tab')[1].trigger('click')
    await nextTick()
    const cells = wrapper.findAll('.snp-cell b')
    expect(cells[0].text()).toBe('3')
    expect(cells[1].text()).toBe('85')
    expect(cells[2].text()).toBe('60')
    expect(cells[3].text()).toBe('腰部')
    expect(cells[4].text()).toBe('磨损')
  })

  it('寻找共鸣调用 findResonanceMatches 并展示匹配', async () => {
    const match = {
      scar: marks[1],
      resonanceScore: 72,
      dimensions: { bodyPartSimilarity: 30, typeSimilarity: 100, severitySimilarity: 80, stageSimilarity: 60 },
      description: '中度共鸣：你们在伤痕的类型和阶段上有相似之处',
    }
    mockFindResonanceMatches.mockReturnValue([match])
    const wrapper = await getWrapper()
    await wrapper.findAll('.snp-tab')[1].trigger('click')
    await nextTick()
    const select = wrapper.find('.snp-select')
    await select.setValue('m1')
    await wrapper.findAll('.snp-resonance-tools .snp-btn')[0].trigger('click')
    await nextTick()
    expect(mockFindResonanceMatches).toHaveBeenCalled()
    expect(wrapper.text()).toContain('72')
    expect(wrapper.text()).toContain('中度共鸣')
    expect(wrapper.text()).toContain('部位 30')
  })

  it('记录共鸣调用 createCommunityResonance 并刷新统计', async () => {
    const match = {
      scar: marks[1],
      resonanceScore: 72,
      dimensions: { bodyPartSimilarity: 30, typeSimilarity: 100, severitySimilarity: 80, stageSimilarity: 60 },
      description: '中度共鸣',
    }
    mockFindResonanceMatches.mockReturnValue([match])
    mockComputeResonanceStats.mockReturnValue({
      totalResonances: 1,
      maxResonanceScore: 0,
      avgResonanceScore: 0,
      mostResonatedPart: null,
      mostResonatedType: null,
    })
    const wrapper = await getWrapper()
    await wrapper.findAll('.snp-tab')[1].trigger('click')
    await nextTick()
    const select = wrapper.find('.snp-select')
    await select.setValue('m1')
    await wrapper.findAll('.snp-resonance-tools .snp-btn')[0].trigger('click')
    await nextTick()
    await wrapper.find('.snp-match .snp-btn').trigger('click')
    await nextTick()
    expect(mockCreateCommunityResonance).toHaveBeenCalledWith('m1', 'm2')
  })

  it('生成可视化调用 generateVisualizationData 并展示区块', async () => {
    const vizData = {
      bodyMap: [{ bodyPart: 'waist', count: 2, avgSeverity: 3.5, avgHealingProgress: 90, latestScarAt: '2026-06-15', scarIds: ['m1'], x: 50, y: 55 }],
      healingTimeline: [{ date: '2026-06-15', healingProgress: 80, scarId: 'm1', label: '久坐腰酸...' }],
      growthCurve: [{ date: '2026-Q2', adversityScore: 70, insightCount: 1, transformationCount: 1 }],
      typeDistribution: [{ type: 'wear', label: '磨损', count: 2, percentage: 67, color: '#6b9fc4', avgHealingTime: 30 }],
      severityRadar: [
        { axis: '平均严重度', value: 3.5, max: 5 },
        { axis: '愈合率', value: 90, max: 100 },
      ],
    }
    mockGenerateVisualizationData.mockReturnValue(vizData)
    const wrapper = await getWrapper()
    await wrapper.findAll('.snp-tab')[2].trigger('click')
    await nextTick()
    await wrapper.find('.snp-tabpane .snp-btn--primary').trigger('click')
    await nextTick()
    expect(mockGenerateVisualizationData).toHaveBeenCalledWith(marks)
    expect(wrapper.text()).toContain('部位分布')
    expect(wrapper.text()).toContain('类型分布')
    expect(wrapper.text()).toContain('严重度雷达')
    expect(wrapper.text()).toContain('愈合时间线')
    expect(wrapper.text()).toContain('成长曲线')
  })

  it('onMounted 调用 loadAll 与 loadResonances', async () => {
    await getWrapper()
    expect(mockLoadAll).toHaveBeenCalled()
    expect(mockLoadResonances).toHaveBeenCalled()
  })
})
