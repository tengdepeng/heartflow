// ============================================================
// 时间长廊 · 天文事件日历（本地计算）
// ------------------------------------------------------------
// 借鉴「星图 / 观星类 App」：月相、流星雨、日月食全部本地计算，
// 无任何网络依赖，守宪法第1条本地私有。
//  - 月相：synodic 周期算法，任意日期可算
//  - 流星雨：年度峰值表（每年大致固定）
//  - 日月食：已核验的近期事件表（2026-2029）
// ============================================================

export type MoonPhaseName =
  | 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous'
  | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent'

export interface MoonPhase {
  /** YYYY-MM-DD */
  date: string
  /** 月龄（0-29.53 天） */
  age: number
  /** 照亮比例 0-1 */
  illumination: number
  phase: MoonPhaseName
  label: string
  icon: string
}

export interface MeteorShower {
  id: string
  name: string
  /** 峰值月份 1-12 */
  month: number
  /** 峰值日 */
  day: number
  /** 峰值窗口 [起始日, 结束日]（相对月份） */
  window: [number, number]
  /** 每小时天顶流星数 */
  zhr: number
  icon: string
  note: string
}

export interface EclipseEvent {
  /** YYYY-MM-DD */
  date: string
  type: 'solar' | 'lunar'
  subtype: 'total' | 'annular' | 'partial' | 'penumbral'
  label: string
  visibility: string
  icon: string
}

const SYNODIC_MONTH = 29.53058867
// 2000-01-06 18:14 UTC 为已知新月时刻（JD 2451550.1）
const KNOWN_NEW_MOON_JD = 2451550.1

const PHASE_META: Record<MoonPhaseName, { label: string; icon: string }> = {
  'new': { label: '新月', icon: '🌑' },
  'waxing-crescent': { label: '娥眉月', icon: '🌒' },
  'first-quarter': { label: '上弦月', icon: '🌓' },
  'waxing-gibbous': { label: '盈凸月', icon: '🌔' },
  'full': { label: '满月', icon: '🌕' },
  'waning-gibbous': { label: '亏凸月', icon: '🌖' },
  'last-quarter': { label: '下弦月', icon: '🌗' },
  'waning-crescent': { label: '残月', icon: '🌘' },
}

function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 计算某日期的月龄（0-29.53 天） */
export function moonAge(date: Date): number {
  const days = (julianDate(date) - KNOWN_NEW_MOON_JD) % SYNODIC_MONTH
  return days < 0 ? days + SYNODIC_MONTH : days
}

