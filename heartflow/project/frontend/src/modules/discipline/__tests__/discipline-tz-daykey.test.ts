// ============================================================
// discipline 域 · 时区判别力测试（TZ 日键治理 INCR-466 · 日键第七批）
//
// 覆盖 streak-system 的 checkinDate 默认值：它是「业务日期键」，
// 必须按本地日历日 —— 东八区 00:00–08:00 打卡时，UTC 切键会把它算到昨天。
//
// ⚠️ 判别力来源（已用 node 枚举确认）：
//   `recordCheckin` 的 checkinDate 默认值 = 业务「今天」。
//   假时刻取**本地 03:00（凌晨）** 时：getLocalDateKey → 2026-03-15，
//   而 toISOString().split('T')[0] → 2026-03-14，两者不同 ⇒ 才有判别力。
//   （若取正午 10:00，两口径同值，测试无判别力——这正是本流程反复踩的坑）
//
// 而 `new Date(日键)` 减 24h 在两口径下恒等，故「昨天」边界本身不是判别点，不在此断言。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'

/** 凌晨 03:00 —— 落在缺陷窗口内（本地与 UTC 日历日不同） */
const NOW = new Date(2026, 2, 15, 3, 0, 0)
const LOCAL_TODAY = '2026-03-15'
const UTC_TODAY = '2026-03-14'

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => { vi.useRealTimers() })
afterAll(() => { process.env.TZ = ORIGINAL_TZ })

async function getTracker() {
  const { useStreakTracker } = await import('../streak-system')
  return useStreakTracker()
}

describe('streak-system checkinDate 默认值（本地日历日）', () => {
  it('前提：凌晨基准下，本地今天与 UTC 日历日不同（判别力前提）', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(getLocalDateKey(new Date())).toBe(LOCAL_TODAY)
    expect(new Date().toISOString().slice(0, 10)).toBe(UTC_TODAY)
    expect(LOCAL_TODAY).not.toBe(UTC_TODAY)
  })

  it('凌晨打卡：不传 checkinDate 时应记为本地今天（UTC 口径会记成昨天）', async () => {
    const t = await getTracker()
    const rec = t.recordCheckin('h1', '阅读')
    expect(rec.lastCheckinDate).toBe(LOCAL_TODAY)
  })

  it('凌晨连续两天打卡：昨天+今天都按本地日键，连续天数应为 2', async () => {
    const t = await getTracker()
    t.recordCheckin('h1', '阅读', '2026-03-14')
    const rec = t.recordCheckin('h1', '阅读')   // 默认 = 本地今天 03-15
    expect(rec.lastCheckinDate).toBe(LOCAL_TODAY)
    expect(rec.currentStreak).toBe(2)
  })

  it('显式传入本地昨天时应连续（显式入参同样按本地口径比较）', async () => {
    const t = await getTracker()
    t.recordCheckin('h2', '冥想', '2026-03-14')
    const rec = t.recordCheckin('h2', '冥想', '2026-03-15')
    expect(rec.currentStreak).toBe(2)
  })
})
