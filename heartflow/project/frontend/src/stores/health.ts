// ============================================================
// 健康数据 · Pinia Store
// 统一管理身体温室、藏象阁、守卫室的身体/健康数据
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'

// ---- 类型定义 ----

export interface BodyLog {
  id: string
  type: 'sleep' | 'exercise' | 'meal' | 'cycle'
  value: Record<string, any>
  at: string
}

export interface CycleRecord {
  lastStart: string
  lastDuration: number
  history: { start: string; duration: number }[]
}

export interface MeridianLog {
  hour: number
  feeling: string
  at: string
  organ?: string
  name?: string
  date?: string
}

export interface WisdomLog {
  id: string
  content: string
  at: string
  mood?: string
  insight?: string
}

export interface ReadingLog {
  id: string
  title: string
  note: string
  at: string
  sutraName?: string
  startTime?: string
  endTime?: string
  duration?: number
  excerpt?: string
}

export interface GuardHeartRateLog {
  id: string
  bpm: number
  at: string
}

// ---- 存储键 ----

const BODY_LOGS_KEY = 'hf:body_logs'
const CYCLE_KEY = 'hf:cycle_data'
const BODY_NOTES_KEY = 'hf:body_notes'
const SENSE_NOTES_KEY = 'hf:sense_notes'
const SUTRA_NOTES_KEY = 'hf:sutra_notes'
const MERIDIAN_KEY = 'hf:meridian_logs'
const WISDOM_KEY = 'hf:wisdom_logs'
const READING_KEY = 'hf:reading_logs'
const GUARD_HR_KEY = 'hf:heart_rate_logs'

// ---- 加载辅助函数 ----

function loadKV<T>(key: string, fallback: T): T {
  try { return storage.getKV<T>(key, fallback) } catch { return fallback }
}

function saveKV<T>(key: string, value: T) {
  storage.setKV(key, value)
}

