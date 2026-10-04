// ============================================================
// 岁时阁 · 节气/节日/民俗数据
// ============================================================

import type { SolarTerm, Festival, SeasonMeta } from './types'

/** 二十四节气完整数据 */
export const SOLAR_TERMS: SolarTerm[] = [
  { name: '立春', icon: '🌱', desc: '东风解冻，万物复苏', month: 2, day: 4 },
  { name: '雨水', icon: '🌧', desc: '天一生水，润物无声', month: 2, day: 19 },
  { name: '惊蛰', icon: '⚡', desc: '春雷乍动，蛰虫惊醒', month: 3, day: 6 },
  { name: '春分', icon: '🌸', desc: '阴阳相半，昼夜均分', month: 3, day: 21 },
  { name: '清明', icon: '🍃', desc: '气清景明，万物皆显', month: 4, day: 5 },
  { name: '谷雨', icon: '🌾', desc: '雨生百谷，播种希望', month: 4, day: 20 },
  { name: '立夏', icon: '☀️', desc: '万物繁茂，暑气渐生', month: 5, day: 6 },
  { name: '小满', icon: '🌿', desc: '麦类灌浆，小得盈满', month: 5, day: 21 },
  { name: '芒种', icon: '🌾', desc: '有芒之谷，可以稼种', month: 6, day: 6 },
  { name: '夏至', icon: '🔥', desc: '日北至，日长之至', month: 6, day: 21 },
  { name: '小暑', icon: '🌡', desc: '暑气渐盛，温风至', month: 7, day: 7 },
  { name: '大暑', icon: '🥵', desc: '湿热交蒸，万物蒸煮', month: 7, day: 23 },
  { name: '立秋', icon: '🍂', desc: '凉风至，白露降', month: 8, day: 8 },
  { name: '处暑', icon: '🌤', desc: '暑气止，秋意渐浓', month: 8, day: 23 },
  { name: '白露', icon: '💧', desc: '阴气渐重，露凝而白', month: 9, day: 8 },
  { name: '秋分', icon: '🍁', desc: '昼夜均，寒暑平', month: 9, day: 23 },
  { name: '寒露', icon: '🥶', desc: '露气寒冷，将凝结', month: 10, day: 8 },
  { name: '霜降', icon: '❄️', desc: '气肃而凝，露结为霜', month: 10, day: 24 },
  { name: '立冬', icon: '🌬', desc: '水始冰，地始冻', month: 11, day: 8 },
  { name: '小雪', icon: '🌨', desc: '雨下为寒气所薄', month: 11, day: 22 },
  { name: '大雪', icon: '⛄', desc: '至此而雪盛矣', month: 12, day: 7 },
  { name: '冬至', icon: '🌑', desc: '日南至，日短之至', month: 12, day: 22 },
  { name: '小寒', icon: '🧊', desc: '寒气积久而为寒', month: 1, day: 6 },
  { name: '大寒', icon: '🏔', desc: '寒气之逆极', month: 1, day: 20 },
]

/** 传统节日数据 */
export const FESTIVALS: Festival[] = [
  { name: '春节', icon: '🧧', month: 1, day: 29 },
  { name: '元宵', icon: '🏮', month: 2, day: 12 },
  { name: '清明', icon: '🍃', month: 4, day: 5 },
  { name: '端午', icon: '🐲', month: 5, day: 31 },
  { name: '七夕', icon: '🌟', month: 8, day: 29 },
  { name: '中秋', icon: '🌕', month: 10, day: 6 },
  { name: '重阳', icon: '🌺', month: 10, day: 29 },
  { name: '冬至', icon: '🥟', month: 12, day: 22 },
]

/** 节气民俗 */
export const TERM_CUSTOMS: Record<string, string> = {
  '立春': '打春牛、咬春(吃春饼)、踏青迎春',
  '清明': '扫墓祭祖、踏青插柳、放风筝',
  '立夏': '称人、吃蛋、尝三新',
  '冬至': '祭天祭祖、吃饺子/汤圆、数九消寒',
  '端午': '赛龙舟、吃粽子、挂艾草、佩香囊',
  '中秋': '赏月、吃月饼、家人团圆',
}

/** 节日文化介绍 */
export const FESTIVAL_INFO: Record<string, string> = {
  '春节': '岁首迎新，贴春联、放鞭炮、拜年、发红包。最重要的传统节日。',
  '元宵': '上元灯节，赏花灯、猜灯谜、吃元宵。',
  '端午': '纪念屈原，赛龙舟、吃粽子、挂艾草驱邪。',
  '中秋': '月圆人团圆，赏月、吃月饼。',
  '七夕': '牛郎织女鹊桥相会，乞巧节。',
  '重阳': '登高望远、赏菊、敬老。',
  '冬至': '阳气始生，北方吃饺子、南方吃汤圆。',
}

/** 四季标签元数据 */
export const SEASON_META: SeasonMeta[] = [
  { key: 'spring', label: '春', icon: '🌸' },
  { key: 'summer', label: '夏', icon: '☀️' },
  { key: 'autumn', label: '秋', icon: '🍂' },
  { key: 'winter', label: '冬', icon: '❄️' },
]

/** 获取节气民俗 */
export function getTermCustoms(name: string): string {
  return TERM_CUSTOMS[name] || `${name}是二十四节气之一。传统上人们会根据节气安排农事和养生。`
}

/** 获取节日文化介绍 */
export function getFestivalInfo(name: string): string {
  return FESTIVAL_INFO[name] || `${name}是重要的传统节日。`
}