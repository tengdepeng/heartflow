// ============================================================
// home（心居）域 · 时区判别力测试（TZ 日键治理 · 日键第十六批）
//
// 覆盖 today-room-stats 的**跨模块契约**：留光阁（light）落库 date 已迁至本地
// 日键（第九批），而今日计数此前仍用 UTC 键（getUtcDateKey）比对 ⇒
// 「今日冥想 / 今日释怀」恒为 0。本批把比对侧统一到本地日键。
//
// 判别力前提：假时刻 = 本地 2026-03-15 00:30（UTC 仍为 2026-03-14）。
// light 的 recordMeditation 在此刻落库 date = '2026-03-15'（本地）；
// 若比对侧仍取 UTC 键 '2026-03-14'，则恒不命中 ⇒ 用例转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { aggregateTodayRoomStats } from '../today-room-stats'
import type { MeditationRecord, ReleaseEntry } from '../../light/types'
import type { MovementRecord } from '../../movement/types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

/** light 域落库形态：date = 本地日键，timestamp = 完整 ISO */
function med(id: string, dayOffset: number, hour: number, minute = 0): MeditationRecord {
  const d = new Date(2026, 2, 15 + dayOffset, hour, minute, 0)
  return {
    id, type: 'breath', duration: 10, stateBefore: 'clouded', stateAfter: 'clear',
    date: getLocalDateKey(d), timestamp: d.toISOString(),
  } as MeditationRecord
}

function rel(id: string, dayOffset: number, hour: number, minute = 0): ReleaseEntry {
  const d = new Date(2026, 2, 15 + dayOffset, hour, minute, 0)
  return {
    id, content: '释怀', method: 'write', released: true,
    date: getLocalDateKey(d),
  } as ReleaseEntry
}

const EMPTY_MOVEMENT: MovementRecord[] = []

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

describe('home 域时区判别力 · 跨模块日键契约', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('今日冥想：本地 00:10 的 light 记录被判为今日（UTC 比对侧会恒为 0）', () => {
    const r = aggregateTodayRoomStats({
      anchors: [], meditations: [med('m1', 0, 0, 10)], releases: [],
      movements: EMPTY_MOVEMENT, now: NOW,
    })
    expect(r.meditationToday).toBe(1)
  })

  it('今日释怀：本地 00:10 的 light 记录被判为今日', () => {
    const r = aggregateTodayRoomStats({
      anchors: [], meditations: [], releases: [rel('r1', 0, 0, 10)],
      movements: EMPTY_MOVEMENT, now: NOW,
    })
    expect(r.releaseToday).toBe(1)
  })

  it('昨日 23:30 记录不计入今日（防错吞）', () => {
    const r = aggregateTodayRoomStats({
      anchors: [], meditations: [med('m1', -1, 23, 30)], releases: [rel('r1', -1, 23, 30)],
      movements: EMPTY_MOVEMENT, now: NOW,
    })
    expect(r.meditationToday).toBe(0)
    expect(r.releaseToday).toBe(0)
  })

  it('UTC 键口径的旧记录（date=03-14）在本地今日不再被误计（跨模块契约已同基）', () => {
    // 迁移前 light 用 UTC 落库，历史数据 date 是 '2026-03-14'。
    // 统一到本地口径后，这类记录在本地 03-15 凌晨不应被算作「今日冥想」。
    const legacy = [{ ...med('old', 0, 0, 10), date: '2026-03-14' }] as MeditationRecord[]
    const r = aggregateTodayRoomStats({
      anchors: [], meditations: legacy, releases: [],
      movements: EMPTY_MOVEMENT, now: NOW,
    })
    expect(r.meditationToday).toBe(0)
  })
})
