// ============================================================
// 时间长廊 · 叙事生成 + 周报月报 + 导出
// 蓝图：叙事生成、周报/月报、导出
// P18-1：增强叙事（里程碑检测、周期对比、个性化建议、词云数据）
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { RiverItem, RiverSource, DailySummary } from './river'
import { createRiverItems, computeDailySummaries } from './river'
import { getLocalDateKey } from '../../utils/time'

// ---- 叙事类型 ----

export interface NarrativeSegment {
  date: string
  label: string
  highlight: string
  emotion: string
  insight: string
  items: { type: string; summary: string }[]
}

export interface NarrativeReport {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  dateRange: { start: string; end: string }
  segments: NarrativeSegment[]
  summary: string
  stats: NarrativeStats
  emotionTrend: EmotionTrend[]
  createdAt: string
  exported: boolean
  /** P18-1：增强字段 */
  milestones?: Milestone[]
  periodComparison?: PeriodComparison
  suggestions?: PersonalizedSuggestion[]
  wordCloud?: WordCloudItem[]
}

export interface NarrativeStats {
  totalFocusMinutes: number
  totalCrystals: number
  totalNotes: number
  totalEmotions: number
  totalAnchors: number
  completedAnchors: number
  anchorCompletionRate: number
  averageDailyFocus: number
  mostProductiveDay: string
  mostProductiveDayMinutes: number
  dominantEmotion: string
  topTags: string[]
}

export interface EmotionTrend {
  date: string
  label: string
  happy: number
  calm: number
  sad: number
  anxious: number
  angry: number
  dominant: string
}

// ---- P18-1 增强类型 ----

/** 里程碑/成就事件 */
export interface Milestone {
  id: string
  type: 'streak' | 'record' | 'first' | 'growth' | 'milestone'
  title: string
  description: string
  date: string
  value: number
  unit: string
  /** 重要程度 0-100 */
  significance: number
  icon: string
}

/** 周期对比（本周 vs 上周 / 本月 vs 上月等） */
export interface PeriodComparison {
  current: { label: string; focusMinutes: number; crystals: number; notes: number; emotions: number; anchorsCompleted: number }
  previous: { label: string; focusMinutes: number; crystals: number; notes: number; emotions: number; anchorsCompleted: number }
  changes: {
    focusChange: number     // 百分比变化
    crystalChange: number
    noteChange: number
    emotionChange: number
    anchorChange: number
    trend: 'up' | 'down' | 'stable'
  }
  summary: string
}

/** 个性化建议 */
export interface PersonalizedSuggestion {
  id: string
  category: 'focus' | 'emotion' | 'habit' | 'rest' | 'growth'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  /** 基于的数据洞察 */
  dataInsight: string
  /** 可执行操作 */
  actionable: boolean
  /** 相关指标 */
  relatedMetrics: string[]
}

/** 词云条目 */
export interface WordCloudItem {
  text: string
  weight: number
  category: 'tag' | 'emotion' | 'insight'
  color?: string
}

// ============================================================
// P18-1 增强：里程碑检测
// ============================================================

/**
 * 检测里程碑事件
 * 包括：连续专注天数、新纪录、首次达成、增长趋势、整数里程碑
 */
export function detectMilestones(items: RiverItem[]): Milestone[] {
  const milestones: Milestone[] = []
  const now = new Date().toISOString()

  if (items.length === 0) return milestones

  const sorted = [...items].sort((a, b) => a.ts - b.ts)
  const sessions = sorted.filter(i => i.type === 'session')
  const crystals = sorted.filter(i => i.type === 'crystal')

  // 1. 连续专注天数 (streak)
  const streakDays = computeStreakDays(sessions)
  if (streakDays >= 3) {
    const significance = Math.min(100, streakDays * 10)
    milestones.push({
      id: `streak-${streakDays}`,
      type: 'streak',
      title: streakDays >= 30 ? '专注大师' : streakDays >= 14 ? '专注达人' : streakDays >= 7 ? '专注周' : '连续专注',
      description: `连续 ${streakDays} 天保持专注记录`,
      date: now,
      value: streakDays,
      unit: '天',
      significance,
      icon: streakDays >= 30 ? 'trophy' : streakDays >= 14 ? 'star' : 'flame',
    })
  }

  // 2. 专注记录 (record)
  const dailyFocus = new Map<string, number>()
  for (const s of sessions) {
    const date = getLocalDateKey(new Date(s.ts))
    const mins = s.session?.elapsed ? Math.round(s.session.elapsed / 60000) : 0
    dailyFocus.set(date, (dailyFocus.get(date) || 0) + mins)
  }
  const maxFocus = Math.max(...dailyFocus.values(), 0)
  if (maxFocus > 120) {
    const maxDate = [...dailyFocus.entries()].find(([, v]) => v === maxFocus)?.[0] || ''
    milestones.push({
      id: `record-focus-${maxFocus}`,
      type: 'record',
      title: '专注新纪录',
      description: `单日专注 ${maxFocus} 分钟，创下新纪录`,
      date: maxDate,
      value: maxFocus,
      unit: '分钟',
      significance: Math.min(100, maxFocus / 3),
      icon: 'zap',
    })
  }

  // 3. 结晶里程碑 (milestone)
  const totalCrystals = crystals.length
  const crystalMilestones = [10, 50, 100, 200, 500, 1000]
  for (const m of crystalMilestones) {
    if (totalCrystals >= m) {
      milestones.push({
        id: `crystal-${m}`,
        type: 'milestone',
        title: `结晶 ${m}+`,
        description: `累计产生 ${totalCrystals} 个时间结晶，已达 ${m}+ 里程碑`,
        date: now,
        value: totalCrystals,
        unit: '个',
        significance: Math.min(100, m / 10),
        icon: 'gem',
      })
    }
  }

  // 4. 成长趋势 (growth)
  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2))
  const firstFocus = firstHalf.filter(i => i.type === 'session').reduce((s, i) => s + (i.session?.elapsed || 0), 0) / 60000
  const secondFocus = secondHalf.filter(i => i.type === 'session').reduce((s, i) => s + (i.session?.elapsed || 0), 0) / 60000
  const growthRate = firstFocus > 0 ? ((secondFocus - firstFocus) / firstFocus) * 100 : 0

  if (growthRate > 30) {
    milestones.push({
      id: `growth-${Math.round(growthRate)}`,
      type: 'growth',
      title: '显著成长',
      description: `近期专注时长相比前期增长 ${Math.round(growthRate)}%`,
      date: now,
      value: Math.round(growthRate),
      unit: '%',
      significance: Math.min(100, growthRate),
      icon: 'trending-up',
    })
  }

  // 5. 首次达成 (first) - 检测第一次出现的关键事件
  const noteCount = sorted.filter(i => i.type === 'note').length
  const emotionCount = sorted.filter(i => i.type === 'emotion').length
  const anchorCount = sorted.filter(i => i.type === 'anchor').length

  if (noteCount === 1) {
    const firstNote = sorted.find(i => i.type === 'note')
    milestones.push({
      id: 'first-note',
      type: 'first',
      title: '第一篇笔记',
      description: '开始记录思考，这是成长的第一步',
      date: firstNote ? getLocalDateKey(new Date(firstNote.ts)) : now,
      value: 1,
      unit: '篇',
      significance: 60,
      icon: 'edit',
    })
  }

  if (emotionCount === 1) {
    const firstEmotion = sorted.find(i => i.type === 'emotion')
    milestones.push({
      id: 'first-emotion',
      type: 'first',
      title: '第一次情绪记录',
      description: '开始关注内心感受，情绪觉察是自我认知的起点',
      date: firstEmotion ? getLocalDateKey(new Date(firstEmotion.ts)) : now,
      value: 1,
      unit: '次',
      significance: 70,
      icon: 'heart',
    })
  }

  if (anchorCount >= 1 && anchorCount <= 3) {
    const firstAnchor = sorted.find(i => i.type === 'anchor')
    milestones.push({
      id: 'first-anchor',
      type: 'first',
      title: '设定心锚',
      description: anchorCount === 1 ? '第一个心锚已设定，方向已明确' : `已设定 ${anchorCount} 个心锚`,
      date: firstAnchor ? getLocalDateKey(new Date(firstAnchor.ts)) : now,
      value: anchorCount,
      unit: '个',
      significance: 50,
      icon: 'anchor',
    })
  }

  // 去重：只保留每种类型中最显著的
  const typeOrder = ['record', 'streak', 'milestone', 'first', 'growth']
  return milestones
    .sort((a, b) => {
      const aIdx = typeOrder.indexOf(a.type)
      const bIdx = typeOrder.indexOf(b.type)
      return aIdx - bIdx || b.significance - a.significance
    })
    .slice(0, 8)
}

