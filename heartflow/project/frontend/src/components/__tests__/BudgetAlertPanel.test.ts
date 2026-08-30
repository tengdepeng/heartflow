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
import type { Budget } from '../../modules/reward/types'
import type { Transfer } from '../../modules/reward/accounts'

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tools',
    amount: o.amount ?? 10,
    description: '',
    at: o.at ?? '2026-08-01T00:00:00Z',
    ...o,
  }
}

const records = [
  rec({ category: 'tools', amount: 180, at: '2026-08-05T00:00:00Z' }),
  rec({ category: 'learning', amount: 50, at: '2026-08-06T00:00:00Z' }),
  rec({ category: 'tools', amount: 40, at: '2026-07-30T00:00:00Z' }),
]
const transfers: Transfer[] = [
  { id: 't', from: 'cash', to: 'alipay', amount: 60, at: '2026-08-02T00:00:00Z' },
]
const prebudgets: Budget[] = [
  { id: 'b1', category: 'tools', monthlyLimit: 200, currentSpent: 0, month: '2026-08' },
]

async function mountPanel() {
  const { default: Panel } = await import('../BudgetAlertPanel.vue')
  return mount(Panel, { props: { records, transfers, month: '2026-08' } })
}

describe('BudgetAlertPanel 预算预警面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store['hf:reward_budgets'] = JSON.parse(JSON.stringify(prebudgets))
  })

  it('渲染标题与口径切换', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('预算预警')
    expect(w.find('.ba-mode select').exists()).toBe(true)
  })

  it('展示本月支出与总流出', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('230') // 本月支出（180 tools + 50 learning）
    expect(w.text()).toContain('60') // 账户转出
  })

  it('展示预算类别进度（tools 180/200 = 接近）', async () => {
    const w = await mountPanel()
    const labels = w.findAll('.ba-name').map(n => n.text())
    expect(labels).toContain('工具')
    const status = w.findAll('.ba-status').map(s => s.text())
    expect(status).toContain('接近')
  })

  it('切换到含转账口径后总流出包含转出', async () => {
    const w = await mountPanel()
    const select = w.find('.ba-mode select')
    await select.setValue('withTransfer')
    const total = w.findAll('.ba-outflow-total b').map(b => b.text())
    expect(total[0]).toBe('¥290') // 230 + 60
  })

  it('无预算时显示引导文案', async () => {
    store['hf:reward_budgets'] = []
    const w = await mountPanel()
    expect(w.text()).toContain('本月还没有预算')
  })
})