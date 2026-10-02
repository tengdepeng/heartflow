// ============================================================
// WorkLog 更漏工时管理视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => mockGetKV(args[0], args[1]),
    setKV: (...args: any[]) => mockSetKV(args[0], args[1]),
  },
}))

async function getWrapper() {
  const { default: WorkLog } = await import('../WorkLog.vue')
  return mount(WorkLog, {
    global: {
      stubs: {
        ProductivityPanel: true,
        WorkRhythmPanel: true,
      },
    },
  })
}

function makeShift(overrides: Record<string, any> = {}) {
  const id = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    type: 'regular' as const,
    date: new Date().toISOString().slice(0, 10),
    start: '09:00',
    end: '18:00',
    hours: 9,
    note: undefined,
    ...overrides,
  }
}

describe('WorkLog 更漏工时管理', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['heartflow:shifts'] = []
    mockStore['heartflow:hourly_rate'] = 0
  })

  // ============================================================
  // 1. 渲染头部标题和装饰
  // ============================================================
  it('渲染头部标题和装饰', async () => {
    const wrapper = await getWrapper()

    // ⚠️ 页头已统一到 RoomLayout → RoomHeader，类名随之前缀为 rh-*；
    //    旧的 .wl-title / .header-kicker / .header-ornament / .orn-line / .orn-diamond 已不存在。
    const title = wrapper.find('.rh-title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('更漏')

    const kicker = wrapper.find('.rh-kicker')
    expect(kicker.exists()).toBe(true)
    expect(kicker.text()).toContain('记录工作的时间与价值')

    const ornament = wrapper.find('.rh-ornament')
    expect(ornament.exists()).toBe(true)
    expect(ornament.find('.rh-orn-line').exists()).toBe(true)
    expect(ornament.find('.rh-orn-diamond').exists()).toBe(true)
  })

  // ============================================================
  // 2. 渲染统计概览（总班次、总工时、本月工时）
  // ============================================================
  it('渲染统计概览（总班次、总工时、本月工时）', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: today, hours: 8 }),
      makeShift({ id: 's2', date: today, hours: 9 }),
      makeShift({ id: 's3', date: today, hours: 7 }),
    ]

    const wrapper = await getWrapper()
    const statCards = wrapper.findAll('.wl-stat-card')

    expect(statCards.length).toBe(3)
    // 总班次: 3
    expect(statCards[0].text()).toContain('3')
    expect(statCards[0].text()).toContain('总班次')
    // 总工时: 8+9+7 = 24h
    expect(statCards[1].text()).toContain('24h')
    expect(statCards[1].text()).toContain('总工时')
    // 本月工时（同一天）: 24h
    expect(statCards[2].text()).toContain('24h')
    expect(statCards[2].text()).toContain('本月工时')
  })

  // ============================================================
  // 3. 渲染快速记录表单（日期、类型、时间输入）
  // ============================================================
  it('渲染快速记录表单（日期、类型、时间输入）', async () => {
    const wrapper = await getWrapper()

    const quickRecord = wrapper.find('.wl-quick-record')
    expect(quickRecord.exists()).toBe(true)

    // 日期输入
    expect(wrapper.find('.wl-date').exists()).toBe(true)

    // 类型选择
    const select = wrapper.find('.wl-select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    expect(options.length).toBe(3)
    expect(options[0].text()).toContain('常规班次')
    expect(options[1].text()).toContain('夜班')
    expect(options[2].text()).toContain('加班')

    // 时间输入（开始和结束共2个）
    const timeInputs = wrapper.findAll('.wl-time')
    expect(timeInputs.length).toBe(2)

    // 备注输入
    expect(wrapper.find('.wl-note-input').exists()).toBe(true)

    // 记录按钮
    const recordBtn = wrapper.find('.wl-btn')
    expect(recordBtn.exists()).toBe(true)
    expect(recordBtn.text()).toContain('记录')
  })

  // ============================================================
  // 4. 快速记录表单验证通过
  // ============================================================
  it('快速记录表单验证通过', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('.wl-btn')

    // 默认表单: start=09:00, end=18:00 → calcHours=9 → 有效
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)

    // 清空时间 → 无效
    const timeInputs = wrapper.findAll('.wl-time')
    await timeInputs[0].setValue('')
    await timeInputs[1].setValue('')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)

    // 恢复有效时间 → 再次有效
    await timeInputs[0].setValue('09:00')
    await timeInputs[1].setValue('18:00')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  // ============================================================
  // 5. 添加班次记录
  // ============================================================
  it('添加班次记录', async () => {
    const wrapper = await getWrapper()
    const dateInput = wrapper.find('.wl-date')
    const select = wrapper.find('.wl-select')
    const timeInputs = wrapper.findAll('.wl-time')
    const btn = wrapper.find('.wl-btn')

    // 设置表单: 加班 18:00-21:00
    await dateInput.setValue('2026-07-27')
    await select.setValue('overtime')
    await timeInputs[0].setValue('18:00')
    await timeInputs[1].setValue('21:00')
    await btn.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证 setKV 被调用
    expect(mockSetKV).toHaveBeenCalled()

    // 验证 shifts 被保存到 storage
    const savedShiftsCall = mockSetKV.mock.calls.find(
      (c: any[]) => c[0] === 'heartflow:shifts',
    )
    expect(savedShiftsCall).toBeDefined()
    const savedShifts = savedShiftsCall![1] as any[]
    expect(savedShifts.length).toBe(1)
    expect(savedShifts[0].type).toBe('overtime')
    expect(savedShifts[0].hours).toBe(3)
    expect(savedShifts[0].date).toBe('2026-07-27')
    expect(savedShifts[0].start).toBe('18:00')
    expect(savedShifts[0].end).toBe('21:00')

    // 验证列表中显示新记录
    expect(wrapper.text()).toContain('21:00')
    expect(wrapper.text()).toContain('3h')
  })

  // ============================================================
  // 6. 渲染班次记录列表
  // ============================================================
  it('渲染班次记录列表', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: today, hours: 8, type: 'regular' }),
      makeShift({ id: 's2', date: today, hours: 9.5, type: 'night' }),
      makeShift({ id: 's3', date: today, hours: 3, type: 'overtime', note: '紧急任务' }),
    ]

    const wrapper = await getWrapper()
    const items = wrapper.findAll('.wl-shift-item')

    expect(items.length).toBe(3)
    expect(wrapper.text()).toContain('8h')
    expect(wrapper.text()).toContain('9.5h')
    expect(wrapper.text()).toContain('3h')
    expect(wrapper.find('.wl-shift-note[title="紧急任务"]').exists()).toBe(true)
  })

  // ============================================================
  // 7. 日期范围筛选
  // ============================================================
  it('日期范围筛选', async () => {
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: '2026-06-01', hours: 8 }),
      makeShift({ id: 's2', date: '2026-07-15', hours: 9 }),
      makeShift({ id: 's3', date: '2026-08-01', hours: 7 }),
    ]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 筛选栏应该存在（shifts.length > 0）
    expect(wrapper.find('.wl-filter-section').exists()).toBe(true)

    // 设置日期范围: 2026-06-15 ~ 2026-07-31
    const filterDates = wrapper.findAll('.wl-filter-date')
    await filterDates[0].setValue('2026-06-15')
    await filterDates[1].setValue('2026-07-31')
    await wrapper.vm.$nextTick()

    // 只有 s2 (2026-07-15) 在范围内
    expect(wrapper.text()).toContain('9h')

    // 记录列表内只显示过滤后的班次
    const shiftItems = wrapper.findAll('.wl-shift-item')
    expect(shiftItems.length).toBe(1)
    expect(shiftItems[0].text()).toContain('9h')

    // 筛选结果计数
    expect(wrapper.text()).toContain('1 条记录')
  })

  // ============================================================
  // 8. 班次类型筛选
  // ============================================================
  it('班次类型筛选', async () => {
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', type: 'regular', hours: 8 }),
      makeShift({ id: 's2', type: 'night', hours: 9 }),
      makeShift({ id: 's3', type: 'overtime', hours: 7 }),
    ]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const typeBtns = wrapper.findAll('.wl-filter-type-btn')
    expect(typeBtns.length).toBe(4) // 全部 + 3 种类型

    // 点击"夜班"按钮
    const nightBtn = typeBtns.find((b) => b.text().includes('夜班'))
    expect(nightBtn).toBeDefined()
    await nightBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // 夜班按钮应高亮
    expect(nightBtn!.classes()).toContain('active')

    // 只显示夜班记录
    expect(wrapper.text()).toContain('9h')

    // 记录列表内只显示夜班组次
    const shiftItems = wrapper.findAll('.wl-shift-item')
    expect(shiftItems.length).toBe(1)
    expect(shiftItems[0].text()).toContain('9h')
  })

  // ============================================================
  // 9. 清除筛选条件
  // ============================================================
  it('清除筛选条件', async () => {
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', type: 'regular', hours: 8 }),
      makeShift({ id: 's2', type: 'night', hours: 9 }),
    ]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 初始状态：没有清除按钮
    expect(wrapper.find('.wl-filter-clear').exists()).toBe(false)

    // 设置类型筛选（选择"常规"）
    const typeBtns = wrapper.findAll('.wl-filter-type-btn')
    const regularBtn = typeBtns.find((b) => b.text().includes('常规'))
    await regularBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // 清除按钮出现
    expect(wrapper.find('.wl-filter-clear').exists()).toBe(true)

    // 点击清除筛选
    await wrapper.find('.wl-filter-clear').trigger('click')
    await wrapper.vm.$nextTick()

    // 清除按钮消失
    expect(wrapper.find('.wl-filter-clear').exists()).toBe(false)

    // 所有记录都显示
    expect(wrapper.text()).toContain('8h')
    expect(wrapper.text()).toContain('9h')
  })

  // ============================================================
  // 10. 渲染近30日工时分布图
  // ============================================================
  it('渲染近30日工时分布图', async () => {
    const today = new Date()
    const shifts = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i * 6)
      shifts.push(
        makeShift({
          id: `s${i}`,
          date: d.toISOString().slice(0, 10),
          hours: 8,
        }),
      )
    }
    mockStore['heartflow:shifts'] = shifts

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 图表区域存在
    const chartSection = wrapper.find('.wl-chart-section')
    expect(chartSection.exists()).toBe(true)
    expect(chartSection.text()).toContain('近 30 日工时分布')

    // 30 根柱状条
    const bars = wrapper.findAll('.wl-chart-bar-wrap')
    expect(bars.length).toBe(30)

    // 每根柱状条都有高度样式
    const barEls = wrapper.findAll('.wl-chart-bar')
    expect(barEls.length).toBe(30)
  })

  // ============================================================
  // 11. 显示时薪和月薪预估
  // ============================================================
  it('显示时薪和月薪预估', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: today, hours: 8, type: 'regular' }),
    ]
    mockStore['heartflow:hourly_rate'] = 100

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 时薪输入框
    const rateInput = wrapper.find('.wl-rate-input')
    expect(rateInput.exists()).toBe(true)
    expect((rateInput.element as HTMLInputElement).value).toBe('100')

    // 月薪预估显示
    const estPay = wrapper.find('.wl-est-pay')
    expect(estPay.exists()).toBe(true)
    // 8h * 100 * 1.0 = 800
    expect(estPay.text()).toContain('800')
    expect(estPay.text()).toContain('估计月薪')
  })

  // ============================================================
  // 12. 删除班次记录
  // ============================================================
  it('删除班次记录', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: today, hours: 8 }),
      makeShift({ id: 's2', date: today, hours: 9 }),
    ]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 初始有 2 条记录
    expect(wrapper.findAll('.wl-shift-item').length).toBe(2)

    // 点击第一个删除按钮
    const delBtns = wrapper.findAll('.wl-del')
    await delBtns[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 只剩 1 条记录
    expect(wrapper.findAll('.wl-shift-item').length).toBe(1)
    expect(wrapper.text()).not.toContain('8h')

    // 验证 setKV 被调用并更新了存储
    const savedShiftsCall = mockSetKV.mock.calls.find(
      (c: any[]) => c[0] === 'heartflow:shifts',
    )
    expect(savedShiftsCall).toBeDefined()
    expect((savedShiftsCall![1] as any[]).length).toBe(1)
  })
})

