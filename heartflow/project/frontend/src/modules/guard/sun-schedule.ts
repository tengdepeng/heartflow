// ============================================================
// 守护室 · 日出日落自动启停
// ------------------------------------------------------------
// 借鉴「夜间模式 / 暮光」的日出日落定时启停：
// - 由经纬度本地计算日出日落（NOAA 太阳位置算法），零网络依赖
// - 夜间自动开启护眼，白天自动关闭
// - 无定位时回退到自定义时间
// 数据本地私有（宪法第1条），纯函数可单测。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 纯函数：日出日落计算（NOAA 算法）
// ============================================================

export interface SunTimes {
  sunrise: Date
  sunset: Date
  /** 极昼（太阳不落） */
  polarDay: boolean
  /** 极夜（太阳不升） */
  polarNight: boolean
}

export type DayPhase = 'day' | 'night' | 'polar-day' | 'polar-night'

const ZENITH = 90.833
const RAD = Math.PI / 180

/** 儒略日（公历 → JD） */
function julianDay(date: Date): number {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
}

/** UTC 分钟 → 本地 Date（按给定日期的本地时区） */
function utcMinutesToDate(utcMinutes: number, date: Date): Date {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = local.getTimezoneOffset()
  local.setMinutes(utcMinutes - offset)
  return local
}

/**
 * 由经纬度与日期计算日出日落（本地时间）。
 * 纬度范围 -90..90，经度范围 -180..180。
 */
export function computeSunTimes(lat: number, lng: number, date = new Date()): SunTimes {
  const jd = julianDay(date)
  const T = (jd - 2451545.0) / 36525

  // 太阳几何平均黄经
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360
  // 太阳平近点角
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
  // 地球轨道离心率
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
  // 中心差
  const Mrad = M * RAD
  const C = Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * Mrad) * 0.000289
  const trueLong = L0 + C
  // 视黄经
  const omega = 125.04 - 1934.136 * T
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD)
  // 黄赤交角
  const seconds = 21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))
  const e0 = 23 + (26 + seconds / 60) / 60
  const eCorr = e0 + 0.00256 * Math.cos(omega * RAD)
  // 太阳赤纬
  const decl = Math.asin(Math.sin(eCorr * RAD) * Math.sin(lambda * RAD)) / RAD
  // 均时差
  const y = Math.tan((eCorr / 2) * RAD) ** 2
  const eqTime = 4 * (
    y * Math.sin(2 * L0 * RAD)
    - 2 * e * Math.sin(Mrad)
    + 4 * e * y * Math.sin(Mrad) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD)
    - 1.25 * e * e * Math.sin(2 * Mrad)
  )

  const latRad = lat * RAD
  const cosH = (Math.cos(ZENITH * RAD) - Math.sin(latRad) * Math.sin(decl * RAD))
    / (Math.cos(latRad) * Math.cos(decl * RAD))

  if (cosH > 1) {
    return { sunrise: date, sunset: date, polarDay: false, polarNight: true }
  }
  if (cosH < -1) {
    return { sunrise: date, sunset: date, polarDay: true, polarNight: false }
  }

  const H = Math.acos(cosH) / RAD
  const sunriseUTC = 720 - 4 * (lng + H) - eqTime
  const sunsetUTC = 720 - 4 * (lng - H) - eqTime

  return {
    sunrise: utcMinutesToDate(sunriseUTC, date),
    sunset: utcMinutesToDate(sunsetUTC, date),
    polarDay: false,
    polarNight: false,
  }
}

/** 当前昼夜相位 */
export function dayPhaseAt(lat: number, lng: number, now = new Date()): DayPhase {
  const t = computeSunTimes(lat, lng, now)
  if (t.polarDay) return 'polar-day'
  if (t.polarNight) return 'polar-night'
  return now < t.sunrise || now >= t.sunset ? 'night' : 'day'
}

/** 是否夜间（含极夜） */
export function isNightAt(lat: number, lng: number, now = new Date()): boolean {
  const phase = dayPhaseAt(lat, lng, now)
  return phase === 'night' || phase === 'polar-night'
}

