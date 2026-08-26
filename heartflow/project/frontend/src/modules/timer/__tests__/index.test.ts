// ============================================================
// 计时模块 · 测试
// ============================================================

import { describe, expect, it, vi } from 'vitest'
import type { FocusSession } from '../../../types'

let mockSchema: any = {
  version: 9,
  sessions: [],
  crystals: [],
  config: { theme: 'dark', timer: { defaultDuration: 25 }, display: { statsWindowDays: 30 } },
  scenePresets: [],
  kvStore: {},
}

// Mock storage core
vi.mock('../../../engine/storage/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engine/storage/core')>()
  return {
    ...actual,
    loadSchema: vi.fn(() => mockSchema),
    saveSchema: vi.fn((s: any) => { mockSchema = s }),
    invalidateCache: vi.fn(),
    storageVersion: { value: 0 },
    clearAll: vi.fn(() => {
      mockSchema = {
        version: 9,
        sessions: [],
        crystals: [],
        config: { theme: 'dark', timer: { defaultDuration: 25 }, display: { statsWindowDays: 30 } },
        scenePresets: [],
        kvStore: {},
      }
    }),
    initStorage: vi.fn(),
    getStorageBackend: vi.fn(() => 'localStorage'),
  }
})

import {
  DEFAULT_TIMER_CONFIG,
  validateTimerConfig,
  getAllSessions,
  getSessionsByDateRange,
  getSessionsByDate,
  getTodaySessions,
  getSessionsByStatus,
  getSessionsByMode,
  getRecentCompletedSessions,
  updateSession,
  removeSession,
  clearAllSessions,
  getTotalFocusTimeInRange,
  getTodayFocusTime,
  getTodayCompletedCount,
  getStreakDays,
  isLongBreakDue,
} from '../index'

function makeSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    status: 'completed',
    mode: 'focus',
    plannedDuration: 25,
    elapsed: 25 * 60000,
    startedAt: '2026-07-31T09:00:00.000Z',
    completedAt: '2026-07-31T09:25:00.000Z',
    pausedDuration: 0,
    pausedAt: null,
    tags: [],
    note: '',
    carrierId: null,
    ...overrides,
  }
}

function seedSessions(sessions: FocusSession[]) {
  mockSchema.sessions = sessions
}

describe('DEFAULT_TIMER_CONFIG', () => {
  it('默认时长为 25 分钟', () => {
    expect(DEFAULT_TIMER_CONFIG.defaultDuration).toBe(25)
  })

  it('默认休息 5 分钟', () => {
    expect(DEFAULT_TIMER_CONFIG.breakDuration).toBe(5)
  })

  it('4 次后长休息', () => {
    expect(DEFAULT_TIMER_CONFIG.sessionsBeforeLongBreak).toBe(4)
  })

  it('默认不自动开始', () => {
    expect(DEFAULT_TIMER_CONFIG.autoStart).toBe(false)
  })
})

describe('validateTimerConfig', () => {
  it('空 partial 返回默认值', () => {
    const cfg = validateTimerConfig({})
    expect(cfg.defaultDuration).toBe(25)
    expect(cfg.breakDuration).toBe(5)
  })

  it('裁剪越界值', () => {
    const cfg = validateTimerConfig({ defaultDuration: 0, breakDuration: 2000 })
    expect(cfg.defaultDuration).toBe(1)
    expect(cfg.breakDuration).toBe(999)
  })

  it('保留有效值', () => {
    const cfg = validateTimerConfig({ defaultDuration: 45, autoStart: true })
    expect(cfg.defaultDuration).toBe(45)
    expect(cfg.autoStart).toBe(true)
  })

  it('sessionsBeforeLongBreak 裁剪到 1-99', () => {
    const cfg = validateTimerConfig({ sessionsBeforeLongBreak: 0 })
    expect(cfg.sessionsBeforeLongBreak).toBe(1)
    const cfg2 = validateTimerConfig({ sessionsBeforeLongBreak: 200 })
    expect(cfg2.sessionsBeforeLongBreak).toBe(99)
  })
})

describe('getAllSessions', () => {
  it('无会话时返回空数组', () => {
    seedSessions([])
    expect(getAllSessions()).toEqual([])
  })

  it('按 completedAt 倒序返回', () => {
    seedSessions([
      makeSession({ id: 'a', completedAt: '2026-07-01T00:00:00.000Z' }),
      makeSession({ id: 'b', completedAt: '2026-07-31T00:00:00.000Z' }),
      makeSession({ id: 'c', completedAt: '2026-07-15T00:00:00.000Z' }),
    ])
    const result = getAllSessions()
    expect(result[0].id).toBe('b')
    expect(result[2].id).toBe('a')
  })
})

