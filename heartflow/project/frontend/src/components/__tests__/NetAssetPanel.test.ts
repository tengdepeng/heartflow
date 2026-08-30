// ============================================================
// NetAssetPanel 资产负债净资产面板测试（INCR-27）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Account } from '../../modules/reward/accounts'
import type { CreditCardRecord } from '../../modules/reward/credit-card'

const TODAY = '2026-08-29'

function acc(o: Partial<Account>): Account {
  return { id: 'cash', name: '现金', type: 'cash', initialBalance: 0, note: undefined, ...o }
}
function card(o: Partial<CreditCardRecord> = {}): CreditCardRecord {
  return {
    id: o.id ?? 'c1',
    name: o.name ?? '招行卡',
    kind: o.kind ?? 'credit',
    creditLimit: o.creditLimit ?? 10000,
    openingBalance: o.openingBalance ?? 3000,
    repaymentDay: o.repaymentDay ?? 10,
    planMonthly: o.planMonthly,
    note: o.note,
    repayments: o.repayments ?? [],
  }
}

async function mountPanel(opts: Partial<{ accounts: Account[]; cards: CreditCardRecord[]; today: string }> = {}) {
  const { default: NetAssetPanel } = await import('../NetAssetPanel.vue')
  const wrapper = mount(NetAssetPanel, {
    props: {
      accounts: opts.accounts ?? [acc({ id: 'cash', name: '现金', initialBalance: 5000 })],
      records: [],
      transfers: [],
      cards: opts.cards ?? [],
      today: opts.today ?? TODAY,
    },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('NetAssetPanel 资产负债净资产面板', () => {
  it('渲染标题与说明', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.na-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('资产负债净资产')
  })

  it('仪表盘展示净资产=资产−负债', async () => {
    const wrapper = await mountPanel({ accounts: [acc({ id: 'cash', name: '现金', initialBalance: 10000 })], cards: [card({ openingBalance: 3000 })] })
    const dash = wrapper.find('.na-dash').text()
    expect(dash).toContain('净资产')
    expect(dash).toContain('7,000')
    expect(dash).toContain('资产总额')
    expect(dash).toContain('10,000')
    expect(dash).toContain('负债总额')
    expect(dash).toContain('3,000')
  })

  it('资产/负债分列展示账户与卡片明细', async () => {
    const wrapper = await mountPanel({
      accounts: [
        acc({ id: 'cash', name: '现金', initialBalance: 5000 }),
        acc({ id: 'bank', name: '银行', type: 'bank', initialBalance: 20000 }),
      ],
      cards: [card({ id: 'a', name: '招行卡', openingBalance: 3000 }), card({ id: 'b', name: '车贷', kind: 'debt', creditLimit: undefined, openingBalance: 2000 })],
    })
    const assetCol = wrapper.find('.na-col-title--asset').element.closest('.na-col')!.textContent!
    expect(assetCol).toContain('现金')
    expect(assetCol).toContain('银行')
    expect(assetCol).not.toContain('招行卡')
    const liabCol = wrapper.find('.na-col-title--liab').element.closest('.na-col')!.textContent!
    expect(liabCol).toContain('招行卡')
    expect(liabCol).toContain('车贷')
    expect(liabCol).toContain('信用卡')
    expect(liabCol).toContain('负债')
  })

  it('负债为 0 时资产覆盖显示 —', async () => {
    const wrapper = await mountPanel({ accounts: [acc({ initialBalance: 3000 })] })
    expect(wrapper.find('.na-dash').text()).toContain('—')
  })

  it('净资产为负时高亮并提示', async () => {
    const wrapper = await mountPanel({ accounts: [acc({ id: 'x', name: '借支', initialBalance: 1000 })], cards: [card({ openingBalance: 5000 })] })
    const main = wrapper.find('.na-dash-main')
    expect(main.classes()).toContain('neg')
    expect(main.text()).toContain('资不抵债')
  })

  it('渲染趋势柱（含负值当期为 0 高）', async () => {
    const wrapper = await mountPanel({ accounts: [acc({ id: 'cash', name: '现金', initialBalance: 10000 })] })
    const cols = wrapper.findAll('.na-trend-col')
    expect(cols.length).toBe(6)
    const last = cols[cols.length - 1]
    expect(last.find('.na-trend-label').text()).toBe('8月')
  })

  it('空资产与空负债均给出空提示', async () => {
    const wrapper = await mountPanel({ accounts: [] })
    expect(wrapper.text()).toContain('暂无资产账户')
    expect(wrapper.text()).toContain('暂无负债')
  })
})