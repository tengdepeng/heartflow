// ============================================================
// 动律之间 · 运动档案分析引擎（档案陈列，纯函数 + now 可测）
// 把身体的一次次律动，拢成一册安放；只呈现，不评判。
// ============================================================

import { getLocalMonthKey } from '../../utils/time'
import type { Move } from './movement-log'

// ============================================================
// 类型元数据（与视图 form 的类型键一致）
// ============================================================

export const MOVE_ARCHIVE_TYPE_META: Record<string, { icon: string; label: string }> = {
  run: { icon: '🏃', label: '跑步' },
  swim: { icon: '🏊', label: '游泳' },
  bike: { icon: '🚴', label: '骑行' },
  yoga: { icon: '🧘', label: '瑜伽' },
  hike: { icon: '🥾', label: '爬山' },
  gym: { icon: '🏋️', label: '力量' },
  dance: { icon: '💃', label: '跳舞' },
  climb: { icon: '🧗', label: '攀岩' },
  other: { icon: '💪', label: '其他' },
}

export function moveTypeLabel(t: string): string {
  return MOVE_ARCHIVE_TYPE_META[t]?.label || t || '运动'
}

export function moveTypeIcon(t: string): string {
  return MOVE_ARCHIVE_TYPE_META[t]?.icon || '💪'
}

// ============================================================
// 日期工具（本地时区，避免测试受真实日期漂移影响）
// ============================================================

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function localDateOfIso(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : localDateStr(d)
}

const DAY_MS = 24 * 60 * 60 * 1000

// ============================================================
// 1. 运动档案概览
// ============================================================

export interface MovementArchiveOverview {
  totalCount: number
  totalMinutes: number
  avgDuration: number
  weeklyCount: number
  weeklyMinutes: number
  monthlyCount: number
  monthlyMinutes: number
  recent30: number
  typeCount: number
  companionCount: number
  momentCount: number
  bestType: string
  longestMove: number
  firstDate: string
  lastDate: string
}

