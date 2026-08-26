// ============================================================
// 时间长廊 · 时间线雷达图引擎
// P18-1：提供多维度的活动分布可视化数据
// 支持：日周分布、情绪热力、标签聚类、专注雷达
// ============================================================

import type { RiverSource } from './river'

// ---- 雷达图维度 ----

export type RadarDimension = 'focus' | 'emotion' | 'crystal' | 'note' | 'anchor' | 'tag'

export interface RadarPoint {
  /** 维度名称 */
  dimension: RadarDimension
  /** 数值（归一化 0-1） */
  value: number
  /** 原始值 */
  rawValue: number
  /** 标签 */
  label: string
}

export interface RadarChart {
  /** 图表标题 */
  title: string
  /** 各维度数据点 */
  points: RadarPoint[]
  /** 最大值（用于归一化） */
  maxValue: number
  /** 生成时间 */
  generatedAt: string
}

// ---- 日周分布 ----

export interface DayHourCell {
  dayOfWeek: number  // 0=周日, 6=周六
  hour: number       // 0-23
  focusMinutes: number
  crystalCount: number
  noteCount: number
  emotionCount: number
  anchorCount: number
  totalItems: number
}

export interface DayHourHeatmap {
  cells: DayHourCell[]
  /** 最大专注分钟数（用于归一化） */
  maxFocusMinutes: number
  /** 活跃时段 */
  peakHours: { dayOfWeek: number; hour: number; focusMinutes: number }[]
  /** 最活跃的星期几 */
  mostActiveDay: number
  /** 最活跃的小时段 */
  mostActiveHour: number
  /** 工作日 vs 周末专注比 */
  weekdayFocusRatio: number
}

// ---- 情绪热力 ----

export interface EmotionHeatPoint {
  date: string
  dayOfWeek: number
  emotion: string
  intensity: number  // 0-1
  count: number
}

export interface EmotionHeatmap {
  points: EmotionHeatPoint[]
  /** 情绪分布 */
  distribution: Record<string, number>
  /** 主导情绪 */
  dominantEmotion: string
  /** 情绪多样性指数 */
  diversityIndex: number
  /** 情绪趋势：上升/下降/稳定 */
  trend: 'rising' | 'falling' | 'stable'
}

// ---- 标签聚类 ----

export interface TagCluster {
  tag: string
  count: number
  relatedTags: { tag: string; coOccurrence: number }[]
  avgFocusMinutes: number
  dominantEmotion: string
  /** 标签影响力评分 */
  influenceScore: number
}

export interface TagRadar {
  clusters: TagCluster[]
  totalTags: number
  totalClusters: number
  /** 标签多样性 */
  diversity: number
}

// ---- 专注雷达 ----

export interface FocusRadarEntry {
  label: string
  /** 平均专注时长（分钟） */
  avgFocusMinutes: number
  /** 专注次数 */
  focusCount: number
  /** 完成率 */
  completionRate: number
  /** 效率评分 0-100 */
  efficiencyScore: number
}

export interface FocusRadar {
  /** 按星期几 */
  byDayOfWeek: FocusRadarEntry[]
  /** 按时段（上午/下午/晚上） */
  byTimeOfDay: FocusRadarEntry[]
  /** 按标签 */
  byTag: FocusRadarEntry[]
  /** 最佳专注窗口 */
  bestWindow: { dayOfWeek: number; timeOfDay: string; avgMinutes: number }
  /** 专注效率评分 */
  overallEfficiency: number
}

// ============================================================
// 雷达图数据生成
// ============================================================

/**
 * 生成多维雷达图数据
 */
