// ============================================================
// 字镜阁 · 生疏词判定（F8）
// ------------------------------------------------------------
// 长期未复习的词在词汇列表中视觉上降透明度，作为温和的复习提醒，
// 而非惩罚。判定完全本地、确定性，不依赖任何外部数据。
// 与宪法一致：本地私有（无云）、超级自定义（可关闭）、允许未定义
// （旧数据可能没有 lastReviewedAt，回退到 createdAt）。
// ============================================================

import type { WordItem } from './word-mirror-store'

/** 默认生疏阈值：距最近复习（或创建）超过 21 天视为生疏 */
export const DEFAULT_STALE_THRESHOLD_DAYS = 21

const DAY_MS = 86_400_000

/**
 * 判断一个词是否"生疏"——即超过阈值天数未复习。
 * @param word  需含 createdAt；lastReviewedAt 可选（缺省回退到 createdAt）
 * @param now   当前时间戳（ms），便于测试注入
 * @param thresholdDays 生疏阈值（天）
 */
export function isStale(
  word: Pick<WordItem, 'lastReviewedAt' | 'createdAt'>,
  now: number,
  thresholdDays: number = DEFAULT_STALE_THRESHOLD_DAYS,
): boolean {
  const base = word.lastReviewedAt
    ? new Date(word.lastReviewedAt).getTime()
    : new Date(word.createdAt).getTime()
  if (!isFinite(base)) return false
  return (now - base) / DAY_MS >= thresholdDays
}
