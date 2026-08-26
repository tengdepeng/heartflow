// ============================================================
// 逐日心锚 · 锚点回顾（P18-4）
// 定期回顾锚点完成情况、模式分析、生产力指标
// ============================================================

import type { Anchor } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 回顾周期 */
export type ReviewPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/** 回顾周期元数据 */
export interface ReviewPeriodMeta {
  key: ReviewPeriod
  label: string
  /** 天数 */
  days: number
  icon: string
}

/** 锚点回顾报告 */
export interface AnchorReview {
  /** 回顾 ID */
  id: string
  /** 周期 */
  period: ReviewPeriod
  /** 时间范围 */
  range: { start: string; end: string }
  /** 总锚点数 */
  totalAnchors: number
  /** 已完成数 */
  completedCount: number
  /** 完成率 0-100 */
  completionRate: number
  /** 必锚完成率 */
  mustCompletionRate: number
  /** 可锚完成率 */
  canCompletionRate: number
  /** 浮锚完成率 */
  floatCompletionRate: number
  /** 平均锚定时间（分钟） */
  avgCompletionTime: number
  /** 最快锚定时间 */
  fastestCompletion: number
  /** 最慢锚定时间 */
  slowestCompletion: number
  /** 漂移总数 */
  totalDrifts: number
  /** 平均每日锚点数 */
  avgDailyAnchors: number
  /** 最高产日 */
  mostProductiveDay: { date: string; count: number }
  /** 最高产标签 */
  topTags: { tag: string; count: number }[]
  /** 最高产分类 */
  topCategories: { category: string; count: number }[]
  /** 优先级分布 */
  priorityDistribution: { must: number; can: number; float: number }
  /** 每日趋势 */
  dailyTrend: DailyReviewTrend[]
  /** 反思笔记 */
  reflectionNotes: string[]
  /** 改进建议 */
  suggestions: string[]
  /** 生成时间 */
  generatedAt: string
}

/** 每日回顾趋势 */
export interface DailyReviewTrend {
  date: string
  total: number
  completed: number
  drifts: number
  completionRate: number
}

/** 回顾配置 */
export interface ReviewConfig {
  /** 是否自动生成回顾 */
  autoGenerate: boolean
  /** 自动生成时间（HH:mm） */
  autoGenerateTime: string
  /** 包含已完成锚点 */
  includeDone: boolean
  /** 包含锚点池 */
  includePool: boolean
  /** 反思提示模板 */
  reflectionPrompts: string[]
}

/** 回顾模板 */
export interface ReviewTemplate {
  id: string
  name: string
  period: ReviewPeriod
  prompts: string[]
  icon: string
}

// ============================================================
// 元数据
// ============================================================

export const REVIEW_PERIOD_META: Record<ReviewPeriod, ReviewPeriodMeta> = {
  daily: { key: 'daily', label: '日回顾', days: 1, icon: '📅' },
  weekly: { key: 'weekly', label: '周回顾', days: 7, icon: '📊' },
  monthly: { key: 'monthly', label: '月回顾', days: 30, icon: '🌙' },
  quarterly: { key: 'quarterly', label: '季回顾', days: 90, icon: '🗓️' },
  yearly: { key: 'yearly', label: '年回顾', days: 365, icon: '🎯' },
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  autoGenerate: false,
  autoGenerateTime: '21:00',
  includeDone: true,
  includePool: false,
  reflectionPrompts: [
    '今天完成了哪些重要的事？',
    '有哪些事情没有完成？原因是什么？',
    '明天的优先级是什么？',
    '有什么想对自己说的？',
  ],
}

