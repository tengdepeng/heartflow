// ============================================================
// RoomTemplatesPanel 房间模板面板测试（INCR-100）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockTemplates = ref<any[]>([
  {
    id: 'tmpl-deep-work',
    name: '深度工作',
    description: '专注工作场景',
    type: 'combo',
    category: 'work',
    roomIds: ['worklog', 'scar', 'career'],
    layoutId: 'grid-default',
    tags: ['工作', '专注'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 3,
    icon: '💼',
    color: '#6b9fc4',
  },
  {
    id: 'tmpl_custom_1',
    name: '我的模板',
    description: '自定义',
    type: 'combo',
    category: 'custom',
    roomIds: [],
    layoutId: 'grid-default',
    tags: [],
    builtIn: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    useCount: 0,
    icon: '📦',
    color: '#6b9fc4',
  },
])

const mockLayouts = ref<any[]>([
  {
    layoutId: 'grid-default',
    name: '标准网格',
    description: '等间距网格布局',
    type: 'grid',
    columns: 3,
    gap: 16,
    padding: 24,
    showTitle: true,
    showIcon: true,
    cardSize: 'medium',
  },
])

const mockScenes = ref<any[]>([])

const mockActiveTemplateId = ref<string | null>(null)

const mockTemplateStats = computed(() => ({
  total: mockTemplates.value.length,
  builtIn: mockTemplates.value.filter(t => t.builtIn).length,
  custom: mockTemplates.value.filter(t => !t.builtIn).length,
  totalUses: mockTemplates.value.reduce((sum, t) => sum + t.useCount, 0),
  mostUsed: [],
}))

const mockSearchTemplates = vi.fn((query: string) => {
  if (!query.trim()) return mockTemplates.value
  const lower = query.toLowerCase()
  return mockTemplates.value.filter(t =>
    t.name.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.tags.some((tag: string) => tag.toLowerCase().includes(lower)),
  )
})
const mockCreateTemplate = vi.fn()
const mockCloneBuiltInTemplate = vi.fn()
const mockDeleteTemplate = vi.fn()
const mockApplyTemplate = vi.fn()
const mockGetAllLayouts = vi.fn(() => mockLayouts.value)
const mockCreateLayout = vi.fn()
const mockDeleteLayout = vi.fn()
const mockCreateScene = vi.fn()
const mockDeleteScene = vi.fn()
const mockExportTemplate = vi.fn()

vi.mock('../../modules/space/room-templates', () => ({
  CATEGORY_LABELS: {
    focus: '专注', relax: '放松', work: '工作', learn: '学习', social: '社交',
    health: '健康', creative: '创意', review: '回顾', custom: '自定义',
  },
  useRoomTemplates: () => ({
    templates: mockTemplates,
    layouts: mockLayouts,
    scenes: mockScenes,
    activeTemplateId: mockActiveTemplateId,
    templateStats: mockTemplateStats,
    searchTemplates: mockSearchTemplates,
    createTemplate: mockCreateTemplate,
    cloneBuiltInTemplate: mockCloneBuiltInTemplate,
    deleteTemplate: mockDeleteTemplate,
    applyTemplate: mockApplyTemplate,
    getAllLayouts: mockGetAllLayouts,
    createLayout: mockCreateLayout,
    deleteLayout: mockDeleteLayout,
    createScene: mockCreateScene,
    deleteScene: mockDeleteScene,
    exportTemplate: mockExportTemplate,
  }),
}))

import RoomTemplatesPanel from '../RoomTemplatesPanel.vue'

async function mountPanel() {
  const wrapper = mount(RoomTemplatesPanel)
  await nextTick()
  return wrapper
}

