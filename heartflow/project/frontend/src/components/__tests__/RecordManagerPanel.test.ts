import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RewardRecord } from '../../modules/reward/reward-list'

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
  rec({ id: 'a', amount: 50, account: 'cash', tags: ['工作'], at: '2026-08-01T00:00:00Z' }),
  rec({ id: 'b', amount: 20, account: 'alipay', tags: ['生活'], at: '2026-08-02T00:00:00Z' }),
  rec({ id: 'c', amount: 10, account: 'cash', tags: ['工作'], archived: true, at: '2026-08-03T00:00:00Z' }),
  rec({ id: 'd', type: 'income', amount: 100, category: 'salary', account: 'cash', at: '2026-08-04T00:00:00Z' }),
]

async function mountPanel(extra = {}) {
  const { default: P } = await import('../RecordManagerPanel.vue')
  return mount(P, { props: { records, ...extra } })
}

describe('RecordManagerPanel', () => {
  it('显示记录总数（默认隐藏归档 → 计数不含归档）', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('3 条')
  })

  it('默认隐藏归档记录', async () => {
    const w = await mountPanel()
    expect(w.text()).not.toContain('↩ 恢复')
    // 归档的 c 不会出现在列表中
    expect(w.find('.rmp-row').exists()).toBe(true)
  })

  it('存在标签筛选项', async () => {
    const w = await mountPanel()
    const sel = w.find('select.rmp-tag')
    expect(sel.exists()).toBe(true)
    expect(sel.text()).toContain('工作')
    expect(sel.text()).toContain('生活')
  })

  it('存在账户筛选项', async () => {
    const w = await mountPanel()
    const sel = w.find('select.rmp-account')
    expect(sel.exists()).toBe(true)
    expect(sel.text()).toContain('cash')
    expect(sel.text()).toContain('alipay')
  })

  it('存在排序选择', async () => {
    const w = await mountPanel()
    expect(w.find('select.rmp-sort').exists()).toBe(true)
  })

  it('按标签筛选后仅显示对应记录', async () => {
    const w = await mountPanel()
    await w.find('select.rmp-tag').setValue('生活')
    expect(w.text()).toContain('1 条')
    expect(w.text()).toContain('alipay')
  })

  it('勾选含归档后显示归档记录并可恢复', async () => {
    const w = await mountPanel()
    await w.find('.rmp-archive input').setValue(true)
    expect(w.text()).toContain('↩ 恢复')
  })

  it('点击归档/恢复触发 update:records', async () => {
    const w = await mountPanel({})
    await w.find('.rmp-archive input').setValue(true)
    const alipayRow = w.findAll('.rmp-row').find(row => row.text().includes('alipay'))!
    await alipayRow.find('.rmp-archive-btn').trigger('click')
    const emitted = w.emitted('update:records')
    expect(emitted).toBeTruthy()
    const list = emitted![0][0] as RewardRecord[]
    // 未归档记录 b 被切为归档
    expect(list.find(x => x.id === 'b')!.archived).toBe(true)
  })

  it('空记录显示占位文案', async () => {
    const w = await mountPanel()
    await w.setProps({ records: [] })
    expect(w.text()).toContain('没有符合条件的记录')
  })
})