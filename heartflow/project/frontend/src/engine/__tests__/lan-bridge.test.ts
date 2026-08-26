// ============================================================
// lan-bridge · publishSharedSnapshot 单元验证（B1.4 扫码即配对后端桥接）
// 覆盖：移动端拒绝 / 桌面端成功 / 后端命令失败降级 / 非 Tauri 环境降级。
// 策略：
//   - isMobile 与 invoke 用稳定 mock 实例，beforeEach 重置其行为，避免用例间串扰；
//   - invoke 经 getter 读取全局占位，可随时切换成功 / 失败；
//   - 仅在「非 Tauri」用例用 vi.resetModules() 重置 lan-bridge 内部 _invoke 缓存，
//     使 getInvoke 重新读取到 undefined（未注入）。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.stubGlobal('localStorage', {
  _data: {} as Record<string, string>,
  get length() { return Object.keys((this as any)._data).length },
  key(i: number) { return Object.keys((this as any)._data)[i] ?? null },
  getItem(k: string) { return (this as any)._data[k] ?? null },
  setItem(k: string, v: string) { (this as any)._data[k] = v },
  removeItem(k: string) { delete (this as any)._data[k] },
  clear() { (this as any)._data = {} },
})

// 动态 invoke：经 getter 读取全局占位，可按用例切换成功 / 失败（对象引用稳定）
vi.mock('@tauri-apps/api/core', () => ({
  get invoke() {
    return (globalThis as any).__tauriInvoke
  },
}))

vi.mock('../../utils/platform', () => ({
  hasCapability: vi.fn(() => true),
}))

import { hasCapability } from '../../utils/platform'
import { publishSharedSnapshot as publishStable } from '../lan-bridge'

// 稳定 invoke 桩（被 @tauri-apps/api/core 的 getter 透出）
const invokeFn = vi.fn()

beforeEach(() => {
  localStorage.clear()
  ;(globalThis as any).__tauriInvoke = invokeFn
  invokeFn.mockReset()
  invokeFn.mockResolvedValue(undefined)
  vi.mocked(hasCapability).mockReturnValue(true)
})

describe('publishSharedSnapshot', () => {
  it('移动端直接拒绝（守宪法第1条本地私有·移动端不可用）', async () => {
    vi.mocked(hasCapability).mockReturnValue(false)
    const res = await publishStable('{"format":"hf-snapshot/v1"}')
    expect(res.success).toBe(false)
    expect(res.error).toContain('移动端')
    expect(invokeFn).not.toHaveBeenCalled()
  })

  it('桌面端 invoke 成功返回 success 并透传 snapshot', async () => {
    const snapshot = '{"format":"hf-snapshot/v1"}'
    const res = await publishStable(snapshot)
    expect(res.success).toBe(true)
    expect(invokeFn).toHaveBeenCalledWith('cmd_lan_set_shared_snapshot', { snapshot })
  })

  it('桌面端 invoke 抛错降级为 failure（带错误信息）', async () => {
    invokeFn.mockRejectedValue(new Error('后端未实现该命令'))
    const res = await publishStable('x')
    expect(res.success).toBe(false)
    expect(res.error).toBe('后端未实现该命令')
  })

  it('非 Tauri 环境（invoke 未注入）降级为 failure', async () => {
    // 必须重置模块使 getInvoke 重新读取到 undefined，走「Not running in Tauri」分支
    vi.resetModules()
    ;(globalThis as any).__tauriInvoke = undefined
    const { publishSharedSnapshot } = await import('../lan-bridge')
    const res = await publishSharedSnapshot('x')
    expect(res.success).toBe(false)
    expect(res.error).toContain('Tauri')
  })
})
