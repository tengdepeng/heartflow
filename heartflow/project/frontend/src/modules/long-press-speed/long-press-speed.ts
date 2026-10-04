// ============================================================
// 阅览 · 长按变速（Long-press to Accelerate）
// ------------------------------------------------------------
// 借鉴「96 APK」识典古籍 drawable `familiar_long_press_speed_*`
// （长按内容区加速 + 涟漪 + 2x 引导）：按住内容区时速度由基准
// 线性爬升至「按住倍速」，松手回落。纯本地、零网络（守宪法·
// 本地私有）；状态存 hf:long_press_speed。
// 落点：阅览殿 ReadingHall.vue（触角可作交互范式展示）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:long_press_speed'

export const MIN_BASE_SPEED = 0.5
export const MAX_BASE_SPEED = 2
export const MIN_HOLD_SPEED = 1
export const MAX_HOLD_SPEED = 4
export const MIN_RAMP_MS = 150
export const MAX_RAMP_MS = 2000

export interface LongPressSpeedState {
  enabled: boolean
  baseSpeed: number
  holdSpeed: number
  rampMs: number
  ripple: boolean
}

export const DEFAULT_LONG_PRESS_SPEED: LongPressSpeedState = {
  enabled: true,
  baseSpeed: 1,
  holdSpeed: 2,
  rampMs: 600,
  ripple: true,
}

const state = ref<LongPressSpeedState>({ ...DEFAULT_LONG_PRESS_SPEED })

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100))
}

function load(): void {
  try {
    const saved = storage.getKV<LongPressSpeedState | null>(STORAGE_KEY, null)
    if (saved && typeof saved === 'object') {
      state.value = {
        enabled: saved.enabled !== false,
        baseSpeed: clamp(Number(saved.baseSpeed), MIN_BASE_SPEED, MAX_BASE_SPEED, DEFAULT_LONG_PRESS_SPEED.baseSpeed),
        holdSpeed: clamp(Number(saved.holdSpeed), MIN_HOLD_SPEED, MAX_HOLD_SPEED, DEFAULT_LONG_PRESS_SPEED.holdSpeed),
        rampMs: clamp(Number(saved.rampMs), MIN_RAMP_MS, MAX_RAMP_MS, DEFAULT_LONG_PRESS_SPEED.rampMs),
        ripple: saved.ripple !== false,
      }
    }
  } catch {
    /* 存储不可用时回落默认 */
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadLongPressSpeed(): void {
  load()
}

/** 长按已持续 elapsedMs 时的实时倍速（基准→按住倍速线性爬升，夹取）。 */
export function computeSpeed(elapsedMs: number, s: LongPressSpeedState): number {
  if (!s.enabled) return s.baseSpeed
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return s.baseSpeed
  const p = Math.min(1, elapsedMs / s.rampMs)
  const v = s.baseSpeed + (s.holdSpeed - s.baseSpeed) * p
  return Math.round(v * 100) / 100
}

/** 爬升进度 0~1（用于涟漪/进度反馈）。 */
export function computeProgress(elapsedMs: number, s: LongPressSpeedState): number {
  if (!s.enabled || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0
  return Math.round(Math.min(1, elapsedMs / s.rampMs) * 100) / 100
}

export function useLongPressSpeed() {
  const enabled = computed(() => state.value.enabled)
  const baseSpeed = computed(() => state.value.baseSpeed)
  const holdSpeed = computed(() => state.value.holdSpeed)
  const rampMs = computed(() => state.value.rampMs)
  const ripple = computed(() => state.value.ripple)

  function setEnabled(v: boolean): void {
    state.value = { ...state.value, enabled: Boolean(v) }
    persist()
  }

  function setBaseSpeed(v: number): number {
    const next = clamp(v, MIN_BASE_SPEED, MAX_BASE_SPEED, state.value.baseSpeed)
    state.value = { ...state.value, baseSpeed: next }
    persist()
    return next
  }

  function setHoldSpeed(v: number): number {
    const next = clamp(v, MIN_HOLD_SPEED, MAX_HOLD_SPEED, state.value.holdSpeed)
    state.value = { ...state.value, holdSpeed: next }
    persist()
    return next
  }

  function setRampMs(v: number): number {
    const next = clamp(v, MIN_RAMP_MS, MAX_RAMP_MS, state.value.rampMs)
    state.value = { ...state.value, rampMs: next }
    persist()
    return next
  }

  function toggleRipple(): boolean {
    state.value = { ...state.value, ripple: !state.value.ripple }
    persist()
    return state.value.ripple
  }

  function reset(): void {
    state.value = { ...DEFAULT_LONG_PRESS_SPEED }
    persist()
  }

  return {
    enabled,
    baseSpeed,
    holdSpeed,
    rampMs,
    ripple,
    setEnabled,
    setBaseSpeed,
    setHoldSpeed,
    setRampMs,
    toggleRipple,
    reset,
  }
}
