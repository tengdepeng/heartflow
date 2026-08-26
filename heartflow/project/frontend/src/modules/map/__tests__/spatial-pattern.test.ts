// ============================================================
// 空间格局引擎测试（四象方位 · 纯几何）
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  QUADRANTS,
  centroidOf,
  quadrantOf,
  spatialPatternOverview,
  spatialInsights,
} from '../spatial-pattern'
import type { Place } from '../map'

function place(partial: Partial<Place> & { lng: number; lat: number }): Place {
  return {
    id: `p${partial.lng}_${partial.lat}`,
    name: partial.name ?? '地点',
    city: partial.city ?? '',
    type: 'city',
    note: '',
    visitCount: 1,
    at: '2026-01-01T00:00:00.000Z',
    _expanded: false,
    ...partial,
  }
}

const REF = { lng: 100, lat: 30 }

describe('quadrantOf 方位判定', () => {
  it('东西优先于南北', () => {
    expect(quadrantOf(110, 30, REF)).toBe('east')
    expect(quadrantOf(90, 30, REF)).toBe('west')
  })

  it('南北判定（东西差较小时）', () => {
    expect(quadrantOf(101, 40, REF)).toBe('north')
    expect(quadrantOf(101, 20, REF)).toBe('south')
  })

  it('边界：东西差相等时归东', () => {
    expect(quadrantOf(110, 40, REF)).toBe('east')
  })
})

describe('centroidOf 足迹质心', () => {
  it('无已定位地点返回 null', () => {
    expect(centroidOf([])).toBeNull()
  })

  it('计算已定位地点的经纬度均值', () => {
    const c = centroidOf([place({ lng: 100, lat: 20 }), place({ lng: 110, lat: 40 })])
    expect(c).toEqual({ lng: 105, lat: 30 })
  })

  it('忽略未定位地点', () => {
    const c = centroidOf([
      place({ lng: 100, lat: 20 }),
      { ...place({ lng: 110, lat: 40 }), lng: undefined, lat: undefined } as Place,
    ])
    expect(c).toEqual({ lng: 100, lat: 20 })
  })
})

describe('spatialPatternOverview 空间格局概览', () => {
  it('空数据返回全零', () => {
    const ov = spatialPatternOverview([])
    expect(ov.total).toBe(0)
    expect(ov.dominant).toBeNull()
    expect(ov.coverage).toBe(0)
    expect(ov.emptyQuadrants.length).toBe(4)
  })

  it('按参考点把地点归入四象', () => {
    const places = [
      place({ lng: 110, lat: 30, name: '东点' }), // east
      place({ lng: 90, lat: 30, name: '西点' }), // west
      place({ lng: 101, lat: 40, name: '北点' }), // north
      place({ lng: 101, lat: 20, name: '南点' }), // south
      place({ lng: 120, lat: 30, name: '东点2' }), // east
    ]
    const ov = spatialPatternOverview(places, REF)
    expect(ov.total).toBe(5)
    const east = ov.quadrants.find(q => q.key === 'east')!
    expect(east.count).toBe(2)
    expect(east.places).toContain('东点')
    expect(ov.dominant).toBe('east')
    expect(ov.coverage).toBe(4)
    expect(ov.emptyQuadrants).toEqual([])
  })

  it('识别探索盲区（空象限）', () => {
    const places = [place({ lng: 110, lat: 30 }), place({ lng: 120, lat: 30 })]
    const ov = spatialPatternOverview(places, REF)
    expect(ov.emptyQuadrants).toEqual(expect.arrayContaining(['west', 'north', 'south']))
    expect(ov.coverage).toBe(1)
  })

  it('无参考点时用质心', () => {
    const places = [place({ lng: 100, lat: 30 }), place({ lng: 110, lat: 30 })]
    const ov = spatialPatternOverview(places)
    // 质心 (105, 30)，两地点都在东侧
    expect(ov.dominant).toBe('east')
    expect(ov.total).toBe(2)
  })

  it('计算南北/东西跨度', () => {
    const places = [
      place({ lng: 100, lat: 20 }),
      place({ lng: 110, lat: 40 }),
      place({ lng: 90, lat: 30 }),
    ]
    const ov = spatialPatternOverview(places, REF)
    expect(ov.nsSpread).toBe(20)
    expect(ov.ewSpread).toBe(20)
  })
})

describe('spatialInsights 空间洞察', () => {
  it('空数据返回提示', () => {
    expect(spatialInsights([])).toEqual(['还没有已定位的地点，无法观察空间格局。'])
  })

  it('提示最集中方位', () => {
    const places = [place({ lng: 110, lat: 30 }), place({ lng: 120, lat: 30 })]
    const insights = spatialInsights(places, REF)
    expect(insights.some(s => s.includes('东'))).toBe(true)
  })

  it('提示探索盲区', () => {
    const places = [place({ lng: 110, lat: 30 })]
    const insights = spatialInsights(places, REF)
    expect(insights.some(s => s.includes('盲区'))).toBe(true)
  })

  it('四象全踏足时给出开阔评价', () => {
    const places = [
      place({ lng: 110, lat: 30 }),
      place({ lng: 90, lat: 30 }),
      place({ lng: 101, lat: 40 }),
      place({ lng: 101, lat: 20 }),
    ]
    const insights = spatialInsights(places, REF)
    expect(insights.some(s => s.includes('四个方位'))).toBe(true)
  })

  it('尊重 limit 截断', () => {
    const places = [
      place({ lng: 110, lat: 30 }),
      place({ lng: 90, lat: 30 }),
      place({ lng: 101, lat: 40 }),
      place({ lng: 101, lat: 20 }),
    ]
    expect(spatialInsights(places, REF, 1).length).toBe(1)
  })
})

describe('QUADRANTS 常量', () => {
  it('包含四个方位且键唯一', () => {
    expect(QUADRANTS.length).toBe(4)
    expect(new Set(QUADRANTS.map(q => q.key)).size).toBe(4)
  })
})
