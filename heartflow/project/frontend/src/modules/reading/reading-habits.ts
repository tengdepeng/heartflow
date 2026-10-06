// ============================================================
// 阅览殿 · 阅读习惯分析
// 阅读时段、会话模式、一致性、偏好洞察
// ============================================================

import { ref, computed } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import { storage } from '../../engine/storage'
import type { Book, ReadingSession } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 阅读习惯 */
export interface ReadingHabit {
  /** 习惯ID */
  id: string
  /** 习惯名称 */
  name: string
  /** 习惯描述 */
  description: string
  /** 习惯类型 */
  type: HabitType
  /** 习惯强度 0-1 */
  strength: number
  /** 连续天数 */
  streak: number
  /** 最佳连续天数 */
  bestStreak: number
  /** 最近活动日期 */
  lastActiveDate: string
  /** 创建时间 */
  createdAt: string
}

/** 习惯类型 */
export type HabitType =
  | 'daily_reading'      // 每日阅读
  | 'morning_reading'    // 晨间阅读
  | 'evening_reading'    // 晚间阅读
  | 'weekend_reading'    // 周末阅读
  | 'long_session'       // 长时阅读
  | 'short_session'      // 碎片阅读
  | 'genre_rotation'     // 类型轮换
  | 'note_taking'        // 笔记习惯
  | 'custom'             // 自定义

/** 习惯模式 */
export interface HabitPattern {
  /** 时段标签 */
  timeSlot: string
  /** 该时段会话数 */
  sessionCount: number
  /** 该时段总时长（分钟） */
  totalDuration: number
  /** 平均时长 */
  averageDuration: number
  /** 该时段阅读页数 */
  totalPages: number
  /** 频率百分比 */
  frequencyPercent: number
}

/** 阅读会话模式 */
export interface ReadingSessionPattern {
  /** 平均会话时长（分钟） */
  averageDuration: number
  /** 中位会话时长 */
  medianDuration: number
  /** 最长会话时长 */
  maxDuration: number
  /** 最短会话时长 */
  minDuration: number
  /** 平均每次阅读页数 */
  averagePagesPerSession: number
  /** 最佳阅读时段 */
  bestTimeSlot: { hour: number; label: string }
  /** 最常阅读日 */
  favoriteDayOfWeek: string
  /** 时段分布 */
  timeSlotDistribution: HabitPattern[]
  /** 每周阅读天数 */
  readingDaysPerWeek: number
  /** 会话时长一致性（标准差越小越稳定） */
  consistency: number
}

/** 习惯洞察 */
export interface HabitInsight {
  /** 洞察ID */
  id: string
  /** 洞察标题 */
  title: string
  /** 洞察描述 */
  description: string
  /** 洞察类型 */
  type: 'strength' | 'weakness' | 'opportunity' | 'warning' | 'achievement'
  /** 相关数据 */
  relatedData?: string
  /** 建议行动 */
  suggestedAction?: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 生成时间 */
  timestamp: string
}

// ============================================================
// 存储键
// ============================================================

const HABITS_KEY = 'hf:reading:habits'
const INSIGHTS_KEY = 'hf:reading:habit_insights'

// ============================================================
// 常量
// ============================================================

/** 时段定义 */
const TIME_SLOTS: { label: string; startHour: number; endHour: number }[] = [
  { label: '清晨 (5-8)', startHour: 5, endHour: 8 },
  { label: '上午 (8-12)', startHour: 8, endHour: 12 },
  { label: '午间 (12-14)', startHour: 12, endHour: 14 },
  { label: '下午 (14-18)', startHour: 14, endHour: 18 },
  { label: '晚间 (18-22)', startHour: 18, endHour: 22 },
  { label: '深夜 (22-5)', startHour: 22, endHour: 29 }, // 29 表示次日 5 点
]

