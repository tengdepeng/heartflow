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
    // 标记完成（按标题定位「标记完成」按钮，避免位置索引受新增按钮影响）
    const toggleBtn = block.findAll('.tbp-block-btn').find(b => (b.attributes('title') ?? '').includes('标记完成'))!
    await toggleBtn.trigger('click')
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

    // 移除块（按标题定位「移除」按钮）→ 级联移除联动的更漏记录
    const delBtn = block.findAll('.tbp-block-btn').find(b => (b.attributes('title') ?? '') === '移除')!
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

describe('TimeBlockPanel 冲突智能避让/重排（INCR-421）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
    mockStore['hf:clepsydra_templates'] = []
  })

  it('日模式：拖拽移动块到与他块重叠 → 自动避让推到最近空隙', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'f', date: today, startMin: 420, durationMin: 60, category: 'project', title: '固定块', taskId: null, done: false },
      { id: 'm', date: today, startMin: 600, durationMin: 60, category: 'study', title: '拖动块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    // 按起始排序：f(420) 在前，m(600) 在后
    const blocks = wrapper.findAll('.tbp-block')
    const mEl = blocks[1]
    await mEl.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 50, clientY: 200 })
    const mv = new Event('pointermove') as any
    // 向上拖 105px → 欲落到 600-150=450（与 f[420,480] 重叠），应被避让到 480
    Object.assign(mv, { clientX: 50, clientY: 95, pointerId: 1 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 95, pointerId: 1 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])
    const m = stored.find(b => b.id === 'm')!
    expect(m.startMin).toBe(480) // 避让后落点，而非 450
    expect(stored.find(b => b.id === 'f')!.startMin).toBe(420) // 固定块不动
    // 避让后 m[480,540] 与 f[420,480] 相邻，无重叠 → 头部提示消失
    expect(wrapper.find('.tbp-overlap-note').exists()).toBe(false)
  })

  it('日模式：时间轴框选新建块与他块重叠 → 自动避让推到最近空隙', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'f', date: today, startMin: 420, durationMin: 60, category: 'project', title: '固定块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    const tl = wrapper.find('.tbp-timeline').element as HTMLElement
    tl.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 400, height: 672, right: 400, bottom: 672, x: 0, y: 0, toJSON() {},
    } as DOMRect)
    // 起点落在 f[420,480] 区间内（clientY≈10 → startMin≈435），拖动生成区间 [435,535] 与 f 重叠
    await wrapper.find('.tbp-timeline').trigger('pointerdown', { button: 0, pointerId: 4, clientX: 50, clientY: 10 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 50, clientY: 80, pointerId: 4 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: 80, pointerId: 4 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])
    expect(stored.length).toBe(2) // 原固定块 f + 新建块
    // 避让到 f 之后：480
    const created = stored.find(b => b.title === '新块')!
    expect(created.startMin).toBe(480)
    expect(wrapper.find('.tbp-overlap-note').exists()).toBe(false)
  })

  it('日模式：拉伸块到与他块重叠 → 时长被 clamp 到空隙上限', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'm', date: today, startMin: 420, durationMin: 60, category: 'project', title: '拉伸块', taskId: null, done: false },
      { id: 'f', date: today, startMin: 600, durationMin: 60, category: 'study', title: '固定块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    const resizeEl = wrapper.find('.tbp-block-resize') // 第一块（420 起点）的手柄
    const downY = 300
    await resizeEl.trigger('pointerdown', { button: 0, pointerId: 3, clientX: 50, clientY: downY })
    const mv = new Event('pointermove') as any
    // 大幅向下拖 → 欲拉伸远超空隙（含 f 前最多 180 分钟），应被 clamp 到 180
    Object.assign(mv, { clientX: 50, clientY: downY + 300, pointerId: 3 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 50, clientY: downY + 300, pointerId: 3 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[]).find(b => b.id === 'm')!
    expect(stored.durationMin).toBe(180) // clamp 到 m[420] 到 f[600] 的空隙
    expect(stored.startMin).toBe(420) // 起点不变
    expect(wrapper.find('.tbp-overlap-note').exists()).toBe(false)
  })

  it('日模式：点「消除冲突」一键紧凑重排，消解存量重叠', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'a', date: today, startMin: 420, durationMin: 120, category: 'project', title: '块A', taskId: null, done: false },
      { id: 'b', date: today, startMin: 480, durationMin: 60, category: 'study', title: '块B', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    // 初始重叠 → 头部提示 + 消除冲突按钮可见
    expect(wrapper.find('.tbp-overlap-note').exists()).toBe(true)
    const resolveBtn = wrapper.find('.tbp-timeline-head .tbp-btn--auto')
    expect(resolveBtn.exists()).toBe(true)
    await resolveBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])
    expect(stored.find(b => b.id === 'a')!.startMin).toBe(420) // 不动
    expect(stored.find(b => b.id === 'b')!.startMin).toBe(540) // 推到 a 之后
    // 消除后无重叠 → 提示消失，已重排信息出现
    expect(wrapper.find('.tbp-overlap-note').exists()).toBe(false)
    expect(wrapper.find('.tbp-auto-note').text()).toContain('已紧凑重排')
  })
})

