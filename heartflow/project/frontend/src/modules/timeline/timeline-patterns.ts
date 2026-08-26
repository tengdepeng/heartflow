// ============================================================
// 时间长廊 · 模式发现引擎（P16-1）
// 周规律 / 季节规律 / 月度对比 / 年度趋势
// ============================================================

import type { RiverItem, RiverSource } from './river'
import { createRiverItems } from './river'

// ---- 类型定义 ----

/** 星期几 */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

/** 季节 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** 周规律发现结果 */
export interface WeeklyPattern {
  /** 每周规律总览 */
  bestDay: DayOfWeek
  bestDayLabel: string
  bestDayFocusMinutes: number
  worstDay: DayOfWeek
  worstDayLabel: string
  worstDayFocusMinutes: number
  /** 每日详情 */
  dailyBreakdown: {
    day: DayOfWeek
    label: string
    avgFocusMinutes: number
    avgCrystals: number
    avgNotes: number
    avgEmotions: number
    totalItems: number
    activeDays: number
  }[]
  /** 规律洞察 */
  insight: string
}

/** 季节规律发现结果 */
export interface SeasonalPattern {
  season: Season
  label: string
  avgFocusMinutes: number
  avgCrystals: number
  avgNotes: number
  avgEmotions: number
  totalItems: number
  activeDays: number
  dominantEmotion: string
  topTags: string[]
  /** 与上一季节对比 */
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

/** 年度趋势 */
export interface YearlyTrend {
  year: number
  monthlyBreakdown: {
    month: number
    label: string
    focusMinutes: number
    crystals: number
    notes: number
    emotions: number
    completedAnchors: number
    totalAnchors: number
    dominantEmotion: string
    activeDays: number
  }[]
  /** 年度亮点 */
  highlights: {
    bestMonth: { month: number; label: string; focusMinutes: number }
    mostProductiveDay: { date: string; focusMinutes: number }
    longestStreak: number
    totalMilestones: number
  }
  /** 年度对比（与上一年） */
  yearOverYear: {
    focusChange: number
    crystalsChange: number
    notesChange: number
    trend: 'up' | 'down' | 'stable'
  }
}

/** 模式发现综合结果 */
export interface PatternDiscoveryResult {
  weeklyPattern: WeeklyPattern
  seasonalPatterns: SeasonalPattern[]
  yearlyTrend: YearlyTrend | null
  /** 综合洞察文本 */
  overallInsight: string
}

// ---- 内部常量 ----

const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
}

const DAY_OF_WEEK_ORDER: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

const SEASON_LABELS: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

const MONTH_LABELS: Record<number, string> = {
  1: '一月', 2: '二月', 3: '三月', 4: '四月', 5: '五月', 6: '六月',
  7: '七月', 8: '八月', 9: '九月', 10: '十月', 11: '十一月', 12: '十二月',
}

// ---- 工具函数 ----

function getDayOfWeek(ts: number): DayOfWeek {
  const day = new Date(ts).getDay() // 0=Sunday, 1=Monday, ...
  const map: Record<number, DayOfWeek> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday',
  }
  return map[day]
}

