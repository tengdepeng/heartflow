// ============================================================
// 长时间廊 · 深空天体库测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  DEEP_SKY_CATALOG,
  deepSkyByType,
  deepSkyByConstellation,
  searchDeepSky,
  sortDeepSkyByMagnitude,
  visibilityHint,
  TYPE_META,
} from '../deep-sky'

describe('deep-sky catalog', () => {
  it('收录精选 Messier 深空目标', () => {
    expect(DEEP_SKY_CATALOG.length).toBeGreaterThanOrEqual(25)
    expect(DEEP_SKY_CATALOG.some(o => o.id === 'M31')).toBe(true)
    expect(DEEP_SKY_CATALOG.some(o => o.id === 'M42')).toBe(true)
  })

  it('每个目标都有合法类型元数据', () => {
    const types = Object.keys(TYPE_META)
    for (const o of DEEP_SKY_CATALOG) {
      expect(types).toContain(o.type)
    }
  })

  it('按类型筛选星系', () => {
    const galaxies = deepSkyByType('galaxy')
    expect(galaxies.length).toBeGreaterThan(0)
    expect(galaxies.every(g => g.type === 'galaxy')).toBe(true)
  })

  it('按星座筛选猎户座', () => {
    const orion = deepSkyByConstellation('猎户座')
    expect(orion.length).toBeGreaterThan(0)
    expect(orion.some(o => o.id === 'M42')).toBe(true)
  })

  it('关键词搜索命中 id 与中文名', () => {
    expect(searchDeepSky('M31').length).toBeGreaterThan(0)
    expect(searchDeepSky('猎户座大星云').some(o => o.id === 'M42')).toBe(true)
    expect(searchDeepSky('').length).toBe(DEEP_SKY_CATALOG.length)
  })

  it('按星等排序由亮到暗', () => {
    const sorted = sortDeepSkyByMagnitude(DEEP_SKY_CATALOG)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].mag).toBeLessThanOrEqual(sorted[i].mag)
    }
  })

  it('visibilityHint 按星等给出口径建议', () => {
    expect(visibilityHint(2)).toBe('肉眼可辨')
    expect(visibilityHint(9)).toContain('较大口径')
  })
})