// ============================================================
// 长时间廊 · 行星星历测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  NAKED_EYE_PLANETS,
  PLANET_META,
  planetsAt,
  visiblePlanets,
  eqlToEquatorial,
  obliquity,
} from '../planets'

describe('planet ephemeris', () => {
  it('返回全部裸眼行星且元数据齐全', () => {
    const list = planetsAt(new Date('2026-08-21T20:00:00'), { latDeg: 23, lngDeg: 113 })
    expect(list).toHaveLength(NAKED_EYE_PLANETS.length)
    for (const p of list) {
      expect(PLANET_META[p.id]).toBeTruthy()
      expect(Number.isFinite(p.altDeg)).toBe(true)
      expect(p.raDeg).toBeGreaterThanOrEqual(0)
      expect(p.raDeg).toBeLessThan(360)
    }
  })

  it('金星的视星等显著明亮', () => {
    const list = planetsAt(new Date('2026-08-21T20:00:00'), { latDeg: 23, lngDeg: 113 })
    const venus = list.find(p => p.id === 'venus')
    expect(venus).toBeTruthy()
    if (venus) expect(venus.mag).toBeLessThan(0)
  })

  it('地平高度/方位角范围合法', () => {
    for (const p of planetsAt(new Date('2026-08-21T20:00:00'))) {
      expect(p.altDeg).toBeGreaterThanOrEqual(-90)
      expect(p.altDeg).toBeLessThanOrEqual(90)
      expect(p.azDeg).toBeGreaterThanOrEqual(0)
      expect(p.azDeg).toBeLessThan(360)
    }
  })

  it('visiblePlanets 仅包含地平线上的行星且按高度降序', () => {
    const vis = visiblePlanets(new Date('2026-08-21T20:00:00'), { latDeg: 23, lngDeg: 113 })
    expect(vis.every(p => p.aboveHorizon && p.altDeg > 0)).toBe(true)
    for (let i = 1; i < vis.length; i++) {
      expect(vis[i - 1].altDeg).toBeGreaterThanOrEqual(vis[i].altDeg)
    }
  })

  it('黄赤交角约为 23.44°', () => {
    expect(obliquity(0)).toBeCloseTo(23.4393, 1)
  })

  it('eqlToEquatorial 对春分点赤纬接近 0', () => {
    const { decDeg } = eqlToEquatorial(0, 0, 0)
    expect(Math.abs(decDeg)).toBeLessThan(1)
  })
})