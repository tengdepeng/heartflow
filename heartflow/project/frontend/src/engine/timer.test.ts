// ============================================================
// timer 单元测试
// ============================================================
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import type { FocusSession } from '../types'

// ---- 辅助工厂 ----
function makeSession(overrides?: Partial<FocusSession>): FocusSession {
  return {
    id: 'test-sess',
    status: 'idle' as const,
    mode: 'focus' as const,
    plannedDuration: 1500000,    // 25 min
    elapsed: 0,
    startedAt: null,
    pausedDuration: 0,
    pausedAt: null,
    completedAt: null,
    tags: [],
    note: '',
    carrierId: null,
    ...overrides,
  }
}

// ---- 时间戳 mock ----
let fakeTime = 1700000000000
function advanceTime(ms: number) { fakeTime += ms }

beforeEach(() => {
  fakeTime = 1700000000000
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(fakeTime)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ============================================================
describe('createSession', () => {
  it('应创建 idle 状态、focus 模式的会话', async () => {
    const { createSession } = await import('./timer')
    const s = createSession('focus', 1500000)
    expect(s.status).toBe('idle')
    expect(s.mode).toBe('focus')
    expect(s.plannedDuration).toBe(1500000)
    expect(s.elapsed).toBe(0)
    expect(s.startedAt).toBeNull()
    expect(s.pausedDuration).toBe(0)
    expect(s.pausedAt).toBeNull()
    expect(s.completedAt).toBeNull()
    expect(s.tags).toEqual([])
    expect(s.note).toBe('')
    expect(s.carrierId).toBeNull()
  })

  it('应创建 nap 模式的会话', async () => {
    const { createSession } = await import('./timer')
    const s = createSession('nap', 1200000)
    expect(s.mode).toBe('nap')
    expect(s.plannedDuration).toBe(1200000)
  })

  it('应创建 free 模式的会话', async () => {
    const { createSession } = await import('./timer')
    const s = createSession('free', 0)
    expect(s.mode).toBe('free')
    expect(s.plannedDuration).toBe(0)
  })

  it('每次调用应生成不同 id', async () => {
    const { createSession } = await import('./timer')
    advanceTime(100)
    const s1 = createSession('focus', 1500000)
    advanceTime(100)
    const s2 = createSession('focus', 1500000)
    expect(s1.id).not.toBe(s2.id)
    expect(s1.id).toMatch(/^session_\d+_\d+$/)
    expect(s2.id).toMatch(/^session_\d+_\d+$/)
  })
})

// ============================================================
describe('startSession', () => {
  it('应将 status 设为 focusing，清空暂停状态', async () => {
    const { startSession } = await import('./timer')
    const s = makeSession({ startedAt: null })
    const result = startSession(s)
    expect(result.status).toBe('focusing')
    expect(result.elapsed).toBe(0)
    expect(result.pausedDuration).toBe(0)
    expect(result.pausedAt).toBeNull()
  })

  it('当 startedAt 为 null 时应设为当前时间', async () => {
    const { startSession } = await import('./timer')
    const s = makeSession({ startedAt: null })
    const result = startSession(s)
    expect(result.startedAt).toBe(new Date(fakeTime).toISOString())
  })

  it('当 startedAt 已有值时应保留原值', async () => {
    const { startSession } = await import('./timer')
    const originalStart = '2024-01-01T00:00:00.000Z'
    const s = makeSession({ startedAt: originalStart, elapsed: 5000, pausedDuration: 3000, pausedAt: '2024-01-01T00:00:05.000Z' })
    const result = startSession(s)
    expect(result.startedAt).toBe(originalStart)
    expect(result.elapsed).toBe(0)
    expect(result.pausedDuration).toBe(0)
    expect(result.pausedAt).toBeNull()
  })
})

// ============================================================
describe('pauseSession', () => {
  it('应将 status 设为 paused，记录断点时间', async () => {
    const { pauseSession } = await import('./timer')
    const s = makeSession({ status: 'focusing' })
    const result = pauseSession(s, 5000)
    expect(result.status).toBe('paused')
    expect(result.elapsed).toBe(5000)
    expect(result.pausedAt).toBe(new Date(fakeTime).toISOString())
  })

  it('不应修改 startedAt 和 completedAt', async () => {
    const { pauseSession } = await import('./timer')
    const s = makeSession({ status: 'focusing', startedAt: '2024-01-01T00:00:00.000Z', completedAt: null })
    const result = pauseSession(s, 5000)
    expect(result.startedAt).toBe('2024-01-01T00:00:00.000Z')
    expect(result.completedAt).toBeNull()
  })

  it('零 elapsed 也应正确处理', async () => {
    const { pauseSession } = await import('./timer')
    const s = makeSession({ status: 'focusing' })
    const result = pauseSession(s, 0)
    expect(result.elapsed).toBe(0)
  })
})

// ============================================================
describe('resumeSession', () => {
  it('应将 status 设为 focusing，累加暂停时长', async () => {
    const { resumeSession } = await import('./timer')
    const s = makeSession({ status: 'paused', pausedDuration: 1000 })
    const result = resumeSession(s, 5000, 2000)
    expect(result.status).toBe('focusing')
    expect(result.elapsed).toBe(5000)
    expect(result.pausedDuration).toBe(3000) // 1000 + 2000
    expect(result.pausedAt).toBeNull()
  })

  it('暂停时长为零也应正确处理', async () => {
    const { resumeSession } = await import('./timer')
    const s = makeSession({ status: 'paused', pausedDuration: 0 })
    const result = resumeSession(s, 5000, 0)
    expect(result.pausedDuration).toBe(0)
  })

  it('未暂停过（pausedDuration=0）时恢复', async () => {
    const { resumeSession } = await import('./timer')
    const s = makeSession({ status: 'paused', pausedDuration: 0 })
    const result = resumeSession(s, 3000, 500)
    expect(result.pausedDuration).toBe(500)
  })
})

// ============================================================
describe('completeSession', () => {
  it('应将 status 设为 completed，记录完成时间', async () => {
    const { completeSession } = await import('./timer')
    const s = makeSession({ status: 'focusing' })
    const result = completeSession(s, 1500000, 30000)
    expect(result.status).toBe('completed')
    expect(result.elapsed).toBe(1500000)
    expect(result.pausedDuration).toBe(30000)
    expect(result.completedAt).toBe(new Date(fakeTime).toISOString())
    expect(result.pausedAt).toBeNull()
  })

  it('完成时间不应为空', async () => {
    const { completeSession } = await import('./timer')
    const s = makeSession({ status: 'focusing', completedAt: null })
    const result = completeSession(s, 1000, 0)
    expect(result.completedAt).toBeTruthy()
  })
})

// ============================================================
describe('interruptSession', () => {
  it('应将 status 设为 interrupted，清空 pausedAt', async () => {
    const { interruptSession } = await import('./timer')
    const s = makeSession({ status: 'focusing', pausedAt: '2024-01-01T00:00:00.000Z' })
    const result = interruptSession(s, 50000, 5000)
    expect(result.status).toBe('interrupted')
    expect(result.elapsed).toBe(50000)
    expect(result.pausedDuration).toBe(5000)
    expect(result.pausedAt).toBeNull()
  })

  it('中断应不设置 completedAt', async () => {
    const { interruptSession } = await import('./timer')
    const s = makeSession({ status: 'focusing', completedAt: 'some-value' })
    const result = interruptSession(s, 0, 0)
    expect(result.completedAt).toBe('some-value')   // 保留原值
  })
})

// ============================================================
describe('calcProgress', () => {
  it('应计算 elapsed / planned 比值', async () => {
    const { calcProgress } = await import('./timer')
    expect(calcProgress(500000, 1000000)).toBe(0.5)
  })

  it('超过计划时长时应 clamp 到 1', async () => {
    const { calcProgress } = await import('./timer')
    expect(calcProgress(2000000, 1000000)).toBe(1)
  })

  it('刚好完成时应返回 1', async () => {
    const { calcProgress } = await import('./timer')
    expect(calcProgress(1000000, 1000000)).toBe(1)
  })

  it('elapsed 为零时应返回 0', async () => {
    const { calcProgress } = await import('./timer')
    expect(calcProgress(0, 1000000)).toBe(0)
  })

  it('planned 为 0 时应返回 0（避免除以零）', async () => {
    const { calcProgress } = await import('./timer')
    expect(calcProgress(1000, 0)).toBe(0)
  })

  it('planned 为负数时应返回 0', async () => {
    const { calcProgress } = await import('./timer')
    expect(calcProgress(1000, -100)).toBe(0)
  })
})

// ============================================================
describe('formatTimerClock', () => {
  it('应格式化常规时间 mm:ss', async () => {
    const { formatTimerClock } = await import('./timer')
    expect(formatTimerClock(0)).toBe('00:00')
    expect(formatTimerClock(1000)).toBe('00:01')
    expect(formatTimerClock(60000)).toBe('01:00')
    expect(formatTimerClock(61000)).toBe('01:01')
    expect(formatTimerClock(1500000)).toBe('25:00')
  })

  it('应向下取整（抹掉不足 1 秒的毫秒）', async () => {
    const { formatTimerClock } = await import('./timer')
    expect(formatTimerClock(1499)).toBe('00:01')   // 1.499s → 1s
    expect(formatTimerClock(1500)).toBe('00:01')   // 1.5s → 1s
    expect(formatTimerClock(1999)).toBe('00:01')   // 1.999s → 1s
  })

  it('分钟和秒都应补零', async () => {
    const { formatTimerClock } = await import('./timer')
    expect(formatTimerClock(3000)).toBe('00:03')
    expect(formatTimerClock(60000 * 5 + 7000)).toBe('05:07')
  })

  it('大数值（超过 1 小时）也应正确', async () => {
    const { formatTimerClock } = await import('./timer')
    expect(formatTimerClock(3600000)).toBe('60:00')
    expect(formatTimerClock(3661000)).toBe('61:01')
  })

  it('负值应表现如零（或至少不崩溃）', async () => {
    const { formatTimerClock } = await import('./timer')
    // floor(-1/1000) → -1 → 截断到 00:00？实测 Math.floor(-0.001) = -1
    // 但规范上负 ms 不应出现，此处只保证不抛异常
    expect(() => formatTimerClock(-1)).not.toThrow()
  })
})
