// ============================================================
// P25 认知模块 · 冥想分析测试套件
// 覆盖：常量 / 冥想分析 / 连续追踪 / 环境音推荐 / 洞察生成
// 蓝图：约 42 个测试
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'

// ============================================================
// 共享 KV 存储（vi.hoisted）
// ============================================================

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

// ============================================================
// Mock engine/storage
// ============================================================

function makeStorageMock() {
  return {
    storage: {
      getKV: <T,>(key: string, def: T): T => {
        const store = getKvStore()
        return store[key] !== undefined ? (store[key] as T) : def
      },
      setKV: (key: string, val: any) => {
        const store = getKvStore()
        store[key] = val
      },
    },
  }
}

vi.mock('@/engine/storage', () => makeStorageMock())
vi.mock('../../engine/storage', () => makeStorageMock())

// ============================================================
// 动态导入
// ============================================================

async function importMeditationAnalytics() {
  const mod = await import('../meditation-analytics')
  return mod.useMeditationAnalytics()
}

async function importTypes() {
  return await import('../types')
}

// ============================================================
// 测试数据工厂
// ============================================================

function today(): string {
  return getLocalDateKey()
}

function daysAgo(n: number): string {
  return getLocalDateKey(new Date(Date.now() - n * 24 * 60 * 60 * 1000))
}

function makeSession(overrides: {
  id?: string
  date?: string
  timestamp?: string
  duration?: number
  type?: string
  mood?: string
  moodAfter?: string
  insight?: string
  completed?: boolean
  interrupted?: boolean
  interruptReason?: string
} = {}) {
  const ts = overrides.timestamp ?? `${overrides.date ?? today()}T10:00:00.000Z`
  return {
    id: overrides.id ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: overrides.date ?? today(),
    timestamp: ts,
    duration: overrides.duration ?? 10,
    type: (overrides.type ?? 'breath') as any,
    mood: overrides.mood ?? 'neutral',
    moodAfter: overrides.moodAfter ?? 'calm',
    completed: overrides.completed ?? true,
    interrupted: overrides.interrupted ?? false,
    interruptReason: overrides.interruptReason,
    insight: overrides.insight,
  }
}

// ============================================================
// 1. 常量测试
// ============================================================

