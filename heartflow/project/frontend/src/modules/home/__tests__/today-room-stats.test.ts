import { describe, it, expect } from 'vitest'
import { aggregateTodayRoomStats, getUtcDateKey } from '../today-room-stats'
import type { Anchor } from '../../anchor/types'
import type { MeditationRecord, ReleaseEntry } from '../../light/types'
import type { MovementRecord } from '../../movement/types'

const BASE_DATE = new Date('2026-08-13T10:00:00+08:00')
const LOCAL_KEY = '2026-08-13'
// UTC 键：基准时刻 UTC 为 2026-08-13T02:00:00Z → 同日为 2026-08-13
const UTC_KEY = '2026-08-13'

function makeAnchor(over: Partial<Anchor> = {}): Anchor {
  return {
    id: 'a_1',
    text: '锚点',
    done: false,
    targetDate: LOCAL_KEY,
    createdAt: BASE_DATE.toISOString(),
    priority: 'can',
    stage: 'active',
    driftCount: 0,
    ...over,
  }
}

function makeMeditation(over: Partial<MeditationRecord> = {}): MeditationRecord {
  return {
    id: 'm_1',
    type: 'breath',
    duration: 10,
    stateBefore: 'clouded',
    stateAfter: 'clear',
    date: UTC_KEY,
    timestamp: BASE_DATE.toISOString(),
    ...over,
  }
}

function makeRelease(over: Partial<ReleaseEntry> = {}): ReleaseEntry {
  return {
    id: 'r_1',
    content: '释怀',
    method: 'write',
    released: true,
    date: UTC_KEY,
    ...over,
  }
}

function makeMovement(over: Partial<MovementRecord> = {}): MovementRecord {
  return {
    id: 'mv_1',
    type: 'walking',
    duration: 20,
    intensity: 'light',
    calories: 80,
    date: LOCAL_KEY,
    timestamp: BASE_DATE.toISOString(),
    ...over,
  }
}

describe('getUtcDateKey', () => {
  it('使用 UTC 切分 YYYY-MM-DD', () => {
    expect(getUtcDateKey(BASE_DATE)).toBe('2026-08-13')
  })
})

describe('aggregateTodayRoomStats', () => {
  it('空数据返回全零', () => {
    const r = aggregateTodayRoomStats({
      anchors: [], meditations: [], releases: [], movements: [], now: BASE_DATE,
    })
    expect(r).toEqual({
      anchorToday: 0, anchorDone: 0, anchorPending: 0,
      meditationToday: 0, releaseToday: 0, movementToday: 0,
    })
  })

  it('统计各房间今日计数并区分锚点完成/未完成', () => {
    const anchors = [
      makeAnchor({ done: true }),
      makeAnchor({ done: false }),
      makeAnchor({ done: false }),
      makeAnchor({ targetDate: '2026-08-12' }),     // 昨日，不计
      makeAnchor({ stage: 'pool' }),                // 锚点池，不计
    ]
    const meditations = [makeMeditation(), makeMeditation()]
    const releases = [makeRelease()]
    const movements = [makeMovement(), makeMovement(), makeMovement()]

    const r = aggregateTodayRoomStats({
      anchors, meditations, releases, movements, now: BASE_DATE,
    })
    expect(r.anchorToday).toBe(3)
    expect(r.anchorDone).toBe(1)
    expect(r.anchorPending).toBe(2)
    expect(r.meditationToday).toBe(2)
    expect(r.releaseToday).toBe(1)
    expect(r.movementToday).toBe(3)
  })

  it('忽略非今日的冥想/释怀/运动', () => {
    const r = aggregateTodayRoomStats({
      anchors: [],
      meditations: [makeMeditation({ date: '2026-08-12' })],
      releases: [makeRelease({ date: '2026-08-14' })],
      movements: [makeMovement({ date: '2026-08-12' })],
      now: BASE_DATE,
    })
    expect(r.meditationToday).toBe(0)
    expect(r.releaseToday).toBe(0)
    expect(r.movementToday).toBe(0)
  })
})
