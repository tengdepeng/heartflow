// ============================================================
// 地图室 · 足迹档案引擎（探索气象）
// 借鉴「元地球 / 卫星云图 / 堪舆山水地图」的版图触及概念，
// 把去过的地方汇聚为一张「足迹版图」——走了多远、踏过哪、
// 哪里值得再去。全部本地计算，无任何外部瓦片 / SDK / 请求。
// 守宪法第1条本地私有。
// ============================================================

import type { Place } from './map'

export interface TravelTypeMeta {
  type: Place['type']
  label: string
  icon: string
  color: string
}

export const TRAVEL_TYPES: TravelTypeMeta[] = [
  { type: 'city', label: '城市', icon: '🏙', color: '#6b9fc4' },
  { type: 'nature', label: '自然', icon: '🏔', color: '#5ab8a0' },
  { type: 'coast', label: '海岸', icon: '🏖', color: '#3fa3b8' },
  { type: 'cultural', label: '人文', icon: '🏛', color: '#d4a574' },
  { type: 'abroad', label: '境外', icon: '✈', color: '#a07c8c' },
]

export const TRAVEL_TYPE_MAP: Record<Place['type'], TravelTypeMeta> =
  Object.fromEntries(TRAVEL_TYPES.map(t => [t.type, t])) as Record<Place['type'], TravelTypeMeta>

// ---- 概览 ----

export interface TravelOverview {
  totalPlaces: number
  uniqueCities: number
  totalVisits: number
  locatedCount: number
  coveredTypes: number
  returnPlaces: number
  returnRate: number // %
  latSpan: number
  lngSpan: number
  earliest: string | null
  latest: string | null
}

const isLoc = (p: Place) => typeof p.lng === 'number' && isFinite(p.lng) && typeof p.lat === 'number' && isFinite(p.lat)

export function travelOverview(places: Place[]): TravelOverview {
  const uniqueCities = new Set(places.map(p => p.city || p.name).filter(Boolean))
  const totalVisits = places.reduce((s, p) => s + (p.visitCount || 1), 0)
  const located = places.filter(isLoc)
  const coveredTypes = new Set(places.map(p => p.type)).size
  const returnPlaces = places.filter(p => (p.visitCount || 1) > 1).length

  let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity
  located.forEach(p => {
    latMin = Math.min(latMin, p.lat as number)
    latMax = Math.max(latMax, p.lat as number)
    lngMin = Math.min(lngMin, p.lng as number)
    lngMax = Math.max(lngMax, p.lng as number)
  })

  const sorted = [...places].sort((a, b) => a.at.localeCompare(b.at))

  return {
    totalPlaces: places.length,
    uniqueCities: uniqueCities.size,
    totalVisits,
    locatedCount: located.length,
    coveredTypes,
    returnPlaces,
    returnRate: places.length ? Math.round((returnPlaces / places.length) * 100) : 0,
    latSpan: isFinite(latMax - latMin) ? Math.round((latMax - latMin) * 10) / 10 : 0,
    lngSpan: isFinite(lngMax - lngMin) ? Math.round((lngMax - lngMin) * 10) / 10 : 0,
    earliest: sorted[0]?.at ?? null,
    latest: sorted[sorted.length - 1]?.at ?? null,
  }
}

// ---- 地貌分布 ----

export interface TravelTypeRow {
  type: Place['type']
  label: string
  icon: string
  color: string
  count: number
  pct: number
}

export function typeDistribution(places: Place[]): TravelTypeRow[] {
  const total = places.length || 1
  return TRAVEL_TYPES.map((meta) => {
    const count = places.filter(p => p.type === meta.type).length
    return { ...meta, count, pct: Math.round((count / total) * 100) }
  }).filter(r => r.count > 0)
}

// ---- 热门城市 ----

export interface CityRow {
  name: string
  visits: number
  latest: string
}

export function topTravelCities(places: Place[], limit = 5): CityRow[] {
  const map = new Map<string, { visits: number; latest: string }>()
  places.forEach(p => {
    const key = p.city || p.name
    if (!key) return
    const prev = map.get(key)
    const visits = (prev?.visits || 0) + (p.visitCount || 1)
    const latest = !prev || p.at > prev.latest ? p.at : prev.latest
    map.set(key, { visits, latest })
  })
  return [...map.entries()]
    .sort((a, b) => b[1].visits - a[1].visits)
    .slice(0, limit)
    .map(([name, v]) => ({ name, visits: v.visits, latest: v.latest }))
}

// ---- 探索势能 ----

export interface ExploreMomentum {
  /** 0~100 探索势能 */
  score: number
  label: string
  color: string
}

export function exploreMomentum(places: Place[]): ExploreMomentum {
  if (places.length === 0) {
    return { score: 0, label: '步履未发', color: '#6b7280' }
  }

  const ov = travelOverview(places)

  // 广度 40%：城市分布度 + 地貌类型覆盖
  let breadthComponent = 0
  if (ov.totalPlaces) {
    const solo = ov.uniqueCities / Math.max(ov.uniqueCities, 4)
    const typeBreadth = ov.coveredTypes / TRAVEL_TYPES.length
    breadthComponent = 40 * (solo * 0.6 + typeBreadth * 0.4)
  }

  // 深度 30%：重复到访（回访说明真的踏入过）
  const depthComponent = 30 * Math.min(ov.totalVisits, 20) / 20

  // 跨度 30%：经纬度走得远
  const spanComponent = 30 * Math.min(1, ov.latSpan / 60 + ov.lngSpan / 120)

  let score = Math.round(breadthComponent + depthComponent + spanComponent)
  score = Math.max(0, Math.min(100, score))

  let label: string
  let color: string
  if (score >= 75) { label = '纵横千里'; color = '#34d399' }
  else if (score >= 55) { label = '足迹昌然'; color = '#5ab8a0' }
  else if (score >= 35) { label = '渐行渐远'; color = '#6b9fc4' }
  else if (score >= 15) { label = '初踏新途'; color = '#d4a574' }
  else { label = '浅尝辄止'; color = '#a07c8c' }

  return { score, label, color }
}

// ---- 温和洞察 ----

export function travelInsights(places: Place[], limit = 4): string[] {
  const insights: string[] = []
  const ov = travelOverview(places)

  if (places.length === 0) {
    return ['地图还空着，从记录第一个到达的地方开始吧。']
  }

  if (ov.uniqueCities > 0) {
    insights.push(`你已在 ${ov.uniqueCities} 座城市留下足迹，累计到访 ${ov.totalVisits} 次。`)
  }

  const types = typeDistribution(places)
  if (types.length > 0) {
    insights.push(`踏过 ${types.length} 种地貌：${types.map(t => `${t.icon}${t.label}`).join('、')}。`)
  }

  if (ov.latSpan >= 10 || ov.lngSpan >= 20) {
    insights.push(`足迹从地图上看跨度约 纬度${ov.latSpan}° × 经度${ov.lngSpan}°，已经走得很远。`)
  }

  const top = topTravelCities(places, 1)[0]
  if (top && top.visits > 1) {
    insights.push(`「${top.name}」是你去得最多的地方，前后去了 ${top.visits} 次。`)
  }

  const unresturned = places.filter(p => (p.visitCount || 1) <= 1)
  if (unresturned.length === places.length && places.length > 0) {
    insights.push('很多地方还只去过一次，值得再回去停一停。')
  }

  const unlLocated = places.length - ov.locatedCount
  if (unlLocated > 0) {
    insights.push(`还有 ${unlLocated} 个地点未点亮坐标，补上经纬就能在星图上落点。`)
  }

  return insights.slice(0, limit)
}