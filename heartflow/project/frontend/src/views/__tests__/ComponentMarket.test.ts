// ============================================================
// ComponentMarket 组件市场视图测试
// ------------------------------------------------------------
// INCR-435：视图由「硬编码假组件」改为消费真实注册表
// （component-market 13 个内置组件 + kvStore 持久化），故断言阈值
// 与分类构成随之更新，并新增持久化类用例。
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const MARKET_KEY = 'hf:viz_component_market'

/** 每次挂载都重置模块注册表（模块级 Map），避免用例间状态串味 */
async function mountView(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: { ...kv },
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const { default: ComponentMarket } = await import('../ComponentMarket.vue')
  const wrapper = mount(ComponentMarket, { attachTo: document.body })
  await wrapper.vm.$nextTick()
  return wrapper
}

/** 读回落盘的组件市场状态 */
function storedMarket(): Record<string, any> {
  const raw = JSON.parse(localStorage.getItem('heartflow:storage') || '{}')
  return raw?.kvStore?.[MARKET_KEY] ?? {}
}

/** 打开某张卡片的配置弹窗 */
async function openConfigOf(wrapper: any, cardIndex: number) {
  const cards = wrapper.findAll('.cm-card')
  const btns = cards[cardIndex].findAll('.cm-card-btn')
  await btns[1].trigger('click')
  await wrapper.vm.$nextTick()
  return document.querySelector('.cm-modal-overlay') as HTMLElement
}

