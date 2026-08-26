// ============================================================
// 释光阁 · 冥想分析引擎
// 冥想模式分析、连续追踪、环境音推荐、洞察生成
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type {
  MeditationSession,
  MeditationStats,
  MeditationStreak,
  StreakSegment,
  AmbientSound,
  AmbientSoundCategory,
  MeditationInsight,
} from './types'
import {
  AMBIENT_SOUNDS,
  MOOD_SCORE_MAP,
  MEDITATION_STORAGE_KEYS,
} from './types'
import type { MeditationType } from '../light/types'

// ============================================================
// 辅助函数
// ============================================================

/** 根据小时数获取时段标签 */
function getTimeOfDay(hour: number): string {
  if (hour < 5) return 'dawn'
  if (hour < 8) return 'morning'
  if (hour < 11) return 'forenoon'
  if (hour < 13) return 'noon'
  if (hour < 17) return 'afternoon'
  if (hour < 20) return 'evening'
  return 'night'
}

/** 获取情绪分值 */
function getMoodScore(mood: string): number {
  return MOOD_SCORE_MAP[mood] ?? 3
}

/** 获取情绪改善分 */
function getMoodImprovement(moodBefore: string, moodAfter: string): number {
  return getMoodScore(moodAfter) - getMoodScore(moodBefore)
}

/** 计算两个日期相差的天数 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000))
}

/** 获取周标识符 */
function getWeekKey(date: string): string {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  const monday = new Date(d.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000)
  return monday.toISOString().slice(0, 10)
}

/** 获取月标识符 */
function getMonthKey(date: string): string {
  return date.slice(0, 7)
}

// ============================================================
// useMeditationAnalytics
// ============================================================

/**
 * 冥想分析引擎
 * 提供冥想模式分析、连续追踪、环境音推荐、洞察生成
 */
