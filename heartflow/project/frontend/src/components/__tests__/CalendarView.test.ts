// ============================================================
// CalendarView 组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// 模拟 storage
const mockGetSessions = vi.fn()

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => mockGetSessions(...args),
  },
}))

async function getWrapper() {
  const { default: CalendarView } = await import('../CalendarView.vue')
  return mount(CalendarView)
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 's1',
    status: 'completed',
    mode: 'focus',
    elapsed: 1500000, // 25 min
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    tags: ['学习'],
    note: '完成了数学作业',
    plannedDuration: 1500000,
    pausedDuration: 0,
    pausedAt: null,
    carrierId: null,
    ...overrides,
  }
}

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessions.mockReturnValue([])
  })

  it('渲染月份标题', async () => {
    const wrapper = await getWrapper()
    const now = new Date()
    const titleText = `${now.getFullYear()}年${now.getMonth() + 1}月`
    expect(wrapper.text()).toContain(titleText)
  })

  it('显示上个月和下个月导航按钮', async () => {
    const wrapper = await getWrapper()
    const navBtns = wrapper.findAll('.nav-btn')
    expect(navBtns).toHaveLength(2)
    expect(navBtns[0].attributes('title')).toBe('上个月')
    expect(navBtns[1].attributes('title')).toBe('下个月')
  })

  it('渲染星期表头（日一三四五六）', async () => {
    const wrapper = await getWrapper()
    const cells = wrapper.findAll('.weekday-cell')
    expect(cells).toHaveLength(7)
    const labels = cells.map(c => c.text())
    expect(labels).toEqual(['日', '一', '二', '三', '四', '五', '六'])
  })

  it('渲染日期网格', async () => {
    const wrapper = await getWrapper()
    const dayCells = wrapper.findAll('.day-cell')
    // 至少 28 天（最少月份天数），加上 padding 至少 35 个
    expect(dayCells.length).toBeGreaterThanOrEqual(28)
    expect(dayCells.length).toBeLessThanOrEqual(42)
  })

  it('当前月份显示"今天"徽章', async () => {
    const wrapper = await getWrapper()
    const badge = wrapper.find('.today-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('今天')
  })

  it('非当前月份不显示"今天"徽章', async () => {
    const wrapper = await getWrapper()
    // 点击上个月导航
    const prevBtn = wrapper.findAll('.nav-btn')[0]
    await prevBtn.trigger('click')
    const badge = wrapper.find('.today-badge')
    expect(badge.exists()).toBe(false)
  })

  it('点击上个月导航切换月份', async () => {
    const wrapper = await getWrapper()
    const now = new Date()
    // 如果是 1 月，上个月是去年 12 月
    const prevBtn = wrapper.findAll('.nav-btn')[0]
    await prevBtn.trigger('click')
    const expectedMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const expectedYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    expect(wrapper.text()).toContain(`${expectedYear}年${expectedMonth}月`)
  })

  it('点击下个月导航切换月份', async () => {
    const wrapper = await getWrapper()
    const now = new Date()
    // 如果是 12 月，下个月是明年 1 月
    const nextBtn = wrapper.findAll('.nav-btn')[1]
    await nextBtn.trigger('click')
    const expectedMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
    const expectedYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
    expect(wrapper.text()).toContain(`${expectedYear}年${expectedMonth}月`)
  })

  it('点击月份标题回到今天', async () => {
    const wrapper = await getWrapper()
    const now = new Date()
    // 先切换到上个月
    const prevBtn = wrapper.findAll('.nav-btn')[0]
    await prevBtn.trigger('click')
    // 再点击月份标题回到今天
    const title = wrapper.find('.month-title')
    await title.trigger('click')
    expect(wrapper.text()).toContain(`${now.getFullYear()}年${now.getMonth() + 1}月`)
    // 今天徽章重新出现
    const badge = wrapper.find('.today-badge')
    expect(badge.exists()).toBe(true)
  })

  it('点击日期选中并显示记录', async () => {
    const today = new Date()
    mockGetSessions.mockReturnValue([
      makeSession({
        id: 's1',
        startedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
        completedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 25).toISOString(),
        tags: ['学习'],
        note: '完成了数学作业',
        elapsed: 1500000,
      }),
    ])
    const wrapper = await getWrapper()
    // 点击今天的日期单元格
    const todayCell = wrapper.find('.day-cell.today')
    expect(todayCell.exists()).toBe(true)
    await todayCell.trigger('click')
    // 检查是否显示记录详情
    expect(wrapper.text()).toContain('完成')
    expect(wrapper.text()).toContain('25分钟')
  })

  it('选中日期后显示日期详情标题', async () => {
    const today = new Date()
    mockGetSessions.mockReturnValue([
      makeSession({ id: 's1', elapsed: 1500000 }),
    ])
    const wrapper = await getWrapper()
    const todayCell = wrapper.find('.day-cell.today')
    await todayCell.trigger('click')
    // 日期格式：YYYY-MM-DD
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(wrapper.text()).toContain(dateStr)
  })

  it('选中日期但无记录时显示空状态', async () => {
    mockGetSessions.mockReturnValue([])
    const wrapper = await getWrapper()
    const todayCell = wrapper.find('.day-cell.today')
    await todayCell.trigger('click')
    expect(wrapper.text()).toContain('这天还没有专注记录哦')
  })
})