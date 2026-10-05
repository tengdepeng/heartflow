// ============================================================
// 自律工坊 · 连续打卡系统 + 成就徽章 + 习惯建议 + 失败分析
// 蓝图：连续天数追踪、成就系统、习惯建议、失败分析、习惯组合
// ============================================================

import { ref } from 'vue'
import { getLocalMonthKey } from '../../utils/time'
import type { Habit } from './types'

// ---- 连续打卡 ----

export interface StreakRecord {
  habitId: string
  habitName: string
  /** 当前连续天数 */
  currentStreak: number
  /** 最长连续天数 */
  longestStreak: number
  /** 总打卡天数 */
  totalCheckins: number
  /** 本月打卡天数 */
  monthlyCheckins: number
  /** 本周打卡天数 */
  weeklyCheckins: number
  /** 上次打卡日期 */
  lastCheckinDate: string | null
  /** 连续记录历史 */
  streakHistory: StreakSegment[]
  /** 完成率 */
  completionRate: number
  /** 当前等级 */
  level: StreakLevel
  /** 距下一等级所需天数 */
  daysToNextLevel: number
}

export interface StreakSegment {
  startDate: string
  endDate: string
  length: number
  isActive: boolean
}

export type StreakLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary'

export const STREAK_LEVELS: Record<StreakLevel, { label: string; color: string; minDays: number; emoji: string }> = {
  bronze: { label: '青铜', color: '#cd7f32', minDays: 3, emoji: '🥉' },
  silver: { label: '白银', color: '#c0c0c0', minDays: 7, emoji: '🥈' },
  gold: { label: '黄金', color: '#f0c040', minDays: 21, emoji: '🥇' },
  platinum: { label: '铂金', color: '#e5e4e2', minDays: 66, emoji: '💎' },
  diamond: { label: '钻石', color: '#b9f2ff', minDays: 100, emoji: '💠' },
  legendary: { label: '传说', color: '#ff6b6b', minDays: 365, emoji: '👑' },
}

// ---- 成就徽章 ----

