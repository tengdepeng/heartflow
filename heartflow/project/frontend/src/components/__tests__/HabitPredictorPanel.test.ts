import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Habit } from '../../modules/discipline/types'
import HabitPredictorPanel from '../HabitPredictorPanel.vue'

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000)
  return d.toISOString().split('T')[0]
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h-1',
    title: '晨跑',
    description: '',
    icon: '🏃',
    difficulty: 'medium',
    frequency: 'daily',
    target: 1,
    streak: 5,
    bestStreak: 10,
    totalCompleted: 20,
    enabled: true,
    createdAt: '2026-08-01T00:00:00',
    completedDates: [],
    ...overrides,
  }
}

function getWrapper(habits: Habit[]) {
  return mount(HabitPredictorPanel, { props: { habits } })
}

describe('HabitPredictorPanel · 习惯预测（INCR-136）', () => {
  it('空态：无习惯时健康度 F + 引导文案', () => {
    const wrapper = getWrapper([])
    expect(wrapper.text()).toContain('习惯健康度')
    expect(wrapper.text()).toContain('需改善')
    expect(wrapper.find('.hpp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有可预测的习惯')
  })

  it('健康度评分：渲染总分 + 等级徽标 + 五维标签', () => {
    const habits = [
      makeHabit({ id: 'h-1', title: '晨跑', streak: 10, bestStreak: 15, totalCompleted: 30, difficulty: 'medium' }),
      makeHabit({ id: 'h-2', title: '阅读', streak: 6, bestStreak: 8, totalCompleted: 18, difficulty: 'easy', icon: '📖' }),
    ]
    const wrapper = getWrapper(habits)
    expect(wrapper.find('.hpp-score-num').exists()).toBe(true)
    expect(wrapper.text()).toContain('连续性')
    expect(wrapper.text()).toContain('完成率')
    expect(wrapper.text()).toContain('多样性')
    expect(wrapper.text()).toContain('成长性')
    expect(wrapper.text()).toContain('韧性')
    expect(wrapper.findAll('.hpp-dim')).toHaveLength(5)
  })

  it('连续预测：当前连续 → 预测7/30天 + 下一里程碑 + 中断概率', () => {
    const habit = makeHabit({
      streak: 5,
      completedDates: [daysAgo(6), daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)],
    })
    const wrapper = getWrapper([habit])
    expect(wrapper.text()).toContain('连续预测')
    expect(wrapper.text()).toContain('下一里程碑')
    expect(wrapper.text()).toContain('中断概率')
    expect(wrapper.text()).toContain('5')
  })

  it('完成率预测：≥7 数据点渲染当前/预测完成率 + 置信区间', () => {
    const habit = makeHabit({
      completedDates: [daysAgo(9), daysAgo(8), daysAgo(7), daysAgo(6), daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)],
    })
    const wrapper = getWrapper([habit])
    expect(wrapper.text()).toContain('完成率预测')
    expect(wrapper.text()).toContain('置信区间')
    expect(wrapper.text()).toContain('100%')
  })

  it('中断预警：无完成记录 + 高难度 → 高风险 + 风险因素 + 预防建议', () => {
    const habit = makeHabit({ difficulty: 'hard', completedDates: [] })
    const wrapper = getWrapper([habit])
    expect(wrapper.text()).toContain('中断预警')
    expect(wrapper.text()).toContain('高风险')
    expect(wrapper.text()).toContain('尽快行动')
    expect(wrapper.text()).toContain('最近完成间隔')
    expect(wrapper.text()).toContain('习惯难度')
    expect(wrapper.text()).toContain('立即完成「晨跑」的今日打卡')
  })

  it('趋势预测：渲染短/中/长期方向 + 稳定性', () => {
    const dates = Array.from({ length: 21 }, (_key, i) => daysAgo(20 - i))
    const habit = makeHabit({ completedDates: dates })
    const wrapper = getWrapper([habit])
    expect(wrapper.text()).toContain('趋势预测')
    expect(wrapper.text()).toContain('短期')
    expect(wrapper.text()).toContain('中期')
    expect(wrapper.text()).toContain('长期')
    expect(wrapper.text()).toContain('稳定性')
  })

  it('多习惯：每个启用习惯渲染一张预测卡', () => {
    const habits = [
      makeHabit({ id: 'h-1', title: '晨跑', completedDates: [daysAgo(0)] }),
      makeHabit({ id: 'h-2', title: '阅读', icon: '📖', completedDates: [daysAgo(0)] }),
      makeHabit({ id: 'h-3', title: '停用习惯', enabled: false }),
    ]
    const wrapper = getWrapper(habits)
    expect(wrapper.findAll('.hpp-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('晨跑')
    expect(wrapper.text()).toContain('阅读')
    expect(wrapper.text()).not.toContain('停用习惯')
  })
})
