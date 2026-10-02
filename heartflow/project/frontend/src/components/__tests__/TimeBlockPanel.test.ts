// ============================================================
// 时间块日规划面板测试（INCR-414 · TimeBlockPanel.vue）
// 空态 · 新增待办 · 自动排程 · 手动建块校验 · 排入下一空档 · 移除/完成
// 周视图（INCR-416）：模式切换 · 跨天列渲染 · 拖拽改起止 / 跨列改日期 / 拉时长
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { weekDaysOf, localDateKey } from '../../modules/clepsydra'

const mockStore: Record<string, any> = {}

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockStore[key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

async function mountPanel() {
  localStorage.clear()
  const { default: TimeBlockPanel } = await import('../TimeBlockPanel.vue')
  const wrapper = mount(TimeBlockPanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('TimeBlockPanel 时间块日规划', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
  })

  it('空态：标题 + 待规划空提示 + 时间轴空提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.tbp').exists()).toBe(true)
    expect(wrapper.text()).toContain('时间块日规划')
    expect(wrapper.text()).toContain('当天的待办都已排上时间轴')
    expect(wrapper.text()).toContain('时间轴还空着')
  })

  it('新增待办出现在待规划池', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input').setValue('写周报')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    const tasks = wrapper.findAll('.tbp-task')
    expect(tasks.length).toBe(1)
    expect(tasks[0].text()).toContain('写周报')
    expect(tasks[0].text()).toContain('30′') // 默认预估 30 分钟
    // 持久化（mock storage 直接存数组对象）
    expect(mockStore['hf:clepsydra_plan_tasks'].length).toBe(1)
  })

  it('自动排程把待办放入时间轴并刷新覆盖率', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input').setValue('深度工作')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()

    // 自动排程按钮应可用
    const autoBtn = wrapper.find('.tbp-btn--auto')
    expect((autoBtn.element as HTMLButtonElement).disabled).toBe(false)
    await autoBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 时间轴出现一个块
    const blocks = wrapper.findAll('.tbp-block')
    expect(blocks.length).toBe(1)
    expect(blocks[0].text()).toContain('深度工作')
    // 覆盖率文本更新（已排 >= 0.5h）
    expect(wrapper.text()).toContain('已排')
    expect(wrapper.text()).toContain('覆盖率')
    // 已生成自动排程提示
    expect(wrapper.text()).toContain('自动排程已放入 1 个时间块')
    // 持久化时间块
    expect(mockStore['hf:clepsydra_time_blocks'].length).toBe(1)
  })

  it('手动建块：合法时间生成时间块', async () => {
    const wrapper = await mountPanel()
    const manual = wrapper.find('.tbp-manual')
    await manual.find('.tbp-input--time').setValue('10:00')
    await manual.find('.tbp-input--num').setValue(45)
    const titleInput = manual.findAll('.tbp-input').find(i => !i.classes('tbp-input--time') && !i.classes('tbp-input--num'))
    await titleInput!.setValue('晨间复盘')
    await manual.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    const blocks = wrapper.findAll('.tbp-block')
    expect(blocks.length).toBe(1)
    expect(blocks[0].text()).toContain('晨间复盘')
    expect(blocks[0].text()).toContain('10:00')
    expect(wrapper.find('.tbp-form-error').exists()).toBe(false)
  })

  it('手动建块：非法时间显示错误且不生成块', async () => {
    const wrapper = await mountPanel()
    const manual = wrapper.find('.tbp-manual')
    await manual.find('.tbp-input--time').setValue('99:99')
    const titleInput = manual.findAll('.tbp-input').find(i => !i.classes('tbp-input--time') && !i.classes('tbp-input--num'))
    await titleInput!.setValue('坏时间')
    await manual.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-form-error').exists()).toBe(true)
    expect(wrapper.find('.tbp-form-error').text()).toContain('HH:MM')
    expect(wrapper.findAll('.tbp-block').length).toBe(0)
  })

  it('排入按钮把单个待办放入下一空档', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input').setValue('读书')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    const placeBtn = wrapper.find('.tbp-task-place')
    expect(placeBtn.exists()).toBe(true)
    await placeBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.tbp-block').length).toBe(1)
    expect(wrapper.find('.tbp-block').text()).toContain('读书')
  })

  it('标记完成与移除时间块', async () => {
    const wrapper = await mountPanel()
    // 先排入一个块
    await wrapper.find('.tbp-input').setValue('运动')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.tbp-task-place').trigger('click')
    await wrapper.vm.$nextTick()

    const block = wrapper.find('.tbp-block')
    // 标记完成
    await block.find('.tbp-block-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-block').classes()).toContain('tbp-block--done')

    // 完成态联动：写入更漏工作记录（sourceType=auto），汇入光仪编织
    const blockId = (mockStore['hf:clepsydra_time_blocks'] as any[])[0].id
    const recs = mockStore['hf:clepsydra_records'] as any[] | undefined
    expect(Array.isArray(recs)).toBe(true)
    expect(recs!.length).toBe(1)
    expect(recs![0].sourceType).toBe('auto')
    expect(recs![0].sourceAnchorId).toBe(blockId)
    expect(recs![0].note).toContain('运动')
    expect(recs![0].category).toBe('project')

    // 移除块（最后一个按钮）→ 级联移除联动的更漏记录
    const delBtn = wrapper.findAll('.tbp-block-btn')[3]
    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.tbp-block').length).toBe(0)
    expect((mockStore['hf:clepsydra_records'] as any[]).length).toBe(0)
  })
})

