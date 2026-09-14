// ============================================================
// NotificationCenterPanel 通知中心面板测试（INCR-94）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockNotifications = ref<any[]>([])
const mockRules = ref<any[]>([])
const mockPreferences = ref<any>({
  enabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  disabledChannels: [],
  maxNotifications: 100,
  retentionDays: 30,
})

const mockMarkAsRead = vi.fn()
const mockMarkAllAsRead = vi.fn()
const mockDismiss = vi.fn()
const mockToggleRule = vi.fn()
const mockUpdatePreferences = vi.fn()
const mockIsInQuietHours = vi.fn(() => false)

const mockUnreadNotifications = computed(() =>
  mockNotifications.value.filter(n => !n.read && !n.dismissed),
)
const mockUnreadCount = computed(() => mockUnreadNotifications.value.length)
const mockStats = computed(() => {
  const all = mockNotifications.value
  const byType: Record<string, number> = {}
  for (const n of all) byType[n.type] = (byType[n.type] ?? 0) + 1
  return {
    totalSent: all.length,
    totalRead: all.filter(n => n.read).length,
    totalDismissed: all.filter(n => n.dismissed).length,
    byType,
    byChannel: {},
    readRate: all.length > 0 ? Math.round((all.filter(n => n.read).length / all.length) * 100) : 0,
  }
})

vi.mock('../../modules/touchpoints/notification-engine', () => ({
  NOTIFICATION_TYPE_META: {
    reminder: { label: '提醒', icon: '⏰', color: '#f0c040' },
    achievement: { label: '成就', icon: '🏆', color: '#d98c7a' },
    insight: { label: '洞察', icon: '💡', color: '#6b9fc4' },
    greeting: { label: '问候', icon: '👋', color: '#8a9a7a' },
    system: { label: '系统', icon: '⚙️', color: '#7a7f8c' },
    celebration: { label: '庆祝', icon: '🎉', color: '#f6b26b' },
  },
  NOTIFICATION_PRIORITY_META: {
    urgent: { label: '紧急', color: '#ef4444' },
    normal: { label: '普通', color: '#f0c040' },
    low: { label: '低', color: '#34d399' },
  },
  useNotificationEngine: () => ({
    notifications: mockNotifications,
    rules: mockRules,
    preferences: mockPreferences,
    unreadNotifications: mockUnreadNotifications,
    unreadCount: mockUnreadCount,
    recentNotifications: computed(() => mockNotifications.value),
    stats: mockStats,
    send: vi.fn(),
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    dismiss: mockDismiss,
    cleanupExpired: vi.fn(),
    cleanupOld: vi.fn(),
    updateRule: vi.fn(),
    toggleRule: mockToggleRule,
    canTriggerRule: vi.fn(() => true),
    triggerRule: vi.fn(),
    updatePreferences: mockUpdatePreferences,
    isInQuietHours: mockIsInQuietHours,
  }),
}))

import NotificationCenterPanel from '../NotificationCenterPanel.vue'

const sampleNotifications = [
  {
    id: 'n1',
    type: 'reminder',
    priority: 'urgent',
    title: '专注计时结束',
    message: '25 分钟专注已完成，休息一下吧',
    icon: '⏰',
    channel: 'log',
    read: false,
    dismissed: false,
    createdAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'n2',
    type: 'achievement',
    priority: 'normal',
    title: '达成新成就',
    message: '连续专注 7 天',
    icon: '🏆',
    channel: 'log',
    read: false,
    dismissed: false,
    createdAt: '2026-06-01T09:00:00Z',
  },
]

const sampleRules = [
  {
    id: 'rule-daily-greeting',
    name: '每日问候',
    type: 'greeting',
    condition: 'time:morning_first_open',
    template: { title: '早安', message: '新的一天', icon: '👋', channel: 'floating' },
    enabled: true,
    cooldownMinutes: 60,
  },
]

async function mountPanel() {
  const wrapper = mount(NotificationCenterPanel)
  await nextTick()
  return wrapper
}

describe('NotificationCenterPanel 通知中心', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifications.value = []
    mockRules.value = []
    mockPreferences.value = {
      enabled: false,
      quietStart: '22:00',
      quietEnd: '07:00',
      disabledChannels: [],
      maxNotifications: 100,
      retentionDays: 30,
    }
    mockIsInQuietHours.mockReturnValue(false)
  })

  it('标题徽标与四个 tab 渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('通知中心')
    expect(wrapper.text()).toContain('收件箱 · 规则 · 偏好 · 统计')
    expect(wrapper.findAll('.ncp-tab').length).toBe(4)
  })

  it('收件箱空态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('收件箱空空如也')
  })

  it('收件箱填充态：渲染未读通知与操作按钮', async () => {
    mockNotifications.value = sampleNotifications
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('专注计时结束')
    expect(wrapper.text()).toContain('达成新成就')
    expect(wrapper.findAll('.ncp-item').length).toBe(2)
    expect(wrapper.find('.ncp-item-priority').text()).toContain('紧急')
  })

  it('标为已读与关闭调用引擎方法', async () => {
    mockNotifications.value = sampleNotifications
    const wrapper = await mountPanel()
    const readBtn = wrapper.findAll('.ncp-btn--small').find(b => b.text() === '标为已读')
    await readBtn!.trigger('click')
    expect(mockMarkAsRead).toHaveBeenCalledWith('n1')
    const dismissBtn = wrapper.findAll('.ncp-btn--small').find(b => b.text() === '关闭')
    await dismissBtn!.trigger('click')
    expect(mockDismiss).toHaveBeenCalledWith('n1')
  })

  it('全部标为已读按钮存在并触发', async () => {
    mockNotifications.value = sampleNotifications
    const wrapper = await mountPanel()
    const btn = wrapper.find('.ncp-btn')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(mockMarkAllAsRead).toHaveBeenCalled()
  })

  it('规则 tab：渲染规则并可切换启用', async () => {
    mockRules.value = sampleRules
    const wrapper = await mountPanel()
    await wrapper.findAll('.ncp-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('每日问候')
    expect(wrapper.text()).toContain('启用')
    const toggle = wrapper.find('.ncp-toggle')
    await toggle.trigger('click')
    expect(mockToggleRule).toHaveBeenCalledWith('rule-daily-greeting')
  })

  it('偏好 tab：切换启用调用 updatePreferences', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.ncp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('免打扰开始')
    const checkbox = wrapper.find('.ncp-pref-row input[type="checkbox"]')
    await checkbox.setValue(true)
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ enabled: true })
  })

  it('统计 tab：渲染统计与类型分布', async () => {
    mockNotifications.value = sampleNotifications
    const wrapper = await mountPanel()
    await wrapper.findAll('.ncp-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已发送')
    expect(wrapper.text()).toContain('按类型分布')
    expect(wrapper.text()).toContain('提醒')
    expect(wrapper.text()).toContain('成就')
  })
})
