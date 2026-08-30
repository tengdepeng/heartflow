// ============================================================
// CreditCardPanel 信用卡/负债面板测试（INCR-26）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CreditCardRecord } from '../../modules/reward/credit-card'

const TODAY = '2026-08-29'

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

async function mountPanel(records: CreditCardRecord[] = [], today = TODAY) {
  const { default: CreditCardPanel } = await import('../CreditCardPanel.vue')
  const wrapper = mount(CreditCardPanel, { props: { records, today } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('CreditCardPanel 信用卡/负债面板', () => {
  it('渲染标题与说明', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.ccd-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('信用卡')
  })

  it('空记录时显示空提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.ccd-empty').exists()).toBe(true)
  })

  it('负债口径汇总展示总额度/可用/最低还款', async () => {
    const records = [
      card({ id: 'a', openingBalance: 3000, repaymentDay: 10 }),
      card({ id: 'b', kind: 'debt', creditLimit: undefined, openingBalance: 2000, repaymentDay: 30 }),
    ]
    const wrapper = await mountPanel(records)
    const text = wrapper.find('.ccd-summary').text()
    expect(text).toContain('负债总额')
    expect(text).toContain('5000')
    expect(text).toContain('可用额度')
    expect(text).toContain('7000')
    expect(text).toContain('最低还款')
  })

  it('逾期/将到期计入提醒徽标', async () => {
    const records = [
      card({ id: 'a', repaymentDay: 10 }), // 已过 → 逾期
      card({ id: 'b', repaymentDay: 31 }), // 本月 31 号 → 2 天内将到期
    ]
    const wrapper = await mountPanel(records)
    const text = wrapper.find('.ccd-summary').text()
    expect(text).toContain('逾期 1')
    expect(text).toContain('张将到期')
  })

  it('页签切换只显示对应性质账户', async () => {
    const records = [
      card({ id: 'a', name: '招行卡', kind: 'credit' }),
      card({ id: 'b', name: '装修贷', kind: 'debt', creditLimit: undefined }),
    ]
    const wrapper = await mountPanel(records)
    expect(wrapper.find('.ccd-list').text()).toContain('招行卡')
    expect(wrapper.find('.ccd-list').text()).not.toContain('装修贷')
    await wrapper.findAll('.ccd-tab')[1].trigger('click')
    expect(wrapper.find('.ccd-list').text()).toContain('装修贷')
    expect(wrapper.find('.ccd-list').text()).not.toContain('招行卡')
  })

  it('记录行展示额度/已用/可用/还款日与状态', async () => {
    const wrapper = await mountPanel([card({ name: '招行卡', creditLimit: 10000, openingBalance: 3000, repaymentDay: 30 })])
    const row = wrapper.find('.ccd-row')
    expect(row.text()).toContain('招行卡')
    expect(row.text()).toContain('额度 ¥10000')
    expect(row.text()).toContain('已用 ¥3000')
    expect(row.text()).toContain('可用 ¥7000')
    expect(row.text()).toContain('每期 30 日')
  })

  it('逾期记录显示逾期天数', async () => {
    const wrapper = await mountPanel([card({ repaymentDay: 10 })])
    expect(wrapper.find('.ccd-row').text()).toContain('已逾期 19 天')
  })

  it('已还清记录显示已还清且隐藏还款按钮', async () => {
    const wrapper = await mountPanel([card({ repayments: [{ id: 'r1', amount: 99999, at: '2026-08-15' }] })])
    expect(wrapper.find('.ccd-row').text()).toContain('已还清')
    expect(wrapper.findAll('.ccd-btn--ghost').some(b => b.text().includes('还款'))).toBe(false)
  })

  it('新增信用卡触发 create 并携带数据、清空表单', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('form.ccd-form input[placeholder="名称（如 招行卡）"]').setValue('工行卡')
    await wrapper.find('form.ccd-form input[placeholder="额度"]').setValue(20000)
    await wrapper.find('form.ccd-form input[placeholder="期初已用/欠款"]').setValue(5000)
    await wrapper.find('form.ccd-form').trigger('submit')
    const emitted = wrapper.emitted('create') as any[]
    expect(emitted).toBeTruthy()
    const data = emitted[0][0]
    expect(data.name).toBe('工行卡')
    expect(data.kind).toBe('credit')
    expect(data.creditLimit).toBe(20000)
    expect(data.openingBalance).toBe(5000)
    expect((wrapper.find('form.ccd-form input[placeholder="名称（如 招行卡）"]').element as HTMLInputElement).value).toBe('')
  })

  it('新增负债忽略额度字段', async () => {
    const wrapper = await mountPanel()
    const select = wrapper.find('form.ccd-form select')
    await select.setValue('debt')
    await wrapper.find('form.ccd-form input[placeholder="名称（如 招行卡）"]').setValue('装修贷')
    await wrapper.find('form.ccd-form input[placeholder="期初已用/欠款"]').setValue(8000)
    await wrapper.find('form.ccd-form').trigger('submit')
    const data = (wrapper.emitted('create') as any[])[0][0]
    expect(data.kind).toBe('debt')
    expect(data.creditLimit).toBeUndefined()
  })

  it('表单无效（缺名称或金额≤0）时不触发 create', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('form.ccd-form .ccd-btn--primary').trigger('click')
    expect(wrapper.emitted('create')).toBeFalsy()
  })

  it('还款内联表单触发 repay 并携带金额', async () => {
    const wrapper = await mountPanel([card({ id: 'c1', openingBalance: 500 })])
    const repayBtn = wrapper.findAll('.ccd-btn--ghost').find(b => b.text().includes('还款'))!
    await repayBtn.trigger('click')
    const input = wrapper.find('.ccd-repay input[placeholder="金额"]')
    await input.setValue(200)
    await wrapper.find('.ccd-repay .ccd-btn--primary').trigger('click')
    const emitted = wrapper.emitted('repay') as any[]
    expect(emitted).toBeTruthy()
    const payload = emitted[0][0]
    expect(payload.id).toBe('c1')
    expect(payload.amount).toBe(200)
    expect(payload.at).toBe(TODAY)
  })

  it('还款计划表单触发 plan 事件', async () => {
    const wrapper = await mountPanel([card({ id: 'c1', openingBalance: 12000 })])
    const planBtn = wrapper.findAll('.ccd-btn--ghost').find(b => b.text().includes('计划'))!
    await planBtn.trigger('click')
    await wrapper.find('.ccd-plan-form input').setValue(3000)
    await wrapper.find('.ccd-plan-form .ccd-btn--primary').trigger('click')
    const emitted = wrapper.emitted('plan') as any[]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({ id: 'c1', planMonthly: 3000 })
  })

  it('删除触发 remove', async () => {
    const wrapper = await mountPanel([card({ id: 'c1', name: '招行' })])
    await wrapper.find('.ccd-del').trigger('click')
    const emitted = wrapper.emitted('remove') as any[]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('c1')
  })
})
