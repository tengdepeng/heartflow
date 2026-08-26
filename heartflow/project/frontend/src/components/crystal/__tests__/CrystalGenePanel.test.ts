import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

function geneCrystal(overrides: Record<string, any> = {}) {
  return {
    id: `crystal_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: 's1',
    color: '#a07c8c',
    intensity: 0.8,
    createdAt: '2026-08-25T08:00:00.000Z',
    shape: 'dodecahedron',
    tags: ['阅读'],
    insight: null,
    geneSeed: {
      version: 1,
      parentId: null,
      generation: 2,
      genes: {
        color: '#a07c8c',
        shape: 'sharp',
        intensity: 0.8,
        luminescence: 0.6,
        complexity: 0.4,
        resilience: 0.7,
      },
      dominance: 0.83,
      mutationRate: 0.12,
    },
    ...overrides,
  }
}

async function mountPanel(crystals: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals,
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CrystalGenePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('CrystalGenePanel 基因谱系', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('基因谱系')
    expect(wrapper.text()).toContain('尚无带基因的结晶')
  })

  it('展示基因概览', async () => {
    const wrapper = await mountPanel([geneCrystal()])
    expect(wrapper.text()).toContain('基因概览')
    expect(wrapper.text()).toContain('最高代际')
    expect(wrapper.text()).toContain('均显性')
  })

  it('展示基因序列与代际', async () => {
    const wrapper = await mountPanel([geneCrystal({ geneSeed: { ...geneCrystal().geneSeed, generation: 3 } })])
    expect(wrapper.text()).toContain('基因序列')
    expect(wrapper.text()).toContain('第 3 代')
    expect(wrapper.text()).toContain('显性')
    expect(wrapper.text()).toContain('突变')
  })

  it('展示基因性状条', async () => {
    const wrapper = await mountPanel([geneCrystal()])
    expect(wrapper.text()).toContain('强度')
    expect(wrapper.text()).toContain('发光')
    expect(wrapper.text()).toContain('复杂度')
    expect(wrapper.text()).toContain('韧性')
  })

  it('忽略无基因的结晶', async () => {
    const wrapper = await mountPanel([
      { id: 'c_plain', sessionId: 's1', color: '#aaa', intensity: 0.5, createdAt: '2026-08-25T00:00:00.000Z', shape: 'sphere', tags: [], insight: null },
    ])
    expect(wrapper.text()).toContain('尚无带基因的结晶')
  })
})
