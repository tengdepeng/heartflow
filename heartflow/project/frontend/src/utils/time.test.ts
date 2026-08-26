// ============================================================
// 时间工具函数 · 测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { getLocalDateKey, formatTime, formatDate, formatDuration, getWeekRange, getMonthDays } from './time'

describe('getLocalDateKey', () => {
  it('返回 YYYY-MM-DD 格式', () => {
    const result = getLocalDateKey(new Date(2026, 0, 15))
    expect(result).toBe('2026-01-15')
  })

  it('默认返回当前日期', () => {
    const result = getLocalDateKey()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatTime', () => {
  it('0 秒返回 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('150 秒返回 02:30', () => {
    expect(formatTime(150)).toBe('02:30')
  })

  it('3600 秒返回 60:00', () => {
    expect(formatTime(3600)).toBe('60:00')
  })

  it('3661 秒返回 61:01', () => {
    expect(formatTime(3661)).toBe('61:01')
  })
})

describe('formatDate', () => {
  it('short 格式返回 M/D', () => {
    const d = new Date(2026, 5, 15).getTime()
    expect(formatDate(d, 'short')).toBe('6/15')
  })

  it('full 格式返回 YYYY-MM-DD', () => {
    const d = new Date(2026, 5, 15).getTime()
    expect(formatDate(d, 'full')).toBe('2026-06-15')
  })

  it('weekday 格式返回中文星期', () => {
    const d = new Date(2026, 5, 15).getTime() // 2026-06-15 是周一
    const result = formatDate(d, 'weekday')
    expect(['一', '二', '三', '四', '五', '六', '日']).toContain(result)
  })

  it('接受字符串时间戳', () => {
    expect(formatDate('2026-06-15T00:00:00Z', 'short')).toBe('6/15')
  })
})

describe('formatDuration', () => {
  it('小于 60 秒返回 X秒', () => {
    expect(formatDuration(45)).toBe('45秒')
  })

  it('小于 60 分钟返回 X分钟', () => {
    expect(formatDuration(150)).toBe('2分钟')
  })

  it('整数小时返回 X小时', () => {
    expect(formatDuration(7200)).toBe('2小时')
  })

  it('X小时Y分钟', () => {
    expect(formatDuration(3660)).toBe('1小时1分钟')
  })
})

describe('getWeekRange', () => {
  it('返回 monday 和 sunday', () => {
    const range = getWeekRange(new Date(2026, 5, 15))
    expect(range.monday).toBeInstanceOf(Date)
    expect(range.sunday).toBeInstanceOf(Date)
    expect(range.monday <= range.sunday).toBe(true)
  })

  it('monday 是周一', () => {
    const range = getWeekRange(new Date(2026, 5, 15))
    expect(range.monday.getDay()).toBe(1)
  })
})

describe('getMonthDays', () => {
  it('2026 年 1 月返回 31 天 + padding', () => {
    const days = getMonthDays(2026, 0)
    expect(days.length).toBeGreaterThanOrEqual(31)
    expect(days.length % 7).toBe(0)
  })

  it('2026 年 2 月返回 28 天 + padding', () => {
    const days = getMonthDays(2026, 1)
    expect(days.length % 7).toBe(0)
  })

  it('标记当前月与非当前月', () => {
    const days = getMonthDays(2026, 0)
    const currentMonthDays = days.filter(d => d.isCurrentMonth)
    expect(currentMonthDays.length).toBe(31)
  })
})