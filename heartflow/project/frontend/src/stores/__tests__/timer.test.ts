// ============================================================
// 计时状态管理 · 测试
// 聚焦 A2 · focus:auto-start 宪法门控（disable 型默认约束生效→不自动开始；
// 用户关闭约束后 setMode 专注自动开始计时）。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'

// 拦截宪法引擎的 isTargetActive，精确控制 focus:auto-start 约束态。
// 默认约束生效（true）→ 不自动开始；用户关闭约束（false）→ 自动开始。
vi.mock('../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(() => true),
}))

import { isTargetActive } from '../../engine/constitution-effect'

describe('useTimerStore · A2 focus:auto-start 宪法门控', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
    vi.mocked(isTargetActive).mockReset()
    vi.mocked(isTargetActive).mockReturnValue(true)
  })

  it('默认（约束生效）setMode 专注不自动开始，需手动触发', async () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    const { useTimerStore } = await import('../timer')
    const timer = useTimerStore()

    timer.setMode('focus', 25)

    expect(isTargetActive).toHaveBeenCalledWith('focus:auto-start')
    expect(timer.isRunning).toBe(false)
    expect(timer.isIdle).toBe(true)
    expect(timer.session.status).toBe('idle')
  })

  it('用户关闭约束（isTargetActive=false）setMode 专注自动开始计时', async () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    const { useTimerStore } = await import('../timer')
    const timer = useTimerStore()

    timer.setMode('focus', 25)

    expect(timer.isRunning).toBe(true)
    expect(timer.isFocusing).toBe(true)
    expect(timer.session.status).toBe('focusing')
  })

  it('非专注模式（nap/free）不受 focus:auto-start 门控影响', async () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    const { useTimerStore } = await import('../timer')
    const timer = useTimerStore()

    timer.setMode('nap', 25)
    expect(timer.isRunning).toBe(false)
    expect(timer.session.status).toBe('idle')

    timer.setMode('free', 25)
    expect(timer.isRunning).toBe(false)
  })

  it('已有会话进行中 setMode 会先中断再（按约束）决定是否自动开始', async () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    const { useTimerStore } = await import('../timer')
    const timer = useTimerStore()

    // 先起一个专注会话
    timer.setMode('focus', 25)
    expect(timer.isFocusing).toBe(true)
    const firstSessionId = timer.session.id

    // 切换到 nap 模式（约束关闭→但 nap 不自动开始）
    timer.setMode('nap', 10)
    expect(timer.session.id).not.toBe(firstSessionId)
    expect(timer.isRunning).toBe(false)
  })
})