describe('TimeBlockPanel 周视图拖拽新建（INCR-422）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
    mockStore['hf:clepsydra_templates'] = []
  })

  it('周模式：网格空白处拖拽框选新建块落到对应列（经 addBlock 落库）', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = []
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click') // 周
    await wrapper.vm.$nextTick()
    const gridEl = wrapper.find('.tbp-week-grid').element as HTMLElement
    gridEl.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 700, height: 672, right: 700, bottom: 672, x: 0, y: 0, toJSON() {},
    } as DOMRect)
    // 第 4 列（index 3）：clientX = 3*100 + 50 = 350
    await wrapper.find('.tbp-week-grid').trigger('pointerdown', { button: 0, pointerId: 4, clientX: 350, clientY: 100 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 350, clientY: 170, pointerId: 4 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 350, clientY: 170, pointerId: 4 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])
    expect(stored.length).toBe(1)
    expect(stored[0].date).toBe(week[3]) // 落到第 4 列对应日
    expect(stored[0].startMin).toBe(565) // snap(100/0.7 + 420) = 565
    expect(stored[0].durationMin).toBe(100)
    expect(stored[0].title).toBe('新块')
  })

  it('周模式：网格新建块与他块重叠 → 自动避让推到最近空隙', async () => {
    const week = weekDaysOf(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'f', date: week[3], startMin: 565, durationMin: 60, category: 'project', title: '固定块', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    await wrapper.findAll('.tbp-mode')[1].trigger('click') // 周
    await wrapper.vm.$nextTick()
    const gridEl = wrapper.find('.tbp-week-grid').element as HTMLElement
    gridEl.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 700, height: 672, right: 700, bottom: 672, x: 0, y: 0, toJSON() {},
    } as DOMRect)
    // 第 4 列、clientY=100（startMin≈565，与 f[565,625] 重叠）→ 应避让到 625
    await wrapper.find('.tbp-week-grid').trigger('pointerdown', { button: 0, pointerId: 5, clientX: 350, clientY: 100 })
    const mv = new Event('pointermove') as any
    Object.assign(mv, { clientX: 350, clientY: 170, pointerId: 5 })
    window.dispatchEvent(mv)
    await wrapper.vm.$nextTick()
    const up = new Event('pointerup') as any
    Object.assign(up, { clientX: 350, clientY: 170, pointerId: 5 })
    window.dispatchEvent(up)
    await wrapper.vm.$nextTick()
    const stored = (mockStore['hf:clepsydra_time_blocks'] as any[])
    expect(stored.length).toBe(2) // 原固定块 f + 新建块
    const created = stored.find(b => b.title === '新块')!
    expect(created.date).toBe(week[3])
    expect(created.startMin).toBe(625) // 避让到 f 之后
  })
})

