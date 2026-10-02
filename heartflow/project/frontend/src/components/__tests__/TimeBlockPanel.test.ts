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
    await wrapper.find('.tbp-input--time').setValue('10:00')
    await (wrapper.findAll('.tbp-input--num')[1]).setValue(45)
    await (wrapper.findAll('.tbp-input')[4]).setValue('晨间复盘')
    await (wrapper.findAll('.tbp-btn--primary')[1]).trigger('click')
    await wrapper.vm.$nextTick()
    const blocks = wrapper.findAll('.tbp-block')
    expect(blocks.length).toBe(1)
    expect(blocks[0].text()).toContain('晨间复盘')
    expect(blocks[0].text()).toContain('10:00')
    expect(wrapper.find('.tbp-form-error').exists()).toBe(false)
  })

  it('手动建块：非法时间显示错误且不生成块', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input--time').setValue('99:99')
    await (wrapper.findAll('.tbp-input')[4]).setValue('坏时间')
    await (wrapper.findAll('.tbp-btn--primary')[1]).trigger('click')
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
