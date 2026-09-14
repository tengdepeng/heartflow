import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeMove(overrides: Record<string, any> = {}) {
  return {
    id: `mv${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    type: 'run',
    duration: 30,
    withWhom: '',
    location: '',
    note: '',
    isMoment: false,
    at: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(moves: any[]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: { 'hf:moves_v2': moves } }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../MovementAchievementsPanel.vue')
  return mount(mod.default)
}

describe('MovementAchievementsPanel 运动成就', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('渲染标题与成就统计', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('运动成就')
    expect(wrapper.text()).toContain('已解锁')
    expect(wrapper.text()).toContain('总数')
    expect(wrapper.text()).toContain('完成率')
  })

  it('展示预置成就列表', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('第一步')
    expect(wrapper.text()).toContain('百分钟战士')
    expect(wrapper.text()).toContain('千分钟大师')
  })

  it('累计 100 分钟后解锁百分钟战士', async () => {
    const wrapper = await mountPanel([
      makeMove({ id: 'm1', type: 'run', duration: 30 }),
      makeMove({ id: 'm2', type: 'run', duration: 30 }),
      makeMove({ id: 'm3', type: 'run', duration: 30 }),
      makeMove({ id: 'm4', type: 'run', duration: 30 }),
    ])
    await wrapper.vm.$nextTick()
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const achievements = saved.kvStore['hf:movement:achievements']
    const hundred = achievements.find((a: any) => a.id === 'ach_100_min')
    expect(hundred.unlocked).toBe(true)
    const first = achievements.find((a: any) => a.id === 'ach_first_step')
    expect(first.unlocked).toBe(true)
  })
})
