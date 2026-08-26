// ============================================================
// 更漏 · 工作习惯分析引擎（P19-1）
// 时段生产力分析、习惯关联、焦点时段识别、工作模式发现
// ============================================================

import type { LogEntry, MoodTone } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 时段类型 */
export type TimeSlot = 'morning' | 'forenoon' | 'afternoon' | 'evening' | 'night'

/** 时段生产力 */
export interface TimeSlotProductivity {
  slot: TimeSlot
  label: string
  /** 该时段日志数 */
  entryCount: number
  /** 该时段总专注时长（分钟） */
  totalFocusMinutes: number
  /** 平均专注时长 */
  avgFocusMinutes: number
  /** 主导情绪 */
  dominantMood: MoodTone | null
  /** 情绪分布 */
  moodDistribution: Record<string, number>
  /** 生产力评分 0-100 */
  productivityScore: number
  /** 是否为峰值时段 */
  isPeak: boolean
}

/** 工作习惯画像 */
export interface WorkHabitProfile {
  /** 时段生产力分布 */
  timeSlotProductivity: TimeSlotProductivity[]
  /** 峰值时段 */
  peakSlots: TimeSlot[]
  /** 低谷时段 */
  lowSlots: TimeSlot[]
  /** 最佳工作日 */
  bestDayOfWeek: string
  /** 最差工作日 */
  worstDayOfWeek: string
  /** 日均日志数 */
  avgDailyEntries: number
  /** 日均专注时长 */
  avgDailyFocus: number
  /** 标签偏好 */
  topTags: { tag: string; count: number }[]
  /** 日志类型偏好 */
  typeDistribution: { type: string; count: number; label: string }[]
  /** 连续工作习惯 */
  streakPattern: StreakPattern
  /** 工作节奏 */
  rhythm: WorkRhythm
  /** 习惯洞察 */
  insights: HabitInsight[]
}

/** 连续工作模式 */
export interface StreakPattern {
  /** 当前连续天数 */
  currentStreak: number
  /** 最长连续天数 */
  longestStreak: number
  /** 平均连续天数 */
  avgStreak: number
  /** 中断次数 */
  breakCount: number
  /** 连续天数分布 */
  streakDistribution: { length: number; count: number }[]
}

/** 工作节奏 */
export interface WorkRhythm {
  /** 节奏类型 */
  type: 'sprinter' | 'marathoner' | 'steady' | 'irregular'
  /** 节奏描述 */
  description: string
  /** 平均工作块时长（分钟） */
  avgBlockDuration: number
  /** 工作块间平均间隔（分钟） */
  avgBlockGap: number
  /** 日工作块数 */
  avgBlocksPerDay: number
}

/** 习惯洞察 */
export interface HabitInsight {
  type: 'strength' | 'weakness' | 'pattern' | 'suggestion'
  title: string
  description: string
  confidence: number
  relatedData: Record<string, number | string>
}

/** 焦点时段 */
export interface FocusBlock {
  startHour: number
  endHour: number
  dayOfWeek: number
  avgFocusMinutes: number
  frequency: number
  reliability: number
}

// ============================================================
// 时段元数据
// ============================================================

const TIME_SLOT_META: Record<TimeSlot, { label: string; hours: [number, number] }> = {
  morning: { label: '清晨 (6-9)', hours: [6, 9] },
  forenoon: { label: '上午 (9-12)', hours: [9, 12] },
  afternoon: { label: '下午 (12-18)', hours: [12, 18] },
  evening: { label: '傍晚 (18-21)', hours: [18, 21] },
  night: { label: '深夜 (21-6)', hours: [21, 24] },
}

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const RHYTHM_DESCRIPTIONS: Record<WorkRhythm['type'], string> = {
  sprinter: '你倾向于高强度短时爆发，集中精力快速完成任务后休息',
  marathoner: '你倾向于持续稳定输出，长时间保持中等强度的工作节奏',
  steady: '你保持着规律稳定的工作节奏，每天按部就班持续前进',
  irregular: '你的工作节奏较为不规律，建议尝试建立更稳定的工作习惯',
}

// ============================================================
// useWorklogHabits
// ============================================================

