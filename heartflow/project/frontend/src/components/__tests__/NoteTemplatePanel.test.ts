// ============================================================
// NoteTemplatePanel 笔记模板面板测试（INCR-106）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

const mockTemplates = ref<any[]>([])

const mockGetTemplates = vi.fn()
const mockGetFieldDefaults = vi.fn()
const mockPreviewTemplate = vi.fn()
const mockCreateFromTemplate = vi.fn()
const mockSaveFromNote = vi.fn()
const mockDeleteTemplate = vi.fn()

vi.mock('../../modules/note/note-templates', () => ({
  useNoteTemplates: () => ({
    templates: mockTemplates,
    getTemplates: mockGetTemplates,
    getTemplatesByCategory: vi.fn(),
    getTemplateCategories: vi.fn(),
    getTemplateById: vi.fn(),
    searchTemplates: vi.fn(),
    createFromTemplate: mockCreateFromTemplate,
    createNoteFromTemplate: vi.fn(),
    saveAsTemplate: vi.fn(),
    saveFromNote: mockSaveFromNote,
    updateTemplate: vi.fn(),
    deleteTemplate: mockDeleteTemplate,
    previewTemplate: mockPreviewTemplate,
    duplicateBuiltinTemplate: vi.fn(),
    getTemplateStats: vi.fn(),
    getFieldDefaults: mockGetFieldDefaults,
    validateFieldValues: vi.fn(),
  }),
  TEMPLATE_CATEGORY_LABELS: {
    work: '工作',
    journal: '日记',
    planning: '规划',
    reading: '阅读',
    creativity: '创意',
    review: '回顾',
    goals: '目标',
    learning: '学习',
  },
  TEMPLATE_CATEGORY_ICONS: {
    work: 'briefcase',
    journal: 'book',
    planning: 'calendar',
    reading: 'book-open',
    creativity: 'lightbulb',
    review: 'refresh',
    goals: 'target',
    learning: 'graduation-cap',
  },
}))

const meetingTemplate = {
  id: 'builtin:meeting-notes',
  name: '会议笔记',
  description: '结构化会议记录模板',
  category: 'work',
  icon: 'users',
  defaultTags: ['会议', '工作'],
  fields: [
    { key: 'meetingTopic', label: '会议主题', type: 'text', placeholder: '请输入会议主题', required: true, order: 1 },
    { key: 'attendees', label: '参会人员', type: 'text', placeholder: '张三、李四', required: false, order: 2 },
    { key: 'agenda', label: '议程', type: 'textarea', placeholder: '- 议题一', required: false, order: 3 },
    { key: 'meetingDate', label: '会议日期', type: 'date', required: true, order: 4 },
  ],
  contentTemplate: '# {{meetingTopic}}\n\n参会：{{attendees}}\n\n{{agenda}}',
  titleTemplate: '{{meetingTopic}} 会议纪要',
  builtin: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  useCount: 0,
}

const journalTemplate = {
  id: 'builtin:daily-journal',
  name: '每日日记',
  description: '记录每日心情与思考',
  category: 'journal',
  icon: 'book',
  defaultTags: ['日记'],
  fields: [
    { key: 'mood', label: '今日心情', type: 'select', options: ['平静', '愉悦', '低落'], required: false, order: 1 },
  ],
  contentTemplate: '今天的心情：{{mood}}',
  titleTemplate: '日记 {{date}}',
  builtin: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  useCount: 0,
}

const customTemplate = {
  id: 'custom:abc',
  name: '我的模板',
  description: '自定义模板',
  category: 'work',
  icon: 'file',
  defaultTags: ['自定义'],
  fields: [],
  contentTemplate: '内容',
  titleTemplate: '标题',
  builtin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  useCount: 0,
}

