// ============================================================
// RestAchievementTrendPanel 休憩成就与趋势面板测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { BreakRecord, RestPractice } from '../../modules/rest'

const DAY = 86_400_000

// ---- Storage Mock ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import RestAchievementTrendPanel from '../RestAchievementTrendPanel.vue'

const DEFAULT_PRACTICES: RestPractice[] = [
  { id: 'meditation', name: '冥想', icon: '🧘', color: '#8ab87a', description: '静坐冥想', recovery: 85, tags: ['身心', '专注'] },
  { id: 'nap', name: '小憩', icon: '😴', color: '#7ab89a', description: '短暂休息', recovery: 70, tags: ['恢复', '精力'] },
  { id: 'walk', name: '散步', icon: '🚶', color: '#8ac4a0', description: '户外漫步', recovery: 75, tags: ['运动', '户外'] },
  { id: 'tea', name: '品茶', icon: '🍵', color: '#c4a07a', description: '一杯热茶', recovery: 55, tags: ['仪式', '慢生活'] },
  { id: 'stretch', name: '拉伸', icon: '🤸', color: '#7ac4a8', description: '舒展身体', recovery: 80, tags: ['运动', '身体'] },
]

function toDay(date: Date): string {
  return date.toISOString().split('T')[0]
}

function mk(activity: string, duration: number, mood: number, daysAgo: number): BreakRecord {
  const d = new Date(Date.now() - daysAgo * DAY)
  return { id: `${activity}_${Math.random().toString(36).slice(2, 6)}`, activity, duration, mood, date: toDay(d) }
}

async function mountPanel(records: BreakRecord[], practices: RestPractice[] = DEFAULT_PRACTICES) {
  const wrapper = mount(RestAchievementTrendPanel, {
    props: { records, practices },
  })
  // 等待 onMounted 中 checkAchievements / computeTrend 的响应式更新 flush
  await nextTick()
  return wrapper
}

describe('RestAchievementTrendPanel 休憩成就与趋势', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('标题徽标渲染', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('休憩成就与趋势')
    expect(wrapper.text()).toContain('成就与趋势')
  })

  it('空态：提示文案 + 未解锁徽标', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('尚无休憩记录')
    expect(wrapper.text()).toContain('尚未启程')
    // 空态不渲染趋势图与成就勋章
    expect(wrapper.findAll('.ratp-ach-card').length).toBe(0)
  })

  it('填充态：渲染 15 张成就勋章卡片', async () => {
    const records = [mk('meditation', 15, 4, 0), mk('walk', 30, 5, 1)]
    const wrapper = await mountPanel(records)
    const cards = wrapper.findAll('.ratp-ach-card')
    expect(cards.length).toBe(15)
    expect(wrapper.text()).toContain('初次休息')
    expect(wrapper.text()).toContain('三日坚持')
    expect(wrapper.text()).toContain('百次休憩')
  })

  it('填充态：趋势概览展示总次数与连续天数', async () => {
    const records = [mk('meditation', 15, 4, 0), mk('walk', 30, 5, 1)]
    const wrapper = await mountPanel(records)
    expect(wrapper.text()).toContain('趋势概览')
    expect(wrapper.text()).toContain('总次数')
    // 2 条记录
    expect(wrapper.text()).toContain('连续天数')
  })

  it('填充态：渲染 30 日趋势柱状图', async () => {
    const records = [mk('meditation', 15, 4, 0), mk('walk', 30, 5, 1)]
    const wrapper = await mountPanel(records)
    const cols = wrapper.findAll('.ratp-bar-col')
    expect(cols.length).toBe(30)
    const chart = wrapper.find('.ratp-chart')
    expect(chart.attributes('aria-label')).toContain('近30日')
  })

  it('成就解锁：有记录时初次休息带 ✓ 标记', async () => {
    const records = [mk('meditation', 15, 4, 0)]
    const wrapper = await mountPanel(records)
    const firstCard = wrapper.findAll('.ratp-ach-card').find(c => c.text().includes('初次休息'))!
    expect(firstCard).toBeDefined()
    expect(firstCard.find('.ratp-ach-check').exists()).toBe(true)
  })

  it('重置成就：点击重置按钮后徽标回到未解锁态', async () => {
    const records = [mk('meditation', 15, 4, 0)]
    const wrapper = await mountPanel(records)
    await wrapper.find('.ratp-reset').trigger('click')
    await nextTick()
    const firstCard = wrapper.findAll('.ratp-ach-card').find(c => c.text().includes('初次休息'))!
    expect(firstCard.find('.ratp-ach-check').exists()).toBe(false)
  })
})