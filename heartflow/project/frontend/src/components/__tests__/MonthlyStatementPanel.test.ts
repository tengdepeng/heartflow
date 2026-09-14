import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RewardRecord } from '../../modules/reward/reward-list'

// 面板默认月份取系统当前月：钉时到 2026-08，使「默认本月」断言与样例数据一致，
// 避免测试随实际日期漂移（9 月运行时默认月落在 2026-09，样例 8 月数据被归入上月）。
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function rec(o: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: o.id ?? 'r',
    type: o.type ?? 'expense',
    category: o.category ?? 'tools',
    amount: o.amount ?? 1,
    description: '',
    at: o.at ?? '2026-08-01T00:00:00Z',
    ...o,
  }
}

const records: RewardRecord[] = [
  rec({ id: 'a', type: 'income', category: 'salary', amount: 1000, at: '2026-08-05T00:00:00Z' }),
  rec({ id: 'b', type: 'expense', category: 'tools', amount: 100, at: '2026-08-06T00:00:00Z' }),
  rec({ id: 'c', type: 'expense', category: 'tools', amount: 50, at: '2026-08-07T00:00:00Z' }),
  rec({ id: 'd', type: 'expense', category: 'learning', amount: 30, at: '2026-07-30T00:00:00Z' }), // 上月
]

async function mountPanel() {
  const { default: P } = await import('../MonthlyStatementPanel.vue')
  return mount(P, { props: { records } })
}

describe('MonthlyStatementPanel', () => {
  it('渲染标题与月份选择器', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('月结单')
    expect(w.find('input[type="month"]').exists()).toBe(true)
  })

  it('汇总当月（默认本月 2026-08）收支与结余', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('¥1,000')
    expect(w.text()).toContain('¥150')
    expect(w.text()).toContain('¥850')
  })

  it('显示支出类别 TOP', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('支出类别 TOP')
    expect(w.text()).toContain('工具')
  })

  it('存在导出按钮', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('导出 Markdown')
    expect(w.text()).toContain('导出 CSV')
  })

  it('切换到无记录月份显示引导', async () => {
    const w = await mountPanel()
    await w.find('input[type="month"]').setValue('2026-09')
    expect(w.text()).toContain('暂无记录')
  })
})