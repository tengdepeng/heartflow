// ============================================================
// rest（休息）域 · 时区判别力测试（TZ 日键治理 · 日键第十三批）
//
// 覆盖 rest-advanced 记录侧日键（computeStreakDays / checkPerfectWeek /
// 按日分桶三处 r.date.slice(0,10)）与 quality.ts 连续休息天数桶键。
// 落库侧 date 是完整 ISO 时间戳（quality.ts:68 new Date().toISOString()），
// 读取侧须用 getLocalDateKey(new Date(r.date)) 抽本地日历日。
//
// 判别力前提：假时刻 = 本地 2026-03-15 00:30（UTC 仍为 2026-03-14）。
// 本地 03-15 00:10 的记录若仍按 UTC 抽日键会被算到 03-14，
// 连续天数将少算 1 天 ⇒ 用例转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import type { BreakRecord } from '../types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

/** 本地某日某时 → 完整 ISO 时间戳（落库形态） */
function localAt(dayOffset: number, hour: number, minute = 0): string {
  return new Date(2026, 2, 15 + dayOffset, hour, minute, 0).toISOString()
}

function brk(id: string, dayOffset: number, hour: number, minute = 0): BreakRecord {
  return {
    id, activity: 'stretch', duration: 5, mood: 4,
    date: localAt(dayOffset, hour, minute),
  }
}

/** 取 rest_streak_3 的 progressLabel（形如 "2/3天"）。
 *  注意：checkAchievements() 只返回「已解锁」数组，未达标时为空；
 *  progressLabel 写在全量 achievements ref 上，故从那里读。 */
function streak3Label(achievements: { id: string; progressLabel: string }[]): string {
  return achievements.find((a) => a.id === 'rest_streak_3')?.progressLabel ?? ''
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

describe('rest 域时区判别力 · 日键本地化', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('computeStreakDays：本地 03-15 凌晨记录算入连续天数（UTC 口径会少算 1 天）', async () => {
    const { useRestAchievements } = await import('../rest-advanced')
    // 03-15(今天,00:10) + 03-14 + 03-13 连续三条 ⇒ streak = 3
    const records = [brk('a', 0, 0, 10), brk('b', -1, 12), brk('c', -2, 12)]
    const { checkAchievements, achievements } = useRestAchievements(() => records, () => [])
    checkAchievements()
    expect(streak3Label(achievements.value)).toBe('3/3天')
  })

  it('computeStreakDays：昨日 23:30 记录归入 03-14 而非 03-15（防错吞）', async () => {
    const { useRestAchievements } = await import('../rest-advanced')
    // 昨天 23:30 + 前天 ⇒ streak = 2（今天无记录）
    const records = [brk('y', -1, 23, 30), brk('z', -2, 12)]
    const { checkAchievements, achievements } = useRestAchievements(() => records, () => [])
    checkAchievements()
    expect(streak3Label(achievements.value)).toBe('2/3天')
  })

  it('computeStreakDays：仅今日凌晨一条也记为 1 天（证明记录未落到昨天）', async () => {
    const { useRestAchievements } = await import('../rest-advanced')
    const records = [brk('only', 0, 0, 10)]
    const { checkAchievements, achievements } = useRestAchievements(() => records, () => [])
    checkAchievements()
    // UTC 口径下这条会归到 03-14，而 03-14/03-13 无记录 ⇒ streak = 0
    expect(streak3Label(achievements.value)).toBe('1/3天')
  })

  it('computeStreakDays：今日凌晨 + 昨日两条连续记为 2 天（期望侧本就是本地日键）', async () => {
    const { useRestAchievements } = await import('../rest-advanced')
    // computeStreakDays 内部期望键走 toLocalDateStr（本来就是本地），
    // 只有记录侧原为 UTC ⇒ 本批修的是「记录侧与期望侧同基」。
    const records = [brk('a', 0, 0, 10), brk('b', -1, 12)]
    const { checkAchievements, achievements } = useRestAchievements(() => records, () => [])
    checkAchievements()
    expect(streak3Label(achievements.value)).toBe('2/3天')
  })
})
