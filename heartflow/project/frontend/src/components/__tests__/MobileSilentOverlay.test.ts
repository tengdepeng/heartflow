// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import MobileSilentOverlay from '../MobileSilentOverlay.vue'
import { useDesktopSilentOverlay } from '../../modules/sanctuary'

// 组件只消费组合式的响应式来源（mobileOverlayVisible / 内容偏好），不调用桥；
// 仅 mock 宪法 hook 以避免在测试环境（无 Pinia）注入 store 失败。
vi.mock('../../composables/useConstitutionEffect', () => ({
  useRuleEnabled: () => ({ isEnabled: ref(true), rule: ref(null) }),
}))

describe('MobileSilentOverlay — 移动端应用内静默覆盖', () => {
  beforeEach(() => {
    const overlay = useDesktopSilentOverlay()
    overlay.mobileOverlayVisible.value = false
    overlay.showBeacon.value = true
    overlay.showHint.value = true
    overlay.overlayForm.value = 'silent'
    overlay.glowIntensity.value = 1.0
  })

  it('mobileOverlayVisible 关闭时不渲染浮层', () => {
    const wrapper = mount(MobileSilentOverlay)
    expect(wrapper.find('.mobile-silent-overlay').exists()).toBe(false)
  })

  it('mobileOverlayVisible 开启时渲染浮层与辉光/落款，且不拦截交互', () => {
    const overlay = useDesktopSilentOverlay()
    overlay.mobileOverlayVisible.value = true
    const wrapper = mount(MobileSilentOverlay)
    const root = wrapper.find('.mobile-silent-overlay')
    expect(root.exists()).toBe(true)
    expect(wrapper.find('.glow-ring').exists()).toBe(true)
    expect(wrapper.find('.hint').text()).toBe('静')
    expect(root.attributes('aria-hidden')).toBe('true')
  })

  it('报点关闭时根节点带 no-beacon 类（隐藏光点）', () => {
    const overlay = useDesktopSilentOverlay()
    overlay.mobileOverlayVisible.value = true
    overlay.showBeacon.value = false
    const wrapper = mount(MobileSilentOverlay)
    expect(wrapper.find('.mobile-silent-overlay').classes()).toContain('no-beacon')
  })

  it('落款关闭时根节点带 no-hint 类（隐藏落款）', () => {
    const overlay = useDesktopSilentOverlay()
    overlay.mobileOverlayVisible.value = true
    overlay.showHint.value = false
    const wrapper = mount(MobileSilentOverlay)
    expect(wrapper.find('.mobile-silent-overlay').classes()).toContain('no-hint')
  })

  it('形态切换为 breath 时 data-form 与落款同步', () => {
    const overlay = useDesktopSilentOverlay()
    overlay.mobileOverlayVisible.value = true
    overlay.overlayForm.value = 'breath'
    const wrapper = mount(MobileSilentOverlay)
    expect(wrapper.find('.mobile-silent-overlay').attributes('data-form')).toBe('breath')
    expect(wrapper.find('.hint').text()).toBe('息')
  })

  it('辉光强度注入 --glow-intensity / --glow-opacity 样式变量', () => {
    const overlay = useDesktopSilentOverlay()
    overlay.mobileOverlayVisible.value = true
    overlay.glowIntensity.value = 1.6
    const wrapper = mount(MobileSilentOverlay)
    const el = wrapper.find('.mobile-silent-overlay').element as HTMLElement
    expect(el.style.getPropertyValue('--glow-intensity')).toBe('1.6')
    expect(el.style.getPropertyValue('--glow-opacity')).toBe('1')
  })
})