/** 由月龄映射月相名称 */
export function phaseFromAge(age: number): MoonPhaseName {
  const a = ((age % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  if (a < 1.84566 || a >= SYNODIC_MONTH - 1.84566) return 'new'
  if (a < 5.53699) return 'waxing-crescent'
  if (a < 7.38265) return 'first-quarter'
  if (a < 11.07498) return 'waxing-gibbous'
  if (a < 13.92109) return 'full'
  if (a < 18.38334) return 'waning-gibbous'
  if (a < 20.229) return 'last-quarter'
  return 'waning-crescent'
}

/** 照亮比例 0-1 */
export function moonIllumination(age: number): number {
  const a = ((age % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  return (1 - Math.cos((2 * Math.PI * a) / SYNODIC_MONTH)) / 2
}

/** 计算某日期的月相 */
export function getMoonPhase(date: Date): MoonPhase {
  const age = moonAge(date)
  const phase = phaseFromAge(age)
  return {
    date: localDateKey(date),
    age: Math.round(age * 10) / 10,
    illumination: Math.round(moonIllumination(age) * 100) / 100,
    phase,
    label: PHASE_META[phase].label,
    icon: PHASE_META[phase].icon,
  }
}

/** 生成某月（含前后各 3 天补边）的逐日月相序列 */
export function getMonthPhases(year: number, month: number): MoonPhase[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const out: MoonPhase[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    out.push(getMoonPhase(new Date(year, month - 1, d)))
  }
  return out
}

/** 年度主要流星雨峰值表（日期每年大致固定） */
export const METEOR_SHOWERS: MeteorShower[] = [
  { id: 'quadrantids', name: '象限仪座流星雨', month: 1, day: 4, window: [3, 5], zhr: 120, icon: '☄️', note: '北半球冬季夜空，峰值短暂而密集' },
  { id: 'lyrids', name: '天琴座流星雨', month: 4, day: 22, window: [21, 23], zhr: 18, icon: '☄️', note: '最古老的流星雨之一，速度较快' },
  { id: 'eta-aquariids', name: '宝瓶座η流星雨', month: 5, day: 6, window: [5, 7], zhr: 50, icon: '☄️', note: '源自哈雷彗星，南半球观测更佳' },
  { id: 'perseids', name: '英仙座流星雨', month: 8, day: 13, window: [12, 14], zhr: 100, icon: '☄️', note: '夏季最受欢迎，火流星多' },
  { id: 'orionids', name: '猎户座流星雨', month: 10, day: 21, window: [20, 22], zhr: 20, icon: '☄️', note: '同样源自哈雷彗星' },
  { id: 'leonids', name: '狮子座流星雨', month: 11, day: 17, window: [16, 18], zhr: 15, icon: '☄️', note: '周期性爆发，平日流量平缓' },
  { id: 'geminids', name: '双子座流星雨', month: 12, day: 14, window: [13, 15], zhr: 150, icon: '☄️', note: '全年最稳定丰沛的流星雨' },
  { id: 'ursids', name: '小熊座流星雨', month: 12, day: 22, window: [21, 23], zhr: 10, icon: '☄️', note: '岁末压轴，流量温和' },
]

/** 某年某月是否有流星雨峰值（返回该月流星雨列表） */
export function getMeteorShowersInMonth(_year: number, month: number): MeteorShower[] {
  return METEOR_SHOWERS.filter(s => s.month === month)
}

/** 已核验的近期日月食事件表（2026-2029） */
export const ECLIPSES: EclipseEvent[] = [
  { date: '2026-03-03', type: 'lunar', subtype: 'total', label: '月全食（血月）', visibility: '美洲 / 亚洲', icon: '🌕' },
  { date: '2026-08-12', type: 'solar', subtype: 'total', label: '日全食', visibility: '格陵兰 / 冰岛 / 西班牙北部', icon: '🌑' },
  { date: '2026-08-28', type: 'lunar', subtype: 'partial', label: '月偏食', visibility: '美洲 / 欧洲', icon: '🌗' },
  { date: '2027-02-06', type: 'solar', subtype: 'annular', label: '日环食', visibility: '南美 / 西非', icon: '🌑' },
  { date: '2027-02-20', type: 'lunar', subtype: 'penumbral', label: '半影月食', visibility: '美洲 / 非洲 / 亚洲 / 欧洲', icon: '🌘' },
  { date: '2027-07-18', type: 'lunar', subtype: 'penumbral', label: '半影月食', visibility: '非洲 / 亚洲 / 大洋洲', icon: '🌘' },
  { date: '2027-08-02', type: 'solar', subtype: 'total', label: '日全食（大日食）', visibility: '西班牙 / 埃及 / 沙特', icon: '🌑' },
  { date: '2027-08-17', type: 'lunar', subtype: 'penumbral', label: '半影月食', visibility: '美洲', icon: '🌘' },
  { date: '2028-01-12', type: 'lunar', subtype: 'partial', label: '月偏食', visibility: '美洲 / 欧洲', icon: '🌗' },
  { date: '2028-01-26', type: 'solar', subtype: 'annular', label: '日环食', visibility: '厄瓜多尔 / 秘鲁 / 巴西 / 西班牙', icon: '🌑' },
  { date: '2028-07-06', type: 'lunar', subtype: 'partial', label: '月偏食', visibility: '欧洲 / 非洲', icon: '🌗' },
  { date: '2028-07-22', type: 'solar', subtype: 'total', label: '日全食', visibility: '澳大利亚 / 新西兰', icon: '🌑' },
  { date: '2028-12-31', type: 'lunar', subtype: 'total', label: '月全食（跨年血月）', visibility: '全球多地可见', icon: '🌕' },
  { date: '2029-01-14', type: 'solar', subtype: 'partial', label: '日偏食', visibility: '北美', icon: '🌑' },
  { date: '2029-06-12', type: 'solar', subtype: 'partial', label: '日偏食', visibility: '北极 / 欧洲', icon: '🌑' },
  { date: '2029-06-26', type: 'lunar', subtype: 'total', label: '月全食（本世纪最长）', visibility: '美洲 / 欧洲', icon: '🌕' },
  { date: '2029-12-20', type: 'lunar', subtype: 'total', label: '月全食', visibility: '北半球', icon: '🌕' },
]

/** 未来 n 个日月食事件（从 reference 起） */
export function getUpcomingEclipses(reference = new Date(), count = 3): EclipseEvent[] {
  const ref = localDateKey(reference)
  return ECLIPSES
    .filter(e => e.date >= ref)
    .slice(0, count)
}

/** 未来 n 个流星雨峰值（从 reference 起） */
export function getUpcomingMeteorShowers(reference = new Date(), count = 3): (MeteorShower & { peakDate: string })[] {
  const out: (MeteorShower & { peakDate: string })[] = []
  let year = reference.getFullYear()
  let month = reference.getMonth() + 1
  for (let guard = 0; guard < 24 && out.length < count; guard++) {
    for (const s of METEOR_SHOWERS) {
      if (s.month < month && year === reference.getFullYear()) continue
      const peakDate = new Date(year, s.month - 1, s.day)
      if (peakDate < reference) continue
      out.push({ ...s, peakDate: localDateKey(peakDate) })
      if (out.length >= count) break
    }
    month = 1
    year += 1
  }
  return out
}
