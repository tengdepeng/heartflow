// ============================================================
// 阅览殿 · 阅读速度追踪器
// 记录阅读速度、理解率、速度趋势、速度目标
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { Book, ReadingSession } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 阅读速度记录 */
export interface ReadingSpeedRecord {
  id: string
  /** 关联书籍 */
  bookId: string
  /** 关联会话 */
  sessionId: string
  /** 每分钟阅读字数 */
  wordsPerMinute: number
  /** 阅读页数 */
  pagesRead: number
  /** 阅读时长（分钟） */
  duration: number
  /** 理解率 0-1 */
  comprehensionRate: number
  /** 阅读难度 1-5 */
  difficulty: number
  /** 笔记字数 */
  notesWordCount: number
  /** 记录日期 */
  date: string
  /** 记录时间戳 */
  timestamp: string
}

/** 速度统计 */
export interface SpeedStats {
  /** 平均阅读速度（字/分钟） */
  averageWPM: number
  /** 最高阅读速度 */
  maxWPM: number
  /** 最低阅读速度 */
  minWPM: number
  /** 速度中位数 */
  medianWPM: number
  /** 平均理解率 */
  averageComprehension: number
  /** 总阅读字数 */
  totalWordsRead: number
  /** 总阅读时间（分钟） */
  totalReadingTime: number
  /** 速度方差 */
  speedVariance: number
  /** 最近阅读速度 */
  recentWPM: number
  /** 速度变化趋势 */
  trend: 'improving' | 'stable' | 'declining'
}

/** 速度趋势点 */
export interface SpeedTrendPoint {
  /** 日期 */
  date: string
  /** 该日平均速度 */
  averageWPM: number
  /** 该日平均理解率 */
  averageComprehension: number
  /** 该日阅读时长 */
  totalDuration: number
}

/** 速度趋势 */
export interface SpeedTrend {
  /** 趋势数据点 */
  points: SpeedTrendPoint[]
  /** 整体变化率 */
  changeRate: number
  /** 趋势方向 */
  direction: 'up' | 'down' | 'flat'
  /** 最佳速度日 */
  bestDay: { date: string; wpm: number }
  /** 最佳理解率日 */
  bestComprehensionDay: { date: string; rate: number }
}

/** 阅读速度目标 */
export interface SpeedGoal {
  /** 目标速度（字/分钟） */
  targetWPM: number
  /** 目标理解率 */
  targetComprehension: number
  /** 截止日期 */
  deadline: string
  /** 创建时间 */
  createdAt: string
  /** 当前进度描述 */
  progress: string
  /** 是否完成 */
  completed: boolean
}

/** 速度建议 */
export interface SpeedRecommendation {
  /** 建议标题 */
  title: string
  /** 建议描述 */
  description: string
  /** 建议类型 */
  type: 'technique' | 'habit' | 'material' | 'environment' | 'goal'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 预估效果 */
  estimatedImpact: string
}

// ============================================================
// 存储键
// ============================================================

const SPEED_RECORDS_KEY = 'hf:reading:speed_records'
const SPEED_GOAL_KEY = 'hf:reading:speed_goal'

// ============================================================
// 默认值
// ============================================================

/** 估计每页字数（中文书籍约 500-800 字/页） */
const DEFAULT_WORDS_PER_PAGE = 600

function createDefaultSpeedGoal(): SpeedGoal {
  const now = new Date()
  const deadline = new Date(now.getFullYear(), now.getMonth() + 3, 1)
  return {
    targetWPM: 500,
    targetComprehension: 0.75,
    deadline: deadline.toISOString(),
    createdAt: now.toISOString(),
    progress: '刚开始',
    completed: false,
  }
}

function createDefaultSpeedStats(): SpeedStats {
  return {
    averageWPM: 0,
    maxWPM: 0,
    minWPM: 0,
    medianWPM: 0,
    averageComprehension: 0,
    totalWordsRead: 0,
    totalReadingTime: 0,
    speedVariance: 0,
    recentWPM: 0,
    trend: 'stable',
  }
}

// ============================================================
// 辅助函数
// ============================================================

let counter = 0
function generateId(prefix: string): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function variance(values: number[], mean: number): number {
  if (values.length <= 1) return 0
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
}

// ============================================================
// 阅读速度追踪器
// ============================================================