export interface AchievementBadge {
  id: string
  name: string
  description: string
  icon: string
  category: 'streak' | 'milestone' | 'variety' | 'challenge' | 'special'
  /** 解锁条件 */
  condition: AchievementCondition
  /** 是否已解锁 */
  unlocked: boolean
  /** 解锁时间 */
  unlockedAt?: string
  /** 进度 0-1 */
  progress: number
  /** 稀有度 */
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface AchievementCondition {
  type: 'total_checkins' | 'streak_days' | 'habit_count' | 'challenge_complete' | 'perfect_week' | 'perfect_month'
  threshold: number
  habitId?: string
}

// ---- 习惯建议 ----

export interface HabitSuggestion {
  id: string
  /** 建议的习惯名称 */
  name: string
  /** 建议描述 */
  description: string
  /** 建议原因 */
  reason: string
  /** 基于哪个现有习惯 */
  basedOnHabitId?: string
  /** 建议的难度 */
  suggestedDifficulty: 'easy' | 'medium' | 'hard'
  /** 建议的频率 */
  suggestedFrequency: 'daily' | 'weekly' | 'custom'
  /** 相关性评分 */
  relevanceScore: number
  /** 是否已采纳 */
  adopted: boolean
}

// ---- 失败分析 ----

export interface HabitFailure {
  id: string
  habitId: string
  habitName: string
  /** 失败日期 */
  failedDate: string
  /** 失败原因分类 */
  reasonCategory: 'time' | 'energy' | 'motivation' | 'environment' | 'forgot' | 'other'
  /** 失败详细原因 */
  reason: string
  /** 连续天数中断时的天数 */
  streakAtBreak: number
  /** 恢复策略 */
  recoveryStrategy?: string
  /** 是否已恢复 */
  recovered: boolean
  /** 恢复日期 */
  recoveredDate?: string
  /** 时间段 */
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
}

// ---- 习惯组合 ----

export interface HabitBundle {
  id: string
  name: string
  description: string
  /** 组合中的习惯 ID */
  habitIds: string[]
  /** 组合完成条件 */
  completionCondition: 'all' | 'any' | 'majority'
  /** 组合奖励 */
  bonusMultiplier: number
  /** 是否激活 */
  active: boolean
  createdAt: string
}

// ============================================================
// useStreakTracker
// ============================================================

export function useStreakTracker() {
  const streaks = ref<StreakRecord[]>([])

  /** 记录打卡并更新连续天数 */
  function recordCheckin(
    habitId: string,
    habitName: string,
    checkinDate: string = new Date().toISOString().split('T')[0],
  ): StreakRecord {
    let record = streaks.value.find((s) => s.habitId === habitId)

    if (!record) {
      record = {
        habitId,
        habitName,
        currentStreak: 0,
        longestStreak: 0,
        totalCheckins: 0,
        monthlyCheckins: 0,
        weeklyCheckins: 0,
        lastCheckinDate: null,
        streakHistory: [],
        completionRate: 0,
        level: 'bronze',
        daysToNextLevel: 3,
      }
      streaks.value.push(record)
    }

    const today = new Date(checkinDate)
    const yesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0]

    if (record.lastCheckinDate === checkinDate) {
      return record // 今天已经打卡
    }

    record.totalCheckins++

    // 更新连续天数
    if (record.lastCheckinDate === yesterday || record.lastCheckinDate === checkinDate) {
      record.currentStreak++
    } else if (record.lastCheckinDate !== null) {
      // 中断了，保存旧的连续记录
      if (record.currentStreak > 0) {
        record.streakHistory.push({
          startDate: new Date(
            today.getTime() - (record.currentStreak - 1) * 86400000,
          ).toISOString().split('T')[0],
          endDate: record.lastCheckinDate,
          length: record.currentStreak,
          isActive: false,
        })
      }
      record.currentStreak = 1
    } else {
      record.currentStreak = 1
    }

    record.lastCheckinDate = checkinDate

    // 更新最长连续
    if (record.currentStreak > record.longestStreak) {
      record.longestStreak = record.currentStreak
    }

    // 更新月度/周度统计
    const currentMonth = getLocalMonthKey(today)
    const checkinMonth = getLocalMonthKey(checkinDate)
    if (checkinMonth === currentMonth) {
      record.monthlyCheckins++
    } else {
      record.monthlyCheckins = 1
    }

    // 更新周度统计
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today.getTime() - dayOfWeek * 86400000).toISOString().split('T')[0]
    if (checkinDate >= weekStart) {
      record.weeklyCheckins++
    } else {
      record.weeklyCheckins = 1
    }

    // 计算完成率
    const totalDays = Math.ceil(
      (Date.now() - new Date(record.streakHistory[0]?.startDate || checkinDate).getTime()) / 86400000,
    ) || 1
    record.completionRate = record.totalCheckins / totalDays

    // 更新等级
    updateStreakLevel(record)

    return record
  }

  /** 获取习惯的连续记录 */
  function getStreak(habitId: string): StreakRecord | undefined {
    return streaks.value.find((s) => s.habitId === habitId)
  }

  /** 获取所有连续记录（按当前连续天数排序） */
  function getTopStreaks(limit: number = 10): StreakRecord[] {
    return [...streaks.value]
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, limit)
  }

  /** 检查是否中断 */
  function checkStreakBreak(habitId: string): boolean {
    const record = streaks.value.find((s) => s.habitId === habitId)
    if (!record || !record.lastCheckinDate) return false

    const lastDate = new Date(record.lastCheckinDate)
    const today = new Date()
    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / 86400000,
    )

    return diffDays > 1
  }

  return {
    streaks,
    recordCheckin,
    getStreak,
    getTopStreaks,
    checkStreakBreak,
  }
}

