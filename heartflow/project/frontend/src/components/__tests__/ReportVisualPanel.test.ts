// ============================================================
// ReportVisualPanel 报表可视化面板测试（INCR-29）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RewardRecord } from '../../modules/reward/reward-list'

const TODAY = '2026-08-29'

function rec(o: Partial<RewardRecord>): RewardRecord {
  return { id: 'r', type: 'expense', category: 'social', amount: 100, description: '', at: '2026-08-10', account: undefined, ...o }
}

async function mountPanel(records: RewardRecord[] = []) {
  const { default: ReportVisualPanel } = await import('../ReportVisualPanel.vue')
  const wrapper = mount(ReportVisualPanel, { props: { records, today: TODAY } })
  await wrapper.vm.$nextTick()
  return wrapper
}

async function switchTab(wrapper: ReturnType<typeof mountPanel> extends Promise<infer R> ? R : never, label: string) {
  const btn = wrapper.findAll('.rv-tab').find((w) => w.text() === label)
  await btn!.trigger('click')
  await wrapper.vm.$nextTick()
}

describe('ReportVisualPanel 报表可视化面板', () => {
  it('渲染标题与五个视图切换', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.rv-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('报表可视化')
    const labels = wrapper.findAll('.rv-tab').map((w) => w.text())
    expect(labels).toEqual(['对比', '占比', '趋势', '排行', '热力'])
  })

  it('对比视图展示本月收支与环比/同比', async () => {
    const records = [
      rec({ type: 'income', amount: 2000, at: '2026-08-05' }),
      rec({ type: 'expense', amount: 300, at: '2026-08-20' }),
      rec({ type: 'expense', amount: 600, at: '2026-07-01' }),
    ]
    const wrapper = await mountPanel(records)
    const txt = wrapper.text()
    expect(txt).toContain('收入')
    expect(txt).toContain('2,000')
    // 支出 300 vs 上月 600 → -50%
    expect(txt).toContain('-50.0%')
  })

  it('占比视图按类型展示分类与占比', async () => {
    const records = [
      rec({ category: 'social', amount: 300 }),
      rec({ category: 'learning', amount: 100 }),
    ]
    const wrapper = await mountPanel(records)
    await switchTab(wrapper, '占比')
    const txt = wrapper.text()
    expect(txt).toContain('支出占比')
    // 20% 为 learning 占比（100/400）
    expect(txt).toContain('25%')
  })

  it('排行视图展示排行行', async () => {
    const records = [
      rec({ category: 'social', amount: 300 }),
      rec({ category: 'social', amount: 100 }),
      rec({ category: 'learning', amount: 50 }),
    ]
    const wrapper = await mountPanel(records)
    await switchTab(wrapper, '排行')
    const rows = wrapper.findAll('.rv-rank-row')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('社交')
    expect(rows[0].text()).toContain('2 笔')
  })

  it('趋势视图渲染 SVG 与标题', async () => {
    const records = [rec({ type: 'expense', amount: 100, at: '2026-08-01' })]
    const wrapper = await mountPanel(records)
    await switchTab(wrapper, '趋势')
    expect(wrapper.find('svg.rv-line').exists()).toBe(true)
    expect(wrapper.text()).toContain('近 12 月收支')
  })

  it('热力视图渲染年度网格与空态友好', async () => {
    const records = [
      rec({ type: 'expense', amount: 120, at: '2026-08-10' }),
    ]
    const wrapper = await mountPanel(records)
    await switchTab(wrapper, '热力')
    expect(wrapper.text()).toContain('2026')
    const cells = wrapper.findAll('.rv-heat-cell')
    expect(cells.length).toBeGreaterThan(300) // 12×?：周列×7，全网格充足
    expect(wrapper.text()).toContain('活跃 1 天')
    expect(wrapper.text()).toContain('120')
  })

  it('空数据：对比/占比/排行均友好空态，不报错', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.find('.rv-metric').exists()).toBe(true)
    await switchTab(wrapper, '占比')
    expect(wrapper.find('.rv-empty').exists()).toBe(true)
  })
})