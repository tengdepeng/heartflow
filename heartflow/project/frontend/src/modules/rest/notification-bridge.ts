// ============================================================
// 息壤 · 浏览器通知集成
// P16-10: 休息提醒浏览器通知 + 通知偏好管理
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import { emitOsNotification } from '@/engine/os-notification'
import type { RestReminder } from './rest-advanced'

// ---- 通知偏好类型 ----

/** 通知偏好 */
export interface NotificationPreference {
  /** 是否启用通知 */
  enabled: boolean
  /** 浏览器通知权限 */
  permission: 'default' | 'denied' | 'granted' | 'unsupported'
  /** 静默时段开始 HH:mm */
  quietHoursStart: string
  /** 静默时段结束 HH:mm */
  quietHoursEnd: string
  /** 是否启用声音 */
  soundEnabled: boolean
  /** 通知显示时长（毫秒） */
  displayDuration: number
  /** 每日最大通知数 */
  maxDailyNotifications: number
  /** 今日已发通知数 */
  todaySentCount: number
  /** 今日日期（用于重置计数） */
  todayDate: string
  /** 是否启用振动 */
  vibrationEnabled: boolean
}

/** 通知记录 */
export interface NotificationRecord {
  id: string
  reminderId: string
  title: string
  body: string
  sentAt: string
  /** 是否被点击 */
  clicked: boolean
  /** 是否被关闭 */
  dismissed: boolean
}

/** 通知统计 */
export interface NotificationStats {
  totalSent: number
  totalClicked: number
  totalDismissed: number
  clickRate: number
  todaySent: number
  averagePerDay: number
  mostActiveDay: string
  mostActiveHour: number
}

// ---- 默认配置 ----

export const DEFAULT_NOTIFICATION_PREFERENCE: NotificationPreference = {
  enabled: false,
  permission: 'default',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  soundEnabled: true,
  displayDuration: 5000,
  maxDailyNotifications: 20,
  todaySentCount: 0,
  todayDate: '',
  vibrationEnabled: true,
}

// ---- 存储键 ----

const NOTIFICATION_STORAGE_KEYS = {
  PREFERENCE: 'hf:rest:notification_preference',
  RECORDS: 'hf:rest:notification_records',
} as const

// ---- 提醒类型 → 通知内容映射 ----

const REMINDER_NOTIFICATION_CONTENT: Record<string, {
  getTitle: (reminder: RestReminder) => string
  getBody: (reminder: RestReminder) => string
  icon: string
}> = {
  pomodoro: {
    getTitle: (r) => `⏰ ${r.title}`,
    getBody: (r) => `${r.description}。建议：${r.suggestedActivity} ${r.suggestedDuration}分钟`,
    icon: '🍅',
  },
  scheduled: {
    getTitle: (r) => `📅 ${r.title}`,
    getBody: (r) => `${r.description}。建议：${r.suggestedActivity} ${r.suggestedDuration}分钟`,
    icon: '🕐',
  },
  fatigue: {
    getTitle: (r) => `⚠️ ${r.title}`,
    getBody: (r) => `${r.description}。建议：${r.suggestedActivity} ${r.suggestedDuration}分钟`,
    icon: '😫',
  },
  posture: {
    getTitle: (r) => `🧍 ${r.title}`,
    getBody: (r) => `${r.description}。建议：${r.suggestedActivity} ${r.suggestedDuration}分钟`,
    icon: '💪',
  },
}

// ============================================================
// useRestNotificationBridge — 浏览器通知集成
// ============================================================

