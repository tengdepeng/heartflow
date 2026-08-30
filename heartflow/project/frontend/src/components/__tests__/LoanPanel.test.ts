// ============================================================
// LoanPanel 借贷/往来面板测试（INCR-25）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { LoanRecord } from '../../modules/reward/loan'
import type { Account } from '../../modules/reward/accounts'

const TODAY = '2026-08-29'

const accounts: Account[] = [
  { id: 'cash', name: '现金', type: 'cash', initialBalance: 0 },
  { id: 'alipay', name: '支付宝', type: 'alipay', initialBalance: 0 },
]

function loan(o: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: o.id ?? 'l1',
    direction: o.direction ?? 'lend',
    counterparty: o.counterparty ?? '小王',
    amount: o.amount ?? 500,
    account: o.account ?? 'cash',
    createdAt: o.createdAt ?? '2026-08-01',
    dueAt: o.dueAt,
    note: o.note,
    settlements: o.settlements ?? [],
  }
}

async function mountPanel(records: LoanRecord[] = [], today = TODAY) {
  const { default: LoanPanel } = await import('../LoanPanel.vue')
  const wrapper = mount(LoanPanel, { props: { records, accounts, today } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('LoanPanel 借贷/往来面板', () => {
  it('渲染标题与说明', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.lnp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('借贷往来')
  })

  it('空记录时显示空提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.lnp-empty').exists()).toBe(true)
  })

  it('净额汇总展示应收/应付/净额', async () => {
    const records = [
      loan({ id: 'a', direction: 'lend', amount: 1000, settlements: [{ id: 's1', amount: 300, at: '2026-08-05' }] }),
      loan({ id: 'b', direction: 'borrow', amount: 600 }),
    ]
    const wrapper = await mountPanel(records)
    const text = wrapper.find('.lnp-summary').text()
    expect(text).toContain('应收')
    expect(text).toContain('700')
    expect(text).toContain('600')
    expect(text).toContain('100')
  })

  it('逾期笔数显示待收/待还徽标', async () => {
    const records = [
      loan({ id: 'a', direction: 'lend', dueAt: '2026-08-01' }),
      loan({ id: 'b', direction: 'borrow', dueAt: '2026-08-01' }),
    ]
    const wrapper = await mountPanel(records)
    const text = wrapper.find('.lnp-summary').text()
    expect(text).toContain('待收 1')
    expect(text).toContain('待还 1')
  })

  it('页签切换只显示对应方向记录', async () => {
    const records = [
      loan({ id: 'a', direction: 'lend', counterparty: '借出对象' }),
      loan({ id: 'b', direction: 'borrow', counterparty: '借入对象' }),
    ]
    const wrapper = await mountPanel(records)
    expect(wrapper.find('.lnp-list').text()).toContain('借出对象')
    expect(wrapper.find('.lnp-list').text()).not.toContain('借入对象')
    await wrapper.findAll('.lnp-tab')[1].trigger('click')
    expect(wrapper.find('.lnp-list').text()).toContain('借入对象')
    expect(wrapper.find('.lnp-list').text()).not.toContain('借出对象')
  })

  it('记录行展示金额/剩余/未结清徽标', async () => {
    const wrapper = await mountPanel([loan({ counterparty: '小王', amount: 500 })])
    const row = wrapper.find('.lnp-row')
    expect(row.text()).toContain('小王')
    expect(row.text()).toContain('500')
    expect(row.text()).toContain('未结清')
  })

  it('已结清记录显示已结清徽标且隐藏结算按钮', async () => {
    const wrapper = await mountPanel([
      loan({ settlements: [{ id: 's1', amount: 500, at: '2026-08-05' }] }),
    ])
    expect(wrapper.find('.lnp-row').text()).toContain('已结清')
    expect(wrapper.find('.lnp-btn--ghost').exists()).toBe(false)
  })

  it('新增借出记一笔触发 create 并携带数据、清空表单', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.lnp-form input[placeholder="对方（人/机构）"]').setValue('老李')
    await wrapper.find('.lnp-form input[placeholder="金额"]').setValue(800)
    await wrapper.find('.lnp-form').trigger('submit')
    const emitted = wrapper.emitted('create') as any[]
    expect(emitted).toBeTruthy()
    const data = emitted[0][0]
    expect(data.direction).toBe('lend')
    expect(data.counterparty).toBe('老李')
    expect(data.amount).toBe(800)
    expect(data.createdAt).toBe(TODAY)
    expect((wrapper.find('.lnp-form input[placeholder="对方（人/机构）"]').element as HTMLInputElement).value).toBe('')
  })

  it('新增借入可切换方向并指定应还日', async () => {
    const wrapper = await mountPanel()
    const select = wrapper.find('.lnp-form .lnp-select')
    await select.setValue('borrow')
    await wrapper.find('.lnp-form input[placeholder="对方（人/机构）"]').setValue('房东')
    await wrapper.find('.lnp-form input[placeholder="金额"]').setValue(2000)
    await wrapper.find('.lnp-form input[title="应还/应收日（可空）"]').setValue('2026-09-01')
    await wrapper.find('.lnp-form').trigger('submit')
    const emitted = wrapper.emitted('create') as any[]
    const data = emitted[0][0]
    expect(data.direction).toBe('borrow')
    expect(data.dueAt).toBe('2026-09-01')
  })

  it('表单无效（缺对方或金额≤0）时不触发 create', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.lnp-form .lnp-btn--primary').trigger('click')
    expect(wrapper.emitted('create')).toBeFalsy()
  })

  it('结算内联表单触发 settle 并携带金额/日期', async () => {
    const wrapper = await mountPanel([loan({ id: 'l1', amount: 500 })])
    await wrapper.find('.lnp-btn--ghost').trigger('click')
    const settleInput = wrapper.find('.lnp-settle input[placeholder="金额"]')
    await settleInput.setValue(200)
    await wrapper.find('.lnp-settle .lnp-btn--primary').trigger('click')
    const emitted = wrapper.emitted('settle') as any[]
    expect(emitted).toBeTruthy()
    const payload = emitted[0][0]
    expect(payload.id).toBe('l1')
    expect(payload.amount).toBe(200)
    expect(payload.at).toBe(TODAY)
  })

  it('删除触发 remove', async () => {
    const wrapper = await mountPanel([loan({ id: 'l1', counterparty: '老李' })])
    await wrapper.find('.lnp-del').trigger('click')
    const emitted = wrapper.emitted('remove') as any[]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('l1')
  })

  it('逾期记录显示逾期天数', async () => {
    const wrapper = await mountPanel([loan({ dueAt: '2026-08-01' })])
    expect(wrapper.find('.lnp-row').text()).toContain('逾期28天')
  })
})
