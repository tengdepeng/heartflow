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
  const mod = await import('../RhythmAnalysisPanel.vue')
  return mount(mod.default)
}

describe('RhythmAnalysisPanel 运动节奏', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无数据时显示空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('运动节奏')
    expect(wrapper.text()).toContain('记录运动后')
  })

  it('有数据时展示频率与多样性评分', async () => {
    const wrapper = await mountPanel([makeMove({ id: 'm1', type: 'run', duration: 30 })])
    expect(wrapper.text()).toContain('运动频率')
    expect(wrapper.text()).toContain('运动多样')
  })

  it('展示强度分布', async () => {
    const wrapper = await mountPanel([makeMove({ id: 'm1', type: 'run', duration: 30 })])
    expect(wrapper.text()).toContain('强度分布')
    expect(wrapper.text()).toContain('轻度')
    expect(wrapper.text()).toContain('中度')
  })

  it('展示类型分布与最佳时刻', async () => {
    const wrapper = await mountPanel([
      makeMove({ id: 'm1', type: 'run', duration: 30 }),
      makeMove({ id: 'm2', type: 'swim', duration: 45 }),
    ])
    expect(wrapper.text()).toContain('类型分布')
    expect(wrapper.text()).toContain('跑步')
    expect(wrapper.text()).toContain('游泳')
    expect(wrapper.text()).toContain('最佳运动日')
    expect(wrapper.text()).toContain('最佳时段')
  })

  it('展示恢复与目标建议', async () => {
    const wrapper = await mountPanel([makeMove({ id: 'm1', type: 'run', duration: 30 })])
    expect(wrapper.text()).toContain('运动强度分布合理')
    expect(wrapper.text()).toContain('运动多样性')
  })
})
