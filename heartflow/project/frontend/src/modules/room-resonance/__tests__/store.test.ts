import { describe, it, expect, beforeEach } from 'vitest'
import {
  emitRoomSignal,
  getSignals,
  getLatest,
  getCrossRoomFeed,
  clearRoomSignals,
} from '../store'
import type { RoomSignal } from '../types'

function sig(room: RoomSignal['room'], ts: number, label = 'x'): RoomSignal {
  return { room, kind: 'presence', label, ts }
}

describe('room-resonance store', () => {
  beforeEach(() => clearRoomSignals())

  it('emitRoomSignal 后 getSignals 可读取', () => {
    emitRoomSignal(sig('daily-anchor', 1000, '专注 #3'))
    const all = getSignals()
    expect(all).toHaveLength(1)
    expect(all[0].label).toBe('专注 #3')
  })

  it('getSignals 可按房间过滤', () => {
    emitRoomSignal(sig('daily-anchor', 1000))
    emitRoomSignal(sig('light-pavilion', 2000))
    expect(getSignals('daily-anchor')).toHaveLength(1)
    expect(getSignals('light-pavilion')).toHaveLength(1)
    expect(getSignals()).toHaveLength(2)
  })

  it('getLatest 返回该房间最新一条', () => {
    emitRoomSignal(sig('daily-anchor', 1000, '旧'))
    emitRoomSignal(sig('daily-anchor', 3000, '新'))
    const latest = getLatest('daily-anchor')
    expect(latest?.label).toBe('新')
  })

  it('getLatest 无信号返回 null', () => {
    expect(getLatest('guard-room')).toBeNull()
  })

  it('getCrossRoomFeed 每房间仅一条最新、按 ts 倒序', () => {
    emitRoomSignal(sig('daily-anchor', 1000, 'a1'))
    emitRoomSignal(sig('daily-anchor', 3000, 'a2'))
    emitRoomSignal(sig('light-pavilion', 2000, 'l1'))
    const feed = getCrossRoomFeed()
    expect(feed).toHaveLength(2)
    expect(feed[0].room).toBe('daily-anchor') // ts 3000 最大
    expect(feed[0].label).toBe('a2')
    expect(feed[1].room).toBe('light-pavilion')
  })

  it('clearRoomSignals 可按房间清理', () => {
    emitRoomSignal(sig('daily-anchor', 1000))
    emitRoomSignal(sig('light-pavilion', 2000))
    clearRoomSignals('daily-anchor')
    expect(getSignals('daily-anchor')).toHaveLength(0)
    expect(getSignals('light-pavilion')).toHaveLength(1)
  })

  it('clearRoomSignals 无参清理全部', () => {
    emitRoomSignal(sig('daily-anchor', 1000))
    emitRoomSignal(sig('light-pavilion', 2000))
    clearRoomSignals()
    expect(getSignals()).toHaveLength(0)
  })

  it('非法信号（缺 room）被忽略', () => {
    // @ts-expect-error 测试边界：room 为空
    emitRoomSignal({ room: '', kind: 'presence', label: 'x', ts: 1 } as RoomSignal)
    expect(getSignals()).toHaveLength(0)
  })
})
