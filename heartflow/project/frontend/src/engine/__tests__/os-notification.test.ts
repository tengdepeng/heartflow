// ============================================================
// A3 · OS 通知统一发射入口 emitOsNotification 回归测试
// 锁定：全仓唯一的 `new Notification` 构造点；宪法第5条端到端 fail-closed。
// 四态：①宪法阻断 ②环境无 Notification API ③权限未授予 ④构造异常
// 均静默返回 null 且绝不构造；仅在允许态经全局 Notification 构造并补全缺省 icon。
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockBlocked } = vi.hoisted(() => ({
  mockBlocked: { value: false },
}))

// 直接 mock 宪法门控，隔离测试 emitOsNotification 自身契约
vi.mock('../compliance-gate', () => ({
  isOsNotificationBlocked: () => mockBlocked.value,
}))

import { emitOsNotification } from '../os-notification'

class MockNotification {
  static permission: NotificationPermission = 'granted'
  static requestPermission = vi.fn().mockResolvedValue('granted')
  public opts: unknown
  constructor(public title: string, opts?: unknown) {
    this.opts = opts
  }
}

describe('emitOsNotification · 统一入口 / 宪法第5条 fail-closed', () => {
  let spy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    mockBlocked.value = false
    ;(globalThis as any).Notification = MockNotification
    spy = vi.spyOn(globalThis as any, 'Notification')
    // permission 必须设在全局 Notification（即 spy 包装对象）上，
    // 因为 emitOsNotification 内部读取的是全局 Notification.permission。
    ;(globalThis as any).Notification.permission = 'granted'
  })

  afterEach(() => {
    spy?.mockRestore()
    delete (globalThis as any).Notification
  })

  it('宪法阻断时返回 null 且绝不构造', () => {
    mockBlocked.value = true
    expect(emitOsNotification({ title: 't' })).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('环境无 Notification API 时返回 null', () => {
    delete (globalThis as any).Notification
    expect(emitOsNotification({ title: 't' })).toBeNull()
  })

  it('权限未授予时返回 null 且不构造', () => {
    ;(globalThis as any).Notification.permission = 'denied'
    expect(emitOsNotification({ title: 't' })).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('允许时经全局 Notification 构造并返回实例，缺省 icon 自动补全', () => {
    ;(globalThis as any).Notification.permission = 'granted'
    const r = emitOsNotification({ title: '你好', options: { body: '世界' } })
    expect(r).not.toBeNull()
    // 直接校验经全局构造的产物（spy 包装后的静态 permission 不可靠，故不依赖 spy 参数断言）
    expect((r as any).title).toBe('你好')
    expect((r as any).opts).toMatchObject({ body: '世界', icon: '/favicon.ico' })
  })

  it('构造异常时静默返回 null', () => {
    MockNotification.permission = 'granted'
    spy!.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(emitOsNotification({ title: 't' })).toBeNull()
  })
})
