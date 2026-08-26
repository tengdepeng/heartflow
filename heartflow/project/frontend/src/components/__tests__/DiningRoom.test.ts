// ============================================================
// DiningRoom 组件测试
// 深夜食堂 · 餐桌意象 · 暖橙 3000K
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

interface NoteRecord {
  id: string
  title?: string
  content?: string
  createdAt: string
  tags?: string[]
}

let notesData: NoteRecord[] = []

vi.mock('../../engine/storage', () => ({
  storage: {
    getNotes: () => notesData,
    getKV: (_key: string, def: unknown) => def,
    setKV: () => {},
  },
}))

async function getWrapper() {
  const { default: DiningRoom } = await import('../home/DiningRoom.vue')
  return mount(DiningRoom)
}

describe('DiningRoom 餐厅组件', () => {
  beforeEach(() => {
    notesData = []
  })

  it('渲染标题和副标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('餐厅')
    expect(wrapper.text()).toContain('深夜食堂')
    expect(wrapper.text()).toContain('围桌而坐')
  })

  it('渲染餐桌意象区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.table-section').exists()).toBe(true)
    expect(wrapper.find('.table-surface').exists()).toBe(true)
  })

  it('渲染三支蜡烛', async () => {
    const wrapper = await getWrapper()
    const candles = wrapper.findAll('.table-candle')
    expect(candles.length).toBe(3)
  })

  it('渲染餐桌诗文', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('深夜的餐桌')
    expect(wrapper.text()).toContain('一碗热汤')
  })

  it('渲染今日餐桌区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.today-table').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日餐桌')
  })

  it('渲染灵犀炖煮卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('灵犀炖煮')
    expect(wrapper.text()).toContain('去厨房看看')
  })

  it('无笔记时显示空状态', async () => {
    notesData = []
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('今日餐桌尚空')
    expect(wrapper.find('.table-empty').exists()).toBe(true)
  })

  it('有今日笔记时显示笔记卡片', async () => {
    const today = new Date().toISOString().slice(0, 10)
    notesData = [
      { id: '1', title: '测试笔记', content: '这是一段测试内容用来验证笔记卡片渲染', createdAt: `${today}T10:30:00Z` },
      { id: '2', title: '第二篇', content: '另一段内容', createdAt: `${today}T14:20:00Z` },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.table-empty').exists()).toBe(false)
    const noteCards = wrapper.findAll('.note-card')
    expect(noteCards.length).toBe(2)
    expect(wrapper.text()).toContain('测试笔记')
    expect(wrapper.text()).toContain('第二篇')
  })

  it('笔记内容过长时截断显示', async () => {
    const today = new Date().toISOString().slice(0, 10)
    notesData = [
      { id: '1', title: '长笔记', content: '这是一段非常长的测试内容用来验证超过六十个字符时的截断显示效果', createdAt: `${today}T10:30:00Z` },
    ]
    const wrapper = await getWrapper()
    const excerpt = wrapper.find('.note-excerpt')
    expect(excerpt.exists()).toBe(true)
    expect(excerpt.text().length).toBeLessThanOrEqual(61) // 60 + '…'
  })

  it('渲染访客说明区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('访客可见')
    expect(wrapper.text()).toContain('餐厅是家中开放的公共空间')
  })

  it('渲染三个导航按钮', async () => {
    const wrapper = await getWrapper()
    const navBtns = wrapper.findAll('.nav-btn')
    expect(navBtns.length).toBe(3)
    expect(navBtns[0].text()).toContain('走向厨房')
    expect(navBtns[1].text()).toContain('走向客厅')
    expect(navBtns[2].text()).toContain('走向庭院')
  })

  it('点击导航按钮触发 navigate 事件', async () => {
    const wrapper = await getWrapper()
    const navBtns = wrapper.findAll('.nav-btn')
    await navBtns[0].trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
    expect(wrapper.emitted('navigate')![0]).toEqual(['kitchen'])

    await navBtns[1].trigger('click')
    expect(wrapper.emitted('navigate')![1]).toEqual(['living-room'])

    await navBtns[2].trigger('click')
    expect(wrapper.emitted('navigate')![2]).toEqual(['yard'])
  })

  it('去厨房看看按钮触发导航', async () => {
    const wrapper = await getWrapper()
    const goBtn = wrapper.find('.today-go-btn')
    await goBtn.trigger('click')
    expect(wrapper.emitted('navigate')![0]).toEqual(['kitchen'])
  })

  it('渲染氛围背景层', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.dining-atmos').exists()).toBe(true)
    expect(wrapper.find('.atmos-table-glow').exists()).toBe(true)
    expect(wrapper.find('.atmos-corner-warm').exists()).toBe(true)
  })

  it('渲染头部装饰线', async () => {
    const wrapper = await getWrapper()
    const ornaments = wrapper.findAll('.header-ornament')
    expect(ornaments.length).toBe(2)
  })
})