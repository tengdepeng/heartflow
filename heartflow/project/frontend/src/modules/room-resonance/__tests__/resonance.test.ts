import { describe, it, expect, beforeEach } from 'vitest'
import { useRoomResonance } from '../useRoomResonance'
import { emitRoomSignal, clearRoomSignals } from '../store'
import type { RoomSignal } from '../types'

describe('useRoomResonance 组合式（跨房间关键路径）', () => {
  beforeEach(() => clearRoomSignals())

  it('crossRoomFeed 随发射实时更新', () => {
    const rr = useRoomResonance()
    expect(rr.crossRoomFeed.value).toHaveLength(0)
    emitRoomSignal({ room: 'daily-anchor', kind: 'focus', label: '专注 #3', ts: Date.now() })
    expect(rr.crossRoomFeed.value).toHaveLength(1)
    expect(rr.crossRoomFeed.value[0].room).toBe('daily-anchor')
  })

  it('climate 聚合出活跃房间', () => {
    const rr = useRoomResonance()
    const now = Date.now()
    emitRoomSignal({ room: 'daily-anchor', kind: 'focus', label: 'a', ts: now } as RoomSignal)
    emitRoomSignal({ room: 'light-pavilion', kind: 'light', label: 'b', ts: now } as RoomSignal)
    expect(rr.climate.value.rooms.sort()).toEqual(['daily-anchor', 'light-pavilion'])
  })

  it('多房间发射后 crossRoomFeed 每房间仅一条最新', () => {
    const rr = useRoomResonance()
    emitRoomSignal({ room: 'daily-anchor', kind: 'focus', label: '旧', ts: 1000 })
    emitRoomSignal({ room: 'daily-anchor', kind: 'focus', label: '新', ts: 3000 })
    emitRoomSignal({ room: 'light-pavilion', kind: 'light', label: '光', ts: 2000 })
    expect(rr.crossRoomFeed.value).toHaveLength(2)
    const anchor = rr.crossRoomFeed.value.find((s) => s.room === 'daily-anchor')
    expect(anchor?.label).toBe('新')
  })
})
