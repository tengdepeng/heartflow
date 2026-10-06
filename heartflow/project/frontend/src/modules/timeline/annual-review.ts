// ============================================================
// 时间长廊 · 年度回顾报告（P18-1）
// 年度叙事生成、年度统计、周年对比、成长轨迹、年度洞察
// ============================================================

import type { RiverItem } from './river'
import type { Milestone } from './narrative-generator'
import { detectMilestones } from './narrative-generator'
import { getLocalDateKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 年度回顾报告 */
export interface AnnualReview {
  id: string
  /** 年度 */
  year: number
  /** 标题 */
  title: string
  /** 年度总结 */
  summary: string
  /** 年度统计 */
  stats: AnnualStats
  /** 月度统计 */
  monthlyStats: MonthlyStat[]
  /** 里程碑事件 */
  milestones: Milestone[]
  /** 成长轨迹 */
  growthTrajectory: GrowthTrajectory
  /** 年度关键词 */
  keywords: AnnualKeyword[]
  /** 年度对比 */
  yearComparison?: YearComparison
  /** 年度洞察 */
  insights: AnnualInsight[]
  /** 新年展望 */
  outlook: AnnualOutlook
  /** 创建时间 */
  createdAt: string
}

/** 年度统计 */
export interface AnnualStats {
  /** 全年专注总时长（分钟） */
  totalFocusMinutes: number
  /** 全年专注天数 */
  focusDays: number
  /** 日均专注 */
  avgDailyFocus: number
  /** 最长连续专注 */
  longestStreak: number
  /** 总结晶数 */
  totalCrystals: number
  /** 总笔记数 */
  totalNotes: number
  /** 总情绪记录 */
  totalEmotions: number
  /** 总心锚数 */
  totalAnchors: number
  /** 完成心锚数 */
  completedAnchors: number
  /** 心锚完成率 */
  anchorCompletionRate: number
  /** 年度主导情绪 */
  dominantEmotion: string
  /** 情绪健康指数 */
  emotionalHealthScore: number
  /** 最佳月份 */
  bestMonth: number
  /** 最佳月份描述 */
  bestMonthLabel: string
  /** 标签词云 */
  topTags: AnnualKeyword[]
  /** 总积分 */
  totalPoints: number
  /** 年度等级 */
  annualLevel: string
  /** 年度排名（百分位） */
  annualPercentile: number
}

/** 月度统计 */
export interface MonthlyStat {
  month: number
  label: string
  focusMinutes: number
  crystals: number
  notes: number
  emotions: number
  anchors: number
  completedAnchors: number
  dominantEmotion: string
  highlight: string
  /** 月度评分 0-100 */
  score: number
}

/** 成长轨迹 */
export interface GrowthTrajectory {
  /** 月度专注趋势 */
  focusTrend: TrendPoint[]
  /** 月度结晶趋势 */
  crystalTrend: TrendPoint[]
  /** 月度笔记趋势 */
  noteTrend: TrendPoint[]
  /** 增长阶段 */
  phases: GrowthPhase[]
  /** 总体趋势 */
  overallTrend: 'significant_growth' | 'moderate_growth' | 'stable' | 'declining'
  /** 趋势描述 */
  trendDescription: string
}

/** 趋势点 */
export interface TrendPoint {
  month: number
  label: string
  value: number
  /** 环比变化 */
  change: number
  /** 年初至今累计 */
  cumulative: number
}

/** 增长阶段 */
export interface GrowthPhase {
  name: string
  startMonth: number
  endMonth: number
  description: string
  /** 阶段特征 */
  characteristics: string[]
  /** 关键事件 */
  keyEvents: string[]
}

/** 年度关键词 */
export interface AnnualKeyword {
  text: string
  weight: number
  category: 'tag' | 'emotion' | 'insight' | 'habit'
  frequency: number
  trend: 'rising' | 'falling' | 'stable'
}

/** 年度对比 */
export interface YearComparison {
  currentYear: number
  previousYear: number
  comparison: {
    metric: string
    current: number
    previous: number
    change: number
    changePercent: number
    trend: 'up' | 'down' | 'same'
    unit: string
  }[]
  summary: string
  notableChanges: string[]
}

/** 年度洞察 */
export interface AnnualInsight {
  id: string
  type: 'growth' | 'pattern' | 'achievement' | 'improvement' | 'warning'
  title: string
  description: string
  /** 置信度 0-1 */
  confidence: number
  /** 相关数据 */
  data: Record<string, number | string>
  /** 建议 */
  suggestion?: string
}

/** 年度展望 */
export interface AnnualOutlook {
  /** 新年目标 */
  goals: AnnualGoal[]
  /** 重点领域 */
  focusAreas: string[]
  /** 新年寄语 */
  message: string
  /** 建议习惯 */
  suggestedHabits: string[]
}

/** 年度目标 */
export interface AnnualGoal {
  area: string
  target: string
  /** 可衡量指标 */
  metrics: string
  /** 难度 */
  difficulty: 'easy' | 'medium' | 'hard'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
}

/** 年度回顾配置 */
export interface AnnualReviewConfig {
  /** 最小里程碑重要性 */
  minMilestoneSignificance: number
  /** 增长阶段检测阈值 */
  phaseGrowthThreshold: number
  /** 关键词最小频率 */
  minKeywordFrequency: number
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: AnnualReviewConfig = {
  minMilestoneSignificance: 30,
  phaseGrowthThreshold: 20,
  minKeywordFrequency: 3,
}

// 月份标签
const MONTH_LABELS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]

// ============================================================
// useAnnualReview
// ============================================================

export function useAnnualReview() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<AnnualReviewConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 生成年度回顾 ----

  /**
   * 生成年度回顾报告
   */
  function generateReview(
    items: RiverItem[],
    year: number,
    previousYearItems?: RiverItem[],
  ): AnnualReview {
    const now = new Date().toISOString()
    const yearItems = filterByYear(items, year)

    const stats = computeAnnualStats(yearItems)
    const monthlyStats = computeMonthlyStats(yearItems, year)
    const milestones = detectMilestones(yearItems).filter(
      m => m.significance >= config.minMilestoneSignificance,
    )
    const growthTrajectory = computeGrowthTrajectory(monthlyStats)
    const keywords = extractKeywords(yearItems)
    const insights = generateInsights(stats, growthTrajectory, milestones, keywords)
    const outlook = generateOutlook(stats, milestones)

    let yearComparison: YearComparison | undefined
    if (previousYearItems && previousYearItems.length > 0) {
      yearComparison = generateYearComparison(yearItems, previousYearItems, year, year - 1)
    }

    const summary = generateYearSummary(year, stats, growthTrajectory, milestones)

    return {
      id: `annual_review_${year}_${Date.now()}`,
      year,
      title: `${year} 年度回顾`,
      summary,
      stats,
      monthlyStats,
      milestones,
      growthTrajectory,
      keywords,
      yearComparison,
      insights,
      outlook,
      createdAt: now,
    }
  }

  // ---- 年度统计 ----

  function computeAnnualStats(
    items: RiverItem[],
  ): AnnualStats {
    const sessions = items.filter(i => i.type === 'session')
    const crystals = items.filter(i => i.type === 'crystal')
    const notes = items.filter(i => i.type === 'note')
    const emotions = items.filter(i => i.type === 'emotion')
    const anchors = items.filter(i => i.type === 'anchor')

    const totalFocusMinutes = sessions.reduce(
      (s, i) => s + (i.session?.elapsed ? Math.round(i.session.elapsed / 60000) : 0), 0,
    )

    // 专注天数
    // ⚠️ 专注天数按本地日历日去重（UTC 口径会让凌晨会话归到昨天、连续天数虚高）
    const focusDates = new Set(sessions.map(s => getLocalDateKey(new Date(s.ts))))
    const focusDays = focusDates.size

    const avgDailyFocus = focusDays > 0 ? Math.round(totalFocusMinutes / focusDays) : 0

    // 最长连续
    const longestStreak = computeLongestStreak(sessions)

    // 情绪统计
    const emotionCounts: Record<string, number> = {}
    for (const e of emotions) {
      const emotion = e.emotion?.type || 'neutral'
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
    }
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

    // 情绪健康指数
    const positiveEmotions = ['happy', 'joy', 'excited', 'grateful', 'calm', 'hopeful', 'proud', 'loved', 'motivated']
    const negativeEmotions = ['sad', 'angry', 'anxious', 'frustrated', 'stressed', 'disappointed', 'lonely']
    let positiveCount = 0, negativeCount = 0
    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (positiveEmotions.includes(emotion)) positiveCount += count
      if (negativeEmotions.includes(emotion)) negativeCount += count
    }
    const total = positiveCount + negativeCount || 1
    const emotionalHealthScore = Math.round((positiveCount / total) * 100)

    // 最佳月份
    const monthlyFocus = new Map<number, number>()
    for (const s of sessions) {
      const month = new Date(s.ts).getMonth() + 1
      const mins = s.session?.elapsed ? Math.round(s.session.elapsed / 60000) : 0
      monthlyFocus.set(month, (monthlyFocus.get(month) || 0) + mins)
    }
    let bestMonth = 0, bestMonthFocus = 0
    for (const [m, f] of monthlyFocus) {
      if (f > bestMonthFocus) { bestMonth = m; bestMonthFocus = f }
    }

    // 标签
    const allTags = new Map<string, number>()
    for (const item of items) {
      const tags = item.crystal?.tags || item.session?.tags || item.note?.tags || item.anchor?.tags || []
      for (const t of tags) {
        allTags.set(t, (allTags.get(t) || 0) + 1)
      }
    }
    const topTags: AnnualKeyword[] = [...allTags.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([text, frequency]) => ({
        text, weight: Math.min(1, frequency / 20), category: 'tag' as const,
        frequency, trend: 'stable' as const,
      }))

    // 积分
    const totalPoints = crystals.length * 10 + notes.length * 5 + anchors.filter(a => a.anchor?.done).length * 20

    return {
      totalFocusMinutes,
      focusDays,
      avgDailyFocus,
      longestStreak,
      totalCrystals: crystals.length,
      totalNotes: notes.length,
      totalEmotions: emotions.length,
      totalAnchors: anchors.length,
      completedAnchors: anchors.filter(a => a.anchor?.done).length,
      anchorCompletionRate: anchors.length > 0
        ? Math.round((anchors.filter(a => a.anchor?.done).length / anchors.length) * 100)
        : 0,
      dominantEmotion,
      emotionalHealthScore,
      bestMonth,
      bestMonthLabel: bestMonth > 0 ? MONTH_LABELS[bestMonth - 1] : '',
      topTags,
      totalPoints,
      annualLevel: getAnnualLevel(totalPoints),
      annualPercentile: Math.min(99, Math.round((totalPoints / 10000) * 100)),
    }
  }

  // ---- 月度统计 ----

  function computeMonthlyStats(items: RiverItem[], year: number): MonthlyStat[] {
    const monthlyStats: MonthlyStat[] = []

    for (let month = 1; month <= 12; month++) {
      const monthItems = items.filter(i => {
        const d = new Date(i.ts)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })

      const sessions = monthItems.filter(i => i.type === 'session')
      const focusMinutes = sessions.reduce(
        (s, i) => s + (i.session?.elapsed ? Math.round(i.session.elapsed / 60000) : 0), 0,
      )
      const crystals = monthItems.filter(i => i.type === 'crystal').length
      const notes = monthItems.filter(i => i.type === 'note').length
      const emotions = monthItems.filter(i => i.type === 'emotion').length
      const anchors = monthItems.filter(i => i.type === 'anchor').length
      const completedAnchors = monthItems.filter(i => i.type === 'anchor' && i.anchor?.done).length

      // 主导情绪
      const emotionCounts: Record<string, number> = {}
      for (const e of monthItems.filter(i => i.type === 'emotion')) {
        const emotion = e.emotion?.type || 'neutral'
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
      }
      const dominantEmotion = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

      // 月度评分
      const score = Math.round(
        Math.min(100, (focusMinutes / 60) * 5 + crystals * 2 + notes * 3 + completedAnchors * 10),
      )

      // 月度亮点
      const highlight = generateMonthHighlight(focusMinutes, crystals, notes)

      monthlyStats.push({
        month,
        label: MONTH_LABELS[month - 1],
        focusMinutes,
        crystals,
        notes,
        emotions,
        anchors,
        completedAnchors,
        dominantEmotion,
        highlight,
        score,
      })
    }

    return monthlyStats
  }

  // ---- 成长轨迹 ----

  function computeGrowthTrajectory(monthlyStats: MonthlyStat[]): GrowthTrajectory {
    const focusTrend: TrendPoint[] = monthlyStats.map((s, i) => ({
      month: s.month,
      label: s.label,
      value: s.focusMinutes,
      change: i > 0
        ? monthlyStats[i - 1].focusMinutes > 0
          ? Math.round(((s.focusMinutes - monthlyStats[i - 1].focusMinutes) / monthlyStats[i - 1].focusMinutes) * 100)
          : 0
        : 0,
      cumulative: monthlyStats.slice(0, i + 1).reduce((sum, m) => sum + m.focusMinutes, 0),
    }))

    const crystalTrend: TrendPoint[] = monthlyStats.map((s, i) => ({
      month: s.month,
      label: s.label,
      value: s.crystals,
      change: i > 0 ? s.crystals - monthlyStats[i - 1].crystals : 0,
      cumulative: monthlyStats.slice(0, i + 1).reduce((sum, m) => sum + m.crystals, 0),
    }))

    const noteTrend: TrendPoint[] = monthlyStats.map((s, i) => ({
      month: s.month,
      label: s.label,
      value: s.notes,
      change: i > 0 ? s.notes - monthlyStats[i - 1].notes : 0,
      cumulative: monthlyStats.slice(0, i + 1).reduce((sum, m) => sum + m.notes, 0),
    }))

    // 增长阶段
    const phases = detectGrowthPhases(monthlyStats)

    // 总体趋势
    const activeMonths = monthlyStats.filter(m => m.focusMinutes > 0 || m.notes > 0)
    if (activeMonths.length < 3) {
      return {
        focusTrend, crystalTrend, noteTrend,
        phases,
        overallTrend: 'stable',
        trendDescription: '数据不足，无法判断趋势',
      }
    }

    const firstHalf = activeMonths.slice(0, Math.floor(activeMonths.length / 2))
    const secondHalf = activeMonths.slice(Math.floor(activeMonths.length / 2))
    const firstAvg = firstHalf.reduce((s, m) => s + m.score, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, m) => s + m.score, 0) / secondHalf.length
    const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0

    let overallTrend: GrowthTrajectory['overallTrend'] = 'stable'
    let trendDescription = '全年保持稳定节奏'
    if (growthRate > 30) {
      overallTrend = 'significant_growth'
      trendDescription = '全年保持显著增长，进步明显'
    } else if (growthRate > 10) {
      overallTrend = 'moderate_growth'
      trendDescription = '全年稳步增长，持续进步中'
    } else if (growthRate < -10) {
      overallTrend = 'declining'
      trendDescription = '全年有所下滑，需要重新找回节奏'
    }

    return { focusTrend, crystalTrend, noteTrend, phases, overallTrend, trendDescription }
  }

  // ---- 年度对比 ----

  function generateYearComparison(
    currentItems: RiverItem[],
    previousItems: RiverItem[],
    currentYear: number,
    previousYear: number,
  ): YearComparison {
    const current = computeYearSummary(currentItems)
    const previous = computeYearSummary(previousItems)

    const metrics = [
      { metric: '专注总时长', current: current.focusMinutes, previous: previous.focusMinutes, unit: '分钟' },
      { metric: '专注天数', current: current.focusDays, previous: previous.focusDays, unit: '天' },
      { metric: '结晶数', current: current.crystals, previous: previous.crystals, unit: '个' },
      { metric: '笔记数', current: current.notes, previous: previous.notes, unit: '篇' },
      { metric: '情绪记录', current: current.emotions, previous: previous.emotions, unit: '次' },
      { metric: '心锚完成', current: current.anchors, previous: previous.anchors, unit: '个' },
    ]

    const comparison = metrics.map(m => {
      const change = m.current - m.previous
      const changePercent = m.previous > 0
        ? Math.round((change / m.previous) * 100)
        : m.current > 0 ? 100 : 0
      return {
        ...m,
        change,
        changePercent,
        trend: changePercent > 5 ? 'up' as const : changePercent < -5 ? 'down' as const : 'same' as const,
      }
    })

    const upCount = comparison.filter(c => c.trend === 'up').length
    const downCount = comparison.filter(c => c.trend === 'down').length

    const notableChanges: string[] = []
    for (const c of comparison) {
      if (Math.abs(c.changePercent) > 20) {
        const dir = c.trend === 'up' ? '提升' : '下降'
        notableChanges.push(`${c.metric}${dir} ${Math.abs(c.changePercent)}%`)
      }
    }

    return {
      currentYear,
      previousYear,
      comparison,
      summary: `与 ${previousYear} 年相比，${upCount} 项指标提升，${downCount} 项指标下降。${notableChanges.length > 0 ? `显著变化：${notableChanges.join('；')}。` : ''}`,
      notableChanges,
    }
  }

  // ---- 关键词提取 ----

  function extractKeywords(
    items: RiverItem[],
  ): AnnualKeyword[] {
    const wordMap = new Map<string, { count: number; months: Set<number>; category: AnnualKeyword['category'] }>()

    for (const item of items) {
      // 标签
      const tags = item.crystal?.tags || item.session?.tags || item.note?.tags || item.anchor?.tags || []
      const month = new Date(item.ts).getMonth() + 1
      for (const t of tags) {
        const existing = wordMap.get(t) || { count: 0, months: new Set<number>(), category: 'tag' as const }
        existing.count++
        existing.months.add(month)
        wordMap.set(t, existing)
      }

      // 情绪
      if (item.type === 'emotion' && item.emotion) {
        const emotion = item.emotion.type || 'neutral'
        const existing = wordMap.get(emotion) || { count: 0, months: new Set<number>(), category: 'emotion' as const }
        existing.count++
        existing.months.add(month)
        wordMap.set(emotion, existing)
      }
    }

    const keywords: AnnualKeyword[] = []
    for (const [text, data] of wordMap) {
      if (data.count < config.minKeywordFrequency) continue

      const months = [...data.months].sort()
      let trend: AnnualKeyword['trend'] = 'stable'
      if (months.length >= 3) {
        const firstHalf = months.filter(m => m <= 6).length
        const secondHalf = months.filter(m => m > 6).length
        if (secondHalf > firstHalf * 1.5) trend = 'rising'
        else if (firstHalf > secondHalf * 1.5) trend = 'falling'
      }

      keywords.push({
        text,
        weight: Math.min(1, data.count / 20),
        category: data.category,
        frequency: data.count,
        trend,
      })
    }

    return keywords
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)
  }

  // ---- 年度洞察 ----

  function generateInsights(
    stats: AnnualStats,
    trajectory: GrowthTrajectory,
    milestones: Milestone[],
    keywords: AnnualKeyword[],
  ): AnnualInsight[] {
    const insights: AnnualInsight[] = []

    // 1. 成长洞察
    if (trajectory.overallTrend === 'significant_growth') {
      insights.push({
        id: 'growth-significant',
        type: 'growth',
        title: '显著成长年',
        description: `今年是进步显著的一年，专注总时长 ${stats.totalFocusMinutes} 分钟，月均 ${stats.avgDailyFocus} 分钟/天`,
        confidence: 0.9,
        data: { totalFocus: stats.totalFocusMinutes, avgDaily: stats.avgDailyFocus },
        suggestion: '保持当前节奏，可以尝试挑战更高难度目标',
      })
    }

    // 2. 成就洞察
    if (milestones.length >= 5) {
      insights.push({
        id: 'achievement-rich',
        type: 'achievement',
        title: '里程碑丰收年',
        description: `今年达成 ${milestones.length} 个重要里程碑，包括：${milestones.slice(0, 3).map(m => m.title).join('、')}`,
        confidence: 0.85,
        data: { milestoneCount: milestones.length },
      })
    }

    // 3. 情绪洞察
    if (stats.emotionalHealthScore >= 80) {
      insights.push({
        id: 'emotion-positive',
        type: 'pattern',
        title: '情绪健康良好',
        description: `年度情绪健康指数 ${stats.emotionalHealthScore}%，主导情绪为「${stats.dominantEmotion}」，整体心态积极`,
        confidence: 0.8,
        data: { healthScore: stats.emotionalHealthScore, dominant: stats.dominantEmotion },
        suggestion: '继续保持积极心态，记录成功经验',
      })
    } else if (stats.emotionalHealthScore < 50) {
      insights.push({
        id: 'emotion-concern',
        type: 'warning',
        title: '情绪健康需关注',
        description: `年度情绪健康指数 ${stats.emotionalHealthScore}%，建议增加情绪调节和自我关怀`,
        confidence: 0.75,
        data: { healthScore: stats.emotionalHealthScore },
        suggestion: '尝试正念冥想、规律运动或寻求支持',
      })
    }

    // 4. 习惯洞察
    const risingKeywords = keywords.filter(k => k.trend === 'rising')
    if (risingKeywords.length >= 3) {
      insights.push({
        id: 'rising-trends',
        type: 'pattern',
        title: '新兴趋势',
        description: `「${risingKeywords.slice(0, 3).map(k => k.text).join('」、「')}」等关键词在下半年呈现上升趋势`,
        confidence: 0.7,
        data: { risingCount: risingKeywords.length },
        suggestion: '这些领域值得在新的一年继续投入',
      })
    }

    // 5. 改进洞察
    if (trajectory.overallTrend === 'declining') {
      insights.push({
        id: 'improvement-needed',
        type: 'improvement',
        title: '需要重新出发',
        description: '今年整体趋势有所下滑，但每个低谷都是重新出发的机会',
        confidence: 0.8,
        data: { trend: 'declining' },
        suggestion: '从最小可行习惯开始，重建自律节奏',
      })
    }

    // 6. 最佳月份
    if (stats.bestMonth > 0) {
      insights.push({
        id: 'best-month',
        type: 'achievement',
        title: `最佳月份：${stats.bestMonthLabel}`,
        description: `${stats.bestMonthLabel}是本年度表现最好的月份，专注时长和产出均达到峰值`,
        confidence: 0.9,
        data: { bestMonth: stats.bestMonth },
        suggestion: '回顾这个月的成功经验，尝试在新的一年复制',
      })
    }

    return insights
  }

  // ---- 年度展望 ----

  function generateOutlook(
    stats: AnnualStats,
    milestones: Milestone[],
  ): AnnualOutlook {
    const goals: AnnualGoal[] = []
    const focusAreas: string[] = []
    const suggestedHabits: string[] = []

    // 专注目标
    if (stats.avgDailyFocus < 60) {
      goals.push({
        area: '专注力',
        target: '日均专注达到 60 分钟',
        metrics: '日均专注时长',
        difficulty: 'medium',
        priority: 'high',
      })
      suggestedHabits.push('每日番茄钟', '专注时段规划')
    } else {
      goals.push({
        area: '专注力',
        target: '保持日均专注 60 分钟以上',
        metrics: '日均专注时长',
        difficulty: 'easy',
        priority: 'medium',
      })
    }

    // 笔记目标
    if (stats.totalNotes < 100) {
      goals.push({
        area: '知识沉淀',
        target: '完成 100 篇笔记',
        metrics: '笔记总数',
        difficulty: 'medium',
        priority: 'high',
      })
      suggestedHabits.push('每日反思', '阅读笔记')
    }

    // 情绪目标
    if (stats.emotionalHealthScore < 70) {
      goals.push({
        area: '情绪管理',
        target: '提升情绪健康指数至 70%',
        metrics: '情绪健康指数',
        difficulty: 'hard',
        priority: 'high',
      })
      focusAreas.push('情绪调节')
      suggestedHabits.push('每日情绪记录', '正念冥想')
    }

    // 心锚目标
    if (stats.anchorCompletionRate < 70) {
      goals.push({
        area: '目标达成',
        target: '心锚完成率提升至 70%',
        metrics: '心锚完成率',
        difficulty: 'medium',
        priority: 'medium',
      })
      focusAreas.push('目标管理')
    }

    // 里程碑延续
    const topMilestone = milestones[0]
    if (topMilestone) {
      focusAreas.push(topMilestone.type === 'streak' ? '连续打卡' : '持续产出')
    }

    const message = generateOutlookMessage(stats, milestones)

    return {
      goals,
      focusAreas: [...new Set(focusAreas)],
      message,
      suggestedHabits: [...new Set(suggestedHabits)],
    }
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  function filterByYear(items: RiverItem[], year: number): RiverItem[] {
    return items.filter(i => {
      const d = new Date(i.ts)
      return d.getFullYear() === year
    })
  }

  function computeLongestStreak(sessions: RiverItem[]): number {
    const dates = new Set<string>()
    for (const s of sessions) {
      dates.add(getLocalDateKey(new Date(s.ts)))
    }
    const sorted = [...dates].sort()
    let maxStreak = 0, currentStreak = 0
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) { currentStreak = 1; continue }
      const prev = new Date(sorted[i - 1])
      const curr = new Date(sorted[i])
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      if (diff === 1) {
        currentStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1
      }
    }
    return Math.max(maxStreak, currentStreak)
  }

  function getAnnualLevel(points: number): string {
    if (points >= 5000) return '传说级'
    if (points >= 3000) return '大师级'
    if (points >= 2000) return '专家级'
    if (points >= 1000) return '达人之旅'
    if (points >= 500) return '学徒之路'
    return '初学者'
  }

  function generateMonthHighlight(
    focusMinutes: number,
    crystals: number,
    notes: number,
  ): string {
    const parts: string[] = []
    if (focusMinutes > 600) parts.push('专注高产月')
    if (crystals >= 10) parts.push('结晶丰收')
    if (notes >= 15) parts.push('思考密集')
    if (parts.length === 0 && focusMinutes > 0) parts.push('稳步推进')
    if (parts.length === 0) parts.push('暂无记录')
    return parts.join('，')
  }

  function detectGrowthPhases(monthlyStats: MonthlyStat[]): GrowthPhase[] {
    const phases: GrowthPhase[] = []
    const active = monthlyStats.filter(m => m.score > 0)
    if (active.length < 3) return phases

    // 简单分段：Q1-Q4
    const quarters = [
      { name: 'Q1 开篇', start: 1, end: 3 },
      { name: 'Q2 深耕', start: 4, end: 6 },
      { name: 'Q3 冲刺', start: 7, end: 9 },
      { name: 'Q4 收官', start: 10, end: 12 },
    ]

    for (const q of quarters) {
      const qMonths = monthlyStats.filter(m => m.month >= q.start && m.month <= q.end)
      const activeMonths = qMonths.filter(m => m.score > 0)
      if (activeMonths.length === 0) continue

      const avgScore = activeMonths.reduce((s, m) => s + m.score, 0) / activeMonths.length
      const characteristics: string[] = []

      if (avgScore > 60) characteristics.push('高效产出期')
      else if (avgScore > 30) characteristics.push('稳定推进期')
      else characteristics.push('调整适应期')

      const focusSum = activeMonths.reduce((s, m) => s + m.focusMinutes, 0)
      if (focusSum > 1800) characteristics.push('深度专注')

      const noteSum = activeMonths.reduce((s, m) => s + m.notes, 0)
      if (noteSum > 30) characteristics.push('高频思考')

      phases.push({
        name: q.name,
        startMonth: q.start,
        endMonth: q.end,
        description: `${q.name}阶段，${characteristics.join('，')}`,
        characteristics,
        keyEvents: activeMonths
          .filter(m => m.highlight)
          .slice(0, 3)
          .map(m => `${m.label}：${m.highlight}`),
      })
    }

    return phases
  }

  interface YearSummary {
    focusMinutes: number
    focusDays: number
    crystals: number
    notes: number
    emotions: number
    anchors: number
  }

  function computeYearSummary(items: RiverItem[]): YearSummary {
    const sessions = items.filter(i => i.type === 'session')
    // ⚠️ 专注天数按本地日历日去重（UTC 口径会让凌晨会话归到昨天、连续天数虚高）
    const focusDates = new Set(sessions.map(s => getLocalDateKey(new Date(s.ts))))
    return {
      focusMinutes: sessions.reduce(
        (s, i) => s + (i.session?.elapsed ? Math.round(i.session.elapsed / 60000) : 0), 0,
      ),
      focusDays: focusDates.size,
      crystals: items.filter(i => i.type === 'crystal').length,
      notes: items.filter(i => i.type === 'note').length,
      emotions: items.filter(i => i.type === 'emotion').length,
      anchors: items.filter(i => i.type === 'anchor' && i.anchor?.done).length,
    }
  }

  function generateYearSummary(
    year: number,
    stats: AnnualStats,
    trajectory: GrowthTrajectory,
    milestones: Milestone[],
  ): string {
    const parts: string[] = []

    parts.push(`${stats.totalFocusMinutes} 分钟专注`)
    parts.push(`${stats.totalCrystals} 个结晶`)
    parts.push(`${stats.totalNotes} 篇笔记`)

    if (milestones.length > 0) {
      parts.push(`${milestones.length} 个里程碑`)
    }

    parts.push(`情绪健康指数 ${stats.emotionalHealthScore}%`)

    const trendMap: Record<string, string> = {
      significant_growth: '显著增长',
      moderate_growth: '稳步增长',
      stable: '保持稳定',
      declining: '有所下滑',
    }

    return `${year} 年，${parts.join('，')}。整体趋势：${trendMap[trajectory.overallTrend] || '数据收集中'}。`
  }

  function generateOutlookMessage(
    stats: AnnualStats,
    milestones: Milestone[],
  ): string {
    if (milestones.length >= 8) {
      return '辉煌的一年已成过去，新的篇章等待书写。带着这份成就感和经验，继续向更高的目标迈进。'
    }
    if (stats.avgDailyFocus > 60) {
      return '稳定的节奏是最大的财富。新的一年，在保持的基础上，探索更多可能性。'
    }
    if (stats.totalNotes > 0 || stats.totalEmotions > 0) {
      return '每一份记录都是成长的印记。新的一年，继续用笔尖和心锚描绘属于自己的精彩。'
    }
    return '新的一年，新的开始。每一个小小的习惯，都是通往更好自己的阶梯。'
  }

  return {
    config,
    setConfig,
    generateReview,
    computeAnnualStats,
    computeMonthlyStats,
    computeGrowthTrajectory,
    generateYearComparison,
    extractKeywords,
    generateInsights,
    generateOutlook,
    MONTH_LABELS,
  }
}