describe('P25-1 常量', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('MOOD_SCORE_MAP', () => {
    it('包含 14 个情绪条目', async () => {
      const types = await importTypes()
      expect(Object.keys(types.MOOD_SCORE_MAP).length).toBe(14)
    })

    it('负面情绪分值为 1-2', async () => {
      const types = await importTypes()
      expect(types.MOOD_SCORE_MAP.anxious).toBe(1)
      expect(types.MOOD_SCORE_MAP.stressed).toBe(1)
      expect(types.MOOD_SCORE_MAP.sad).toBe(2)
      expect(types.MOOD_SCORE_MAP.tired).toBe(2)
      expect(types.MOOD_SCORE_MAP.restless).toBe(2)
      expect(types.MOOD_SCORE_MAP.frustrated).toBe(2)
    })

    it('中性情绪分值为 3', async () => {
      const types = await importTypes()
      expect(types.MOOD_SCORE_MAP.neutral).toBe(3)
    })

    it('正面情绪分值为 4-5', async () => {
      const types = await importTypes()
      expect(types.MOOD_SCORE_MAP.calm).toBe(4)
      expect(types.MOOD_SCORE_MAP.peaceful).toBe(4)
      expect(types.MOOD_SCORE_MAP.content).toBe(4)
      expect(types.MOOD_SCORE_MAP.grateful).toBe(5)
      expect(types.MOOD_SCORE_MAP.joyful).toBe(5)
      expect(types.MOOD_SCORE_MAP.energized).toBe(5)
      expect(types.MOOD_SCORE_MAP.blissful).toBe(5)
    })
  })

  describe('TIME_OF_DAY_LABELS', () => {
    it('包含 7 个时段标签', async () => {
      const types = await importTypes()
      expect(Object.keys(types.TIME_OF_DAY_LABELS).length).toBe(7)
    })

    it('所有标签均为中文', async () => {
      const types = await importTypes()
      const labels = Object.values(types.TIME_OF_DAY_LABELS) as string[]
      const chineseLabels = ['凌晨', '清晨', '上午', '午后', '下午', '傍晚', '夜晚']
      for (const label of labels) {
        expect(chineseLabels).toContain(label)
      }
    })
  })

  describe('AMBIENT_SOUNDS', () => {
    it('包含 15 个预设环境音', async () => {
      const types = await importTypes()
      expect(types.AMBIENT_SOUNDS.length).toBe(15)
    })

    it('每个环境音包含必要字段', async () => {
      const types = await importTypes()
      for (const sound of types.AMBIENT_SOUNDS) {
        expect(sound).toHaveProperty('id')
        expect(sound).toHaveProperty('name')
        expect(sound).toHaveProperty('category')
        expect(sound).toHaveProperty('description')
        expect(sound).toHaveProperty('moodTags')
        expect(sound).toHaveProperty('timeTags')
        expect(sound).toHaveProperty('duration')
        expect(sound).toHaveProperty('icon')
        expect(sound).toHaveProperty('scenarios')
        expect(typeof sound.id).toBe('string')
        expect(typeof sound.name).toBe('string')
        expect(Array.isArray(sound.moodTags)).toBe(true)
        expect(Array.isArray(sound.timeTags)).toBe(true)
        expect(Array.isArray(sound.scenarios)).toBe(true)
      }
    })

    it('包含所有 8 个类别的环境音', async () => {
      const types = await importTypes()
      const categories = new Set(types.AMBIENT_SOUNDS.map((s: any) => s.category))
      const expected = ['nature', 'water', 'wind', 'fire', 'music', 'ambient', 'binaural', 'silence']
      for (const cat of expected) {
        expect(categories.has(cat)).toBe(true)
      }
    })
  })

  describe('AMBIENT_CATEGORY_META', () => {
    it('包含 8 个类别', async () => {
      const types = await importTypes()
      expect(Object.keys(types.AMBIENT_CATEGORY_META).length).toBe(8)
    })

    it('每个类别包含 label / icon / color', async () => {
      const types = await importTypes()
      for (const meta of Object.values(types.AMBIENT_CATEGORY_META) as any[]) {
        expect(meta).toHaveProperty('label')
        expect(meta).toHaveProperty('icon')
        expect(meta).toHaveProperty('color')
        expect(typeof meta.label).toBe('string')
        expect(typeof meta.icon).toBe('string')
        expect(typeof meta.color).toBe('string')
      }
    })
  })

  describe('MEDITATION_STORAGE_KEYS', () => {
    it('包含 5 个存储键', async () => {
      const types = await importTypes()
      expect(Object.keys(types.MEDITATION_STORAGE_KEYS).length).toBe(5)
    })

    it('所有键使用 hf:cognition: 前缀', async () => {
      const types = await importTypes()
      const keys = Object.values(types.MEDITATION_STORAGE_KEYS) as string[]
      for (const key of keys) {
        expect(key.startsWith('hf:cognition:')).toBe(true)
      }
    })
  })
})

// ============================================================
// 2. 会话管理测试
// ============================================================

