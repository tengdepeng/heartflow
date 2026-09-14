// ============================================================
// RestReminderPanel 休息提醒面板测试（INCR-85）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- Storage Mock ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import RestReminderPanel from '../RestReminderPanel.vue'

async function mountPanel() {
  const wrapper = mount(RestReminderPanel)
  await nextTick()
  return wrapper
}

describe('RestReminderPanel 休息提醒', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('标题徽标渲染：默认 5 条全部启用', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('休息提醒')
    expect(wrapper.text()).toContain('5 条启用')
    expect(wrapper.text()).toContain('全部启用')
  })

  it('提醒列表渲染类型 chip 与触发条件', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('番茄钟')
    expect(wrapper.text()).toContain('定时')
    expect(wrapper.text()).toContain('姿势')
    expect(wrapper.text()).toContain('连续专注 25 分钟')
    expect(wrapper.text()).toContain('定时 13:00')
  })

  it('停用提醒后徽标变为部分启用', async () => {
    const wrapper = await mountPanel()
    const toggle = wrapper.findAll('button.rrp-toggle')[0]
    await toggle.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('4 条启用')
    expect(wrapper.text()).toContain('部分启用')
    expect(mockKV.get('hf:rest_reminders')).toBeDefined()
  })

  it('模拟检测触发番茄钟提醒', async () => {
    const wrapper = await mountPanel()
    // 默认 simFocus=25, simTime=10:00 → 番茄钟(25) 触发
    await wrapper.find('button.rrp-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('番茄钟休息')
  })

  it('模拟检测无触发时显示提示', async () => {
    const wrapper = await mountPanel()
    const focusInput = wrapper.find('input[type="number"]')
    await focusInput.setValue(5)
    await wrapper.find('button.rrp-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('此刻没有提醒触发')
  })

  it('重置冷却按钮出现并清除 lastTriggeredAt', async () => {
    const wrapper = await mountPanel()
    // 先触发一次，写入 lastTriggeredAt
    await wrapper.find('button.rrp-btn').trigger('click')
    await nextTick()
    // 番茄钟冷却 20 分钟，同参数再次触发不会重复 → 重置冷却后可再次触发
    const resetBtn = wrapper.find('button.rrp-link')
    expect(resetBtn.exists()).toBe(true)
    await resetBtn.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('尚未触发')
  })
})
