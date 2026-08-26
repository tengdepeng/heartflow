// ============================================================
// useRoomActivity 测试：今日每房间记录数 + 今日专注次数
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNotes: any[] = []
const mockSessions: any[] = []

vi.mock('../../../engine/storage', () => ({
  storage: {
    getNotes: () => mockNotes,
    getSessions: () => mockSessions,
  },
}))

import { useRoomActivity } from '../useRoomActivity'

function isoToday(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

describe('useRoomActivity', () => {
  beforeEach(() => {
    mockNotes.length = 0
    mockSessions.length = 0
  })

  it('统计房间今日记录数（排除归档/软删/非今日/无房间）', () => {
    mockNotes.push(
      { id: '1', roomId: 'study', createdAt: isoToday(0), archived: false, deletedAt: null },
      { id: '2', roomId: 'study', createdAt: isoToday(0), archived: false, deletedAt: null },
      { id: '3', roomId: 'bedroom', updatedAt: isoToday(0), createdAt: isoToday(1), archived: false, deletedAt: null },
      { id: '4', roomId: 'study', createdAt: isoToday(1), archived: false, deletedAt: null },
      { id: '5', roomId: 'kitchen', createdAt: isoToday(0), archived: true },
      { id: '6', roomId: 'balcony', createdAt: isoToday(0), deletedAt: '2026-01-01' },
      { id: '7', roomId: undefined, createdAt: isoToday(0) },
    )
    const { roomNotesToday } = useRoomActivity()
    expect(roomNotesToday('study')).toBe(2)
    expect(roomNotesToday('bedroom')).toBe(1)
    expect(roomNotesToday('kitchen')).toBe(0)
    expect(roomNotesToday('balcony')).toBe(0)
    expect(roomNotesToday('unknown')).toBe(0)
  })

  it('统计今日专注次数（仅 completed + 今日）', () => {
    mockSessions.push(
      { status: 'completed', completedAt: isoToday(0) },
      { status: 'completed', completedAt: isoToday(0) },
      { status: 'completed', completedAt: isoToday(1) },
      { status: 'running', completedAt: null },
    )
    const { todayFocusCount } = useRoomActivity()
    expect(todayFocusCount.value).toBe(2)
  })

  it('空数据返回 0', () => {
    const { roomNotesToday, todayFocusCount } = useRoomActivity()
    expect(roomNotesToday('study')).toBe(0)
    expect(todayFocusCount.value).toBe(0)
  })
})
