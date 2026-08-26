// ============================================================
// 自律工坊 · 智能挑战推荐引擎（P18-2）
// 基于习惯画像的挑战推荐、难度自适应、个性化挑战生成、进度追踪
// ============================================================

import type { Habit, HabitDifficulty, DisciplineChallenge } from './types'
import { HABIT_DIFFICULTY_META } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 挑战推荐 */
export interface ChallengeRecommendation {
  id: string
  /** 推荐标题 */
  title: string
  /** 推荐描述 */
  description: string
  /** 推荐理由 */
  reason: string
  /** 推荐分数 0-100 */
  score: number
  /** 推荐难度 */
  difficulty: HabitDifficulty
  /** 推荐天数 */
  duration: number
  /** 关联习惯 */
  suggestedHabits: string[]
  /** 推荐奖励 */
  suggestedReward?: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 是否已采纳 */
  adopted: boolean
  /** 创建时间 */
  createdAt: string
}

/** 用户习惯画像 */
export interface HabitProfile {
  /** 活跃习惯数 */
  activeHabits: number
  /** 总完成次数 */
  totalCompletions: number
  /** 平均连续天数 */
  avgStreak: number
  /** 最长连续天数 */
  maxStreak: number
  /** 难度分布 */
  difficultyDistribution: Record<HabitDifficulty, number>
  /** 频率分布 */
  frequencyDistribution: Record<string, number>
  /** 完成率 */
  completionRate: number
  /** 最佳时段 */
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  /** 习惯多样性 */
  diversityScore: number
  /** 挑战完成率 */
  challengeCompletionRate: number
  /** 当前等级 */
  level: number
  /** 等级标签 */
  levelLabel: string
}

/** 自适应难度评估 */
export interface DifficultyAssessment {
  /** 当前难度 */
  currentLevel: HabitDifficulty
  /** 建议难度 */
  recommendedLevel: HabitDifficulty
  /** 是否准备好升级 */
  readyForUpgrade: boolean
  /** 升级条件 */
  upgradeConditions: string[]
  /** 已满足条件 */
  metConditions: string[]
  /** 未满足条件 */
  unmetConditions: string[]
  /** 建议 */
  suggestion: string
}

/** 挑战推荐配置 */
export interface ChallengeRecommenderConfig {
  /** 最大推荐数 */
  maxRecommendations: number
  /** 难度提升阈值 */
  upgradeThreshold: number
  /** 最小完成率 */
  minCompletionRate: number
  /** 挑战持续时间范围 */
  durationRange: { min: number; max: number }
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: ChallengeRecommenderConfig = {
  maxRecommendations: 5,
  upgradeThreshold: 0.7,
  minCompletionRate: 0.5,
  durationRange: { min: 7, max: 90 },
}

// 挑战模板
const CHALLENGE_PATTERNS = [
  {
    id: 'pattern_streak',
    category: 'streak',
    titles: ['连续打卡王', '不中断挑战', '连续自律', '坚持达人'],
    descriptions: ['连续完成指定习惯，不中断地挑战自我', '在连续天数内保持所有习惯完成', '用连续打卡证明你的自律能力'],
    getDuration: (profile: HabitProfile) => Math.max(7, profile.avgStreak * 2),
    getDifficulty: (profile: HabitProfile): HabitDifficulty => {
      if (profile.avgStreak >= 30) return 'hard'
      if (profile.avgStreak >= 14) return 'medium'
      return 'easy'
    },
  },
  {
    id: 'pattern_volume',
    category: 'volume',
    titles: ['高产挑战', '量变挑战', '积累达人', '复利挑战'],
    descriptions: ['在指定天数内完成尽可能多的习惯次数', '挑战你的完成量上限', '用量变引发质变'],
    getDuration: () => 21,
    getDifficulty: (profile: HabitProfile): HabitDifficulty => {
      if (profile.activeHabits >= 5) return 'hard'
      if (profile.activeHabits >= 3) return 'medium'
      return 'easy'
    },
  },
  {
    id: 'pattern_variety',
    category: 'variety',
    titles: ['全能挑战', '多元化挑战', '全面发展', '多面手'],
    descriptions: ['同时挑战不同类型的习惯，全面发展', '在多个领域同时取得进步', '打破单一习惯的舒适区'],
    getDuration: () => 14,
    getDifficulty: (profile: HabitProfile): HabitDifficulty => {
      if (profile.diversityScore > 0.7) return 'hard'
      if (profile.diversityScore > 0.4) return 'medium'
      return 'easy'
    },
  },
  {
    id: 'pattern_intensity',
    category: 'intensity',
    titles: ['极限挑战', '强度突破', '超越自我', '攀登者'],
    descriptions: ['挑战更高难度的习惯，突破当前极限', '在短时间内完成高强度习惯组合', '测试你的极限所在'],
    getDuration: () => 7,
    getDifficulty: (profile: HabitProfile): HabitDifficulty => {
      if (profile.level >= 3) return 'extreme'
      if (profile.level >= 2) return 'hard'
      return 'medium'
    },
  },
  {
    id: 'pattern_recovery',
    category: 'recovery',
    titles: ['重生挑战', '东山再起', '重新出发', '复活赛'],
    descriptions: ['为中断后重新开始而设计的温和挑战', '以轻松的方式重新建立习惯节奏', '先完成再完美'],
    getDuration: () => 7,
    getDifficulty: (): HabitDifficulty => 'easy',
  },
]

// ============================================================
// useChallengeRecommender
// ============================================================

export function useChallengeRecommender() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<ChallengeRecommenderConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 用户画像 ----

