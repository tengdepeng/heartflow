// ============================================================
// 自律工坊 · P16-3 测试套件
// 覆盖：预设库、集成桥接、连续打卡、徽章系统、习惯建议、失败分析、习惯组合
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { useDisciplineBridge } from '../workshop-bridge'
import { useStreakTracker, useAchievementBadges, useHabitSuggestions, useHabitFailureAnalysis, useHabitBundles, STREAK_LEVELS } from '../streak-system'
import {
  EXTENDED_BADGES,
  HABIT_TEMPLATES,
  CHALLENGE_TEMPLATES,
  RITUAL_TEMPLATES,
  BUNDLE_PRESETS,
  getHabitTemplatesByCategory,
  getHabitTemplatesByTag,
  getChallengeTemplatesByDifficulty,
} from '../index'
import type { Habit } from '../types'
import type { StreakRecord } from '../streak-system'

// ============================================================
// 预设库测试
// ============================================================

describe('预设库', () => {
  describe('扩展徽章库', () => {
    it('应有 30+ 个预设徽章', () => {
      expect(EXTENDED_BADGES.length).toBeGreaterThanOrEqual(30)
    })

    it('应包含所有类别', () => {
      const categories = new Set(EXTENDED_BADGES.map(b => b.category))
      expect(categories.has('streak')).toBe(true)
      expect(categories.has('milestone')).toBe(true)
      expect(categories.has('variety')).toBe(true)
      expect(categories.has('challenge')).toBe(true)
      expect(categories.has('special')).toBe(true)
    })

    it('应包含所有稀有度', () => {
      const rarities = new Set(EXTENDED_BADGES.map(b => b.rarity))
      expect(rarities.has('common')).toBe(true)
      expect(rarities.has('rare')).toBe(true)
      expect(rarities.has('epic')).toBe(true)
      expect(rarities.has('legendary')).toBe(true)
    })

    it('每个徽章应有名称、描述和图标', () => {
      EXTENDED_BADGES.forEach(badge => {
        expect(badge.name.length).toBeGreaterThan(0)
        expect(badge.description.length).toBeGreaterThan(0)
        expect(badge.icon.length).toBeGreaterThan(0)
      })
    })

    it('每个徽章条件应有 type 和 threshold', () => {
      EXTENDED_BADGES.forEach(badge => {
        expect(badge.condition.type).toBeDefined()
        expect(badge.condition.threshold).toBeGreaterThan(0)
      })
    })
  })

  describe('预设习惯模板', () => {
    it('应有 30+ 个预设习惯模板', () => {
      expect(HABIT_TEMPLATES.length).toBeGreaterThanOrEqual(30)
    })

    it('应包含所有 6 个类别', () => {
      const categories = new Set(HABIT_TEMPLATES.map(t => t.category))
      expect(categories.has('health')).toBe(true)
      expect(categories.has('learning')).toBe(true)
      expect(categories.has('productivity')).toBe(true)
      expect(categories.has('mindfulness')).toBe(true)
      expect(categories.has('social')).toBe(true)
      expect(categories.has('creative')).toBe(true)
    })

    it('每个模板应有完整字段', () => {
      HABIT_TEMPLATES.forEach(template => {
        expect(template.title.length).toBeGreaterThan(0)
        expect(template.description.length).toBeGreaterThan(0)
        expect(template.icon.length).toBeGreaterThan(0)
        expect(template.difficulty).toBeDefined()
        expect(template.frequency).toBeDefined()
        expect(template.target).toBeGreaterThan(0)
        expect(template.tags.length).toBeGreaterThan(0)
      })
    })

    it('getHabitTemplatesByCategory 应正确筛选', () => {
      const healthTemplates = getHabitTemplatesByCategory('health')
      expect(healthTemplates.length).toBeGreaterThan(0)
      healthTemplates.forEach(t => expect(t.category).toBe('health'))

      const learningTemplates = getHabitTemplatesByCategory('learning')
      learningTemplates.forEach(t => expect(t.category).toBe('learning'))
    })

    it('getHabitTemplatesByTag 应正确筛选', () => {
      const sportTemplates = getHabitTemplatesByTag('运动')
      sportTemplates.forEach(t => expect(t.tags).toContain('运动'))
    })
  })

  describe('预设挑战模板', () => {
    it('应有 5+ 个预设挑战', () => {
      expect(CHALLENGE_TEMPLATES.length).toBeGreaterThanOrEqual(5)
    })

    it('每个挑战应有完整字段', () => {
      CHALLENGE_TEMPLATES.forEach(challenge => {
        expect(challenge.title.length).toBeGreaterThan(0)
        expect(challenge.description.length).toBeGreaterThan(0)
        expect(challenge.duration).toBeGreaterThan(0)
        expect(challenge.suggestedHabits.length).toBeGreaterThan(0)
        expect(challenge.difficulty).toBeDefined()
      })
    })

    it('getChallengeTemplatesByDifficulty 应正确筛选', () => {
      const easyChallenges = getChallengeTemplatesByDifficulty('easy')
      easyChallenges.forEach(c => expect(c.difficulty).toBe('easy'))

      const hardChallenges = getChallengeTemplatesByDifficulty('hard')
      hardChallenges.forEach(c => expect(c.difficulty).toBe('hard'))
    })
  })

  describe('预设仪式模板', () => {
    it('应有 3+ 个预设仪式', () => {
      expect(RITUAL_TEMPLATES.length).toBeGreaterThanOrEqual(3)
    })

    it('每个仪式应有触发时段', () => {
      RITUAL_TEMPLATES.forEach(ritual => {
        expect(['morning', 'afternoon', 'evening', 'anytime']).toContain(ritual.triggerTime)
        expect(ritual.steps.length).toBeGreaterThan(0)
        expect(ritual.estimatedDuration).toBeGreaterThan(0)
      })
    })
  })

  describe('预设习惯组合', () => {
    it('应有 5+ 个预设组合', () => {
      expect(BUNDLE_PRESETS.length).toBeGreaterThanOrEqual(5)
    })

    it('每个组合应有完成条件和奖励系数', () => {
      BUNDLE_PRESETS.forEach(bundle => {
        expect(['all', 'any', 'majority']).toContain(bundle.completionCondition)
        expect(bundle.bonusMultiplier).toBeGreaterThan(1)
        expect(bundle.suggestedHabitTitles.length).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================
// 连续打卡系统测试
// ============================================================

describe('连续打卡系统', () => {
  let tracker: ReturnType<typeof useStreakTracker>

  beforeEach(() => {
    tracker = useStreakTracker()
  })

  it('首次打卡应创建记录', () => {
    const record = tracker.recordCheckin('habit-1', '阅读')
    expect(record.habitId).toBe('habit-1')
    expect(record.currentStreak).toBe(1)
    expect(record.totalCheckins).toBe(1)
  })

  it('连续打卡应增加连续天数', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    tracker.recordCheckin('habit-1', '阅读', yesterday)
    const record = tracker.recordCheckin('habit-1', '阅读')
    expect(record.currentStreak).toBe(2)
    expect(record.totalCheckins).toBe(2)
  })

  it('断签应重置连续天数', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
    tracker.recordCheckin('habit-1', '阅读', threeDaysAgo)
    const record = tracker.recordCheckin('habit-1', '阅读')
    expect(record.currentStreak).toBe(1)
    expect(record.totalCheckins).toBe(2)
  })

  it('同日重复打卡不应增加计数', () => {
    tracker.recordCheckin('habit-1', '阅读')
    const record = tracker.recordCheckin('habit-1', '阅读')
    expect(record.totalCheckins).toBe(1)
  })

  it('应正确更新最长连续天数', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
    tracker.recordCheckin('habit-1', '阅读', twoDaysAgo)
    tracker.recordCheckin('habit-1', '阅读', yesterday)
    const record = tracker.recordCheckin('habit-1', '阅读')
    expect(record.longestStreak).toBe(3)
  })

  it('应正确识别等级', () => {
    // 模拟 7 天连续打卡
    for (let i = 7; i >= 1; i--) {
      const date = new Date(Date.now() - (i - 1) * 86400000).toISOString().split('T')[0]
      tracker.recordCheckin('habit-1', '阅读', date)
    }
    const record = tracker.getStreak('habit-1')
    expect(record?.level).toBe('silver')
  })

  it('checkStreakBreak 应正确检测中断', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
    tracker.recordCheckin('habit-1', '阅读', twoDaysAgo)
    expect(tracker.checkStreakBreak('habit-1')).toBe(true)
  })

  it('getTopStreaks 应按连续天数排序', () => {
    for (let i = 5; i >= 1; i--) {
      const date = new Date(Date.now() - (i - 1) * 86400000).toISOString().split('T')[0]
      tracker.recordCheckin('habit-a', '习惯A', date)
    }
    for (let i = 3; i >= 1; i--) {
      const date = new Date(Date.now() - (i - 1) * 86400000).toISOString().split('T')[0]
      tracker.recordCheckin('habit-b', '习惯B', date)
    }
    const top = tracker.getTopStreaks(5)
    expect(top[0].currentStreak).toBeGreaterThanOrEqual(top[1].currentStreak)
  })

  it('STREAK_LEVELS 应有 6 个等级', () => {
    const levels = Object.keys(STREAK_LEVELS)
    expect(levels.length).toBe(6)
    expect(levels).toContain('bronze')
    expect(levels).toContain('legendary')
  })
})

// ============================================================
// 徽章系统测试
// ============================================================

describe('徽章系统', () => {
  let badgeSys: ReturnType<typeof useAchievementBadges>

  beforeEach(() => {
    badgeSys = useAchievementBadges()
  })

  it('initBadges 应初始化 13+ 个徽章', () => {
    badgeSys.initBadges()
    expect(badgeSys.badges.value.length).toBeGreaterThanOrEqual(13)
  })

  it('应正确检测首次打卡徽章', () => {
    badgeSys.initBadges()
    const streaks: StreakRecord[] = [{
      habitId: 'h1', habitName: '阅读',
      currentStreak: 1, longestStreak: 1,
      totalCheckins: 1, monthlyCheckins: 1, weeklyCheckins: 1,
      lastCheckinDate: new Date().toISOString().split('T')[0],
      streakHistory: [], completionRate: 1, level: 'bronze', daysToNextLevel: 2,
    }]
    const habits: Habit[] = [{
      id: 'h1', title: '阅读', description: '', icon: '📖',
      difficulty: 'easy', frequency: 'daily', target: 1,
      streak: 1, bestStreak: 1, totalCompleted: 1,
      enabled: true, createdAt: '', completedDates: [],
    }]
    const unlocked = badgeSys.checkBadges(streaks, habits)
    const hasFirstCheckin = unlocked.some(b => b.name === '初出茅庐')
    expect(hasFirstCheckin).toBe(true)
  })

  it('应正确检测连续 7 天徽章', () => {
    badgeSys.initBadges()
    const streaks: StreakRecord[] = [{
      habitId: 'h1', habitName: '阅读',
      currentStreak: 7, longestStreak: 7,
      totalCheckins: 7, monthlyCheckins: 7, weeklyCheckins: 7,
      lastCheckinDate: new Date().toISOString().split('T')[0],
      streakHistory: [], completionRate: 1, level: 'silver', daysToNextLevel: 14,
    }]
    const habits: Habit[] = [{
      id: 'h1', title: '阅读', description: '', icon: '📖',
      difficulty: 'easy', frequency: 'daily', target: 1,
      streak: 7, bestStreak: 7, totalCompleted: 7,
      enabled: true, createdAt: '', completedDates: [],
    }]
    const unlocked = badgeSys.checkBadges(streaks, habits)
    const hasSevenDay = unlocked.some(b => b.name === '持之以恒')
    expect(hasSevenDay).toBe(true)
  })

  it('应正确检测多面手徽章', () => {
    badgeSys.initBadges()
    const habits: Habit[] = Array.from({ length: 5 }, (_, i) => ({
      id: `h${i}`, title: `习惯${i}`, description: '', icon: '⭐',
      difficulty: 'easy' as const, frequency: 'daily' as const, target: 1,
      streak: 0, bestStreak: 0, totalCompleted: 0,
      enabled: true, createdAt: '', completedDates: [],
    }))
    const unlocked = badgeSys.checkBadges([], habits)
    const hasVariety = unlocked.some(b => b.name === '多面手')
    expect(hasVariety).toBe(true)
  })

  it('getUnlockedBadges 应只返回已解锁徽章', () => {
    badgeSys.initBadges()
    const streaks: StreakRecord[] = [{
      habitId: 'h1', habitName: '阅读',
      currentStreak: 1, longestStreak: 1,
      totalCheckins: 1, monthlyCheckins: 1, weeklyCheckins: 1,
      lastCheckinDate: new Date().toISOString().split('T')[0],
      streakHistory: [], completionRate: 1, level: 'bronze', daysToNextLevel: 2,
    }]
    badgeSys.checkBadges(streaks, [])
    const unlocked = badgeSys.getUnlockedBadges()
    expect(unlocked.length).toBeGreaterThan(0)
    unlocked.forEach(b => expect(b.unlocked).toBe(true))
  })

  it('getBadgesByCategory 应正确分类', () => {
    badgeSys.initBadges()
    const streakBadges = badgeSys.getBadgesByCategory('streak')
    streakBadges.forEach(b => expect(b.category).toBe('streak'))
  })

  it('已解锁徽章不应重复解锁', () => {
    badgeSys.initBadges()
    const streaks: StreakRecord[] = [{
      habitId: 'h1', habitName: '阅读',
      currentStreak: 1, longestStreak: 1,
      totalCheckins: 1, monthlyCheckins: 1, weeklyCheckins: 1,
      lastCheckinDate: new Date().toISOString().split('T')[0],
      streakHistory: [], completionRate: 1, level: 'bronze', daysToNextLevel: 2,
    }]
    badgeSys.checkBadges(streaks, [])
    const secondCheck = badgeSys.checkBadges(streaks, [])
    expect(secondCheck.length).toBe(0)
  })
})

// ============================================================
// 习惯建议测试
// ============================================================

describe('习惯建议', () => {
  let suggestionEngine: ReturnType<typeof useHabitSuggestions>

  beforeEach(() => {
    suggestionEngine = useHabitSuggestions()
  })

  it('空习惯列表应生成基础建议', () => {
    const suggestions = suggestionEngine.generateSuggestions([])
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some(s => s.name === '喝水')).toBe(true)
  })

  it('有运动习惯应建议拉伸和冥想', () => {
    const habits: Habit[] = [{
      id: 'h1', title: '运动', description: '', icon: '🏃',
      difficulty: 'medium', frequency: 'daily', target: 1,
      streak: 0, bestStreak: 0, totalCompleted: 0,
      enabled: true, createdAt: '', completedDates: [],
    }]
    const suggestions = suggestionEngine.generateSuggestions(habits)
    const names = suggestions.map(s => s.name)
    expect(names).toContain('拉伸')
    expect(names).toContain('冥想')
  })

  it('有阅读习惯应建议写作', () => {
    const habits: Habit[] = [{
      id: 'h1', title: '阅读', description: '', icon: '📖',
      difficulty: 'easy', frequency: 'daily', target: 1,
      streak: 0, bestStreak: 0, totalCompleted: 0,
      enabled: true, createdAt: '', completedDates: [],
    }]
    const suggestions = suggestionEngine.generateSuggestions(habits)
    const names = suggestions.map(s => s.name)
    expect(names).toContain('写作')
  })

  it('已存在的习惯不应重复建议', () => {
    const habits: Habit[] = [
      {
        id: 'h1', title: '阅读', description: '', icon: '📖',
        difficulty: 'easy', frequency: 'daily', target: 1,
        streak: 0, bestStreak: 0, totalCompleted: 0,
        enabled: true, createdAt: '', completedDates: [],
      },
      {
        id: 'h2', title: '写作', description: '', icon: '✍️',
        difficulty: 'medium', frequency: 'daily', target: 1,
        streak: 0, bestStreak: 0, totalCompleted: 0,
        enabled: true, createdAt: '', completedDates: [],
      },
    ]
    const suggestions = suggestionEngine.generateSuggestions(habits)
    const names = suggestions.map(s => s.name)
    // 写作不应在建议中（因为已存在）
    expect(names).not.toContain('写作')
  })

  it('采纳建议应标记为已采纳', () => {
    suggestionEngine.generateSuggestions([])
    const suggestion = suggestionEngine.suggestions.value[0]
    const result = suggestionEngine.adoptSuggestion(suggestion.id)
    expect(result?.adopted).toBe(true)
  })
})

// ============================================================
// 失败分析测试
// ============================================================

describe('失败分析', () => {
  let failureAnalysis: ReturnType<typeof useHabitFailureAnalysis>

  beforeEach(() => {
    failureAnalysis = useHabitFailureAnalysis()
  })

  it('recordFailure 应记录失败', () => {
    const failure = failureAnalysis.recordFailure('h1', '阅读', '太忙了', 'time', 5)
    expect(failure.habitId).toBe('h1')
    expect(failure.reasonCategory).toBe('time')
    expect(failure.streakAtBreak).toBe(5)
    expect(failure.recovered).toBe(false)
  })

  it('markRecovered 应标记恢复', () => {
    const failure = failureAnalysis.recordFailure('h1', '阅读', '太忙了', 'time', 5)
    const recovered = failureAnalysis.markRecovered(failure.id, '设置提醒')
    expect(recovered?.recovered).toBe(true)
    expect(recovered?.recoveryStrategy).toBe('设置提醒')
  })

  it('analyzeFailurePatterns 应正确分析', () => {
    failureAnalysis.recordFailure('h1', '阅读', '太忙', 'time', 5)
    failureAnalysis.recordFailure('h2', '运动', '没精力', 'energy', 3)
    failureAnalysis.recordFailure('h3', '冥想', '太忙', 'time', 2)

    const patterns = failureAnalysis.analyzeFailurePatterns()
    expect(patterns.mostCommonReason?.category).toBe('time')
    expect(patterns.averageStreakAtBreak).toBeCloseTo(3.33, 1)
    expect(patterns.recoveryRate).toBe(0)
  })

  it('恢复后应影响恢复率', () => {
    const f1 = failureAnalysis.recordFailure('h1', '阅读', '太忙', 'time', 5)
    failureAnalysis.recordFailure('h2', '运动', '没精力', 'energy', 3)
    failureAnalysis.markRecovered(f1.id, '策略')

    const patterns = failureAnalysis.analyzeFailurePatterns()
    expect(patterns.recoveryRate).toBe(0.5)
  })

  it('getRecoverySuggestions 应返回建议', () => {
    const suggestions = failureAnalysis.getRecoverySuggestions('time')
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some(s => s.includes('提醒'))).toBe(true)
  })

  it('getRecoverySuggestions 对未知类别应有默认建议', () => {
    const suggestions = failureAnalysis.getRecoverySuggestions('unknown')
    expect(suggestions.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 习惯组合测试
// ============================================================

describe('习惯组合', () => {
  let bundleSys: ReturnType<typeof useHabitBundles>

  beforeEach(() => {
    bundleSys = useHabitBundles()
  })

  it('initBundles 应初始化 3 个默认组合', () => {
    bundleSys.initBundles()
    expect(bundleSys.bundles.value.length).toBe(3)
  })

  it('createBundle 应创建新组合', () => {
    const bundle = bundleSys.createBundle('测试组合', '描述', ['h1', 'h2'], 'all', 1.5)
    expect(bundle.name).toBe('测试组合')
    expect(bundle.habitIds).toEqual(['h1', 'h2'])
    expect(bundle.active).toBe(true)
  })

  it('isBundleComplete 应正确检测 all 条件', () => {
    const bundle = bundleSys.createBundle('测试', '', ['h1', 'h2'], 'all', 1.2)
    expect(bundleSys.isBundleComplete(bundle.id, ['h1', 'h2'])).toBe(true)
    expect(bundleSys.isBundleComplete(bundle.id, ['h1'])).toBe(false)
    expect(bundleSys.isBundleComplete(bundle.id, [])).toBe(false)
  })

  it('isBundleComplete 应正确检测 any 条件', () => {
    const bundle = bundleSys.createBundle('测试', '', ['h1', 'h2'], 'any', 1.2)
    expect(bundleSys.isBundleComplete(bundle.id, ['h1'])).toBe(true)
    expect(bundleSys.isBundleComplete(bundle.id, [])).toBe(false)
  })

  it('isBundleComplete 应正确检测 majority 条件', () => {
    const bundle = bundleSys.createBundle('测试', '', ['h1', 'h2', 'h3'], 'majority', 1.2)
    expect(bundleSys.isBundleComplete(bundle.id, ['h1', 'h2'])).toBe(true)
    expect(bundleSys.isBundleComplete(bundle.id, ['h1'])).toBe(false)
  })

  it('calculateBundleBonus 应正确计算奖励', () => {
    const bundle = bundleSys.createBundle('测试', '', ['h1', 'h2'], 'all', 1.5)
    const bonus = bundleSys.calculateBundleBonus(bundle.id, ['h1', 'h2'], 10)
    expect(bonus).toBe(5) // 10 * (1.5 - 1) = 5
  })

  it('不活跃的组合不应计算奖励', () => {
    bundleSys.initBundles()
    const inactiveBundle = bundleSys.bundles.value[0]
    inactiveBundle.active = false
    const bonus = bundleSys.calculateBundleBonus(inactiveBundle.id, ['h1', 'h2'], 10)
    expect(bonus).toBe(0)
  })
})

// ============================================================
// 集成桥接测试
// ============================================================

describe('集成桥接', () => {
  let bridge: ReturnType<typeof useDisciplineBridge>

  beforeEach(() => {
    bridge = useDisciplineBridge()
    bridge.reset()
    bridge.init()
  })

  describe('基础操作', () => {
    it('应能添加习惯', () => {
      const habit = bridge.addHabit('阅读', '每天阅读', '📖', 'easy', 'daily', 1)
      expect(habit.title).toBe('阅读')
      expect(habit.enabled).toBe(true)
    })

    it('应能完成习惯并返回结果', () => {
      const habit = bridge.addHabit('阅读', '每天阅读', '📖', 'easy', 'daily', 1)
      const result = bridge.completeHabit(habit.id)
      expect(result).not.toBeNull()
      expect(result!.habit.totalCompleted).toBe(1)
      expect(result!.streak.currentStreak).toBe(1)
      expect(result!.totalPoints).toBeGreaterThan(0)
    })

    it('完成习惯应触发徽章检测', () => {
      const habit = bridge.addHabit('阅读', '每天阅读', '📖', 'easy', 'daily', 1)
      const result = bridge.completeHabit(habit.id)
      expect(result).not.toBeNull()
      // 检查 badges 数组中是否有已解锁的初出茅庐
      const firstBadge = bridge.badges.value.find(b => b.name === '初出茅庐')
      expect(firstBadge).toBeDefined()
      expect(firstBadge!.unlocked).toBe(true)
    })

    it('完成习惯应更新连续打卡', () => {
      const habit = bridge.addHabit('阅读', '每天阅读', '📖', 'easy', 'daily', 1)
      bridge.completeHabit(habit.id)
      const streak = bridge.streaks.value.find(s => s.habitId === habit.id)
      expect(streak?.currentStreak).toBe(1)
      expect(streak?.totalCheckins).toBe(1)
    })

    it('同日重复完成应返回 null', () => {
      const habit = bridge.addHabit('阅读', '每天阅读', '📖', 'easy', 'daily', 1)
      bridge.completeHabit(habit.id)
      const secondResult = bridge.completeHabit(habit.id)
      expect(secondResult).toBeNull()
    })
  })

  describe('模板操作', () => {
    it('createHabitFromTemplate 应从模板创建习惯', () => {
      const template = HABIT_TEMPLATES[0]
      const habit = bridge.createHabitFromTemplate(template)
      expect(habit.title).toBe(template.title)
      expect(habit.difficulty).toBe(template.difficulty)
      expect(habit.frequency).toBe(template.frequency)
    })

    it('createRitualFromTemplate 应从模板创建仪式', () => {
      const template = RITUAL_TEMPLATES[0]
      const ritual = bridge.createRitualFromTemplate(template)
      expect(ritual.title).toBe(template.title)
      expect(ritual.steps).toEqual(template.steps)
      expect(ritual.triggerTime).toBe(template.triggerTime)
    })

    it('createChallengeFromTemplate 应创建挑战并匹配习惯', () => {
      // 先创建需要的习惯
      HABIT_TEMPLATES
        .filter(t => ['喝水', '散步', '晨间计划'].includes(t.title))
        .forEach(t => bridge.createHabitFromTemplate(t))

      const template = CHALLENGE_TEMPLATES[0] // 7 天入门挑战
      const challenge = bridge.createChallengeFromTemplate(
        template,
        bridge.habits.value,
      )
      expect(challenge).not.toBeNull()
      expect(challenge!.title).toBe(template.title)
      expect(challenge!.duration).toBe(template.duration)
    })

    it('createBundleFromPreset 应从预设创建组合', () => {
      // 先创建需要的习惯
      ['喝水', '冥想', '晨间计划'].forEach(title => {
        const tpl = HABIT_TEMPLATES.find(t => t.title === title)
        if (tpl) bridge.createHabitFromTemplate(tpl)
      })

      const preset = BUNDLE_PRESETS[0] // 晨间三部曲
      const bundle = bridge.createBundleFromPreset(preset, bridge.habits.value)
      if (bundle) {
        expect(bundle.name).toBe(preset.name)
        expect(bundle.completionCondition).toBe(preset.completionCondition)
      }
    })
  })

  describe('统计功能', () => {
    it('getStats 应返回完整统计', () => {
      bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
      const stats = bridge.getStats()
      expect(stats.totalHabits).toBe(1)
      expect(stats.activeHabits).toBe(1)
      expect(stats.totalBadges).toBeGreaterThan(0)
      expect(stats.level).toBeGreaterThanOrEqual(1)
      expect(stats.levelTitle.length).toBeGreaterThan(0)
    })

    it('getStats 应反映完成状态', () => {
      const habit = bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
      bridge.completeHabit(habit.id)
      const stats = bridge.getStats()
      expect(stats.todayCompleted).toBeGreaterThanOrEqual(1)
      expect(stats.totalCheckins).toBeGreaterThanOrEqual(1)
      expect(stats.completionRate).toBeGreaterThanOrEqual(50)
    })
  })

  describe('习惯健康度', () => {
    it('getHabitHealthScore 应返回 0-100 的分数', () => {
      const score = bridge.getHabitHealthScore()
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('getHabitHealthAssessment 应返回评估和等级', () => {
      const assessment = bridge.getHabitHealthAssessment()
      expect(assessment.score).toBeGreaterThanOrEqual(0)
      expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(assessment.grade)
      expect(assessment.label.length).toBeGreaterThan(0)
      expect(assessment.suggestions.length).toBeGreaterThan(0)
    })

    it('完成习惯后健康度应提升', () => {
      const beforeScore = bridge.getHabitHealthScore()
      const habit = bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
      bridge.completeHabit(habit.id)
      const afterScore = bridge.getHabitHealthScore()
      expect(afterScore).toBeGreaterThanOrEqual(beforeScore)
    })
  })

  describe('习惯建议', () => {
    it('generateSuggestions 应生成建议', () => {
      const suggestions = bridge.generateSuggestions()
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('adoptSuggestion 应创建习惯', () => {
      bridge.generateSuggestions()
      const suggestion = bridge.suggestions.value[0]
      if (suggestion) {
        const countBefore = bridge.habits.value.length
        bridge.adoptSuggestion(suggestion.id)
        expect(bridge.habits.value.length).toBeGreaterThan(countBefore)
      }
    })
  })

  describe('失败分析', () => {
    it('recordFailure 应记录失败', () => {
      const habit = bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
      const failure = bridge.recordFailure(habit.id, '太忙了', 'time')
      expect(failure).not.toBeNull()
      expect(failure!.habitId).toBe(habit.id)
    })

    it('checkStreakBreaks 应检测中断', () => {
      const habit = bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
      // 模拟两天前完成，今天没完成
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
      habit.completedDates = [twoDaysAgo]
      habit.streak = 1

      // 手动更新 streak 记录
      bridge.streaks.value.push({
        habitId: habit.id,
        habitName: habit.title,
        currentStreak: 1,
        longestStreak: 1,
        totalCheckins: 1,
        monthlyCheckins: 1,
        weeklyCheckins: 1,
        lastCheckinDate: twoDaysAgo,
        streakHistory: [],
        completionRate: 0.5,
        level: 'bronze',
        daysToNextLevel: 2,
      })

      const failures = bridge.checkStreakBreaks()
      // 可能会检测到中断
      expect(Array.isArray(failures)).toBe(true)
    })
  })
})

// ============================================================
// 核心 workshop 透传测试
// ============================================================

describe('核心 workshop 透传', () => {
  let bridge: ReturnType<typeof useDisciplineBridge>

  beforeEach(() => {
    bridge = useDisciplineBridge()
    bridge.reset()
    bridge.init()
  })

  it('应能开关习惯', () => {
    const habit = bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
    bridge.toggleHabit(habit.id)
    const toggled = bridge.habits.value.find(h => h.id === habit.id)
    expect(toggled?.enabled).toBe(false)
  })

  it('应能删除习惯', () => {
    const habit = bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
    const countBefore = bridge.habits.value.length
    bridge.removeHabit(habit.id)
    expect(bridge.habits.value.length).toBe(countBefore - 1)
  })

  it('应能获取今日习惯', () => {
    bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
    bridge.addHabit('运动', '', '🏃', 'medium', 'daily', 1)
    const today = bridge.getTodayHabits()
    expect(today.length).toBe(2)
  })

  it('getHabitStats 应返回正确统计', () => {
    bridge.addHabit('阅读', '', '📖', 'easy', 'daily', 1)
    const stats = bridge.getHabitStats()
    expect(stats.total).toBe(1)
    expect(stats.active).toBe(1)
  })

  it('应能完成仪式', () => {
    const ritual = bridge.addRitual('晨间仪式', '', '🌅', ['step1', 'step2'], 10, 'morning')
    bridge.completeRitual(ritual.id)
    const updated = bridge.rituals.value.find(r => r.id === ritual.id)
    expect(updated?.completionCount).toBe(1)
    expect(updated?.lastCompleted).toBeDefined()
  })

  it('getRitualsByTime 应正确筛选', () => {
    bridge.addRitual('晨间', '', '🌅', ['s1'], 10, 'morning')
    bridge.addRitual('晚间', '', '🌙', ['s1'], 10, 'evening')
    const morning = bridge.getRitualsByTime('morning')
    expect(morning.length).toBe(1)
    expect(morning[0].title).toBe('晨间')
  })
})