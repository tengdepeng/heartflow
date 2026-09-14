// ============================================================
// 守护室 · 用眼休息调度（20-20-20 主动提醒 / 屏幕用眼节律）
// ------------------------------------------------------------
// 借鉴「夜间模式/暮光」的用眼休息：每专注 X 分钟（默认 20）提醒
// 起身眺望 6 米外 20 秒。基于上次休息时刻的连续日程——
// lastRestAt 跨回访持久化，故休息节奏是全天真连续而非仅本次专注。
// 守宪法第1条：仅温和引导、绝不打扰推送（不弹强提示，只驻留气泡）。
// 纯函数核心（可单测）+ 轻量持久化，供 EyeBreakSchedulerPanel 渲染。
// ============================================================

import { ref, computed, onScopeDispose } from 'vue'
import { storage } from '../../engine/storage'
import { useEyeShield } from './eye-shield'

// ============================================================
// 类型与常量
// ============================================================

/** 休息事件类型：真正休息 / 稍后五分钟 */
export type BreakKind = 'rest' | 'defer'

/** 一条用眼休息记录 */
export interface EyeBreakRecord {
  id: string
  at: number
  kind: BreakKind
}

export const EYE_BREAK_LOGS_KEY = 'hf:eye_break_logs'
export const EYE_BREAK_LAST_REST_KEY = 'hf:eye_break_last_rest'
/** 稍后五分钟的阈值 */
export const DEFER_MINUTES = 5

function nextId(): string {
  return 'eb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ============================================================
// 纯函数核心
// ============================================================

/** 距下一次休息的时刻（breakMinutes<=0 视为已关闭，返回 Infinity） */
export function nextRestAt(lastRestAtMs: number, breakMinutes: number, DEFER = 0): number {
  if (breakMinutes <= 0) return Number.POSITIVE_INFINITY
  return lastRestAtMs + breakMinutes * 60_000 + DEFER
}

/** 距下一次休息剩余秒数（>=0，向下取整；关闭时 null） */
export function secondsUntilRest(lastRestAtMs: number, breakMinutes: number, nowMs: number): number | null {
  if (breakMinutes <= 0) return null
  const next = nextRestAt(lastRestAtMs, breakMinutes)
  return Math.max(0, Math.ceil((next - nowMs) / 1000))
}

/** 是否已到休息点（breakMinutes<=0 恒 false） */
export function isBreakDue(lastRestAtMs: number, breakMinutes: number, nowMs: number): boolean {
  return breakMinutes > 0 && nowMs >= nextRestAt(lastRestAtMs, breakMinutes)
}

/** 取某日起始时刻（本地零点毫秒） */
export function startOfDayAt(nowMs: number): number {
  const d = new Date(nowMs)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** 当日休息记录（按 at 升序） */
export function todayRecords(records: EyeBreakRecord[], nowMs: number): EyeBreakRecord[] {
  const start = startOfDayAt(nowMs)
  const end = start + 86_400_000
  return records
    .filter((r) => r.at >= start && r.at < end)
    .sort((a, b) => a.at - b.at)
}

export interface EyeBreakStats {
  total: number
  rests: number
  defers: number
  lastRestAt: number | null
}

/** 当日用眼节律概览 */
export function eyeBreakStats(records: EyeBreakRecord[], nowMs: number): EyeBreakStats {
  const t = todayRecords(records, nowMs)
  return {
    total: t.length,
    rests: t.filter((r) => r.kind === 'rest').length,
    defers: t.filter((r) => r.kind === 'defer').length,
    lastRestAt: t.length ? t[t.length - 1].at : null,
  }
}

/** 人性化倒计时文案（"0:38" / "03:20"），超过一小时显示 "61:00" */
export function formatCountdown(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '——'
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const rest = s % 60
  return `${m}:${String(rest).padStart(2, '0')}`
}

// ============================================================
// 组合 API（持久化 + 计时）
// ============================================================

function loadLastRest(): number {
  const v = storage.getKV<number>(EYE_BREAK_LAST_REST_KEY, 0)
  return typeof v === 'number' && v > 0 ? v : Date.now()
}

function loadRecords(): EyeBreakRecord[] {
  try {
    const v = storage.getKV<EyeBreakRecord[]>(EYE_BREAK_LOGS_KEY, [])
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function useEyeBreakScheduler() {
  const shield = useEyeShield()
  const breakMinutes = computed(() => shield.config.value.eyeBreakMinutes)

  const lastRestAt = ref<number>(loadLastRest())
  const records = ref<EyeBreakRecord[]>(loadRecords())
  const nowMs = ref(Date.now())
  const running = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null

  function clearTimer(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function start(): void {
    if (running.value) return
    running.value = true
    nowMs.value = Date.now()
    clearTimer()
    timer = setInterval(() => {
      nowMs.value = Date.now()
    }, 1000)
  }

  function stop(): void {
    running.value = false
    nowMs.value = Date.now()
    clearTimer()
  }

  const due = computed(() => isBreakDue(lastRestAt.value, breakMinutes.value, nowMs.value))
  const secondsLeft = computed(() => secondsUntilRest(lastRestAt.value, breakMinutes.value, nowMs.value))
  const stats = computed(() => eyeBreakStats(records.value, nowMs.value))

  /** 真正休息：记录 + 重置节奏 */
  function takeBreak(): void {
    const now = Date.now()
    pushRecord({ id: nextId(), at: now, kind: 'rest' })
    lastRestAt.value = now
    storage.setKV(EYE_BREAK_LAST_REST_KEY, now)
    nowMs.value = now
    start()
  }

  /** 稍后再休：记一条 defer，节奏顺延 DEFER_MINUTES */
  function deferBreak(): void {
    const now = Date.now()
    pushRecord({ id: nextId(), at: now, kind: 'defer' })
    lastRestAt.value = now + DEFER_MINUTES * 60_000
    storage.setKV(EYE_BREAK_LAST_REST_KEY, lastRestAt.value)
    nowMs.value = now
    start()
  }

  function pushRecord(r: EyeBreakRecord): void {
    records.value = [...records.value, r]
    storage.setKV(EYE_BREAK_LOGS_KEY, records.value)
  }

  onScopeDispose(clearTimer)

  return {
    breakMinutes,
    running,
    due,
    secondsLeft,
    stats,
    start,
    stop,
    takeBreak,
    deferBreak,
  }
}