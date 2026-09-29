// ============================================================
// 即时刷新桥：refreshAndroidWidgets
// 覆盖：首次触发 / 节流（番茄钟每秒 tick 不每秒广播）/ 用户操作不被节流 / 容错
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.hoisted(() => vi.fn())
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string) => invokeMock(cmd),
}))

import { refreshAndroidWidgets } from '../sync'

const CMD = 'plugin:heartflowWidgets|refreshWidgets'

// refreshAndroidWidgets 的节流状态是模块级的，故每个用例把时钟大幅推进，
// 避免上一用例留下的 lastRefreshAt 把当前用例的首次调用也挡在节流窗口内。
let clock = Date.parse('2026-09-30T00:00:00Z')

beforeEach(() => {
  invokeMock.mockReset()
  vi.useFakeTimers()
  clock += 60_000
  vi.setSystemTime(clock)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('refreshAndroidWidgets', () => {
  it('首次调用触发 Android 原生刷新命令', async () => {
    invokeMock.mockResolvedValue(undefined)
    await refreshAndroidWidgets()
    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith(CMD)
  })

  it('节流：5s 内重复调用不再广播（番茄钟每秒 tick 不会每秒刷新）', async () => {
    invokeMock.mockResolvedValue(undefined)
    await refreshAndroidWidgets(true)
    vi.advanceTimersByTime(1_000)
    await refreshAndroidWidgets(true)
    vi.advanceTimersByTime(3_000)
    await refreshAndroidWidgets(true)
    expect(invokeMock).toHaveBeenCalledTimes(1) // 累计仅 4s < 5s
    vi.advanceTimersByTime(6_000) // 累计 10s，越过节流窗口
    await refreshAndroidWidgets(true)
    expect(invokeMock).toHaveBeenCalledTimes(2)
  })

  it('用户操作（默认不节流）立即广播，不被上一次节流窗口挡住', async () => {
    invokeMock.mockResolvedValue(undefined)
    await refreshAndroidWidgets(true) // 自动监听路径，记下时间戳
    await refreshAndroidWidgets() // 用户操作路径：应立即再发一次
    expect(invokeMock).toHaveBeenCalledTimes(2)
  })

  it('命令不可用时静默容错（桌面 / web 端无对应命令）', async () => {
    invokeMock.mockRejectedValue(new Error('command not found'))
    await expect(refreshAndroidWidgets()).resolves.toBeUndefined()
  })
})
