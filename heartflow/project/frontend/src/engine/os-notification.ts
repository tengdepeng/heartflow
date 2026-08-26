// ============================================================
// OS 原生通知 · 统一发射入口（A3 · 宪法第5条端到端 fail-closed）
// 全仓唯一的 `new Notification(...)` 构造点。
// 所有 OS 级系统通知必须经由本函数，禁止在业务代码中直连构造，
// 以确保宪法「禁止主动推送系统通知」门控（isOsNotificationBlocked）不可被绕过。
// ============================================================

import { isOsNotificationBlocked } from './compliance-gate'
import { recordOsNotificationAttempt } from './os-notification-audit'

export interface OsNotificationPayload {
  title: string
  /** 完整 NotificationOptions（body / icon / tag / silent / vibrate 等） */
  options?: NotificationOptions
}

const DEFAULT_ICON = '/favicon.ico'

/**
 * 统一发射 OS 原生通知。
 * 返回构造出的 Notification 实例（便于调用方设置 onclick / 定时关闭），
 * 被宪法阻断、权限未授予或环境无 Notification API 时返回 null（静默失败）。
 *
 * 门控顺序（fail-closed）：
 * 1. isOsNotificationBlocked() —— 宪法第5条，最优先，未开启任何通道即阻断
 * 2. typeof Notification === 'undefined' —— 运行环境无原生通知能力
 * 3. Notification.permission !== 'granted' —— 浏览器/系统未授权
 */
export function emitOsNotification(payload: OsNotificationPayload): Notification | null {
  // —— A3-EXT-1 · 本地审计（零外网，fail-closed 友好：审计失败不影响发射契约）——
  const title = payload.title || ''

  if (isOsNotificationBlocked()) {
    recordOsNotificationAttempt({ title, blocked: true, delivered: false, reason: 'constitution' })
    return null
  }
  if (typeof Notification === 'undefined') {
    recordOsNotificationAttempt({ title, blocked: false, delivered: false, reason: 'no-api' })
    return null
  }
  if (Notification.permission !== 'granted') {
    recordOsNotificationAttempt({ title, blocked: false, delivered: false, reason: 'no-permission' })
    return null
  }

  const options: NotificationOptions = { ...payload.options }
  if (options.icon === undefined) options.icon = DEFAULT_ICON

  try {
    const instance = new Notification(payload.title, options)
    recordOsNotificationAttempt({ title, blocked: false, delivered: true, reason: 'delivered' })
    return instance
  } catch {
    recordOsNotificationAttempt({ title, blocked: false, delivered: false, reason: 'construct-error' })
    return null
  }
}
