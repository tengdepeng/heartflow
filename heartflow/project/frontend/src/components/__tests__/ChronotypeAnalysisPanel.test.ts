import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const SLEEP_KEY = 'hf:body:sleep'

function seedSleep(dayOffset: number, bedHour: number, bedMin: number, wakeHour: number, wakeMin: number, duration: number, quality = 4) {
  const d = new Date()
  d.setDate(d.getDate() - dayOffset)
  const sleepAt = new Date(d)
  sleepAt.setHours(bedHour, bedMin, 0, 0)
  // 入睡晚于起床时刻时视为跨日：wakeAt = sleepAt + duration，确保时间线正确
  const wakeAt = new Date(d)
  wakeAt.setHours(wakeHour, wakeMin, 0, 0)
  if (wakeAt.getTime() < sleepAt.getTime()) {
    wakeAt.setDate(wakeAt.getDate() + 1)
  }
  return {
    id: `s_${dayOffset}`,
    sleepAt: sleepAt.toISOString(),
    wakeAt: wakeAt.toISOString(),
    duration,
    quality,
    date: d.toISOString().split('T')[0],
  }
}

async function mountPanel(seed: { sleep?: any[] } = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, unknown> = {}
  if (seed.sleep) kvStore[SLEEP_KEY] = JSON.stringify(seed.sleep)
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ChronotypeAnalysisPanel.vue')
  return mount(mod.default)
}

describe('ChronotypeAnalysisPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('睡眠记录不足 7 天时显示空状态', async () => {
    const wrapper = await mountPanel({ sleep: [seedSleep(1, 23, 0, 7, 0, 480)] })
    expect(wrapper.find('.cap-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('生物钟')
  })

  it('有足够睡眠记录时展示生物钟分析', async () => {
    const sleep = Array.from({ length: 10 }, (_, i) => seedSleep(i, 23, 0, 7, 0, 480))
    const wrapper = await mountPanel({ sleep })
    expect(wrapper.find('.cap-hero').exists()).toBe(true)
    expect(wrapper.find('.cap-chrono-name').exists()).toBe(true)
    expect(wrapper.find('.cap-metrics').exists()).toBe(true)
  })

  it('早睡早起判定为晨型人', async () => {
    const sleep = Array.from({ length: 10 }, (_, i) => seedSleep(i, 22, 0, 6, 0, 480))
    const wrapper = await mountPanel({ sleep })
    expect(wrapper.find('.cap-chrono-name').text()).toContain('晨型')
  })

  it('晚睡晚起判定为夜猫子', async () => {
    const sleep = Array.from({ length: 10 }, (_, i) => seedSleep(i, 2, 0, 10, 0, 480))
    const wrapper = await mountPanel({ sleep })
    expect(wrapper.find('.cap-chrono-name').text()).toContain('夜猫')
  })

  it('展示作息建议', async () => {
    const sleep = Array.from({ length: 10 }, (_, i) => seedSleep(i, 2, 0, 10, 0, 480))
    const wrapper = await mountPanel({ sleep })
    expect(wrapper.find('.cap-rec').exists()).toBe(true)
    expect(wrapper.findAll('.cap-rec-item').length).toBeGreaterThan(0)
  })

  it('展示最佳入睡与起床时间', async () => {
    const sleep = Array.from({ length: 10 }, (_, i) => seedSleep(i, 23, 0, 7, 0, 480))
    const wrapper = await mountPanel({ sleep })
    const values = wrapper.findAll('.cap-metric-value').map(v => v.text())
    expect(values.some(v => v.includes('23:00'))).toBe(true)
    expect(values.some(v => v.includes('07:00'))).toBe(true)
  })
})
