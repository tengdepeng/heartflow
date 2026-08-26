import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const RING_KEY = 'hf:note_knowledge_rings'

function makeRing(noteId: string, title: string, nextReviewAtDaysFromNow: number) {
  const now = new Date().toISOString()
  const next = new Date(Date.now() + nextReviewAtDaysFromNow * 86400000).toISOString()
  return {
    noteId,
    title,
    rings: 1,
    lastReviewedAt: now,
    nextReviewAt: next,
    reviewCount: 1,
    forgetCount: 0,
    crackCount: 0,
    hasReunion: false,
    luminance: 0.5,
    createdAt: now,
    updatedAt: now,
  }
}

async function mountPanel(seedRings: any[]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  // storage 引擎把整个 StorageSchema 存于 'heartflow:storage'，KV 走 kvStore[key]
  storageMock.setItem(
    'heartflow:storage',
    JSON.stringify({ version: 10, kvStore: { [RING_KEY]: seedRings } }),
  )
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ReadingSrsPanel.vue')
  return mount(mod.default)
}

describe('ReadingSrsPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('到期的年轮出现在复习队列', async () => {
    const wrapper = await mountPanel([makeRing('n1', '测试笔记', -1)])
    expect(wrapper.find('.srs-item').exists()).toBe(true)
    expect(wrapper.text()).toContain('测试笔记')
  })

  it('点击「认识」后该年轮离开队列', async () => {
    const wrapper = await mountPanel([makeRing('n1', '测试笔记', -1)])
    expect(wrapper.find('.srs-item').exists()).toBe(true)
    await wrapper.find('.srs-grade-btn.g-know').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.srs-item').exists()).toBe(false)
    expect(wrapper.text()).toContain('暂无待复习')
  })

  it('没有到期年轮时显示空状态', async () => {
    // nextReviewAt 在 5 天后 → 不在待复习队列
    const wrapper = await mountPanel([makeRing('n2', '未来笔记', 5)])
    expect(wrapper.find('.srs-item').exists()).toBe(false)
    expect(wrapper.find('.srs-empty').exists()).toBe(true)
  })
})
