import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import {
  clampHour,
  isWorkHours,
  msUntilOffWork,
  workedMsToday,
  earnedToday,
  workProgress,
  useSlackingWage,
} from '../slacking'

beforeEach(() => {
  const m = createMockStorage()
  ;(globalThis as any).localStorage = m
  invalidateCache()
  useSlackingWage()._reset()
})

const CFG = { hourlyRate: 30, workStartHour: 9, offWorkHour: 18 }

describe('纯函数', () => {
  it('clampHour 夹取 0~23 整数', () => {
    expect(clampHour(25)).toBe(23)
    expect(clampHour(-3)).toBe(0)
    expect(clampHour(10.9)).toBe(10)
    expect(clampHour(NaN)).toBe(0)
  })

  it('isWorkHours 含上班、不含下班', () => {
    expect(isWorkHours(CFG, new Date(2026, 0, 1, 9, 0))).toBe(true)
    expect(isWorkHours(CFG, new Date(2026, 0, 1, 17, 59))).toBe(true)
    expect(isWorkHours(CFG, new Date(2026, 0, 1, 18, 0))).toBe(false)
    expect(isWorkHours(CFG, new Date(2026, 0, 1, 8, 0))).toBe(false)
  })

  it('msUntilOffWork 距下班毫秒，已过返回 0', () => {
    expect(msUntilOffWork(CFG, new Date(2026, 0, 1, 12, 0))).toBe(6 * 3600_000)
    expect(msUntilOffWork(CFG, new Date(2026, 0, 1, 19, 0))).toBe(0)
  })

  it('workedMsToday 已上班毫秒，前后夹取', () => {
    expect(workedMsToday(CFG, new Date(2026, 0, 1, 12, 0))).toBe(3 * 3600_000)
    expect(workedMsToday(CFG, new Date(2026, 0, 1, 7, 0))).toBe(0)
    expect(workedMsToday(CFG, new Date(2026, 0, 1, 22, 0))).toBe(9 * 3600_000)
  })

  it('earnedToday 按工时 × 时薪', () => {
    expect(earnedToday(CFG, new Date(2026, 0, 1, 12, 0))).toBe(90)
    expect(earnedToday({ ...CFG, hourlyRate: 50 }, new Date(2026, 0, 1, 12, 0))).toBe(150)
  })

  it('workProgress 0~1', () => {
    expect(workProgress(CFG, new Date(2026, 0, 1, 13, 30))).toBeCloseTo(0.5, 5)
    expect(workProgress(CFG, new Date(2026, 0, 1, 7, 0))).toBe(0)
  })
})

describe('useSlackingWage 单例 + 派生', () => {
  it('默认配置与派生值正确', () => {
    const s = useSlackingWage()
    s._setNow(new Date(2026, 0, 1, 12, 0).getTime())
    expect(s.config.hourlyRate).toBe(30)
    expect(s.earned.value).toBe(90)
    expect(s.working.value).toBe(true)
    expect(s.msToOff.value).toBe(6 * 3600_000)
    expect(s.progress.value).toBeCloseTo(1 / 3, 5)
  })

  it('设置时薪 / 下班实时影响派生', () => {
    const s = useSlackingWage()
    s._setNow(new Date(2026, 0, 1, 12, 0).getTime())
    s.setHourlyRate(60)
    expect(s.config.hourlyRate).toBe(60)
    expect(s.earned.value).toBe(180)
    s.setOffWork(20)
    expect(s.config.offWorkHour).toBe(20)
    expect(s.msToOff.value).toBe(8 * 3600_000)
  })

  it('摸鱼计时 start/stop 累计两次', () => {
    const s = useSlackingWage()
    s._reset()
    s._setNow(1_000_000)
    s.startSlacking()
    s._setNow(1_000_000 + 5000)
    s.stopSlacking()
    expect(s.slackingMs.value).toBe(5000)
    s._setNow(2_000_000)
    s.startSlacking()
    s._setNow(2_000_000 + 3000)
    s.stopSlacking()
    expect(s.slackingMs.value).toBe(8000)
  })

  it('摸鱼计时进行中实时累加', () => {
    const s = useSlackingWage()
    s._reset()
    s._setNow(5_000_000)
    s.startSlacking()
    s._setNow(5_000_000 + 2000)
    expect(s.slackingMs.value).toBe(2000)
  })

  it('清零复位摸鱼累计', () => {
    const s = useSlackingWage()
    s._reset()
    s._setNow(1_000_000)
    s.startSlacking()
    s._setNow(1_000_000 + 4000)
    s.stopSlacking()
    expect(s.slackingMs.value).toBe(4000)
    s.resetSlacking()
    expect(s.slackingMs.value).toBe(0)
  })
})

describe('useSlackingWage 持久化', () => {
  it('设置写入 hf:slacking', () => {
    const s = useSlackingWage()
    s._reset()
    s.setHourlyRate(88)
    const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
    const kv = JSON.parse(raw).kvStore
    expect(kv['hf:slacking'].config.hourlyRate).toBe(88)
  })
})
