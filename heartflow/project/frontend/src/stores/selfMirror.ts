// ============================================================
// 众生象 · Pinia Store
// 模块三十五：四柱画像 / 十二宫格 / 自体星盘
// 持久化出生信息与十二宫自评，桥接 self-mirror 引擎
// 全部本地实现，守宪法第1条本地私有
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import {
  computeFourPillars,
  defaultBirthData,
  zodiacForYear,
  constellationFor,
  createEmptyHouses,
  computeHouseStats,
  assessBalance,
  housesToAstrolabe,
  deriveAstrolabeInsight,
} from '../modules/self-mirror'
import type { BirthData, House } from '../modules/self-mirror'

// ---- 存储键 ----

const K_BIRTH = 'hf:self-mirror:birth'
const K_HOUSES = 'hf:self-mirror:houses'

// ---- 加载辅助 ----

function loadBirth(): BirthData {
  try {
    const saved = storage.getKV<BirthData | null>(K_BIRTH, null)
    if (saved && typeof saved.year === 'number' && typeof saved.month === 'number' && typeof saved.day === 'number' && typeof saved.hour === 'number') {
      return saved
    }
  } catch { /* 忽略损坏数据 */ }
  return defaultBirthData()
}

function loadHouses(): House[] {
  try {
    const saved = storage.getKV<House[] | null>(K_HOUSES, null)
    if (Array.isArray(saved) && saved.length > 0) {
      const defaults = createEmptyHouses()
      // 以默认宫格为骨架，合并已保存的自评（兼容新增/移除宫格）
      return defaults.map(d => {
        const prev = saved.find(s => s.id === d.id)
        return prev ? { ...d, rating: prev.rating, note: prev.note } : d
      })
    }
  } catch { /* 忽略损坏数据 */ }
  return createEmptyHouses()
}

export const useSelfMirrorStore = defineStore('selfMirror', () => {
  // ---- 状态 ----
  const birth = ref<BirthData>(loadBirth())
  const houses = ref<House[]>(loadHouses())

  // ---- 计算属性（桥接引擎） ----

  const fourPillars = computed(() => computeFourPillars(birth.value))

  const zodiac = computed(() => zodiacForYear(birth.value.year))

  const constellation = computed(() => constellationFor(birth.value))

  const houseStats = computed(() => computeHouseStats(houses.value))

  const balance = computed(() => assessBalance(houses.value))

  const astrolabe = computed(() => housesToAstrolabe(houses.value))

  const astrolabeInsight = computed(() => deriveAstrolabeInsight(houses.value))

  const ratedCount = computed(() => houses.value.filter(h => h.rating > 0).length)

  // ---- 操作方法 ----

  function persist() {
    storage.setKV(K_BIRTH, birth.value)
    storage.setKV(K_HOUSES, houses.value)
  }

  function setBirthData(data: BirthData) {
    birth.value = {
      year: Math.max(1900, Math.min(2100, data.year)),
      month: Math.max(1, Math.min(12, data.month)),
      day: Math.max(1, Math.min(31, data.day)),
      hour: Math.max(0, Math.min(23, data.hour)),
    }
    persist()
  }

  function resetBirth() {
    birth.value = defaultBirthData()
    persist()
  }

  function setHouseRating(id: string, rating: number) {
    const h = houses.value.find(x => x.id === id)
    if (h) {
      h.rating = Math.max(0, Math.min(5, Math.round(rating)))
      persist()
    }
  }

  function setHouseNote(id: string, note: string) {
    const h = houses.value.find(x => x.id === id)
    if (h) {
      h.note = note
      persist()
    }
  }

  function resetHouses() {
    houses.value = createEmptyHouses()
    persist()
  }

  return {
    // 状态
    birth,
    houses,
    // 计算属性
    fourPillars,
    zodiac,
    constellation,
    houseStats,
    balance,
    astrolabe,
    astrolabeInsight,
    ratedCount,
    // 操作
    setBirthData,
    resetBirth,
    setHouseRating,
    setHouseNote,
    resetHouses,
    persist,
  }
})