// ============================================================
// 13. 光仪编织 (Sundial Weaving)
// ============================================================
describe('光仪编织 (Sundial Weaving)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['heartflow:shifts'] = []
    mockStore['heartflow:hourly_rate'] = 0
  })

  it('无记录时不渲染光仪编织区域', async () => {
    mockStore['heartflow:shifts'] = []
    const wrapper = await getWrapper()
    expect(wrapper.find('.wl-sundial-section').exists()).toBe(false)
  })

  it('有记录时渲染光仪编织区域（SVG 轮盘）', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: today, hours: 8, type: 'regular' }),
      makeShift({ id: 's2', date: today, hours: 9, type: 'night' }),
      makeShift({ id: 's3', date: today, hours: 3, type: 'overtime' }),
    ]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const section = wrapper.find('.wl-sundial-section')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('光仪编织')

    // SVG 轮盘存在
    const svg = wrapper.find('.wl-sundial-svg')
    expect(svg.exists()).toBe(true)

    // 三个同心圆
    const circles = wrapper.findAll('.wl-sundial-circle')
    expect(circles.length).toBe(3)

    // 光点存在（每个班次一个）
    const points = wrapper.findAll('.wl-sundial-point')
    expect(points.length).toBe(3)

    // 中心呼吸发光点
    expect(wrapper.find('.wl-sundial-core').exists()).toBe(true)
  })

  it('光点颜色对应班次类型（regular=#d4a574）', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: today, hours: 8, type: 'regular' }),
    ]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const points = wrapper.findAll('.wl-sundial-point')
    expect(points.length).toBe(1)
    expect(points[0].attributes('fill')).toBe('#d4a574')
  })

  it('光点数量与班次记录数量一致', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    mockStore['heartflow:shifts'] = [
      makeShift({ id: 's1', date: today, hours: 8 }),
      makeShift({ id: 's2', date: yesterday, hours: 6 }),
    ]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const points = wrapper.findAll('.wl-sundial-point')
    expect(points.length).toBe(2)
  })
})

