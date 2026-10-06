// ============================================================
// 更漏 · 生产力预测引擎（P19-1）
// 趋势预测、效率评分、智能建议生成、目标追踪
// ============================================================

import type { LogEntry } from './types'
import { getLocalDateKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 生产力预测 */
export interface ProductivityPrediction {
  /** 预测日期 */
  date: string
  /** 预测生产力评分 0-100 */
  predictedScore: number
  /** 置信度 0-1 */
  confidence: number
  /** 预测标签 */
  label: 'peak' | 'high' | 'normal' | 'low' | 'rest'
  /** 建议 */
  suggestions: string[]
}

/** 效率评分 */
export interface EfficiencyScore {
  /** 总分 0-100 */
  overall: number
  /** 各维度评分 */
  dimensions: EfficiencyDimension[]
  /** 趋势 */
  trend: 'improving' | 'declining' | 'stable'
  /** 与上周对比 */
  weekOverWeek: number
  /** 排名（百分位） */
  percentile: number
  /** 评语 */
  comment: string
}

/** 效率维度 */
export interface EfficiencyDimension {
  name: string
  label: string
  score: number
  weight: number
  description: string
}

/** 生产力趋势 */
export interface ProductivityTrend {
  /** 每日评分 */
  dailyScores: { date: string; score: number }[]
  /** 7日移动平均 */
  movingAverage: number[]
  /** 线性回归斜率 */
  slope: number
  /** 趋势方向 */
  direction: 'up' | 'down' | 'flat'
  /** 趋势强度 */
  strength: number
  /** 预测下一周 */
  nextWeekPrediction: ProductivityPrediction[]
}

/** 智能建议 */
export interface SmartSuggestion {
  id: string
  category: 'time' | 'mood' | 'focus' | 'balance' | 'growth'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionables: string[]
  expectedImpact: number
}

/** 目标追踪 */
export interface GoalTracker {
  goalId: string
  name: string
  target: number
  current: number
  unit: string
  startDate: string
  endDate: string
  progress: number
  onTrack: boolean
  remainingDays: number
  dailyNeeded: number
  streak: number
}

// ============================================================
// 默认配置
// ============================================================

const EFFICIENCY_DIMENSIONS: { name: string; label: string; weight: number; desc: string }[] = [
  { name: 'consistency', label: '一致性', weight: 0.25, desc: '保持每日记录的稳定性' },
  { name: 'depth', label: '深度', weight: 0.2, desc: '日志内容的深度和反思质量' },
  { name: 'focus', label: '专注度', weight: 0.2, desc: '专注时长和关联会话数' },
  { name: 'mood', label: '情绪管理', weight: 0.15, desc: '正面情绪占比和情绪稳定性' },
  { name: 'growth', label: '成长性', weight: 0.2, desc: '新标签、新类型的探索和里程碑' },
]

const PREDICTION_LABELS: Record<ProductivityPrediction['label'], { label: string; color: string; minScore: number }> = {
  peak: { label: '巅峰', color: '#34d399', minScore: 80 },
  high: { label: '高效', color: '#6b9fc4', minScore: 60 },
  normal: { label: '正常', color: '#f0c040', minScore: 40 },
  low: { label: '低效', color: '#cf8b6b', minScore: 20 },
  rest: { label: '休息', color: '#ef4444', minScore: 0 },
}

// ============================================================
// useProductivityPrediction
// ============================================================

export function useProductivityPrediction() {
  // ---- 效率评分 ----

  /** 计算综合效率评分 */
  function scoreEfficiency(entries: LogEntry[], days: number = 30): EfficiencyScore {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const recent = entries.filter(e => new Date(e.createdAt) >= cutoff)
    const older = entries.filter(e => {
      const d = new Date(e.createdAt)
      return d >= new Date(cutoff.getTime() - days * 86400000) && d < cutoff
    })

    if (recent.length === 0) {
      return createEmptyScore()
    }

    const dimensions: EfficiencyDimension[] = EFFICIENCY_DIMENSIONS.map(dim => {
      const score = calculateDimensionScore(dim.name, recent)
      return {
        name: dim.name,
        label: dim.label,
        score: Math.round(score * 100) / 100,
        weight: dim.weight,
        description: dim.desc,
      }
    })

    const overall = Math.round(
      dimensions.reduce((s, d) => s + d.score * d.weight, 0),
    )

    const recentAvg = recent.reduce((s, e) => s + scoreEntry(e), 0) / recent.length
    const olderAvg = older.length > 0
      ? older.reduce((s, e) => s + scoreEntry(e), 0) / older.length
      : recentAvg

    const weekOverWeek = older.length > 0
      ? Math.round(((recentAvg - olderAvg) / Math.max(olderAvg, 1)) * 100)
      : 0

    let trend: EfficiencyScore['trend'] = 'stable'
    if (weekOverWeek > 10) trend = 'improving'
    else if (weekOverWeek < -10) trend = 'declining'

    const percentile = Math.min(99, Math.round((overall / 100) * 100))

    const comment = generateEfficiencyComment(overall, trend, dimensions)

    return {
      overall,
      dimensions,
      trend,
      weekOverWeek,
      percentile,
      comment,
    }
  }

  // ---- 生产力趋势 ----

  /** 计算生产力趋势 */
  function computeTrend(entries: LogEntry[], days: number = 30): ProductivityTrend {
    const dailyScores = computeDailyScores(entries, days)

    // 7日移动平均
    const movingAverage: number[] = []
    for (let i = 0; i < dailyScores.length; i++) {
      const window = dailyScores.slice(Math.max(0, i - 6), i + 1)
      const avg = window.reduce((s, d) => s + d.score, 0) / window.length
      movingAverage.push(Math.round(avg * 100) / 100)
    }

    // 线性回归
    const n = dailyScores.length
    if (n < 3) {
      return {
        dailyScores,
        movingAverage,
        slope: 0,
        direction: 'flat',
        strength: 0,
        nextWeekPrediction: [],
      }
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += dailyScores[i].score
      sumXY += i * dailyScores[i].score
      sumX2 += i * i
    }

    const denominator = n * sumX2 - sumX * sumX
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0

    let direction: ProductivityTrend['direction'] = 'flat'
    if (slope > 0.5) direction = 'up'
    else if (slope < -0.5) direction = 'down'

    const avgY = sumY / n
    const strength = avgY > 0
      ? Math.min(1, Math.abs(slope * n) / avgY)
      : 0

    // 预测下一周
    const nextWeekPrediction = predictNextWeek(dailyScores, slope, avgY)

    return {
      dailyScores,
      movingAverage,
      slope: Math.round(slope * 1000) / 1000,
      direction,
      strength: Math.round(strength * 100) / 100,
      nextWeekPrediction,
    }
  }

  // ---- 智能建议 ----

  /** 生成智能建议 */
  function generateSuggestions(
    entries: LogEntry[],
    efficiency: EfficiencyScore,
    trend: ProductivityTrend,
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = []

    // 一致性建议
    const consistencyScore = efficiency.dimensions.find(d => d.name === 'consistency')?.score || 0
    if (consistencyScore < 50) {
      suggestions.push({
        id: 'sug_consistency',
        category: 'time',
        title: '建立每日记录习惯',
        description: '你的日志记录不够规律，尝试每天固定时间记录 5 分钟',
        priority: 'high',
        actionables: ['设置每日记录提醒', '从简短的一句话开始', '关联每天第一个专注会话'],
        expectedImpact: 30,
      })
    }

    // 深度建议
    const depthScore = efficiency.dimensions.find(d => d.name === 'depth')?.score || 0
    if (depthScore < 50) {
      suggestions.push({
        id: 'sug_depth',
        category: 'growth',
        title: '提升日志深度',
        description: '尝试在日志中加入更多反思和洞察，而不仅仅是记录事实',
        priority: 'medium',
        actionables: ['使用反思模板', '每周做一次深度复盘', '关联学习笔记和阅读书评'],
        expectedImpact: 20,
      })
    }

    // 情绪建议
    const moodScore = efficiency.dimensions.find(d => d.name === 'mood')?.score || 0
    if (moodScore < 50) {
      suggestions.push({
        id: 'sug_mood',
        category: 'mood',
        title: '关注工作情绪',
        description: '记录工作时的情绪状态，有助于发现情绪与生产力的关联',
        priority: 'medium',
        actionables: ['每次记录时选择情绪标签', '关注情绪低谷时段', '安排轻松任务在低情绪时段'],
        expectedImpact: 15,
      })
    }

    // 趋势建议
    if (trend.direction === 'down' && trend.strength > 0.3) {
      suggestions.push({
        id: 'sug_trend_down',
        category: 'focus',
        title: '生产力下滑预警',
        description: '你的生产力正在下降，建议调整工作节奏',
        priority: 'high',
        actionables: ['减少多任务并行', '增加休息频率', '检查是否有外部干扰', '回顾最近一周的日志找原因'],
        expectedImpact: 25,
      })
    }

    // 平衡建议
    const weeklyEntries = entries.filter(e => {
      const d = new Date(e.createdAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return d >= weekAgo
    })
    if (weeklyEntries.length > 20) {
      suggestions.push({
        id: 'sug_balance',
        category: 'balance',
        title: '保持工作与休息平衡',
        description: '你记录了大量日志，注意给自己留出休息和反思的时间',
        priority: 'low',
        actionables: ['设置每日日志上限', '在日志中加入休息记录', '每周安排一天轻量级工作日'],
        expectedImpact: 10,
      })
    }

    // 成长建议
    const growthScore = efficiency.dimensions.find(d => d.name === 'growth')?.score || 0
    if (growthScore < 50) {
      suggestions.push({
        id: 'sug_growth',
        category: 'growth',
        title: '拓展工作边界',
        description: '尝试新的工作领域或记录类型，丰富你的工作日志',
        priority: 'medium',
        actionables: ['尝试使用新标签', '记录里程碑事件', '添加跨领域关联'],
        expectedImpact: 18,
      })
    }

    return suggestions.sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 }
      return (order[b.priority] || 0) - (order[a.priority] || 0)
    })
  }

  // ---- 目标追踪 ----

  /** 创建目标追踪器 */
  function trackGoal(
    entries: LogEntry[],
    goal: { name: string; target: number; unit: string; startDate: string; endDate: string },
  ): GoalTracker {
    const start = new Date(goal.startDate)
    const end = new Date(goal.endDate)
    const now = new Date()

    const relevant = entries.filter(e => {
      const d = new Date(e.createdAt)
      return d >= start && d <= end
    })

    const current = goal.unit === 'entries'
      ? relevant.length
      : goal.unit === 'focus_minutes'
        ? relevant.reduce((s, e) => s + e.sessionIds.length * 25, 0)
        : 0

    const progress = goal.target > 0
      ? Math.round((current / goal.target) * 100)
      : 0

    const remainingDays = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86400000))
    const remaining = goal.target - current
    const dailyNeeded = Math.round(remaining / remainingDays * 10) / 10

    // 连续追踪
    // ⚠️ 连续天数按本地日历日：UTC 口径会让凌晨日志的连续起点错位一天
    const dates = [...new Set(relevant.filter(e => e.createdAt).map(e => getLocalDateKey(new Date(e.createdAt))))].sort()
    let streak = 0
    for (let i = dates.length - 1; i >= 0; i--) {
      if (i === dates.length - 1) {
        streak = 1
        continue
      }
      const prev = new Date(dates[i])
      const curr = new Date(dates[i + 1])
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      if (diff === 1) streak++
      else break
    }

    return {
      goalId: `goal_${Date.now()}`,
      name: goal.name,
      target: goal.target,
      current,
      unit: goal.unit,
      startDate: goal.startDate,
      endDate: goal.endDate,
      progress,
      onTrack: remaining <= 0 || current >= (goal.target * getElapsedRatio(start, end, now)),
      remainingDays,
      dailyNeeded,
      streak,
    }
  }

  return {
    scoreEfficiency,
    computeTrend,
    generateSuggestions,
    trackGoal,
  }
}

