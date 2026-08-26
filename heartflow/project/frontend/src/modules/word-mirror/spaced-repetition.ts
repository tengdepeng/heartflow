// ============================================================
// 字镜阁 · 间隔重复复习调度（F9）
// ------------------------------------------------------------
// 基于熟练度分级复习间隔，挑出"到期该复习"的词，作为温和的复习提醒。
// 纯函数、确定性、完全本地，不依赖任何外部数据。
// 与宪法一致：本地私有（无云）、超级自定义（间隔可覆盖）、允许未定义
// （旧数据可能缺 lastReviewedAt，回退到 createdAt）。
// 复用 F8 的 lastReviewedAt 字段作为复习锚点。
// ============================================================

import type { WordItem } from './word-mirror-store'

/** 各熟练度对应的复习间隔（天）。熟练度越高，间隔越长。 */
export const DEFAULT_SR_INTERVALS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 16,
}

const DAY_MS = 86_400_000

/** 给定熟练度，返回对应的复习间隔（天）；越界值夹取到 1–5。 */
export function proficiencyIntervalDays(
  proficiency: number,
  intervals: Record<number, number> = DEFAULT_SR_INTERVALS,
): number {
  const p = Math.min(Math.max(Math.round(proficiency), 1), 5)
  return intervals[p] ?? intervals[1]
}

/**
 * 判断一个词当前是否"到期该复习"。
 * 锚点：优先 lastReviewedAt，缺省回退 createdAt（允许未定义）。
 * @param word  需含 createdAt；lastReviewedAt / proficiency 可选
 * @param now   当前时间戳（ms），便于测试注入
 * @param intervals 可覆盖的间隔表，便于自定义
 */
export function isDue(
  word: Pick<WordItem, 'lastReviewedAt' | 'createdAt' | 'proficiency'>,
  now: number,
  intervals: Record<number, number> = DEFAULT_SR_INTERVALS,
): boolean {
  const base = word.lastReviewedAt
    ? new Date(word.lastReviewedAt).getTime()
    : new Date(word.createdAt).getTime()
  if (!isFinite(base)) return false
  const interval = proficiencyIntervalDays(word.proficiency, intervals)
  return (now - base) / DAY_MS >= interval
}

/** 从词表中筛出当前到期的词。 */
export function dueWords<T extends Pick<WordItem, 'lastReviewedAt' | 'createdAt' | 'proficiency'>>(
  words: T[],
  now: number,
  intervals: Record<number, number> = DEFAULT_SR_INTERVALS,
): T[] {
  return words.filter((w) => isDue(w, now, intervals))
}

/**
 * 复习一次后的状态推进（纯函数，便于测试）：
 * 刷新 lastReviewedAt 为 now，熟练度 +1 封顶 5。
 */
export function nextReviewState(
  word: Pick<WordItem, 'proficiency'>,
  now: number,
): { proficiency: number; lastReviewedAt: string } {
  return {
    proficiency: Math.min(word.proficiency + 1, 5),
    lastReviewedAt: new Date(now).toISOString(),
  }
}
