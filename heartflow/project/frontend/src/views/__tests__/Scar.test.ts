// ============================================================
// Scar 视图测试
// 工痕：记录身体印记，支持搜索、部位/严重度筛选、排序
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

type ScarType = 'impact' | 'cut' | 'burn' | 'wear'

interface BodyMark {
  id: string
  bodyPart: string
  severity: number
  description: string
  scarType: ScarType
  at: string
  recordedAt?: string
  healingStage?: string
  healingProgress?: number
  worklogId?: string
}

const healFields = {
  recordedAt: '2026-06-15T08:00:00.000Z',
  healingStage: 'scarred',
  healingProgress: 100,
}

const mockMarks: BodyMark[] = [
  { id: 's1', bodyPart: '腰', severity: 3, description: '久坐腰酸', scarType: 'wear', at: '2026-06-15T08:00:00.000Z', ...healFields },
  { id: 's2', bodyPart: '肩', severity: 4, description: '长时间握鼠标', scarType: 'wear', at: '2026-06-20T10:00:00.000Z', ...healFields },
  { id: 's3', bodyPart: '眼', severity: 5, description: '熬夜写代码眼干', scarType: 'burn', at: '2026-07-10T08:00:00.000Z', ...healFields },
  { id: 's4', bodyPart: '颈', severity: 2, description: '低头看手机', scarType: 'wear', at: '2026-07-18T10:00:00.000Z', ...healFields },
  { id: 's5', bodyPart: '腰', severity: 4, description: '搬东西扭伤', scarType: 'impact', at: '2026-07-22T08:00:00.000Z', ...healFields },
]

const mockKV = new Map<string, any>()
mockKV.set('scars', [...mockMarks])

const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => mockKV.set(key, val))

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
    getConfig: () => ({
      display: {
        trendNoteCount: 20,
        titleTruncateLength: 8,
        excerptTruncateLength: 80,
        tagDisplayCount: 2,
        statsWindowDays: 30,
        searchResultLimit: 10,
        dreamStorageLimit: 100,
        cleanupThresholdDays: 30,
        moveTrajectoryCount: 20,
        healthRecentSleepCount: 14,
        healthRecentExerciseCount: 30,
        healthRecentMealCount: 5,
        noteMaxLength: 100,
      },
      health: {
        exerciseTarget: 150,
        sleepTarget: 7,
        sleepMinThreshold: 6,
        sleepCriticalThreshold: 5,
        sleepExcellentThreshold: 7.5,
      },
      worklog: {
        overtimeRate: 1.5,
        nightRate: 1.3,
        defaultStart: '09:00',
        defaultEnd: '18:00',
        trendDays: 30,
        trendMonths: 6,
        recentShiftLimit: 15,
      },
    }),
  },
}))

async function getWrapper() {
  const { default: Scar } = await import('../Scar.vue')
  return mount(Scar)
}

