import { describe, expect, it } from 'vitest'
import { useExportEngine } from '../export-enhance'
import type { NarrativeReport } from '../narrative-generator'
import type { AnnualReview } from '../annual-review'
import type { EmotionCurve } from '../emotion-curve'
import type { TimelineRadarReport } from '../timeline-radar'
import type { RiverItem } from '../river'

function makeNarrative(): NarrativeReport {
  return {
    title: '本周叙事',
    type: 'weekly',
    dateRange: { start: '2026-09-14', end: '2026-09-20' },
    summary: '充实的一周',
    stats: {
      totalFocusMinutes: 300,
      totalCrystals: 5,
      totalNotes: 8,
      totalEmotions: 12,
      anchorCompletionRate: 80,
      averageDailyFocus: 43,
      dominantEmotion: 'happy',
    },
    segments: [
      {
        label: '周一',
        date: '2026-09-14',
        highlight: '开启专注',
        emotion: 'happy',
        insight: '节奏良好',
      },
    ],
    milestones: [],
    suggestions: [{ priority: 'high', title: '保持', description: '继续记录' }],
  } as unknown as NarrativeReport
}

function makeAnnualReview(): AnnualReview {
  return {
    id: 'ar_2026',
    year: 2026,
    title: '2026 年度回顾',
    summary: '稳步前行',
    stats: {
      totalFocusMinutes: 12000,
      focusDays: 200,
      avgDailyFocus: 60,
      longestStreak: 21,
      totalCrystals: 90,
      totalNotes: 150,
      emotionalHealthScore: 82,
      annualLevel: '成长者',
    },
    monthlyStats: [],
    milestones: [],
    growthTrajectory: {},
    keywords: [],
    yearComparison: undefined,
    insights: [],
    outlook: { message: '继续', goals: [] },
    createdAt: '2026-09-19T00:00:00.000Z',
  } as unknown as AnnualReview
}

function makeEmotionCurve(): EmotionCurve {
  return {
    name: '情感曲线',
    granularity: 'daily',
    dataPoints: [
      { date: '2026-09-14', label: '9/14', dominant: 'happy', intensity: 0.8, values: { happy: 4 } },
      { date: '2026-09-15', label: '9/15', dominant: 'calm', intensity: 0.6, values: { calm: 3 } },
    ],
    stats: {
      avgIntensity: 0.7,
      volatility: 0.2,
      positiveRatio: 0.8,
      dominantEmotion: 'happy',
      bestDay: { label: '9/14', dominant: 'happy' },
      worstDay: { label: '9/15', dominant: 'calm' },
    },
    trend: { direction: 'up', status: '上升', strength: 0.5, description: '情绪走高' },
    turningPoints: [],
  } as unknown as EmotionCurve
}

function makeRadar(): TimelineRadarReport {
  return {
    generatedAt: '2026-09-19T00:00:00.000Z',
    radar: { points: [{ label: '专注', value: 0.6 }] },
    heatmap: { maxFocusMinutes: 90, points: [] },
    emotionHeatmap: { points: [] },
    tagRadar: { points: [{ label: '读书', value: 0.5 }] },
  } as unknown as TimelineRadarReport
}

function makeItems(): RiverItem[] {
  const base = { session: undefined, note: undefined, crystal: undefined, anchor: undefined } as Partial<RiverItem>
  return [
    { ...(base as RiverItem), type: 'crystal', id: 'c1', ts: 1767148800000, crystal: { id: 'c1', insight: '顿悟', tags: ['思维'], elo: 0, qa: '' } },
    { ...(base as RiverItem), type: 'session', id: 's1', ts: 1767148800000, session: { id: 's1', taskId: 't1', elapsed: 3600000, tag: '专注' } },
  ] as unknown as RiverItem[]
}

describe('useExportEngine 时间导出引擎', () => {
  it('导出叙事报告（markdown）', () => {
    const engine = useExportEngine()
    const result = engine.exportNarrativeReport(makeNarrative(), 'markdown')
    expect(result.format).toBe('markdown')
    expect(result.filename.endsWith('.md')).toBe(true)
    expect(result.content).toContain('# 本周叙事')
    expect(result.content).toContain('专注总时长')
    expect(result.fileSize).toBeGreaterThan(0)
    expect(result.mimeType).toBe('text/markdown')
  })

  it('导出年度回顾（json）可解析', () => {
    const engine = useExportEngine()
    const result = engine.exportAnnualReview(makeAnnualReview(), 'json')
    const parsed = JSON.parse(result.content)
    expect(parsed.title).toBe('2026 年度回顾')
    expect(parsed.year).toBe(2026)
  })

  it('导出情感曲线 CSV 含表头与数据行', () => {
    const engine = useExportEngine()
    const result = engine.exportEmotionCurve(makeEmotionCurve(), 'csv')
    expect(result.content).toContain('日期,标签')
    expect(result.content).toContain('9/14')
    expect(result.content).toContain('9/15')
  })

  it('导出数据雷达（markdown）', () => {
    const engine = useExportEngine()
    const result = engine.exportRadar(makeRadar(), 'markdown')
    expect(result.content).toContain('# 时间线雷达报告')
    expect(result.content).toContain('专注')
  })

  it('导出原始数据 CSV 与 rowCount', () => {
    const engine = useExportEngine()
    const result = engine.exportRawData(makeItems(), 'csv')
    expect(result.content).toContain('类型,ID')
    expect(result.rowCount).toBe(2)
    expect(result.content).toContain('crystal')
  })

  it('批量导出任务记录历史并可清除', () => {
    const engine = useExportEngine()
    const task = engine.createBatchTask([
      { target: 'narrative', data: makeNarrative(), format: 'markdown' },
      { target: 'emotion_curve', data: makeEmotionCurve(), format: 'json' },
    ])
    const done = engine.executeBatchTask(task)
    expect(done.status).toBe('completed')
    expect(done.items.every(i => i.status === 'completed')).toBe(true)

    const history = engine.getHistory()
    expect(history.totalExports).toBe(2)
    expect(history.items.length).toBe(2)
    expect(history.lastExportAt).toBeTruthy()

    engine.clearHistory()
    expect(engine.getHistory().totalExports).toBe(0)
    expect(engine.getHistory().items.length).toBe(0)
  })

  it('提供内置导出模板并按目标过滤', () => {
    const engine = useExportEngine()
    const templates = engine.getTemplates()
    expect(templates.length).toBeGreaterThan(0)
    expect(templates.some(t => t.builtin)).toBe(true)
    const forNarrative = engine.getTemplatesFor('narrative', 'markdown')
    expect(forNarrative.length).toBeGreaterThan(0)
  })
})