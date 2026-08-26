// ============================================================
// 时光胶囊 · 胶囊库引擎（capsule-vault）
// 把"封存-等待-开启"的生命周期梳理成可读的状态与清单：
//   - capsuleStatus：封存中 / 今日可启 / 逾末未启 / 已开启
//   - countdownText：人性化倒计时文案
//   - capsuleVault：整库档案（统计 + 下一封即将开启 + 逾末催启 + 近启回看）
// 全纯函数、本地计算，零网络出口（守宪法第1条）。
// ============================================================

import type { TimeCapsule } from './index'
import { daysUntilOpen } from './index'

/** 胶囊生命周期状态 */
export type CapsuleStatus = 'sealed' | 'openable' | 'overdue' | 'open'

export const CAPSULE_STATUS_META: Record<CapsuleStatus, { label: string; icon: string; hint: string }> = {
  sealed: { label: '封存中', icon: '🔒', hint: '未到开启日，静静等待那一刻' },
  openable: { label: '今日可启', icon: '🗝️', hint: '已到开启日，此刻正宜启封' },
  overdue: { label: '逾末未启', icon: '⏰', hint: '已过开启日却仍未启封，别让此刻流走' },
  open: { label: '已开启', icon: '📖', hint: '已启封，可回看当年封存的心流' },
}

export const CAPSULE_STATUS_ORDER: CapsuleStatus[] = ['sealed', 'openable', 'overdue', 'open']

/**
 * 判断胶囊生命状态：
 *   已开 → open
 *   未到日 → sealed；今日 → openable；已过日（未启封）→ overdue
 */
export function capsuleStatus(c: TimeCapsule, now: Date = new Date()): CapsuleStatus {
  if (c.openedAt) return 'open'
  const d = daysUntilOpen(c.openDate, now)
  if (d > 0) return 'sealed'
  return d === 0 ? 'openable' : 'overdue'
}

/** 人性化倒计时/状态文案 */
export function countdownText(c: TimeCapsule, now: Date = new Date()): string {
  const s = capsuleStatus(c, now)
  if (s === 'open') return '已开启'
  const d = daysUntilOpen(c.openDate, now)
  if (s === 'openable') return '今日可开启'
  if (s === 'overdue') return `已逾 ${-d} 天，启封吧`
  return `还有 ${d} 天开启`
}

/** 距今日天数（未来为正、今日 0、过去为负） */
export function openOffset(c: TimeCapsule, now: Date = new Date()): number {
  return daysUntilOpen(c.openDate, now)
}

export interface CapsuleVault {
  total: number
  sealed: number
  openable: number
  overdue: number
  open: number
  /** 下一封应关注的胶囊（逾末>今日可启>最近即将） */
  nextToOpen: TimeCapsule | null
  /** 即将开启（含逾末与今日，按开启日升序） */
  imminent: TimeCapsule[]
  /** 逾末催启清单 */
  overdueList: TimeCapsule[]
  /** 最近开启回看清单 */
  recentlyOpened: TimeCapsule[]
}

/** 整库档案 */
export function capsuleVault(capsules: TimeCapsule[], now: Date = new Date()): CapsuleVault {
  let sealed = 0
  let openable = 0
  let overdue = 0
  const unopened: TimeCapsule[] = []
  const openedList: TimeCapsule[] = []

  for (const c of capsules) {
    const s = capsuleStatus(c, now)
    if (s === 'sealed') { sealed++; unopened.push(c) }
    else if (s === 'openable') { openable++; unopened.push(c) }
    else if (s === 'overdue') { overdue++; unopened.push(c) }
    else openedList.push(c)
  }

  // 未开启按开启日升序（最紧迫在前）
  const sorted = unopened.sort((a, b) => openOffset(a, now) - openOffset(b, now))
  const nextToOpen = sorted[0] ?? null

  return {
    total: capsules.length,
    sealed,
    openable,
    overdue,
    open: capsules.length - sealed - openable - overdue,
    nextToOpen,
    imminent: sorted.slice(0, 5),
    overdueList: sorted.filter((c) => capsuleStatus(c, now) === 'overdue'),
    recentlyOpened: openedList
      .sort((a, b) => (b.openedAt || '').localeCompare(a.openedAt || ''))
      .slice(0, 5),
  }
}