describe('Scar 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.set('scars', [...mockMarks])
  })

  // ---- 渲染 ----

  it('渲染标题"工痕"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('工痕')
  })

  it('渲染统计概览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('印记总数')
    expect(wrapper.text()).toContain('重度')
    expect(wrapper.text()).toContain('本月新增')
    expect(wrapper.text()).toContain('涉及部位')
  })

  it('有记录时显示印记时间线', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('印记时间线')
    expect(wrapper.text()).toContain('久坐腰酸')
  })

  it('无记录时显示空状态', async () => {
    mockKV.set('scars', [])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('尚无印记')
  })

  // ---- 搜索 ----

  it('存在搜索输入框', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.sc-search-input').exists()).toBe(true)
  })

  it('搜索过滤印记', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.sc-search-input')
    await input.setValue('腰酸')
    expect(wrapper.text()).toContain('久坐腰酸')
    expect(wrapper.text()).not.toContain('握鼠标')
  })

  // ---- 部位筛选 ----

  it('存在部位筛选下拉框', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.sc-filter-select').exists()).toBe(true)
  })

  it('部位筛选只显示匹配部位', async () => {
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('.sc-filter-select')
    const partSelect = selects[0]
    await partSelect.setValue('腰')
    expect(wrapper.text()).toContain('久坐腰酸')
    expect(wrapper.text()).toContain('搬东西扭伤')
    expect(wrapper.text()).not.toContain('握鼠标')
  })

  // ---- 严重度筛选 ----

  it('存在严重度筛选按钮', async () => {
    const wrapper = await getWrapper()
    const sevBtns = wrapper.findAll('.sc-sev-btn')
    expect(sevBtns.length).toBe(4)
  })

  it('严重度筛选"4-5重"只显示重度印记', async () => {
    const wrapper = await getWrapper()
    const sevBtns = wrapper.findAll('.sc-sev-btn')
    // 第4个按钮是"4-5重" (index 3)
    await sevBtns[3].trigger('click')
    expect(wrapper.text()).toContain('握鼠标')
    expect(wrapper.text()).toContain('熬夜写代码')
    expect(wrapper.text()).not.toContain('低头看手机')
  })

  // ---- 排序 ----

  it('存在排序下拉框', async () => {
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('.sc-filter-select')
    expect(selects.length).toBeGreaterThanOrEqual(2) // 部位 + 排序
  })

  it('排序默认值为"最新优先"', async () => {
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('.sc-filter-select')
    const sortSelect = selects[selects.length - 1] as any
    expect(sortSelect.element.value).toBe('date-newest')
  })

  // ---- 痕迹类型 ----

  it('渲染4种痕迹类型按钮', async () => {
    const wrapper = await getWrapper()
    const typeBtns = wrapper.findAll('.sc-type-btn')
    expect(typeBtns.length).toBe(4)
  })

  it('点击痕迹类型按钮后处于激活状态', async () => {
    const wrapper = await getWrapper()
    const typeBtns = wrapper.findAll('.sc-type-btn')
    // 默认第一个(impact)应激活
    expect(typeBtns[0].classes()).toContain('active')
    // 点击第三个(burn)
    await typeBtns[2].trigger('click')
    expect(typeBtns[2].classes()).toContain('active')
    expect(typeBtns[0].classes()).not.toContain('active')
  })

  it('选择痕迹类型后保存记录包含scarType字段', async () => {
    mockKV.set('scars', [])
    const wrapper = await getWrapper()
    // 选择部位
    const select = wrapper.find('.sc-select')
    await select.setValue('手')
    // 选择痕迹类型为 burn
    const typeBtns = wrapper.findAll('.sc-type-btn')
    await typeBtns[2].trigger('click')
    // 填写描述
    const inputs = wrapper.findAll('.sc-input')
    const descInput = inputs[inputs.length - 1]
    await descInput.setValue('烫伤')
    // 保存
    const saveBtn = wrapper.find('.sc-btn--primary')
    await saveBtn.trigger('click')
    // 验证存储包含scarType
    const saved = mockKV.get('scars')
    expect(saved.length).toBe(1)
    expect(saved[0].scarType).toBe('burn')
    expect(saved[0].bodyPart).toBe('手')
  })

  // ---- 痕迹演化状态 ----

  it('根据时间计算痕迹演化状态', async () => {
    const wrapper = await getWrapper()
    // 所有mock数据中，最早的是2026-06-15(>7天前)，最晚的是2026-07-22(>=7天前)
    // 今天2026-07-29，所以s1-s5全部是scarred
    // 排序为"最新优先"，所以s5排在最前面
    const stateEls = wrapper.findAll('.sc-timeline-state')
    // 应该有5条记录的状态标签
    expect(stateEls.length).toBe(5)
    // 第一条(最新)是s5 (2026-07-22, 距今>=7天) 应该是 scarred
    const firstState = stateEls[0]
    expect(firstState.text()).toBe('疤痕')
    expect(firstState.classes()).toContain('sc-state--scarred')
    // 最后一条(最早)是s1 (2026-06-15, 距今>7天) 应该是 scarred
    const lastState = stateEls[stateEls.length - 1]
    expect(lastState.text()).toBe('疤痕')
    expect(lastState.classes()).toContain('sc-state--scarred')
  })

  // ===== C2-6 新增测试 =====

  it('砧板交互元素存在且可点击', async () => {
    const wrapper = await getWrapper()
    const anvil = wrapper.find('.sc-anvil-svg')
    expect(anvil.exists()).toBe(true)
    // 点击砧板
    await anvil.trigger('click')
    // 点击后应触发 strike 动画
    expect(anvil.classes()).toContain('sc-anvil--strike')
    // 等待砧板锻打计时器完成，避免跨用例泄漏
    await new Promise(resolve => setTimeout(resolve, 800))
  })

  it('空状态时显示砧板提示文字', async () => {
    mockKV.set('scars', [])
    const wrapper = await getWrapper()
    const hint = wrapper.find('.sc-anvil-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('点击锻打')
  })

  it('有数据时砧板提示文字隐藏', async () => {
    const wrapper = await getWrapper()
    const hint = wrapper.find('.sc-anvil-hint')
    expect(hint.classes()).toContain('sc-hint--hidden')
  })

  it('点击砧板后创建新印记', async () => {
    const wrapper = await getWrapper()
    const beforeCount = mockKV.get('scars').length
    const anvil = wrapper.find('.sc-anvil-svg')
    await anvil.trigger('click')
    // 等待异步操作（300ms strike + 400ms spark）
    await new Promise(resolve => setTimeout(resolve, 800))
    const afterCount = mockKV.get('scars').length
    expect(afterCount).toBe(beforeCount + 1)
  })

  it('每条印记卡片显示愈合进度条', async () => {
    const wrapper = await getWrapper()
    const healBars = wrapper.findAll('.sc-heal-bar-wrap')
    expect(healBars.length).toBe(5)
  })

  it('所有印记卡片应用演化状态CSS类', async () => {
    const wrapper = await getWrapper()
    const items = wrapper.findAll('.sc-timeline-item')
    expect(items.length).toBe(5)
    // 所有mock数据都是疤痕状态
    items.forEach(item => {
      expect(item.classes()).toContain('sc-tl-state--scarred')
    })
  })

  it('愈合进度百分比正确计算', async () => {
    const wrapper = await getWrapper()
    // 获取生效的愈合进度条
    const healBars = wrapper.findAll('.sc-heal-bar')
    expect(healBars.length).toBe(5)
    // 所有mock数据距今>7天，进度应为100%
    healBars.forEach(bar => {
      const style = bar.attributes('style')
      expect(style).toContain('width: 100%')
    })
  })

  // ============================================================
  // 集成：伤痕可视化面板（INCR-161：补挂载 claim-but-orphan 面板）
  // ============================================================

  it('有印记时集成渲染伤痕可视化面板', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.svp')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('伤痕可视化')
    expect(wrapper.text()).toContain('身体伤痕分布')
    expect(wrapper.text()).toContain('严重度与韧性雷达')
  })

  it('伤痕可视化面板渲染类型分布与愈合时间线', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('伤痕类型分布')
    expect(wrapper.text()).toContain('愈合时间线')
    expect(wrapper.text()).toContain('逆境成长曲线')
  })

  // ============================================================
  // 集成：伤痕因果链面板（INCR-171：补挂载孤儿面板）
  // ============================================================

  it('有印记时集成渲染伤痕因果链面板', async () => {
    const wrapper = await getWrapper()
    const ccp = wrapper.find('.ccp')
    expect(ccp.exists()).toBe(true)
    expect(wrapper.text()).toContain('因果链')
    expect(wrapper.text()).toContain('链路总览')
  })

  it('因果链面板渲染印记选择器并可展开链路时间线', async () => {
    const wrapper = await getWrapper()
    const pickers = wrapper.findAll('.ccp-pick')
    expect(pickers.length).toBeGreaterThan(0)
    await pickers[0].trigger('click')
    expect(wrapper.text()).toContain('链路深度')
  })

  // ============================================================
  // 集成：铸造档案面板（INCR-202：补挂载孤儿面板 ScarArchivePanel）
  // ============================================================

  it('有印记时集成渲染铸造档案面板', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.scap-panel')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('铸造档案')
    // 档案概览 8 格
    expect(wrapper.findAll('.scap-cell').length).toBe(13)
    expect(wrapper.text()).toContain('总印记')
    expect(wrapper.text()).toContain('重度(≥4)')
    expect(wrapper.text()).toContain('平均严重度')
    // 锻造节律 + 铸造健康
    expect(wrapper.text()).toContain('锻造节律')
    expect(wrapper.text()).toContain('铸造健康')
    expect(wrapper.text()).toContain('觉察广度')
    expect(wrapper.text()).toContain('沉淀深度')
    // 温和洞察
    expect(wrapper.findAll('.scap-insight').length).toBeGreaterThan(0)
    // 不渲染空态
    expect(wrapper.find('.hf-empty').exists()).toBe(false)
  })

  it('无印记时渲染空态引导（印记待启）', async () => {
    mockKV.set('scars', [])
    const wrapper = await getWrapper()
    const panel = wrapper.find('.scap-panel')
    expect(panel.exists()).toBe(true)
    expect(wrapper.find('.hf-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('工痕尚未开炉')
    expect(wrapper.text()).toContain('印记待启')
  })

  // ============================================================
  // 集成：伤痕叙事工坊面板（INCR-203：补挂载孤儿面板 ScarNarrativeWorkshopPanel，弃用 ScarNarrativePanel）
  // ============================================================

  it('集成渲染伤痕叙事工坊四个分区', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.snw-panel')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('伤痕叙事工坊')
    // 四个 tab
    const tabs = wrapper.findAll('.snw-tab')
    expect(tabs.length).toBe(4)
    expect(wrapper.text()).toContain('故事')
    expect(wrapper.text()).toContain('社区')
    expect(wrapper.text()).toContain('地图')
    expect(wrapper.text()).toContain('仪式')
  })

  it('故事分区展示统计与空态引导', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('章节')
    expect(wrapper.text()).toContain('还没有故事，写下第一段吧')
  })

  it('有印记时地图分区可生成伤痕地图', async () => {
    const wrapper = await getWrapper()
    // 切到地图 tab
    const tabs = wrapper.findAll('.snw-tab')
    await tabs[2].trigger('click')
    expect(wrapper.text()).toContain('生成伤痕地图')
    const generateBtn = wrapper.find('.snw-btn--primary')
    await generateBtn.trigger('click')
    expect(wrapper.text()).toContain('伤痕总数')
  })

  it('仪式分区展示锻造仪式管理', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.snw-tab')
    await tabs[3].trigger('click')
    expect(wrapper.text()).toContain('锻造仪式')
    expect(wrapper.text()).toContain('月度回顾')
    expect(wrapper.text()).toContain('还没有锻造仪式')
  })
})

