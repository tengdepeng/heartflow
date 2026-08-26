// ============================================================
// 手势识别 · 引擎
// ============================================================

import { ref, type Ref, onMounted, onUnmounted } from 'vue'
import type {
  GestureType,
  TrajectoryPoint,
  GestureEvent,
  GestureConfig,
} from './types'
import { DEFAULT_GESTURE_CONFIG } from './types'

export type { GestureType, TrajectoryPoint, GestureEvent, GestureConfig }
export { DEFAULT_GESTURE_CONFIG } from './types'

// ---- 手势类型常量 ----

/** 各手势的最少轨迹点数 */
const MIN_POINTS: Record<string, number> = {
  tap: 2,
  'long-press': 5,
  'circle-cw': 20,
  'circle-ccw': 20,
  cross: 6,
  wave: 10,
  'horizontal-swipe-left': 5,
  'horizontal-swipe-right': 5,
}

// ---- 轨迹分析 ----

interface AnalyzedTrajectory {
  /** 总移动距离 */
  totalDist: number
  /** 起止直线距离 */
  straightDist: number
  /** 直线度 (0~1), 1=完全直线 */
  straightness: number
  /** X轴总位移 */
  dx: number
  /** Y轴总位移 */
  dy: number
  /** 方向变化次数 */
  directionChanges: number
  /** 平均速度 px/ms */
  avgSpeed: number
  /** 是否形成闭环 */
  isClosed: boolean
  /** 旋转方向: 1=cw, -1=ccw, 0=无 */
  rotationDir: number
  /** 总时长 ms */
  duration: number
}

function analyzeTrajectory(points: TrajectoryPoint[]): AnalyzedTrajectory {
  if (points.length < 2) {
    return {
      totalDist: 0, straightDist: 0, straightness: 1,
      dx: 0, dy: 0, directionChanges: 0, avgSpeed: 0,
      isClosed: false, rotationDir: 0, duration: 0,
    }
  }

  const first = points[0]
  const last = points[points.length - 1]
  const dx = last.x - first.x
  const dy = last.y - first.y
  const straightDist = Math.sqrt(dx * dx + dy * dy)

  // 总移动距离
  let totalDist = 0
  for (let i = 1; i < points.length; i++) {
    totalDist += Math.sqrt(
      (points[i].x - points[i - 1].x) ** 2 +
      (points[i].y - points[i - 1].y) ** 2,
    )
  }

  // 直线度
  const straightness = totalDist > 0 ? straightDist / totalDist : 1

  // 方向变化次数（基于 X 轴方向翻转）
  let dirChanges = 0
  let lastDir: 'l' | 'r' | null = null
  for (let i = 1; i < points.length; i++) {
    const d = points[i].x - points[i - 1].x
    const dir = d > 0 ? 'r' : d < 0 ? 'l' : null
    if (dir && lastDir && dir !== lastDir) dirChanges++
    if (dir) lastDir = dir
  }

  // 平均速度
  const duration = last.t - first.t
  const avgSpeed = duration > 0 ? totalDist / duration : 0

  // 闭环检测：起止距离 < 总距离的 15%
  const isClosed = totalDist > 0 && straightDist / totalDist < 0.15

  // 旋转方向：计算叉积和
  let crossSum = 0
  for (let i = 1; i < points.length; i++) {
    crossSum +=
      (points[i].x - points[i - 1].x) * (points[i].y + points[i - 1].y)
  }
  const rotationDir = Math.abs(crossSum) > totalDist * 2
    ? (crossSum > 0 ? 1 : -1)
    : 0

  return {
    totalDist, straightDist, straightness,
    dx, dy, directionChanges: dirChanges,
    avgSpeed, isClosed, rotationDir, duration,
  }
}

// ---- 手势分类 ----

function classifyGesture(
  points: TrajectoryPoint[],
  analysis: AnalyzedTrajectory,
  elapsed: number,
  config: GestureConfig,
): GestureType | null {
  const count = points.length

  // Tap: 极小移动
  if (analysis.totalDist < config.minMoveDistance * 2 && elapsed < config.longPressThreshold) {
    return 'tap'
  }

  // Long press: 极小移动 + 长时
  if (analysis.totalDist < config.minMoveDistance * 2 && elapsed >= config.longPressThreshold) {
    return 'long-press'
  }

  if (count < 5) return null

  // 水平滑动
  const absDx = Math.abs(analysis.dx)
  const absDy = Math.abs(analysis.dy)
  if (absDx > absDy * 2 && absDx > config.minMoveDistance * 3) {
    return analysis.dx > 0 ? 'horizontal-swipe-right' : 'horizontal-swipe-left'
  }

  // 波浪 (多次 Y 轴方向变化)
  if (analysis.directionChanges >= 4 && analysis.straightness > 0.6) {
    return 'wave'
  }

  // 画叉 (两次明显的方向变化 + 中高直线度)
  if (analysis.directionChanges >= 2 && analysis.straightness > 0.7 && absDx > config.minMoveDistance * 2 && absDy > config.minMoveDistance * 2) {
    return 'cross'
  }

  // 圆圈 (闭环 + 旋转方向)
  if (analysis.isClosed && analysis.rotationDir !== 0 && count >= MIN_POINTS['circle-cw']) {
    return analysis.rotationDir > 0 ? 'circle-cw' : 'circle-ccw'
  }

  return null
}

// ---- 导出引擎 ----

export function useGesture(opts?: {
  config?: Partial<GestureConfig>
  onGesture?: (event: GestureEvent) => void
  target?: Ref<HTMLElement | null>
}) {
  const cfg = { ...DEFAULT_GESTURE_CONFIG, ...opts?.config }
  const lastGesture = ref<GestureEvent | null>(null)

  let points: TrajectoryPoint[] = []
  let pointerId: number | null = null
  let startTime = 0

  function onPointerDown(e: PointerEvent) {
    if (pointerId !== null) return
    pointerId = e.pointerId
    startTime = Date.now()
    points = [{ x: e.clientX, y: e.clientY, t: startTime }]
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    const now = Date.now()
    const last = points[points.length - 1]
    if (now - last.t < cfg.sampleInterval) return
    points.push({ x: e.clientX, y: e.clientY, t: now })
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    pointerId = null
    const elapsed = Date.now() - startTime

    if (points.length < 2) {
      lastGesture.value = null
      return
    }

    const analysis = analyzeTrajectory(points)
    const type = classifyGesture(points, analysis, elapsed, cfg)

    if (type) {
      const gesture: GestureEvent = {
        type,
        start: points[0],
        end: points[points.length - 1],
        trail: points,
        originalEvent: e,
      }
      lastGesture.value = gesture
      opts?.onGesture?.(gesture)
    }
  }

  function bind(el: HTMLElement) {
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointerleave', (e: PointerEvent) => {
      if (e.pointerId === pointerId) pointerId = null
    })
  }

  function unbind(el: HTMLElement) {
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
  }

  // 生命周期自动绑定
  onMounted(() => {
    const el = opts?.target?.value
    if (el) bind(el)
  })

  onUnmounted(() => {
    const el = opts?.target?.value
    if (el) unbind(el)
  })

  return {
    /** 最近一次识别到的手势 */
    lastGesture,
    /** 手动绑定到元素 */
    bind,
    /** 解绑 */
    unbind,
  }
}