// ============================================================
// 14. 周度呼吸 (Weekly Breath)
// ============================================================
describe('周度呼吸 (Weekly Breath)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['heartflow:shifts'] = []
    mockStore['heartflow:hourly_rate'] = 0
  })

  it('无记录时不渲染周度呼吸区域', async () => {
    mockStore['heartflow:shifts'] = []
    const wrapper = await getWrapper()
    expect(wrapper.find('.wl-breath-section').exists()).toBe(false)
  })

  it('有记录时渲染周度呼吸区域（8 个柱状条）', async () => {
    const today = new Date()
    const shifts = []
    for (let i = 0; i < 20; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i * 2)
      shifts.push(makeShift({
        id: `s${i}`,
        date: d.toISOString().slice(0, 10),
        hours: 5 + (i % 5),
      }))
    }
    mockStore['heartflow:shifts'] = shifts

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const section = wrapper.find('.wl-breath-section')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('周度呼吸')

    // 8 根柱状条
    const bars = wrapper.findAll('.wl-breath-bar')
    expect(bars.length).toBe(8)

    // 每个柱状条都有周标签
    const labels = wrapper.findAll('.wl-breath-label')
    expect(labels.length).toBe(8)
  })

  it('柱状条高度按比例计算', async () => {
    const today = new Date()
    const shifts = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      shifts.push(makeShift({
        id: `s${i}`,
        date: d.toISOString().slice(0, 10),
        hours: 8,
      }))
    }
    mockStore['heartflow:shifts'] = shifts

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const bars = wrapper.findAll('.wl-breath-bar')
    expect(bars.length).toBe(8)

    // 每个柱状条都有 style 高度
    bars.forEach((bar) => {
      const style = bar.attributes('style')
      expect(style).toBeDefined()
      expect(style).toContain('height')
    })
  })
})

