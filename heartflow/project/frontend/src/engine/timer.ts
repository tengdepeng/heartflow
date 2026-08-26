// ============================================================
// 计时引擎
// 管理底层计时逻辑，与 UI 状态分离
// ============================================================

import type { FocusSession, FocusMode } from '../types'

let counter = 0
function uid(): string {
  return `session_${Date.now()}_${++counter}`
}

/** 创建新会话 */
export function createSession(mode: FocusMode, plannedDuration: number): FocusSession {
  return {
    id: uid(),
    status: 'idle',
    mode,
    plannedDuration,
    elapsed: 0,
    startedAt: null,
    pausedDuration: 0,
    pausedAt: null,
    completedAt: null,
    tags: [],
    note: '',
    carrierId: null,
  }
}

/** 开始专注 */
export function startSession(session: FocusSession): FocusSession {
  const now = new Date().toISOString()
  return {
    ...session,
    status: 'focusing',
    startedAt: session.startedAt ?? now,
    elapsed: 0,
    pausedDuration: 0,
    pausedAt: null,
  }
}

/** 暂停专注 */
export function pauseSession(session: FocusSession, currentElapsed: number): FocusSession {
  return {
    ...session,
    status: 'paused',
    elapsed: currentElapsed,
    pausedAt: new Date().toISOString(),
  }
}

/** 恢复专注 */
export function resumeSession(session: FocusSession, currentElapsed: number, pausedNow: number): FocusSession {
  return {
    ...session,
    status: 'focusing',
    elapsed: currentElapsed,
    pausedDuration: session.pausedDuration + pausedNow,
    pausedAt: null,
  }
}

/** 完成专注 */
export function completeSession(session: FocusSession, currentElapsed: number, totalPaused: number): FocusSession {
  return {
    ...session,
    status: 'completed',
    elapsed: currentElapsed,
    pausedDuration: totalPaused,
    completedAt: new Date().toISOString(),
    pausedAt: null,
  }
}

/** 中断专注 */
export function interruptSession(session: FocusSession, currentElapsed: number, totalPaused: number): FocusSession {
  return {
    ...session,
    status: 'interrupted',
    elapsed: currentElapsed,
    pausedDuration: totalPaused,
    pausedAt: null,
  }
}

/** 计算进度 (0-1) */
export function calcProgress(elapsed: number, planned: number): number {
  if (planned <= 0) return 0
  return Math.min(elapsed / planned, 1)
}

/** 格式化计时时长 mm:ss（输入为毫秒） */
export function formatTimerClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