describe('getSessionsByDateRange', () => {
  it('按日期范围筛选', () => {
    seedSessions([
      makeSession({ id: 'a', completedAt: '2026-07-01T00:00:00.000Z' }),
      makeSession({ id: 'b', completedAt: '2026-07-15T00:00:00.000Z' }),
      makeSession({ id: 'c', completedAt: '2026-07-31T00:00:00.000Z' }),
    ])
    const result = getSessionsByDateRange('2026-07-01', '2026-07-15')
    expect(result.length).toBe(2)
    expect(result.map(s => s.id)).toContain('a')
    expect(result.map(s => s.id)).toContain('b')
  })

  it('无匹配时返回空数组', () => {
    seedSessions([makeSession({ completedAt: '2026-07-01T00:00:00.000Z' })])
    expect(getSessionsByDateRange('2026-08-01', '2026-08-31')).toEqual([])
  })
})

describe('getSessionsByDate', () => {
  it('返回指定日期的会话', () => {
    seedSessions([
      makeSession({ id: 'a', completedAt: '2026-07-31T09:00:00.000Z' }),
      makeSession({ id: 'b', completedAt: '2026-07-31T10:00:00.000Z' }),
      makeSession({ id: 'c', completedAt: '2026-07-30T10:00:00.000Z' }),
    ])
    const result = getSessionsByDate('2026-07-31')
    expect(result.length).toBe(2)
  })

  it('无日期参数时默认今天', () => {
    const today = new Date().toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', completedAt: `${today}T09:00:00.000Z` }),
      makeSession({ id: 'b', completedAt: '2026-01-01T00:00:00.000Z' }),
    ])
    expect(getSessionsByDate().length).toBe(1)
  })
})

describe('getTodaySessions', () => {
  it('仅返回今日会话', () => {
    const today = new Date().toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', completedAt: `${today}T09:00:00.000Z` }),
      makeSession({ id: 'b', completedAt: '2026-01-01T00:00:00.000Z' }),
    ])
    expect(getTodaySessions().length).toBe(1)
    expect(getTodaySessions()[0].id).toBe('a')
  })
})

describe('getSessionsByStatus', () => {
  it('按状态筛选', () => {
    seedSessions([
      makeSession({ id: 'a', status: 'completed' }),
      makeSession({ id: 'b', status: 'interrupted' }),
      makeSession({ id: 'c', status: 'completed' }),
    ])
    expect(getSessionsByStatus('completed').length).toBe(2)
    expect(getSessionsByStatus('interrupted').length).toBe(1)
    expect(getSessionsByStatus('idle').length).toBe(0)
  })
})

describe('getSessionsByMode', () => {
  it('按模式筛选', () => {
    seedSessions([
      makeSession({ id: 'a', mode: 'focus' }),
      makeSession({ id: 'b', mode: 'nap' }),
      makeSession({ id: 'c', mode: 'focus' }),
    ])
    expect(getSessionsByMode('focus').length).toBe(2)
    expect(getSessionsByMode('nap').length).toBe(1)
  })
})

describe('getRecentCompletedSessions', () => {
  it('返回最近完成会话', () => {
    seedSessions([
      makeSession({ id: 'a', status: 'completed', completedAt: '2026-07-01T00:00:00.000Z' }),
      makeSession({ id: 'b', status: 'completed', completedAt: '2026-07-31T00:00:00.000Z' }),
      makeSession({ id: 'c', status: 'interrupted', completedAt: '2026-07-31T00:00:00.000Z' }),
    ])
    const result = getRecentCompletedSessions(5)
    expect(result.length).toBe(2)
    expect(result[0].id).toBe('b')
  })
})

describe('updateSession', () => {
  it('更新存在的会话', () => {
    seedSessions([makeSession({ id: 'a', status: 'idle' })])
    const result = updateSession('a', { status: 'completed' })
    expect(result).toBe(true)
    expect(mockSchema.sessions[0].status).toBe('completed')
  })

  it('不存在的会话返回 false', () => {
    seedSessions([])
    expect(updateSession('nonexistent', { status: 'completed' })).toBe(false)
  })
})

describe('removeSession', () => {
  it('软删除：标记为 interrupted', () => {
    seedSessions([makeSession({ id: 'a', status: 'completed' })])
    removeSession('a')
    expect(mockSchema.sessions[0].status).toBe('interrupted')
  })

  it('不存在的会话不报错', () => {
    seedSessions([])
    expect(() => removeSession('nonexistent')).not.toThrow()
  })
})

