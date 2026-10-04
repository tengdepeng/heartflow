// ============================================================
// 星空 · 月面地名导览（Lunar Feature Atlas，INCR-512）
// ------------------------------------------------------------
// 借鉴 96 APK「天文通」assets/moon_locations.json（月海/环形山，
// 含 lat / lon / diameter）。心流此前有月相但无月面特征标注。
// 本模块补一份月面地名库 + 正交投影纯函数，供月面盘渲染与检索。
//
// 合规：纯本地静态数据，零网络。坐标为公开天文近似值（度）。
// ============================================================

export type LunarFeatureType = 'mare' | 'oceanus' | 'sinus' | 'crater' | 'montes' | 'basin' | 'rupes'

export interface LunarFeature {
  id: string
  /** 拉丁名 */
  name: string
  /** 中文名 */
  nameZh: string
  type: LunarFeatureType
  /** 月面纬度（北正，度） */
  lat: number
  /** 月面经度（东正，度） */
  lon: number
  /** 直径（公里） */
  diameter: number
}

export const FEATURE_TYPE_LABEL: Record<LunarFeatureType, string> = {
  mare: '月海',
  oceanus: '洋',
  sinus: '湾',
  crater: '环形山',
  montes: '山脉',
  basin: '盆地',
  rupes: '崖壁',
}

export const FEATURE_TYPE_ORDER: LunarFeatureType[] = ['mare', 'oceanus', 'sinus', 'crater', 'montes', 'basin', 'rupes']

/** 月面地名库（真实公开坐标/直径，精度约 0.1° / 公里级） */
export const LUNAR_FEATURES: LunarFeature[] = [
  // —— 月海 / 洋 / 湾 ——
  { id: 'mare-imbrium', name: 'Mare Imbrium', nameZh: '雨海', type: 'mare', lat: 32.8, lon: -15.6, diameter: 1145 },
  { id: 'oceanus-procellarum', name: 'Oceanus Procellarum', nameZh: '风暴洋', type: 'oceanus', lat: 18.4, lon: -57.4, diameter: 2592 },
  { id: 'mare-serenitatis', name: 'Mare Serenitatis', nameZh: '澄海', type: 'mare', lat: 28.0, lon: 17.5, diameter: 707 },
  { id: 'mare-tranquillitatis', name: 'Mare Tranquillitatis', nameZh: '静海', type: 'mare', lat: 8.5, lon: 31.4, diameter: 873 },
  { id: 'mare-fecunditatis', name: 'Mare Fecunditatis', nameZh: '丰富海', type: 'mare', lat: -7.8, lon: 51.3, diameter: 909 },
  { id: 'mare-crisium', name: 'Mare Crisium', nameZh: '危海', type: 'mare', lat: 17.0, lon: 59.1, diameter: 555 },
  { id: 'mare-nectaris', name: 'Mare Nectaris', nameZh: '酒海', type: 'mare', lat: -15.2, lon: 35.5, diameter: 333 },
  { id: 'mare-humorum', name: 'Mare Humorum', nameZh: '湿海', type: 'mare', lat: -24.4, lon: -38.6, diameter: 389 },
  { id: 'mare-nubium', name: 'Mare Nubium', nameZh: '云海', type: 'mare', lat: -21.3, lon: -16.6, diameter: 715 },
  { id: 'mare-vaporum', name: 'Mare Vaporum', nameZh: '汽海', type: 'mare', lat: 13.3, lon: 3.6, diameter: 245 },
  { id: 'mare-frigoris', name: 'Mare Frigoris', nameZh: '冷海', type: 'mare', lat: 56.0, lon: -1.4, diameter: 1596 },
  { id: 'mare-orientale', name: 'Mare Orientale', nameZh: '东方海', type: 'mare', lat: -19.4, lon: -92.8, diameter: 327 },
  { id: 'mare-moscoviense', name: 'Mare Moscoviense', nameZh: '莫斯科海', type: 'mare', lat: 27.3, lon: 147.9, diameter: 276 },
  { id: 'sinus-iridum', name: 'Sinus Iridum', nameZh: '虹湾', type: 'sinus', lat: 45.0, lon: -31.5, diameter: 236 },
  { id: 'sinus-aestuum', name: 'Sinus Aestuum', nameZh: '暑湾', type: 'sinus', lat: 10.9, lon: -8.8, diameter: 290 },
  { id: 'sinus-roris', name: 'Sinus Roris', nameZh: '露湾', type: 'sinus', lat: 54.0, lon: -56.6, diameter: 202 },
  // —— 环形山 ——
  { id: 'tycho', name: 'Tycho', nameZh: '第谷环形山', type: 'crater', lat: -43.3, lon: -11.4, diameter: 85 },
  { id: 'copernicus', name: 'Copernicus', nameZh: '哥白尼环形山', type: 'crater', lat: 9.6, lon: -20.1, diameter: 93 },
  { id: 'kepler', name: 'Kepler', nameZh: '开普勒环形山', type: 'crater', lat: 8.1, lon: -38.0, diameter: 32 },
  { id: 'aristarchus', name: 'Aristarchus', nameZh: '阿里斯塔克斯环形山', type: 'crater', lat: 23.7, lon: -47.4, diameter: 40 },
  { id: 'plato', name: 'Plato', nameZh: '柏拉图环形山', type: 'crater', lat: 51.6, lon: -9.3, diameter: 109 },
  { id: 'clavius', name: 'Clavius', nameZh: '克拉维乌斯环形山', type: 'crater', lat: -58.4, lon: -14.4, diameter: 225 },
  { id: 'ptolemaeus', name: 'Ptolemaeus', nameZh: '托勒密环形山', type: 'crater', lat: -9.2, lon: -1.8, diameter: 153 },
  { id: 'alphonsus', name: 'Alphonsus', nameZh: '阿尔方索环形山', type: 'crater', lat: -13.4, lon: -2.8, diameter: 119 },
  { id: 'arzachel', name: 'Arzachel', nameZh: '阿尔扎赫尔环形山', type: 'crater', lat: -18.2, lon: -1.9, diameter: 97 },
  { id: 'petavius', name: 'Petavius', nameZh: '佩塔维乌斯环形山', type: 'crater', lat: -25.3, lon: 60.4, diameter: 177 },
  { id: 'langrenus', name: 'Langrenus', nameZh: '朗格伦环形山', type: 'crater', lat: -8.9, lon: 61.1, diameter: 132 },
  { id: 'theophilus', name: 'Theophilus', nameZh: '西奥菲勒斯环形山', type: 'crater', lat: -11.4, lon: 26.4, diameter: 100 },
  { id: 'piccolomini', name: 'Piccolomini', nameZh: '皮科洛米尼环形山', type: 'crater', lat: -29.7, lon: 32.2, diameter: 88 },
  { id: 'gassendi', name: 'Gassendi', nameZh: '加桑迪环形山', type: 'crater', lat: -17.5, lon: -40.1, diameter: 110 },
  { id: 'grimaldi', name: 'Grimaldi', nameZh: '格里马尔迪环形山', type: 'crater', lat: -5.2, lon: -68.6, diameter: 172 },
  { id: 'bailly', name: 'Bailly', nameZh: '巴伊环形山', type: 'crater', lat: -66.8, lon: -69.4, diameter: 287 },
  { id: 'tsiolkovskiy', name: 'Tsiolkovskiy', nameZh: '齐奥尔科夫斯基环形山', type: 'crater', lat: -20.4, lon: 129.1, diameter: 185 },
  { id: 'mendeleev', name: 'Mendeleev', nameZh: '门捷列夫环形山', type: 'crater', lat: 5.7, lon: 140.9, diameter: 313 },
  { id: 'humboldt', name: 'Humboldt', nameZh: '洪堡环形山', type: 'crater', lat: -27.2, lon: 80.9, diameter: 207 },
  // —— 山脉 / 盆地 / 崖壁 ——
  { id: 'montes-apenninus', name: 'Montes Apenninus', nameZh: '亚平宁山脉', type: 'montes', lat: 18.9, lon: -3.7, diameter: 600 },
  { id: 'montes-caucasus', name: 'Montes Caucasus', nameZh: '高加索山脉', type: 'montes', lat: 38.9, lon: 8.7, diameter: 445 },
  { id: 'montes-alpes', name: 'Montes Alpes', nameZh: '阿尔卑斯山脉', type: 'montes', lat: 48.0, lon: -0.5, diameter: 340 },
  { id: 'montes-jura', name: 'Montes Jura', nameZh: '侏罗山脉', type: 'montes', lat: 46.5, lon: -36.5, diameter: 422 },
  { id: 'south-pole-aitken', name: 'South Pole–Aitken basin', nameZh: '南极-艾特肯盆地', type: 'basin', lat: -53.0, lon: -169.0, diameter: 2500 },
  { id: 'rupes-recta', name: 'Rupes Recta', nameZh: '直壁', type: 'rupes', lat: -21.8, lon: -7.8, diameter: 134 },
]