// ============================================================
// 集成：愈合预测（INCR-221：薄委托化 + 补挂载孤儿面板 HealingPredictionPanel）
// ============================================================
describe('集成：愈合预测', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.set('scars', [...mockMarks])
  })

  it('空态：无印记时展示引导', async () => {
    mockKV.set('scars', [])
    const wrapper = await getWrapper()
    expect(wrapper.find('.hpp').exists()).toBe(true)
    expect(wrapper.text()).toContain('愈合预测')
    expect(wrapper.text()).toContain('先记录一道工痕')
  })

  it('所有印记均已痊愈时展示暂无在途', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('在途预测')
    expect(wrapper.text()).toContain('暂无在途工痕，所有印记均已痊愈')
  })

  it('存在在途印记时渲染预测卡片（含生长日志基线）', async () => {
    mockKV.set('hf:scar_growth', [
      { id: 'g1', markId: 's1', at: new Date().toISOString(), text: '腰酸缓解', type: 'healing' },
    ])
    mockKV.set('scars', [
      { ...mockMarks[0], at: new Date().toISOString(), healingStage: 'proliferation', healingProgress: 20 },
    ])
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('在途预测')
    const card = wrapper.find('.hpp-card')
    expect(card.exists()).toBe(true)
    expect(wrapper.text()).toContain('置信度')
  })
})