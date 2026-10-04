// ============================================================
// 触角 · 动态岛 / 状态胶囊（Dynamic Island）
// ------------------------------------------------------------
// 借鉴「96 APK」生辰 assets/dynamic_island_charging.json /
// dynamic_island_music_animation.json（顶部居中的可变形状态胶囊）：
// 同一枚胶囊在「时钟 / 专注 / 通知 / 电量 / 音乐」间平滑变形。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:dynamic_island。
// 落点：殿堂触角 Touchpoints.vue（状态展示）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:dynamic_island'

export const ISLAND_MODES = ['clock', 'focus', 'notification', 'battery', 'music'] as const
export type IslandMode = (typeof ISLAND_MODES)[number]

export const ISLAND_MODE_META: Record<IslandMode, { label: string; icon: string }> = {
  clock: { label: '时钟', icon: '🕒' },
  focus: { label: '专注', icon: '🎯' },
  notification: { label: '通知', icon: '🔔' },
  battery: { label: '电量', icon: '🔋' },
  music: { label: '音乐', icon: '🎵' },
}

export interface DynamicIslandState {
  mode: IslandMode
  autoCycle: boolean
}

export const DEFAULT_ISLAND: DynamicIslandState = { mode: 'clock', autoCycle: true }

const state = ref<DynamicIslandState>({ ...DEFAULT_ISLAND })

function load(): void {
  try {
    const saved = storage.getKV<DynamicIslandState | null>(STORAGE_KEY, null)
    if (saved && (ISLAND_MODES as readonly string[]).includes(saved.mode)) {
      state.value = { mode: saved.mode, autoCycle: saved.autoCycle ?? true }
    }
  } catch {
    /* 存储不可用时回落默认 */
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadIsland(): void {
  load()
}

export function useDynamicIsland() {
  const mode = computed(() => state.value.mode)
  const autoCycle = computed(() => state.value.autoCycle)
  const modeIndex = computed(() => ISLAND_MODES.indexOf(state.value.mode))

  function setMode(next: IslandMode): void {
    if (!(ISLAND_MODES as readonly string[]).includes(next)) return
    state.value = { ...state.value, mode: next }
    persist()
  }

  /** 顺时针切到下一状态 */
  function nextMode(): IslandMode {
    const idx = (ISLAND_MODES.indexOf(state.value.mode) + 1) % ISLAND_MODES.length
    setMode(ISLAND_MODES[idx])
    return ISLAND_MODES[idx]
  }

  function toggleAutoCycle(): boolean {
    state.value = { ...state.value, autoCycle: !state.value.autoCycle }
    persist()
    return state.value.autoCycle
  }

  function reset(): void {
    state.value = { ...DEFAULT_ISLAND }
    persist()
  }

  return { mode, autoCycle, modeIndex, setMode, nextMode, toggleAutoCycle, reset }
}