describe('P25-2 会话管理', () => {
  beforeEach(() => {
    vi.resetModules()
    resetKvStore()
  })

  it('addSession 添加一个会话并可查询', async () => {
    const analytics = await importMeditationAnalytics()
    const session = makeSession({ id: 'test-1', date: today() })
    analytics.addSession(session)

    const sessions = analytics.getSessions()
    expect(sessions.length).toBe(1)
    expect(sessions[0].id).toBe('test-1')
  })

  it('addSession 按时间戳降序排列', async () => {
    const analytics = await importMeditationAnalytics()
    const early = makeSession({
      id: 'early',
      date: daysAgo(2),
      timestamp: `${daysAgo(2)}T08:00:00.000Z`,
    })
    const late = makeSession({
      id: 'late',
      date: today(),
      timestamp: `${today()}T12:00:00.000Z`,
    })
    const mid = makeSession({
      id: 'mid',
      date: daysAgo(1),
      timestamp: `${daysAgo(1)}T10:00:00.000Z`,
    })

    analytics.addSession(early)
    analytics.addSession(late)
    analytics.addSession(mid)

    const sessions = analytics.getSessions()
    expect(sessions.length).toBe(3)
    expect(sessions[0].id).toBe('late')
    expect(sessions[1].id).toBe('mid')
    expect(sessions[2].id).toBe('early')
  })

  it('getSessions 返回所有会话', async () => {
    const analytics = await importMeditationAnalytics()
    for (let i = 0; i < 5; i++) {
      analytics.addSession(makeSession({ id: `s-${i}`, date: today() }))
    }

    expect(analytics.getSessions().length).toBe(5)
  })

  it('getSessionsByDateRange 按日期范围筛选', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 'a', date: daysAgo(10) }))
    analytics.addSession(makeSession({ id: 'b', date: daysAgo(5) }))
    analytics.addSession(makeSession({ id: 'c', date: daysAgo(2) }))
    analytics.addSession(makeSession({ id: 'd', date: today() }))

    const range = analytics.getSessionsByDateRange(daysAgo(5), today())
    expect(range.length).toBe(3)
    const ids = range.map((s: any) => s.id)
    expect(ids).toContain('b')
    expect(ids).toContain('c')
    expect(ids).toContain('d')
    expect(ids).not.toContain('a')
  })

  it('getRecentSessions 返回最近 30 天的会话', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 'old', date: daysAgo(60) }))
    analytics.addSession(makeSession({ id: 'recent', date: daysAgo(5) }))
    analytics.addSession(makeSession({ id: 'today', date: today() }))

    const recent = analytics.getRecentSessions(30)
    expect(recent.length).toBe(2)
    const ids = recent.map((s: any) => s.id)
    expect(ids).toContain('recent')
    expect(ids).toContain('today')
    expect(ids).not.toContain('old')
  })

  it('getTodaySessions 返回今日会话', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 't1', date: today() }))
    analytics.addSession(makeSession({ id: 't2', date: today() }))
    analytics.addSession(makeSession({ id: 'yesterday', date: daysAgo(1) }))

    const todaySessions = analytics.getTodaySessions()
    expect(todaySessions.length).toBe(2)
    const ids = todaySessions.map((s: any) => s.id)
    expect(ids).toContain('t1')
    expect(ids).toContain('t2')
  })
})

// ============================================================
// 3. 模式分析测试
// ============================================================

