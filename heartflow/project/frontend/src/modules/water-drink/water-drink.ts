// ============================================================
// 殿堂触角 · 喝水打卡（Water Drink）
// ------------------------------------------------------------
// 借鉴「时光序」drink_water_* 组件：每日喝水计数 + 目标进度 + 一键 +1。
// 纯本地、零网络（守宪法·本地私有）；状态存 hf:water_drink。
// 落点：殿堂触角 Touchpoints.vue 桌面小组件（water-drink 类型）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:water_drink'

export const MIN_TARGET = 1
export const MAX_TARGET = 20
export const DEFAULT_TARGET = 8

export interface WaterDrinkState {
  /** 记录日期 YYYY-MM-DD（跨日自动归零） */
  date: string
  /** 今日已喝杯数 */
  cups: number
  /** 每日目标杯数 */
  target: number
  /** 累计杯数 */
  totalCups: number
}

export const DEFAULT_WATER_DRINK: WaterDrinkState = {
  date: '',
  cups: 0,
  target: DEFAULT_TARGET,
  totalCups: 0,
}

/** 本地日期串（YYYY-MM-DD，按本地时区，避免 UTC 跨日误判） */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 纯函数：跨日归零（返回规范化状态，不修改入参） */
export function normalizeWaterDrink(state: WaterDrinkState, today: string): WaterDrinkState {
  const base = { ...DEFAULT_WATER_DRINK, ...state }
  if (base.date !== today) return { ...base, date: today, cups: 0 }
  return base
}

/** 纯函数：目标进度 0-100（零基准夹取） */
export function drinkProgress(cups: number, target: number): number {
  const t = Math.max(MIN_TARGET, target)
  return Math.round(Math.max(0, Math.min(1, cups / t)) * 100)
}

/** 纯函数：夹取目标杯数 */
export function clampTarget(n: number, fallback = DEFAULT_TARGET): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(n)))
}

const state = ref<WaterDrinkState>({ ...DEFAULT_WATER_DRINK, date: localDate() })

function load(): void {
  const today = localDate()
  try {
    const saved = storage.getKV<WaterDrinkState | null>(STORAGE_KEY, null)
    if (!saved) {
      state.value = { ...DEFAULT_WATER_DRINK, date: today }
      return
    }
    state.value = normalizeWaterDrink(saved, today)
    // 跨日归零须回写存储，否则旧日期会一直残留到下次变更
    if (saved.date !== today) persist()
  } catch {
    state.value = { ...DEFAULT_WATER_DRINK, date: today }
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadWaterDrink(): void {
  load()
}

export function useWaterDrink() {
  const cups = computed(() => state.value.cups)
  const target = computed(() => state.value.target)
  const totalCups = computed(() => state.value.totalCups)
  const progress = computed(() => drinkProgress(state.value.cups, state.value.target))
  const reached = computed(() => state.value.cups >= state.value.target)

  /** 喝一杯（跨日自动归零后 +1） */
  function addCup(): number {
    const base = normalizeWaterDrink(state.value, localDate())
    state.value = { ...base, cups: base.cups + 1, totalCups: base.totalCups + 1 }
    persist()
    return state.value.cups
  }

  /** 撤销一杯 */
  function removeCup(): number {
    const base = normalizeWaterDrink(state.value, localDate())
    state.value = {
      ...base,
      cups: Math.max(0, base.cups - 1),
      totalCups: Math.max(0, base.totalCups - 1),
    }
    persist()
    return state.value.cups
  }

  function setTarget(n: number): number {
    state.value = { ...state.value, target: clampTarget(n, state.value.target) }
    persist()
    return state.value.target
  }

  function resetToday(): void {
    state.value = { ...normalizeWaterDrink(state.value, localDate()), cups: 0 }
    persist()
  }

  return { cups, target, totalCups, progress, reached, addCup, removeCup, setTarget, resetToday }
}