describe('TimeBlockPanel 周视图（INCR-416）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
  })

  it('切换到周模式：渲染 7 列 + 周列头（周一→周日），日时间轴隐藏', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click') // 「周」
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-week-grid').exists()).toBe(true)
    const cols = wrapper.findAll('.tbp-week-col')
    expect(cols.length).toBe(7)
    const heads = wrapper.findAll('.tbp-week-colhead')
    expect(heads.length).toBe(7)
    expect(heads[0].text()).toContain('周一')
    expect(heads[6].text()).toContain('周日')
    // 日时间轴（仅日模式渲染）不应存在
    expect(wrapper.find('.tbp-timeline').exists()).toBe(false)
  })

  it('周模式：跨天块落在对应列', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'b1', date: week[0], startMin: 420, durationMin: 60, category: 'project', title: '周一块', taskId: null, done: false },
      { id: 'b2', date: week[6], startMin: 540, durationMin: 60, category: 'study', title: '周日块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click')
    await wrapper.vm.$nextTick()
    const cols = wrapper.findAll('.tbp-week-col')
    const col0 = cols[0].findAll('.tbp-block--week')
    const col6 = cols[6].findAll('.tbp-block--week')
    expect(col0.length).toBe(1)
    expect(col0[0].text()).toContain('周一块')
    expect(col6.length).toBe(1)
    expect(col6[0].text()).toContain('周日块')
  })

  it('周模式：竖向拖拽块改起始（经 setBlockPlacement 落库）', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'bd', date: week[0], startMin: 420, durationMin: 60, category: 'project', title: '拖动块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click')
    await wrapper.vm.$nextTick()

    const blockEl = wrapper.find('.tbp-block--week')
    await blockEl.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 50, clientY: 200 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 50, clientY: 270, pointerId: 1 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 270, pointerId: 1 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()

    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])[0]
    // 420 + (70px / 0.7) = 520，snap 到 5
    expect(stored.startMin).toBe(520)
    expect(stored.date).toBe(week[0]) // 同列，日期不变
  })

  it('周模式：横向跨列拖拽改日期（经 setBlockPlacement 落库）', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'bd2', date: week[0], startMin: 420, durationMin: 60, category: 'project', title: '跨列块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click')
    await wrapper.vm.$nextTick()

    // mock 周网格几何，使列宽 = 100px
    const gridEl = wrapper.find('.tbp-week-grid').element as HTMLElement
    gridEl.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 700, height: 600, right: 700, bottom: 600, x: 0, y: 0, toJSON() {},
    } as DOMRect)

    const blockEl = wrapper.find('.tbp-block--week')
    await blockEl.trigger('pointerdown', { button: 0, pointerId: 2, clientX: 10, clientY: 200 })
    const mv = new Event('pointermove') as any
    // 第 4 列（index 3）：clientX = 3*100 + 10
    Object.assign(mv, { clientX: 310, clientY: 200, pointerId: 2 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 310, clientY: 200, pointerId: 2 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()

    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])[0]
    expect(stored.date).toBe(week[3]) // 跨到第 4 列对应日期
    expect(stored.startMin).toBe(420) // 起始不变
  })

  it('周模式：底部手柄拖拽改时长（经 resizeBlock 落库）', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'br', date: week[0], startMin: 420, durationMin: 60, category: 'project', title: '拉伸块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click')
    await wrapper.vm.$nextTick()

    const resizeEl = wrapper.find('.tbp-block-resize')
    await resizeEl.trigger('pointerdown', { button: 0, pointerId: 3, clientX: 50, clientY: 300 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 50, clientY: 370, pointerId: 3 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 370, pointerId: 3 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()

    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])[0]
    // 60 + (70px / 0.7) = 160，snap 到 5
    expect(stored.durationMin).toBe(160)
    expect(stored.startMin).toBe(420) // 起点不变
  })
})

