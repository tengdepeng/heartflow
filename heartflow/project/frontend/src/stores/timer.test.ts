// ============================================================
// timer store · 安全岛状态冻结/恢复测试
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTimerStore } from './timer'
import { storage } from '../engine/storage'

describe('timer sanctuary state freeze/restore', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => { memoryStorage.set(key, value) },
        removeItem: (key: string) => { memoryStorage.delete(key) },
      },
      configurable: true,
    })
    // 为 timer store 的 setInterval mock window
    vi.stubGlobal('window', {
      setInterval: vi.fn(() => 123),
      clearInterval: vi.fn(),
      matchMedia: vi.fn(() => ({ matches: false })),
    })
    vi.useFakeTimers()
    setActivePinia(createPinia())
    storage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('进入安全岛时正在专注 → 暂停并记录状态', () => {
    const timer = useTimerStore()
    timer.setMode('focus', 25)
    timer.start()

    expect(timer.isFocusing).toBe(true)
    expect(timer.isRunning).toBe(true)

    timer.pauseForSanctuary()

    expect(timer.isRunning).toBe(false)
    expect(timer.isPaused).toBe(true)
  })

  it('进入安全岛时已暂停 → 保持暂停状态', () => {
    const timer = useTimerStore()
    timer.setMode('focus', 25)
    timer.start()
    timer.pause()

    expect(timer.isPaused).toBe(true)
    expect(timer.isRunning).toBe(false)

    timer.pauseForSanctuary()

    expect(timer.isPaused).toBe(true)
    expect(timer.isRunning).toBe(false)
  })

  it('进入安全岛时空闲 → 不改变状态', () => {
    const timer = useTimerStore()
    timer.setMode('focus', 25)

    expect(timer.isIdle).toBe(true)

    timer.pauseForSanctuary()

    expect(timer.isIdle).toBe(true)
  })

  it('退出安全岛时之前的专注会话应恢复', () => {
    const timer = useTimerStore()
    timer.setMode('focus', 25)
    timer.start()

    expect(timer.isFocusing).toBe(true)

    timer.pauseForSanctuary()
    expect(timer.isPaused).toBe(true)

    timer.resumeFromSanctuary()
    expect(timer.isFocusing).toBe(true)
    expect(timer.isRunning).toBe(true)
  })

  it('退出安全岛时若之前未专注不应恢复计时', () => {
    const timer = useTimerStore()
    timer.setMode('focus', 25)
    timer.start()
    timer.pause()

    expect(timer.isPaused).toBe(true)

    // 不在专注状态下进入安全岛 → 记录为 paused
    timer.pauseForSanctuary()

    // 退出安全岛 → 不应自动 resume（因为进入时不是 focusing 状态）
    timer.resumeFromSanctuary()
    expect(timer.isPaused).toBe(true)
  })

  it('重复进入安全岛不应二次暂停', () => {
    const timer = useTimerStore()
    timer.setMode('focus', 25)
    timer.start()
    timer.pauseForSanctuary()

    expect(timer.isPaused).toBe(true)

    // 再次进入
    timer.pauseForSanctuary()
    expect(timer.isPaused).toBe(true)
  })
})