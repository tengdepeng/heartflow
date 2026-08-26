// ============================================================
// 动律之间 · 律动引擎
// 运动追踪、身体律动、节奏管理
// ============================================================

import { ref, computed } from 'vue'
import type { MovementRecord, MovementType, MovementIntensity, MovementRhythm } from './types'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META, MOVEMENT_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

function generateId(): string {
  return `move_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 本地时区日期字符串（YYYY-MM-DD），与周统计等切分逻辑统一 */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function loadRecords(): MovementRecord[] {
  try { return JSON.parse(storage.getKV<string>(MOVEMENT_STORAGE_KEYS.records, '[]')) } catch { return [] }
}
function saveRecords(data: MovementRecord[]) { storage.setKV(MOVEMENT_STORAGE_KEYS.records, JSON.stringify(data)) }

/** 只读获取全部运动记录（供统一时间线聚合使用） */
export function getMovementRecords(): MovementRecord[] {
  return loadRecords()
}

function loadRhythm(): MovementRhythm {
  try { return JSON.parse(storage.getKV<string>(MOVEMENT_STORAGE_KEYS.rhythm, '{}')) } catch { return { weeklyTarget: 150, weeklyCompleted: 0, streak: 0, bestStreak: 0, favoriteTypes: [], bodyAwakening: 50 } }
}
function saveRhythm(data: MovementRhythm) { storage.setKV(MOVEMENT_STORAGE_KEYS.rhythm, JSON.stringify(data)) }

const records = ref<MovementRecord[]>(loadRecords())
const rhythm = ref<MovementRhythm>(loadRhythm())

export function useMovementRhythm() {
  // ---- 运动记录 ----
  function recordMovement(
    type: MovementType, duration: number, intensity: MovementIntensity,
    distance?: number, feeling?: string, note?: string,
  ): MovementRecord {
    const meta = MOVEMENT_TYPE_META[type]
    const intensityMeta = MOVEMENT_INTENSITY_META[intensity]
    const calories = Math.round(duration * meta.avgCaloriesPerMin * intensityMeta.multiplier)

    const now = new Date()
    const record: MovementRecord = {
      id: generateId(), type, duration, intensity, distance, calories, feeling, note,
      date: localDateStr(now), timestamp: now.toISOString(),
    }
    records.value = [...records.value, record]
    saveRecords(records.value)

    // 更新节奏
    updateRhythmAfterRecord()
    return record
  }

  function getWeeklyStats(): { totalMinutes: number; totalCalories: number; sessions: number; byType: Record<string, number> } {
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const weekStartStr = localDateStr(weekStart)
    const weekly = records.value.filter(r => r.date >= weekStartStr)
    const byType: Record<string, number> = {}
    for (const r of weekly) {
      byType[r.type] = (byType[r.type] ?? 0) + 1
    }
    return {
      totalMinutes: weekly.reduce((s, r) => s + r.duration, 0),
      totalCalories: weekly.reduce((s, r) => s + (r.calories ?? 0), 0),
      sessions: weekly.length,
      byType,
    }
  }

  function getRecentRecords(limit = 20): MovementRecord[] {
    return [...records.value].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit)
  }

  // ---- 节奏管理 ----
  function updateRhythmAfterRecord(): void {
    const weekly = getWeeklyStats()
    rhythm.value.weeklyCompleted = weekly.totalMinutes
    rhythm.value.streak = calculateMovementStreak(records.value)
    rhythm.value.bestStreak = Math.max(rhythm.value.bestStreak, rhythm.value.streak)

    const typeCounts: Record<string, number> = {}
    for (const r of records.value) {
      typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1
    }
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
    rhythm.value.favoriteTypes = sorted.slice(0, 3).map(([t]) => t as MovementType)

    rhythm.value.bodyAwakening = Math.min(100, weekly.totalMinutes * 0.5 + rhythm.value.streak * 5)
    saveRhythm(rhythm.value)
  }

  function updateRhythmTarget(weeklyTarget: number): void {
    rhythm.value.weeklyTarget = weeklyTarget
    saveRhythm(rhythm.value)
  }

  const rhythmState = computed<MovementRhythm>(() => {
    const weekly = getWeeklyStats()
    return {
      ...rhythm.value,
      weeklyCompleted: weekly.totalMinutes,
    }
  })

  function removeRecord(id: string): boolean {
    const idx = records.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    records.value = records.value.filter(r => r.id !== id)
    saveRecords(records.value)
    updateRhythmAfterRecord()
    return true
  }

  return {
    records, rhythm: rhythmState,
    recordMovement, getWeeklyStats, getRecentRecords,
    updateRhythmTarget, removeRecord,
  }
}

// ---- 辅助 ----
function calculateMovementStreak(records: MovementRecord[]): number {
  const dates = new Set(records.map(r => r.date))
  const sorted = [...dates].sort().reverse()
  let streak = 0
  const today = new Date()
  for (let i = 0; i < sorted.length; i++) {
    const expected = localDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i))
    if (sorted[i] === expected) streak++
    else break
  }
  return streak
}