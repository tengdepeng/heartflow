// ============================================================
// 时间长廊 · 观星地点库（INCR-511，借鉴「天文通」curated_stargazing_spots）
// 精选中国境内暗夜/观星/天文台地点，供星空投影选定观测地。
// 数据均为真实已知地名，坐标/海拔为公开近似（精度约 0.01° / 十米级），
// 仅用于星图投影与暗夜等级参考，守卫宪法第1条（本地离线、零网络）。
// 纯函数库 + 轻量持久化（选中观测地），供 SkyGazePanel / StargazingSpotsPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 单个观星地点 */
export interface StargazingSpot {
  /** 稳定 id（用于持久化与查找） */
  id: string
  /** 地点名称 */
  name: string
  /** 所在省级行政区 */
  province: string
  /** 简短观星特色描述 */
  desc: string
  /** 纬度（北纬为正，度） */
  lat: number
  /** 经度（东经为正，度） */
  lng: number
  /** 海拔（米） */
  altitude: number
  /** 暗夜等级 Bortle 1(最暗)~9(市中心) */
  bortle: number
}

const STORAGE_KEY = 'hf:stargazing_spot'

// ============================================================
// 精选地点库（真实地名 + 公开近似坐标/海拔）
// ============================================================

export const CURATED_SPOTS: StargazingSpot[] = [
  { id: 'ali-darkpark', name: '阿里暗夜公园', province: '西藏', desc: '中国首个暗夜保护区，银河肉眼清晰，Bortle 1 级', lat: 31.10, lng: 80.40, altitude: 4200, bortle: 1 },
  { id: 'lenghu', name: '冷湖火星营地', province: '青海', desc: '茫崖冷湖暗夜星空保护地，戈壁极度通透', lat: 38.75, lng: 93.50, altitude: 2800, bortle: 1 },
  { id: 'namtso', name: '纳木错', province: '西藏', desc: '圣湖畔高海拔暗空，倒映银河', lat: 30.70, lng: 90.60, altitude: 4718, bortle: 1 },
  { id: 'everest-bc', name: '珠峰大本营', province: '西藏', desc: '世界屋脊观星，空气稀薄透彻', lat: 28.00, lng: 86.85, altitude: 5200, bortle: 2 },
  { id: 'nagqu', name: '那曲', province: '西藏', desc: '藏北高原，全年晴夜众多', lat: 31.48, lng: 92.05, altitude: 4500, bortle: 2 },
  { id: 'nyingchi', name: '林芝', province: '西藏', desc: '藏东南低纬度暗空，南天星丰富', lat: 29.65, lng: 94.36, altitude: 3000, bortle: 2 },
  { id: 'gaomeigu', name: '丽江高美古', province: '云南', desc: '丽江天文台所在，东亚优良台址', lat: 26.70, lng: 100.03, altitude: 3200, bortle: 2 },
  { id: 'niubei', name: '牛背山', province: '四川', desc: '360° 观景平台，云海之上是银河', lat: 29.80, lng: 102.30, altitude: 3660, bortle: 2 },
  { id: 'gongga', name: '贡嘎山', province: '四川', desc: '蜀山之王，高海拔暗空', lat: 29.60, lng: 101.90, altitude: 7556, bortle: 2 },
  { id: 'daxue', name: '达古冰川', province: '四川', desc: '冰川之巅，高海拔通透夜空', lat: 32.25, lng: 102.90, altitude: 4860, bortle: 2 },
  { id: 'qinghai-lake', name: '青海湖', province: '青海', desc: '高原圣湖，环湖暗空开阔', lat: 36.90, lng: 100.20, altitude: 3196, bortle: 2 },
  { id: 'chaka', name: '茶卡盐湖', province: '青海', desc: '天空之镜，湖面映星', lat: 36.70, lng: 99.30, altitude: 3100, bortle: 2 },
  { id: 'zhangye', name: '张掖丹霞', province: '甘肃', desc: '七彩丘陵之上的干燥夜空', lat: 38.90, lng: 100.40, altitude: 1800, bortle: 3 },
  { id: 'dunhuang', name: '敦煌', province: '甘肃', desc: '大漠星河，戈壁通透', lat: 40.14, lng: 94.66, altitude: 1139, bortle: 3 },
  { id: 'tengger', name: '腾格里沙漠', province: '内蒙古', desc: '沙海星野，地平线极开阔', lat: 37.50, lng: 104.50, altitude: 1300, bortle: 3 },
  { id: 'kubuqi', name: '库布齐沙漠', province: '内蒙古', desc: '黄河几字弯沙地，远离灯光', lat: 40.40, lng: 108.50, altitude: 1100, bortle: 3 },
  { id: 'wutai', name: '五台山', province: '山西', desc: '华北屋脊，高山暗空', lat: 38.99, lng: 113.60, altitude: 3061, bortle: 3 },
  { id: 'helan', name: '贺兰山', province: '宁夏', desc: '塞上夜空，山脊之上通透', lat: 38.50, lng: 105.90, altitude: 3556, bortle: 3 },
  { id: 'qilian', name: '祁连山', province: '青海', desc: '雪山下草原暗空', lat: 38.00, lng: 99.00, altitude: 3500, bortle: 3 },
  { id: 'xilin', name: '锡林郭勒', province: '内蒙古', desc: '草原星空，地平线极低', lat: 43.90, lng: 116.00, altitude: 988, bortle: 3 },
  { id: 'hulun', name: '呼伦贝尔', province: '内蒙古', desc: '北国草原文火极低', lat: 49.20, lng: 119.70, altitude: 600, bortle: 3 },
  { id: 'kanas', name: '喀纳斯', province: '新疆', desc: '北疆秘境，湖畔暗空', lat: 48.70, lng: 87.00, altitude: 1370, bortle: 3 },
  { id: 'tianshan', name: '天山天池', province: '新疆', desc: '雪峰倒映的高山暗空', lat: 43.88, lng: 88.12, altitude: 1910, bortle: 3 },
  { id: 'erhai', name: '洱海', province: '云南', desc: '大理苍山洱海间观星', lat: 25.70, lng: 100.20, altitude: 1972, bortle: 3 },
  { id: 'xianggelila', name: '香格里拉', province: '云南', desc: '高原秘境，空气通透', lat: 27.80, lng: 99.70, altitude: 3280, bortle: 3 },
  { id: 'cangshan', name: '苍山', province: '云南', desc: '大理十九峰之上暗空', lat: 25.60, lng: 100.10, altitude: 4122, bortle: 3 },
  { id: 'yuanyang', name: '元阳梯田', province: '云南', desc: '梯田镜面映星，低纬南天', lat: 23.10, lng: 102.80, altitude: 1600, bortle: 3 },
  { id: 'daocheng', name: '稻城亚丁', province: '四川', desc: '香格里拉之眼，三神山星空', lat: 28.50, lng: 100.30, altitude: 3900, bortle: 2 },
  { id: 'mount-shengnong', name: '神农架', province: '湖北', desc: '原始森林上空的暗夜', lat: 31.45, lng: 110.40, altitude: 3105, bortle: 3 },
  { id: 'mount-wu', name: '武功山', province: '江西', desc: '高山草甸，云顶帐篷观星', lat: 27.45, lng: 114.20, altitude: 1918, bortle: 4 },
  { id: 'mount-lu', name: '庐山', province: '江西', desc: '避暑胜地夏夜观星', lat: 29.55, lng: 115.97, altitude: 1474, bortle: 4 },
  { id: 'wuyuan', name: '婺源', province: '江西', desc: '徽派村落田园星空', lat: 29.20, lng: 117.80, altitude: 200, bortle: 4 },
  { id: 'mount-wuyi', name: '武夷山', province: '福建', desc: '丹霞之上的闽北夜空', lat: 27.70, lng: 117.70, altitude: 2158, bortle: 4 },
  { id: 'mount-huang', name: '黄山', province: '安徽', desc: '云海之上的华东暗空', lat: 30.13, lng: 118.16, altitude: 1864, bortle: 4 },
  { id: 'mount-moganshan', name: '莫干山', province: '浙江', desc: '竹海山居夏夜观星', lat: 30.60, lng: 119.80, altitude: 724, bortle: 4 },
  { id: 'mount-tai', name: '泰山', province: '山东', desc: '五岳之首，日出前星河', lat: 36.25, lng: 117.10, altitude: 1545, bortle: 5 },
  { id: 'mount-hua', name: '华山', province: '陕西', desc: '奇险天下，长空栈道观星', lat: 34.47, lng: 110.09, altitude: 2154, bortle: 5 },
  { id: 'mount-emei', name: '峨眉山', province: '四川', desc: '金顶云上星空', lat: 29.50, lng: 103.33, altitude: 3079, bortle: 4 },
  { id: 'mount-fanjing', name: '梵净山', province: '贵州', desc: '云上佛国暗夜', lat: 27.90, lng: 108.70, altitude: 2493, bortle: 4 },
  { id: 'mount-heng', name: '衡山', province: '湖南', desc: '南岳夜观星象', lat: 27.25, lng: 112.70, altitude: 1300, bortle: 5 },
  { id: 'xinglong', name: '兴隆观测站', province: '河北', desc: '国家天文台光学观测基地', lat: 40.39, lng: 117.58, altitude: 960, bortle: 4 },
  { id: 'zijinshan', name: '紫金山天文台', province: '江苏', desc: '中国现代天文学摇篮', lat: 32.06, lng: 118.83, altitude: 267, bortle: 7 },
  { id: 'changbaishan', name: '长白山', province: '吉林', desc: '天池之畔北国星空', lat: 42.06, lng: 128.05, altitude: 2691, bortle: 4 },
  { id: 'mohe', name: '漠河', province: '黑龙江', desc: '中国北极，可遇极光', lat: 53.00, lng: 122.40, altitude: 296, bortle: 4 },
  { id: 'gulangyu', name: '鼓浪屿', province: '福建', desc: '海岛低纬南天星空', lat: 24.45, lng: 118.07, altitude: 60, bortle: 6 },
]

