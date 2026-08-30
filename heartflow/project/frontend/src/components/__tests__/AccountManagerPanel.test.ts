import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RewardRecord } from '../../modules/reward/reward-list'

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tool',
    amount: o.amount ?? 10,
    description: '',
    at: '2026-08-01T00:00:00Z',
    ...o,
  }
}
const records = [rec({ id: 'a', type: 'income', account: 'cash', amount: 100 })]

async function mountPanel() {
  const { default: Panel } = await import('../AccountManagerPanel.vue')
  return mount(Panel, { props: { records } })
}

describe('AccountManagerPanel 多账户面板', () => {
  it('渲染标题与副标题', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('多账户')
    expect(w.text()).toContain('分账本记账')
  })

  it('渲染新建账户输入框与新建按钮', async () => {
    const w = await mountPanel()
    expect(w.find('input.amp-input').exists()).toBe(true)
    const btn = w.findAll('button.amp-btn').find(b => b.text() === '新建')
    expect(btn).toBeTruthy()
  })

  it('空账户时显示引导文案', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('还没有账户')
  })
})