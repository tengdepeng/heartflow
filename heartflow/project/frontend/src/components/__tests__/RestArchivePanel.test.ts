// ============================================================
// RestArchivePanel 休憩档案面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RestArchivePanel from '../RestArchivePanel.vue'
import type { BreakRecord, RestPractice } from '../../modules/rest'
import { DEFAULT_PRACTICES } from '../../modules/rest'

const DAY = 86_400_000
const NOW = new Date('2026-08-22T12:00:00.000Z')

function mk(activity: string, duration: number, mood: number, daysAgo: number): BreakRecord {
  const d = new Date(NOW.getTime() - daysAgo * DAY)
  return {
    id: `${activity}_${Math.random().toString(36).slice(2, 6)}`,
    activity,
    duration,
    mood,
    date: d.toISOString().split('T')[0],
  }
}

function mountPanel(records: BreakRecord[], practices: RestPractice[] = DEFAULT_PRACTICES) {
  return mount(RestArchivePanel, {
    props: { records, practices },
  })
}

describe('RestArchivePanel 休憩档案', () => {
  it('空态：标题 + 息壤未耕徽标 + 引导文案', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('休憩档案')
    expect(wrapper.text()).toContain('息壤未耕')
    expect(wrapper.text()).toContain('息壤未曾耕动')
  })

  it('填充态：健康标签徽标（非空态标签）', () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      mk(['meditation', 'walk', 'tea', 'stretch', 'music'][i % 5], 20, 4, i % 12),
    )
    const wrapper = mountPanel(records)
    const badge = wrapper.find('.rap-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).not.toBe('息壤未耕')
  })

  it('填充态：档案概览八格', () => {
    const records = [
      mk('meditation', 15, 4, 1),
      mk('walk', 30, 5, 2),
      mk('tea', 10, 3, 5),
    ]
    const wrapper = mountPanel(records)
    const overviewBlock = wrapper.findAll('.rap-block').find((b) => b.text().includes('档案概览'))!
    const cells = overviewBlock.findAll('.rap-cell')
    expect(cells.length).toBe(8)
    expect(wrapper.text()).toContain('总次数')
    expect(wrapper.text()).toContain('平均时长')
    expect(wrapper.text()).toContain('休息日数')
  })

  it('填充态：活动分布渲染名称与次数', () => {
    const records = [
      mk('p1', 15, 4, 1), // 冥想
      mk('p1', 20, 5, 2),
      mk('p3', 30, 4, 3), // 散步
    ]
    const wrapper = mountPanel(records)
    const activityBlock = wrapper.findAll('.rap-block').find((b) => b.text().includes('活动分布'))!
    expect(activityBlock.exists()).toBe(true)
    expect(activityBlock.text()).toContain('冥想')
    expect(activityBlock.text()).toContain('散步')
    expect(activityBlock.text()).toContain('2次')
  })

  it('填充态：休憩节律五格', () => {
    const records = Array.from({ length: 8 }, (_, i) => mk('meditation', 20, 4, i))
    const wrapper = mountPanel(records)
    const rhythmBlock = wrapper.findAll('.rap-block').find((b) => b.text().includes('休憩节律'))!
    const cells = rhythmBlock.findAll('.rap-cell')
    expect(cells.length).toBe(5)
    expect(wrapper.text()).toContain('连续天数')
    expect(wrapper.text()).toContain('平均间隔')
  })

  it('填充态：恢复健康大字评分 + 三进度条', () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      mk(['meditation', 'walk', 'tea', 'stretch', 'music'][i % 5], 20, 4, i % 12),
    )
    const wrapper = mountPanel(records)
    expect(wrapper.text()).toContain('恢复健康')
    const bars = wrapper.findAll('.rap-health-row')
    expect(bars.length).toBe(3)
    expect(wrapper.text()).toContain('广度')
    expect(wrapper.text()).toContain('节律')
    expect(wrapper.text()).toContain('滋养')
  })

  it('温和洞察列表有界且非空', () => {
    const records = [
      mk('meditation', 20, 4, 1),
      mk('walk', 30, 5, 2),
      mk('tea', 10, 3, 3),
    ]
    const wrapper = mountPanel(records)
    const insights = wrapper.findAll('.rap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('数据联动：props 更新后从空态进入填充态', async () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('息壤未耕')
    await wrapper.setProps({
      records: [mk('meditation', 20, 4, 1), mk('walk', 30, 5, 2)],
    })
    expect(wrapper.text()).not.toContain('息壤未耕')
    expect(wrapper.text()).toContain('档案概览')
  })
})
