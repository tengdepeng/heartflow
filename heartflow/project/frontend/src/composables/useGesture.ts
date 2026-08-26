// ============================================================
// 手势识别引擎
// 基于 pointerdown → pointermove → pointerup 轨迹分析
// ============================================================

import { ref, watch, type Ref } from 'vue'
import type { GestureEvent, GestureType, GestureConfig, TrajectoryPoint } from '../modules/gesture/types'
import { DEFAULT_GESTURE_CONFIG } from '../modules/gesture/types'
import { analyzeTrajectory } from './gesture-analyzer'
import { useEffect } from '../modules/constitution/use-effect'

export type { GestureEvent, GestureType }

export function useGesture(
  el: Ref<HTMLElement | null>,
  onGesture: (e: GestureEvent) => void,
  opts?: Partial<GestureConfig>,
) {
  const cfg = { ...DEFAULT_GESTURE_CONFIG, ...opts }

  // A2.3 批2：手势导航受宪法「按需开启」条款门控（gesture:enable）。
  // 条款默认启用，默认行为不变；用户关闭后手势识别不绑定，回退为点按交互。
  const gestureEnabled = useEffect('gesture:enable')

  const gesture = ref<GestureType | null>(null)
  let trail: TrajectoryPoint[] = []
  let startPoint: TrajectoryPoint | null = null
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let sampleTimer: ReturnType<typeof setInterval> | null = null
  let isTracking = false
  let attached = false

  // ---- Pointer Events ----
  function onDown(e: PointerEvent) {
    const target = el.value
    if (!target) return
    const rect = target.getBoundingClientRect()
    const p: TrajectoryPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: Date.now() }
    startPoint = p
    trail = [p]
    isTracking = true

    // 长按检测
    longPressTimer = setTimeout(() => {
      if (trail.length <= 2) {
        // 没怎么移动，判定为长按
        gesture.value = 'long-press'
        onGesture({
          type: 'long-press',
          start: startPoint!,
          end: trail[trail.length - 1],
          trail: [...trail],
          originalEvent: e,
        })
        isTracking = false
        stopSampling()
        return
      }
    }, cfg.longPressThreshold)

    // 轨迹采样（指针静止时持续记录最后一个点的时间戳，用于长按判定）
    sampleTimer = setInterval(() => {
      if (!isTracking || !startPoint || trail.length === 0) return
      trail.push({ ...trail[trail.length - 1], t: Date.now() })
    }, cfg.sampleInterval)
  }

  function onMove(e: PointerEvent) {
    if (!isTracking || !startPoint) return
    const target = el.value
    if (!target) return
    const rect = target.getBoundingClientRect()
    const p: TrajectoryPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: Date.now() }
    trail.push(p)

    // 如果移动距离已足够大，取消长按计时
    if (longPressTimer && trail.length > 2) {
      const dist = Math.hypot(p.x - startPoint.x, p.y - startPoint.y)
      if (dist > cfg.minMoveDistance) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }
  }

  function onUp(e: PointerEvent) {
    if (!isTracking || !startPoint) return
    isTracking = false
    stopSampling()

    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }

    const endPoint = trail[trail.length - 1]
    const totalDist = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)

    // tap
    if (trail.length <= 2 || totalDist < cfg.minMoveDistance) {
      gesture.value = 'tap'
      onGesture({
        type: 'tap',
        start: startPoint,
        end: endPoint,
        trail: [...trail],
        originalEvent: e,
      })
      return
    }

    // 分析轨迹形状
    const recognized = analyzeTrajectory(trail, startPoint, endPoint, cfg.minMoveDistance)
    if (recognized) {
      gesture.value = recognized
      onGesture({
        type: recognized,
        start: startPoint,
        end: endPoint,
        trail: [...trail],
        originalEvent: e,
      })
    }
  }

  function stopSampling() {
    if (sampleTimer) {
      clearInterval(sampleTimer)
      sampleTimer = null
    }
  }

  // ---- 轨迹分析 (委托给 gesture-analyzer 纯函数) ----

  // ---- 绑定事件 ----
  function attach() {
    if (!gestureEnabled.active.value) return
    const target = el.value
    if (!target) return
    if (attached) return
    attached = true
    target.addEventListener('pointerdown', onDown, { passive: true })
    target.addEventListener('pointermove', onMove, { passive: true })
    target.addEventListener('pointerup', onUp, { passive: true })
    target.addEventListener('pointerleave', onUp, { passive: true })
  }

  function detach() {
    const target = el.value
    if (!target) return
    if (!attached) return
    attached = false
    target.removeEventListener('pointerdown', onDown)
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointerleave', onUp)
    stopSampling()
    if (longPressTimer) clearTimeout(longPressTimer)
  }

  // A2.3 批2：宪法「手势导航」条款（gesture:enable）运行时门控。
  // 条款默认启用 → 默认行为不变；用户关闭后响应式解绑，开启后重新绑定，
  // 与引擎初始化时序（子组件 onMounted 早于 App.vue 的 initConstitutionEffect）解耦。
  watch(
    () => gestureEnabled.active.value,
    (enabled) => {
      if (enabled) attach()
      else detach()
    },
  )

  return {
    gesture,
    attach,
    detach,
  } as UseGestureReturn
}

/** useGesture 返回值类型 */
export interface UseGestureReturn {
  /** 当前识别的实时手势类型（响应式） */
  gesture: Ref<GestureType | null>
  /** 手动绑定手势事件（传入 DOM 元素或 ref） */
  attach: () => void
  /** 解绑 */
  detach: () => void
}