// ============================================================
// 15. 跨房间联动 (Cross-Room Linkage)
// ============================================================
describe('跨房间联动 (Cross-Room Linkage)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['heartflow:shifts'] = []
    mockStore['heartflow:hourly_rate'] = 0
  })

  it('渲染跨房间联动区域', async () => {
    const wrapper = await getWrapper()
    const section = wrapper.find('.wl-cross-section')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('跨房间联动')
  })

  it('渲染 6 个工作房间卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.wl-cross-card')
    expect(cards.length).toBe(6)
  })

  it('每个卡片显示对应的房间名称', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.wl-cross-card')
    const names = ['工痕', '劳酬', '匠庐', '业脉', '行囊', '息壤']
    names.forEach((name, i) => {
      expect(cards[i].text()).toContain(name)
    })
  })

  it('每个卡片显示对应的统计指标名称', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.wl-cross-card')
    const labels = ['工痕印记', '本月收入', '作品数', '联系人', '物品数', '休息天数']
    labels.forEach((label, i) => {
      expect(cards[i].text()).toContain(label)
    })
  })

  it('从 storage 读取各房间数据并显示数值', async () => {
    mockStore['heartflow:scars'] = [{ id: 's1' }, { id: 's2' }, { id: 's3' }]
    mockStore['heartflow:rewards'] = [{ amount: 500 }, { amount: 300 }]
    mockStore['heartflow:craft-works'] = [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }, { id: 'w4' }]
    mockStore['heartflow:career-contacts'] = [{ id: 'c1' }, { id: 'c2' }]
    mockStore['heartflow:bag-items'] = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }]
    mockStore['heartflow:rest-records'] = [{ id: 'r1' }]

    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const cards = wrapper.findAll('.wl-cross-card')
    expect(cards[0].text()).toContain('3')  // scars count
    expect(cards[2].text()).toContain('4')  // craft works count
    expect(cards[3].text()).toContain('2')  // contacts count
    expect(cards[4].text()).toContain('3')  // bag items count
    expect(cards[5].text()).toContain('1')  // rest records count
  })

  it('每个卡片可点击（有 router-link 或 click 事件）', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.wl-cross-card')
    cards.forEach((card) => {
      // 卡片应该是可点击的（有 cursor pointer 样式或 router-link）
      expect(card.classes()).toContain('wl-cross-card')
    })
  })
})

