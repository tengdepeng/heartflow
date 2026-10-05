// ============================================================
// 动律之间 · 记录转换层
// 将房间表单的 Move（hf:moves_v2）转换为分析引擎所需的
// MovementRecord[]，并推导 MovementRhythm，供运动分析/
// 成就/节奏分析等引擎消费。
// ============================================================

import type { Move } from './movement-log'
import type { MovementRecord, MovementType, MovementIntensity, MovementRhythm } from './types'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META } from './types'

/** 房间表单类型键 → MovementType */
const TYPE_MAP: Record<string, MovementType> = {
  run: 'running',
  swim: 'swimming',
  bike: 'cycling',
  yoga: 'yoga',
  hike: 'walking',
  gym: 'strength',
  dance: 'dance',
  climb: 'custom',
  other: 'custom',
}

/** 房间表单类型键 → 默认强度 */
const INTENSITY_MAP: Record<string, MovementIntensity> = {
  run: 'moderate',
  swim: 'moderate',
  bike: 'moderate',
  yoga: 'light',
  hike: 'moderate',
  gym: 'vigorous',
  dance: 'moderate',
  climb: 'vigorous',
  other: 'moderate',
}

/** 本地时区日期字符串（YYYY-MM-DD） */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 单条 Move → MovementRecord */
export function moveToRecord(move: Move): MovementRecord {
  const type = TYPE_MAP[move.type] ?? 'custom'
  const intensity = INTENSITY_MAP[move.type] ?? 'moderate'
  const meta = MOVEMENT_TYPE_META[type]
  const calories = Math.round(move.duration * meta.avgCaloriesPerMin * MOVEMENT_INTENSITY_META[intensity].multiplier)
  return {
    id: move.id,
    type,
    duration: move.duration,
    intensity,
    calories,
    note: move.note,
    // 日键必须用本地日历日（与下方 localDateStr 的边界键、以及
    // home/today-room-stats 的读取口径一致）。
    // 原写法 move.at.slice(0, 10) 切的是 UTC 日期，东八区 00:00-08:00 的
    // 运动记录会被标成前一天，「今日运动」因而恒为 0。
    date: localDateStr(new Date(move.at)),
    timestamp: move.at,
  }
}

/** Move[] → MovementRecord[] */
export function movesToRecords(moves: Move[]): MovementRecord[] {
  return moves.map(moveToRecord)
}

/** 计算连续运动天数（含今天） */
function calcStreak(records: MovementRecord[]): number {
  const dates = new Set(records.map(r => r.date))
  const today = new Date()
  let streak = 0
  for (let i = 0; ; i++) {
    const expected = localDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i))
    if (dates.has(expected)) streak++
    else break
  }
  return streak
}

/** 计算最长连续运动天数 */
function calcBestStreak(records: MovementRecord[]): number {
  const dates = [...new Set(records.map(r => r.date))].sort()
  let best = 0
  let cur = 0
  let prev: number | null = null
  for (const d of dates) {
    const t = new Date(d + 'T00:00:00').getTime()
    if (prev !== null && t - prev === 86400000) cur++
    else cur = 1
    if (cur > best) best = cur
    prev = t
  }
  return best
}

/** 从 MovementRecord[] 推导 MovementRhythm（供分析引擎消费） */
export function deriveRhythm(records: MovementRecord[]): MovementRhythm {
  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const weekStartStr = localDateStr(weekStart)
  const weeklyCompleted = records
    .filter(r => r.date >= weekStartStr)
    .reduce((s, r) => s + r.duration, 0)

  const typeCounts: Record<string, number> = {}
  for (const r of records) {
    typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1
  }
  const favoriteTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t as MovementType)

  const streak = calcStreak(records)
  const bestStreak = calcBestStreak(records)

  return {
    weeklyTarget: 150,
    weeklyCompleted,
    streak,
    bestStreak,
    favoriteTypes,
    bodyAwakening: Math.min(100, weeklyCompleted * 0.5 + streak * 5),
  }
}
