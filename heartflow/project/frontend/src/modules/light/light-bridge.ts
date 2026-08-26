// ============================================================
// 留光阁 · 视图桥接层（P21-3）
// 蓝图定义：
//   统一状态聚合（冥想记录+释怀记录+澄明状态+引导+仪式+实践）
//   澄明仪表盘数据
//   冥想趋势可视化数据
//   释怀统计分析
//   操作入口（记录冥想+释怀+引导推荐+仪式+序列）
// ============================================================

import { computed } from 'vue'
import { useLightPavilion } from './pavilion'
import { useGuidedMeditation, useReleaseRituals, useClarityDashboard } from './guided-meditation'
import { useLightPractice } from './light-practice'
import type { MeditationRecord, ReleaseEntry, MeditationType } from './types'
import { MEDITATION_TYPE_META, RELEASE_METHOD_META } from './types'
import type { GuidedMeditation, ReleaseRitual, ClarityStats } from './guided-meditation'
import type { MeditationSequence, LightPoint } from './light-practice'

// ---- 桥接层状态聚合 ----

export interface LightBridgeState {
  // 冥想
  meditationRecords: MeditationRecord[]
  totalMeditationMinutes: number
  meditationCount: number
  meditationStreak: number
  favoriteType: MeditationType | null

  // 释怀
  releaseEntries: ReleaseEntry[]
  releaseCount: number
  monthlyReleaseCount: number

  // 澄明
  clarityLevel: string
  lightIntensity: number
  clarityStats: ClarityStats | null

  // 引导/仪式
  guidedMeditations: GuidedMeditation[]
  releaseRituals: ReleaseRitual[]

  // 实践
  sequences: MeditationSequence[]
  lightPoints: LightPoint[]
}

// ============================================================
// useLightBridge — 留光阁视图桥接
// ============================================================

