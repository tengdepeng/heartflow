// ============================================================
// 地图室 · 空间格局引擎（四象方位）
// 借鉴「堪舆山水卫星地图」的方位格局概念，但仅取纯几何结构：
// 以参考点（默认足迹质心）为中心，把去过的地方按相对方位
// 归入东/南/西/北四象，观察探索版图的方向分布与盲区。
// 不引入任何风水迷信，守宪法第1条本地私有（全部本地计算）。
// ============================================================

import type { Place } from './map'

export type QuadrantKey = 'east' | 'south' | 'west' | 'north'

export interface QuadrantMeta {
  key: QuadrantKey
  /** 方位名 */
  label: string
  /** 四象名（仅作方位代称） */
  animal: string
  icon: string
  color: string
}

export const QUADRANTS: QuadrantMeta[] = [
  { key: 'east', label: '东', animal: '青龙', icon: '🟢', color: '#5ab8a0' },
  { key: 'south', label: '南', animal: '朱雀', icon: '🟠', color: '#e07a5f' },
  { key: 'west', label: '西', animal: '白虎', icon: '⚪', color: '#c4956a' },
  { key: 'north', label: '北', animal: '玄武', icon: '🔵', color: '#6b9fc4' },
]

export const QUADRANT_MAP: Record<QuadrantKey, QuadrantMeta> =
  Object.fromEntries(QUADRANTS.map(q => [q.key, q])) as Record<QuadrantKey, QuadrantMeta>

export interface QuadrantStat extends QuadrantMeta {
  count: number
  pct: number
  /** 该方位下的地点名 */
  places: string[]
}

export interface SpatialPatternOverview {
  total: number
  quadrants: QuadrantStat[]
  /** 足迹最集中的方位 */
  dominant: QuadrantKey | null
  /** 尚未踏足的方位（盲区） */
  emptyQuadrants: QuadrantKey[]
  /** 已覆盖方位数 0~4 */
  coverage: number
  nsSpread: number
  ewSpread: number
}

const isLoc = (p: Place) =>
  typeof p.lng === 'number' && isFinite(p.lng) && typeof p.lat === 'number' && isFinite(p.lat)

/** 足迹质心（全部已定位地点的经纬度均值） */
export function centroidOf(places: Place[]): { lng: number; lat: number } | null {
  const located = places.filter(isLoc)
  if (located.length === 0) return null
  const lng = located.reduce((s, p) => s + (p.lng as number), 0) / located.length
  const lat = located.reduce((s, p) => s + (p.lat as number), 0) / located.length
  return { lng, lat }
}

/** 单个地点相对参考点的方位（东西优先于南北） */
export function quadrantOf(lng: number, lat: number, ref: { lng: number; lat: number }): QuadrantKey {
  const dlng = lng - ref.lng
  const dlat = lat - ref.lat
  if (Math.abs(dlng) >= Math.abs(dlat)) return dlng >= 0 ? 'east' : 'west'
  return dlat >= 0 ? 'north' : 'south'
}

export function spatialPatternOverview(
  places: Place[],
  ref?: { lng: number; lat: number },
): SpatialPatternOverview {
  const located = places.filter(isLoc)
  const origin = ref ?? centroidOf(located)

  const stats: QuadrantStat[] = QUADRANTS.map(q => ({
    ...q,
    count: 0,
    pct: 0,
    places: [],
  }))

  if (origin && located.length > 0) {
    for (const p of located) {
      const key = quadrantOf(p.lng as number, p.lat as number, origin)
      const st = stats.find(s => s.key === key)!
      st.count += 1
      st.places.push(p.name || p.city || '未命名')
    }
  }

  const total = located.length
  for (const st of stats) {
    st.pct = total ? Math.round((st.count / total) * 100) : 0
  }

  const sorted = [...stats].sort((a, b) => b.count - a.count)
  const dominant = total > 0 && sorted[0].count > 0 ? sorted[0].key : null
  const emptyQuadrants = stats.filter(s => s.count === 0).map(s => s.key)

  let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity
  located.forEach(p => {
    latMin = Math.min(latMin, p.lat as number)
    latMax = Math.max(latMax, p.lat as number)
    lngMin = Math.min(lngMin, p.lng as number)
    lngMax = Math.max(lngMax, p.lng as number)
  })

  return {
    total,
    quadrants: stats,
    dominant,
    emptyQuadrants,
    coverage: stats.filter(s => s.count > 0).length,
    nsSpread: isFinite(latMax - latMin) ? Math.round((latMax - latMin) * 10) / 10 : 0,
    ewSpread: isFinite(lngMax - lngMin) ? Math.round((lngMax - lngMin) * 10) / 10 : 0,
  }
}

export function spatialInsights(places: Place[], ref?: { lng: number; lat: number }, limit = 4): string[] {
  const insights: string[] = []
  const ov = spatialPatternOverview(places, ref)

  if (ov.total === 0) {
    return ['还没有已定位的地点，无法观察空间格局。']
  }

  if (ov.dominant) {
    const d = QUADRANT_MAP[ov.dominant]
    const st = ov.quadrants.find(q => q.key === ov.dominant)!
    insights.push(`足迹最集中在${d.label}方（${d.animal}位），占 ${st.pct}%。`)
  }

  if (ov.emptyQuadrants.length > 0) {
    const names = ov.emptyQuadrants.map(k => QUADRANT_MAP[k].label).join('、')
    insights.push(`${names}方还是探索盲区，下次远行可以考虑这个方向。`)
  } else if (ov.coverage === 4) {
    insights.push('四个方位都已踏足，你的足迹版图相当开阔。')
  }

  if (ov.nsSpread > 0 || ov.ewSpread > 0) {
    insights.push(`空间跨度约 南北${ov.nsSpread}° × 东西${ov.ewSpread}°，以足迹质心为中心铺开。`)
  }

  const sparse = ov.quadrants.filter(q => q.count === 1)
  if (sparse.length > 0) {
    insights.push(`${sparse.map(q => q.label).join('、')}方各只去过一处，还称不上熟悉。`)
  }

  return insights.slice(0, limit)
}
