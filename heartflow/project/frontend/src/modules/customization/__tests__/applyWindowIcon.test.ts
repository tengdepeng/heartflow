// 运行时窗口图标热替换（item3）锁定测试。
// 重点：
//  ① 非 Tauri 环境 no-op（不触碰 Tauri API，避免浏览器模式报错）
//  ② 空值 / 字形 no-op（保留构建期默认图标）
//  ③ 图片 RGBA 经 TauriImage.new → getCurrentWindow().setIcon 推送到窗口
//  ④ 端到端：applyBrandIconToWindow 在图片 data-uri 下抵达 setIcon
// 关键实证（已读 @tauri-apps/api 源码）：Image 须用静态方法 Image.new(rgba,w,h)，
// 裸 `new Image(rgba,w,h)` 会误调内部 constructor(rid)。
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

const hoisted = vi.hoisted(() => {
  const setIcon = vi.fn().mockResolvedValue(undefined)
  const getCurrentWindow = vi.fn(() => ({ setIcon }))
  return { setIcon, getCurrentWindow }
})

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => hoisted.getCurrentWindow(),
}))
vi.mock('@tauri-apps/api/image', () => ({
  // 复刻真实 Image.new 行为：返回带 rgba + 尺寸的实例（构造器为内部 rid，故走静态 new）
  Image: class {
    rgba: unknown
    w: number
    h: number
    constructor(rgba: unknown, w: number, h: number) {
      this.rgba = rgba
      this.w = w
      this.h = h
    }
    static async new(rgba: unknown, w: number, h: number) {
      return new (this as unknown as new (r: unknown, w: number, h: number) => unknown)(rgba, w, h)
    }
  },
}))

import { applyBrandIconToWindow, pushRgbaToWindow } from '../applyWindowIcon'

describe('applyBrandIconToWindow（守卫 + 端到端）', () => {
  beforeAll(() => {
    // 让 dataUriToRgba 在 happy-dom 下可解析：伪造 img.onload 与 canvas.getImageData
    const orig = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'img') {
        const el = orig('div') as unknown as HTMLImageElement & { width: number; height: number }
        ;(el as unknown as { width: number }).width = 64
        ;(el as unknown as { height: number }).height = 64
        Object.defineProperty(el, 'src', {
          set() {
            queueMicrotask(() => (el as unknown as { onload?: () => void }).onload?.())
          },
          get() {
            return ''
          },
        })
        return el
      }
      if (tag === 'canvas') {
        const c = orig('div') as unknown as HTMLCanvasElement
        ;(c as unknown as { width: number; height: number }).width = 0
        ;(c as unknown as { height: number }).height = 0
        ;(c.getContext as unknown) = () => ({
          drawImage() {},
          getImageData: () => ({ data: new Uint8ClampedArray(256 * 256 * 4) }),
        })
        return c
      }
      return orig(tag)
    }) as typeof document.createElement)
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    hoisted.setIcon.mockClear()
    hoisted.getCurrentWindow.mockClear()
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })

  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })

  it('非 Tauri 环境：直接 no-op，不调用 window API', async () => {
    await applyBrandIconToWindow('data:image/png;base64,AAA')
    expect(hoisted.getCurrentWindow).not.toHaveBeenCalled()
  })

  it('空值：no-op，不调用 setIcon', async () => {
    ;(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
    await applyBrandIconToWindow(null)
    expect(hoisted.setIcon).not.toHaveBeenCalled()
  })

  it('字形（非图片）：no-op，保留默认图标', async () => {
    ;(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
    await applyBrandIconToWindow('✦')
    expect(hoisted.setIcon).not.toHaveBeenCalled()
  })

  it('图片 data-uri（Tauri）：端到端抵达 setIcon，送入 256×256 Image', async () => {
    ;(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
    await applyBrandIconToWindow('data:image/png;base64,AAA')
    expect(hoisted.getCurrentWindow).toHaveBeenCalledTimes(1)
    expect(hoisted.setIcon).toHaveBeenCalledTimes(1)
    const arg = hoisted.setIcon.mock.calls[0][0] as { w: number; h: number; rgba: unknown }
    expect(arg.w).toBe(256)
    expect(arg.h).toBe(256)
    expect(arg.rgba).toBeInstanceOf(Uint8Array)
  })
})

describe('pushRgbaToWindow（RGBA → 窗口图标）', () => {
  beforeEach(() => {
    hoisted.setIcon.mockClear()
    hoisted.getCurrentWindow.mockClear()
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })
  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })

  it('非 Tauri：no-op', async () => {
    await pushRgbaToWindow(new Uint8Array([1, 2, 3, 4]), 1, 1)
    expect(hoisted.setIcon).not.toHaveBeenCalled()
  })

  it('Tauri：调用 setIcon 传入带尺寸的 Image', async () => {
    ;(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
    const rgba = new Uint8Array([255, 0, 0, 255])
    await pushRgbaToWindow(rgba, 1, 1)
    expect(hoisted.setIcon).toHaveBeenCalledTimes(1)
    const arg = hoisted.setIcon.mock.calls[0][0] as { w: number; h: number; rgba: unknown }
    expect(arg.w).toBe(1)
    expect(arg.h).toBe(1)
    expect(arg.rgba).toBe(rgba)
  })
})
