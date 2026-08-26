// ============================================================
// 星辰壳 · 沉浸 3D 星团 QA 验证
// 验证 stars-3d 壳：自注册、WebGL 不可用优雅降级、hitTest/render/destroy 安全。
// 不涉及真实 WebGL 渲染断言（jsdom 无 GL 上下文），聚焦「不崩 + 接口契约」。
// ============================================================

import { describe, it, expect } from 'vitest'
import { createShell, isShellRegistered } from '../types'
import { Stars3DShell } from '../stars-3d'
import type { ShellContext } from '../types'

function makeCtx(canvas?: HTMLCanvasElement): ShellContext {
  const noop = () => {}
  const ctx = new Proxy(
    {
      clearRect: noop, fillRect: noop, beginPath: noop, moveTo: noop, lineTo: noop,
      arc: noop, closePath: noop, fill: noop, stroke: noop, save: noop, restore: noop,
      setLineDash: noop, fillText: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
      canvas: canvas ?? (undefined as unknown as HTMLCanvasElement),
    } as unknown as CanvasRenderingContext2D,
    { get: (t, p) => (p in t ? (t as unknown as Record<string, unknown>)[p as string] : noop), set: () => true },
  )
  return {
    ctx,
    canvas,
    width: 800,
    height: 600,
    intensity: 1,
    sanctuary: false,
    config: { starFieldDensity: 0.6, starsMode: '3d' },
    rooms: [
      { id: 'timeline', name: '时间长廊', slot: 'front-yard' as const, path: '/timeline', frequency: 0.8, recency: 0.6 },
      { id: 'knowledge', name: '经略阁', slot: 'hall' as const, path: '/knowledge', frequency: 0.6, recency: 0.4 },
    ],
  }
}

describe('stars-3d 壳注册与接口', () => {
  it('自注册到世界壳工厂', () => {
    expect(isShellRegistered('stars-3d')).toBe(true)
    const inst = createShell('stars-3d')
    expect(inst).not.toBeNull()
    expect(inst?.kind).toBe('stars-3d')
  })

  it('createShell 返回 Stars3DShell 实例且类型正确', () => {
    const inst = createShell('stars-3d')
    expect(inst instanceof Stars3DShell).toBe(true)
  })

  it('mount 无 canvas（WebGL 不可达）时优雅降级，不抛', () => {
    const shell = new Stars3DShell()
    expect(() => shell.mount(makeCtx(undefined))).not.toThrow()
  })

  it('mount 有 canvas 但 jsdom 无 WebGL 时 try/catch 降级，不抛', () => {
    const canvas = document.createElement('canvas')
    const shell = new Stars3DShell()
    // jsdom 无 WebGL 上下文 → WebGLRenderer 构造抛 → 捕获后 canvas=null return
    expect(() => shell.mount(makeCtx(canvas))).not.toThrow()
  })

  it('hitTest 在 renderer 未初始化时安全返回 null', () => {
    const shell = new Stars3DShell()
    shell.mount(makeCtx(undefined))
    const hit = shell.hitTest(400, 300)
    expect(hit).toBeNull()
  })

  it('render / destroy 在未初始化时安全不抛', () => {
    const shell = new Stars3DShell()
    expect(() => shell.render(0)).not.toThrow()
    expect(() => shell.destroy()).not.toThrow()
  })

  it('getScreenRect 返回合法矩形（屏风位中央）', () => {
    const shell = new Stars3DShell()
    shell.mount(makeCtx(undefined))
    const rect = shell.getScreenRect()
    expect(rect.w).toBeGreaterThan(0)
    expect(rect.h).toBeGreaterThan(0)
    expect(rect.jade).toBeDefined()
  })

  it('setHover 不抛（hover 高亮状态机）', () => {
    const shell = new Stars3DShell()
    expect(() => shell.setHover('front-yard', 'timeline')).not.toThrow()
    expect(() => shell.setHover(null, null)).not.toThrow()
  })

  it('updateContext 不抛', () => {
    const shell = new Stars3DShell()
    shell.mount(makeCtx(undefined))
    expect(() =>
      shell.updateContext({ intensity: 0.5, sanctuary: true, config: { starFieldDensity: 0.4 } }),
    ).not.toThrow()
  })
})
