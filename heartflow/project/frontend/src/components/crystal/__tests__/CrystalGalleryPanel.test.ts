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
  const mod = await import('../CrystalGalleryPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedCrystals(): any[] {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).crystals ?? []
}

describe('CrystalGalleryPanel 结晶画廊', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('结晶画廊')
    expect(wrapper.text()).toContain('尚无结晶')
  })

  it('展示结晶概览', async () => {
    const wrapper = await mountPanel([
      crystal({ shape: 'sphere', intensity: 0.95 }),
      crystal({ shape: 'octahedron', intensity: 0.6 }),
    ])
    expect(wrapper.text()).toContain('结晶概览')
    expect(wrapper.text()).toContain('完美之晶')
    expect(wrapper.text()).toContain('均强度')
  })

  it('展示结晶列表与形状', async () => {
    const wrapper = await mountPanel([
      crystal({ shape: 'sphere' }),
      crystal({ shape: 'irregular', intensity: 0.2 }),
    ])
    expect(wrapper.text()).toContain('完美之晶')
    expect(wrapper.text()).toContain('残晶')
    expect(wrapper.text()).toContain('心流时刻')
  })

  it('展示标签与感悟', async () => {
    const wrapper = await mountPanel([
      crystal({ tags: ['阅读', '写作'], insight: '沉浸的一小时' }),
    ])
    expect(wrapper.text()).toContain('阅读')
    expect(wrapper.text()).toContain('沉浸的一小时')
  })

  it('删除结晶并持久化', async () => {
    const wrapper = await mountPanel([crystal({ id: 'c_del' })])
    const delBtn = wrapper.find('.cry-btn.danger')
    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedCrystals().length).toBe(0)
    expect(wrapper.text()).toContain('尚无结晶')
  })
})
