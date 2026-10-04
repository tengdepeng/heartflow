// ============================================================
// 触角 · 垂直跑马灯（Vertical Marquee）
// ------------------------------------------------------------
// 借鉴「96 APK」知源中医 anim `vertical_marquee_in` / `vertical_marquee_out`
// （公告位的纵向滚动轮播）：一组文案按固定节奏逐条纵向滑入。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:vertical_marquee。
// 落点：殿堂触角 Touchpoints.vue（公告轮播）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:vertical_marquee'

export const MIN_INTERVAL_MS = 1000
export const MAX_INTERVAL_MS = 8000
export const MAX_ITEMS = 20

export type MarqueeDirection = 'up' | 'down'

export const DEFAULT_MARQUEE_ITEMS = [
  '心流工坊 · 专注每一刻',
  '今日宜：整理书桌，清空缓存',
  '守则：不连续签到，也不施惩罚',
  '幕僚提醒：喝水，起身走动',
]

export interface VerticalMarqueeState {
  items: string[]
  intervalMs: number
  direction: MarqueeDirection
  paused: boolean
}

export const DEFAULT_MARQUEE: VerticalMarqueeState = {
  items: [...DEFAULT_MARQUEE_ITEMS],
  intervalMs: 3000,
  direction: 'up',
  paused: false,
}

const state = ref<VerticalMarqueeState>({
  ...DEFAULT_MARQUEE,
  items: [...DEFAULT_MARQUEE_ITEMS],
})

function clampInterval(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_MARQUEE.intervalMs
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, Math.round(ms)))
}

function load(): void {
  try {
    const saved = storage.getKV<VerticalMarqueeState | null>(STORAGE_KEY, null)
    if (saved && Array.isArray(saved.items)) {
      state.value = {
        items: saved.items
          .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
          .map((i) => i.trim())
          .slice(0, MAX_ITEMS),
        intervalMs: clampInterval(saved.intervalMs),
        direction: saved.direction === 'down' ? 'down' : 'up',
        paused: Boolean(saved.paused),
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

export function reloadMarquee(): void {
  load()
}

export function useVerticalMarquee() {
  const items = computed(() => state.value.items)
  const intervalMs = computed(() => state.value.intervalMs)
  const direction = computed(() => state.value.direction)
  const paused = computed(() => state.value.paused)
  const canAdd = computed(() => state.value.items.length < MAX_ITEMS)

  function addItem(text: string): boolean {
    const t = text.trim()
    if (!t || state.value.items.length >= MAX_ITEMS) return false
    state.value = { ...state.value, items: [...state.value.items, t] }
    persist()
    return true
  }

  function removeItem(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= state.value.items.length) return false
    state.value = { ...state.value, items: state.value.items.filter((_, i) => i !== index) }
    persist()
    return true
  }

  function setIntervalMs(ms: number): number {
    const v = clampInterval(ms)
    state.value = { ...state.value, intervalMs: v }
    persist()
    return v
  }

  function setDirection(dir: MarqueeDirection): void {
    if (dir !== 'up' && dir !== 'down') return
    state.value = { ...state.value, direction: dir }
    persist()
  }

  function togglePause(): boolean {
    state.value = { ...state.value, paused: !state.value.paused }
    persist()
    return state.value.paused
  }

  function reset(): void {
    state.value = { ...DEFAULT_MARQUEE, items: [...DEFAULT_MARQUEE_ITEMS] }
    persist()
  }

  return {
    items,
    intervalMs,
    direction,
    paused,
    canAdd,
    addItem,
    removeItem,
    setIntervalMs,
    setDirection,
    togglePause,
    reset,
  }
}