describe('ComponentMarket 组件市场视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.querySelectorAll('.cm-modal-overlay').forEach(el => el.remove())
  })

  it('渲染标题和描述', async () => {
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('组件市场')
    expect(wrapper.text()).toContain('可视化组件')
  })

  it('概览卡片显示组件总数（真实注册表 13 个）', async () => {
    const wrapper = await mountView()
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards.length).toBe(3)
    expect(overviewCards[0].text()).toContain('13')
    expect(overviewCards[0].text()).toContain('组件总数')
  })

  it('概览卡片显示已启用数量（内置默认 line/bar/stats-card = 3）', async () => {
    const wrapper = await mountView()
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards[1].text()).toContain('3')
    expect(overviewCards[1].text()).toContain('已启用')
  })

  it('概览卡片显示分类数（全部 + 图表 + 示意图 + 小部件）', async () => {
    const wrapper = await mountView()
    const overviewCards = wrapper.findAll('.cm-overview-card')
    expect(overviewCards[2].text()).toContain('4')
    expect(overviewCards[2].text()).toContain('分类数')
  })

  it('默认显示全部 13 个内置组件', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(13)
  })

  it('分类筛选按钮存在且带图标', async () => {
    const wrapper = await mountView()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    expect(filterBtns.length).toBe(4)
    expect(filterBtns[0].text()).toContain('全部')
    expect(filterBtns[1].text()).toContain('图表')
    expect(filterBtns[2].text()).toContain('示意图')
    expect(filterBtns[3].text()).toContain('小部件')
  })

  it('点击"图表"分类只显示 7 个图表类组件', async () => {
    const wrapper = await mountView()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    await filterBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(7)
    expect(cards[0].text()).toContain('折线图')
    expect(cards[1].text()).toContain('柱状图')
    expect(cards[5].text()).toContain('瀑布图')
    // 引擎把箱线图归为 chart（视图硬编码时期曾被误标为 diagram）
    expect(cards[6].text()).toContain('箱线图')
  })

  it('点击"示意图"分类显示 3 个（含此前从未露面的桑基图）', async () => {
    const wrapper = await mountView()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    await filterBtns[2].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(3)
    expect(cards[0].text()).toContain('热力图')
    expect(cards[1].text()).toContain('雷达图')
    expect(cards[2].text()).toContain('桑基图')
  })

  it('点击"小部件"分类显示 3 个（含时间线与统计卡片）', async () => {
    const wrapper = await mountView()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    await filterBtns[3].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(3)
    expect(cards[0].text()).toContain('时间线')
    expect(cards[1].text()).toContain('仪表盘')
    expect(cards[2].text()).toContain('统计卡片')
  })

  it('点击"全部"后恢复显示全部组件', async () => {
    const wrapper = await mountView()
    const filterBtns = wrapper.findAll('.cm-filter-btn')
    await filterBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    await filterBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(13)
  })

  it('默认已启用的组件显示"已启用"文字', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('.cm-card')
    // 折线图（索引0）内置启用
    expect(cards[0].findAll('.cm-card-btn')[0].text()).toBe('已启用')
    // 环状图（索引2）内置未启用
    expect(cards[2].findAll('.cm-card-btn')[0].text()).toBe('启用')
  })

  it('点击"启用"按钮切换组件启用状态并更新已启用数', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('.cm-card')
    await cards[2].findAll('.cm-card-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(cards[2].findAll('.cm-card-btn')[0].text()).toBe('已启用')
    expect(wrapper.findAll('.cm-overview-card')[1].text()).toContain('4')
  })

  it('点击"已启用"按钮切换回禁用状态', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('.cm-card')
    await cards[0].findAll('.cm-card-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(cards[0].findAll('.cm-card-btn')[0].text()).toBe('启用')
    expect(wrapper.findAll('.cm-overview-card')[1].text()).toContain('2')
  })

  it('启用状态落盘，重挂载后仍然生效', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('.cm-card')
    await cards[2].findAll('.cm-card-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedMarket()['ring-chart'].enabled).toBe(true)

    // 模拟刷新：沿用同一份 kvStore 重新挂载
    const saved = storedMarket()
    const wrapper2 = await mountView({ [MARKET_KEY]: saved })
    expect(wrapper2.findAll('.cm-overview-card')[1].text()).toContain('4')
    expect(wrapper2.findAll('.cm-card')[2].findAll('.cm-card-btn')[0].text()).toBe('已启用')
  })

  it('点击"配置"按钮打开配置弹窗', async () => {
    const wrapper = await mountView()
    const modal = await openConfigOf(wrapper, 0)
    expect(modal).not.toBeNull()
    expect(modal.textContent).toContain('配置')
    expect(modal.textContent).toContain('折线图')
  })

  it('配置弹窗显示组件当前配置（默认中尺寸/图例是/网格是/动画开）', async () => {
    const wrapper = await mountView()
    const modal = await openConfigOf(wrapper, 0)
    expect(modal.textContent).toContain('组件尺寸')
    expect(modal.textContent).toContain('中')
    expect(modal.textContent).toContain('显示图例')
    expect(modal.textContent).toContain('显示网格')
    expect(modal.textContent).toContain('动画效果')
  })

  it('点击遮罩关闭配置弹窗', async () => {
    const wrapper = await mountView()
    const modal = await openConfigOf(wrapper, 0)
    modal.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.cm-modal-overlay')).toBeNull()
  })

  it('点击"完成"按钮关闭配置弹窗', async () => {
    const wrapper = await mountView()
    await openConfigOf(wrapper, 0)
    const doneBtn = document.querySelector('.cm-modal-btn--primary') as HTMLElement
    expect(doneBtn).not.toBeNull()
    doneBtn.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.cm-modal-overlay')).toBeNull()
  })

  it('配置改动经"完成"回流到组件并落盘（INCR-435：此前改动从未保存）', async () => {
    const wrapper = await mountView()
    await openConfigOf(wrapper, 0)
    // 尺寸改为「大」
    const select = document.querySelector('.cm-config-select') as HTMLSelectElement
    select.value = 'large'
    select.dispatchEvent(new Event('change'))
    await wrapper.vm.$nextTick()
    // 图例改为「否」
    const legendBtns = document.querySelectorAll('.cm-config-toggle')[0].querySelectorAll('.cm-toggle-btn')
    ;(legendBtns[1] as HTMLElement).click()
    await wrapper.vm.$nextTick()
    // 保存
    const doneBtn = document.querySelector('.cm-modal-btn--primary') as HTMLElement
    doneBtn.click()
    await wrapper.vm.$nextTick()

    expect(storedMarket()['line-chart'].size).toBe('large')
    expect(storedMarket()['line-chart'].showLegend).toBe(false)
    // 卡片上的尺寸标签同步更新
    expect(wrapper.findAll('.cm-card')[0].text()).toContain('large')
  })

  it('每个组件卡片显示名称、描述和标签', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('.cm-card')
    expect(cards[0].text()).toContain('折线图')
    expect(cards[0].text()).toContain('展示数据随时间或顺序的变化趋势')
    expect(cards[0].text()).toContain('chart')
    expect(cards[0].text()).toContain('medium')
  })

  it('每个组件卡片都有非空 SVG 预览（含新增的桑基图/时间线/统计卡片）', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('.cm-card')
    expect(cards.length).toBe(13)
    for (const card of cards) {
      const svg = card.find('.cm-preview-svg')
      expect(svg.exists()).toBe(true)
      // 有实际绘制内容，而非空 svg
      expect(svg.element.children.length).toBeGreaterThan(0)
    }
  })

  it('先启用另一组件后再配置该组件，改动仍回流（复现真机重渲染后首开弹窗保存失效）', async () => {
    const wrapper = await mountView()
    // 先启用环状图（索引 2）触发 revision++ 重渲染
    let cards = wrapper.findAll('.cm-card')
    await cards[2].findAll('.cm-card-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    cards = wrapper.findAll('.cm-card')
    // 打开折线图（索引 0）配置
    await cards[0].findAll('.cm-card-btn')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.cm-modal-overlay')).not.toBeNull()
    // 显示图例 → 否
    const legendBtns = document.querySelectorAll('.cm-config-toggle')[0].querySelectorAll('.cm-toggle-btn')
    ;(legendBtns[1] as HTMLElement).click()
    await wrapper.vm.$nextTick()
    // 完成
    ;(document.querySelector('.cm-modal-btn--primary') as HTMLElement).click()
    await wrapper.vm.$nextTick()
    expect(storedMarket()['line-chart'].showLegend).toBe(false)
  })
})