describe('RoomTemplatesPanel 房间模板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplates.value = [
      {
        id: 'tmpl-deep-work',
        name: '深度工作',
        description: '专注工作场景',
        type: 'combo',
        category: 'work',
        roomIds: ['worklog', 'scar', 'career'],
        layoutId: 'grid-default',
        tags: ['工作', '专注'],
        builtIn: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        useCount: 3,
        icon: '💼',
        color: '#6b9fc4',
      },
      {
        id: 'tmpl_custom_1',
        name: '我的模板',
        description: '自定义',
        type: 'combo',
        category: 'custom',
        roomIds: [],
        layoutId: 'grid-default',
        tags: [],
        builtIn: false,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        useCount: 0,
        icon: '📦',
        color: '#6b9fc4',
      },
    ]
    mockLayouts.value = [
      {
        layoutId: 'grid-default',
        name: '标准网格',
        description: '等间距网格布局',
        type: 'grid',
        columns: 3,
        gap: 16,
        padding: 24,
        showTitle: true,
        showIcon: true,
        cardSize: 'medium',
      },
    ]
    mockScenes.value = []
    mockActiveTemplateId.value = null
  })

  it('渲染模板统计与模板列表', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.rtp').exists()).toBe(true)
    expect(wrapper.text()).toContain('房间模板')
    // 统计
    expect(wrapper.find('.rtp-stat-value').text()).toBe('2')
    // 模板列表
    expect(wrapper.findAll('.rtp-tpl').length).toBe(2)
    expect(wrapper.text()).toContain('深度工作')
    expect(wrapper.text()).toContain('我的模板')
    expect(wrapper.text()).toContain('内置')
  })

  it('搜索过滤模板', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('.rtp-input--grow')
    await input.setValue('深度')
    await nextTick()
    expect(mockSearchTemplates).toHaveBeenCalledWith('深度')
    expect(wrapper.findAll('.rtp-tpl').length).toBe(1)
    expect(wrapper.text()).toContain('深度工作')
    expect(wrapper.text()).not.toContain('我的模板')
  })

  it('新建模板弹窗保存调用 createTemplate', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.rtp-actions .rtp-btn').trigger('click')
    expect(wrapper.find('.rtp-mask').exists()).toBe(true)
    await wrapper.find('.rtp-field input').setValue('晚间专注')
    await wrapper.find('.rtp-modal-foot .rtp-btn:not(.rtp-btn--ghost)').trigger('click')
    expect(mockCreateTemplate).toHaveBeenCalledWith('晚间专注', {
      category: 'custom',
      icon: '📦',
    })
    expect(wrapper.find('.rtp-mask').exists()).toBe(false)
  })

  it('应用模板调用 applyTemplate', async () => {
    const wrapper = await mountPanel()
    const applyBtn = wrapper.findAll('.rtp-tpl-actions .rtp-btn--small')[0]
    await applyBtn.trigger('click')
    expect(mockApplyTemplate).toHaveBeenCalledWith('tmpl-deep-work')
  })

  it('克隆内置模板调用 cloneBuiltInTemplate', async () => {
    const wrapper = await mountPanel()
    const cloneBtn = wrapper.findAll('.rtp-tpl-actions .rtp-btn--small')[1]
    await cloneBtn.trigger('click')
    expect(mockCloneBuiltInTemplate).toHaveBeenCalledWith('tmpl-deep-work')
  })

  it('删除自定义模板调用 deleteTemplate，内置模板删除按钮禁用', async () => {
    const wrapper = await mountPanel()
    const tpls = wrapper.findAll('.rtp-tpl')
    // 内置模板删除按钮禁用
    expect(tpls[0].find('.rtp-btn--danger').attributes('disabled')).toBeDefined()
    // 自定义模板可删除
    const delBtn = tpls[1].find('.rtp-btn--danger')
    expect(delBtn.attributes('disabled')).toBeUndefined()
    await delBtn.trigger('click')
    expect(mockDeleteTemplate).toHaveBeenCalledWith('tmpl_custom_1')
  })

  it('导出模板调用 exportTemplate', async () => {
    const wrapper = await mountPanel()
    const exportBtn = wrapper.findAll('.rtp-tpl-actions .rtp-btn--small')[2]
    await exportBtn.trigger('click')
    expect(mockExportTemplate).toHaveBeenCalledWith('tmpl-deep-work')
  })

  it('布局 tab 展示布局列表并支持新建', async () => {
    const wrapper = await mountPanel()
    const tabs = wrapper.findAll('.rtp-tab')
    await tabs[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('标准网格')
    expect(wrapper.text()).toContain('3 列')

    await wrapper.find('.rtp-actions .rtp-btn').trigger('click')
    await wrapper.find('.rtp-field input').setValue('三列网格')
    await wrapper.find('.rtp-modal-foot .rtp-btn:not(.rtp-btn--ghost)').trigger('click')
    expect(mockCreateLayout).toHaveBeenCalledWith('三列网格', { type: 'grid', columns: 3 })
  })

  it('场景 tab 展示场景并支持新建', async () => {
    const wrapper = await mountPanel()
    const tabs = wrapper.findAll('.rtp-tab')
    await tabs[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('暂无场景')

    await wrapper.find('.rtp-actions .rtp-btn').trigger('click')
    await wrapper.find('.rtp-field input').setValue('深夜书房')
    await wrapper.find('.rtp-modal-foot .rtp-btn:not(.rtp-btn--ghost)').trigger('click')
    expect(mockCreateScene).toHaveBeenCalledWith('深夜书房', { description: '' })
  })

  it('活跃模板高亮', async () => {
    mockActiveTemplateId.value = 'tmpl-deep-work'
    const wrapper = await mountPanel()
    const active = wrapper.find('.rtp-tpl.active')
    expect(active.exists()).toBe(true)
    expect(active.text()).toContain('活跃')
  })
})
