import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  mapSessionsToItems,
  mapNotesToItems,
  mapEmotionsToItems,
  mapAnchorsToItems,
  loadVisualizationSubjects,
  buildDefaultConfig,
  VIZ_SUBJECTS,
  parseNaturalLanguage,
  nlpConfigToSevenDimensionConfig,
} from '../../modules/visualization'
import type { FocusSession, Note, EmotionRecord } from '../../types'
import type { Anchor } from '../../modules/anchor/types'
import VisualizationStudio from '../VisualizationStudio.vue'

describe('studio-data 映射契约（本地 storage → SevenDimensionDataItem）', () => {
  it('专注会话：数值/类别/时间戳映射正确', () => {
    const session: FocusSession = {
      id: 's1',
      status: 'completed',
      mode: 'focus',
      plannedDuration: 25 * 60000,
      elapsed: 20 * 60000,
      startedAt: new Date('2026-01-01T08:00:00Z').toISOString(),
      pausedDuration: 0,
      pausedAt: null,
      completedAt: null,
      tags: ['a'],
      note: '',
      carrierId: null,
    }
    const [item] = mapSessionsToItems([session])
    expect(item.id).toBe('s1')
    expect(item.values.elapsedMin).toBe(20)
    expect(item.values.focusRatio).toBeCloseTo(0.8, 5)
    expect(item.categories.mode).toBe('focus')
    expect(item.timestamp).toBe(Date.parse('2026-01-01T08:00:00Z'))
  })

  it('笔记：过滤软删除且映射标签/优先级', () => {
    const notes: Note[] = [
      { id: 'n1', title: '待办', content: 'x', tags: ['t'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), priority: 'high', deletedAt: null },
      { id: 'n2', title: '已删', content: 'y', tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: new Date().toISOString() },
    ]
    const items = mapNotesToItems(notes)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('n1')
    expect(items[0].categories.priority).toBe('high')
  })

  it('情绪：类别含类型，timestamp 来自 createdAt', () => {
    const e: EmotionRecord = { id: 'e1', type: 'happy', note: '', createdAt: new Date('2026-03-03T10:00:00Z').toISOString() }
    const [item] = mapEmotionsToItems([e])
    expect(item.categories.type).toBe('happy')
    expect(item.timestamp).toBe(Date.parse('2026-03-03T10:00:00Z'))
  })

  it('心锚：done→pending/done 类别、优先级、timestamp 用 targetDate', () => {
    const a: Anchor = {
      id: 'a1', text: '写报告', done: false, targetDate: '2026-02-01',
      createdAt: new Date().toISOString(), priority: 'must', driftCount: 0,
    }
    const [item] = mapAnchorsToItems([a])
    expect(item.categories.done).toBe('pending')
    expect(item.categories.priority).toBe('must')
    expect(item.timestamp).toBe(Date.parse('2026-02-01'))
  })

  it('空输入优雅降级为 []', () => {
    expect(mapSessionsToItems([])).toEqual([])
    expect(mapNotesToItems([])).toEqual([])
    expect(mapEmotionsToItems([])).toEqual([])
    expect(mapAnchorsToItems([])).toEqual([])
  })

  it('loadVisualizationSubjects 返回四个主题键', () => {
    const all = loadVisualizationSubjects()
    expect(Object.keys(all).sort()).toEqual(['anchors', 'emotions', 'notes', 'sessions'])
    expect(Array.isArray(all.sessions)).toBe(true)
  })
})

describe('buildDefaultConfig 默认七维配置', () => {
  it('emotions 使用类别色（按 type 着色）', () => {
    const cfg = buildDefaultConfig('emotions')
    expect((cfg.color as { mode: string }).mode).toBe('category')
    expect(cfg.relation?.mode).toBe('center-outward-radial')
  })

  it('所有主题均使用确定性布局（非 free-scatter）', () => {
    for (const s of VIZ_SUBJECTS) {
      const cfg = buildDefaultConfig(s.key)
      expect(cfg.relation?.mode).not.toBe('free-scatter')
    }
  })
})

