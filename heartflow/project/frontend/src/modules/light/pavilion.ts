// ============================================================
// 留光阁 · 阁楼引擎
// 冥想追踪、释怀仪式、澄明状态
// ============================================================

import { ref, computed } from 'vue'
import type { MeditationRecord, MeditationType, ReleaseEntry, ClarityLevel, LightState } from './types'
import { LIGHT_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

function generateId(): string {
  return `light_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadMeditations(): MeditationRecord[] {
  try { return JSON.parse(storage.getKV<string>(LIGHT_STORAGE_KEYS.meditations, '[]')) } catch { return [] }
}
function saveMeditations(data: MeditationRecord[]) { storage.setKV(LIGHT_STORAGE_KEYS.meditations, JSON.stringify(data)) }

function loadReleases(): ReleaseEntry[] {
  try { return JSON.parse(storage.getKV<string>(LIGHT_STORAGE_KEYS.releases, '[]')) } catch { return [] }
}
function saveReleases(data: ReleaseEntry[]) { storage.setKV(LIGHT_STORAGE_KEYS.releases, JSON.stringify(data)) }

const meditations = ref<MeditationRecord[]>(loadMeditations())
const releases = ref<ReleaseEntry[]>(loadReleases())

function todayStr(): string { return getLocalDateKey() }

export function useLightPavilion() {
  // ---- 冥想追踪 ----
  function recordMeditation(
    type: MeditationType, duration: number,
    stateBefore: string, stateAfter: string, insight?: string,
  ): MeditationRecord {
    const now = new Date()
    const record: MeditationRecord = {
      id: generateId(), type, duration, stateBefore, stateAfter, insight,
      date: getLocalDateKey(now), timestamp: now.toISOString(),
    }
    meditations.value = [...meditations.value, record]
    saveMeditations(meditations.value)
    return record
  }

  function getMeditationStats(): {
    totalMinutes: number; totalSessions: number; streak: number
    favoriteType: MeditationType; weeklyAvg: number
  } {
    const totalMinutes = meditations.value.reduce((s, m) => s + m.duration, 0)
    const typeCounts: Record<string, number> = {}
    for (const m of meditations.value) {
      typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1
    }
    let favoriteType: MeditationType = 'breath'
    let maxCount = 0
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) { maxCount = count; favoriteType = type as MeditationType }
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekly = meditations.value.filter(m => new Date(m.timestamp) >= weekAgo)
    const weeklyAvg = weekly.length > 0 ? Math.round(weekly.reduce((s, m) => s + m.duration, 0) / 7) : 0

    return {
      totalMinutes, totalSessions: meditations.value.length,
      streak: calculateMeditationStreak(meditations.value),
      favoriteType, weeklyAvg,
    }
  }

  function getRecentMeditations(limit = 10): MeditationRecord[] {
    return [...meditations.value].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit)
  }

  /** 获取最近的释怀记录 */
  function getRecentReleases(limit = 10): ReleaseEntry[] {
    return [...releases.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
  }

  // ---- 归档（第34条：允许遗忘，归档而非删除） ----
  function setMeditationArchived(id: string, archived: boolean): boolean {
    const record = meditations.value.find(m => m.id === id)
    if (!record) return false
    record.archived = archived
    meditations.value = [...meditations.value]
    saveMeditations(meditations.value)
    return true
  }

  function setReleaseArchived(id: string, archived: boolean): boolean {
    const entry = releases.value.find(r => r.id === id)
    if (!entry) return false
    entry.archived = archived
    releases.value = [...releases.value]
    saveReleases(releases.value)
    return true
  }

  function archiveMeditation(id: string): boolean { return setMeditationArchived(id, true) }
  function restoreMeditation(id: string): boolean { return setMeditationArchived(id, false) }
  function archiveRelease(id: string): boolean { return setReleaseArchived(id, true) }
  function restoreRelease(id: string): boolean { return setReleaseArchived(id, false) }

  // ---- 释怀仪式 ----
  function release(
    content: string,
    method: 'write' | 'burn' | 'float' | 'bury' | 'transform',
    feelingAfter?: string,
  ): ReleaseEntry {
    const entry: ReleaseEntry = {
      id: generateId(), content, method, feelingAfter, released: true, date: todayStr(),
    }
    releases.value = [...releases.value, entry]
    saveReleases(releases.value)
    return entry
  }

  function getReleaseStats(): { total: number; thisMonth: number; byMethod: Record<string, number> } {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const byMethod: Record<string, number> = {}
    for (const r of releases.value) {
      byMethod[r.method] = (byMethod[r.method] ?? 0) + 1
    }
    return {
      total: releases.value.length,
      thisMonth: releases.value.filter(r => new Date(r.date) >= monthStart).length,
      byMethod,
    }
  }

  // ---- 澄明状态 ----
  const lightState = computed<LightState>(() => {
    const stats = getMeditationStats()
    const clarity = estimateClarity(stats.totalMinutes, releases.value.length)
    return {
      clarity,
      totalMeditationMinutes: stats.totalMinutes,
      releaseCount: releases.value.length,
      meditationStreak: stats.streak,
      lightIntensity: Math.min(100, stats.totalMinutes * 0.1 + releases.value.length * 2),
    }
  })

  /** 未归档冥想（主视图使用） */
  const activeMeditations = computed(() => meditations.value.filter(m => !m.archived))
  /** 未归档释怀（主视图使用） */
  const activeReleases = computed(() => releases.value.filter(r => !r.archived))
  /** 已归档冥想 */
  const archivedMeditations = computed(() => meditations.value.filter(m => m.archived))
  /** 已归档释怀 */
  const archivedReleases = computed(() => releases.value.filter(r => r.archived))

  return {
    meditations, releases, lightState,
    activeMeditations, activeReleases, archivedMeditations, archivedReleases,
    recordMeditation, getMeditationStats, getRecentMeditations, getRecentReleases,
    release, getReleaseStats,
    archiveMeditation, restoreMeditation, archiveRelease, restoreRelease,
  }
}

// ---- 辅助 ----
function calculateMeditationStreak(records: MeditationRecord[]): number {
  const dates = new Set(records.map(r => r.date))
  const sorted = [...dates].sort().reverse()
  let streak = 0
  const today = new Date()
  for (let i = 0; i < sorted.length; i++) {
    const expected = getLocalDateKey(new Date(today.getTime() - i * 86400000))
    if (sorted[i] === expected) streak++
    else break
  }
  return streak
}

function estimateClarity(totalMinutes: number, releaseCount: number): ClarityLevel {
  const score = Math.min(100, totalMinutes * 0.05 + releaseCount * 5)
  if (score >= 90) return 'crystal'
  if (score >= 70) return 'clear'
  if (score >= 50) return 'neutral'
  if (score >= 30) return 'unclear'
  return 'clouded'
}