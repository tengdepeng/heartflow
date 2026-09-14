import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeEntry(overrides: Record<string, any> = {}) {
  return {
    id: `w${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    type: 'milestone',
    title: '完成里程碑',
    content: 'x'.repeat(100),
    mood: 'calm',
    tags: ['工作'],
    sessionIds: [],
    roomId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(entries: any[] = [], rewards: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {
      'worklog:entries': entries,
      'rewards': rewards,
    },
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../WorklogRewardPanel.vue')
  return mount(mod.default)
}

describe('WorklogRewardPanel 劳酬联动', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('渲染标题与默认配置', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('劳酬联动')
    expect(wrapper.text()).toContain('最低内容长度')
    expect(wrapper.text()).toContain('20 字')
    expect(wrapper.text()).toContain('每日收入上限')
    expect(wrapper.text()).toContain('¥2,000')
  })

  it('无日志时显示无可桥接提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('没有可桥接的日志')
  })

  it('有日志时展示预估收入', async () => {
    const wrapper = await mountPanel([makeEntry({ id: 'w1' })])
    expect(wrapper.text()).toContain('预估 1 条')
    expect(wrapper.text()).toContain('¥235')
  })

  it('一键桥接生成收入记录并更新统计', async () => {
    const wrapper = await mountPanel([makeEntry({ id: 'w1' })])
    await wrapper.find('.wrp-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('累计映射')
    expect(wrapper.find('.wrp-stat b').text()).toBe('1')
  })

  it('可切换启用/停用状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('已开启')
    await wrapper.find('.wrp-config-actions .wrp-btn').trigger('click')
    expect(wrapper.text()).toContain('已停用')
  })
})