describe('自然语言 → 七维配置（数据视觉逻辑语言）', () => {
  it('解析形状/大小/关系并转为配置', () => {
    const parsed = parseNaturalLanguage(
      '用光点表示每个专注会话。会话的专注时长决定光点的大小。所有光点围绕同一圆心排列。',
    )
    expect(parsed.success).toBe(true)
    expect(parsed.shape).toBe('light-point')
    expect(parsed.sizeMappings.length).toBeGreaterThan(0)
    expect(parsed.relation).toBe('around-same-center')

    const cfg = nlpConfigToSevenDimensionConfig(parsed, [])
    expect(cfg.shape).toBeDefined()
    expect(cfg.size).toBeDefined()
    expect(cfg.relation).toBeDefined()
  })

  it('无法识别时 success 为 false 且不抛错', () => {
    const parsed = parseNaturalLanguage('今天天气真好')
    expect(parsed.success).toBe(false)
  })
})

describe('VisualizationStudio 视图', () => {
  it('挂载后渲染 canvas 与四个主题标签，标题正确', () => {
    const wrapper = mount(VisualizationStudio)
    expect(wrapper.find('[data-testid="studio-canvas"]').exists()).toBe(true)
    expect(wrapper.findAll('.studio-tab')).toHaveLength(4)
    expect(wrapper.find('.studio-title').text()).toContain('数据视觉工坊')
  })

  it('主题切换按钮可点击且不抛错（空数据下显示空态提示）', async () => {
    const wrapper = mount(VisualizationStudio)
    const tabs = wrapper.findAll('.studio-tab')
    await tabs[3].trigger('click')
    expect(wrapper.find('[data-testid="tab-anchors"]').attributes('aria-selected')).toBe('true')
  })

  it('自然语言应用按钮可点击且不抛错', async () => {
    const wrapper = mount(VisualizationStudio)
    await wrapper.find('[data-testid="nl-apply"]').trigger('click')
    // 不抛错即通过（jsdom 无 2D 上下文，渲染已降级）
    expect(wrapper.find('[data-testid="nl-hint"]').exists()).toBe(true)
  })
})

describe('集成：数据变换流水线面板（INCR-226：补挂载孤儿面板 TransformPipelinePanel）', () => {
  it('渲染流水线面板（含标题/统计条/内置引导步骤）', () => {
    const wrapper = mount(VisualizationStudio)
    expect(wrapper.find('.tpp').exists()).toBe(true)
    expect(wrapper.text()).toContain('数据变换流水线')
    expect(wrapper.text()).toContain('步骤')
    expect(wrapper.text()).toContain('启用')
    const steps = wrapper.findAll('.tpp-step')
    expect(steps.length).toBe(3) // 内置引导：过滤/排序/截取
    expect(wrapper.text()).toContain('过滤')
    expect(wrapper.text()).toContain('排序')
    expect(wrapper.text()).toContain('截取')
  })

  it('执行变换后输出预览表格与行数提示', async () => {
    const wrapper = mount(VisualizationStudio)
    await wrapper.find('.tpp-run .tpp-btn--primary').trigger('click')
    expect(wrapper.find('.tpp-result').exists()).toBe(true)
    expect(wrapper.find('.tpp-table').exists()).toBe(true)
    expect(wrapper.text()).toContain('输入 7 行 → 输出 5 行')
  })

  it('添加过滤步骤后步骤数增加', async () => {
    const wrapper = mount(VisualizationStudio)
    await wrapper.find('.tpp-chip').trigger('click') // ＋过滤
    expect(wrapper.find('.tpp-form').exists()).toBe(true)
    await wrapper.find('.tpp-form').trigger('submit') // 添加（jsdom 下直接提交表单）
    expect(wrapper.findAll('.tpp-step').length).toBe(4)
  })

  it('清空管线恢复空态', async () => {
    const wrapper = mount(VisualizationStudio)
    const clear = wrapper.findAll('.tpp-run .tpp-btn')[1]
    await clear.trigger('click')
    expect(wrapper.find('.tpp-steps').exists()).toBe(false)
    expect(wrapper.text()).toContain('管线为空')
  })
})