describe('TimeBlockPanel 专注会话绑定（INCR-423）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
    mockStore['hf:clepsydra_templates'] = []
  })

  async function makeTodayBlock(wrapper: any): Promise<string> {
    await wrapper.find('.tbp-input').setValue('专注任务')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.tbp-task-place').trigger('click')
    await wrapper.vm.$nextTick()
    return (mockStore['hf:clepsydra_time_blocks'] as any[])[0].id
  }

  it('日模式：点「专注」开启绑定会话 → 写入 blockId 记录、块进入专注态', async () => {
    const wrapper = await mountPanel()
    const blockId = await makeTodayBlock(wrapper)
    const block = wrapper.find('.tbp-block')
    const focusBtn = block.find('.tbp-block-actions').findAll('.tbp-block-btn')[0]
    await focusBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const recs = mockStore['hf:clepsydra_records'] as any[]
    expect(recs).toHaveLength(1)
    expect(recs[0].blockId).toBe(blockId)
    expect(recs[0].sourceType).toBe('manual')
    expect(recs[0].endedAt).toBeNull() // 进行中
    expect(block.classes()).toContain('tbp-block--focusing')
    expect(focusBtn.text()).toBe('■')
    expect(wrapper.find('.tbp-block-focus-tag').exists()).toBe(true)
  })

  it('日模式：再点「专注」（停止）→ 结束会话、标记完成、仅 1 条真实记录无 auto 代理', async () => {
    const wrapper = await mountPanel()
    await makeTodayBlock(wrapper)
    const focusBtn = wrapper.find('.tbp-block').find('.tbp-block-actions').findAll('.tbp-block-btn')[0]
    await focusBtn.trigger('click') // 开始
    await wrapper.vm.$nextTick()
    await focusBtn.trigger('click') // 停止
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-block').classes()).toContain('tbp-block--done')
    const recs = mockStore['hf:clepsydra_records'] as any[]
    expect(recs).toHaveLength(1) // 真实专注会话，无 auto 计划代理
    expect(recs[0].sourceType).toBe('manual')
    expect(recs[0].endedAt).not.toBeNull()
  })

  it('日模式：一块进行中时，另一块的「专注」按钮被禁用（避免并行计时）', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'b1', date: today, startMin: 420, durationMin: 60, category: 'project', title: '块1', taskId: null, done: false },
      { id: 'b2', date: today, startMin: 600, durationMin: 60, category: 'study', title: '块2', taskId: null, done: false },
    ]
    const wrapper = await mountPanel()
    const blocks = wrapper.findAll('.tbp-block')
    const b1Focus = blocks[0].find('.tbp-block-actions').findAll('.tbp-block-btn')[0]
    const b2Focus = blocks[1].find('.tbp-block-actions').findAll('.tbp-block-btn')[0]
    await b1Focus.trigger('click') // 块1 进入专注
    await wrapper.vm.$nextTick()
    expect((b1Focus.element as HTMLButtonElement).disabled).toBe(false)
    expect((b2Focus.element as HTMLButtonElement).disabled).toBe(true)
    expect(b1Focus.text()).toBe('■')
    expect(b2Focus.text()).toBe('🎯')
  })
})

