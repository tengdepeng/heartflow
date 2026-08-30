// ============================================================
// MemoryArchivePanel 组件测试（INCR-03：记忆档案）
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function reciteCard(overrides: Record<string, any> = {}) {
  return {
    id: `rc_${Math.random().toString(36).slice(2, 8)}`,
    title: '春日',
    stepIndex: 0,
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    bestAccuracy: 0,
    errorTokens: {},
    ...overrides,
  }
}

function masteryItem(overrides: Record<string, any> = {}) {
  return {
    id: `mi_${Math.random().toString(36).slice(2, 8)}`,
    topic: '概念',
    confidence: 20,
    attempts: 0,
    difficulty: 1,
    updatedAt: '2026-08-20T08:00:00.000Z',
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
  const mod = await import('../MemoryArchivePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('MemoryArchivePanel', () => {
  it('空档案展示引导文案', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('记忆档案')
    expect(wrapper.text()).toContain('背诵卡片')
  })

  it('背诵页签展示概览与分布', async () => {
    const wrapper = await mountPanel({
      'hf:recite_cards': [
        reciteCard({ stepIndex: 0, attempts: 1, correctCount: 1, bestAccuracy: 90 }),
        reciteCard({ stepIndex: 3, attempts: 3, correctCount: 3, bestAccuracy: 100, errorTokens: { '春': 2 } }),
      ],
    })
    await wrapper.find('.march-tab.on').exists() // 默认背诵
    expect(wrapper.text()).toContain('卡片')
    expect(wrapper.text()).toContain('遮盖档位分布')
    expect(wrapper.text()).toContain('易错')
  })

  it('切换到掌握度档案', async () => {
    const wrapper = await mountPanel({
      'hf:mastery_items': [masteryItem({ confidence: 90, attempts: 4 })],
    })
    await wrapper.findAll('.march-tab')[1].trigger('click')
    expect(wrapper.text()).toContain('知识点')
    expect(wrapper.text()).toContain('状态分布')
  })

  it('掌握度展示三态与薄弱项', async () => {
    const wrapper = await mountPanel({
      'hf:mastery_items': [
        masteryItem({ confidence: 90, attempts: 4 }),
        masteryItem({ confidence: 10, attempts: 0 }),
      ],
    })
    await wrapper.findAll('.march-tab')[1].trigger('click')
    expect(wrapper.text()).toContain('已通晓')
    expect(wrapper.text()).toContain('待学')
    expect(wrapper.text()).toContain('最该回炉')
  })
})