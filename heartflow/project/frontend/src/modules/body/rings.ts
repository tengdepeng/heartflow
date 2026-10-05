// ============================================================
// 身体温室 · 三环（活动 / 休息 / 感受）
// 蓝图模块15：状态导向三环，拒绝目标评分 / 穿戴依赖 / 健康建议。
// 用离散档位表达"今天的状态"，而非 0-100 分数（与 greenhouseState 的
// bodyScore 评分设计相反，故独立成环，不污染原有评分）。
// ============================================================

import { ref, computed } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import { storage } from '../../engine/storage'

/** 环档位：0=空白 1=微动 2=舒展 3=充盈 4=盈满（状态描述，非评分） */
export type RingTier = 0 | 1 | 2 | 3 | 4

/** 单环快照 */
export interface RingSnapshot {
  /** 当前档位 */
  level: RingTier
  /** 档位文案 */
  label: string
  /** 今日累计输入（活动=分钟 / 休息=分钟 / 感受=档位本身） */
  todayValue: number
  /** 近 7 天档位序列（长期趋势） */
  trend: number[]
}

/** 单日三环日志 */
export interface DailyRingLog {
  date: string // YYYY-MM-DD
  activityMinutes: number
  restMinutes: number
  feeling: RingTier | null
}

/** 三环状态（仅存历史日志，环档位由日志实时推导） */
export interface BodyRingState {
  history: DailyRingLog[]
  updatedAt: string
}

const RING_KEY = 'hf:body:rings'
const HISTORY_DAYS = 30

// 活动 / 休息：分钟阈值对应档位 1..4（>= 阈值即升至该档）
const ACTIVITY_THRESHOLDS = [0, 15, 30, 60, 120]
const REST_THRESHOLDS = [0, 30, 60, 120, 240]
export const TIER_LABELS = ['空白', '微动', '舒展', '充盈', '盈满']

function emptyState(): BodyRingState {
  return { history: [], updatedAt: '' }
}

function load(): BodyRingState {
  try {
    const v = storage.getKV<BodyRingState>(RING_KEY, emptyState())
    return v && Array.isArray(v.history) ? v : emptyState()
  } catch {
    return emptyState()
  }
}

function save() {
  storage.setKV(RING_KEY, state.value)
}

/** 只读返回历史日志（供时间线等跨模块聚合，不入写入路径，返回防御性副本） */
export function getBodyRingLogs(): DailyRingLog[] {
  return load().history.map(h => ({ ...h }))
}

const state = ref<BodyRingState>(load())

function todayStr(): string {
  return getLocalDateKey()
}

/** 读取今日日志（不修改状态，供计算属性使用） */
function getToday(): DailyRingLog {
  const existing = state.value.history.find(h => h.date === todayStr())
  return existing ?? { date: todayStr(), activityMinutes: 0, restMinutes: 0, feeling: null }
}

/** 确保今日日志存在（供写入动作调用，可能追加新日志并裁剪过期历史） */
function ensureToday(): DailyRingLog {
  let log = state.value.history.find(h => h.date === todayStr())
  if (!log) {
    log = { date: todayStr(), activityMinutes: 0, restMinutes: 0, feeling: null }
    state.value.history = [...state.value.history, log]
  }
  const cutoff = getLocalDateKey(new Date(Date.now() - HISTORY_DAYS * 86400000))
  state.value.history = state.value.history.filter(h => h.date >= cutoff)
  return log
}

/** 按阈值把累计值映射为离散档位 */
function tierFromValue(value: number, thresholds: number[]): RingTier {
  let t: RingTier = 0
  for (let i = 1; i < thresholds.length; i++) {
    if (value >= thresholds[i]) t = i as RingTier
  }
  return t
}

/** 近 7 天档位序列（长期趋势），不足 7 天以前导 0 补齐 */
function trendFor(field: 'activityMinutes' | 'restMinutes' | 'feeling'): number[] {
  const weekAgo = getLocalDateKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const recent = state.value.history
    .filter(h => h.date >= weekAgo)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-7)
  const raw = recent.map(h => {
    if (field === 'feeling') return h.feeling ?? 0
    return tierFromValue(h[field], field === 'activityMinutes' ? ACTIVITY_THRESHOLDS : REST_THRESHOLDS)
  })
  while (raw.length < 7) raw.unshift(0)
  return raw
}

export function useBodyRings() {
  /** 记录今日活动分钟（累加） */
  function logActivity(minutes: number) {
    const log = ensureToday()
    log.activityMinutes += Math.max(0, Math.round(minutes))
    state.value = { ...state.value, updatedAt: new Date().toISOString() }
    save()
  }

  /** 记录今日休息分钟（累加） */
  function logRest(minutes: number) {
    const log = ensureToday()
    log.restMinutes += Math.max(0, Math.round(minutes))
    state.value = { ...state.value, updatedAt: new Date().toISOString() }
    save()
  }

  /** 设置今日感受档位（主观状态，非数值） */
  function setFeeling(tier: RingTier) {
    const log = ensureToday()
    log.feeling = tier
    state.value = { ...state.value, updatedAt: new Date().toISOString() }
    save()
  }

  const activityRing = computed<RingSnapshot>(() => {
    const log = getToday()
    const level = tierFromValue(log.activityMinutes, ACTIVITY_THRESHOLDS)
    return { level, label: TIER_LABELS[level], todayValue: log.activityMinutes, trend: trendFor('activityMinutes') }
  })

  const restRing = computed<RingSnapshot>(() => {
    const log = getToday()
    const level = tierFromValue(log.restMinutes, REST_THRESHOLDS)
    return { level, label: TIER_LABELS[level], todayValue: log.restMinutes, trend: trendFor('restMinutes') }
  })

  const feelingRing = computed<RingSnapshot>(() => {
    const log = getToday()
    const level = (log.feeling ?? 0) as RingTier
    return { level, label: TIER_LABELS[level], todayValue: level, trend: trendFor('feeling') }
  })

  return {
    state,
    activityRing,
    restRing,
    feelingRing,
    logActivity,
    logRest,
    setFeeling,
  }
}