/** 计算连续专注天数 */
function computeStreakDays(sessions: RiverItem[]): number {
  if (sessions.length === 0) return 0

  const dates = new Set<string>()
  for (const s of sessions) {
    dates.add(getLocalDateKey(new Date(s.ts)))
  }

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today.getTime() - i * 86400000)
    const dateStr = getLocalDateKey(checkDate)
    if (dates.has(dateStr)) {
      streak++
    } else {
      // 允许跳过今天（可能还没记录）
      if (i === 0) continue
      break
    }
  }

  return streak
}

// ============================================================
// P18-1 增强：周期对比
// ============================================================

/**
 * 生成周期对比报告（本周 vs 上周 / 本月 vs 上月）
 */
export function comparePeriods(
  currentItems: RiverItem[],
  previousItems: RiverItem[],
  currentLabel: string,
  previousLabel: string,
): PeriodComparison {
  const current = computePeriodSummary(currentItems)
  const previous = computePeriodSummary(previousItems)

  const calcChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  const focusChange = calcChange(current.focusMinutes, previous.focusMinutes)
  const crystalChange = calcChange(current.crystals, previous.crystals)
  const noteChange = calcChange(current.notes, previous.notes)
  const emotionChange = calcChange(current.emotions, previous.emotions)
  const anchorChange = calcChange(current.anchorsCompleted, previous.anchorsCompleted)

  const avgChange = (focusChange + crystalChange + noteChange + emotionChange + anchorChange) / 5
  const trend: 'up' | 'down' | 'stable' =
    avgChange > 10 ? 'up' : avgChange < -10 ? 'down' : 'stable'

  const summary = generatePeriodComparisonSummary(
    currentLabel, previousLabel, focusChange, crystalChange, noteChange, trend,
  )

  return {
    current: { label: currentLabel, ...current },
    previous: { label: previousLabel, ...previous },
    changes: { focusChange, crystalChange, noteChange, emotionChange, anchorChange, trend },
    summary,
  }
}

interface PeriodSummary {
  focusMinutes: number
  crystals: number
  notes: number
  emotions: number
  anchorsCompleted: number
}

function computePeriodSummary(items: RiverItem[]): PeriodSummary {
  return {
    focusMinutes: items
      .filter(i => i.type === 'session' && i.session?.elapsed)
      .reduce((s, i) => s + Math.round(i.session!.elapsed / 60000), 0),
    crystals: items.filter(i => i.type === 'crystal').length,
    notes: items.filter(i => i.type === 'note').length,
    emotions: items.filter(i => i.type === 'emotion').length,
    anchorsCompleted: items.filter(i => i.type === 'anchor' && i.anchor?.done).length,
  }
}

function generatePeriodComparisonSummary(
  currentLabel: string,
  previousLabel: string,
  focusChange: number,
  crystalChange: number,
  noteChange: number,
  trend: 'up' | 'down' | 'stable',
): string {
  if (trend === 'up') {
    return `${currentLabel}相比${previousLabel}，专注时长提升 ${focusChange}%，结晶增加 ${crystalChange}%，笔记增加 ${noteChange}%，整体趋势向好。`
  }
  if (trend === 'down') {
    return `${currentLabel}相比${previousLabel}，专注时长下降 ${Math.abs(focusChange)}%，笔记减少 ${Math.abs(noteChange)}%，建议关注节奏调整。`
  }
  return `${currentLabel}与${previousLabel}基本持平，笔记变化 ${noteChange}%，保持稳定节奏。`
}