/** 距离下一次日出/日落切换的分钟数（用于展示倒计时） */
export function minutesUntilTransition(lat: number, lng: number, now = new Date()): number {
  const t = computeSunTimes(lat, lng, now)
  if (t.polarDay || t.polarNight) return 0
  const nowMs = now.getTime()
  const sunriseMs = t.sunrise.getTime()
  const sunsetMs = t.sunset.getTime()
  const next = nowMs < sunriseMs ? sunriseMs : nowMs < sunsetMs ? sunsetMs : sunriseMs + 24 * 3600 * 1000
  return Math.round((next - nowMs) / 60000)
}

// ============================================================
// 自定义时间回退
// ============================================================

/** 解析 HH:mm → 当日分钟数，非法返回 null */
export function parseClockTime(value: string | null | undefined): number | null {
  if (!value) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** 无定位时按自定义时间判断是否夜间 */
export function isNightByCustom(nightStart: string | null, nightEnd: string | null, now = new Date()): boolean {
  const start = parseClockTime(nightStart)
  const end = parseClockTime(nightEnd)
  if (start === null || end === null) return false
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (start <= end) {
    // 同一天内（如 20:00 → 06:00 会走 else 分支；06:00 → 20:00 走此分支）
    return nowMin >= start && nowMin < end
  }
  // 跨午夜（如 20:00 → 06:00）
  return nowMin >= start || nowMin < end
}

// ============================================================
// 日出日落自动启停存储
// ============================================================

export interface SunScheduleState {
  lat: number | null
  lng: number | null
  /** 自动启停是否开启 */
  autoEnabled: boolean
  /** 夜间自动套用的护眼预设 id */
  autoPreset: string
  /** 自定义夜间开始 HH:mm（无定位时回退） */
  customNightStart: string | null
  /** 自定义夜间结束 HH:mm */
  customNightEnd: string | null
}

const SUN_KEY = 'hf:guard:sun_schedule'

const DEFAULT_STATE: SunScheduleState = {
  lat: null,
  lng: null,
  autoEnabled: false,
  autoPreset: 'night',
  customNightStart: null,
  customNightEnd: null,
}

const state = ref<SunScheduleState>({ ...DEFAULT_STATE })

export function useSunSchedule() {
  function load(): void {
    try {
      const s = storage.getKV<Partial<SunScheduleState> | null>(SUN_KEY, null)
      state.value = { ...DEFAULT_STATE, ...(s ?? {}) }
    } catch {
      state.value = { ...DEFAULT_STATE }
    }
  }

  function save(): void {
    storage.setKV(SUN_KEY, state.value)
  }

  function setLocation(lat: number, lng: number): void {
    state.value.lat = lat
    state.value.lng = lng
    save()
  }

  function clearLocation(): void {
    state.value.lat = null
    state.value.lng = null
    save()
  }

  function setAutoEnabled(v: boolean): void {
    state.value.autoEnabled = v
    save()
  }

  function setAutoPreset(id: string): void {
    state.value.autoPreset = id
    save()
  }

  function setCustomTimes(nightStart: string | null, nightEnd: string | null): void {
    state.value.customNightStart = nightStart
    state.value.customNightEnd = nightEnd
    save()
  }

  /** 当前是否应开启护眼（夜间/极夜，或自定义时间区间） */
  function shouldEnableEyeCare(now = new Date()): boolean {
    if (!state.value.autoEnabled) return false
    if (state.value.lat !== null && state.value.lng !== null) {
      return isNightAt(state.value.lat, state.value.lng, now)
    }
    return isNightByCustom(state.value.customNightStart, state.value.customNightEnd, now)
  }

  /** 今日日出日落（无定位返回 null） */
  function todayTimes(now = new Date()): SunTimes | null {
    if (state.value.lat === null || state.value.lng === null) return null
    return computeSunTimes(state.value.lat, state.value.lng, now)
  }

  /** 距下一次切换的分钟数（无定位或极昼极夜返回 0） */
  function minutesToNext(now = new Date()): number {
    if (state.value.lat === null || state.value.lng === null) return 0
    return minutesUntilTransition(state.value.lat, state.value.lng, now)
  }

  return {
    state,
    load,
    save,
    setLocation,
    clearLocation,
    setAutoEnabled,
    setAutoPreset,
    setCustomTimes,
    shouldEnableEyeCare,
    todayTimes,
    minutesToNext,
  }
}
