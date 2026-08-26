// ============================================================
// 殿堂触角 · 通知引擎
// 系统通知、定时提醒、智能推送、通知历史
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 通知类型 */
export type NotificationType = 'reminder' | 'achievement' | 'insight' | 'greeting' | 'system' | 'celebration'

/** 通知优先级 */
export type NotificationPriority = 'urgent' | 'normal' | 'low'

/** 通知渠道 */
export type NotificationChannel = 'widget' | 'glow' | 'floating' | 'log'

/** 通知 */
export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  icon: string
  channel: NotificationChannel
  /** 关联房间 ID */
  roomId?: string
  /** 动作链接 */
  actionUrl?: string
  /** 动作文本 */
  actionText?: string
  /** 是否已读 */
  read: boolean
  /** 是否已关闭 */
  dismissed: boolean
  /** 创建时间 */
  createdAt: string
  /** 过期时间 */
  expiresAt?: string
  /** 元数据 */
  metadata?: Record<string, unknown>
}

/** 通知规则 */
export interface NotificationRule {
  id: string
  name: string
  type: NotificationType
  /** 触发条件表达式 */
  condition: string
  /** 通知模板 */
  template: {
    title: string
    message: string
    icon: string
    channel: NotificationChannel
  }
  /** 是否启用 */
  enabled: boolean
  /** 冷却时间（分钟） */
  cooldownMinutes: number
  /** 上次触发时间 */
  lastTriggeredAt?: string
}

/** 通知偏好 */
export interface NotificationPreferences {
  /** 是否启用通知 */
  enabled: boolean
  /** 免打扰开始时间（HH:mm） */
  quietStart: string
  /** 免打扰结束时间（HH:mm） */
  quietEnd: string
  /** 禁用的渠道 */
  disabledChannels: NotificationChannel[]
  /** 最大通知数 */
  maxNotifications: number
  /** 通知保留天数 */
  retentionDays: number
}

/** 通知统计 */
export interface NotificationStats {
  totalSent: number
  totalRead: number
  totalDismissed: number
  byType: Record<NotificationType, number>
  byChannel: Record<NotificationChannel, number>
  readRate: number
}

/** 通知类型元数据 */
export const NOTIFICATION_TYPE_META: Record<NotificationType, { label: string; icon: string; color: string }> = {
  reminder: { label: '提醒', icon: '⏰', color: '#f0c040' },
  achievement: { label: '成就', icon: '🏆', color: '#d98c7a' },
  insight: { label: '洞察', icon: '💡', color: '#6b9fc4' },
  greeting: { label: '问候', icon: '👋', color: '#8a9a7a' },
  system: { label: '系统', icon: '⚙️', color: '#7a7f8c' },
  celebration: { label: '庆祝', icon: '🎉', color: '#f6b26b' },
}

/** 通知优先级元数据 */
export const NOTIFICATION_PRIORITY_META: Record<NotificationPriority, { label: string; color: string }> = {
  urgent: { label: '紧急', color: '#ef4444' },
  normal: { label: '普通', color: '#f0c040' },
  low: { label: '低', color: '#34d399' },
}

/** 默认通知偏好 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  disabledChannels: [],
  maxNotifications: 100,
  retentionDays: 30,
}

/** 预设通知规则 */
export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'rule-daily-greeting',
    name: '每日问候',
    type: 'greeting',
    condition: 'time:morning_first_open',
    template: { title: '早安', message: '新的一天开始了，今日宜专注', icon: '🌅', channel: 'floating' },
    enabled: false,
    cooldownMinutes: 480,
  },
  {
    id: 'rule-focus-streak',
    name: '专注连击',
    type: 'achievement',
    condition: 'focus:streak_milestone',
    template: { title: '专注连击达成！', message: '你已经连续专注 {days} 天', icon: '🔥', channel: 'glow' },
    enabled: false,
    cooldownMinutes: 1440,
  },
  {
    id: 'rule-weekly-review',
    name: '周回顾提醒',
    type: 'reminder',
    condition: 'time:weekend',
    template: { title: '周回顾时间', message: '来看看本周的专注结晶吧', icon: '📊', channel: 'widget' },
    enabled: false,
    cooldownMinutes: 10080,
  },
  {
    id: 'rule-crystal-milestone',
    name: '结晶里程碑',
    type: 'celebration',
    condition: 'crystal:total_milestone',
    template: { title: '结晶里程碑', message: '你已经收集了 {count} 颗结晶', icon: '💎', channel: 'glow' },
    enabled: false,
    cooldownMinutes: 1440,
  },
  {
    id: 'rule-insight-digest',
    name: '洞察摘要',
    type: 'insight',
    condition: 'insight:daily_digest',
    template: { title: '今日洞察', message: '从数据中发现了一些有趣的事', icon: '💡', channel: 'log' },
    enabled: false,
    cooldownMinutes: 1440,
  },
]

