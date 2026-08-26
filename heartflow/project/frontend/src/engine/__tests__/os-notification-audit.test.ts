// ============================================================
// A3-EXT-1 · OS 通知审计日志（零外网 · 纯本地）回归测试
// 锁定：发射尝试（含宪法拦截 / 未授权 / 构造异常）均落本地审计；
// 不依赖 emitOsNotification 实际返回值，审计失败不影响发射契约。
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

function setupMemoryStorage() {
  const mem = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
    },
    configurable: true,
  })
  return mem
}

const { mockBlocked } = vi.hoisted(() => ({ mockBlocked: { value: false } }))

// 直接 mock 宪法门控，隔离测试 emitOsNotification 的审计留痕行为
vi.mock('../compliance-gate', () => ({
  isOsNotificationBlocked: () => mockBlocked.value,
}))

describe('OS 通知审计（A3-EXT-1）', () => {
  beforeEach(() => {
    setupMemoryStorage()
    mockBlocked.value = false
    vi.resetModules()
  })

  it('宪法拦截的发射尝试被记入审计（blocked=true, delivered=false, reason=constitution）', async () => {
    mockBlocked.value = true
    const { emitOsNotification } = await import('../os-notification')
    const { getOsNotificationAudit, getOsNotificationAuditSummary } = await import('../os-notification-audit')
    expect(emitOsNotification({ title: '测试拦截' })).toBeNull()
    const all = getOsNotificationAudit()
    expect(all.length).toBe(1)
    expect(all[0].blocked).toBe(true)
    expect(all[0].delivered).toBe(false)
    expect(all[0].reason).toBe('constitution')
    expect(getOsNotificationAuditSummary().blocked).toBe(1)
  })

  it('允许且成功构造时记 delivered=true', async () => {
    class MockNotification {
      static permission = 'granted' as NotificationPermission
      constructor(_t: string, _o?: unknown) {}
    }
    ;(globalThis as any).Notification = MockNotification
    const { emitOsNotification } = await import('../os-notification')
    const { getOsNotificationAudit } = await import('../os-notification-audit')
    const r = emitOsNotification({ title: '已落地' })
    expect(r).not.toBeNull()
    const all = getOsNotificationAudit()
    expect(all[0].delivered).toBe(true)
    expect(all[0].blocked).toBe(false)
    expect(all[0].reason).toBe('delivered')
  })

  it('权限未授予时记 reason=no-permission 且未落地', async () => {
    class MockNotification {
      static permission = 'denied' as NotificationPermission
      constructor(_t: string, _o?: unknown) {}
    }
    ;(globalThis as any).Notification = MockNotification
    const { emitOsNotification } = await import('../os-notification')
    const { getOsNotificationAudit } = await import('../os-notification-audit')
    expect(emitOsNotification({ title: '未授权' })).toBeNull()
    const all = getOsNotificationAudit()
    expect(all[0].delivered).toBe(false)
    expect(all[0].blocked).toBe(false)
    expect(all[0].reason).toBe('no-permission')
  })

  it('清空审计后历史归零', async () => {
    mockBlocked.value = true
    const { emitOsNotification } = await import('../os-notification')
    const { getOsNotificationAudit, clearOsNotificationAudit } = await import('../os-notification-audit')
    emitOsNotification({ title: 'a' })
    emitOsNotification({ title: 'b' })
    expect(getOsNotificationAudit().length).toBe(2)
    clearOsNotificationAudit()
    expect(getOsNotificationAudit().length).toBe(0)
  })
})
