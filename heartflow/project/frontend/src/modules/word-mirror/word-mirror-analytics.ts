// ============================================================
// 字镜阁 · 字镜档案分析引擎（word-mirror-analytics）
// 从词汇库（WordItem）与文字分析历史（HItem）里，读出字形与
// 习得的余温。
// 档案概览、熟练度分布、状态分布、复习节律、近期打磨词、
// 字镜健康（广度 / 厚度 / 延续）与温和回看建议。
// 全纯函数、本地计算、零网络出口，接受 now 以保证时间可测试。
// ============================================================

import type { WordItem } from './word-mirror-store'
import type { HItem } from './word-mirror-store'
import { isStale, DEFAULT_STALE_THRESHOLD_DAYS } from './stale'

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

const DAY = 24 * 60 * 60 * 1000

// ---- 字镜概览 ----

export interface WordMirrorOverview {
  /** 词汇总数 */
  total: number
  /** 精通（proficiency >= 4）的词数 */
  mastered: number
  /** 收藏词数 */
  favorites: number
  /** 生疏词数 */
  staleCount: number
  /** 平均熟练度（1-5） */
  avgProficiency: number
  /** 有复习记录的词数 */
  reviewedOnce: number
  /** 近 7 天复习的词数 */
  reviewed7: number
  /** 文字分析总次数 */
  totalAnalyses: number
  /** 近 30 天文字分析次数 */
  analyses30: number
  /** 最近一次分析日期 */
  latestAnalysisDate: string | null
}

export function wordMirrorOverview(words: WordItem[], history: HItem[], now: Date = new Date()): WordMirrorOverview {
  const nowT = now.getTime()
  const c7 = nowT - 7 * DAY
  const c30 = nowT - 30 * DAY
  let mastered = 0
  let favorites = 0
  let staleCount = 0
  let sumProf = 0
  let reviewedOnce = 0
  let reviewed7 = 0
  let latestAnalysisDate: string | null = null
  let analyses30 = 0

  for (const w of words) {
    sumProf += w.proficiency
    if (w.proficiency >= 4) mastered++
    if (w.favorite) favorites++
    if (isStale(w, nowT, DEFAULT_STALE_THRESHOLD_DAYS)) staleCount++
    const last = w.lastReviewedAt ? new Date(w.lastReviewedAt).getTime() : NaN
    if (isFinite(last)) {
      reviewedOnce++
      if (last >= c7) reviewed7++
    }
  }

  for (const h of history) {
    const at = new Date(h.at || h.id || 0).getTime()
    if (isFinite(at)) {
      if (at >= c30) analyses30++
      if (!latestAnalysisDate || h.at > latestAnalysisDate) latestAnalysisDate = h.at
    }
  }

  const total = words.length
  return {
    total,
    mastered,
    favorites,
    staleCount,
    avgProficiency: total ? Math.round((sumProf / total) * 100) / 100 : 0,
    reviewedOnce,
    reviewed7,
    totalAnalyses: history.length,
    analyses30,
    latestAnalysisDate,
  }
}

// ---- 通用分布行 ----

export interface WordMirrorRow {
  key: string
  label: string
  color: string
  count: number
  /** 占比 0-100 */
  pct: number
}

/** 熟练度分布（1-5） */
export function wordProficiencyRows(words: WordItem[]): WordMirrorRow[] {
  const total = words.length || 1
  const rows: WordMirrorRow[] = []
  for (let lv = 1; lv <= 5; lv++) {
    const count = words.filter((w) => w.proficiency === lv).length
    if (count === 0) continue
    const color =
      lv <= 2 ? '#c46a5a' :
      lv === 3 ? '#f0c040' :
      lv === 4 ? '#8a9a7a' : '#6b9fc4'
    rows.push({
      key: String(lv),
      label: `Lv${lv}`,
      color,
      count,
      pct: Math.round((count / total) * 100),
    })
  }
  return rows.sort((a, b) => Number(a.key) - Number(b.key))
}

/** 词条状态分布（精通 / 学习中 / 生疏） */
export function wordStatusRows(words: WordItem[], now: Date = new Date()): WordMirrorRow[] {
  const total = words.length || 1
  let mastered = 0
  let learning = 0
  let stale = 0
  for (const w of words) {
    if (w.proficiency >= 4) mastered++
    else if (isStale(w, now.getTime(), DEFAULT_STALE_THRESHOLD_DAYS)) stale++
    else learning++
  }
  const mk = (key: string, label: string, count: number, color: string): WordMirrorRow => ({
    key,
    label,
    color,
    count,
    pct: Math.round((count / total) * 100),
  })
  return [
    mk('mastered', '已精通', mastered, '#6b9fc4'),
    mk('learning', '学习中', learning, '#f0c040'),
    mk('stale', '待复习', stale, '#c46a5a'),
  ].filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
}

// ---- 复习节律 ----

export interface WordMirrorRhythm {
  /** 近 7 天复习的词数 */
  reviewed7: number
  /** 近 30 天复习的词数 */
  reviewed30: number
  /** 有复习记录的词占比（0-100） */
  reviewCoverage: number
  /** 最久未复习（天，无记录为 null） */
  staleDays: number | null
  /** 生疏词数 */
  staleCount: number
}

