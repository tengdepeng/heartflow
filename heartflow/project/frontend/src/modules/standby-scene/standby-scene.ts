// ============================================================
// 触角 · 空闲待机氛围场景（Idle Standby Scene）
// ------------------------------------------------------------
// 借鉴「96 APK」生辰 drawable `ill_standby_brown_cat_*` /
// `ill_standby_christmas_cat_*` / `ill_standby_keyboard_cat_*` /
// `ill_standby_purple_cat_*`（空闲时触发的全屏插画场景）：
// 应用静置一段时间后，浮出全屏氛围动画；任意操作即退出。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:standby_scene。
// 落点：殿堂触角 Touchpoints.vue（全局 UI）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:standby_scene'

export const SCENES = ['cat', 'snow', 'keyboard', 'aurora', 'pulse'] as const
export type SceneId = (typeof SCENES)[number]

export const SCENE_META: Record<SceneId, { label: string; icon: string; hint: string }> = {
  cat: { label: '夜猫', icon: '🐈', hint: '月色下的猫' },
  snow: { label: '落雪', icon: '❄️', hint: '安静飘落的雪' },
  keyboard: { label: '键盘', icon: '⌨️', hint: '待机的光标' },
  aurora: { label: '极光', icon: '🌌', hint: '流动的极光' },
  pulse: { label: '呼吸', icon: '🫧', hint: '起伏的呼吸光' },
}

export const MIN_IDLE_SECONDS = 5
export const MAX_IDLE_SECONDS = 300

export interface StandbySceneState {
  scene: SceneId
  idleSeconds: number
  enabled: boolean
}

export const DEFAULT_STANDBY: StandbySceneState = {
  scene: 'cat',
  idleSeconds: 30,
  enabled: true,
}

const state = ref<StandbySceneState>({ ...DEFAULT_STANDBY })

function clampIdle(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_STANDBY.idleSeconds
  return Math.min(MAX_IDLE_SECONDS, Math.max(MIN_IDLE_SECONDS, Math.round(seconds)))
}

function load(): void {
  try {
    const saved = storage.getKV<StandbySceneState | null>(STORAGE_KEY, null)
    if (saved) {
      state.value = {
        scene: (SCENES as readonly string[]).includes(saved.scene)
          ? saved.scene
          : DEFAULT_STANDBY.scene,
        idleSeconds: clampIdle(saved.idleSeconds),
        enabled: saved.enabled ?? true,
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

export function reloadStandbyScene(): void {
  load()
}

export function useStandbyScene() {
  const scene = computed(() => state.value.scene)
  const idleSeconds = computed(() => state.value.idleSeconds)
  const enabled = computed(() => state.value.enabled)

  function setScene(id: SceneId): void {
    if (!(SCENES as readonly string[]).includes(id)) return
    state.value = { ...state.value, scene: id }
    persist()
  }

  function setIdleSeconds(seconds: number): number {
    const v = clampIdle(seconds)
    state.value = { ...state.value, idleSeconds: v }
    persist()
    return v
  }

  function toggleEnabled(): boolean {
    state.value = { ...state.value, enabled: !state.value.enabled }
    persist()
    return state.value.enabled
  }

  function reset(): void {
    state.value = { ...DEFAULT_STANDBY }
    persist()
  }

  return { scene, idleSeconds, enabled, setScene, setIdleSeconds, toggleEnabled, reset }
}
