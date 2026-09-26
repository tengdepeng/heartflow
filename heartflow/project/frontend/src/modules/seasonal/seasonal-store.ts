// ============================================================
// 岁时阁 · 仪式状态（真实定义）
// ⚠️ 本文件由 index.ts 拆出：真实定义下沉到此处，index.ts 只做 re-export。
//    原因：bridge 从 barrel 取符号、barrel 又 re-export bridge，
//    构成 index ↔ bridge 循环依赖。新增符号请在此定义并由 index.ts 转发。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { SOLAR_TERMS, FESTIVALS } from './data'
import type { Season, SeasonalRitual, Ritual, LifeRitual, SeasonalStats } from './types'

/** 存储键名 */
const SR_KEY = 'hf:seasonal_rituals'
const R_KEY = 'hf:rituals'
const LR_KEY = 'hf:life_rituals'

// ==================== 四季仪式 ====================

/** 加载四季仪式 */
function loadRituals(): SeasonalRitual[] {
  try {
    return storage.getKV<SeasonalRitual[]>(SR_KEY, [])
  } catch {
    return []
  }
}

/** 保存四季仪式 */
function saveRituals(rituals: SeasonalRitual[]): void {
  storage.setKV(SR_KEY, rituals)
}

/** 创建反应式仪式列表 */
export function useSeasonalRituals() {
  const rituals = ref<SeasonalRitual[]>(loadRituals())
  const activeSeason = ref<Season>('spring')

  /** 按季节筛选 */
  function seasonRituals(season: Season): SeasonalRitual[] {
    return rituals.value.filter(r => r.season === season)
  }

  /** 当前季节仪式 */
  const currentSeasonRituals = computed(() => seasonRituals(activeSeason.value))

  /** 添加仪式 */
  function addRitual(name: string, season: Season, description: string): void {
    if (!name.trim()) return
    const newRitual: SeasonalRitual = {
      id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      season,
      description: description.trim(),
      count: 0,
      lastCompletedAt: null,
      createdAt: new Date().toISOString(),
    }
    rituals.value.unshift(newRitual)
    saveRituals(rituals.value)
  }

  /** 完成仪式 */
  function completeRitual(id: string): void {
    const ritual = rituals.value.find(r => r.id === id)
    if (!ritual) return
    ritual.count += 1
    ritual.lastCompletedAt = new Date().toISOString()
    saveRituals(rituals.value)
  }

  /** 删除仪式 */
  function deleteRitual(id: string): void {
    rituals.value = rituals.value.filter(r => r.id !== id)
    saveRituals(rituals.value)
  }

  /** 连续打卡天数 */
  function calcStreak(): number {
    const dates = rituals.value
      .filter(r => r.lastCompletedAt !== null)
      .map(r => {
        const d = new Date(r.lastCompletedAt!)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })
    const uniqueDates = [...new Set(dates)].sort().reverse()
    if (uniqueDates.length === 0) return 0
    let streak = 0
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    const startIdx = uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr ? 0 : -1
    if (startIdx === -1) return 0
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = new Date(uniqueDates[i])
      const next = new Date(uniqueDates[i + 1])
      const diff = (current.getTime() - next.getTime()) / 86400000
      if (Math.round(diff) === 1) streak++
      else break
    }
    return streak + 1
  }

  /** 统计概览 */
  const stats = computed<SeasonalStats>(() => {
    const total = rituals.value.length
    const active = rituals.value.filter(r => r.count > 0).length
    const thisYear = rituals.value.reduce((sum, r) => {
      if (r.lastCompletedAt) {
        const year = new Date(r.lastCompletedAt).getFullYear()
        if (year === new Date().getFullYear()) return sum + r.count
      }
      return sum
    }, 0)
    const streak = calcStreak()
    return { total, thisYear, active, streak }
  })

  return {
    rituals,
    activeSeason,
    seasonRituals,
    currentSeasonRituals,
    addRitual,
    completeRitual,
    deleteRitual,
    calcStreak,
    stats,
  }
}