// ============================================================
// 内部工具函数
// ============================================================

function calculateDimensionScore(dimension: string, entries: LogEntry[]): number {
  if (entries.length === 0) return 0

  switch (dimension) {
    case 'consistency': {
      const dates = new Set(entries.filter(e => e.createdAt).map(e => getLocalDateKey(new Date(e.createdAt))))
      const maxDays = 30
      return Math.min(100, (dates.size / maxDays) * 100)
    }
    case 'depth': {
      const avgContentLength = entries.reduce((s, e) => s + e.content.length, 0) / entries.length
      const tagsPerEntry = entries.reduce((s, e) => s + e.tags.length, 0) / entries.length
      const contentTypeBonus = entries.filter(e => e.type === 'reflection' || e.type === 'insight').length / entries.length * 50
      return Math.min(100, (avgContentLength / 50) * 30 + tagsPerEntry * 10 + contentTypeBonus)
    }
    case 'focus': {
      const entriesWithSessions = entries.filter(e => e.sessionIds.length > 0).length / entries.length * 50
      const avgSessions = entries.reduce((s, e) => s + e.sessionIds.length, 0) / entries.length * 10
      return Math.min(100, entriesWithSessions + avgSessions)
    }
    case 'mood': {
      const entriesWithMood = entries.filter(e => e.mood).length / entries.length * 50
      const positiveMoods = entries.filter(e =>
        e.mood === 'energetic' || e.mood === 'excited' || e.mood === 'calm',
      ).length / entries.length * 50
      return Math.min(100, entriesWithMood + positiveMoods)
    }
    case 'growth': {
      const uniqueTags = new Set(entries.flatMap(e => e.tags)).size
      const uniqueTypes = new Set(entries.map(e => e.type)).size
      const milestoneCount = entries.filter(e => e.type === 'milestone').length
      return Math.min(100, uniqueTags * 5 + uniqueTypes * 10 + milestoneCount * 15)
    }
    default:
      return 50
  }
}