export function useLightBridge() {
  // ---- 子模块 ----
  const pavilion = useLightPavilion()
  const guidedMeditation = useGuidedMeditation()
  const releaseRituals = useReleaseRituals()
  const practice = useLightPractice()

  // ---- 计算属性 ----

  /** 冥想记录 */
  const meditationRecords = computed(() => pavilion.getRecentMeditations(100))

  /** 已归档冥想（第34条：允许遗忘，归档而非删除） */
  const archivedMeditations = computed(() => pavilion.archivedMeditations.value)
  /** 已归档释怀 */
  const archivedReleases = computed(() => pavilion.archivedReleases.value)

  /** 冥想统计 */
  const meditationStats = computed(() => pavilion.getMeditationStats())

  /** 总冥想时长 */
  const totalMeditationMinutes = computed(() => meditationStats.value.totalMinutes)

  /** 冥想次数 */
  const meditationCount = computed(() => meditationStats.value.totalSessions)

  /** 冥想连续天数 */
  const meditationStreak = computed(() => meditationStats.value.streak)

  /** 最爱冥想类型 */
  const favoriteType = computed(() => meditationStats.value.favoriteType)

  /** 释怀条目 */
  const releaseEntries = computed(() => pavilion.getRecentReleases(100))

  /** 释怀统计 */
  const releaseStats = computed(() => pavilion.getReleaseStats())

  /** 释怀次数 */
  const releaseCount = computed(() => releaseStats.value.total)

  /** 本月释怀次数 */
  const monthlyReleaseCount = computed(() => releaseStats.value.thisMonth)

  /** 澄明状态 */
  const lightState = computed(() => pavilion.lightState.value)

  /** 澄明等级 */
  const clarityLevel = computed(() => lightState.value.clarity)

  /** 光强度 */
  const lightIntensity = computed(() => lightState.value.lightIntensity)

  /** 澄明仪表盘数据 */
  const clarityStats = computed(() => {
    const meditations = pavilion.getRecentMeditations(100)
    const releases = pavilion.getRecentReleases(100)
    const state = pavilion.lightState.value
    return useClarityDashboard().computeClarityStats(meditations, releases, state)
  })

  /** 引导冥想列表 */
  const guidedMeditations = computed(() => guidedMeditation.getGuidedMeditations())

  /** 释怀仪式列表 */
  const releaseRitualsList = computed(() => releaseRituals.getRituals())

  /** 冥想序列 */
  const sequences = computed(() => practice.sequences.value)

  /** 光点列表 */
  const lightPoints = computed(() => practice.collectedLightPoints.value)

  /** 总亮度 */
  const totalBrightness = computed(() => practice.totalBrightness.value)

  // ---- 仪表盘数据 ----

  /** 冥想趋势（最近14天） */
  const meditationTrend = computed(() => {
    const trend: { date: string; minutes: number; count: number }[] = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayRecords = meditationRecords.value.filter(r => r.date === dateStr)
      trend.push({
        date: dateStr.slice(5),
        minutes: dayRecords.reduce((s, r) => s + r.duration, 0),
        count: dayRecords.length,
      })
    }
    return trend
  })

  /** 冥想类型分布 */
  const meditationTypeDistribution = computed(() => {
    const distribution: Record<string, { label: string; count: number; minutes: number }> = {}
    for (const record of meditationRecords.value) {
      const meta = MEDITATION_TYPE_META[record.type]
      if (!distribution[record.type]) {
        distribution[record.type] = { label: meta?.label ?? record.type, count: 0, minutes: 0 }
      }
      distribution[record.type].count++
      distribution[record.type].minutes += record.duration
    }
    return Object.entries(distribution).map(([type, data]) => ({
      type: type as MeditationType,
      ...data,
    }))
  })

  /** 释怀方式分布 */
  const releaseMethodDistribution = computed(() => {
    const distribution: Record<string, { label: string; count: number }> = {}
    for (const entry of releaseEntries.value) {
      const meta = RELEASE_METHOD_META[entry.method]
      if (!distribution[entry.method]) {
        distribution[entry.method] = { label: meta?.label ?? entry.method, count: 0 }
      }
      distribution[entry.method].count++
    }
    return Object.entries(distribution).map(([method, data]) => ({ method, ...data }))
  })

  /** 澄明趋势 */
  const clarityTrend = computed(() => {
    const trend: { date: string; level: string; intensity: number }[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayRecords = meditationRecords.value.filter(r => r.date === dateStr)
      const dayReleases = releaseEntries.value.filter(r => r.date === dateStr)

      // 简单估算澄明度
      let intensity = 50
      if (dayRecords.length > 0) {
        const avgAfter = dayRecords.reduce((s, r) => {
          const levels = ['clouded', 'unclear', 'neutral', 'clear', 'crystal']
          return s + levels.indexOf(r.stateAfter)
        }, 0) / dayRecords.length
        intensity = Math.round((avgAfter / 4) * 100)
      }
      if (dayReleases.length > 0) {
        intensity = Math.min(100, intensity + dayReleases.length * 5)
      }

      const level = intensity >= 80 ? 'crystal' : intensity >= 60 ? 'clear' : intensity >= 40 ? 'neutral' : intensity >= 20 ? 'unclear' : 'clouded'

      trend.push({ date: dateStr.slice(5), level, intensity })
    }
    return trend
  })

  /** 冥想健康度评分 */
  const meditationHealth = computed(() => {
    let score = 0
    const reasons: string[] = []

    // 有冥想记录 +25
    if (meditationCount.value > 0) {
      score += 25
    } else {
      reasons.push('尚未开始冥想练习')
    }

    // 连续天数 +20
    if (meditationStreak.value >= 7) {
      score += 20
    } else if (meditationStreak.value >= 3) {
      score += 10
    } else {
      reasons.push('冥想连续天数不足3天')
    }

    // 总时长 +20
    if (totalMeditationMinutes.value >= 300) {
      score += 20
    } else if (totalMeditationMinutes.value >= 60) {
      score += 10
    }

    // 有释怀记录 +15
    if (releaseCount.value > 0) {
      score += 15
    }

    // 澄明等级 +20
    const clarityBonus: Record<string, number> = {
      crystal: 20, clear: 15, neutral: 10, unclear: 5, clouded: 0,
    }
    score += clarityBonus[clarityLevel.value] ?? 0

    return { score, maxScore: 100, reasons }
  })

  // ---- 目标预测器 ----

  /** 冥想目标预测 */
  function predictGoal(currentMinutes: number, targetMinutes: number, dailyMinutes: number) {
    const remaining = targetMinutes - currentMinutes
    if (remaining <= 0) {
      return { achieved: true, daysNeeded: 0, estimatedDate: null }
    }
    const daysNeeded = Math.ceil(remaining / dailyMinutes)
    const estimatedDate = new Date()
    estimatedDate.setDate(estimatedDate.getDate() + daysNeeded)
    return {
      achieved: false,
      daysNeeded,
      estimatedDate: estimatedDate.toISOString().slice(0, 10),
    }
  }

  /** 连续天数预测 */
  function predictStreak(currentStreak: number, targetDays: number, recentConsistency: number) {
    const remaining = targetDays - currentStreak
    if (remaining <= 0) {
      return { achieved: true, daysNeeded: 0, probability: 100 }
    }
    // 基于近期一致性计算概率
    const probability = Math.pow(recentConsistency, remaining)
    return {
      achieved: false,
      daysNeeded: remaining,
      probability: Math.round(probability * 100),
    }
  }

  /** 澄明度预测 */
  function predictClarity(currentIntensity: number, weeklyMeditationMinutes: number, weeklyReleases: number) {
    // 每周冥想分钟数贡献
    const meditationGain = Math.min(30, weeklyMeditationMinutes * 0.5)
    // 每周释怀次数贡献
    const releaseGain = Math.min(20, weeklyReleases * 3)
    // 自然衰减
    const naturalDecay = 5

    const weeklyChange = meditationGain + releaseGain - naturalDecay
    const predictedIntensity = Math.min(100, Math.max(0, currentIntensity + weeklyChange))

    let predictedLevel = 'clouded'
    if (predictedIntensity >= 80) predictedLevel = 'crystal'
    else if (predictedIntensity >= 60) predictedLevel = 'clear'
    else if (predictedIntensity >= 40) predictedLevel = 'neutral'
    else if (predictedIntensity >= 20) predictedLevel = 'unclear'

    return {
      currentIntensity,
      predictedIntensity,
      predictedLevel,
      weeklyChange,
      recommendation: weeklyChange <= 0
        ? '建议增加冥想频率或释怀练习以维持澄明度'
        : '当前节奏良好，继续坚持即可',
    }
  }

  // ---- 可视化数据 ----

  /** 冥想日历热力图（最近30天） */
  const meditationCalendar = computed(() => {
    const calendar: { date: string; minutes: number; count: number; level: number }[] = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayRecords = meditationRecords.value.filter(r => r.date === dateStr)
      const minutes = dayRecords.reduce((s, r) => s + r.duration, 0)
      calendar.push({
        date: dateStr.slice(5),
        minutes,
        count: dayRecords.length,
        level: minutes >= 30 ? 3 : minutes >= 15 ? 2 : minutes > 0 ? 1 : 0,
      })
    }
    return calendar
  })

  /** 引导推荐 */
  const recommendedGuides = computed(() => {
    const history = meditationRecords.value.slice(-20)
    return guidedMeditation.getRecommendations(history)
  })

  /** 仪式推荐 */
  function recommendRitual(scenario: string) {
    return releaseRituals.recommendForScenario(scenario)
  }

  // ---- 操作入口 ----

  /** 记录冥想 */
  function recordMeditation(
    type: MeditationType,
    duration: number,
    stateBefore: MeditationRecord['stateBefore'],
    stateAfter: MeditationRecord['stateAfter'],
    insight?: string,
  ) {
    return pavilion.recordMeditation(type, duration, stateBefore, stateAfter, insight)
  }

  /** 执行释怀 */
  function release(content: string, method: ReleaseEntry['method'], feelingAfter?: string) {
    return pavilion.release(content, method, feelingAfter)
  }

  /** 获取引导详情 */
  function getGuide(id: string) {
    return guidedMeditation.getGuidedMeditations().find(g => g.id === id)
  }

  /** 获取仪式详情 */
  function getRitual(id: string) {
    return releaseRituals.getRitual(id)
  }

  /** 完成释怀仪式 */
  function completeRitual(ritualId: string, insight: string) {
    // 先通过 pavilion 创建释怀条目，再传给 practice
    const releaseEntry = pavilion.release(insight, 'transform', '释怀完成')
    return practice.completeReleaseRitual(ritualId, releaseEntry)
  }

  /** 归档/还原冥想 */
  function archiveMeditation(id: string) { return pavilion.archiveMeditation(id) }
  function restoreMeditation(id: string) { return pavilion.restoreMeditation(id) }
  /** 归档/还原释怀 */
  function archiveRelease(id: string) { return pavilion.archiveRelease(id) }
  function restoreRelease(id: string) { return pavilion.restoreRelease(id) }

  return {
    // 状态
    meditationRecords,
    meditationStats,
    totalMeditationMinutes,
    meditationCount,
    meditationStreak,
    favoriteType,
    releaseEntries,
    releaseStats,
    releaseCount,
    monthlyReleaseCount,
    lightState,
    clarityLevel,
    lightIntensity,
    clarityStats,
    guidedMeditations,
    releaseRitualsList,
    sequences,
    lightPoints,
    totalBrightness,
    archivedMeditations,
    archivedReleases,

    // 仪表盘
    meditationTrend,
    meditationTypeDistribution,
    releaseMethodDistribution,
    clarityTrend,
    meditationHealth,

    // 目标预测
    predictGoal,
    predictStreak,
    predictClarity,

    // 可视化
    meditationCalendar,
    recommendedGuides,
    recommendRitual,

    // 操作
    recordMeditation,
    release,
    getGuide,
    getRitual,
    completeRitual,
    archiveMeditation,
    restoreMeditation,
    archiveRelease,
    restoreRelease,
  }
}