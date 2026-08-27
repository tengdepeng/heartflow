// ============================================================
// 时间线索引 · 全文搜索面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function entry(overrides: Record<string, any> = {}) {
  return {
    indexId: `idx_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: '2026-08-20T08:00:00.000Z',
    type: 'note',
    roomSource: '思绪书房',
    payloadRef: 'ref',
    summary: { snippet: '今天读了一本关于时间的书' },
    weight: 0.7,
    governance: { ageLevel: 1, agedAt: null, archived: false, archivedAt: null, released: false, releasedAt: null, deleted: false },
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

async function mountPanel(entries: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../FullTextSearchPanel.vue')
  const wrapper = mount(mod.default, { props: { entries } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('FullTextSearchPanel 全文搜索', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('全文搜索')
    expect(wrapper.text()).toContain('暂无索引条目可搜索')
  })

  it('搜索命中返回结果', async () => {
    const wrapper = await mountPanel([
      entry({ summary: { snippet: '今天读了一本关于时间的书' } }),
      entry({ summary: { snippet: '去公园散步放松心情' } }),
    ])
    await wrapper.find('input.fts-input').setValue('时间')
    await wrapper.find('button.fts-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('搜索结果')
    expect(wrapper.text()).toContain('关于时间的书')
  })

  it('无命中显示提示', async () => {
    const wrapper = await mountPanel([
      entry({ summary: { snippet: '今天读了一本关于时间的书' } }),
    ])
    await wrapper.find('input.fts-input').setValue('量子纠缠')
    await wrapper.find('button.fts-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('没有找到匹配')
  })

  it('空查询不触发搜索', async () => {
    const wrapper = await mountPanel([
      entry({ summary: { snippet: '今天读了一本关于时间的书' } }),
    ])
    const btn = wrapper.find('button.fts-btn-primary')
    expect((btn.attributes() as any).disabled).toBeDefined()
  })
})