const DEFAULT_REVIEW_TEMPLATES: ReviewTemplate[] = [
  {
    id: 'template-daily',
    name: '日回顾模板',
    period: 'daily',
    prompts: [
      '今天完成了哪些锚点？',
      '是否有未完成的锚点需要漂移到明天？',
      '今天的精力分配合理吗？',
      '明天最重要的三件事是什么？',
    ],
    icon: '📅',
  },
  {
    id: 'template-weekly',
    name: '周回顾模板',
    period: 'weekly',
    prompts: [
      '本周完成了多少个锚点？完成率如何？',
      '本周最让你有成就感的是什么？',
      '有哪些事情一再推迟？为什么？',
      '下周的锚点池需要做哪些调整？',
    ],
    icon: '📊',
  },
  {
    id: 'template-monthly',
    name: '月回顾模板',
    period: 'monthly',
    prompts: [
      '本月完成了多少个锚点？',
      '完成率最高的分类是什么？',
      '优先级分布是否合理？',
      '下个月最想聚焦的三个领域是什么？',
    ],
    icon: '🌙',
  },
  {
    id: 'template-quarterly',
    name: '季回顾模板',
    period: 'quarterly',
    prompts: [
      '这个季度你最骄傲的成就是什么？',
      '哪些锚点真正改变了你的生活？',
      '你的精力分配和优先级设定是否需要调整？',
      '下个季度想培养什么新习惯？',
    ],
    icon: '🗓️',
  },
  {
    id: 'template-yearly',
    name: '年回顾模板',
    period: 'yearly',
    prompts: [
      '今年你完成了多少个锚点？',
      '年初设定的目标达成了多少？',
      '今年最让你感恩的事情是什么？',
      '明年你最想专注的三个方向是什么？',
    ],
    icon: '🎯',
  },
]

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getDateRange(period: ReviewPeriod, referenceDate?: string): { start: string; end: string } {
  const end = referenceDate ? new Date(referenceDate) : new Date()
  const endStr = end.toISOString().split('T')[0]

  const start = new Date(end)
  const meta = REVIEW_PERIOD_META[period]
  start.setDate(start.getDate() - meta.days + 1)
  const startStr = start.toISOString().split('T')[0]

  return { start: startStr, end: endStr }
}

function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
}

// ============================================================
// useAnchorReview
// ============================================================

