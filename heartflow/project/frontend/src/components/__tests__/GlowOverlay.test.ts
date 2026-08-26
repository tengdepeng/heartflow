// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GlowOverlay from '../GlowOverlay.vue'
import { useGlowEngine } from '../../modules/touchpoints'

describe('GlowOverlay — 锁屏光痕应用内渲染层', () => {
  beforeEach(() => {
    // 每个用例前复位为「禁用 + 无调度」，保证断言确定性
    useGlowEngine().updateConfig({ enabled: false, scheduleStart: '', scheduleEnd: '' })
  })

  it('enabled 且调度内时渲染光痕层与光晕', () => {
    useGlowEngine().updateConfig({ enabled: true, scheduleStart: '', scheduleEnd: '' })
    const wrapper = mount(GlowOverlay)
    expect(wrapper.find('.glow-overlay').exists()).toBe(true)
    expect(wrapper.find('.glow-orb').exists()).toBe(true)
  })

  it('disabled 时不渲染光痕层', () => {
    useGlowEngine().updateConfig({ enabled: false })
    const wrapper = mount(GlowOverlay)
    expect(wrapper.find('.glow-overlay').exists()).toBe(false)
  })

  it('由 enabled 切换为 disabled 后移除光痕层', async () => {
    const engine = useGlowEngine()
    engine.updateConfig({ enabled: true, scheduleStart: '', scheduleEnd: '' })
    const wrapper = mount(GlowOverlay)
    expect(wrapper.find('.glow-overlay').exists()).toBe(true)

    await engine.updateConfig({ enabled: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.glow-overlay').exists()).toBe(false)
  })

  it('渲染层不拦截交互（pointer-events:none 透传）', () => {
    useGlowEngine().updateConfig({ enabled: true, scheduleStart: '', scheduleEnd: '' })
    const wrapper = mount(GlowOverlay)
    expect(wrapper.find('.glow-overlay').attributes('aria-hidden')).toBe('true')
  })
})
