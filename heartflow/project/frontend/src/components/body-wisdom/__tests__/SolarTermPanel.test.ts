import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const CHECKINS_KEY = 'hf:body-wisdom:solar-term-checkins'

// 节气由系统日期推导：钉时到 2026-08-26（处暑 8/23 ～ 白露 9/7 区间内），
// 避免测试随实际日期漂移（9 月中运行会落在白露导致断言失败）。
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 26, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

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
  const mod = await import('../SolarTermPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('SolarTermPanel 节气养生', () => {
  it('展示当前节气与季节', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('节气养生')
    // 2026-08-26 → 处暑（8/23）
    expect(wrapper.text()).toContain('处暑')
    expect(wrapper.text()).toContain('秋')
  })

  it('展示养生建议各维度', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('饮食')
    expect(wrapper.text()).toContain('运动')
    expect(wrapper.text()).toContain('穴位')
    expect(wrapper.text()).toContain('起居')
    expect(wrapper.text()).toContain('情志')
    expect(wrapper.text()).toContain('禁忌')
  })

  it('打卡当前节气并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.stp-checkin-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已打卡')
    const checkins = storedKV()[CHECKINS_KEY]
    expect(checkins.length).toBe(1)
    expect(checkins[0].term).toBe('处暑')
  })

  it('展示既有打卡记录', async () => {
    const wrapper = await mountPanel({
      [CHECKINS_KEY]: [{
        term: '立秋',
        year: new Date().getFullYear(),
        checkedAt: '2026-08-07T00:00:00.000Z',
        note: '润肺',
        done: true,
      }],
    })
    expect(wrapper.text()).toContain('立秋')
    expect(wrapper.text()).toContain('润肺')
  })
})
