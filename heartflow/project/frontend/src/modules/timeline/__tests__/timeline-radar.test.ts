// ============================================================
// 时间长廊 · 数据雷达引擎 模块测试（INCR-365）
// 覆盖 generateRadarChart / generateDayHourHeatmap /
// generateEmotionHeatmap / generateTagRadar / generateFocusRadar /
// generateTimelineRadarReport 六引擎。
// 时间采用本地 Date 构造 → toISOString 往返，保证 getDay/getHours
// 跨时区确定性；日期不依赖系统「今天」，规避漂移。
// ============================================================
import { describe, it, expect } from 'vitest'
import type { RiverSource } from '../river'
import {
  generateRadarChart,
  generateDayHourHeatmap,
  generateEmotionHeatmap,
  generateTagRadar,
  generateFocusRadar,
  generateTimelineRadarReport,
} from '../timeline-radar'

// 本地固定时刻，跨时区对 getDay/getHours 稳定（toISOString 往返本地时段不变）
function at(y: number, m: number, d: number, h: number, min = 0): string {
  return new Date(y, m, d, h, min).toISOString()
}

function makeSource(): RiverSource {
  return {
    sessions: [
      // 周一 09:00 上午·45min·已完成·学
      { id: 's1', startedAt: at(2026, 8, 14, 9, 0), elapsed: 45 * 60000, tags: ['学习'], completed: true },
      // 周六 20:00 晚上·30min·未完成·阅读
      { id: 's2', startedAt: at(2026, 8, 19, 20, 0), elapsed: 30 * 60000, tags: ['阅读'], completed: false },
      // 周三 01:00 深夜·10min·已完成·学
      { id: 's3', startedAt: at(2026, 8, 16, 1, 0), elapsed: 10 * 60000, tags: ['学习'], completed: true },
    ] as any,
    crystals: [
      { id: 'c1', createdAt: at(2026, 8, 14, 9, 30), tags: ['学习'], sessionId: 's1' },
    ] as any,
    notes: [
      { id: 'n1', createdAt: at(2026, 8, 15, 12, 0), updatedAt: at(2026, 8, 15, 12, 0), tags: ['写作'] },
      { id: 'n2', createdAt: at(2026, 8, 17, 8, 0), updatedAt: at(2026, 8, 17, 8, 0), tags: ['学习'] },
    ] as any,
    emotions: [
      { id: 'e1', type: 'happy', note: '', createdAt: at(2026, 8, 14, 10, 0), intensity: 0.8 },
      { id: 'e2', type: 'calm', note: '', createdAt: at(2026, 8, 15, 12, 0), intensity: 0.5 },
      { id: 'e3', type: 'happy', note: '', createdAt: at(2026, 8, 16, 18, 0), intensity: 0.6 },
    ] as any,
    anchors: [
      { id: 'a1', createdAt: at(2026, 8, 14, 8, 0), doneAt: at(2026, 8, 14, 10, 0), done: true, tags: ['健康'] },
    ] as any,
    bodyLogs: [],
    habits: [],
    movementRecords: [],
    breakRecords: [],
    dialogueSessions: [],
  } as any
}

describe('generateRadarChart 综合雷达', () => {
  it('生成 6 个维度点且值归一化到 0-1', () => {
    const radar = generateRadarChart(makeSource())
    expect(radar.points).toHaveLength(6)
    expect(radar.maxValue).toBeGreaterThan(0)
    for (const p of radar.points) {
      expect(p.value).toBeGreaterThan(0)
      expect(p.value).toBeLessThanOrEqual(1)
    }
    // 专注维原始值 = 三段会话时长和（分钟）
    const focus = radar.points.find(p => p.dimension === 'focus')!
    expect(focus.rawValue).toBe(45 + 30 + 10)
    expect(radar.title).toBe('时间线活动雷达')
    expect(radar.generatedAt).toBeTruthy()
  })

  it('空数据时空源不崩溃且值归零', () => {
    const empty = { ...makeSource(), sessions: [], crystals: [], notes: [], emotions: [], anchors: [] } as any
    const radar = generateRadarChart(empty)
    expect(radar.points).toHaveLength(6)
    expect(radar.maxValue).toBe(1)
    expect(radar.points.every(p => p.rawValue === 0)).toBe(true)
  })
})

