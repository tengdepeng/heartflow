// ============================================================
// 殿堂触角 · 多通道推送引擎
// 锁定「宪法第5条 · 无推送」硬门控：OS 级主动推送（浏览器/桌面通知）在
// notificationBlocked 为真（fail-closed 默认）时绝不被调用。
// 防止未来回归静默重新打开主动推送，违背宪法。
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 用 hoisted mock 让测试可控地切换 notificationBlocked
const { mockOverride, channelStore } = vi.hoisted(() => ({
  mockOverride: { notificationBlocked: true },
  // 隔离存储：每个用例从默认渠道配置（全部 enabled:false，宪法 fail-closed）重新起步，
  // 避免 updateChannel 的 persist 把 enabled:true 泄漏到后续用例。
  channelStore: new Map<string, unknown>(),
}))

vi.mock('../../../stores/config', () => ({
  useConfigStore: () => ({ config: { complianceOverride: mockOverride } }),
}))

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: unknown) => {
      if (channelStore.has(key)) return channelStore.get(key)
      const fresh = structuredClone(def)
      channelStore.set(key, fresh)
      return fresh
    },
    setKV: (key: string, val: unknown) => {
      channelStore.set(key, val)
    },
  },
}))

// 隔离「数字安息日」门控：本套用例仅锁定宪法第5条 notificationBlocked 门控，
// 与安息日无关。安息日按 getDay()===0 判定（仅周日触发），会导致用例在周日
// 时被 isSabbathOn() 提前拦截而失败（日期依赖）。固定为非安息日保证用例确定。
vi.mock('../../../composables/useDigitalSabbath', () => ({
  isSabbathOn: () => false,
}))

import { usePushChannel } from '../push-channel'

describe('push-channel · 宪法第5条无推送硬门控', () => {
  let NotificationSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    channelStore.clear()
    mockOverride.notificationBlocked = true
    // jsdom 默认无 Notification；测试中按需注入以便观察是否构造
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

  it('notificationBlocked=true 时浏览器通道不可用（fail-closed）', () => {
    mockOverride.notificationBlocked = true
    const ch = usePushChannel()
    expect(ch.isChannelAvailable('browser')).toBe(false)
  })

  it('notificationBlocked=false 时浏览器通道可用', () => {
    mockOverride.notificationBlocked = false
    const ch = usePushChannel()
    // 宪法 fail-closed：渠道默认关闭，需显式开启以隔离测试「notificationBlocked」门控本身
    ch.updateChannel('browser', { enabled: true })
    expect(ch.isChannelAvailable('browser')).toBe(true)
  })

  it('推送被阻断时绝不构造 OS Notification 实例', async () => {
    mockOverride.notificationBlocked = true
    const ch = usePushChannel()
    const res = await ch.push({ title: '心流', message: '此刻' }, ['browser'])
    expect(res.success).toBe(false)
    expect(NotificationSpy).not.toHaveBeenCalled()
  })

  it('解除阻断后浏览器推送会尝试构造 Notification', async () => {
    mockOverride.notificationBlocked = false
    ;(globalThis as any).Notification.permission = 'granted'
    const ch = usePushChannel()
    // 宪法 fail-closed：渠道默认关闭，需显式开启以隔离测试「notificationBlocked」门控本身
    ch.updateChannel('browser', { enabled: true })
    await ch.push({ title: '心流', message: '此刻' }, ['browser'])
    expect(NotificationSpy).toHaveBeenCalled()
  })
})
