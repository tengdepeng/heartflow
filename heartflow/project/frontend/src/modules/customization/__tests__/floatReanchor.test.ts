// 悬浮窗随窗口缩放重锚的纯几何计算（① 响应式自适应）锁定测试。
// 不依赖 DOM：直接断言钳制/钉边逻辑，防止"缩小窗口悬浮窗停原位移出屏外"回退。
import { describe, it, expect } from 'vitest'
import { clampSidebarFloat, clampNavFloat } from '../floatReanchor'

describe('clampSidebarFloat（侧栏重锚）', () => {
  const rect = { width: 220, height: 600 }

  it('free：超出视口的自由坐标被钳制回视口内', () => {
    // 1920×1080 窗口下放右侧外（x=1900 → 应钳到 vw-keep=1032）
    const r = clampSidebarFloat({ x: 1900, y: 2000 }, 'free', rect, 1920, 1080)
    expect(r.x).toBe(1920 - 48)
    expect(r.y).toBe(1080 - 48)
  })

  it('free：纵向允许上溢（top 可为负），不破坏比视口高的侧栏', () => {
    const r = clampSidebarFloat({ x: 100, y: -300 }, 'free', rect, 1920, 1080)
    // x 在范围内不动；y 允许 -(height-keep) = -552 ≤ -300，保持
    expect(r.x).toBe(100)
    expect(r.y).toBe(-300)
  })

  it('right：x 钉回视口右缘（vw - width），自由 y 在范围内不动', () => {
    // 旧窗口 1920 存的 x=1700；缩到 1000 宽 → 应钉到 1000-220=780
    const r = clampSidebarFloat({ x: 1700, y: 900 }, 'right', rect, 1000, 1080)
    expect(r.x).toBe(1000 - 220)
    expect(r.y).toBe(900) // y=900 在 [-(height-keep), vh-keep] 内，保持
  })

  it('left：x 恒为 0（左缘），自由 y 钳制进视口', () => {
    const r = clampSidebarFloat({ x: 0, y: 5000 }, 'left', rect, 1920, 1080)
    expect(r.x).toBe(0)
    expect(r.y).toBe(1080 - 48)
  })

  it('bottom：y 钉回视口下缘（vh - height），自由 x 钳制', () => {
    const r = clampSidebarFloat({ x: 300, y: 800 }, 'bottom', rect, 1920, 1000)
    expect(r.y).toBe(1000 - 600)
    expect(r.x).toBe(300) // 在范围内不动
  })

  it('角落 tr：x 钉右缘、y 钉上缘', () => {
    const r = clampSidebarFloat({ x: 1700, y: 400 }, 'tr', rect, 1000, 1080)
    expect(r.x).toBe(1000 - 220)
    expect(r.y).toBe(0)
  })

  it('同视口内位置不变：不触发无谓写回', () => {
    const r = clampSidebarFloat({ x: 300, y: 300 }, 'free', rect, 1920, 1080)
    expect(r).toEqual({ x: 300, y: 300 })
  })
})

describe('clampNavFloat（液态底栏重锚，中心坐标）', () => {
  const rect = { width: 480, height: 56 }

  it('中心坐标超出视口被钳制回视口内（按半宽半高 + keep）', () => {
    // 1920×1080 放右下角外（x=1900>1656，半宽 240 → 钳到 1920-240-24=1656；
    //                         y=1070>1028，半高 28 → 钳到 1080-28-24=1028）
    const r = clampNavFloat({ x: 1900, y: 1070 }, rect, 1920, 1080)
    expect(r.x).toBe(1920 - 240 - 24)
    expect(r.y).toBe(1080 - 28 - 24)
  })

  it('中心坐标在视口内不动', () => {
    const r = clampNavFloat({ x: 960, y: 540 }, rect, 1920, 1080)
    expect(r).toEqual({ x: 960, y: 540 })
  })

  it('缩小窗口后右下角自由坐标被拉回视口内', () => {
    // 旧窗口 1920 存的 x=1700,y=900；缩到 800×600 → 钳到 800-240-24=536 / 600-28-24=548
    const r = clampNavFloat({ x: 1700, y: 900 }, rect, 800, 600)
    expect(r.x).toBe(800 - 240 - 24)
    expect(r.y).toBe(600 - 28 - 24)
  })
})
