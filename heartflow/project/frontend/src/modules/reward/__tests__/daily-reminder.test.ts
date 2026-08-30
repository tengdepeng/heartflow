// ============================================================
// 每日记账提醒 / 记账习惯引擎测试（INCR-30）
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  hasRecordToday,
  recordStreak,
  monthActivity,
  DEFAULT_REMINDER_TIME,
} from '../daily-reminder'
import type { RewardRecord } from '../reward-list'

function rec(day: string, type: 'income' | 'expense' = 'expense', amount = 10): RewardRecord {
  return {
    id: `r-${day}-${type}-${amount}`,
    type,
    category: 'other-expense',
    amount,
    description: '',
    at: `${day}T12:00:00.000Z`,
  }
}

const TODAY = '2026-08-29'

describe('hasRecordToday', () => {
  it('今日有记录 → true', () => {
    expect(hasRecordToday([rec(TODAY)], TODAY)).toBe(true)
  })
  it('今日无记录 → false', () => {
    expect(hasRecordToday([rec('2026-08-28')], TODAY)).toBe(false)
  })
})

describe('recordStreak 连续记账天数', () => {
  it('今天已记账：连续数从今天往回', () => {
    const days = ['2026-08-29', '2026-08-28', '2026-08-27']
    expect(recordStreak(days.map(d => rec(d)), TODAY)).toBe(3)
  })
  it('今天未记账：连续数从昨天往回（今天中断不计）', () => {
    // 昨天起连续 2 天，今天未记
    expect(recordStreak([rec('2026-08-28'), rec('2026-08-27')], TODAY)).toBe(2)
  })
  it('中间断档则连续中断', () => {
    expect(recordStreak([rec(TODAY), rec('2026-08-27')], TODAY)).toBe(1)
  })
  it('无记录 → 0', () => {
    expect(recordStreak([], TODAY)).toBe(0)
  })
})

describe('monthActivity 月活动度', () => {
  it('统计笔数 / 活跃天数 / 逐日净额', () => {
    const records = [
      rec('2026-08-05', 'expense', 100),
      rec('2026-08-05', 'income', 300),
      rec('2026-08-08', 'expense', 50),
      rec('2026-07-01', 'expense', 999),
    ]
    const a = monthActivity(records, '2026-08')
    expect(a.count).toBe(3)
    expect(a.activeDays).toBe(2)
    expect(a.byDay['2026-08-05']).toBe(200) // 300 - 100
    expect(a.byDay['2026-08-08']).toBe(-50)
  })
})

describe('默认提醒时间', () => {
  it('默认 20:00', () => {
    expect(DEFAULT_REMINDER_TIME).toBe('20:00')
  })
})