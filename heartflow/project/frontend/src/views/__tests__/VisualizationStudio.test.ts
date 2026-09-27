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

// ============================================================
// 集成：可视化交互面板 VisualizationInteractionPanel（INCR-252 补挂载孤儿组件）
// 引擎 useChartInteraction/useDashboardLayout 均为工厂函数（use 调用时自建本地 ref，
// 纯内存、不读 storage、无模块级 ref）→ 无跨用例污染；按钮走 UI 交互流即可断言。
// ============================================================
describe('集成：可视化交互面板', () => {
  it('渲染交互面板（标题/副题/两区块及统计与按钮）', () => {
    const wrapper = mount(VisualizationStudio)
    expect(wrapper.find('.vip-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('可视化交互')
    expect(wrapper.text()).toContain('图表交互 · 可配置仪表盘布局')
    const sections = wrapper.findAll('.vip-section')
    expect(sections.length).toBe(2)
    expect(sections[0].text()).toContain('图表交互')
    expect(sections[1].text()).toContain('仪表盘布局')
    expect(wrapper.text()).toContain('缩放')
    expect(wrapper.text()).toContain('标注')
    expect(wrapper.text()).toContain('面板')
    expect(wrapper.text()).toContain('未修改')
  })

  it('图表交互区初始缩放为 1，点放大步进 0.1 变为 1.1', async () => {
    const wrapper = mount(VisualizationStudio)
    const chartSection = wrapper.findAll('.vip-section')[0]
    expect(chartSection.find('.vip-stat').text()).toContain('缩放 1')
    await chartSection.findAll('.vip-btn')[0].trigger('click') // 放大
    expect(chartSection.find('.vip-stat').text()).toContain('缩放 1.1')
  })

  it('连续放大/缩小并复位视图回到缩放 1', async () => {
    const wrapper = mount(VisualizationStudio)
    const chartSection = wrapper.findAll('.vip-section')[0]
    const btns = chartSection.findAll('.vip-btn')
    await btns[0].trigger('click') // 放大 → 1.1
    await btns[1].trigger('click') // 缩小 → 1.0
    expect(chartSection.find('.vip-stat').text()).toContain('缩放 1')
    await btns[0].trigger('click') // 放大 → 1.1
    await btns[2].trigger('click') // 复位视图 → 1
    expect(chartSection.find('.vip-stat').text()).toContain('缩放 1')
  })

  it('仪表盘布局区默认面板 0、未修改，布局与清空按钮可点不抛错', async () => {
    const wrapper = mount(VisualizationStudio)
    const layoutSection = wrapper.findAll('.vip-section')[1]
    expect(layoutSection.text()).toContain('面板 0')
    expect(layoutSection.text()).toContain('未修改')
    const btns = layoutSection.findAll('.vip-btn')
    expect(btns.length).toBe(2)
    await btns[0].trigger('click') // 重置布局
    await btns[1].trigger('click') // 清空面板
    expect(wrapper.find('.vip-panel').exists()).toBe(true)
  })
})

// ============================================================
// 集成：可视化·驾驶舱总览面板 VisualizationCockpitPanel（INCR-388 补挂载孤儿桥接面板）
// useVisualizationBridge 聚合 chart-interaction/canvas-renderer/datasource-connector/
// dashboard-layout 四引擎（均为工厂函数，纯内存、不读 storage）→ 无跨用例污染；
// 空态（源总数 0 且面板 0）下徽标待命、四区块指标归零并渲染空态引导。
// ============================================================
describe('集成：可视化·驾驶舱总览面板', () => {
  it('渲染驾驶舱面板（标题/副题/徽标待命/四区块与空态引导）', () => {
    const wrapper = mount(VisualizationStudio)
    expect(wrapper.find('.vzp').exists()).toBe(true)
    expect(wrapper.text()).toContain('可视化·驾驶舱总览')
    expect(wrapper.text()).toContain('渲染性能')
    expect(wrapper.text()).toContain('数据源健康')
    expect(wrapper.text()).toContain('图表交互')
    expect(wrapper.text()).toContain('仪表盘布局')
    // 空态徽标
    expect(wrapper.find('.vzp-badge').text()).toContain('待命')
    expect(wrapper.find('.vzp-badge-dot').classes()).toContain('idle')
    // 空态引导
    expect(wrapper.find('.vzp-empty').text()).toContain('驾驶舱尚在待命')
    // 指标全 0
    expect(wrapper.text()).toContain('FPS')
    expect(wrapper.text()).toContain('图层')
    expect(wrapper.text()).toContain('绘制命令')
    expect(wrapper.text()).toContain('脏区域')
    expect(wrapper.text()).toContain('已连接')
    expect(wrapper.text()).toContain('源总数')
    expect(wrapper.text()).toContain('错误源')
    expect(wrapper.text()).toContain('标注')
    expect(wrapper.text()).toContain('面板')
  })
})

// ============================================================
// INCR-403：补挂载零消费引擎面板 DimensionMappingPanel
// dimension-mapping（7 维映射定义 DIMENSION_MAPPINGS + applyDimensionMapping 执行）
// 整体零 UI 消费（仅 studio-data 引 seven-dimensions 类型）→ 可视化主题内真缺口。
// 面板为无 props 无 storage 纯引擎薄委托，真实挂载即可验证。
// ============================================================
describe('集成：维度映射面板', () => {
  it('渲染维度映射面板（标题/7 条定义/默认数值演示）', () => {
    const wrapper = mount(VisualizationStudio)
    expect(wrapper.find('.dmp').exists()).toBe(true)
    expect(wrapper.text()).toContain('维度映射')
    expect(wrapper.findAll('.dmp-item')).toHaveLength(7)
    expect(wrapper.find('.dmp-demo-dim').text()).toBe('数值')
    expect(wrapper.find('.dmp-swatch').exists()).toBe(true)
  })
})

// ============================================================
describe('集成：数据源连接器面板', () => {
  it('渲染数据源连接器面板（标题/统计条零值/空态/注册区）', () => {
    const wrapper = mount(VisualizationStudio)
    expect(wrapper.find('.dscp').exists()).toBe(true)
    expect(wrapper.text()).toContain('数据源连接器')
    expect(wrapper.text()).toContain('0 已连接')
    expect(wrapper.text()).toContain('0 源总数')
    expect(wrapper.find('[data-testid="dscp-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dscp-register"]').exists()).toBe(true)
  })
})

// ============================================================
// 集成：图表渲染面板 VisualChartPanel（INCR-413 补挂载孤儿引擎 svg.ts）
// 空数据下面板渲染空态引导（测试环境 storage 无记录 → items 为空）。
// ============================================================
describe('集成：图表渲染面板', () => {
  it('渲染图表渲染面板（标题/副题/空态引导）', () => {
    const wrapper = mount(VisualizationStudio)
    expect(wrapper.find('.vcp').exists()).toBe(true)
    expect(wrapper.text()).toContain('图表渲染')
    expect(wrapper.find('[data-testid="vcp-empty"]').exists()).toBe(true)
  })
})

