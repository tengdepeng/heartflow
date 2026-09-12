// ============================================================
// 时间·透视（TimeLensPanel）数据契约测试
// 面板复用的 timeline 分析管线（radar/heatmap/emotion/annual）
// 在数据为空 / 有数据时正确输出可渲染结构。
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  createRiverItems,
  generateTimelineRadarReport,
  generateRadarChart,
  generateDayHourHeatmap,
  generateFocusRadar,
  useEmotionCurve,
  useAnnualReview,
} from '../index'
import type { RiverSource, RiverItem } from '../index'

const NOW = new Date()
// 会话固定用 2026-09-11（周五）：weekdayFocusRatio 断言依赖会话落在工作日，
// 若改用"今天"，周末运行（两个会话都在周末）会令断言失败。
const SESSION_DATE = '2026-09-11'

function makeSource(partial?: Partial<RiverSource>): RiverSource {
  return {
    crystals: [],
    sessions: [
      {
        id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1500000,
        elapsed: 1500000, startedAt: `${SESSION_DATE}T09:00:00`, pausedDuration: 0,
        pausedAt: null, completedAt: `${SESSION_DATE}T09:25:00`, tags: ['写作'],
        note: '', carrierId: null,
      },
      {
        id: 's2', status: 'completed', mode: 'focus', plannedDuration: 3600000,
        elapsed: 3600000, startedAt: `${SESSION_DATE}T14:00:00`, pausedDuration: 0,
        pausedAt: null, completedAt: `${SESSION_DATE}T15:00:00`, tags: ['阅读'],
        note: '', carrierId: null,
      },
    ],
    emotions: [{ id: 'e1', type: 'calm', note: '', createdAt: NOW.toISOString() }],
    notes: [{ id: 'n1', title: '一片笔记', content: '一片笔记的内容', tags: ['写作'], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }],
    anchors: [{ id: 'a1', text: '愿望', done: false, targetDate: '2026-08-24', priority: 'must', driftCount: 0, createdAt: NOW.toISOString() }],
    bodyLogs: [],
    habits: [],
    movementRecords: [],
    breakRecords: [],
    dialogueSessions: [],
    ...partial,
  }
}

const ALL = ['crystal', 'note', 'emotion', 'session', 'anchor'] as const
const riverItems = (s: RiverSource): RiverItem[] => createRiverItems(s, [...ALL])

describe('TimeLensPanel 数据契约', () => {
  it('空源时雷达各维度归一化安全（maxValue 至少为 1）', () => {
    const empty = makeSource({
      sessions: [], emotions: [], notes: [], anchors: [], crystals: [],
    })
    const radar = generateRadarChart(empty)
    expect(radar.points).toHaveLength(6)
    expect(radar.maxValue).toBeGreaterThanOrEqual(1)
    radar.points.forEach(p => expect(p.value).toBeGreaterThanOrEqual(0))
  })

  it('有专注数据时雷达 focus 维度 rawValue 为专注分钟总数', () => {
    const radar = generateRadarChart(makeSource())
    const focus = radar.points.find(p => p.dimension === 'focus')!
    expect(focus.rawValue).toBe(85) // 25 + 60 分钟
  })

  it('DayHour 热力格为 7×24，且能聚合出活跃时段', () => {
    const heat = generateDayHourHeatmap(makeSource())
    expect(heat.cells).toHaveLength(168)
    expect(heat.mostActiveDay).toBeGreaterThanOrEqual(0)
    expect(heat.mostActiveDay).toBeLessThan(7)
    expect(heat.weekdayFocusRatio).toBe(999) // 周五工作日，无周末专注
  })

  it('专注雷达输出星期/时段条目与最佳窗口', () => {
    const focus = generateFocusRadar(makeSource())
    expect(focus.byDayOfWeek).toHaveLength(7)
    expect(focus.byTimeOfDay).toHaveLength(4)
    expect(focus.overallEfficiency).toBeGreaterThanOrEqual(0)
    expect(focus.bestWindow.avgMinutes).toBeGreaterThan(0)
  })

  it('综合报告含 radar/heatmap/emotionHeatmap/tagRadar/focusRadar', () => {
    const report = generateTimelineRadarReport(makeSource())
    expect(report.radar.points.length).toBeGreaterThan(0)
    expect(report.heatmap.cells.length).toBe(168)
    expect(report.emotionHeatmap.dominantEmotion).toBe('calm')
    expect(report.tagRadar.clusters.length).toBeGreaterThan(0)
    expect(report.focusRadar.overallEfficiency).toBeGreaterThanOrEqual(0)
  })

  it('情感曲线 buildCurve 输出强度在 0-1 之间', () => {
    const ec = useEmotionCurve()
    const curve = ec.buildCurve('情感曲线', riverItems(makeSource()), 'daily')
    curve.dataPoints.forEach(p => {
      expect(p.intensity).toBeGreaterThanOrEqual(0)
      expect(p.intensity).toBeLessThanOrEqual(1)
    })
  })

  it('年度回顾可生成且返回完整结构', () => {
    const ar = useAnnualReview()
    const year = new Date().getFullYear()
    const review = ar.generateReview(riverItems(makeSource()), year)
    expect(review).toHaveProperty('stats')
    expect(review).toHaveProperty('growthTrajectory')
    expect(review).toHaveProperty('keywords')
    expect(review).toHaveProperty('outlook')
  })

  it('年度回顾对无数据年份给出空统计不抛错', () => {
    const ar = useAnnualReview()
    const emptyItems = riverItems(makeSource({
      sessions: [], emotions: [], notes: [], anchors: [], crystals: [],
    }))
    const year = 1999
    expect(() => ar.generateReview(emptyItems, year)).not.toThrow()
    const review = ar.generateReview(emptyItems, year)
    expect(review.stats.totalFocusMinutes).toBe(0)
  })
})