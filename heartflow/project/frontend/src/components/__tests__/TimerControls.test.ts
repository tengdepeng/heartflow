// ============================================================
// TimerControls 组件测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TimerControls from '../TimerControls.vue'

describe('TimerControls', () => {
  const baseProps = {
    displayTime: '25:00',
    isRunning: false,
    isPaused: false,
    currentMode: 'focus',
    remainingSeconds: 1500,
    totalSeconds: 1500,
  }

  it('渲染计时显示', () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    expect(wrapper.text()).toContain('25:00')
    expect(wrapper.text()).toContain('专注模式')
  })

  it('isRunning 为 true 时显示"正在流动"', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, isRunning: true, remainingSeconds: 1200 },
    })
    expect(wrapper.text()).toContain('正在流动')
    expect(wrapper.text()).toContain('停一停')
  })

  it('isPaused 为 true 时显示"暂时停驻"', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, isPaused: true, remainingSeconds: 1000 },
    })
    expect(wrapper.text()).toContain('暂时停驻')
    expect(wrapper.text()).toContain('接续')
  })

  it('空闲状态显示"等待开始"', () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    expect(wrapper.text()).toContain('等待开始')
    expect(wrapper.text()).toContain('开始流动')
  })

  it('nap 模式显示小憩', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, currentMode: 'nap' },
    })
    expect(wrapper.text()).toContain('小憩模式')
    expect(wrapper.text()).toContain('☕')
  })

  it('free 模式显示自由', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, currentMode: 'free' },
    })
    expect(wrapper.text()).toContain('自由模式')
    expect(wrapper.text()).toContain('✨')
  })

  it('点击 toggle 按钮触发 toggle 事件', async () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('点击 reset 按钮触发 reset 事件', async () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, isRunning: true },
    })
    await wrapper.find('.btn-secondary').trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('点击 mode tab 触发 switchMode 事件', async () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    const tabs = wrapper.findAll('.mode-tab')
    await tabs[1].trigger('click')
    expect(wrapper.emitted('switchMode')).toHaveLength(1)
    expect(wrapper.emitted('switchMode')![0]).toEqual(['nap'])
  })

  it('第二个 mode tab 触发 nap 模式', async () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    const tabs = wrapper.findAll('.mode-tab')
    await tabs[2].trigger('click')
    expect(wrapper.emitted('switchMode')![0]).toEqual(['free'])
  })

  it('reset 按钮在空闲时 disabled', () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    expect(wrapper.find('.btn-secondary').attributes('disabled')).toBeDefined()
  })

  it('reset 按钮在运行时可用', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, isRunning: true, remainingSeconds: 1000 },
    })
    expect(wrapper.find('.btn-secondary').attributes('disabled')).toBeUndefined()
  })

  it('focus 模式 active tab 高亮', () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    const activeTab = wrapper.find('.mode-tab.active')
    expect(activeTab.text()).toContain('专注')
  })

  it('nap 模式 active tab 高亮', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, currentMode: 'nap' },
    })
    const activeTab = wrapper.find('.mode-tab.active')
    expect(activeTab.text()).toContain('小憩')
  })

  it('显示剩余秒数', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, remainingSeconds: 1200 },
    })
    expect(wrapper.text()).toContain('剩余 1200 秒')
  })

  it('显示已流动百分比', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, remainingSeconds: 750 },
    })
    expect(wrapper.text()).toContain('已流动 50%')
  })

  it('剩余0秒时显示 100%', () => {
    const wrapper = mount(TimerControls, {
      props: { ...baseProps, remainingSeconds: 0 },
    })
    expect(wrapper.text()).toContain('已流动 100%')
  })

  it('渲染进度环 SVG', () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    const ring = wrapper.find('.progress-ring')
    expect(ring.exists()).toBe(true)
    expect(ring.find('circle').exists()).toBe(true)
  })

  it('渲染三个 mode tab', () => {
    const wrapper = mount(TimerControls, { props: baseProps })
    const tabs = wrapper.findAll('.mode-tab')
    expect(tabs).toHaveLength(3)
  })
})