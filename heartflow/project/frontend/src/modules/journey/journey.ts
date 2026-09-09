// ============================================================
// 地图室 · 旅程引擎（全球街景 / 元地球 Earth 启发）
// ------------------------------------------------------------
// 借鉴「足迹回溯 / 路线回顾」：把足迹按时间串成一段段旅程，
// 计算旅程跨度、出行路段与出行节奏统计。全部本地计算，
// 守宪法第1条本地私有 / 拒绝轨迹分享。
// 纯函数核心（可单测）+ 轻量持久化，供 JourneyPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { FootprintRecord } from '../footprint/footprint'

// ============================================================
// 类型
// ============================================================

/** 一段旅程（由连续足迹聚类而成） */
export interface Journey {
  id: string
  startDate: string
  endDate: string
  /** 覆盖地区（去重） */
  regions: string[]
  /** 途经站数 */
  stops: number
  /** 旅途总天数（含头尾） */
  spanDays: number
}

export interface JourneyStats {
  /** 旅程数 */
  total: number
  /** 总覆盖天数 */
  totalDays: number
  /** 平均时长（天） */
  avgDays: number
  /** 最长旅程（天） */
  longestDays: number
}

export interface JourneyConfig {
  /** 两次足迹间隔超过该天数则视为新旅程 */
  maxGapDays: number
}

export const DEFAULT_JOURNEY_CONFIG: JourneyConfig = { maxGapDays: 45 }

const STORAGE_KEY = 'hf:journey_config'

// ============================================================
// 纯函数核心
// ============================================================

function dayDiff(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.round((db - da) / 86400000)
}

function daySpan(start: string, end: string): number {
  return dayDiff(start, end) + 1
}

/** 判断两次足迹是否属于同一旅程（间隔是否超阈值） */
export function isNewJourney(a: FootprintRecord, b: FootprintRecord, maxGapDays: number): boolean {
  const gap = dayDiff(a.date, b.date)
  const regionChanged = a.region !== b.region
  return gap > maxGapDays || regionChanged
}

/** 将按日期升序排列的足迹聚类为旅程段 */
export function buildJourneys(sorted: FootprintRecord[], maxGapDays: number): Journey[] {
  if (sorted.length === 0) return []
  const journeys: Journey[] = []
  let current: FootprintRecord[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (isNewJourney(prev, cur, maxGapDays)) {
      journeys.push(toJourney(current))
      current = [cur]
    } else {
      current.push(cur)
    }
  }
  journeys.push(toJourney(current))
  return journeys
}

function toJourney(stops: FootprintRecord[]): Journey {
  const sorted = stops.slice().sort((a, b) => a.date.localeCompare(b.date))
  return {
    id: `j_${Math.random().toString(36).slice(2, 8)}`,
    startDate: sorted[0].date,
    endDate: sorted[sorted.length - 1].date,
    regions: [...new Set(sorted.map((s) => s.region))],
    stops: sorted.length,
    spanDays: daySpan(sorted[0].date, sorted[sorted.length - 1].date),
  }
}

/** 旅程统计 */
export function computeJourneyStats(journeys: Journey[]): JourneyStats {
  if (journeys.length === 0) {
    return { total: 0, totalDays: 0, avgDays: 0, longestDays: 0 }
  }
  const totalDays = journeys.reduce((s, j) => s + j.spanDays, 0)
  return {
    total: journeys.length,
    totalDays,
    avgDays: Math.round(totalDays / journeys.length),
    longestDays: Math.max(...journeys.map((j) => j.spanDays)),
  }
}

/** 旅程近似地理跨度（不同地区数越多跨度越大，0-100） */
export function journeySpanScore(journey: Journey): number {
  return Math.min(100, Math.round(journey.regions.length * 20 + Math.min(journey.spanDays, 40) * 1.5))
}

/** 温和洞察（≤4条）：空足迹守候引导 / 旅程数+覆盖天数 / 最长旅程 / 最近旅程 / 地理跨度最广 */
export function journeyInsights(journeys: Journey[]): string[] {
  if (journeys.length === 0) {
    return ['足迹还空着。记下第一段行程，它会在这里串成一段旅程。']
  }
  const out: string[] = []
  const totalDays = journeys.reduce((s, j) => s + j.spanDays, 0)
  out.push(`已走过 ${journeys.length} 段旅程，足迹覆盖 ${totalDays} 天。`)
  const longest = journeys.reduce((a, b) => (b.spanDays > a.spanDays ? b : a), journeys[0])
  out.push(`最长的一段是「${longest.regions.join('、')}」，共 ${longest.spanDays} 天。`)
  const recent = journeys[journeys.length - 1]
  out.push(`最近旅程：${recent.startDate} → ${recent.endDate}，途经 ${recent.regions.join('、')}。`)
  const widest = journeys.reduce((a, b) => (journeySpanScore(b) > journeySpanScore(a) ? b : a), journeys[0])
  out.push(`地理跨度最广：${widest.regions.join('、')}，跨度分 ${journeySpanScore(widest)}。`)
  return out.slice(0, 4)
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadConfig(): JourneyConfig {
  try {
    return { ...DEFAULT_JOURNEY_CONFIG, ...storage.getKV<Partial<JourneyConfig>>(STORAGE_KEY, {}) }
  } catch {
    return { ...DEFAULT_JOURNEY_CONFIG }
  }
}

export function useJourneyEngine() {
  const config = ref<JourneyConfig>(loadConfig())

  function setMaxGapDays(d: number): void {
    config.value.maxGapDays = Math.max(1, Math.min(365, Math.round(d)))
    storage.setKV(STORAGE_KEY, config.value)
  }

  function journeysFrom(records: FootprintRecord[]): Journey[] {
    const sorted = records.slice().sort((a, b) => a.date.localeCompare(b.date))
    return buildJourneys(sorted, config.value.maxGapDays)
  }

  return {
    config: computed(() => config.value),
    setMaxGapDays,
    journeysFrom,
    buildJourneys,
    computeJourneyStats,
    journeySpanScore,
    isNewJourney,
  }
}