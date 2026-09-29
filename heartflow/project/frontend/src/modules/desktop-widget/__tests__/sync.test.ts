// ============================================================
// 即时刷新桥：refreshAndroidWidgets
// 验证前端写完快照后 invoke 原生命令，且桌面/web 端无命令时静默容错。
// ============================================================

import { describe, expect, it, vi } from 'vitest'

const invokeMock = vi.hoisted(() => vi.fn())
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string) => invokeMock(cmd),
}))

import { refreshAndroidWidgets } from '../sync'

describe('refreshAndroidWidgets', () => {
  it('invoke 触发 Android 原生刷新命令', async () => {
    invokeMock.mockResolvedValue(undefined)
    await refreshAndroidWidgets()
    expect(invokeMock).toHaveBeenCalledWith('plugin:heartflowWidgets|refreshWidgets')
  })

  it('命令不可用时静默容错（桌面 / web 端无对应命令）', async () => {
    invokeMock.mockRejectedValue(new Error('command not found'))
    await expect(refreshAndroidWidgets()).resolves.toBeUndefined()
  })
})
