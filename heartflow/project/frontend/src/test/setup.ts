// 全局测试 setup —— 补齐 happy-dom 未实现的浏览器 API，消除"环境抖动"型假失败。
// happy-dom 不实现 canvas 2D context，world-shell 等渲染组件一调 ctx.rect/fillRect
// 就抛 "ctx.rect is not a function"。这里提供一个最小 stub，让渲染型测试在 node 环境跑通，
// 不掩盖真实逻辑错误（仅补齐环境缺失）。
import { vi } from 'vitest'

const noop = () => {}

const ctxStub = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  font: '',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  lineCap: 'butt',
  lineJoin: 'miter',
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  canvas: null,
  fillRect: noop,
  clearRect: noop,
  strokeRect: noop,
  rect: noop,
  beginPath: noop,
  closePath: noop,
  moveTo: noop,
  lineTo: noop,
  arc: noop,
  arcTo: noop,
  bezierCurveTo: noop,
  quadraticCurveTo: noop,
  ellipse: noop,
  roundRect: noop,
  fill: noop,
  stroke: noop,
  clip: noop,
  save: noop,
  restore: noop,
  translate: noop,
  rotate: noop,
  scale: noop,
  transform: noop,
  setTransform: noop,
  resetTransform: noop,
  setLineDash: noop,
  getLineDash: () => [],
  fillText: noop,
  strokeText: noop,
  measureText: () => ({ width: 0 }),
  drawImage: noop,
  putImageData: noop,
  getImageData: () => ({ data: new Uint8ClampedArray(0) }),
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
  createPattern: () => null,
} as unknown as CanvasRenderingContext2D

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctxStub) as unknown as typeof HTMLCanvasElement.prototype.getContext
}

// happy-dom 未实现 ResizeObserver / IntersectionObserver / matchMedia，补齐以免相关组件在测试期崩溃。
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    root = null
    rootMargin = ''
    thresholds = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof globalThis.IntersectionObserver
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