export function generateRadarChart(source: RiverSource): RadarChart {
  const dimensions: { dimension: RadarDimension; rawValue: number; label: string }[] = [
    { dimension: 'focus', rawValue: source.sessions.reduce((s, i) => s + i.elapsed / 60000, 0), label: '专注' },
    { dimension: 'emotion', rawValue: source.emotions.length, label: '情绪' },
    { dimension: 'crystal', rawValue: source.crystals.length, label: '结晶' },
    { dimension: 'note', rawValue: source.notes.length, label: '笔记' },
    { dimension: 'anchor', rawValue: source.anchors.length, label: '心锚' },
    { dimension: 'tag', rawValue: new Set([
      ...source.sessions.flatMap(i => i.tags),
      ...source.crystals.flatMap(i => i.tags),
      ...source.notes.flatMap(i => i.tags),
      ...source.anchors.flatMap(i => i.tags || []),
    ]).size, label: '标签' },
  ]

  const maxRaw = Math.max(...dimensions.map(d => d.rawValue), 1)

  const points: RadarPoint[] = dimensions.map(d => ({
    dimension: d.dimension,
    value: d.rawValue / maxRaw,
    rawValue: d.rawValue,
    label: d.label,
  }))

  return {
    title: '时间线活动雷达',
    points,
    maxValue: maxRaw,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================================
// 日周热力图
// ============================================================

/**
 * 生成日周分布热力图数据
 */
export function generateDayHourHeatmap(source: RiverSource): DayHourHeatmap {
  const cells: Map<string, DayHourCell> = new Map()

  // 初始化 7×24 网格
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.set(`${dow}-${hour}`, {
        dayOfWeek: dow,
        hour,
        focusMinutes: 0,
        crystalCount: 0,
        noteCount: 0,
        emotionCount: 0,
        anchorCount: 0,
        totalItems: 0,
      })
    }
  }

  // 填充专注数据
  for (const session of source.sessions) {
    if (!session.startedAt) continue
    const d = new Date(session.startedAt)
    const dow = d.getDay()
    const hour = d.getHours()
    const key = `${dow}-${hour}`
    const cell = cells.get(key)
    if (cell) {
      cell.focusMinutes += session.elapsed / 60000
      cell.totalItems++
    }
  }

  // 填充其他数据
  for (const crystal of source.crystals) {
    const d = new Date(crystal.createdAt)
    const key = `${d.getDay()}-${d.getHours()}`
    const cell = cells.get(key)
    if (cell) { cell.crystalCount++; cell.totalItems++ }
  }

  for (const note of source.notes) {
    const d = new Date(note.createdAt)
    const key = `${d.getDay()}-${d.getHours()}`
    const cell = cells.get(key)
    if (cell) { cell.noteCount++; cell.totalItems++ }
  }

  for (const emotion of source.emotions) {
    const d = new Date(emotion.createdAt)
    const key = `${d.getDay()}-${d.getHours()}`
    const cell = cells.get(key)
    if (cell) { cell.emotionCount++; cell.totalItems++ }
  }

  for (const anchor of source.anchors) {
    const d = new Date(anchor.createdAt)
    const key = `${d.getDay()}-${d.getHours()}`
    const cell = cells.get(key)
    if (cell) { cell.anchorCount++; cell.totalItems++ }
  }

  const cellArray = Array.from(cells.values())
  const maxFocus = Math.max(...cellArray.map(c => c.focusMinutes), 1)

  // 找峰值时段
  const sorted = [...cellArray].sort((a, b) => b.focusMinutes - a.focusMinutes)
  const peakHours = sorted.slice(0, 5).filter(c => c.focusMinutes > 0)

  // 最活跃日
  const dayTotals = new Array(7).fill(0)
  for (const cell of cellArray) {
    dayTotals[cell.dayOfWeek] += cell.focusMinutes
  }
  const mostActiveDay = dayTotals.indexOf(Math.max(...dayTotals))

  // 最活跃小时
  const hourTotals = new Array(24).fill(0)
  for (const cell of cellArray) {
    hourTotals[cell.hour] += cell.focusMinutes
  }
  const mostActiveHour = hourTotals.indexOf(Math.max(...hourTotals))

  // 工作日 vs 周末
  const weekdayFocus = dayTotals[1] + dayTotals[2] + dayTotals[3] + dayTotals[4] + dayTotals[5]
  const weekendFocus = dayTotals[0] + dayTotals[6]
  const weekdayFocusRatio = weekendFocus > 0 ? weekdayFocus / weekendFocus : weekdayFocus > 0 ? 999 : 1

  return {
    cells: cellArray,
    maxFocusMinutes: maxFocus,
    peakHours,
    mostActiveDay,
    mostActiveHour,
    weekdayFocusRatio,
  }
}

// ============================================================
// 情绪热力图
// ============================================================

/**
 * 生成情绪热力图数据
 */
export function generateEmotionHeatmap(source: RiverSource): EmotionHeatmap {
  const points: EmotionHeatPoint[] = []
  const distribution: Record<string, number> = {}

  for (const emotion of source.emotions) {
    const d = new Date(emotion.createdAt)
    const emotionType = emotion.type || 'neutral'
    const intensity = (emotion as any).intensity || 0.5

    distribution[emotionType] = (distribution[emotionType] || 0) + 1

    points.push({
      date: emotion.createdAt,
      dayOfWeek: d.getDay(),
      emotion: emotionType,
      intensity: Math.min(1, Math.max(0, intensity)),
      count: 1,
    })
  }

  // 合并同天同情绪的数据
  const merged = new Map<string, EmotionHeatPoint>()
  for (const p of points) {
    const key = `${p.date}-${p.emotion}`
    if (merged.has(key)) {
      const existing = merged.get(key)!
      existing.count++
      existing.intensity = (existing.intensity + p.intensity) / 2
    } else {
      merged.set(key, { ...p })
    }
  }

  const sortedPoints = Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date))

  // 主导情绪
  const emotions = Object.entries(distribution)
  emotions.sort((a, b) => b[1] - a[1])
  const dominantEmotion = emotions.length > 0 ? emotions[0][0] : 'neutral'

  // 情绪多样性指数（Shannon 多样性）
  const total = emotions.reduce((s, [, c]) => s + c, 0)
  const diversityIndex = -emotions.reduce((s, [, c]) => {
    const p = c / total
    return s + p * Math.log(p)
  }, 0)

  // 情绪趋势
  const half = Math.floor(sortedPoints.length / 2)
  if (half < 2) {
    return { points: sortedPoints, distribution, dominantEmotion, diversityIndex, trend: 'stable' }
  }

  const firstHalf = sortedPoints.slice(0, half)
  const secondHalf = sortedPoints.slice(half)
  const firstAvg = firstHalf.reduce((s, p) => s + p.intensity, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((s, p) => s + p.intensity, 0) / secondHalf.length

  const trend: 'rising' | 'falling' | 'stable' =
    secondAvg > firstAvg * 1.1 ? 'rising' :
    secondAvg < firstAvg * 0.9 ? 'falling' : 'stable'

  return { points: sortedPoints, distribution, dominantEmotion, diversityIndex, trend }
}

