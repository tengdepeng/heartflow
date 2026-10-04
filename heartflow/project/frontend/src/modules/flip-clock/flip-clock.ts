// ============================================================
// 触角 · 翻页数字时钟（Flip / Tick Clock）
// ------------------------------------------------------------
// 借鉴「96 APK」生辰 anim `widget_digital_clock_tick_animation` +
// drawable `app_widget_bg_flip_time`（翻页式数字时钟组件）：
// 时分秒以「翻页卡片」呈现，数字变化时卡片翻动。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:flip_clock。
// 落点：殿堂触角 Touchpoints.vue（时钟组件）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:flip_clock'

export type ClockFormat = '24h' | '12h'

export interface FlipClockState {
  format: ClockFormat
  showSeconds: boolean
  showDate: boolean
}

export const DEFAULT_FLIP_CLOCK: FlipClockState = {
  format: '24h',
  showSeconds: true,
  showDate: true,
}

const state = ref<FlipClockState>({ ...DEFAULT_FLIP_CLOCK })

function load(): void {
  try {
    const saved = storage.getKV<FlipClockState | null>(STORAGE_KEY, null)
    if (saved) {
      state.value = {
        format: saved.format === '12h' ? '12h' : '24h',
        showSeconds: saved.showSeconds ?? true,
        showDate: saved.showDate ?? true,
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

export function reloadFlipClock(): void {
  load()
}

export interface ClockParts {
  hh: string
  mm: string
  ss: string
  meridiem: string
}

/** 纯函数：按显示偏好把 Date 拆成补零的时分秒与上下午 */
export function formatClock(date: Date, s: FlipClockState): ClockParts {
  let h = date.getHours()
  const meridiem = h < 12 ? 'AM' : 'PM'
  if (s.format === '12h') {
    h = h % 12
    if (h === 0) h = 12
  }
  const p = (n: number) => String(n).padStart(2, '0')
  return { hh: p(h), mm: p(date.getMinutes()), ss: p(date.getSeconds()), meridiem }
}

export function useFlipClock() {
  const format = computed(() => state.value.format)
  const showSeconds = computed(() => state.value.showSeconds)
  const showDate = computed(() => state.value.showDate)

  function setFormat(f: ClockFormat): void {
    if (f !== '24h' && f !== '12h') return
    state.value = { ...state.value, format: f }
    persist()
  }

  function toggleSeconds(): boolean {
    state.value = { ...state.value, showSeconds: !state.value.showSeconds }
    persist()
    return state.value.showSeconds
  }

  function toggleDate(): boolean {
    state.value = { ...state.value, showDate: !state.value.showDate }
    persist()
    return state.value.showDate
  }

  function reset(): void {
    state.value = { ...DEFAULT_FLIP_CLOCK }
    persist()
  }

  return { format, showSeconds, showDate, setFormat, toggleSeconds, toggleDate, reset }
}
