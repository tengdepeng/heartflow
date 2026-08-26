// ============================================================
// GardenFlower 组件测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GardenFlower from '../GardenFlower.vue'

describe('GardenFlower', () => {
  it('渲染 SVG 和标签', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'calm' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('平静')
  })

  it('happy 类型渲染正确图标', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'happy' } })
    expect(wrapper.text()).toContain('轻快')
    expect(wrapper.find('line').attributes('stroke')).toBe('#f0c040')
  })

  it('angry 类型渲染正确标签', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'angry' } })
    expect(wrapper.text()).toContain('烦躁')
  })

  it('sad 类型渲染', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'sad' } })
    expect(wrapper.text()).toContain('低落')
  })

  it('anxious 类型渲染', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'anxious' } })
    expect(wrapper.text()).toContain('紧绷')
  })

  it('显示 note 文本', () => {
    const wrapper = mount(GardenFlower, {
      props: { type: 'calm', note: '深呼吸' },
    })
    expect(wrapper.text()).toContain('深呼吸')
  })

  it('不显示 note 当未提供', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'calm' } })
    expect(wrapper.find('.flower-note').exists()).toBe(false)
  })

  it('显示 createdAt 时间标签', () => {
    const wrapper = mount(GardenFlower, {
      props: { type: 'calm', createdAt: '2026-07-15T10:00:00Z' },
    })
    expect(wrapper.text()).toContain('7/15')
  })

  it('不显示时间标签当未提供 createdAt', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'calm' } })
    const timeEl = wrapper.find('.flower-time')
    expect(timeEl.text()).toBe('')
  })

  it('paused 为 true 时去除动画类', () => {
    const wrapper = mount(GardenFlower, {
      props: { type: 'calm', paused: true },
    })
    const stem = wrapper.find('line')
    expect(stem.classes()).not.toContain('stem-sway')
  })

  it('paused 为 false 时添加动画类', () => {
    const wrapper = mount(GardenFlower, {
      props: { type: 'calm', paused: false },
    })
    const stem = wrapper.find('line')
    expect(stem.classes()).toContain('stem-sway')
  })

  it('size 控制容器大小', () => {
    const wrapper = mount(GardenFlower, {
      props: { type: 'calm', size: 150 },
    })
    const div = wrapper.find('.garden-flower')
    expect(div.attributes('style')).toContain('width: 150px')
    expect(div.attributes('style')).toContain('height: 195px')
  })

  it('size 默认 100px', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'calm' } })
    const div = wrapper.find('.garden-flower')
    expect(div.attributes('style')).toContain('width: 100px')
  })

  it('渲染 3 个发光粒子', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'calm' } })
    const dots = wrapper.findAll('.glow-dot')
    expect(dots).toHaveLength(3)
  })

  it('未知类型回退到 calm', () => {
    const wrapper = mount(GardenFlower, { props: { type: 'calm' as any } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})