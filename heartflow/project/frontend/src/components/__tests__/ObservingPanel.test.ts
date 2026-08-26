import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const HISTORY_KEY = 'hf:observing_history'
const CONFIG_KEY = 'hf:observing_config'

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
  const mod = await import('../ObservingPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('ObservingPanel 观星指数', () => {
  it('挂载后计算今日指数并展示因子', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('观星指数')
    expect(wrapper.text()).toContain('今日观星指数')
    expect(wrapper.find('.ob-score-val').exists()).toBe(true)
    expect(wrapper.text()).toContain('时段')
    expect(wrapper.text()).toContain('月相')
    expect(wrapper.text()).toContain('光害')
    expect(wrapper.text()).toContain('云况')
  })

  it('展示历史趋势', async () => {
    const wrapper = await mountPanel({
      [HISTORY_KEY]: [
        { date: '2026-08-20', score: 70 },
        { date: '2026-08-21', score: 80 },
        { date: '2026-08-22', score: 90 },
      ],
    })
    expect(wrapper.text()).toContain('近 7 日趋势')
    expect(wrapper.findAll('.ob-trend-col').length).toBeGreaterThanOrEqual(3)
  })

  it('清空历史并持久化', async () => {
    const wrapper = await mountPanel({
      [HISTORY_KEY]: [{ date: '2026-08-20', score: 70 }],
    })
    await wrapper.find('button.ob-btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedKV()[HISTORY_KEY].length).toBe(0)
    expect(wrapper.text()).toContain('暂无历史记录')
  })

  it('切换天象加成并持久化', async () => {
    const wrapper = await mountPanel({})
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(false)
    await wrapper.vm.$nextTick()
    const cfg = storedKV()[CONFIG_KEY]
    expect(cfg.boostOnEvents).toBe(false)
  })

  it('调整光害等级并持久化', async () => {
    const wrapper = await mountPanel({})
    const slider = wrapper.find('input[type="range"]')
    await slider.setValue('3')
    await wrapper.vm.$nextTick()
    const cfg = storedKV()[CONFIG_KEY]
    expect(cfg.lightPollution).toBe(3)
  })
})