export function useRestNotificationBridge() {
  const preference = ref<NotificationPreference>(loadPreference())
  const records = ref<NotificationRecord[]>(loadRecords())
  /** 通知点击回调 */
  let onClickCallback: ((reminderId: string) => void) | null = null

  // ---- 持久化 ----

  function loadPreference(): NotificationPreference {
    try {
      const raw = storage.getKV<string>(NOTIFICATION_STORAGE_KEYS.PREFERENCE, '')
      if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCE }
      return { ...DEFAULT_NOTIFICATION_PREFERENCE, ...JSON.parse(raw) }
    } catch { return { ...DEFAULT_NOTIFICATION_PREFERENCE } }
  }

  function savePreference(): void {
    storage.setKV(NOTIFICATION_STORAGE_KEYS.PREFERENCE, JSON.stringify(preference.value))
  }

  function loadRecords(): NotificationRecord[] {
    try {
      const raw = storage.getKV<string>(NOTIFICATION_STORAGE_KEYS.RECORDS, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveRecords(): void {
    // 只保留最近 500 条记录
    const trimmed = records.value.slice(-500)
    storage.setKV(NOTIFICATION_STORAGE_KEYS.RECORDS, JSON.stringify(trimmed))
  }

  // ---- 权限管理 ----

  /** 检查浏览器通知支持 */
  function checkSupport(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  /** 请求通知权限 */
  async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!checkSupport()) {
      preference.value.permission = 'unsupported'
      savePreference()
      return 'unsupported'
    }

    try {
      const result = await Notification.requestPermission()
      preference.value.permission = result
      savePreference()
      return result
    } catch {
      preference.value.permission = 'denied'
      savePreference()
      return 'denied'
    }
  }

  /** 获取当前权限 */
  function getPermission(): NotificationPermission | 'unsupported' {
    if (!checkSupport()) return 'unsupported'
    return Notification.permission
  }

  /** 同步权限状态 */
  function syncPermission(): void {
    preference.value.permission = getPermission()
    savePreference()
  }

  // ---- 静默时段检查 ----

  /** 检查当前是否在静默时段 */
  function isInQuietHours(): boolean {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    const [startH, startM] = preference.value.quietHoursStart.split(':').map(Number)
    const [endH, endM] = preference.value.quietHoursEnd.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes <= endMinutes) {
      // 同一天内（如 22:00-08:00 不适用）
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // 跨天（如 22:00-08:00）
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
  }

  // ---- 每日计数重置 ----

  function resetDailyCountIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10)
    if (preference.value.todayDate !== today) {
      preference.value.todayDate = today
      preference.value.todaySentCount = 0
      savePreference()
    }
  }

  // ---- 发送通知 ----

  /** 发送休息提醒通知 */
  async function sendReminderNotification(reminder: RestReminder): Promise<NotificationRecord | null> {
    resetDailyCountIfNeeded()

    // 检查是否启用
    if (!preference.value.enabled) return null

    // 同步权限（仅供 UI 展示，实际门控在统一入口 emitOsNotification 内执行）
    syncPermission()

    // 检查静默时段
    if (isInQuietHours()) return null

    // 检查每日上限
    if (preference.value.todaySentCount >= preference.value.maxDailyNotifications) return null

    // 生成通知内容
    const content = REMINDER_NOTIFICATION_CONTENT[reminder.type] || REMINDER_NOTIFICATION_CONTENT.pomodoro
    const title = content.getTitle(reminder)
    const body = content.getBody(reminder)

    // 创建通知（宪法第5条门控在统一入口 emitOsNotification 内端到端 fail-closed）
    const notification = emitOsNotification({
      title,
      options: {
        body,
        icon: '/favicon.ico',
        tag: `rest-reminder-${reminder.id}`,
        requireInteraction: reminder.type === 'fatigue',
        silent: !preference.value.soundEnabled,
        vibrate: preference.value.vibrationEnabled ? [200, 100, 200] : undefined,
      } as NotificationOptions & { vibrate?: number[] },
    })
    if (!notification) return null

    // 设置点击回调
    notification.onclick = () => {
      const record = records.value.find(r =>
        r.reminderId === reminder.id &&
        r.sentAt === notificationRecord.sentAt
      )
      if (record) {
        record.clicked = true
        saveRecords()
      }
      if (onClickCallback) onClickCallback(reminder.id)
      window.focus()
      notification.close()
    }

    // 设置关闭回调
    notification.onclose = () => {
      // 静默关闭，不标记为 dismissed
    }

    // 自动关闭
    if (preference.value.displayDuration > 0) {
      setTimeout(() => notification.close(), preference.value.displayDuration)
    }

    const notificationRecord: NotificationRecord = {
      id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      reminderId: reminder.id,
      title,
      body,
      sentAt: new Date().toISOString(),
      clicked: false,
      dismissed: false,
    }

    records.value.push(notificationRecord)
    preference.value.todaySentCount++
    savePreference()
    saveRecords()

    return notificationRecord
  }

  /** 批量发送通知 */
  async function sendBatchNotifications(reminders: RestReminder[]): Promise<NotificationRecord[]> {
    const results: NotificationRecord[] = []
    for (const reminder of reminders) {
      const record = await sendReminderNotification(reminder)
      if (record) results.push(record)
    }
    return results
  }

  /** 注册点击回调 */
  function onClick(handler: (reminderId: string) => void): void {
    onClickCallback = handler
  }

  // ---- 通知记录管理 ----

  /** 获取最近通知记录 */
  const recentRecords = computed(() =>
    records.value.slice(-20).reverse()
  )

  /** 获取通知统计 */
  function getNotificationStats(): NotificationStats {
    const totalSent = records.value.length
    const totalClicked = records.value.filter(r => r.clicked).length
    const totalDismissed = records.value.filter(r => r.dismissed).length

    resetDailyCountIfNeeded()
    const todaySent = preference.value.todaySentCount

    // 计算日均
    const days = new Set(records.value.map(r => r.sentAt.slice(0, 10)))
    const averagePerDay = days.size > 0
      ? Math.round((totalSent / days.size) * 10) / 10
      : 0

    // 最活跃日期
    const dayCounts = new Map<string, number>()
    for (const r of records.value) {
      const day = r.sentAt.slice(0, 10)
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
    }
    let mostActiveDay = ''
    let maxCount = 0
    for (const [day, count] of dayCounts) {
      if (count > maxCount) { maxCount = count; mostActiveDay = day }
    }

    // 最活跃时段
    const hourCounts = new Map<number, number>()
    for (const r of records.value) {
      const hour = new Date(r.sentAt).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
    }
    let mostActiveHour = 0
    let maxHourCount = 0
    for (const [hour, count] of hourCounts) {
      if (count > maxHourCount) { maxHourCount = count; mostActiveHour = hour }
    }

    return {
      totalSent,
      totalClicked,
      totalDismissed,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
      todaySent,
      averagePerDay,
      mostActiveDay,
      mostActiveHour,
    }
  }

  /** 清除通知记录 */
  function clearRecords(): void {
    records.value = []
    saveRecords()
  }

  // ---- 偏好管理 ----

  /** 更新通知偏好 */
  function updatePreference(updates: Partial<NotificationPreference>): void {
    preference.value = { ...preference.value, ...updates }
    savePreference()
  }

  /** 重置偏好 */
  function resetPreference(): void {
    preference.value = { ...DEFAULT_NOTIFICATION_PREFERENCE }
    savePreference()
  }

  /** 切换通知开关 */
  function toggleEnabled(): void {
    preference.value.enabled = !preference.value.enabled
    savePreference()
  }

  // ---- 便捷方法 ----

  /** 快速发送测试通知 */
  async function sendTestNotification(): Promise<boolean> {
    // 用户主动触发的测试通知：未授权时尝试请求权限（宪法门控在统一入口内执行）
    syncPermission()
    if (preference.value.permission !== 'granted') {
      const result = await requestPermission()
      if (result !== 'granted') return false
    }

    const notif = emitOsNotification({
      title: '🧘 息壤 · 休息提醒',
      options: {
        body: '这是一条测试通知。休息一下，照顾好自己的身心~',
        icon: '/favicon.ico',
        tag: 'rest-test',
        silent: false,
      },
    })
    if (!notif) return false
    setTimeout(() => notif.close(), 3000)
    return true
  }

  // 初始化
  syncPermission()

  return {
    // 状态
    preference,
    records,
    recentRecords,
    // 权限
    checkSupport,
    requestPermission,
    getPermission,
    syncPermission,
    // 通知
    sendReminderNotification,
    sendBatchNotifications,
    sendTestNotification,
    onClick,
    // 静默时段
    isInQuietHours,
    // 统计
    getNotificationStats,
    // 管理
    clearRecords,
    updatePreference,
    resetPreference,
    toggleEnabled,
    // 常量
    NOTIFICATION_STORAGE_KEYS,
    DEFAULT_NOTIFICATION_PREFERENCE,
    REMINDER_NOTIFICATION_CONTENT,
  }
}