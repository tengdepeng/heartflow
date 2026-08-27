// ============================================================
// 时间线索引 · 聚合视图面板测试
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
    summary: { snippet: '一条索引摘要' },
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
  const mod = await import('../AggregationPanel.vue')
  const wrapper = mount(mod.default, { props: { entries } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('AggregationPanel 聚合视图', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('聚合视图')
    expect(wrapper.text()).toContain('聚合粒度')
    expect(wrapper.text()).toContain('当前时间范围内没有索引条目')
  })

  it('展示聚合概览', async () => {
    const wrapper = await mountPanel([
      entry(),
      entry({ timestamp: '2026-08-20T10:00:00.000Z' }),
      entry({ timestamp: '2026-08-21T08:00:00.000Z', type: 'emotion' }),
    ])
    expect(wrapper.text()).toContain('聚合概览')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('类型分布')
  })

  it('切换粒度到按月', async () => {
    const wrapper = await mountPanel([
      entry({ timestamp: '2026-08-20T08:00:00.000Z' }),
      entry({ timestamp: '2026-07-10T08:00:00.000Z' }),
    ])
    const monthBtn = wrapper.findAll('button.ag-gran-btn').find(b => b.text() === '按月')
    expect(monthBtn).toBeTruthy()
    await monthBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('2026年8月')
  })

  it('展示峰值与低谷', async () => {
    const wrapper = await mountPanel([
      entry({ timestamp: '2026-08-20T08:00:00.000Z' }),
      entry({ timestamp: '2026-08-20T10:00:00.000Z' }),
      entry({ timestamp: '2026-08-21T08:00:00.000Z' }),
    ])
    expect(wrapper.text()).toContain('峰值')
    expect(wrapper.text()).toContain('低谷')
    expect(wrapper.text()).toContain('最活跃')
  })
})
