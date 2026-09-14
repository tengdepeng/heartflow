import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { AnchorJournal, LightThread, YearScaleSummary } from '../../modules/anchor/anchor-journal'
import type { Anchor } from '../../modules/anchor/types'

// ---- 手札引擎 mock（保留真实 JOURNAL_TYPE_LABELS / JOURNAL_TYPE_ICONS） ----
const journals: Ref<AnchorJournal[]> = ref([])

function makeJournal(overrides: Partial<AnchorJournal> = {}): AnchorJournal {
  return {
    id: overrides.id || `j_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    anchorId: overrides.anchorId || 'a1',
    title: overrides.title || '今日复盘',
    content: overrides.content || '内容',
    type: overrides.type || 'diary',
    mood: overrides.mood,
    linkedAnchorIds: overrides.linkedAnchorIds || [],
    createdAt: overrides.createdAt || '2026-09-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-09-01T10:00:00.000Z',
  }
}

const getAll = vi.fn(() => [...journals.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const create = vi.fn((params: {
  anchorId: string
  title: string
  content: string
  type?: AnchorJournal['type']
  mood?: string
  linkedAnchorIds?: string[]
}) => {
  const j = makeJournal({
    anchorId: params.anchorId,
    title: params.title,
    content: params.content,
    type: params.type,
    mood: params.mood,
    linkedAnchorIds: params.linkedAnchorIds,
  })
  journals.value = [...journals.value, j]
  return j
})
const remove = vi.fn((id: string) => {
  journals.value = journals.value.filter(j => j.id !== id)
  return true
})
const load = vi.fn()
const computeLightThreads = vi.fn((_anchors: Anchor[], _journals: AnchorJournal[]): LightThread[] => [])
const getYearScaleSummary = vi.fn((_year: number, _anchors: Anchor[], _journals: AnchorJournal[]): YearScaleSummary => ({
  year: 2026,
  months: [],
  totalAnchors: 0,
  completionRate: 0,
  topTags: [],
  topCategories: [],
}))

vi.mock('../../modules/anchor/anchor-journal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/anchor/anchor-journal')>()
  return {
    ...actual,
    useAnchorJournal: () => ({
      journals,
      load,
      getAll,
      create,
      remove,
      computeLightThreads,
      getYearScaleSummary,
    }),
  }
})

import AnchorJournalPanel from '../AnchorJournalPanel.vue'

function makeAnchor(overrides: Partial<Anchor> = {}): Anchor {
  return {
    id: overrides.id || `a_${Date.now()}`,
    text: overrides.text || '测试锚点',
    done: overrides.done ?? false,
    targetDate: overrides.targetDate || '2026-09-01',
    createdAt: overrides.createdAt || '2026-09-01T00:00:00.000Z',
    priority: overrides.priority || 'can',
    stage: overrides.stage || 'active',
    driftCount: overrides.driftCount ?? 0,
    tags: overrides.tags || [],
    category: overrides.category,
  }
}

beforeEach(() => {
  journals.value = []
  getAll.mockClear()
  create.mockClear()
  remove.mockClear()
  load.mockClear()
  computeLightThreads.mockClear()
  getYearScaleSummary.mockClear()
})

describe('AnchorJournalPanel · 手札档案接线', () => {
  it('空态：标题 + 副题 + 统计 0 + 三处空态提示', async () => {
    const wrapper = mount(AnchorJournalPanel, { props: { anchors: [] } })
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('手札档案')
    expect(text).toContain('日记 · 复盘 · 洞见 · 感恩')
    expect(text).toContain('手札统计')
    expect(text).toContain('总手札')
    expect(text).toContain('暂无手札')
    expect(text).toContain('暂无光丝连接')
    expect(text).toContain('今年暂无锚点数据')
  })

  it('新建手札：选锚点 + 选类型 + 输入内容 → create 接线 + 列表渲染', async () => {
    const anchors = [makeAnchor({ id: 'a1', text: '读书' })]
    const wrapper = mount(AnchorJournalPanel, { props: { anchors } })
    await nextTick()
    // 选锚点
    const select = wrapper.find('.ajp-select')
    await select.setValue('a1')
    // 选类型：复盘
    const reviewChip = wrapper.findAll('.ajp-type-chip').find(b => b.text().includes('复盘'))
    await reviewChip!.trigger('click')
    // 输入内容
    const textarea = wrapper.find('.ajp-textarea')
    await textarea.setValue('今天完成了重要任务')
    const saveBtn = wrapper.findAll('.ajp-btn').find(b => b.text().includes('保存手札'))
    await saveBtn!.trigger('click')
    expect(create).toHaveBeenCalledWith({
      anchorId: 'a1',
      title: '手札',
      content: '今天完成了重要任务',
      type: 'review',
      mood: undefined,
    })
    await nextTick()
    expect(wrapper.text()).toContain('今天完成了重要任务')
  })

  it('新建手札：未选锚点或内容为空时保存按钮禁用', async () => {
    const anchors = [makeAnchor({ id: 'a1', text: '读书' })]
    const wrapper = mount(AnchorJournalPanel, { props: { anchors } })
    await nextTick()
    const saveBtn = wrapper.findAll('.ajp-btn').find(b => b.text().includes('保存手札'))
    expect((saveBtn!.element as HTMLButtonElement).disabled).toBe(true)
    // 选锚点但内容为空
    const select = wrapper.find('.ajp-select')
    await select.setValue('a1')
    await nextTick()
    expect((saveBtn!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('手札列表：渲染类型图标 + 标题 + 内容 + 元信息', async () => {
    journals.value = [
      makeJournal({ id: 'j1', anchorId: 'a1', title: '今日复盘', content: '复盘内容', type: 'review', mood: '平静' }),
      makeJournal({ id: 'j2', anchorId: 'a2', title: '感恩日记', content: '感恩内容', type: 'gratitude' }),
    ]
    const anchors = [
      makeAnchor({ id: 'a1', text: '读书' }),
      makeAnchor({ id: 'a2', text: '跑步' }),
    ]
    const wrapper = mount(AnchorJournalPanel, { props: { anchors } })
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('今日复盘')
    expect(text).toContain('复盘内容')
    expect(text).toContain('复盘')
    expect(text).toContain('读书')
    expect(text).toContain('平静')
    expect(text).toContain('感恩日记')
    expect(text).toContain('跑步')
  })

  it('删除手札：点删除 → remove 接线', async () => {
    journals.value = [makeJournal({ id: 'j1', anchorId: 'a1', title: '待删除', content: '内容' })]
    const wrapper = mount(AnchorJournalPanel, { props: { anchors: [makeAnchor({ id: 'a1', text: '读书' })] } })
    await nextTick()
    const delBtn = wrapper.findAll('.ajp-btn').find(b => b.text().includes('删除'))
    await delBtn!.trigger('click')
    expect(remove).toHaveBeenCalledWith('j1')
  })

  it('统计：按类型计数渲染', async () => {
    journals.value = [
      makeJournal({ id: 'j1', anchorId: 'a1', type: 'diary' }),
      makeJournal({ id: 'j2', anchorId: 'a1', type: 'diary' }),
      makeJournal({ id: 'j3', anchorId: 'a1', type: 'review' }),
      makeJournal({ id: 'j4', anchorId: 'a1', type: 'insight' }),
      makeJournal({ id: 'j5', anchorId: 'a1', type: 'gratitude' }),
    ]
    const wrapper = mount(AnchorJournalPanel, { props: { anchors: [] } })
    await nextTick()
    const values = wrapper.findAll('.ajp-stat-value').map(v => v.text())
    expect(values[0]).toBe('5') // 总手札
    expect(values[1]).toBe('2') // 日记
    expect(values[2]).toBe('1') // 复盘
    expect(values[3]).toBe('2') // 洞见+感恩
  })

  it('光丝连接：渲染强度 + 锚点对 + 原因', async () => {
    computeLightThreads.mockReturnValue([
      { sourceId: 'a1', targetId: 'a2', strength: 0.8, reason: '共享标签: 工作' },
      { sourceId: 'a1', targetId: 'a3', strength: 0.2, reason: '同日锚点' },
    ])
    const anchors = [
      makeAnchor({ id: 'a1', text: '工作A' }),
      makeAnchor({ id: 'a2', text: '工作B' }),
      makeAnchor({ id: 'a3', text: '杂事' }),
    ]
    const wrapper = mount(AnchorJournalPanel, { props: { anchors } })
    await nextTick()
    expect(computeLightThreads).toHaveBeenCalled()
    const text = wrapper.text()
    expect(text).toContain('工作A')
    expect(text).toContain('工作B')
    expect(text).toContain('共享标签: 工作')
    expect(text).toContain('同日锚点')
    const strengths = wrapper.findAll('.ajp-thread-strength')
    expect(strengths[0].text()).toBe('80')
    expect(strengths[1].text()).toBe('20')
  })

  it('年尺度摘要：渲染总锚点 + 完成率 + 高频标签/分类', async () => {
    getYearScaleSummary.mockReturnValue({
      year: 2026,
      months: [],
      totalAnchors: 4,
      completionRate: 75,
      topTags: [{ tag: '工作', count: 3 }, { tag: '学习', count: 1 }],
      topCategories: [{ category: '成长', count: 2 }],
    })
    const wrapper = mount(AnchorJournalPanel, { props: { anchors: [] } })
    await nextTick()
    expect(getYearScaleSummary).toHaveBeenCalled()
    const text = wrapper.text()
    expect(text).toContain('总锚点 4')
    expect(text).toContain('完成率 75%')
    expect(text).toContain('工作 ×3')
    expect(text).toContain('学习 ×1')
    expect(text).toContain('成长 ×2')
  })
})
