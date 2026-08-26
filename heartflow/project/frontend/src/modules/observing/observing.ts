// ============================================================
// 时间长廊 · 观星指数观测引擎（P5-7）
// 借鉴「天文通」：观星指数综合评分——综合月相、时段、光害、
// 云况与天象事件，本地离线计算 0-100 指数，守卫宪法第1条。
// 纯函数核心 + 轻量持久化历史，供 ObservingScorePanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 观星指数评分等级 */
export type ObservingRating = 'excellent' | 'good' | 'fair' | 'poor' | 'bad'

/** 单日观测偏好配置 */
export interface ObservingConfig {
  /** 光害等级 0-10（0=极暗乡村，10=城市中心） */
  lightPollution: number
  /** 是否对天象事件加分 */
  boostOnEvents: boolean
}

/** 观测输入的实时环境要素 */
export interface ObservingInput {
  /** 当日 0-24 小时（用于判断时段） */
  hour: number
  /** 月相照亮比例 0-1（0=新月，1=满月） */
  illumination: number
  /** 光害 0-10 */
  lightPollution: number
  /** 云量 0-10（0=晴空） */
  cloud: number
  /** 是否有重大天象（日月食/流星雨峰值等） */
  hasAstroEvent?: boolean
}

/** 各维度得分分解 */
export interface ObservingFactors {
  /** 时段分 0-100 */
  time: number
  /** 月相分 0-100 */
  moon: number
  /** 光害分 0-100 */
  light: number
  /** 云况分 0-100 */
  cloud: number
  /** 天象加成 0-16 */
  eventBonus: number
}

/** 一次完整评分结果 */
export interface ObservingScore {
  /** 综合指数 0-100 */
  total: number
  rating: ObservingRating
  factors: ObservingFactors
  /** 简短建议 */
  tip: string
}

/** 每日历史得分点 */
export interface ObservingDay {
  /** YYYY-MM-DD */
  date: string
  score: number
}

export const OBSERVING_META: Record<ObservingRating, { label: string; color: string; desc: string }> = {
  excellent: { label: '绝佳', color: '#34d399', desc: '罕见的观测夜，银河璀璨' },
  good: { label: '良好', color: '#6b9fc4', desc: '适合观星，可辨星座' },
  fair: { label: '一般', color: '#f0c040', desc: '勉强可看，亮星为主' },
  poor: { label: '较差', color: '#f59e0b', desc: '光害/云况影响明显' },
  bad: { label: '不宜', color: '#ef4444', desc: '不建议本次观测' },
}

export const DEFAULT_OBSERVING_CONFIG: ObservingConfig = {
  lightPollution: 6,
  boostOnEvents: true,
}

const STORAGE_KEY = 'hf:observing_history'

// ============================================================
// 交叉子项评分（纯函数，可单测）
// ============================================================

/** 时段映射：夜间 20:00-04:00 最佳，晨昏次之，白昼最差 */
function timeScore(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  if (h >= 20 || h < 4) return 100
  if (h >= 19 || (h >= 4 && h < 6)) return 60
  if (h === 18 || h === 6) return 32
  return 12
}

/** 月相：月光越暗越利于观星（低照度高分） */
function moonScore(illumination: number): number {
  const i = Math.min(1, Math.max(0, illumination))
  const score = 100 * (1 - i) * 0.9 + 10 // 下限 10 分
  return Math.round(score)
}

/** 光害：越低越好 */
function lightScore(pollution: number): number {
  const p = Math.min(10, Math.max(0, pollution))
  return Math.round(100 * (1 - p / 10))
}

/** 云况：越低越好 */
function cloudScore(cloud: number): number {
  const c = Math.min(10, Math.max(0, cloud))
  return Math.round(100 * (1 - c / 10))
}

/** 由综合得分映射等级 */
export function ratingForScore(score: number): ObservingRating {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 55) return 'fair'
  if (score >= 40) return 'poor'
  return 'bad'
}

