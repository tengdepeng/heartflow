// ============================================================
// 统计数据集中管理 · 时区治理（INCR-466）
// todayFocusMinutes + streakDays：今日边界与记录边界（completedAt/startedAt 为 UTC ISO 时间戳）
// 必须同取本地日历日键，否则东八区 00:00–08:00 会把本地今日误判为 UTC 昨日 / 跨日。
// 反向验证：改回缺陷写法（today=UTC slice + startsWith / .slice(0,10) 取日期键）
// 会把跨午夜会话漏计 / 重计，用例应转红。
// ============================================================

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { getLocalDateKey } from '../../utils/time'

const { mockSessions } = vi.hoisted(() => ({ mockSessions: [] as any[] }))

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => mockSessions,
    getCrystals: () => [],
    getNotes: () => [],
    getEmotions: () => [],
    getAnchors: () => [],
    getGoals: () => [],
    getRelations: () => [],
    getLedger: () => [],
    getCarriers: () => [],
    getPluginRegistry: () => ({}),
    addSession: (s: any) => {
      mockSessions.push(s)
    },
  },
  storageVersion: { value: 0 },
}))

function seedCompleted(completedAt: string, elapsedMin = 0) {
  mockSessions.push({
    id: 's-' + completedAt,
    status: 'completed',
    mode: 'focus',
    completedAt,
    elapsed: elapsedMin * 60000,
  })
}

describe('useStatsStore · 今日专注/连续天数 本地日历日口径', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSessions.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const localKey = getLocalDateKey(new Date('2026-03-14T19:00:00.000Z'))
    const utcKey = '2026-03-14T19:00:00.000Z'.slice(0, 10)
    expect(localKey).not.toBe(utcKey)
  })

  it('todayFocusMinutes：东八区跨 UTC 日界，本地今日专注分钟按本地日历日计', async () => {
    vi.useFakeTimers()
    // 本地 2026-03-15 10:00（= UTC 2026-03-15 02:00）
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
    try {
      seedCompleted('2026-03-14T19:00:00.000Z', 60) // 本地 03-15 03:00（UTC 昨日 19:00）
      seedCompleted('2026-03-15T01:00:00.000Z', 30) // 本地 03-15 09:00（UTC 今日 01:00）
      seedCompleted('2026-03-13T15:00:00.000Z', 45) // 本地 03-13 23:00（非今日）
      // 未完成的不应计入
      mockSessions.push({ id: 'x', status: 'interrupted', mode: 'focus', completedAt: '2026-03-14T19:00:00.000Z', elapsed: 999 })

      const { useStatsStore } = await import('../stats')
      const stats = useStatsStore()
      expect(stats.todayFocusMinutes).toBe(90)
    } finally {
      vi.useRealTimers()
    }
  })

  it('streakDays：东八区跨 UTC 日界，连续天数按本地日历日计（同一本地日的两次会话不重计）', async () => {
    vi.useFakeTimers()
    // 本地 2026-03-15 10:00
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
    try {
      mockSessions.push({ id: 'a', status: 'completed', mode: 'focus', completedAt: '2026-03-15T01:00:00.000Z', elapsed: 0 }) // 本地 03-15 09:00
      mockSessions.push({ id: 'b', status: 'completed', mode: 'focus', completedAt: '2026-03-14T23:00:00.000Z', elapsed: 0 }) // 本地 03-15 07:00（同一本地日，跨 UTC 午夜）
      mockSessions.push({ id: 'c', status: 'completed', mode: 'focus', completedAt: '2026-03-13T19:00:00.000Z', elapsed: 0 }) // 本地 03-14 03:00

      const { useStatsStore } = await import('../stats')
      const stats = useStatsStore()
      // 本地去重日期集 = {03-15, 03-14} → 连续 2 天
      expect(stats.streakDays).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
