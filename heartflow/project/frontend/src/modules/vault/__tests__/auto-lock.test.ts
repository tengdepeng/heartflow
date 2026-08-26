// ============================================================
// 保险库 · 自动锁定模块测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useVaultAutoLock, DEFAULT_AUTO_LOCK, IDLE_OPTIONS, AUTO_LOCK_KEY } from '../auto-lock'

describe('useVaultAutoLock 自动锁定', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(k => delete store[k])
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('默认设置：5 分钟空闲 + 切页锁定', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    expect(api.settings.value).toEqual(DEFAULT_AUTO_LOCK)
    expect(IDLE_OPTIONS).toContain(5)
  })

  it('arm 后空闲超时触发 onLock', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.arm()
    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('空闲超时前有活动则重置计时', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.arm()
    // 4 分钟后有活动，重置计时
    vi.advanceTimersByTime(4 * 60 * 1000)
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(4 * 60 * 1000)
    expect(onLock).not.toHaveBeenCalled()
    // 再过 1 分钟（累计 5 分钟无活动）触发
    vi.advanceTimersByTime(1 * 60 * 1000)
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('idleMinutes 为 0 时不触发空闲锁定', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.updateSettings({ idleMinutes: 0 })
    api.arm()
    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(onLock).not.toHaveBeenCalled()
  })

  it('页面隐藏且 lockOnBlur 开启时立即锁定', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.arm()
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('lockOnBlur 关闭时页面隐藏不锁定', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.updateSettings({ lockOnBlur: false })
    api.arm()
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(onLock).not.toHaveBeenCalled()
  })

  it('disarm 后不再触发空闲锁定', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.arm()
    api.disarm()
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(onLock).not.toHaveBeenCalled()
  })

  it('updateSettings 持久化到存储', () => {
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.updateSettings({ idleMinutes: 15, lockOnBlur: false })
    expect(store[AUTO_LOCK_KEY]).toEqual({ idleMinutes: 15, lockOnBlur: false })
  })

  it('arm 时读取已存设置', () => {
    store[AUTO_LOCK_KEY] = { idleMinutes: 30, lockOnBlur: false }
    const onLock = vi.fn()
    const api = useVaultAutoLock(onLock)
    api.arm()
    expect(api.settings.value).toEqual({ idleMinutes: 30, lockOnBlur: false })
  })
})
