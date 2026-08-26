// ============================================================
// M3-一期 · 家 3D 房间壳 — 针对性测试
// 纯函数（颜色推导）可在无 WebGL 环境单测；
// 场景工厂仅在「未挂载」下验证 API 契约（mount 需要真实 WebGL 上下文，
// 由本地应用运行验证，不在此处执行）。
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  clampChannel,
  shade,
  derivePalette,
  createHomeRoomScene,
  type HomeRoomScene,
} from '../useHomeRoomScene3D'

describe('颜色解析 hexToRgb', () => {
  it('解析 #rrggbb', () => {
    expect(hexToRgb('#fce4b3')).toEqual([252, 228, 179])
  })
  it('解析简写 #rgb', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  })
  it('容忍有无 # 前缀', () => {
    expect(hexToRgb('c49a6a')).toEqual([196, 154, 106])
  })
  it('非法输入返回 null', () => {
    expect(hexToRgb('#zzz')).toBeNull()
    expect(hexToRgb('not-a-color')).toBeNull()
    expect(hexToRgb('')).toBeNull()
    // @ts-expect-error 故意传入非字符串
    expect(hexToRgb(123)).toBeNull()
  })
})

describe('通道钳制 clampChannel', () => {
  it('超出范围被钳制', () => {
    expect(clampChannel(-5)).toBe(0)
    expect(clampChannel(300)).toBe(255)
    expect(clampChannel(128.4)).toBe(128)
  })
  it('NaN 归零', () => {
    expect(clampChannel(NaN)).toBe(0)
  })
})

describe('明暗推导 shade', () => {
  it('变暗（amount>0）降低亮度', () => {
    const dark = shade('#ffffff', 0.5)
    expect(dark).not.toBe('#ffffff')
    const rgb = hexToRgb(dark)!
    expect(rgb[0]).toBeLessThan(255)
  })
  it('变亮（amount<0）提升亮度（对非零基色）', () => {
    const light = shade('#808080', -0.5)
    const rgb = hexToRgb(light)!
    expect(rgb[0]).toBeGreaterThan(128)
  })
  it('非法输入原样返回', () => {
    expect(shade('#zzz', 0.5)).toBe('#zzz')
  })
})

describe('调色板推导 derivePalette', () => {
  it('仅给 glow 时推导 base / glowEnd', () => {
    const p = derivePalette({ glow: '#fce4b3' })
    expect(p.glow).toBe('#fce4b3')
    expect(p.base).not.toBe('#fce4b3')
    expect(p.glowEnd).not.toBe('#fce4b3')
    // 暗部应比基础更暗
    const baseR = hexToRgb(p.base)![0]
    const endR = hexToRgb(p.glowEnd)![0]
    expect(endR).toBeLessThanOrEqual(baseR)
  })
  it('显式 base / glowEnd 优先', () => {
    const p = derivePalette({ glow: '#fce4b3', base: '#111111', glowEnd: '#222222' })
    expect(p.base).toBe('#111111')
    expect(p.glowEnd).toBe('#222222')
  })
})

describe('场景工厂 createHomeRoomScene', () => {
  it('返回完整 API 契约', () => {
    const scene: HomeRoomScene = createHomeRoomScene()
    expect(typeof scene.mount).toBe('function')
    expect(typeof scene.setRoom).toBe('function')
    expect(typeof scene.rotateBy).toBe('function')
    expect(typeof scene.dispose).toBe('function')
  })

  it('未挂载时 setRoom / rotateBy 安全无副作用（不抛错）', () => {
    const scene = createHomeRoomScene()
    expect(() => scene.setRoom({ glow: '#fce4b3' })).not.toThrow()
    expect(() => scene.rotateBy(10, 5)).not.toThrow()
    expect(() => scene.dispose()).not.toThrow()
  })

  it('接受 dprCap 选项而不抛错', () => {
    expect(() => createHomeRoomScene({ dprCap: 1.5 })).not.toThrow()
  })
})