describe('TimeBlockPanel 重叠冲突检测（INCR-417）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
  })

  it('日模式：两个重叠块都标 --overlap 且头部提示出现', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'o1', date: today, startMin: 420, durationMin: 120, category: 'project', title: '块A', taskId: null, done: false },
      { id: 'o2', date: today, startMin: 480, durationMin: 60, category: 'study', title: '块B', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    const blocks = wrapper.findAll('.tbp-block')
    expect(blocks.length).toBe(2)
    expect(blocks[0].classes()).toContain('tbp-block--overlap')
    expect(blocks[1].classes()).toContain('tbp-block--overlap')
    // 头部提示文案含重叠数量
    const note = wrapper.find('.tbp-overlap-note')
    expect(note.exists()).toBe(true)
    expect(note.text()).toContain('2')
    // 每块带 ⚠ 角标
    expect(wrapper.findAll('.tbp-block-warn').length).toBe(2)
  })

  it('日模式：端点相邻的块不标记重叠', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'a', date: today, startMin: 420, durationMin: 60, category: 'project', title: '相邻A', taskId: null, done: false },
      { id: 'b', date: today, startMin: 480, durationMin: 60, category: 'study', title: '相邻B', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    const blocks = wrapper.findAll('.tbp-block')
    expect(blocks[0].classes()).not.toContain('tbp-block--overlap')
    expect(blocks[1].classes()).not.toContain('tbp-block--overlap')
    expect(wrapper.find('.tbp-overlap-note').exists()).toBe(false)
  })

  it('周模式：同一列内重叠块标记 --overlap 且周头部提示出现', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'o1', date: week[0], startMin: 420, durationMin: 120, category: 'project', title: '周一A', taskId: null, done: false },
      { id: 'o2', date: week[0], startMin: 480, durationMin: 60, category: 'study', title: '周一B', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click') // 「周」
    await wrapper.vm.$nextTick()
    const col0 = wrapper.findAll('.tbp-week-col')[0]
    const blocks = col0.findAll('.tbp-block--week')
    expect(blocks.length).toBe(2)
    expect(blocks[0].classes()).toContain('tbp-block--overlap')
    expect(blocks[1].classes()).toContain('tbp-block--overlap')
    // 周头部提示（日时间轴在周模式下不渲染，故全局唯一）
    const note = wrapper.find('.tbp-overlap-note')
    expect(note.exists()).toBe(true)
    expect(note.text()).toContain('2')
  })
})

