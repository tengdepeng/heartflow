// ============================================================
// 自动归档引擎（任务② · data:auto-archive 特性落地）
// ------------------------------------------------------------
// 仅在宪法条款 data:auto-archive 被用户显式启用（覆盖默认 elastic-eternal
// 「数据不自动归档」禁用规则）时，按阈值将长期未活跃的条目自动归档。
// 默认关闭 → isTargetActive 为假 → 零动作，绝不静默动数据（宪法主权第1条）。
// 归档即第34条「允许遗忘，归档而非删除」：标记 archived，不入回收站，可还原。
// 仅本地 KV，零网络；每次实际归档写本地审计日志。
// ============================================================

import { isTargetActive } from '../../engine/constitution-effect'
import { useLightPavilion } from '../light/pavilion'
import { getNoteStore } from '../note'
import { storage } from '../../engine/storage'
import type { Note } from '../../types'

const AUTO_ARCHIVE_LOG_KEY = 'hf:auto-archive:log'
export const DEFAULT_THRESHOLD_DAYS = 90
const MAX_LOG_ENTRIES = 50

export interface AutoArchiveResult {
  /** 宪法条款未启用 → true（零动作，诚实声明式不变） */
  skipped: boolean
  thresholdDays: number
  archivedMeditations: number
  archivedReleases: number
  archivedNotes: number
  total: number
  ranAt: string
}

/** 审计日志条目（不含 skipped 标记） */
export type AutoArchiveLogEntry = Omit<AutoArchiveResult, 'skipped'>

/** 距今天数（iso 非法 → Infinity，永不选入） */
function daysSince(iso: string, now: Date): number {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return Infinity
  return (now.getTime() - t) / 86_400_000
}

/**
 * 纯函数：从候选条目中选中「当前活跃且超过阈值」的待归档项。
 * 便于单测，不依赖任何存储/单例。
 */
export function selectInactive<T>(
  items: T[],
  getTime: (item: T) => string,
  isActive: (item: T) => boolean,
  thresholdDays: number,
  now: Date,
): T[] {
  return items.filter((it) => {
    const d = daysSince(getTime(it), now)
    return isActive(it) && Number.isFinite(d) && d >= thresholdDays
  })
}

/**
 * 执行一次自动归档。
 * - 条款未启用：返回 skipped（不触碰任何数据）。
 * - 条款启用：归档超阈值的留光阁冥想/释怀 + 笔记（未归档、未软删除）。
 */
export function runAutoArchive(options?: {
  thresholdDays?: number
  now?: Date
}): AutoArchiveResult {
  const thresholdDays = options?.thresholdDays ?? DEFAULT_THRESHOLD_DAYS
  const now = options?.now ?? new Date()
  const result: AutoArchiveResult = {
    skipped: false,
    thresholdDays,
    archivedMeditations: 0,
    archivedReleases: 0,
    archivedNotes: 0,
    total: 0,
    ranAt: now.toISOString(),
  }

  // 宪法门控：未启用 → 零动作
  if (!isTargetActive('data:auto-archive')) {
    return { ...result, skipped: true }
  }

  // 留光阁：冥想 + 释怀
  const pavilion = useLightPavilion()
  const staleMeditations = selectInactive(
    pavilion.meditations.value,
    (m) => m.timestamp,
    (m) => !m.archived,
    thresholdDays,
    now,
  )
  for (const m of staleMeditations) {
    if (pavilion.archiveMeditation(m.id)) result.archivedMeditations++
  }
  const staleReleases = selectInactive(
    pavilion.releases.value,
    (r) => r.date,
    (r) => !r.archived,
    thresholdDays,
    now,
  )
  for (const r of staleReleases) {
    if (pavilion.archiveRelease(r.id)) result.archivedReleases++
  }

  // 笔记：未归档且未软删除
  const noteStore = getNoteStore()
  const staleNotes = selectInactive<Note>(
    noteStore.allNotes.value,
    (n) => n.updatedAt,
    (n) => !n.archived && !n.deletedAt,
    thresholdDays,
    now,
  )
  for (const n of staleNotes) {
    noteStore.update(n.id, { archived: true })
    result.archivedNotes++
  }

  result.total =
    result.archivedMeditations + result.archivedReleases + result.archivedNotes

  if (result.total > 0) appendAutoArchiveLog(result)
  return result
}

/** 读取自动归档审计日志（本地，零网络） */
export function getAutoArchiveLog(): AutoArchiveLogEntry[] {
  try {
    return storage.getKV<AutoArchiveLogEntry[]>(AUTO_ARCHIVE_LOG_KEY, [])
  } catch {
    return []
  }
}

function appendAutoArchiveLog(entry: AutoArchiveResult): void {
  const log = getAutoArchiveLog()
  const { skipped: _skip, ...rest } = entry
  void _skip
  log.push(rest)
  storage.setKV(AUTO_ARCHIVE_LOG_KEY, log.slice(-MAX_LOG_ENTRIES))
}

// ---- 自动归档台 · UI 辅助（面板/测试共用） ----

/** 阈值可选项（天） */
export const ARCHIVE_THRESHOLD_OPTIONS = [30, 60, 90, 180, 365]

/** 已归档条目（可还原） */
export interface ArchivedItem {
  kind: 'meditation' | 'release' | 'note'
  id: string
  title: string
  archivedAt: string
}

/** 门控元信息：开关两种状态文案不同 */
export function autoArchiveGateMeta(active: boolean) {
  return active
    ? {
        enabled: true,
        label: '已开启',
        icon: '🟢',
        hint: '闲置超过阈值的冥想、释怀与笔记会自动归档，随时可还原。',
      }
    : {
        enabled: false,
        label: '未开启',
        icon: '⚪',
        hint: '宪法条款 data:auto-archive 未启用，系统不会静默动你的数据。',
      }
}

/** 归拢已归档条目并按归档时间倒序 */
export function collectArchivedItems<T>(options: {
  meditations: T[]
  releases: T[]
  notes: T[]
  getId: (i: T) => string
  getTitle: (i: T) => string
  isArchived: (i: T) => boolean
  getArchivedAt: (i: T) => string
}): ArchivedItem[] {
  const { meditations, releases, notes, getId, getTitle, isArchived, getArchivedAt } = options
  const out: ArchivedItem[] = []
  for (const m of meditations)
    if (isArchived(m)) out.push({ kind: 'meditation', id: getId(m), title: getTitle(m), archivedAt: getArchivedAt(m) })
  for (const r of releases)
    if (isArchived(r)) out.push({ kind: 'release', id: getId(r), title: getTitle(r), archivedAt: getArchivedAt(r) })
  for (const n of notes)
    if (isArchived(n)) out.push({ kind: 'note', id: getId(n), title: getTitle(n), archivedAt: getArchivedAt(n) })
  return out.sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : -1))
}

/** 描述一次归档结果 */
export function describeAutoArchive(result: AutoArchiveResult): string {
  if (result.skipped) return '未开启自动归档，未触碰任何数据。'
  return `归档 ${result.total} 条（冥想 ${result.archivedMeditations} · 释怀 ${result.archivedReleases} · 笔记 ${result.archivedNotes}）`
}
