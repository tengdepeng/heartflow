import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const INTERRUPTIONS_KEY = 'hf:discipline:interruptions'
const TASKS_KEY = 'hf:tasks'

function focusSession(overrides: Record<string, any> = {}) {
  return {
    id: `s_${Math.random().toString(36).slice(2, 8)}`,
    status: 'completed',
    mode: 'focus',
    plannedDuration: 25 * 60 * 1000,
    elapsed: 25 * 60 * 1000,
    startedAt: '2026-08-26T08:00:00.000Z',
    pausedDuration: 0,
    pausedAt: null,
    completedAt: '2026-08-26T08:25:00.000Z',
    tags: [],
    note: '',
    carrierId: null,
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}, sessions: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions,
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../PomodoroForestPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('PomodoroForestPanel 番茄树园', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({}, [])
    expect(wrapper.text()).toContain('番茄树园')
    expect(wrapper.text()).toContain('还没有种下第一棵树')
  })

  it('展示树园概览（成活/枯萎/成活率）', async () => {
    const wrapper = await mountPanel({}, [
      focusSession({ elapsed: 25 * 60 * 1000, status: 'completed' }),
      focusSession({ elapsed: 5 * 60 * 1000, status: 'interrupted' }),
    ])
    expect(wrapper.text()).toContain('总树')
    expect(wrapper.text()).toContain('成活率')
    expect(wrapper.text()).toContain('50%')
  })

  it('展示树园列表与品种', async () => {
    const wrapper = await mountPanel({}, [
      focusSession({ elapsed: 25 * 60 * 1000, status: 'completed' }),
    ])
    expect(wrapper.text()).toContain('树苗')
    expect(wrapper.text()).toContain('成活')
  })

  it('展示任务专注聚合', async () => {
    const wrapper = await mountPanel(
      { [TASKS_KEY]: [{ id: 't1', title: '写周报' }] },
      [focusSession({ elapsed: 25 * 60 * 1000, status: 'completed', carrierId: 't1' })]
    )
    expect(wrapper.text()).toContain('任务专注投入')
    expect(wrapper.text()).toContain('写周报')
  })

  it('记录中断并持久化', async () => {
    const wrapper = await mountPanel({}, [])
    await wrapper.find('.pfp-input').setValue('消息打扰')
    await wrapper.find('.pfp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const records = storedKV()[INTERRUPTIONS_KEY]
    expect(records.length).toBe(1)
    expect(records[0].reason).toBe('消息打扰')
    expect(wrapper.text()).toContain('消息打扰')
  })

  it('展示既有中断记录', async () => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const wrapper = await mountPanel({
      [INTERRUPTIONS_KEY]: [{
        id: 'i1',
        sessionId: 's1',
        taskId: null,
        reason: '临时急事',
        category: 'urgent',
        occurredAt: `${todayIso}T09:00:00.000Z`,
        focusMs: 600000,
      }],
    }, [])
    expect(wrapper.text()).toContain('临时急事')
    expect(wrapper.text()).toContain('今日 1 次')
  })
})