/** 星期名称 */
const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 习惯类型元数据 */
export const HABIT_TYPE_META: Record<HabitType, { label: string; icon: string; desc: string }> = {
  daily_reading: { label: '每日阅读', icon: '📖', desc: '每天都有阅读习惯' },
  morning_reading: { label: '晨间阅读', icon: '🌅', desc: '喜欢在早晨阅读' },
  evening_reading: { label: '晚间阅读', icon: '🌙', desc: '喜欢在晚间阅读' },
  weekend_reading: { label: '周末阅读', icon: '☕', desc: '周末阅读时间更长' },
  long_session: { label: '长时阅读', icon: '🕐', desc: '偏好长时间沉浸式阅读' },
  short_session: { label: '碎片阅读', icon: '⏱️', desc: '利用碎片时间短时阅读' },
  genre_rotation: { label: '类型轮换', icon: '🔄', desc: '喜欢在不同类型间切换' },
  note_taking: { label: '笔记习惯', icon: '✍️', desc: '阅读时习惯做笔记' },
  custom: { label: '自定义', icon: '🎯', desc: '自定义阅读习惯' },
}

// ============================================================
// 辅助函数
// ============================================================

let counter = 0
function generateId(prefix: string): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * 获取时间所属时段
 */
function getTimeSlot(hour: number): string {
  for (const slot of TIME_SLOTS) {
    if (hour >= slot.startHour && hour < slot.endHour) {
      return slot.label
    }
  }
  // 处理 0-5 点的情况
  return '深夜 (22-5)'
}

// ============================================================
// 阅读习惯分析
// ============================================================

