// ============================================================
// 触角 · 组件款式 / 皮肤矩阵（Widget Style Variants）
// ------------------------------------------------------------
// 借鉴「96 APK」组件岛 assets/*/choice_style/info.json
// （同一组件提供多套外观款式可选）：为触角各桌面组件提供
// 「每组件多款式」维度。纯本地、零网络（守宪法·本地私有）；
// 状态存 hf:widget_style。
// 落点：殿堂触角 Touchpoints.vue。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:widget_style'

export interface StyleVariant {
  id: string
  label: string
  desc: string
  radius: number
  shadow: boolean
  pixel: boolean
}

export interface WidgetKind {
  id: string
  label: string
  icon: string
}

export const STYLE_VARIANTS: StyleVariant[] = [
  { id: 'minimal', label: '简约', desc: '纯色描边', radius: 10, shadow: false, pixel: false },
  { id: 'skeuomorph', label: '拟物', desc: '渐变投影', radius: 16, shadow: true, pixel: false },
  { id: 'pixel', label: '像素', desc: '硬边方角', radius: 0, shadow: false, pixel: true },
]

export const WIDGET_KINDS: WidgetKind[] = [
  { id: 'pomodoro', label: '番茄钟', icon: '🍅' },
  { id: 'daily-anchor', label: '每日锚点', icon: '⚓' },
  { id: 'quick-note', label: '速记', icon: '📝' },
  { id: 'weather', label: '天气', icon: '🌤️' },
  { id: 'quote', label: '一言', icon: '❝' },
  { id: 'calendar-heatmap', label: '热力图', icon: '🔥' },
]

export const DEFAULT_STYLE_ID = 'minimal'

export const DEFAULT_STYLE_BY_KIND: Record<string, string> = WIDGET_KINDS.reduce(
  (acc, k) => {
    acc[k.id] = DEFAULT_STYLE_ID
    return acc
  },
  {} as Record<string, string>,
)

export interface WidgetStyleState {
  styles: Record<string, string>
}

const state = ref<WidgetStyleState>({ styles: { ...DEFAULT_STYLE_BY_KIND } })

function isKnownVariant(id: string): boolean {
  return STYLE_VARIANTS.some((v) => v.id === id)
}

function load(): void {
  try {
    const saved = storage.getKV<WidgetStyleState | null>(STORAGE_KEY, null)
    const styles = { ...DEFAULT_STYLE_BY_KIND }
    if (saved && saved.styles && typeof saved.styles === 'object') {
      for (const k of WIDGET_KINDS) {
        const v = saved.styles[k.id]
        if (typeof v === 'string' && isKnownVariant(v)) styles[k.id] = v
      }
    }
    state.value = { styles }
  } catch {
    /* 存储不可用时回落默认 */
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadWidgetStyle(): void {
  load()
}

export function useWidgetStyle() {
  const styles = computed(() => state.value.styles)

  function styleOf(kindId: string): string {
    return state.value.styles[kindId] ?? DEFAULT_STYLE_ID
  }

  function setStyle(kindId: string, variantId: string): boolean {
    if (!WIDGET_KINDS.some((k) => k.id === kindId)) return false
    if (!isKnownVariant(variantId)) return false
    state.value = { styles: { ...state.value.styles, [kindId]: variantId } }
    persist()
    return true
  }

  function resetKind(kindId: string): void {
    if (!WIDGET_KINDS.some((k) => k.id === kindId)) return
    state.value = { styles: { ...state.value.styles, [kindId]: DEFAULT_STYLE_ID } }
    persist()
  }

  function resetAll(): void {
    state.value = { styles: { ...DEFAULT_STYLE_BY_KIND } }
    persist()
  }

  return { styles, styleOf, setStyle, resetKind, resetAll }
}
