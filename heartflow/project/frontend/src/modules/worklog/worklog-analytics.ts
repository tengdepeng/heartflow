// ============================================================
// 更漏 · 工作日志分析引擎
// 日志趋势分析、生产力统计、关键词提取、时间热力图
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { LogEntry, LogEntryType, MoodTone, WorklogStats } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 日志分析 */
export interface WorklogAnalytics {
  /** 总日志数 */
  totalEntries: number
  /** 本周日志数 */
  weeklyEntries: number
  /** 本月日志数 */
  monthlyEntries: number
  /** 平均每日日志数 */
  avgDailyEntries: number
  /** 日志类型分布 */
  typeDistribution: { type: LogEntryType; count: number; percentage: number }[]
  /** 情绪分布 */
  moodDistribution: { mood: MoodTone; count: number; percentage: number }[]
  /** 高频标签 */
  topTags: { tag: string; count: number }[]
  /** 每日日志趋势（最近30天） */
  dailyTrend: { date: string; count: number }[]
  /** 写作时段热力图 */
  hourlyHeatmap: { hour: number; count: number; avgMood?: string }[]
  /** 平均日志长度（字符） */
  avgContentLength: number
  /** 连续记录天数 */
  streak: number
  /** 最长记录天数 */
  bestStreak: number
}

/** 生产力报告 */
export interface ProductivityReport {
  id: string
  /** 报告周期 */
  period: 'daily' | 'weekly' | 'monthly'
  /** 周期开始 */
  periodStart: string
  /** 周期结束 */
  periodEnd: string
  /** 日志数 */
  entryCount: number
  /** 专注总时长（分钟） */
  totalFocusMinutes: number
  /** 生产力评分 0-100 */
  productivityScore: number
  /** 主要成就 */
  achievements: string[]
  /** 遇到的挑战 */
  challenges: string[]
  /** 下周期计划 */
  nextPlan: string[]
  /** 生成时间 */
  generatedAt: string
}

/** 关键词提取结果 */
export interface KeywordExtraction {
  keyword: string
  count: number
  /** 关联日志数 */
  entryCount: number
  /** 首次出现 */
  firstAppearedAt: string
  /** 最近出现 */
  lastAppearedAt: string
  /** 趋势: rising/stable/declining */
  trend: 'rising' | 'stable' | 'declining'
}

/** 存储键 */
const WORKLOG_ANALYTICS_KEY = 'hf:worklog:analytics'
const PRODUCTIVITY_REPORTS_KEY = 'hf:worklog:productivity'

// ============================================================
// 工作日志分析引擎
// ============================================================

