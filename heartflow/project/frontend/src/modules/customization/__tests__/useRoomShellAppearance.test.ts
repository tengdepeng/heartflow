// ============================================================
// 超级自定义 · 统一房间壳层外观（useRoomShellAppearance）单测
// 覆盖：默认值、contentPad 写 :root(--room-content-pad)、四项持久化、
//       applyRoomShellAppearance 幂等重放、CONTENT_PAD_PX 映射
// 严守宪法：偏好仅存本地 KV（room-shell:*），CSS 变量写在 :root。
// 模块级单例 → 每例 vi.resetModules + await import() 以重载 storage 读取。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

async function loadApi() {
  vi.resetModules()
  Object.keys(store).forEach((k) => delete store[k])
  const mod = await import('../useRoomShellAppearance')
  return mod.useRoomShellAppearance()
}

describe('useRoomShellAppearance · 统一房间壳层外观', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('默认值与源码常量一致', async () => {
    const a = await loadApi()
    expect(a.contentPad.value).toBe('normal')
    expect(a.headerAlign.value).toBe('left')
    expect(a.ornament.value).toBe(true)
    expect(a.showKicker.value).toBe(true)
    expect(a.titleScale.value).toBe('default')
  })

  it('contentPad set 写入 :root --room-content-pad 并持久化', async () => {
    const a = await loadApi()
    a.setContentPad('spacious')
    expect(a.contentPad.value).toBe('spacious')
    expect(document.documentElement.style.getPropertyValue('--room-content-pad').trim()).toBe('40px')
    expect(mockSetKV).toHaveBeenCalledWith('room-shell:content-pad', 'spacious')
    a.setContentPad('compact')
    expect(document.documentElement.style.getPropertyValue('--room-content-pad').trim()).toBe('12px')
  })

  it('headerAlign / titleScale / ornament / showKicker 持久化', async () => {
    const a = await loadApi()
    a.setHeaderAlign('center')
    expect(a.headerAlign.value).toBe('center')
    expect(mockSetKV).toHaveBeenCalledWith('room-shell:header-align', 'center')

    a.setTitleScale('hero')
    expect(a.titleScale.value).toBe('hero')
    expect(mockSetKV).toHaveBeenCalledWith('room-shell:title-scale', 'hero')

    a.setOrnament(false)
    expect(a.ornament.value).toBe(false)
    expect(mockSetKV).toHaveBeenCalledWith('room-shell:ornament', false)

    a.setShowKicker(false)
    expect(a.showKicker.value).toBe(false)
    expect(mockSetKV).toHaveBeenCalledWith('room-shell:show-kicker', false)
  })

  it('CONTENT_PAD_PX 映射正确', async () => {
    const mod = await import('../useRoomShellAppearance')
    expect(mod.CONTENT_PAD_PX.compact).toBe('12px')
    expect(mod.CONTENT_PAD_PX.normal).toBe('24px')
    expect(mod.CONTENT_PAD_PX.spacious).toBe('40px')
  })

  it('applyRoomShellAppearance 幂等重放（防御性）', async () => {
    await loadApi()
    const mod: any = await import('../useRoomShellAppearance')
    expect(mod.applyRoomShellAppearance).toBeTypeOf('function')
    mod.applyRoomShellAppearance()
    expect(document.documentElement.style.getPropertyValue('--room-content-pad').trim()).toBe('24px')
  })
})