describe('TimeBlockPanel 时间块模板（INCR-418）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
    mockStore['hf:clepsydra_templates'] = []
  })

  it('另存当前日为模板：列表出现 + 持久化 + 空内容拦截', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_plan_tasks'] = [
      { id: 't1', title: '深度工作', category: 'project', estimatedMinutes: 60, date: today, done: false, createdAt: '2026-10-09T08:00:00.000Z' },
    ]
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'b1', date: today, startMin: 420, durationMin: 60, category: 'study', title: '晨练', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    // 保存按钮初始 disabled（名称为空）
    const saveBtn = wrapper.find('.tbp-template-save .tbp-btn--primary')
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(true)
    await wrapper.find('.tbp-input--tpl').setValue('工作日')
    await wrapper.vm.$nextTick()
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(false)
    await saveBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 模板列表出现一项，名/数正确
    const tplRow = wrapper.find('.tbp-template')
    expect(tplRow.exists()).toBe(true)
    expect(tplRow.text()).toContain('工作日')
    expect(tplRow.text()).toContain('1 任务 · 1 块')
    // 持久化
    const stored = mockStore['hf:clepsydra_templates'] as any[]
    expect(stored.length).toBe(1)
    expect(stored[0].name).toBe('工作日')
    expect(stored[0].tasks.length).toBe(1)
    expect(stored[0].blocks.length).toBe(1)
  })

  it('空内容日另存被拦截（按钮保持 disabled，不生成模板）', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input--tpl').setValue('空模板')
    await wrapper.vm.$nextTick()
    // 当前日无 tasks/blocks → 按钮 disabled
    const saveBtn = wrapper.find('.tbp-template-save .tbp-btn--primary')
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(true)
    expect(mockStore['hf:clepsydra_templates']).toHaveLength(0)
  })

  it('套用模板到今天：生成对应 tasks + blocks（带目标 date）', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_templates'] = [
      {
        id: 'tp1', name: '工作日', createdAt: '2026-10-09T00:00:00.000Z',
        tasks: [{ title: '深度工作', category: 'project', estimatedMinutes: 60 }],
        blocks: [{ startMin: 420, durationMin: 60, category: 'study', title: '晨练' }],
      },
    ]
    const wrapper = await mountPanel()
    const tplRow = wrapper.find('.tbp-template')
    expect(tplRow.exists()).toBe(true)
    await wrapper.find('.tbp-template-apply').trigger('click')
    await wrapper.vm.$nextTick()
    // 当天 tasks +1、blocks +1
    expect((mockStore['hf:clepsydra_plan_tasks'] as any[]).length).toBe(1)
    expect((mockStore['hf:clepsydra_time_blocks'] as any[]).length).toBe(1)
    // 套用块带目标 date = today
    expect((mockStore['hf:clepsydra_time_blocks'] as any[])[0].date).toBe(today)
    // 提示文案
    expect(wrapper.find('.tbp-auto-note').text()).toContain('已套用')
  })

  it('删除模板：列表清空并持久化', async () => {
    mockStore['hf:clepsydra_templates'] = [
      { id: 'tp1', name: '工作日', createdAt: '2026-10-09T00:00:00.000Z', tasks: [], blocks: [] },
    ]
    const wrapper = await mountPanel()
    expect(wrapper.findAll('.tbp-template').length).toBe(1)
    await wrapper.find('.tbp-template-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-template').exists()).toBe(false)
    expect((mockStore['hf:clepsydra_templates'] as any[]).length).toBe(0)
  })
})

describe('TimeBlockPanel 计划vs实际报表（INCR-419）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
    mockStore['hf:clepsydra_templates'] = []
  })

  it('日模式：渲染计划/实际/完成率卡片 + 分类对照行', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'b1', date: today, startMin: 420, durationMin: 60, category: 'project', title: '块A', taskId: null, done: false },
      { id: 'b2', date: today, startMin: 540, durationMin: 30, category: 'study', title: '块B', taskId: null, done: true },
    ]
    // 块B 完成联动的 auto 记录（30 分钟 == 计划 30）
    mockStore['hf:clepsydra_records'] = [
      { id: 'r1', startedAt: today + 'T09:30:00', endedAt: today + 'T10:00:00', durationSeconds: 1800, category: 'study', sourceType: 'auto', sourceAnchorId: 'b2', intensity: 0.5, note: '时间块·块B', createdAt: today + 'T09:30:00' },
    ]
    const wrapper = await mountPanel()
    expect(wrapper.find('.tbp-report').exists()).toBe(true)
    const cards = wrapper.findAll('.tbp-report-card-val')
    expect(cards).toHaveLength(4) // 计划 / 实际 / 偏差 / 完成率
    expect(cards[0].text()).toContain('90′') // 计划 60+30
    expect(cards[1].text()).toContain('30′') // 实际仅 study 的 30
    expect(cards[3].text()).toContain('50%') // 完成率 1/2
    // 分类对照：project(计划60/实际0) + study(计划30/实际30)
    const cats = wrapper.findAll('.tbp-report-cat')
    expect(cats).toHaveLength(2)
  })

  it('日模式：完成块联动 auto 记录时长＝计划 → 偏差 0、完成率 100%', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'b1', date: today, startMin: 420, durationMin: 60, category: 'project', title: '块A', taskId: null, done: true },
    ]
    mockStore['hf:clepsydra_records'] = [
      { id: 'r1', startedAt: today + 'T07:00:00', endedAt: today + 'T08:00:00', durationSeconds: 3600, category: 'project', sourceType: 'auto', sourceAnchorId: 'b1', intensity: 0.7, note: '时间块·块A', createdAt: today + 'T07:00:00' },
    ]
    const wrapper = await mountPanel()
    const cards = wrapper.findAll('.tbp-report-card-val')
    expect(cards[0].text()).toContain('60′') // 计划
    expect(cards[1].text()).toContain('60′') // 实际
    expect(cards[2].text()).toContain('0′') // 偏差
    expect(cards[3].text()).toContain('100%') // 完成率
  })

  it('周模式：整周聚合（计划跨多日、实际仅周一有记录）', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'b1', date: week[0], startMin: 420, durationMin: 60, category: 'project', title: '周一块', taskId: null, done: false },
      { id: 'b2', date: week[2], startMin: 420, durationMin: 45, category: 'daily', title: '周三块', taskId: null, done: false },
    ]
    mockStore['hf:clepsydra_records'] = [
      { id: 'r1', startedAt: week[0] + 'T09:00:00', endedAt: week[0] + 'T10:00:00', durationSeconds: 3600, category: 'project', sourceType: 'manual', intensity: 0.7, note: '', createdAt: week[0] + 'T09:00:00' },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click') // 周
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-report-scope').text()).toContain('本周')
    const cards = wrapper.findAll('.tbp-report-card-val')
    expect(cards[0].text()).toContain('105′') // 计划 60+45
    expect(cards[1].text()).toContain('60′') // 实际仅周一 project 60
    expect(cards[3].text()).toContain('0%') // 完成率 0
  })
})