// ============================================================
// 集成：劳酬联动面板（INCR-167：补挂载 claim-but-orphan 面板）
// ============================================================
describe('集成：劳酬联动面板', () => {
  beforeEach(() => {
    delete mockStore['worklog:entries']
  })

  it('挂载劳酬联动面板并渲染标题、开关徽标与统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.wrp').exists()).toBe(true)
    expect(wrapper.text()).toContain('劳酬联动')
    expect(wrapper.find('.wrp-tag').text()).toContain('已开启')
    expect(wrapper.find('.wrp-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('累计映射')
    expect(wrapper.text()).toContain('累计收入')
  })

  it('空日志时无可桥接项且一键桥接按钮禁用', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('没有可桥接的日志')
    expect(wrapper.find('.wrp-btn').attributes('disabled')).toBeDefined()
  })

  it('有长工时时预估待桥接条数并启用一键桥接', async () => {
    mockStore['worklog:entries'] = [
      { id: 'e1', type: 'journal', title: '灰度系统重构', content: '今天完成了灰度系统重构与蓝图归档，推进多房间联动收口，共八个不同功能区块逐项核验。', tags: ['重构', '归档'], sessionIds: [], createdAt: '2026-09-09T10:00:00.000Z', updatedAt: '2026-09-09T10:00:00.000Z' },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('预估 1 条')
    expect(wrapper.find('.wrp-btn').attributes('disabled')).toBeUndefined()
  })

  // ---- 批量收口：生产效率预测 + 工时节奏面板（INCR-174）----
  it('挂载生产效率预测面板 ProductivityPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'ProductivityPanel' }).exists()).toBe(true)
  })

  it('挂载工时节奏分析面板 WorkRhythmPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'WorkRhythmPanel' }).exists()).toBe(true)
  })
})

