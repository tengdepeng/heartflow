// ============================================================
// movement（律动）域 · 时区判别力测试（TZ 日键治理 · 日键第十一批）
//
// 覆盖 achievements.ts 消费侧三处桶键：
//  - 650 / 671 行 weekKey：weekStart 由本地分量构造后转 UTC（反向偏移陷阱）
//  - 695 行 dateStr：30 日唤醒度趋势桶键，须与已本地化的 MovementRecord.date 同基
// 另附 recovery-optimizer 677 行 streak expected 的同构校验（见 movement-datekey-contract.test.ts）
//
// 判别力前提：假时刻 = 本地 2026-03-15 00:30（UTC 仍为 2026-03-14）。
// 本地 03-15 00:10 的记录（UTC 03-14 16:10）若实现仍按 UTC 切日，会被错算到
// 03-14 而落空本地「今天」桶 ⇒ 用例转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import type { MovementRecord, MovementRhythm } from '../types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

/** 本地某日某时 → Date */
function localAt(dayOffset: number, hour: number, minute = 0): Date {
  return new Date(2026, 2, 15 + dayOffset, hour, minute, 0)
}

/** 构造一条记录：date 走本地日键（与 rhythm.ts:54 落库口径一致），timestamp 存完整 ISO */
function rec(id: string, dayOffset: number, hour: number, minute = 0, duration = 30): MovementRecord {
  const d = localAt(dayOffset, hour, minute)
  return {
    id, type: 'walking', duration, intensity: 'moderate',
    date: getLocalDateKey(d), timestamp: d.toISOString(),
  }
}

const RHYTHM: MovementRhythm = {
  weeklyTarget: 150, weeklyCompleted: 0, streak: 0, bestStreak: 0,
  favoriteTypes: [], bodyAwakening: 50,
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

describe('movement 域时区判别力 · 日键本地化', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('awakeningTrend：本地 03-15 凌晨记录归入 03-15 桶（UTC 口径会错归 03-14）', async () => {
    const { useRhythmAnalysis } = await import('../achievements')
    const { analyzeRhythm } = useRhythmAnalysis()
    const records = [rec('r1', 0, 0, 10)]
    const res = analyzeRhythm(records, RHYTHM)
    // 末位桶 = 本地今天 03-15，应命中这条凌晨记录
    const trend = res.awakeningTrend
    expect(trend[trend.length - 1].date).toBe('2026-03-15')
    expect(trend[trend.length - 1].score).toBeGreaterThan(0)
    // 前一位桶 = 03-14，不应命中
    expect(trend[trend.length - 2].date).toBe('2026-03-14')
    expect(trend[trend.length - 2].score).toBe(0)
  })

  it('awakeningTrend：昨日 23:30 记录归入 03-14 桶而非 03-15（防错吞）', async () => {
    const { useRhythmAnalysis } = await import('../achievements')
    const { analyzeRhythm } = useRhythmAnalysis()
    const records = [rec('y', -1, 23, 30)]
    const trend = analyzeRhythm(records, RHYTHM).awakeningTrend
    expect(trend[trend.length - 1].date).toBe('2026-03-15')
    expect(trend[trend.length - 1].score).toBe(0)
    expect(trend[trend.length - 2].date).toBe('2026-03-14')
    expect(trend[trend.length - 2].score).toBeGreaterThan(0)
  })

  it('weeklyTrend：周桶键为本地日历日（非 UTC 前一天）', async () => {
    const { useRhythmAnalysis } = await import('../achievements')
    const { analyzeRhythm } = useRhythmAnalysis()
    // 2026-03-15 是周日，getDay()=0 ⇒ 该实现以周日为周首，weekStart 即记录本地日
    const records = [rec('w', 0, 0, 10)] // 本地 03-15 00:10（UTC 03-14）
    const trend = analyzeRhythm(records, RHYTHM).weeklyTrend
    expect(trend.length).toBeGreaterThan(0)
    // 走本地口径 ⇒ 键为 03-15；走 UTC 口径 ⇒ 会退到 03-14
    expect(trend[trend.length - 1].week).toBe('2026-03-15')
  })

  it('weeklyTrend：同一周不同时刻的记录归入同一桶（周一与周日同属 03-15 那个周）', async () => {
    const { useRhythmAnalysis } = await import('../achievements')
    const { analyzeRhythm } = useRhythmAnalysis()
    // 03-15（周日）与 03-16（周一）：getDay 分别为 0 与 1
    //   → weekStart 分别为 03-15 与 03-15（周一减 1 天回周日）
    const records = [rec('sun', 0, 12, 0), rec('mon', 1, 12, 0)]
    const trend = analyzeRhythm(records, RHYTHM).weeklyTrend
    const weeks = trend.map((w) => w.week)
    expect(weeks).toContain('2026-03-15')
    // 周一那条也归 03-15（本地口径）；UTC 口径下它会落到 03-16 而被拆成两个桶
    expect(weeks).not.toContain('2026-03-14')
    expect(new Set(weeks).size).toBe(1)
  })
})
