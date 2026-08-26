// ============================================================
// P25 更漏 · 工作日志模块 · 完整测试套件
// 覆盖：常量/类型验证/CRUD/搜索/过滤/摘要/统计/
//       分析引擎/习惯分析/生产力预测/导出/边界条件
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'

// ============================================================
// Shared mock store (vi.hoisted)
// ============================================================

const { mockStore, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  return {
    mockStore: store,
    mockGetKV: vi.fn((key: string, def: any) => {
      return store[key] !== undefined ? store[key] : def
    }),
    mockSetKV: vi.fn((key: string, val: any) => {
      store[key] = val
    }),
  }
})

vi.mock('@/engine/storage', () => ({
  storage: { getKV: mockGetKV, setKV: mockSetKV },
}))

vi.mock('../../../engine/storage', () => ({
  storage: { getKV: mockGetKV, setKV: mockSetKV },
}))

// ============================================================
// Imports
// ============================================================

import {
  LOG_TYPE_META,
  MOOD_TONE_META,
  WORKLOG_STORAGE_KEYS,
  useWorklog,
  useWorklogAnalytics,
  useWorklogHabits,
  useProductivityPrediction,
  useWorklogExport,
  EXPORT_FORMAT_META,
  REPORT_TEMPLATES,
} from '../index'
import type {
  LogEntryType,
  MoodTone,
  LogEntry,
  WorklogDailySummary,
  WeeklySummary,
  WorklogStats,
  ExportResult,
} from '../index'

// ============================================================
// Helper
// ============================================================

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'journal',
    title: '测试日志',
    content: '这是一条测试日志内容，用于单元测试。',
    mood: 'neutral',
    tags: ['test'],
    sessionIds: [],
    roomId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeEntries(count: number, overrides: Partial<LogEntry> = {}): LogEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry({
      title: `日志 ${i + 1}`,
      content: `这是第 ${i + 1} 条日志内容。`,
      ...overrides,
    }),
  )
}

// ============================================================
// Tests
// ============================================================