export function useMeditationAnalytics() {
  const sessions = ref<MeditationSession[]>(loadSessions())
  const stats = ref<MeditationStats>(loadStats())
  const streak = ref<MeditationStreak>(loadStreak())
  const insights = ref<MeditationInsight[]>(loadInsights())

  // ---- 持久化 ----

  function loadSessions(): MeditationSession[] {
    try {
      return storage.getKV<MeditationSession[]>(MEDITATION_STORAGE_KEYS.sessions, [])
    } catch { return [] }
  }

  function saveSessions() {
    storage.setKV(MEDITATION_STORAGE_KEYS.sessions, sessions.value)
  }

  function loadStats(): MeditationStats {
    try {
      const raw = storage.getKV<string>(MEDITATION_STORAGE_KEYS.stats, '')
      if (!raw) return createDefaultStats()
      return JSON.parse(raw)
    } catch { return createDefaultStats() }
  }

  function saveStats() {
    storage.setKV(MEDITATION_STORAGE_KEYS.stats, JSON.stringify(stats.value))
  }

  function loadStreak(): MeditationStreak {
    try {
      const raw = storage.getKV<string>(MEDITATION_STORAGE_KEYS.streak, '')
      if (!raw) return createDefaultStreak()
      return JSON.parse(raw)
    } catch { return createDefaultStreak() }
  }

  function saveStreak() {
    storage.setKV(MEDITATION_STORAGE_KEYS.streak, JSON.stringify(streak.value))
  }

  function loadInsights(): MeditationInsight[] {
    try {
      return storage.getKV<MeditationInsight[]>(MEDITATION_STORAGE_KEYS.insights, [])
    } catch { return [] }
  }

  function saveInsights() {
    storage.setKV(MEDITATION_STORAGE_KEYS.insights, insights.value)
  }

  function createDefaultStats(): MeditationStats {
    return {
      totalSessions: 0,
      totalDuration: 0,
      averageDuration: 0,
      longestSession: 0,
      shortestSession: 0,
      sessionFrequency: 0,
      completionRate: 0,
      interruptionRate: 0,
      moodShiftDistribution: {},
      timeOfDayDistribution: {},
      dailyDurationTrend: [],
      weeklyDurationTrend: [],
      monthlyDurationTrend: [],
      preferredTypes: [],
      bestTimeOfDay: '',
      averageMoodImprovement: 0,
      moodImprovementRate: 0,
    }
  }

  function createDefaultStreak(): MeditationStreak {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakHistory: [],
      streakStartDate: null,
      lastMeditationDate: null,
      isStreakActive: false,
      streaksThisYear: 0,
      averageStreakLength: 0,
    }
  }

  // ---- 会话管理 ----

  /** 添加冥想会话 */
  function addSession(session: MeditationSession): void {
    sessions.value.push(session)
    sessions.value.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    saveSessions()

    // 自动更新统计和连续追踪
    analyzeMeditationPatterns()
    computeStreak()
  }

  /** 获取所有会话 */
  function getSessions(): MeditationSession[] {
    return sessions.value
  }

  /** 按日期范围获取会话 */
  function getSessionsByDateRange(startDate: string, endDate: string): MeditationSession[] {
    return sessions.value.filter(s => s.date >= startDate && s.date <= endDate)
  }

  /** 获取最近 N 天的会话 */
  function getRecentSessions(days: number = 30): MeditationSession[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    return sessions.value.filter(s => s.date >= cutoff)
  }

  /** 获取今日会话 */
  function getTodaySessions(): MeditationSession[] {
    const today = new Date().toISOString().slice(0, 10)
    return sessions.value.filter(s => s.date === today)
  }

  // ---- 模式分析 ----

  /**
   * 分析冥想模式
   * 计算所有冥想统计数据：时长、频率、情绪关联、时段分布
   */
  function analyzeMeditationPatterns(): MeditationStats {
    const all = sessions.value
    if (all.length === 0) {
      stats.value = createDefaultStats()
      saveStats()
      return stats.value
    }

    const completed = all.filter(s => s.completed)
    const interrupted = all.filter(s => s.interrupted)

    // 基础统计
    const totalSessions = all.length
    const totalDuration = all.reduce((sum, s) => sum + s.duration, 0)
    const averageDuration = Math.round(totalDuration / totalSessions)
    const longestSession = Math.max(...all.map(s => s.duration))
    const shortestSession = Math.min(...all.map(s => s.duration))

    // 频率：每周平均次数
    const dates = [...new Set(all.map(s => s.date))].sort()
    const totalDays = dates.length >= 2
      ? daysBetween(dates[0], dates[dates.length - 1]) + 1
      : 1
    const sessionFrequency = Math.round((totalSessions / (totalDays / 7)) * 10) / 10

    // 完成率与中断率
    const completionRate = Math.round((completed.length / totalSessions) * 100)
    const interruptionRate = Math.round((interrupted.length / totalSessions) * 100)

    // 情绪转变分布
    const moodShiftDistribution: Record<string, number> = {}
    for (const s of all) {
      if (s.mood && s.moodAfter) {
        const key = `${s.mood} → ${s.moodAfter}`
        moodShiftDistribution[key] = (moodShiftDistribution[key] || 0) + 1
      }
    }

    // 时段分布
    const timeOfDayDistribution: Record<string, number> = {}
    for (const s of all) {
      const hour = new Date(s.timestamp).getHours()
      const tod = getTimeOfDay(hour)
      timeOfDayDistribution[tod] = (timeOfDayDistribution[tod] || 0) + 1
    }

    // 每日时长趋势（最近 30 天）
    const dailyMap: Record<string, number> = {}
    for (const s of all) {
      dailyMap[s.date] = (dailyMap[s.date] || 0) + s.duration
    }
    const now = new Date()
    const dailyDurationTrend: { date: string; duration: number }[] = []
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
      dailyDurationTrend.push({ date, duration: dailyMap[date] || 0 })
    }

    // 每周时长趋势（最近 12 周）
    const weeklyMap: Record<string, number> = {}
    for (const s of all) {
      const wk = getWeekKey(s.date)
      weeklyMap[wk] = (weeklyMap[wk] || 0) + s.duration
    }
    const weeklyDurationTrend = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, duration]) => ({ week, duration }))

    // 每月时长趋势（最近 12 个月）
    const monthlyMap: Record<string, number> = {}
    for (const s of all) {
      const mo = getMonthKey(s.date)
      monthlyMap[mo] = (monthlyMap[mo] || 0) + s.duration
    }
    const monthlyDurationTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, duration]) => ({ month, duration }))

    // 偏好类型分布
    const typeMap = new Map<MeditationType, { count: number; totalDuration: number }>()
    for (const s of all) {
      const entry = typeMap.get(s.type) || { count: 0, totalDuration: 0 }
      entry.count++
      entry.totalDuration += s.duration
      typeMap.set(s.type, entry)
    }
    const preferredTypes = [...typeMap.entries()]
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)

    // 最佳冥想时段
    let bestTimeOfDay = ''
    let maxCount = 0
    for (const [tod, count] of Object.entries(timeOfDayDistribution)) {
      if (count > maxCount) {
        maxCount = count
        bestTimeOfDay = tod
      }
    }

    // 情绪改善
    const moodShifts = all
      .filter(s => s.mood && s.moodAfter)
      .map(s => getMoodImprovement(s.mood, s.moodAfter))
    const averageMoodImprovement = moodShifts.length > 0
      ? Math.round((moodShifts.reduce((sum, v) => sum + v, 0) / moodShifts.length) * 10) / 10
      : 0
    const moodImprovementRate = moodShifts.length > 0
      ? Math.round((moodShifts.filter(v => v > 0).length / moodShifts.length) * 100)
      : 0

    stats.value = {
      totalSessions,
      totalDuration,
      averageDuration,
      longestSession,
      shortestSession,
      sessionFrequency,
      completionRate,
      interruptionRate,
      moodShiftDistribution,
      timeOfDayDistribution,
      dailyDurationTrend,
      weeklyDurationTrend,
      monthlyDurationTrend,
      preferredTypes,
      bestTimeOfDay,
      averageMoodImprovement,
      moodImprovementRate,
    }

    saveStats()
    return stats.value
  }

  // ---- 连续追踪 ----

  /**
   * 计算连续追踪
   * 包含当前连续、最长连续、连续历史、连续段统计
   */
  function computeStreak(): MeditationStreak {
    const all = sessions.value
    if (all.length === 0) {
      streak.value = createDefaultStreak()
      saveStreak()
      return streak.value
    }

    // 获取所有有冥想的日期（去重排序）
    const meditationDates = [...new Set(all.map(s => s.date))].sort()
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    // 计算连续段
    const segments: StreakSegment[] = []
    let segmentStart = meditationDates[0]
    let currentLength = 1

    for (let i = 1; i < meditationDates.length; i++) {
      const diff = daysBetween(meditationDates[i - 1], meditationDates[i])
      if (diff === 1) {
        currentLength++
      } else {
        segments.push({
          startDate: segmentStart,
          endDate: meditationDates[i - 1],
          length: currentLength,
          isActive: false,
        })
        segmentStart = meditationDates[i]
        currentLength = 1
      }
    }

    // 最后一段
    const lastDate = meditationDates[meditationDates.length - 1]
    const isActive = lastDate === today || lastDate === yesterday
    segments.push({
      startDate: segmentStart,
      endDate: lastDate,
      length: currentLength,
      isActive,
    })

    // 当前连续
    const currentSegment = segments[segments.length - 1]
    const currentStreak = currentSegment.isActive ? currentSegment.length : 0
    const streakStartDate = currentStreak > 0 ? currentSegment.startDate : null

    // 最长连续
    const longestStreak = Math.max(...segments.map(s => s.length))

    // 今年完成的连续段数
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
    const streaksThisYear = segments.filter(s => s.startDate >= yearStart).length

    // 平均连续长度
    const averageStreakLength = segments.length > 0
      ? Math.round((segments.reduce((sum, s) => sum + s.length, 0) / segments.length) * 10) / 10
      : 0

    streak.value = {
      currentStreak,
      longestStreak,
      streakHistory: segments,
      streakStartDate,
      lastMeditationDate: lastDate,
      isStreakActive: isActive,
      streaksThisYear,
      averageStreakLength,
    }

    saveStreak()
    return streak.value
  }

  // ---- 环境音推荐 ----

  /**
   * 根据当前情绪和时段推荐环境音
   * 基于情绪标签和时段标签进行匹配评分
   */
  function suggestAmbientSound(
    mood: string,
    time?: string,
    topN: number = 3,
  ): AmbientSound[] {
    const currentHour = new Date().getHours()
    const timeOfDay = time || getTimeOfDay(currentHour)

    // 为每个环境音打分
    const scored = AMBIENT_SOUNDS.map(sound => {
      let score = 0

      // 情绪匹配：当前情绪与 sound 的 moodTags 匹配
      if (sound.moodTags.includes(mood)) {
        score += 10
      }

      // 近似情绪匹配：相近情绪也加分
      const moodScore = getMoodScore(mood)
      for (const tag of sound.moodTags) {
        const tagScore = getMoodScore(tag)
        const diff = Math.abs(moodScore - tagScore)
        if (diff === 1) score += 3
        else if (diff === 2) score += 1
      }

      // 时段匹配
      if (sound.timeTags.includes(timeOfDay)) {
        score += 5
      }

      // 通用时段匹配（覆盖 all 时段的声音）
      if (sound.timeTags.length >= 3) {
        score += 2
      }

      return { sound, score }
    })

    // 按分数降序排列，取前 topN
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(item => item.sound)
  }

  /** 按类别筛选环境音 */
  function getSoundsByCategory(category: AmbientSoundCategory): AmbientSound[] {
    return AMBIENT_SOUNDS.filter(s => s.category === category)
  }

  /** 按场景搜索环境音 */
  function searchSoundsByScenario(scenario: string): AmbientSound[] {
    const lower = scenario.toLowerCase()
    return AMBIENT_SOUNDS.filter(s =>
      s.scenarios.some(sc => sc.toLowerCase().includes(lower)) ||
      s.description.toLowerCase().includes(lower),
    )
  }

  /** 获取所有环境音 */
  function getAllSounds(): AmbientSound[] {
    return [...AMBIENT_SOUNDS]
  }

  // ---- 洞察生成 ----

  /**
   * 生成冥想洞察
   * 基于冥想数据自动生成 pattern、achievement、suggestion、warning、milestone 类洞察
   */
  function generateMeditationInsights(): MeditationInsight[] {
    const newInsights: MeditationInsight[] = []
    const s = stats.value
    const st = streak.value
    const all = sessions.value
    const now = new Date().toISOString()

    if (all.length === 0) {
      return newInsights
    }

    // ---- 里程碑洞察 ----

    // 总冥想次数里程碑
    const sessionMilestones = [
      { threshold: 1, title: '初入禅境', desc: '完成第一次冥想，你迈出了探索内在世界的第一步' },
      { threshold: 10, title: '十次修行', desc: `已完成 ${s.totalSessions} 次冥想，修行之路越走越宽` },
      { threshold: 50, title: '五十次静心', desc: `已完成 ${s.totalSessions} 次冥想，内在的澄明之光愈发闪耀` },
      { threshold: 100, title: '百次禅定', desc: `已完成 ${s.totalSessions} 次冥想，你已经是一位真正的修行者` },
      { threshold: 365, title: '四季修行', desc: `已完成 ${s.totalSessions} 次冥想，一年四季都在与自己的内心对话` },
      { threshold: 1000, title: '千次明心', desc: `已完成 ${s.totalSessions} 次冥想，千次静坐，万般澄明` },
    ]

    for (const milestone of sessionMilestones) {
      if (s.totalSessions === milestone.threshold) {
        newInsights.push({
          id: `milestone_sessions_${milestone.threshold}`,
          title: milestone.title,
          description: milestone.desc,
          type: 'milestone',
          priority: 'high',
          data: { totalSessions: s.totalSessions },
          generatedAt: now,
        })
      }
    }

    // 总时长里程碑
    const durationMilestones = [
      { threshold: 60, label: '一小时' },
      { threshold: 300, label: '五小时' },
      { threshold: 600, label: '十小时' },
      { threshold: 1500, label: '二十五小时' },
      { threshold: 6000, label: '一百小时' },
    ]

    for (const milestone of durationMilestones) {
      if (s.totalDuration >= milestone.threshold && s.totalDuration < milestone.threshold + 60) {
        newInsights.push({
          id: `milestone_duration_${milestone.threshold}`,
          title: `累计冥想${milestone.label}`,
          description: `你已累计冥想 ${s.totalDuration} 分钟，相当于${milestone.label}的静心时光`,
          type: 'milestone',
          priority: 'high',
          data: { totalDuration: s.totalDuration },
          generatedAt: now,
        })
      }
    }

    // 连续天数里程碑
    const streakMilestones = [
      { threshold: 3, title: '三日不间断', desc: '连续冥想 3 天，习惯正在成形' },
      { threshold: 7, title: '一周修行', desc: '连续冥想 7 天，你已经坚持了一周' },
      { threshold: 21, title: '习惯养成', desc: '连续冥想 21 天，研究表明习惯已经基本形成' },
      { threshold: 30, title: '一月静心', desc: '连续冥想 30 天，整整一个月的修行令人敬佩' },
      { threshold: 66, title: '自律之光', desc: '连续冥想 66 天，自律已成为你的内在品质' },
      { threshold: 100, title: '百日筑基', desc: '连续冥想 100 天，百日筑基，道心已固' },
      { threshold: 365, title: '春夏秋冬', desc: '连续冥想 365 天，一整年的修行见证了你的蜕变' },
    ]

    for (const milestone of streakMilestones) {
      if (st.currentStreak === milestone.threshold || st.longestStreak === milestone.threshold) {
        // 避免重复
        if (!newInsights.find(i => i.id === `milestone_streak_${milestone.threshold}`)) {
          newInsights.push({
            id: `milestone_streak_${milestone.threshold}`,
            title: milestone.title,
            description: milestone.desc,
            type: 'milestone',
            priority: 'high',
            data: { streak: st.currentStreak },
            generatedAt: now,
          })
        }
      }
    }

    // ---- 模式洞察 ----

    // 最佳冥想时段
    if (s.bestTimeOfDay && s.totalSessions >= 5) {
      const hourLabels: Record<string, string> = {
        dawn: '凌晨',
        morning: '清晨',
        forenoon: '上午',
        noon: '午后',
        afternoon: '下午',
        evening: '傍晚',
        night: '夜晚',
      }
      newInsights.push({
        id: 'pattern_best_time',
        title: '最佳冥想时段',
        description: `你的冥想集中在${hourLabels[s.bestTimeOfDay] || s.bestTimeOfDay}，这是你最容易进入状态的时段`,
        type: 'pattern',
        priority: 'medium',
        data: { bestTimeOfDay: s.bestTimeOfDay },
        generatedAt: now,
      })
    }

    // 偏好类型
    if (s.preferredTypes.length > 0) {
      const top = s.preferredTypes[0]
      const typeLabels: Record<string, string> = {
        breath: '呼吸冥想',
        body_scan: '身体扫描',
        loving_kindness: '慈心冥想',
        walking: '行走冥想',
        guided: '引导冥想',
        silent: '静坐冥想',
        visualization: '观想冥想',
        mantra: '持咒冥想',
      }
      newInsights.push({
        id: 'pattern_preferred_type',
        title: '冥想偏好',
        description: `你最喜欢的冥想类型是${typeLabels[top.type] || top.type}，共进行了 ${top.count} 次`,
        type: 'pattern',
        priority: 'medium',
        data: { preferredType: top.type, count: top.count },
        generatedAt: now,
      })
    }

    // 情绪改善趋势
    if (s.averageMoodImprovement > 0 && s.totalSessions >= 5) {
      newInsights.push({
        id: 'pattern_mood_improvement',
        title: '情绪改善',
        description: `冥想后情绪平均改善 ${s.averageMoodImprovement} 分，${s.moodImprovementRate}% 的冥想让你感觉更好`,
        type: 'pattern',
        priority: 'medium',
        data: { averageMoodImprovement: s.averageMoodImprovement, moodImprovementRate: s.moodImprovementRate },
        generatedAt: now,
      })
    }

    // 时长趋势
    if (s.averageDuration > 0 && s.totalSessions >= 3) {
      let durationDesc = ''
      if (s.averageDuration <= 5) {
        durationDesc = '你的平均冥想时长较短，适合日常快速放松，也可以尝试适当延长来获得更深的体验'
      } else if (s.averageDuration <= 15) {
        durationDesc = '你的平均冥想时长适中，这个节奏易于坚持又能带来良好的效果'
      } else {
        durationDesc = '你的平均冥想时长较长，说明你已能进入较深的冥想状态'
      }

      newInsights.push({
        id: 'pattern_duration',
        title: '冥想时长',
        description: durationDesc,
        type: 'pattern',
        priority: 'low',
        data: { averageDuration: s.averageDuration },
        generatedAt: now,
      })
    }

    // ---- 建议洞察 ----

    // 建议尝试新类型
    if (s.preferredTypes.length === 1 && s.totalSessions >= 5) {
      const allTypes: MeditationType[] = ['breath', 'body_scan', 'loving_kindness', 'walking', 'guided', 'silent', 'visualization', 'mantra']
      const tried = s.preferredTypes[0].type
      const untried = allTypes.filter(t => t !== tried)
      if (untried.length > 0) {
        const recommended = untried[Math.floor(Math.random() * untried.length)]
        const typeLabels: Record<string, string> = {
          breath: '呼吸冥想',
          body_scan: '身体扫描',
          loving_kindness: '慈心冥想',
          walking: '行走冥想',
          guided: '引导冥想',
          silent: '静坐冥想',
          visualization: '观想冥想',
          mantra: '持咒冥想',
        }
        newInsights.push({
          id: `suggestion_try_type_${recommended}`,
          title: '尝试新类型',
          description: `你主要进行一种冥想类型，建议尝试${typeLabels[recommended]}来丰富修行体验`,
          type: 'suggestion',
          priority: 'medium',
          data: { recommendedType: recommended },
          generatedAt: now,
        })
      }
    }

    // 建议增加频率
    if (s.sessionFrequency < 3 && s.totalSessions >= 5) {
      newInsights.push({
        id: 'suggestion_frequency',
        title: '提升频率',
        description: `你目前每周冥想约 ${s.sessionFrequency} 次，建议逐步增加到每周 3-4 次以获得更稳定的效果`,
        type: 'suggestion',
        priority: 'medium',
        data: { sessionFrequency: s.sessionFrequency },
        generatedAt: now,
      })
    }

    // 建议在不同时段尝试
    if (s.timeOfDayDistribution && Object.keys(s.timeOfDayDistribution).length === 1 && s.totalSessions >= 5) {
      const currentTime = Object.keys(s.timeOfDayDistribution)[0]
      newInsights.push({
        id: 'suggestion_time_variety',
        title: '尝试不同时段',
        description: `你只在${currentTime}冥想，尝试在不同时段冥想可能会带来不同的体验和收获`,
        type: 'suggestion',
        priority: 'low',
        data: { currentTimeOfDay: currentTime },
        generatedAt: now,
      })
    }

    // ---- 警告洞察 ----

    // 中断率警告
    if (s.interruptionRate > 30 && s.totalSessions >= 5) {
      newInsights.push({
        id: 'warning_interruption',
        title: '冥想中断率偏高',
        description: `你的冥想中断率为 ${s.interruptionRate}%，建议选择一个更安静的环境，或从较短的冥想开始`,
        type: 'warning',
        priority: 'high',
        data: { interruptionRate: s.interruptionRate },
        generatedAt: now,
      })
    }

    // 连续中断警告
    if (st.currentStreak === 0 && st.longestStreak > 3 && st.lastMeditationDate) {
      const daysSinceLast = daysBetween(st.lastMeditationDate, new Date().toISOString().slice(0, 10))
      if (daysSinceLast >= 3) {
        newInsights.push({
          id: 'warning_streak_broken',
          title: '连续中断',
          description: `你已经 ${daysSinceLast} 天没有冥想了，之前最长的连续是 ${st.longestStreak} 天。今天找个时间重新开始吧！`,
          type: 'warning',
          priority: 'high',
          data: { daysSinceLast, longestStreak: st.longestStreak },
          generatedAt: now,
        })
      }
    }

    // 情绪倒退警告
    if (s.averageMoodImprovement < 0 && s.totalSessions >= 5) {
      newInsights.push({
        id: 'warning_mood_decline',
        title: '情绪状态变化',
        description: '最近冥想后情绪改善不明显，也许可以尝试不同的冥想类型或调整环境',
        type: 'warning',
        priority: 'medium',
        data: { averageMoodImprovement: s.averageMoodImprovement },
        generatedAt: now,
      })
    }

    // ---- 成就洞察 ----

    // 最长连续成就
    if (st.longestStreak >= 7 && st.currentStreak >= 7) {
      newInsights.push({
        id: 'achievement_streak_active',
        title: '持续修行中',
        description: `你已连续冥想 ${st.currentStreak} 天，继续保持这份专注与平静`,
        type: 'achievement',
        priority: 'medium',
        data: { currentStreak: st.currentStreak },
        generatedAt: now,
      })
    }

    // 完成率成就
    if (s.completionRate >= 90 && s.totalSessions >= 10) {
      newInsights.push({
        id: 'achievement_completion',
        title: '高度专注',
        description: `你的冥想完成率高达 ${s.completionRate}%，展现了出色的专注力`,
        type: 'achievement',
        priority: 'medium',
        data: { completionRate: s.completionRate },
        generatedAt: now,
      })
    }

    // 去重并保存
    const existingIds = new Set(insights.value.map(i => i.id))
    const uniqueNew = newInsights.filter(i => !existingIds.has(i.id))

    if (uniqueNew.length > 0) {
      insights.value = [...uniqueNew, ...insights.value].slice(0, 50)
      saveInsights()
    }

    return uniqueNew
  }

  /** 获取所有洞察 */
  function getInsights(): MeditationInsight[] {
    return insights.value
  }

  /** 按类型筛选洞察 */
  function getInsightsByType(type: MeditationInsight['type']): MeditationInsight[] {
    return insights.value.filter(i => i.type === type)
  }

  /** 清除洞察 */
  function clearInsights(): void {
    insights.value = []
    saveInsights()
  }

  // ---- 情绪相关分析 ----

  /**
   * 获取情绪与冥想类型的关联
   */
  function getMoodTypeCorrelation(): {
    mood: string
    typeDistribution: { type: MeditationType; count: number }[]
  }[] {
    const moodMap = new Map<string, Map<MeditationType, number>>()

    for (const s of sessions.value) {
      if (!s.mood) continue
      if (!moodMap.has(s.mood)) {
        moodMap.set(s.mood, new Map())
      }
      const typeCounts = moodMap.get(s.mood)!
      typeCounts.set(s.type, (typeCounts.get(s.type) || 0) + 1)
    }

    return [...moodMap.entries()].map(([mood, typeCounts]) => ({
      mood,
      typeDistribution: [...typeCounts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    }))
  }

  // ---- 重置 ----

  /** 重置所有数据 */
  function resetAll(): void {
    sessions.value = []
    stats.value = createDefaultStats()
    streak.value = createDefaultStreak()
    insights.value = []
    saveSessions()
    saveStats()
    saveStreak()
    saveInsights()
  }

  return {
    // 响应式数据
    sessions: computed(() => sessions.value),
    stats: computed(() => stats.value),
    streak: computed(() => streak.value),
    insights: computed(() => insights.value),

    // 会话管理
    addSession,
    getSessions,
    getSessionsByDateRange,
    getRecentSessions,
    getTodaySessions,

    // 模式分析
    analyzeMeditationPatterns,

    // 连续追踪
    computeStreak,

    // 环境音推荐
    suggestAmbientSound,
    getSoundsByCategory,
    searchSoundsByScenario,
    getAllSounds,

    // 洞察生成
    generateMeditationInsights,
    getInsights,
    getInsightsByType,
    clearInsights,

    // 情绪关联
    getMoodTypeCorrelation,

    // 重置
    resetAll,
  }
}