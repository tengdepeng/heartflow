// ============================================================
// 息壤档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  restOverview,
  restActivityRows,
  restRhythm,
  restHealth,
  restInsights,
} from '../rest-analytics'
import type { BreakRecord } from '../types'
import { DEFAULT_PRACTICES } from '../types'

const DAY = 86_400_000

function mk(activity: string, duration: number, mood: number, date: string): BreakRecord {
  return { id: `${activity}_${Math.random().toString(36).slice(2, 6)}`, activity, duration, mood, date }
}

const NOW = new Date('2026-08-22T12:00:00.000Z')
function isoDate(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * DAY).toISOString().split('T')[0]
}

describe('restOverview', () => {
  it('空记录返回全零概览', () => {
    const ov = restOverview([], NOW)
    expect(ov.total).toBe(0)
    expect(ov.totalMinutes).toBe(0)
    expect(ov.thisMonth).toBe(0)
    expect(ov.avgDuration).toBe(0)
    expect(ov.avgMood).toBe(0)
    expect(ov.distinctDays).toBe(0)
    expect(ov.lastActive).toBeNull()
  })

  it('统计总数/时长/平均时长/平均心情', () => {
    const records = [mk('meditation', 15, 4, isoDate(1)), mk('walk', 30, 5, isoDate(2))]
    const ov = restOverview(records, NOW)
    expect(ov.total).toBe(2)
    expect(ov.totalMinutes).toBe(45)
    expect(ov.avgDuration).toBe(23)
    expect(ov.avgMood).toBe(4.5)
  })

  it('统计本月次数与时长', () => {
    const records = [mk('meditation', 20, 4, isoDate(1)), mk('walk', 10, 3, isoDate(150))]
    const ov = restOverview(records, NOW)
    expect(ov.thisMonth).toBe(1)
    expect(ov.thisMonthMinutes).toBe(20)
  })

  it('统计不同天数', () => {
    const records = [mk('meditation', 15, 4, isoDate(1)), mk('walk', 20, 5, isoDate(1)), mk('tea', 10, 3, isoDate(4))]
    const ov = restOverview(records, NOW)
    expect(ov.distinctDays).toBe(2)
  })
})

describe('restActivityRows', () => {
  it('分布并计算占比与时长', () => {
    const records = [
      mk('p1', 15, 4, isoDate(1)), // 冥想
      mk('p1', 20, 5, isoDate(2)),
      mk('p3', 30, 4, isoDate(3)), // 散步
    ]
    const rows = restActivityRows(records, DEFAULT_PRACTICES, 6)
    expect(rows[0].activity).toBe('p1')
    expect(rows[0].count).toBe(2)
    expect(rows[0].pct).toBe(67)
    expect(rows[0].minutes).toBe(35)
    expect(rows[0].name).toBe('冥想')
  })

  it('空记录返回空数组', () => {
    expect(restActivityRows([], DEFAULT_PRACTICES, 6)).toEqual([])
  })

  it('尊重 limit', () => {
    const records = [
      mk('meditation', 1, 4, isoDate(1)),
      mk('walk', 1, 4, isoDate(2)),
      mk('tea', 1, 4, isoDate(3)),
      mk('stretch', 1, 4, isoDate(4)),
    ]
    const rows = restActivityRows(records, DEFAULT_PRACTICES, 2)
    expect(rows.length).toBe(2)
  })
})

describe('restRhythm', () => {
  it('统计近 7 天次数与时长', () => {
    const records = [
      mk('meditation', 15, 4, isoDate(1)),
      mk('walk', 30, 5, isoDate(20)),
      mk('tea', 10, 3, isoDate(60)),
    ]
    const rh = restRhythm(records, NOW)
    expect(rh.weeklyCount).toBe(1)
    expect(rh.weeklyMinutes).toBe(15)
  })

  it('连续休息天数', () => {
    const records = [
      mk('meditation', 15, 4, isoDate(0)),
      mk('walk', 20, 5, isoDate(1)),
      mk('tea', 10, 4, isoDate(2)),
    ]
    const rh = restRhythm(records, NOW)
    expect(rh.streakDays).toBe(3)
  })

  it('单日峰值次数', () => {
    const records = [
      mk('meditation', 15, 4, isoDate(1)),
      mk('walk', 10, 4, isoDate(1)),
      mk('tea', 10, 4, isoDate(1)),
      mk('stretch', 5, 4, isoDate(4)),
    ]
    const rh = restRhythm(records, NOW)
    expect(rh.peakDayCount).toBe(3)
  })

  it('无记录时默认零', () => {
    const rh = restRhythm([], NOW)
    expect(rh.weeklyCount).toBe(0)
    expect(rh.streakDays).toBe(0)
    expect(rh.avgGapDays).toBe(0)
    expect(rh.peakDayCount).toBe(0)
  })
})

describe('restHealth', () => {
  it('空库恢复健康为零（休土待垦）', () => {
    const h = restHealth([], DEFAULT_PRACTICES, NOW)
    expect(h.score).toBe(0)
    expect(h.breadth).toBe(0)
    expect(h.cadence).toBe(0)
    expect(h.nurture).toBe(0)
    expect(h.label).toBe('休土待垦')
  })

  it('活动多样且时长充足得高分', () => {
    const records = Array.from({ length: 14 }, (_, i) => mk('meditation', 25, 5, isoDate(i)))
    records.push(
      mk('walk', 25, 4, isoDate(0)),
      mk('tea', 20, 4, isoDate(1)),
      mk('stretch', 20, 4, isoDate(2)),
      mk('reading', 25, 4, isoDate(3)),
      mk('music', 20, 4, isoDate(4)),
    )
    const h = restHealth(records, DEFAULT_PRACTICES, NOW)
    expect(h.breadth).toBeGreaterThan(50)
    expect(h.cadence).toBeGreaterThan(60)
    expect(h.nurture).toBeGreaterThan(60)
    expect(h.label).toBe('土壤丰润')
  })

  it('活动越多样 breadth 越高', () => {
    const single = Array.from({ length: 10 }, (_, i) => mk('meditation', 20, 4, isoDate(i)))
    const multi = Array.from({ length: 10 }, (_, i) => mk(['walk', 'tea', 'stretch'][i % 3], 20, 4, isoDate(i)))
    expect(restHealth(multi, DEFAULT_PRACTICES, NOW).breadth).toBeGreaterThan(
      restHealth(single, DEFAULT_PRACTICES, NOW).breadth,
    )
  })
})

describe('restInsights', () => {
  it('空库给出温和引导', () => {
    const insights = restInsights([], DEFAULT_PRACTICES, NOW)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0]).toContain('息壤')
  })

  it('心情高时肯定滋养', () => {
    const insights = restInsights([mk('meditation', 20, 5, isoDate(1))], DEFAULT_PRACTICES, NOW, 10)
    expect(insights.some((s) => s.includes('心情') || s.includes('起效'))).toBe(true)
  })

  it('连续休息时提示成形', () => {
    const records = [
      mk('meditation', 20, 4, isoDate(0)),
      mk('walk', 15, 4, isoDate(1)),
      mk('tea', 10, 4, isoDate(2)),
    ]
    const insights = restInsights(records, DEFAULT_PRACTICES, NOW, 10)
    expect(insights.some((s) => s.includes('连续'))).toBe(true)
  })

  it('尊重 limit 限制', () => {
    const records = [mk('meditation', 20, 4, isoDate(1)), mk('walk', 15, 4, isoDate(20))]
    const insights = restInsights(records, DEFAULT_PRACTICES, NOW, 2)
    expect(insights.length).toBeLessThanOrEqual(2)
  })
})