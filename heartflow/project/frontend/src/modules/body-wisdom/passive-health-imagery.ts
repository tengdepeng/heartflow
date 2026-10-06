// ============================================================
// 藏象阁 · 被动健康意象数据源（#86）
//
// 背景：藏象阁当前仅有「手动输入 + 静态时辰文案」，缺少一个被动、
// 自动聚合的本地健康意象来源。为补全蓝图「藏象阁 · 被动健康意象」，
// 本模块提供**纯函数、确定性、离线**的被动意象推导：
//   - 不调用任何系统级健康 API / 传感器；
//   - 仅以本地已存的 body_logs（睡眠/运动/饮食）与 meridianLogs 为输入；
//   - 输出与感知层 AttentionSignal 同构的 IHealthImagerySignal[]；
//   - 中性、不评判、不给结论、不给评分，仅呈现事实性意象；
//   - 无数据时给出确定性「时辰」中性占位（非随机、不编造健康结论）；
//   - 单向：仅依赖 ./types（同模块），不反向依赖 attention / 视图。
//
// 宪法约束：
//   - 第1条「本地私有」：输入与结果均仅存本地；
//   - 第4条「只给原材料不给结论」：不输出建议/诊断/评估；
//   - 第8条「中性呈现」：仅事实性描述，无价值评判。
// ============================================================

import { getLocalDateKey } from '../../utils/time'
import { MERIDIAN_HOURS } from './types'

// ---- 输入 ----

/** 被动意象的本地日志输入（与 store 中 BodyLog 同构，id 可选以放宽要求） */
export interface IPassiveBodyLog {
  id?: string
  type: 'sleep' | 'exercise' | 'meal' | 'cycle'
  value: Record<string, any>
  at: string
}

/** 被动意象的本地经络输入（与 store 中 MeridianLog 同构） */
export interface IPassiveMeridianLog {
  hour: number
  feeling: string
  at: string
  date?: string
}

export interface IPassiveHealthImageryInput {
  bodyLogs?: IPassiveBodyLog[]
  meridianLogs?: IPassiveMeridianLog[]
  /** 统计基准日期（YYYY-MM-DD）；缺省取今天 */
  dateStr?: string
}

// ---- 输出 ----

/** 与感知层 AttentionSignal 同构的「藏象阁被动意象」信号 */
export interface IHealthImagerySignal {
  /** 信号键（藏象阁可读，如 睡眠 / 运动 / 饮食 / 经络 / 时辰） */
  key: string
  /** 一句话摘要（事实性，中性，不评判） */
  summary: string
  /** 强度 0-100（仅方向性，非评分） */
  intensity: number
  /** 数据来源说明（透明化本地估算） */
  source: 'local-logs' | 'meridian' | 'neutral-placeholder'
}

// ---- 工具 ----

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function todayStr(dateStr?: string): string {
  return dateStr ?? getLocalDateKey()
}