function getSeason(ts: number): Season {
  const month = new Date(ts).getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

function getMonth(ts: number): number {
  return new Date(ts).getMonth() + 1
}

function getYear(ts: number): number {
  return new Date(ts).getFullYear()
}

function getDateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function getFocusMinutes(item: RiverItem): number {
  if (item.type === 'session' && item.session?.elapsed) {
    return Math.round(item.session.elapsed / 60000)
  }
  return 0
}

// ============================================================
// 周规律发现
// ============================================================

export function discoverWeeklyPattern(
  source: RiverSource,
  weeksBack: number = 12,
): WeeklyPattern {
  const items = createRiverItems(source, ['crystal', 'note', 'emotion', 'session', 'anchor'])
  const cutoff = Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000
  const recentItems = items.filter(i => i.ts >= cutoff)

  // 按星期几分组
  const dayGroups = new Map<DayOfWeek, {
    focusMinutes: number[]
    crystalCounts: number[]
    noteCounts: number[]
    emotionCounts: number[]
    totalItems: number
    activeDays: Set<string>
  }>()

  for (const dow of DAY_OF_WEEK_ORDER) {
    dayGroups.set(dow, {
      focusMinutes: [],
      crystalCounts: [],
      noteCounts: [],
      emotionCounts: [],
      totalItems: 0,
      activeDays: new Set(),
    })
  }

  // 按日期归类
  const dateMap = new Map<string, {
    dow: DayOfWeek
    focusMinutes: number
    crystals: number
    notes: number
    emotions: number
    items: number
  }>()

  for (const item of recentItems) {
    const dateStr = getDateStr(item.ts)
    const dow = getDayOfWeek(item.ts)

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { dow, focusMinutes: 0, crystals: 0, notes: 0, emotions: 0, items: 0 })
    }
    const entry = dateMap.get(dateStr)!

    entry.focusMinutes += getFocusMinutes(item)
    if (item.type === 'crystal') entry.crystals++
    if (item.type === 'note') entry.notes++
    if (item.type === 'emotion') entry.emotions++
    entry.items++
  }

  // 汇总到各星期几
  for (const [, entry] of dateMap) {
    const group = dayGroups.get(entry.dow)!
    if (entry.focusMinutes > 0) group.focusMinutes.push(entry.focusMinutes)
    group.crystalCounts.push(entry.crystals)
    group.noteCounts.push(entry.notes)
    group.emotionCounts.push(entry.emotions)
    group.totalItems += entry.items
    group.activeDays.add(getDateStr(new Date().getTime())) // placeholder - we just need count
  }

  // 重新计算活跃天数
  for (const dow of DAY_OF_WEEK_ORDER) {
    const active = new Set<string>()
    for (const [, entry] of dateMap) {
      if (entry.dow === dow) active.add('x') // just count unique days
    }
    dayGroups.get(dow)!.activeDays = active
  }

  // 计算每日均值
  const dailyBreakdown = DAY_OF_WEEK_ORDER.map(dow => {
    const g = dayGroups.get(dow)!
    const activeCount = g.focusMinutes.length || 1
    return {
      day: dow,
      label: DAY_OF_WEEK_LABELS[dow],
      avgFocusMinutes: Math.round(avg(g.focusMinutes)),
      avgCrystals: Math.round(avg(g.crystalCounts) * 10) / 10,
      avgNotes: Math.round(avg(g.noteCounts) * 10) / 10,
      avgEmotions: Math.round(avg(g.emotionCounts) * 10) / 10,
      totalItems: g.totalItems,
      activeDays: activeCount,
    }
  })

  // 找最佳和最差日
  let bestDay: DayOfWeek = 'monday'
  let bestFocus = 0
  let worstDay: DayOfWeek = 'monday'
  let worstFocus = Infinity

  for (const d of dailyBreakdown) {
    if (d.avgFocusMinutes > bestFocus) {
      bestFocus = d.avgFocusMinutes
      bestDay = d.day
    }
    if (d.avgFocusMinutes < worstFocus && d.activeDays > 0) {
      worstFocus = d.avgFocusMinutes
      worstDay = d.day
    }
  }

  if (worstFocus === Infinity) worstFocus = 0

  const insight = generateWeeklyInsight(dailyBreakdown, bestDay, worstDay)

  return {
    bestDay,
    bestDayLabel: DAY_OF_WEEK_LABELS[bestDay],
    bestDayFocusMinutes: bestFocus,
    worstDay,
    worstDayLabel: DAY_OF_WEEK_LABELS[worstDay],
    worstDayFocusMinutes: worstFocus,
    dailyBreakdown,
    insight,
  }
}

// ============================================================
// 季节规律发现
// ============================================================

