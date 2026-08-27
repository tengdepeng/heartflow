// ============================================================
// 时间长廊 · 事件关联面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function entry(overrides: Record<string, any> = {}) {
  return {
    indexId: `e_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: '2026-08-20T08:00:00.000Z',
    type: 'note',
    roomSource: 'study',
    payloadRef: 'note_1',
    summary: { snippet: '一篇时间线笔记' },
    weight: 1,
    governance: {
      ageLevel: 1,
      agedAt: null,
      archived: false,
      archivedAt: null,
      released: true,
      releasedAt: '2026-08-20T08:00:00.000Z',
      deleted: false,
    },
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
  const mod = await import('../EventLinkagePanel.vue')
  const wrapper = mount(mod.default, { props: { entries } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('EventLinkagePanel 事件关联', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('事件关联')
    expect(wrapper.text()).toContain('暂无时间线条目')
  })

  it('展示事件链', async () => {
    const wrapper = await mountPanel([
      entry({ type: 'emotion', roomSource: 'emotion', summary: { snippet: '心情低落' }, timestamp: '2026-08-20T08:00:00.000Z' }),
      entry({ type: 'note', roomSource: 'emotion', summary: { snippet: '写下反思' }, timestamp: '2026-08-20T09:00:00.000Z' }),
    ])
    expect(wrapper.text()).toContain('事件链')
    expect(wrapper.text()).toContain('因果')
    expect(wrapper.text()).toContain('心情低落')
  })

  it('切换事件簇页签', async () => {
    const wrapper = await mountPanel([
      entry({ timestamp: '2026-08-20T08:00:00.000Z' }),
      entry({ timestamp: '2026-08-20T08:30:00.000Z' }),
    ])
    const clusterTab = wrapper.findAll('.el-tab')[1]
    await clusterTab.trigger('click')
    expect(wrapper.text()).toContain('事件簇')
    expect(wrapper.text()).toContain('分')
  })

  it('无条目时不产生链', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('事件链（0）')
  })
})
