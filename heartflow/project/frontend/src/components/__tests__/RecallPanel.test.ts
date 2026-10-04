// ============================================================
// 记忆回廊面板 · 每日回顾 + 随机漫游（P2 市面对标 flomo）
// 用 storage mock 注入阅读摘录与照片日记，验证回顾卡渲染、模式切换、
// 漫游换一条与灯箱开合。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const EXCERPT = {
  id: 'e1',
  source: '《心流》',
  text: '专注是幸福的源泉',
  note: '读到此处停了一下',
  createdAt: '2020-01-01T12:00:00.000Z',
  color: '#f0c040',
}

const PHOTO = {
  id: 'p1',
  date: '2020-02-02',
  images: ['FULL_IMG'],
  thumbs: ['THUMB_IMG'],
  captions: [''],
  caption: '旧照片说明',
  createdAt: '2020-02-02T12:00:00.000Z',
}

async function mountPanel(opts: { excerpts?: any[]; photos?: any[] } = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem(
    'heartflow:storage',
    JSON.stringify({
      version: 10,
      kvStore: {
        'hf:reading_excerpts': opts.excerpts ?? [EXCERPT],
        'hf:anchor:photo_diary': opts.photos ?? [PHOTO],
      },
      sessions: [],
      crystals: [],
    }),
  )
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../RecallPanel.vue')
  const wrapper = mount(mod.default, { global: { stubs: { Teleport: true } } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('RecallPanel 记忆回廊', () => {
  it('渲染标题与统计（摘录 1 / 照片 1）', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('记忆回廊')
    expect(wrapper.text()).toContain('条可回顾')
    expect(wrapper.text()).toContain('摘录 1')
    expect(wrapper.text()).toContain('照片 1')
  })

  it('今日回顾同时渲染摘录卡与照片卡', async () => {
    const wrapper = await mountPanel()
    const excerptCard = wrapper.find('[data-test="rcl-card-excerpt"]')
    const photoCard = wrapper.find('[data-test="rcl-card-photo"]')
    expect(excerptCard.exists()).toBe(true)
    expect(photoCard.exists()).toBe(true)
    expect(excerptCard.text()).toContain('《心流》')
    expect(excerptCard.text()).toContain('专注是幸福的源泉')
    expect(photoCard.find('img').attributes('src')).toBe('THUMB_IMG')
  })

  it('切换到随机漫游并换一条仍保留卡片', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-test="rcl-mode-roam"]').trigger('click')
    expect(wrapper.find('.rcl-card--roam').exists()).toBe(true)
    await wrapper.find('[data-test="rcl-reroll"]').trigger('click')
    expect(wrapper.find('.rcl-card--roam').exists()).toBe(true)
  })

  it('点击照片缩略图打开灯箱，点击遮罩关闭', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.rcl-thumb-btn').trigger('click')
    const viewer = wrapper.find('[data-test="rcl-viewer"]')
    expect(viewer.exists()).toBe(true)
    expect(viewer.find('img').attributes('src')).toBe('FULL_IMG')
    await viewer.trigger('click')
    expect(wrapper.find('[data-test="rcl-viewer"]').exists()).toBe(false)
  })

  it('无旧记录时展示空态引导', async () => {
    const wrapper = await mountPanel({ excerpts: [], photos: [] })
    expect(wrapper.text()).toContain('还没有可供回顾的旧记录')
    expect(wrapper.find('.rcl-card').exists()).toBe(false)
  })
})
