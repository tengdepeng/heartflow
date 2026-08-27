/// <reference types="vitest/globals" />
// ============================================================
// 字镜阁 · 间隔复习会话面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const REVIEWS_KEY = 'hf:word_mirror:review_sessions'

function word(overrides: Record<string, any> = {}) {
  return {
    id: `w_${Math.random().toString(36).slice(2, 8)}`,
    word: '春天',
    definition: '春季',
    proficiency: 1,
    favorite: false,
    tags: [],
    createdAt: '2026-08-20T08:00:00.000Z',
    lastReviewedAt: '2026-01-01T08:00:00.000Z',
    reviewCount: 0,
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}, words: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ReviewSessionPanel.vue')
  const wrapper = mount(mod.default, { props: { words } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('ReviewSessionPanel 间隔复习会话', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({}, [])
    expect(wrapper.text()).toContain('间隔复习会话')
    expect(wrapper.text()).toContain('复习概览')
    expect(wrapper.text()).toContain('暂无到期卡片')
  })

  it('展示到期卡片', async () => {
    const wrapper = await mountPanel({}, [word()])
    expect(wrapper.text()).toContain('待复习卡片')
    expect(wrapper.text()).toContain('春天')
    expect(wrapper.text()).toContain('开始复习')
  })

  it('开始复习会话并答题', async () => {
    const wrapper = await mountPanel({}, [word()])
    await wrapper.findAll('button.rs-btn').find(b => b.text().includes('开始复习'))!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('复习会话')
    expect(wrapper.text()).toContain('1 / 1')
    // 答对
    await wrapper.findAll('button.rs-btn').find(b => b.text().includes('答对'))!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('答对 1')
    // 会话已持久化
    const kv = readKv()
    expect(kv[REVIEWS_KEY]).toHaveLength(1)
    expect(kv[REVIEWS_KEY][0].correctCount).toBe(1)
  })

  it('展示会话历史', async () => {
    const wrapper = await mountPanel({
      [REVIEWS_KEY]: [{
        id: 'review_1',
        cards: [{ wordId: 'w1', word: '春天', definition: '春季', proficiency: 1, daysSinceLastReview: 10, due: true, urgency: 1 }],
        currentIndex: 1,
        correctCount: 1,
        incorrectCount: 0,
        skippedCount: 0,
        startedAt: '2026-08-20T08:00:00.000Z',
        completedAt: '2026-08-20T08:05:00.000Z',
        wordIds: ['w1'],
      }],
    }, [])
    expect(wrapper.text()).toContain('会话历史')
    expect(wrapper.text()).toContain('对 1 · 错 0')
  })
})