export function discoverSeasonalPatterns(
  source: RiverSource,
  year: number,
): SeasonalPattern[] {
  const items = createRiverItems(source, ['crystal', 'note', 'emotion', 'session', 'anchor'])
  const yearItems = items.filter(i => getYear(i.ts) === year)

  const seasonGroups = new Map<Season, {
    focusMinutes: number[]
    crystalCounts: number[]
    noteCounts: number[]
    emotionCounts: number[]
    totalItems: number
    activeDays: Set<string>
    emotions: Map<string, number>
    tags: Map<string, number>
  }>()

  for (const season of SEASON_ORDER) {
    seasonGroups.set(season, {
      focusMinutes: [],
      crystalCounts: [],
      noteCounts: [],
      emotionCounts: [],
      totalItems: 0,
      activeDays: new Set(),
      emotions: new Map(),
      tags: new Map(),
    })
  }

  for (const item of yearItems) {
    const season = getSeason(item.ts)
    const g = seasonGroups.get(season)!
    const dateStr = getDateStr(item.ts)

    const fm = getFocusMinutes(item)
    if (fm > 0) g.focusMinutes.push(fm)
    if (item.type === 'crystal') g.crystalCounts.push(1)
    if (item.type === 'note') g.noteCounts.push(1)
    if (item.type === 'emotion') g.emotionCounts.push(1)
    g.totalItems++
    g.activeDays.add(dateStr)

    if (item.type === 'emotion' && item.emotion?.type) {
      g.emotions.set(item.emotion.type, (g.emotions.get(item.emotion.type) || 0) + 1)
    }

    const tags = extractItemTags(item)
    for (const t of tags) {
      g.tags.set(t, (g.tags.get(t) || 0) + 1)
    }
  }

  // 前一季节的均值用于对比
  const prevYearItems = items.filter(i => getYear(i.ts) === year - 1)

  return SEASON_ORDER.map((season) => {
    const g = seasonGroups.get(season)!

    const dominantEmotion = [...g.emotions.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '未知'

    const topTags = [...g.tags.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t)

    const currentFocus = avg(g.focusMinutes)
    const prevFocus = avgSeasonFocus(prevYearItems, season)

    let trend: 'up' | 'down' | 'stable' = 'stable'
    let trendPercent = 0
    if (prevFocus > 0) {
      trendPercent = Math.round(((currentFocus - prevFocus) / prevFocus) * 100)
      trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable'
    }

    return {
      season,
      label: SEASON_LABELS[season],
      avgFocusMinutes: Math.round(currentFocus),
      avgCrystals: Math.round(avg(g.crystalCounts) * 10) / 10,
      avgNotes: Math.round(avg(g.noteCounts) * 10) / 10,
      avgEmotions: Math.round(avg(g.emotionCounts) * 10) / 10,
      totalItems: g.totalItems,
      activeDays: g.activeDays.size,
      dominantEmotion,
      topTags,
      trend,
      trendPercent,
    }
  })
}

// ============================================================
// 年度趋势分析
// ============================================================

export function discoverYearlyTrend(
  source: RiverSource,
  year: number,
  prevYear?: number,
): YearlyTrend | null {
  const items = createRiverItems(source, ['crystal', 'note', 'emotion', 'session', 'anchor'])
  const yearItems = items.filter(i => getYear(i.ts) === year)

  if (yearItems.length === 0) return null

  const prevYearItems = prevYear !== undefined
    ? items.filter(i => getYear(i.ts) === prevYear)
    : items.filter(i => getYear(i.ts) === year - 1)

  // 月度分解
  const monthlyBreakdown = []
  for (let month = 1; month <= 12; month++) {
    const monthItems = yearItems.filter(i => getMonth(i.ts) === month)
    const monthDays = new Set<string>()
    const monthEmotions = new Map<string, number>()

    let focusMinutes = 0
    let crystals = 0
    let notes = 0
    let emotions = 0
    let completedAnchors = 0
    let totalAnchors = 0

    for (const item of monthItems) {
      const dateStr = getDateStr(item.ts)
      monthDays.add(dateStr)

      focusMinutes += getFocusMinutes(item)
      if (item.type === 'crystal') crystals++
      if (item.type === 'note') notes++
      if (item.type === 'emotion') {
        emotions++
        if (item.emotion?.type) {
          monthEmotions.set(item.emotion.type, (monthEmotions.get(item.emotion.type) || 0) + 1)
        }
      }
      if (item.type === 'anchor') {
        totalAnchors++
        if (item.anchor?.done) completedAnchors++
      }
    }

    const dominantEmotion = [...monthEmotions.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    monthlyBreakdown.push({
      month,
      label: MONTH_LABELS[month],
      focusMinutes,
      crystals,
      notes,
      emotions,
      completedAnchors,
      totalAnchors,
      dominantEmotion,
      activeDays: monthDays.size,
    })
  }

  // 年度亮点
  let bestMonth = monthlyBreakdown[0]
  for (const m of monthlyBreakdown) {
    if (m.focusMinutes > bestMonth.focusMinutes) bestMonth = m
  }

  let mostProductiveDay = { date: '', focusMinutes: 0 }
  const dayFocusMap = new Map<string, number>()
  for (const item of yearItems) {
    const fm = getFocusMinutes(item)
    if (fm > 0) {
      const ds = getDateStr(item.ts)
      dayFocusMap.set(ds, (dayFocusMap.get(ds) || 0) + fm)
    }
  }
  for (const [date, fm] of dayFocusMap) {
    if (fm > mostProductiveDay.focusMinutes) {
      mostProductiveDay = { date, focusMinutes: fm }
    }
  }

  // 最长连续天数
  let longestStreak = 0
  let currentStreak = 0
  const activeDays = new Set(yearItems.map(i => getDateStr(i.ts)))
  const sortedDays = [...activeDays].sort()

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentStreak = 1
    } else {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diff = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
      if (diff === 1) {
        currentStreak++
      } else {
        currentStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak)
  }

  // 年度对比
  let yearOverYear = { focusChange: 0, crystalsChange: 0, notesChange: 0, trend: 'stable' as 'up' | 'down' | 'stable' }
  if (prevYearItems.length > 0) {
    const prevFocus = prevYearItems.reduce((sum, i) => sum + getFocusMinutes(i), 0)
    const prevCrystals = prevYearItems.filter(i => i.type === 'crystal').length
    const prevNotes = prevYearItems.filter(i => i.type === 'note').length
    const currFocus = yearItems.reduce((sum, i) => sum + getFocusMinutes(i), 0)
    const currCrystals = yearItems.filter(i => i.type === 'crystal').length
    const currNotes = yearItems.filter(i => i.type === 'note').length

    yearOverYear = {
      focusChange: prevFocus > 0 ? Math.round(((currFocus - prevFocus) / prevFocus) * 100) : 0,
      crystalsChange: prevCrystals > 0 ? Math.round(((currCrystals - prevCrystals) / prevCrystals) * 100) : 0,
      notesChange: prevNotes > 0 ? Math.round(((currNotes - prevNotes) / prevNotes) * 100) : 0,
      trend: currFocus > prevFocus * 1.05 ? 'up' : currFocus < prevFocus * 0.95 ? 'down' : 'stable',
    }
  }

  return {
    year,
    monthlyBreakdown,
    highlights: {
      bestMonth: {
        month: bestMonth.month,
        label: bestMonth.label,
        focusMinutes: bestMonth.focusMinutes,
      },
      mostProductiveDay,
      longestStreak,
      totalMilestones: yearItems.filter(i => i.type === 'anchor' && i.anchor?.done).length,
    },
    yearOverYear,
  }
}

// ============================================================
// 综合模式发现
// ============================================================

export function discoverPatterns(
  source: RiverSource,
  year?: number,
): PatternDiscoveryResult {
  const targetYear = year ?? new Date().getFullYear()

  const weeklyPattern = discoverWeeklyPattern(source)
  const seasonalPatterns = discoverSeasonalPatterns(source, targetYear)
  const yearlyTrend = discoverYearlyTrend(source, targetYear)

  const overallInsight = generateOverallInsight(weeklyPattern, seasonalPatterns, yearlyTrend)

  return {
    weeklyPattern,
    seasonalPatterns,
    yearlyTrend,
    overallInsight,
  }
}

// ============================================================
// 洞察生成
// ============================================================

function generateWeeklyInsight(
  daily: WeeklyPattern['dailyBreakdown'],
  bestDay: DayOfWeek,
  worstDay: DayOfWeek,
): string {
  const best = daily.find(d => d.day === bestDay)!
  const worst = daily.find(d => d.day === worstDay)!

  const parts: string[] = []

  if (best.avgFocusMinutes > 0) {
    parts.push(`${DAY_OF_WEEK_LABELS[bestDay]}是你最专注的日子，日均专注 ${best.avgFocusMinutes} 分钟`)
  }
  if (worst.avgFocusMinutes > 0) {
    parts.push(`${DAY_OF_WEEK_LABELS[worstDay]}专注度最低，可以考虑设为休息日`)
  }

  // 找第二个活跃日
  const sorted = [...daily].filter(d => d.avgFocusMinutes > 0).sort((a, b) => b.avgFocusMinutes - a.avgFocusMinutes)
  if (sorted.length >= 3) {
    parts.push(`活跃度前三：${sorted[0].label} > ${sorted[1].label} > ${sorted[2].label}`)
  }

  return parts.join('。') || '暂无足够的周规律数据'
}

function generateOverallInsight(
  weekly: WeeklyPattern,
  seasonal: SeasonalPattern[],
  yearly: YearlyTrend | null,
): string {
  const parts: string[] = []

  if (weekly.bestDayFocusMinutes > 0) {
    parts.push(`周规律：${weekly.insight}`)
  }

  if (seasonal.length > 0) {
    const bestSeason = [...seasonal].sort((a, b) => b.avgFocusMinutes - a.avgFocusMinutes)[0]
    if (bestSeason.avgFocusMinutes > 0) {
      parts.push(`${bestSeason.label}季是专注度最高的季节（日均 ${bestSeason.avgFocusMinutes} 分钟）`)
    }
  }

  if (yearly) {
    const totalFocus = yearly.monthlyBreakdown.reduce((s, m) => s + m.focusMinutes, 0)
    parts.push(`年度总计专注 ${totalFocus} 分钟`)
    if (yearly.highlights.longestStreak > 0) {
      parts.push(`最长连续活跃 ${yearly.highlights.longestStreak} 天`)
    }
  }

  return parts.join('；') || '开始记录你的时间，让模式自然浮现'
}

// ============================================================
// 辅助函数
// ============================================================

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function avgSeasonFocus(items: RiverItem[], season: Season): number {
  const seasonItems = items.filter(i => getSeason(i.ts) === season)
  const dailyFocus = new Map<string, number>()

  for (const item of seasonItems) {
    const fm = getFocusMinutes(item)
    if (fm > 0) {
      const ds = getDateStr(item.ts)
      dailyFocus.set(ds, (dailyFocus.get(ds) || 0) + fm)
    }
  }

  const values = [...dailyFocus.values()]
  return values.length > 0 ? avg(values) : 0
}

function extractItemTags(item: RiverItem): string[] {
  const tags: string[] = []
  if (item.crystal?.tags) tags.push(...item.crystal.tags)
  if (item.note?.tags) tags.push(...item.note.tags)
  if (item.session?.tags) tags.push(...item.session.tags)
  if (item.anchor?.tags) tags.push(...item.anchor.tags)
  if (item.emotion?.type) tags.push(item.emotion.type)
  return tags
}