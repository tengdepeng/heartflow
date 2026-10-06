// ============================================================
// 感知层 · 本地注意力 / 数字健康模型（#84 应用空间+感知层 本地感知壳）
//
// 背景：系统级 UsageStats / Health-Connect 信号在本应用（web / Tauri webview）
// 内默认不可用，且属于"沉默的默认"应关闭的采集项。为补全蓝图「应用空间 + 感知层」
// 中关于"本地用量 / 注意力 / 数字健康"的空白，本模块提供一个**纯函数、确定性、
// 离线**的本地注意力量化模型：
//   - 不调用任何系统级用量 API；
//   - 仅以"本应用内可观测信号"（感知层 EnvironmentState + 应用空间访问 + 专注/休息）
//     作为本地近似输入；
//   - 输出可解释、可复现（无随机 / 网络）的注意力 / 数字健康报告；
//   - 通过 attentionToBodyWisdomSignal() 单向暴露"感知 → 藏象阁"的只读信号，
//     不反向依赖 body-wisdom 模块，保持依赖方向稳定。
//
// 宪法约束：
//   - 第1条「本地私有」：输入与结果均仅存本地；
//   - 第4条「只是呈现，不评判」：仅给出事实性提示，不做价值评判；
//   - 第52条「沉默的默认」：attention 采集项默认关闭，由 compliance 统一管理。
// ============================================================

import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { EnvironmentState } from '../perception'

// ---- 输入 ----

/** 本地注意力模型的确定性输入（可由感知层 + 应用内信号构建） */
export interface AttentionInput {
  /** 应用内导航 / 访问次数（当天，本地近似"使用量"） */
  navigationCount: number
  /** 估算的专注分钟数（当天，0 表示未知） */
  focusMinutes: number
  /** 当前连续闲置分钟数（由 deviceIdleMs 折算） */
  idleMinutes: number
  /** 屏幕是否常亮（可见） */
  screenAwake: boolean
  /** 是否处于深夜时段（23:00–05:00），影响作息节律对齐 */
  isLateNight: boolean
  /** 是否有"前台窗口"信号（感知层已开启 activeWindow 权限） */
  activeWindowKnown: boolean
  /** 统计日期（YYYY-MM-DD） */
  dateStr: string
}

// ---- 输出 ----

export type AttentionLevel = '沉寂' | '平稳' | '专注' | '沉浸'

/** 感知 → 藏象阁 的只读信号 */
export interface AttentionSignal {
  /** 信号键（藏象阁可读） */
  key: '神志' | '作息' | '用度'
  /** 一句话摘要（事实性，不评判） */
  summary: string
  /** 强度 0-100（仅方向性） */
  intensity: number
}

/** 本地注意力 / 数字健康报告 */
export interface AttentionReport {
  /** 综合注意力得分 0-100 */
  score: number
  /** 等级 */
  level: AttentionLevel
  /** 专注占比估算 0-100 */
  focusRatio: number
  /** 数字健康指数 0-100（越高越舒展） */
  wellbeingIndex: number
  /** 疲劳信号 0-100（越高越疲惫） */
  fatigueSignal: number
  /** 作息节律对齐度 0-100 */
  rhythmAlignment: number
  /** 数据驱动提示（确定性，无随机） */
  signals: string[]
  /** 数据来源说明（透明化本地估算） */
  sourceNote: string
  /** 统计日期 */
  dateStr: string
}

// ---- 持久化 ----

export const ATTENTION_STORAGE_KEY = 'hf:attention:samples_v1'

/** 每日注意力样本（用于趋势回看） */
export interface AttentionSample {
  dateStr: string
  report: AttentionReport
}

// ---- 工具 ----

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

// ============================================================
// 核心：纯函数评估（确定性、离线、无随机）
// ============================================================

/**
 * 由本地近似输入评估注意力 / 数字健康报告。
 * 纯函数：相同输入恒得相同输出，便于单测与降级渲染。
 */