// ============================================================
// 标签聚类
// ============================================================

/**
 * 生成标签聚类雷达图数据
 */
export function generateTagRadar(source: RiverSource): TagRadar {
  const allItems = [...source.sessions, ...source.crystals, ...source.notes, ...source.emotions, ...source.anchors]
  
  // 标签频率
  const tagCount: Record<string, number> = {}
  const tagFocus: Record<string, { total: number; count: number }> = {}
  const tagEmotions: Record<string, Record<string, number>> = {}
  const coOccurrences: Record<string, Record<string, number>> = {}

  for (const item of allItems) {
    const tags = 'tags' in item ? (item as any).tags || [] : []
    const type = (item as any).type || (item as any).emotion || ''

    for (const tag of tags) {
      tagCount[tag] = (tagCount[tag] || 0) + 1

      // 专注统计
      if ((item as any).elapsed) {
        if (!tagFocus[tag]) tagFocus[tag] = { total: 0, count: 0 }
        tagFocus[tag].total += (item as any).elapsed / 60000
        tagFocus[tag].count++
      }

      // 情绪统计
      if (type && !['session', 'crystal', 'note', 'anchor'].includes(type)) {
        if (!tagEmotions[tag]) tagEmotions[tag] = {}
        tagEmotions[tag][type] = (tagEmotions[tag][type] || 0) + 1
      }

      // 共现统计
      for (const otherTag of tags) {
        if (otherTag !== tag) {
          if (!coOccurrences[tag]) coOccurrences[tag] = {}
          coOccurrences[tag][otherTag] = (coOccurrences[tag][otherTag] || 0) + 1
        }
      }
    }
  }

  // 构建聚类
  const totalTags = Object.keys(tagCount).length
  const maxCount = Math.max(...Object.values(tagCount), 1)

  const clusters: TagCluster[] = Object.entries(tagCount)
    .map(([tag, count]) => {
      const relatedTags = Object.entries(coOccurrences[tag] || {})
        .map(([t, c]) => ({ tag: t, coOccurrence: c }))
        .sort((a, b) => b.coOccurrence - a.coOccurrence)
        .slice(0, 5)

      const focusData = tagFocus[tag]
      const avgFocusMinutes = focusData ? Math.round(focusData.total / focusData.count) : 0

      const emotionEntries = Object.entries(tagEmotions[tag] || {})
      emotionEntries.sort((a, b) => b[1] - a[1])
      const dominantEmotion = emotionEntries.length > 0 ? emotionEntries[0][0] : 'neutral'

      const influenceScore = (count / maxCount) * 0.4
        + (avgFocusMinutes / 120) * 0.3
        + (relatedTags.length / 5) * 0.3

      return {
        tag,
        count,
        relatedTags,
        avgFocusMinutes,
        dominantEmotion,
        influenceScore: Math.round(influenceScore * 100) / 100,
      }
    })
    .sort((a, b) => b.influenceScore - a.influenceScore)

  // 标签多样性
  const diversity = clusters.length > 0
    ? 1 - clusters.slice(0, 5).reduce((s, c, i) => s + (c.count / totalTags) * (i / 4), 0)
    : 0

  return {
    clusters,
    totalTags,
    totalClusters: clusters.length,
    diversity: Math.round(diversity * 100) / 100,
  }
}

// ============================================================
// 专注雷达
// ============================================================

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const TIME_PERIODS = [
  { key: 'morning', label: '上午 (6-12)', range: [6, 12] },
  { key: 'afternoon', label: '下午 (12-18)', range: [12, 18] },
  { key: 'evening', label: '晚上 (18-24)', range: [18, 24] },
  { key: 'night', label: '深夜 (0-6)', range: [0, 6] },
]