function updateStreakLevel(record: StreakRecord): void {
  const levels = Object.entries(STREAK_LEVELS)
    .sort((a, b) => b[1].minDays - a[1].minDays)

  for (const [level, config] of levels) {
    if (record.currentStreak >= config.minDays) {
      record.level = level as StreakLevel
      // 找下一级
      const nextLevelIdx = levels.findIndex(([l]) => l === level) - 1
      if (nextLevelIdx >= 0) {
        record.daysToNextLevel = levels[nextLevelIdx][1].minDays - record.currentStreak
      } else {
        record.daysToNextLevel = 0
      }
      break
    }
  }
}

// ============================================================
// useAchievementBadges
// ============================================================

export function useAchievementBadges() {
  const badges = ref<AchievementBadge[]>([])

  const DEFAULT_BADGES: Omit<AchievementBadge, 'id' | 'unlocked' | 'progress'>[] = [
    { name: '初出茅庐', description: '完成首次打卡', icon: '🌱', category: 'streak', condition: { type: 'total_checkins', threshold: 1 }, rarity: 'common' },
    { name: '持之以恒', description: '连续打卡 7 天', icon: '🔥', category: 'streak', condition: { type: 'streak_days', threshold: 7 }, rarity: 'common' },
    { name: '习惯养成', description: '连续打卡 21 天', icon: '🌟', category: 'streak', condition: { type: 'streak_days', threshold: 21 }, rarity: 'rare' },
    { name: '百日筑基', description: '连续打卡 66 天', icon: '🏛️', category: 'streak', condition: { type: 'streak_days', threshold: 66 }, rarity: 'epic' },
    { name: '百折不挠', description: '连续打卡 100 天', icon: '💯', category: 'streak', condition: { type: 'streak_days', threshold: 100 }, rarity: 'epic' },
    { name: '年度自律', description: '连续打卡 365 天', icon: '👑', category: 'streak', condition: { type: 'streak_days', threshold: 365 }, rarity: 'legendary' },
    { name: '打卡达人', description: '累计打卡 100 次', icon: '✅', category: 'milestone', condition: { type: 'total_checkins', threshold: 100 }, rarity: 'rare' },
    { name: '打卡大师', description: '累计打卡 500 次', icon: '🏆', category: 'milestone', condition: { type: 'total_checkins', threshold: 500 }, rarity: 'epic' },
    { name: '打卡传说', description: '累计打卡 1000 次', icon: '🎖️', category: 'milestone', condition: { type: 'total_checkins', threshold: 1000 }, rarity: 'legendary' },
    { name: '完美一周', description: '一周内每天完成所有习惯', icon: '✨', category: 'special', condition: { type: 'perfect_week', threshold: 1 }, rarity: 'rare' },
    { name: '完美一月', description: '一个月内每天完成所有习惯', icon: '🌕', category: 'special', condition: { type: 'perfect_month', threshold: 1 }, rarity: 'epic' },
    { name: '多面手', description: '同时维护 5 个习惯', icon: '🎯', category: 'variety', condition: { type: 'habit_count', threshold: 5 }, rarity: 'rare' },
    { name: '习惯大师', description: '同时维护 10 个习惯', icon: '🎪', category: 'variety', condition: { type: 'habit_count', threshold: 10 }, rarity: 'epic' },
  ]

  function initBadges(): void {
    if (badges.value.length === 0) {
      badges.value = DEFAULT_BADGES.map((b) => ({
        ...b,
        id: `badge-${Date.now()}-${b.name}`,
        unlocked: false,
        progress: 0,
      }))
    }
  }

  /** 检查并解锁成就 */
  function checkBadges(
    streaks: StreakRecord[],
    habits: Habit[],
  ): AchievementBadge[] {
    const newlyUnlocked: AchievementBadge[] = []

    badges.value.forEach((badge) => {
      if (badge.unlocked) return

      let progress = 0
      let unlocked = false

      switch (badge.condition.type) {
        case 'total_checkins': {
          const total = streaks.reduce((sum, s) => sum + s.totalCheckins, 0)
          progress = Math.min(total / badge.condition.threshold, 1)
          unlocked = total >= badge.condition.threshold
          break
        }
        case 'streak_days': {
          const maxStreak = Math.max(...streaks.map((s) => s.currentStreak), 0)
          progress = Math.min(maxStreak / badge.condition.threshold, 1)
          unlocked = maxStreak >= badge.condition.threshold
          break
        }
        case 'habit_count': {
          const activeHabits = habits.filter((h) => h.enabled).length
          progress = Math.min(activeHabits / badge.condition.threshold, 1)
          unlocked = activeHabits >= badge.condition.threshold
          break
        }
        case 'perfect_week': {
          const allComplete = streaks.every((s) => s.weeklyCheckins >= 7)
          progress = allComplete ? 1 : 0
          unlocked = allComplete
          break
        }
        case 'perfect_month': {
          const today = new Date()
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
          const allComplete = streaks.every((s) => s.monthlyCheckins >= daysInMonth)
          progress = allComplete ? 1 : 0
          unlocked = allComplete
          break
        }
        case 'challenge_complete': {
          progress = 0
          unlocked = false
          break
        }
      }

      badge.progress = progress
      if (unlocked) {
        badge.unlocked = true
        badge.unlockedAt = new Date().toISOString()
        newlyUnlocked.push(badge)
      }
    })

    return newlyUnlocked
  }

  /** 获取已解锁的徽章 */
  function getUnlockedBadges(): AchievementBadge[] {
    return badges.value.filter((b) => b.unlocked)
  }

  /** 按类别获取徽章 */
  function getBadgesByCategory(category: AchievementBadge['category']): AchievementBadge[] {
    return badges.value.filter((b) => b.category === category)
  }

  return {
    badges,
    initBadges,
    checkBadges,
    getUnlockedBadges,
    getBadgesByCategory,
  }
}

