// ============================================================
// 触角 · 组件自定义点击热区（Widget Custom Click Hotzones）
// ------------------------------------------------------------
// 借鉴「96 APK」组件岛 array `dynamic_custom_click_view_ids` /
// `dynamic_custom_legacy_click_layouts`（自定义可点击视图与布局）：
// 为触角组件定义「区域内可点击热区」（百分比坐标 + 尺寸 + 动作）。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:widget_hotzone。
// 落点：殿堂触角 Touchpoints.vue。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:widget_hotzone'

export const MAX_HOTZONES = 8
export const MIN_ZONE_SIZE = 6

export interface Hotzone {
  id: string
  label: string
  action: string
  x: number
  y: number
  w: number
  h: number
}

export const DEFAULT_HOTZONES: Hotzone[] = [
  { id: 'hz-1', label: '左上·专注', action: 'startFocus', x: 6, y: 6, w: 34, h: 34 },
  { id: 'hz-2', label: '右下·速记', action: 'quickNote', x: 58, y: 58, w: 34, h: 34 },
]

export interface WidgetHotzoneState {
  zones: Hotzone[]
}

const state = ref<WidgetHotzoneState>({ zones: DEFAULT_HOTZONES.map((z) => ({ ...z })) })

let seq = DEFAULT_HOTZONES.length

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

function clampSize(n: number): number {
  if (!Number.isFinite(n)) return MIN_ZONE_SIZE
  return Math.min(100, Math.max(MIN_ZONE_SIZE, Math.round(n)))
}

function sanitizeZone(raw: Partial<Hotzone>): Hotzone | null {
  if (!raw || typeof raw !== 'object') return null
  const x = clampPct(Number(raw.x))
  const y = clampPct(Number(raw.y))
  const w = clampSize(Number(raw.w))
  const h = clampSize(Number(raw.h))
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `hz-${++seq}`,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : '未命名热区',
    action: typeof raw.action === 'string' && raw.action.trim() ? raw.action.trim() : 'none',
    x: Math.min(x, 100 - w),
    y: Math.min(y, 100 - h),
    w,
    h,
  }
}

function load(): void {
  try {
    const saved = storage.getKV<WidgetHotzoneState | null>(STORAGE_KEY, null)
    if (saved && Array.isArray(saved.zones)) {
      const zones = saved.zones
        .map((z) => sanitizeZone(z))
        .filter((z): z is Hotzone => z !== null)
        .slice(0, MAX_HOTZONES)
      if (zones.length > 0) {
        state.value = { zones }
        return
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

export function reloadWidgetHotzone(): void {
  load()
}

export function useWidgetHotzone() {
  const zones = computed(() => state.value.zones)
  const canAdd = computed(() => state.value.zones.length < MAX_HOTZONES)

  function addZone(): string | null {
    if (state.value.zones.length >= MAX_HOTZONES) return null
    const id = `hz-${++seq}`
    const zone: Hotzone = { id, label: `热区 ${state.value.zones.length + 1}`, action: 'none', x: 20, y: 20, w: 30, h: 30 }
    state.value = { zones: [...state.value.zones, zone] }
    persist()
    return id
  }

  function removeZone(id: string): boolean {
    const next = state.value.zones.filter((z) => z.id !== id)
    if (next.length === state.value.zones.length) return false
    state.value = { zones: next }
    persist()
    return true
  }

  function updateZone(id: string, patch: Partial<Omit<Hotzone, 'id'>>): boolean {
    let found = false
    const zones = state.value.zones.map((z) => {
      if (z.id !== id) return z
      found = true
      const merged = { ...z, ...patch, id: z.id }
      return (
        sanitizeZone(merged) ?? z
      )
    })
    if (!found) return false
    state.value = { zones }
    persist()
    return true
  }

  function moveZone(id: string, x: number, y: number): boolean {
    return updateZone(id, { x, y })
  }

  function resizeZone(id: string, w: number, h: number): boolean {
    return updateZone(id, { w, h })
  }

  function clearAll(): void {
    state.value = { zones: [] }
    persist()
  }

  function reset(): void {
    state.value = { zones: DEFAULT_HOTZONES.map((z) => ({ ...z })) }
    persist()
  }

  return { zones, canAdd, addZone, removeZone, updateZone, moveZone, resizeZone, clearAll, reset }
}
