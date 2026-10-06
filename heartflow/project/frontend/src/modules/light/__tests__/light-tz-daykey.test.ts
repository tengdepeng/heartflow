// ============================================================
// light（留光阁）域 · 时区判别力测试（TZ 日键治理 · 日键第九批）
//
// 覆盖：recordMeditation / release 落库 date 本地化、calculateMeditationStreak
// 整簇同基、light-bridge meditationTrend 按本地日分桶。
//
// 判别力前提：假时刻 = 本地 2026-03-15 00:30（UTC 仍为 2026-03-14）。
// 本地 03-14 23:30 记录（UTC 03-14 15:30）若实现仍按 UTC 切日，会被错算；
// 本地 03-15 00:30 记录落库 date 应为本地 03-15（UTC 口径下会退成 03-14）。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { storage } from '../../../engine/storage'
import { LIGHT_STORAGE_KEYS } from '../types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  // storage 为单例且 resetModules 不重置它，必须显式清空 light key，
  // 否则下一用例动态 import 的全新 pavilion 会从持久化 storage 读回上轮记录
  storage.setKV(LIGHT_STORAGE_KEYS.meditations, [])
  storage.setKV(LIGHT_STORAGE_KEYS.releases, [])
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

describe('light 域时区判别力 · 日键本地化', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', async () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('recordMeditation 落库 date 为本地日历日（凌晨记录不退回 UTC 前一天）', async () => {
    const { useLightPavilion } = await import('../pavilion')
    const p = useLightPavilion()
    const rec = p.recordMeditation('breath', 10, 'tense', 'calm', 'insight-x')
    expect(rec.date).toBe('2026-03-15')
    // 完整时间戳仍按 UTC 存储（仅 date 键本地化），用于排序/最近记录
    expect(rec.timestamp).toBe('2026-03-14T16:30:00.000Z')
  })

  it('release 落库 date 经 todayStr 为本地日历日', async () => {
    const { useLightPavilion } = await import('../pavilion')
    const p = useLightPavilion()
    const r = p.release('let go', 'write', 'light')
    expect(r.date).toBe('2026-03-15')
  })

  it('连续两天（本地 03-14 23:30 + 03-15 00:30）落库 date 区分，streak=2', async () => {
    const { useLightPavilion } = await import('../pavilion')
    const p = useLightPavilion()
    vi.setSystemTime(new Date(2026, 2, 14, 23, 30, 0)) // 本地 03-14 23:30
    p.recordMeditation('breath', 10, 'tense', 'calm')
    vi.setSystemTime(new Date(2026, 2, 15, 0, 30, 0)) // 本地 03-15 00:30
    p.recordMeditation('breath', 10, 'tense', 'calm')
    // 两记分别归入本地 03-14 与 03-15 → 连续 2 天
    expect(p.getMeditationStats().streak).toBe(2)
  })

  it('light-bridge meditationTrend：本地 03-15 凌晨记录归入 03-15 桶（UTC 口径会错落 03-14）', async () => {
    const { useLightPavilion } = await import('../pavilion')
    const { useLightBridge } = await import('../light-bridge')
    const p = useLightPavilion()
    // 假时刻 NOW = 本地 2026-03-15 00:30（UTC 仍 03-14），本地日 ≠ UTC 日
    p.recordMeditation('breath', 10, 'tense', 'calm')
    const bridge = useLightBridge()
    const trend = bridge.meditationTrend.value
    const at15 = trend.find((t) => t.date === '03-15')
    const at14 = trend.find((t) => t.date === '03-14')
    expect(at15).toBeDefined()
    expect(at15!.count).toBe(1) // 命中本地今天桶
    expect(at14!.count).toBe(0) // 不应错落到 UTC 前一天
  })
})
