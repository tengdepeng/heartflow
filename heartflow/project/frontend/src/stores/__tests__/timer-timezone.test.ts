// ============================================================
// 计时状态管理 · 时区治理（INCR-466）
// todayCompletedCount：今日边界 + 记录边界（completedAt 为 UTC ISO 时间戳）
// 必须同取本地日历日键，否则东八区 00:00–08:00 会把本地今日误判为 UTC 昨日。
// 反向验证：改回缺陷写法（today=UTC slice + completedAt.startsWith(today)）
// 会把「本地今日 03:00 完成（UTC 昨日 19:00）」的会话漏计，用例应转红。
// ============================================================

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { getLocalDateKey } from '../../utils/time'

// 受控样本容器：在 vi.mock 工厂闭包外持有，便于 beforeEach 重置。
const { mockSessions } = vi.hoisted(() => ({ mockSessions: [] as any[] }))

vi.mock('../../engine/storage', () => ({
  storage: {
    getConfig: () => ({ timer: { defaultDuration: 25 } }),
    getSessions: () => mockSessions,
    addSession: (s: any) => {
      mockSessions.push(s)
    },
    getKV: () => null,
    setKV: () => {},
  },
}))

vi.mock('../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(() => true),
}))

function seedCompleted(completedAt: string) {
  mockSessions.push({
    id: 's-' + completedAt,
    status: 'completed',
    mode: 'focus',
    completedAt,
    plannedDuration: 25 * 60 * 1000,
    elapsed: 25 * 60 * 1000,
  })
}

describe('useTimerStore · todayCompletedCount 本地日历日口径', () => {
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

  it('东八区跨 UTC 日界：本地今日完成数按本地日历日计（含 UTC 昨日跨入今日的会话）', async () => {
    vi.useFakeTimers()
    // 本地 2026-03-15 10:00（= UTC 2026-03-15 02:00）
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
    try {
      // 本地今日 03:00 完成（UTC 昨日 19:00）—— 旧 UTC 口径会漏计
      seedCompleted('2026-03-14T19:00:00.000Z')
      // 本地今日 09:00 完成（UTC 今日 01:00）
      seedCompleted('2026-03-15T01:00:00.000Z')
      // 本地昨日 23:00 完成（UTC 昨日 15:00）—— 不应计入今日
      seedCompleted('2026-03-13T15:00:00.000Z')
      // 未完成的不应计入
      mockSessions.push({
        id: 'interrupted-1',
        status: 'interrupted',
        mode: 'focus',
        completedAt: '2026-03-14T19:00:00.000Z',
      })

      const { useTimerStore } = await import('../timer')
      const timer = useTimerStore()
      expect(timer.todayCompletedCount).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
