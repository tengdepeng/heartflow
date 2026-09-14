import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeEntry(overrides: Record<string, any> = {}, hour = 10, dayOffset = 0) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() - dayOffset)
  return {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'journal',
    title: '工作日志',
    content: '推进了一个里程碑，记录工作进展。',
    mood: 'calm',
    tags: ['工作', '专注'],
    sessionIds: ['s1'],
    roomId: 'workhub',
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
    ...overrides,
  }
}

async function mountPanel(entries: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: { 'worklog:entries': entries },
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../WorkRhythmPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

describe('WorkRhythmPanel 工作节律', () => {
  it('空状态提示尚无日志', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('还没有工作日志')
    expect(wrapper.find('.wrh-rhythm').exists()).toBe(false)
  })

  it('有日志时渲染节奏横幅与 5 个时段', async () => {
    const entries = Array.from({ length: 20 }, (_, i) => makeEntry({}, 10 + (i % 8), i))
    const wrapper = await mountPanel(entries)
    expect(wrapper.find('.wrh-rhythm').exists()).toBe(true)
    expect(wrapper.findAll('.wrh-slot').length).toBe(5)
  })

  it('展示最佳工作日、最长连续与峰值时段标记', async () => {
    // 同周三周同一时段 ≥3 次 → 触发焦点时段；集中在上午 → 上午为峰值
    const entries = [
      makeEntry({}, 10, 0),
      makeEntry({}, 10, 7),
      makeEntry({}, 10, 14),
      makeEntry({}, 10, 1),
      makeEntry({}, 10, 2),
    ]
    const wrapper = await mountPanel(entries)
    expect(wrapper.find('.wrh-day-value').exists()).toBe(true)
    // 至少存在一个峰值时段
    expect(wrapper.find('.wrh-slot--peak').exists()).toBe(true)
    expect(wrapper.findAll('.wrh-focus-item').length).toBeGreaterThan(0)
  })

  it('连续记录触发习惯洞察', async () => {
    const entries = Array.from({ length: 15 }, (_, i) => makeEntry({}, 9, i))
    const wrapper = await mountPanel(entries)
    expect(wrapper.findAll('.wrh-insight').length).toBeGreaterThan(0)
    expect(wrapper.find('.wrh-tags').exists()).toBe(true)
  })
})