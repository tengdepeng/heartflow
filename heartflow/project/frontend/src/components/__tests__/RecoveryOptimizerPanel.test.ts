import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeMove(overrides: Record<string, any> = {}, dayOffset = 0, hour = 18) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() - dayOffset)
  return {
    id: `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'run',
    duration: 30,
    withWhom: '',
    location: '',
    note: '',
    isMoment: false,
    at: d.toISOString(),
    ...overrides,
  }
}

async function mountPanel(moves: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: { 'hf:moves_v2': moves },
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../RecoveryOptimizerPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

describe('RecoveryOptimizerPanel 恢复优化', () => {
  it('空状态提示尚无运动记录', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('还没有运动记录')
    expect(wrapper.find('.rop-score').exists()).toBe(false)
  })

  it('有记录时渲染恢复评分环与四维度', async () => {
    const moves = [
      makeMove({ type: 'run', duration: 40, at: new Date(Date.now() - 3600000).toISOString() }),
      makeMove({ type: 'run', duration: 30, at: new Date(Date.now() - 7200000).toISOString() }),
      makeMove({ type: 'yoga', duration: 30, at: new Date(Date.now() - 3 * 86400000).toISOString() }),
      makeMove({ type: 'swim', duration: 20, at: new Date(Date.now() - 5 * 86400000).toISOString() }),
    ]
    const wrapper = await mountPanel(moves)
    expect(wrapper.find('.rop-ring').exists()).toBe(true)
    expect(wrapper.findAll('.rop-dim').length).toBe(4)
    expect(wrapper.find('.rop-rest').exists()).toBe(true)
  })

  it('渲染周期化训练周计划与强度分布', async () => {
    const moves = Array.from({ length: 14 }, (_, i) => makeMove({ type: 'run', duration: 30 }, i))
    const wrapper = await mountPanel(moves)
    expect(wrapper.findAll('.rop-day').length).toBe(7)
    expect(wrapper.findAll('.rop-mix-item').length).toBeGreaterThan(0)
    expect(wrapper.find('.rop-phase-goal').exists()).toBe(true)
  })

  it('高强度密集记录触发过度训练信号与恢复建议', async () => {
    const now = Date.now()
    const moves = Array.from({ length: 8 }, (_, i) =>
      makeMove({ type: 'run', duration: 60, at: new Date(now - i * 3600000).toISOString() }),
    )
    const wrapper = await mountPanel(moves)
    expect(wrapper.findAll('.rop-signal').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.rop-rec').length).toBeGreaterThan(0)
  })
})