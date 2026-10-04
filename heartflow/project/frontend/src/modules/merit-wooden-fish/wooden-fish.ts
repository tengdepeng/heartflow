// ============================================================
// 息壤 · 电子木鱼 · 功德计数器
// ------------------------------------------------------------
// 借鉴「96 APK」组件岛 electronic_fish / 万年日历 pop_fish：点击木鱼积功德。
// 纯本地、零网络（守宪法·本地私有）；计数持久化 + 木鱼敲击声由 WebAudio 本地合成（不新增音频资源）。
// 落点：息壤 Rest.vue（静心/休憩场景，契合 sound-scene 禅院音景）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:merit_wooden_fish'

export interface MeritState {
  totalMerit: number
  todayCount: number
  lastKnockDate: string // YYYY-MM-DD
  soundEnabled: boolean
}

const DEFAULT_STATE: MeritState = {
  totalMerit: 0,
  todayCount: 0,
  lastKnockDate: '',
  soundEnabled: true,
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---- 模块级单例状态 ----
const state = ref<MeritState>({ ...DEFAULT_STATE })

function load(): void {
  try {
    const saved = storage.getKV<MeritState | null>(STORAGE_KEY, null)
    if (saved) {
      const next: MeritState = { ...DEFAULT_STATE, ...saved }
      // 跨日则今日计数归零
      if (next.lastKnockDate !== todayStr()) {
        next.todayCount = 0
        next.lastKnockDate = todayStr()
      }
      state.value = next
    }
  } catch {
    /* 存储不可用时回落默认 */
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

// ---- WebAudio 木鱼敲击声（本地合成，不新增音频资源） ----
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioCtx) {
    audioCtx = new AC()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

function playKnock(): void {
  const c = ensureCtx()
  if (!c || !masterGain) return
  const now = c.currentTime
  // 木鱼「笃」声：三角波 + 短促衰减 + 轻微下滑音高（木质感）
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(360, now)
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.06)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.3, now + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13)
  osc.connect(g)
  g.connect(masterGain)
  osc.start(now)
  osc.stop(now + 0.16)
  try {
    osc.onended = () => {
      try {
        osc.disconnect()
      } catch {
        /* noop */
      }
      try {
        g.disconnect()
      } catch {
        /* noop */
      }
    }
  } catch {
    /* noop */
  }
}

load()

export function reloadMeritState(): void {
  load()
}

export function useMeritWoodenFish() {
  const merit = computed(() => state.value.totalMerit)
  const today = computed(() => state.value.todayCount)
  const soundOn = computed(() => state.value.soundEnabled)
  const isEmpty = computed(() => state.value.totalMerit === 0)

  function knock(): void {
    const t = todayStr()
    const cur = state.value
    const rolled = cur.lastKnockDate !== t
    state.value = {
      ...cur,
      totalMerit: cur.totalMerit + 1,
      todayCount: rolled ? 1 : cur.todayCount + 1,
      lastKnockDate: t,
    }
    persist()
    if (state.value.soundEnabled) playKnock()
  }

  function toggleSound(): void {
    state.value = { ...state.value, soundEnabled: !state.value.soundEnabled }
    persist()
  }

  function clearAll(): void {
    state.value = { ...DEFAULT_STATE, lastKnockDate: todayStr() }
    persist()
  }

  return {
    merit,
    today,
    soundOn,
    isEmpty,
    knock,
    toggleSound,
    clearAll,
  }
}