/** 存储键 */
const NOTIFICATION_STORAGE_KEY = 'hf:touchpoints:notifications'
const NOTIFICATION_RULES_KEY = 'hf:touchpoints:notification_rules'
const NOTIFICATION_PREFS_KEY = 'hf:touchpoints:notification_prefs'

// ============================================================
// 通知引擎
// ============================================================

export function useNotificationEngine() {
  const notifications = ref<Notification[]>(loadNotifications())
  const rules = ref<NotificationRule[]>(loadRules())
  const preferences = ref<NotificationPreferences>(loadPreferences())

  // ---- 持久化 ----

  function loadNotifications(): Notification[] {
    try {
      const raw = storage.getKV<string>(NOTIFICATION_STORAGE_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveNotifications() {
    storage.setKV(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications.value))
  }

  function loadRules(): NotificationRule[] {
    try {
      const raw = storage.getKV<string>(NOTIFICATION_RULES_KEY, '')
      if (!raw) return [...DEFAULT_NOTIFICATION_RULES]
      return JSON.parse(raw)
    } catch { return [...DEFAULT_NOTIFICATION_RULES] }
  }

  function saveRules() {
    storage.setKV(NOTIFICATION_RULES_KEY, JSON.stringify(rules.value))
  }

  function loadPreferences(): NotificationPreferences {
    try {
      const raw = storage.getKV<string>(NOTIFICATION_PREFS_KEY, '')
      if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES }
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) }
    } catch { return { ...DEFAULT_NOTIFICATION_PREFERENCES } }
  }

  function savePreferences() {
    storage.setKV(NOTIFICATION_PREFS_KEY, JSON.stringify(preferences.value))
  }

  // ---- 计算属性 ----

  /** 未读通知 */
  const unreadNotifications = computed(() =>
    notifications.value.filter(n => !n.read && !n.dismissed)
  )

  /** 未读数量 */
  const unreadCount = computed(() => unreadNotifications.value.length)

  /** 最近通知（按时间排序） */
  const recentNotifications = computed(() => {
    return [...notifications.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
  })

  /** 通知统计 */
  const stats = computed<NotificationStats>(() => {
    const all = notifications.value
    const byType: Record<string, number> = {}
    const byChannel: Record<string, number> = {}
    for (const n of all) {
      byType[n.type] = (byType[n.type] ?? 0) + 1
      byChannel[n.channel] = (byChannel[n.channel] ?? 0) + 1
    }
    return {
      totalSent: all.length,
      totalRead: all.filter(n => n.read).length,
      totalDismissed: all.filter(n => n.dismissed).length,
      byType: byType as Record<NotificationType, number>,
      byChannel: byChannel as Record<NotificationChannel, number>,
      readRate: all.length > 0 ? Math.round((all.filter(n => n.read).length / all.length) * 100) : 0,
    }
  })

  // ---- 通知管理 ----

  /** 发送通知 */
  function send(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      priority?: NotificationPriority
      icon?: string
      channel?: NotificationChannel
      roomId?: string
      actionUrl?: string
      actionText?: string
      expiresInMinutes?: number
      metadata?: Record<string, unknown>
    }
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      priority: options?.priority ?? 'normal',
      title,
      message,
      icon: options?.icon ?? NOTIFICATION_TYPE_META[type].icon,
      channel: options?.channel ?? 'log',
      roomId: options?.roomId,
      actionUrl: options?.actionUrl,
      actionText: options?.actionText,
      read: false,
      dismissed: false,
      createdAt: new Date().toISOString(),
      expiresAt: options?.expiresInMinutes
        ? new Date(Date.now() + options.expiresInMinutes * 60000).toISOString()
        : undefined,
      metadata: options?.metadata,
    }
    notifications.value.push(notification)
    // 清理过期通知
    cleanupExpired()
    // 限制数量
    if (notifications.value.length > preferences.value.maxNotifications) {
      notifications.value = notifications.value.slice(-preferences.value.maxNotifications)
    }
    saveNotifications()
    return notification
  }

  /** 标记为已读 */
  function markAsRead(notificationId: string): boolean {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (!notification) return false
    notification.read = true
    saveNotifications()
    return true
  }

  /** 全部标记为已读 */
  function markAllAsRead() {
    for (const n of notifications.value) {
      n.read = true
    }
    saveNotifications()
  }

  /** 关闭通知 */
  function dismiss(notificationId: string): boolean {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (!notification) return false
    notification.dismissed = true
    saveNotifications()
    return true
  }

  /** 清理过期通知 */
  function cleanupExpired() {
    const now = Date.now()
    notifications.value = notifications.value.filter(n => {
      if (n.expiresAt && new Date(n.expiresAt).getTime() < now) return false
      return true
    })
  }

  /** 清理旧通知 */
  function cleanupOld() {
    const cutoff = Date.now() - preferences.value.retentionDays * 24 * 60 * 60 * 1000
    notifications.value = notifications.value.filter(n =>
      new Date(n.createdAt).getTime() > cutoff
    )
    saveNotifications()
  }

  // ---- 规则管理 ----

  /** 更新通知规则 */
  function updateRule(ruleId: string, updates: Partial<NotificationRule>): boolean {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return false
    Object.assign(rule, updates)
    saveRules()
    return true
  }

  /** 切换规则启用状态 */
  function toggleRule(ruleId: string): boolean {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return false
    rule.enabled = !rule.enabled
    saveRules()
    return rule.enabled
  }

  /** 检查规则是否可以触发 */
  function canTriggerRule(rule: NotificationRule): boolean {
    if (!rule.enabled) return false
    if (!preferences.value.enabled) return false
    if (rule.lastTriggeredAt) {
      const cooldownMs = rule.cooldownMinutes * 60 * 1000
      if (Date.now() - new Date(rule.lastTriggeredAt).getTime() < cooldownMs) return false
    }
    // 检查免打扰
    if (isInQuietHours()) return false
    return true
  }

  /** 触发规则 */
  function triggerRule(ruleId: string, context?: Record<string, string | number>): Notification | null {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule || !canTriggerRule(rule)) return null

    let title = rule.template.title
    let message = rule.template.message
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        title = title.replace(`{${key}}`, String(value))
        message = message.replace(`{${key}}`, String(value))
      }
    }

    rule.lastTriggeredAt = new Date().toISOString()
    saveRules()

    return send(rule.type, title, message, {
      icon: rule.template.icon,
      channel: rule.template.channel,
    })
  }

  // ---- 偏好管理 ----

  /** 更新通知偏好 */
  function updatePreferences(updates: Partial<NotificationPreferences>) {
    preferences.value = { ...preferences.value, ...updates }
    savePreferences()
  }

  /** 检查是否在免打扰时段 */
  function isInQuietHours(): boolean {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = preferences.value.quietStart.split(':').map(Number)
    const [endH, endM] = preferences.value.quietEnd.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return {
    // 状态
    notifications,
    rules,
    preferences,

    // 计算属性
    unreadNotifications,
    unreadCount,
    recentNotifications,
    stats,

    // 通知管理
    send,
    markAsRead,
    markAllAsRead,
    dismiss,
    cleanupExpired,
    cleanupOld,

    // 规则管理
    updateRule,
    toggleRule,
    canTriggerRule,
    triggerRule,

    // 偏好管理
    updatePreferences,
    isInQuietHours,
  }
}