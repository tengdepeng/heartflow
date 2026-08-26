import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

function crystal(overrides: Record<string, any> = {}) {
  return {
    id: `crystal_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: 's1',
    color: '#a07c8c',
    intensity: 0.9,
    createdAt: '2026-08-25T08:00:00.000Z',
    shape: 'sphere',
    tags: ['阅读'],
    insight: '心流时刻',
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
  const mod = await import('../CrystalArchivePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('CrystalArchivePanel 结晶相性图鉴', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('结晶相性图鉴')
    expect(wrapper.text()).toContain('暂无结晶数据')
  })

  it('展示形状分布', async () => {
    const wrapper = await mountPanel([
      crystal({ shape: 'sphere' }),
      crystal({ shape: 'sphere' }),
      crystal({ shape: 'irregular' }),
    ])
    expect(wrapper.text()).toContain('形状分布')
    expect(wrapper.text()).toContain('完美之晶')
    expect(wrapper.text()).toContain('残晶')
  })

  it('展示标签相性', async () => {
    const wrapper = await mountPanel([
      crystal({ tags: ['阅读'] }),
      crystal({ tags: ['阅读', '写作'] }),
    ])
    expect(wrapper.text()).toContain('标签相性')
    expect(wrapper.text()).toContain('阅读')
    expect(wrapper.text()).toContain('写作')
  })

  it('展示感悟集', async () => {
    const wrapper = await mountPanel([
      crystal({ insight: '专注即修行' }),
      crystal({ insight: '心流可遇不可求' }),
    ])
    expect(wrapper.text()).toContain('感悟集')
    expect(wrapper.text()).toContain('专注即修行')
    expect(wrapper.text()).toContain('心流可遇不可求')
  })

  it('无感悟时提示', async () => {
    const wrapper = await mountPanel([crystal({ insight: null })])
    expect(wrapper.text()).toContain('暂无感悟')
  })
})
