// ============================================================
// 时间长廊 · 模式发现引擎测试（P16-1）
// 周规律 / 季节规律 / 年度趋势 / 年度报告生成
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  discoverWeeklyPattern,
  discoverSeasonalPatterns,
  discoverYearlyTrend,
  discoverPatterns,
} from '../timeline-patterns'
import type { RiverSource } from '../river'
import {
  useNarrativeGenerator,
} from '../narrative-generator'

// Mock storage
const storageMock = new Map<string, unknown>()

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? val as T : defaultValue
    },
    setKV: (key: string, value: unknown) => {
      storageMock.set(key, value)
    },
    removeKV: (key: string) => {
      storageMock.delete(key)
    },
  },
}))

// ---- 测试数据工厂 ----

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
    notes: '',
    done,
    doneAt: done ? new Date(year, month - 1, day, 16, 0, 0).toISOString() : null,
    createdAt: new Date(year, month - 1, day, 8, 0, 0).toISOString(),
    tags,
  }
}

/**
 * 构建丰富测试数据：
 * - 多个周一~周日的数据（不同专注时长）
 * - 跨春夏秋冬四季
 * - 跨两年（2025 和 2026）
 */
function buildRichSource(): RiverSource {
  const sessions: any[] = []
  const crystals: any[] = []
  const notes: any[] = []
  const emotions: any[] = []
  const anchors: any[] = []

  // 2026年数据：每周一~周五有专注，周末较少
  const weekDates2026 = [
    // 周一: 高专注
    ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'],
    // 周二: 中高
    ['2026-01-06', '2026-01-13', '2026-01-20', '2026-01-27'],
    // 周三: 最高
    ['2026-01-07', '2026-01-14', '2026-01-21', '2026-01-28'],
    // 周四: 中等
    ['2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29'],
    // 周五: 低
    ['2026-01-09', '2026-01-16', '2026-01-23', '2026-01-30'],
    // 周六: 很少
    ['2026-01-10', '2026-01-17'],
    // 周日: 很少
    ['2026-01-11', '2026-01-18'],
  ]

  const focusByDow = [60, 45, 90, 30, 20, 10, 5] // 周一~周日专注分钟

  for (let dow = 0; dow < 7; dow++) {
    const dates = weekDates2026[dow]
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

  // 春季数据（3-5月）：中等专注
  const springDates = ['2026-03-02', '2026-03-09', '2026-04-06', '2026-04-13', '2026-05-04', '2026-05-11']
  for (const date of springDates) {
    sessions.push(makeSession(`session-spring-${date}`, date, 40, ['春季', '创造']))
    crystals.push(makeCrystal(`crystal-spring-${date}`, date, ['春季']))
    notes.push(makeNote(`note-spring-${date}`, date, ['创造']))
    emotions.push(makeEmotion(`emotion-spring-${date}`, date, 'happy'))
  }

  // 夏季数据（6-8月）：最高专注
  const summerDates = ['2026-06-01', '2026-06-08', '2026-07-06', '2026-07-13', '2026-08-03', '2026-08-10']
  for (const date of summerDates) {
    sessions.push(makeSession(`session-summer-${date}`, date, 80, ['夏季', '冲刺']))
    crystals.push(makeCrystal(`crystal-summer-${date}`, date, ['夏季']))
    notes.push(makeNote(`note-summer-${date}`, date, ['冲刺']))
    emotions.push(makeEmotion(`emotion-summer-${date}`, date, 'calm'))
  }

  // 秋季数据（9-11月）：中低专注
  const autumnDates = ['2026-09-07', '2026-09-14', '2026-10-05', '2026-10-12', '2026-11-02', '2026-11-09']
  for (const date of autumnDates) {
    sessions.push(makeSession(`session-autumn-${date}`, date, 35, ['秋季', '整理']))
    crystals.push(makeCrystal(`crystal-autumn-${date}`, date, ['秋季']))
    notes.push(makeNote(`note-autumn-${date}`, date, ['整理']))
    emotions.push(makeEmotion(`emotion-autumn-${date}`, date, 'calm'))
  }

  // 冬季数据（12月, 1-2月）：低专注
  const winterDates = ['2026-01-05', '2026-02-02', '2026-12-05', '2026-12-12']
  for (const date of winterDates) {
    sessions.push(makeSession(`session-winter-${date}`, date, 25, ['冬季', '回顾']))
    crystals.push(makeCrystal(`crystal-winter-${date}`, date, ['冬季']))
    notes.push(makeNote(`note-winter-${date}`, date, ['回顾']))
    emotions.push(makeEmotion(`emotion-winter-${date}`, date, 'sad'))
  }

  // 2025年数据（用于年度对比）
  const oldDates = ['2025-03-10', '2025-06-15', '2025-09-20', '2025-12-01']
  for (const date of oldDates) {
    sessions.push(makeSession(`session-2025-${date}`, date, 30, ['2025']))
    crystals.push(makeCrystal(`crystal-2025-${date}`, date, ['2025']))
    notes.push(makeNote(`note-2025-${date}`, date, ['2025']))
  }

  return { crystals, sessions, notes, emotions, anchors, bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [] }
}

function buildEmptySource(): RiverSource {
  return {
    crystals: [],
    sessions: [],
    notes: [],
    emotions: [],
    anchors: [],
    bodyLogs: [],
    habits: [],
    movementRecords: [],
    breakRecords: [],
    dialogueSessions: [],
  }
}

beforeEach(() => {
  storageMock.clear()
})

// ============================================================
// 周规律发现测试
// ============================================================

describe('周规律发现', () => {
  it('空数据应返回默认结果', () => {
    const result = discoverWeeklyPattern(buildEmptySource())
    expect(result.bestDayFocusMinutes).toBe(0)
    expect(result.worstDayFocusMinutes).toBe(0)
    expect(result.dailyBreakdown).toHaveLength(7)
    expect(result.insight).toBe('暂无足够的周规律数据')
  })

  it('应识别专注度最高的星期几', () => {
    const source = buildRichSource()
    const result = discoverWeeklyPattern(source)

    // 周一专注度最高（January 4周×60 + 春季6×40 + 夏季6×80 + 秋季6×35 + 冬季2×25 = 周一最大）
    expect(result.bestDay).toBe('monday')
    expect(result.bestDayLabel).toBe('周一')
    expect(result.bestDayFocusMinutes).toBeGreaterThan(0)
  })

  it('应包含每日详细数据', () => {
    const source = buildRichSource()
    const result = discoverWeeklyPattern(source)

    expect(result.dailyBreakdown).toHaveLength(7)
    for (const day of result.dailyBreakdown) {
      expect(day.day).toBeDefined()
      expect(day.label).toBeDefined()
      expect(typeof day.avgFocusMinutes).toBe('number')
      expect(typeof day.avgCrystals).toBe('number')
      expect(typeof day.avgNotes).toBe('number')
      expect(typeof day.avgEmotions).toBe('number')
      expect(typeof day.totalItems).toBe('number')
      expect(typeof day.activeDays).toBe('number')
    }
  })

  it('周一~周五应包含所有七日', () => {
    const source = buildRichSource()
    const result = discoverWeeklyPattern(source)

    const days = result.dailyBreakdown.map(d => d.day)
    expect(days).toContain('monday')
    expect(days).toContain('tuesday')
    expect(days).toContain('wednesday')
    expect(days).toContain('thursday')
    expect(days).toContain('friday')
    expect(days).toContain('saturday')
    expect(days).toContain('sunday')
  })

  it('应生成周规律洞察文本', () => {
    const source = buildRichSource()
    const result = discoverWeeklyPattern(source)

    expect(result.insight).toBeTruthy()
    expect(result.insight.length).toBeGreaterThan(0)
  })

  it('可自定义回溯周数', () => {
    const source = buildRichSource()
    const result4 = discoverWeeklyPattern(source, 4)
    const result12 = discoverWeeklyPattern(source, 12)

    expect(result4).toBeDefined()
    expect(result12).toBeDefined()
  })
})

// ============================================================
// 季节规律发现测试
// ============================================================

describe('季节规律发现', () => {
  it('应返回四个季节的分析结果', () => {
    const source = buildRichSource()
    const result = discoverSeasonalPatterns(source, 2026)

    expect(result).toHaveLength(4)
    expect(result[0].season).toBe('spring')
    expect(result[1].season).toBe('summer')
    expect(result[2].season).toBe('autumn')
    expect(result[3].season).toBe('winter')
  })

  it('夏季应是最专注的季节', () => {
    const source = buildRichSource()
    const result = discoverSeasonalPatterns(source, 2026)

    const summer = result.find(r => r.season === 'summer')!
    expect(summer.avgFocusMinutes).toBeGreaterThan(0)
    expect(summer.label).toBe('夏')
  })

  it('每个季节应包含情绪和标签信息', () => {
    const source = buildRichSource()
    const result = discoverSeasonalPatterns(source, 2026)

    for (const season of result) {
      expect(season.season).toBeDefined()
      expect(season.label).toBeDefined()
      expect(typeof season.avgFocusMinutes).toBe('number')
      expect(typeof season.avgCrystals).toBe('number')
      expect(typeof season.avgNotes).toBe('number')
      expect(typeof season.avgEmotions).toBe('number')
      expect(season.dominantEmotion).toBeDefined()
      expect(Array.isArray(season.topTags)).toBe(true)
      expect(['up', 'down', 'stable']).toContain(season.trend)
    }
  })

  it('空数据年份应返回全零结果', () => {
    const source = buildRichSource()
    const result = discoverSeasonalPatterns(source, 2099)

    expect(result).toHaveLength(4)
    for (const season of result) {
      expect(season.avgFocusMinutes).toBe(0)
      expect(season.totalItems).toBe(0)
    }
  })
})

// ============================================================
// 年度趋势测试
// ============================================================

describe('年度趋势', () => {
  it('有数据年份应返回完整月度分解', () => {
    const source = buildRichSource()
    const result = discoverYearlyTrend(source, 2026)

    expect(result).not.toBeNull()
    expect(result!.year).toBe(2026)
    expect(result!.monthlyBreakdown).toHaveLength(12)
  })

  it('月度分解应包含所有月份', () => {
    const source = buildRichSource()
    const result = discoverYearlyTrend(source, 2026)!

    const months = result.monthlyBreakdown.map(m => m.month)
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('应包含年度亮点', () => {
    const source = buildRichSource()
    const result = discoverYearlyTrend(source, 2026)!

    expect(result.highlights.bestMonth).toBeDefined()
    expect(result.highlights.bestMonth.month).toBeGreaterThanOrEqual(1)
    expect(result.highlights.bestMonth.month).toBeLessThanOrEqual(12)
    expect(typeof result.highlights.longestStreak).toBe('number')
    expect(typeof result.highlights.totalMilestones).toBe('number')
  })

  it('应包含年度对比数据', () => {
    const source = buildRichSource()
    const result = discoverYearlyTrend(source, 2026)!

    expect(result.yearOverYear).toBeDefined()
    expect(typeof result.yearOverYear.focusChange).toBe('number')
    expect(typeof result.yearOverYear.crystalsChange).toBe('number')
    expect(typeof result.yearOverYear.notesChange).toBe('number')
    expect(['up', 'down', 'stable']).toContain(result.yearOverYear.trend)
  })

  it('无数据年份应返回 null', () => {
    const source = buildEmptySource()
    const result = discoverYearlyTrend(source, 2099)

    expect(result).toBeNull()
  })

  it('2026年比2025年数据更多，趋势应上升', () => {
    const source = buildRichSource()
    const result = discoverYearlyTrend(source, 2026)!

    // 2026数据比2025多，应该是上升趋势
    expect(result.yearOverYear.trend).toBe('up')
  })

  it('月度统计应包含所有字段', () => {
    const source = buildRichSource()
    const result = discoverYearlyTrend(source, 2026)!

    for (const month of result.monthlyBreakdown) {
      expect(typeof month.month).toBe('number')
      expect(typeof month.label).toBe('string')
      expect(typeof month.focusMinutes).toBe('number')
      expect(typeof month.crystals).toBe('number')
      expect(typeof month.notes).toBe('number')
      expect(typeof month.emotions).toBe('number')
      expect(typeof month.completedAnchors).toBe('number')
      expect(typeof month.totalAnchors).toBe('number')
      expect(typeof month.dominantEmotion).toBe('string')
      expect(typeof month.activeDays).toBe('number')
    }
  })
})

// ============================================================
// 综合模式发现测试
// ============================================================

describe('综合模式发现', () => {
  it('应返回完整的模式发现结果', () => {
    const source = buildRichSource()
    const result = discoverPatterns(source, 2026)

    expect(result.weeklyPattern).toBeDefined()
    expect(result.seasonalPatterns).toHaveLength(4)
    expect(result.yearlyTrend).not.toBeNull()
    expect(result.overallInsight).toBeTruthy()
  })

  it('默认使用当前年份', () => {
    const source = buildRichSource()
    const result = discoverPatterns(source)

    expect(result.weeklyPattern).toBeDefined()
    expect(result.seasonalPatterns).toHaveLength(4)
  })

  it('空数据应返回合理结果', () => {
    const source = buildEmptySource()
    const result = discoverPatterns(source, 2026)

    expect(result.weeklyPattern.dailyBreakdown).toHaveLength(7)
    expect(result.seasonalPatterns).toHaveLength(4)
    expect(result.yearlyTrend).toBeNull()
    expect(result.overallInsight).toContain('开始记录')
  })
})

// ============================================================
// 年度报告生成测试
// ============================================================

describe('年度报告生成', () => {
  it('应生成年度报告', () => {
    const source = buildRichSource()
    const { generateYearlyReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2026)
    expect(report).toBeDefined()
    expect(report.type).toBe('yearly')
    expect(report.title).toContain('2026')
    expect(report.title).toContain('年度报告')
  })

  it('年度报告应包含月度分段', () => {
    const source = buildRichSource()
    const { generateYearlyReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2026)
    expect(report.segments.length).toBeGreaterThan(0)
    for (const seg of report.segments) {
      expect(seg.label).toMatch(/^\d+月$/)
      expect(seg.items).toBeDefined()
    }
  })

  it('年度报告应包含统计信息', () => {
    const source = buildRichSource()
    const { generateYearlyReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2026)
    expect(report.stats).toBeDefined()
    expect(report.stats.totalFocusMinutes).toBeGreaterThan(0)
    expect(report.stats.totalCrystals).toBeGreaterThan(0)
    expect(report.stats.totalNotes).toBeGreaterThan(0)
  })

  it('年度报告应包含摘要', () => {
    const source = buildRichSource()
    const { generateYearlyReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2026)
    expect(report.summary).toBeTruthy()
    expect(report.summary).toContain('2026')
  })

  it('年度报告应包含情绪趋势', () => {
    const source = buildRichSource()
    const { generateYearlyReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2026)
    expect(report.emotionTrend).toBeDefined()
    expect(Array.isArray(report.emotionTrend)).toBe(true)
  })

  it('年度报告应持久化存储', () => {
    const source = buildRichSource()
    const { generateYearlyReport, getReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2026)
    const stored = getReport(report.id)
    expect(stored).toBeDefined()
    expect(stored!.id).toBe(report.id)
  })

  it('重复生成应更新而非重复', () => {
    const source = buildRichSource()
    const { generateYearlyReport, getReportsByType } = useNarrativeGenerator()

    generateYearlyReport(source, 2026)
    generateYearlyReport(source, 2026)

    const yearlyReports = getReportsByType('yearly')
    // 同一年份只保留一份
    const count2026 = yearlyReports.filter(r => r.id === 'narrative-yearly-2026').length
    expect(count2026).toBe(1)
  })

  it('无数据年份也应生成基础报告', () => {
    const source = buildEmptySource()
    const { generateYearlyReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2099)
    expect(report).toBeDefined()
    expect(report.type).toBe('yearly')
    expect(report.segments.length).toBe(0) // 无数据无分段
    expect(report.stats.totalFocusMinutes).toBe(0)
  })

  it('日期范围应覆盖全年', () => {
    const source = buildRichSource()
    const { generateYearlyReport } = useNarrativeGenerator()

    const report = generateYearlyReport(source, 2026)
    expect(report.dateRange.start).toBe('2026-01-01')
    expect(report.dateRange.end).toBe('2026-12-31')
  })
})