export function useWorklogHabits() {
  // ---- 时段生产力分析 ----

  /** 分析时段生产力 */
  function analyzeTimeSlots(entries: LogEntry[]): TimeSlotProductivity[] {
    const slotData = new Map<TimeSlot, {
      count: number
      focusMinutes: number
      moods: MoodTone[]
    }>()

    for (const slot of Object.keys(TIME_SLOT_META) as TimeSlot[]) {
      slotData.set(slot, { count: 0, focusMinutes: 0, moods: [] })
    }

    for (const entry of entries) {
      const date = new Date(entry.createdAt)
      const hour = date.getHours()
      const slot = getTimeSlot(hour)
      const data = slotData.get(slot)!

      data.count++
      data.focusMinutes += entry.sessionIds.length > 0 ? 25 * entry.sessionIds.length : 0
      if (entry.mood) data.moods.push(entry.mood)
    }

    const results: TimeSlotProductivity[] = []
    let maxScore = 0

    // 先计算分数
    const tempResults: { slot: TimeSlot; score: number }[] = []
    for (const [slot, data] of slotData) {
      const score = data.count > 0
        ? Math.min(100, Math.round(
            (data.count * 10) + (data.focusMinutes * 0.5) + (getMoodBonus(data.moods)),
          ))
        : 0
      tempResults.push({ slot, score })
      if (score > maxScore) maxScore = score
    }

    for (const { slot, score } of tempResults) {
      const data = slotData.get(slot)!
      const meta = TIME_SLOT_META[slot]
      const moodDist: Record<string, number> = {}
      for (const m of data.moods) {
        moodDist[m] = (moodDist[m] || 0) + 1
      }

      const dominantMood = Object.entries(moodDist)
        .sort((a, b) => b[1] - a[1])[0]?.[0] as MoodTone || null

      results.push({
        slot,
        label: meta.label,
        entryCount: data.count,
        totalFocusMinutes: data.focusMinutes,
        avgFocusMinutes: data.count > 0 ? Math.round(data.focusMinutes / data.count) : 0,
        dominantMood,
        moodDistribution: moodDist,
        productivityScore: score,
        isPeak: score >= maxScore * 0.8,
      })
    }

    return results.sort((a, b) => b.productivityScore - a.productivityScore)
  }

  // ---- 工作习惯画像 ----

  /** 构建完整工作习惯画像 */
  function buildProfile(entries: LogEntry[]): WorkHabitProfile {
    if (entries.length === 0) {
      return createEmptyProfile()
    }

    const timeSlots = analyzeTimeSlots(entries)
    const peakSlots = timeSlots.filter(s => s.isPeak).map(s => s.slot)
    const lowSlots = timeSlots.filter(s => !s.isPeak && s.productivityScore < 20).map(s => s.slot)

    // 工作日分析
    const dayStats = analyzeDayOfWeek(entries)
    const bestDay = dayStats.length > 0
      ? dayStats.reduce((a, b) => a.count > b.count ? a : b)
      : { day: '', count: 0 }
    const worstDay = dayStats.length > 0
      ? dayStats.reduce((a, b) => a.count < b.count ? a : b)
      : { day: '', count: 0 }

    // 日均
    const dates = new Set(entries.map(e => new Date(e.createdAt).toISOString().split('T')[0]))
    const totalDays = dates.size || 1
    const avgDailyEntries = Math.round(entries.length / totalDays * 10) / 10
    const avgDailyFocus = Math.round(
      entries.reduce((s, e) => s + (e.sessionIds.length * 25), 0) / totalDays,
    )

    // 标签
    const tagCounts = new Map<string, number>()
    for (const e of entries) {
      for (const t of e.tags) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
      }
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    // 类型分布
    const typeCounts = new Map<string, number>()
    for (const e of entries) {
      typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1)
    }
    const typeDistribution = [...typeCounts.entries()]
      .map(([type, count]) => ({
        type,
        count,
        label: type === 'reflection' ? '反思' : type === 'plan' ? '计划' : type === 'journal' ? '日志' : type === 'insight' ? '洞察' : type === 'review' ? '复盘' : '里程碑',
      }))
      .sort((a, b) => b.count - a.count)

    // 连续模式
    const streakPattern = analyzeStreakPattern(entries)

    // 工作节奏
    const rhythm = analyzeRhythm(entries)

    // 洞察
    const insights = generateInsights(timeSlots, streakPattern, rhythm, entries)

    return {
      timeSlotProductivity: timeSlots,
      peakSlots,
      lowSlots,
      bestDayOfWeek: bestDay.day,
      worstDayOfWeek: worstDay.day,
      avgDailyEntries,
      avgDailyFocus,
      topTags,
      typeDistribution,
      streakPattern,
      rhythm,
      insights,
    }
  }

  // ---- 焦点时段发现 ----

  /** 发现自动焦点时段 */
  function discoverFocusBlocks(entries: LogEntry[]): FocusBlock[] {
    const blocks: Map<string, { hours: number[]; days: number[]; count: number }> = new Map()

    for (const entry of entries) {
      const date = new Date(entry.createdAt)
      const hour = date.getHours()
      const day = date.getDay()

      const key = `${day}-${hour}`
      if (!blocks.has(key)) {
        blocks.set(key, { hours: [], days: [], count: 0 })
      }
      const block = blocks.get(key)!
      block.hours.push(hour)
      block.days.push(day)
      block.count++
    }

    const focusBlocks: FocusBlock[] = []
    for (const [, data] of blocks) {
      if (data.count < 3) continue

      const avgHour = data.hours.reduce((s, h) => s + h, 0) / data.hours.length
      const startHour = Math.floor(avgHour)
      const endHour = startHour + 1
      const avgDay = data.days[0]

      const reliability = Math.min(1, data.count / (data.days.length * 2))

      focusBlocks.push({
        startHour,
        endHour,
        dayOfWeek: avgDay,
        avgFocusMinutes: data.count * 25,
        frequency: data.count,
        reliability: Math.round(reliability * 100) / 100,
      })
    }

    return focusBlocks.sort((a, b) => b.frequency - a.frequency).slice(0, 10)
  }

  // ---- 工作日分析 ----

  /** 工作日分析 */
  function analyzeDayOfWeek(entries: LogEntry[]): { day: string; count: number; avgFocus: number }[] {
    const dayData = new Map<number, { count: number; focusMinutes: number }>()

    for (let i = 0; i < 7; i++) {
      dayData.set(i, { count: 0, focusMinutes: 0 })
    }

    for (const entry of entries) {
      const day = new Date(entry.createdAt).getDay()
      const data = dayData.get(day)!
      data.count++
      data.focusMinutes += entry.sessionIds.length * 25
    }

    return [...dayData.entries()]
      .map(([day, data]) => ({
        day: DAY_LABELS[day],
        count: data.count,
        avgFocus: data.count > 0 ? Math.round(data.focusMinutes / data.count) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }

  return {
    analyzeTimeSlots,
    buildProfile,
    discoverFocusBlocks,
    analyzeDayOfWeek,
  }
}

// ============================================================
// 内部工具函数
// ============================================================

function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 6 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 12) return 'forenoon'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 21) return 'evening'
  return 'night'
}

