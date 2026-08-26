// ============================================================
// useDesktopTouchpoints 测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ---- 模拟 storage（composable 已重构为使用 storage.getKV/setKV） ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// 锁屏光痕已接成桌面静默覆盖入口：mock 掉覆盖层组合式，避免测试引入 Pinia 依赖，
// 同时保留 setLockScreenGlow 的 KV 持久化语义断言。
vi.mock('../../modules/sanctuary/useDesktopSilentOverlay', () => ({
  useDesktopSilentOverlay: vi.fn(() => ({ enable: vi.fn(), disable: vi.fn() })),
}))

// 平台检测统一走 utils/platform：isTauri/hasCapability 用 mock，避免依赖 window.__TAURI__
vi.mock('../../utils/platform', () => ({
  isTauri: vi.fn(() => false),
  hasCapability: vi.fn(() => false),
}))

describe('useDesktopTouchpoints', () => {
  let originalNotification: any

  beforeEach(async () => {
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    ;(globalThis as any).window = {}
    // 模拟 window.matchMedia（被 platform.ts 中的 detectPWA 调用）
    ;(globalThis as any).window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    originalNotification = (globalThis as any).Notification
    ;(globalThis as any).Notification = vi.fn() as any
    ;(globalThis as any).Notification.permission = 'default'
    ;(globalThis as any).Notification.requestPermission = vi.fn().mockResolvedValue('granted')
  })

  afterEach(() => {
    ;(globalThis as any).Notification = originalNotification
  })

  async function fresh() {
    const { useDesktopTouchpoints } = await import('../useDesktopTouchpoints')
    return useDesktopTouchpoints()
  }

  describe('isTauri', () => {
    it('在非 Tauri 环境返回 false', async () => {
      const tp = await fresh()
      expect(tp.isTauri).toBe(false)
    })

    it('在 Tauri 环境返回 true', async () => {
      const { isTauri } = await import('../../utils/platform')
      vi.mocked(isTauri).mockReturnValue(true)
      const tp = await fresh()
      expect(tp.isTauri).toBe(true)
    })
  })

  describe('setLockScreenGlow / getLockScreenGlow', () => {
    it('默认关闭', async () => {
      expect((await fresh()).getLockScreenGlow()).toBe(false)
    })

    it('启用后返回 true', async () => {
      const tp = await fresh()
      tp.setLockScreenGlow(true)
      expect(tp.getLockScreenGlow()).toBe(true)
    })

    it('关闭后返回 false', async () => {
      const tp = await fresh()
      tp.setLockScreenGlow(true)
      tp.setLockScreenGlow(false)
      expect(tp.getLockScreenGlow()).toBe(false)
    })
  })

  describe('setGreetingFloating / getGreetingFloating', () => {
    it('默认启用', async () => {
      expect((await fresh()).getGreetingFloating()).toBe(true)
    })

    it('关闭后返回 false', async () => {
      const tp = await fresh()
      tp.setGreetingFloating(false)
      expect(tp.getGreetingFloating()).toBe(false)
    })

    it('重新启用后返回 true', async () => {
      const tp = await fresh()
      tp.setGreetingFloating(false)
      tp.setGreetingFloating(true)
      expect(tp.getGreetingFloating()).toBe(true)
    })
  })

  describe('setOverlayMode / getOverlayMode', () => {
    it('默认返回 none', async () => {
      expect((await fresh()).getOverlayMode()).toBe('none')
    })

    it('设置 minimal 后返回 minimal', async () => {
      const tp = await fresh()
      tp.setOverlayMode('minimal')
      expect(tp.getOverlayMode()).toBe('minimal')
    })

    it('设置 ambient 后返回 ambient', async () => {
      const tp = await fresh()
      tp.setOverlayMode('ambient')
      expect(tp.getOverlayMode()).toBe('ambient')
    })

    it('从 ambient 切换回 none', async () => {
      const tp = await fresh()
      tp.setOverlayMode('ambient')
      tp.setOverlayMode('none')
      expect(tp.getOverlayMode()).toBe('none')
    })
  })

  describe('showNotification', () => {
    it('permission granted 时调用 Notification 构造函数', async () => {
      ;(globalThis as any).Notification.permission = 'granted'
      const tp = await fresh()
      await tp.showNotification('标题', '内容')
      expect(globalThis.Notification).toHaveBeenCalledWith('标题', expect.objectContaining({ body: '内容' }))
    })

    it('permission denied 时不调用', async () => {
      ;(globalThis as any).Notification.permission = 'denied'
      const tp = await fresh()
      await tp.showNotification('标题', '内容')
      expect(globalThis.Notification).not.toHaveBeenCalled()
    })

    it('permission default 时请求权限', async () => {
      const tp = await fresh()
      await tp.showNotification('标题', '内容')
      expect(globalThis.Notification.requestPermission).toHaveBeenCalled()
    })
  })
})