// ============================================================
// 纯函数（可单测）
// ============================================================

/** 按省级行政区筛选（精确匹配，空串/全返回全部） */
export function filterByProvince(spots: StargazingSpot[], province: string): StargazingSpot[] {
  if (!province) return spots
  return spots.filter(s => s.province === province)
}

/** 关键词搜索（匹配 名称/省/描述，不区分大小写，空白返回全部） */
export function searchSpots(spots: StargazingSpot[], query: string): StargazingSpot[] {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return spots
  return spots.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.province.toLowerCase().includes(q) ||
    s.desc.toLowerCase().includes(q),
  )
}

/** 按暗夜等级升序（越暗越靠前，推荐优先） */
export function sortByDarkness(spots: StargazingSpot[], asc = true): StargazingSpot[] {
  const arr = [...spots]
  arr.sort((a, b) => (asc ? a.bortle - b.bortle : b.bortle - a.bortle))
  return arr
}

/** 取 Bortle 等级的中文标签 */
export function bortleLabel(b: number): string {
  if (b <= 1) return '极致暗空'
  if (b <= 2) return '原野暗空'
  if (b <= 3) return '乡村暗空'
  if (b <= 4) return '郊野暗空'
  if (b <= 5) return '城郊过渡'
  if (b <= 6) return '城郊亮空'
  return '城市光害'
}