function getMoodBonus(moods: MoodTone[]): number {
  if (moods.length === 0) return 0
  const moodScores: Record<MoodTone, number> = {
    energetic: 20, excited: 18, calm: 12, neutral: 0, tired: -10, frustrated: -15,
  }
  return moods.reduce((s, m) => s + (moodScores[m] || 0), 0) / moods.length
}

function analyzeStreakPattern(entries: LogEntry[]): StreakPattern {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, avgStreak: 0, breakCount: 0, streakDistribution: [] }
  }

  const dates = [...new Set(
    entries.map(e => new Date(e.createdAt).toISOString().split('T')[0]),
  )].sort()

  const streaks: number[] = []
  let currentStreak = 1
  let longestStreak = 1
  let breakCount = 0

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)

    if (diffDays === 1) {
      currentStreak++
    } else {
      streaks.push(currentStreak)
      if (currentStreak > longestStreak) longestStreak = currentStreak
      currentStreak = 1
      breakCount++
    }
  }
  streaks.push(currentStreak)
  if (currentStreak > longestStreak) longestStreak = currentStreak

  const avgStreak = streaks.length > 0
    ? Math.round(streaks.reduce((s, v) => s + v, 0) / streaks.length)
    : 0

  // 连续天数分布
  const streakDist: Map<number, number> = new Map()
  for (const s of streaks) {
    const bucket = Math.floor(s / 5) * 5
    streakDist.set(bucket, (streakDist.get(bucket) || 0) + 1)
  }

  return {
    currentStreak,
    longestStreak,
    avgStreak,
    breakCount,
    streakDistribution: [...streakDist.entries()]
      .map(([length, count]) => ({ length, count }))
      .sort((a, b) => a.length - b.length),
  }
}

