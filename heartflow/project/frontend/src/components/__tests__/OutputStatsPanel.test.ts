// ============================================================
// 输出管理 · 输出统计面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function record(overrides: Record<string, any> = {}) {
  return {
    id: `or_${Math.random().toString(36).slice(2, 8)}`,
    type: 'note',
    content: '一篇输出记录',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    roomSource: '思绪书房',
    status: 'published',
    ...overrides,
  }
}

async function mountPanel(records: any[] = []) {
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
  const mod = await import('../OutputStatsPanel.vue')
  const wrapper = mount(mod.default, { props: { records } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('OutputStatsPanel 输出统计', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('输出统计')
    expect(wrapper.text()).toContain('暂无输出记录')
  })

  it('展示总体概览', async () => {
    const wrapper = await mountPanel([
      record({ type: 'note', intensity: 0.6 }),
      record({ type: 'emotion', intensity: 0.8 }),
    ])
    expect(wrapper.text()).toContain('总记录')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('0.7')
  })

  it('展示类型分布', async () => {
    const wrapper = await mountPanel([
      record({ type: 'note' }),
      record({ type: 'note' }),
      record({ type: 'emotion' }),
    ])
    expect(wrapper.text()).toContain('类型分布')
    expect(wrapper.text()).toContain('笔记')
    expect(wrapper.text()).toContain('情绪')
  })

  it('展示热门房间', async () => {
    const wrapper = await mountPanel([
      record({ roomSource: '思绪书房' }),
      record({ roomSource: '思绪书房' }),
      record({ roomSource: '情绪花房' }),
    ])
    expect(wrapper.text()).toContain('热门房间')
    expect(wrapper.text()).toContain('思绪书房')
    expect(wrapper.text()).toContain('情绪花房')
  })

  it('展示月度趋势', async () => {
    const wrapper = await mountPanel([
      record({ createdAt: '2026-08-01T08:00:00.000Z' }),
      record({ createdAt: '2026-08-02T08:00:00.000Z' }),
      record({ createdAt: '2026-07-15T08:00:00.000Z' }),
    ])
    expect(wrapper.text()).toContain('月度趋势')
    expect(wrapper.text()).toContain('08')
    expect(wrapper.text()).toContain('07')
  })
})
