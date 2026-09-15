// ============================================================
// HabitCalendarPanel 组件测试 - 成长庭院·习惯打卡日历
// 薄委托面板：props.habits → habit-calendar 纯函数引擎聚合。
// 不依赖 storage，仅验证渲染与空态/有数据态。
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HabitCalendarPanel from './HabitCalendarPanel.vue'
import type { HabitLike } from '../modules/garden/growth-meteor'

const local = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`

describe('HabitCalendarPanel 习惯打卡日历', () => {
  it('空态时显示引导文案与中性徽标', () => {
    const wrapper = mount(HabitCalendarPanel, { props: { habits: [] } })
    expect(wrapper.find('.hcp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('打卡日历')
    expect(wrapper.find('.hcp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('尚未种下习惯')
    expect(wrapper.text()).toContain('尚未播种')
    expect(wrapper.find('.hcp-badge-neutral').exists()).toBe(true)
  })

  it('有数据时展示本周/累计打卡概览', () => {
    const today = local(new Date())
    const habits: HabitLike[] = [
      { id: 'h1', text: '晨跑', streak: 3, streakPct: 0, ticks: [today] },
      { id: 'h2', text: '阅读', streak: 0, streakPct: 0, ticks: [] },
    ]
    const wrapper = mount(HabitCalendarPanel, { props: { habits } })
    expect(wrapper.find('.hcp-empty').exists()).toBe(false)
    expect(wrapper.find('.hcp-overview').exists()).toBe(true)
    expect(wrapper.text()).toContain('本周打卡')
    expect(wrapper.text()).toContain('累计打卡')
    expect(wrapper.text()).toContain('活跃习惯')
    expect(wrapper.text()).toContain('今日')
  })

  it('渲染近 4 周热图格子', () => {
    const today = local(new Date())
    const habits: HabitLike[] = [
      { id: 'h1', text: '晨跑', streak: 3, streakPct: 0, ticks: [today] },
    ]
    const wrapper = mount(HabitCalendarPanel, { props: { habits } })
    expect(wrapper.find('.hcp-heatmap').exists()).toBe(true)
    // 4 列 × 7 行 = 28 格，外加图外空前导考虑，至少 28 个
    expect(wrapper.findAll('.hcp-cell').length).toBeGreaterThanOrEqual(28)
  })

  it('以打卡次数最多的习惯排序展示维度统计', () => {
    const today = local(new Date())
    const habits: HabitLike[] = [
      { id: 'h1', text: '晨跑', streak: 3, streakPct: 0, ticks: [today, '2026-08-30'] },
      { id: 'h2', text: '阅读', streak: 0, streakPct: 0, ticks: [] },
    ]
    const wrapper = mount(HabitCalendarPanel, { props: { habits } })
    expect(wrapper.find('.hcp-dim').exists()).toBe(true)
    // 晨跑 hits=2 应排在阅读 hits=0 之前
    const names = wrapper.findAll('.hcp-dim-name').map(n => n.text())
    expect(names[0]).toBe('晨跑')
    // 晨跑显示连续天
    const texts = wrapper.text()
    expect(texts).toContain('2 次')
    expect(texts).toContain('🔥 3 天')
    expect(texts).toContain('未起步')
  })

  it('今日无打卡时显示中性徽标文案', () => {
    const habits: HabitLike[] = [
      { id: 'h1', text: '晨跑', streak: 0, streakPct: 0, ticks: ['2026-08-30'] },
    ]
    const wrapper = mount(HabitCalendarPanel, { props: { habits } })
    expect(wrapper.text()).toContain('今日未打卡')
  })

  it('今日有打卡时徽标显示今日打卡数', () => {
    const today = local(new Date())
    const habits: HabitLike[] = [
      { id: 'h1', text: '晨跑', streak: 0, streakPct: 0, ticks: [today] },
      { id: 'h2', text: '阅读', streak: 0, streakPct: 0, ticks: [today] },
    ]
    const wrapper = mount(HabitCalendarPanel, { props: { habits } })
    expect(wrapper.text()).toContain(`今日 ${2} 打卡`)
  })
})