// ============================================================
// 时间长廊 · 行星星历（P5-11 天文大师）
// 借鉴「天文大师/星空漫步」：行星位置、视位置与可见高度。
// 采用 Meeus《Astronomical Algorithms》低精度平均轨道根数
// （J2000 历元 + 每世纪变化率，约 1800–2050 有效），本地离线
// 求解开普勒方程并投影到地平坐标，守宪法第1条（本地计算）。
// ============================================================

import { lstDegrees, altAz } from './starfield'

export interface PlanetElementSet {
  a0: number
  aDot: number
  e0: number
  eDot: number
  i0: number
  iDot: number
  L0: number
  LDot: number
  p0: number
  pDot: number
  N0: number
  NDot: number
}

// 平均轨道根数（度/角单位；角度已按度）
const PLANET_ELEMENTS: Record<PlanetId, PlanetElementSet> = {
  mercury: {
    a0: 0.38709927, aDot: 0.00000037, e0: 0.20563593, eDot: 0.00001906,
    i0: 7.00497902, iDot: -0.00594749, L0: 252.2503235, LDot: 149472.67411175,
    p0: 77.45779628, pDot: 0.16047689, N0: 48.33076593, NDot: -0.12534081,
  },
  venus: {
    a0: 0.72333566, aDot: 0.0000039, e0: 0.00677672, eDot: -0.00004107,
    i0: 3.39467605, iDot: -0.0007889, L0: 181.9790995, LDot: 58517.81538729,
    p0: 131.60246718, pDot: 0.00268329, N0: 76.67984255, NDot: -0.27769418,
  },
  earth: {
    a0: 1.00000261, aDot: 0.00000562, e0: 0.01671123, eDot: -0.00004392,
    i0: -0.00001531, iDot: -0.01294668, L0: 100.46457166, LDot: 35999.37244981,
    p0: 102.93768193, pDot: 0.32327364, N0: 0, NDot: 0,
  },
  mars: {
    a0: 1.52371034, aDot: 0.00001847, e0: 0.0933941, eDot: 0.00007882,
    i0: 1.84969142, iDot: -0.00813131, L0: -4.55343205, LDot: 19140.30268499,
    p0: -23.94362959, pDot: 0.44441088, N0: 49.55953891, NDot: -0.29257343,
  },
  jupiter: {
    a0: 5.202887, aDot: -0.00011607, e0: 0.04838624, eDot: -0.00013253,
    i0: 1.30439695, iDot: -0.00183714, L0: 34.39644051, LDot: 3034.74612775,
    p0: 14.72847983, pDot: 0.21252668, N0: 100.47390909, NDot: 0.20469106,
  },
  saturn: {
    a0: 9.53667594, aDot: -0.0012506, e0: 0.05386179, eDot: -0.00050991,
    i0: 2.48599187, iDot: 0.00193609, L0: 49.95424423, LDot: 1222.49362201,
    p0: 92.59887831, pDot: -0.41897216, N0: 113.66242448, NDot: -0.28867794,
  },
  uranus: {
    a0: 19.18916464, aDot: -0.00196176, e0: 0.04725744, eDot: -0.00004397,
    i0: 0.77263783, iDot: -0.00242939, L0: 313.23810451, LDot: 428.48202785,
    p0: 170.9542763, pDot: 0.40805281, N0: 74.01692512, NDot: 0.04240589,
  },
  neptune: {
    a0: 30.06992276, aDot: 0.00026291, e0: 0.00859048, eDot: 0.00005105,
    i0: 1.77004347, iDot: 0.00035372, L0: -55.12002969, LDot: 218.45945325,
    p0: 44.96476227, pDot: -0.32241464, N0: 131.78422574, NDot: -0.00508664,
  },
}

export const PLANET_META: Record<Exclude<PlanetId, 'earth'>, { label: string; icon: string; note: string }> = {
  mercury: { label: '水星', icon: '☿', note: '近日而速，晨昏可见' },
  venus: { label: '金星', icon: '♀', note: '夜空中最亮的星' },
  mars: { label: '火星', icon: '♂', note: '赤色星，似近而远' },
  jupiter: { label: '木星', icon: '♃', note: '气态巨行星之王' },
  saturn: { label: '土星', icon: '♄', note: '光环环绕的星' },
  uranus: { label: '天王星', icon: '⛢', note: '冰巨星，肉眼界点' },
  neptune: { label: '海王星', icon: '♆', note: '最远的蓝绿巨行星' },
}

