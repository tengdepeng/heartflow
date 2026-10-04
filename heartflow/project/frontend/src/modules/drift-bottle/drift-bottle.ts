// ============================================================
// 情绪花房 · 漂流瓶（瓶中信）
// ------------------------------------------------------------
// 借鉴「96 APK」生辰 ic_drift_bottle / 小组件盒子 ic_fishbowl_ship_bottle：
// 把心事封进瓶子投入海，日后随机捞起一只——与自己的旧念头重逢。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:drift_bottle。
// 落点：情绪花房 EmotionGarden.vue。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:drift_bottle'

export const BOTTLE_MOODS = ['平静', '喜悦', '忧伤', '思念', '期待', '释然'] as const
export type BottleMood = (typeof BOTTLE_MOODS)[number]

export type BottleStatus = 'drifting' | 'collected'

export interface DriftBottle {
  id: string
  text: string
  mood: BottleMood
  createdAt: string
  thrownAt: string
  collectedAt: string | null
  status: BottleStatus
}

export interface BottleState {
  bottles: DriftBottle[]
}

function defaultState(): BottleState {
  return { bottles: [] }
}

function uid(): string {
  return `bottle_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ---- 模块级单例状态 ----
const state = ref<BottleState>(defaultState())

function load(): void {
  try {
    const saved = storage.getKV<BottleState | null>(STORAGE_KEY, null)
    if (saved && Array.isArray(saved.bottles)) {
      state.value = { bottles: saved.bottles.map((b) => ({ ...b })) }
    }
  } catch {
    /* 存储不可用时回落默认 */
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadBottles(): void {
  load()
}

export function useDriftBottle() {
  const bottles = computed(() => state.value.bottles)
  const drifting = computed(() => state.value.bottles.filter((b) => b.status === 'drifting'))
  const collected = computed(() => state.value.bottles.filter((b) => b.status === 'collected'))
  const driftingCount = computed(() => drifting.value.length)
  const collectedCount = computed(() => collected.value.length)
  const isEmpty = computed(() => state.value.bottles.length === 0)

  /** 封入瓶中投入海；文本为空返回 null */
  function throwBottle(text: string, mood: BottleMood = '平静'): DriftBottle | null {
    const content = text.trim()
    if (!content) return null
    const now = new Date().toISOString()
    const bottle: DriftBottle = {
      id: uid(),
      text: content,
      mood,
      createdAt: now,
      thrownAt: now,
      collectedAt: null,
      status: 'drifting',
    }
    state.value = { bottles: [bottle, ...state.value.bottles] }
    persist()
    return bottle
  }

  /** 随机捞起一只仍在漂流的瓶子并标记为已拾取；无漂流瓶返回 null */
  function pickBottle(): DriftBottle | null {
    const pool = state.value.bottles.filter((b) => b.status === 'drifting')
    if (pool.length === 0) return null
    const target = pool[Math.floor(Math.random() * pool.length)]
    const collectedAt = new Date().toISOString()
    state.value = {
      bottles: state.value.bottles.map((b) =>
        b.id === target.id ? { ...b, status: 'collected', collectedAt } : b,
      ),
    }
    persist()
    return { ...target, status: 'collected', collectedAt }
  }

  function removeBottle(id: string): void {
    state.value = { bottles: state.value.bottles.filter((b) => b.id !== id) }
    persist()
  }

  function clearAll(): void {
    state.value = defaultState()
    persist()
  }

  return {
    bottles,
    drifting,
    collected,
    driftingCount,
    collectedCount,
    isEmpty,
    throwBottle,
    pickBottle,
    removeBottle,
    clearAll,
  }
}
