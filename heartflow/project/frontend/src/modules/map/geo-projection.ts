// ============================================================
// 地图室 · 地理正射投影（3D 地球球面落点）
// 借鉴元地球Earth：把 经纬度 → 球面坐标 → 2D 画布坐标
// 纯函数、无依赖、无副作用，便于单测与复用
// ============================================================

export interface GeoPoint {
  lng: number
  lat: number
}

export interface ProjectedPoint {
  x: number
  y: number
  /** 归一化深度 0(最近)~1(最远)，用于层级/透明度 */
  z: number
  /** 是否位于可见半球（正面） */
  visible: boolean
}

export interface OrthographicProjection {
  /** 可见中央经度（度）：>0 让该经度面向观察者 */
  centerLng: number
  /** 可见中央纬度（度）：>0 上倾 */
  centerLat: number
  /** 球心在画布上的 x */
  cx: number
  /** 球心在画布上的 y */
  cy: number
  /** 球半径（px） */
  radius: number
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * 全球坐标投影：经度 → 以中央经度为 0 的横向偏移（度）
 */
export function longitudeDelta(lng: number, centerLng: number): number {
  let d = ((lng - centerLng + 540) % 360) - 180
  return d
}

/**
 * 将经纬度正射投影到 2D 画布坐标。
 * 标准正射地图公式：中央(centerLng, centerLat) 面向观察者。
 */
export function projectGeo(
  lng: number,
  lat: number,
  radius: number,
  opts?: Partial<OrthographicProjection>,
): ProjectedPoint {
  const {
    centerLng = 0,
    centerLat = 0,
    cx = 0,
    cy = 0,
  } = opts ?? {}
  const R = Math.max(1, radius)

  const dLon = longitudeDelta(lng, centerLng)
  const phi = toRad(lat)
  const lambda = toRad(dLon)
  const phi0 = toRad(centerLat)

  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosL = Math.cos(lambda)
  const sinL = Math.sin(lambda)

  const x = cx + R * cosPhi * sinL
  const y = cy - R * (Math.cos(phi0) * sinPhi - Math.sin(phi0) * cosPhi * cosL)

  // 朝向观察者的深度：>0 为可见正面
  const front = Math.sin(phi0) * sinPhi + Math.cos(phi0) * cosPhi * cosL
  const visible = front >= 0
  const z = Math.max(0, Math.min(1, (1 - front) / 2))

  return { x, y, z, visible }
}

/** 球面边缘轮廓点（用于描边地球） */
export function sphereOutline(
  cx: number,
  cy: number,
  radius: number,
  steps = 64,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius })
  }
  return pts
}

/** 把所有可见落点按深度升序（近者在前）排序，供绘制层级 */
export function sortByDepth(points: Array<ProjectedPoint & { id: unknown }>): void {
  points.sort((a, b) => a.z - b.z)
}