describe('P25-3 模式分析 (analyzeMeditationPatterns)', () => {
  beforeEach(() => {
    vi.resetModules()
    resetKvStore()
  })

  it('空状态返回默认统计', async () => {
    const analytics = await importMeditationAnalytics()
    const stats = analytics.analyzeMeditationPatterns()

    expect(stats.totalSessions).toBe(0)
    expect(stats.totalDuration).toBe(0)
    expect(stats.averageDuration).toBe(0)
    expect(stats.longestSession).toBe(0)
    expect(stats.shortestSession).toBe(0)
    expect(stats.completionRate).toBe(0)
    expect(stats.interruptionRate).toBe(0)
    expect(stats.bestTimeOfDay).toBe('')
    expect(stats.averageMoodImprovement).toBe(0)
    expect(stats.moodImprovementRate).toBe(0)
  })

  it('计算 totalSessions 和 totalDuration', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ duration: 10 }))
    analytics.addSession(makeSession({ duration: 20 }))
    analytics.addSession(makeSession({ duration: 15 }))

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.totalSessions).toBe(3)
    expect(stats.totalDuration).toBe(45)
  })

  it('计算 averageDuration / longestSession / shortestSession', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ duration: 5 }))
    analytics.addSession(makeSession({ duration: 30 }))
    analytics.addSession(makeSession({ duration: 10 }))

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.averageDuration).toBe(15)
    expect(stats.longestSession).toBe(30)
    expect(stats.shortestSession).toBe(5)
  })

  it('计算 completionRate 和 interruptionRate', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 'c1', completed: true, interrupted: false }))
    analytics.addSession(makeSession({ id: 'c2', completed: true, interrupted: false }))
    analytics.addSession(makeSession({ id: 'c3', completed: false, interrupted: true }))

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.completionRate).toBe(67) // 2/3 * 100 = 66.67 -> 67
    expect(stats.interruptionRate).toBe(33) // 1/3 * 100 = 33.33 -> 33
  })

  it('检测 moodShiftDistribution', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ mood: 'anxious', moodAfter: 'calm' }))
    analytics.addSession(makeSession({ mood: 'anxious', moodAfter: 'calm' }))
    analytics.addSession(makeSession({ mood: 'neutral', moodAfter: 'peaceful' }))

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.moodShiftDistribution['anxious → calm']).toBe(2)
    expect(stats.moodShiftDistribution['neutral → peaceful']).toBe(1)
  })

  it('检测 timeOfDayDistribution', async () => {
    const analytics = await importMeditationAnalytics()

    // 构建本地时间 6:00 AM 和 14:00 PM 的时间戳
    const morning1 = new Date()
    morning1.setHours(6, 0, 0, 0)
    const morning2 = new Date()
    morning2.setHours(6, 30, 0, 0)
    const afternoon = new Date()
    afternoon.setHours(14, 0, 0, 0)

    analytics.addSession(makeSession({ timestamp: morning1.toISOString() }))
    analytics.addSession(makeSession({ timestamp: morning2.toISOString() }))
    analytics.addSession(makeSession({ timestamp: afternoon.toISOString() }))

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.timeOfDayDistribution.morning).toBe(2)
    expect(stats.timeOfDayDistribution.afternoon).toBe(1)
  })

  it('识别 preferredTypes 并确定 bestTimeOfDay', async () => {
    const analytics = await importMeditationAnalytics()

    // 构建本地时间 6:00 AM 和 14:00 PM 的时间戳
    const morning1 = new Date()
    morning1.setHours(6, 0, 0, 0)
    const morning2 = new Date()
    morning2.setHours(6, 30, 0, 0)
    const afternoon = new Date()
    afternoon.setHours(14, 0, 0, 0)

    analytics.addSession(makeSession({ type: 'breath', timestamp: morning1.toISOString() }))
    analytics.addSession(makeSession({ type: 'breath', timestamp: morning2.toISOString() }))
    analytics.addSession(makeSession({ type: 'body_scan', timestamp: afternoon.toISOString() }))

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.preferredTypes.length).toBeGreaterThanOrEqual(1)
    expect(stats.preferredTypes[0].type).toBe('breath')
    expect(stats.preferredTypes[0].count).toBe(2)
    expect(stats.bestTimeOfDay).toBe('morning')
  })
})

// ============================================================
// 4. 连续追踪测试
// ============================================================

describe('P25-4 连续追踪 (computeStreak)', () => {
  beforeEach(() => {
    vi.resetModules()
    resetKvStore()
  })

  it('空状态返回默认连续记录', async () => {
    const analytics = await importMeditationAnalytics()
    const streak = analytics.computeStreak()

    expect(streak.currentStreak).toBe(0)
    expect(streak.longestStreak).toBe(0)
    expect(streak.streakHistory).toEqual([])
    expect(streak.streakStartDate).toBeNull()
    expect(streak.lastMeditationDate).toBeNull()
    expect(streak.isStreakActive).toBe(false)
    expect(streak.streaksThisYear).toBe(0)
    expect(streak.averageStreakLength).toBe(0)
  })

  it('计算当前连续天数', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ date: daysAgo(2) }))
    analytics.addSession(makeSession({ date: daysAgo(1) }))
    analytics.addSession(makeSession({ date: today() }))

    const streak = analytics.computeStreak()
    expect(streak.currentStreak).toBe(3)
    expect(streak.isStreakActive).toBe(true)
  })

  it('计算最长连续天数', async () => {
    const analytics = await importMeditationAnalytics()
    // 连续段 1: 3 天
    analytics.addSession(makeSession({ date: daysAgo(10) }))
    analytics.addSession(makeSession({ date: daysAgo(9) }))
    analytics.addSession(makeSession({ date: daysAgo(8) }))
    // 中断 2 天
    // 连续段 2: 2 天
    analytics.addSession(makeSession({ date: daysAgo(5) }))
    analytics.addSession(makeSession({ date: daysAgo(4) }))

    const streak = analytics.computeStreak()
    expect(streak.longestStreak).toBe(3)
  })

  it('检测当天冥想为活跃连续', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ date: today() }))

    const streak = analytics.computeStreak()
    expect(streak.isStreakActive).toBe(true)
    expect(streak.currentStreak).toBe(1)
    expect(streak.lastMeditationDate).toBe(today())
  })

  it('昨天冥想也算活跃连续', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ date: daysAgo(1) }))

    const streak = analytics.computeStreak()
    expect(streak.isStreakActive).toBe(true)
    expect(streak.currentStreak).toBe(1)
  })

  it('中断超过 1 天则连续重置', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ date: daysAgo(5) }))
    analytics.addSession(makeSession({ date: daysAgo(4) }))
    // 中断 3 天
    analytics.addSession(makeSession({ date: today() }))

    const streak = analytics.computeStreak()
    expect(streak.currentStreak).toBe(1)
    expect(streak.longestStreak).toBe(2)
  })
})