// ============================================================
// P18-1 增强：个性化建议
// ============================================================

/**
 * 基于数据生成个性化建议
 */
export function generateSuggestions(
  stats: NarrativeStats,
  items: RiverItem[],
  emotionTrend: EmotionTrend[],
): PersonalizedSuggestion[] {
  const suggestions: PersonalizedSuggestion[] = []

  // 1. 专注建议
  if (stats.averageDailyFocus < 30 && stats.totalFocusMinutes > 0) {
    suggestions.push({
      id: 'focus-low',
      category: 'focus',
      priority: 'high',
      title: '提升每日专注',
      description: '日均专注不足 30 分钟，建议从每天 25 分钟的番茄钟开始，逐步建立专注习惯',
      dataInsight: `日均专注 ${stats.averageDailyFocus} 分钟`,
      actionable: true,
      relatedMetrics: ['totalFocusMinutes', 'averageDailyFocus'],
    })
  }

  if (stats.averageDailyFocus > 120) {
    suggestions.push({
      id: 'focus-rest',
      category: 'rest',
      priority: 'medium',
      title: '关注休息节奏',
      description: '日均专注超过 2 小时，请注意适当休息，避免过度疲劳。建议每 90 分钟休息 15 分钟',
      dataInsight: `日均专注 ${stats.averageDailyFocus} 分钟`,
      actionable: true,
      relatedMetrics: ['totalFocusMinutes', 'averageDailyFocus'],
    })
  }

  // 2. 情绪建议
  const dominantEmotion = stats.dominantEmotion
  if (dominantEmotion === 'anxious' || dominantEmotion === 'sad') {
    suggestions.push({
      id: 'emotion-care',
      category: 'emotion',
      priority: 'high',
      title: '关注情绪健康',
      description: `近期主导情绪为"${dominantEmotion}"，建议通过冥想、散步或与朋友交流来调节情绪`,
      dataInsight: `主导情绪: ${dominantEmotion}`,
      actionable: true,
      relatedMetrics: ['dominantEmotion', 'totalEmotions'],
    })
  }

  // 情绪趋势变化
  if (emotionTrend.length >= 4) {
    const recentEmotions = emotionTrend.slice(-4)
    const happyCount = recentEmotions.filter(e => e.dominant === 'happy').length
    if (happyCount >= 3) {
      suggestions.push({
        id: 'emotion-positive',
        category: 'emotion',
        priority: 'low',
        title: '情绪状态良好',
        description: '近期情绪积极稳定，可以趁此状态推进重要项目',
        dataInsight: `最近 4 天中 ${happyCount} 天以快乐为主`,
        actionable: true,
        relatedMetrics: ['emotionTrend'],
      })
    }
  }

  // 3. 习惯建议
  if (stats.anchorCompletionRate < 50 && stats.totalAnchors > 0) {
    suggestions.push({
      id: 'habit-anchor',
      category: 'habit',
      priority: 'high',
      title: '提高心锚完成率',
      description: `心锚完成率仅 ${stats.anchorCompletionRate}%，建议减少每日心锚数量，聚焦 2-3 个核心目标`,
      dataInsight: `完成率 ${stats.anchorCompletionRate}%，${stats.completedAnchors}/${stats.totalAnchors}`,
      actionable: true,
      relatedMetrics: ['anchorCompletionRate', 'totalAnchors'],
    })
  }

  if (stats.anchorCompletionRate >= 80 && stats.totalAnchors > 3) {
    suggestions.push({
      id: 'habit-great',
      category: 'habit',
      priority: 'low',
      title: '习惯保持良好',
      description: `心锚完成率高达 ${stats.anchorCompletionRate}%，可以尝试增加挑战性目标`,
      dataInsight: `完成率 ${stats.anchorCompletionRate}%`,
      actionable: false,
      relatedMetrics: ['anchorCompletionRate'],
    })
  }

  // 4. 成长建议
  if (stats.totalNotes > 0 && stats.totalNotes < 3) {
    suggestions.push({
      id: 'growth-note',
      category: 'growth',
      priority: 'medium',
      title: '增加反思记录',
      description: '笔记数量较少，建议每天花 5 分钟记录当天的收获和感悟',
      dataInsight: `共 ${stats.totalNotes} 篇笔记`,
      actionable: true,
      relatedMetrics: ['totalNotes'],
    })
  }

  // 5. 休息建议
  const sessions = items.filter(i => i.type === 'session')
  const lateNightSessions = sessions.filter(s => {
    const hour = new Date(s.ts).getHours()
    return hour >= 22 || hour < 6
  })
  if (lateNightSessions.length > 0) {
    const ratio = Math.round((lateNightSessions.length / sessions.length) * 100)
    if (ratio > 20) {
      suggestions.push({
        id: 'rest-late',
        category: 'rest',
        priority: 'medium',
        title: '避免深夜专注',
        description: `${ratio}% 的专注发生在深夜时段，建议尽量在白天完成重要任务以保证睡眠质量`,
        dataInsight: `${lateNightSessions.length}/${sessions.length} 次专注在深夜`,
        actionable: true,
        relatedMetrics: ['session'],
      })
    }
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// ============================================================
// P18-1 增强：词云数据
// ============================================================

/** 情绪颜色映射 */
const EMOTION_COLORS: Record<string, string> = {
  happy: '#f59e0b',
  calm: '#6b9fc4',
  sad: '#6366f1',
  anxious: '#ef4444',
  angry: '#dc2626',
  excited: '#f97316',
  grateful: '#10b981',
  tired: '#9ca3af',
  neutral: '#6b7280',
}

/**
 * 生成词云数据
 */
export function generateWordCloud(items: RiverItem[]): WordCloudItem[] {
  const tagCounts = new Map<string, number>()
  const emotionCounts = new Map<string, number>()
  const insightWords = new Map<string, number>()

  for (const item of items) {
    // 标签
    const tags = item.session?.tags || item.crystal?.tags || item.note?.tags || item.anchor?.tags || []
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }

    // 情绪
    if (item.type === 'emotion' && item.emotion?.type) {
      const emotion = item.emotion.type
      emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1)
    }

    // 洞察关键词（从结晶和笔记中提取）
    const insight = item.crystal?.insight || item.note?.title || ''
    if (insight && insight.length > 0) {
      // 简单分词：提取 2-4 字的中文词
      const words = extractKeywords(insight)
      for (const w of words) {
        insightWords.set(w, (insightWords.get(w) || 0) + 1)
      }
    }
  }

  const maxCount = Math.max(
    ...[...tagCounts.values(), ...emotionCounts.values(), ...insightWords.values()],
    1,
  )

  const result: WordCloudItem[] = []

  // 标签词云
  for (const [text, count] of tagCounts) {
    result.push({
      text,
      weight: count / maxCount,
      category: 'tag',
    })
  }

  // 情绪词云
  for (const [text, count] of emotionCounts) {
    result.push({
      text,
      weight: count / maxCount,
      category: 'emotion',
      color: EMOTION_COLORS[text] || '#6b7280',
    })
  }

  // 洞察词云（只取前 10 个高频词）
  const sortedInsightWords = [...insightWords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  for (const [text, count] of sortedInsightWords) {
    result.push({
      text,
      weight: count / maxCount,
      category: 'insight',
      color: '#a07c8c',
    })
  }

  return result.sort((a, b) => b.weight - a.weight)
}

/**
 * 简单中文关键词提取
 * 提取 2-4 字的高频词
 */
function extractKeywords(text: string): string[] {
  const words: string[] = []
  // 移除标点
  const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s,.!?;:'"()\[\]{}<>]/g, '')
  if (cleaned.length < 2) return words

  // 提取 2-4 字词组
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= cleaned.length - len; i++) {
      words.push(cleaned.slice(i, i + len))
    }
  }

  return words
}