function scoreEntry(entry: LogEntry): number {
  let score = 50
  score += Math.min(20, entry.content.length / 10)
  score += Math.min(10, entry.tags.length * 3)
  score += entry.sessionIds.length * 5
  if (entry.mood === 'energetic' || entry.mood === 'excited') score += 10
  if (entry.type === 'reflection' || entry.type === 'insight') score += 10
  return Math.min(100, score)
}

function computeDailyScores(entries: LogEntry[], days: number): { date: string; score: number }[] {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const dailyMap = new Map<string, LogEntry[]>()
  for (const entry of entries) {
    if (!entry.createdAt) continue
    const date = getLocalDateKey(new Date(entry.createdAt))
    if (!dailyMap.has(date)) dailyMap.set(date, [])
    dailyMap.get(date)!.push(entry)
  }

  const scores: { date: string; score: number }[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    // ⚠️ current 是本地分量构造（setDate 逐日递进），取本地日历日
    const dateStr = getLocalDateKey(current)
    const dayEntries = dailyMap.get(dateStr) || []
    const score = dayEntries.length > 0
      ? Math.round(dayEntries.reduce((s, e) => s + scoreEntry(e), 0) / dayEntries.length)
      : 0
    scores.push({ date: dateStr, score })
    current.setDate(current.getDate() + 1)
  }

  return scores
}

