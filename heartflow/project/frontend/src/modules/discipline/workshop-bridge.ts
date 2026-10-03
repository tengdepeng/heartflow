// ============================================================
// 自律工坊 · 集成桥接（P16-3）
// 将 workshop 引擎与 streak-system 连接，实现：
// - 习惯完成时自动更新连续打卡 + 检测徽章
// - 习惯中断时自动记录失败分析
// - 习惯组合自动检测与奖励计算
// - 统一 API 入口
// ============================================================

import { ref } from 'vue'
import type { Habit, DisciplineChallenge, DailyRitual } from './types'
import { HABIT_DIFFICULTY_META } from './types'
import { useDisciplineWorkshop } from './workshop'
import {
  useStreakTracker,
  useAchievementBadges,
  useHabitSuggestions,
  useHabitFailureAnalysis,
  useHabitBundles,
  STREAK_LEVELS,
  type StreakRecord,
  type AchievementBadge,
  type HabitSuggestion,
  type HabitFailure,
  type HabitBundle,
} from './streak-system'
import {
  EXTENDED_BADGES,
  HABIT_TEMPLATES,
  CHALLENGE_TEMPLATES,
  RITUAL_TEMPLATES,
  BUNDLE_PRESETS,
  type HabitTemplate,
  type ChallengeTemplate,
  type RitualTemplate,
  type BundlePreset,
} from './preset-library'
import { storage } from '../../engine/storage'

// ============================================================
// 桥接存储
// ============================================================

const BRIDGE_STORAGE_KEYS = {
  badges: 'hf:discipline:badges',
  streaks: 'hf:discipline:streaks',
  failures: 'hf:discipline:failures',
  bundles: 'hf:discipline:bundles',
  suggestions: 'hf:discipline:suggestions',
} as const

// ============================================================
// useDisciplineBridge
// ============================================================

export interface HabitCompletionResult {
  habit: Habit
  streak: StreakRecord
  newlyUnlockedBadges: AchievementBadge[]
  bundleCompletions: { bundle: HabitBundle; bonus: number }[]
  totalPoints: number
}

export interface DisciplineStats {
  // 习惯统计
  totalHabits: number
  activeHabits: number
  todayCompleted: number
  totalCheckins: number
  avgStreak: number
  maxStreak: number
  completionRate: number

  // 徽章统计
  totalBadges: number
  unlockedBadges: number
  badgeProgress: number

  // 挑战统计
  activeChallenges: number
  completedChallenges: number
  challengeProgress: number

  // 组合统计
  activeBundles: number
  completedBundlesToday: number

  // 失败分析
  totalFailures: number
  recoveryRate: number
  mostCommonFailureReason: string

  // 积分
  totalPoints: number
  weeklyPoints: number
  level: number
  levelTitle: string
}