// ==================== 私人仪式 ====================

function loadRitualLegacy(key: string): Ritual[] {
  try { return storage.getKV<Ritual[]>(key, []) } catch { return [] }
}
function saveRitualLegacy(key: string, v: Ritual[]): void {
  storage.setKV(key, v)
}

export function usePrivateRituals() {
  const rituals = ref<Ritual[]>(loadRitualLegacy(R_KEY))
  const lifeRituals = ref<LifeRitual[]>(loadRitualLegacy(LR_KEY) as LifeRitual[])

  function addRitual(name: string, date: string) {
    rituals.value.unshift({ id: `rt${Date.now()}`, name, date, note: '', icon: '🕯' })
    saveRitualLegacy(R_KEY, rituals.value)
  }

  function editRitual(id: string, note: string) {
    const r = rituals.value.find(r => r.id === id)
    if (r) { r.note = note; saveRitualLegacy(R_KEY, rituals.value) }
  }

  function removeRitual(id: string) {
    rituals.value = rituals.value.filter(r => r.id !== id)
    saveRitualLegacy(R_KEY, rituals.value)
  }

  function addLifeRitual(type: string, date: string, note: string) {
    const icons: Record<string, string> = {
      '诞生': '👶', '成人礼': '🎓', '毕业': '📜',
      '婚礼': '💒', '葬礼': '🕊', 'other': '✨',
    }
    lifeRituals.value.unshift({
      id: `lr${Date.now()}`, name: type, date, note,
      icon: icons[type] || '✨', type,
    })
    saveRitualLegacy(LR_KEY, lifeRituals.value as any)
  }

  function removeLifeRitual(id: string) {
    lifeRituals.value = lifeRituals.value.filter(r => r.id !== id)
    saveRitualLegacy(LR_KEY, lifeRituals.value as any)
  }

  function completeLifeRitual(id: string): void {
    const ritual = lifeRituals.value.find(r => r.id === id)
    if (!ritual) return
    ritual.done = true
    saveRitualLegacy(LR_KEY, lifeRituals.value as any)
  }

  return { rituals, lifeRituals, addRitual, editRitual, removeRitual, addLifeRitual, removeLifeRitual, completeLifeRitual }
}

// ==================== 节气/节日工具函数 ====================

export function useSolarTerms() {
  const now = new Date()
  const m = now.getMonth() + 1
  const d = now.getDate()

  /** 当前节气（最近的一个） */
  const currentTerm = computed(() => {
    let c = SOLAR_TERMS[0], min = 365
    for (const t of SOLAR_TERMS) {
      const diff = Math.abs((t.month - m) * 30 + (t.day - d))
      if (diff < min) { min = diff; c = t }
    }
    return c
  })

  /** 下一个节气 */
  const upcomingTerm = computed(() => {
    const idx = SOLAR_TERMS.indexOf(currentTerm.value)
    return SOLAR_TERMS[(idx + 1) % SOLAR_TERMS.length]
  })

  /** 最近的传统节日 */
  const upcomingFestivals = computed(() =>
    FESTIVALS
      .filter(f => f.month > m || (f.month === m && f.day >= d))
      .sort((a, b) => (a.month - m) * 30 + a.day - (b.month - m) * 30 - b.day)
      .slice(0, 3)
      .map(f => ({ ...f, date: `${f.month}月${f.day}日` }))
  )

  /** 节气在环上的位置 */
  function nodeAngle(term: typeof SOLAR_TERMS[0]) {
    const idx = SOLAR_TERMS.indexOf(term)
    const angle = (idx / SOLAR_TERMS.length) * 360 - 90
    return { transform: `rotate(${angle}deg) translate(90px) rotate(${-angle}deg)` }
  }

  /** 格式化日期（月/日） */
  function formatDate(iso: string): string {
    const date = new Date(iso)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return {
    currentTerm,
    upcomingTerm,
    upcomingFestivals,
    nodeAngle,
    formatDate,
  }
}