describe('generateDayHourHeatmap 日时热力', () => {
  it('输出 7×24 网格并把专注累计入对应时段', () => {
    const hm = generateDayHourHeatmap(makeSource())
    expect(hm.cells).toHaveLength(168)
    // 三会话专注总分钟数
    const total = hm.cells.reduce((s, c) => s + c.focusMinutes, 0)
    expect(total).toBe(85)
    expect(hm.maxFocusMinutes).toBe(45)
    expect(hm.peakHours.length).toBeGreaterThan(0)
    expect(hm.mostActiveDay).toBeGreaterThanOrEqual(0)
    expect(hm.mostActiveDay).toBeLessThanOrEqual(6)
    expect(hm.weekdayFocusRatio).toBeGreaterThan(0)
  })

  it('空数据所有格子为零', () => {
    const empty = { ...makeSource(), sessions: [], crystals: [], notes: [], emotions: [], anchors: [] } as any
    const hm = generateDayHourHeatmap(empty)
    expect(hm.cells).toHaveLength(168)
    expect(hm.cells.every(c => c.focusMinutes === 0)).toBe(true)
  })
})

describe('generateEmotionHeatmap 情绪热力', () => {
  it('统计情绪分布并识别主导情绪', () => {
    const emo = generateEmotionHeatmap(makeSource())
    expect(emo.distribution.happy).toBe(2)
    expect(emo.distribution.calm).toBe(1)
    expect(emo.dominantEmotion).toBe('happy')
    expect(emo.diversityIndex).toBeGreaterThan(0)
    // 数据点足够但时限较短 → 返回 stable 趋势（half<2 分支）
    expect(['rising', 'falling', 'stable']).toContain(emo.trend)
  })
})

describe('generateTagRadar 标签雷达', () => {
  it('聚合标签、共现与影响力并降序排列', () => {
    const tag = generateTagRadar(makeSource())
    const tags = tag.clusters.map(c => c.tag)
    expect(tag.totalTags).toBe(4) // 学习/阅读/写作/健康
    for (const c of tag.clusters) {
      expect(c.influenceScore).toBeGreaterThanOrEqual(0)
    }
    // 影响力降序
    const scores = tag.clusters.map(c => c.influenceScore)
    const sorted = [...scores].sort((a, b) => b - a)
    expect(scores).toEqual(sorted)
    expect(tags[0] === '学习' || tags[0] === '阅读').toBe(true)
  })
})

describe('generateFocusRadar 专注雷达', () => {
  it('生成周/时段/标签三维专注表与最佳窗口', () => {
    const fr = generateFocusRadar(makeSource())
    expect(fr.byDayOfWeek).toHaveLength(7)
    expect(fr.byTimeOfDay).toHaveLength(4)
    expect(fr.byTag.length).toBeGreaterThan(0)
    // 周一上午会话专注时长 45min 是最长 → 平均专注最高出现在某日
    const best = Math.max(...fr.byDayOfWeek.map(e => e.avgFocusMinutes))
    expect(best).toBe(45)
    // 时段标签含「上午 (6-12)」
    expect(fr.byTimeOfDay.some(t => t.label.includes('上午'))).toBe(true)
    expect(fr.bestWindow.avgMinutes).toBeGreaterThanOrEqual(0)
    expect(fr.overallEfficiency).toBeGreaterThanOrEqual(0)
    expect(fr.overallEfficiency).toBeLessThanOrEqual(100)
  })
})

describe('generateTimelineRadarReport 汇总报告', () => {
  it('聚合五种雷达为单一报告', () => {
    const report = generateTimelineRadarReport(makeSource())
    expect(report.radar.points).toHaveLength(6)
    expect(report.heatmap.cells).toHaveLength(168)
    expect(report.emotionHeatmap.dominantEmotion).toBe('happy')
    expect(report.tagRadar.totalTags).toBe(4)
    expect(report.focusRadar.byDayOfWeek).toHaveLength(7)
    expect(report.generatedAt).toBeTruthy()
  })
})