export function useReadingSpeed() {
  const records = ref<ReadingSpeedRecord[]>(loadRecords())
  const speedGoal = ref<SpeedGoal>(loadGoal())

  // ---- 持久化 ----

  function loadRecords(): ReadingSpeedRecord[] {
    try {
      return storage.getKV<ReadingSpeedRecord[]>(SPEED_RECORDS_KEY, [])
    } catch { return [] }
  }

  function saveRecords() {
    storage.setKV(SPEED_RECORDS_KEY, records.value)
  }

  function loadGoal(): SpeedGoal {
    try {
      const raw = storage.getKV<string>(SPEED_GOAL_KEY, '')
      return raw ? JSON.parse(raw) : createDefaultSpeedGoal()
    } catch { return createDefaultSpeedGoal() }
  }

  function saveGoal() {
    storage.setKV(SPEED_GOAL_KEY, JSON.stringify(speedGoal.value))
  }

  // ---- 记录阅读速度 ----

  /**
   * 记录一次阅读速度
   * @param bookId 书籍ID
   * @param sessionId 会话ID
   * @param pagesRead 阅读页数
   * @param duration 阅读时长（分钟）
   * @param options 额外选项
   */
  function recordSpeed(
    bookId: string,
    sessionId: string,
    pagesRead: number,
    duration: number,
    options?: {
      wordsPerPage?: number
      comprehensionRate?: number
      difficulty?: number
      notesWordCount?: number
    },
  ): ReadingSpeedRecord {
    const wordsPerPage = options?.wordsPerPage ?? DEFAULT_WORDS_PER_PAGE
    const totalWords = pagesRead * wordsPerPage
    const wordsPerMinute = duration > 0 ? Math.round(totalWords / duration) : 0

    const record: ReadingSpeedRecord = {
      id: generateId('speed'),
      bookId,
      sessionId,
      wordsPerMinute,
      pagesRead,
      duration,
      comprehensionRate: options?.comprehensionRate ?? 0,
      difficulty: Math.min(5, Math.max(1, options?.difficulty ?? 3)),
      notesWordCount: options?.notesWordCount ?? 0,
      date: todayStr(),
      timestamp: new Date().toISOString(),
    }

    records.value.push(record)
    saveRecords()
    return record
  }

  /**
   * 从阅读会话自动记录速度
   * 根据书籍总页数和阅读会话数据估算速度
   */
  function recordSpeedFromSession(
    book: Book,
    session: ReadingSession,
    options?: {
      comprehensionRate?: number
      difficulty?: number
    },
  ): ReadingSpeedRecord | undefined {
    const pagesRead = session.endPage - session.startPage
    if (pagesRead <= 0 || session.duration <= 0) return undefined

    // 估算每页字数：中文书约 500-800 字/页，英文书约 250-400 字/页
    const estimatedWordsPerPage = DEFAULT_WORDS_PER_PAGE

    return recordSpeed(book.id, session.id, pagesRead, session.duration, {
      wordsPerPage: estimatedWordsPerPage,
      comprehensionRate: options?.comprehensionRate,
      difficulty: options?.difficulty,
    })
  }

  // ---- 计算速度统计 ----

  /**
   * 计算综合速度统计
   */
  function computeSpeedStats(bookId?: string): SpeedStats {
    const filtered = bookId
      ? records.value.filter(r => r.bookId === bookId)
      : records.value

    if (filtered.length === 0) return createDefaultSpeedStats()

    const wpms = filtered.map(r => r.wordsPerMinute).filter(w => w > 0)
    const comprehensions = filtered.map(r => r.comprehensionRate).filter(c => c > 0)
    const totalWords = filtered.reduce((sum, r) => sum + r.wordsPerMinute * r.duration, 0)
    const totalTime = filtered.reduce((sum, r) => sum + r.duration, 0)

    const avgWPM = wpms.length > 0
      ? Math.round(wpms.reduce((s, w) => s + w, 0) / wpms.length)
      : 0

    const avgComp = comprehensions.length > 0
      ? Math.round(comprehensions.reduce((s, c) => s + c, 0) / comprehensions.length * 100) / 100
      : 0

    // 最近 5 次的速度
    const recent = filtered.slice(-5)
    const recentWPM = recent.length > 0
      ? Math.round(recent.reduce((s, r) => s + r.wordsPerMinute, 0) / recent.length)
      : 0

    // 趋势判断：比较最近 5 次与之前 5 次
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (filtered.length >= 6) {
      const older = filtered.slice(-10, -5)
      const olderAvg = older.length > 0
        ? Math.round(older.reduce((s, r) => s + r.wordsPerMinute, 0) / older.length)
        : 0
      if (recentWPM > olderAvg * 1.05) trend = 'improving'
      else if (recentWPM < olderAvg * 0.95) trend = 'declining'
    }

    return {
      averageWPM: avgWPM,
      maxWPM: wpms.length > 0 ? Math.max(...wpms) : 0,
      minWPM: wpms.length > 0 ? Math.min(...wpms) : 0,
      medianWPM: Math.round(median(wpms)),
      averageComprehension: avgComp,
      totalWordsRead: totalWords,
      totalReadingTime: totalTime,
      speedVariance: Math.round(variance(wpms, avgWPM) * 100) / 100,
      recentWPM,
      trend,
    }
  }

  // ---- 速度趋势分析 ----

  /**
   * 分析阅读速度趋势
   * @param days 分析天数范围（默认 30 天）
   */
  function analyzeSpeedTrend(days: number = 30): SpeedTrend {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString()

    const recent = records.value.filter(r => r.timestamp >= cutoffStr)
    if (recent.length === 0) {
      return {
        points: [],
        changeRate: 0,
        direction: 'flat',
        bestDay: { date: '', wpm: 0 },
        bestComprehensionDay: { date: '', rate: 0 },
      }
    }

    // 按日期分组
    const dayMap = new Map<string, { wpms: number[]; comps: number[]; duration: number }>()
    for (const r of recent) {
      const entry = dayMap.get(r.date) || { wpms: [], comps: [], duration: 0 }
      entry.wpms.push(r.wordsPerMinute)
      if (r.comprehensionRate > 0) entry.comps.push(r.comprehensionRate)
      entry.duration += r.duration
      dayMap.set(r.date, entry)
    }

    const points: SpeedTrendPoint[] = [...dayMap.entries()]
      .map(([date, data]) => ({
        date,
        averageWPM: data.wpms.length > 0
          ? Math.round(data.wpms.reduce((s, w) => s + w, 0) / data.wpms.length)
          : 0,
        averageComprehension: data.comps.length > 0
          ? Math.round(data.comps.reduce((s, c) => s + c, 0) / data.comps.length * 100) / 100
          : 0,
        totalDuration: data.duration,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 计算变化率
    let changeRate = 0
    let direction: 'up' | 'down' | 'flat' = 'flat'
    if (points.length >= 2) {
      const first = points[0].averageWPM
      const last = points[points.length - 1].averageWPM
      if (first > 0) {
        changeRate = Math.round(((last - first) / first) * 100)
        if (changeRate > 5) direction = 'up'
        else if (changeRate < -5) direction = 'down'
      }
    }

    const bestDay = points.reduce(
      (best, p) => (p.averageWPM > best.wpm ? { date: p.date, wpm: p.averageWPM } : best),
      { date: '', wpm: 0 },
    )

    const bestCompDay = points.reduce(
      (best, p) => (p.averageComprehension > best.rate ? { date: p.date, rate: p.averageComprehension } : best),
      { date: '', rate: 0 },
    )

    return { points, changeRate, direction, bestDay, bestComprehensionDay: bestCompDay }
  }

  // ---- 速度目标 ----

  /**
   * 设置阅读速度目标
   */
  function setSpeedGoal(
    targetWPM: number,
    targetComprehension: number,
    deadline: string,
  ): SpeedGoal {
    const stats = computeSpeedStats()
    const progress = stats.averageWPM >= targetWPM && stats.averageComprehension >= targetComprehension
      ? '已达成'
      : stats.averageWPM >= targetWPM * 0.8
        ? '接近目标'
        : '仍需努力'

    const goal: SpeedGoal = {
      targetWPM,
      targetComprehension: Math.min(1, Math.max(0, targetComprehension)),
      deadline,
      createdAt: new Date().toISOString(),
      progress,
      completed: progress === '已达成',
    }

    speedGoal.value = goal
    saveGoal()
    return goal
  }

  /** 获取速度目标进度百分比 */
  const goalProgress = computed(() => {
    const stats = computeSpeedStats()
    const speedProgress = speedGoal.value.targetWPM > 0
      ? Math.min(1, stats.averageWPM / speedGoal.value.targetWPM)
      : 0
    const compProgress = speedGoal.value.targetComprehension > 0
      ? Math.min(1, stats.averageComprehension / speedGoal.value.targetComprehension)
      : 0
    return {
      speedPercent: Math.round(speedProgress * 100),
      comprehensionPercent: Math.round(compProgress * 100),
      overallPercent: Math.round(((speedProgress + compProgress) / 2) * 100),
    }
  })

  // ---- 速度建议 ----

  /**
   * 获取个性化阅读速度提升建议
   */
  function getSpeedRecommendations(): SpeedRecommendation[] {
    const stats = computeSpeedStats()
    const trend = analyzeSpeedTrend(30)
    const recommendations: SpeedRecommendation[] = []

    // 速度偏低
    if (stats.averageWPM < 200 && stats.averageWPM > 0) {
      recommendations.push({
        title: '尝试指读法',
        description: '用手指或笔尖引导视线，可有效减少回读，提升基础阅读速度',
        type: 'technique',
        priority: 'high',
        estimatedImpact: '预计提升 15-30%',
      })
      recommendations.push({
        title: '减少默读',
        description: '尽量避免在心里逐字默读，尝试用视觉直接理解词组和句子',
        type: 'technique',
        priority: 'high',
        estimatedImpact: '预计提升 20-40%',
      })
    }

    // 理解率偏低
    if (stats.averageComprehension < 0.6 && stats.averageComprehension > 0) {
      recommendations.push({
        title: '阅读后做摘要',
        description: '每读完一个章节，用 2-3 句话总结主要内容，提升理解深度',
        type: 'habit',
        priority: 'high',
        estimatedImpact: '预计提升理解率 10-20%',
      })
      recommendations.push({
        title: '降低阅读材料难度',
        description: '当前材料的难度可能超出你的舒适区，建议先阅读稍简单的材料建立信心',
        type: 'material',
        priority: 'medium',
        estimatedImpact: '预计提升理解率 15-25%',
      })
    }

    // 速度下降趋势
    if (trend.direction === 'down') {
      recommendations.push({
        title: '检查阅读环境',
        description: '阅读速度下降可能与环境干扰有关，尝试在安静的环境中阅读',
        type: 'environment',
        priority: 'medium',
        estimatedImpact: '预计恢复速度 10-15%',
      })
      recommendations.push({
        title: '设定每日小目标',
        description: '每天设定一个阅读速度小目标（如比昨天快 5 字/分钟），微量进步积累',
        type: 'goal',
        priority: 'medium',
        estimatedImpact: '预计每月提升 5-10%',
      })
    }

    // 速度稳定但未达目标
    if (trend.direction === 'flat' && stats.averageWPM > 0 && stats.averageWPM < 400) {
      recommendations.push({
        title: '拓展视野宽度',
        description: '尝试一次看 2-3 个词组而非逐字阅读，扩大视幅可显著提升速度',
        type: 'technique',
        priority: 'medium',
        estimatedImpact: '预计提升 20-30%',
      })
      recommendations.push({
        title: '定时阅读练习',
        description: '每天进行 10 分钟限时阅读训练，记录速度并尝试微量突破',
        type: 'habit',
        priority: 'medium',
        estimatedImpact: '预计每周提升 3-5%',
      })
    }

    // 速度高但理解率低
    if (stats.averageWPM > 400 && stats.averageComprehension < 0.7 && stats.averageComprehension > 0) {
      recommendations.push({
        title: '平衡速度与理解',
        description: '速度很快但理解率偏低，建议适当放慢节奏，每章做简单思维导图',
        type: 'habit',
        priority: 'high',
        estimatedImpact: '预计提升理解率 15-25%',
      })
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push({
        title: '保持当前节奏',
        description: '你的阅读速度和理解率表现良好，继续保持当前习惯即可',
        type: 'habit',
        priority: 'low',
        estimatedImpact: '维持现有水平',
      })
      recommendations.push({
        title: '尝试更难的阅读材料',
        description: '可以在当前基础上尝试阅读更具挑战性的书籍，拓宽知识边界',
        type: 'material',
        priority: 'low',
        estimatedImpact: '提升综合阅读能力',
      })
    }

    return recommendations
  }

  // ---- 删除记录 ----

  /** 删除速度记录 */
  function deleteRecord(recordId: string): boolean {
    const idx = records.value.findIndex(r => r.id === recordId)
    if (idx < 0) return false
    records.value.splice(idx, 1)
    saveRecords()
    return true
  }

  /** 清除所有速度记录 */
  function clearAllRecords(): void {
    records.value = []
    saveRecords()
  }

  return {
    // 状态
    records: computed(() => records.value),
    speedGoal: computed(() => speedGoal.value),

    // 计算属性
    goalProgress,

    // 记录
    recordSpeed,
    recordSpeedFromSession,

    // 统计
    computeSpeedStats,

    // 趋势
    analyzeSpeedTrend,

    // 目标
    setSpeedGoal,

    // 建议
    getSpeedRecommendations,

    // 管理
    deleteRecord,
    clearAllRecords,
  }
}