  /**
   * 构建用户习惯画像
   */
  function buildProfile(habits: Habit[], challenges: DisciplineChallenge[]): HabitProfile {
    const active = habits.filter(h => h.enabled)
    const totalCompletions = active.reduce((s, h) => s + h.totalCompleted, 0)
    const avgStreak = active.length > 0
      ? Math.round(active.reduce((s, h) => s + h.streak, 0) / active.length)
      : 0
    const maxStreak = active.length > 0
      ? Math.max(...active.map(h => h.bestStreak))
      : 0

    // 难度分布
    const difficultyDistribution: Record<HabitDifficulty, number> = {
      easy: 0, medium: 0, hard: 0, extreme: 0,
    }
    for (const h of active) {
      difficultyDistribution[h.difficulty]++
    }

    // 频率分布
    const frequencyDistribution: Record<string, number> = {}
    for (const h of active) {
      frequencyDistribution[h.frequency] = (frequencyDistribution[h.frequency] || 0) + 1
    }

    // 完成率
    const totalDays = active.length > 0
      ? Math.max(...active.map(h => h.completedDates.length), 1)
      : 0
    const completionRate = active.length > 0
      ? totalCompletions / (active.length * totalDays || 1)
      : 0

    // 习惯多样性
    const difficulties = new Set(active.map(h => h.difficulty)).size
    const frequencies = new Set(active.map(h => h.frequency)).size
    const diversityScore = Math.round(((difficulties / 4 + frequencies / 4) / 2) * 100) / 100

    // 挑战完成率
    const challengeCompletionRate = challenges.length > 0
      ? challenges.filter(c => c.completed).length / challenges.length
      : 0

    // 等级
    const level = Math.floor(totalCompletions / 50) + 1
    const levelLabels = ['新手', '入门', '进阶', '高手', '达人', '大师', '宗师', '传说']
    const levelLabel = levelLabels[Math.min(level - 1, levelLabels.length - 1)]

    return {
      activeHabits: active.length,
      totalCompletions,
      avgStreak,
      maxStreak,
      difficultyDistribution,
      frequencyDistribution,
      completionRate: Math.round(completionRate * 100) / 100,
      bestTimeOfDay: 'morning', // 默认值
      diversityScore,
      challengeCompletionRate: Math.round(challengeCompletionRate * 100) / 100,
      level,
      levelLabel,
    }
  }

  // ---- 难度评估 ----

  /**
   * 评估是否准备好升级难度
   */
  function assessDifficulty(habits: Habit[], profile: HabitProfile): DifficultyAssessment {
    const active = habits.filter(h => h.enabled)
    const currentLevels = active.map(h => h.difficulty)
    const avgDifficulty = computeAverageDifficulty(currentLevels)

    const upgradeConditions: string[] = []
    const metConditions: string[] = []
    const unmetConditions: string[] = []

    // 条件1：完成率达标
    const cond1 = `完成率 >= ${Math.round(config.upgradeThreshold * 100)}%`
    upgradeConditions.push(cond1)
    if (profile.completionRate >= config.upgradeThreshold) {
      metConditions.push(cond1)
    } else {
      unmetConditions.push(cond1)
    }

    // 条件2：连续天数
    const cond2 = '平均连续 >= 7 天'
    upgradeConditions.push(cond2)
    if (profile.avgStreak >= 7) {
      metConditions.push(cond2)
    } else {
      unmetConditions.push(cond2)
    }

    // 条件3：活跃习惯数
    const cond3 = '活跃习惯 >= 3 个'
    upgradeConditions.push(cond3)
    if (profile.activeHabits >= 3) {
      metConditions.push(cond3)
    } else {
      unmetConditions.push(cond3)
    }

    const readyForUpgrade = unmetConditions.length === 0

    let recommendedLevel: HabitDifficulty = avgDifficulty
    let suggestion = ''

    if (readyForUpgrade) {
      const nextLevel = getNextDifficulty(avgDifficulty)
      recommendedLevel = nextLevel
      suggestion = `你近阶段达成率较稳定，当前难度区间已较扎实；是否挑战更高难度由你决定`
    } else {
      suggestion = `还需要满足 ${unmetConditions.length} 个条件才能升级：${unmetConditions.join('、')}`
    }

    return {
      currentLevel: avgDifficulty,
      recommendedLevel,
      readyForUpgrade,
      upgradeConditions,
      metConditions,
      unmetConditions,
      suggestion,
    }
  }

