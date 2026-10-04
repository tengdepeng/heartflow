// ============================================================
// 幕僚 · 决定转盘（决策器）
// ------------------------------------------------------------
// 借鉴「96 APK」组件岛 assets/decision（decision_list/decision_name）：
// 把纠结交给转盘——选项可增删，转一转给一个随机决定，并留痕。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:decision_wheel。
// 落点：幕僚 AdvisorHub.vue（决策场景）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:decision_wheel'
export const MAX_HISTORY = 20

export interface WheelOption {
  id: string
  label: string
}

export interface SpinRecord {
  id: string
  label: string
  at: string
}

export interface WheelState {
  options: WheelOption[]
  history: SpinRecord[]
}

export const DEFAULT_OPTIONS: WheelOption[] = [
  { id: 'opt_rest', label: '先歇一会儿' },
  { id: 'opt_water', label: '喝杯水' },
  { id: 'opt_walk', label: '出去走走' },
  { id: 'opt_read', label: '读十页书' },
  { id: 'opt_tidy', label: '整理桌面' },
  { id: 'opt_write', label: '写下此刻想法' },
]

function defaultState(): WheelState {
  return { options: DEFAULT_OPTIONS.map((o) => ({ ...o })), history: [] }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ---- 模块级单例状态 ----
const state = ref<WheelState>(defaultState())

function load(): void {
  try {
    const saved = storage.getKV<WheelState | null>(STORAGE_KEY, null)
    if (saved) {
      state.value = {
        options: Array.isArray(saved.options)
          ? saved.options.map((o) => ({ ...o }))
          : DEFAULT_OPTIONS.map((o) => ({ ...o })),
        history: Array.isArray(saved.history) ? saved.history.map((h) => ({ ...h })) : [],
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

export function reloadWheel(): void {
  load()
}

export function useDecisionWheel() {
  const options = computed(() => state.value.options)
  const history = computed(() => state.value.history)
  const lastResult = computed<SpinRecord | null>(() => state.value.history[0] ?? null)
  const canSpin = computed(() => state.value.options.length >= 2)

  function addOption(label: string): WheelOption | null {
    const text = label.trim()
    if (!text) return null
    const opt: WheelOption = { id: uid('opt'), label: text }
    state.value = { ...state.value, options: [...state.value.options, opt] }
    persist()
    return opt
  }

  function removeOption(id: string): void {
    state.value = { ...state.value, options: state.value.options.filter((o) => o.id !== id) }
    persist()
  }

  /** 转一次：返回被选中的下标与选项（选项 < 2 时返回 null） */
  function spin(): { index: number; option: WheelOption } | null {
    const opts = state.value.options
    if (opts.length < 2) return null
    const index = Math.floor(Math.random() * opts.length)
    const option = opts[index]
    const record: SpinRecord = { id: uid('spin'), label: option.label, at: new Date().toISOString() }
    state.value = {
      ...state.value,
      history: [record, ...state.value.history].slice(0, MAX_HISTORY),
    }
    persist()
    return { index, option }
  }

  function clearHistory(): void {
    state.value = { ...state.value, history: [] }
    persist()
  }

  function resetOptions(): void {
    state.value = { ...state.value, options: DEFAULT_OPTIONS.map((o) => ({ ...o })) }
    persist()
  }

  return {
    options,
    history,
    lastResult,
    canSpin,
    addOption,
    removeOption,
    spin,
    clearHistory,
    resetOptions,
  }
}