// ============================================================
// 集成：任务拆解面板 TaskDecomposerPanel（INCR-247 补挂载孤儿组件）
// 引擎 useDecomposer 的 plans 为 use 调用时自 storage 读（storage-read，非模块级 ref），
// 故空态/渲染用例在录入用例之前、保存用例置于最末，避免跨用例状态干扰
// ============================================================
describe('集成：任务拆解面板', () => {
  const PLANS_KEY = 'mirror.decomposer.plans'

  function makePlan(overrides: Record<string, any> = {}) {
    return {
      id: 'plan_1',
      task: '写一篇季度复盘报告',
      intent: 'output' as const,
      source: 'template' as const,
      createdAt: '2026-09-10T08:00:00.000Z',
      steps: [
        { id: 'st1', title: '收集素材', detail: undefined, priority: 'medium', status: 'pending', estimateMinutes: 20 },
        { id: 'st2', title: '搭建框架', detail: undefined, priority: 'low', status: 'pending', estimateMinutes: 25 },
        { id: 'st3', title: '撰写初稿', detail: undefined, priority: 'low', status: 'pending', estimateMinutes: 45 },
        { id: 'st4', title: '修改润色', detail: undefined, priority: 'low', status: 'pending', estimateMinutes: 25 },
      ],
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['heartflow:shifts'] = []
    mockStore['heartflow:hourly_rate'] = 0
    mockStore[PLANS_KEY] = '[]'
  })

  it('集成渲染任务拆解面板骨架与标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.tdp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('🧩 任务拆解')
    expect(wrapper.text()).toContain('本地启发式')
    expect(wrapper.text()).toContain('0 份计划')
  })

  it('无计划时展示拆解输入区与空态提示', async () => {
    const wrapper = await getWrapper()
    // 拆解输入框与按钮
    expect(wrapper.find('.tdp-input').exists()).toBe(true)
    expect(wrapper.find('.tdp-btn--primary').exists()).toBe(true)
    // 空态
    expect(wrapper.find('.tdp-empty').text()).toContain('还没有拆解计划')
  })

  it('输入自然语言任务后拆解出预览步骤与意图', async () => {
    const wrapper = await getWrapper()
    await (wrapper.find('.tdp-input') as any).setValue('写一篇季度复盘报告')
    await wrapper.find('.tdp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tdp-preview').exists()).toBe(true)
    // 意图识别为写作产出，预览任务回显输入
    const chip = wrapper.find('.tdp-intent-chip')
    expect(chip.text()).toContain('写作产出')
    expect(wrapper.find('.tdp-preview-task').text()).toContain('写一篇季度复盘报告')
    // 四条模板步骤
    const steps = wrapper.findAll('.tdp-step')
    expect(steps.length).toBe(4)
    expect(wrapper.text()).toContain('收集素材')
    expect(wrapper.text()).toContain('修改润色')
  })

  it('拆分含显式分句的任务直接陈列子步骤', async () => {
    const wrapper = await getWrapper()
    await (wrapper.find('.tdp-input') as any).setValue('整理房间，收拾衣物，打扫卫生')
    await wrapper.find('.tdp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    const steps = wrapper.findAll('.tdp-step')
    expect(steps.length).toBe(3)
    expect(wrapper.text()).toContain('整理房间')
    expect(wrapper.text()).toContain('收拾衣物')
    expect(wrapper.text()).toContain('打扫卫生')
  })

  it('保存计划写入列表并持久化到存储', async () => {
    const wrapper = await getWrapper()
    await (wrapper.find('.tdp-input') as any).setValue('写一篇季度复盘报告')
    await wrapper.find('.tdp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.tdp-preview .tdp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    // 计划进入列表，预览收起
    const cards = wrapper.findAll('.tdp-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('写一篇季度复盘报告')
    expect(wrapper.find('.tdp-preview').exists()).toBe(false)
    // 存储写了一份计划
    const persisted = JSON.parse(mockStore[PLANS_KEY])
    expect(persisted.length).toBe(1)
    expect(persisted[0].task).toBe('写一篇季度复盘报告')
  })

  it('预置计划渲染卡片与进度，并可切换步骤状态', async () => {
    mockStore[PLANS_KEY] = JSON.stringify([makePlan({
      steps: [
        { id: 'st1', title: '收集素材', detail: undefined, priority: 'medium', status: 'done', estimateMinutes: 20 },
        { id: 'st2', title: '搭建框架', detail: undefined, priority: 'low', status: 'pending', estimateMinutes: 25 },
        { id: 'st3', title: '撰写初稿', detail: undefined, priority: 'low', status: 'pending', estimateMinutes: 45 },
        { id: 'st4', title: '修改润色', detail: undefined, priority: 'low', status: 'pending', estimateMinutes: 25 },
      ],
    })])
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.tdp-card').length).toBe(1)
    expect(wrapper.text()).toContain('1 份计划')
    expect(wrapper.text()).toContain('1/4 步完成')
    // 点击第一个未完成步骤切换到"进行中"并写回存储
    const chips = wrapper.findAll('.tdp-step-chip')
    await chips[1].trigger('click')
    await wrapper.vm.$nextTick()
    const persisted = JSON.parse(mockStore[PLANS_KEY])
    expect(persisted[0].steps[1].status).toBe('doing')
    expect(wrapper.find('.tdp-step-chip--doing').exists()).toBe(true)
  })

  it('删除预置计划后清空列表并恢复空态', async () => {
    mockStore[PLANS_KEY] = JSON.stringify([makePlan()])
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.tdp-card').length).toBe(1)
    await wrapper.find('.tdp-card .tdp-link').trigger('click')
    await wrapper.vm.$nextTick()
    expect(JSON.parse(mockStore[PLANS_KEY]).length).toBe(0)
    expect(wrapper.find('.tdp-empty').text()).toContain('还没有拆解计划')
  })
})

// ============================================================
// 集成：工作光仪面板 ClepsydraPanel（INCR-392 补挂载孤儿组件）
// useClepsydra 手动计时 + useClepsydraCountdown 时间哨塔，补齐更漏"手动静默计时"缺面。
// ClepsydraPanel 经 mocked storage 读 hf:clepsydra_records / hf:clepsydra_countdowns（空默认）。
// ============================================================
describe('集成：工作光仪面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['heartflow:shifts'] = []
    mockStore['heartflow:hourly_rate'] = 0
  })

  it('空态挂载工作光仪面板并渲染标题、计时与空态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.clp').exists()).toBe(true)
    expect(wrapper.text()).toContain('⏳ 工作光仪')
    expect(wrapper.text()).toContain('工作计时')
    expect(wrapper.text()).toContain('还没有倒计时')
    expect(wrapper.text()).toContain('暂无工作记录')
  })

  it('预置计时记录时，工作光仪展示记录与今日汇总', async () => {
    const now = new Date()
    const iso = (offsetMin: number) => new Date(now.getTime() + offsetMin * 60000).toISOString()
    mockStore['hf:clepsydra_records'] = [
      { id: 'r1', startedAt: iso(-120), endedAt: iso(-60), durationSeconds: 3600, category: 'project', sourceType: 'manual', intensity: 0.7, note: '写周报', createdAt: iso(-120) },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('写周报')
    expect(wrapper.text()).toContain('总时长')
  })

  it('预置倒计时哨塔时，时间哨塔展示数量与名称', async () => {
    mockStore['hf:clepsydra_countdowns'] = [
      { id: 'c1', label: '番茄专注', category: 'project', totalSeconds: 1500, repeat: 'once', status: 'idle' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.clp').exists()).toBe(true)
    expect(wrapper.text()).toContain('番茄专注')
    expect(wrapper.text()).toContain('待开始')
  })
})

// ============================================================
// 集成：时间块日规划面板 TimeBlockPanel（INCR-414 新能力）
// 衔接更漏"时间织机"主题：待办按预估时长排入当日时间轴空闲隙，薄委托面板直驱 useTimeBlock。
// 经 mocked storage 读 hf:clepsydra_plan_tasks / hf:clepsydra_time_blocks（空默认）。
// ============================================================
describe('集成：时间块日规划面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['heartflow:shifts'] = []
    mockStore['heartflow:hourly_rate'] = 0
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
  })

  it('挂载时间块面板并渲染标题与空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.tbp').exists()).toBe(true)
    expect(wrapper.find('.wl-timeblock-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('时间块日规划')
    expect(wrapper.text()).toContain('当天的待办都已排上时间轴')
  })

  it('在视图内新增待办并自动排程生成时间块', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.tbp-input').setValue('撰写蓝图归档')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    // 待规划池出现该待办
    expect(wrapper.find('.tbp-task').text()).toContain('撰写蓝图归档')
    // 自动排程
    await wrapper.find('.tbp-btn--auto').trigger('click')
    await wrapper.vm.$nextTick()
    // 时间轴出现块
    expect(wrapper.find('.tbp-block').exists()).toBe(true)
    expect(wrapper.find('.tbp-block').text()).toContain('撰写蓝图归档')
    // 覆盖率文本出现
    expect(wrapper.text()).toContain('覆盖率')
  })
})