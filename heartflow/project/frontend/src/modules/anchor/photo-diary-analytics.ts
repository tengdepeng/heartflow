// ============================================================
// 逐日心锚 · 图片日记 · 日历 / 连续 / 热力分析（纯函数）
// ------------------------------------------------------------
// 借鉴 Day One「日历视图 + 连续记录 streak + On This Day 那年今日」、
// 一本日记 / 墨记「日历热力」、flomo「记录热力图」。
//
// 设计约束：
//  - 全部纯函数，只吃 PhotoEntry[]，不触存储、不触网络，便于单测与复用
//  - 日期一律走本地日历键（getLocalDateKey），禁止 UTC ISO 切日
//    （否则本地午夜附近会跨日，连续天数会莫名断）
// ============================================================

import type { PhotoEntry } from './photo-diary'
import { getLocalDateKey, getMonthDays } from '../../utils/time'

/** 连续记录统计 */
export interface PhotoStreakStats {
  /** 当前连续天数（截至今日；今日未记则从昨日起算，均无则为 0） */
  current: number
  /** 历史最长连续天数 */
  best: number
  /** 最长连续区间的结束日（YYYY-MM-DD） */
  bestEndDate: string | null
  /** 有记录的总天数 */
  totalDays: number
  /** 最近一次记录日（YYYY-MM-DD） */
  lastDate: string | null
}

/** 月历中的一天 */
export interface PhotoDayCell {
  /** YYYY-MM-DD */
  date: string
  /** 日号 1-31 */
  day: number
  /** 该日照片张数 */
  count: number
  /** 该日首图缩略图（无则 null） */
  thumb: string | null
  /** 是否属于目标月份（月历首尾补白为 false） */
  isCurrentMonth: boolean
  isToday: boolean
}

/** 月历网格 */
export interface PhotoMonthGrid {
  /** 0-11 */
  month: number
  year: number
  label: string
  /** 补齐到整周的日期格（周日开头） */
  cells: PhotoDayCell[]
}

/** 热力图中的一格 */
export interface PhotoHeatmapCell {
  date: string
  count: number
  /** 0 无记录；1-4 由当日张数相对峰值分档 */
  level: 0 | 1 | 2 | 3 | 4
  /** 是否晚于今日（用于末列未来格弱化） */
  future: boolean
}

/** 热力图的一列（一周 7 天，周日开头） */
export interface PhotoHeatmapWeek {
  cells: PhotoHeatmapCell[]
}

/** 热力图的月份刻度 */
export interface PhotoHeatmapMonthLabel {
  /** 落在第几列（周） */
  week: number
  label: string
}

/** 那年今日的一条 */
export interface PhotoOnThisDayItem {
  date: string
  /** 距今日年数（≥1） */
  yearsAgo: number
  entry: PhotoEntry
}

/** 解析本地日期键为 Date（当天 00:00） */
function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}

/** 日期键加减天数，返回新的本地日期键 */
function addDays(key: string, delta: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + delta)
  return getLocalDateKey(d)
}

/** 归约为「日期 → 张数 / 首图缩略图」，只保留有图的日期 */
function indexByDate(entries: PhotoEntry[]): Map<string, { count: number; thumb: string }> {
  const map = new Map<string, { count: number; thumb: string }>()
  for (const e of entries) {
    if (!e.images || e.images.length === 0) continue
    map.set(e.date, { count: e.images.length, thumb: e.thumbs?.[0] || e.images[0] || '' })
  }
  return map
}

/** 按当日张数相对峰值分档到 0-4 */
function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  const ratio = count / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

/**
 * 连续记录统计。
 * 今日有记录则从今日回溯；今日未记但昨日有，则从昨日回溯（今日尚可补记，不断连）。
 */
export function computePhotoStreak(entries: PhotoEntry[], today: string = getLocalDateKey()): PhotoStreakStats {
  const days = [...indexByDate(entries).keys()].sort()
  const totalDays = days.length
  const lastDate = totalDays ? days[totalDays - 1] : null

  let best = 0
  let bestEndDate: string | null = null
  let run = 0
  let prev: string | null = null
  for (const d of days) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1
    if (run > best) {
      best = run
      bestEndDate = d
    }
    prev = d
  }

  const daySet = new Set(days)
  let current = 0
  let cursor = daySet.has(today) ? today : addDays(today, -1)
  while (daySet.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }

  return { current, best, bestEndDate, totalDays, lastDate }
}

/** 构建某月的日历网格（含首尾补白，周日开头） */
export function buildPhotoMonthGrid(
  entries: PhotoEntry[],
  year: number,
  month: number,
  today: string = getLocalDateKey(),
): PhotoMonthGrid {
  const idx = indexByDate(entries)
  const cells = getMonthDays(year, month).map(({ date, isCurrentMonth }) => {
    const key = getLocalDateKey(date)
    const hit = idx.get(key)
    return {
      date: key,
      day: date.getDate(),
      count: hit?.count ?? 0,
      thumb: hit?.thumb || null,
      isCurrentMonth,
      isToday: key === today,
    }
  })
  return { year, month, label: `${year} 年 ${month + 1} 月`, cells }
}

/**
 * 构建近一年的记录热力图（GitHub 式，周日开头，列=周）。
 * @param weeks 列数，默认 53（约一年）
 */
export function buildPhotoHeatmap(
  entries: PhotoEntry[],
  today: string = getLocalDateKey(),
  weeks = 53,
): PhotoHeatmapWeek[] {
  const idx = indexByDate(entries)
  const max = Math.max(1, ...[...idx.values()].map(v => v.count))
  const todayDate = parseKey(today)

  // 末列对齐到本周周六，向前铺满 weeks 列
  const gridEnd = new Date(todayDate)
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))
  const gridStart = new Date(gridEnd)
  gridStart.setDate(gridStart.getDate() - (weeks * 7 - 1))

  const out: PhotoHeatmapWeek[] = []
  const cursor = new Date(gridStart)
  for (let w = 0; w < weeks; w++) {
    const cells: PhotoHeatmapCell[] = []
    for (let i = 0; i < 7; i++) {
      const key = getLocalDateKey(cursor)
      const count = idx.get(key)?.count ?? 0
      cells.push({ date: key, count, level: heatLevel(count, max), future: cursor.getTime() > todayDate.getTime() })
      cursor.setDate(cursor.getDate() + 1)
    }
    out.push({ cells })
  }
  return out
}

/** 由热力图列计算月份刻度（每月首现列打点，避免重复） */
export function heatmapMonthLabels(weeks: PhotoHeatmapWeek[]): PhotoHeatmapMonthLabel[] {
  const out: PhotoHeatmapMonthLabel[] = []
  let last = -1
  weeks.forEach((w, i) => {
    const first = w.cells[0]
    if (!first) return
    const m = Number(first.date.slice(5, 7))
    if (m !== last) {
      out.push({ week: i, label: `${m}月` })
      last = m
    }
  })
  return out
}

/** 那年今日：往年同月同日、且至少有 1 张照片的条目（按年数升序） */
export function findPhotosOnThisDay(entries: PhotoEntry[], today: string = getLocalDateKey()): PhotoOnThisDayItem[] {
  const md = today.slice(5)
  const year = Number(today.slice(0, 4))
  return entries
    .filter(e => e.images.length > 0 && e.date.slice(5) === md && Number(e.date.slice(0, 4)) < year)
    .map(e => ({ date: e.date, yearsAgo: year - Number(e.date.slice(0, 4)), entry: e }))
    .sort((a, b) => a.yearsAgo - b.yearsAgo)
}
