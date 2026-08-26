// ============================================================
// 释光阁 · 视图桥接层
// 蓝图定义：
//   冥想分析聚合、连续追踪、环境音推荐、洞察生成、情绪关联
//   服务于 MeditationRoom.vue, MeditationStats.vue,
//   MeditationHistory.vue, MeditationInsight.vue,
//   AmbientSoundPicker.vue
// ============================================================

import { ref, computed } from 'vue'
import { useMeditationAnalytics } from './meditation-analytics'
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
  AMBIENT_CATEGORY_META,
  MOOD_SCORE_MAP,
  TIME_OF_DAY_LABELS,
  MEDITATION_STORAGE_KEYS,
} from './types'
import type { MeditationType } from '../light/types'

// ---- 重新导出上游类型 ----

export type {
  MeditationSession,
  MeditationStats,
  MeditationStreak,
  StreakSegment,
  AmbientSound,
  AmbientSoundCategory,
  MeditationInsight,
}

export {
  AMBIENT_SOUNDS,
  AMBIENT_CATEGORY_META,
  MOOD_SCORE_MAP,
  TIME_OF_DAY_LABELS,
  MEDITATION_STORAGE_KEYS,
}

// ---- 冥想健康度 ----

export interface MeditationHealth {
  /** 综合评分 0-100 */
  score: number
  /** 总会话次数 */
  totalSessions: number
  /** 总冥想时长（分钟） */
  totalDuration: number
  /** 平均时长 */
  averageDuration: number
  /** 当前连续天数 */
  currentStreak: number
  /** 最长连续天数 */
  longestStreak: number
  /** 完成率 */
  completionRate: number
  /** 情绪改善率 */
  moodImprovementRate: number
  /** 平均情绪改善分 */
  averageMoodImprovement: number
  /** 每周频率 */
  weeklyFrequency: number
  /** 健康等级 */
  level: { label: string; color: string }
  /** 改善建议 */
  suggestions: string[]
}

// ---- 连续追踪摘要 ----

export interface StreakSummary {
  currentStreak: number
  longestStreak: number
  isStreakActive: boolean
  streakStartDate: string | null
  lastMeditationDate: string | null
  /** 距离突破最长记录的差距 */
  daysToRecord: number
  /** 连续段历史 */
  streakHistory: StreakSegment[]
  /** 今年连续段数 */
  streaksThisYear: number
  /** 平均连续长度 */
  averageStreakLength: number
}

// ---- 洞察摘要 ----

export interface InsightSummary {
  totalInsights: number
  /** 按类型统计 */
  byType: { type: MeditationInsight['type']; label: string; count: number }[]
  /** 高优先级洞察 */
  highPriority: MeditationInsight[]
  /** 里程碑洞察 */
  milestones: MeditationInsight[]
  /** 最新洞察 */
  latest: MeditationInsight[]
}

// ---- 环境音推荐结果 ----

export interface AmbientSoundRecommendation {
  /** 当前情绪 */
  currentMood: string
  /** 当前时段 */
  currentTimeOfDay: string
  /** 推荐列表 */
  recommended: AmbientSound[]
  /** 按类别分组 */
  byCategory: { category: AmbientSoundCategory; label: string; icon: string; sounds: AmbientSound[] }[]
}

// ---- 情绪-冥想关联 ----

export interface MoodMeditationCorrelation {
  mood: string
  typeDistribution: { type: MeditationType; count: number }[]
  /** 最有效冥想类型 */
  mostEffectiveType: MeditationType | null
  /** 总次数 */
  totalSessions: number
}

// ============================================================
// useCognitionBridge
// ============================================================