function predictNextWeek(
  dailyScores: { date: string; score: number }[],
  slope: number,
  avgY: number,
): ProductivityPrediction[] {
  const predictions: ProductivityPrediction[] = []
  const lastDate = dailyScores.length > 0
    ? new Date(dailyScores[dailyScores.length - 1].date)
    : new Date()

  for (let i = 1; i <= 7; i++) {
    const predDate = new Date(lastDate)
    predDate.setDate(predDate.getDate() + i)
    const dateStr = getLocalDateKey(predDate)

    const baseScore = avgY + slope * (dailyScores.length + i)
    const variance = Math.random() * 10 - 5
    const predictedScore = Math.max(0, Math.min(100, Math.round(baseScore + variance)))

    const confidence = Math.max(0.3, 1 - i * 0.1)

    let label: ProductivityPrediction['label'] = 'normal'
    for (const [key, meta] of Object.entries(PREDICTION_LABELS)) {
      if (predictedScore >= meta.minScore) {
        label = key as ProductivityPrediction['label']
        break
      }
    }

    const suggestions = generateDaySuggestions(predictedScore, i)

    predictions.push({
      date: dateStr,
      predictedScore,
      confidence: Math.round(confidence * 100) / 100,
      label,
      suggestions,
    })
  }

  return predictions
}

function generateDaySuggestions(_score: number, dayIndex: number): string[] {
  const suggestions: string[] = []
  if (dayIndex === 1) suggestions.push('新的一周开始，设定本周目标')
  if (dayIndex === 5) suggestions.push('快到周末了，回顾本周进展')
  if (dayIndex === 6 || dayIndex === 7) suggestions.push('周末适合轻松记录和深度反思')
  return suggestions
}

function generateEfficiencyComment(
  overall: number,
  trend: EfficiencyScore['trend'],
  dimensions: EfficiencyDimension[],
): string {
  if (overall >= 80) {
    return `你的整体效率很棒！${trend === 'improving' ? '而且还在持续提升中，继续保持！' : '保持这个节奏，你已经做得很好了。'}`
  }
  if (overall >= 60) {
    const lowest = dimensions.sort((a, b) => a.score - b.score)[0]
    return `整体效率不错，建议重点关注「${lowest.label}」维度（${lowest.score}分），这里有最大的提升空间。`
  }
  if (overall >= 40) {
    return `效率有待提升，${trend === 'declining' ? '而且呈下降趋势，' : ''}建议从建立每日记录习惯开始改善。`
  }
  return '效率偏低，不要灰心！从每天记录一条开始，慢慢建立习惯，你会看到进步的。'
}

function getElapsedRatio(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime()
  if (total <= 0) return 1
  const elapsed = now.getTime() - start.getTime()
  return Math.max(0, Math.min(1, elapsed / total))
}

function createEmptyScore(): EfficiencyScore {
  return {
    overall: 0,
    dimensions: EFFICIENCY_DIMENSIONS.map(d => ({
      name: d.name,
      label: d.label,
      score: 0,
      weight: d.weight,
      description: d.desc,
    })),
    trend: 'stable',
    weekOverWeek: 0,
    percentile: 0,
    comment: '数据不足，无法计算效率评分',
  }
}