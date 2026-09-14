import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PerceptionCompliancePanel from '../PerceptionCompliancePanel.vue'

const h = vi.hoisted(() => {
  const userItems = ['battery', 'ambientLight', 'screenAwake', 'activeWindow', 'healthData', 'attention']
  const alwaysOnItems = ['timeOfDay', 'isDark', 'isOnline', 'deviceIdle']
  const state = new Map<string, boolean>()
  return {
    userItems,
    alwaysOnItems,
    state,
    setPerceptionAllowed: vi.fn((item: string, allowed: boolean) => {
      state.set(item, allowed)
    }),
    resetPerceptionPermissions: vi.fn(() => {
      for (const item of userItems) state.set(item, false)
    }),
  }
})

vi.mock('../../modules/perception/compliance', () => ({
  USER_CONFIGURABLE_ITEMS: h.userItems,
  ALWAYS_ON_ITEMS: h.alwaysOnItems,
  isPerceptionAllowed: (item: string) => h.state.get(item) === true,
  setPerceptionAllowed: h.setPerceptionAllowed,
  getAllPerceptionPermissions: () =>
    Object.fromEntries(h.userItems.map((i) => [i, h.state.get(i) === true])),
  resetPerceptionPermissions: h.resetPerceptionPermissions,
}))

describe('PerceptionCompliancePanel', () => {
  beforeEach(() => {
    for (const item of h.userItems) h.state.set(item, false)
    h.setPerceptionAllowed.mockClear()
    h.resetPerceptionPermissions.mockClear()
  })

  it('初始渲染：显示宪法约束、6 个可配置采集项与恒开项', () => {
    const wrapper = mount(PerceptionCompliancePanel)
    expect(wrapper.findAll('.pcm-rule').length).toBe(3)
    expect(wrapper.findAll('.pcm-item').length).toBe(6)
    expect(wrapper.findAll('.pcm-alwayson-chip').length).toBe(4)
    expect(wrapper.text()).toContain('电池电量')
    expect(wrapper.text()).toContain('本地注意力')
    expect(wrapper.text()).toContain('恒开采集项')
  })

  it('默认全部关闭时：徽章为未授权，统计显示 已授权 0/6', () => {
    const wrapper = mount(PerceptionCompliancePanel)
    expect(wrapper.find('.pcm-stat').text()).toContain('0/6')
    expect(wrapper.find('.pcm-badge').text()).toContain('未授权')
  })

  it('点击开关：调用 setPerceptionAllowed 并更新本地状态', async () => {
    const wrapper = mount(PerceptionCompliancePanel)
    const batterySwitch = wrapper.findAll('.pcm-switch')[0]
    await batterySwitch.trigger('click')
    expect(h.setPerceptionAllowed).toHaveBeenCalledWith('battery', true)
    const onSwitches = wrapper.findAll('.pcm-switch.is-on').length
    expect(onSwitches).toBe(1)
    expect(wrapper.find('.pcm-stat').text()).toContain('1/6')
  })

  it('再次点击开关：关闭并调用 setPerceptionAllowed(item,false)', async () => {
    h.state.set('battery', true)
    const wrapper = mount(PerceptionCompliancePanel)
    const batterySwitch = wrapper.findAll('.pcm-switch')[0]
    await batterySwitch.trigger('click')
    expect(h.setPerceptionAllowed).toHaveBeenCalledWith('battery', false)
  })

  it('恢复默认：调用 resetPerceptionPermissions 后统计归零', async () => {
    h.state.set('battery', true)
    h.state.set('attention', true)
    const wrapper = mount(PerceptionCompliancePanel)
    expect(wrapper.find('.pcm-stat').text()).toContain('2/6')
    await wrapper.find('.pcm-btn').trigger('click')
    expect(h.resetPerceptionPermissions).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.pcm-stat').text()).toContain('0/6')
  })

  it('宽泛授权（>2 项开启）：徽章显示 宽泛授权', () => {
    h.state.set('battery', true)
    h.state.set('ambientLight', true)
    h.state.set('activeWindow', true)
    const wrapper = mount(PerceptionCompliancePanel)
    expect(wrapper.find('.pcm-badge').text()).toContain('宽泛授权')
  })
})