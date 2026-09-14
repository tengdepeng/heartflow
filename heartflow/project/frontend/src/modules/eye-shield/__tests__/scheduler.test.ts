import { describe, it, expect } from 'vitest'
import {
  nextRestAt,
  secondsUntilRest,
  isBreakDue,
  todayRecords,
  eyeBreakStats,
  startOfDayAt,
  formatCountdown,
  DEFER_MINUTES,
} from '../scheduler'

const T0 = new Date('2026-09-01T10:00:00+08:00').getTime()

describe('eye-shield · 用眼休息调度（纯函数）', () => {
  it('nextRestAt：间隔 20 分钟推演下一次休息时刻', () => {
    expect(nextRestAt(T0, 20)).toBe(T0 + 20 * 60_000)
    expect(nextRestAt(T0, 45, DEFER_MINUTES * 60_000)).toBe(T0 + 45 * 60_000 + DEFER_MINUTES * 60_000)
  })

  it('nextRestAt：breakMinutes<=0 返回 Infinity（已关闭）', () => {
    expect(nextRestAt(T0, 0)).toBe(Number.POSITIVE_INFINITY)
    expect(nextRestAt(T0, -1)).toBe(Number.POSITIVE_INFINITY)
  })

  it('secondsUntilRest：剩余秒数向上取整', () => {
    // 已用 18.5 分，距 20 分还有 90 秒
    expect(secondsUntilRest(T0, 20, T0 + 18.5 * 60_000)).toBe(90)
    // 超过到点归 0
    expect(secondsUntilRest(T0, 20, T0 + 21 * 60_000)).toBe(0)
    // 关闭返回 null
    expect(secondsUntilRest(T0, 0, T0)).toBeNull()
  })

  it('isBreakDue：到点触发，关闭恒 false', () => {
    expect(isBreakDue(T0, 20, T0 + 20 * 60_000 - 1)).toBe(false)
    expect(isBreakDue(T0, 20, T0 + 20 * 60_000)).toBe(true)
    expect(isBreakDue(T0, 0, T0 + 999 * 60_000)).toBe(false)
  })

  it('startOfDayAt：本地零点起始', () => {
    const start = startOfDayAt(T0)
    const d = new Date(start)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(startOfDayAt(T0 + 12 * 3600_000)).toBe(start)
  })

  it('todayRecords：只保留当日并按时间升序', () => {
    const yesterday = T0 - 86_400_000
    const recs = [
      { id: 'a', at: T0 + 3600_000, kind: 'rest' as const },
      { id: 'b', at: T0, kind: 'rest' as const },
      { id: 'c', at: yesterday, kind: 'rest' as const },
      { id: 'd', at: T0 + 7200_000, kind: 'defer' as const },
    ]
    const t = todayRecords(recs, T0)
    expect(t.map((r) => r.id)).toEqual(['b', 'a', 'd'])
  })

  it('eyeBreakStats：统计今日休息/稍后次数与上次休息时间', () => {
    const recs = [
      { id: 'a', at: T0 + 3600_000, kind: 'rest' as const },
      { id: 'b', at: T0 + 7200_000, kind: 'defer' as const },
      { id: 'old', at: T0 - 86_400_000, kind: 'rest' as const },
    ]
    const s = eyeBreakStats(recs, T0)
    expect(s.total).toBe(2)
    expect(s.rests).toBe(1)
    expect(s.defers).toBe(1)
    expect(s.lastRestAt).toBe(T0 + 7200_000)
  })

  it('eyeBreakStats：空记录返回全零且无上次休息', () => {
    const s = eyeBreakStats([], T0)
    expect(s).toEqual({ total: 0, rests: 0, defers: 0, lastRestAt: null })
  })

  it('formatCountdown：mm:ss 格式化，null/Infinity 显示占位', () => {
    expect(formatCountdown(38)).toBe('0:38')
    expect(formatCountdown(120)).toBe('2:00')
    expect(formatCountdown(61 * 60)).toBe('61:00')
    expect(formatCountdown(null)).toBe('——')
    expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe('——')
  })
})