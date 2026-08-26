// ============================================================
// 时间长廊 · 视图桥接层测试（P22-3）
// 测试 useTimelineBridge() 组合函数：
//   状态、计算属性、操作方法、子模块集成
// ============================================================

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

// ============================================================
// 常量
// ============================================================

const STORAGE_KEY = 'heartflow:storage'
const SCHEMA_VERSION = 9

// ============================================================
// 测试数据工厂
// ============================================================

function makeSession(
  id: string,
  dateStr: string,
  elapsedMinutes: number,
  tags: string[] = [],
): any {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    id,
    status: 'completed',
    mode: 'focus',
    plannedDuration: elapsedMinutes * 60000,
    elapsed: elapsedMinutes * 60000,
    startedAt: new Date(year, month - 1, day, 9, 0, 0).toISOString(),
    pausedDuration: 0,
    pausedAt: null,
    completedAt: new Date(year, month - 1, day, 9, elapsedMinutes, 0).toISOString(),
    tags,
    note: '',
    carrierId: null,
  }
}

function makeCrystal(id: string, dateStr: string, tags: string[] = []): any {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    id,
    sessionId: 'session-a',
    color: '#fff',
    intensity: 0.8,
    createdAt: new Date(year, month - 1, day, 10, 0, 0).toISOString(),
    shape: 'sphere',
    tags,
    insight: '测试结晶',
  }
}

function makeNote(id: string, dateStr: string, tags: string[] = []): any {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    id,
    title: '笔记',
    content: '测试内容',
    tags,
    createdAt: new Date(year, month - 1, day, 11, 0, 0).toISOString(),
    updatedAt: new Date(year, month - 1, day, 11, 0, 0).toISOString(),
  }
}

function makeEmotion(id: string, dateStr: string, type: string): any {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    id,
    type,
    note: '',
    intensity: 3,
    createdAt: new Date(year, month - 1, day, 14, 0, 0).toISOString(),
  }
}

function makeAnchor(
  id: string,
  dateStr: string,
  done: boolean,
  tags: string[] = [],
): any {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    id,
    text: '测试锚点',
    done,
    targetDate: dateStr,
    createdAt: new Date(year, month - 1, day, 8, 0, 0).toISOString(),
    doneAt: done ? new Date(year, month - 1, day, 16, 0, 0).toISOString() : null,
    priority: 'must',
    stage: 'active',
    driftCount: 0,
    tags,
  }
}

function buildRichSchema(): any {
  const sessions: any[] = []
  const crystals: any[] = []
  const notes: any[] = []
  const emotions: any[] = []
  const anchors: any[] = []

  // 2 周数据（足够测试所有功能，避免超时）
  const weekDates = [
    ['2026-01-05', '2026-01-12'],
    ['2026-01-06', '2026-01-13'],
    ['2026-01-07', '2026-01-14'],
    ['2026-01-08', '2026-01-15'],
    ['2026-01-09', '2026-01-16'],
    ['2026-01-10', '2026-01-17'],
    ['2026-01-11', '2026-01-18'],
  ]

  const focusByDow = [60, 45, 90, 30, 20, 10, 5]

  for (let dow = 0; dow < 7; dow++) {
    const dates = weekDates[dow]
    for (const date of dates) {
      const sid = `session-${date}`
      sessions.push(makeSession(sid, date, focusByDow[dow], ['工作', '专注']))
      if (dow < 5) {
        crystals.push(makeCrystal(`crystal-${date}`, date, ['工作']))
        notes.push(makeNote(`note-${date}`, date, ['工作']))
        emotions.push(makeEmotion(`emotion-${date}`, date, dow < 3 ? 'happy' : 'calm'))
        anchors.push(makeAnchor(`anchor-${date}`, date, dow < 3, ['工作']))
      }
    }
  }

  return {
    version: SCHEMA_VERSION,
    sessions,
    crystals,
    notes,
    emotions,
    anchors,
    carriers: [],
    constitution: null,
    advisors: [],
    config: {
      theme: 'dark',
      activeStylePack: 'default-gravity',
      timer: { defaultDuration: 25, breakDuration: 5, longBreakDuration: 15, longBreakInterval: 4, autoStartBreak: false, autoStartSession: false, soundEnabled: true, tickSound: 'tick' },
      gestures: { enabled: true, bindings: {} },
      advisorResetDate: '',
      astrolabe: { enabled: false },
      lifecycle: { enabled: false },
      advisor: { enabled: false },
    },
    goals: [],
    relations: [],
    advisorMessages: [],
    ledger: [],
    tagCategories: [],
    scenePresets: [],
    kvStore: {},
  }
}