export type PlanetId = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'

/** 可见裸眼行星（不含地球） */
export const NAKED_EYE_PLANETS: Exclude<PlanetId, 'earth'>[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn']

export interface PlanetPosition {
  id: Exclude<PlanetId, 'earth'>
  label: string
  icon: string
  /** 合相机理用：地心黄经（度） */
  eclLonDeg: number
  /** 地心黄纬（度） */
  eclLatDeg: number
  /** 赤经（度） */
  raDeg: number
  /** 赤纬（度） */
  decDeg: number
  /** 地平高度角（度） */
  altDeg: number
  /** 方位角（度） */
  azDeg: number
  /** 地平上线与否 */
  aboveHorizon: boolean
  /** 视星等（近似） */
  mag: number
  /** 与太阳的角距（度），用于晨昏判定 */
  elongationDeg: number
}

// ------------------------------------------------------------
// 基础工具
// ------------------------------------------------------------

function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

function deg(r: number): number {
  return (r * 180) / Math.PI
}

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360
}

function jdFromDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** 黄赤交角 ε（度） */
export function obliquity(T: number): number {
  return (23.43929111 - 0.0130042 * T) / 1.0
}

const OBL_EPS = 1e-9

/** 由地心黄经/黄纬 → 赤经/赤纬（度） */
export function eqlToEquatorial(eclLonDeg: number, eclLatDeg: number, T: number): { raDeg: number; decDeg: number } {
  const eps = rad(obliquity(T))
  const lon = rad(eclLonDeg)
  const lat = rad(eclLatDeg)
  // 球坐标转换：先转单位向量再转回
  const cl = Math.cos(lon)
  const sl = Math.sin(lon)
  const cb = Math.cos(lat)
  const sb = Math.sin(lat)
  const x = cb * cl
  const y = cb * sl
  const z = sb
  const y2 = y * Math.cos(eps) - z * Math.sin(eps)
  const z2 = y * Math.sin(eps) + z * Math.cos(eps)
  const ra = Math.atan2(y2, x)
  const decv = Math.asin(clamp(z2, -1 + OBL_EPS, 1 - OBL_EPS))
  return { raDeg: normDeg(deg(ra)), decDeg: deg(decv) }
}

/** 求解开普勒方程 E - e·sinE = M */
function solveKepler(M: number, e: number): number {
  let E = M
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-8) break
  }
  return E
}

interface HelioVec {
  x: number
  y: number
  z: number
  r: number
  lonDeg: number
}

/** 某行星的日心黄道坐标（球面近似） */
function heliocentric(elem: PlanetElementSet, T: number): HelioVec {
  const a = elem.a0 + elem.aDot * T
  const e = elem.e0 + elem.eDot * T
  const i = elem.i0 + elem.iDot * T
  const L = normDeg(elem.L0 + elem.LDot * T)
  const p = normDeg(elem.p0 + elem.pDot * T)
  const N = normDeg(elem.N0 + elem.NDot * T)

  const M = normDeg(L - p)
  const omega = normDeg(p - N) // 近点辐角
  const E = solveKepler(rad(M), e)
  const sinE = Math.sin(E)
  const cosE = Math.cos(E)

  const xv = a * (cosE - e)
  const yv = a * Math.sqrt(1 - e * e) * sinE
  const v = deg(Math.atan2(yv, xv)) // 真近点角
  const r = a * (1 - e * cosE)
  const u = rad(v + omega)
  const on = rad(N)
  const inc = rad(i)

  const x = r * (Math.cos(on) * Math.cos(u) - Math.sin(on) * Math.sin(u) * Math.cos(inc))
  const y = r * (Math.sin(on) * Math.cos(u) + Math.cos(on) * Math.sin(u) * Math.cos(inc))
  const z = r * (Math.sin(u) * Math.sin(inc))

  return { x, y, z, r, lonDeg: normDeg(deg(Math.atan2(y, x))) }
}

