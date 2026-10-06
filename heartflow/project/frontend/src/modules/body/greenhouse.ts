// ============================================================
// 身体温室 · 温室引擎
// 健康追踪、身体指标、睡眠、能量管理
// ============================================================

import { ref, computed } from 'vue'
import type { BodyMetric, BodyMetricType, SleepRecord, EnergyLevel, BodyGreenhouseState } from './types'
import { BODY_METRIC_META, BODY_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

function generateId(): string {
  return `body_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadMetrics(): BodyMetric[] {
  try { return JSON.parse(storage.getKV<string>(BODY_STORAGE_KEYS.metrics, '[]')) } catch { return [] }
}
function saveMetrics(data: BodyMetric[]) { storage.setKV(BODY_STORAGE_KEYS.metrics, JSON.stringify(data)) }

function loadSleep(): SleepRecord[] {
  try { return JSON.parse(storage.getKV<string>(BODY_STORAGE_KEYS.sleep, '[]')) } catch { return [] }
}
function saveSleep(data: SleepRecord[]) { storage.setKV(BODY_STORAGE_KEYS.sleep, JSON.stringify(data)) }

const metrics = ref<BodyMetric[]>(loadMetrics())
const sleepRecords = ref<SleepRecord[]>(loadSleep())

export function useBodyGreenhouse() {
  // ---- 身体指标 ----
  function addMetric(type: BodyMetricType, value: number, note?: string): BodyMetric {
    const meta = BODY_METRIC_META[type]
    const now = new Date()
    const metric: BodyMetric = {
      id: generateId(), type, value, unit: meta.unit, note,
      timestamp: now.toISOString(), date: getLocalDateKey(now),
    }
    metrics.value = [...metrics.value, metric]
    saveMetrics(metrics.value)
    return metric
  }

  function getMetricsByType(type: BodyMetricType, limit = 30): BodyMetric[] {
    return metrics.value.filter(m => m.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  function getTodayMetrics(): BodyMetric[] {
    const today = getLocalDateKey(new Date())
    return metrics.value.filter(m => m.date === today)
  }

  // ---- 睡眠追踪 ----
  function addSleep(sleepAt: string, wakeAt: string, quality: number, dreamNote?: string): SleepRecord {
    const sleep = new Date(sleepAt)
    const wake = new Date(wakeAt)
    const duration = Math.round((wake.getTime() - sleep.getTime()) / 60000)
    const record: SleepRecord = {
      id: generateId(), sleepAt, wakeAt, duration, quality, dreamNote,
      date: getLocalDateKey(sleep),
    }
    sleepRecords.value = [...sleepRecords.value, record]
    saveSleep(sleepRecords.value)
    return record
  }

  function getSleepAvg7d(): number {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recent = sleepRecords.value.filter(s => new Date(s.date) >= weekAgo)
    return recent.length > 0 ? Math.round(recent.reduce((s, r) => s + r.duration, 0) / recent.length) : 0
  }

  function getSleepQualityAvg7d(): number {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recent = sleepRecords.value.filter(s => new Date(s.date) >= weekAgo)
    return recent.length > 0 ? Math.round(recent.reduce((s, r) => s + r.quality, 0) / recent.length * 10) / 10 : 0
  }

  // ---- 能量评估 ----
  function estimateEnergyLevel(): EnergyLevel {
    const sleepAvg = getSleepAvg7d()
    const today = getLocalDateKey(new Date())
    const exerciseToday = metrics.value.filter(m => m.type === 'exercise' && m.date === today)
    const exerciseMinutes = exerciseToday.reduce((s, m) => s + m.value, 0)

    if (sleepAvg >= 480 && exerciseMinutes >= 30) return 'peak'
    if (sleepAvg >= 420) return 'high'
    if (sleepAvg >= 360) return 'moderate'
    if (sleepAvg >= 300) return 'low'
    return 'depleted'
  }

  // ---- 温室状态 ----
  const greenhouseState = computed<BodyGreenhouseState>(() => {
    const sleepAvg = getSleepAvg7d()
    const today = getLocalDateKey(new Date())
    const exerciseThisWeek = metrics.value.filter(m => {
      if (m.type !== 'exercise') return false
      const d = new Date(m.date)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    }).length
    const waterToday = metrics.value.filter(m => m.type === 'water' && m.date === today)
      .reduce((s, m) => s + m.value, 0)

    const sleepScore = Math.min(100, Math.round((sleepAvg / 480) * 50))
    const exerciseScore = Math.min(30, exerciseThisWeek * 10)
    const waterScore = Math.min(20, waterToday * 2.5)
    const bodyScore = Math.min(100, sleepScore + exerciseScore + waterScore)

    const plantHealth = bodyScore // 植物健康度与身体评分同步

    return {
      energy: estimateEnergyLevel(),
      sleepAvg7d: Math.round(sleepAvg / 60 * 10) / 10,
      exerciseFrequency: exerciseThisWeek,
      waterIntake: waterToday,
      bodyScore,
      plantHealth,
    }
  })

  function removeMetric(id: string): boolean {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return false
    metrics.value = metrics.value.filter(m => m.id !== id)
    saveMetrics(metrics.value)
    return true
  }

  function removeSleep(id: string): boolean {
    const idx = sleepRecords.value.findIndex(s => s.id === id)
    if (idx === -1) return false
    sleepRecords.value = sleepRecords.value.filter(s => s.id !== id)
    saveSleep(sleepRecords.value)
    return true
  }

  return {
    metrics,
    sleepRecords,
    greenhouseState,
    addMetric,
    getMetricsByType,
    getTodayMetrics,
    addSleep,
    getSleepAvg7d,
    getSleepQualityAvg7d,
    estimateEnergyLevel,
    removeMetric,
    removeSleep,
  }
}