// ============================================================
// useHabitSuggestions
// ============================================================

export function useHabitSuggestions() {
  const suggestions = ref<HabitSuggestion[]>([])

  /** 基于现有习惯生成建议 */
  function generateSuggestions(habits: Habit[]): HabitSuggestion[] {
    const newSuggestions: HabitSuggestion[] = []

    // 互补习惯建议
    const activeHabits = habits.filter((h) => h.enabled)

    const complementMap: Record<string, string[]> = {
      '运动': ['拉伸', '冥想', '健康饮食'],
      '阅读': ['写作', '做笔记', '分享'],
      '冥想': ['瑜伽', '日记', '感恩练习'],
      '早起': ['晨间计划', '晨练', '健康早餐'],
      '日记': ['感恩练习', '周回顾', '目标审视'],
      '学习': ['复习', '实践', '教学'],
    }

    activeHabits.forEach((habit) => {
      const complements = complementMap[habit.title] || []
      complements.forEach((complement) => {
        const alreadyExists = activeHabits.some((h) => h.title.includes(complement))
        if (!alreadyExists) {
          newSuggestions.push({
            id: `sug-${Date.now()}-${habit.id}-${complement}`,
            name: complement,
            description: `与「${habit.title}」搭配的 ${complement} 习惯`,
            reason: `「${habit.title}」和「${complement}」是互补习惯，一起实践效果更好`,
            basedOnHabitId: habit.id,
            suggestedDifficulty: 'easy',
            suggestedFrequency: 'daily',
            relevanceScore: 0.8,
            adopted: false,
          })
        }
      })
    })

    // 基础习惯建议
    if (activeHabits.length === 0) {
      newSuggestions.push(
        {
          id: `sug-${Date.now()}-drink-water`,
          name: '喝水',
          description: '每天喝 8 杯水',
          reason: '充足的水分摄入是健康的基础，也是养成其他习惯的前提',
          suggestedDifficulty: 'easy',
          suggestedFrequency: 'daily',
          relevanceScore: 0.9,
          adopted: false,
        },
        {
          id: `sug-${Date.now()}-walk`,
          name: '散步',
          description: '每天散步 15 分钟',
          reason: '轻度运动有助于建立自律感，难度低容易坚持',
          suggestedDifficulty: 'easy',
          suggestedFrequency: 'daily',
          relevanceScore: 0.85,
          adopted: false,
        },
      )
    }

    // 去重
    const seen = new Set<string>()
    const unique = newSuggestions.filter((s) => {
      const key = s.name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    suggestions.value = unique
    return unique
  }

  /** 采纳建议 */
  function adoptSuggestion(suggestionId: string): HabitSuggestion | undefined {
    const suggestion = suggestions.value.find((s) => s.id === suggestionId)
    if (suggestion) suggestion.adopted = true
    return suggestion
  }

  return {
    suggestions,
    generateSuggestions,
    adoptSuggestion,
  }
}

// ============================================================
// useHabitFailureAnalysis
// ============================================================

export function useHabitFailureAnalysis() {
  const failures = ref<HabitFailure[]>([])

  /** 记录失败 */
  function recordFailure(
    habitId: string,
    habitName: string,
    reason: string,
    reasonCategory: HabitFailure['reasonCategory'],
    streakAtBreak: number,
    failedDate: string = new Date().toISOString().split('T')[0],
  ): HabitFailure {
    const failure: HabitFailure = {
      id: `hf-${Date.now()}`,
      habitId,
      habitName,
      failedDate,
      reasonCategory,
      reason,
      streakAtBreak,
      recovered: false,
      timeOfDay: getTimeOfDay(),
    }

    failures.value.push(failure)
    return failure
  }

  /** 标记恢复 */
  function markRecovered(failureId: string, strategy: string): HabitFailure | undefined {
    const failure = failures.value.find((f) => f.id === failureId)
    if (!failure) return undefined

    failure.recovered = true
    failure.recoveredDate = new Date().toISOString().split('T')[0]
    failure.recoveryStrategy = strategy
    return failure
  }

  /** 分析失败模式 */
  function analyzeFailurePatterns(): {
    mostCommonReason: { category: string; count: number } | null
    averageStreakAtBreak: number
    recoveryRate: number
    timeOfDayDistribution: Record<string, number>
    habitFailureRates: Record<string, { name: string; failures: number; rate: number }>
  } {
    if (failures.value.length === 0) {
      return {
        mostCommonReason: null,
        averageStreakAtBreak: 0,
        recoveryRate: 0,
        timeOfDayDistribution: {},
        habitFailureRates: {},
      }
    }

    // 最常见原因
    const reasonCounts: Record<string, number> = {}
    failures.value.forEach((f) => {
      reasonCounts[f.reasonCategory] = (reasonCounts[f.reasonCategory] || 0) + 1
    })
    const mostCommonReason = Object.entries(reasonCounts).reduce(
      (best, [cat, count]) => (count > (best?.count || 0) ? { category: cat, count } : best),
      null as { category: string; count: number } | null,
    )

    // 平均中断天数
    const avgStreak = failures.value.reduce((sum, f) => sum + f.streakAtBreak, 0) / failures.value.length

    // 恢复率
    const recovered = failures.value.filter((f) => f.recovered).length
    const recoveryRate = failures.value.length > 0 ? recovered / failures.value.length : 0

    // 时段分布
    const timeOfDayDist: Record<string, number> = {}
    failures.value.forEach((f) => {
      timeOfDayDist[f.timeOfDay] = (timeOfDayDist[f.timeOfDay] || 0) + 1
    })

    // 习惯失败率
    const habitFailureRates: Record<string, { name: string; failures: number; rate: number }> = {}
    failures.value.forEach((f) => {
      if (!habitFailureRates[f.habitId]) {
        habitFailureRates[f.habitId] = { name: f.habitName, failures: 0, rate: 0 }
      }
      habitFailureRates[f.habitId].failures++
    })
    Object.values(habitFailureRates).forEach((h) => {
      h.rate = h.failures / failures.value.length
    })

    return {
      mostCommonReason,
      averageStreakAtBreak: avgStreak,
      recoveryRate,
      timeOfDayDistribution: timeOfDayDist,
      habitFailureRates,
    }
  }

  /** 获取恢复建议 */
  function getRecoverySuggestions(failureCategory: string): string[] {
    const suggestions: Record<string, string[]> = {
      time: ['将习惯安排在更固定的时间', '设置提前提醒', '为习惯预留缓冲时间'],
      energy: ['降低习惯难度', '在精力充沛的时段执行', '与高能量活动搭配'],
      motivation: ['重新审视习惯的意义', '找到习惯的内在奖励', '寻找习惯伙伴'],
      environment: ['优化执行环境', '减少环境摩擦', '准备必要的工具和资源'],
      forgot: ['设置多重提醒', '将习惯与现有习惯锚定', '使用可视化的习惯追踪'],
      other: ['分析具体原因', '从小目标重新开始', '寻求外部支持'],
    }

    return suggestions[failureCategory] || suggestions.other
  }

  return {
    failures,
    recordFailure,
    markRecovered,
    analyzeFailurePatterns,
    getRecoverySuggestions,
  }
}

function getTimeOfDay(): HabitFailure['timeOfDay'] {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

// ============================================================
// useHabitBundles
// ============================================================

export function useHabitBundles() {
  const bundles = ref<HabitBundle[]>([])

  const DEFAULT_BUNDLES: Omit<HabitBundle, 'id' | 'createdAt'>[] = [
    {
      name: '晨间三部曲',
      description: '早起后依次完成：喝水、冥想、晨间计划',
      habitIds: [],
      completionCondition: 'all',
      bonusMultiplier: 1.5,
      active: false,
    },
    {
      name: '晚间充电',
      description: '睡前完成：日记、阅读、明日计划',
      habitIds: [],
      completionCondition: 'all',
      bonusMultiplier: 1.3,
      active: false,
    },
    {
      name: '健康基石',
      description: '每天至少完成：喝水、运动、充足睡眠',
      habitIds: [],
      completionCondition: 'majority',
      bonusMultiplier: 1.2,
      active: false,
    },
  ]

  function initBundles(): void {
    if (bundles.value.length === 0) {
      bundles.value = DEFAULT_BUNDLES.map((b) => ({
        ...b,
        id: `bundle-${Date.now()}-${b.name}`,
        createdAt: new Date().toISOString(),
      }))
    }
  }

  /** 创建习惯组合 */
  function createBundle(
    name: string,
    description: string,
    habitIds: string[],
    completionCondition: HabitBundle['completionCondition'] = 'all',
    bonusMultiplier: number = 1.2,
  ): HabitBundle {
    const bundle: HabitBundle = {
      id: `bundle-${Date.now()}`,
      name,
      description,
      habitIds,
      completionCondition,
      bonusMultiplier,
      active: true,
      createdAt: new Date().toISOString(),
    }

    bundles.value.push(bundle)
    return bundle
  }

  /** 检查组合是否完成 */
  function isBundleComplete(bundleId: string, completedHabitIds: string[]): boolean {
    const bundle = bundles.value.find((b) => b.id === bundleId)
    if (!bundle || !bundle.active) return false

    const completed = bundle.habitIds.filter((id) => completedHabitIds.includes(id))
    const total = bundle.habitIds.length

    if (total === 0) return false

    switch (bundle.completionCondition) {
      case 'all':
        return completed.length === total
      case 'any':
        return completed.length > 0
      case 'majority':
        return completed.length > total / 2
      default:
        return false
    }
  }

  /** 计算组合奖励积分 */
  function calculateBundleBonus(
    bundleId: string,
    completedHabitIds: string[],
    basePoints: number,
  ): number {
    if (!isBundleComplete(bundleId, completedHabitIds)) return 0

    const bundle = bundles.value.find((b) => b.id === bundleId)
    if (!bundle) return 0

    return Math.round(basePoints * (bundle.bonusMultiplier - 1))
  }

  return {
    bundles,
    initBundles,
    createBundle,
    isBundleComplete,
    calculateBundleBonus,
  }
}