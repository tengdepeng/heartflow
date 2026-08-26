import { describe, it, expect } from 'vitest'
import {
  lifeElapsed,
  lifeProgress,
  remainingTime,
  milestonesOn,
  buildLifeOverview,
  DEFAULT_MILESTONES,
} from '../life-epoch'

describe('life-epoch · 生命刻度', () => {
  const birth = new Date(2000, 0, 1) // 2000-01-01

  it('生之时六级粒度：出生当日为零', () => {
    const e = lifeElapsed(birth, new Date(2000, 0, 1, 12, 0, 0))
    expect(e.years).toBe(0)
    expect(e.months).toBe(0)
    expect(e.days).toBe(0)
    expect(e.hours).toBe(12)
    expect(e.minutes).toBe(0)
    expect(e.seconds).toBe(0)
  })

  it('生之时：25 年后年限为 25', () => {
    const e = lifeElapsed(birth, new Date(2025, 0, 1))
    expect(e.years).toBe(25)
  })

  it('lifeProgress：期望 80 年，25 岁约 31%', () => {
    const p = lifeProgress(birth, 80, new Date(2025, 0, 1))
    expect(p).toBeGreaterThanOrEqual(30)
    expect(p).toBeLessThanOrEqual(32)
  })

  it('lifeProgress：超出期望寿命钳制到 100', () => {
    expect(lifeProgress(birth, 20, new Date(2030, 0, 1))).toBe(100)
  })

  it('remainingTime：从出生到期望寿命终点倒计时', () => {
    const s = remainingTime(birth, 80, new Date(2025, 0, 1))
    expect(s).toMatch(/\d{2} 年 \d{1,2} 个月 \d{1,2} 天/)
  })

  it('remainingTime：超过期望寿命返回零', () => {
    expect(remainingTime(birth, 20, new Date(2030, 0, 1))).toBe('0 年 0 个月 0 天')
  })

  it('里程碑：已过与未过正确标注', () => {
    const ms = milestonesOn(birth, DEFAULT_MILESTONES, new Date(2025, 0, 1))
    const adult = ms.find((m) => m.name === '成年')
    expect(adult).toBeDefined()
    expect(adult!.passed).toBe(true)
    const old = ms.find((m) => m.name === '古稀之年')
    expect(old!.passed).toBe(false)
    expect(old!.date).toBe('2070-01-01')
  })

  it('里程碑按年份升序', () => {
    const ms = milestonesOn(birth, DEFAULT_MILESTONES, new Date(2025, 0, 1))
    for (let i = 1; i < ms.length; i++) {
      expect(ms[i].year).toBeGreaterThan(ms[i - 1].year)
    }
  })

  it('buildLifeOverview 组合全套', () => {
    const ov = buildLifeOverview(
      { birthDate: '2000-01-01', expectedLifespan: 80, milestones: DEFAULT_MILESTONES },
      new Date(2025, 0, 1),
    )
    expect(ov.elapsed.years).toBe(25)
    expect(ov.progress).toBeGreaterThan(0)
    expect(ov.remaining).toMatch(/年/)
    expect(ov.milestones.length).toBe(DEFAULT_MILESTONES.length)
  })
})