describe('TimeBlockPanel 专注期间屏护（INCR-424）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
    mockStore['hf:clepsydra_records'] = []
    mockStore['hf:clepsydra_templates'] = []
  })

  function seedRunning(today: string, blockId: string, secondsAgo: number): void {
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: blockId, date: today, startMin: 420, durationMin: 60, category: 'project', title: '屏护块', taskId: null, done: false },
    ]
    const iso = new Date(Date.now() - secondsAgo * 1000).toISOString()
    mockStore['hf:clepsydra_records'] = [
      { id: 'r-run', startedAt: iso, endedAt: null, durationSeconds: secondsAgo, category: 'project', sourceType: 'manual', sourceAnchorId: blockId, blockId, intensity: 0.7, note: '屏护块', createdAt: iso },
    ]
  }

  it('专注态：根节点加 tbp--focus-mode，规划四区加 tbp-dim', async () => {
    const today = localDateKey(new Date())
    seedRunning(today, 'fb1', 8)
    const wrapper = await mountPanel()
    expect(wrapper.find('.tbp').classes()).toContain('tbp--focus-mode')
    expect(wrapper.find('.tbp-pool').classes()).toContain('tbp-dim')
    expect(wrapper.find('.tbp-templates').classes()).toContain('tbp-dim')
    expect(wrapper.find('.tbp-manual').classes()).toContain('tbp-dim')
    expect(wrapper.find('.tbp-report').classes()).toContain('tbp-dim')
  })

  it('专注态：屏护横幅渲染标题 + 实时计时 + 结束按钮', async () => {
    const today = localDateKey(new Date())
    seedRunning(today, 'fb2', 8)
    const wrapper = await mountPanel()
    const banner = wrapper.find('.tbp-focus-banner')
    expect(banner.exists()).toBe(true)
    expect(wrapper.find('.tbp-focus-title').text()).toContain('屏护块')
    expect(wrapper.find('.tbp-focus-kicker').text()).toContain('专注中')
    // 实时计时：格式为人类可读时长（秒/分/时）
    expect(wrapper.find('.tbp-focus-timer').text()).toMatch(/\d+[秒分时]/)
    const endBtn = wrapper.find('.tbp-btn--focus-end')
    expect(endBtn.exists()).toBe(true)
    expect(endBtn.text()).toBe('结束')
  })

  it('结束专注会话：横幅消失、focus-mode 与 dim 移除、会话结束', async () => {
    const today = localDateKey(new Date())
    seedRunning(today, 'fb3', 8)
    const wrapper = await mountPanel()
    expect(wrapper.find('.tbp-focus-banner').exists()).toBe(true)
    await wrapper.find('.tbp-btn--focus-end').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-focus-banner').exists()).toBe(false)
    expect(wrapper.find('.tbp').classes()).not.toContain('tbp--focus-mode')
    expect(wrapper.find('.tbp-pool').classes()).not.toContain('tbp-dim')
    // 更漏进行中记录已结束
    const recs = mockStore['hf:clepsydra_records'] as any[]
    expect(recs).toHaveLength(1)
    expect(recs[0].endedAt).not.toBeNull()
  })

  it('专注态：时间轴非专注块内联透明度降为 0.4、专注块保持 1（内联覆盖 CSS 确保生效）', async () => {
    const today = localDateKey(new Date())
    mockStore['hf:clepsydra_time_blocks'] = [
      { id: 'fb4', date: today, startMin: 420, durationMin: 60, category: 'project', title: '专注块', taskId: null, done: false },
      { id: 'ob4', date: today, startMin: 600, durationMin: 60, category: 'study', title: '对照块', taskId: null, done: false },
    ]
    const iso = new Date(Date.now() - 8000).toISOString()
    mockStore['hf:clepsydra_records'] = [
      { id: 'r-run', startedAt: iso, endedAt: null, durationSeconds: 8, category: 'project', sourceType: 'manual', sourceAnchorId: 'fb4', blockId: 'fb4', intensity: 0.7, note: '专注块', createdAt: iso },
    ]
    const wrapper = await mountPanel()
    const blocks = wrapper.findAll('.tbp-block')
    const focusEl = blocks.find(b => b.classes().includes('tbp-block--focusing'))!
    const otherEl = blocks.find(b => !b.classes().includes('tbp-block--focusing'))!
    expect(focusEl.exists()).toBe(true)
    expect(otherEl.exists()).toBe(true)
    // 内联透明度：专注块 1，非专注块 0.4（证明弱化真正生效，而非被 CSS 覆盖）
    expect((focusEl.element as HTMLElement).style.opacity).toBe('1')
    expect((otherEl.element as HTMLElement).style.opacity).toBe('0.4')
  })
})
