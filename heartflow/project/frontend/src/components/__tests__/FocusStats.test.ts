// ============================================================
// FocusStats 组件测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FocusStats from '../FocusStats.vue'

describe('FocusStats', () => {
  it('渲染三个统计项', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: 0 },
    })
    const items = wrapper.findAll('.stat-item')
    expect(items).toHaveLength(3)
  })

  it('显示 sessions 数量', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 5, currentDuration: 0, progress: 0 },
    })
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('今日沉淀')
  })

  it('格式化当前时长 MM:SS', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 125, progress: 0 },
    })
    expect(wrapper.text()).toContain('02:05')
    expect(wrapper.text()).toContain('本轮流动')
  })

  it('progress 为 0 时显示 0%', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: 0 },
    })
    expect(wrapper.text()).toContain('0%')
    expect(wrapper.text()).toContain('脉动进度')
  })

  it('progress 为 0.5 时显示 50%', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: 0.5 },
    })
    expect(wrapper.text()).toContain('50%')
  })

  it('progress 为 1 时显示 100%', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: 1 },
    })
    expect(wrapper.text()).toContain('100%')
  })

  it('progress 超出范围被裁剪', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: 1.5 },
    })
    expect(wrapper.text()).toContain('100%')
  })

  it('progress 为负数时显示 0%', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: -0.5 },
    })
    expect(wrapper.text()).toContain('0%')
  })

  it('mini-bar 宽度随 progress 变化', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: 0.75 },
    })
    const bar = wrapper.find('.mini-bar')
    expect(bar.attributes('style')).toContain('width: 75%')
  })

  it('大数值 sessions 正常显示', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 999, currentDuration: 0, progress: 0 },
    })
    expect(wrapper.text()).toContain('999')
  })

  it('currentDuration 为 0 时显示 00:00', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 0, progress: 0 },
    })
    expect(wrapper.text()).toContain('00:00')
  })

  it('currentDuration 超过 59 分钟正常显示', () => {
    const wrapper = mount(FocusStats, {
      props: { sessions: 0, currentDuration: 3661, progress: 0 },
    })
    expect(wrapper.text()).toContain('61:01')
  })
})