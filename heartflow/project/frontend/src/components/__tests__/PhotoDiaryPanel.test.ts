// ============================================================
// 逐日心锚 · 照片日记面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function entry(overrides: Record<string, any> = {}) {
  return {
    id: `pd_${Math.random().toString(36).slice(2, 8)}`,
    date: '2026-08-20',
    images: ['data:image/png;base64,AAAA'],
    caption: '今天的天空',
    createdAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

async function mountPanel(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../PhotoDiaryPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('PhotoDiaryPanel 照片日记', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('照片日记')
    expect(wrapper.text()).toContain('还没有照片日记')
  })

  it('展示预置照片', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB'] }),
        entry({ date: '2026-08-19', images: ['data:image/png;base64,CCCC'], caption: '晨光' }),
      ],
    })
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('照片')
    expect(wrapper.text()).toContain('今天的天空')
    expect(wrapper.text()).toContain('晨光')
  })

  it('删除照片并持久化', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB'] }),
      ],
    })
    await wrapper.find('.pd-img-remove').trigger('click')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:anchor:photo_diary'][0].images.length).toBe(1)
  })
})
