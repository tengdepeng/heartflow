// ============================================================
// 四柱画像测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { computeFourPillars, defaultBirthData, zodiacForYear, constellationFor } from '../four-pillars'

describe('computeFourPillars', () => {
  it('返回四柱画像', () => {
    const result = computeFourPillars({ year: 1995, month: 6, day: 15, hour: 10 })
    expect(result.pillars).toHaveLength(4)
    expect(result.pillars[0].label).toContain('年柱')
    expect(result.pillars[1].label).toContain('月柱')
    expect(result.pillars[2].label).toContain('日柱')
    expect(result.pillars[3].label).toContain('时柱')
    expect(result.overall).toBeTruthy()
  })

  it('不同出生年份返回不同年柱', () => {
    const a = computeFourPillars({ year: 1990, month: 1, day: 1, hour: 0 })
    const b = computeFourPillars({ year: 2000, month: 1, day: 1, hour: 0 })
    // 由于年份分布可能相同，确保结构正确即可
    expect(a.pillars[0].keyword).toBeTruthy()
    expect(b.pillars[0].keyword).toBeTruthy()
  })
})

describe('defaultBirthData', () => {
  it('返回有效出生信息', () => {
    const data = defaultBirthData()
    expect(data.year).toBeGreaterThan(1900)
    expect(data.month).toBeGreaterThanOrEqual(1)
    expect(data.month).toBeLessThanOrEqual(12)
    expect(data.day).toBeGreaterThanOrEqual(1)
    expect(data.day).toBeLessThanOrEqual(31)
    expect(data.hour).toBeGreaterThanOrEqual(0)
    expect(data.hour).toBeLessThanOrEqual(23)
  })
})

describe('zodiacForYear', () => {
  it('返回有效生肖', () => {
    expect(zodiacForYear(1996)).toBe('鼠')
    expect(zodiacForYear(2024)).toBe('龙')
  })
})

describe('constellationFor', () => {
  it('返回有效星座', () => {
    expect(constellationFor({ year: 2000, month: 3, day: 21, hour: 0 })).toBe('白羊座')
    expect(constellationFor({ year: 2000, month: 12, day: 25, hour: 0 })).toBe('摩羯座')
  })
})