export function useCognitionBridge() {
  // ---- 子模块 ----
  const analytics = useMeditationAnalytics()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 冥想健康度 ----

  const meditationHealth = computed<MeditationHealth>(() => {
    const s = analytics.stats.value
    const st = analytics.streak.value

    // 综合评分计算
    const completionScore = s.completionRate * 0.25
    const streakScore = Math.min(st.currentStreak / 30, 1) * 100 * 0.25
    const frequencyScore = Math.min(s.sessionFrequency / 7, 1) * 100 * 0.20
    const moodScore = s.moodImprovementRate * 0.15
    const durationScore = Math.min(s.totalDuration / 600, 1) * 100 * 0.15

    const score = Math.round(completionScore + streakScore + frequencyScore + moodScore + durationScore)

    let level: { label: string; color: string }
    if (score >= 80) level = { label: '卓越', color: '#27ae60' }
    else if (score >= 60) level = { label: '良好', color: '#3498db' }
    else if (score >= 40) level = { label: '发展中', color: '#f39c12' }
    else if (score >= 20) level = { label: '起步', color: '#e67e22' }
    else level = { label: '待开启', color: '#95a5a6' }

    const suggestions: string[] = []
    if (s.totalSessions === 0) {
      suggestions.push('开始你的第一次冥想，探索内在世界')
    } else {
      if (s.completionRate < 70) {
        suggestions.push('冥想完成率偏低，尝试从较短的冥想开始')
      }
      if (st.currentStreak === 0 && st.longestStreak > 0) {
        suggestions.push('连续冥想已中断，今天找个时间重新开始')
      }
      if (s.sessionFrequency < 3) {
        suggestions.push('每周冥想频率较低，建议增加到每周 3-4 次')
      }
      if (s.interruptionRate > 30) {
        suggestions.push('冥想中断率偏高，选择更安静的环境或更短的时长')
      }
      if (s.moodImprovementRate < 50 && s.totalSessions >= 5) {
        suggestions.push('尝试不同的冥想类型，找到最适合你的方式')
      }
      if (s.completionRate >= 80 && st.currentStreak >= 7) {
        suggestions.push('做得很好，继续保持当前的冥想节奏')
      }
    }

    return {
      score,
      totalSessions: s.totalSessions,
      totalDuration: s.totalDuration,
      averageDuration: s.averageDuration,
      currentStreak: st.currentStreak,
      longestStreak: st.longestStreak,
      completionRate: s.completionRate,
      moodImprovementRate: s.moodImprovementRate,
      averageMoodImprovement: s.averageMoodImprovement,
      weeklyFrequency: s.sessionFrequency,
      level,
      suggestions,
    }
  })

  // ---- 连续追踪摘要 ----

  const streakSummary = computed<StreakSummary>(() => {
    const st = analytics.streak.value
    return {
      currentStreak: st.currentStreak,
      longestStreak: st.longestStreak,
      isStreakActive: st.isStreakActive,
      streakStartDate: st.streakStartDate,
      lastMeditationDate: st.lastMeditationDate,
      daysToRecord: Math.max(0, st.longestStreak - st.currentStreak),
      streakHistory: st.streakHistory,
      streaksThisYear: st.streaksThisYear,
      averageStreakLength: st.averageStreakLength,
    }
  })

  // ---- 洞察摘要 ----

  const insightSummary = computed<InsightSummary>(() => {
    const allInsights = analytics.insights.value

    const typeLabels: Record<MeditationInsight['type'], string> = {
      pattern: '模式',
      achievement: '成就',
      suggestion: '建议',
      warning: '警告',
      milestone: '里程碑',
    }

    const typeCounts = new Map<MeditationInsight['type'], number>()
    for (const i of allInsights) {
      typeCounts.set(i.type, (typeCounts.get(i.type) ?? 0) + 1)
    }
    const byType = Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      label: typeLabels[type] ?? type,
      count,
    }))

    return {
      totalInsights: allInsights.length,
      byType,
      highPriority: allInsights.filter(i => i.priority === 'high').slice(0, 5),
      milestones: allInsights.filter(i => i.type === 'milestone').slice(0, 5),
      latest: allInsights.slice(0, 5),
    }
  })

  // ---- 环境音推荐 ----

  function getAmbientSoundRecommendation(
    mood: string,
    time?: string,
  ): AmbientSoundRecommendation {
    const currentHour = new Date().getHours()
    let timeOfDay = time
    if (!timeOfDay) {
      if (currentHour < 5) timeOfDay = 'dawn'
      else if (currentHour < 8) timeOfDay = 'morning'
      else if (currentHour < 11) timeOfDay = 'forenoon'
      else if (currentHour < 13) timeOfDay = 'noon'
      else if (currentHour < 17) timeOfDay = 'afternoon'
      else if (currentHour < 20) timeOfDay = 'evening'
      else timeOfDay = 'night'
    }

    const recommended = analytics.suggestAmbientSound(mood, timeOfDay, 6)

    // 按类别分组
    const categoryMap = new Map<AmbientSoundCategory, AmbientSound[]>()
    for (const s of recommended) {
      const list = categoryMap.get(s.category) ?? []
      list.push(s)
      categoryMap.set(s.category, list)
    }
    const byCategory = Array.from(categoryMap.entries()).map(([cat, sounds]) => {
      const meta = AMBIENT_CATEGORY_META[cat]
      return {
        category: cat,
        label: meta?.label ?? cat,
        icon: meta?.icon ?? '🎵',
        sounds,
      }
    })

    return {
      currentMood: mood,
      currentTimeOfDay: timeOfDay,
      recommended,
      byCategory,
    }
  }

  // ---- 情绪-冥想关联 ----

  const moodCorrelations = computed<MoodMeditationCorrelation[]>(() => {
    const raw = analytics.getMoodTypeCorrelation()
    return raw.map(item => {
      const mostEffectiveType = item.typeDistribution.length > 0
        ? item.typeDistribution[0].type
        : null
      return {
        mood: item.mood,
        typeDistribution: item.typeDistribution,
        mostEffectiveType,
        totalSessions: item.typeDistribution.reduce((s, t) => s + t.count, 0),
      }
    })
  })

  // ---- 操作入口 ----

  /**
   * 记录冥想会话
   */
  function logSession(session: MeditationSession): void {
    analytics.addSession(session)
  }

  /**
   * 获取最近会话
   */
  function getRecentSessions(days: number = 30): MeditationSession[] {
    return analytics.getRecentSessions(days)
  }

  /**
   * 获取今日会话
   */
  function getTodaySessions(): MeditationSession[] {
    return analytics.getTodaySessions()
  }

  /**
   * 刷新分析
   */
  function refreshAnalytics(): void {
    analytics.analyzeMeditationPatterns()
    analytics.computeStreak()
    analytics.generateMeditationInsights()
  }

  /**
   * 按类别获取环境音
   */
  function getSoundsByCategory(category: AmbientSoundCategory): AmbientSound[] {
    return analytics.getSoundsByCategory(category)
  }

  /**
   * 重置所有数据
   */
  function resetAll(): void {
    analytics.resetAll()
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 聚合状态
    isLoading,
    meditationHealth,
    streakSummary,
    insightSummary,
    moodCorrelations,

    // 推荐
    getAmbientSoundRecommendation,

    // 操作入口
    logSession,
    getRecentSessions,
    getTodaySessions,
    refreshAnalytics,
    getSoundsByCategory,
    resetAll,

    // 子模块直通（供高级场景使用）
    analytics,
  }
}