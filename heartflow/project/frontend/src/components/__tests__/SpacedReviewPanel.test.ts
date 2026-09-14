import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const REVIEWS_KEY = 'hf:word_mirror:review_sessions'

const seedWords = [
  {
    id: 'w1',
    word: '希望',
    definition: '心中所愿',
    proficiency: 3,
    favorite: false,
    createdAt: new Date().toISOString(),
    lastReviewedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'w2',
    word: '坚持',
    definition: '持续不放弃',
    proficiency: 2,
    favorite: false,
    createdAt: new Date().toISOString(),
    lastReviewedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
]

async function mountPanel(seed: { sessions?: any[] } = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, unknown> = {}
  if (seed.sessions) kvStore[REVIEWS_KEY] = seed.sessions
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../SpacedReviewPanel.vue')
  return mount(mod.default, { props: { words: seedWords } })
}

describe('SpacedReviewPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('渲染复习统计', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.srp-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日复习')
    expect(wrapper.text()).toContain('到期卡片')
  })

  it('无到期卡片时显示空状态', async () => {
    const freshWords = seedWords.map(w => ({
      ...w,
      lastReviewedAt: new Date().toISOString(),
    }))
    vi.resetModules()
    const storageMock = createMockStorage()
    storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {} }))
    ;(globalThis as any).localStorage = storageMock
    invalidateCache()
    const mod = await import('../SpacedReviewPanel.vue')
    const wrapper = mount(mod.default, { props: { words: freshWords } })
    expect(wrapper.find('.srp-empty').exists()).toBe(true)
  })

  it('有到期卡片时展示卡片列表', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.srp-card-row').exists()).toBe(true)
    expect(wrapper.text()).toContain('希望')
  })

  it('开始复习后展示当前卡片', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.srp-btn--sm').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.srp-card').exists()).toBe(true)
    expect(wrapper.find('.srp-card-word').exists()).toBe(true)
  })

  it('作答后推进到下一张卡片', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.srp-btn--sm').trigger('click')
    await wrapper.vm.$nextTick()
    const firstWord = wrapper.find('.srp-card-word').text()
    await wrapper.find('.srp-btn--correct').trigger('click')
    await wrapper.vm.$nextTick()
    const secondWord = wrapper.find('.srp-card-word').text()
    expect(secondWord).not.toBe(firstWord)
  })

  it('会话完成后展示总结', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.srp-btn--sm').trigger('click')
    await wrapper.vm.$nextTick()
    // 连续作答直到会话完成
    for (let i = 0; i < 10; i++) {
      const done = wrapper.find('.srp-session-summary').exists()
      if (done) break
      const btn = wrapper.find('.srp-btn--correct')
      if (!btn.exists()) break
      await btn.trigger('click')
      await wrapper.vm.$nextTick()
    }
    expect(wrapper.find('.srp-session-summary').exists()).toBe(true)
    expect(wrapper.text()).toContain('记得')
  })
})
