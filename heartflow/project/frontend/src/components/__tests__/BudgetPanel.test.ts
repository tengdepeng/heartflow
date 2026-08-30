// ============================================================
// BudgetPanel 预算进阶面板测试（INCR-28）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const store: Record<string, unknown> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, d?: unknown) => store[k] ?? d,
    setKV: (k: string, v: unknown) => { store[k] = v },
  },
}))

import type { RewardRecord } from '../../modules/reward/reward-list'
import type { Transfer } from '../../modules/reward/accounts'

const MONTH = '2026-08'
const TODAY = '2026-08-29'
const KEY = 'hf:reward_budget_advance'

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tools',
    amount: o.amount ?? 10,
    description: '',
    at: o.at ?? '2026-08-05T00:00:00Z',
    ...o,
  }
}
const records = [
  rec({ amount: 3000, at: '2026-08-05T00:00:00Z' }),
  rec({ amount: 4000, at: '2026-07-05T00:00:00Z' }),
]
const transfers: Transfer[] = []

async function mountPanel() {
  const { default: Panel } = await import('../BudgetPanel.vue')
  return mount(Panel, { props: { records, transfers, month: MONTH, today: TODAY } })
}

describe('BudgetPanel 预算进阶面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store[KEY] = undefined
  })

  it('渲染标题与口径切换', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('预算进阶')
    expect(w.find('.ba2-mode select').exists()).toBe(true)
  })

  it('未设定预算时显示 0 与达标', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('本月总预算')
    expect(w.text()).toContain('本年度预算')
    expect(w.text()).toContain('达标')
  })

  it('设定月度总预算后卡片更新且落库', async () => {
    const w = await mountPanel()
    const mForm = w.findAll('.ba2-form')[0]
    mForm.find('input').element.value = '10000'
    await mForm.find('input').trigger('input')
    await w.vm.$nextTick()
    await mForm.trigger('submit')
    await w.vm.$nextTick()
    const card = w.findAll('.ba2-card')[0]
    // 预算 ¥10,000，本月支出 ¥3,000 → 剩余 ¥7,000
    expect(card.text()).toContain('7,000')
    expect(card.text()).toContain('预算 ¥10,000')
    expect(store[KEY]).toMatchObject({ monthlyLimit: 10000 })
  })

  it('日均动态展示剩余日均可用与已花日均', async () => {
    const w = await mountPanel()
    const mForm = w.findAll('.ba2-form')[0]
    mForm.find('input').element.value = '10000'
    await mForm.find('input').trigger('input')
    await w.vm.$nextTick()
    await mForm.trigger('submit')
    await w.vm.$nextTick()
    const card = w.findAll('.ba2-card')[0]
    expect(card.text()).toContain('剩余日均可用')
    // remaining 7000 ÷ 剩 2 天 = 3500
    expect(card.text()).toContain('¥3,500')
    expect(card.text()).toContain('剩 2 天')
    expect(card.text()).toContain('本月日均已花')
  })

  it('开启结余结转后显示上月结转并并入额度', async () => {
    store[KEY] = { monthlyLimit: 10000, annualLimit: 0, rollover: true }
    const w = await mountPanel()
    const card = w.findAll('.ba2-card')[0]
    // 上月支出 4000 → 结余 6000 结转，本月已支 3000
    expect(card.text()).toContain('6,000')
    expect(card.text()).toContain('上月未用结余') // 文案提示
  })

  it('超支后月度剩余高亮负态', async () => {
    store[KEY] = { monthlyLimit: 1000, annualLimit: 0, rollover: false }
    const w = await mountPanel()
    const big = w.findAll('.ba2-big-val')[0]
    // 已支 3000 > 预算 1000 → 剩余 0，状态超支
    expect(big.classes()).toContain('neg')
    expect(w.text()).toContain('超支')
  })

  it('设定年度总预算并展示剩余与月均', async () => {
    const w = await mountPanel()
    const yForm = w.findAll('.ba2-form')[1]
    yForm.find('input').element.value = '120000'
    await yForm.find('input').trigger('input')
    await w.vm.$nextTick()
    await yForm.trigger('submit')
    await w.vm.$nextTick()
    const yCard = w.findAll('.ba2-card')[1]
    expect(yCard.text()).toContain('年度 ¥120,000')
    expect(yCard.text()).toContain('月均 ¥10,000')
    expect(store[KEY]).toMatchObject({ annualLimit: 120000 })
  })
})