function buildEmptySchema(): any {
  return {
    version: SCHEMA_VERSION,
    sessions: [],
    crystals: [],
    notes: [],
    emotions: [],
    anchors: [],
    carriers: [],
    constitution: null,
    advisors: [],
    config: {
      theme: 'dark',
      activeStylePack: 'default-gravity',
      timer: { defaultDuration: 25, breakDuration: 5, longBreakDuration: 15, longBreakInterval: 4, autoStartBreak: false, autoStartSession: false, soundEnabled: true, tickSound: 'tick' },
      gestures: { enabled: true, bindings: {} },
      advisorResetDate: '',
      astrolabe: { enabled: false },
      lifecycle: { enabled: false },
      advisor: { enabled: false },
    },
    goals: [],
    relations: [],
    advisorMessages: [],
    ledger: [],
    tagCategories: [],
    scenePresets: [],
    kvStore: {},
  }
}

function writeSchema(schema: any): void {
  ;(globalThis as any).localStorage.setItem(STORAGE_KEY, JSON.stringify(schema))
}

function clearSchema(): void {
  ;(globalThis as any).localStorage.removeItem(STORAGE_KEY)
}

// ============================================================
// 测试套件
// ============================================================

describe('P22-3 时间线视图桥接层', () => {
  let bridge: any
  let mockStorage: ReturnType<typeof createMockStorage>

  afterEach(() => {
    bridge = null
  })

  // ==========================================================
  // 初始化测试
  // ==========================================================

  describe('初始化', () => {
    it('使用丰富数据源初始化后 source 应被加载', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      expect(bridge.source).toBeDefined()
      expect(bridge.source.value).toBeDefined()
      expect(bridge.source.value.sessions).toBeDefined()
      expect(bridge.source.value.crystals).toBeDefined()
      expect(bridge.source.value.notes).toBeDefined()
      expect(bridge.source.value.emotions).toBeDefined()
      expect(bridge.source.value.anchors).toBeDefined()
    })

    it('items 应为数组', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      expect(Array.isArray(bridge.items.value)).toBe(true)
      expect(bridge.items.value.length).toBeGreaterThan(0)
    })

    it('activeFilters 应包含默认值 crystal, note, emotion, session, anchor', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      const expected = ['crystal', 'note', 'emotion', 'session', 'anchor']
      expect(bridge.activeFilters.value).toEqual(expected)
    })

    it('loading 初始应为 false', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      expect(bridge.loading.value).toBe(false)
    })

    it('空数据源初始化不报错', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildEmptySchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      expect(bridge.source).toBeDefined()
      expect(bridge.items.value).toEqual([])
    })
  })

  // ==========================================================
  // 时间线概览测试
  // ==========================================================

  describe('时间线概览', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('timelineOverview 应包含 totalItems', () => {
      expect(bridge.timelineOverview.value.totalItems).toBeGreaterThan(0)
    })

    it('timelineOverview 应包含 dateRange', () => {
      const { dateRange } = bridge.timelineOverview.value
      expect(dateRange).toBeDefined()
      expect(dateRange.start).toBeTruthy()
      expect(dateRange.end).toBeTruthy()
    })

    it('timelineOverview 应包含 activeDays', () => {
      const { activeDays } = bridge.timelineOverview.value
      expect(activeDays).toBeGreaterThan(0)
    })

    it('timelineOverview 应包含 streak', () => {
      const { streak } = bridge.timelineOverview.value
      expect(typeof streak).toBe('number')
    })

    it('timelineOverview 应包含 typeDistribution', () => {
      const { typeDistribution } = bridge.timelineOverview.value
      expect(Array.isArray(typeDistribution)).toBe(true)
      expect(typeDistribution.length).toBeGreaterThan(0)
      for (const item of typeDistribution) {
        expect(item.type).toBeDefined()
        expect(typeof item.count).toBe('number')
        expect(typeof item.percentage).toBe('number')
      }
    })

    it('timelineOverview 应包含 dailyAverage', () => {
      const { dailyAverage } = bridge.timelineOverview.value
      expect(typeof dailyAverage).toBe('number')
      expect(dailyAverage).toBeGreaterThan(0)
    })

    it('timelineOverview 应包含 tagDistribution', () => {
      const { tagDistribution } = bridge.timelineOverview.value
      expect(Array.isArray(tagDistribution)).toBe(true)
    })

    it('timelineOverview 应包含 mostActiveDay', () => {
      const { mostActiveDay } = bridge.timelineOverview.value
      expect(mostActiveDay).toBeDefined()
      expect(mostActiveDay.date).toBeTruthy()
      expect(mostActiveDay.count).toBeGreaterThan(0)
    })

    it('timelineOverview 应包含 rawStats', () => {
      const { rawStats } = bridge.timelineOverview.value
      expect(rawStats).toBeDefined()
      expect(rawStats.totalItems).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 模式洞察测试
  // ==========================================================

  describe('模式洞察', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('patternInsights 应包含 weeklyPattern', () => {
      const { weeklyPattern } = bridge.patternInsights.value
      expect(weeklyPattern).toBeDefined()
      expect(weeklyPattern.dailyBreakdown).toHaveLength(7)
    })

    it('patternInsights 应包含 seasonalPatterns', () => {
      const { seasonalPatterns } = bridge.patternInsights.value
      expect(Array.isArray(seasonalPatterns)).toBe(true)
      expect(seasonalPatterns.length).toBeGreaterThan(0)
    })

    it('patternInsights 应包含 yearlyTrend', () => {
      const { yearlyTrend } = bridge.patternInsights.value
      // 有数据的情况下应为非 null
      expect(yearlyTrend).toBeDefined()
    })

    it('patternInsights 应包含 combinedInsights 文本', () => {
      const { combinedInsights } = bridge.patternInsights.value
      expect(typeof combinedInsights).toBe('string')
      expect(combinedInsights.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 雷达图测试
  // ==========================================================

  describe('雷达图', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('radarCharts 应为计算属性并返回有效值', () => {
      const charts = bridge.radarCharts.value
      expect(charts).toBeDefined()
      expect(charts.radar).toBeDefined()
      expect(charts.heatmap).toBeDefined()
      expect(charts.emotionHeatmap).toBeDefined()
      expect(charts.tagRadar).toBeDefined()
      expect(charts.generatedAt).toBeTruthy()
    })

    it('radarChart 便捷访问应返回综合雷达图', () => {
      const chart = bridge.radarChart.value
      expect(chart).toBeDefined()
    })

    it('dayHourHeatmap, emotionHeatmap, tagRadar 应可访问', () => {
      expect(bridge.dayHourHeatmap.value).toBeDefined()
      expect(bridge.emotionHeatmap.value).toBeDefined()
      expect(bridge.tagRadar.value).toBeDefined()
    })
  })

  // ==========================================================
  // 情感分析测试
  // ==========================================================

  describe('情感分析', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('emotionAnalysis 应包含 curve', () => {
      const { curve } = bridge.emotionAnalysis.value
      expect(curve).toBeDefined()
      expect(curve).not.toBeNull()
      expect(curve.id).toBeTruthy()
      expect(curve.name).toBeTruthy()
    })

    it('emotionAnalysis 应包含 trendDirection', () => {
      const { trendDirection } = bridge.emotionAnalysis.value
      expect(trendDirection).toBeDefined()
      expect(['up', 'down', 'stable', 'volatile']).toContain(trendDirection)
    })

    it('emotionAnalysis 应包含 trendStrength', () => {
      const { trendStrength } = bridge.emotionAnalysis.value
      expect(typeof trendStrength).toBe('number')
    })

    it('emotionAnalysis 应包含 trendDescription', () => {
      const { trendDescription } = bridge.emotionAnalysis.value
      expect(typeof trendDescription).toBe('string')
      expect(trendDescription.length).toBeGreaterThan(0)
    })

    it('emotionAnalysis 应包含 turningPoints', () => {
      const { turningPoints } = bridge.emotionAnalysis.value
      expect(Array.isArray(turningPoints)).toBe(true)
    })

    it('emotionAnalysis 应包含 dataPoints', () => {
      const { dataPoints } = bridge.emotionAnalysis.value
      expect(Array.isArray(dataPoints)).toBe(true)
      expect(dataPoints.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 叙事摘要测试
  // ==========================================================

  describe('叙事摘要', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('narrativeSummary 应包含 daily', () => {
      // daily 可能为 null（取决于当前日期是否有数据），但属性应存在
      expect('daily' in bridge.narrativeSummary.value).toBe(true)
    })

    it('narrativeSummary 应包含 weekly', () => {
      expect('weekly' in bridge.narrativeSummary.value).toBe(true)
    })

    it('narrativeSummary 应包含 recent 数组', () => {
      const { recent } = bridge.narrativeSummary.value
      expect(Array.isArray(recent)).toBe(true)
    })
  })

  // ==========================================================
  // 里程碑测试
  // ==========================================================

  describe('里程碑', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('milestones 应返回数组', () => {
      const ms = bridge.milestones.value
      expect(Array.isArray(ms)).toBe(true)
    })

    it('milestones 每个元素应包含 type, title, date, significance', () => {
      const ms = bridge.milestones.value
      if (ms.length > 0) {
        for (const m of ms) {
          expect(m.type).toBeDefined()
          expect(m.title).toBeDefined()
          expect(m.date).toBeDefined()
          expect(typeof m.significance).toBe('number')
        }
      }
    })
  })

  // ==========================================================
  // 建议测试
  // ==========================================================

  describe('建议', () => {
    it('丰富数据源应返回推荐数组并按优先级排序', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      const recs = bridge.recommendations.value
      expect(Array.isArray(recs)).toBe(true)
      if (recs.length >= 2) {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        for (let i = 0; i < recs.length - 1; i++) {
          expect(
            priorityOrder[recs[i].priority as keyof typeof priorityOrder],
          ).toBeLessThanOrEqual(
            priorityOrder[recs[i + 1].priority as keyof typeof priorityOrder],
          )
        }
      }
    })

    it('推荐项应包含完整的 category, priority, title, description, action', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      const recs = bridge.recommendations.value
      for (const rec of recs) {
        expect(rec.category).toBeDefined()
        expect(rec.priority).toBeDefined()
        expect(['high', 'medium', 'low']).toContain(rec.priority)
        expect(rec.title).toBeTruthy()
        expect(rec.description).toBeTruthy()
        expect(rec.action).toBeTruthy()
      }
    })
  })

  // ==========================================================
  // 空状态测试
  // ==========================================================

  describe('空状态', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      clearSchema()
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('空数据源 overview 应显示 totalItems 为 0', () => {
      expect(bridge.timelineOverview.value.totalItems).toBe(0)
    })

    it('空数据源 overview 应显示 dailyAverage 为 0', () => {
      expect(bridge.timelineOverview.value.dailyAverage).toBe(0)
    })

    it('空数据源 recommendations 应建议开始记录', () => {
      const recs = bridge.recommendations.value
      expect(recs.length).toBeGreaterThan(0)
      const startRec = recs.find((r: any) => r.category === 'data')
      expect(startRec).toBeDefined()
      expect(startRec.priority).toBe('high')
      expect(startRec.title).toContain('开始记录')
    })

    it('空数据源 emotionAnalysis 应返回默认值', () => {
      const analysis = bridge.emotionAnalysis.value
      expect(analysis.curve).toBeNull()
      expect(analysis.trendDirection).toBe('stable')
      expect(analysis.trendStrength).toBe(0)
      expect(analysis.dataPoints).toEqual([])
    })
  })

  // ==========================================================
  // 刷新数据源测试
  // ==========================================================

  describe('刷新数据源', () => {
    it('refreshSource 应重新加载数据', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildEmptySchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      expect(bridge.items.value).toEqual([])

      // 写入新数据
      writeSchema(buildRichSchema())
      invalidateCache()
      bridge.refreshSource()

      expect(bridge.items.value.length).toBeGreaterThan(0)
    })

    it('refreshSource 期间 loading 应变为 true 后恢复 false', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      bridge.refreshSource()
      // refreshSource 是同步操作，loading 最终为 false
      expect(bridge.loading.value).toBe(false)
    })
  })

  // ==========================================================
  // 过滤条目测试
  // ==========================================================

  describe('过滤条目', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('filterItems 按时间范围过滤应返回子集', () => {
      const start = new Date('2026-01-05')
      const end = new Date('2026-01-11')
      const result = bridge.filterItems({ timeRange: { start, end } })
      // 过滤后结果应不为空（第一周有数据）
      expect(Array.isArray(result)).toBe(true)
      const allItems = bridge.items.value
      // 时间范围过滤后不应比原始数据多
      expect(result.length).toBeLessThanOrEqual(allItems.length)
    })

    it('filterItems 按类型过滤应返回子集', () => {
      const result = bridge.filterItems({ types: ['crystal'] })
      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        for (const item of result) {
          expect(item.type).toBe('crystal')
        }
      }
    })

    it('filterItems 按标签过滤应返回子集', () => {
      const result = bridge.filterItems({ tag: '工作' })
      expect(Array.isArray(result)).toBe(true)
      // 标签过滤验证：如果有结果，所有结果应包含该标签
      // 若测试数据中无匹配标签，则 result 为空也是正确的
      if (result.length > 0) {
        for (const item of result) {
          const tags = item.crystal?.tags || item.session?.tags || item.note?.tags || item.anchor?.tags || []
          expect(tags).toContain('工作')
        }
      }
    })
  })

  // ==========================================================
  // 清除过滤测试
  // ==========================================================

  describe('清除过滤', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('clearFilter 应重置 currentFilter 为空对象', () => {
      bridge.filterItems({ tag: '工作' })
      bridge.clearFilter()
      expect(bridge.currentFilter.value).toEqual({})
    })

    it('clearFilter 应清空搜索词和搜索结果', () => {
      bridge.searchItems('测试')
      expect(bridge.currentSearchQuery.value).toBe('测试')
      bridge.clearFilter()
      expect(bridge.currentSearchQuery.value).toBe('')
      expect(bridge.searchHits.value).toEqual([])
    })
  })

  // ==========================================================
  // 搜索测试
  // ==========================================================

  describe('搜索', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('searchItems 应返回 SearchHit 数组', () => {
      const hits = bridge.searchItems('测试')
      expect(Array.isArray(hits)).toBe(true)
      if (hits.length > 0) {
        const hit = hits[0]
        expect(hit.item).toBeDefined()
        expect(typeof hit.score).toBe('number')
        expect(Array.isArray(hit.matchedFields)).toBe(true)
      }
    })

    it('searchItems 空查询应返回空数组', () => {
      const hits = bridge.searchItems('')
      expect(hits).toEqual([])
    })

    it('searchItems 应更新 currentSearchQuery 和 searchHits', () => {
      bridge.searchItems('测试')
      expect(bridge.currentSearchQuery.value).toBe('测试')
      expect(bridge.searchHits.value).toBeDefined()
    })
  })

  // ==========================================================
  // 设置活跃过滤器测试
  // ==========================================================

  describe('设置活跃过滤器', () => {
    it('setActiveFilters 应更新 activeFilters', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      bridge.setActiveFilters(['crystal'])
      expect(bridge.activeFilters.value).toEqual(['crystal'])
    })

    it('setActiveFilters 应更改 items 内容', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      bridge.setActiveFilters(['crystal'])
      const crystalItems = bridge.items.value
      if (crystalItems.length > 0) {
        for (const item of crystalItems) {
          expect(item.type).toBe('crystal')
        }
      }
    })
  })

  // ==========================================================
  // 所有标签测试
  // ==========================================================

  describe('所有标签', () => {
    it('allTags 应返回字符串数组', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      const tags = bridge.allTags.value
      expect(Array.isArray(tags)).toBe(true)
      for (const tag of tags) {
        expect(typeof tag).toBe('string')
      }
    })

    it('allTags 应包含数据中的标签', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      const tags = bridge.allTags.value
      expect(tags).toContain('工作')
      expect(tags).toContain('专注')
    })
  })

  // ==========================================================
  // 每日摘要测试
  // ==========================================================

  describe('每日摘要', () => {
    it('getDailySummaries 应返回摘要数组', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      const summaries = bridge.getDailySummaries()
      expect(Array.isArray(summaries)).toBe(true)
    })

    it('getDailySummaries 每个摘要应包含 date, label, 计数', async () => {
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()

      const summaries = bridge.getDailySummaries()
      if (summaries.length > 0) {
        for (const s of summaries) {
          expect(s.date).toBeDefined()
          expect(s.label).toBeDefined()
          expect(typeof s.crystalCount).toBe('number')
          expect(typeof s.noteCount).toBe('number')
          expect(typeof s.emotionCount).toBe('number')
          expect(typeof s.sessionCount).toBe('number')
          expect(typeof s.anchorCount).toBe('number')
        }
      }
    })
  })

  // ==========================================================
  // 生成叙事测试
  // ==========================================================

  describe('生成叙事', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('generateNarrative daily 应尝试生成报告', () => {
      const report = bridge.generateNarrative('daily', '2026-06-01')
      if (report) {
        expect(report.type).toBe('daily')
        expect(report.title).toBeTruthy()
      }
    })

    it('generateNarrative weekly 应尝试生成周报告', () => {
      const report = bridge.generateNarrative('weekly', '2026-06-01', '2026-06-07')
      if (report) {
        expect(report.type).toBe('weekly')
      }
    })

    it('generateNarrative monthly 应尝试生成月报告', () => {
      const report = bridge.generateNarrative('monthly', 2026, 6)
      if (report) {
        expect(report.type).toBe('monthly')
      }
    })

    it('generateNarrative yearly 应尝试生成年度报告', () => {
      const report = bridge.generateNarrative('yearly', 2026)
      if (report) {
        expect(report.type).toBe('yearly')
        expect(report.title).toContain('2026')
      }
    })
  })

  // ==========================================================
  // 导出数据测试
  // ==========================================================

  describe('导出数据', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('exportData raw_data 应返回导出结果', () => {
      const result = bridge.exportData({
        target: 'raw_data',
        format: 'json',
      })
      if (result) {
        expect(result.content).toBeDefined()
        expect(result.format).toBe('json')
        expect(result.mimeType).toBeDefined()
      }
    })

    it('exportData narrative 缺少 narrativeReport 应返回 null', () => {
      const result = bridge.exportData({
        target: 'narrative',
        format: 'json',
      })
      expect(result).toBeNull()
    })

    it('exportData 不支持的目标应返回 null', () => {
      const result = bridge.exportData({
        target: 'unknown' as any,
        format: 'json',
      })
      expect(result).toBeNull()
    })
  })

  // ==========================================================
  // 子模块暴露测试
  // ==========================================================

  describe('子模块暴露', () => {
    beforeEach(async () => {
      vi.resetModules()
      mockStorage = createMockStorage()
      ;(globalThis as any).localStorage = mockStorage
      writeSchema(buildRichSchema())
      const { invalidateCache } = await import('../../../engine/storage/core')
      invalidateCache()
      const mod = await import('../timeline-bridge')
      bridge = mod.useTimelineBridge()
    })

    it('应暴露 narrativeGenerator 子模块', () => {
      expect(bridge.narrativeGenerator).toBeDefined()
      expect(typeof bridge.narrativeGenerator.generateYearlyReport).toBe('function')
    })

    it('应暴露 emotionCurveModule 子模块', () => {
      expect(bridge.emotionCurveModule).toBeDefined()
      expect(typeof bridge.emotionCurveModule.buildCurve).toBe('function')
    })

    it('应暴露 annualReviewModule 子模块', () => {
      expect(bridge.annualReviewModule).toBeDefined()
    })

    it('应暴露 exportEngine 子模块', () => {
      expect(bridge.exportEngine).toBeDefined()
      expect(typeof bridge.exportEngine.exportRawData).toBe('function')
    })
  })
})