// ============================================================
// WorkHabitArchivePanel 工作习惯档案面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkHabitArchivePanel from '../WorkHabitArchivePanel.vue'
import type { LogEntry, LogEntryType } from '../../modules/worklog/types'

const DAY = 86_400_000
const NOW = new Date('2026-08-20T12:00:00Z').getTime()

function mk(
  type: LogEntryType,
  daysAgo: number,
  hour: number,
  tags: string[] = [],
  mood: LogEntry['mood'] = 'calm',
): LogEntry {
  const d = new Date(NOW - daysAgo * DAY)
  d.setHours(hour, 0, 0, 0)
  return {
    id: `${type}_${daysAgo}_${hour}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: '日志',
    content: '内容',
    mood,
    tags,
    sessionIds: [],
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
  }
}

function mountPanel(entries: LogEntry[]) {
  return mount(WorkHabitArchivePanel, { props: { entries } })
}

describe('WorkHabitArchivePanel 工作习惯档案', () => {
  it('空态：标题 + 习惯未显影徽标 + 引导文案', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('工作习惯档案')
    expect(wrapper.text()).toContain('习惯未显影')
    expect(wrapper.text()).toContain('还没有工作日志可供分析')
  })

  it('填充态：徽标为习惯显影（有日志但连续<7）', () => {
    const entries = [mk('journal', 0, 9), mk('reflection', 1, 10)]
    const wrapper = mountPanel(entries)
    const badge = wrapper.find('.whp-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('习惯显影')
  })

  it('填充态：档案概览八格', () => {
    const entries = [mk('journal', 0, 9), mk('reflection', 1, 10), mk('plan', 2, 14)]
    const wrapper = mountPanel(entries)
    const overviewBlock = wrapper.findAll('.whp-block').find((b) => b.text().includes('档案概览'))!
    const cells = overviewBlock.findAll('.whp-cell')
    expect(cells.length).toBe(8)
    expect(wrapper.text()).toContain('日志总数')
    expect(wrapper.text()).toContain('日均日志')
    expect(wrapper.text()).toContain('当前连续')
    expect(wrapper.text()).toContain('工作节奏')
  })

  it('填充态：时段生产力渲染 5 个时段', () => {
    const entries = [
      mk('journal', 0, 8), // morning
      mk('journal', 0, 10), // forenoon
      mk('journal', 1, 14), // afternoon
      mk('journal', 1, 19), // evening
      mk('journal', 2, 22), // night
    ]
    const wrapper = mountPanel(entries)
    const slotBlock = wrapper.findAll('.whp-block').find((b) => b.text().includes('时段生产力'))!
    const rows = slotBlock.findAll('.whp-slot-row')
    expect(rows.length).toBe(5)
    expect(slotBlock.text()).toContain('清晨')
    expect(slotBlock.text()).toContain('深夜')
  })

  it('填充态：标签偏好渲染标签与计数', () => {
    const entries = [
      mk('journal', 0, 9, ['专注']),
      mk('journal', 1, 10, ['专注', '深度']),
      mk('journal', 2, 11, ['专注']),
    ]
    const wrapper = mountPanel(entries)
    const tagBlock = wrapper.findAll('.whp-block').find((b) => b.text().includes('标签偏好'))!
    expect(tagBlock.exists()).toBe(true)
    expect(tagBlock.text()).toContain('#专注')
    expect(tagBlock.text()).toContain('#深度')
  })

  it('温和洞察列表非空（有日志时生成习惯洞察）', () => {
    const entries = [
      mk('journal', 0, 9, ['专注']),
      mk('journal', 1, 10, ['专注']),
      mk('journal', 2, 11, ['专注']),
    ]
    const wrapper = mountPanel(entries)
    const insights = wrapper.findAll('.whp-insight')
    expect(insights.length).toBeGreaterThan(0)
  })

  it('数据联动：props 更新后从空态进入填充态', async () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('习惯未显影')
    await wrapper.setProps({
      entries: [mk('journal', 0, 9), mk('reflection', 1, 10)],
    })
    expect(wrapper.text()).not.toContain('习惯未显影')
    expect(wrapper.text()).toContain('档案概览')
  })
})
