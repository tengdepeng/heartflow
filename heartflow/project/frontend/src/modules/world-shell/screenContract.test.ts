// ============================================================
// 屏风契约合成层 · 单元测试
// 验证：(a) screenContract 写入/重置；(b) CourtyardShell.getScreenRect
//   返回正确 rect + 屏侧玉珠位；(c) 契约在星辰壳下回落（玉珠保留于侧旁位）。
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { screenContract, setScreenRect, resetScreenRect, getEffectiveScreenRect, computeFallbackRect } from './screenContract'
import { CourtyardShell } from './courtyard'

describe('screenContract 共享契约', () => {
  beforeEach(() => {
    // 复位到初始态，避免跨用例污染
    screenContract.rect = { x: 0, y: 0, w: 0, h: 0 }
    screenContract.shell = 'courtyard'
    screenContract.ready = false
  })

  it('初始态：rect 为零矩形且未就绪', () => {
    expect(screenContract.ready).toBe(false)
    expect(screenContract.rect).toEqual({ x: 0, y: 0, w: 0, h: 0 })
  })

  it('setScreenRect 写入矩形与壳种类并置 ready', () => {
    setScreenRect(
      { x: 100, y: 80, w: 300, h: 200, jade: { x: 420, y: 180 } },
      'courtyard',
    )
    expect(screenContract.ready).toBe(true)
    expect(screenContract.shell).toBe('courtyard')
    expect(screenContract.rect.jade).toEqual({ x: 420, y: 180 })
  })

  it('resetScreenRect 仅清 ready，保留最后矩形（切壳过渡不闪）', () => {
    setScreenRect({ x: 100, y: 80, w: 300, h: 200 }, 'courtyard')
    resetScreenRect()
    expect(screenContract.ready).toBe(false)
    expect(screenContract.rect.w).toBe(300)
  })
})

describe('computeFallbackRect / getEffectiveScreenRect（非 courtyard 壳兜底）', () => {
  it('computeFallbackRect 返回视口居中矩形且自带屏侧玉珠位', () => {
    const f = computeFallbackRect()
    expect(f.w).toBeGreaterThan(0)
    expect(f.h).toBeGreaterThan(0)
    expect(f.jade).toBeDefined()
    // 玉珠位在矩形右侧（屏侧），与矩形同高
    expect(f.jade!.x).toBeGreaterThan(f.x + f.w)
    expect(f.jade!.y).toBeCloseTo(f.y + f.h / 2, 3)
  })

  it('getEffectiveScreenRect 就绪时返回真实 rect', () => {
    setScreenRect({ x: 100, y: 80, w: 300, h: 200, jade: { x: 420, y: 180 } }, 'courtyard')
    const r = getEffectiveScreenRect()
    expect(r).toEqual({ x: 100, y: 80, w: 300, h: 200, jade: { x: 420, y: 180 } })
  })

  it('getEffectiveScreenRect 未就绪时回落视口中心兜底矩形（首帧不跳位）', () => {
    resetScreenRect()
    const r = getEffectiveScreenRect()
    expect(r.w).toBeGreaterThan(0)
    expect(r.jade).toBeDefined()
    // 兜底层而非 0 矩形——避免玉珠落到 x=40 贴左失联
    expect(r.x + r.w + 40).toBe(r.jade!.x)
  })

  it('getEffectiveScreenRect 就绪但 0 尺寸矩形时仍回落兜底（边界防护）', () => {
    setScreenRect({ x: 0, y: 0, w: 0, h: 0 }, 'stars')
    const r = getEffectiveScreenRect()
    expect(r !== screenContract.rect).toBe(true)
    expect(r.w).toBeGreaterThan(0)
    expect(r.jade).toBeDefined()
  })
})