function analyzeRhythm(entries: LogEntry[]): WorkRhythm {
  if (entries.length < 2) {
    return {
      type: 'irregular',
      description: RHYTHM_DESCRIPTIONS.irregular,
      avgBlockDuration: 0,
      avgBlockGap: 0,
      avgBlocksPerDay: 0,
    }
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const blocks: { start: Date; end: Date; count: number }[] = []
  let currentBlock = { start: new Date(sorted[0].createdAt), end: new Date(sorted[0].createdAt), count: 1 }

  for (let i = 1; i < sorted.length; i++) {
    const curr = new Date(sorted[i].createdAt)
    const gap = (curr.getTime() - new Date(sorted[i - 1].createdAt).getTime()) / 60000

    if (gap <= 60) {
      currentBlock.end = curr
      currentBlock.count++
    } else {
      blocks.push(currentBlock)
      currentBlock = { start: curr, end: curr, count: 1 }
    }
  }
  blocks.push(currentBlock)

  const durations = blocks.map(b => (b.end.getTime() - b.start.getTime()) / 60000)
  const avgBlockDuration = durations.length > 0
    ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
    : 0

  const dateSet = new Set(sorted.map(e => new Date(e.createdAt).toISOString().split('T')[0]))
  const avgBlocksPerDay = dateSet.size > 0
    ? Math.round(blocks.length / dateSet.size * 10) / 10
    : 0

  // 节奏类型判断
  let type: WorkRhythm['type'] = 'irregular'
  if (avgBlockDuration > 120 && avgBlocksPerDay < 2) {
    type = 'marathoner'
  } else if (avgBlockDuration < 60 && avgBlocksPerDay >= 3) {
    type = 'sprinter'
  } else if (avgBlockDuration >= 60 && avgBlockDuration <= 120 && avgBlocksPerDay >= 2) {
    type = 'steady'
  }

  return {
    type,
    description: RHYTHM_DESCRIPTIONS[type],
    avgBlockDuration,
    avgBlockGap: 0,
    avgBlocksPerDay,
  }
}

function generateInsights(
  timeSlots: TimeSlotProductivity[],
  streak: StreakPattern,
  rhythm: WorkRhythm,
  _entries: LogEntry[],
): HabitInsight[] {
  const insights: HabitInsight[] = []

  // 峰值时段洞察
  const peakSlots = timeSlots.filter(s => s.isPeak)
  if (peakSlots.length > 0) {
    insights.push({
      type: 'strength',
      title: '峰值时段',
      description: `你的最佳工作时段是 ${peakSlots.map(s => s.label).join('、')}，建议将重要任务安排在这些时段`,
      confidence: 0.85,
      relatedData: { peakSlotCount: peakSlots.length },
    })
  }

  // 连续天数洞察
  if (streak.currentStreak >= 7) {
    insights.push({
      type: 'strength',
      title: '连续记录',
      description: `你已连续 ${streak.currentStreak} 天保持工作日志记录，这是非常棒的习惯！`,
      confidence: 0.9,
      relatedData: { currentStreak: streak.currentStreak },
    })
  } else if (streak.currentStreak < 3 && streak.longestStreak >= 7) {
    insights.push({
      type: 'suggestion',
      title: '恢复记录',
      description: `你曾创造过 ${streak.longestStreak} 天连续记录，尝试重新找回这个节奏`,
      confidence: 0.7,
      relatedData: { longestStreak: streak.longestStreak },
    })
  }

  // 节奏洞察
  insights.push({
    type: 'pattern',
    title: `工作节奏：${rhythm.type === 'sprinter' ? '短跑型' : rhythm.type === 'marathoner' ? '长跑型' : rhythm.type === 'steady' ? '稳健型' : '不规则型'}`,
    description: rhythm.description,
    confidence: 0.75,
    relatedData: { avgBlockDuration: rhythm.avgBlockDuration },
  })

  // 情绪关联
  const moodProductivity = timeSlots.filter(s => s.dominantMood === 'energetic' || s.dominantMood === 'excited')
  if (moodProductivity.length > 0) {
    insights.push({
      type: 'pattern',
      title: '情绪与生产力',
      description: '正面情绪（精力充沛/兴奋）与高生产力时段高度相关，保持积极心态有助于提升效率',
      confidence: 0.8,
      relatedData: { moodLinkedSlots: moodProductivity.length },
    })
  }

  // 低谷建议
  const lowSlots = timeSlots.filter(s => !s.isPeak && s.productivityScore < 20)
  if (lowSlots.length > 0) {
    insights.push({
      type: 'suggestion',
      title: '低谷时段利用',
      description: `${lowSlots.map(s => s.label).join('、')} 是你的低效时段，建议安排轻松任务或休息`,
      confidence: 0.7,
      relatedData: { lowSlotCount: lowSlots.length },
    })
  }

  return insights
}

function createEmptyProfile(): WorkHabitProfile {
  return {
    timeSlotProductivity: [],
    peakSlots: [],
    lowSlots: [],
    bestDayOfWeek: '',
    worstDayOfWeek: '',
    avgDailyEntries: 0,
    avgDailyFocus: 0,
    topTags: [],
    typeDistribution: [],
    streakPattern: { currentStreak: 0, longestStreak: 0, avgStreak: 0, breakCount: 0, streakDistribution: [] },
    rhythm: { type: 'irregular', description: RHYTHM_DESCRIPTIONS.irregular, avgBlockDuration: 0, avgBlockGap: 0, avgBlocksPerDay: 0 },
    insights: [],
  }
}