// ============================================================
// platform 单元测试
// ============================================================
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// 模拟 window.matchMedia
function mockMatchMedia(matches: boolean) {
  return vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// 模拟 navigator
function mockNavigator(overrides: Partial<Navigator> = {}) {
  const defaults = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxTouchPoints: 0,
    clipboard: undefined,
    ...overrides,
  }
  vi.stubGlobal('navigator', defaults)
}

// 模拟 window
function mockWindow(overrides: Record<string, any> = {}) {
  const win: Record<string, any> = {
    innerWidth: 1024,
    innerHeight: 768,
    location: { hostname: 'localhost' },
    matchMedia: mockMatchMedia(false),
    ...overrides,
  }
  vi.stubGlobal('window', win)
}

beforeEach(() => {
  vi.stubGlobal('import', { meta: { env: { DEV: true } } })
  // 清除缓存
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getPlatform (同步兜底)', () => {
  it('在 Web 环境应返回 type=web', async () => {
    mockNavigator()
    mockWindow()
    const { getPlatform } = await import('./platform')
    const info = getPlatform()
    expect(info.type).toBe('web')
    expect(info.isDev).toBe(true)
  })

  it('在 PWA 环境应返回 type=pwa', async () => {
    mockNavigator()
    mockWindow({ matchMedia: mockMatchMedia(true) })
    const { getPlatform } = await import('./platform')
    const info = getPlatform()
    expect(info.type).toBe('pwa')
  })

  it('应正确检测 Windows OS', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    mockWindow()
    const { getPlatform } = await import('./platform')
    expect(getPlatform().os).toBe('windows')
  })

  it('应正确检测 macOS', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })
    mockWindow()
    const { getPlatform } = await import('./platform')
    expect(getPlatform().os).toBe('macos')
  })

  it('应正确检测移动设备', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })
    mockWindow({ innerWidth: 390, innerHeight: 844 })
    const { getPlatform } = await import('./platform')
    expect(getPlatform().device).toBe('mobile')
  })

  it('应正确检测平板设备', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)', maxTouchPoints: 5 })
    mockWindow({ innerWidth: 1024, innerHeight: 1366 })
    const { getPlatform } = await import('./platform')
    expect(getPlatform().device).toBe('tablet')
  })

  it('台式机不应识别为移动设备', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    mockWindow({ innerWidth: 1920, innerHeight: 1080 })
    const { getPlatform } = await import('./platform')
    expect(getPlatform().device).toBe('desktop')
  })
})

describe('便捷方法', () => {
  it('isDeviceDesktop 在桌面环境应返回 true', async () => {
    mockNavigator()
    mockWindow()
    const { isDeviceDesktop, isDeviceMobile, isDeviceTablet } = await import('./platform')
    expect(isDeviceDesktop()).toBe(true)
    expect(isDeviceMobile()).toBe(false)
    expect(isDeviceTablet()).toBe(false)
  })

  it('isDeviceMobile 在手机环境应返回 true', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })
    mockWindow({ innerWidth: 390, innerHeight: 844 })
    const { isDeviceMobile, isDeviceDesktop } = await import('./platform')
    expect(isDeviceMobile()).toBe(true)
    expect(isDeviceDesktop()).toBe(false)
  })

  it('hasCapability 应反映 Web 能力', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    mockWindow()
    const { hasCapability } = await import('./platform')
    expect(hasCapability('fileSystem')).toBe(false)
    expect(hasCapability('nativeFileDialog')).toBe(false)
  })

  it('hover/contextMenu/nativeDrag 在桌面浏览器(精确指针)应为 true', async () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    mockWindow({ matchMedia: mockMatchMedia(true) })
    const { hasCapability } = await import('./platform')
    expect(hasCapability('hover')).toBe(true)
    expect(hasCapability('contextMenu')).toBe(true)
    expect(hasCapability('nativeDrag')).toBe(true)
    expect(hasCapability('tauriApi')).toBe(false)
  })
})