describe('CourtyardShell.getScreenRect（屏侧玉珠契约）', () => {
  function mountAt(w: number, h: number) {
    const shell = new CourtyardShell()
    const ctxStub = {} as CanvasRenderingContext2D
    shell.mount({
      ctx: ctxStub,
      width: w,
      height: h,
      intensity: 1,
      sanctuary: false,
      config: {},
      rooms: [],
    })
    return shell
  }

  it('mount 后布局出居中屏风矩形（三进默认最宽）', () => {
    const shell = mountAt(1000, 800)
    const r = shell.screenRect
    // ZONES[0]: x=0.5,w=0.34 → 宽 340；y=0.32,h=0.22 → 高 176，居中
    expect(r.w).toBeCloseTo(340, 0)
    expect(r.h).toBeCloseTo(176, 0)
    expect(r.x + r.w / 2).toBeCloseTo(500, 0) // 居中
    expect(r.y + r.h / 2).toBeCloseTo(256, 0) // 0.32 * 800
  })

  it('getScreenRect 返回与 screenRect 一致的 rect，并含屏侧玉珠位', () => {
    const shell = mountAt(1000, 800)
    const out = shell.getScreenRect()
    expect(out.x).toBe(shell.screenRect.x)
    expect(out.w).toBe(shell.screenRect.w)
    expect(out.jade).toBeDefined()
    // 玉珠位应在计时器圆右侧（x 大于矩形中线）、与矩形同高
    expect(out.jade!.x).toBeGreaterThan(shell.screenRect.x + shell.screenRect.w / 2)
    expect(out.jade!.y).toBeCloseTo(shell.screenRect.y + shell.screenRect.h / 2, 0)
  })

  it('one-entry 布局收窄影壁宽度', () => {
    const narrow = new CourtyardShell()
    narrow.mount({
      ctx: {} as CanvasRenderingContext2D,
      width: 1000,
      height: 800,
      intensity: 1,
      sanctuary: false,
      config: { courtyardLayout: 'one-entry' },
      rooms: [],
    })
    const full = mountAt(1000, 800)
    expect(narrow.screenRect.w).toBeLessThan(full.screenRect.w)
    expect(narrow.screenRect.w).toBeCloseTo(340 * 0.7, 0)
  })

  it('resize 后矩形随视口重算', () => {
    const shell = mountAt(1000, 800)
    const before = { ...shell.screenRect }
    shell.resize(500, 400)
    const after = shell.screenRect
    expect(after.w).toBeCloseTo(before.w / 2, 0)
    expect(after.h).toBeCloseTo(before.h / 2, 0)
  })
})

describe('门厅玉珠锚点（App.vue hallAnchor 契约）', () => {
  it('courtyard 就绪时返回屏侧玉珠位', () => {
    setScreenRect(
      { x: 100, y: 80, w: 300, h: 200, jade: { x: 420, y: 180 } },
      'courtyard',
    )
    // 复刻 App.vue 计算：有 jade 取 jade
    const anchor = (() => {
      if (!screenContract.ready) return null
      const jade = screenContract.rect.jade
      if (jade) return { x: jade.x, y: jade.y }
      const r = screenContract.rect
      return { x: r.x + r.w + 40, y: r.y + r.h / 2 }
    })()
    expect(anchor).toEqual({ x: 420, y: 180 })
  })

  it('未就绪时门厅锚点回落 null（玉珠回默认右下）', () => {
    resetScreenRect()
    const anchor = (() => {
      if (!screenContract.ready) return null
      const jade = screenContract.rect.jade
      if (jade) return { x: jade.x, y: jade.y }
      const r = screenContract.rect
      return { x: r.x + r.w + 40, y: r.y + r.h / 2 }
    })()
    expect(anchor).toBeNull()
  })

  it('换星辰壳：契约保留层，玉珠锚定到有效屏位的屏侧（不再 x=40 贴左失联）', () => {
    // 真实星辰壳未布局屏位时 CanvasRoom 走 resetScreenRect→未就绪；
    // 此处模拟：若壳曾写就绪矩形但无 jade（边界），锚点取屏右中点。
    setScreenRect({ x: 120, y: 90, w: 280, h: 180 }, 'stars')
    const anchor = (() => {
      if (!screenContract.ready) return null
      const r = getEffectiveScreenRect()
      const jade = r.jade
      if (jade) return { x: jade.x, y: jade.y }
      return { x: r.x + r.w + 40, y: r.y + r.h / 2 }
    })()
    expect(anchor).toEqual({ x: 120 + 280 + 40, y: 90 + 90 })
    expect(anchor!.x).toBeGreaterThan(screenContract.rect.x + screenContract.rect.w)
  })

  it('星辰壳未就绪：hallAnchor 回落 null（玉珠回默认右下常驻位）', () => {
    resetScreenRect()
    const anchor = (() => {
      if (!screenContract.ready) return null
      const r = getEffectiveScreenRect()
      const jade = r.jade
      if (jade) return { x: jade.x, y: jade.y }
      return { x: r.x + r.w + 40, y: r.y + r.h / 2 }
    })()
    expect(anchor).toBeNull()
  })
})
