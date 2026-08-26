// ============================================================
// 殿堂辞典 · 汉字档案分析引擎 (模块三十六)
// 对「字库 + 个人词库」统合出档案：概览 / 部首 / 笔画 / 构字 / 温和洞察
// 本地离线工程，不依赖网络
// ============================================================

import type { HanziEntry } from './hanzi-data'
import { strokeBuckets } from './lookup'

/** 汉字档案概览 */
export interface HanziOverview {
  /** 收录总字数 */
  total: number
  /** 覆盖部首数 */
  radicalCount: number
  /** 平均笔画（保留 1 位） */
  avgStrokes: number
  /** 最多笔画字 */
  mostStroked: string[]
  /** 最少笔画字 */
  leastStroked: string[]
  /** 白话：最常见的部首 */
  topRadical: string
  /** 白话：最常见声母 */
  topInitial: string
  /** 单纯字（1-5画）占比（%） */
  simpleRatio: number
}

/** 构字法分布项 */
export interface StructureRow {
  structure: string
  count: number
  pct: number
  chars: string[]
}

/** 声母分布项 */
export interface InitialRow {
  initial: string
  count: number
}

/** 用户词库字符画像 */
export interface VocabularyProfile {
  /** 个人字库去重后的汉字字符 */
  chars: string[]
  /** 命中内置/扩展字库的字符数 */
  matched: number
}

/** 从任意文本提取去重后的汉字字符 */
export function extractChars(text: string): string[] {
  const seen = new Set<string>()
  for (const ch of text) {
    if (/[\u4e00-\u9fa5]/.test(ch)) seen.add(ch)
  }
  return [...seen]
}

/** 将字库条目展开为档案集合（含字库本身与用户个人字） */
export function toHanziEntries(source: { list: HanziEntry[]; personalChars?: string[] }): HanziEntry[] {
  const db = [...source.list]
  const seen = new Set(db.map((e) => e.char))
  const personal = (source.personalChars || [])
    .filter((c) => c && !seen.has(c))
    .map((c): HanziEntry => ({
      char: c,
      pinyin: '',
      noTone: '',
      initial: '',
      radical: '未收录',
      radicalStrokes: 0,
      strokes: 0,
      structure: '未收录',
      meaning: '',
      words: [],
    }))
  return [...personal, ...db]
}

/** 汉字档案概览 */
export function hanziOverview(entries: HanziEntry[]): HanziOverview {
  const total = entries.length
  const radicals = new Set(entries.filter((e) => e.strokes > 0).map((e) => e.radical))
  const strokes = entries.filter((e) => e.strokes > 0).map((e) => e.strokes)
  const avg = strokes.length
    ? Math.round((strokes.reduce((s, n) => s + n, 0) / strokes.length) * 10) / 10
    : 0

  const byStroke = (dir: 1 | -1) =>
    entries
      .filter((e) => e.strokes > 0)
      .slice()
      .sort((a, b) => dir * (a.strokes - b.strokes))
      .slice(0, 3)
      .map((e) => e.char)

  const radicalsCount = new Map<string, number>()
  const initialsCount = new Map<string, number>()
  for (const e of entries) {
    if (!e.radical || e.strokes === 0) continue
    radicalsCount.set(e.radical, (radicalsCount.get(e.radical) || 0) + 1)
    const init = e.initial || '零声母'
    initialsCount.set(init, (initialsCount.get(init) || 0) + 1)
  }
  const pickTop = (m: Map<string, number>): string =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  const simpleCount = entries.filter((e) => e.strokes > 0 && e.strokes <= 5).length
  const known = entries.filter((e) => e.strokes > 0).length

  return {
    total,
    radicalCount: radicals.size,
    avgStrokes: avg,
    mostStroked: byStroke(-1),
    leastStroked: byStroke(1),
    topRadical: pickTop(radicalsCount),
    topInitial: pickTop(initialsCount),
    simpleRatio: known ? Math.round((simpleCount / known) * 100) : 0,
  }
}

/** 部首分布（产出 top，至少 1 位） */
export function radicalDistribution(entries: HanziEntry[], limit = 6): InitialRow[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (!e.radical || e.strokes === 0) continue
    map.set(e.radical, (map.get(e.radical) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([radical, count]) => ({ initial: radical, count }))
}

/** 笔画分布分桶 */
export function strokeDistribution(entries: HanziEntry[]): { key: string; label: string; count: number }[] {
  return strokeBuckets(entries.filter((e) => e.strokes > 0))
}

/** 构字法分布 */
export function structureDistribution(entries: HanziEntry[], limit = 5): StructureRow[] {
  const map = new Map<string, string[]>()
  for (const e of entries) {
    if (!e.structure || e.strokes === 0) continue
    if (!map.has(e.structure)) map.set(e.structure, [])
    map.get(e.structure)!.push(e.char)
  }
  const rows = [...map.entries()].map(([structure, chars]) => ({
    structure,
    count: chars.length,
    pct: Math.round((chars.length / entries.filter((x) => x.strokes > 0).length) * 100),
    chars,
  }))
  return rows.sort((a, b) => b.count - a.count).slice(0, limit)
}

/** 温和洞察 */
export function hanziInsights(entries: HanziEntry[], limit = 4): string[] {
  const insights: string[] = []
  const known = entries.filter((e) => e.strokes > 0)

  if (known.length === 0) {
    return ['字库尚无数据，先收录几个常写的字吧。']
  }

  const ov = hanziOverview(entries)
  insights.push(`共收录 ${ov.total} 个汉字，覆盖 ${ov.radicalCount} 个部首，平均 ${ov.avgStrokes} 画。`)

  if (ov.topRadical !== '—') {
    insights.push(`最常见部首是「${ov.topRadical}」，汉字常繁复于一个基础构件。`)
  }

  if (ov.simpleRatio >= 40) {
    insights.push(`库内 ${ov.simpleRatio}% 是 5 画以内的简字，多为独体、表义直白。`)
  } else if (ov.simpleRatio > 0 && ov.simpleRatio < 40) {
    insights.push(`超过六成是多笔画字，形声「声旁+部首」组合是主流。`)
  }

  const topMatches = ov.mostStroked[0] ? ov.mostStroked.join('、') : ''
  if (topMatches) {
    insights.push(`笔画最繁的是「${topMatches}」，书写最须凝神慢写。`)
  }

  const words = entries.filter((e) => (e.words || []).length >= 3)
  if (words.length >= 3) {
    insights.push(`有 ${words.length} 个字的组词丰富（≥3 组），是成句与表达的骨架。`)
  }

  if (ov.total >= 60) {
    insights.push('字库渐丰，可与个人生词、读书笔记联动，让字活起来。')
  }

  return insights.slice(0, limit)
}

/** 用户个人词库对字库的覆盖画像 */
export function vocabularyProfile(library: HanziEntry[], personalText: string): VocabularyProfile {
  const chars = extractChars(personalText)
  const known = new Set(library.map((e) => e.char))
  const matched = chars.filter((c) => known.has(c)).length
  return { chars, matched }
}