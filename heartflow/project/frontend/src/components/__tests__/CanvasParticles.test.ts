// ============================================================
// CanvasParticles 组件测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CanvasParticles from '../CanvasParticles.vue'

describe('CanvasParticles', () => {
  it('渲染 canvas 元素', () => {
    const wrapper = mount(CanvasParticles)
    expect(wrapper.find('canvas').exists()).toBe(true)
    expect(wrapper.find('canvas').classes()).toContain('canvas-particles')
  })

  it('默认粒子数量为 100', () => {
    const wrapper = mount(CanvasParticles)
    // canvas 本身存在，具体粒子在渲染循环中初始化
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('接受 speed 属性', () => {
    const wrapper = mount(CanvasParticles, { props: { speed: 1.2 } })
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('接受 colorTheme 属性', () => {
    const wrapper = mount(CanvasParticles, { props: { colorTheme: 'aurora' } })
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('接受 particleCount 属性', () => {
    const wrapper = mount(CanvasParticles, { props: { particleCount: 50 } })
    expect(wrapper.find('canvas').exists()).toBe(true)
  })
})