// ============================================================
// P2 感知层 · 采集器 & 合规 单元测试
// ============================================================

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

// 测试通过真实模块 + happy-dom 提供的 window/matchMedia/navigator 钩子进行。
// 为保证可控，逐用例 stub 全局 API。
import { usePerception } from '../usePerception'
import {
  createDefaultEnvironmentState,
  timeOfDayFromHour,
  deriveActiveApp,
  DEFAULT_LOW_POWER_LEVEL,
} from '../types'

describe('感知层 · 类型工具', () => {
  it('timeOfDayFromHour 分段正确', () => {
    expect(timeOfDayFromHour(6)).toBe('morning')
    expect(timeOfDayFromHour(13)).toBe('afternoon')
    expect(timeOfDayFromHour(19)).toBe('evening')
    expect(timeOfDayFromHour(23)).toBe('night')
    expect(timeOfDayFromHour(3)).toBe('night')
  })

  it('createDefaultEnvironmentState 返回降级安全的默认值', () => {
    const s = createDefaultEnvironmentState('web')
    expect(s.batteryLevel).toBeNull()
    expect(s.isCharging).toBeNull()
    expect(s.isLowPower).toBe(false)
    expect(s.activeApp).toBeNull()
    expect(s.isFocusing).toBe(false)
    expect(s.source).toBe('web')
    expect(typeof s.hour).toBe('number')
    expect(['morning', 'afternoon', 'evening', 'night']).toContain(s.timeOfDay)
  })
})

describe('感知层 · 采集器', () => {
  let mqlCallbacks: Record<string, (e: any) => void> = {}

  beforeEach(() => {
    mqlCallbacks = {}
    // 默认 matchMedia 支持 change 监听
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_t: string, cb: (e: any) => void) => {
        mqlCallbacks[query] = cb
      },
      removeEventListener: (_t: string, _cb: (e: any) => void) => {
        delete mqlCallbacks[query]
      },
    }))
    // 保留 happy-dom 的 navigator（含 userAgent），仅覆盖 onLine；默认无 getBattery（降级）
    vi.stubGlobal('navigator', {
      ...(globalThis.navigator as any),
      userAgent: globalThis.navigator?.userAgent ?? 'node',
      onLine: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllTimers()
  })

  it('start 后快照含暗色默认值（matchMedia=false → isDark=false）', () => {
    const p = usePerception()
    p.start()
    const snap = p.snapshot()
    expect(snap.isDark).toBe(false)
    expect(snap.isOnline).toBe(true)
    // 无 getBattery → 降级 null
    expect(snap.batteryLevel).toBeNull()
    expect(snap.isLowPower).toBe(false)
    p.stop()
  })

  it('暗色模式 change 回调存在并被注册', () => {
    const p = usePerception()
    p.start()
    // 采集器应已就暗色 media query 注册 change 监听（回调被存入 mqlCallbacks）
    const cb = mqlCallbacks['(prefers-color-scheme: dark)']
    expect(typeof cb).toBe('function')
    p.stop()
  })

  it('订阅会立即推一次当前状态', () => {
    const p = usePerception()
    p.start()
    let pushed: any = null
    const unsub = p.subscribe((s) => {
      pushed = s
    })
    expect(pushed).not.toBeNull()
    expect(typeof pushed.hour).toBe('number')
    unsub()
    p.stop()
  })

  it('无 getBattery 时低电量逻辑不触发（降级安全）', () => {
    const p = usePerception()
    p.start()
    const snap = p.snapshot()
    expect(snap.batteryLevel).toBeNull()
    expect(snap.isLowPower).toBe(false)
    p.stop()
  })

  it('getBattery 提供低电量时推导 isLowPower', async () => {
    const fakeBattery = {
      level: DEFAULT_LOW_POWER_LEVEL - 0.05,
      charging: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    vi.stubGlobal('navigator', {
      ...(globalThis.navigator as any),
      userAgent: globalThis.navigator?.userAgent ?? 'node',
      onLine: true,
      getBattery: () => Promise.resolve(fakeBattery),
    })

    const p = usePerception()
    p.start()
    // 等待 getBattery promise resolve
    await new Promise((r) => setTimeout(r, 0))
    const snap = p.snapshot()
    expect(snap.batteryLevel).toBeCloseTo(DEFAULT_LOW_POWER_LEVEL - 0.05)
    expect(snap.isCharging).toBe(false)
    expect(snap.isLowPower).toBe(true)
    p.stop()
  })

  it('stop 后能清理监听器（再次 snapshot 仍为最后值，不抛错）', () => {
    const p = usePerception()
    p.start()
    p.stop()
    expect(() => p.snapshot()).not.toThrow()
  })
})

describe('感知层 · 系统级感知层·activeApp 派生（蓝图第995行）', () => {
  it('deriveActiveApp 由非空窗口标题派生信号', () => {
    expect(deriveActiveApp('心流工坊 · 专注')).toBe('心流工坊 · 专注')
  })

  it('deriveActiveApp 对空/空串标题降级为 null', () => {
    expect(deriveActiveApp(null)).toBeNull()
    expect(deriveActiveApp('')).toBeNull()
  })

  it('web 环境下 activeApp / activeWindowTitle 恒为 null（降级安全，不抛错）', () => {
    const p = usePerception()
    p.start()
    const snap = p.snapshot()
    expect(snap.activeApp).toBeNull()
    expect(snap.activeWindowTitle).toBeNull()
    p.stop()
  })
})