/** 返回 base 日期往前 days 天的 ISO 时间戳（用于近 N 天窗口） */
function daysAgoISO(days: number, base: string): string {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/** 由小时定位当前当令经络（子午流注，覆盖跨日窗口） */
function currentMeridian(hour: number) {
  const h = ((hour % 24) + 24) % 24
  if (h === 0) return MERIDIAN_HOURS.find(m => m.hour === 23) ?? MERIDIAN_HOURS[0]
  return MERIDIAN_HOURS.find(m => h >= m.hour && h < m.hour + 2) ?? MERIDIAN_HOURS[0]
}

// ---- 聚合 ----

interface IAggregates {
  sleepAvg: number | null
  sleepCount: number
  exerciseMinutes: number // 近 7 天
  mealCount: number       // 近 7 天
  meridianGood: number
  meridianOk: number
  meridianBad: number
  hasData: boolean
}

function aggregate(input: IPassiveHealthImageryInput, base: string): IAggregates {
  const bodyLogs = input.bodyLogs ?? []
  const meridianLogs = input.meridianLogs ?? []
  const weekStart = daysAgoISO(7, base)

  const sleep = bodyLogs.filter(l => l.type === 'sleep')
  const sleepAvg = sleep.length
    ? sleep.reduce((s, l) => s + (Number(l.value?.hours) || 0), 0) / sleep.length
    : null

  const exerciseMinutes = bodyLogs
    .filter(l => l.type === 'exercise' && new Date(l.at) >= new Date(weekStart))
    .reduce((s, l) => s + (Number(l.value?.minutes) || 0), 0)

  const mealCount = bodyLogs
    .filter(l => l.type === 'meal' && new Date(l.at) >= new Date(weekStart))
    .length

  let good = 0, ok = 0, bad = 0
  for (const m of meridianLogs) {
    if (m.feeling === 'good') good++
    else if (m.feeling === 'ok') ok++
    else if (m.feeling === 'bad') bad++
  }

  const hasData =
    sleep.length > 0 || exerciseMinutes > 0 || mealCount > 0 || meridianLogs.length > 0

  return {
    sleepAvg,
    sleepCount: sleep.length,
    exerciseMinutes,
    mealCount,
    meridianGood: good,
    meridianOk: ok,
    meridianBad: bad,
    hasData,
  }
}

// ---- 强度映射（方向性，非评分；中位 ~70，向两端平滑降低） ----

/** 睡眠：约 7.5h 为舒展参照，每偏离 1h 减约 12 点 */
function sleepIntensity(avg: number): number {
  return clamp(70 - Math.abs(avg - 7.5) * 12)
}

/** 运动：近 7 天 210 分钟为舒展参照，封顶 */
function exerciseIntensity(min: number): number {
  return clamp(Math.round((Math.min(min, 210) / 210) * 100))
}

/** 饮食：近 7 天 21 条（日均 3）为舒展参照，封顶 */
function mealIntensity(count: number): number {
  return clamp(Math.round((Math.min(count, 21) / 21) * 100))
}

/** 经络：良好率决定方向，不评判 */
function meridianIntensity(good: number, ok: number, bad: number): number {
  const total = good + ok + bad
  if (total === 0) return 50
  return clamp(Math.round((good / total) * 100))
}

// ---- 主体 ----

/**
 * 由本地已存数据推导「藏象阁被动健康意象」信号（纯函数）。
 * 确定性、离线、无随机；遇到异常输入返回中性占位，永不抛出。
 *
 * 行为：
 *   - 有本地数据 → 聚合睡眠/运动/饮食/经络，输出对应意象信号；
 *   - 完全无数据 → 返回确定性「时辰」中性占位（不编造健康结论）。
 */
export function derivePassiveHealthImagery(
  input: IPassiveHealthImageryInput = {},
): IHealthImagerySignal[] {
  const base = todayStr(input.dateStr)
  let agg: IAggregates
  try {
    agg = aggregate(input, base)
  } catch {
    return [placeholderSignal(base)]
  }

  // 无任何被动数据：确定性时辰中性占位（不编造健康结论）。
  if (!agg.hasData) return [placeholderSignal(base)]

  const out: IHealthImagerySignal[] = []

  if (agg.sleepAvg !== null) {
    out.push({
      key: '睡眠',
      summary: `近 ${agg.sleepCount} 条睡眠记录，平均约 ${agg.sleepAvg.toFixed(1)} 小时。`,
      intensity: sleepIntensity(agg.sleepAvg),
      source: 'local-logs',
    })
  }

  if (agg.exerciseMinutes > 0) {
    out.push({
      key: '运动',
      summary: `近 7 天记录到运动约 ${agg.exerciseMinutes} 分钟。`,
      intensity: exerciseIntensity(agg.exerciseMinutes),
      source: 'local-logs',
    })
  }

  if (agg.mealCount > 0) {
    out.push({
      key: '饮食',
      summary: `近 7 天记录到 ${agg.mealCount} 条饮食记录。`,
      intensity: mealIntensity(agg.mealCount),
      source: 'local-logs',
    })
  }

  const merTotal = agg.meridianGood + agg.meridianOk + agg.meridianBad
  if (merTotal > 0) {
    const summary = agg.meridianBad > 0
      ? `经络感受记录 ${merTotal} 条，其中不适 ${agg.meridianBad} 条（${agg.meridianGood} 平和 / ${agg.meridianOk} 一般）。`
      : `经络感受记录 ${merTotal} 条，以平和为多（${agg.meridianGood} 平和 / ${agg.meridianOk} 一般）。`
    out.push({
      key: '经络',
      summary,
      intensity: meridianIntensity(agg.meridianGood, agg.meridianOk, agg.meridianBad),
      source: 'meridian',
    })
  }

  return out
}

// ---- 确定性时辰中性占位 ----

function placeholderSignal(base: string): IHealthImagerySignal {
  const isToday = base === getLocalDateKey()
  const hour = isToday ? new Date().getHours() : 12
  const organ = currentMeridian(hour).organ
  return {
    key: '时辰',
    summary: `当前 ${organ} 经当令，顺应时辰静养即可。`,
    intensity: 50,
    source: 'neutral-placeholder',
  }
}
