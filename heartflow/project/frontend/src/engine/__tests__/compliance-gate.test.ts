// ============================================================
// 宪法第5条 · OS 通知硬门控「端到端 fail-closed」回归测试
// 锁定：所有 OS 级主动推送发射点（桌面触角 / 息壤提醒 / 自动化 notify /
// 殿堂触角）在 notificationBlocked 为真时都经过唯一真源
// engine/compliance-gate#isOsNotificationBlocked，绝不直接 new Notification。
// 防止未来任一发射点再次绕过宪法门控。
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockOverride } = vi.hoisted(() => ({
  mockOverride: { notificationBlocked: true },
}))

vi.mock('../../stores/config', () => ({
  useConfigStore: () => ({ config: { complianceOverride: mockOverride } }),
}))

import { isOsNotificationBlocked } from '../compliance-gate'
import { useDesktopTouchpoints } from '../../composables/useDesktopTouchpoints'
import { useRestNotificationBridge } from '../../modules/rest/notification-bridge'
import { AutomationEngine } from '../automation'

describe('compliance-gate · 第5条 OS 通知硬门控（端到端 fail-closed）', () => {
  let NotificationSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    mockOverride.notificationBlocked = true
    if (!(globalThis as any).Notification) {
      ;(globalThis as any).Notification = class {
        static permission = 'granted'
        constructor(_title?: string, _opts?: unknown) {}
        static requestPermission() {
          return Promise.resolve('granted')
        }
      }
    }
    NotificationSpy = vi.spyOn(globalThis as any, 'Notification')
  })

  afterEach(() => {
    NotificationSpy?.mockRestore()
  })

  it('共享门控：blocked=true 返回 true，false 返回 false', () => {
    mockOverride.notificationBlocked = true
    expect(isOsNotificationBlocked()).toBe(true)
    mockOverride.notificationBlocked = false
    expect(isOsNotificationBlocked()).toBe(false)
  })

  it('桌面触角 showNotification 在 blocked 时不发 OS 通知', async () => {
    mockOverride.notificationBlocked = true
    const tp = useDesktopTouchpoints()
    await tp.showNotification('标题', '正文')
    expect(NotificationSpy).not.toHaveBeenCalled()
  })

  it('息壤 sendReminderNotification 在 blocked 时返回 null 且不发通知', async () => {
    mockOverride.notificationBlocked = true
    const bridge = useRestNotificationBridge()
    const reminder = {
      type: 'pomodoro',
      id: 'r1',
      title: '休息',
      description: '该休息了',
      suggestedActivity: '散步',
      suggestedDuration: 5,
    } as any
    const res = await bridge.sendReminderNotification(reminder)
    expect(res).toBeNull()
    expect(NotificationSpy).not.toHaveBeenCalled()
  })

  it('息壤 sendTestNotification 在 blocked 时返回 false 且不发通知', async () => {
    mockOverride.notificationBlocked = true
    const bridge = useRestNotificationBridge()
    const res = await bridge.sendTestNotification()
    expect(res).toBe(false)
    expect(NotificationSpy).not.toHaveBeenCalled()
  })

  it('自动化 notify 动作在 blocked 时不发 OS 通知', async () => {
    mockOverride.notificationBlocked = true
    const engine = new AutomationEngine()
    await (engine as any).executeAction('notify', { message: '该休息了' })
    expect(NotificationSpy).not.toHaveBeenCalled()
  })

  it('解除阻断后桌面触角可正常发送通知', async () => {
    mockOverride.notificationBlocked = false
    ;(globalThis as any).Notification.permission = 'granted'
    const tp = useDesktopTouchpoints()
    await tp.showNotification('标题', '正文')
    expect(NotificationSpy).toHaveBeenCalled()
  })
})
