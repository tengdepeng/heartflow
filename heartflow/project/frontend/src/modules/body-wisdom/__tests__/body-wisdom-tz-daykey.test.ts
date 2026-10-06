// ============================================================
// body-wisdom 域 · 时区判别力测试（TZ 日键治理 INCR-466 · 日键第八批）
//
// 覆盖藏象阁 5 引擎 + 视图的本地日历日口径：
//  - meridians：getTodayRecords / getStats().recentTrend 的「今日」与「近 7 日」桶
//  - meridian-visualization：热力图 / 趋势图 / 聚合趋势的按日分桶
//  - passive-health-imagery：todayStr 默认基准（近 7 日窗口边界）
//  - body-wisdom-bridge：moodTrend 的按日分桶
//  - constitution-trend：趋势图 / 养生评分趋势的日期标签
//
// 判别力前提（已用 node 枚举确认）：假时刻 = 本地 2026-03-15 00:30，
// 此刻 UTC 仍是 2026-03-14（本地日 = UTC 日 +1）。因此：
//  - 本地 03-14 23:30 的记录（UTC 03-14）若实现仍按 UTC 切日，
//    会被错算进「今天（本地 03-15）」⇒ 用例转红；
//  - 本地 03-15 00:10 的记录日期标签若仍按 UTC 切，会显示为 03-14 ⇒ 用例转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { storage } from '../../../engine/storage'
import { getLocalDateKey } from '../../../utils/time'
import { BODY_WISDOM_STORAGE_KEYS } from '../types'
import type { MeridianRecord, MoodRecord } from '../types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

/** 本地某日某时 → Date */
function localAt(dayOffset: number, hour: number, minute = 0): Date {
  return new Date(2026, 2, 15 + dayOffset, hour, minute, 0)
}

function meridianRecord(id: string, recordedAt: string): MeridianRecord {
  return { id, meridian: 'liver', feeling: 'good', recordedAt, hour: 0 }
}

const WELLNESS_KEYS = {
  wellnessScores: 'hf:body-wisdom:wellness-scores',
  trendHistory: 'hf:body-wisdom:constitution-trend-history',
} as const

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  storage.setKV(BODY_WISDOM_STORAGE_KEYS.MERIDIANS, [])
  storage.setKV(BODY_WISDOM_STORAGE_KEYS.MOODS, [])
  storage.setKV(WELLNESS_KEYS.wellnessScores, [])
  storage.setKV(WELLNESS_KEYS.trendHistory, [])
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
})

describe('body-wisdom 域时区判别力 · 日键本地化', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('meridians：getTodayRecords 只认本地今天（昨日 23:30 不算）', async () => {
    storage.setKV(BODY_WISDOM_STORAGE_KEYS.MERIDIANS, [
      meridianRecord('y', localAt(-1, 23, 30).toISOString()),
      meridianRecord('t', localAt(0, 0, 10).toISOString()),
    ])
    const { useMeridianTracker } = await import('../meridians')
    const tracker = useMeridianTracker()
    await tracker.load()
    expect(tracker.getTodayRecords().map(r => r.id)).toEqual(['t'])
  })

  it('meridians：recentTrend 末位为本地今天、倒数第二位为昨天', async () => {
    storage.setKV(BODY_WISDOM_STORAGE_KEYS.MERIDIANS, [
      meridianRecord('y', localAt(-1, 23, 30).toISOString()),
    ])
    const { useMeridianTracker } = await import('../meridians')
    const tracker = useMeridianTracker()
    await tracker.load()
    const trend = tracker.getStats().recentTrend
    expect(trend[6].date).toBe('03-15')
    expect(trend[6].goodRate).toBe(0) // 今天无记录
    expect(trend[5].date).toBe('03-14')
    expect(trend[5].goodRate).toBe(100) // 昨天 23:30 的记录归昨天
  })

  it('meridian-visualization：热力图 / 趋势图 / 聚合趋势按本地日分桶', async () => {
    const { useMeridianVisualization } = await import('../meridian-visualization')
    const viz = useMeridianVisualization()
    const records = [meridianRecord('y', localAt(-1, 23, 30).toISOString())]

    const heat = viz.computeHeatmapData(records).find(h => h.meridian === 'liver')!
    expect(heat.dailyFeelings[6].feeling).toBeNull() // 今天
    expect(heat.dailyFeelings[5].feeling).toBe('good') // 昨天

    const trend = viz.computeTrendData(records, 'liver')
    expect(trend[29].recordCount).toBe(0) // 今天
    expect(trend[28].recordCount).toBe(1) // 昨天

    const agg = viz.computeAggregateTrend(records)
    expect(agg.labels[6]).toBe('03-15')
    const liver = agg.datasets.find(d => d.meridian === 'liver')!
    expect(liver.data[6]).toBe(0)
    expect(liver.data[5]).toBe(100)
  })

  it('passive-health-imagery：近 7 日窗口以本地今天为基准（第 8 天前的记录不计入）', async () => {
    const { derivePassiveHealthImagery } = await import('../passive-health-imagery')
    // 本地 03-07 12:00（距本地今天 03-15 已第 8 天）→ 应落在 7 日窗口之外
    const outside = derivePassiveHealthImagery({
      bodyLogs: [{ type: 'exercise', value: { minutes: 30 }, at: localAt(-8, 12, 0).toISOString() }],
    })
    expect(outside).toHaveLength(1)
    expect(outside[0].source).toBe('neutral-placeholder')

    // 本地 03-08 12:00（恰为窗口首日）→ 应计入
    const inside = derivePassiveHealthImagery({
      bodyLogs: [{ type: 'exercise', value: { minutes: 30 }, at: localAt(-7, 12, 0).toISOString() }],
    })
    expect(inside.some(s => s.key === '运动')).toBe(true)
  })

  it('body-wisdom-bridge：moodTrend 按本地日分桶（昨日 23:30 归昨天）', async () => {
    storage.setKV(BODY_WISDOM_STORAGE_KEYS.MOODS, [
      { id: 'm', mood: 'happy', insight: '', recordedAt: localAt(-1, 23, 30).toISOString() } as MoodRecord,
    ])
    const { useBodyWisdomBridge } = await import('../body-wisdom-bridge')
    const bridge = useBodyWisdomBridge()
    const trend = bridge.moodTrend.value
    expect(trend[13].positiveRate).toBe(0) // 今天
    expect(trend[12].positiveRate).toBe(100) // 昨天
  })

  it('constitution-trend：趋势图与养生评分的日期标签为本地日历日', async () => {
    storage.setKV(WELLNESS_KEYS.wellnessScores, [
      {
        overall: 70,
        dimensions: { physical: 70, emotional: 70, seasonal: 70, meridian: 70, lifestyle: 70 },
        labels: { physical: '体质', emotional: '情绪', seasonal: '季节适配', meridian: '经络', lifestyle: '作息' },
        change: 0,
        trend: 'stable',
        assessedAt: localAt(0, 0, 10).toISOString(),
      },
    ])
    storage.setKV(WELLNESS_KEYS.trendHistory, [
      {
        date: localAt(0, 0, 10).toISOString(),
        type: 'balanced',
        label: '平和质',
        scores: { balanced: 0.8 },
        primaryScore: 0.8,
        stability: 1,
      },
    ])
    const { useConstitutionTrend } = await import('../constitution-trend')
    const trend = useConstitutionTrend()
    expect(trend.wellnessTrend.value[0].date).toBe('2026-03-15')
    expect(trend.trendChartData.value!.labels[0]).toBe('2026-03-15')
  })
})