  // ---- 挑战推荐 ----

  /**
   * 生成个性化挑战推荐
   */
  function recommend(
    habits: Habit[],
    challenges: DisciplineChallenge[],
    profile?: HabitProfile,
  ): ChallengeRecommendation[] {
    const p = profile || buildProfile(habits, challenges)
    const recommendations: ChallengeRecommendation[] = []

    for (const pattern of CHALLENGE_PATTERNS) {
      const difficulty = pattern.getDifficulty(p)
      const duration = pattern.getDuration(p)
      const score = calculateRecommendationScore(pattern, p, difficulty)
      const titleIdx = Math.floor(Math.random() * pattern.titles.length)

      // 检查是否与已有挑战重复
      const isDuplicate = challenges.some(c =>
        c.title === pattern.titles[titleIdx] && !c.completed,
      )
      if (isDuplicate) continue

      const activeHabits = habits.filter(h => h.enabled)
      const suggestedHabits = selectHabitsForChallenge(activeHabits, pattern.category, difficulty)

      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: pattern.titles[titleIdx],
        description: pattern.descriptions[titleIdx % pattern.descriptions.length],
        reason: generateRecommendationReason(pattern, p),
        score,
        difficulty,
        duration,
        suggestedHabits: suggestedHabits.map(h => h.id),
        suggestedReward: generateSuggestedReward(difficulty, duration),
        priority: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
        adopted: false,
        createdAt: new Date().toISOString(),
      })
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, config.maxRecommendations)
  }

  /**
   * 采纳推荐（创建挑战）
   */
  function adoptRecommendation(
    recommendation: ChallengeRecommendation,
    createChallenge: (title: string, description: string, duration: number, habits: string[], reward?: string) => DisciplineChallenge,
  ): DisciplineChallenge {
    recommendation.adopted = true
    return createChallenge(
      recommendation.title,
      recommendation.description,
      recommendation.duration,
      recommendation.suggestedHabits,
      recommendation.suggestedReward,
    )
  }

  // ---- 自适应挑战 ----

  /**
   * 基于历史表现生成自适应挑战
   */
  function generateAdaptiveChallenge(
    habits: Habit[],
    history: DisciplineChallenge[],
    profile: HabitProfile,
  ): ChallengeRecommendation {
    const active = habits.filter(h => h.enabled)

    // 分析历史挑战
    const completedChallenges = history.filter(c => c.completed)
    const avgDuration = completedChallenges.length > 0
      ? Math.round(completedChallenges.reduce((s, c) => s + c.duration, 0) / completedChallenges.length)
      : 14

    // 自适应难度
    const assessment = assessDifficulty(habits, profile)
    const difficulty = assessment.readyForUpgrade
      ? assessment.recommendedLevel
      : assessment.currentLevel

    // 自适应时长
    const duration = Math.min(
      config.durationRange.max,
      Math.max(config.durationRange.min, avgDuration + (assessment.readyForUpgrade ? 7 : 0)),
    )

    const reason = assessment.readyForUpgrade
      ? `基于你的持续进步数据，与下一难度「${HABIT_DIFFICULTY_META[difficulty].label}」重合度较高`
      : `基于当前水平，${HABIT_DIFFICULTY_META[difficulty].label} 难度最适合你`

    return {
      id: `adaptive_${Date.now()}`,
      title: '自适应挑战',
      description: `为期 ${duration} 天的 ${HABIT_DIFFICULTY_META[difficulty].label} 难度挑战，根据你的习惯画像自动生成`,
      reason,
      score: 85,
      difficulty,
      duration,
      suggestedHabits: active.map(h => h.id),
      suggestedReward: generateSuggestedReward(difficulty, duration),
      priority: 'high',
      adopted: false,
      createdAt: new Date().toISOString(),
    }
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  function calculateRecommendationScore(
    _pattern: typeof CHALLENGE_PATTERNS[number],
    profile: HabitProfile,
    difficulty: HabitDifficulty,
  ): number {
    let score = 50

    // 基于活跃习惯数
    if (profile.activeHabits >= 5) score += 10
    else if (profile.activeHabits >= 3) score += 5

    // 基于完成率
    if (profile.completionRate > 0.8) score += 15
    else if (profile.completionRate > 0.6) score += 10
    else if (profile.completionRate > 0.4) score += 5

    // 基于连续天数
    if (profile.avgStreak >= 14) score += 10
    else if (profile.avgStreak >= 7) score += 5

    // 基于挑战历史
    if (profile.challengeCompletionRate > 0.8) score += 10
    else if (profile.challengeCompletionRate > 0.5) score += 5

    // 难度适配
    const diffScore = HABIT_DIFFICULTY_META[difficulty]?.basePoints ?? 1
    score += diffScore * 2

    // 多样性
    score += Math.round(profile.diversityScore * 10)

    return Math.min(100, score)
  }

  function generateRecommendationReason(
    pattern: typeof CHALLENGE_PATTERNS[number],
    profile: HabitProfile,
  ): string {
    switch (pattern.category) {
      case 'streak':
        return `你的平均连续 ${profile.avgStreak} 天，适合挑战更长连续记录`
      case 'volume':
        return `你有 ${profile.activeHabits} 个活跃习惯，可以挑战更高完成量`
      case 'variety':
        return `你的习惯多样性 ${Math.round(profile.diversityScore * 100)}%，适合拓展新领域`
      case 'intensity':
        return `你的等级为 ${profile.levelLabel}，可以尝试更高强度挑战`
      case 'recovery':
        return '温和的挑战帮助你重新建立习惯节奏'
      default:
        return '基于你的习惯画像匹配生成'
    }
  }

  function selectHabitsForChallenge(
    habits: Habit[],
    category: string,
    difficulty: HabitDifficulty,
  ): Habit[] {
    switch (category) {
      case 'streak':
        // 选择连续天数最长的习惯
        return [...habits].sort((a, b) => b.streak - a.streak).slice(0, 3)
      case 'volume':
        // 选择所有活跃习惯
        return habits
      case 'variety':
        // 选择不同难度的习惯
        const selected: Habit[] = []
        const uniqueDiff = new Set<HabitDifficulty>()
        for (const h of habits) {
          if (!uniqueDiff.has(h.difficulty)) {
            selected.push(h)
            uniqueDiff.add(h.difficulty)
          }
        }
        return selected
      case 'intensity':
        // 选择高难度习惯
        return habits.filter(h => {
          const diffOrder = ['easy', 'medium', 'hard', 'extreme']
          return diffOrder.indexOf(h.difficulty) >= diffOrder.indexOf(difficulty)
        })
      case 'recovery':
        // 选择低难度习惯
        return habits.filter(h => h.difficulty === 'easy')
      default:
        return habits.slice(0, 3)
    }
  }

  function computeAverageDifficulty(difficulties: HabitDifficulty[]): HabitDifficulty {
    const order: HabitDifficulty[] = ['easy', 'medium', 'hard', 'extreme']
    if (difficulties.length === 0) return 'easy'
    const avgIdx = difficulties.reduce((s, d) => s + order.indexOf(d), 0) / difficulties.length
    return order[Math.round(avgIdx)] || 'easy'
  }

  function getNextDifficulty(current: HabitDifficulty): HabitDifficulty {
    const order: HabitDifficulty[] = ['easy', 'medium', 'hard', 'extreme']
    const idx = order.indexOf(current)
    return order[Math.min(idx + 1, order.length - 1)]
  }

  function generateSuggestedReward(
    difficulty: HabitDifficulty,
    duration: number,
  ): string {
    const basePoints = HABIT_DIFFICULTY_META[difficulty]?.basePoints ?? 1
    const totalPoints = basePoints * duration
    if (totalPoints >= 50) return '解锁特殊成就徽章'
    if (totalPoints >= 30) return '获得定制称号'
    return '获得额外积分奖励'
  }

  return {
    config,
    setConfig,
    buildProfile,
    assessDifficulty,
    recommend,
    adoptRecommendation,
    generateAdaptiveChallenge,
    CHALLENGE_PATTERNS,
  }
}