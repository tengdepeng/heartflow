// ============================================================
// JadeBead 组件测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import JadeBead from '../JadeBead.vue'

const baseProps = {
  displayTime: '25:00',
  isRunning: false,
  isPaused: false,
  isFocusing: false,
  beadCount: 0,
  progress: 0,
}

describe('JadeBead', () => {
  it('渲染 SVG 玉珠', () => {
    const wrapper = mount(JadeBead, { props: baseProps })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('circle').exists()).toBe(true)
  })

  it('默认状态为 idle', () => {
    const wrapper = mount(JadeBead, { props: baseProps })
    expect(wrapper.classes()).toContain('bead--idle')
  })

  it('isFocusing 为 true 时状态为 focusing', () => {
    const wrapper = mount(JadeBead, { props: { ...baseProps, isFocusing: true } })
    expect(wrapper.classes()).toContain('bead--focusing')
  })

  it('isPaused 为 true 时状态为 paused', () => {
    const wrapper = mount(JadeBead, { props: { ...baseProps, isPaused: true } })
    expect(wrapper.classes()).toContain('bead--paused')
  })

  it('isRunning 为 true 时状态为 running', () => {
    const wrapper = mount(JadeBead, { props: { ...baseProps, isRunning: true } })
    expect(wrapper.classes()).toContain('bead--running')
  })

  it('pulseActive 由 beadCount 变化触发', async () => {
    const wrapper = mount(JadeBead, { props: { ...baseProps, beadCount: 0 } })
    // 初始无脉冲环
    expect(wrapper.find('.pulse-ring').exists()).toBe(false)
    // beadCount 增加触发脉冲
    await wrapper.setProps({ beadCount: 1 })
    expect(wrapper.find('.pulse-ring').exists()).toBe(true)
  })

  it('渲染进度弧（focusing 状态）', () => {
    const wrapper = mount(JadeBead, { props: { ...baseProps, isFocusing: true, progress: 0.5 } })
    expect(wrapper.find('.bead-progress').exists()).toBe(true)
  })

  it('非 focusing 状态无进度弧', () => {
    const wrapper = mount(JadeBead, { props: { ...baseProps } })
    expect(wrapper.find('.bead-progress').exists()).toBe(false)
  })

  it('渲染计时显示', () => {
    const wrapper = mount(JadeBead, { props: { ...baseProps } })
    expect(wrapper.find('.bead-time').exists()).toBe(true)
    expect(wrapper.text()).toContain('25:00')
  })

  it('渲染内光晕滤镜', () => {
    const wrapper = mount(JadeBead, { props: baseProps })
    expect(wrapper.find('filter#innerGlow').exists()).toBe(true)
  })

  it('渲染径向渐变（玉质 / 光泽 / 月白珠体 / 玉白核）', () => {
    const wrapper = mount(JadeBead, { props: baseProps })
    const gradients = wrapper.findAll('radialGradient')
    expect(gradients).toHaveLength(4)
    for (const id of ['jadeGradient', 'jadeGloss', 'moonDisc', 'moonCore']) {
      expect(wrapper.find(`radialGradient#${id}`).exists()).toBe(true)
    }
  })

  it('点击触发 toggle 事件', async () => {
    const wrapper = mount(JadeBead, { props: baseProps })
    await wrapper.find('svg').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })
})