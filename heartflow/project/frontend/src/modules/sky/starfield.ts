// ============================================================
// 时间长廊 · 时间星图（P5-3 观星 / AR星座）
// 借鉴「观星/星空漫步」：实时星图、星座识别、时间回溯。
// 内置星座亮星数据库（近似 J2000 赤道坐标），本地离线完成
// 赤道→地平坐标转换与 Az/Alt 投影，守卫宪法第1条（本地计算）。
// 纯函数核心，供 SkyGazePanel 渲染。
// ============================================================

// ------------------------------------------------------------
// 类型
// ------------------------------------------------------------

/** 星座可见的主要季节 */
export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter' | 'all'

/** 亮星 */
export interface BrightStar {
  /** 赤经（小时，0-24） */
  ra: number
  /** 赤纬（度） */
  dec: number
  /** 视星等（越小越亮） */
  mag: number
  /** 名称 */
  name: string
}

/** 星座 */
export interface Constellation {
  id: string
  /** 中文名 */
  name: string
  /** 别名/英文名 */
  alias: string
  /** 图标（emoji） */
  icon: string
  /** 最佳观测季节 */
  season: SeasonKey
  /** 神话/典故简介 */
  myth: string
  stars: BrightStar[]
}

/** 经投影得到的星点 */
export interface ProjectedStar {
  star: BrightStar
  /** 地平高度角（度，>0 在地平线上） */
  altDeg: number
  /** 方位角（度，自北顺时针） */
  azDeg: number
  /** 画布坐标 x */
  x: number
  /** 画布坐标 y */
  y: number
  /** 是否位于地平线上方（可见） */
  visible: boolean
  /** 依据星等的绘制半径（px） */
  size: number
}

/** 某星座的投影结果 */
export interface ProjectedConstellation {
  constellation: Constellation
  stars: ProjectedStar[]
  /** 实际可见星数 */
  visibleCount: number
}

/** 星图配置 */
export interface SkyMapConfig {
  /** 观测纬度（度，北正） */
  latDeg?: number
  /** 观测经度（度，东正） */
  lngDeg?: number
  /** 画布圆心 x */
  cx?: number
  /** 画布圆心 y */
  cy?: number
  /** 画布半径（px） */
  radius?: number
  /** 选定的季节（缺省按当前月份） */
  season?: SeasonKey
}

/** 一次完整星图结果 */
export interface StarMapResult {
  /** 观测地点 */
  latDeg: number
  lngDeg: number
  /** 本地恒星时（度） */
  lstDeg: number
  /** 当前季节 */
  season: SeasonKey
  /** 地平圈内可见星座 */
  constellations: ProjectedConstellation[]
  /** 可见星总计数 */
  visibleStars: number
  /** 每季节星座数 */
  seasonConstellationCount: number
}

