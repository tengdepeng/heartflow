// ============================================================
// 时间长廊 · 时间星图（starfield）测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  CONSTELLATIONS,
  SEASONS,
  seasonAtMonth,
  lstDegrees,
  gstDegrees,
  altAz,
  sizeForMag,
  starToCanvas,
  bySeason,
  skyMapAt,
  ladlePointSeason,
} from '../starfield'
import type { Constellation, ProjectedStar } from '../starfield'

describe('seasonAtMonth 季节映射', () => {
  it('北半球月份映射', () => {
    expect(seasonAtMonth(2)).toBe('spring') // 3 月
    expect(seasonAtMonth(5)).toBe('summer') // 6 月
    expect(seasonAtMonth(8)).toBe('autumn') // 9 月
    expect(seasonAtMonth(11)).toBe('winter') // 12 月
  })
})

describe('恒星时计算', () => {
  it('本地恒星时 = 格林尼治 + 经度（模 360）', () => {
    const d = new Date(2026, 5, 21, 12, 0, 0)
    const gst = gstDegrees(d)
    expect(gst).toBeGreaterThanOrEqual(0)
    expect(gst).toBeLessThan(360)
    expect(lstDegrees(d, 116.4)).toBeCloseTo(((gst + 116.4) % 360 + 360) % 360, 5)
  })
})

describe('altAz 地平坐标转换', () => {
  it('恒星每恒星日回到同一天顶（经度无关，直射情况）', () => {
    // 在 lst 等于 ra 时刻，位于天顶（赤纬度=观测纬度时）
    const lat = 39.9
    const { altDeg } = altAz(60, 39.9, lat, 60) // ra=lst=60
    expect(altDeg).toBeCloseTo(90, 2)
  })

  it('地平线以下时高度为负（真地平）', () => {
    // ra 与 lst 相差 12h → 在地平下（若不考虑大气）
    const { altDeg } = altAz(60, 0, 39.9, 60 + 180)
    expect(altDeg).toBeLessThan(0)
  })
})

describe('投影与大小', () => {
  it('天顶（alt=90）投影到圆心，地平（alt=0）投影到边缘', () => {
    const z = starToCanvas(90, 0, 100, 100, 80)
    expect(z.x).toBeCloseTo(100)
    expect(z.y).toBeCloseTo(100)
    const h = starToCanvas(0, 0, 100, 100, 80)
    expect(Math.hypot(h.x - 100, h.y - 100)).toBeCloseTo(80, 5)
  })

  it('方位北(0°) 投影在上方（y 较小）', () => {
    const north = starToCanvas(30, 0, 100, 100, 80)
    expect(north.y).toBeLessThan(100)
    const east = starToCanvas(30, 90, 100, 100, 80)
    expect(east.x).toBeGreaterThan(100)
  })

  it('星等越小绘制半径越大', () => {
    expect(sizeForMag(0)).toBeGreaterThan(sizeForMag(3))
  })
})

describe('星座库', () => {
  it('包含基础星座与亮星，id 唯一', () => {
    const ids = new Set<string>()
    for (const c of CONSTELLATIONS) {
      expect(ids.has(c.id)).toBe(false)
      ids.add(c.id)
      expect(c.stars.length).toBeGreaterThan(0)
    }
    expect(SEASONS.length).toBe(4)
  })

  it('季节分类覆盖每个季节', () => {
    for (const s of ['spring', 'summer', 'autumn', 'winter']) {
      expect(bySeason(s as Constellation['season']).length).toBeGreaterThan(0)
    }
  })
})

describe('skyMapAt 完整星图', () => {
  it('返回对应季节的星座与可见星', () => {
    const d = new Date(2026, 5, 21, 22, 0, 0)
    const map = skyMapAt(d, { latDeg: 39.9, lngDeg: 116.4, cx: 120, cy: 120, radius: 100 })
    expect(map.season).toBe('summer')
    expect(map.constellations.length).toBeGreaterThan(0)
    // 夏季至少一个可见星座
    expect(map.constellations.some(c => c.visibleCount > 0)).toBe(true)
  })

  it('指定季节可覆盖当前月份（时间回溯）', () => {
    const d = new Date(2026, 5, 21, 22, 0, 0) // 6 月
    const winter = skyMapAt(d, { season: 'winter' })
    expect(winter.season).toBe('winter')
    expect(winter.constellations.every(c => c.constellation.season === 'winter')).toBe(true)
  })

  it('可见星坐标落在画布半径范围内', () => {
    const map = skyMapAt(new Date(2026, 5, 21, 22, 0, 0), { cx: 100, cy: 100, radius: 90 })
    for (const c of map.constellations) {
      for (const s of c.stars as ProjectedStar[]) {
        if (!s.visible) continue
        const dist = Math.hypot(s.x - 100, s.y - 100)
        expect(dist).toBeLessThanOrEqual(90 + 1e-6)
      }
    }
  })

  it('不可见星（地平线以下）被标记', () => {
    const map = skyMapAt(new Date(2026, 0, 15, 3, 0, 0), { latDeg: 39.9, lngDeg: 116.4 })
    for (const c of map.constellations) {
      for (const s of c.stars as ProjectedStar[]) {
        if (!s.visible) expect(s.altDeg).toBeLessThanOrEqual(0)
      }
    }
  })
})

describe('ladlePointSeason 文案', () => {
  it('按北斗指向推断季节文案', () => {
    expect(ladlePointSeason(60)).toContain('夏')
    expect(ladlePointSeason(30)).toContain('春')
    expect(ladlePointSeason(-10)).toContain('不可见')
  })
})