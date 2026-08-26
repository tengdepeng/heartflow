// ============================================================
// 时间长廊 · 深空天体数据库（P5-10 星空漫步/天文大师）
// 借鉴「星空漫步/天文通」：深空目标（星云/星系/星团）数据库。
// 内置精选 Messier 天体（近似 J2000 赤道坐标），本地离线查询，
// 供观测计划生成器与深空面板使用，守宪法第1条（本地私有）。
// ============================================================

export type DeepSkyType =
  | 'galaxy'
  | 'nebula'
  | 'open-cluster'
  | 'globular-cluster'
  | 'planetary-nebula'

export interface DeepSkyObject {
  /** Messenger/通用编号，如 M31 */
  id: string
  /** 中文名 */
  name: string
  /** 中文别名 */
  alias: string
  type: DeepSkyType
  /** 所在星座（中文，与观星星图星座名对齐） */
  constellation: string
  /** 赤经（小时，0-24） */
  ra: number
  /** 赤纬（度） */
  dec: number
  /** 视星等（越小越亮） */
  mag: number
  /** 角大小（角分，近似） */
  sizeArcMin: number
  /** 一句话简介 */
  note: string
}

export const TYPE_META: Record<DeepSkyType, { label: string; icon: string; desc: string }> = {
  galaxy: { label: '星系', icon: '🌀', desc: '星之岛屿，远在百万光年之外' },
  nebula: { label: '星云', icon: '🌫️', desc: '星际尘埃与气体的发光海洋' },
  'open-cluster': { label: '疏散星团', icon: '✨', desc: '年轻的恒星群落，散布银河' },
  'globular-cluster': { label: '球状星团', icon: '🔮', desc: '老年恒星的密集球群' },
  'planetary-nebula': { label: '行星状星云', icon: '💠', desc: '恒星残骸孕育的精致光环' },
}

