// ============================================================
// 时间长廊 · 天文事件模块测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  moonAge,
  phaseFromAge,
  moonIllumination,
  getMoonPhase,
  getMonthPhases,
  getMeteorShowersInMonth,
  getUpcomingEclipses,
  getUpcomingMeteorShowers,
  METEOR_SHOWERS,
  ECLIPSES,
} from '../astronomy'

describe('astronomy 天文事件（本地计算）', () => {
  it('已知新月日期的月龄接近 0', () => {
    // 2000-01-06 18:14 UTC 为新月参考
    const d = new Date('2000-01-06T18:14:00Z')
    const age = moonAge(d)
    expect(age).toBeGreaterThan(-0.5)
    expect(age).toBeLessThan(0.5)
  })

  it('月龄始终落在 [0, 29.53) 区间', () => {
    for (let i = 0; i < 60; i++) {
      const d = new Date(2026, 0, 1 + i)
      const age = moonAge(d)
      expect(age).toBeGreaterThanOrEqual(0)
      expect(age).toBeLessThan(29.53058867)
    }
  })

  it('phaseFromAge 映射关键月相', () => {
    expect(phaseFromAge(0)).toBe('new')
    expect(phaseFromAge(3)).toBe('waxing-crescent')
    expect(phaseFromAge(6.5)).toBe('first-quarter')
    expect(phaseFromAge(9)).toBe('waxing-gibbous')
    expect(phaseFromAge(12.5)).toBe('full')
    expect(phaseFromAge(16)).toBe('waning-gibbous')
    expect(phaseFromAge(19)).toBe('last-quarter')
    expect(phaseFromAge(23)).toBe('waning-crescent')
    expect(phaseFromAge(29)).toBe('new')
  })

  it('moonIllumination 新月为 0、满月为 1', () => {
    expect(moonIllumination(0)).toBeCloseTo(0, 5)
    expect(moonIllumination(29.53058867 / 2)).toBeCloseTo(1, 5)
  })

  it('getMoonPhase 返回结构化月相', () => {
    const p = getMoonPhase(new Date(2026, 7, 12))
    expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(p.illumination).toBeGreaterThanOrEqual(0)
    expect(p.illumination).toBeLessThanOrEqual(1)
    expect(p.label).toBeTruthy()
    expect(p.icon).toBeTruthy()
  })

  it('getMonthPhases 返回当月每天月相', () => {
    const phases = getMonthPhases(2026, 8)
    expect(phases).toHaveLength(31)
    expect(phases[0].date).toBe('2026-08-01')
    expect(phases[30].date).toBe('2026-08-31')
  })

  it('getMeteorShowersInMonth 返回该月流星雨', () => {
    const aug = getMeteorShowersInMonth(2026, 8)
    expect(aug.map(s => s.id)).toContain('perseids')
    const dec = getMeteorShowersInMonth(2026, 12)
    expect(dec.map(s => s.id)).toEqual(expect.arrayContaining(['geminids', 'ursids']))
  })

  it('流星雨表覆盖全年主要事件', () => {
    expect(METEOR_SHOWERS.length).toBeGreaterThanOrEqual(8)
    const months = new Set(METEOR_SHOWERS.map(s => s.month))
    expect(months.has(1)).toBe(true)
    expect(months.has(8)).toBe(true)
    expect(months.has(12)).toBe(true)
  })

  it('getUpcomingEclipses 返回未来事件', () => {
    const ref = new Date('2026-08-01T00:00:00')
    const upcoming = getUpcomingEclipses(ref, 3)
    expect(upcoming).toHaveLength(3)
    expect(upcoming[0].date).toBe('2026-08-12')
    expect(upcoming[0].type).toBe('solar')
  })

  it('日月食表按日期升序且无重复', () => {
    for (let i = 1; i < ECLIPSES.length; i++) {
      expect(ECLIPSES[i].date > ECLIPSES[i - 1].date).toBe(true)
    }
    const dates = new Set(ECLIPSES.map(e => e.date))
    expect(dates.size).toBe(ECLIPSES.length)
  })

  it('getUpcomingMeteorShowers 返回未来峰值', () => {
    const ref = new Date('2026-08-01T00:00:00')
    const upcoming = getUpcomingMeteorShowers(ref, 3)
    expect(upcoming).toHaveLength(3)
    expect(upcoming[0].id).toBe('perseids')
    expect(upcoming[0].peakDate).toBe('2026-08-13')
  })
})