// ============================================================
// 观测地选择（模块级单例 + 持久化）
// ============================================================

function loadSelected(): string | null {
  try {
    return storage.getKV<string | null>(STORAGE_KEY, null)
  } catch {
    return null
  }
}

const selectedId = ref<string | null>(loadSelected())

/** 观星地点库组合 API（模块级单例，SkyGazePanel 与 StargazingSpotsPanel 共享） */
export function useStargazingSpots() {
  const selectedSpot = computed<StargazingSpot | null>(
    () => CURATED_SPOTS.find(s => s.id === selectedId.value) ?? null,
  )

  /** 去重省级列表（用于筛选下拉） */
  const provinces = computed<string[]>(
    () => [...new Set(CURATED_SPOTS.map(s => s.province))].sort(),
  )

  function setSpot(id: string): void {
    const found = CURATED_SPOTS.some(s => s.id === id)
    if (!found) return
    selectedId.value = id
    try {
      storage.setKV(STORAGE_KEY, id)
    } catch {
      /* 持久化失败不影响内存态 */
    }
  }

  function clearSpot(): void {
    selectedId.value = null
    try {
      storage.setKV(STORAGE_KEY, null)
    } catch {
      /* ignore */
    }
  }

  /** 选中地点的经纬度（未选则回退北京） */
  function observingCoords(): { latDeg: number; lngDeg: number } {
    const s = selectedSpot.value
    return { latDeg: s ? s.lat : 39.9, lngDeg: s ? s.lng : 116.4 }
  }

  return {
    selectedId: computed(() => selectedId.value),
    selectedSpot,
    provinces,
    setSpot,
    clearSpot,
    observingCoords,
  }
}
