import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isLongDormant, LONG_DORMANCY_DAYS, LONG_DORMANCY_MS } from '../longDormancy'

// 纯函数依赖 engine.isTargetActive，单测中隔离
vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(),
}))
import { isTargetActive } from '../../../engine/constitution-effect'

const now = new Date('2026-08-16T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
function daysAgo(n: number): string {
  return new Date(now.getTime() - n * DAY).toISOString()
}

beforeEach(() => {
  vi.mocked(isTargetActive).mockReset()
})

describe('isLongDormant', () => {
  it('条款未启用 → 恒为 false（不干预运行时）', () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    expect(isLongDormant(daysAgo(365), now)).toBe(false)
  })

  it('条款启用但 lastActiveAt 缺失 → false（不强制新幕僚沉睡）', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isLongDormant(undefined, now)).toBe(false)
    expect(isLongDormant(null, now)).toBe(false)
  })

  it('条款启用且近期互动（10 天）→ false', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isLongDormant(daysAgo(10), now)).toBe(false)
  })

  it('条款启用且恰好 90 天 → false（严格大于）', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isLongDormant(daysAgo(90), now)).toBe(false)
  })

  it('条款启用且 91 天 → true', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isLongDormant(daysAgo(91), now)).toBe(true)
  })

  it('条款启用且 365 天 → true', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isLongDormant(daysAgo(365), now)).toBe(true)
  })

  it('非法日期字符串 → false（不抛错）', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isLongDormant('not-a-date', now)).toBe(false)
  })

  it('阈值常量自洽（90 天 = LONG_DORMANCY_MS）', () => {
    expect(LONG_DORMANCY_DAYS).toBe(90)
    expect(LONG_DORMANCY_MS).toBe(LONG_DORMANCY_DAYS * DAY)
  })
})
