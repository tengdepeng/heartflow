import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const h = vi.hoisted(() => {
  const seedData = (): any[] => [
    {
      id: 'hr-1', type: 'water', title: '喝水提醒', message: '该喝水了！保持水分充足',
      intervalMinutes: 60, enabled: true, activeHours: { start: '08:00', end: '22:00' },
      activeDays: [0, 1, 2, 3, 4, 5, 6], todayCount: 2, lastRemindedAt: '2026-09-05T10:00:00', createdAt: 'now',
    },
    {
      id: 'hr-2', type: 'move', title: '活动提醒', message: '起来活动一下吧！',
      intervalMinutes: 90, enabled: true, activeHours: { start: '09:00', end: '18:00' },
      activeDays: [1, 2, 3, 4, 5], todayCount: 1, createdAt: 'now',
    },
    {
      id: 'hr-3', type: 'stretch', title: '拉伸提醒', message: '做一组拉伸，缓解肌肉紧张',
      intervalMinutes: 120, enabled: false, activeHours: { start: '09:00', end: '18:00' },
      activeDays: [1, 2, 3, 4, 5], todayCount: 0, createdAt: 'now',
    },
  ]
  const state = { __v_isRef: true, value: [] as any[] }
  return {
    reminders: state,
    seedData,
    initReminders: vi.fn(),
    toggleReminder: vi.fn((id: string) => {
      const r = state.value.find((x) => x.id === id)
      if (r) r.enabled = !r.enabled
    }),
    recordReminderSent: vi.fn((id: string) => {
      const r = state.value.find((x) => x.id === id)
      if (r) { r.todayCount++; r.lastRemindedAt = '2026-09-05T11:00:00' }
    }),
    resetDailyCounts: vi.fn(() => { state.value.forEach((r) => { r.todayCount = 0 }) }),
    getEnabledReminders: vi.fn(() => state.value.filter((r) => r.enabled)),
  }
})

vi.mock('../../modules/body/health-dashboard', () => ({
  useHealthReminders: () => h,
}))

import HealthRemindersPanel from '../HealthRemindersPanel.vue'

function getWrapper() {
  return mount(HealthRemindersPanel)
}

describe('HealthRemindersPanel · 健康提醒（INCR-111 恢复）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.reminders.value.length = 0
  })

  it('空态：标题 + onMounted 调 initReminders + 暂无健康提醒', async () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('健康提醒')
    expect(wrapper.text()).toContain('提醒 · 节律 · 护身')
    expect(h.initReminders).toHaveBeenCalled()
    expect(wrapper.find('.hmr-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无健康提醒')
  })

  it('有提醒渲染列表：类型标签·消息·频率·时段·星期', async () => {
    h.reminders.value.push(...h.seedData())
    const wrapper = getWrapper()
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.hmr-item')
    expect(items).toHaveLength(3)
    expect(wrapper.text()).toContain('喝水提醒')
    expect(wrapper.text()).toContain('该喝水了！保持水分充足')
    expect(wrapper.text()).toContain('每 60 分钟')
    expect(wrapper.text()).toContain('08:00–22:00')
    expect(wrapper.text()).toContain('每日')
    expect(wrapper.text()).toContain('周一·周二·周三·周四·周五')
  })

  it('启停切换：点击停用调 toggleReminder 并切换状态', async () => {
    h.reminders.value.push(...h.seedData())
    const wrapper = getWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.hmr-toggle')[0].trigger('click')
    expect(h.toggleReminder).toHaveBeenCalledWith('hr-1')
    expect(h.reminders.value[0].enabled).toBe(false)
  })

  it('触发一次：调 recordReminderSent 更新今日触发次数', async () => {
    h.reminders.value.push(...h.seedData())
    const wrapper = getWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.hmr-fire')[0].trigger('click')
    expect(h.recordReminderSent).toHaveBeenCalledWith('hr-1')
    expect(h.reminders.value[0].todayCount).toBe(3)
  })

  it('重置今日计数：调 resetDailyCounts 清零', async () => {
    h.reminders.value.push(...h.seedData())
    const wrapper = getWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.find('.hmr-reset').trigger('click')
    expect(h.resetDailyCounts).toHaveBeenCalled()
    expect(h.reminders.value.every((r) => r.todayCount === 0)).toBe(true)
  })

  it('生效统计：渲染生效提醒/今日触发/此刻生效', async () => {
    h.reminders.value.push(...h.seedData())
    const wrapper = getWrapper()
    await wrapper.vm.$nextTick()
    const nums = wrapper.findAll('.hmr-stat-num').map((n) => n.text())
    expect(nums[0]).toBe('2')
    expect(nums[1]).toBe('3')
    expect(nums[2]).toBe('2')
    expect(h.getEnabledReminders).toHaveBeenCalled()
  })
})
