// ============================================================
// ComponentMarket 组件市场视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

async function getWrapper() {
  const { default: ComponentMarket } = await import('../ComponentMarket.vue')
  return mount(ComponentMarket, { attachTo: document.body })
}

describe('ComponentMarket 组件市场视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.querySelectorAll('.cm-modal-overlay').forEach(el => el.remove())
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('组件市场')
    expect(wrapper.text()).toContain('可视化组件')
  })

  it('概览卡片显示组件总数', async () => {
    const wrapper = await getWrapper()
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards.length).toBe(3)
    // 第一张卡片：组件总数 10
    expect(overviewCards[0].text()).toContain('10')
    expect(overviewCards[0].text()).toContain('组件总数')
  })

  it('概览卡片显示已启用数量（默认2个）', async () => {
    const wrapper = await getWrapper()
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards[1].text()).toContain('2')
    expect(overviewCards[1].text()).toContain('已启用')
  })

  it('概览卡片显示分类数', async () => {
    const wrapper = await getWrapper()
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards[2].text()).toContain('4')
    expect(overviewCards[2].text()).toContain('分类数')
  })

  it('默认显示所有组件（10个）', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(10)
  })

  it('分类筛选按钮存在', async () => {
    const wrapper = await getWrapper()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    expect(filterBtns.length).toBe(4)
    expect(filterBtns[0].text()).toContain('全部')
    expect(filterBtns[1].text()).toContain('图表')
    expect(filterBtns[2].text()).toContain('示意图')
    expect(filterBtns[3].text()).toContain('小部件')
  })

  it('点击"图表"分类只显示图表类组件', async () => {
    const wrapper = await getWrapper()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    // 点击"图表"（索引1）
    await filterBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    // 图表类组件：折线图、柱状图、环状图、散点图、面积图、瀑布图 = 6个
    expect(cards.length).toBe(6)
    expect(cards[0].text()).toContain('折线图')
    expect(cards[1].text()).toContain('柱状图')
  })

  it('点击"示意图"分类只显示示意图类组件', async () => {
    const wrapper = await getWrapper()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    await filterBtns[2].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    // 示意图类：热力图、雷达图、箱线图 = 3个
    expect(cards.length).toBe(3)
    expect(cards[0].text()).toContain('热力图')
    expect(cards[1].text()).toContain('雷达图')
    expect(cards[2].text()).toContain('箱线图')
  })

  it('点击"小部件"分类只显示小部件类组件', async () => {
    const wrapper = await getWrapper()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    await filterBtns[3].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    // 小部件类：仪表盘 = 1个
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('仪表盘')
  })

  it('点击"全部"后显示所有组件', async () => {
    const wrapper = await getWrapper()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    // 先切换到"图表"再切回"全部"
    await filterBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    await filterBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(10)
  })

  it('默认已启用的组件显示"已启用"文字', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    // 折线图（索引0）默认启用
    const firstLineBtns = cards[0].findAll('.cm-card-btn')
    expect(firstLineBtns[0].text()).toBe('已启用')
    // 环状图（索引2）默认禁用
    const ringBtns = cards[2].findAll('.cm-card-btn')
    expect(ringBtns[0].text()).toBe('启用')
  })

  it('点击"启用"按钮切换组件启用状态', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    // 环状图（索引2）默认禁用，点击启用按钮
    const ringBtns = cards[2].findAll('.cm-card-btn')
    await ringBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    // 状态应切换为"已启用"
    expect(ringBtns[0].text()).toBe('已启用')
    // 概览卡片已启用数应更新为3
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards[1].text()).toContain('3')
  })

  it('点击"已启用"按钮切换回禁用状态', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    // 折线图（索引0）默认启用，点击禁用
    const lineBtns = cards[0].findAll('.cm-card-btn')
    await lineBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(lineBtns[0].text()).toBe('启用')
    // 概览卡片已启用数应更新为1
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards[1].text()).toContain('1')
  })

  it('点击"配置"按钮打开配置弹窗', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    // 折线图（索引0）的配置按钮
    const lineBtns = cards[0].findAll('.cm-card-btn')
    await lineBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    // Teleport 渲染到 body
    const modalOverlay = document.querySelector('.cm-modal-overlay')
    expect(modalOverlay).not.toBeNull()
    expect(modalOverlay!.textContent).toContain('配置')
    expect(modalOverlay!.textContent).toContain('折线图')
  })

  it('配置弹窗显示组件当前配置', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    const lineBtns = cards[0].findAll('.cm-card-btn')
    await lineBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    const modalOverlay = document.querySelector('.cm-modal-overlay')
    expect(modalOverlay).not.toBeNull()
    // 默认尺寸为"中"
    expect(modalOverlay!.textContent).toContain('组件尺寸')
    expect(modalOverlay!.textContent).toContain('中')
    // 默认显示图例：是
    expect(modalOverlay!.textContent).toContain('显示图例')
    // 默认显示网格：是
    expect(modalOverlay!.textContent).toContain('显示网格')
    // 默认动画：开
    expect(modalOverlay!.textContent).toContain('动画效果')
  })

  it('点击弹窗遮罩关闭配置弹窗', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    const lineBtns = cards[0].findAll('.cm-card-btn')
    await lineBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    // 点击遮罩关闭
    const modalOverlay = document.querySelector('.cm-modal-overlay') as HTMLElement
    expect(modalOverlay).not.toBeNull()
    modalOverlay.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.cm-modal-overlay')).toBeNull()
  })

  it('点击"完成"按钮关闭配置弹窗', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    const lineBtns = cards[0].findAll('.cm-card-btn')
    await lineBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    // 点击"完成"按钮
    const doneBtn = document.querySelector('.cm-modal-btn--primary') as HTMLElement
    expect(doneBtn).not.toBeNull()
    doneBtn.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.cm-modal-overlay')).toBeNull()
  })

  it('每个组件卡片显示名称、描述和标签', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    // 检查第一个组件卡片
    expect(cards[0].text()).toContain('折线图')
    expect(cards[0].text()).toContain('展示数据随时间或顺序的变化趋势')
    expect(cards[0].text()).toContain('chart')
    expect(cards[0].text()).toContain('medium')
  })

  it('每个组件卡片有SVG预览', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.cm-card')
    for (const card of cards) {
      const svg = card.find('.cm-preview-svg')
      expect(svg.exists()).toBe(true)
    }
  })
})