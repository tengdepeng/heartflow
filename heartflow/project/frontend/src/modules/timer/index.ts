// ============================================================
// 计时模块 · 模块入口
// 聚合引擎、存储、统计，提供模块级公共 API
// ============================================================

import type { FocusSession, FocusMode, TimerConfig } from '../../types'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

// ---- 重新导出引擎函数（让外部统一从模块层引用） ----

export {
  createSession,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  interruptSession,
  calcProgress,
  formatTimerClock,
} from '../../engine/timer'

// ---- 类型重导出 ----

export type { FocusSession, FocusMode, TimerConfig }

// ---- 定时器默认配置 ----

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  defaultDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStart: false,
}

/** 校验 TimerConfig 合法性，返回修正后的配置 */
export function validateTimerConfig(config: Partial<TimerConfig>): TimerConfig {
  return {
    defaultDuration: Math.max(1, Math.min(999, config.defaultDuration ?? DEFAULT_TIMER_CONFIG.defaultDuration)),
    breakDuration: Math.max(1, Math.min(999, config.breakDuration ?? DEFAULT_TIMER_CONFIG.breakDuration)),
    longBreakDuration: Math.max(1, Math.min(999, config.longBreakDuration ?? DEFAULT_TIMER_CONFIG.longBreakDuration)),
    sessionsBeforeLongBreak: Math.max(1, Math.min(99, config.sessionsBeforeLongBreak ?? DEFAULT_TIMER_CONFIG.sessionsBeforeLongBreak)),
    autoStart: config.autoStart ?? DEFAULT_TIMER_CONFIG.autoStart,
  }
}

// ---- 日期间隔工具（内部） ----

function getDateStr(date?: Date): string {
  return getLocalDateKey(date)
}

// ---- 会话查询 ----

/** 获取所有会话（按 completedAt 倒序） */
export function getAllSessions(): FocusSession[] {
  return [...storage.getSessions()].sort((a, b) => {
    const ta = a.completedAt ?? a.startedAt ?? ''
    const tb = b.completedAt ?? b.startedAt ?? ''
    return tb.localeCompare(ta)
  })
}

/** 按日期范围查询会话 */
export function getSessionsByDateRange(startDate: string, endDate: string): FocusSession[] {
  return storage.getSessions().filter(s => {
    const t = s.completedAt ?? s.startedAt
    if (!t) return false
    const d = getLocalDateKey(new Date(t))
    return d >= startDate && d <= endDate
  })
}

/** 获取指定日期的会话 */
export function getSessionsByDate(date?: string): FocusSession[] {
  const target = date ?? getDateStr()
  return storage.getSessions().filter(s => {
    const t = s.completedAt ?? s.startedAt
    return t?.startsWith(target) ?? false
  })
}

/** 获取今日会话 */
export function getTodaySessions(): FocusSession[] {
  return getSessionsByDate()
}

/** 获取指定状态的会话 */
export function getSessionsByStatus(status: FocusSession['status']): FocusSession[] {
  return storage.getSessions().filter(s => s.status === status)
}

/** 获取指定模式的会话 */
export function getSessionsByMode(mode: FocusMode): FocusSession[] {
  return storage.getSessions().filter(s => s.mode === mode)
}

/** 获取最近 N 条已完成会话 */
export function getRecentCompletedSessions(limit = storage.getConfig().display.statsWindowDays): FocusSession[] {
  return storage.getSessions()
    .filter(s => s.status === 'completed')
    .sort((a, b) => ((b.completedAt ?? '') > (a.completedAt ?? '') ? 1 : -1))
    .slice(0, limit)
}

// ---- 删除/修改会话 ----

/**
 * 更新会话的指定字段
 */
export function updateSession(id: string, data: Partial<FocusSession>): boolean {
  const session = storage.getSessions().find(s => s.id === id)
  if (!session) return false
  storage.updateSession(id, data)
  return true
}

/**
 * 软删除单条会话（标记为 interrupted，保留记录）
 * storage 目前未暴露 removeSession / setSessions，故不走物理删除
 */
export function removeSession(id: string): void {
  const session = storage.getSessions().find(s => s.id === id)
  if (!session) return
  storage.updateSession(id, { status: 'interrupted' })
}

/**
 * 软删除全部会话（标记为 interrupted）
 * 谨慎使用，不可逆
 */
export function clearAllSessions(): void {
  storage.getSessions().forEach(s => storage.updateSession(s.id, { status: 'interrupted' }))
}

// ---- 统计 ----

/** 计算指定日期范围的专注总时长（毫秒） */
export function getTotalFocusTimeInRange(startDate: string, endDate: string): number {
  return getSessionsByDateRange(startDate, endDate)
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (s.elapsed || 0), 0)
}

/** 获取今日专注总时长（毫秒） */
export function getTodayFocusTime(): number {
  return getTodaySessions()
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (s.elapsed || 0), 0)
}

/** 获取本周专注总时长（毫秒） */
export function getWeekFocusTime(): number {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  return getTotalFocusTimeInRange(getDateStr(monday), getDateStr(now))
}

/** 获取本月专注总时长（毫秒） */
export function getMonthFocusTime(): number {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  return getTotalFocusTimeInRange(getDateStr(first), getDateStr(now))
}

/** 获取今日完成的专注次数 */
export function getTodayCompletedCount(): number {
  return getTodaySessions().filter(s => s.status === 'completed').length
}

/** 获取连续专注天数（基于 completedAt 日期连续性） */
export function getStreakDays(): number {
  const sessions = storage.getSessions()
    .filter(s => s.status === 'completed' && s.completedAt)
    .map(s => s.completedAt!.slice(0, 10))
    .filter((v, i, a) => a.indexOf(v) === i) // 去重
    .sort()
    .reverse()

  if (sessions.length === 0) return 0

  let streak = 1
  const today = getDateStr()

  // 从最近的日期开始检查，如果最近完成日不是今天也不是昨天， streak = 0
  const mostRecent = sessions[0]
  const yesterday = getDateStr(new Date(Date.now() - 86400000))
  if (mostRecent !== today && mostRecent !== yesterday) return 0

  for (let i = 0; i < sessions.length - 1; i++) {
    const current = new Date(sessions[i])
    const next = new Date(sessions[i + 1])
    const diffDays = (current.getTime() - next.getTime()) / 86400000
    if (Math.round(diffDays) === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/** 判断是否需要长休息 */
export function isLongBreakDue(threshold?: number): boolean {
  const count = getTodayCompletedCount()
  const t = threshold ?? 4
  return count > 0 && count % t === 0
}
