// ============================================================
// 守护室 · 护眼模式（蓝光过滤 / 灰度 / 亮度遮罩）
// ------------------------------------------------------------
// 借鉴「第10类·安全护眼音乐白噪音」中的「夜间模式 / 暮光」：
// 多重护眼叠加、超低亮度遮罩、灰度模式、预设组合。
// 全部本地计算、零网络依赖，守宪法第1条本地私有。
// 滤镜作用于 document.documentElement，全应用生效。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export interface EyeCareState {
  enabled: boolean
  /** 蓝光过滤强度 0-100（sepia 暖色） */
  blueLight: number
  /** 灰度模式 0-100 */
  grayscale: number
  /** 亮度遮罩 0-80（半透明黑色遮罩不透明度） */
  brightness: number
}

export interface EyePreset {
  id: string
  label: string
  icon: string
  blueLight: number
  grayscale: number
  brightness: number
}

export const EYE_PRESETS: EyePreset[] = [
  { id: 'night', label: '柔和夜间', icon: '🌙', blueLight: 45, grayscale: 0, brightness: 25 },
  { id: 'extreme', label: '极致护眼', icon: '🕯', blueLight: 70, grayscale: 0, brightness: 45 },
  { id: 'focus', label: '灰度专注', icon: '🎯', blueLight: 0, grayscale: 100, brightness: 0 },
]

const EYE_KEY = 'hf:eye_care'

// ---- 模块级单例 ref ----
const enabled = ref(false)
const blueLight = ref(0)
const grayscale = ref(0)
const brightness = ref(0)

// 亮度遮罩层 DOM（模块级单例，避免重复创建）
let overlayEl: HTMLDivElement | null = null

function ensureOverlay(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null
  if (!overlayEl) {
    overlayEl = document.createElement('div')
    overlayEl.id = 'hf-eye-care-overlay'
    overlayEl.style.cssText = [
      'position: fixed',
      'inset: 0',
      'pointer-events: none',
      'z-index: 2147483647',
      'transition: background 0.3s ease',
    ].join(';')
    document.body.appendChild(overlayEl)
  }
  return overlayEl
}

function applyFilter() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const active = enabled.value && (blueLight.value > 0 || grayscale.value > 0)
  root.style.filter = active
    ? `sepia(${blueLight.value / 100}) grayscale(${grayscale.value / 100})`
    : ''
  const overlay = ensureOverlay()
  if (overlay) {
    const show = enabled.value && brightness.value > 0
    overlay.style.background = show ? `rgba(0, 0, 0, ${brightness.value / 100})` : 'rgba(0, 0, 0, 0)'
    overlay.style.display = show ? 'block' : 'none'
  }
}

function save() {
  storage.setKV(EYE_KEY, {
    enabled: enabled.value,
    blueLight: blueLight.value,
    grayscale: grayscale.value,
    brightness: brightness.value,
  } satisfies EyeCareState)
}

function load() {
  try {
    const s = storage.getKV<EyeCareState | null>(EYE_KEY, null)
    if (s) {
      enabled.value = !!s.enabled
      blueLight.value = s.blueLight ?? 0
      grayscale.value = s.grayscale ?? 0
      brightness.value = s.brightness ?? 0
    }
  } catch {
    /* 默认关闭 */
  }
  applyFilter()
}

function toggleEnabled() {
  enabled.value = !enabled.value
  save()
  applyFilter()
}

function setBlueLight(v: number) {
  blueLight.value = v
  save()
  applyFilter()
}

function setGrayscale(v: number) {
  grayscale.value = v
  save()
  applyFilter()
}

function setBrightness(v: number) {
  brightness.value = v
  save()
  applyFilter()
}

function applyPreset(id: string) {
  const p = EYE_PRESETS.find(x => x.id === id)
  if (!p) return
  enabled.value = true
  blueLight.value = p.blueLight
  grayscale.value = p.grayscale
  brightness.value = p.brightness
  save()
  applyFilter()
}

function reset() {
  enabled.value = false
  blueLight.value = 0
  grayscale.value = 0
  brightness.value = 0
  save()
  applyFilter()
}

export function useEyeCare() {
  return {
    enabled,
    blueLight,
    grayscale,
    brightness,
    load,
    toggleEnabled,
    setBlueLight,
    setGrayscale,
    setBrightness,
    applyPreset,
    reset,
  }
}
