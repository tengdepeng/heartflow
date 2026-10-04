// ============================================================
// 触角 · 径向扇形菜单（快捷操作扇）
// ------------------------------------------------------------
// 借鉴「96 APK」生辰 anim widget_circle_folder_animation_* /
// widget_fan_animation（环形文件夹 / 扇形展开）：
// 一个中心按钮点开，动作呈放射状扇形弹出，点选即触发。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:radial_menu。
// 落点：殿堂触角 Touchpoints.vue（快捷操作）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:radial_menu'
export const MAX_ACTIONS = 8

export interface RadialAction {
  id: string
  label: string
  icon: string
}

export interface RadialMenuState {
  actions: RadialAction[]
  /** 最近一次触发的动作 id */
  lastTriggeredId: string | null
  /** 最近一次触发时间 */
  lastTriggeredAt: string | null
}

export const DEFAULT_ACTIONS: RadialAction[] = [
  { id: 'ra_breath', label: '深呼吸', icon: '🫧' },
  { id: 'ra_dice', label: '掷骰子', icon: '🎲' },
  { id: 'ra_spark', label: '随机灵感', icon: '💡' },
  { id: 'ra_stretch', label: '伸懒腰', icon: '🧘' },
  { id: 'ra_water', label: '喝口水', icon: '💧' },
  { id: 'ra_rest', label: '歇一会', icon: '🌙' },
]

function defaultState(): RadialMenuState {
  return { actions: DEFAULT_ACTIONS.map((a) => ({ ...a })), lastTriggeredId: null, lastTriggeredAt: null }
}

function uid(): string {
  return `ra_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ---- 模块级单例状态 ----
const state = ref<RadialMenuState>(defaultState())

function load(): void {
  try {
    const saved = storage.getKV<RadialMenuState | null>(STORAGE_KEY, null)
    if (saved && Array.isArray(saved.actions)) {
      state.value = {
        actions: saved.actions.map((a) => ({ ...a })).slice(0, MAX_ACTIONS),
        lastTriggeredId: saved.lastTriggeredId ?? null,
        lastTriggeredAt: saved.lastTriggeredAt ?? null,
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

export function reloadRadialMenu(): void {
  load()
}

export function useRadialMenu() {
  const actions = computed(() => state.value.actions)
  const lastTriggeredId = computed(() => state.value.lastTriggeredId)
  const canAdd = computed(() => state.value.actions.length < MAX_ACTIONS)

  function addAction(label: string, icon = '⭐'): RadialAction | null {
    const text = label.trim()
    if (!text || state.value.actions.length >= MAX_ACTIONS) return null
    const action: RadialAction = { id: uid(), label: text, icon: icon.trim() || '⭐' }
    state.value = { ...state.value, actions: [...state.value.actions, action] }
    persist()
    return action
  }

  function removeAction(id: string): void {
    state.value = { ...state.value, actions: state.value.actions.filter((a) => a.id !== id) }
    persist()
  }

  /** 记录一次触发（留痕）。返回是否命中动作。 */
  function trigger(id: string): boolean {
    if (!state.value.actions.some((a) => a.id === id)) return false
    state.value = { ...state.value, lastTriggeredId: id, lastTriggeredAt: new Date().toISOString() }
    persist()
    return true
  }

  function resetActions(): void {
    state.value = { ...state.value, actions: DEFAULT_ACTIONS.map((a) => ({ ...a })) }
    persist()
  }

  return { actions, lastTriggeredId, canAdd, addAction, removeAction, trigger, resetActions }
}