export function useAnchorReview() {
  // ---- 生成回顾报告 ----
  function generateReview(
    anchors: Anchor[],
    period: ReviewPeriod,
    referenceDate?: string,
    config: Partial<ReviewConfig> = {},
  ): AnchorReview {
    const cfg = { ...DEFAULT_REVIEW_CONFIG, ...config }
    const range = getDateRange(period, referenceDate)

    // 筛选周期内的锚点
    let filtered = anchors.filter(a => {
      if (!cfg.includeDone && a.done) return false
      if (!cfg.includePool && (a.stage ?? 'active') === 'pool') return false
      return a.targetDate >= range.start && a.targetDate <= range.end
    })

    if (filtered.length === 0) {
      return {
        id: generateId(),
        period,
        range,
        totalAnchors: 0,
        completedCount: 0,
        completionRate: 0,
        mustCompletionRate: 0,
        canCompletionRate: 0,
        floatCompletionRate: 0,
        avgCompletionTime: 0,
        fastestCompletion: 0,
        slowestCompletion: 0,
        totalDrifts: 0,
        avgDailyAnchors: 0,
        mostProductiveDay: { date: '', count: 0 },
        topTags: [],
        topCategories: [],
        priorityDistribution: { must: 0, can: 0, float: 0 },
        dailyTrend: [],
        reflectionNotes: [],
        suggestions: [],
        generatedAt: new Date().toISOString(),
      }
    }

    // 完成统计
    const completed = filtered.filter(a => a.done)
    const completedCount = completed.length
    const completionRate = Math.round((completedCount / filtered.length) * 100)

    // 优先级完成率
    const mustAnchors = filtered.filter(a => a.priority === 'must')
    const canAnchors = filtered.filter(a => a.priority === 'can')
    const floatAnchors = filtered.filter(a => a.priority === 'float')

    const mustCompletionRate = mustAnchors.length > 0
      ? Math.round((mustAnchors.filter(a => a.done).length / mustAnchors.length) * 100)
      : 0
    const canCompletionRate = canAnchors.length > 0
      ? Math.round((canAnchors.filter(a => a.done).length / canAnchors.length) * 100)
      : 0
    const floatCompletionRate = floatAnchors.length > 0
      ? Math.round((floatAnchors.filter(a => a.done).length / floatAnchors.length) * 100)
      : 0

    // 完成时间统计
    const completionTimes = completed
      .filter(a => a.doneAt)
      .map(a => minutesBetween(a.createdAt, a.doneAt!))
      .filter(t => t > 0)

    const avgCompletionTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((s, t) => s + t, 0) / completionTimes.length)
      : 0
    const fastestCompletion = completionTimes.length > 0 ? Math.min(...completionTimes) : 0
    const slowestCompletion = completionTimes.length > 0 ? Math.max(...completionTimes) : 0

    // 漂移统计
    const totalDrifts = filtered.reduce((s, a) => s + a.driftCount, 0)

    // 每日统计
    const meta = REVIEW_PERIOD_META[period]
    const avgDailyAnchors = meta.days > 0
      ? Math.round((filtered.length / meta.days) * 100) / 100
      : filtered.length

    // 最高产日
    const dayCounts = new Map<string, number>()
    for (const a of filtered) {
      dayCounts.set(a.targetDate, (dayCounts.get(a.targetDate) || 0) + 1)
    }
    let mostProductiveDay = { date: '', count: 0 }
    for (const [date, count] of dayCounts) {
      if (count > mostProductiveDay.count) {
        mostProductiveDay = { date, count }
      }
    }

    // 标签统计
    const tagCounts = new Map<string, number>()
    for (const a of filtered) {
      if (a.tags) {
        for (const tag of a.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        }
      }
    }
    const topTags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 分类统计
    const catCounts = new Map<string, number>()
    for (const a of filtered) {
      const cat = a.category || '未分类'
      catCounts.set(cat, (catCounts.get(cat) || 0) + 1)
    }
    const topCategories = [...catCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 每日趋势
    const dailyTrend = generateDailyTrend(filtered, range)

    // 改进建议
    const suggestions = generateSuggestions(filtered, completionRate, totalDrifts, mustCompletionRate)

    return {
      id: generateId(),
      period,
      range,
      totalAnchors: filtered.length,
      completedCount,
      completionRate,
      mustCompletionRate,
      canCompletionRate,
      floatCompletionRate,
      avgCompletionTime,
      fastestCompletion,
      slowestCompletion,
      totalDrifts,
      avgDailyAnchors,
      mostProductiveDay,
      topTags,
      topCategories,
      priorityDistribution: {
        must: mustAnchors.length,
        can: canAnchors.length,
        float: floatAnchors.length,
      },
      dailyTrend,
      reflectionNotes: [],
      suggestions,
      generatedAt: new Date().toISOString(),
    }
  }

  // ---- 生成每日趋势 ----
  function generateDailyTrend(anchors: Anchor[], range: { start: string; end: string }): DailyReviewTrend[] {
    const trend: DailyReviewTrend[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayAnchors = anchors.filter(a => a.targetDate === dateStr)
      const completed = dayAnchors.filter(a => a.done).length
      const drifts = dayAnchors.reduce((s, a) => s + a.driftCount, 0)

      trend.push({
        date: dateStr,
        total: dayAnchors.length,
        completed,
        drifts,
        completionRate: dayAnchors.length > 0
          ? Math.round((completed / dayAnchors.length) * 100)
          : 0,
      })
    }

    return trend
  }

  // ---- 生成改进建议 ----
  function generateSuggestions(
    anchors: Anchor[],
    completionRate: number,
    totalDrifts: number,
    mustCompletionRate: number,
  ): string[] {
    const suggestions: string[] = []

    if (completionRate < 50) {
      suggestions.push('完成率偏低，建议减少每日锚点数量，集中精力完成最重要的几项')
    }
    if (completionRate >= 80) {
      suggestions.push('完成率很高！可以考虑适当增加锚点数量或提高挑战性')
    }

    if (totalDrifts > anchors.length * 0.3) {
      suggestions.push('漂移次数较多，说明有些锚点可能设置得过于乐观，建议调整优先级或分解为更小的步骤')
    }

    if (mustCompletionRate < 70 && anchors.filter(a => a.priority === 'must').length > 3) {
      suggestions.push('必锚完成率偏低，建议减少必锚数量，将部分降级为可锚')
    }

    const hasNoTags = anchors.filter(a => !a.tags || a.tags.length === 0).length
    if (hasNoTags > anchors.length * 0.5) {
      suggestions.push('超过一半的锚点没有标签，添加标签有助于分类和聚焦')
    }

    const hasNoCategory = anchors.filter(a => !a.category).length
    if (hasNoCategory > anchors.length * 0.5) {
      suggestions.push('建议为锚点添加分类，方便回顾时按领域查看进展')
    }

    if (completionRate >= 60 && completionRate < 80) {
      suggestions.push('完成率良好，继续保持！可以尝试给每个锚点设定更明确的截止时间')
    }

    return suggestions
  }

  // ---- 获取回顾模板 ----
  function getReviewTemplates(period?: ReviewPeriod): ReviewTemplate[] {
    if (period) {
      return DEFAULT_REVIEW_TEMPLATES.filter(t => t.period === period)
    }
    return DEFAULT_REVIEW_TEMPLATES
  }

  // ---- 对比两个周期 ----
  function comparePeriods(
    anchors: Anchor[],
    period1: { start: string; end: string },
    period2: { start: string; end: string },
  ): PeriodComparison {
    const anchors1 = anchors.filter(a => a.targetDate >= period1.start && a.targetDate <= period1.end)
    const anchors2 = anchors.filter(a => a.targetDate >= period2.start && a.targetDate <= period2.end)

    const completed1 = anchors1.filter(a => a.done).length
    const completed2 = anchors2.filter(a => a.done).length

    const rate1 = anchors1.length > 0 ? Math.round((completed1 / anchors1.length) * 100) : 0
    const rate2 = anchors2.length > 0 ? Math.round((completed2 / anchors2.length) * 100) : 0

    const drifts1 = anchors1.reduce((s, a) => s + a.driftCount, 0)
    const drifts2 = anchors2.reduce((s, a) => s + a.driftCount, 0)

    return {
      period1: {
        range: period1,
        total: anchors1.length,
        completed: completed1,
        completionRate: rate1,
        drifts: drifts1,
      },
      period2: {
        range: period2,
        total: anchors2.length,
        completed: completed2,
        completionRate: rate2,
        drifts: drifts2,
      },
      completionRateChange: rate2 - rate1,
      driftChange: drifts2 - drifts1,
      totalChange: anchors2.length - anchors1.length,
    }
  }

  // ---- 获取连续统计 ----
  function getStreakStats(anchors: Anchor[]): StreakStats {
    const activeAnchors = anchors.filter(a => (a.stage ?? 'active') === 'active')
    const dates = [...new Set(activeAnchors.map(a => a.targetDate))].sort().reverse()

    let currentStreak = 0
    let bestStreak = 0
    let streak = 0

    // 计算当前连续天数
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 检查昨天是否有锚点（今天可能还没开始）
    if (dates.includes(yesterday)) {
      currentStreak = 1
      let checkDate = new Date(yesterday)
      for (let i = 2; i <= dates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1)
        const checkStr = checkDate.toISOString().split('T')[0]
        if (dates.includes(checkStr)) {
          currentStreak++
        } else {
          break
        }
      }
    } else if (dates.includes(today)) {
      currentStreak = 1
    }

    // 计算最佳连续
    const sortedDates = [...dates].sort()
    if (sortedDates.length > 0) {
      streak = 1
      bestStreak = 1
      let prev = new Date(sortedDates[0])
      for (let i = 1; i < sortedDates.length; i++) {
        const curr = new Date(sortedDates[i])
        const diff = (curr.getTime() - prev.getTime()) / 86400000
        if (diff === 1) {
          streak++
          bestStreak = Math.max(bestStreak, streak)
        } else {
          streak = 1
        }
        prev = curr
      }
    }

    return { currentStreak, bestStreak }
  }

  return {
    generateReview,
    getReviewTemplates,
    comparePeriods,
    getStreakStats,
    getDateRange,
  }
}

// ============================================================
// 辅助类型
// ============================================================

/** 周期对比结果 */
export interface PeriodComparison {
  period1: PeriodSnapshot
  period2: PeriodSnapshot
  /** 完成率变化 */
  completionRateChange: number
  /** 漂移数变化 */
  driftChange: number
  /** 总数变化 */
  totalChange: number
}

/** 周期快照 */
export interface PeriodSnapshot {
  range: { start: string; end: string }
  total: number
  completed: number
  completionRate: number
  drifts: number
}

/** 连续统计 */
export interface StreakStats {
  currentStreak: number
  bestStreak: number
}