// ============================================================
// 5. 环境音推荐测试
// ============================================================

describe('P25-5 环境音推荐', () => {
  beforeEach(() => {
    vi.resetModules()
    resetKvStore()
  })

  it('suggestAmbientSound 返回指定数量的推荐结果', async () => {
    const analytics = await importMeditationAnalytics()
    const result = analytics.suggestAmbientSound('anxious', 'evening', 3)
    expect(result.length).toBe(3)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('name')
    expect(result[0]).toHaveProperty('category')
  })

  it('suggestAmbientSound 优先推荐情绪匹配的环境音', async () => {
    const analytics = await importMeditationAnalytics()
    const result = analytics.suggestAmbientSound('anxious', 'evening', 5)

    // 情绪匹配应该排在前面
    const topHasMood = result[0].moodTags.includes('anxious')
    expect(topHasMood).toBe(true)
  })

  it('suggestAmbientSound 匹配时段', async () => {
    const analytics = await importMeditationAnalytics()
    const result = analytics.suggestAmbientSound('anxious', 'night', 5)

    // 返回的推荐应该优先考虑 night 时段
    const nightMatching = result.filter((s: any) => s.timeTags.includes('night'))
    expect(nightMatching.length).toBeGreaterThan(0)
  })

  it('getSoundsByCategory 按类别筛选', async () => {
    const analytics = await importMeditationAnalytics()
    const waterSounds = analytics.getSoundsByCategory('water')

    expect(waterSounds.length).toBe(3)
    expect(waterSounds.every((s: any) => s.category === 'water')).toBe(true)
  })

  it('getSoundsByCategory 未知类别返回空数组', async () => {
    const analytics = await importMeditationAnalytics()
    const result = analytics.getSoundsByCategory('nonexistent' as any)
    expect(result).toEqual([])
  })

  it('searchSoundsByScenario 按场景搜索', async () => {
    const analytics = await importMeditationAnalytics()
    const result = analytics.searchSoundsByScenario('睡前')

    expect(result.length).toBeGreaterThan(0)
    for (const sound of result) {
      const hasScenario = sound.scenarios.some((sc: string) => sc.includes('睡前'))
      const hasInDesc = sound.description.includes('睡前')
      expect(hasScenario || hasInDesc).toBe(true)
    }
  })

  it('searchSoundsByScenario 不匹配时返回空数组', async () => {
    const analytics = await importMeditationAnalytics()
    const result = analytics.searchSoundsByScenario('不存在的场景xyz')
    expect(result).toEqual([])
  })

  it('getAllSounds 返回全部 15 个预设', async () => {
    const analytics = await importMeditationAnalytics()
    const all = analytics.getAllSounds()
    expect(all.length).toBe(15)
  })
})

// ============================================================
// 6. 洞察生成测试
// ============================================================

