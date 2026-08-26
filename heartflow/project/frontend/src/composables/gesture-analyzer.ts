// ============================================================
// 手势轨迹分析 · 纯函数模块
// 从 useGesture 中提取，无 DOM / Vue 依赖，可独立测试
// ============================================================

import type { GestureType, TrajectoryPoint } from '../modules/gesture/types'

/** 分析轨迹形状，返回识别的手势类型 */
export function analyzeTrajectory(
  points: TrajectoryPoint[],
  start: TrajectoryPoint,
  end: TrajectoryPoint,
  minDist: number,
): GestureType | null {
  if (points.length < 4) return null

  // 交叉判定（画叉）：路径两次穿过自身
  if (detectCross(points)) return 'cross'

  // 闭环判定（画圈）：起点和终点很近
  const distStartEnd = Math.hypot(end.x - start.x, end.y - start.y)
  if (distStartEnd < minDist * 3 && points.length > 10) {
    const dir = detectCircleDirection(points)
    return dir === 'cw' ? 'circle-cw' : 'circle-ccw'
  }

  // 波浪线判定：y 方向多次变化符号
  if (detectWave(points, minDist)) return 'wave'

  // 水平滑动
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > minDist * 3) {
    return dx > 0 ? 'horizontal-swipe-right' : 'horizontal-swipe-left'
  }

  return null
}

/** 检测路径是否自相交（画叉） */
export function detectCross(points: TrajectoryPoint[]): boolean {
  if (points.length < 10) return false
  const n = points.length
  const step = Math.max(1, Math.floor(n / 8))
  for (let i = step; i < n - step; i += step) {
    for (let j = i + step * 2; j < n - 1; j += step) {
      if (segmentsIntersect(points[i], points[i + 1] ?? points[i], points[j], points[j + 1] ?? points[j])) {
        return true
      }
    }
  }
  return false
}

/** 线段相交检测 */
export function segmentsIntersect(
  a: TrajectoryPoint,
  b: TrajectoryPoint,
  c: TrajectoryPoint,
  d: TrajectoryPoint,
): boolean {
  const d1 = crossProduct(c, d, a)
  const d2 = crossProduct(c, d, b)
  const d3 = crossProduct(a, b, c)
  const d4 = crossProduct(a, b, d)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  return false
}

/** 叉积计算 */
export function crossProduct(a: TrajectoryPoint, b: TrajectoryPoint, c: TrajectoryPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** 检测画圈方向（简化：计算总角度变化） */
export function detectCircleDirection(points: TrajectoryPoint[]): 'cw' | 'ccw' {
  let totalAngle = 0
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length

  for (let i = 1; i < points.length; i++) {
    const a1 = Math.atan2(points[i - 1].y - cy, points[i - 1].x - cx)
    const a2 = Math.atan2(points[i].y - cy, points[i].x - cx)
    let diff = a2 - a1
    if (diff > Math.PI) diff -= 2 * Math.PI
    if (diff < -Math.PI) diff += 2 * Math.PI
    totalAngle += diff
  }

  return totalAngle > 0 ? 'cw' : 'ccw'
}

/** 检测波浪线：y 方向变化多次 */
export function detectWave(points: TrajectoryPoint[], _minDist: number): boolean {
  if (points.length < 15) return false
  let directionChanges = 0
  let prevDy = 0
  for (let i = 5; i < points.length; i += 3) {
    const dy = points[i].y - points[i - 5].y
    if (Math.abs(dy) > 5 && prevDy !== 0 && Math.sign(dy) !== Math.sign(prevDy)) {
      directionChanges++
    }
    if (Math.abs(dy) > 3) prevDy = dy
  }
  return directionChanges >= 2
}