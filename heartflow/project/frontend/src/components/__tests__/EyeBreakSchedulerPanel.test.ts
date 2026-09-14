import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const CONFIG_KEY = 'hf:eye_shield_config'
const LAST_REST_KEY = 'hf:eye_break_last_rest'
const LOGS_KEY = 'hf:eye_break_logs'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.useFakeTimers()
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
  const mod = await import('../EyeBreakSchedulerPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

afterEach(() => {
  vi.useRealTimers()
})

describe('EyeBreakSchedulerPanel 用眼休息调度', () => {
  it('默认开启（20 分钟）渲染倒计时并自动开始计时', async () => {
    vi.setSystemTime(new Date('2026-09-01T10:00:00'))
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('用眼休息调度')
    expect(wrapper.text()).toContain('20:00')
    expect(wrapper.text()).toContain('距下次放松')
    expect(wrapper.text()).toContain('⏸ 暂停计时')
    wrapper.unmount()
  })

  it('休息已关闭（eyeBreakMinutes=0）显示关闭引导', async () => {
    vi.setSystemTime(new Date('2026-09-01T10:00:00'))
    const wrapper = await mountPanel({ [CONFIG_KEY]: { eyeBreakMinutes: 0, enabled: true } })
    expect(wrapper.text()).toContain('用眼休息已关闭')
    expect(wrapper.find('.gsp-count').exists()).toBe(false)
    wrapper.unmount()
  })

  it('距上次休息已超过间隔时触发休息提醒', async () => {
    vi.setSystemTime(new Date('2026-09-01T10:00:00'))
    const base = Date.now()
    const wrapper = await mountPanel({ [LAST_REST_KEY]: base - 20 * 60_000 - 1000 })
    expect(wrapper.text()).toContain('该起来眺望 6 米外 20 秒了')
    expect(wrapper.text()).toContain('✅ 完成休息')
    expect(wrapper.text()).toContain('稍后 5 分钟')
    wrapper.unmount()
  })

  it('点击「完成休息」记录今日休息并解除提醒', async () => {
    vi.setSystemTime(new Date('2026-09-01T10:00:00'))
    const base = Date.now()
    const wrapper = await mountPanel({ [LAST_REST_KEY]: base - 20 * 60_000 - 1000 })
    await wrapper.get('.gsp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1 今日休息')
    expect(wrapper.find('.gsp-btn--primary').exists()).toBe(false)
    expect(wrapper.text()).toContain('⏸ 暂停计时')
    const logs = storedKV()[LOGS_KEY] ?? []
    expect(logs.length).toBe(1)
    expect(logs[0].kind).toBe('rest')
    wrapper.unmount()
  })

  it('点击「稍后 5 分钟」记录稍后并顺延节奏', async () => {
    vi.setSystemTime(new Date('2026-09-01T10:00:00'))
    const base = Date.now()
    const wrapper = await mountPanel({ [LAST_REST_KEY]: base - 20 * 60_000 - 1000 })
    const buttons = wrapper.findAll('.gsp-btn')
    await buttons[buttons.length - 1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1 稍后')
    const logs = storedKV()[LOGS_KEY] ?? []
    expect(logs.length).toBe(1)
    expect(logs[0].kind).toBe('defer')
    wrapper.unmount()
  })
})