/** 地心黄道坐标（某行星相对地球） */
function geocentricEcliptic(body: Exclude<PlanetId, 'earth'>, T: number): { lonDeg: number; latDeg: number; dist: number } {
  const planet = heliocentric(PLANET_ELEMENTS[body], T)
  const earth = heliocentric(PLANET_ELEMENTS.earth, T)
  const dx = planet.x - earth.x
  const dy = planet.y - earth.y
  const dz = planet.z - earth.z
  const rho = Math.hypot(dx, dy)
  return {
    lonDeg: normDeg(deg(Math.atan2(dy, dx))),
    latDeg: deg(Math.atan2(dz, rho)),
    dist: Math.hypot(dx, dy, dz),
  }
}

/** 行星与太阳的角距（度）：由地心几何余弦求相位与伸长度 */
function sunAcute(geo: { dist: number }, earthR: number, planetR: number): number {
  // 余弦定理：cos(相位角)= (r² + R² - Re²)/(2 r R)
  const cosPhase = clamp((planetR * planetR + geo.dist * geo.dist - earthR * earthR) / (2 * planetR * geo.dist), -1, 1)
  return deg(Math.acos(cosPhase))
}

/** 视星等（Schlyter 近似公式） */
function apparentMagnitude(
  body: Exclude<PlanetId, 'earth'>,
  planetR: number,
  geoDist: number,
  phaseDeg: number,
): number {
  const a = phaseDeg
  const lr = 5 * Math.log10(planetR * geoDist)
  switch (body) {
    case 'mercury':
      return -0.42 + lr + 0.038 * a - 0.000273 * a * a + 0.000002 * a * a * a
    case 'venus':
      return -4.4 + lr + 0.0009 * a + 0.000239 * a * a - 0.00000065 * a * a * a
    case 'mars':
      return -1.52 + lr + 0.016 * a
    case 'jupiter':
      return -9.4 + lr + 0.005 * a
    case 'saturn':
      return -8.88 + lr + 0.044 * a - 0.0008 * a * a
    default:
      return 0
  }
}

/**
 * 计算一时刻全部裸眼行星的地平位置。
 * config.latDeg/lngDeg 为观测地；缺省北京。
 */
export function planetsAt(date: Date, config: { latDeg?: number; lngDeg?: number } = {}): PlanetPosition[] {
  const latDeg = config.latDeg ?? 39.9
  const lngDeg = config.lngDeg ?? 116.4
  const jd = jdFromDate(date)
  const T = (jd - 2451545.0) / 36525
  const lst = lstDegrees(date, lngDeg)

  const earth = heliocentric(PLANET_ELEMENTS.earth, T)
  const earthR = earth.r

  const out: PlanetPosition[] = []
  for (const pid of NAKED_EYE_PLANETS) {
    const geo = geocentricEcliptic(pid, T)
    const planetR = heliocentric(PLANET_ELEMENTS[pid], T).r
    const phaseDeg = sunAcute(geo, earthR, planetR)
    const eq = eqlToEquatorial(geo.lonDeg, geo.latDeg, T)
    const { altDeg, azDeg } = altAz(eq.raDeg, eq.decDeg, latDeg, lst)
    const { elongation } = elongationOf(geo.lonDeg, normDeg(earth.lonDeg + 180))
    out.push({
      id: pid,
      label: PLANET_META[pid].label,
      icon: PLANET_META[pid].icon,
      eclLonDeg: geo.lonDeg,
      eclLatDeg: geo.latDeg,
      raDeg: eq.raDeg,
      decDeg: eq.decDeg,
      altDeg,
      azDeg,
      aboveHorizon: altDeg > 0,
      mag: apparentMagnitude(pid, planetR, geo.dist, phaseDeg),
      elongationDeg: elongation,
    })
  }
  return out
}

/** 相对太阳的伸长度（度）与晨昏分类 */
function elongationOf(planetLon: number, sunLon: number): { elongation: number; region: 'west' | 'east' } {
  const d = normDeg(planetLon - sunLon)
  const elongation = d < 180 ? d : 360 - d
  return { elongation, region: d < 180 ? 'east' : 'west' }
}

/** 依据亮星视差排序的可见行星（按高度从高到低，取地平线上） */
export function visiblePlanets(date: Date, config: { latDeg?: number; lngDeg?: number } = {}): PlanetPosition[] {
  return planetsAt(date, config)
    .filter(p => p.aboveHorizon)
    .sort((a, b) => b.altDeg - a.altDeg)
}