/** 短建议文案（按优先级：厚云 → 满月 → 晴空 → 高分 → 兜底） */
export function tipForScore(score: number, factors: ObservingFactors): string {
  if (factors.cloud >= 70) return '云量较多，建议改期。'
  if (factors.moon >= 60) return '月光明朗，适合观月而非深空。'
  if (factors.cloud < 30) return '云层稀薄，能见度高。'
  if (score >= 70) return '夜色澄澈，宜带星图。'
  return '可尝试观察亮星与行星。'
}

/**
 * 核心：综合计算观星指数 0-100。
 * 权重：时段 .30 / 月相 .25 / 光害 .25 / 云况 .20；天象附加加成。
 */
export function computeObservingScore(input: ObservingInput): ObservingScore {
  const time = timeScore(input.hour)
  const moon = moonScore(input.illumination)
  const light = lightScore(input.lightPollution)
  const cloud = cloudScore(input.cloud)
  const eventBonus = input.hasAstroEvent ? 8 : 0

  const factors: ObservingFactors = {
    time,
    moon,
    light,
    cloud,
    eventBonus,
  }

  const base =
    time * 0.30 +
    moon * 0.25 +
    light * 0.25 +
    cloud * 0.20

  const total = Math.round(Math.min(100, base + eventBonus))
  return {
    total,
    rating: ratingForScore(total),
    factors,
    tip: tipForScore(total, factors),
  }
}

// ============================================================
// 观测配置 + 每日历史（持久化）
// ============================================================

function loadHistory(): ObservingDay[] {
  try {
    return storage.getKV<ObservingDay[]>(STORAGE_KEY, [])
  } catch {
    return []
  }
}

function localKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 观测引擎组合 API */
export function useObserving() {
  const config = ref<ObservingConfig>(loadConfig())
  const history = ref<ObservingDay[]>(loadHistory())

  function loadConfig(): ObservingConfig {
    try {
      return { ...DEFAULT_OBSERVING_CONFIG, ...storage.getKV<Partial<ObservingConfig>>('hf:observing_config', {}) }
    } catch {
      return { ...DEFAULT_OBSERVING_CONFIG }
    }
  }

  function saveConfig(): void {
    storage.setKV('hf:observing_config', config.value)
  }

  function persistHistory(): void {
    storage.setKV(STORAGE_KEY, history.value)
  }

  /** 依据今日环境获得今日评分（并将结果写入历史） */
  function scoreToday(
    env: { hour?: number; illumination?: number; cloud?: number; hasAstroEvent?: boolean } = {},
  ): ObservingScore {
    const now = new Date()
    const input: ObservingInput = {
      hour: env.hour ?? now.getHours(),
      illumination: env.illumination ?? 0.2,
      lightPollution: config.value.lightPollution,
      cloud: env.cloud ?? 0,
      hasAstroEvent: env.hasAstroEvent,
    }
    const score = computeObservingScore(input)
    upsertDay(localKey(now), score.total)
    return score
  }

  /** 记录某日得分 */
  function upsertDay(date: string, score: number): void {
    const idx = history.value.findIndex(d => d.date === date)
    if (idx >= 0) history.value[idx] = { date, score }
    else history.value.push({ date, score })
    history.value.sort((a, b) => a.date.localeCompare(b.date))
    // 仅保留最近 30 天
    if (history.value.length > 30) history.value = history.value.slice(-30)
    persistHistory()
  }

  /** 最近 n 天趋势（倒序：最新的在前） */
  function recentTrend(days = 7): ObservingDay[] {
    return history.value.slice(-days).reverse()
  }

  /** 最近 n 天平均 */
  const average = computed(() => {
    if (history.value.length === 0) return 0
    const win = history.value.slice(-7)
    return Math.round(win.reduce((s, d) => s + d.score, 0) / win.length)
  })

  function setLightPollution(p: number): void {
    config.value.lightPollution = Math.min(10, Math.max(0, Math.round(p)))
    saveConfig()
  }

  function patch(p: Partial<ObservingConfig>): void {
    Object.assign(config.value, p)
    saveConfig()
  }

  function clearHistory(): void {
    history.value = []
    persistHistory()
  }

  return {
    config: computed(() => config.value),
    history: computed(() => history.value),
    average,
    scoreToday,
    upsertDay,
    recentTrend,
    ratingForScore,
    setLightPollution,
    patch,
    clearHistory,
  }
}