describe('TimeBlockPanel 日时间轴拖拽（INCR-420）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
    mockStore['hf:clepsydra_templates'] = []
  })

  it('日模式：竖向拖拽块改起始（经 setBlockPlacement 落库）', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'bd', date: today, startMin: 420, durationMin: 60, category: 'project', title: '拖动块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    const blockEl = wrapper.find('.tbp-block')
    await blockEl.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 50, clientY: 100 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 50, clientY: 170, pointerId: 1 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 170, pointerId: 1 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])[0]
    // 420 + (70px / 0.7) = 520
    expect(stored.startMin).toBe(520)
    expect(stored.date).toBe(today)
  })

  it('日模式：底部手柄拖拽改时长（经 resizeBlock 落库）', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'br', date: today, startMin: 420, durationMin: 60, category: 'project', title: '拉伸块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    const resizeEl = wrapper.find('.tbp-block-resize')
    await resizeEl.trigger('pointerdown', { button: 0, pointerId: 3, clientX: 50, clientY: 300 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 50, clientY: 370, pointerId: 3 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 370, pointerId: 3 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])[0]
    // 60 + (70px / 0.7) = 160
    expect(stored.durationMin).toBe(160)
    expect(stored.startMin).toBe(420) // 起点不变
  })

  it('日模式：时间轴拖拽框选新建时间块（经 addBlock 落库）', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = []
    const wrapper = await mountPanel()
    const tl = wrapper.find('.tbp-timeline').element as HTMLElement
    tl.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 400, height: 672, right: 400, bottom: 672, x: 0, y: 0, toJSON() {},
    } as DOMRect)
    await wrapper.find('.tbp-timeline').trigger('pointerdown', { button: 0, pointerId: 4, clientX: 50, clientY: 100 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 50, clientY: 170, pointerId: 4 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 170, pointerId: 4 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])
    expect(stored.length).toBe(1)
    // 起点 100/0.7+420≈565（snap 5）；拖动 70px→ +100 → 末点 665；区间 [565,665] dur 100
    expect(stored[0].startMin).toBe(565)
    expect(stored[0].durationMin).toBe(100)
    expect(stored[0].title).toBe('新块')
    expect(stored[0].date).toBe(today)
  })

  it('日模式：时间轴点击（未拖拽）不新建时间块', async () => {
    mockStore['hf:clepsydra_time_blocks'] = []
    const wrapper = await mountPanel()
    const tl = wrapper.find('.tbp-timeline').element as HTMLElement
    tl.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 400, height: 672, right: 400, bottom: 672, x: 0, y: 0, toJSON() {},
    } as DOMRect)
    await wrapper.find('.tbp-timeline').trigger('pointerdown', { button: 0, pointerId: 5, clientX: 50, clientY: 100 })
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 100, pointerId: 5 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    expect((mockStore['hf:clepsydra_time_blocks'] as any[]).length).toBe(0)
  })
})
