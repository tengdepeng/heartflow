// ============================================================
// RecurringPanel 周期记账面板测试（INCR-22）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RecurringRule } from '../../modules/reward/recurring'

function rule(o: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: o.id ?? 'r1',
    name: o.name ?? '房租',
    type: o.type ?? 'expense',
    amount: o.amount ?? 3000,
    category: o.category ?? 'social',
    account: o.account ?? 'cash',
    freq: o.freq ?? 'monthly',
    interval: o.interval ?? 1,
    startAt: o.startAt ?? '2026-01-05',
    active: o.active ?? true,
    nextRunAt: o.nextRunAt ?? '2026-08-20',
  }
}

async function mountPanel(rules: RecurringRule[] = [], opts: { today?: string } = {}) {
  const { default: RecurringPanel } = await import('../RecurringPanel.vue')
  const wrapper = mount(RecurringPanel, {
    props: { rules, accounts: [{ id: 'cash', name: '现金', type: 'cash', initialBalance: 0 }], today: opts.today },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('RecurringPanel 周期记账面板', () => {
  it('渲染标题与说明', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.rcp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('周期记账')
  })

  it('无规则时展示空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('还没有周期规则')
  })

  it('展示到期规则（入账/跳过按钮）', async () => {
    const wrapper = await mountPanel([rule({ name: '房租', amount: 3000, nextRunAt: '2026-08-20' })], { today: '2026-08-29' })
    expect(wrapper.text()).toContain('到期待入账')
    expect(wrapper.text()).toContain('房租')
    expect(wrapper.text()).toContain('¥3,000')
    expect(wrapper.find('.rcp-due-row .rcp-btn').text()).toContain('入账')
    expect(wrapper.find('.rcp-due-row .rcp-btn--ghost').text()).toContain('跳过')
  })

  it('未来到期规则不入待入账区', async () => {
    const wrapper = await mountPanel([rule({ nextRunAt: '2026-09-01' })], { today: '2026-08-29' })
    expect(wrapper.find('.rcp-due').exists()).toBe(false)
  })

  it('规则列表展示频率与金额，停用规则置灰', async () => {
    const wrapper = await mountPanel([
      rule({ id: 'a', name: '工资', type: 'income', amount: 12000, freq: 'monthly' }),
      rule({ id: 'b', name: '视频会员', type: 'expense', amount: 25, freq: 'yearly', active: false }),
    ])
    expect(wrapper.text()).toContain('工资')
    expect(wrapper.text()).toContain('¥12,000')
    expect(wrapper.text()).toContain('每月')
    expect(wrapper.text()).toContain('每年')
    expect(wrapper.find('.rcp-row--off').exists()).toBe(true)
  })

  it('提交表单触发 create:rule', async () => {
    const wrapper = await mountPanel()
    const vm = wrapper.vm as any
    vm.form.name = '房贷'
    vm.form.type = 'expense'
    vm.form.amount = 5000
    vm.form.category = 'social'
    vm.form.account = 'cash'
    vm.form.freq = 'monthly'
    vm.form.interval = 1
    vm.form.startAt = '2026-09-01'
    await wrapper.find('.rcp-form').trigger('submit')
    const emitted = wrapper.emitted('create:rule')
    expect(emitted).toBeTruthy()
    const payload = (emitted![0] as any)[0]
    expect(payload.name).toBe('房贷')
    expect(payload.amount).toBe(5000)
    expect(payload.freq).toBe('monthly')
    expect(payload.startAt).toBe('2026-09-01')
    expect(payload.active).toBe(true)
  })

  it('点击停用/启用触发 update:rule', async () => {
    const wrapper = await mountPanel([rule({ id: 'a', active: true })])
    await wrapper.find('.rcp-btn--icon').trigger('click')
    const emitted = wrapper.emitted('update:rule') as any[]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({ id: 'a', patch: { active: false } })
  })

  it('点击删除触发 remove:rule', async () => {
    const wrapper = await mountPanel([rule({ id: 'a' })])
    await wrapper.find('.rcp-del').trigger('click')
    const emitted = wrapper.emitted('remove:rule') as any[]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('a')
  })

  it('点击入账触发 apply:rule 并携带规则', async () => {
    const r = rule({ id: 'a', nextRunAt: '2026-08-20' })
    const wrapper = await mountPanel([r], { today: '2026-08-29' })
    await wrapper.find('.rcp-due-row .rcp-btn').trigger('click')
    const emitted = wrapper.emitted('apply:rule') as any[]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0].id).toBe('a')
  })

  it('点击跳过触发 skip:rule', async () => {
    const wrapper = await mountPanel([rule({ id: 'a', nextRunAt: '2026-08-20' })], { today: '2026-08-29' })
    await wrapper.find('.rcp-due-row .rcp-btn--ghost').trigger('click')
    const emitted = wrapper.emitted('skip:rule') as any[]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0].id).toBe('a')
  })

  it('账户选项显示账户名（传入 accounts）', async () => {
    const wrapper = await mountPanel()
    const opts = wrapper.findAll('.rcp-form select.rcp-select')[2].findAll('option')
    expect(opts.some(o => o.text().includes('现金'))).toBe(true)
  })
})
