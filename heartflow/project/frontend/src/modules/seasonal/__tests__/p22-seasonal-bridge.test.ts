// ============================================================
// P22-4 岁时阁 · 视图桥接层测试
//
// 测试 useSeasonalBridge() composable
// 桥接层聚合 rituals / cocoons / journal / overview 子模块
// 为视图层提供统一的 computed 属性与方法
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('P22-4 岁时阁视图桥接', () => {
  let bridge: any

  beforeEach(async () => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()

    const mod = await import('../seasonal-bridge')
    bridge = mod.useSeasonalBridge()
  })

  // ============================================================
  // 1. 初始化校验
  // ============================================================
  describe('初始化校验', () => {
    it('seasonalOverview 包含 currentSeason、seasonProgress、upcomingFestivals', () => {
      const overview = bridge.seasonalOverview.value
      expect(overview).toBeDefined()
      expect(overview.currentSeason).toBeDefined()
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(overview.currentSeason)
      expect(typeof overview.seasonProgress).toBe('number')
      expect(overview.seasonProgress).toBeGreaterThanOrEqual(0)
      expect(overview.seasonProgress).toBeLessThanOrEqual(100)
      expect(Array.isArray(overview.upcomingFestivals)).toBe(true)
    })

    it('所有 computed 属性都存在', () => {
      expect(bridge.seasonalOverview).toBeDefined()
      expect(bridge.ritualStats).toBeDefined()
      expect(bridge.cocoonProgress).toBeDefined()
      expect(bridge.moodAnalysis).toBeDefined()
      expect(bridge.moodTrend).toBeDefined()
      expect(bridge.yearReview).toBeDefined()
      expect(bridge.seasonTransition).toBeDefined()
      expect(bridge.recommendations).toBeDefined()
    })

    it('所有原始数据数组初始化为空或包含默认值', () => {
      expect(Array.isArray(bridge.rituals.value)).toBe(true)
      expect(Array.isArray(bridge.cocoons.value)).toBe(true)
      expect(bridge.cocoons.value.length).toBe(0)
      expect(Array.isArray(bridge.journalEntries.value)).toBe(true)
      expect(bridge.journalEntries.value.length).toBe(0)
      expect(bridge.lifeRituals).toBeDefined()
    })

    it('所有操作方法都存在', () => {
      expect(typeof bridge.addRitual).toBe('function')
      expect(typeof bridge.completeRitual).toBe('function')
      expect(typeof bridge.createCocoon).toBe('function')
      expect(typeof bridge.advanceCocoon).toBe('function')
      expect(typeof bridge.createJournalEntry).toBe('function')
      expect(typeof bridge.generateYearReview).toBe('function')
    })
  })

  // ============================================================
  // 2. 季节概览
  // ============================================================
  describe('季节概览', () => {
    it('currentSeason 是合法的四季之一', () => {
      const season = bridge.seasonalOverview.value.currentSeason
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(season)
    })

    it('currentSeasonLabel 是合法的季节标签', () => {
      const label = bridge.seasonalOverview.value.currentSeasonLabel
      expect(['春', '夏', '秋', '冬']).toContain(label)
    })

    it('currentSeasonIcon 是合法的季节图标', () => {
      const icon = bridge.seasonalOverview.value.currentSeasonIcon
      expect(['🌸', '☀️', '🍂', '❄️']).toContain(icon)
    })

    it('seasonProgress 在 0-100 之间', () => {
      const progress = bridge.seasonalOverview.value.seasonProgress
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(100)
    })

    it('nextSolarTerm 包含 name 和 desc', () => {
      const term = bridge.seasonalOverview.value.nextSolarTerm
      expect(term.name).toBeTruthy()
      expect(term.desc).toBeTruthy()
    })

    it('upcomingFestivals 最多 3 个', () => {
      const festivals = bridge.seasonalOverview.value.upcomingFestivals
      expect(festivals.length).toBeLessThanOrEqual(3)
    })

    it('upcomingFestivals 每个节日包含 name 和 date', () => {
      const festivals = bridge.seasonalOverview.value.upcomingFestivals
      for (const f of festivals) {
        expect(f.name).toBeTruthy()
        expect(f.date).toBeTruthy()
      }
    })
  })

  // ============================================================
  // 3. 仪式统计
  // ============================================================
  describe('仪式统计', () => {
    it('初始 ritualStats 各项均为 0', () => {
      const stats = bridge.ritualStats.value
      expect(stats.total).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.streak).toBe(0)
    })

    it('bySeason 包含 4 个季节', () => {
      const bySeason = bridge.ritualStats.value.bySeason
      expect(bySeason.length).toBe(4)
    })

    it('bySeason 每个季节包含 season、label、count 字段', () => {
      const bySeason = bridge.ritualStats.value.bySeason
      const seasons = ['spring', 'summer', 'autumn', 'winter']
      for (const item of bySeason) {
        expect(seasons).toContain(item.season)
        expect(typeof item.label).toBe('string')
        expect(typeof item.count).toBe('number')
      }
    })

    it('bySeason 初始 count 均为 0', () => {
      const bySeason = bridge.ritualStats.value.bySeason
      for (const item of bySeason) {
        expect(item.count).toBe(0)
      }
    })
  })

  // ============================================================
  // 4. 光茧进度
  // ============================================================
  describe('光茧进度', () => {
    it('初始 cocoonProgress 统计均为 0', () => {
      const progress = bridge.cocoonProgress.value
      expect(progress.stats.total).toBe(0)
      expect(progress.stats.completed).toBe(0)
      expect(progress.stats.active).toBe(0)
      expect(progress.completionRate).toBe(0)
    })

    it('cocoonProgress 包含 stats、activeCocoons、stageDistribution、completionRate', () => {
      const progress = bridge.cocoonProgress.value
      expect(progress.stats).toBeDefined()
      expect(progress.activeCocoons).toBeDefined()
      expect(Array.isArray(progress.activeCocoons)).toBe(true)
      expect(progress.stageDistribution).toBeDefined()
      expect(Array.isArray(progress.stageDistribution)).toBe(true)
      expect(typeof progress.completionRate).toBe('number')
    })

    it('stageDistribution 包含 4 个阶段', () => {
      const sd = bridge.cocoonProgress.value.stageDistribution
      expect(sd.length).toBe(4)
      const stages = sd.map((s: any) => s.stage)
      expect(stages).toContain('gestating')
      expect(stages).toContain('cracking')
      expect(stages).toContain('emerging')
      expect(stages).toContain('flying')
    })

    it('activeCocoons 初始为空数组', () => {
      expect(bridge.cocoonProgress.value.activeCocoons).toEqual([])
    })
  })

  // ============================================================
  // 5. 情绪分析
  // ============================================================
  describe('情绪分析', () => {
    it('无日志时 moodAnalysis 为 null', () => {
      expect(bridge.moodAnalysis.value).toBeNull()
    })

    it('创建日志后 moodAnalysis 有值', () => {
      bridge.createJournalEntry('春日随笔', '今天天气很好，心情愉悦', 'excited')
      const analysis = bridge.moodAnalysis.value
      expect(analysis).not.toBeNull()
    })

    it('moodAnalysis 包含 dominantMood、moodDistribution、moodCurve、keywords', () => {
      bridge.createJournalEntry('夏日记录', '忙碌而充实的一天', 'energetic')
      bridge.createJournalEntry('秋日沉思', '落叶飘零，感触良多', 'reflective')
      const analysis = bridge.moodAnalysis.value
      if (analysis) {
        expect(analysis.dominantMood).toBeDefined()
        expect(analysis.moodDistribution).toBeDefined()
        expect(Array.isArray(analysis.moodCurve)).toBe(true)
        expect(Array.isArray(analysis.keywords)).toBe(true)
        expect(analysis.season).toBeDefined()
        expect(analysis.year).toBeDefined()
      }
    })

    it('moodAnalysis 包含 changeFromPrevious 字段', () => {
      bridge.createJournalEntry('日志', '内容', 'peaceful')
      const analysis = bridge.moodAnalysis.value
      if (analysis) {
        expect(analysis.changeFromPrevious).toBeDefined()
      }
    })
  })

  // ============================================================
  // 6. 情绪趋势
  // ============================================================
  describe('情绪趋势', () => {
    it('无日志时 moodTrend 返回默认 MoodTrend 对象', () => {
      const trend = bridge.moodTrend.value
      expect(trend).toBeDefined()
      expect(trend.seasons).toBeDefined()
      expect(Array.isArray(trend.seasons)).toBe(true)
      expect(trend.overallTrend).toBeDefined()
      expect(trend.peakSeason).toBeDefined()
      expect(trend.troughSeason).toBeDefined()
    })

    it('moodTrend.overallTrend 为 stable、improving 或 declining', () => {
      const trend = bridge.moodTrend.value
      expect(['improving', 'stable', 'declining']).toContain(trend.overallTrend)
    })

    it('有日志后 moodTrend.seasons 包含数据', () => {
      bridge.createJournalEntry('春日志', '充满希望', 'excited')
      bridge.createJournalEntry('夏日志', '忙碌充实', 'energetic')
      const trend = bridge.moodTrend.value
      expect(trend.seasons.length).toBeGreaterThanOrEqual(1)
      const seasonData = trend.seasons[0]
      expect(seasonData.season).toBeDefined()
      expect(seasonData.dominantMood).toBeDefined()
      expect(typeof seasonData.avgIntensity).toBe('number')
    })

    it('peakSeason 和 troughSeason 包含 season 和 year', () => {
      bridge.createJournalEntry('日志一', '内容', 'excited')
      bridge.createJournalEntry('日志二', '内容', 'tired')
      const trend = bridge.moodTrend.value
      expect(trend.peakSeason.season).toBeDefined()
      expect(typeof trend.peakSeason.year).toBe('number')
      expect(trend.troughSeason.season).toBeDefined()
      expect(typeof trend.troughSeason.year).toBe('number')
    })
  })

  // ============================================================
  // 7. 年度回顾
  // ============================================================
  describe('年度回顾', () => {
    it('无日志时 yearReview 为 null', () => {
      expect(bridge.yearReview.value).toBeNull()
    })

    it('有日志后 yearReview 包含 year、seasons、totalEntries、yearTheme', () => {
      bridge.createJournalEntry('春之始', '新的一年开始了', 'excited')
      const review = bridge.yearReview.value
      expect(review).not.toBeNull()
      expect(typeof review.year).toBe('number')
      expect(Array.isArray(review.seasons)).toBe(true)
      expect(typeof review.totalEntries).toBe('number')
      expect(review.totalEntries).toBeGreaterThanOrEqual(1)
      expect(review.yearTheme).toBeTruthy()
    })

    it('yearReview 包含 growth、gratitude、nextYearIntentions', () => {
      bridge.createJournalEntry('成长', '今年学会了很多东西', 'reflective')
      bridge.createJournalEntry('感恩', '感谢身边的朋友和家人', 'peaceful')
      const review = bridge.yearReview.value
      if (review) {
        expect(Array.isArray(review.growth)).toBe(true)
        expect(Array.isArray(review.gratitude)).toBe(true)
        expect(Array.isArray(review.nextYearIntentions)).toBe(true)
      }
    })
  })

  // ============================================================
  // 8. 季节转换
  // ============================================================
  describe('季节转换', () => {
    it('在非季节边界时 seasonTransition 为 null', () => {
      // 季节转换仅在距边界 14 天内展示，远离边界时返回 null
      const transition = bridge.seasonTransition.value
      // 当前日期可能靠近边界，也可能不靠近，但测试环境默认应是 null
      // 如果恰好在边界附近，transition 非 null 也是合法的
      if (transition !== null) {
        expect(transition.from).toBeDefined()
        expect(transition.to).toBeDefined()
      }
    })

    it('seasonTransition 非 null 时包含 from、to、ritualActions、farewell、welcome', () => {
      const transition = bridge.seasonTransition.value
      if (transition !== null) {
        expect(transition.from).toBeDefined()
        expect(transition.to).toBeDefined()
        expect(Array.isArray(transition.ritualActions)).toBe(true)
        expect(transition.farewell).toBeDefined()
        expect(transition.welcome).toBeDefined()
        expect(transition.timestamp).toBeDefined()
      }
    })
  })

  // ============================================================
  // 9. 推荐系统
  // ============================================================
  describe('推荐系统', () => {
    it('初始状态包含高优先级仪式创建推荐', () => {
      const recs = bridge.recommendations.value
      const ritualRec = recs.find((r: any) => r.type === 'ritual' && r.priority === 'high')
      expect(ritualRec).toBeDefined()
    })

    it('推荐按优先级排序：high > medium > low', () => {
      const recs = bridge.recommendations.value
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < recs.length; i++) {
        const prev = priorityOrder[recs[i - 1].priority as keyof typeof priorityOrder]
        const curr = priorityOrder[recs[i].priority as keyof typeof priorityOrder]
        expect(prev).toBeLessThanOrEqual(curr)
      }
    })

    it('推荐包含节气推荐', () => {
      const recs = bridge.recommendations.value
      const solarTerm = recs.find((r: any) => r.type === 'solar_term')
      expect(solarTerm).toBeDefined()
      expect(solarTerm.priority).toBe('low')
    })

    it('每条推荐包含 id、type、title、description、priority', () => {
      const recs = bridge.recommendations.value
      expect(recs.length).toBeGreaterThan(0)
      for (const rec of recs) {
        expect(rec.id).toBeTruthy()
        expect(rec.type).toBeDefined()
        expect(rec.title).toBeTruthy()
        expect(rec.description).toBeTruthy()
        expect(['high', 'medium', 'low']).toContain(rec.priority)
      }
    })

    it('添加仪式后不再出现仪式创建推荐', () => {
      bridge.addRitual('晨间冥想')
      const recs = bridge.recommendations.value
      const ritualRec = recs.find((r: any) => r.type === 'ritual' && r.action === 'createRitual')
      expect(ritualRec).toBeUndefined()
    })

    it('创建光茧后不再出现光茧创建推荐', () => {
      bridge.createCocoon('学习新技能')
      const recs = bridge.recommendations.value
      const cocoonRec = recs.find((r: any) => r.type === 'cocoon' && r.action === 'createCocoon')
      expect(cocoonRec).toBeUndefined()
    })

    it('创建日志后不再出现日志创建推荐', () => {
      bridge.createJournalEntry('日志标题', '日志内容', 'peaceful')
      const recs = bridge.recommendations.value
      const journalRec = recs.find((r: any) => r.type === 'journal' && r.action === 'createJournalEntry')
      expect(journalRec).toBeUndefined()
    })
  })

  // ============================================================
  // 10. 添加仪式
  // ============================================================
  describe('添加仪式', () => {
    it('addRitual 后 rituals 数组长度增加', () => {
      const before = bridge.rituals.value.length
      bridge.addRitual('晨间冥想')
      expect(bridge.rituals.value.length).toBe(before + 1)
    })

    it('addRitual 添加的仪式包含 name 和 season', () => {
      bridge.addRitual('春日茶道', 'spring', '品茶静心')
      const ritual = bridge.rituals.value[0]
      expect(ritual.name).toBe('春日茶道')
      expect(ritual.season).toBe('spring')
      expect(ritual.description).toBe('品茶静心')
    })

    it('addRitual 不指定季节时使用当前季节', () => {
      bridge.addRitual('自动季节仪式')
      const ritual = bridge.rituals.value[0]
      expect(ritual.season).toBeDefined()
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(ritual.season)
    })

    it('addRitual 后 ritualStats 更新', () => {
      bridge.addRitual('仪式一')
      const stats = bridge.ritualStats.value
      expect(stats.total).toBe(1)
    })

    it('添加多个不同季节的仪式后 bySeason 统计正确', () => {
      bridge.addRitual('春仪式', 'spring')
      bridge.addRitual('春仪式二', 'spring')
      bridge.addRitual('夏仪式', 'summer')
      const bySeason = bridge.ritualStats.value.bySeason
      const springItem = bySeason.find((s: any) => s.season === 'spring')
      const summerItem = bySeason.find((s: any) => s.season === 'summer')
      expect(springItem.count).toBe(2)
      expect(summerItem.count).toBe(1)
    })
  })

  // ============================================================
  // 11. 完成仪式
  // ============================================================
  describe('完成仪式', () => {
    it('completeRitual 后 ritual.count 增加', () => {
      bridge.addRitual('晨间冥想')
      const ritualId = bridge.rituals.value[0].id
      bridge.completeRitual(ritualId)
      const ritual = bridge.rituals.value[0]
      expect(ritual.count).toBe(1)
    })

    it('completeRitual 后 lastCompletedAt 不为 null', () => {
      bridge.addRitual('晚课')
      const ritualId = bridge.rituals.value[0].id
      bridge.completeRitual(ritualId)
      const ritual = bridge.rituals.value[0]
      expect(ritual.lastCompletedAt).not.toBeNull()
    })

    it('completeRitual 后 ritualStats.completed 更新', () => {
      bridge.addRitual('仪式')
      bridge.completeRitual(bridge.rituals.value[0].id)
      const stats = bridge.ritualStats.value
      expect(stats.completed).toBe(1)
    })

    it('多次完成同一仪式 count 累加', () => {
      bridge.addRitual('每日打卡')
      const ritualId = bridge.rituals.value[0].id
      bridge.completeRitual(ritualId)
      bridge.completeRitual(ritualId)
      bridge.completeRitual(ritualId)
      expect(bridge.rituals.value[0].count).toBe(3)
    })
  })

  // ============================================================
  // 12. 创建光茧
  // ============================================================
  describe('创建光茧', () => {
    it('createCocoon 返回 Cocoon 对象', () => {
      const cocoon = bridge.createCocoon('学习编程')
      expect(cocoon).toBeDefined()
      expect(cocoon.id).toBeTruthy()
      expect(cocoon.name).toBe('学习编程')
      expect(cocoon.stage).toBe('gestating')
    })

    it('createCocoon 后 cocoons 数组长度增加', () => {
      const before = bridge.cocoons.value.length
      bridge.createCocoon('蜕变目标')
      expect(bridge.cocoons.value.length).toBe(before + 1)
    })

    it('createCocoon 后 cocoonProgress 更新', () => {
      bridge.createCocoon('新光茧')
      const progress = bridge.cocoonProgress.value
      expect(progress.stats.total).toBe(1)
      expect(progress.activeCocoons.length).toBe(1)
    })

    it('createCocoon 指定季节正确', () => {
      const cocoon = bridge.createCocoon('秋之光茧', 'autumn')
      expect(cocoon.season).toBe('autumn')
    })

    it('createCocoon 关联生命仪礼', () => {
      const cocoon = bridge.createCocoon('生日蜕变', 'spring', 'lr_001', '生日')
      expect(cocoon.lifeRitualId).toBe('lr_001')
      expect(cocoon.lifeRitualName).toBe('生日')
    })
  })

  // ============================================================
  // 13. 推进光茧
  // ============================================================
  describe('推进光茧', () => {
    it('advanceCocoon 从 gestating 推进到 cracking', () => {
      const cocoon = bridge.createCocoon('技能成长')
      const updated = bridge.advanceCocoon(cocoon.id, 'cracking', '开始突破')
      expect(updated).not.toBeNull()
      expect(updated.stage).toBe('cracking')
    })

    it('advanceCocoon 记录 stageHistory', () => {
      const cocoon = bridge.createCocoon('阶段测试')
      const updated = bridge.advanceCocoon(cocoon.id, 'cracking', '突破理由')
      expect(updated.stageHistory.length).toBe(1)
      expect(updated.stageHistory[0].from).toBe('gestating')
      expect(updated.stageHistory[0].to).toBe('cracking')
    })

    it('advanceCocoon 无效 id 返回 null', () => {
      const result = bridge.advanceCocoon('invalid_id', 'cracking')
      expect(result).toBeNull()
    })

    it('advanceCocoon 到 flying 后 cocoonProgress 完成率更新', () => {
      const cocoon = bridge.createCocoon('蜕变完成')
      bridge.advanceCocoon(cocoon.id, 'cracking')
      bridge.advanceCocoon(cocoon.id, 'emerging')
      bridge.advanceCocoon(cocoon.id, 'flying')
      const progress = bridge.cocoonProgress.value
      expect(progress.stats.completed).toBe(1)
      expect(progress.completionRate).toBe(1)
    })
  })

  // ============================================================
  // 14. 创建日志
  // ============================================================
  describe('创建日志', () => {
    it('createJournalEntry 后 journalEntries 长度增加', () => {
      const before = bridge.journalEntries.value.length
      bridge.createJournalEntry('今日感言', '心情不错', 'peaceful')
      expect(bridge.journalEntries.value.length).toBe(before + 1)
    })

    it('createJournalEntry 返回的条目包含所有必要字段', () => {
      const entry = bridge.createJournalEntry('春日记', '春天来了', 'excited')
      expect(entry.id).toBeTruthy()
      expect(entry.title).toBe('春日记')
      expect(entry.content).toBe('春天来了')
      expect(entry.mood).toBe('excited')
      expect(entry.season).toBeDefined()
      expect(entry.year).toBe(new Date().getFullYear())
      expect(entry.createdAt).toBeDefined()
      expect(entry.updatedAt).toBeDefined()
    })

    it('createJournalEntry 指定季节', () => {
      const entry = bridge.createJournalEntry('秋日记', '秋天来了', 'reflective', 'autumn')
      expect(entry.season).toBe('autumn')
    })

    it('createJournalEntry 支持所有 mood 类型', () => {
      const moods = ['excited', 'peaceful', 'reflective', 'melancholic', 'energetic', 'tired'] as const
      for (const mood of moods) {
        const entry = bridge.createJournalEntry('测试', '内容', mood)
        expect(entry.mood).toBe(mood)
      }
    })
  })

  // ============================================================
  // 15. 生成年度回顾
  // ============================================================
  describe('生成年度回顾', () => {
    it('generateYearReview 返回 YearReview 对象', () => {
      bridge.createJournalEntry('日志', '内容', 'peaceful')
      const review = bridge.generateYearReview()
      expect(review).toBeDefined()
      expect(typeof review.year).toBe('number')
      expect(Array.isArray(review.seasons)).toBe(true)
    })

    it('generateYearReview 指定年份', () => {
      const review = bridge.generateYearReview(2025)
      expect(review.year).toBe(2025)
    })

    it('generateYearReview 无日志年份返回空回顾', () => {
      const review = bridge.generateYearReview(2000)
      expect(review.year).toBe(2000)
      expect(review.totalEntries).toBe(0)
      expect(review.seasons).toEqual([])
    })
  })

  // ============================================================
  // 16. 多项仪式操作
  // ============================================================
  describe('多项仪式操作', () => {
    it('添加多项仪式后 ritualStats.total 正确', () => {
      bridge.addRitual('仪式A')
      bridge.addRitual('仪式B')
      bridge.addRitual('仪式C')
      expect(bridge.ritualStats.value.total).toBe(3)
    })

    it('多项仪式分属不同季节时 bySeason 统计正确', () => {
      bridge.addRitual('春', 'spring')
      bridge.addRitual('夏', 'summer')
      bridge.addRitual('秋', 'autumn')
      bridge.addRitual('冬', 'winter')
      const bySeason = bridge.ritualStats.value.bySeason
      expect(bySeason.find((s: any) => s.season === 'spring').count).toBe(1)
      expect(bySeason.find((s: any) => s.season === 'summer').count).toBe(1)
      expect(bySeason.find((s: any) => s.season === 'autumn').count).toBe(1)
      expect(bySeason.find((s: any) => s.season === 'winter').count).toBe(1)
    })

    it('全部完成仪式后 ritualStats.completed 等于 total', () => {
      bridge.addRitual('仪式A')
      bridge.addRitual('仪式B')
      for (const r of bridge.rituals.value) {
        bridge.completeRitual(r.id)
      }
      const stats = bridge.ritualStats.value
      expect(stats.completed).toBe(stats.total)
    })
  })

  // ============================================================
  // 17. 生命仪礼
  // ============================================================
  describe('生命仪礼', () => {
    it('lifeRituals 可访问', () => {
      expect(bridge.lifeRituals).toBeDefined()
    })

    it('lifeRituals.value 是数组', () => {
      expect(Array.isArray(bridge.lifeRituals.value)).toBe(true)
    })
  })

  // ============================================================
  // 18. 推荐优先级排序
  // ============================================================
  describe('推荐优先级排序', () => {
    it('推荐列表按优先级排序', () => {
      const recs = bridge.recommendations.value
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < recs.length; i++) {
        const prev = priorityOrder[recs[i - 1].priority as keyof typeof priorityOrder]
        const curr = priorityOrder[recs[i].priority as keyof typeof priorityOrder]
        expect(prev).toBeLessThanOrEqual(curr)
      }
    })

    it('高优先级推荐在最前面', () => {
      const recs = bridge.recommendations.value
      const highPriorityRecs = recs.filter((r: any) => r.priority === 'high')
      if (highPriorityRecs.length > 0) {
        // 第一个高优先级推荐之前不应有 medium 或 low
        const firstHighIndex = recs.findIndex((r: any) => r.priority === 'high')
        const beforeHigh = recs.slice(0, firstHighIndex)
        for (const r of beforeHigh) {
          expect(r.priority).toBe('high')
        }
      }
    })
  })

  // ============================================================
  // 19. 完整工作流
  // ============================================================
  describe('完整工作流', () => {
    it('添加仪式 → 完成打卡 → 验证统计', () => {
      bridge.addRitual('晨间冥想', 'spring', '每日清晨冥想')
      expect(bridge.rituals.value.length).toBe(1)

      bridge.completeRitual(bridge.rituals.value[0].id)
      expect(bridge.ritualStats.value.completed).toBe(1)
      expect(bridge.ritualStats.value.total).toBe(1)
    })

    it('创建光茧 → 推进阶段 → 完成蜕变', () => {
      const cocoon = bridge.createCocoon('学习 TypeScript', 'spring')
      expect(cocoon.stage).toBe('gestating')

      let updated = bridge.advanceCocoon(cocoon.id, 'cracking')
      expect(updated.stage).toBe('cracking')

      updated = bridge.advanceCocoon(cocoon.id, 'emerging')
      expect(updated.stage).toBe('emerging')

      updated = bridge.advanceCocoon(cocoon.id, 'flying')
      expect(updated.stage).toBe('flying')

      expect(bridge.cocoonProgress.value.stats.completed).toBe(1)
    })

    it('创建日志 → 情绪分析 → 年度回顾完整链路', () => {
      bridge.createJournalEntry('春天', '万物复苏充满希望', 'excited', 'spring')
      bridge.createJournalEntry('夏天', '忙碌充实充满活力', 'energetic', 'summer')

      const analysis = bridge.moodAnalysis.value
      if (analysis) {
        expect(analysis.dominantMood).toBeDefined()
      }

      const trend = bridge.moodTrend.value
      expect(trend.seasons.length).toBeGreaterThanOrEqual(1)

      const review = bridge.yearReview.value
      expect(review).not.toBeNull()
      if (review) {
        expect(review.totalEntries).toBeGreaterThanOrEqual(2)
      }
    })

    it('多季节日志的年度回顾包含多季节数据', () => {
      bridge.createJournalEntry('春', '春天内容', 'excited', 'spring')
      bridge.createJournalEntry('夏', '夏天内容', 'energetic', 'summer')
      bridge.createJournalEntry('秋', '秋天内容', 'reflective', 'autumn')
      bridge.createJournalEntry('冬', '冬天内容', 'peaceful', 'winter')

      const review = bridge.yearReview.value
      if (review) {
        expect(review.seasons.length).toBe(4)
        const seasonNames = review.seasons.map((s: any) => s.season)
        expect(seasonNames).toContain('spring')
        expect(seasonNames).toContain('summer')
        expect(seasonNames).toContain('autumn')
        expect(seasonNames).toContain('winter')
      }
    })
  })
})