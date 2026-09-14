import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const REVIEWS_KEY = 'hf:reading:reviews'
const NOTES_KEY = 'hf:reading:notes'

function seedReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review_1',
    bookId: 'book_活着',
    bookTitle: '活着',
    rating: 5,
    title: '生命的韧性',
    content: '余华用最朴素的笔触写尽苦难，却始终保有希望。',
    hasSpoiler: false,
    recommendationScore: 9,
    targetAudience: [],
    tags: ['文学', '人生'],
    readingTime: '3 小时',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

function seedNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note_1',
    bookId: 'book_活着',
    chapter: '第一章',
    page: 12,
    content: '福贵的名字本身就是一个反讽。',
    type: 'thought',
    relatedNoteIds: [],
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(seed: { reviews?: any[]; notes?: any[] } = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, unknown> = {}
  if (seed.reviews) kvStore[REVIEWS_KEY] = seed.reviews
  if (seed.notes) kvStore[NOTES_KEY] = seed.notes
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../BookReviewsPanel.vue')
  return mount(mod.default)
}

describe('BookReviewsPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无记录时显示空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.brv-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有书评')
  })

  it('渲染书评统计', async () => {
    const wrapper = await mountPanel({ reviews: [seedReview()] })
    expect(wrapper.find('.brv-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('平均评分')
  })

  it('有书评时展示书评卡片', async () => {
    const wrapper = await mountPanel({ reviews: [seedReview()] })
    expect(wrapper.find('.brv-review').exists()).toBe(true)
    expect(wrapper.text()).toContain('活着')
    expect(wrapper.text()).toContain('生命的韧性')
  })

  it('可展开表单并发布书评', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.brv-toggle').trigger('click')
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.brv-input')
    await inputs[0].setValue('百年孤独')
    const textarea = wrapper.find('.brv-textarea')
    await textarea.setValue('魔幻现实主义的巅峰之作。')
    await wrapper.find('.brv-form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.brv-review').exists()).toBe(true)
    expect(wrapper.text()).toContain('百年孤独')
  })

  it('可删除书评', async () => {
    const wrapper = await mountPanel({ reviews: [seedReview()] })
    await wrapper.find('.brv-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.brv-review').exists()).toBe(false)
    expect(wrapper.find('.brv-empty').exists()).toBe(true)
  })

  it('笔记 tab 展示笔记列表', async () => {
    const wrapper = await mountPanel({ notes: [seedNote()] })
    await wrapper.findAll('.brv-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.brv-note').exists()).toBe(true)
    expect(wrapper.text()).toContain('福贵的名字')
  })

  it('可创建笔记', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.brv-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.brv-toggle')[1].trigger('click')
    await wrapper.vm.$nextTick()
    const noteForm = wrapper.findAll('.brv-form')[1]
    const inputs = noteForm.findAll('.brv-input')
    await inputs[0].setValue('围城')
    const textarea = noteForm.find('.brv-textarea')
    await textarea.setValue('婚姻是一座围城。')
    await noteForm.trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.brv-note').exists()).toBe(true)
    expect(wrapper.text()).toContain('婚姻是一座围城')
  })

  it('可删除笔记', async () => {
    const wrapper = await mountPanel({ notes: [seedNote()] })
    await wrapper.findAll('.brv-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.brv-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.brv-note').exists()).toBe(false)
  })
})