describe('clearAllSessions', () => {
  it('标记所有会话为 interrupted', () => {
    seedSessions([
      makeSession({ id: 'a', status: 'completed' }),
      makeSession({ id: 'b', status: 'completed' }),
    ])
    clearAllSessions()
    expect(mockSchema.sessions.every((s: any) => s.status === 'interrupted')).toBe(true)
  })
})

describe('getTotalFocusTimeInRange', () => {
  it('计算范围内完成会话的总时长', () => {
    seedSessions([
      makeSession({ id: 'a', status: 'completed', elapsed: 60000, completedAt: '2026-07-31T09:00:00.000Z' }),
      makeSession({ id: 'b', status: 'completed', elapsed: 120000, completedAt: '2026-07-31T10:00:00.000Z' }),
      makeSession({ id: 'c', status: 'interrupted', elapsed: 300000, completedAt: '2026-07-31T11:00:00.000Z' }),
    ])
    expect(getTotalFocusTimeInRange('2026-07-31', '2026-07-31')).toBe(180000)
  })

  it('排除范围外的会话', () => {
    seedSessions([
      makeSession({ id: 'a', status: 'completed', elapsed: 60000, completedAt: '2026-07-01T00:00:00.000Z' }),
    ])
    expect(getTotalFocusTimeInRange('2026-07-31', '2026-07-31')).toBe(0)
  })
})

describe('getTodayFocusTime', () => {
  it('仅计算今日完成会话时长', () => {
    const today = new Date().toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', status: 'completed', elapsed: 60000, completedAt: `${today}T09:00:00.000Z` }),
      makeSession({ id: 'b', status: 'completed', elapsed: 120000, completedAt: '2026-01-01T00:00:00.000Z' }),
    ])
    expect(getTodayFocusTime()).toBe(60000)
  })
})

describe('getTodayCompletedCount', () => {
  it('返回今日完成次数', () => {
    const today = new Date().toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', status: 'completed', completedAt: `${today}T09:00:00.000Z` }),
      makeSession({ id: 'b', status: 'completed', completedAt: `${today}T10:00:00.000Z` }),
      makeSession({ id: 'c', status: 'interrupted', completedAt: `${today}T11:00:00.000Z` }),
    ])
    expect(getTodayCompletedCount()).toBe(2)
  })
})

describe('getStreakDays', () => {
  it('无会话时返回 0', () => {
    seedSessions([])
    expect(getStreakDays()).toBe(0)
  })

  it('连续天数为 1', () => {
    const today = new Date().toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', status: 'completed', completedAt: `${today}T09:00:00.000Z` }),
    ])
    expect(getStreakDays()).toBe(1)
  })

  it('不连续时返回 0', () => {
    seedSessions([
      makeSession({ id: 'a', status: 'completed', completedAt: '2026-07-01T00:00:00.000Z' }),
    ])
    expect(getStreakDays()).toBe(0)
  })

  it('连续 3 天', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', status: 'completed', completedAt: `${today}T09:00:00.000Z` }),
      makeSession({ id: 'b', status: 'completed', completedAt: `${yesterday}T09:00:00.000Z` }),
      makeSession({ id: 'c', status: 'completed', completedAt: `${twoDaysAgo}T09:00:00.000Z` }),
    ])
    expect(getStreakDays()).toBe(3)
  })

  it('同一天多个会话只计一次', () => {
    const today = new Date().toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', status: 'completed', completedAt: `${today}T09:00:00.000Z` }),
      makeSession({ id: 'b', status: 'completed', completedAt: `${today}T10:00:00.000Z` }),
    ])
    expect(getStreakDays()).toBe(1)
  })
})

describe('isLongBreakDue', () => {
  it('无完成会话时不需要长休息', () => {
    seedSessions([])
    expect(isLongBreakDue()).toBe(false)
  })

  it('完成 4 次后需要长休息', () => {
    const today = new Date().toISOString().slice(0, 10)
    seedSessions([
      makeSession({ id: 'a', status: 'completed', completedAt: `${today}T09:00:00.000Z` }),
      makeSession({ id: 'b', status: 'completed', completedAt: `${today}T10:00:00.000Z` }),
      makeSession({ id: 'c', status: 'completed', completedAt: `${today}T11:00:00.000Z` }),
      makeSession({ id: 'd', status: 'completed', completedAt: `${today}T12:00:00.000Z` }),
    ])
    expect(isLongBreakDue()).toBe(true)
  })
})