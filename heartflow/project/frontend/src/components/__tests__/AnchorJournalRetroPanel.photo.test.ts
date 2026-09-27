// ============================================================
// 逐日心锚 · 手札回溯面板 · 照片手札渲染（P2）
// 用 storage mock 注入照片日记，验证缩略图回显与点击放大。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function photoEntry() {
  return {
    id: 'pd_x',
    date: '2026-08-20',
    images: ['data:image/png;base64,AAAA'],
    thumbs: ['data:image/png;base64,THUMB'],
    captions: [''],
    caption: '',
    createdAt: '2026-08-20T08:00:00.000Z',
  }
}

async function mountRetro(journals: any[], photoStore: any[] = [photoEntry()]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem(
    'heartflow:storage',
    JSON.stringify({
      version: 10,
      kvStore: { 'hf:anchor:photo_diary': photoStore },
      sessions: [],
      crystals: [],
    }),
  )
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../AnchorJournalRetroPanel.vue')
  const wrapper = mount(mod.default, {
    props: { journals },
    global: { stubs: { Teleport: true } },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('AnchorJournalRetroPanel 照片手札渲染（P2）', () => {
  it('带 photoRef 的手札渲染缩略图（src 指向照片日记 thumb）', async () => {
    const wrapper = await mountRetro([
      {
        anchorId: 'a1',
        content: '📷 照片手札 · 2026-08-20 · 第 1 张',
        photoRef: [{ date: '2026-08-20', index: 0 }],
        createdAt: '2026-08-20T08:00:00.000Z',
        updatedAt: '2026-08-20T08:00:00.000Z',
      },
    ])
    expect(wrapper.find('[data-test="ajr-photos"]').exists()).toBe(true)
    const img = wrapper.find('[data-test="ajr-photo"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('data:image/png;base64,THUMB')
  })

  it('点击缩略图打开放大查看（src 指向照片日记原图）', async () => {
    const wrapper = await mountRetro([
      {
        anchorId: 'a1',
        content: '📷 照片手札',
        photoRef: [{ date: '2026-08-20', index: 0 }],
        createdAt: '2026-08-20T08:00:00.000Z',
        updatedAt: '2026-08-20T08:00:00.000Z',
      },
    ])
    await wrapper.find('[data-test="ajr-photo"]').trigger('click')
    const viewer = wrapper.find('.ajr-photo-viewer')
    expect(viewer.exists()).toBe(true)
    expect(viewer.find('.ajr-photo-viewer-img').attributes('src')).toBe('data:image/png;base64,AAAA')
  })

  it('无 photoRef 的手札不渲染照片卡片', async () => {
    const wrapper = await mountRetro([
      {
        anchorId: 'a2',
        content: '纯文本手札',
        createdAt: '2026-08-20T08:00:00.000Z',
        updatedAt: '2026-08-20T08:00:00.000Z',
      },
    ])
    expect(wrapper.find('[data-test="ajr-photos"]').exists()).toBe(false)
  })
})
