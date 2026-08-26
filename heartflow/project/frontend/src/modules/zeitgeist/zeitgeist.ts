// ============================================================
// 逐日心锚 · 时令元数据采集（P6-1）
// 借鉴「墨记日记」：日记元数据自动采集——自动抓取天气 / 时辰 /
// 节气 / 季节，为锚点日志自动附上时令上下文。
// 全部本地计算，无网络依赖，守宪法第1条本地私有。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { SOLAR_TERMS } from '../seasonal/data'
import type { SolarTerm } from '../seasonal/types'

// ============================================================
// 时辰（十二时辰）
// ============================================================

/** 十二时辰接口 */
export interface Shichen {
  /** 时辰名 */
  name: string
  /** 地支 */
  branch: string
  /** 起始整点（0-23），跨日时辰（子时 23:00）也以 23 记录 */
  startHour: number
  /** 对应五行 */
  element: '木' | '火' | '土' | '金' | '水'
  /** 时辰雅称 */
  alias: string
}

// 十二地支、对应五行与起始小时
const SHICHEN_DATA: Array<{ branch: string; startHour: number; element: Shichen['element']; alias: string }> = [
  { branch: '子', startHour: 23, element: '水', alias: '夜半' },
  { branch: '丑', startHour: 1, element: '土', alias: '鸡鸣' },
  { branch: '寅', startHour: 3, element: '木', alias: '平旦' },
  { branch: '卯', startHour: 5, element: '木', alias: '日出' },
  { branch: '辰', startHour: 7, element: '土', alias: '食时' },
  { branch: '巳', startHour: 9, element: '火', alias: '隅中' },
  { branch: '午', startHour: 11, element: '火', alias: '日中' },
  { branch: '未', startHour: 13, element: '土', alias: '日昳' },
  { branch: '申', startHour: 15, element: '金', alias: '晡时' },
  { branch: '酉', startHour: 17, element: '金', alias: '日入' },
  { branch: '戌', startHour: 19, element: '土', alias: '黄昏' },
  { branch: '亥', startHour: 21, element: '水', alias: '人定' },
]

export const SHICHEN_LIST: Shichen[] = SHICHEN_DATA.map((d) => ({
  name: d.branch,
  branch: d.branch,
  startHour: d.startHour,
  element: d.element,
  alias: d.alias,
}))

/** 由 Date 取逻辑小时（0-23）判时辰；子时覆盖 23-01 点 */
export function shichenForHour(hour: number): Shichen {
  const h = ((hour % 24) + 24) % 24
  // 十二时辰按 2 小时一段：index = floor((h+1)/2) % 12
  //   23-01 → 子(0)，01-03 → 丑(1)，……，21-23 → 亥(11)
  const index = Math.floor((h + 1) / 2) % 12
  return SHICHEN_LIST[index]
}

export function shichenForDate(date: Date): Shichen {
  return shichenForHour(date.getHours())
}

// ============================================================
// 节气（沿用岁时阁 SOLAR_TERMS，选择离当前最近的一个）
// ============================================================

/** 二十四节气标准名单（SOLAR_TERMS 中混入节日条目，据此抽离真实节气） */
const SOLAR_TERM_NAMES = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
]

const TRUE_SOLAR_TERMS = SOLAR_TERMS.filter(t => SOLAR_TERM_NAMES.includes(t.name))

/**
 * 由日期求节气：取「月内距离今天最近」的节气（± 都在候选内）：
 * 始终返回距当前日期最近的节气，符合「当前节气」直觉。
 */
export function solarTermOnDate(date: Date): SolarTerm {
  const m = date.getMonth() + 1
  const d = date.getDate()

  const monthTerms = TRUE_SOLAR_TERMS.filter(t => t.month === m)
  if (monthTerms.length) {
    return monthTerms.reduce((best, t) =>
      Math.abs(t.day - d) < Math.abs(best.day - d) ? t : best,
    )
  }
  // 跨月兜底：按「月-day」绝对距离取最近
  const target = m * 100 + d
  return TRUE_SOLAR_TERMS.reduce((best, t) =>
    Math.abs(t.month * 100 + t.day - target) < Math.abs(best.month * 100 + best.day - target) ? t : best,
  )
}

const SEASON_BY_MONTH: Record<number, string> = {
  3: '春', 4: '春', 5: '春',
  6: '夏', 7: '夏', 8: '夏',
  9: '秋', 10: '秋', 11: '秋',
  12: '冬', 1: '冬', 2: '冬',
}

