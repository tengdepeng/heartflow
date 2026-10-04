// ============================================================
// 情绪花房 · 电子水族箱
// ------------------------------------------------------------
// 借鉴「96 APK」组件岛 ocean_fish 成组游鱼 + ocean_4_feeding 喂食：
// 纯本地养鱼——放养、投食、成长，与情绪花房植物养成并列。
// 零网络、零外部资源（守宪法·本地私有）；状态持久化于 hf:aquarium。
// 落点：情绪花房 EmotionGarden.vue。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:aquarium'
export const MAX_FISH = 12

export interface FishSpecies {
  id: string
  name: string
  color: string
  accent: string
}

export const FISH_SPECIES: FishSpecies[] = [
  { id: 'koi', name: '锦鲤', color: '#e8934a', accent: '#fbe3c0' },
  { id: 'goldfish', name: '金鱼', color: '#e5b53a', accent: '#fff2c8' },
  { id: 'guppy', name: '孔雀鱼', color: '#5aa9c9', accent: '#cdeaf5' },
  { id: 'neon', name: '霓虹灯鱼', color: '#7a6fd0', accent: '#dcd8f5' },
]

export function speciesById(id: string): FishSpecies {
  return FISH_SPECIES.find((s) => s.id === id) ?? FISH_SPECIES[0]
}

export interface Fish {
  id: string
  speciesId: string
  name: string
  bornAt: string
  lastFedAt: string
  feedCount: number
}

export interface AquariumState {
  fish: Fish[]
  totalFeeds: number
  todayFeeds: number
  lastFedDate: string // YYYY-MM-DD
}

export interface GrowthStage {
  key: 'fry' | 'juvenile' | 'adult'
  label: string
  scale: number
}

export function growthStage(feedCount: number): GrowthStage {
  if (feedCount >= 8) return { key: 'adult', label: '成鱼', scale: 1.15 }
  if (feedCount >= 3) return { key: 'juvenile', label: '幼鱼', scale: 0.95 }
  return { key: 'fry', label: '鱼苗', scale: 0.75 }
}

const DEFAULT_STATE: AquariumState = {
  fish: [],
  totalFeeds: 0,
  todayFeeds: 0,
  lastFedDate: '',
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---- 模块级单例状态 ----
const state = ref<AquariumState>({ ...DEFAULT_STATE, fish: [] })

function load(): void {
  try {
    const saved = storage.getKV<AquariumState | null>(STORAGE_KEY, null)
    if (saved) {
      const next: AquariumState = {
        ...DEFAULT_STATE,
        ...saved,
        fish: Array.isArray(saved.fish) ? saved.fish.map((f) => ({ ...f })) : [],
      }
      // 跨日则今日投食计数归零
      if (next.lastFedDate !== todayStr()) {
        next.todayFeeds = 0
        next.lastFedDate = todayStr()
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

load()

export function reloadAquarium(): void {
  load()
}

export function useAquarium() {
  const fish = computed(() => state.value.fish)
  const fishCount = computed(() => state.value.fish.length)
  const totalFeeds = computed(() => state.value.totalFeeds)
  const todayFeeds = computed(() => state.value.todayFeeds)
  const isEmpty = computed(() => state.value.fish.length === 0)
  const isFull = computed(() => state.value.fish.length >= MAX_FISH)

  /** 放养一尾；鱼缸满则返回 null */
  function addFish(speciesId: string, name?: string): Fish | null {
    if (state.value.fish.length >= MAX_FISH) return null
    const sp = speciesById(speciesId)
    const now = new Date().toISOString()
    const created: Fish = {
      id: `fish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      speciesId: sp.id,
      name: name?.trim() || sp.name,
      bornAt: now,
      lastFedAt: now,
      feedCount: 0,
    }
    state.value = { ...state.value, fish: [...state.value.fish, created] }
    persist()
    return created
  }

  /** 投食：所有鱼各得一份；返回本次投食份数（无鱼为 0） */
  function feed(): number {
    const cur = state.value
    if (cur.fish.length === 0) return 0
    const t = todayStr()
    const rolled = cur.lastFedDate !== t
    const now = new Date().toISOString()
    const fed = cur.fish.map((f) => ({ ...f, lastFedAt: now, feedCount: f.feedCount + 1 }))
    state.value = {
      fish: fed,
      totalFeeds: cur.totalFeeds + fed.length,
      todayFeeds: (rolled ? 0 : cur.todayFeeds) + fed.length,
      lastFedDate: t,
    }
    persist()
    return fed.length
  }

  function removeFish(id: string): void {
    state.value = { ...state.value, fish: state.value.fish.filter((f) => f.id !== id) }
    persist()
  }

  function clearAll(): void {
    state.value = { ...DEFAULT_STATE, fish: [], lastFedDate: todayStr() }
    persist()
  }

  return {
    fish,
    fishCount,
    totalFeeds,
    todayFeeds,
    isEmpty,
    isFull,
    addFish,
    feed,
    removeFish,
    clearAll,
  }
}