export function wordMirrorRhythm(words: WordItem[], now: Date = new Date()): WordMirrorRhythm {
  const nowT = now.getTime()
  const c7 = nowT - 7 * DAY
  const c30 = nowT - 30 * DAY
  let reviewed7 = 0
  let reviewed30 = 0
  let staleCount = 0
  let reviewedOnce = 0
  let maxGap: number | null = null

  for (const w of words) {
    const last = w.lastReviewedAt ? new Date(w.lastReviewedAt).getTime() : NaN
    if (isFinite(last)) {
      reviewedOnce++
      if (last >= c7) reviewed7++
      if (last >= c30) reviewed30++
      const gap = Math.max(0, Math.round((nowT - last) / DAY))
      if (maxGap === null || gap > maxGap) maxGap = gap
    }
    if (isStale(w, nowT, DEFAULT_STALE_THRESHOLD_DAYS)) staleCount++
  }

  return {
    reviewed7,
    reviewed30,
    reviewCoverage: words.length ? Math.round((reviewedOnce / words.length) * 100) : 0,
    staleDays: maxGap,
    staleCount,
  }
}

// ---- 近期打磨词 ----

export interface WordMirrorWord {
  word: string
  count: number
}

/** 最近被复习/习得的词（按 lastReviewedAt 倒序） */
export function wordRecentlyPracticed(words: WordItem[], top = 5): WordMirrorWord[] {
  return Array.from(words)
    .map((w) => ({
      word: w.word,
      count: w.lastReviewedAt ? Math.max(0, Math.round((Date.now() - new Date(w.lastReviewedAt).getTime()) / DAY)) : Infinity,
    }))
    .sort((a, b) => a.count - b.count || a.word.localeCompare(b.word))
    .slice(0, top)
}

// ---- 字镜健康（0-100）----

export interface WordMirrorArchiveHealth {
  /** 0-100 字镜里习得的丰盈程度 */
  score: number
  /** 广度（词汇多样）0-100 */
  breadth: number
  /** 厚度（熟练度沉淀）0-100 */
  depth: number
  /** 延续（复习与文字分析的活力度）0-100 */
  continuity: number
  label: string
}

export function wordMirrorHealth(words: WordItem[], history: HItem[], now: Date = new Date()): WordMirrorArchiveHealth {
  const total = words.length
  if (total === 0) {
    return { score: 0, breadth: 0, depth: 0, continuity: 0, label: '字镜初磨' }
  }

  const ov = wordMirrorOverview(words, history, now)
  const breadth = clamp(Math.round(Math.min(total, 120) * 0.45 + Math.min(ov.favorites, 20) * 1.2))

  const avgProf = ov.avgProficiency
  const masteredRatio = total ? ov.mastered / total : 0
  const depth = clamp(Math.round(Math.min(avgProf / 5, 1) * 50 + masteredRatio * 45))

  const rhythm = wordMirrorRhythm(words, now)
  const continuity = clamp(Math.round(Math.min(rhythm.reviewed30, 60) * 0.8 + (1 - rhythm.staleCount / Math.max(total, 1)) * 30 + Math.min(ov.analyses30, 12) * 2))

  const score = clamp(Math.round(breadth * 0.35 + depth * 0.35 + continuity * 0.3))
  const label =
    score >= 70 ? '字镜清明' : score >= 45 ? '映字渐明' : score >= 20 ? '字迹初现' : '字镜初磨'

  return { score, breadth, depth, continuity, label }
}

// ---- 温和回看建议 ----

export function wordMirrorInsights(words: WordItem[], history: HItem[], now = new Date(), limit = 4): string[] {
  if (words.length === 0 && history.length === 0) {
    return ['字镜还是空的。记下第一个词，或映照第一段文字，让字里行间开始显影。']
  }
  const out: string[] = []
  const ov = wordMirrorOverview(words, history, now)
  const health = wordMirrorHealth(words, history, now)
  const rhythm = wordMirrorRhythm(words, now)

  if (words.length > 0 && rhythm.reviewed7 === 0) out.push('近一周没有复习任何词，让它们回到眼前再看一眼，习得才不会蒙尘。')
  if (ov.staleCount > 0) out.push(`还有 ${ov.staleCount} 个生疏词在等你，去词汇自习室把它们拾起来。`)
  if (ov.total > 0 && ov.mastered > 0) out.push(`你已经把 ${ov.mastered} 个词打磨到了精通，那是字镜里最亮的几处。`)
  if (history.length > 0 && ov.analyses30 === 0) out.push('近一个月没有做过文字分析，试试粘贴一段最近的记录，看墨色情绪落向何处。')
  if (words.length > 0 && ov.avgProficiency < 3) out.push('平均熟练度还不高，别急着扩充，先让已有词汇更熟悉些。')
  out.push(`当前字镜的习得沉淀为「${health.label}」。`)
  return out.slice(0, limit)
}