export const useHealthStore = defineStore('health', () => {
  // ---- 身体日志（温室） ----
  const bodyLogs = ref<BodyLog[]>(loadKV(BODY_LOGS_KEY, []))

  function persistBodyLogs() { saveKV(BODY_LOGS_KEY, bodyLogs.value) }

  function addBodyLog(type: BodyLog['type'], value: Record<string, any>) {
    bodyLogs.value.unshift({ id: `bl_${Date.now()}`, type, value, at: new Date().toISOString() })
    persistBodyLogs()
  }

  // ---- 周期记录 ----
  const cycleData = ref<CycleRecord>(loadKV(CYCLE_KEY, { lastStart: '', lastDuration: 5, history: [] }))

  function persistCycle() { saveKV(CYCLE_KEY, cycleData.value) }

  function logCycle(start: string, duration: number) {
    cycleData.value.lastStart = start
    cycleData.value.lastDuration = duration
    cycleData.value.history.push({ start, duration })
    persistCycle()
    addBodyLog('cycle', { start, duration })
  }

  // ---- 身体笔记（藏象阁） ----
  const bodyNotes = ref<string[]>(loadKV(BODY_NOTES_KEY, []))
  const senseNotes = ref<string[]>(loadKV(SENSE_NOTES_KEY, []))
  const sutraNotes = ref<string[]>(loadKV(SUTRA_NOTES_KEY, []))

  function persistNotes() {
    saveKV(BODY_NOTES_KEY, bodyNotes.value)
    saveKV(SENSE_NOTES_KEY, senseNotes.value)
    saveKV(SUTRA_NOTES_KEY, sutraNotes.value)
  }

  function addBodyNote(note: string) { bodyNotes.value.unshift(note); persistNotes() }
  function addSenseNote(note: string) { senseNotes.value.unshift(note); persistNotes() }
  function addSutraNote(note: string) { sutraNotes.value.unshift(note); persistNotes() }

  // ---- 经络记录（藏象阁） ----
  const meridianLogs = ref<MeridianLog[]>(loadKV(MERIDIAN_KEY, []))

  function persistMeridianLogs() { saveKV(MERIDIAN_KEY, meridianLogs.value) }

  function recordMeridianFeeling(hour: number, feeling: string, extra?: { organ?: string; name?: string }) {
    const today = new Date().toISOString().slice(0, 10)
    // 更新同一天同时辰的已有记录
    const idx = meridianLogs.value.findIndex(m => m.hour === hour && m.date === today)
    const entry: MeridianLog = { hour, feeling, at: new Date().toISOString(), date: today, ...extra }
    if (idx >= 0) meridianLogs.value[idx] = entry
    else meridianLogs.value.unshift(entry)
    persistMeridianLogs()
  }

  function getMeridianFeeling(hour: number, date?: string): string | undefined {
    const targetDate = date || new Date().toISOString().slice(0, 10)
    return meridianLogs.value.find(m => m.hour === hour && m.date === targetDate)?.feeling
  }

  // ---- 心境记录（藏象阁） ----
  const wisdomLogs = ref<WisdomLog[]>(loadKV(WISDOM_KEY, []))

  function persistWisdomLogs() { saveKV(WISDOM_KEY, wisdomLogs.value) }

  function addWisdomLog(content: string, extra?: { mood?: string; insight?: string }) {
    wisdomLogs.value.unshift({ id: `wl_${Date.now()}`, content, at: new Date().toISOString(), ...extra })
    persistWisdomLogs()
  }

  // ---- 阅读记录（藏象阁） ----
  const readingLogs = ref<ReadingLog[]>(loadKV(READING_KEY, []))

  function persistReadingLogs() { saveKV(READING_KEY, readingLogs.value) }

  function addReadingLog(title: string, note: string, extra?: { sutraName?: string; startTime?: string; endTime?: string; duration?: number; excerpt?: string }) {
    readingLogs.value.unshift({ id: `rl_${Date.now()}`, title, note, at: new Date().toISOString(), ...extra })
    persistReadingLogs()
  }

  function removeReadingLog(id: string) {
    readingLogs.value = readingLogs.value.filter(r => r.id !== id)
    persistReadingLogs()
  }

  // ---- 守卫室心率数据 ----
  const guardHeartRateLogs = ref<GuardHeartRateLog[]>(loadKV(GUARD_HR_KEY, []))

  function addGuardHeartRateLog(bpm: number) {
    guardHeartRateLogs.value.unshift({ id: `ghr_${Date.now()}`, bpm, at: new Date().toISOString() })
    if (guardHeartRateLogs.value.length > 100) guardHeartRateLogs.value = guardHeartRateLogs.value.slice(0, 100)
    saveKV(GUARD_HR_KEY, guardHeartRateLogs.value)
  }

  // ---- 计算属性 ----

  /** 本周运动总分钟数 */
  const thisWeekExerciseMinutes = computed(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return bodyLogs.value
      .filter(l => l.type === 'exercise' && new Date(l.at) >= weekStart)
      .reduce((sum, l) => sum + (l.value.minutes || 0), 0)
  })

  /** 本周平均睡眠 */
  const thisWeekSleepAvg = computed(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const sleepLogs = bodyLogs.value.filter(l => l.type === 'sleep' && new Date(l.at) >= weekStart)
    if (sleepLogs.length === 0) return 0
    return sleepLogs.reduce((sum, l) => sum + (l.value.hours || 0), 0) / sleepLogs.length
  })

  /** 最近 N 条日志 */
  function recentLogs(n: number = 10): BodyLog[] {
    return bodyLogs.value.slice(0, n)
  }

  return {
    // 身体日志
    bodyLogs,
    addBodyLog,
    persistBodyLogs,
    // 周期
    cycleData,
    logCycle,
    persistCycle,
    // 笔记
    bodyNotes,
    senseNotes,
    sutraNotes,
    addBodyNote,
    addSenseNote,
    addSutraNote,
    // 经络
    meridianLogs,
    recordMeridianFeeling,
    getMeridianFeeling,
    // 心境
    wisdomLogs,
    addWisdomLog,
    // 阅读
    readingLogs,
    addReadingLog,
    removeReadingLog,
    persistReadingLogs,
    // 守卫室
    guardHeartRateLogs,
    addGuardHeartRateLog,
    // 计算属性
    thisWeekExerciseMinutes,
    thisWeekSleepAvg,
    recentLogs,
  }
})