// ============================================================
// 地图室 · 足迹档案引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Place } from './map'
import {
  TRAVEL_TYPES,
  travelOverview,
  typeDistribution,
  topTravelCities,
  exploreMomentum,
  travelInsights,
} from './travel-analytics'

function place(overrides: Partial<Place> = {}): Place {
  return {
    id: 'pl' + Math.random().toString(36).slice(2, 5),
    name: '地点',
    city: '北京',
    type: 'city', // Place.type 是 string
    note: '',
    visitCount: 1,
    at: new Date().toISOString(),
    _expanded: false,
    ...overrides,
  }
}

describe('travelOverview 概览', () => {
  it('空列表概览全为 0', () => {
    const ov = travelOverview([])
    expect(ov.totalPlaces).toBe(0)
    expect(ov.uniqueCities).toBe(0)
    expect(ov.totalVisits).toBe(0)
    expect(ov.returnRate).toBe(0)
    expect(ov.latSpan).toBe(0)
  })

  it('统计城市 / 到访 / 类型 / 回访', () => {
    const places = [
      place({ city: '北京', type: 'city', visitCount: 3 }),
      place({ city: '上海', type: 'city', visitCount: 1 }),
      place({ city: '成都', type: 'nature', visitCount: 1 }),
    ]
    const ov = travelOverview(places)
    expect(ov.uniqueCities).toBe(3)
    expect(ov.totalVisits).toBe(5)
    expect(ov.coveredTypes).toBe(2)
    expect(ov.returnPlaces).toBe(1)
    expect(ov.returnRate).toBe(33)
  })

  it('仅统计已定位地点的地理跨度', () => {
    const places = [
      place({ city: '广州', lng: 113.2, lat: 23.1 }),
      place({ city: '哈尔滨', lng: 126.5, lat: 45.8 }),
      place({ city: '未定位' }), // 无经纬
    ]
    const ov = travelOverview(places)
    expect(ov.locatedCount).toBe(2)
    expect(ov.latSpan).toBe(22.7) // 45.8 - 23.1
    expect(ov.lngSpan).toBe(13.3) // 126.5 - 113.2
  })

  it('earliest / latest 按时间轴取值', () => {
    const places = [
      place({ at: '2024-01-01T00:00:00' }),
      place({ at: '2023-01-01T00:00:00' }),
      place({ at: '2025-01-01T00:00:00' }),
    ]
    const ov = travelOverview(places)
    expect(ov.earliest).toBe('2023-01-01T00:00:00')
    expect(ov.latest).toBe('2025-01-01T00:00:00')
  })
})

describe('typeDistribution 地貌分布', () => {
  it('按地貌统计数量与占比', () => {
    const places = [
      place({ type: 'city' }),
      place({ type: 'city' }),
      place({ type: 'nature' }),
    ]
    const dist = typeDistribution(places)
    const city = dist.find(d => d.type === 'city')!
    const nature = dist.find(d => d.type === 'nature')!
    expect(city.count).toBe(2)
    expect(city.pct).toBe(67)
    expect(nature.count).toBe(1)
    expect(nature.label).toBe('自然')
  })

  it('空列表返回空', () => {
    expect(typeDistribution([])).toEqual([])
  })

  it('提供 5 种默认地貌元数据', () => {
    expect(TRAVEL_TYPES.map(t => t.icon)).toContain('🏔')
    expect(TRAVEL_TYPES.length).toBe(5)
  })
})

describe('topTravelCities 热门城市', () => {
  it('按到访次数降序返回前 N', () => {
    const places = [
      place({ city: '北京', visitCount: 3 }),
      place({ city: '上海', visitCount: 2 }),
      place({ city: '成都', visitCount: 5 }),
      place({ city: '广州', visitCount: 1 }),
    ]
    const top = topTravelCities(places, 2)
    expect(top[0].name).toBe('成都')
    expect(top[0].visits).toBe(5)
    expect(top).toHaveLength(2)
  })
})

describe('exploreMomentum 探索势能', () => {
  it('空列表返回步履未发 0 分', () => {
    const m = exploreMomentum([])
    expect(m.score).toBe(0)
    expect(m.label).toBe('步履未发')
  })

  it('多城市多地貌多到访时分数上升', () => {
    const places = [
      place({ city: '北京', type: 'city', visitCount: 4, lng: 116.4, lat: 39.9 }),
      place({ city: '上海', type: 'city', visitCount: 2, lng: 121.5, lat: 31.2 }),
      place({ city: '拉萨', type: 'nature', visitCount: 1, lng: 91.1, lat: 29.6 }),
      place({ city: '悉尼', type: 'abroad', visitCount: 1, lng: 151.2, lat: -33.9 }),
    ]
    const m = exploreMomentum(places)
    expect(m.score).toBeGreaterThan(40)
  })

  it('分数钳制在 0~100', () => {
    const places = Array.from({ length: 8 }, (_, i) =>
      place({ city: '城' + i, type: 'city', visitCount: 3, lng: 100 + i, lat: 20 + i }))
    const m = exploreMomentum(places)
    expect(m.score).toBeGreaterThanOrEqual(0)
    expect(m.score).toBeLessThanOrEqual(100)
  })
})

describe('travelInsights 温和洞察', () => {
  it('空列表给出引导', () => {
    const insights = travelInsights([])
    expect(insights[0]).toContain('地图还空着')
  })

  it('提示城市数与累计到访', () => {
    const places = [
      place({ city: '北京' }),
      place({ city: '上海' }),
    ]
    const insights = travelInsights(places, 10)
    expect(insights.some(s => s.includes('2 座城市'))).toBe(true)
  })

  it('提示地貌覆盖', () => {
    const places = [place({ type: 'city' }), place({ type: 'nature' })]
    const insights = travelInsights(places, 10)
    expect(insights.some(s => s.includes('地貌'))).toBe(true)
  })

  it('跨度大时提示走得很远', () => {
    const places = [
      place({ lng: 113.2, lat: 23.1 }),
      place({ lng: 126.5, lat: 45.8 }),
    ]
    const insights = travelInsights(places, 10)
    expect(insights.some(s => s.includes('跨度'))).toBe(true)
  })

  it('高频城市时点名最常去', () => {
    const places = [place({ city: '北京', visitCount: 5 }), place({ city: '上海', visitCount: 1 })]
    const insights = travelInsights(places, 10)
    expect(insights.some(s => s.includes('北京') && s.includes('5 次'))).toBe(true)
  })

  it('未定位地点时提示点亮坐标', () => {
    const places = [place({}), place({})] // 无经纬
    const insights = travelInsights(places, 10)
    expect(insights.some(s => s.includes('未点亮'))).toBe(true)
  })
})