const notes = [
  { id: 'n1', title: '测试笔记', content: '这是一条测试笔记的内容', tags: ['vue'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
]

async function getWrapper(overrides: { notes?: any[] } = {}) {
  const { default: NoteTemplatePanel } = await import('../NoteTemplatePanel.vue')
  return mount(NoteTemplatePanel, {
    props: { notes: overrides.notes ?? notes },
  })
}

describe('NoteTemplatePanel 笔记模板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplates.value = []
    mockGetTemplates.mockReturnValue([])
    mockGetFieldDefaults.mockReturnValue({})
  })

  it('标题徽标与副题渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ntp').exists()).toBe(true)
    expect(wrapper.text()).toContain('笔记模板')
    expect(wrapper.text()).toContain('模板库 · 从模板创建 · 自定义')
  })

  it('模板库渲染内置模板卡', async () => {
    mockGetTemplates.mockReturnValue([meetingTemplate, journalTemplate])
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.text()).toContain('会议笔记')
    expect(wrapper.text()).toContain('结构化会议记录模板')
    expect(wrapper.text()).toContain('工作 · 使用 0 次')
    expect(wrapper.text()).toContain('每日日记')
    expect(wrapper.findAll('.ntp-card .ntp-btn').length).toBe(2)
  })

  it('分类筛选只显示对应分类模板', async () => {
    mockGetTemplates.mockReturnValue([meetingTemplate, journalTemplate])
    const wrapper = await getWrapper()
    await nextTick()
    const chips = wrapper.findAll('.ntp-chip')
    await chips[2].trigger('click') // 日记
    await nextTick()
    expect(wrapper.text()).toContain('每日日记')
    expect(wrapper.text()).not.toContain('会议笔记')
  })

  it('搜索过滤模板', async () => {
    mockGetTemplates.mockReturnValue([meetingTemplate, journalTemplate])
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.ntp-search').setValue('日记')
    await nextTick()
    expect(wrapper.text()).toContain('每日日记')
    expect(wrapper.text()).not.toContain('会议笔记')
  })

  it('使用模板切换到创建页并渲染字段', async () => {
    mockGetTemplates.mockReturnValue([meetingTemplate])
    mockGetFieldDefaults.mockReturnValue({})
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.ntp-card .ntp-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('会议主题')
    expect(wrapper.text()).toContain('参会人员')
    expect(wrapper.text()).toContain('会议日期')
    expect(wrapper.text()).toContain('创建笔记')
  })

  it('预览调用 previewTemplate 并展示结果', async () => {
    mockGetTemplates.mockReturnValue([meetingTemplate])
    mockGetFieldDefaults.mockReturnValue({})
    mockPreviewTemplate.mockReturnValue({
      template: meetingTemplate,
      previewTitle: '产品评审 会议纪要',
      previewContent: '# 产品评审',
      previewTags: ['会议', '工作'],
    })
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.ntp-card .ntp-btn').trigger('click')
    await nextTick()
    await wrapper.findAll('.ntp-actions .ntp-btn')[1].trigger('click')
    await nextTick()
    expect(mockPreviewTemplate).toHaveBeenCalled()
    expect(wrapper.text()).toContain('产品评审 会议纪要')
    expect(wrapper.text()).toContain('#会议 #工作')
  })

  it('创建笔记调用 createFromTemplate 并 emit create-note', async () => {
    mockGetTemplates.mockReturnValue([meetingTemplate])
    mockGetFieldDefaults.mockReturnValue({})
    mockCreateFromTemplate.mockReturnValue({
      title: '产品评审 会议纪要',
      content: '# 产品评审\n\n参会：\n\n',
      tags: ['会议', '工作'],
    })
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.find('.ntp-card .ntp-btn').trigger('click')
    await nextTick()
    await wrapper.find('.ntp-input').setValue('产品评审')
    await wrapper.find('.ntp-btn--primary').trigger('click')
    await nextTick()
    expect(mockCreateFromTemplate).toHaveBeenCalled()
    const emitted = wrapper.emitted('create-note')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({
      title: '产品评审 会议纪要',
      content: '# 产品评审\n\n参会：\n\n',
      tags: ['会议', '工作'],
    })
  })

  it('从笔记创建模板调用 saveFromNote', async () => {
    mockGetTemplates.mockReturnValue([])
    const wrapper = await getWrapper()
    await wrapper.findAll('.ntp-tab')[2].trigger('click')
    await nextTick()
    await wrapper.find('.ntp-note-select').setValue('n1')
    await wrapper.find('.ntp-custom-name').setValue('我的模板')
    await wrapper.find('.ntp-custom-desc').setValue('自定义描述')
    await wrapper.find('.ntp-save-btn').trigger('click')
    expect(mockSaveFromNote).toHaveBeenCalledWith(
      notes[0],
      '我的模板',
      '自定义描述',
      'work',
    )
  })

  it('未选笔记或未填名称时保存按钮禁用', async () => {
    mockGetTemplates.mockReturnValue([])
    const wrapper = await getWrapper()
    await wrapper.findAll('.ntp-tab')[2].trigger('click')
    await nextTick()
    const btn = wrapper.find('.ntp-save-btn')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('自定义模板列表渲染并可删除', async () => {
    mockGetTemplates.mockReturnValue([customTemplate])
    const wrapper = await getWrapper()
    await wrapper.findAll('.ntp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('我的模板')
    expect(wrapper.text()).toContain('自定义模板')
    await wrapper.find('.ntp-card .ntp-btn--danger').trigger('click')
    expect(mockDeleteTemplate).toHaveBeenCalledWith('custom:abc')
  })

  it('无自定义模板时显示空提示', async () => {
    mockGetTemplates.mockReturnValue([])
    const wrapper = await getWrapper()
    await wrapper.findAll('.ntp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('还没有自定义模板')
  })
})
