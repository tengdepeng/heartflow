// ============================================================
// 殿堂辞典 · 多维查字引擎 (模块三十六)
// 拼音 / 部首 / 笔画 / 关键字 四类查字入口，全部本地离线纯函数
// ============================================================

import type { HanziEntry } from './hanzi-data'

/** 部首分组项 */
export interface RadicalGroup {
  radical: string
  count: number
  chars: HanziEntry[]
}

/** 笔画分桶 */
export interface StrokeBucket {
  key: string
  label: string
  count: number
}

const TONE_MAP: Record<string, string> = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v' }

/** 去掉拼音声调，返回不区分声调的全拼 */
export function normalizePinyin(input: string): string {
  let out = ''
  for (const ch of input) {
    const c = ch.toLowerCase()
    out += TONE_MAP[c] || c
  }
  return out
}

/** 关键字查字：匹配 字 / 拼音(去调) / 部首 / 释义 / 构字 / 组词 */
export function searchHanzi(query: string, db: HanziEntry[]): HanziEntry[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '')
  if (!q) return []
  const nq = normalizePinyin(q)
  return db.filter((e) =>
    e.char.includes(q) ||
    e.noTone.includes(nq) ||
    normalizePinyin(e.noTone).includes(nq) ||
    e.pinyin.toLowerCase().includes(q) ||
    (e.radical || '').includes(q) ||
    e.meaning.includes(q) ||
    (e.structure || '').includes(q) ||
    (e.words || []).some((w) => w.includes(q))
  )
}

/** 拼音查字：支持全拼(带调/不带调/带调号数字)与拼音首字母/前缀 */
export function byPinyin(text: string, db: HanziEntry[]): HanziEntry[] {
  const raw = text.trim().toLowerCase()
  if (!raw) return []
  const nq = normalizePinyin(raw)
  // 数字声调：xin1
  const m = raw.match(/^([a-zü]+)([1-4])$/)
  if (m) {
    const nnq = normalizePinyin(m[1])
    return db.filter((e) => e.noTone === nnq && toneOf(e.pinyin) === m[2])
  }
  if (!/^[a-zü]+$/.test(nq)) return []
  // 完整全拼精确匹配
  if (db.some((e) => e.noTone === nq)) {
    return db.filter((e) => e.noTone === nq)
  }
  // 前缀（≥2 字符）或单字母声母（如 x → 心/星/想…）
  return db.filter((e) =>
    (nq.length >= 2 && e.noTone.startsWith(nq)) ||
    (nq.length === 1 && e.initial === nq)
  )
}

/** 提取拼音声调数字（1-4）；无标注返回 '' */
export function toneOf(pinyin: string): string {
  const dig = pinyin.match(/[1-4]/)
  return dig ? dig[0] : ''
}

/** 部首查字 */
export function byRadical(radical: string, db: HanziEntry[]): HanziEntry[] {
  const r = radical.trim()
  if (!r) return []
  return db.filter((e) => e.radical === r)
}

/** 笔画区间查字：[min, max] 闭区间 */
export function byStrokeRange(min: number, max: number, db: HanziEntry[]): HanziEntry[] {
  return db.filter((e) => e.strokes >= min && e.strokes <= max)
}

/** 列出库内全部部首（含计数与字），按名称排序 */
export function listRadicals(db: HanziEntry[]): RadicalGroup[] {
  const map = new Map<string, HanziEntry[]>()
  for (const e of db) {
    const r = e.radical || '未分类'
    if (!map.has(r)) map.set(r, [])
    map.get(r)!.push(e)
  }
  return [...map.entries()]
    .map(([radical, chars]) => ({ radical, count: chars.length, chars }))
    .sort((a, b) => a.radical.localeCompare(b.radical, 'zh'))
}

/** 按笔画分桶统计（1-5 / 6-10 / 11-15 / 16+） */
export function strokeBuckets(db: HanziEntry[]): StrokeBucket[] {
  const buckets: StrokeBucket[] = [
    { key: 'lo', label: '1-5 画', count: 0 },
    { key: 'mid', label: '6-10 画', count: 0 },
    { key: 'hi', label: '11-15 画', count: 0 },
    { key: 'xh', label: '16+ 画', count: 0 },
  ]
  for (const e of db) {
    const s = e.strokes
    if (s <= 5) buckets[0].count++
    else if (s <= 10) buckets[1].count++
    else if (s <= 15) buckets[2].count++
    else buckets[3].count++
  }
  return buckets.filter((b) => b.count > 0)
}

/** 抽取一个 HanziEntry 的不可变快照（供外部操作，避免改到库对象） */
export function cloneHanzi(e: HanziEntry): HanziEntry {
  return { ...e, words: [...(e.words ?? [])] }
}