describe('P25-6 洞察生成 (generateMeditationInsights)', () => {
  beforeEach(() => {
    vi.resetModules()
    resetKvStore()
  })

  it('空状态不生成洞察', async () => {
    const analytics = await importMeditationAnalytics()
    const newInsights = analytics.generateMeditationInsights()
    expect(newInsights).toEqual([])
  })

  it('首次冥想生成里程碑洞察', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({
      id: 'first',
      mood: 'anxious',
      moodAfter: 'calm',
      completed: true,
    }))

    const newInsights = analytics.generateMeditationInsights()
    const milestone = newInsights.find((i: any) => i.type === 'milestone')
    expect(milestone).toBeDefined()
    expect(milestone!.title).toBe('初入禅境')
  })

  it('generateMeditationInsights 不重复生成相同洞察', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 's1', mood: 'anxious', moodAfter: 'calm' }))

    analytics.generateMeditationInsights()
    const secondRun = analytics.generateMeditationInsights()
    expect(secondRun).toEqual([])
  })

  it('getInsights 返回所有洞察', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 's1', mood: 'anxious', moodAfter: 'calm' }))
    analytics.generateMeditationInsights()

    const allInsights = analytics.getInsights()
    expect(allInsights.length).toBeGreaterThan(0)
  })

  it('getInsightsByType 按类型筛选', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 's1', mood: 'anxious', moodAfter: 'calm' }))
    analytics.generateMeditationInsights()

    const milestones = analytics.getInsightsByType('milestone')
    expect(milestones.length).toBeGreaterThan(0)
    for (const insight of milestones) {
      expect(insight.type).toBe('milestone')
    }
  })

  it('clearInsights 清除所有洞察', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 's1', mood: 'anxious', moodAfter: 'calm' }))
    analytics.generateMeditationInsights()

    expect(analytics.getInsights().length).toBeGreaterThan(0)

    analytics.clearInsights()
    expect(analytics.getInsights().length).toBe(0)
  })
})

// ============================================================
// 7. 情绪关联与重置测试
// ============================================================

describe('P25-7 情绪关联与重置', () => {
  beforeEach(() => {
    vi.resetModules()
    resetKvStore()
  })

  it('getMoodTypeCorrelation 空状态返回空数组', async () => {
    const analytics = await importMeditationAnalytics()
    const result = analytics.getMoodTypeCorrelation()
    expect(result).toEqual([])
  })

  it('getMoodTypeCorrelation 按情绪分组', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 'a', mood: 'anxious', type: 'breath' }))
    analytics.addSession(makeSession({ id: 'b', mood: 'anxious', type: 'body_scan' }))
    analytics.addSession(makeSession({ id: 'c', mood: 'calm', type: 'breath' }))

    const result = analytics.getMoodTypeCorrelation()
    expect(result.length).toBe(2)

    const anxiousGroup = result.find((r: any) => r.mood === 'anxious')
    expect(anxiousGroup).toBeDefined()
    expect(anxiousGroup!.typeDistribution.length).toBe(2)

    const calmGroup = result.find((r: any) => r.mood === 'calm')
    expect(calmGroup).toBeDefined()
    expect(calmGroup!.typeDistribution.length).toBe(1)
  })

  it('resetAll 清除所有数据', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({ id: 's1', mood: 'anxious', moodAfter: 'calm' }))
    analytics.addSession(makeSession({ id: 's2', mood: 'neutral', moodAfter: 'peaceful' }))
    analytics.generateMeditationInsights()

    // 确认有数据
    expect(analytics.getSessions().length).toBe(2)
    expect(analytics.getInsights().length).toBeGreaterThan(0)

    analytics.resetAll()

    // 确认数据已清除
    expect(analytics.getSessions().length).toBe(0)
    expect(analytics.getInsights().length).toBe(0)

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.totalSessions).toBe(0)
    expect(stats.totalDuration).toBe(0)

    const streak = analytics.computeStreak()
    expect(streak.currentStreak).toBe(0)
  })

  it('addSession 自动触发 stats 和 streak 更新', async () => {
    const analytics = await importMeditationAnalytics()
    analytics.addSession(makeSession({
      id: 'auto',
      duration: 15,
      mood: 'anxious',
      moodAfter: 'calm',
      completed: true,
    }))

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.totalSessions).toBe(1)
    expect(stats.totalDuration).toBe(15)

    const streak = analytics.computeStreak()
    expect(streak.currentStreak).toBe(1)
  })

  it('多次 addSession 正确处理', async () => {
    const analytics = await importMeditationAnalytics()
    for (let i = 0; i < 10; i++) {
      analytics.addSession(makeSession({
        id: `multi-${i}`,
        date: daysAgo(9 - i),
        duration: 10,
        mood: 'neutral',
        moodAfter: 'calm',
        completed: true,
      }))
    }

    const sessions = analytics.getSessions()
    expect(sessions.length).toBe(10)

    const stats = analytics.analyzeMeditationPatterns()
    expect(stats.totalSessions).toBe(10)
    expect(stats.totalDuration).toBe(100)
  })
})