/** 精选 Messier 深空天体库（近似 J2000） */
export const DEEP_SKY_CATALOG: DeepSkyObject[] = [
  // ---- 星系 ----
  { id: 'M31', name: '仙女座大星系', alias: 'Andromeda Galaxy', type: 'galaxy', constellation: '仙女座', ra: 0.71, dec: 41.27, mag: 3.4, sizeArcMin: 190, note: '肉眼可见的最远天体，银河的邻居' },
  { id: 'M33', name: '三角座星系', alias: 'Triangulum Galaxy', type: 'galaxy', constellation: '三角座', ra: 1.55, dec: 30.66, mag: 5.7, sizeArcMin: 70, note: '本星系群第三大星系' },
  { id: 'M81', name: '波德星系', alias: 'Bode\'s Galaxy', type: 'galaxy', constellation: '大熊座', ra: 9.93, dec: 69.07, mag: 6.9, sizeArcMin: 27, note: '旋涡星系的绝佳范例' },
  { id: 'M82', name: '雪茄星系', alias: 'Cigar Galaxy', type: 'galaxy', constellation: '大熊座', ra: 9.93, dec: 69.68, mag: 8.4, sizeArcMin: 11, note: '正在爆发式形成恒星的星系' },
  { id: 'M51', name: '涡状星系', alias: 'Whirlpool Galaxy', type: 'galaxy', constellation: '猎犬座', ra: 13.5, dec: 47.2, mag: 8.4, sizeArcMin: 11, note: '与伴星系相拥的旋涡星系' },
  { id: 'M87', name: '室女座星系团巨椭圆', alias: 'Virgo A', type: 'galaxy', constellation: '室女座', ra: 12.51, dec: 12.39, mag: 8.6, sizeArcMin: 8, note: '首张黑洞照片主角 M87* 之家' },
  { id: 'M104', name: '草帽星系', alias: 'Sombrero Galaxy', type: 'galaxy', constellation: '室女座', ra: 12.67, dec: -11.62, mag: 8.0, sizeArcMin: 9, note: '壮观的尘埃带似草帽' },
  // ---- 星云 ----
  { id: 'M42', name: '猎户座大星云', alias: 'Orion Nebula', type: 'nebula', constellation: '猎户座', ra: 5.59, dec: -5.39, mag: 4.0, sizeArcMin: 65, note: '冬季夜空最亮的星云，恒星摇篮' },
  { id: 'M16', name: '鹰状星云', alias: 'Eagle Nebula', type: 'nebula', constellation: '巨蛇座', ra: 18.31, dec: -13.79, mag: 6.0, sizeArcMin: 35, note: '「创造之柱」所在' },
  { id: 'M17', name: '天鹅星云', alias: 'Omega Nebula', type: 'nebula', constellation: '人马座', ra: 18.36, dec: -16.18, mag: 6.0, sizeArcMin: 46, note: '形态似展翅天鹅或 Ω' },
  { id: 'M20', name: '三叶星云', alias: 'Trifid Nebula', type: 'nebula', constellation: '人马座', ra: 18.04, dec: -23.03, mag: 6.3, sizeArcMin: 28, note: '散发着三瓣辉光的散发星云' },
  { id: 'M8', name: '泻湖星云', alias: 'Lagoon Nebula', type: 'nebula', constellation: '人马座', ra: 18.06, dec: -24.38, mag: 6.0, sizeArcMin: 90, note: '夏季银河中心的巨大星云' },
  { id: 'M1', name: '蟹状星云', alias: 'Crab Nebula', type: 'nebula', constellation: '金牛座', ra: 5.58, dec: 22.01, mag: 8.4, sizeArcMin: 6, note: '1054 年超新星残骸，脉冲星之家' },
  { id: 'M27', name: '哑铃星云', alias: 'Dumbbell Nebula', type: 'planetary-nebula', constellation: '狐狸座', ra: 19.99, dec: 22.72, mag: 7.5, sizeArcMin: 8, note: '最大最亮的行星状星云之一' },
  { id: 'M57', name: '环状星云', alias: 'Ring Nebula', type: 'planetary-nebula', constellation: '天琴座', ra: 18.89, dec: 33.03, mag: 8.8, sizeArcMin: 1.4, note: '织女旁的精致光环' },
  // ---- 疏散星团 ----
  { id: 'M45', name: '昴星团', alias: 'Pleiades', type: 'open-cluster', constellation: '金牛座', ra: 3.79, dec: 24.1, mag: 1.6, sizeArcMin: 110, note: '「七姐妹」肉眼清晰可辨' },
  { id: 'M44', name: '蜂巢星团', alias: 'Beehive Cluster', type: 'open-cluster', constellation: '巨蟹座', ra: 8.68, dec: 19.67, mag: 3.7, sizeArcMin: 95, note: '鬼星团，古人喻为云雾' },
  { id: 'M6', name: '蝴蝶星团', alias: 'Butterfly Cluster', type: 'open-cluster', constellation: '天蝎座', ra: 17.67, dec: -32.22, mag: 4.2, sizeArcMin: 25, note: '展翅欲飞的星群' },
  { id: 'M7', name: '托勒密星团', alias: 'Ptolemy Cluster', type: 'open-cluster', constellation: '天蝎座', ra: 17.89, dec: -34.79, mag: 3.3, sizeArcMin: 80, note: '早在古代便是「雾状天体」' },
  { id: 'M35', name: '巨蟹座疏散星团', alias: 'NGC 2168', type: 'open-cluster', constellation: '双子座', ra: 6.14, dec: 24.33, mag: 5.1, sizeArcMin: 28, note: '冬日星空的星团群' },
  // ---- 球状星团 ----
  { id: 'M13', name: '武仙座大星团', alias: 'Great Hercules Cluster', type: 'globular-cluster', constellation: '武仙座', ra: 16.7, dec: 36.46, mag: 5.8, sizeArcMin: 20, note: '北半球最壮观的球状星团' },
  { id: 'M22', name: '人马座大星团', alias: 'NGC 6656', type: 'globular-cluster', constellation: '人马座', ra: 18.6, dec: -23.9, mag: 5.1, sizeArcMin: 32, note: '银河中心方向的球状星团' },
  { id: 'M92', name: '武仙座北天球状星团', alias: 'NGC 6341', type: 'globular-cluster', constellation: '武仙座', ra: 17.29, dec: 43.14, mag: 6.4, sizeArcMin: 14, note: '亮度仅次于 M13' },
  { id: 'M3', name: '猎犬座球状星团', alias: 'NGC 5272', type: 'globular-cluster', constellation: '猎犬座', ra: 13.71, dec: 28.38, mag: 6.2, sizeArcMin: 18, note: '数量众多的短周期变星' },
  { id: 'M4', name: '天蝎座球状星团', alias: 'NGC 6121', type: 'globular-cluster', constellation: '天蝎座', ra: 16.39, dec: -26.53, mag: 5.6, sizeArcMin: 36, note: '距心宿二不远，易寻' },
]

/** 按类型筛选 */
export function deepSkyByType(type: DeepSkyType): DeepSkyObject[] {
  return DEEP_SKY_CATALOG.filter(o => o.type === type)
}

/** 按星座筛选 */
export function deepSkyByConstellation(constellation: string): DeepSkyObject[] {
  const key = constellation.trim()
  return DEEP_SKY_CATALOG.filter(o => o.constellation === key)
}

/** 关键词搜索（id / 中文名 / 别名 / 星座） */
export function searchDeepSky(keyword: string): DeepSkyObject[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return [...DEEP_SKY_CATALOG]
  return DEEP_SKY_CATALOG.filter(o =>
    o.id.toLowerCase().includes(kw) ||
    o.name.toLowerCase().includes(kw) ||
    o.alias.toLowerCase().includes(kw) ||
    o.constellation.toLowerCase().includes(kw) ||
    TYPE_META[o.type].label.includes(keyword),
  )
}

/** 按可见深度排序：先亮后暗。 */
export function sortDeepSkyByMagnitude<T extends DeepSkyObject>(items: T[]): T[] {
  return [...items].sort((a, b) => a.mag - b.mag)
}

/** 按星等推断裸眼/小望远镜可见性（辅助文案） */
export function visibilityHint(mag: number): string {
  if (mag <= 4.5) return '肉眼可辨'
  if (mag <= 6.5) return '暗夜裸眼/双筒可见'
  if (mag <= 8.5) return '小型望远镜'
  return '需较大口径'
}