// ---- 导出格式 ----

export type ExportFormat = 'json' | 'markdown' | 'text'

export interface ExportResult {
  format: ExportFormat
  content: string
  filename: string
  size: number
}

// ---- 存储键 ----

const NARRATIVE_KEYS = {
  REPORTS: 'hf:timeline:narrative_reports',
} as const

// ---- 叙事模板 ----
// 模板常量在 generateNarrativeText 中内联使用

// ============================================================
// useNarrativeGenerator
// ============================================================

export function useNarrativeGenerator() {
  const reports = ref<NarrativeReport[]>([])

  function loadReports(): void {
    reports.value = storage.getKV<NarrativeReport[]>(NARRATIVE_KEYS.REPORTS, []) || []
  }

  function saveReports(): void {
    storage.setKV(NARRATIVE_KEYS.REPORTS, reports.value)
  }

  /** 生成每日叙事 */
  function generateDailyNarrative(
    source: RiverSource,
    date: string,
  ): NarrativeReport {
    const items = createRiverItems(source, ['crystal', 'note', 'emotion', 'session', 'anchor'])
    const dateItems = items.filter(i => {
      const itemDate = getLocalDateKey(new Date(i.ts))
      return itemDate === date
    })

    const segments: NarrativeSegment[] = []
    const stats = computeNarrativeStats(dateItems)
    const emotionTrend = computeEmotionTrend(dateItems, date, date)

    // 按时间分组
    const morning = dateItems.filter(i => {
      const hour = new Date(i.ts).getHours()
      return hour >= 5 && hour < 12
    })
    const afternoon = dateItems.filter(i => {
      const hour = new Date(i.ts).getHours()
      return hour >= 12 && hour < 18
    })
    const evening = dateItems.filter(i => {
      const hour = new Date(i.ts).getHours()
      return hour >= 18 || hour < 5
    })

    if (morning.length > 0) {
      segments.push({
        date,
        label: '上午',
        highlight: '专注时段',
        emotion: getDominantEmotion(morning),
        insight: generateInsight(morning),
        items: morning.map(i => ({ type: i.type, summary: summarizeItem(i) })),
      })
    }

    if (afternoon.length > 0) {
      segments.push({
        date,
        label: '下午',
        highlight: '持续状态',
        emotion: getDominantEmotion(afternoon),
        insight: generateInsight(afternoon),
        items: afternoon.map(i => ({ type: i.type, summary: summarizeItem(i) })),
      })
    }

    if (evening.length > 0) {
      segments.push({
        date,
        label: '晚间',
        highlight: '沉淀时刻',
        emotion: getDominantEmotion(evening),
        insight: generateInsight(evening),
        items: evening.map(i => ({ type: i.type, summary: summarizeItem(i) })),
      })
    }

    // 生成摘要
    const summary = generateDailySummaryText(stats)

    const report: NarrativeReport = {
      id: `narrative-daily-${date}`,
      title: `${formatDateLabel(date)} · 时间长廊叙事`,
      type: 'daily',
      dateRange: { start: date, end: date },
      segments,
      summary,
      stats,
      emotionTrend,
      createdAt: new Date().toISOString(),
      exported: false,
    }

    // 避免重复
    const existingIdx = reports.value.findIndex(r => r.id === report.id)
    if (existingIdx >= 0) {
      reports.value[existingIdx] = report
    } else {
      reports.value.push(report)
    }
    saveReports()

    return report
  }

  /** 生成周报 */
  function generateWeeklyReport(
    source: RiverSource,
    weekStart: string,
    weekEnd: string,
  ): NarrativeReport {
    const items = createRiverItems(source, ['crystal', 'note', 'emotion', 'session', 'anchor'])
    const weekItems = items.filter(i => {
      const itemDate = getLocalDateKey(new Date(i.ts))
      return itemDate >= weekStart && itemDate <= weekEnd
    })

    // 与 computeDailySummaries 的分组键同为本地日历日，勿用 UTC ISO 日期
    const today = getLocalDateKey()
    const yesterday = getLocalDateKey(new Date(Date.now() - 86400000))
    const dailySummaries = computeDailySummaries(weekItems, today, yesterday)

    const segments: NarrativeSegment[] = dailySummaries.map(ds => ({
      date: ds.date,
      label: ds.label,
      highlight: ds.totalFocusMinutes > 0
        ? `专注 ${ds.totalFocusMinutes} 分钟`
        : '休息日',
      emotion: ds.emotionCount > 0
        ? `${ds.emotionCount} 次情绪记录`
        : '无情绪记录',
      insight: generateDailyInsight(ds),
      items: [
        { type: 'crystal', summary: `${ds.crystalCount} 个时间结晶` },
        { type: 'note', summary: `${ds.noteCount} 篇笔记` },
        { type: 'emotion', summary: `${ds.emotionCount} 次情绪记录` },
        { type: 'session', summary: `${ds.sessionCount} 次专注会话` },
        { type: 'anchor', summary: `${ds.anchorCount} 个锚点(${ds.completedAnchors} 完成)` },
      ],
    }))

    const stats = computeNarrativeStats(weekItems)
    const emotionTrend = computeEmotionTrend(weekItems, weekStart, weekEnd)

    const summary = generateWeeklySummaryText(stats, weekStart, weekEnd)

    const report: NarrativeReport = {
      id: `narrative-weekly-${weekStart}`,
      title: `${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)} · 周报`,
      type: 'weekly',
      dateRange: { start: weekStart, end: weekEnd },
      segments,
      summary,
      stats,
      emotionTrend,
      createdAt: new Date().toISOString(),
      exported: false,
      // P18-1 增强字段
      milestones: detectMilestones(weekItems),
      periodComparison: (() => {
        // 对比上周
        const prevWeekStart = new Date(weekStart)
        prevWeekStart.setDate(prevWeekStart.getDate() - 7)
        const prevWeekEnd = new Date(weekEnd)
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
        const prevItems = items.filter(i => {
          const d = getLocalDateKey(new Date(i.ts))
          return d >= getLocalDateKey(prevWeekStart) && d <= getLocalDateKey(prevWeekEnd)
        })
        return comparePeriods(weekItems, prevItems, '本周', '上周')
      })(),
      suggestions: generateSuggestions(stats, weekItems, emotionTrend),
      wordCloud: generateWordCloud(weekItems),
    }

    const existingIdx = reports.value.findIndex(r => r.id === report.id)
    if (existingIdx >= 0) {
      reports.value[existingIdx] = report
    } else {
      reports.value.push(report)
    }
    saveReports()

    return report
  }

  /** 生成月报 */
  function generateMonthlyReport(
    source: RiverSource,
    year: number,
    month: number,
  ): NarrativeReport {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const items = createRiverItems(source, ['crystal', 'note', 'emotion', 'session', 'anchor'])
    const monthItems = items.filter(i => {
      const itemDate = getLocalDateKey(new Date(i.ts))
      return itemDate >= monthStart && itemDate <= monthEnd
    })

    // 按周分组
    const weeks: { start: string; end: string; label: string; items: RiverItem[] }[] = []
    const startDate = new Date(monthStart)
    while (getLocalDateKey(startDate) <= monthEnd) {
      const weekStart = getLocalDateKey(startDate)
      const weekEndDate = new Date(startDate)
      weekEndDate.setDate(weekEndDate.getDate() + 6)
      const weekEnd = getLocalDateKey(weekEndDate) > monthEnd
        ? monthEnd
        : getLocalDateKey(weekEndDate)

      const weekLabel = `${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)}`
      const weekItemsFiltered = monthItems.filter(i => {
        const d = getLocalDateKey(new Date(i.ts))
        return d >= weekStart && d <= weekEnd
      })

      weeks.push({ start: weekStart, end: weekEnd, label: weekLabel, items: weekItemsFiltered })
      startDate.setDate(startDate.getDate() + 7)
    }

    const segments: NarrativeSegment[] = weeks.map(w => {
      const stats = computeNarrativeStats(w.items)
      return {
        date: w.start,
        label: w.label,
        highlight: `专注 ${stats.totalFocusMinutes} 分钟`,
        emotion: stats.dominantEmotion,
        insight: `${stats.totalCrystals} 结晶 · ${stats.totalNotes} 笔记 · ${stats.completedAnchors}/${stats.totalAnchors} 锚点`,
        items: [
          { type: 'crystal', summary: `${stats.totalCrystals} 个时间结晶` },
          { type: 'note', summary: `${stats.totalNotes} 篇笔记` },
          { type: 'session', summary: `${stats.totalFocusMinutes} 分钟专注` },
          { type: 'anchor', summary: `锚点完成率 ${stats.anchorCompletionRate}%` },
        ],
      }
    })

    const stats = computeNarrativeStats(monthItems)
    const emotionTrend = computeEmotionTrend(monthItems, monthStart, monthEnd)

    const summary = generateMonthlySummaryText(stats, year, month)

    const report: NarrativeReport = {
      id: `narrative-monthly-${year}-${month}`,
      title: `${year}年${month}月 · 月报`,
      type: 'monthly',
      dateRange: { start: monthStart, end: monthEnd },
      segments,
      summary,
      stats,
      emotionTrend,
      createdAt: new Date().toISOString(),
      exported: false,
      // P18-1 增强字段
      milestones: detectMilestones(monthItems),
      periodComparison: (() => {
        // 对比上月
        const prevMonth = month === 1 ? 12 : month - 1
        const prevYear = month === 1 ? year - 1 : year
        const prevMonthItems = items.filter(i => {
          const d = new Date(i.ts)
          return d.getFullYear() === prevYear && d.getMonth() + 1 === prevMonth
        })
        return comparePeriods(monthItems, prevMonthItems, '本月', '上月')
      })(),
      suggestions: generateSuggestions(stats, monthItems, emotionTrend),
      wordCloud: generateWordCloud(monthItems),
    }

    const existingIdx = reports.value.findIndex(r => r.id === report.id)
    if (existingIdx >= 0) {
      reports.value[existingIdx] = report
    } else {
      reports.value.push(report)
    }
    saveReports()

    return report
  }

  /** 生成年度报告 */
  function generateYearlyReport(
    source: RiverSource,
    year: number,
  ): NarrativeReport {
    const items = createRiverItems(source, ['crystal', 'note', 'emotion', 'session', 'anchor'])
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`
    const yearItems = items.filter(i => {
      const itemDate = getLocalDateKey(new Date(i.ts))
      return itemDate >= yearStart && itemDate <= yearEnd
    })

    // 按月分组
    const monthSegments: NarrativeSegment[] = []
    for (let month = 1; month <= 12; month++) {
      const mStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const mEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const monthItems = yearItems.filter(i => {
        const d = getLocalDateKey(new Date(i.ts))
        return d >= mStart && d <= mEnd
      })

      const mStats = computeNarrativeStats(monthItems)
      if (monthItems.length === 0) continue

      monthSegments.push({
        date: mStart,
        label: `${month}月`,
        highlight: mStats.totalFocusMinutes > 0
          ? `专注 ${mStats.totalFocusMinutes} 分钟`
          : '无专注记录',
        emotion: mStats.dominantEmotion,
        insight: `${mStats.totalCrystals} 结晶 · ${mStats.totalNotes} 笔记 · ${mStats.completedAnchors}/${mStats.totalAnchors} 锚点`,
        items: [
          { type: 'crystal', summary: `${mStats.totalCrystals} 个时间结晶` },
          { type: 'note', summary: `${mStats.totalNotes} 篇笔记` },
          { type: 'session', summary: `${mStats.totalFocusMinutes} 分钟专注` },
          { type: 'anchor', summary: `锚点完成率 ${mStats.anchorCompletionRate}%` },
          { type: 'emotion', summary: `主导情绪: ${mStats.dominantEmotion}` },
        ],
      })
    }

    const stats = computeNarrativeStats(yearItems)
    const emotionTrend = computeEmotionTrend(yearItems, yearStart, yearEnd)
    const summary = generateYearlySummaryText(stats, year, yearItems)

    const report: NarrativeReport = {
      id: `narrative-yearly-${year}`,
      title: `${year}年 · 年度报告`,
      type: 'yearly',
      dateRange: { start: yearStart, end: yearEnd },
      segments: monthSegments,
      summary,
      stats,
      emotionTrend,
      createdAt: new Date().toISOString(),
      exported: false,
      // P18-1 增强字段
      milestones: detectMilestones(yearItems),
      periodComparison: (() => {
        const prevYearItems = items.filter(i => {
          const d = new Date(i.ts)
          return d.getFullYear() === year - 1
        })
        return comparePeriods(yearItems, prevYearItems, '今年', '去年')
      })(),
      suggestions: generateSuggestions(stats, yearItems, emotionTrend),
      wordCloud: generateWordCloud(yearItems),
    }

    const existingIdx = reports.value.findIndex(r => r.id === report.id)
    if (existingIdx >= 0) {
      reports.value[existingIdx] = report
    } else {
      reports.value.push(report)
    }
    saveReports()

    return report
  }

  /** 获取已有报告 */
  function getReport(reportId: string): NarrativeReport | undefined {
    return reports.value.find(r => r.id === reportId)
  }

  /** 按类型获取报告 */
  function getReportsByType(type: NarrativeReport['type']): NarrativeReport[] {
    return reports.value
      .filter(r => r.type === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return {
    reports,
    loadReports,
    generateDailyNarrative,
    generateWeeklyReport,
    generateMonthlyReport,
    generateYearlyReport,
    getReport,
    getReportsByType,
  }
}

// ============================================================
// useReportExporter
// ============================================================

export function useReportExporter() {
  const exportResult = ref<ExportResult | null>(null)

  /** 导出为 JSON */
  function exportAsJSON(report: NarrativeReport): ExportResult {
    const content = JSON.stringify(report, null, 2)
    const result: ExportResult = {
      format: 'json',
      content,
      filename: `${report.id}.json`,
      size: new Blob([content]).size,
    }
    exportResult.value = result
    return result
  }

  /** 导出为 Markdown */
  function exportAsMarkdown(report: NarrativeReport): ExportResult {
    let md = `# ${report.title}\n\n`
    md += `> ${report.dateRange.start} 至 ${report.dateRange.end}\n\n`

    md += `## 摘要\n\n${report.summary}\n\n`

    md += `## 统计\n\n`
    md += `| 指标 | 数值 |\n|------|------|\n`
    md += `| 总专注时长 | ${report.stats.totalFocusMinutes} 分钟 |\n`
    md += `| 时间结晶 | ${report.stats.totalCrystals} 个 |\n`
    md += `| 笔记 | ${report.stats.totalNotes} 篇 |\n`
    md += `| 情绪记录 | ${report.stats.totalEmotions} 次 |\n`
    md += `| 锚点完成率 | ${report.stats.anchorCompletionRate}% |\n`
    md += `| 主导情绪 | ${report.stats.dominantEmotion} |\n\n`

    md += `## 叙事\n\n`
    report.segments.forEach(seg => {
      md += `### ${seg.label} - ${seg.highlight}\n\n`
      md += `**情绪**: ${seg.emotion}\n\n`
      md += `**洞察**: ${seg.insight}\n\n`
      md += `- ${seg.items.map(i => i.summary).join('\n- ')}\n\n`
    })

    if (report.emotionTrend.length > 0) {
      md += `## 情绪趋势\n\n`
      md += `| 日期 | 主导情绪 | 快乐 | 平静 | 悲伤 | 焦虑 | 愤怒 |\n`
      md += `|------|----------|------|------|------|------|------|\n`
      report.emotionTrend.forEach(et => {
        md += `| ${et.label} | ${et.dominant} | ${et.happy} | ${et.calm} | ${et.sad} | ${et.anxious} | ${et.angry} |\n`
      })
    }

    const result: ExportResult = {
      format: 'markdown',
      content: md,
      filename: `${report.id}.md`,
      size: new Blob([md]).size,
    }
    exportResult.value = result
    return result
  }

  /** 导出为纯文本 */
  function exportAsText(report: NarrativeReport): ExportResult {
    let text = `${report.title}\n`
    text += `${'='.repeat(report.title.length)}\n\n`
    text += `${report.summary}\n\n`

    text += `统计：\n`
    text += `  专注 ${report.stats.totalFocusMinutes} 分钟 | `
    text += `结晶 ${report.stats.totalCrystals} | `
    text += `笔记 ${report.stats.totalNotes} | `
    text += `锚点 ${report.stats.completedAnchors}/${report.stats.totalAnchors}\n\n`

    report.segments.forEach(seg => {
      text += `[${seg.label}] ${seg.highlight}\n`
      text += `  情绪: ${seg.emotion} | ${seg.insight}\n`
      seg.items.forEach(item => {
        text += `  - ${item.summary}\n`
      })
      text += '\n'
    })

    const result: ExportResult = {
      format: 'text',
      content: text,
      filename: `${report.id}.txt`,
      size: new Blob([text]).size,
    }
    exportResult.value = result
    return result
  }

  /** 统一导出 */
  function exportReport(report: NarrativeReport, format: ExportFormat = 'markdown'): ExportResult {
    report.exported = true

    switch (format) {
      case 'json': return exportAsJSON(report)
      case 'markdown': return exportAsMarkdown(report)
      case 'text': return exportAsText(report)
    }
  }

  return { exportResult, exportReport, exportAsJSON, exportAsMarkdown, exportAsText }
}

