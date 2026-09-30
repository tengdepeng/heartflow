// ============================================================
// 书房（笔记房间）· R1 房间聚合 + R2 结构化字段回显 单测
// 闭环「语丝产数据 → 书房消费」：验证按房间聚合（roomId）与
// 笔记卡片/详情对 due / 执行人 / 优先级 的回显（语丝方案 14 落库字段）。
// ============================================================

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Note, TimeCrystal } from '../../../types'

const testNotes: Note[] = [
  {
    id: 'n1', title: '书房笔记', content: '在书房记的', tags: ['a'],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    roomId: 'study', priority: 'high', due: '2026-10-01', assignee: '张三',
  },
  {
    id: 'n2', title: '客厅笔记', content: '在客厅记的', tags: ['b'],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    roomId: 'living-room',
  },
  {
    id: 'n3', title: '未归房笔记', content: '没指定房间', tags: ['c'],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

vi.mock('../../../engine/storage', () => ({
  storage: {
    getNotes: () => testNotes,
    getCrystals: (): TimeCrystal[] => [],
  },
}))

async function getWrapper() {
  const { default: StudyRoom } = await import('../StudyRoom.vue')
  return mount(StudyRoom)
}

describe('StudyRoom · R1 房间聚合', () => {
  it('默认按标签视图：3 个分类（按 tag 聚合）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.bookshelf-category')).toHaveLength(3)
    const names = wrapper.findAll('.category-name').map((e) => e.text())
    expect(names).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })

  it('切换「按房间」后按 roomId 聚合，未归房独立成组', async () => {
    const wrapper = await getWrapper()
    const roomBtn = wrapper
      .findAll('.view-toggle__btn')
      .find((b) => b.text().includes('按房间'))!
    await roomBtn.trigger('click')
    await nextTick()

    const cats = wrapper.findAll('.bookshelf-category')
    expect(cats).toHaveLength(3)

    // 「未归房」硬编码桶存在，且只收无 roomId 的笔记
    const noneCat = cats.find((c) => c.find('.category-name')?.text() === '未归房')
    expect(noneCat).toBeTruthy()
    expect(noneCat!.text()).toContain('未归房笔记')

    const noneTitles = noneCat!.findAll('.book-title').map((e) => e.text())
    expect(noneTitles).not.toContain('书房笔记')
    expect(noneTitles).not.toContain('客厅笔记')
  })
})

describe('StudyRoom · R2 结构化字段回显', () => {
  it('卡片对 高优先级+截止+执行人 显示结构化标记', async () => {
    const wrapper = await getWrapper()
    const meta = wrapper.find('.book-meta')
    expect(meta.exists()).toBe(true)
    expect(meta.text()).toContain('高')
    expect(meta.text()).toContain('@张三')
    expect(meta.text()).toContain('2026')
  })

  it('点击笔记打开详情，回显 房间/截止/执行/优先级', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.book-item').trigger('click')
    await nextTick()

    const struct = wrapper.find('.detail-struct')
    expect(struct.exists()).toBe(true)
    expect(struct.text()).toContain('截止')
    expect(struct.text()).toContain('@张三')
    expect(struct.text()).toContain('高')
  })
})
