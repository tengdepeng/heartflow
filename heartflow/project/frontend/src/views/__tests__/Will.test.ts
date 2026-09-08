// ============================================================
// 遗志堂视图测试
// 冒烟：标题/副题 + 两面板（遗志谱系/殿堂遗嘱）空态与有数据渲染
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function will(overrides: Record<string, any> = {}) {
  return {
    id: `will_${Math.random().toString(36).slice(2, 8)}`,
    name: '玉珠的遗志',
    grade: 'heritage',
    description: '玉珠的传承',
    insights: ['保持专注', '善待他人'],
    goalSummary: null,
    carrierSnapshot: {
      name: '玉珠',
      maxBeads: 108,
      finalBeadCount: 66,
      colors: { primary: '#a07c8c', secondary: '#e0a96d', accent: '#f0c040' },
      usageCount: 200,
    },
    sourceCarrierId: 'carrier_1',
    inheritedByCarrierId: null,
    createdAt: '2026-08-20T08:00:00.000Z',
    inheritedAt: null,
    parentWillId: null,
    ...overrides,
  }
}

function testament(overrides: Record<string, any> = {}) {
  return {
    id: `testament_${Math.random().toString(36).slice(2, 8)}`,
    name: '我的遗嘱',
    testator: '我',
    type: 'spiritual',
    status: 'draft',
    trigger: 'immediate',
    triggerAt: null,
    triggerEvent: null,
    clauses: [{ title: '把日记交给家人', content: '……', order: 1 }],
    beneficiaries: [],
    linkedWills: [],
    summary: '',
    isPublic: false,
    encrypted: false,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    executedAt: null,
    guardian: null,
    ...overrides,
  }
}

async function mountView(kv: Record<string, any> = {}) {
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
  const mod = await import('../Will.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('Will 遗志堂视图', () => {
  it('空态：标题/副题/两面板空态文案', async () => {
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('遗志堂')
    expect(wrapper.text()).toContain('传承与告别 · 把珍贵的留给值得的')
    // 面板一 遗志谱系空态
    expect(wrapper.text()).toContain('遗志谱系')
    expect(wrapper.text()).toContain('尚无遗志')
    // 面板二 殿堂遗嘱空态
    expect(wrapper.text()).toContain('殿堂遗嘱')
    expect(wrapper.text()).toContain('尚无遗嘱')
    // 页脚
    expect(wrapper.text()).toContain('薪火相传')
  })

  it('有数据：遗志谱系（传承级徽章/洞见/传承链）+ 殿堂遗嘱渲染', async () => {
    const wrapper = await mountView({
      'hf:wills': [will()],
      'hf:testaments': [testament()],
    })
    expect(wrapper.text()).toContain('玉珠的遗志')
    expect(wrapper.text()).toContain('传承')
    expect(wrapper.text()).toContain('洞见 2 条')
    expect(wrapper.text()).toContain('谱系')
    expect(wrapper.text()).toContain('我的遗嘱')
    expect(wrapper.text()).toContain('条款 1')
  })
})
