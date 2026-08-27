// ============================================================
// 逐日心锚 · 智能提醒面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { Anchor } from '../../modules/anchor/types'

function anchor(overrides: Partial<Anchor> = {}): Anchor {
  return {
    id: `a_${Math.random().toString(36).slice(2, 8)}`,
    text: '写周报',
    done: false,
    targetDate: '2026-08-27',
    createdAt: '2026-08-27T08:00:00.000Z',
    priority: 'must',
    stage: 'active',
    driftCount: 0,
    ...overrides,
  }
}

async function mountPanel(anchors: Anchor[] = [], kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../SmartReminderPanel.vue')
  const wrapper = mount(mod.default, { props: { anchors } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('SmartReminderPanel 智能提醒', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('智能提醒')
    expect(wrapper.text()).toContain('还没有提醒记录')
  })

  it('展示默认提醒规则', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('提醒规则')
    expect(wrapper.text()).toContain('定时')
    expect(wrapper.text()).toContain('截止')
  })

  it('切换规则启用状态并持久化', async () => {
    const wrapper = await mountPanel()
    const firstToggle = wrapper.find('.sr-toggle')
    const before = firstToggle.text()
    await firstToggle.trigger('click')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const rules = saved.kvStore['hf:anchor:reminder_rules']
    expect(rules[0].enabled).toBe(before === '开' ? false : true)
  })

  it('检查提醒生成待确认提醒', async () => {
    const wrapper = await mountPanel([anchor({ priority: 'must' })])
    await wrapper.find('.sr-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('待确认')
  })

  it('确认提醒后不再待确认', async () => {
    const wrapper = await mountPanel([anchor({ priority: 'must' })])
    await wrapper.find('.sr-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.sr-pending .sr-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('待确认')
  })
})
