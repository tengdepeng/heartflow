// ============================================================
// ProgressRing 可复用进度环组件测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressRing from '../ProgressRing.vue'

function fill(progressRing: ReturnType<typeof mount>): Element {
  return progressRing.find('.ring-fill').element
}

describe('ProgressRing 基础渲染', () => {
  it('默认最大 100，渲染百分比', () => {
    const wrapper = mount(ProgressRing, { props: { value: 50 } })
    expect(wrapper.find('.ring-center').text()).toBe('50%')
    expect(wrapper.attributes('role')).toBe('progressbar')
    expect(wrapper.attributes('aria-valuenow')).toBe('50')
  })

  it('支持自定义 max（如专注 25 分钟已完成 10 分钟）', () => {
    const wrapper = mount(ProgressRing, { props: { value: 10, max: 25 } })
    expect(wrapper.find('.ring-center').text()).toBe('40%')
    expect(wrapper.attributes('aria-valuenow')).toBe('40')
  })

  it('showRaw 时居中显示原始值', () => {
    const wrapper = mount(ProgressRing, { props: { value: 10, max: 25, showRaw: true } })
    expect(wrapper.find('.ring-center').text()).toBe('10')
  })

  it('越界值被裁剪到 0~100', () => {
    const over = mount(ProgressRing, { props: { value: 150 } })
    expect(over.attributes('aria-valuenow')).toBe('100')
    const under = mount(ProgressRing, { props: { value: -5 } })
    expect(under.attributes('aria-valuenow')).toBe('0')
  })

  it('max<=0 时进度为 0，避免除零', () => {
    const wrapper = mount(ProgressRing, { props: { value: 10, max: 0 } })
    expect(wrapper.attributes('aria-valuenow')).toBe('0')
  })
})

describe('ProgressRing 进度计算', () => {
  it('满进度时 dashoffset 为 0', () => {
    const wrapper = mount(ProgressRing, { props: { value: 100 } })
    const dashoffset = fill(wrapper).getAttribute('stroke-dashoffset')
    expect(Number(dashoffset)).toBeCloseTo(0)
  })

  it('半进度时 dashoffset 为半周长', () => {
    const size = 100
    const stroke = 10
    const wrapper = mount(ProgressRing, { props: { value: 50, size, stroke } })
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const dashoffset = fill(wrapper).getAttribute('stroke-dashoffset')
    expect(Number(dashoffset)).toBeCloseTo(circumference * 0.5)
  })

  it('支持插槽自定义居中内容', () => {
    const wrapper = mount(ProgressRing, {
      props: { value: 30 },
      slots: { default: '<span class="my-badge">🏆</span>' },
    })
    expect(wrapper.find('.my-badge').text()).toBe('🏆')
  })

  it('设置无障碍标签', () => {
    const wrapper = mount(ProgressRing, { props: { value: 20, label: '阅读目标' } })
    expect(wrapper.attributes('aria-label')).toBe('阅读目标')
  })
})