// ============================================================
// 辅助函数
// ============================================================

function computeNarrativeStats(items: RiverItem[]): NarrativeStats {
  let totalFocusMinutes = 0
  let totalCrystals = 0
  let totalNotes = 0
  let totalEmotions = 0
  let totalAnchors = 0
  let completedAnchors = 0
  const tagCounts = new Map<string, number>()
  const emotionCounts = new Map<string, number>()
  const dailyFocusMap = new Map<string, number>()

  items.forEach(item => {
    switch (item.type) {
      case 'crystal':
        totalCrystals++
        item.crystal?.tags?.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
        break
      case 'note':
        totalNotes++
        item.note?.tags?.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
        break
      case 'emotion':
        totalEmotions++
        if (item.emotion?.type) {
          emotionCounts.set(item.emotion.type, (emotionCounts.get(item.emotion.type) || 0) + 1)
        }
        break
      case 'session':
        if (item.session?.elapsed) {
          const mins = Math.round(item.session.elapsed / 60000)
          totalFocusMinutes += mins
          const date = getLocalDateKey(new Date(item.ts))
          dailyFocusMap.set(date, (dailyFocusMap.get(date) || 0) + mins)
        }
        item.session?.tags?.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
        break
      case 'anchor':
        totalAnchors++
        if (item.anchor?.done) completedAnchors++
        item.anchor?.tags?.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
        break
    }
  })

  const anchorCompletionRate = totalAnchors > 0
    ? Math.round((completedAnchors / totalAnchors) * 100)
    : 0

  const daysWithFocus = dailyFocusMap.size
  const averageDailyFocus = daysWithFocus > 0
    ? Math.round(totalFocusMinutes / daysWithFocus)
    : 0

  let mostProductiveDay = '—'
  let mostProductiveDayMinutes = 0
  dailyFocusMap.forEach((mins, date) => {
    if (mins > mostProductiveDayMinutes) {
      mostProductiveDayMinutes = mins
      mostProductiveDay = date
    }
  })

  const dominantEmotion = [...emotionCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '未知'

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  return {
    totalFocusMinutes,
    totalCrystals,
    totalNotes,
    totalEmotions,
    totalAnchors,
    completedAnchors,
    anchorCompletionRate,
    averageDailyFocus,
    mostProductiveDay,
    mostProductiveDayMinutes,
    dominantEmotion,
    topTags,
  }
}

function computeEmotionTrend(
  items: RiverItem[],
  startDate: string,
  endDate: string,
): EmotionTrend[] {
  const trendMap = new Map<string, { happy: number; calm: number; sad: number; anxious: number; angry: number }>()

  // 初始化日期范围
  const start = new Date(startDate)
  const end = new Date(endDate)
  const current = new Date(start)
  while (current <= end) {
    const dateStr = getLocalDateKey(current)
    trendMap.set(dateStr, { happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0 })
    current.setDate(current.getDate() + 1)
  }

  items.forEach(item => {
    if (item.type !== 'emotion' || !item.emotion) return
    const date = getLocalDateKey(new Date(item.ts))
    const entry = trendMap.get(date)
    if (!entry) return

    switch (item.emotion.type) {
      case 'happy': entry.happy++; break
      case 'calm': entry.calm++; break
      case 'sad': entry.sad++; break
      case 'anxious': entry.anxious++; break
      case 'angry': entry.angry++; break
    }
  })

  return [...trendMap.entries()]
    .map(([date, counts]) => {
      const max = Math.max(counts.happy, counts.calm, counts.sad, counts.anxious, counts.angry)
      let dominant = 'none'
      if (max > 0) {
        if (counts.happy === max) dominant = 'happy'
        else if (counts.calm === max) dominant = 'calm'
        else if (counts.sad === max) dominant = 'sad'
        else if (counts.anxious === max) dominant = 'anxious'
        else dominant = 'angry'
      }

      return {
        date,
        label: formatDateLabel(date),
        ...counts,
        dominant,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

function getDominantEmotion(items: RiverItem[]): string {
  const counts = new Map<string, number>()
  items.forEach(item => {
    if (item.type === 'emotion' && item.emotion) {
      counts.set(item.emotion.type, (counts.get(item.emotion.type) || 0) + 1)
    }
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '平静'
}

function summarizeItem(item: RiverItem): string {
  switch (item.type) {
    case 'crystal':
      return item.crystal?.insight || '时间结晶'
    case 'note':
      return item.note?.title || '笔记'
    case 'emotion':
      return item.emotion?.type ? `情绪：${item.emotion.type}` : '情绪记录'
    case 'session':
      if (item.session?.elapsed) {
        const mins = Math.round(item.session.elapsed / 60000)
        return `专注 ${mins} 分钟`
      }
      return '专注会话'
    case 'anchor':
      return item.anchor?.text
        ? `${item.anchor.done ? '✓' : '○'} ${item.anchor.text}`
        : '锚点'
    default:
      return '未知'
  }
}

function generateInsight(items: RiverItem[]): string {
  const focusMins = items
    .filter(i => i.type === 'session' && i.session?.elapsed)
    .reduce((sum, i) => sum + Math.round(i.session!.elapsed / 60000), 0)

  const completedAnchors = items.filter(
    i => i.type === 'anchor' && i.anchor?.done,
  ).length

  const totalAnchors = items.filter(i => i.type === 'anchor').length

  if (focusMins > 0 && completedAnchors > 0) {
    return `专注 ${focusMins} 分钟，完成 ${completedAnchors} 个锚点，状态不错`
  }
  if (focusMins > 0) {
    return `专注了 ${focusMins} 分钟，保持节奏`
  }
  if (completedAnchors > 0) {
    return `完成了 ${completedAnchors}/${totalAnchors} 个锚点`
  }
  if (items.length === 0) {
    return '今天是空白的一天，等待新的记录'
  }
  return '记录了生活的痕迹'
}

function generateDailyInsight(ds: DailySummary): string {
  if (ds.totalFocusMinutes > 0) {
    return `专注 ${ds.totalFocusMinutes} 分钟，${ds.completedAnchors} 个锚点完成`
  }
  if (ds.noteCount > 0) {
    return `写了 ${ds.noteCount} 篇笔记，记录思考`
  }
  if (ds.emotionCount > 0) {
    return `记录了 ${ds.emotionCount} 次情绪`
  }
  return '安静的一天'
}

function generateDailySummaryText(stats: NarrativeStats): string {
  const parts: string[] = []
  if (stats.totalFocusMinutes > 0) {
    parts.push(`今天你专注了 ${stats.totalFocusMinutes} 分钟`)
  }
  if (stats.totalCrystals > 0) {
    parts.push(`产生了 ${stats.totalCrystals} 个时间结晶`)
  }
  if (stats.totalNotes > 0) {
    parts.push(`写了 ${stats.totalNotes} 篇笔记`)
  }
  if (stats.completedAnchors > 0) {
    parts.push(`完成了 ${stats.completedAnchors}/${stats.totalAnchors} 个锚点`)
  }
  if (stats.totalEmotions > 0) {
    parts.push(`记录了 ${stats.totalEmotions} 次情绪（以${stats.dominantEmotion}为主）`)
  }

  return parts.length > 0
    ? parts.join('，') + '。'
    : '今天还没有记录，期待你的第一个结晶。'
}

function generateWeeklySummaryText(
  stats: NarrativeStats,
  weekStart: string,
  weekEnd: string,
): string {
  const parts: string[] = [
    `本周（${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)}）`,
    `累计专注 ${stats.totalFocusMinutes} 分钟`,
    `日均 ${stats.averageDailyFocus} 分钟`,
    `完成 ${stats.completedAnchors}/${stats.totalAnchors} 个锚点（${stats.anchorCompletionRate}%）`,
    `写了 ${stats.totalNotes} 篇笔记`,
    `情绪以 ${stats.dominantEmotion} 为主`,
  ]

  if (stats.topTags.length > 0) {
    parts.push(`高频标签：${stats.topTags.join('、')}`)
  }

  return parts.join('，') + '。'
}

function generateMonthlySummaryText(
  stats: NarrativeStats,
  year: number,
  month: number,
): string {
  const parts: string[] = [
    `${year}年${month}月`,
    `累计专注 ${stats.totalFocusMinutes} 分钟`,
    `日均 ${stats.averageDailyFocus} 分钟`,
    `完成 ${stats.completedAnchors}/${stats.totalAnchors} 个锚点（${stats.anchorCompletionRate}%）`,
    `产生 ${stats.totalCrystals} 个结晶`,
    `写了 ${stats.totalNotes} 篇笔记`,
    `主导情绪：${stats.dominantEmotion}`,
  ]

  if (stats.mostProductiveDayMinutes > 0) {
    parts.push(`最高效日：${formatDateLabel(stats.mostProductiveDay)}（${stats.mostProductiveDayMinutes} 分钟）`)
  }

  return parts.join('，') + '。'
}

function generateYearlySummaryText(
  stats: NarrativeStats,
  year: number,
  yearItems: RiverItem[],
): string {
  // 计算活跃月份数
  const activeMonths = new Set<number>()
  yearItems.forEach(i => {
    activeMonths.add(new Date(i.ts).getMonth() + 1)
  })

  // 计算总专注小时
  const totalHours = Math.round(stats.totalFocusMinutes / 60 * 10) / 10

  const parts: string[] = [
    `${year}年年度回顾`,
    `累计专注 ${stats.totalFocusMinutes} 分钟（约 ${totalHours} 小时）`,
    `活跃 ${activeMonths.size} 个月`,
    `产生 ${stats.totalCrystals} 个时间结晶`,
    `写了 ${stats.totalNotes} 篇笔记`,
    `记录了 ${stats.totalEmotions} 次情绪`,
    `完成了 ${stats.completedAnchors}/${stats.totalAnchors} 个锚点（${stats.anchorCompletionRate}%）`,
  ]

  if (stats.mostProductiveDayMinutes > 0) {
    parts.push(`全年最高效日：${formatDateLabel(stats.mostProductiveDay)}（${stats.mostProductiveDayMinutes} 分钟）`)
  }

  if (stats.topTags.length > 0) {
    parts.push(`年度高频标签：${stats.topTags.join('、')}`)
  }

  parts.push(`年度主导情绪：${stats.dominantEmotion}`)

  return parts.join('，') + '。'
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}