/** 由日期（农历节令近似）得季节 */
export function seasonForMonth(month: number): string {
  return SEASON_BY_MONTH[((month % 12) + 12) % 12 || 12] ?? '春'
}

export const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

// ============================================================
// 天气预设
// ============================================================

export type WeatherType = 'sunny' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'windy' | 'misty'

export interface WeatherPreset {
  type: WeatherType
  label: string
  icon: string
  color: string
}

export const WEATHER_PRESETS: WeatherPreset[] = [
  { type: 'sunny', label: '晴', icon: '☀️', color: '#f5c452' },
  { type: 'cloudy', label: '多云', icon: '⛅', color: '#a9b7c6' },
  { type: 'overcast', label: '阴', icon: '☁️', color: '#8b9bb0' },
  { type: 'rain', label: '雨', icon: '🌧️', color: '#5b8dc9' },
  { type: 'snow', label: '雪', icon: '❄️', color: '#cfe0ec' },
  { type: 'windy', label: '风', icon: '🌬️', color: '#9ad0b5' },
  { type: 'misty', label: '雾', icon: '🌫️', color: '#b7b7c9' },
]

export function weatherPreset(type: WeatherType): WeatherPreset {
  return WEATHER_PRESETS.find(w => w.type === type) ?? WEATHER_PRESETS[0]
}

// ============================================================
// 聚合元数据
// ============================================================

/** 一条日记自动元数据 */
export interface ZeitMeta {
  /** 日期 YYYY-MM-DD */
  date: string
  /** 星期 */
  weekday: string
  /** 时辰名 */
  shichen: string
  /** 时辰雅称 */
  shichenAlias: string
  /** 时辰五行 */
  shichenElement: string
  /** 节气名 */
  solarTerm: string
  /** 节气图标 */
  solarTermIcon: string
  /** 季节 */
  season: string
  /** 天气（可空，用户补充） */
  weather: WeatherType | null
}

/** 集成入口：由日期自动生成全部元数据（天气默认空，待选） */
export function collectAutoMetadata(date: Date, weather: WeatherType | null = null): ZeitMeta {
  const shichen = shichenForDate(date)
  const term = solarTermOnDate(date)
  const month = date.getMonth() + 1
  const y = date.getFullYear()
  const d = date.getDate()
  return {
    date: `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    weekday: WEEKDAY_LABELS[date.getDay()],
    shichen: shichen.name,
    shichenAlias: shichen.alias,
    shichenElement: shichen.element,
    solarTerm: term.name,
    solarTermIcon: term.icon,
    season: seasonForMonth(month),
    weather,
  }
}

// ============================================================
// 存储层（时令偏好 + 最近一次自动元数据）
// ============================================================

const STORAGE_KEY_PREF = 'hf:zeitgeist_pref'
const STORAGE_KEY_LAST = 'hf:zeitgeist_last'

export interface ZeitgeistPref {
  /** 是否在新建日志时自动采集元数据 */
  autoCollect: boolean
  /** 默认天气（可留空） */
  defaultWeather: WeatherType | null
}

export function useZeitgeist() {
  const pref = ref<ZeitgeistPref>(loadPref())

  function loadPref(): ZeitgeistPref {
    try {
      return { autoCollect: true, defaultWeather: null, ...storage.getKV<Partial<ZeitgeistPref>>(STORAGE_KEY_PREF, {}) }
    } catch {
      return { autoCollect: true, defaultWeather: null }
    }
  }

  function savePref(): void {
    storage.setKV(STORAGE_KEY_PREF, pref.value)
  }

  function updatePref(patch: Partial<ZeitgeistPref>): void {
    pref.value = { ...pref.value, ...patch }
    savePref()
  }

  /** 采集当前时刻的自动元数据并缓存 */
  function collectNow(date: Date = new Date(), weather: WeatherType | null = null): ZeitMeta {
    const meta = collectAutoMetadata(date, weather ?? pref.value.defaultWeather)
    storage.setKV(STORAGE_KEY_LAST, meta)
    return meta
  }

  /** 读取最近一次采集结果 */
  function lastMeta(): ZeitMeta | null {
    try {
      return storage.getKV<ZeitMeta | null>(STORAGE_KEY_LAST, null)
    } catch {
      return null
    }
  }

  const enabled = computed(() => pref.value.autoCollect)

  return {
    pref: computed(() => pref.value),
    enabled,
    updatePref,
    collectNow,
    lastMeta,
  }
}