// ============================================================
// 经略阁 · 间隔复习面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const CARDS_KEY = 'hf:knowledge_flashcards'

function card(overrides: Record<string, any> = {}) {
  return {
    id: `fc_${Math.random().toString(36).slice(2, 8)}`,
    front: '什么是 SM-2？',
    back: '间隔重复调度算法',
    deck: '默认',
    tags: [],
    createdAt: '2026-08-20T08:00:00.000Z',
    sm2: {
      repetitions: 0,
      easiness: 2.5,
      interval: 0,
      lastReviewedAt: null,
      nextReviewAt: '2026-08-20T08:00:00.000Z',
    },
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
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
  const mod = await import('../FlashcardsPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('FlashcardsPanel 间隔复习', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('间隔复习')
    expect(wrapper.text()).toContain('复习概览')
    expect(wrapper.text()).toContain('添加卡片')
  })

  it('展示卡片统计', async () => {
    const wrapper = await mountPanel({
      [CARDS_KEY]: [card(), card({ front: '第二张卡' })],
    })
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('2.50')
  })

  it('添加卡片并持久化', async () => {
    const wrapper = await mountPanel({})
    const inputs = wrapper.findAll('input.fc-input')
    await inputs[0].setValue('前端三件套')
    await inputs[1].setValue('HTML/CSS/JS')
    await wrapper.find('button.fc-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('前端三件套')
    const kv = readKv()
    expect(kv[CARDS_KEY]).toHaveLength(1)
    expect(kv[CARDS_KEY][0].front).toBe('前端三件套')
  })

  it('复习推进 SM-2 状态', async () => {
    const wrapper = await mountPanel({
      [CARDS_KEY]: [card()],
    })
    expect(wrapper.text()).toContain('待复习')
    await wrapper.find('button.fc-btn-good').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[CARDS_KEY][0].sm2.repetitions).toBe(1)
    expect(kv[CARDS_KEY][0].sm2.interval).toBe(1)
  })

  it('展示牌组列表', async () => {
    const wrapper = await mountPanel({
      [CARDS_KEY]: [card({ deck: '前端' }), card({ deck: '算法' })],
    })
    expect(wrapper.text()).toContain('前端')
    expect(wrapper.text()).toContain('算法')
  })

  it('无到期卡片提示', async () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const wrapper = await mountPanel({
      [CARDS_KEY]: [card({ sm2: { repetitions: 1, easiness: 2.5, interval: 6, lastReviewedAt: new Date().toISOString(), nextReviewAt: future } })],
    })
    expect(wrapper.text()).toContain('当前没有到期的卡片')
  })
})
