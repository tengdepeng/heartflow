// ============================================================
// 成长庭院 · 花园点缀（种子 / 习惯 / 人生罗盘）
// 注意：目标系统已统一由 modules/goal（留光阁）承载，
// 本模块只保留花园自身的"点缀"数据，不再维护第二套目标。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

export {
  useWishList,
  wishProgress,
  habitCompletionCounts,
  wishlistOverview,
  wishlistInsights,
} from './wish-list'
export type { Wish, WishInput, WishProgress, WishlistOverview } from './wish-list'

export interface Seed {
  id: string
  text: string
  sprouted: boolean
  at: string
}

export interface Habit {
  id: string
  text: string
  streak: number
  streakPct: number
  ticks: string[]
}

const SEEDS_KEY = 'hf:seeds'
const HABITS_KEY = 'hf:habits'
const COMPASS_KEY = 'hf:compass'

function loadKV<T>(key: string, fallback: T): T {
  try { return storage.getKV<T>(key, fallback) } catch { return fallback }
}

function saveKV<T>(key: string, value: T) {
  storage.setKV(key, value)
}

const seeds = ref<Seed[]>(loadKV(SEEDS_KEY, []))
const habits = ref<Habit[]>(loadKV(HABITS_KEY, []))
const compass = ref<string[]>(loadKV(COMPASS_KEY, []))

export function useGardenFlourish() {
  // ---- 种子 ----
  function persistSeeds() { saveKV(SEEDS_KEY, seeds.value) }

  function plantSeed(text: string): Seed {
    const seed: Seed = {
      id: `s${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      sprouted: false,
      at: new Date().toISOString(),
    }
    seeds.value.unshift(seed)
    persistSeeds()
    return seed
  }

  function toggleSprout(id: string) {
    const s = seeds.value.find(s => s.id === id)
    if (s) { s.sprouted = !s.sprouted; persistSeeds() }
  }

  function removeSeed(id: string) {
    seeds.value = seeds.value.filter(s => s.id !== id)
    persistSeeds()
  }

  // ---- 习惯 ----
  function persistHabits() { saveKV(HABITS_KEY, habits.value) }

  function addHabit(text: string): Habit {
    const habit: Habit = {
      id: `h${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      streak: 0,
      streakPct: 0,
      ticks: [],
    }
    habits.value.push(habit)
    persistHabits()
    return habit
  }

  function tickHabit(id: string) {
    const h = habits.value.find(h => h.id === id)
    if (!h) return
    const today = getLocalDateKey()
    if (h.ticks.includes(today)) {
      h.ticks = h.ticks.filter(t => t !== today)
    } else {
      h.ticks.push(today)
    }
    h.ticks.sort()
    // 重新计算连续天数
    let streak = 0
    const d = new Date()
    for (let i = h.ticks.length - 1; i >= 0; i--) {
      const expected = new Date(d)
      expected.setDate(expected.getDate() - (h.ticks.length - 1 - i))
      if (h.ticks[i] === getLocalDateKey(expected)) streak++
      else break
    }
    h.streak = streak
    h.streakPct = Math.min(streak * 100 / 30, 100)
    persistHabits()
  }

  function removeHabit(id: string) {
    habits.value = habits.value.filter(h => h.id !== id)
    persistHabits()
  }

  // ---- 人生罗盘 ----
  function persistCompass() { saveKV(COMPASS_KEY, compass.value) }

  function addCompassValue(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    compass.value.push(trimmed)
    persistCompass()
  }

  function removeCompassValue(value: string) {
    compass.value = compass.value.filter(c => c !== value)
    persistCompass()
  }

  // ---- 导出/导入（仅点缀数据） ----
  function exportFlourish(): string {
    return JSON.stringify({
      seeds: seeds.value,
      habits: habits.value,
      compass: compass.value,
    }, null, 2)
  }

  function importFlourish(json: string): { seeds: number; habits: number; compass: number } {
    const data = JSON.parse(json)
    const result = { seeds: 0, habits: 0, compass: 0 }
    if (Array.isArray(data.seeds)) {
      for (const s of data.seeds) {
        if (s.text && !seeds.value.find(x => x.id === s.id)) {
          seeds.value.push(s); result.seeds++
        }
      }
      persistSeeds()
    }
    if (Array.isArray(data.habits)) {
      for (const h of data.habits) {
        if (h.text && !habits.value.find(x => x.id === h.id)) {
          habits.value.push(h); result.habits++
        }
      }
      persistHabits()
    }
    if (Array.isArray(data.compass)) {
      for (const c of data.compass) {
        if (typeof c === 'string' && !compass.value.includes(c)) {
          compass.value.push(c); result.compass++
        }
      }
      persistCompass()
    }
    return result
  }

  return {
    seeds,
    plantSeed,
    toggleSprout,
    removeSeed,
    habits,
    addHabit,
    tickHabit,
    removeHabit,
    compass,
    addCompassValue,
    removeCompassValue,
    exportFlourish,
    importFlourish,
  }
}