// ------------------------------------------------------------
// 星座数据库（近似 J2000 坐标）
// ------------------------------------------------------------

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'ursa-major',
    name: '大熊座',
    alias: 'Ursa Major',
    icon: '🐻',
    season: 'spring',
    myth: '北斗七星——古人喻为「斗」，掌季节更替，天枢始于春分', 
    stars: [
      { ra: 11.05, dec: 61.8, mag: 1.8, name: '天枢' },
      { ra: 11.05, dec: 56.4, mag: 2.4, name: '天璇' },
      { ra: 11.93, dec: 53.7, mag: 2.4, name: '天玑' },
      { ra: 12.27, dec: 57.0, mag: 3.3, name: '天权' },
      { ra: 12.9, dec: 56.0, mag: 1.8, name: '玉衡' },
      { ra: 13.42, dec: 54.9, mag: 2.2, name: '开阳' },
      { ra: 13.78, dec: 49.3, mag: 1.9, name: '摇光' },
    ],
  },
  {
    id: 'leo',
    name: '狮子座',
    alias: 'Leo',
    icon: '🦁',
    season: 'spring',
    myth: '轩辕十四当春夜，帝座之星巡南天',
    stars: [
      { ra: 10.13, dec: 11.9, mag: 1.4, name: '轩辕十四' },
      { ra: 11.82, dec: 14.6, mag: 2.1, name: '五帝座一' },
      { ra: 10.33, dec: 19.8, mag: 2.6, name: '轩辕十二' },
    ],
  },
  {
    id: 'bootes',
    name: '牧夫座',
    alias: 'Boötes',
    icon: '🧑‍🌾',
    season: 'spring',
    myth: '大角星赤火独照，北斗柄指处其光可辨',
    stars: [
      { ra: 14.26, dec: 19.2, mag: -0.05, name: '大角' },
      { ra: 14.9, dec: 27.1, mag: 2.7, name: '梗河一' },
      { ra: 15.12, dec: 40.4, mag: 3.0, name: '七公七' },
    ],
  },
  {
    id: 'lyra',
    name: '天琴座',
    alias: 'Lyra',
    icon: '🎼',
    season: 'summer',
    myth: '织女夜明，七夕鹊桥之所系',
    stars: [
      { ra: 18.62, dec: 38.8, mag: 0.03, name: '织女一' },
      { ra: 18.79, dec: 33.4, mag: 4.1, name: '渐台三' },
      { ra: 18.97, dec: 32.7, mag: 3.5, name: '渐台二' },
    ],
  },
  {
    id: 'cygnus',
    name: '天鹅座',
    alias: 'Cygnus',
    icon: '🦢',
    season: 'summer',
    myth: '天津四映银河，鹊桥横跨其间',
    stars: [
      { ra: 20.68, dec: 45.3, mag: 1.25, name: '天津四' },
      { ra: 20.4, dec: 40.3, mag: 2.2, name: '天津二' },
      { ra: 19.46, dec: 28.0, mag: 3.2, name: '辇道增七' },
    ],
  },
  {
    id: 'scorpius',
    name: '天蝎座',
    alias: 'Scorpius',
    icon: '🦂',
    season: 'summer',
    myth: '七月流火，心宿二赤国家之象',
    stars: [
      { ra: 16.5, dec: -26.4, mag: 0.96, name: '心宿二' },
      { ra: 17.6, dec: -37.1, mag: 1.6, name: '尾宿八' },
      { ra: 17.62, dec: -43.0, mag: 1.9, name: '尾宿五' },
    ],
  },
  {
    id: 'cassiopeia',
    name: '仙后座',
    alias: 'Cassiopeia',
    icon: '👑',
    season: 'autumn',
    myth: 'W 王冠终年可见，秋夜最夺目',
    stars: [
      { ra: 0.71, dec: 56.5, mag: 2.2, name: '王良四' },
      { ra: 0.15, dec: 59.1, mag: 2.3, name: '王良一' },
      { ra: 0.9, dec: 60.7, mag: 2.5, name: '策' },
      { ra: 1.45, dec: 60.2, mag: 2.7, name: '王良二' },
      { ra: 1.9, dec: 63.7, mag: 3.4, name: '王良三' },
    ],
  },
  {
    id: 'pegasus',
    name: '飞马座',
    alias: 'Pegasus',
    icon: '🐴',
    season: 'autumn',
    myth: '「秋季四边形」壁宿之所在',
    stars: [
      { ra: 23.1, dec: 15.2, mag: 2.5, name: '室宿一' },
      { ra: 23.06, dec: 28.1, mag: 2.4, name: '室宿二' },
      { ra: 0.2, dec: 15.2, mag: 2.8, name: '壁宿一' },
      { ra: 21.75, dec: 9.9, mag: 2.4, name: '危宿三' },
    ],
  },
  {
    id: 'andromeda',
    name: '仙女座',
    alias: 'Andromeda',
    icon: '🧜',
    season: 'autumn',
    myth: '仙女的腰带连着飞马，银河彼岸可见',
    stars: [
      { ra: 0.13, dec: 29.1, mag: 2.1, name: '壁宿二' },
      { ra: 1.15, dec: 35.6, mag: 2.1, name: '奎宿九' },
      { ra: 2.1, dec: 42.3, mag: 2.3, name: '天大将军一' },
    ],
  },
  {
    id: 'orion',
    name: '猎户座',
    alias: 'Orion',
    icon: '🏹',
    season: 'winter',
    myth: '三星连珠当冬夜，参宿照神州',
    stars: [
      { ra: 5.92, dec: 7.4, mag: 0.5, name: '参宿四' },
      { ra: 5.2, dec: -8.2, mag: 0.13, name: '参宿七' },
      { ra: 5.42, dec: 6.35, mag: 1.6, name: '参宿五' },
      { ra: 5.68, dec: -9.7, mag: 2.1, name: '参宿六' },
      { ra: 5.55, dec: -0.3, mag: 2.2, name: '参宿三' },
      { ra: 5.6, dec: -1.2, mag: 1.7, name: '参宿二' },
      { ra: 5.68, dec: -1.9, mag: 1.6, name: '参宿一' },
    ],
  },
]

export const SEASONS: Array<{ key: SeasonKey; label: string; icon: string }> = [
  { key: 'spring', label: '春', icon: '🌱' },
  { key: 'summer', label: '夏', icon: '☀️' },
  { key: 'autumn', label: '秋', icon: '🍂' },
  { key: 'winter', label: '冬', icon: '❄️' },
]

