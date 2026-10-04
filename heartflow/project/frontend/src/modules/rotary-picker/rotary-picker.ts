// ============================================================
// 触角 · 滚轮旋钮选择器（Rotary Picker）
// ------------------------------------------------------------
// 借鉴「96 APK」生辰 anim widget_ipod_flow_animation（iPod 滚轮）：
// 拖拽旋钮旋转，指针角度映射到数值，带刻度与吸附步进。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:rotary_picker。
// 落点：殿堂触角 Touchpoints.vue（数值选择）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:rotary_picker'

export interface RotaryPreset {
  id: string
  label: string
  value: number
}

export interface RotaryState {
  value: number
  min: number
  max: number
  step: number
  unit: string
  presets: RotaryPreset[]
}

export const DEFAULT_ROTARY: RotaryState = {
  value: 25,
  min: 5,
  max: 120,
  step: 5,
  unit: '分钟',
  presets: [
    { id: 'rp_p1', label: '小憩', value: 15 },
    { id: 'rp_p2', label: '番茄钟', value: 25 },
    { id: 'rp_p3', label: '深度', value: 45 },
    { id: 'rp_p4', label: '长专注', value: 90 },
  ],
}

function clone(state: RotaryState): RotaryState {
  return { ...state, presets: state.presets.map((p) => ({ ...p })) }
}

function uid(): string {
  return `rp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const state = ref<RotaryState>(clone(DEFAULT_ROTARY))

function load(): void {
  try {
    const saved = storage.getKV<RotaryState | null>(STORAGE_KEY, null)
    if (saved && typeof saved.value === 'number') {
      state.value = {
        value: saved.value,
        min: saved.min ?? DEFAULT_ROTARY.min,
        max: saved.max ?? DEFAULT_ROTARY.max,
        step: saved.step ?? DEFAULT_ROTARY.step,
        unit: saved.unit ?? DEFAULT_ROTARY.unit,
        presets: Array.isArray(saved.presets)
          ? saved.presets.map((p) => ({ ...p }))
          : DEFAULT_ROTARY.presets.map((p) => ({ ...p })),
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

export function reloadRotary(): void {
  load()
}

export function useRotaryPicker() {
  const value = computed(() => state.value.value)
  const min = computed(() => state.value.min)
  const max = computed(() => state.value.max)
  const step = computed(() => state.value.step)
  const unit = computed(() => state.value.unit)
  const presets = computed(() => state.value.presets)

  /** 吸附到 step 并夹在 [min, max] 内 */
  function snap(raw: number): number {
    const { min: lo, max: hi, step: st } = state.value
    const clamped = Math.min(hi, Math.max(lo, raw))
    if (st <= 0) return Math.round(clamped)
    const snapped = Math.round((clamped - lo) / st) * st + lo
    return Math.min(hi, Math.max(lo, snapped))
  }

  function setValue(raw: number): number {
    const v = snap(raw)
    state.value = { ...state.value, value: v }
    persist()
    return v
  }

  function stepBy(delta: number): number {
    return setValue(state.value.value + delta * state.value.step)
  }

  function savePreset(label: string): RotaryPreset | null {
    const text = label.trim()
    if (!text) return null
    const preset: RotaryPreset = { id: uid(), label: text, value: state.value.value }
    state.value = { ...state.value, presets: [...state.value.presets, preset] }
    persist()
    return preset
  }

  function applyPreset(id: string): number | null {
    const preset = state.value.presets.find((p) => p.id === id)
    if (!preset) return null
    return setValue(preset.value)
  }

  function removePreset(id: string): void {
    state.value = { ...state.value, presets: state.value.presets.filter((p) => p.id !== id) }
    persist()
  }

  function reset(): void {
    state.value = clone(DEFAULT_ROTARY)
    persist()
  }

  return { value, min, max, step, unit, presets, setValue, stepBy, savePreset, applyPreset, removePreset, reset }
}