export function useReadingHabits() {
  const habits = ref<ReadingHabit[]>(loadHabits())
  const insights = ref<HabitInsight[]>(loadInsights())

  // ---- 持久化 ----

  function loadHabits(): ReadingHabit[] {
    try {
      return storage.getKV<ReadingHabit[]>(HABITS_KEY, [])
    } catch { return [] }
  }

  function saveHabits() {
    storage.setKV(HABITS_KEY, habits.value)
  }

  function loadInsights(): HabitInsight[] {
    try {
      return storage.getKV<HabitInsight[]>(INSIGHTS_KEY, [])
    } catch { return [] }
  }

  function saveInsights() {
    storage.setKV(INSIGHTS_KEY, insights.value)
  }

  // ---- 阅读模式分析 ----

  /**
   * 分析阅读模式
   * 从阅读会话中提取时段分布、会话特征、阅读频率等
   */
  function analyzeReadingPatterns(
    sessions: ReadingSession[],
  ): ReadingSessionPattern {
    if (sessions.length === 0) {
      return createEmptyPattern()
    }

    // 会话时长
    const durations = sessions.map(s => s.duration)
    const avgDuration = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    const medDuration = Math.round(median(durations))
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)

    // 平均页数
    const pagesPerSession = sessions.map(s => s.endPage - s.startPage).filter(p => p > 0)
    const avgPages = pagesPerSession.length > 0
      ? Math.round(pagesPerSession.reduce((sum, p) => sum + p, 0) / pagesPerSession.length)
      : 0

    // 时段分布
    const slotMap = new Map<string, { count: number; duration: number; pages: number }>()
    const dayMap = new Map<number, number>()
    const hourMap = new Map<number, number>()

    for (const session of sessions) {
      const date = new Date(session.timestamp)
      const hour = date.getHours()
      const day = date.getDay()
      const slot = getTimeSlot(hour)

      const entry = slotMap.get(slot) || { count: 0, duration: 0, pages: 0 }
      entry.count++
      entry.duration += session.duration
      entry.pages += session.endPage - session.startPage
      slotMap.set(slot, entry)

      dayMap.set(day, (dayMap.get(day) || 0) + 1)
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
    }

    const timeSlotDistribution: HabitPattern[] = [...slotMap.entries()]
      .map(([timeSlot, data]) => ({
        timeSlot,
        sessionCount: data.count,
        totalDuration: data.duration,
        averageDuration: Math.round(data.duration / data.count),
        totalPages: data.pages,
        frequencyPercent: Math.round((data.count / sessions.length) * 100),
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)

    // 最佳时段
    const bestHour = hourMap.size > 0
      ? [...hourMap.entries()].reduce((max, cur) => cur[1] > max[1] ? cur : max)
      : [0, 0]
    const bestTimeSlot = {
      hour: bestHour[0],
      label: getTimeSlot(bestHour[0]),
    }

    // 最常阅读日
    const bestDay = dayMap.size > 0
      ? [...dayMap.entries()].reduce((max, cur) => cur[1] > max[1] ? cur : max)
      : [0, 0]
    const favoriteDayOfWeek = DAY_NAMES[bestDay[0]]

    // 每周阅读天数
    const uniqueDays = new Set(sessions.map(s => s.date))
    const readingDaysPerWeek = Math.round((uniqueDays.size / Math.max(1, getDaysBetween(sessions))) * 7 * 10) / 10

    // 一致性（标准差越小越稳定）
    const variance = durations.length > 1
      ? durations.reduce((sum, d) => sum + (d - avgDuration) ** 2, 0) / (durations.length - 1)
      : 0
    const consistency = Math.round(Math.max(0, 1 - Math.sqrt(variance) / (avgDuration || 1)) * 100)

    return {
      averageDuration: avgDuration,
      medianDuration: medDuration,
      maxDuration,
      minDuration,
      averagePagesPerSession: avgPages,
      bestTimeSlot,
      favoriteDayOfWeek,
      timeSlotDistribution,
      readingDaysPerWeek,
      consistency,
    }
  }

  function createEmptyPattern(): ReadingSessionPattern {
    return {
      averageDuration: 0,
      medianDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      averagePagesPerSession: 0,
      bestTimeSlot: { hour: 0, label: '暂无数据' },
      favoriteDayOfWeek: '暂无数据',
      timeSlotDistribution: [],
      readingDaysPerWeek: 0,
      consistency: 0,
    }
  }

  // ---- 偏好时段 ----

  /**
   * 获取推荐阅读时段
   * 基于历史数据分析最佳阅读时间
   */
  function getPreferredTimeSlots(sessions: ReadingSession[]): {
    slots: { label: string; score: number; recommendation: string }[]
    primarySlot: string
    secondarySlot: string
  } {
    if (sessions.length === 0) {
      return { slots: [], primarySlot: '暂无数据', secondarySlot: '暂无数据' }
    }

    const slotScores = new Map<string, { count: number; totalDuration: number; avgPages: number }>()

    for (const session of sessions) {
      const hour = new Date(session.timestamp).getHours()
      const slot = getTimeSlot(hour)
      const entry = slotScores.get(slot) || { count: 0, totalDuration: 0, avgPages: 0 }
      entry.count++
      entry.totalDuration += session.duration
      entry.avgPages += session.endPage - session.startPage
      slotScores.set(slot, entry)
    }

    const slots = [...slotScores.entries()]
      .map(([label, data]) => {
        const frequencyScore = data.count / sessions.length
        const durationScore = Math.min(1, data.totalDuration / (sessions.length * 30))
        const pagesScore = Math.min(1, data.avgPages / (data.count * 20))
        const score = Math.round((frequencyScore * 0.4 + durationScore * 0.3 + pagesScore * 0.3) * 100)

        let recommendation = ''
        if (score >= 70) recommendation = '最佳阅读时段，效率最高'
        else if (score >= 50) recommendation = '不错的阅读时段，可继续利用'
        else if (score >= 30) recommendation = '偶尔阅读的时段，可以增加频率'
        else recommendation = '较少利用的时段，可以尝试培养习惯'

        return { label, score, recommendation }
      })
      .sort((a, b) => b.score - a.score)

    return {
      slots,
      primarySlot: slots[0]?.label || '暂无数据',
      secondarySlot: slots[1]?.label || '暂无数据',
    }
  }

  // ---- 阅读一致性分析 ----

  /**
   * 分析阅读一致性
   * 评估阅读习惯的规律程度
   */
  function getReadingConsistency(
    sessions: ReadingSession[],
    _books: Book[],
  ): {
    /** 一致性评分 0-100 */
    consistencyScore: number
    /** 连续阅读天数 */
    streak: number
    /** 最长连续阅读天数 */
    bestStreak: number
    /** 每周平均阅读天数 */
    avgDaysPerWeek: number
    /** 阅读时段稳定性 */
    timeSlotStability: number
    /** 阅读时长稳定性 */
    durationStability: number
    /** 整体评价 */
    assessment: string
    /** 等级 */
    level: 'excellent' | 'good' | 'fair' | 'developing' | 'beginner'
  } {
    if (sessions.length === 0) {
      return {
        consistencyScore: 0,
        streak: 0,
        bestStreak: 0,
        avgDaysPerWeek: 0,
        timeSlotStability: 0,
        durationStability: 0,
        assessment: '还没有阅读记录，开始你的第一次阅读吧！',
        level: 'beginner',
      }
    }

    // 连续天数
    const dates = sessions.map(s => s.date)
    const sortedDates = [...new Set(dates)].sort()

    // 当前连续天数
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const expected = new Date(today.getTime() - (sortedDates.length - 1 - i) * 86400000)
      // ⚠️ expected 由本地 today 回退构造，取本地日键；sortedDates 是记录键（todayStr 本地化后），两侧同基
      if (sortedDates[i] === getLocalDateKey(expected)) {
        streak++
      } else {
        break
      }
    }

    // 最佳连续天数
    let bestStreak = 0
    let currentStreak = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      if (diff === 1) {
        currentStreak++
      } else {
        bestStreak = Math.max(bestStreak, currentStreak)
        currentStreak = 1
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak)

    // 每周平均天数
    const daysBetween = getDaysBetween(sessions)
    const avgDaysPerWeek = daysBetween > 0
      ? Math.round((new Set(dates).size / Math.max(1, daysBetween)) * 7 * 10) / 10
      : 0

    // 时段稳定性（同一时段的比例）
    const slotCounts = new Map<string, number>()
    for (const session of sessions) {
      const slot = getTimeSlot(new Date(session.timestamp).getHours())
      slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1)
    }
    const maxSlotCount = Math.max(...slotCounts.values())
    const timeSlotStability = Math.round((maxSlotCount / sessions.length) * 100)

    // 时长稳定性
    const durations = sessions.map(s => s.duration)
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
    const variance = durations.length > 1
      ? durations.reduce((sum, d) => sum + (d - avgDuration) ** 2, 0) / (durations.length - 1)
      : 0
    const durationStability = Math.round(Math.max(0, 1 - Math.sqrt(variance) / (avgDuration || 1)) * 100)

    // 综合评分
    const consistencyScore = Math.round(
      (avgDaysPerWeek / 7) * 30 +
      (timeSlotStability / 100) * 25 +
      (durationStability / 100) * 25 +
      (Math.min(1, streak / 30)) * 20
    )

    let level: 'excellent' | 'good' | 'fair' | 'developing' | 'beginner'
    let assessment: string

    if (consistencyScore >= 85) {
      level = 'excellent'
      assessment = '阅读习惯非常稳定！你已经建立了良好的阅读节奏，保持下去'
    } else if (consistencyScore >= 70) {
      level = 'good'
      assessment = '阅读习惯良好，在大多数日子里都能保持阅读，可以尝试固定时段'
    } else if (consistencyScore >= 50) {
      level = 'fair'
      assessment = '阅读习惯尚可，但还需要更多规律性，建议设定每日固定阅读时间'
    } else if (consistencyScore >= 30) {
      level = 'developing'
      assessment = '阅读习惯正在养成中，建议从每天 15 分钟开始建立规律'
    } else {
      level = 'beginner'
      assessment = '阅读习惯较为松散，不妨给自己设定一个小目标开始培养'
    }

    return {
      consistencyScore,
      streak,
      bestStreak,
      avgDaysPerWeek,
      timeSlotStability,
      durationStability,
      assessment,
      level,
    }
  }

  // ---- 习惯洞察生成 ----

  /**
   * 生成习惯洞察
   * 基于阅读数据自动生成个性化洞察和建议
   */
  function generateHabitInsights(
    books: Book[],
    sessions: ReadingSession[],
  ): HabitInsight[] {
    const newInsights: HabitInsight[] = []
    const pattern = analyzeReadingPatterns(sessions)
    const consistency = getReadingConsistency(sessions, books)
    const timeSlots = getPreferredTimeSlots(sessions)

    // 洞察 1: 连续阅读天数
    if (consistency.streak >= 7) {
      newInsights.push({
        id: generateId('insight'),
        title: `连续阅读 ${consistency.streak} 天`,
        description: `你已经连续阅读了 ${consistency.streak} 天，这是一个了不起的成就！`,
        type: 'achievement',
        relatedData: `bestStreak:${consistency.bestStreak}`,
        suggestedAction: '继续保持，争取突破最佳记录',
        priority: 'high',
        timestamp: new Date().toISOString(),
      })
    } else if (consistency.streak >= 3) {
      newInsights.push({
        id: generateId('insight'),
        title: '阅读习惯正在形成',
        description: `你已经连续阅读 ${consistency.streak} 天，继续保持就能养成稳定的阅读习惯`,
        type: 'strength',
        relatedData: `streak:${consistency.streak}`,
        suggestedAction: '明天继续阅读，目标是连续 7 天',
        priority: 'medium',
        timestamp: new Date().toISOString(),
      })
    } else if (sessions.length > 0) {
      newInsights.push({
        id: generateId('insight'),
        title: '阅读连续性需要加强',
        description: '当前阅读还不够连续，每天坚持少量阅读比一次性大量阅读更有效',
        type: 'weakness',
        suggestedAction: '试试每天固定 15 分钟阅读时间',
        priority: 'high',
        timestamp: new Date().toISOString(),
      })
    }

    // 洞察 2: 最佳阅读时段
    if (timeSlots.primarySlot !== '暂无数据') {
      const primarySlot = timeSlots.slots[0]
      if (primarySlot && primarySlot.score >= 60) {
        newInsights.push({
          id: generateId('insight'),
          title: `最佳阅读时段：${timeSlots.primarySlot}`,
          description: `你在 ${timeSlots.primarySlot} 的阅读效率最高，建议优先安排在这个时段阅读`,
          type: 'strength',
          relatedData: `primarySlot:${timeSlots.primarySlot}`,
          suggestedAction: `尝试在 ${timeSlots.primarySlot} 安排重要阅读任务`,
          priority: 'medium',
          timestamp: new Date().toISOString(),
        })
      }
    }

    // 洞察 3: 时段利用机会
    const unusedSlots = TIME_SLOTS.filter(
      ts => !pattern.timeSlotDistribution.some(d => d.timeSlot === ts.label),
    )
    if (unusedSlots.length > 0 && sessions.length > 5) {
      newInsights.push({
        id: generateId('insight'),
        title: '发现未利用的阅读时段',
        description: `你还没有在 ${unusedSlots[0].label} 阅读过，也许可以尝试一下`,
        type: 'opportunity',
        suggestedAction: `在 ${unusedSlots[0].label} 安排一次短时阅读体验`,
        priority: 'low',
        timestamp: new Date().toISOString(),
      })
    }

    // 洞察 4: 阅读时长分析
    if (pattern.averageDuration > 60) {
      newInsights.push({
        id: generateId('insight'),
        title: '沉浸式阅读者',
        description: `你的平均阅读时长 ${pattern.averageDuration} 分钟，属于深度阅读风格`,
        type: 'strength',
        relatedData: `avgDuration:${pattern.averageDuration}`,
        suggestedAction: '长时间阅读时注意每 45 分钟休息一下',
        priority: 'medium',
        timestamp: new Date().toISOString(),
      })
    } else if (pattern.averageDuration < 15 && sessions.length > 5) {
      newInsights.push({
        id: generateId('insight'),
        title: '碎片化阅读模式',
        description: `你的平均阅读时长为 ${pattern.averageDuration} 分钟，属于碎片化阅读`,
        type: 'strength',
        relatedData: `avgDuration:${pattern.averageDuration}`,
        suggestedAction: '碎片化阅读效率高，可以尝试每周安排 1-2 次深度阅读',
        priority: 'medium',
        timestamp: new Date().toISOString(),
      })
    }

    // 洞察 5: 类型偏好洞察
    const tagCounts = new Map<string, number>()
    for (const book of books) {
      for (const tag of book.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (topTags.length > 0) {
      newInsights.push({
        id: generateId('insight'),
        title: '阅读偏好倾向',
        description: `你最喜欢的阅读类型是 "${topTags.map(t => t[0]).join('、')}"，偏好明显`,
        type: 'strength',
        relatedData: `topTags:${topTags.map(t => t[0]).join(',')}`,
        suggestedAction: '可以尝试与之相关的其他类型，拓宽阅读视野',
        priority: 'low',
        timestamp: new Date().toISOString(),
      })
    }

    // 洞察 6: 周末 vs 工作日
    const weekdaySessions = sessions.filter(s => {
      const day = new Date(s.timestamp).getDay()
      return day >= 1 && day <= 5
    })
    const weekendSessions = sessions.filter(s => {
      const day = new Date(s.timestamp).getDay()
      return day === 0 || day === 6
    })

    if (weekendSessions.length > 0 && weekdaySessions.length > 0) {
      const weekdayAvg = weekdaySessions.reduce((sum, s) => sum + s.duration, 0) / weekdaySessions.length
      const weekendAvg = weekendSessions.reduce((sum, s) => sum + s.duration, 0) / weekendSessions.length

      if (weekendAvg > weekdayAvg * 1.5) {
        newInsights.push({
          id: generateId('insight'),
          title: '周末阅读时间更长',
          description: `周末平均阅读 ${Math.round(weekendAvg)} 分钟，比工作日多 ${Math.round(weekendAvg - weekdayAvg)} 分钟`,
          type: 'strength',
          suggestedAction: '周末是深度阅读的好时机，可以安排重要书籍',
          priority: 'low',
          timestamp: new Date().toISOString(),
        })
      }
    }

    // 洞察 7: 阅读节奏警告
    if (consistency.consistencyScore < 30 && sessions.length > 10) {
      newInsights.push({
        id: generateId('insight'),
        title: '阅读节奏不稳定',
        description: '你的阅读时间和频率波动较大，建议建立更规律的阅读习惯',
        type: 'warning',
        suggestedAction: '设定每日固定阅读时间，哪怕只有 10 分钟',
        priority: 'high',
        timestamp: new Date().toISOString(),
      })
    }

    // 洞察 8: 阅读量趋势
    const finishedBooks = books.filter(b => b.status === 'finished')
    if (finishedBooks.length >= 3) {
      newInsights.push({
        id: generateId('insight'),
        title: `已完成 ${finishedBooks.length} 本书`,
        description: `你已经读完了 ${finishedBooks.length} 本书，这是一个值得庆祝的里程碑`,
        type: 'achievement',
        relatedData: `finishedBooks:${finishedBooks.length}`,
        suggestedAction: '为每本读完的书写一段简短总结，加深记忆',
        priority: 'medium',
        timestamp: new Date().toISOString(),
      })
    }

    // 保存洞察
    insights.value = newInsights
    saveInsights()

    return newInsights
  }

  // ---- 习惯管理 ----

  /** 创建习惯追踪 */
  function createHabit(
    name: string,
    description: string,
    type: HabitType,
  ): ReadingHabit {
    const habit: ReadingHabit = {
      id: generateId('habit'),
      name,
      description,
      type,
      strength: 0,
      streak: 0,
      bestStreak: 0,
      lastActiveDate: '',
      createdAt: new Date().toISOString(),
    }
    habits.value.push(habit)
    saveHabits()
    return habit
  }

  /** 更新习惯强度 */
  function updateHabitStrength(habitId: string, strength: number): boolean {
    const habit = habits.value.find(h => h.id === habitId)
    if (!habit) return false
    habit.strength = Math.min(1, Math.max(0, strength))
    saveHabits()
    return true
  }

  /** 删除习惯 */
  function deleteHabit(habitId: string): boolean {
    const idx = habits.value.findIndex(h => h.id === habitId)
    if (idx < 0) return false
    habits.value.splice(idx, 1)
    saveHabits()
    return true
  }

  /** 获取习惯摘要 */
  const habitSummary = computed(() => {
    const h = habits.value
    return {
      total: h.length,
      activeHabits: h.filter(x => x.strength > 0.3),
      strongestHabit: h.reduce((best, cur) => cur.strength > best.strength ? cur : best, h[0]),
      totalStreaks: h.reduce((sum, cur) => sum + cur.streak, 0),
    }
  })

  return {
    // 状态
    habits: computed(() => habits.value),
    insights: computed(() => insights.value),

    // 计算属性
    habitSummary,

    // 模式分析
    analyzeReadingPatterns,

    // 时段
    getPreferredTimeSlots,

    // 一致性
    getReadingConsistency,

    // 洞察
    generateHabitInsights,

    // 习惯管理
    createHabit,
    updateHabitStrength,
    deleteHabit,
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 计算会话数据跨度的天数
 */
function getDaysBetween(sessions: ReadingSession[]): number {
  if (sessions.length === 0) return 0
  const dates = sessions.map(s => new Date(s.timestamp).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  return Math.ceil((maxDate - minDate) / 86400000)
}