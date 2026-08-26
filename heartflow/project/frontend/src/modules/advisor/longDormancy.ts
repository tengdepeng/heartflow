// ============================================================
// 长眠守护（宪法第51条 · elastic-long-dormancy → advisor:long-dormancy）
// 纯函数层：判定某幕僚是否进入「长眠」（条款启用 且 长时间未被打开）。
// 与夜静调暗/数字安息日同属「时间节律家族」，但作用对象是幕僚的沉睡状态，
// 由 advisor store 的 applyLongDormancy 在运行时落实为 state 切换。
// 此模块不依赖 store / UI，避免循环引用（store 与 composable 均从这里导入）。
// ============================================================

import { isTargetActive } from '../../engine/constitution-effect'

/** 长眠阈值（天）。超过此天数未互动的活跃幕僚进入沉睡。 */
export const LONG_DORMANCY_DAYS = 90
export const LONG_DORMANCY_MS = LONG_DORMANCY_DAYS * 24 * 60 * 60 * 1000

/**
 * 某幕僚是否处于长眠：
 * - 条款未启用 → false（不干预运行时）
 * - lastActiveAt 缺失 / 非法 → false（新幕僚或脏数据，不强制沉睡，保留当前状态）
 * - 距今超过阈值 → true
 * @param lastActiveAt 幕僚上次互动时间（ISO 字符串），可能缺失
 * @param now 当前时间（默认 new Date()，便于单测注入）
 */
export function isLongDormant(
  lastActiveAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!isTargetActive('advisor:long-dormancy')) return false
  if (!lastActiveAt) return false
  const t = new Date(lastActiveAt).getTime()
  if (Number.isNaN(t)) return false
  return now.getTime() - t > LONG_DORMANCY_MS
}