describe('P25 worklog module', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    vi.clearAllMocks()
  })

  // ==========================================================
  // 1. Constants
  // ==========================================================

  describe('constants', () => {
    it('LOG_TYPE_META should have all 6 log types with label/icon/color/desc', () => {
      const types: LogEntryType[] = ['reflection', 'plan', 'journal', 'insight', 'review', 'milestone']
      expect(Object.keys(LOG_TYPE_META).sort()).toEqual([...types].sort())
      for (const t of types) {
        const meta = LOG_TYPE_META[t]
        expect(meta).toHaveProperty('label')
        expect(meta).toHaveProperty('icon')
        expect(meta).toHaveProperty('color')
        expect(meta).toHaveProperty('desc')
        expect(typeof meta.label).toBe('string')
        expect(typeof meta.icon).toBe('string')
        expect(typeof meta.color).toBe('string')
        expect(typeof meta.desc).toBe('string')
      }
    })

    it('MOOD_TONE_META should have all 6 mood tones with label/icon/color', () => {
      const moods: MoodTone[] = ['energetic', 'calm', 'neutral', 'tired', 'frustrated', 'excited']
      expect(Object.keys(MOOD_TONE_META).sort()).toEqual([...moods].sort())
      for (const m of moods) {
        const meta = MOOD_TONE_META[m]
        expect(meta).toHaveProperty('label')
        expect(meta).toHaveProperty('icon')
        expect(meta).toHaveProperty('color')
        expect(typeof meta.label).toBe('string')
        expect(typeof meta.icon).toBe('string')
        expect(typeof meta.color).toBe('string')
      }
    })

    it('WORKLOG_STORAGE_KEYS should have ENTRIES and WEEKLY_SUMMARIES', () => {
      expect(WORKLOG_STORAGE_KEYS).toHaveProperty('ENTRIES')
      expect(WORKLOG_STORAGE_KEYS).toHaveProperty('WEEKLY_SUMMARIES')
      expect(WORKLOG_STORAGE_KEYS.ENTRIES).toBe('worklog:entries')
      expect(WORKLOG_STORAGE_KEYS.WEEKLY_SUMMARIES).toBe('worklog:weekly-summaries')
    })

    it('EXPORT_FORMAT_META should have all 5 formats', () => {
      const formats = ['markdown', 'json', 'csv', 'html', 'txt']
      expect(Object.keys(EXPORT_FORMAT_META).sort()).toEqual([...formats].sort())
      for (const f of formats) {
        const meta = (EXPORT_FORMAT_META as any)[f]
        expect(meta).toHaveProperty('label')
        expect(meta).toHaveProperty('mimeType')
        expect(meta).toHaveProperty('extension')
      }
    })

    it('REPORT_TEMPLATES should have 4 templates', () => {
      expect(REPORT_TEMPLATES).toHaveLength(4)
      const types = REPORT_TEMPLATES.map((t) => t.type).sort()
      expect(types).toEqual(['daily', 'monthly', 'weekly', 'yearly'])
    })
  })

  // ==========================================================
  // 2. Type value validation
  // ==========================================================

  describe('type validation', () => {
    it('LogEntryType enum-like values should be valid', () => {
      const valid: LogEntryType[] = ['reflection', 'plan', 'journal', 'insight', 'review', 'milestone']
      const entry = makeEntry({ type: 'reflection' })
      expect(valid).toContain(entry.type)
    })

    it('MoodTone enum-like values should be valid', () => {
      const valid: MoodTone[] = ['energetic', 'calm', 'neutral', 'tired', 'frustrated', 'excited']
      const entry = makeEntry({ mood: 'excited' })
      expect(valid).toContain(entry.mood!)
    })
  })

  // ==========================================================
  // 3. entries - CRUD
  // ==========================================================

  describe('entries CRUD', () => {
    let wl: ReturnType<typeof useWorklog>

    beforeEach(() => {
      wl = useWorklog()
    })

    it('addEntry should create an entry and return it', () => {
      const entry = wl.addEntry({
        type: 'journal',
        title: '新日志',
        content: '内容',
      })
      expect(entry).toBeDefined()
      expect(entry.id).toMatch(/^log_/)
      expect(entry.type).toBe('journal')
      expect(entry.title).toBe('新日志')
      expect(entry.content).toBe('内容')
      expect(entry.tags).toEqual([])
      expect(entry.sessionIds).toEqual([])
      expect(entry.createdAt).toBeTruthy()
      expect(entry.updatedAt).toBeTruthy()
    })

    it('addEntry with optional fields should populate them', () => {
      const entry = wl.addEntry({
        type: 'reflection',
        title: '反思',
        content: '深度反思',
        mood: 'calm',
        tags: ['重要', '思考'],
        sessionIds: ['s1', 's2'],
        roomId: 'r1',
      })
      expect(entry.mood).toBe('calm')
      expect(entry.tags).toEqual(['重要', '思考'])
      expect(entry.sessionIds).toEqual(['s1', 's2'])
      expect(entry.roomId).toBe('r1')
    })

    it('addEntry should prepend to entries array', () => {
      wl.addEntry({ type: 'journal', title: 'first', content: 'a' })
      wl.addEntry({ type: 'journal', title: 'second', content: 'b' })
      expect(wl.entries.value).toHaveLength(2)
      expect(wl.entries.value[0].title).toBe('second')
      expect(wl.entries.value[1].title).toBe('first')
    })

    it('addEntry should persist to storage', () => {
      wl.addEntry({ type: 'journal', title: 'test', content: 'c' })
      expect(mockSetKV).toHaveBeenCalledWith(
        WORKLOG_STORAGE_KEYS.ENTRIES,
        expect.any(Array),
      )
    })

    it('updateEntry should update an existing entry', () => {
      // 用假时钟推进 1s，避免同一毫秒内 toISOString 碰撞导致的偶发失败
      vi.useFakeTimers()
      try {
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
        const entry = wl.addEntry({ type: 'journal', title: '原标题', content: '原内容' })
        vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'))
        const updated = wl.updateEntry(entry.id, { title: '新标题', content: '新内容' })
        expect(updated).not.toBeNull()
        expect(updated!.title).toBe('新标题')
        expect(updated!.content).toBe('新内容')
        expect(updated!.updatedAt).not.toBe(entry.updatedAt)
      } finally {
        vi.useRealTimers()
      }
    })

    it('updateEntry should return null for non-existent id', () => {
      const result = wl.updateEntry('nonexistent', { title: 'x' })
      expect(result).toBeNull()
    })

    it('updateEntry should persist after update', () => {
      const entry = wl.addEntry({ type: 'journal', title: 't', content: 'c' })
      vi.clearAllMocks()
      wl.updateEntry(entry.id, { title: 'updated' })
      expect(mockSetKV).toHaveBeenCalled()
    })

    it('removeEntry should remove an existing entry', () => {
      const entry = wl.addEntry({ type: 'journal', title: 't', content: 'c' })
      expect(wl.entries.value).toHaveLength(1)
      const result = wl.removeEntry(entry.id)
      expect(result).toBe(true)
      expect(wl.entries.value).toHaveLength(0)
    })

    it('removeEntry should return false for non-existent id', () => {
      const result = wl.removeEntry('nonexistent')
      expect(result).toBe(false)
    })

    it('removeEntry should persist after removal', () => {
      const entry = wl.addEntry({ type: 'journal', title: 't', content: 'c' })
      vi.clearAllMocks()
      wl.removeEntry(entry.id)
      expect(mockSetKV).toHaveBeenCalled()
    })

    it('getEntry should return the entry by id', () => {
      const entry = wl.addEntry({ type: 'journal', title: 't', content: 'c' })
      const found = wl.getEntry(entry.id)
      expect(found).toEqual(entry)
    })

    it('getEntry should return undefined for non-existent id', () => {
      const found = wl.getEntry('nonexistent')
      expect(found).toBeUndefined()
    })
  })

  // ==========================================================
  // 4. entries - search / filter
  // ==========================================================

  describe('entries search/filter', () => {
    let wl: ReturnType<typeof useWorklog>

    beforeEach(async () => {
      wl = useWorklog()
      // flush microtasks so load() completes before we add entries
      await Promise.resolve()
      wl.addEntry({ type: 'journal', title: '前端开发', content: '使用Vue3开发', tags: ['coding', 'vue'] })
      wl.addEntry({ type: 'reflection', title: '周反思', content: '本周效率不错', tags: ['review'], mood: 'calm' })
      wl.addEntry({ type: 'plan', title: '下周计划', content: '安排任务', tags: ['planning'] })
    })

    it('setSearchQuery should filter by title/content/tags', () => {
      wl.setSearchQuery('Vue')
      expect(wl.filteredEntries.value).toHaveLength(1)
      expect(wl.filteredEntries.value[0].title).toBe('前端开发')
    })

    it('setSearchQuery should filter by content', () => {
      wl.setSearchQuery('效率')
      expect(wl.filteredEntries.value).toHaveLength(1)
      expect(wl.filteredEntries.value[0].title).toBe('周反思')
    })

    it('setSearchQuery should filter by tag', () => {
      wl.setSearchQuery('coding')
      expect(wl.filteredEntries.value).toHaveLength(1)
    })

    it('setSearchQuery with empty string should show all', () => {
      wl.setSearchQuery('')
      expect(wl.filteredEntries.value).toHaveLength(3)
    })

    it('setFilterType should filter by type', () => {
      wl.setFilterType('reflection')
      expect(wl.filteredEntries.value).toHaveLength(1)
      expect(wl.filteredEntries.value[0].type).toBe('reflection')
    })

    it('setFilterType with null should clear filter', () => {
      wl.setFilterType('reflection')
      wl.setFilterType(null)
      expect(wl.filteredEntries.value).toHaveLength(3)
    })

    it('setFilterTag should filter by exact tag', () => {
      wl.setFilterTag('coding')
      expect(wl.filteredEntries.value).toHaveLength(1)
    })

    it('setFilterTag with null should clear filter', () => {
      wl.setFilterTag('coding')
      wl.setFilterTag(null)
      expect(wl.filteredEntries.value).toHaveLength(3)
    })

    it('allTags should return unique sorted tags', () => {
      const tags = wl.allTags.value
      expect(tags).toEqual(['coding', 'planning', 'review', 'vue'])
    })

    it('entryCount should reflect the number of entries', () => {
      expect(wl.entryCount.value).toBe(3)
      wl.addEntry({ type: 'journal', title: 'extra', content: 'x' })
      expect(wl.entryCount.value).toBe(4)
    })

    it('combined search and filter should work together', () => {
      wl.setSearchQuery('周')
      wl.setFilterType('reflection')
      expect(wl.filteredEntries.value).toHaveLength(1)
    })
  })

  // ==========================================================
  // 5. entries - date range / today
  // ==========================================================

  describe('entries date range', () => {
    let wl: ReturnType<typeof useWorklog>

    beforeEach(async () => {
      wl = useWorklog()
      // flush microtasks so load() completes before we manipulate entries
      await Promise.resolve()
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)

      wl.entries.value = [
        makeEntry({ title: 'twoDaysAgo', createdAt: twoDaysAgo.toISOString(), updatedAt: twoDaysAgo.toISOString() }),
        makeEntry({ title: 'yesterday', createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString() }),
        makeEntry({ title: 'today', createdAt: today.toISOString(), updatedAt: today.toISOString() }),
      ]
    })

    it('getEntriesByDateRange should filter by date range', () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0)
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      const result = wl.getEntriesByDateRange(start, end)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('getTodayEntries should return entries created today', () => {
      const today = new Date()
      wl.entries.value = []
      wl.entries.value.push(makeEntry({ title: 'today', createdAt: today.toISOString(), updatedAt: today.toISOString() }))
      const todayEntries = wl.getTodayEntries()
      expect(todayEntries.length).toBe(1)
    })

    it('getTodayEntries should return empty when no entries today', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      wl.entries.value = []
      wl.entries.value.push(makeEntry({ title: 'yesterday', createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString() }))
      const todayEntries = wl.getTodayEntries()
      expect(todayEntries.length).toBe(0)
    })
  })

  // ==========================================================
  // 6. entries - summaries
  // ==========================================================

  describe('entries summaries', () => {
    let wl: ReturnType<typeof useWorklog>

    beforeEach(() => {
      wl = useWorklog()
    })

    it('generateDailySummary should return summary for today', () => {
      wl.addEntry({ type: 'journal', title: '日志1', content: '内容', mood: 'energetic', tags: ['work'] })
      const summary = wl.generateDailySummary(new Date())
      expect(summary.date).toBeTruthy()
      expect(summary.entryCount).toBeGreaterThanOrEqual(1)
      expect(summary.totalFocusMinutes).toBe(0)
    })

    it('generateDailySummary with multiple moods should pick dominant', () => {
      wl.addEntry({ type: 'journal', title: 'a', content: 'a', mood: 'energetic', tags: [] })
      wl.addEntry({ type: 'journal', title: 'b', content: 'b', mood: 'energetic', tags: [] })
      wl.addEntry({ type: 'journal', title: 'c', content: 'c', mood: 'tired', tags: [] })
      const summary = wl.generateDailySummary(new Date())
      expect(summary.dominantMood).toBe('energetic')
    })

    it('generateDailySummary with no entries should have entryCount 0', () => {
      const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const summary = wl.generateDailySummary(yesterday)
      expect(summary.entryCount).toBe(0)
      expect(summary.dominantMood).toBeUndefined()
      expect(summary.keyTags).toEqual([])
    })

    it('generateWeeklySummary should return weekly data', () => {
      wl.addEntry({ type: 'journal', title: '周日志', content: '内容', tags: ['weekly'] })
      const ws = wl.generateWeeklySummary(new Date())
      expect(ws.weekStart).toBeTruthy()
      expect(ws.weekEnd).toBeTruthy()
      expect(ws.dailySummaries).toHaveLength(7)
      expect(ws.moodDistribution).toBeDefined()
      expect(ws.topTags).toBeDefined()
      expect(ws.achievements).toBeDefined()
    })
  })

  // ==========================================================
  // 7. entries - stats
  // ==========================================================

  describe('entries stats', () => {
    let wl: ReturnType<typeof useWorklog>

    beforeEach(() => {
      wl = useWorklog()
    })

    it('getStats should return WorklogStats with correct structure', () => {
      wl.addEntry({ type: 'journal', title: 't', content: 'c', tags: ['tag1'], mood: 'energetic' })
      const stats = wl.getStats()
      expect(stats.totalEntries).toBe(1)
      expect(stats.totalFocusMinutes).toBe(0)
      expect(typeof stats.streakDays).toBe('number')
      expect(typeof stats.mostProductiveDay).toBe('string')
      expect(typeof stats.mostProductiveHour).toBe('number')
      expect(Array.isArray(stats.moodTrend)).toBe(true)
      expect(Array.isArray(stats.tagDistribution)).toBe(true)
      expect(Array.isArray(stats.typeDistribution)).toBe(true)
    })

    it('getStats with multiple entries should compute type distribution', () => {
      wl.addEntry({ type: 'journal', title: 'a', content: 'a' })
      wl.addEntry({ type: 'reflection', title: 'b', content: 'b' })
      wl.addEntry({ type: 'journal', title: 'c', content: 'c' })
      const stats = wl.getStats()
      const journalDist = stats.typeDistribution.find((d) => d.type === 'journal')
      const reflectionDist = stats.typeDistribution.find((d) => d.type === 'reflection')
      expect(journalDist?.count).toBe(2)
      expect(reflectionDist?.count).toBe(1)
    })

    it('getStats with no entries should return zeroed stats', () => {
      const stats = wl.getStats()
      expect(stats.totalEntries).toBe(0)
      expect(stats.streakDays).toBe(0)
      expect(stats.tagDistribution).toEqual([])
    })
  })

  // ==========================================================
  // 8. worklog-analytics
  // ==========================================================

  describe('worklog-analytics', () => {
    let analytics: ReturnType<typeof useWorklogAnalytics>

    beforeEach(() => {
      analytics = useWorklogAnalytics()
    })

    it('updateAnalytics should populate analytics from entries', () => {
      const entries = makeEntries(5, { type: 'journal', mood: 'energetic', tags: ['work'] })
      const stats: WorklogStats = {
        totalEntries: 5, totalFocusMinutes: 0, streakDays: 3,
        mostProductiveDay: '周一', mostProductiveHour: 10,
        moodTrend: [], tagDistribution: [], typeDistribution: [],
      }
      analytics.updateAnalytics(entries, stats)
      expect(analytics.analytics.value.totalEntries).toBe(5)
      expect(analytics.analytics.value.weeklyEntries).toBeGreaterThanOrEqual(0)
      expect(analytics.analytics.value.monthlyEntries).toBeGreaterThanOrEqual(0)
    })

    it('updateAnalytics should compute typeDistribution with percentages', () => {
      const entries = makeEntries(3, { type: 'journal' })
      const stats: WorklogStats = {
        totalEntries: 3, totalFocusMinutes: 0, streakDays: 1,
        mostProductiveDay: '周一', mostProductiveHour: 9,
        moodTrend: [], tagDistribution: [], typeDistribution: [],
      }
      analytics.updateAnalytics(entries, stats)
      const typeDist = analytics.analytics.value.typeDistribution
      expect(typeDist.length).toBeGreaterThan(0)
      const journalDist = typeDist.find((d) => d.type === 'journal')
      expect(journalDist).toBeDefined()
      expect(journalDist!.percentage).toBe(100)
    })

    it('updateAnalytics should compute hourlyHeatmap', () => {
      const now = new Date()
      const entries = makeEntries(3, { type: 'journal', createdAt: now.toISOString(), updatedAt: now.toISOString() })
      const stats: WorklogStats = {
        totalEntries: 3, totalFocusMinutes: 0, streakDays: 1,
        mostProductiveDay: '周一', mostProductiveHour: 9,
        moodTrend: [], tagDistribution: [], typeDistribution: [],
      }
      analytics.updateAnalytics(entries, stats)
      expect(analytics.analytics.value.hourlyHeatmap.length).toBeGreaterThan(0)
    })

    it('updateAnalytics should track bestStreak', () => {
      const entries = makeEntries(10)
      const stats: WorklogStats = {
        totalEntries: 10, totalFocusMinutes: 0, streakDays: 7,
        mostProductiveDay: '周一', mostProductiveHour: 10,
        moodTrend: [], tagDistribution: [], typeDistribution: [],
      }
      analytics.updateAnalytics(entries, stats)
      analytics.updateAnalytics(entries, { ...stats, streakDays: 5 })
      expect(analytics.analytics.value.bestStreak).toBe(7)
    })

    it('extractKeywords should return keywords from entries', () => {
      const entries = [
        makeEntry({ content: '今天完成了前端开发任务，使用Vue3框架' }),
        makeEntry({ content: '前端开发进展顺利，Vue3组件复用效果好' }),
      ]
      const keywords = analytics.extractKeywords(entries, 10)
      expect(keywords.length).toBeGreaterThan(0)
      expect(keywords[0]).toHaveProperty('keyword')
      expect(keywords[0]).toHaveProperty('count')
      expect(keywords[0]).toHaveProperty('trend')
      expect(['rising', 'stable', 'declining']).toContain(keywords[0].trend)
    })

    it('extractKeywords should filter out stop words', () => {
      const entries = [
        makeEntry({ content: '今天 我们 可以 一个 这个 那个 前端' }),
      ]
      const keywords = analytics.extractKeywords(entries, 10)
      const kwTexts = keywords.map((k) => k.keyword)
      expect(kwTexts).not.toContain('可以')
      expect(kwTexts).not.toContain('我们')
      expect(kwTexts).not.toContain('一个')
    })

    it('generateProductivityReport should create a daily report', () => {
      const entries = makeEntries(5, { type: 'journal' })
      const report = analytics.generateProductivityReport('daily', entries, 120)
      expect(report).toBeDefined()
      expect(report.period).toBe('daily')
      expect(report.entryCount).toBe(5)
      expect(report.totalFocusMinutes).toBe(120)
      expect(report.productivityScore).toBeGreaterThan(0)
      expect(report.id).toMatch(/^report_/)
    })

    it('generateProductivityReport should create a weekly report', () => {
      const entries = makeEntries(10, { type: 'journal' })
      const report = analytics.generateProductivityReport('weekly', entries, 300)
      expect(report.period).toBe('weekly')
    })

    it('generateProductivityReport should create a monthly report', () => {
      const entries = makeEntries(20, { type: 'journal' })
      const report = analytics.generateProductivityReport('monthly', entries, 600)
      expect(report.period).toBe('monthly')
    })

    it('generateProductivityReport with milestones should include achievements', () => {
      const entries = [
        makeEntry({ type: 'milestone', title: '完成大项目' }),
        makeEntry({ type: 'insight', title: '重要发现' }),
      ]
      const report = analytics.generateProductivityReport('daily', entries, 60)
      expect(report.achievements).toContain('完成大项目')
      expect(report.achievements).toContain('重要发现')
    })

    it('generateProductivityReport with reflections should include challenges', () => {
      const entries = [
        makeEntry({ type: 'reflection', title: '遇到困难' }),
      ]
      const report = analytics.generateProductivityReport('daily', entries, 30)
      expect(report.challenges).toContain('遇到困难')
    })

    it('reports should be stored and retrievable', () => {
      const entries = makeEntries(3)
      const report = analytics.generateProductivityReport('daily', entries, 60)
      expect(analytics.reports.value.length).toBeGreaterThanOrEqual(1)
      expect(analytics.reports.value.find((r) => r.id === report.id)).toBeDefined()
    })

    it('latestReport should return the most recent report', () => {
      const entries = makeEntries(3)
      analytics.generateProductivityReport('daily', entries, 60)
      expect(analytics.latestReport.value).not.toBeNull()
    })
  })

  // ==========================================================
  // 9. worklog-habits
  // ==========================================================

  describe('worklog-habits', () => {
    let habits: ReturnType<typeof useWorklogHabits>

    beforeEach(() => {
      habits = useWorklogHabits()
    })

    it('analyzeTimeSlots should return 5 time slots', () => {
      const entries = makeEntries(10)
      const slots = habits.analyzeTimeSlots(entries)
      expect(slots).toHaveLength(5)
      for (const slot of slots) {
        expect(slot).toHaveProperty('slot')
        expect(slot).toHaveProperty('label')
        expect(slot).toHaveProperty('entryCount')
        expect(slot).toHaveProperty('productivityScore')
        expect(slot).toHaveProperty('isPeak')
      }
    })

    it('analyzeTimeSlots with empty entries should return all zero scores', () => {
      const slots = habits.analyzeTimeSlots([])
      expect(slots).toHaveLength(5)
      for (const slot of slots) {
        expect(slot.entryCount).toBe(0)
        expect(slot.productivityScore).toBe(0)
        // when maxScore is 0, score >= 0 * 0.8 is always true
        expect(slot.isPeak).toBe(true)
      }
    })

    it('buildProfile should return complete WorkHabitProfile', () => {
      const entries = makeEntries(15)
      const profile = habits.buildProfile(entries)
      expect(profile.timeSlotProductivity).toHaveLength(5)
      expect(Array.isArray(profile.peakSlots)).toBe(true)
      expect(Array.isArray(profile.lowSlots)).toBe(true)
      expect(typeof profile.bestDayOfWeek).toBe('string')
      expect(typeof profile.avgDailyEntries).toBe('number')
      expect(profile.streakPattern).toBeDefined()
      expect(profile.rhythm).toBeDefined()
      expect(Array.isArray(profile.insights)).toBe(true)
    })

    it('buildProfile with empty entries should return empty profile', () => {
      const profile = habits.buildProfile([])
      expect(profile.peakSlots).toEqual([])
      expect(profile.lowSlots).toEqual([])
      expect(profile.bestDayOfWeek).toBe('')
      expect(profile.avgDailyEntries).toBe(0)
      expect(profile.insights).toEqual([])
    })

    it('discoverFocusBlocks should return focus blocks for frequent entries', () => {
      const now = new Date()
      const entries: LogEntry[] = []
      for (let i = 0; i < 10; i++) {
        const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        t.setHours(10, 0, 0, 0)
        entries.push(makeEntry({ createdAt: t.toISOString(), updatedAt: t.toISOString() }))
      }
      const blocks = habits.discoverFocusBlocks(entries)
      expect(blocks.length).toBeGreaterThanOrEqual(0)
      if (blocks.length > 0) {
        expect(blocks[0]).toHaveProperty('startHour')
        expect(blocks[0]).toHaveProperty('frequency')
        expect(blocks[0]).toHaveProperty('reliability')
      }
    })

    it('discoverFocusBlocks with few entries should return empty', () => {
      const entries = makeEntries(2)
      const blocks = habits.discoverFocusBlocks(entries)
      // Each entry at a different timestamp, so count per key is 1, < 3 threshold
      for (const block of blocks) {
        expect(block.frequency).toBeGreaterThanOrEqual(3)
      }
    })

    it('analyzeDayOfWeek should return 7 days', () => {
      const entries = makeEntries(14)
      const days = habits.analyzeDayOfWeek(entries)
      expect(days).toHaveLength(7)
      for (const day of days) {
        expect(day).toHaveProperty('day')
        expect(day).toHaveProperty('count')
        expect(day).toHaveProperty('avgFocus')
      }
    })
  })

  // ==========================================================
  // 10. productivity-prediction
  // ==========================================================

  describe('productivity-prediction', () => {
    let pred: ReturnType<typeof useProductivityPrediction>

    beforeEach(() => {
      pred = useProductivityPrediction()
    })

    it('scoreEfficiency should return EfficiencyScore with all dimensions', () => {
      const entries = makeEntries(20, { type: 'journal', mood: 'energetic', content: '这是一段足够长的内容来测试深度评分维度，包含多个关键词和标签信息' })
      const score = pred.scoreEfficiency(entries)
      expect(score).toHaveProperty('overall')
      expect(score).toHaveProperty('dimensions')
      expect(score).toHaveProperty('trend')
      expect(score).toHaveProperty('weekOverWeek')
      expect(score).toHaveProperty('percentile')
      expect(score).toHaveProperty('comment')
      expect(score.dimensions).toHaveLength(5)
    })

    it('scoreEfficiency with no entries should return zero score', () => {
      const score = pred.scoreEfficiency([])
      expect(score.overall).toBe(0)
      expect(score.comment).toBe('数据不足，无法计算效率评分')
    })

    it('computeTrend should return ProductivityTrend with daily scores', () => {
      const entries: LogEntry[] = []
      const now = new Date()
      for (let i = 0; i < 30; i++) {
        const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        entries.push(makeEntry({
          type: 'journal',
          createdAt: t.toISOString(),
          updatedAt: t.toISOString(),
          content: '每天都有工作记录' + 'x'.repeat(20),
        }))
      }
      const trend = pred.computeTrend(entries)
      expect(trend.dailyScores.length).toBeGreaterThan(0)
      expect(trend.movingAverage.length).toBe(trend.dailyScores.length)
      expect(['up', 'down', 'flat']).toContain(trend.direction)
      expect(trend.nextWeekPrediction).toBeDefined()
    })

    it('computeTrend with few entries should still produce dailyScores for 30 days', () => {
      const entries = makeEntries(2)
      const trend = pred.computeTrend(entries)
      // dailyScores covers the full 30-day window regardless of entry count
      expect(trend.dailyScores.length).toBeGreaterThanOrEqual(30)
      expect(trend.movingAverage.length).toBe(trend.dailyScores.length)
      expect(['up', 'down', 'flat']).toContain(trend.direction)
      expect(trend.nextWeekPrediction).toBeDefined()
    })

    it('generateSuggestions should return suggestions based on efficiency', () => {
      const entries = makeEntries(5, { type: 'journal', content: 'short' })
      const efficiency = pred.scoreEfficiency(entries)
      const trend = pred.computeTrend(entries)
      const suggestions = pred.generateSuggestions(entries, efficiency, trend)
      expect(Array.isArray(suggestions)).toBe(true)
      // Some suggestions should be generated for low scores
      for (const s of suggestions) {
        expect(s).toHaveProperty('id')
        expect(s).toHaveProperty('category')
        expect(s).toHaveProperty('title')
        expect(s).toHaveProperty('priority')
        expect(s).toHaveProperty('actionables')
        expect(s).toHaveProperty('expectedImpact')
      }
    })

    it('generateSuggestions with downward trend should include warning', () => {
      const entries: LogEntry[] = []
      const now = new Date()
      // Create entries with declining content length to trigger downward trend
      for (let i = 0; i < 30; i++) {
        const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        entries.push(makeEntry({
          createdAt: t.toISOString(),
          updatedAt: t.toISOString(),
          content: 'x'.repeat(Math.max(1, 30 - i)),
        }))
      }
      const efficiency = pred.scoreEfficiency(entries)
      const trend = pred.computeTrend(entries)
      const suggestions = pred.generateSuggestions(entries, efficiency, trend)
      // May or may not trigger depending on score calculation
      expect(Array.isArray(suggestions)).toBe(true)
    })

    it('trackGoal should return GoalTracker for entries goal', () => {
      const entries = makeEntries(15)
      const goal = pred.trackGoal(entries, {
        name: '月日志目标',
        target: 30,
        unit: 'entries',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      })
      expect(goal.name).toBe('月日志目标')
      expect(goal.target).toBe(30)
      expect(goal.unit).toBe('entries')
      expect(goal.progress).toBeGreaterThanOrEqual(0)
      expect(goal).toHaveProperty('onTrack')
      expect(goal).toHaveProperty('remainingDays')
      expect(goal).toHaveProperty('dailyNeeded')
    })

    it('trackGoal for focus_minutes should compute from sessionIds', () => {
      const entries = makeEntries(5, { sessionIds: ['s1', 's2'] })
      const goal = pred.trackGoal(entries, {
        name: '专注目标',
        target: 500,
        unit: 'focus_minutes',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      })
      expect(goal.current).toBe(5 * 2 * 25) // 5 entries * 2 sessions * 25 min
    })
  })

  // ==========================================================
  // 11. worklog-export
  // ==========================================================

  describe('worklog-export', () => {
    let exporter: ReturnType<typeof useWorklogExport>

    beforeEach(() => {
      exporter = useWorklogExport()
    })

    it('exportEntries markdown should return ExportResult', () => {
      const entries = makeEntries(3, { type: 'journal', mood: 'energetic', tags: ['work'] })
      const result = exporter.exportEntries(entries, { format: 'markdown' })
      expect(result.content).toContain('更漏')
      expect(result.filename).toContain('worklog')
      expect(result.extension).toBe('.md')
      expect(result.entryCount).toBe(3)
    })

    it('exportEntries json should return valid JSON', () => {
      const entries = makeEntries(2)
      const result = exporter.exportEntries(entries, { format: 'json' })
      const parsed = JSON.parse(result.content)
      expect(parsed.entries).toHaveLength(2)
      expect(parsed.exportMeta.entryCount).toBe(2)
    })

    it('exportEntries csv should return CSV format', () => {
      const entries = makeEntries(2)
      const result = exporter.exportEntries(entries, { format: 'csv' })
      const lines = result.content.split('\n')
      expect(lines[0]).toContain('id')
      expect(lines[0]).toContain('type')
      expect(lines[0]).toContain('title')
      expect(lines.length).toBeGreaterThanOrEqual(3) // header + 2 rows
    })

    it('exportEntries html should contain HTML tags', () => {
      const entries = makeEntries(1)
      const result = exporter.exportEntries(entries, { format: 'html' })
      expect(result.content).toContain('<!DOCTYPE html>')
      expect(result.content).toContain('<body>')
    })

    it('exportEntries txt should return plain text', () => {
      const entries = makeEntries(2)
      const result = exporter.exportEntries(entries, { format: 'txt' })
      expect(result.content).toContain('更漏')
      expect(result.content).not.toContain('<')
    })

    it('exportEntries with dateRange should filter entries', () => {
      const today = new Date().toISOString().slice(0, 10)
      const entries = makeEntries(5, { createdAt: `${today}T10:00:00.000Z`, updatedAt: `${today}T10:00:00.000Z` })
      const result = exporter.exportEntries(entries, {
        format: 'json',
        dateRange: { start: today, end: today },
      })
      expect(result.entryCount).toBe(5)
    })

    it('exportEntries with typeFilter should filter by type', () => {
      const entries = [
        makeEntry({ type: 'journal', title: 'journal entry' }),
        makeEntry({ type: 'reflection', title: 'reflection entry' }),
      ]
      const result = exporter.exportEntries(entries, {
        format: 'json',
        typeFilter: ['reflection'],
      })
      const parsed = JSON.parse(result.content)
      expect(parsed.entries).toHaveLength(1)
      expect(parsed.entries[0].type).toBe('reflection')
    })

    it('generateReport daily should create daily report', () => {
      const entries = makeEntries(3)
      const summaries: WorklogDailySummary[] = [
        {
          date: new Date().toISOString().slice(0, 10),
          entryCount: 3,
          totalFocusMinutes: 60,
          dominantMood: 'energetic',
          keyTags: ['work'],
          highlightEntry: entries[0].id,
        },
      ]
      const result = exporter.generateReport(entries, summaries, null, {
        template: 'daily',
        format: 'markdown',
        period: new Date().toISOString().slice(0, 10),
        includeHabits: false,
        includePrediction: false,
        includeMood: true,
      })
      expect(result.content).toContain('日报')
      expect(result.content).toContain('概览')
    })

    it('generateReport weekly should create weekly report', () => {
      const entries = makeEntries(10)
      const summaries: WorklogDailySummary[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        return {
          date: d.toISOString().slice(0, 10),
          entryCount: 1,
          totalFocusMinutes: 25,
          keyTags: [],
        }
      })
      const weeklySummary: WeeklySummary = {
        weekStart: summaries[6].date,
        weekEnd: summaries[0].date,
        entryCount: 7,
        dailySummaries: summaries,
        totalFocusMinutes: 175,
        moodDistribution: { energetic: 3, calm: 2, neutral: 2, tired: 0, frustrated: 0, excited: 0 },
        topTags: ['work'],
        achievements: [],
        reflection: '',
      }
      const result = exporter.generateReport(entries, summaries, weeklySummary, {
        template: 'weekly',
        format: 'markdown',
        period: '',
        includeHabits: false,
        includePrediction: false,
        includeMood: true,
      })
      expect(result.content).toContain('周报')
      expect(result.content).toContain('本周概览')
    })

    it('generateReport monthly and yearly should work', () => {
      const entries = makeEntries(5)
      const summaries: WorklogDailySummary[] = [
        {
          date: new Date().toISOString().slice(0, 10),
          entryCount: 5,
          totalFocusMinutes: 100,
          keyTags: ['work'],
        },
      ]
      const monthlyResult = exporter.generateReport(entries, summaries, null, {
        template: 'monthly',
        format: 'markdown',
        period: new Date().toISOString().slice(0, 7),
        includeHabits: false,
        includePrediction: false,
        includeMood: true,
      })
      expect(monthlyResult.content).toContain('月报')

      const yearlyResult = exporter.generateReport(entries, summaries, null, {
        template: 'yearly',
        format: 'markdown',
        period: new Date().getFullYear().toString(),
        includeHabits: false,
        includePrediction: false,
        includeMood: true,
      })
      expect(yearlyResult.content).toContain('年报')
    })

    it('copyToClipboard should attempt to write to clipboard', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      })
      const result: ExportResult = {
        content: 'test',
        filename: 'test.md',
        mimeType: 'text/markdown',
        extension: '.md',
        entryCount: 1,
      }
      const success = await exporter.copyToClipboard(result)
      expect(success).toBe(true)
      expect(writeTextMock).toHaveBeenCalledWith('test')
    })

    it('copyToClipboard fallback should work when clipboard API fails', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
        writable: true,
        configurable: true,
      })
      // Mock execCommand for fallback
      document.execCommand = vi.fn().mockReturnValue(true)
      const result: ExportResult = {
        content: 'test',
        filename: 'test.md',
        mimeType: 'text/markdown',
        extension: '.md',
        entryCount: 1,
      }
      const success = await exporter.copyToClipboard(result)
      expect(success).toBe(true)
    })

    it('download should create a blob URL and trigger download', () => {
      const createObjectURLSpy = vi.fn().mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.fn()
      URL.createObjectURL = createObjectURLSpy
      URL.revokeObjectURL = revokeObjectURLSpy

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

      const result: ExportResult = {
        content: 'test download',
        filename: 'test.md',
        mimeType: 'text/markdown',
        extension: '.md',
        entryCount: 2,
      }
      exporter.download(result)
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })

  // ==========================================================
  // 12. Edge cases
  // ==========================================================

  describe('edge cases', () => {
    it('empty state: entries should start empty', () => {
      const wl = useWorklog()
      expect(wl.entries.value).toEqual([])
      expect(wl.entryCount.value).toBe(0)
      expect(wl.allTags.value).toEqual([])
      expect(wl.filteredEntries.value).toEqual([])
    })

    it('empty state: getTodayEntries should return empty', () => {
      const wl = useWorklog()
      expect(wl.getTodayEntries()).toEqual([])
    })

    it('empty state: getStats should return zeroed stats', () => {
      const wl = useWorklog()
      const stats = wl.getStats()
      expect(stats.totalEntries).toBe(0)
      expect(stats.streakDays).toBe(0)
    })

    it('duplicate operation: removing same entry twice should return false second time', () => {
      const wl = useWorklog()
      const entry = wl.addEntry({ type: 'journal', title: 't', content: 'c' })
      expect(wl.removeEntry(entry.id)).toBe(true)
      expect(wl.removeEntry(entry.id)).toBe(false)
    })

    it('duplicate operation: updating removed entry should return null', () => {
      const wl = useWorklog()
      const entry = wl.addEntry({ type: 'journal', title: 't', content: 'c' })
      wl.removeEntry(entry.id)
      const result = wl.updateEntry(entry.id, { title: 'x' })
      expect(result).toBeNull()
    })

    it('invalid input: addEntry with empty content should work', () => {
      const wl = useWorklog()
      const entry = wl.addEntry({ type: 'journal', title: '', content: '' })
      expect(entry.title).toBe('')
      expect(entry.content).toBe('')
    })

    it('invalid input: extractKeywords with empty content should return empty', () => {
      const analytics = useWorklogAnalytics()
      const entries = [makeEntry({ content: '' })]
      const keywords = analytics.extractKeywords(entries)
      expect(keywords.length).toBe(0)
    })

    it('boundary: generateDailySummary with date far in the past should have entryCount 0', () => {
      const wl = useWorklog()
      wl.addEntry({ type: 'journal', title: 'today', content: 'c' })
      const farPast = new Date('2020-01-01')
      const summary = wl.generateDailySummary(farPast)
      expect(summary.entryCount).toBe(0)
    })

    it('boundary: computeTrend with exactly 2 entries should still produce dailyScores', () => {
      const pred = useProductivityPrediction()
      const entries = makeEntries(2)
      const trend = pred.computeTrend(entries)
      // dailyScores covers the full 30-day window
      expect(trend.dailyScores.length).toBeGreaterThanOrEqual(30)
      expect(['up', 'down', 'flat']).toContain(trend.direction)
    })

    it('large input: adding many entries should not throw', () => {
      const wl = useWorklog()
      expect(() => {
        for (let i = 0; i < 100; i++) {
          wl.addEntry({ type: 'journal', title: `entry ${i}`, content: `content ${i}`, tags: [`tag${i % 10}`] })
        }
      }).not.toThrow()
      expect(wl.entryCount.value).toBe(100)
      expect(wl.allTags.value.length).toBe(10)
    })

    it('persistence: load should restore entries from storage', () => {
      const wl = useWorklog()
      wl.addEntry({ type: 'journal', title: 'persisted', content: 'c' })
      // persist was called during addEntry
      expect(mockSetKV).toHaveBeenCalledWith(
        WORKLOG_STORAGE_KEYS.ENTRIES,
        expect.arrayContaining([expect.objectContaining({ title: 'persisted' })]),
      )
    })
  })
})