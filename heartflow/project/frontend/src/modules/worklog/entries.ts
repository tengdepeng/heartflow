// ============================================================
// 更漏 · 日志条目管理
// CRUD + 搜索 + 统计 + 摘要生成
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { LogEntry, LogEntryType, MoodTone, WorklogDailySummary, WeeklySummary, WorklogStats } from './types'
import { WORKLOG_STORAGE_KEYS, LOG_TYPE_META } from './types'

/** 生成唯一 ID */
function genId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 判断两个日期是否为同一天 */
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

/** 获取某天的开始时间 */
function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 获取一周的开始（周一） */
function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 格式化日期为 YYYY-MM-DD */
function formatDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** 星期名称 */
const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 更漏日志管理
 */
export function useWorklog() {
  const entries = ref<LogEntry[]>([])
  const searchQuery = ref('')
  const filterType = ref<LogEntryType | null>(null)
  const filterTag = ref<string | null>(null)

  // ---- 计算属性 ----

  const filteredEntries = computed(() => {
    let result = entries.value

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    if (filterType.value) {
      result = result.filter(e => e.type === filterType.value)
    }

    if (filterTag.value) {
      const tag = filterTag.value
      result = result.filter(e => e.tags.includes(tag))
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    for (const e of entries.value) {
      for (const t of e.tags) tagSet.add(t)
    }
    return [...tagSet].sort()
  })

  const entryCount = computed(() => entries.value.length)

  // ---- CRUD ----

  function addEntry(data: {
    type: LogEntryType
    title: string
    content: string
    mood?: MoodTone
    tags?: string[]
    sessionIds?: string[]
    roomId?: string
  }): LogEntry {
    const entry: LogEntry = {
      id: genId(),
      type: data.type,
      title: data.title,
      content: data.content,
      mood: data.mood,
      tags: data.tags ?? [],
      sessionIds: data.sessionIds ?? [],
      roomId: data.roomId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    entries.value.unshift(entry)
    persist()
    return entry
  }

  function updateEntry(id: string, data: Partial<Omit<LogEntry, 'id' | 'createdAt'>>): LogEntry | null {
    const idx = entries.value.findIndex(e => e.id === id)
    if (idx === -1) return null
    entries.value[idx] = {
      ...entries.value[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    persist()
    return entries.value[idx]
  }

  function removeEntry(id: string): boolean {
    const idx = entries.value.findIndex(e => e.id === id)
    if (idx === -1) return false
    entries.value.splice(idx, 1)
    persist()
    return true
  }

  function getEntry(id: string): LogEntry | undefined {
    return entries.value.find(e => e.id === id)
  }

  // ---- 搜索/过滤 ----

  function setSearchQuery(q: string): void {
    searchQuery.value = q
  }

  function setFilterType(type: LogEntryType | null): void {
    filterType.value = type
  }

  function setFilterTag(tag: string | null): void {
    filterTag.value = tag
  }

  /** 按日期范围查询 */
  function getEntriesByDateRange(start: Date, end: Date): LogEntry[] {
    const startStr = start.toISOString()
    const endStr = end.toISOString()
    return entries.value.filter(e =>
      e.createdAt >= startStr && e.createdAt <= endStr
    )
  }

  /** 获取今日日志 */
  function getTodayEntries(): LogEntry[] {
    const today = new Date()
    return entries.value.filter(e => {
      const d = new Date(e.createdAt)
      return isSameDay(d, today)
    })
  }

  // ---- 摘要生成 ----

  /** 生成每日摘要 */
  function generateDailySummary(date: Date): WorklogDailySummary {
    const dayStart = startOfDay(date)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const dayEntries = entries.value.filter(e => {
      const t = new Date(e.createdAt).getTime()
      return t >= dayStart.getTime() && t < dayEnd.getTime()
    })

    const moodCounts: Record<string, number> = {}
    const tagCounts: Record<string, number> = {}

    for (const e of dayEntries) {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1
      }
      for (const t of e.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      }
    }

    let dominantMood: MoodTone | undefined
    let maxMood = 0
    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxMood) {
        maxMood = count
        dominantMood = mood as MoodTone
      }
    }

    const keyTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag)

    return {
      date: formatDateStr(date),
      entryCount: dayEntries.length,
      totalFocusMinutes: 0, // 由外部注入
      dominantMood,
      keyTags,
      highlightEntry: dayEntries.length > 0 ? dayEntries[0].id : undefined,
    }
  }

  /** 生成周摘要 */
  function generateWeeklySummary(date: Date): WeeklySummary {
    const weekStart = startOfWeek(date)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const dailySummaries: WorklogDailySummary[] = []
    const moodDistribution: Record<MoodTone, number> = {
      energetic: 0, calm: 0, neutral: 0, tired: 0, frustrated: 0, excited: 0,
    }

    const tagCounts: Record<string, number> = {}
    let totalEntries = 0

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
      const summary = generateDailySummary(day)
      dailySummaries.push(summary)
      totalEntries += summary.entryCount

      if (summary.dominantMood) {
        moodDistribution[summary.dominantMood]++
      }
      for (const tag of summary.keyTags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag)

    const milestones = entries.value.filter(
      e => e.type === 'milestone' &&
        new Date(e.createdAt) >= weekStart &&
        new Date(e.createdAt) < weekEnd
    )
    const achievements = milestones.map(e => e.title)

    return {
      weekStart: formatDateStr(weekStart),
      weekEnd: formatDateStr(new Date(weekEnd.getTime() - 1)),
      entryCount: totalEntries,
      dailySummaries,
      totalFocusMinutes: 0,
      moodDistribution,
      topTags,
      achievements,
      reflection: '',
    }
  }

  // ---- 统计 ----

  /** 计算日志统计 */
  function getStats(): WorklogStats {
    const now = new Date()

    // 连续天数
    let streakDays = 0
    let checkDate = startOfDay(now)
    const dateSet = new Set(entries.value.map(e => formatDateStr(new Date(e.createdAt))))

    while (dateSet.has(formatDateStr(checkDate))) {
      streakDays++
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
    }

    // 最高产日
    const dayCounts: Record<string, number> = {}
    for (const e of entries.value) {
      const day = formatDateStr(new Date(e.createdAt))
      dayCounts[day] = (dayCounts[day] || 0) + 1
    }
    let mostProductiveDay = ''
    let maxDayCount = 0
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxDayCount) {
        maxDayCount = count
        mostProductiveDay = day
      }
    }

    // 最高产小时
    const hourCounts: Record<number, number> = {}
    for (const e of entries.value) {
      const h = new Date(e.createdAt).getHours()
      hourCounts[h] = (hourCounts[h] || 0) + 1
    }
    let mostProductiveHour = 9
    let maxHourCount = 0
    for (const [h, count] of Object.entries(hourCounts)) {
      if (count > maxHourCount) {
        maxHourCount = count
        mostProductiveHour = parseInt(h)
      }
    }

    // 情绪趋势（最近 7 天）
    const moodTrend: { date: string; mood: MoodTone }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const summary = generateDailySummary(day)
      if (summary.dominantMood) {
        moodTrend.push({ date: summary.date, mood: summary.dominantMood })
      }
    }

    // 标签分布
    const tagDist: Record<string, number> = {}
    for (const e of entries.value) {
      for (const t of e.tags) {
        tagDist[t] = (tagDist[t] || 0) + 1
      }
    }
    const tagDistribution = Object.entries(tagDist)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 类型分布
    const typeDist: Record<LogEntryType, number> = {
      reflection: 0, plan: 0, journal: 0, insight: 0, review: 0, milestone: 0,
    }
    for (const e of entries.value) {
      typeDist[e.type]++
    }
    const typeDistribution = Object.entries(typeDist).map(([type, count]) => ({
      type: type as LogEntryType,
      count,
    }))

    // 获取最有意义的 day name
    const mpDate = mostProductiveDay ? new Date(mostProductiveDay) : new Date()
    const dayName = DAY_NAMES[mpDate.getDay()]

    return {
      totalEntries: entries.value.length,
      totalFocusMinutes: 0,
      streakDays,
      mostProductiveDay: dayName,
      mostProductiveHour,
      moodTrend,
      tagDistribution,
      typeDistribution,
    }
  }

  // ---- 持久化 ----

  async function persist(): Promise<void> {
    await storage.setKV(WORKLOG_STORAGE_KEYS.ENTRIES, entries.value)
  }

  async function load(): Promise<void> {
    const saved = await storage.getKV<LogEntry[]>(WORKLOG_STORAGE_KEYS.ENTRIES, [])
    entries.value = saved ?? []
  }

  load()

  return {
    // 状态
    entries,
    searchQuery,
    filterType,
    filterTag,
    // 计算属性
    filteredEntries,
    allTags,
    entryCount,
    // CRUD
    addEntry,
    updateEntry,
    removeEntry,
    getEntry,
    // 搜索/过滤
    setSearchQuery,
    setFilterType,
    setFilterTag,
    getEntriesByDateRange,
    getTodayEntries,
    // 摘要
    generateDailySummary,
    generateWeeklySummary,
    // 统计
    getStats,
    // 持久化
    load,
    persist,
    // 元数据
    LOG_TYPE_META,
  }
}