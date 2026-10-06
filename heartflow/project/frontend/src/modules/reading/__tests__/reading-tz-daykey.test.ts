import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'

// ⚠️ 本机必须真的是 UTC+8，否则两种口径退化成同值 → 假绿
const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'
const NOW = new Date(2026, 2, 15, 3, 0, 0) // 本地 03-15 03:00（UTC 03-14 19:00，跨日）

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })
afterAll(() => { process.env.TZ = ORIGINAL_TZ })

function session(id: string, date: string): any {
  return {
    id,
    bookId: 'b1',
    startPage: 1,
    endPage: 10,
    duration: 30,
    date,
    timestamp: new Date().toISOString(),
  }
}

describe('reading 连续阅读天数（本地日历日）', () => {
  it('前提：本机 UTC+8，本地 today/yesterday 与 UTC 日历日错开一天', async () => {
    const { getLocalDateKey } = await import('../../../utils/time')
    const today = new Date(NOW); today.setHours(0, 0, 0, 0)
    const y = new Date(today.getTime() - 86400000)
    expect(getLocalDateKey(today)).toBe('2026-03-15')
    // 此刻的 UTC 日历日是昨天 —— 这正是「凌晨记录被算到昨天」的根源
    expect(NOW.toISOString().slice(0, 10)).toBe('2026-03-14')
  })

  it('今天+昨天各一条阅读 → streak=2（UTC 记录口径下 expected 退到 03-14 → streak=1）', async () => {
    const { useReadingHabits } = await import('../reading-habits')
    const h = useReadingHabits()
    const r = h.getReadingConsistency([session('s1', '2026-03-15'), session('s2', '2026-03-14')])
    expect(r.streak).toBe(2)
  })
})