export function evaluateAttention(input: AttentionInput): AttentionReport {
  const nav = Math.max(0, Math.floor(input.navigationCount || 0))
  const focus = Math.max(0, Math.floor(input.focusMinutes || 0))
  const idle = Math.max(0, Math.floor(input.idleMinutes || 0))

  // 注意力得分：导航量（轻量参与）与专注时长共同决定，封顶。
  const navScore = Math.min(nav, 12) * 3                // 0..36
  const focusScore = (Math.min(focus, 120) / 120) * 50  // 0..50
  const attention = clamp(navScore + focusScore + 14)   // 基线 14

  // 专注占比：专注分钟相对"导航+专注"的占比（无专注数据时给中性值 50）。
  const focusRatio = focus > 0
    ? clamp(Math.round((focus / (focus + nav * 3 + 1)) * 100))
    : 50

  // 数字健康指数：屏幕可见 + 非深夜 + 适度导航 → 高；深夜 / 过度使用 / 长闲置 → 低。
  let wellbeing = 60
  if (input.screenAwake) wellbeing += 12
  if (!input.isLateNight) wellbeing += 16
  if (nav > 0 && nav <= 20) wellbeing += 10
  if (nav > 40) wellbeing -= 14
  if (idle > 30) wellbeing -= 10
  wellbeing = clamp(wellbeing)

  // 疲劳信号：深夜高、专注过久、屏幕常亮久、长时间闲置都升高。
  let fatigue = 10
  if (input.isLateNight) fatigue += 40
  if (focus > 90) fatigue += 20
  if (idle > 45) fatigue += 18
  if (input.screenAwake && input.isLateNight) fatigue += 12
  fatigue = clamp(fatigue)

  // 作息节律对齐：非深夜 + 有使用规律（nav>0）→ 高；深夜使用拉低。
  let rhythm = 55
  if (!input.isLateNight) rhythm += 30
  if (nav > 0) rhythm += 10
  if (input.isLateNight) rhythm -= 35
  rhythm = clamp(rhythm)

  const level: AttentionLevel =
    attention >= 80 ? '沉浸' : attention >= 60 ? '专注' : attention >= 40 ? '平稳' : '沉寂'

  const signals: string[] = []
  if (focus > 60) signals.push(`今日已有约 ${Math.round(focus)} 分钟专注投入。`)
  if (input.isLateNight) signals.push('检测到深夜使用，注意安排休息。')
  if (idle > 30) signals.push(`已静置约 ${Math.round(idle)} 分钟，可起身活动。`)
  if (nav > 40) signals.push('今日应用内跳转较多，留意是否被打散。')
  if (wellbeing >= 80) signals.push('整体数字状态舒展。')
  if (signals.length === 0) signals.push('信号平稳，暂无特别提示。')

  return {
    score: Math.round(attention),
    level,
    focusRatio,
    wellbeingIndex: Math.round(wellbeing),
    fatigueSignal: Math.round(fatigue),
    rhythmAlignment: Math.round(rhythm),
    signals,
    sourceNote: '本地估算 · 非系统级用量统计（UsageStats / Health-Connect 不可用）',
    dateStr: input.dateStr,
  }
}

// ============================================================
// 由感知层 + 应用内信号构建输入
// ============================================================

/**
 * 由感知层 EnvironmentState + 应用内本地信号构建 AttentionInput。
 * 纯函数；无系统级用量依赖，仅用"应用内可观测"近似。
 */
export function buildLocalAttentionInput(
  env: EnvironmentState,
  local: { navigationCount: number; focusMinutes: number; dateStr?: string },
): AttentionInput {
  const dateStr = local.dateStr ?? getLocalDateKey()
  return {
    navigationCount: Math.max(0, Math.floor(local.navigationCount || 0)),
    focusMinutes: Math.max(0, Math.floor(local.focusMinutes || 0)),
    idleMinutes: Math.max(0, Math.floor((env.deviceIdleMs || 0) / 60000)),
    screenAwake: env.isScreenAwake,
    isLateNight: env.hour >= 23 || env.hour < 5,
    activeWindowKnown: env.activeApp != null,
    dateStr,
  }
}

/** 便捷：直接由感知层 + 本地信号派生报告 */
export function deriveAttentionReport(
  env: EnvironmentState,
  local: { navigationCount: number; focusMinutes: number; dateStr?: string },
): AttentionReport {
  return evaluateAttention(buildLocalAttentionInput(env, local))
}

// ============================================================
// 持久化（本地，仅存趋势摘要）
// ============================================================

/** 写入 / 覆盖某日样本（保留最近 90 天） */
export function recordAttentionSample(report: AttentionReport): AttentionSample {
  const samples = loadAttentionSamples()
  const idx = samples.findIndex(s => s.dateStr === report.dateStr)
  const sample: AttentionSample = { dateStr: report.dateStr, report }
  if (idx >= 0) samples[idx] = sample
  else samples.push(sample)
  const trimmed = samples.slice(-90)
  storage.setKV(ATTENTION_STORAGE_KEY, trimmed)
  return sample
}

/** 读取全部样本 */
export function loadAttentionSamples(): AttentionSample[] {
  return storage.getKV<AttentionSample[]>(ATTENTION_STORAGE_KEY, [])
}

/** 清空样本 */
export function clearAttentionSamples(): void {
  storage.setKV(ATTENTION_STORAGE_KEY, [])
}

// ============================================================
// 只读桥接：感知 → 藏象阁（单向，不反向依赖 body-wisdom）
// ============================================================

/**
 * 由注意力报告派生"感知 → 藏象阁"的只读信号。
 * 藏象阁可读取此信号做温和呈现，但本模块不依赖 body-wisdom，
 * 保证依赖方向稳定（perception/attention → body-wisdom 可读）。
 */
export function attentionToBodyWisdomSignal(report: AttentionReport): AttentionSignal[] {
  const out: AttentionSignal[] = []

  // 神志：疲劳偏高 → 提点心神安定（仅方向性，不评判）。
  if (report.fatigueSignal >= 55) {
    out.push({
      key: '神志',
      summary: `疲劳信号偏高（${report.fatigueSignal}），留意心神安定。`,
      intensity: clamp(report.fatigueSignal),
    })
  }

  // 作息：节律对齐偏低 → 提点起居节律（仅方向性）。
  if (report.rhythmAlignment < 50) {
    out.push({
      key: '作息',
      summary: `作息节律对齐度偏低（${report.rhythmAlignment}），注意起居节律。`,
      intensity: clamp(100 - report.rhythmAlignment),
    })
  }

  // 用度：今日投入度的方向性参考（始终给出，供藏象阁按需取用）。
  out.push({
    key: '用度',
    summary: `今日应用内投入度 ${report.score}，方向性参考。`,
    intensity: clamp(report.score),
  })

  return out
}