/** 根据月份（0-11）推断半球季节（北半球） */
export function seasonAtMonth(month: number): Exclude<SeasonKey, 'all'> {
  const m = ((month % 12) + 12) % 12
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 10) return 'autumn'
  return 'winter'
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

function deg(r: number): number {
  return (r * 180) / Math.PI
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360
}

// ------------------------------------------------------------
// 恒星时与地平坐标
// ------------------------------------------------------------

function jdFromDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

/** 格林尼治恒星时（度，0-360） */
export function gstDegrees(date: Date): number {
  const t = jdFromDate(date) - 2451545.0
  let gst = (280.46061837 + 360.98564736629 * t) % 360
  if (gst < 0) gst += 360
  return gst
}

/** 本地恒星时（度，0-360），经度东正 */
export function lstDegrees(date: Date, lngDeg: number): number {
  return normDeg(gstDegrees(date) + lngDeg)
}

/**
 * 赤道坐标（deg）→ 地平坐标（deg）。
 * lstDeg 为本地恒星时。
 */
export function altAz(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number,
): { altDeg: number; azDeg: number } {
  const lat = rad(latDeg)
  const dec = rad(decDeg)
  const hourAngle = rad(normDeg(lstDeg - raDeg))

  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle)
  const altDeg = deg(Math.asin(clamp(sinAlt, -1, 1)))

  const az = Math.atan2(
    -Math.cos(dec) * Math.sin(hourAngle),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(hourAngle),
  )
  return { altDeg, azDeg: normDeg(deg(az)) }
}

/** 依据视星等给出绘制半径（px），越亮越大 */
export function sizeForMag(mag: number): number {
  const clamped = clamp(mag, -1.5, 4.5)
  const t = (clamped + 1.5) / 6 // 0(亮)~1(暗)
  return 2.6 + (1 - t) * 3.4
}

/**
 * 将地平高度/方位投影到 Az/Alt 极坐标画布。
 * 天顶在圆心，地平圈在边缘。
 */
export function starToCanvas(
  altDeg: number,
  azDeg: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number } {
  const f = clamp((90 - altDeg) / 90, 0, 1)
  const a = rad(azDeg)
  return {
    x: cx + f * radius * Math.sin(a),
    y: cy - f * radius * Math.cos(a),
  }
}

// ------------------------------------------------------------
// 完整星图（组合）
// ------------------------------------------------------------

export function bySeason(
  season: SeasonKey | 'all',
): Constellation[] {
  return CONSTELLATIONS.filter(c => c.season === season)
}

/**
 * 计算某一时刻的星图。
 * 缺省按当前月份确定季节；可用 config.season 固定想观察的季节，
 * 以实现「时间回溯」——四季轮转看同一片天穹。
 */
export function skyMapAt(date: Date, config: SkyMapConfig = {}): StarMapResult {
  const latDeg = config.latDeg ?? 39.9
  const lngDeg = config.lngDeg ?? 116.4
  const cx = config.cx ?? 0
  const cy = config.cy ?? 0
  const radius = Math.max(1, config.radius ?? 100)

  const voyageSeason = config.season ?? seasonAtMonth(date.getMonth())
  const lst = lstDegrees(date, lngDeg)

  const constellations: ProjectedConstellation[] = []
  let visibleStars = 0

  for (const constellation of CONSTELLATIONS) {
    if (constellation.season !== voyageSeason && constellation.season !== 'all') continue

    const stars: ProjectedStar[] = []
    for (const star of constellation.stars) {
      const raDeg = star.ra * 15
      const { altDeg, azDeg } = altAz(raDeg, star.dec, latDeg, lst)
      const { x, y } = starToCanvas(altDeg, azDeg, cx, cy, radius)
      const visible = altDeg > 0
      if (visible) visibleStars++
      stars.push({
        star,
        altDeg,
        azDeg,
        x,
        y,
        visible,
        size: visible ? sizeForMag(star.mag) : 0,
      })
    }

    constellations.push({
      constellation,
      stars,
      visibleCount: stars.filter(s => s.visible).length,
    })
  }

  return {
    latDeg,
    lngDeg,
    lstDeg: lst,
    season: voyageSeason,
    constellations,
    visibleStars,
    seasonConstellationCount: constellations.length,
  }
}

/** 北斗柄指向近似的季节——夏夜斗柄指南（可作文案点缀） */
export function ladlePointSeason(ladleAltDeg: number): string {
  if (ladleAltDeg > 45) return '夏季夜空，斗柄指南'
  if (ladleAltDeg > 0) return '春季夜空，斗柄指东'
  return '地平线下，暂不可见'
}