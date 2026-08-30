// ============================================================
// PeriodicRewardPanel 测试 - 周期性收支分析（记账完善）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RewardRecord } from '../../modules/reward/types'

function rec(o: Record<string, any> = {}) {
  const { type, category, amount, description, recordedAt } = o
  return {
    id: o.id ?? `r${Math.random().toString(36).slice(2, 7)}`,
    type: (type ?? 'income') as 'income' | 'expense',
    category: (category ?? 'salary') as RewardRecord['category'],
    amount: amount ?? 0,
    description: description ?? '',
    recordedAt: recordedAt ?? '2026-07-10T08:00:00.000Z',
  } as RewardRecord
}

const records = [
  rec({ type: 'income', category: 'salary', amount: 15000, description: '月薪', recordedAt: '2026-07-10T08:00:00.000Z' }),
  rec({ type: 'expense', category: 'tools', amount: 500, description: '工具', recordedAt: '2026-07-20T10:00:00.000Z' }),
  rec({ type: 'income', category: 'freelance', amount: 3000, description: '外包', recordedAt: '2026-08-05T08:00:00.000Z' }),
  rec({ type: 'expense', category: 'learning', amount: 1200, description: '课程', recordedAt: '2026-08-18T10:00:00.000Z' }),
]

async function mountPanel(list: typeof records = records) {
  const { default: PeriodicRewardPanel } = await import('../PeriodicRewardPanel.vue')
  const wrapper = mount(PeriodicRewardPanel, { props: { records: list } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('PeriodicRewardPanel 周期性收支面板', () => {
  it('空记录不渲染面板', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.find('.prp-panel').exists()).toBe(false)
  })

  it('渲染标题与收支对比总览', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('周期性收支')
    expect(wrapper.text()).toContain('收入')
    expect(wrapper.text()).toContain('支出')
    expect(wrapper.text()).toContain('结余')
    expect(wrapper.text()).toContain('16,300')
    expect(wrapper.text()).toContain('收支比')
    expect(wrapper.text()).toContain('10.59')
  })

  it('默认月周期展示各月收支明细', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('2026-07')
    expect(wrapper.text()).toContain('2026-08')
    expect(wrapper.text()).toContain('15,000')
    expect(wrapper.text()).toContain('500')
    expect(wrapper.text()).toContain('3,000')
    expect(wrapper.text()).toContain('1,200')
  })

  it('展示最佳与最差周期', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('结余最好的 月')
    expect(wrapper.text()).toContain('2026-07')
    expect(wrapper.text()).toContain('结余最紧的 月')
    expect(wrapper.text()).toContain('2026-08')
  })

  it('切换日周期展示按日明细', async () => {
    const wrapper = await mountPanel()
    ;(wrapper.vm as any).periodType = 'daily'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('2026-07-10')
    expect(wrapper.text()).toContain('2026-08-18')
  })

  it('切换周期时周期切换按钮渲染五种粒度', async () => {
    const wrapper = await mountPanel()
    const tabs = wrapper.findAll('.prp-tab')
    expect(tabs.length).toBe(5)
    expect(tabs[0].text()).toContain('日')
    expect(tabs[2].text()).toContain('月')
    expect(tabs[4].text()).toContain('年')
  })
})