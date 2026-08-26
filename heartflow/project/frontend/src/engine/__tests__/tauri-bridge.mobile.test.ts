// ============================================================
// Tauri Bridge — 移动端降级测试
// 通过 mock 平台检测强制 isMobile()=true，验证桌面专属命令在移动端
// 不发起 invoke、返回安全默认值或明确错误。
// 独立文件以避免污染桌面默认值测试（utils/platform 模块级缓存）。
// ============================================================

import { describe, it, expect, vi } from 'vitest'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))
vi.mock('../../utils/platform', () => ({ hasCapability: vi.fn(() => false) }))

import * as tauriBridge from '../tauri-bridge'

describe('Tauri Bridge — 移动端降级', () => {
  it('checkAutoStart 在移动端返回 false 且不发起 invoke', async () => {
    const r = await tauriBridge.checkAutoStart()
    expect(r.success).toBe(true)
    expect(r.data).toBe(false)
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('setAutoStart 在移动端为 no-op 且不发起 invoke', async () => {
    const r = await tauriBridge.setAutoStart(true)
    expect(r.success).toBe(true)
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('registerShortcut 在移动端返回明确错误且不发起 invoke', async () => {
    const r = await tauriBridge.registerShortcut('Ctrl+Shift+K')
    expect(r.success).toBe(false)
    expect(r.error).toContain('移动端')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('unregisterAllShortcuts 在移动端为 no-op 且不发起 invoke', async () => {
    const r = await tauriBridge.unregisterAllShortcuts()
    expect(r.success).toBe(true)
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('openOverlayWindow 在移动端返回明确错误且不发起 invoke', async () => {
    const r = await tauriBridge.openOverlayWindow('#000000', 0.5)
    expect(r.success).toBe(false)
    expect(r.error).toContain('应用内浮层')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('closeOverlayWindow 在移动端为 no-op 且不发起 invoke', async () => {
    const r = await tauriBridge.closeOverlayWindow()
    expect(r.success).toBe(true)
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('getTouchpointStatus 在移动端返回安全默认且不发起 invoke', async () => {
    const r = await tauriBridge.getTouchpointStatus()
    expect(r.success).toBe(true)
    expect(r.data).toEqual({ autoStart: false, shortcutCount: 0, overlayActive: false })
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})
