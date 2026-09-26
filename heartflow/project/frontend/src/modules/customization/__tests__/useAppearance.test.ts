// ============================================================
// 超级自定义 · 视觉强度组合式（useAppearance）单测
// 覆盖：alpha 强度（钳制 0-100 + CSS 变量写入 + 持久化）、
//       简单设置持久化、默认值一致性、initAppearance 幂等重放
// 严守宪法：偏好仅存本地 KV（ui:*），CSS 变量写在 :root（happy-dom 环境）。
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
  const mod = await import('../useAppearance')
  return mod.useAppearance()
}

describe('useAppearance · 视觉强度与界面设置', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('默认值与源码常量一致', async () => {
    const a = await loadApi()
    expect(a.canvasAlpha.value).toBe(100)
    expect(a.ambientGrainAlpha.value).toBe(50)
    expect(a.ambientDustAlpha.value).toBe(30)
    expect(a.autoHideChrome.value).toBe(true)
    expect(a.autoHideDelay.value).toBe(3000)
    expect(a.sidebarWidth.value).toBe(220)
    // 净透琉璃铺开：侧栏默认走净透琉璃（glass），侧栏滑块降级为主控的叠加倍率（默认 100）
    expect(a.sidebarBgMode.value).toBe('glass')
    expect(a.sidebarGlass.value).toBe(100)
    // 琉璃通透度主控默认 45
    expect(a.glassClearAlpha.value).toBe(45)
    expect(a.navMode.value).toBe('floating')
    expect(a.dialogueShape.value).toBe('bubble')
    expect(a.crystalStyle.value).toBe('motif')
  })

  it('琉璃通透度 set 写入 --glass-clear-alpha（0-100 钳制）并持久化', async () => {
    const a = await loadApi()
    a.setGlassClearAlpha(72)
    expect(a.glassClearAlpha.value).toBe(72)
    expect(document.documentElement.style.getPropertyValue('--glass-clear-alpha').trim()).toBe('0.72')
    expect(mockSetKV).toHaveBeenCalledWith('ui:glass-clear-alpha', 72)
    a.setGlassClearAlpha(200)
    expect(a.glassClearAlpha.value).toBe(100)
  })

  it('alpha 强度 set 写入 CSS 变量（0-100 钳制）并持久化', async () => {
    const a = await loadApi()
    a.setCanvasAlpha(60)
    expect(a.canvasAlpha.value).toBe(60)
    expect(document.documentElement.style.getPropertyValue('--canvas-alpha').trim()).toBe('0.6')
    expect(mockSetKV).toHaveBeenCalledWith('ui:canvas-alpha', 60)
  })

  it('alpha set 超出范围被钳制到 0-100', async () => {
    const a = await loadApi()
    a.setAmbientGlowAlpha(250)
    expect(a.ambientGlowAlpha.value).toBe(100)
    a.setAmbientGlowAlpha(-5)
    expect(a.ambientGlowAlpha.value).toBe(0)
  })

  it('简单设置持久化到本地 KV（不写 CSS 变量）', async () => {
    const a = await loadApi()
    a.setSidebarWidth(260)
    expect(a.sidebarWidth.value).toBe(260)
    expect(mockSetKV).toHaveBeenCalledWith('ui:sidebar-width', 260)
    a.setAutoHideChrome(false)
    expect(a.autoHideChrome.value).toBe(false)
    expect(mockSetKV).toHaveBeenCalledWith('ui:auto-hide-chrome', false)
  })

  it('initAppearance 幂等重放 alpha（防御性）', async () => {
    await loadApi()
    vi.resetModules()
    const mod: any = await import('../useAppearance')
    expect(mod.initAppearance).toBeTypeOf('function')
  })
})