export function useDisciplineBridge() {
  const workshop = useDisciplineWorkshop()
  const streakTracker = useStreakTracker()
  const badgeSystem = useAchievementBadges()
  const suggestionEngine = useHabitSuggestions()
  const failureAnalysis = useHabitFailureAnalysis()
  const bundleSystem = useHabitBundles()

  // ---- 初始化 ----
  const initialized = ref(false)

  function init(): void {
    if (initialized.value) return
    badgeSystem.initBadges()
    bundleSystem.initBundles()
    // 从存储恢复
    loadBridgeState()
    initialized.value = true
  }

  /** 重置所有状态（用于测试） */
  function reset(): void {
    workshop.habits.value = []
    workshop.challenges.value = []
    workshop.rituals.value = []
    streakTracker.streaks.value = []
    badgeSystem.badges.value = []
    suggestionEngine.suggestions.value = []
    failureAnalysis.failures.value = []
    bundleSystem.bundles.value = []
    initialized.value = false
  }

  // ---- 持久化 ----
  function saveBridgeState(): void {
    try {
      storage.setKV(BRIDGE_STORAGE_KEYS.badges, JSON.stringify(badgeSystem.badges.value))
      storage.setKV(BRIDGE_STORAGE_KEYS.streaks, JSON.stringify(streakTracker.streaks.value))
      storage.setKV(BRIDGE_STORAGE_KEYS.failures, JSON.stringify(failureAnalysis.failures.value))
      storage.setKV(BRIDGE_STORAGE_KEYS.bundles, JSON.stringify(bundleSystem.bundles.value))
    } catch { /* 存储不可用时静默失败 */ }
  }

  function loadBridgeState(): void {
    try {
      const savedBadges = storage.getKV<string>(BRIDGE_STORAGE_KEYS.badges, '[]')
      if (savedBadges && savedBadges !== '[]') {
        badgeSystem.badges.value = JSON.parse(savedBadges)
      }
      const savedStreaks = storage.getKV<string>(BRIDGE_STORAGE_KEYS.streaks, '[]')
      if (savedStreaks && savedStreaks !== '[]') {
        streakTracker.streaks.value = JSON.parse(savedStreaks)
      }
      const savedFailures = storage.getKV<string>(BRIDGE_STORAGE_KEYS.failures, '[]')
      if (savedFailures && savedFailures !== '[]') {
        failureAnalysis.failures.value = JSON.parse(savedFailures)
      }
      const savedBundles = storage.getKV<string>(BRIDGE_STORAGE_KEYS.bundles, '[]')
      if (savedBundles && savedBundles !== '[]') {
        bundleSystem.bundles.value = JSON.parse(savedBundles)
      }
    } catch { /* 数据损坏时静默失败 */ }
  }

  // ============================================================
  // 增强的习惯完成
  // ============================================================

  /**
   * 完成习惯（增强版）：
   * 1. 调用 workshop 完成习惯
   * 2. 更新连续打卡记录
   * 3. 检测并解锁徽章
   * 4. 检测习惯组合完成
   * 5. 计算积分奖励
   * 6. 持久化状态
   */
  function completeHabit(habitId: string): HabitCompletionResult | null {
    const habit = workshop.habits.value.find(h => h.id === habitId)
    if (!habit || !habit.enabled) return null

    // 1. 完成习惯
    const success = workshop.completeHabit(habitId)
    if (!success) return null

    // 2. 更新连续打卡
    const streak = streakTracker.recordCheckin(habitId, habit.title)

    // 3. 检测徽章
    const newlyUnlocked = badgeSystem.checkBadges(
      streakTracker.streaks.value,
      workshop.habits.value,
    )

    // 4. 检测习惯组合
    const todayCompletedIds = workshop.habits.value
      .filter(h => {
        const today = new Date().toISOString().split('T')[0]
        return h.completedDates.includes(today)
      })
      .map(h => h.id)

    const bundleCompletions: { bundle: HabitBundle; bonus: number }[] = []
    bundleSystem.bundles.value.forEach(bundle => {
      if (bundleSystem.isBundleComplete(bundle.id, todayCompletedIds)) {
        const basePoints = HABIT_DIFFICULTY_META[habit.difficulty]?.basePoints ?? 1
        const bonus = bundleSystem.calculateBundleBonus(bundle.id, todayCompletedIds, basePoints)
        if (bonus > 0) {
          bundleCompletions.push({ bundle, bonus })
        }
      }
    })

    // 5. 计算总积分
    const basePoints = HABIT_DIFFICULTY_META[habit.difficulty]?.basePoints ?? 1
    const bonusPoints = bundleCompletions.reduce((sum, c) => sum + c.bonus, 0)
    const totalPoints = basePoints + bonusPoints

    // 6. 持久化
    saveBridgeState()

    return {
      habit: { ...habit },
      streak,
      newlyUnlockedBadges: newlyUnlocked,
      bundleCompletions,
      totalPoints,
    }
  }

  // ============================================================
  // 习惯中断检测
  // ============================================================

  /**
   * 检查所有习惯的中断情况，记录失败分析
   */
  function checkStreakBreaks(): HabitFailure[] {
    const newFailures: HabitFailure[] = []

    workshop.habits.value.forEach(habit => {
      if (!habit.enabled) return

      const isBroken = streakTracker.checkStreakBreak(habit.id)
      if (isBroken && habit.streak > 0) {
        const failure = failureAnalysis.recordFailure(
          habit.id,
          habit.title,
          `「${habit.title}」中断于 ${habit.streak} 天连续`,
          'forgot',
          habit.streak,
        )
        newFailures.push(failure)
      }
    })

    if (newFailures.length > 0) {
      saveBridgeState()
    }

    return newFailures
  }

  /**
   * 手动记录失败
   */
  function recordFailure(
    habitId: string,
    reason: string,
    reasonCategory: HabitFailure['reasonCategory'],
  ): HabitFailure | null {
    const habit = workshop.habits.value.find(h => h.id === habitId)
    if (!habit) return null

    const streak = streakTracker.getStreak(habitId)
    const failure = failureAnalysis.recordFailure(
      habitId,
      habit.title,
      reason,
      reasonCategory,
      streak?.currentStreak ?? habit.streak,
    )
    saveBridgeState()
    return failure
  }

  // ============================================================
  // 习惯建议
  // ============================================================

  /**
   * 生成习惯建议
   */
  function generateSuggestions(): HabitSuggestion[] {
    return suggestionEngine.generateSuggestions(workshop.habits.value)
  }

  /**
   * 采纳建议（创建新习惯）
   */
  function adoptSuggestion(suggestionId: string): Habit | null {
    const suggestion = suggestionEngine.adoptSuggestion(suggestionId)
    if (!suggestion) return null

    const habit = workshop.addHabit(
      suggestion.name,
      suggestion.description,
      suggestion.reason.includes('运动') ? '🏃' :
      suggestion.reason.includes('冥想') ? '🧘' :
      suggestion.reason.includes('阅读') ? '📖' : '⭐',
      suggestion.suggestedDifficulty,
      suggestion.suggestedFrequency,
      1,
    )
    return habit
  }

  // ============================================================
  // 预设模板操作
  // ============================================================

  /**
   * 从模板创建习惯
   */
  function createHabitFromTemplate(template: HabitTemplate): Habit {
    return workshop.addHabit(
      template.title,
      template.description,
      template.icon,
      template.difficulty,
      template.frequency,
      template.target,
      template.customFrequency,
    )
  }

  /**
   * 从模板创建挑战
   */
  function createChallengeFromTemplate(
    template: ChallengeTemplate,
    existingHabits: Habit[],
  ): DisciplineChallenge | null {
    // 匹配现有习惯
    const matchedHabitIds = template.suggestedHabits
      .map(title => existingHabits.find(h => h.title === title))
      .filter((h): h is Habit => h !== undefined)
      .map(h => h.id)

    if (matchedHabitIds.length === 0) {
      // 如果没有匹配的习惯，先创建它们
      const createdIds = template.suggestedHabits
        .map(title => {
          const tpl = HABIT_TEMPLATES.find(t => t.title === title)
          if (!tpl) return null
          const h = createHabitFromTemplate(tpl)
          return h.id
        })
        .filter((id): id is string => id !== null)
      return workshop.createChallenge(
        template.title,
        template.description,
        template.duration,
        createdIds,
        template.reward,
      )
    }

    return workshop.createChallenge(
      template.title,
      template.description,
      template.duration,
      matchedHabitIds,
      template.reward,
    )
  }

  /**
   * 从模板创建仪式
   */
  function createRitualFromTemplate(template: RitualTemplate): DailyRitual {
    return workshop.addRitual(
      template.title,
      template.description,
      template.icon,
      template.steps,
      template.estimatedDuration,
      template.triggerTime,
    )
  }

  /**
   * 从预设创建习惯组合
   */
  function createBundleFromPreset(
    preset: BundlePreset,
    existingHabits: Habit[],
  ): HabitBundle | null {
    const matchedIds = preset.suggestedHabitTitles
      .map(title => existingHabits.find(h => h.title === title))
      .filter((h): h is Habit => h !== undefined)
      .map(h => h.id)

    if (matchedIds.length === 0) return null

    return bundleSystem.createBundle(
      preset.name,
      preset.description,
      matchedIds,
      preset.completionCondition,
      preset.bonusMultiplier,
    )
  }

  // ============================================================
  // 综合统计
  // ============================================================

  /**
   * 获取综合统计
   */
  function getStats(): DisciplineStats {
    const today = new Date().toISOString().split('T')[0]
    const habitStats = workshop.getHabitStats()
    const activeHabits = workshop.habits.value.filter(h => h.enabled)
    const todayCompletedIds = activeHabits
      .filter(h => h.completedDates.includes(today))
      .map(h => h.id)

    // 连续打卡统计
    const allStreaks = streakTracker.streaks.value
    const totalCheckins = allStreaks.reduce((s, r) => s + r.totalCheckins, 0)
    const avgStreak = allStreaks.length > 0
      ? Math.round(allStreaks.reduce((s, r) => s + r.currentStreak, 0) / allStreaks.length)
      : 0
    const maxStreak = allStreaks.length > 0
      ? Math.max(...allStreaks.map(r => r.currentStreak))
      : 0

    // 徽章统计
    const allBadges = badgeSystem.badges.value
    const unlockedBadges = allBadges.filter(b => b.unlocked).length
    const badgeProgress = allBadges.length > 0
      ? Math.round((unlockedBadges / allBadges.length) * 100)
      : 0

    // 挑战统计
    const activeChallenges = workshop.challenges.value.filter(c => !c.completed).length
    const completedChallenges = workshop.challenges.value.filter(c => c.completed).length
    const challengeProgress = workshop.challenges.value.length > 0
      ? Math.round((completedChallenges / workshop.challenges.value.length) * 100)
      : 0

    // 组合统计
    const activeBundles = bundleSystem.bundles.value.filter(b => b.active).length
    const completedBundlesToday = bundleSystem.bundles.value.filter(
      b => b.active && bundleSystem.isBundleComplete(b.id, todayCompletedIds),
    ).length

    // 失败分析
    const failurePatterns = failureAnalysis.analyzeFailurePatterns()

    // 积分计算
    const totalPoints = workshop.habits.value.reduce(
      (s, h) => s + h.totalCompleted * (HABIT_DIFFICULTY_META[h.difficulty]?.basePoints ?? 1),
      0,
    )
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weeklyPoints = allStreaks.reduce((s, r) => s + r.weeklyCheckins, 0) * 5

    // 等级
    const level = Math.floor(totalPoints / 100) + 1
    const levelTitles = [
      '自律新手', '自律学徒', '自律达人', '自律专家', '自律大师',
      '自律宗师', '自律传说', '自律之神',
    ]
    const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)]

    return {
      totalHabits: habitStats.total,
      activeHabits: habitStats.active,
      todayCompleted: habitStats.todayCompleted,
      totalCheckins,
      avgStreak,
      maxStreak,
      completionRate: activeHabits.length > 0
        ? Math.round((todayCompletedIds.length / activeHabits.length) * 100)
        : 0,

      totalBadges: allBadges.length,
      unlockedBadges,
      badgeProgress,

      activeChallenges,
      completedChallenges,
      challengeProgress,

      activeBundles,
      completedBundlesToday,

      totalFailures: failureAnalysis.failures.value.length,
      recoveryRate: Math.round(failurePatterns.recoveryRate * 100),
      mostCommonFailureReason: failurePatterns.mostCommonReason?.category ?? '无',

      totalPoints,
      weeklyPoints,
      level,
      levelTitle,
    }
  }

  // ============================================================
  // 习惯健康度评分
  // ============================================================

  /**
   * 习惯健康度评分（0-100）
   */
  function getHabitHealthScore(): number {
    const stats = getStats()
    let score = 0

    // 活跃习惯数（0-20 分）
    score += Math.min(stats.activeHabits * 4, 20)

    // 今日完成率（0-30 分）
    score += Math.round(stats.completionRate * 0.3)

    // 平均连续天数（0-20 分）
    score += Math.min(stats.avgStreak * 2, 20)

    // 徽章进度（0-15 分）
    score += Math.round(stats.badgeProgress * 0.15)

    // 恢复率（0-15 分）
    score += Math.round(stats.recoveryRate * 0.15)

    return Math.min(score, 100)
  }

  /**
   * 习惯健康度评估
   */
  function getHabitHealthAssessment(): {
    score: number
    grade: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    label: string
    suggestions: string[]
  } {
    const score = getHabitHealthScore()
    let grade: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    let label: string
    const suggestions: string[] = []

    if (score >= 80) {
      grade = 'excellent'
      label = '自律大师'
      suggestions.push('继续保持，你已经是自律的榜样')
      suggestions.push('可以尝试挑战更高难度的习惯')
    } else if (score >= 60) {
      grade = 'good'
      label = '自律达人'
      suggestions.push('表现不错，还有提升空间')
      suggestions.push('尝试增加习惯组合获得额外奖励')
    } else if (score >= 40) {
      grade = 'fair'
      label = '自律学徒'
      suggestions.push('坚持是关键，不要轻易放弃')
      suggestions.push('从简单习惯开始，逐步增加难度')
    } else if (score >= 20) {
      grade = 'poor'
      label = '自律新手'
      suggestions.push('建议从 1-2 个简单习惯开始')
      suggestions.push('设置每日提醒，避免遗忘')
    } else {
      grade = 'critical'
      label = '需要启动'
      suggestions.push('选择一个最简单的习惯开始')
      suggestions.push('完成第一次打卡就是胜利')
    }

    return { score, grade, label, suggestions }
  }

  return {
    // 基础
    init,
    reset,
    initialized,

    // 底层模块（只读）
    habits: workshop.habits,
    challenges: workshop.challenges,
    rituals: workshop.rituals,
    streaks: streakTracker.streaks,
    badges: badgeSystem.badges,
    failures: failureAnalysis.failures,
    bundles: bundleSystem.bundles,
    suggestions: suggestionEngine.suggestions,

    // 增强操作
    completeHabit,
    checkStreakBreaks,
    recordFailure,
    generateSuggestions,
    adoptSuggestion,

    // 模板操作
    createHabitFromTemplate,
    createChallengeFromTemplate,
    createRitualFromTemplate,
    createBundleFromPreset,

    // 统计
    getStats,
    getHabitHealthScore,
    getHabitHealthAssessment,

    // 原始 workshop 操作（透传）
    addHabit: workshop.addHabit,
    toggleHabit: workshop.toggleHabit,
    removeHabit: workshop.removeHabit,
    updateHabit: workshop.updateHabit,
    getTodayHabits: workshop.getTodayHabits,
    getHabitStats: workshop.getHabitStats,
    createChallenge: workshop.createChallenge,
    advanceChallengeDay: workshop.advanceChallengeDay,
    getActiveChallenges: workshop.getActiveChallenges,
    addRitual: workshop.addRitual,
    completeRitual: workshop.completeRitual,
    getRitualsByTime: workshop.getRitualsByTime,

    // 徽章操作
    getUnlockedBadges: badgeSystem.getUnlockedBadges,
    getBadgesByCategory: badgeSystem.getBadgesByCategory,

    // 失败分析操作
    analyzeFailurePatterns: failureAnalysis.analyzeFailurePatterns,
    getRecoverySuggestions: failureAnalysis.getRecoverySuggestions,
    markRecovered: failureAnalysis.markRecovered,

    // 组合操作
    isBundleComplete: bundleSystem.isBundleComplete,
    calculateBundleBonus: bundleSystem.calculateBundleBonus,

    // 连击操作（INCR-434：段位与排行榜上盘）
    getTopStreaks: streakTracker.getTopStreaks,
    STREAK_LEVELS,

    // 预设库
    HABIT_TEMPLATES,
    CHALLENGE_TEMPLATES,
    RITUAL_TEMPLATES,
    BUNDLE_PRESETS,
    EXTENDED_BADGES,
  }
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 按类别筛选习惯模板
 */
export function getHabitTemplatesByCategory(
  category: HabitTemplate['category'],
): HabitTemplate[] {
  return HABIT_TEMPLATES.filter(t => t.category === category)
}

/**
 * 按难度筛选挑战模板
 */
export function getChallengeTemplatesByDifficulty(
  difficulty: ChallengeTemplate['difficulty'],
): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter(t => t.difficulty === difficulty)
}