export function movementArchiveOverview(moves: Move[], now: Date): MovementArchiveOverview {
  const totalCount = moves.length
  const totalMinutes = moves.reduce((s, m) => s + (m.duration || 0), 0)
  const avgDuration = totalCount > 0 ? Math.round(totalMinutes / totalCount) : 0

  const weekStart = startOfDay(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const cutoff30 = new Date(now.getTime() - 30 * DAY_MS)

  let weeklyCount = 0
  let weeklyMinutes = 0
  let monthlyCount = 0
  let monthlyMinutes = 0
  let recent30 = 0

  const typeMap = new Map<string, number>()
  let bestType = ''
  let bestCount = 0

  const companions = new Set<string>()
  let momentCount = 0
  let longestMove = 0
  let firstTs = Infinity
  let lastTs = -Infinity

  for (const m of moves) {
    const ts = new Date(m.at).getTime()
    if (isNaN(ts)) continue
    const dur = m.duration || 0

    if (ts >= weekStart.getTime()) { weeklyCount++; weeklyMinutes += dur }
    if (ts >= monthStart.getTime()) { monthlyCount++; monthlyMinutes += dur }
    if (ts >= cutoff30.getTime()) recent30++

    typeMap.set(m.type, (typeMap.get(m.type) || 0) + 1)
    if (m.withWhom?.trim()) companions.add(m.withWhom.trim())
    if (m.isMoment) momentCount++
    if (dur > longestMove) longestMove = dur
    if (ts < firstTs) firstTs = ts
    if (ts > lastTs) lastTs = ts
  }

  for (const [t, c] of typeMap) {
    if (c > bestCount) { bestCount = c; bestType = t }
  }

  return {
    totalCount,
    totalMinutes,
    avgDuration,
    weeklyCount,
    weeklyMinutes,
    monthlyCount,
    monthlyMinutes,
    recent30,
    typeCount: typeMap.size,
    companionCount: companions.size,
    momentCount,
    bestType,
    longestMove,
    firstDate: totalCount > 0 ? new Date(firstTs).toISOString() : '',
    lastDate: totalCount > 0 ? new Date(lastTs).toISOString() : '',
  }
}

// ============================================================
// 2. 运动类型分布
// ============================================================

export interface MoveTypeRow {
  type: string
  icon: string
  label: string
  count: number
  duration: number
  percentage: number
}

export function moveTypeRows(moves: Move[]): MoveTypeRow[] {
  const map = new Map<string, { count: number; duration: number }>()
  for (const m of moves) {
    const e = map.get(m.type) || { count: 0, duration: 0 }
    e.count++
    e.duration += m.duration || 0
    map.set(m.type, e)
  }
  const total = moves.length
  return [...map.entries()]
    .map(([type, { count, duration }]) => ({
      type,
      icon: moveTypeIcon(type),
      label: moveTypeLabel(type),
      count,
      duration,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// 3. 运动节律
// ============================================================

export interface MovementRhythm {
  activeDays: number
  spanDays: number
  currentStreak: number
  bestStreak: number
  avgGapDays: number
  weeklyPace: number
  monthsTracked: number
}

export function movementRhythm(moves: Move[], now: Date): MovementRhythm {
  const dateSet = new Set<string>()
  for (const m of moves) {
    const s = localDateOfIso(m.at)
    if (s) dateSet.add(s)
  }

  const dates = [...dateSet].sort()
  const activeDays = dates.length

  let spanDays = 0
  if (dates.length > 0) {
    const first = new Date(dates[0] + 'T00:00:00').getTime()
    const last = new Date(dates[dates.length - 1] + 'T00:00:00').getTime()
    spanDays = Math.max(0, Math.round((last - first) / DAY_MS))
  }

  // 当前连续：优先从今天起算；今天没有则从昨天起算（今天仍视为连续进行中）
  let currentStreak = 0
  {
    const todayStr = localDateStr(now)
    let anchor = ''
    if (dateSet.has(todayStr)) {
      anchor = todayStr
    } else {
      const y = new Date(now.getTime() - DAY_MS)
      if (dateSet.has(localDateStr(y))) anchor = localDateStr(y)
    }
    if (anchor) {
      let cursor = new Date(anchor + 'T00:00:00').getTime()
      while (dateSet.has(localDateStr(new Date(cursor)))) {
        currentStreak++
        cursor -= DAY_MS
      }
    }
  }

  // 最长连续
  let bestStreak = 0
  {
    let run = 0
    let prevMs = -Infinity
    for (const s of dates) {
      const ms = new Date(s + 'T00:00:00').getTime()
      if (run > 0 && ms - prevMs === DAY_MS) run++
      else run = 1
      if (run > bestStreak) bestStreak = run
      prevMs = ms
    }
  }

  // 平均间隔天数
  let avgGapDays = 0
  if (dates.length >= 2) {
    let gapSum = 0
    for (let i = 1; i < dates.length; i++) {
      const a = new Date(dates[i - 1] + 'T00:00:00').getTime()
      const b = new Date(dates[i] + 'T00:00:00').getTime()
      gapSum += (b - a) / DAY_MS
    }
    avgGapDays = Math.round((gapSum / (dates.length - 1)) * 10) / 10
  }

  // 周均频次
  const spanWeeks = Math.max(1, spanDays / 7)
  const weeklyPace = Math.round((activeDays / spanWeeks) * 10) / 10

  const months = new Set(dates.map(s => getLocalMonthKey(s)))

  return {
    activeDays,
    spanDays,
    currentStreak,
    bestStreak,
    avgGapDays,
    weeklyPace,
    monthsTracked: months.size,
  }
}

// ============================================================
// 4. 同游者
// ============================================================

export interface MoveCompanion {
  name: string
  count: number
}

export function moveCompanions(moves: Move[]): MoveCompanion[] {
  const map = new Map<string, number>()
  for (const m of moves) {
    const w = m.withWhom?.trim()
    if (!w) continue
    map.set(w, (map.get(w) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// 5. 运动健康
// ============================================================

export interface MovementArchiveHealth {
  score: number
  consistency: number
  diversity: number
  ritual: number
  label: string
}

const HEALTH_LABELS: { min: number; label: string }[] = [
  { min: 80, label: '律动相随' },
  { min: 60, label: '渐渐成律' },
  { min: 40, label: '时有律动' },
  { min: 0, label: '静待启程' },
]

function healthLabel(score: number): string {
  for (const h of HEALTH_LABELS) if (score >= h.min) return h.label
  return HEALTH_LABELS[HEALTH_LABELS.length - 1].label
}

export function movementHealth(moves: Move[], now: Date): MovementArchiveHealth {
  const ov = movementArchiveOverview(moves, now)
  const rhy = movementRhythm(moves, now)

  // 频率：近30天活跃天数/15 为目标；再叠加周均频次
  const cutoff30 = new Date(now.getTime() - 30 * DAY_MS)
  let recentActive = 0
  const recentDates = new Set<string>()
  for (const m of moves) {
    const ts = new Date(m.at).getTime()
    if (isNaN(ts)) continue
    if (ts >= cutoff30.getTime()) recentDates.add(localDateOfIso(m.at))
  }
  recentActive = recentDates.size
  const paceScore = Math.min(100, Math.round((recentActive / 15) * 100))
  const rhythmScore = Math.min(100, Math.round(rhy.weeklyPace * 12))
  const consistency = Math.round((paceScore * 0.6 + rhythmScore * 0.4))

  // 多样性
  const diversity = Math.min(100, Math.round((ov.typeCount / 5) * 100))

  // 时刻仪式
  const ritual = ov.totalCount > 0
    ? Math.min(100, Math.round((ov.momentCount / Math.max(1, Math.round(ov.totalCount * 0.3))) * 100))
    : 0

  const score = Math.max(0, Math.min(100, Math.round(consistency * 0.4 + diversity * 0.3 + ritual * 0.3)))
  return { score, consistency, diversity, ritual, label: healthLabel(score) }
}

// ============================================================
// 6. 温和洞察
// ============================================================

export interface MovementInsight {
  text: string
}

export function movementInsights(moves: Move[], now: Date): MovementInsight[] {
  const out: MovementInsight[] = []
  const ov = movementArchiveOverview(moves, now)
  if (ov.totalCount === 0) {
    out.push({ text: '身体还空着，等一场散步或伸展来落笔。' })
    return out
  }

  if (ov.typeCount >= 4) {
    out.push({ text: `身体很愿意被不同方式唤醒，已试过 ${ov.typeCount} 种律动。` })
  } else if (ov.typeCount <= 1) {
    out.push({ text: '律动略单薄，偶尔交换一种新的方式，或许会有不一样的回应。' })
  } else {
    out.push({ text: `身体在 ${ov.typeCount} 种律动间穿行，慢慢找到了各自的呼吸。` })
  }

  if (ov.momentCount > 0) {
    out.push({ text: `被你轻轻打了标记的运动时刻有 ${ov.momentCount} 次，都是值得记住的闪耀。` })
  }

  if (ov.companionCount > 0) {
    out.push({ text: `有 ${ov.companionCount} 位同行者曾一起运动，缘分也在律动里生长。` })
  }

  if (ov.avgDuration > 0 && ov.avgDuration < 25 && ov.totalCount >= 1) {
    out.push({ text: '单次都在一刻钟上下，规律的轻盈比偶然的猛烈更持久。' })
  } else if (ov.avgDuration >= 45) {
    out.push({ text: '单次投入较深，记得给肌肉留一段安静的恢复。' })
  }

  return out.slice(0, 4)
}