// ============================================================
// 文明根系 · 生命力引擎（root-vitality）
// 把静态的民俗收藏变成"随实践而生长"的生命体：
//   - vitalityScore：0-100 生命力（实践积累 + 新鲜度 + 濒危脆弱性）
//   - growthStage：种子/新芽/成木/华盖 四阶段
//   - cultivation：整族培育面板（阶段分布 + 枝繁/凋零 + 均值）
//   - recommendNurture：需要此刻浇灌催养的条目
//   - syntaxTermLink：把条目与今日节气/岁时建立联系
// 全部纯函数、本地计算，零网络依赖（第1条宪法守卫）。
// ============================================================

import type { FolkloreEntry } from './types'

/** 生长阶段 */
export type GrowthStage = 'seed' | 'sprout' | 'wood' | 'canopy'

export const GROWTH_STAGE_META: Record<GrowthStage, { label: string; emoji: string; hint: string }> = {
  seed: { label: '种子', emoji: '🌱', hint: '刚刚记下，还需多次实践培育' },
  sprout: { label: '新芽', emoji: '🌿', hint: '已经在生长，继续实践会枝繁叶茂' },
  wood: { label: '成木', emoji: '🌳', hint: '根深叶茂，家族记忆已扎稳脚跟' },
  canopy: { label: '华盖', emoji: '🏮', hint: '枝繁叶茂，是这片根系里的参天古木' },
}

export const GROWTH_STAGE_ORDER: GrowthStage[] = ['seed', 'sprout', 'wood', 'canopy']

/** 培育新鲜度窗口（天）：超过则该条目被判定"需浇水" */
export const NURTURE_WINDOW_DAYS = 60

const THRESHOLDS: { stage: GrowthStage; min: number }[] = [
  { stage: 'canopy', min: 75 },
  { stage: 'wood', min: 50 },
  { stage: 'sprout', min: 25 },
  { stage: 'seed', min: 0 },
]

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** 距今天数（无实践则回退到记录时间） */
function daysSinceAnchor(entry: FolkloreEntry, now: number): number {
  const anchor = entry.lastPracticedAt || entry.recordedAt
  const ms = now - new Date(anchor).getTime()
  return Math.max(0, ms / 86400000)
}

/** 条目生命力 0-100
 *  tenure  实践积累（对数饱和，最多 45）
 *  recency 新鲜度（90 天内线性衰减，最多 25）
 *  base    濒危脆弱性（濒危给 10 基础，健康给 20）
 *  实践积累占主导，防止"刚记录就成木"的虚高。
 */
export function vitalityScore(entry: FolkloreEntry, now: number = Date.now()): number {
  const tenure = Math.min(45, Math.round(Math.log2(entry.practiceCount + 1) * 12))
  const days = daysSinceAnchor(entry, now)
  const recency = Math.max(0, Math.round(25 * (1 - clamp01(days / 90))))
  const base = entry.endangered ? 10 : 20
  return Math.max(0, Math.min(100, tenure + recency + base))
}

/** 由生命力推导生长阶段 */
export function growthStage(entry: FolkloreEntry, now: number = Date.now()): GrowthStage {
  const score = vitalityScore(entry, now)
  for (const t of THRESHOLDS) {
    if (score >= t.min) return t.stage
  }
  return 'seed'
}

export interface CultivationBoard {
  total: number
  avgVitality: number
  byStage: { stage: GrowthStage; label: string; emoji: string; count: number }[]
  thriving: FolkloreEntry[] // 生命力 >= 60
  withering: FolkloreEntry[] // 生命力 < 25 或（濒危且久未实践）
  needNurture: FolkloreEntry[] // 超过新鲜度窗口
}

/** 整族培育面板 */
export function cultivate(entries: FolkloreEntry[], now: number = Date.now()): CultivationBoard {
  // 预计算每条得分/阶段，两组排序共用
  const scored = entries.map((e) => ({ e, v: vitalityScore(e, now), s: growthStage(e, now) }))

  const byStage = GROWTH_STAGE_ORDER.map((stage) => ({
    stage,
    label: GROWTH_STAGE_META[stage].label,
    emoji: GROWTH_STAGE_META[stage].emoji,
    count: scored.filter((x) => x.s === stage).length,
  }))

  const thriving = scored
    .filter((x) => x.v >= 60)
    .sort((a, b) => b.v - a.v)
    .map((x) => x.e)

  const days = (e: FolkloreEntry) => daysSinceAnchor(e, now)
  const withering = scored
    .filter((x) => x.v < 25 || (x.e.endangered && days(x.e) > NURTURE_WINDOW_DAYS))
    .sort((a, b) => a.v - b.v)
    .map((x) => x.e)

  const needNurture = entries
    .filter((e) => days(e) > NURTURE_WINDOW_DAYS)
    .sort((a, b) => days(b) - days(a))

  return {
    total: entries.length,
    avgVitality: entries.length ? Math.round(scored.reduce((s, x) => s + x.v, 0) / entries.length) : 0,
    byStage,
    thriving,
    withering,
    needNurture,
  }
}

/** 今日岁时关联：条目是否与某节气/季节语境相关（命中名称/标签/类别/描述） */
export function syntaxTermLink(entry: FolkloreEntry, terms: string[]): boolean {
  if (!terms.length) return false
  const lowerTerms = terms.map((t) => t.toLowerCase())
  const text = [entry.name, entry.category, entry.region, entry.description, ...entry.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return lowerTerms.some((t) => t && text.includes(t))
}