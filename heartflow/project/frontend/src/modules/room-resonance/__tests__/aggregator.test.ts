import { describe, it, expect, beforeEach } from 'vitest'
import { aggregateClimate, summarizeClimate, DEFAULT_CLIMATE_WINDOW_MS } from '../aggregator'
import { clearRoomSignals, emitRoomSignal, getSignals } from '../store'
import type { RoomSignal } from '../types'

function sig(room: RoomSignal['room'], ts: number, label = 'x'): RoomSignal {
  return { room, kind: 'presence', label, ts }
}

const NOW = 10_000_000

describe('room-resonance aggregator', () => {
  beforeEach(() => clearRoomSignals())

  it('默认窗口外信号被排除', () => {
    emitRoomSignal(sig('daily-anchor', NOW - DEFAULT_CLIMATE_WINDOW_MS - 1000, '过期'))
    emitRoomSignal(sig('light-pavilion', NOW - 1000, '窗口内'))
    const climate = aggregateClimate(getAll(), DEFAULT_CLIMATE_WINDOW_MS, NOW)
    expect(climate.rooms).toEqual(['light-pavilion'])
    expect(climate.totalSignals).toBe(1)
  })

  it('窗口内按房间聚合出最新信号', () => {
    emitRoomSignal(sig('daily-anchor', NOW - 5000, '旧'))
    emitRoomSignal(sig('daily-anchor', NOW - 1000, '新'))
    emitRoomSignal(sig('light-pavilion', NOW - 2000, '留光'))
    const climate = aggregateClimate(getAll(), DEFAULT_CLIMATE_WINDOW_MS, NOW)
    expect(climate.rooms.sort()).toEqual(['daily-anchor', 'light-pavilion'])
    expect(climate.latestByRoom['daily-anchor']?.label).toBe('新')
    expect(climate.latestByRoom['light-pavilion']?.label).toBe('留光')
  })

  it('空信号聚合返回空态势', () => {
    const climate = aggregateClimate([], DEFAULT_CLIMATE_WINDOW_MS, NOW)
    expect(climate.rooms).toHaveLength(0)
    expect(climate.totalSignals).toBe(0)
  })

  it('summarizeClimate 拼出可读文案', () => {
    emitRoomSignal(sig('daily-anchor', NOW - 1000, '专注 #3'))
    emitRoomSignal(sig('light-pavilion', NOW - 2000, '微光'))
    const climate = aggregateClimate(getAll(), DEFAULT_CLIMATE_WINDOW_MS, NOW)
    expect(summarizeClimate(climate)).toBe('逐日心锚：专注 #3 · 留光阁：微光')
  })

  it('summarizeClimate 空态势返回空串', () => {
    expect(summarizeClimate(aggregateClimate([], DEFAULT_CLIMATE_WINDOW_MS, NOW))).toBe('')
  })
})

// 本地辅助：直接读 store 全部（测试内复用）
function getAll(): RoomSignal[] {
  return getSignals()
}
