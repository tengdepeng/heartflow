// ============================================================
// 全局 UI · 角落缩放展开转场（Corner-origin Grow / Shrink Modal）
// ------------------------------------------------------------
// 借鉴「微信读书 / 知源中医」anim：grow_from_{bottomleft,topright,...}_to_*
// 与 shrink_from_*（8 向）——弹层从「被点元素的角落」生长展开、收缩归位。
// 纯几何函数（可单测）+ 轻量持久化偏好；零网络（守宪法·本地私有）。
// 落点：殿堂触角 Touchpoints.vue（CornerTransitionPanel 演示）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:corner_transition'

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** 原点模式：auto = 跟随触发元素中心，其余为固定角落 */
export type CornerMode = 'auto' | Corner

export interface CornerTransitionState {
  /** 转场时长（ms） */
  durationMs: number
  /** 起始缩放（0-1） */
  scaleFrom: number
  /** 原点模式 */
  mode: CornerMode
}

export const MIN_DURATION = 120
export const MAX_DURATION = 600
export const MIN_SCALE = 0.02
export const MAX_SCALE = 0.6

export const DEFAULT_CORNER_TRANSITION: CornerTransitionState = {
  durationMs: 260,
  scaleFrom: 0.05,
  mode: 'auto',
}

/** 四向角落（含中文标签，供演示面板按钮与固定原点选项复用） */
export const CORNERS: { id: Corner; label: string }[] = [
  { id: 'top-left', label: '左上' },
  { id: 'top-right', label: '右上' },
  { id: 'bottom-left', label: '左下' },
  { id: 'bottom-right', label: '右下' },
]

/** 固定角落 → CSS transform-origin 百分比值 */
export function cornerOrigin(corner: Corner): string {
  switch (corner) {
    case 'top-left':
      return '0% 0%'
    case 'top-right':
      return '100% 0%'
    case 'bottom-left':
      return '0% 100%'
    default:
      return '100% 100%'
  }
}

/** 矩形抽象（DOMRect 的子集，便于单测传纯对象） */
export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

/** 触发元素中心相对容器中心的象限 → 生长原点角落 */
export function originCorner(trigger: RectLike, container: RectLike): Corner {
  const cx = trigger.left + trigger.width / 2
  const cy = trigger.top + trigger.height / 2
  const mx = container.left + container.width / 2
  const my = container.top + container.height / 2
  const vertical = cy < my ? 'top' : 'bottom'
  const horizontal = cx < mx ? 'left' : 'right'
  return `${vertical}-${horizontal}` as Corner
}

/** 触发元素中心在容器内的像素坐标（夹取到容器范围，用作 transform-origin） */
export function originPoint(trigger: RectLike, container: RectLike): { x: number; y: number } {
  const rawX = trigger.left + trigger.width / 2 - container.left
  const rawY = trigger.top + trigger.height / 2 - container.top
  return {
    x: Math.round(Math.max(0, Math.min(container.width, rawX))),
    y: Math.round(Math.max(0, Math.min(container.height, rawY))),
  }
}

/** 触发元素中心在容器内的 transform-origin CSS 值 */
export function originStyle(trigger: RectLike, container: RectLike): string {
  const p = originPoint(trigger, container)
  return `${p.x}px ${p.y}px`
}

/** 纯函数：夹取时长 */
export function clampDuration(n: number, fallback = DEFAULT_CORNER_TRANSITION.durationMs): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(n)))
}

/** 纯函数：夹取起始缩放 */
export function clampScale(n: number, fallback = DEFAULT_CORNER_TRANSITION.scaleFrom): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(n * 100) / 100))
}

function isCorner(v: unknown): v is Corner {
  return v === 'top-left' || v === 'top-right' || v === 'bottom-left' || v === 'bottom-right'
}

function normalizeMode(v: unknown, fallback: CornerMode): CornerMode {
  if (v === 'auto' || isCorner(v)) return v
  return fallback
}

const state = ref<CornerTransitionState>({ ...DEFAULT_CORNER_TRANSITION })

function load(): void {
  try {
    const saved = storage.getKV<Partial<CornerTransitionState> | null>(STORAGE_KEY, null)
    if (saved) {
      state.value = {
        durationMs: clampDuration(saved.durationMs ?? DEFAULT_CORNER_TRANSITION.durationMs),
        scaleFrom: clampScale(saved.scaleFrom ?? DEFAULT_CORNER_TRANSITION.scaleFrom),
        mode: normalizeMode(saved.mode, DEFAULT_CORNER_TRANSITION.mode),
      }
    } else {
      state.value = { ...DEFAULT_CORNER_TRANSITION }
    }
  } catch {
    state.value = { ...DEFAULT_CORNER_TRANSITION }
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadCornerTransition(): void {
  load()
}

export function useCornerTransition() {
  const durationMs = computed(() => state.value.durationMs)
  const scaleFrom = computed(() => state.value.scaleFrom)
  const mode = computed(() => state.value.mode)

  function setDuration(n: number): number {
    state.value = { ...state.value, durationMs: clampDuration(n, state.value.durationMs) }
    persist()
    return state.value.durationMs
  }

  function setScaleFrom(n: number): number {
    state.value = { ...state.value, scaleFrom: clampScale(n, state.value.scaleFrom) }
    persist()
    return state.value.scaleFrom
  }

  function setMode(m: CornerMode): CornerMode {
    state.value = { ...state.value, mode: normalizeMode(m, state.value.mode) }
    persist()
    return state.value.mode
  }

  function reset(): void {
    state.value = { ...DEFAULT_CORNER_TRANSITION }
    persist()
  }

  return { durationMs, scaleFrom, mode, setDuration, setScaleFrom, setMode, reset }
}
