import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const ITEMS_KEY = 'hf:mastery_items'

function item(overrides: Record<string, any> = {}) {
  return {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    topic: '知识点',
    confidence: 0,
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
  const mod = await import('../MasteryPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('MasteryPanel 掌握度', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('掌握度')
    expect(wrapper.text()).toContain('暂无知识点')
  })

  it('展示知识点与三态', async () => {
    const wrapper = await mountPanel({
      [ITEMS_KEY]: [
        item({ id: 'm1', topic: '微积分', confidence: 90 }),
        item({ id: 'm2', topic: '线性代数', confidence: 55 }),
        item({ id: 'm3', topic: '拓扑学', confidence: 10 }),
      ],
    })
    expect(wrapper.text()).toContain('微积分')
    expect(wrapper.text()).toContain('线性代数')
    expect(wrapper.text()).toContain('拓扑学')
    expect(wrapper.text()).toContain('已通晓')
    expect(wrapper.text()).toContain('练习中')
    expect(wrapper.text()).toContain('待学')
  })

  it('添加知识点并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input[placeholder="知识点名称"]').setValue('傅里叶变换')
    await wrapper.find('button.my-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('傅里叶变换')
    const items = storedKV()[ITEMS_KEY]
    expect(items.length).toBe(1)
    expect(items[0].topic).toBe('傅里叶变换')
    expect(items[0].confidence).toBe(0)
  })

  it('记录测验分数并持久化', async () => {
    const wrapper = await mountPanel({
      [ITEMS_KEY]: [item({ id: 'm1', topic: '概率论', confidence: 0 })],
    })
    await wrapper.find('input.my-score').setValue('90')
    await wrapper.find('button.my-btn-sm').trigger('click')
    await wrapper.vm.$nextTick()
    const items = storedKV()[ITEMS_KEY]
    expect(items[0].attempts).toBe(1)
    expect(items[0].lastScore).toBe(90)
    expect(items[0].confidence).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('上次 90 分')
  })

  it('删除知识点并持久化', async () => {
    const wrapper = await mountPanel({
      [ITEMS_KEY]: [item({ id: 'm_del', topic: '待删', confidence: 0 })],
    })
    await wrapper.find('button.my-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedKV()[ITEMS_KEY].length).toBe(0)
    expect(wrapper.text()).toContain('暂无知识点')
  })
})
