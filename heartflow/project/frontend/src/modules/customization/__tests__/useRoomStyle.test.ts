// ============================================================
// 应用空间自定义 · 单房间风格覆盖（useRoomStyle）单测
// 覆盖：默认覆盖 / getRoomOverride / setRoomOverride 自动启用 / 清除回退 /
//       roomStyleVars 派生变量 / roomBackground（预设→介质映射 / 独立背景正交）
// 严守宪法第43条：偏好仅存本地 storage（customization:room-style-overrides）。
// 模块级单例 → 每例 vi.resetModules + await import() 以重载 storage 读取。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PresetScene } from '../../../types'

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
  const mod = await import('../useRoomStyle')
  return mod.useRoomStyle()
}

function preset(scene: PresetScene = 'forest-dawn'): { type: 'preset'; presetScene: PresetScene; dataUrl: null; mimeType: null; fileName: null; updatedAt: null } {
  return { type: 'preset', presetScene: scene, dataUrl: null, mimeType: null, fileName: null, updatedAt: null }
}

describe('useRoomStyle · 单房间风格覆盖', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未设置任何覆盖时，返回默认覆盖且跟随全局（isRoomOverridden=false）', async () => {
    const r = await loadApi()
    const ov = r.getRoomOverride('study')
    expect(ov.enabled).toBe(false)
    expect(r.isRoomOverridden('study')).toBe(false)
    expect(r.roomStyleVars('study')).toEqual({})
    expect(r.roomBackgroundScene('study')).toBeNull()
  })

  it('setRoomOverride 默认自动启用，并派生 CSS 变量集', async () => {
    const r = await loadApi()
    r.setRoomOverride('study', { accent: '#ff8800', bgPrimary: '#101020', presetScene: 'forest-dawn' })
    expect(r.isRoomOverridden('study')).toBe(true)
    const vars = r.roomStyleVars('study')
    expect(vars['--accent']).toBe('#ff8800')
    expect(vars['--bg-primary']).toBe('#101020')
    expect(vars['--accent-rgb']).toBe('255, 136, 0')
    expect(mockSetKV).toHaveBeenCalledWith(
      'customization:room-style-overrides',
      expect.objectContaining({ study: expect.objectContaining({ enabled: true, accent: '#ff8800' }) }),
    )
  })

  it('未启用覆盖时 roomStyleVars 返回空对象（跟随全局）', async () => {
    const r = await loadApi()
    r.setRoomOverride('study', { accent: '#ff8800' })
    r.setRoomOverride('study', { enabled: false })
    expect(r.roomStyleVars('study')).toEqual({})
  })

  it('clearRoomOverride 移除覆盖并回退全局', async () => {
    const r = await loadApi()
    r.setRoomOverride('study', { accent: '#00ff00' })
    r.clearRoomOverride('study')
    expect(r.isRoomOverridden('study')).toBe(false)
    expect(r.roomStyleVars('study')).toEqual({})
    expect(store['customization:room-style-overrides']).toEqual({})
  })

  it('roomBackground：旧 presetScene 覆盖映射为预设背景介质', async () => {
    const r = await loadApi()
    r.setRoomOverride('study', { presetScene: 'rainy-window' })
    const bg = r.roomBackground('study')
    expect(bg).not.toBeNull()
    expect(bg!.type).toBe('preset')
    expect((bg as { presetScene: string }).presetScene).toBe('rainy-window')
  })

  it('setRoomBackground 独立设置背景，与主题色 enabled 正交（不受 enabled 影响）', async () => {
    const r = await loadApi()
    r.setRoomOverride('study', { enabled: false })
    r.setRoomBackground('study', preset())
    const bg = r.roomBackground('study')
    expect(bg).not.toBeNull()
    expect(bg!.type).toBe('preset')
    expect(r.isRoomOverridden('study')).toBe(false)
    expect(r.roomStyleVars('study')).toEqual({})
  })

  it('clearRoomBackground 清除独立背景', async () => {
    const r = await loadApi()
    r.setRoomBackground('study', preset())
    r.clearRoomBackground('study')
    const ov = r.getRoomOverride('study')
    expect(ov.background).toBeNull()
  })
})