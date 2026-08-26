// ============================================================
// 手动数据整理（任务② B 类样板 · data:cleanup 特性落地）
// ------------------------------------------------------------
// 仅当用户在宪法显式启用 data:cleanup（覆盖默认 elastic-safety
// 「不自动清理历史数据」禁用规则）后，才出现「整理旧数据」入口。
// 列出超期已完成专注会话、逐项勾选 + 显式确认、软清理（归档/可回收，非硬删）。
// 非自动、非打扰、纯本地零网络；与 data:auto-archive 同理守「新自动行为默认关闭」纪律。
// 整理即第34条「允许遗忘，归档而非删除」：标记 archived，可还原。
// ============================================================

import { isTargetActive } from '../../engine/constitution-effect'
import type { FocusSession } from '../../types'
import { getSessions, updateSession } from '../../engine/storage/session'

/** 默认超期阈值（天）：超过该时长的已完成专注会话可被整理（软归档） */
export const CLEANUP_RETENTION_DAYS = 365

/** 毫秒/天 */
const DAY_MS = 86_400_000

/**
 * data:cleanup 宪法门控：仅当用户在宪法显式启用 data:cleanup 时才出现入口。
 * 默认由 elastic-safety 禁用 → isTargetActive 为假 → 入口不渲染（绝不静默动数据）。
 */
export function isCleanupEnabled(): boolean {
  return isTargetActive('data:cleanup')
}

/**
 * 纯函数：从会话列表中选中「已完成、未归档、且 completedAt 早于 retentionDays 天前」的待整理项。
 * 便于单测，不依赖任何存储/单例。
 */
export function listCleanupCandidates(
  sessions: FocusSession[],
  retentionDays: number = CLEANUP_RETENTION_DAYS,
  now: number = Date.now(),
): FocusSession[] {
  const cutoff = now - retentionDays * DAY_MS
  return sessions.filter((s) => {
    if (s.archived) return false
    if (s.status !== 'completed') return false
    if (!s.completedAt) return false
    const t = new Date(s.completedAt).getTime()
    return Number.isFinite(t) && t < cutoff
  })
}

/** 纯函数：将 ids 标记为 archived:true，返回新数组（不修改入参）。可逆。 */
export function applySoftArchive(sessions: FocusSession[], ids: string[]): FocusSession[] {
  const idSet = new Set(ids)
  return sessions.map((s) => (idSet.has(s.id) ? { ...s, archived: true } : s))
}

/** 纯函数：将 ids 的 archived 复位为 false（还原），返回新数组（不修改入参）。 */
export function applyRestore(sessions: FocusSession[], ids: string[]): FocusSession[] {
  const idSet = new Set(ids)
  return sessions.map((s) => (idSet.has(s.id) ? { ...s, archived: false } : s))
}

/**
 * 执行一次手动软清理：仅当门控开启时，对指定会话置 archived:true（软归档，非硬删，可逆、纯本地零网络）。
 * 门控关闭时直接返回 0（绝不静默动数据）。返回实际归档的会话数。
 */
export function softCleanup(ids: string[]): number {
  if (!isCleanupEnabled()) return 0
  let count = 0
  for (const id of ids) {
    updateSession(id, { archived: true })
    count++
  }
  return count
}

/** 还原已归档会话为未归档（可逆的用户显式动作，不受门控约束）。返回实际还原的会话数。 */
export function restoreCleanup(ids: string[]): number {
  let count = 0
  for (const id of ids) {
    updateSession(id, { archived: false })
    count++
  }
  return count
}

/** 便捷读取：当前所有超期可整理候选（供面板直接调用） */
export function getCleanupCandidates(retentionDays: number = CLEANUP_RETENTION_DAYS): FocusSession[] {
  return listCleanupCandidates(getSessions(), retentionDays)
}
