// ============================================================
// 复垦气象档案面板（INCR-33）测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReclamationWeatherPanel from '../ReclamationWeatherPanel.vue'
import type { UItem } from '../../modules/unfinished'

const DAY = 86_400_000

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString()
}

function mk(over: Partial<UItem> = {}): UItem {
  const at = over.at ?? daysAgo(0)
  return {
    id: over.id ?? `i_${Math.random().toString(36).slice(2, 7)}`,
    type: over.type ?? 'seed',
    text: over.text ?? '一件事',
    at,
    updatedAt: over.updatedAt ?? at,
    dormantSince: over.dormantSince,
    status: over.status,
    progress: over.progress,
    completed: over.completed,
    completedAt: over.completedAt,
    sprouted: over.sprouted,
  }
}

function mountPanel(items: UItem[]) {
  return mount(ReclamationWeatherPanel, { props: { items } })
}

describe('ReclamationWeatherPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染档案标题与空态引导', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('复垦气象')
    expect(wrapper.find('.hf-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('花园还空着')
  })

  it('渲染花园气象统计与类型分布', () => {
    const items = [
      mk({ type: 'seed' }),
      mk({ type: 'seed', completed: true }),
      mk({ type: 'book', progress: '第3章' }),
      mk({ type: 'draft' }),
    ]
    const wrapper = mountPanel(items)
    expect(wrapper.find('.ufw-card').exists()).toBe(true)
    const txt = wrapper.text()
    expect(txt).toContain('花园气象')
    expect(txt).toContain('共 4 件')
    expect(txt).toContain('已完成 1')
    expect(txt).toContain('类型分布')
    // 活跃项 3 件中种子 1 / 书 1 / 笔记 1
    expect(txt).toContain('种子')
    expect(txt).toContain('开了头的书')
    expect(txt).toContain('半截笔记')
  })

  it('渲染沉淀分档（新芽/渐长/蒙尘/遗忘）', () => {
    const items = [
      mk({ at: daysAgo(2) }),
      mk({ at: daysAgo(10) }),
      mk({ at: daysAgo(45) }),
      mk({ at: daysAgo(150) }),
    ]
    const wrapper = mountPanel(items)
    const txt = wrapper.text()
    expect(txt).toContain('沉淀分档')
    expect(txt).toContain('新芽')
    expect(txt).toContain('渐长')
    expect(txt).toContain('蒙尘')
    expect(txt).toContain('遗忘')
  })

  it('渲染今日该拾起建议', () => {
    const items = [
      mk({ type: 'seed', text: '刚动过的种子', at: daysAgo(1) }),
      mk({ type: 'book', text: '去年打开的书', status: 'abandoned', at: daysAgo(200) }),
    ]
    const wrapper = mountPanel(items)
    expect(wrapper.text()).toContain('今日该拾起')
    expect(wrapper.text()).toContain('刚动过的种子')
  })

  it('渲染拾起时机榜（按价值排序取前五）', () => {
    const items = [
      mk({ id: 'a', type: 'seed', text: 'A', at: daysAgo(1) }),
      mk({ id: 'b', type: 'book', text: 'B', status: 'abandoned', at: daysAgo(200) }),
      mk({ id: 'c', type: 'draft', text: 'C', at: daysAgo(5) }),
    ]
    const wrapper = mountPanel(items)
    const rows = wrapper.findAll('.ufw-pick-row')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(5)
    expect(wrapper.text()).toContain('拾起时机')
  })

  it('渲染复垦洞察列表', () => {
    const items = [
      mk({ type: 'seed', text: '近事', at: daysAgo(1) }),
      mk({ type: 'book', text: '旧书', at: daysAgo(120) }),
    ]
    const wrapper = mountPanel(items)
    expect(wrapper.find('.ufw-insights').exists()).toBe(true)
    expect(wrapper.findAll('.ufw-insights li').length).toBeGreaterThan(0)
  })
})