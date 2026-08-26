// ============================================================
// 浮层控件坐标：相对比例 + 锚边 存储，渲染时按 safe-area clamp
// 用户可拖控件坐标一律存 FloatPos，跨端/旋转不丢、不被状态栏/手势条吞没
// ============================================================

/** 锚边：坐标相对哪条边表达（free = 相对左上角自由放置） */
export type FloatAnchor = 'br' | 'bl' | 'tr' | 'tl' | 'free'

/** 相对坐标（跨端稳定，不随分辨率拉伸） */
export interface FloatPos {
  rx: number
  ry: number
  anchor: FloatAnchor
}

/** 安全区插入（px），对应 CSS env(safe-area-inset-*) */
export interface SafeArea {
  l: number
  t: number
  r: number
  b: number
}

export const ZERO_SAFE: SafeArea = { l: 0, t: 0, r: 0, b: 0 }

function clamp(v: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2
  return Math.min(Math.max(v, min), max)
}

/**
 * 绝对像素（控件中心）-> 相对比例（按锚边）
 * x/y 为控件中心相对视口左上角的绝对像素
 */
export function pxToFloatPos(
  x: number,
  y: number,
  anchor: FloatAnchor,
  vw: number,
  vh: number,
): FloatPos {
  const rxLeft = x / vw
  const ryTop = y / vh
  const rxRight = (vw - x) / vw
  const ryBottom = (vh - y) / vh
  switch (anchor) {
    case 'br':
      return { rx: rxRight, ry: ryBottom, anchor }
    case 'bl':
      return { rx: rxLeft, ry: ryBottom, anchor }
    case 'tr':
      return { rx: rxRight, ry: ryTop, anchor }
    case 'tl':
    case 'free':
    default:
      return { rx: rxLeft, ry: ryTop, anchor }
  }
}

/**
 * 相对比例 + 锚边 + safe-area -> 夹紧后的绝对像素（控件中心）
 * size = 控件自身尺寸 {w,h}；safe = 安全区（px）
 * 返回值保证中心落在安全区内，跨端不丢、不被状态栏/手势条吞没
 */
export function floatPosToPx(
  pos: FloatPos,
  size: { w: number; h: number },
  safe: SafeArea,
  vw: number,
  vh: number,
): { x: number; y: number } {
  const { rx, ry, anchor } = pos
  let cx: number
  let cy: number
  switch (anchor) {
    case 'br':
      cx = vw - rx * vw
      cy = vh - ry * vh
      break
    case 'bl':
      cx = rx * vw
      cy = vh - ry * vh
      break
    case 'tr':
      cx = vw - rx * vw
      cy = ry * vh
      break
    case 'tl':
    case 'free':
    default:
      cx = rx * vw
      cy = ry * vh
      break
  }
  const minX = safe.l + size.w / 2
  const maxX = vw - safe.r - size.w / 2
  const minY = safe.t + size.h / 2
  const maxY = vh - safe.b - size.h / 2
  return {
    x: clamp(cx, minX, maxX),
    y: clamp(cy, minY, maxY),
  }
}