/**
 * 生成专注雷达数据
 */
export function generateFocusRadar(source: RiverSource): FocusRadar {
  const sessions = source.sessions

  // 按星期几
  const byDow: { total: number; count: number; completed: number; totalDuration: number }[] = Array.from({ length: 7 }, () => ({
    total: 0, count: 0, completed: 0, totalDuration: 0,
  }))

  // 按时段
  const byPeriod: Record<string, { total: number; count: number; completed: number; totalDuration: number }> = {}
  for (const p of TIME_PERIODS) {
    byPeriod[p.key] = { total: 0, count: 0, completed: 0, totalDuration: 0 }
  }

  // 按标签
  const byTag: Record<string, { total: number; count: number; completed: number; totalDuration: number }> = {}

  for (const session of sessions) {
    if (!session.startedAt) continue
    const d = new Date(session.startedAt)
    const dow = d.getDay()
    const hour = d.getHours()
    const duration = session.elapsed / 60000
    const completed = (session as any).completed ? 1 : 0

    byDow[dow].total++
    byDow[dow].count += duration
    byDow[dow].completed += completed
    byDow[dow].totalDuration += duration

    for (const p of TIME_PERIODS) {
      const [min, max] = p.range
      if (hour >= min && hour < max) {
        byPeriod[p.key].total++
        byPeriod[p.key].count += duration
        byPeriod[p.key].completed += completed
        byPeriod[p.key].totalDuration += duration
      }
    }

    for (const tag of (session.tags || [])) {
      if (!byTag[tag]) byTag[tag] = { total: 0, count: 0, completed: 0, totalDuration: 0 }
      byTag[tag].total++
      byTag[tag].count += duration
      byTag[tag].completed += completed
      byTag[tag].totalDuration += duration
    }
  }

  const toEntry = (data: { total: number; count: number; completed: number; totalDuration: number }): Omit<FocusRadarEntry, 'label'> => ({
    avgFocusMinutes: data.total > 0 ? Math.round(data.totalDuration / data.total) : 0,
    focusCount: data.total,
    completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    efficiencyScore: data.totalDuration > 0 ? Math.min(100, Math.round((data.completed / Math.max(data.total, 1)) * 100 * (data.totalDuration / Math.max(data.total * 60, 1)))) : 0,
  })

  const byDayOfWeek: FocusRadarEntry[] = byDow.map((data, i) => ({
    ...toEntry(data),
    label: DAY_LABELS[i],
  }))

  const byTimeOfDay: FocusRadarEntry[] = TIME_PERIODS.map(p => ({
    ...toEntry(byPeriod[p.key]),
    label: p.label,
  }))

  const byTagEntries: FocusRadarEntry[] = Object.entries(byTag)
    .map(([tag, data]) => ({ ...toEntry(data), label: tag }))
    .sort((a, b) => b.focusCount - a.focusCount)
    .slice(0, 10)

  // 最佳专注窗口
  const initial = byDayOfWeek[0]!
  const bestDay = byDayOfWeek.reduce<FocusRadarEntry & { dayOfWeek: number }>((best, curr, i) =>
    curr.avgFocusMinutes > best.avgFocusMinutes ? { ...curr, dayOfWeek: i } : best,
    { ...initial, dayOfWeek: 0 },
  )
  const bestPeriod = byTimeOfDay.reduce((best, curr) => curr.avgFocusMinutes > best.avgFocusMinutes ? curr : best, byTimeOfDay[0])

  const overallEfficiency = byDayOfWeek.reduce((s, e) => s + e.efficiencyScore, 0) / Math.max(byDayOfWeek.filter(e => e.focusCount > 0).length, 1)

  return {
    byDayOfWeek,
    byTimeOfDay,
    byTag: byTagEntries,
    bestWindow: {
      dayOfWeek: bestDay.dayOfWeek,
      timeOfDay: bestPeriod.label,
      avgMinutes: bestDay.avgFocusMinutes,
    },
    overallEfficiency: Math.round(overallEfficiency),
  }
}

// ============================================================
// 综合雷达报告
// ============================================================

export interface TimelineRadarReport {
  radar: RadarChart
  heatmap: DayHourHeatmap
  emotionHeatmap: EmotionHeatmap
  tagRadar: TagRadar
  focusRadar: FocusRadar
  generatedAt: string
}

/**
 * 生成完整的时间线雷达报告
 */
export function generateTimelineRadarReport(source: RiverSource): TimelineRadarReport {
  return {
    radar: generateRadarChart(source),
    heatmap: generateDayHourHeatmap(source),
    emotionHeatmap: generateEmotionHeatmap(source),
    tagRadar: generateTagRadar(source),
    focusRadar: generateFocusRadar(source),
    generatedAt: new Date().toISOString(),
  }
}