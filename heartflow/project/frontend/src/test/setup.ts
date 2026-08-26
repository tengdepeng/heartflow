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

// 最小 WebGL2 上下文 stub（Proxy 兜底）：happy-dom 不实现 WebGL，含 three.js 3D 场景的
// 视图在测试环境挂载时，WebGLRenderer 初始化会调 getExtension / getParameter / … 等大量 API。
// 这里对任何未知属性返回 no-op，关键查询返回合理默认值，让渲染器成功初始化而不抛
// "gl.getExtension is not a function"（仅补齐环境缺失，不掩盖真实逻辑错误）。
function createWebGLStub(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const noop = () => undefined
  const handler: ProxyHandler<WebGL2RenderingContext> = {
    get(_t: unknown, prop: string | symbol): any {
      if (typeof prop === 'symbol') return undefined
      switch (prop) {
        case 'canvas': return canvas
        case 'drawingBufferWidth': return canvas.width || 1
        case 'drawingBufferHeight': return canvas.height || 1
        case 'VERSION': return 0x1f02
        case 'SHADING_LANGUAGE_VERSION': return 0x8b8c
        case 'getContextAttributes': return () => ({ alpha: true, depth: true, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false })
        case 'getParameter': return (p: number) => (p === 0x1f02 ? 'WebGL 2.0' : p === 0x8b8c ? 'WebGL GLSL ES 3.00' : 4096)
        case 'getExtension': return () => null
        case 'getSupportedExtensions': return () => []
        case 'getShaderPrecisionFormat': return () => ({ precision: 23, rangeMin: 127, rangeMax: 127 })
        case 'getShaderParameter': return () => true
        case 'getProgramParameter': return () => true
        case 'getProgramInfoLog': return () => ''
        case 'getShaderInfoLog': return () => ''
        case 'getError': return () => 0
        case 'checkFramebufferStatus': return () => 0x8cd5 // FRAMEBUFFER_COMPLETE
        case 'FRAMEBUFFER_COMPLETE': return 0x8cd5
        case 'NO_ERROR': return 0
        case 'NONE': return 0
        case 'getActiveUniform':
        case 'getActiveAttrib': return () => ({ name: 'attr', size: 1, type: 0 })
        case 'getUniformLocation': return () => ({})
        case 'getAttribLocation': return () => 0
        case 'getUniformBlockIndex': return () => 0
        case 'createBuffer':
        case 'createFramebuffer':
        case 'createRenderbuffer':
        case 'createTexture':
        case 'createProgram':
        case 'createShader':
        case 'createVertexArray':
        case 'fenceSync': return () => ({})
        default: return noop
      }
    },
    getPrototypeOf() {
      return typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype : Object.prototype
    },
  }
  return new Proxy({} as WebGL2RenderingContext, handler) as unknown as WebGL2RenderingContext
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
      return createWebGLStub(document.createElement('canvas'))
    }
    return ctxStub
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext
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