// ------------------------------------------------------------
// 纯函数（可单测）
// ------------------------------------------------------------

/** 按类型筛选（空返回全部） */
export function featuresByType(type: LunarFeatureType | ''): LunarFeature[] {
  if (!type) return [...LUNAR_FEATURES]
  return LUNAR_FEATURES.filter((f) => f.type === type)
}

/** 关键词搜索（匹配中/拉丁名，不区分大小写） */
export function searchFeatures(query: string): LunarFeature[] {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return [...LUNAR_FEATURES]
  return LUNAR_FEATURES.filter(
    (f) => f.name.toLowerCase().includes(q) || f.nameZh.toLowerCase().includes(q),
  )
}

/** 按直径降序（大特征优先） */
export function sortByDiameter(features: LunarFeature[], desc = true): LunarFeature[] {
  return [...features].sort((a, b) => (desc ? b.diameter - a.diameter : a.diameter - b.diameter))
}

export interface DiscPoint {
  /** 单位月盘横坐标 -1~1（东正） */
  x: number
  /** 单位月盘纵坐标 -1~1（北正） */
  y: number
  /** 是否朝向地球可见（正交投影 z>0） */
  visible: boolean
}

/** 正交投影：以月面 (0,0) 为中心，映射到单位月盘 */
export function projectToDisc(lat: number, lon: number): DiscPoint {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180
  const z = Math.cos(la) * Math.cos(lo)
  return { x: Math.cos(la) * Math.sin(lo), y: Math.sin(la), visible: z > 0 }
}

/** 特征在月盘上的显示半径（单位坐标，按直径开方归一，含上下限） */
export function discRadius(diameter: number): number {
  const r = Math.sqrt(Math.max(diameter, 0)) / 120
  return Math.min(0.42, Math.max(0.03, r))
}

/** 是否位于月面背面（|经度| > 90°） */
export function isFarSide(f: LunarFeature): boolean {
  return Math.abs(f.lon) > 90
}