export function useWorklogAnalytics() {
  const analytics = ref<WorklogAnalytics>(loadAnalytics())
  const reports = ref<ProductivityReport[]>(loadReports())

  // ---- 持久化 ----

  function loadAnalytics(): WorklogAnalytics {
    try {
      const raw = storage.getKV<string>(WORKLOG_ANALYTICS_KEY, '')
      if (!raw) return createDefaultAnalytics()
      return JSON.parse(raw)
    } catch { return createDefaultAnalytics() }
  }

  function saveAnalytics() {
    storage.setKV(WORKLOG_ANALYTICS_KEY, JSON.stringify(analytics.value))
  }

  function loadReports(): ProductivityReport[] {
    try {
      const raw = storage.getKV<string>(PRODUCTIVITY_REPORTS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveReports() {
    storage.setKV(PRODUCTIVITY_REPORTS_KEY, JSON.stringify(reports.value))
  }

  function createDefaultAnalytics(): WorklogAnalytics {
    return {
      totalEntries: 0, weeklyEntries: 0, monthlyEntries: 0, avgDailyEntries: 0,
      typeDistribution: [], moodDistribution: [], topTags: [],
      dailyTrend: [], hourlyHeatmap: [], avgContentLength: 0,
      streak: 0, bestStreak: 0,
    }
  }

  // ---- 日志分析 ----

  /** 更新日志分析 */
  function updateAnalytics(entries: LogEntry[], stats: WorklogStats) {
    const a = analytics.value
    a.totalEntries = entries.length

    // 本周/本月
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    a.weeklyEntries = entries.filter(e => e.createdAt.slice(0, 10) >= weekStartStr).length
    a.monthlyEntries = entries.filter(e => e.createdAt.slice(0, 10) >= monthStart).length

    // 类型分布
    const typeMap = new Map<string, number>()
    for (const e of entries) {
      typeMap.set(e.type, (typeMap.get(e.type) ?? 0) + 1)
    }
    a.typeDistribution = [...typeMap.entries()]
      .map(([type, count]) => ({ type: type as LogEntryType, count, percentage: Math.round((count / entries.length) * 100) }))
      .sort((x, y) => y.count - x.count)

    // 情绪分布
    const moodMap = new Map<string, number>()
    for (const e of entries) {
      if (e.mood) moodMap.set(e.mood, (moodMap.get(e.mood) ?? 0) + 1)
    }
    const moodTotal = [...moodMap.values()].reduce((s, v) => s + v, 0)
    a.moodDistribution = [...moodMap.entries()]
      .map(([mood, count]) => ({ mood: mood as MoodTone, count, percentage: moodTotal > 0 ? Math.round((count / moodTotal) * 100) : 0 }))
      .sort((x, y) => y.count - x.count)

    // 标签
    const tagMap = new Map<string, number>()
    for (const e of entries) {
      for (const tag of e.tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
      }
    }
    a.topTags = [...tagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 15)

    // 每日趋势
    const dailyMap = new Map<string, number>()
    for (const e of entries) {
      const day = e.createdAt.slice(0, 10)
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
    }
    a.dailyTrend = [...dailyMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((x, y) => x.date.localeCompare(y.date))
      .slice(-30)

    // 时段热力图
    const hourMap = new Map<number, { count: number; moods: string[] }>()
    for (const e of entries) {
      const hour = new Date(e.createdAt).getHours()
      const entry = hourMap.get(hour) || { count: 0, moods: [] }
      entry.count++
      if (e.mood) entry.moods.push(e.mood)
      hourMap.set(hour, entry)
    }
    a.hourlyHeatmap = [...hourMap.entries()]
      .map(([hour, data]) => {
        const moodCounts = new Map<string, number>()
        for (const m of data.moods) moodCounts.set(m, (moodCounts.get(m) ?? 0) + 1)
        const topMood = [...moodCounts.entries()].sort((x, y) => y[1] - x[1])[0]
        return { hour, count: data.count, avgMood: topMood?.[0] }
      })
      .sort((x, y) => x.hour - y.hour)

    // 平均内容长度
    a.avgContentLength = entries.length > 0
      ? Math.round(entries.reduce((sum, e) => sum + e.content.length, 0) / entries.length)
      : 0

    a.streak = stats.streakDays
    a.bestStreak = Math.max(a.bestStreak, stats.streakDays)

    // 平均每日日志数
    const dates = new Set(entries.map(e => e.createdAt.slice(0, 10)))
    a.avgDailyEntries = dates.size > 0
      ? Math.round((entries.length / dates.size) * 10) / 10
      : 0

    saveAnalytics()
  }

  // ---- 关键词提取 ----

  /** 提取关键词 */
  function extractKeywords(entries: LogEntry[], topN: number = 20): KeywordExtraction[] {
    // 简单分词 + 词频统计
    const wordMap = new Map<string, { count: number; firstDate: string; lastDate: string }>()
    for (const e of entries) {
      const words = e.content
        .replace(/[，。、；：！？\n\r.,;:!?（）()【】\[\]""'']/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 2 && w.length <= 10)
      for (const word of words) {
        const entry = wordMap.get(word) || { count: 0, firstDate: e.createdAt, lastDate: e.createdAt }
        entry.count++
        if (e.createdAt < entry.firstDate) entry.firstDate = e.createdAt
        if (e.createdAt > entry.lastDate) entry.lastDate = e.createdAt
        wordMap.set(word, entry)
      }
    }

    // 过滤常见停用词
    const stopWords = new Set([
      '可以', '一个', '这个', '那个', '我们', '他们', '自己', '什么', '怎么', '没有',
      '已经', '还是', '因为', '所以', '但是', '而且', '如果', '虽然', '不过', '只是',
      '就是', '不是', '应该', '需要', '可能', '一定', '非常', '比较', '之后', '之前',
      '时候', '觉得', '知道', '问题', '事情', '真的', '这些', '那些', '有点', '一点',
      '一种', '一下', '一直', '一样', '开始', '然后', '现在', '今天', '昨天', '明天',
      '最近', '以前', '以后', '目前', '正在', '一起', '很多', '很少', '不太', '不错',
      '也是', '都是', '还有', '什么', '怎么', '为什么', '哪里', '怎样', '这样', '那样',
      '如何', '能够', '会去', '都会', '很难', '不会',
    ])
    const filtered = [...wordMap.entries()]
      .filter(([word]) => !stopWords.has(word) && word.length >= 2)

    // 计算趋势
    const sorted = filtered.sort((x, y) => y[1].count - x[1].count).slice(0, topN)
    return sorted.map(([keyword, data]) => {
      const recentCount = entries.filter(e => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        return new Date(e.createdAt).getTime() > weekAgo && e.content.includes(keyword)
      }).length
      const olderCount = entries.filter(e => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
        return new Date(e.createdAt).getTime() > twoWeeksAgo && new Date(e.createdAt).getTime() <= weekAgo && e.content.includes(keyword)
      }).length
      const trend: 'rising' | 'stable' | 'declining' =
        recentCount > olderCount ? 'rising' : recentCount < olderCount ? 'declining' : 'stable'
      return {
        keyword,
        count: data.count,
        entryCount: entries.filter(e => e.content.includes(keyword)).length,
        firstAppearedAt: data.firstDate,
        lastAppearedAt: data.lastDate,
        trend,
      }
    })
  }

  // ---- 生产力报告 ----

  /** 生成生产力报告 */
  function generateProductivityReport(
    period: 'daily' | 'weekly' | 'monthly',
    entries: LogEntry[],
    totalFocusMinutes: number
  ): ProductivityReport {
    const now = new Date()
    let periodStart: string
    let periodEnd: string

    if (period === 'daily') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
    } else if (period === 'weekly') {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      periodStart = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString()
      periodEnd = now.toISOString()
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      periodEnd = now.toISOString()
    }

    const periodEntries = entries.filter(e =>
      e.createdAt >= periodStart && e.createdAt <= periodEnd
    )

    // 生产力评分
    const entryScore = Math.min(50, periodEntries.length * 5)
    const focusScore = Math.min(30, Math.round(totalFocusMinutes / 10))
    const diversityScore = Math.min(20, new Set(periodEntries.map(e => e.type)).size * 4)
    const productivityScore = entryScore + focusScore + diversityScore

    // 成就：里程碑和洞察
    const achievements = periodEntries
      .filter(e => e.type === 'milestone' || e.type === 'insight')
      .map(e => e.title)
      .slice(0, 5)

    // 挑战：反思中提到的困难
    const challenges = periodEntries
      .filter(e => e.type === 'reflection')
      .map(e => e.title)
      .slice(0, 3)

    const report: ProductivityReport = {
      id: `report_${Date.now()}`,
      period,
      periodStart,
      periodEnd,
      entryCount: periodEntries.length,
      totalFocusMinutes,
      productivityScore,
      achievements,
      challenges,
      nextPlan: [],
      generatedAt: new Date().toISOString(),
    }

    reports.value.push(report)
    saveReports()
    return report
  }

  /** 最新报告 */
  const latestReport = computed(() => {
    const sorted = [...reports.value].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    )
    return sorted[0] || null
  })

  return {
    analytics,
    reports,
    latestReport,
    updateAnalytics,
    extractKeywords,
    generateProductivityReport,
  }
}