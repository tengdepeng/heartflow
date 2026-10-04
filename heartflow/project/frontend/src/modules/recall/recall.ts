// ============================================================
// 记忆回廊 · 每日回顾 + 随机漫游（flomo 式）
// ------------------------------------------------------------
// 借鉴 flomo 的「每日回顾 / 随机漫游」——对抗遗忘曲线，让旧记录重新浮现。
// 与 INCR-516「那年今日」区分：那年今日锚定「同一月日」的历史，
// 本模块则是「整库随机抽样」的回顾流（可跨任意日期），二者互补。
//
// 数据来源（全部本地读取，不触云，符合宪法第 1 条「本地私有」）：
//   - 阅读摘录  modules/reading/reading-content（键 hf:reading_excerpts）
//   - 照片日记  modules/anchor/photo-diary（键 hf:anchor:photo_diary）
//
// 分层：纯函数（可注入 today / 随机源，便于单测）+ useRecall 组合式（接线存储）。
// ============================================================

import { computed, ref } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import { useReading, type Excerpt } from '../reading/reading-content'
import { usePhotoDiary, type PhotoEntry } from '../anchor/photo-diary'

/** 记忆类型 */
export type RecallKind = 'excerpt' | 'photo'

/** 归一化后的「一条可回顾记忆」 */
export interface RecallMemory {
  /** 稳定唯一键（源类型 + 源 id），用于漫游去重 */
  key: string
  kind: RecallKind
  /** 归属日期 YYYY-MM-DD（本地日历日口径） */
  date: string
  /** 原始 ISO 时间戳 */
  at: string
  /** 标题（摘录=来源书名；照片=日期） */
  title: string
  /** 正文（摘录文本 / 照片说明），可能为空 */
  text: string
  /** 摘录随记（仅摘录，可能为空） */
  note?: string
  /** 缩略图（仅照片） */
  thumb?: string
  /** 原图（仅照片，供全屏查看） */
  src?: string
  /** 摘录标记色（仅摘录） */
  color?: string
}

/** 回顾统计（供面板头部展示） */
export interface RecallStats {
  total: number
  excerpts: number
  photos: number
  /** 最早一条距今的天数（无记忆时为 0） */
  oldestDays: number
}

/** 安全取本地日历日键（非法时间戳回落空串） */
function safeDateKey(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : getLocalDateKey(d)
}

/** 把 YYYY-MM-DD 转为本地日序号（用于天数差，规避 UTC 偏移） */
function localDayNumber(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
  return Number.isNaN(t) ? null : Math.round(t / 86_400_000)
}

/** 摘录 → 记忆 */
export function excerptToMemory(ex: Excerpt): RecallMemory {
  return {
    key: `excerpt:${ex.id}`,
    kind: 'excerpt',
    date: safeDateKey(ex.createdAt),
    at: ex.createdAt,
    title: ex.source || '摘录',
    text: ex.text || '',
    note: ex.note || undefined,
    color: ex.color,
  }
}

/** 照片条目 → 记忆（取首图缩略图与原图） */
export function photoToMemory(pe: PhotoEntry): RecallMemory {
  const caption = pe.caption || pe.captions?.find(c => !!c) || ''
  return {
    key: `photo:${pe.id}`,
    kind: 'photo',
    date: pe.date,
    at: pe.createdAt,
    title: `照片 · ${pe.date}`,
    text: caption,
    thumb: pe.thumbs?.[0] || pe.images?.[0] || '',
    src: pe.images?.[0] || pe.thumbs?.[0] || '',
  }
}

/**
 * 汇总两类记忆为统一时间线（按日期倒序，同日按时间戳倒序）。
 * 空内容项（无正文的摘录 / 无图的照片）直接剔除。
 */
export function collectMemories(excerpts: Excerpt[], photos: PhotoEntry[]): RecallMemory[] {
  const out: RecallMemory[] = []
  for (const ex of excerpts) {
    if (ex && typeof ex.id === 'string' && (ex.text || ex.note)) out.push(excerptToMemory(ex))
  }
  for (const pe of photos) {
    if (pe && typeof pe.id === 'string' && pe.images?.length) out.push(photoToMemory(pe))
  }
  out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    if (a.at !== b.at) return a.at < b.at ? 1 : -1
    return a.key < b.key ? 1 : -1
  })
  return out
}

/** 只保留「今天之前」的旧记忆（回顾的本质是回看过去） */
export function pastMemories(memories: RecallMemory[], today: string): RecallMemory[] {
  return memories.filter(m => !!m.date && m.date < today)
}

/** 记忆年龄标签：今天 / 昨天 / N 天前 / N 周前 / N 个月前 / N 年前 */
export function ageLabel(date: string, today: string): string {
  const a = localDayNumber(date)
  const b = localDayNumber(today)
  if (a == null || b == null) return ''
  const days = b - a
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}

/** 32 位 FNV-1a 哈希（每日回顾的稳定种子） */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 伪随机数发生器（同种子同序列，确定性洗牌） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 确定性洗牌（Fisher-Yates + mulberry32），不修改入参 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rnd = mulberry32(seed)
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/**
 * 每日回顾：以 dateKey 为种子确定性挑选 count 条旧记忆。
 * 同一天内多次渲染结果稳定，跨日自动换一批（flomo「每日回顾」的稳定感）。
 */
export function pickDailyReview(memories: RecallMemory[], dateKey: string, count = 6): RecallMemory[] {
  const pool = pastMemories(memories, dateKey)
  if (!pool.length || count <= 0) return []
  const picked = seededShuffle(pool, hashSeed(`daily:${dateKey}`)).slice(0, count)
  return picked.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/**
 * 随机漫游：随机挑一条旧记忆；可传 excludeKey 避免连续重复。
 * rnd 可注入以便单测固定结果。
 */
export function pickRoam(
  memories: RecallMemory[],
  today: string,
  excludeKey?: string,
  rnd: () => number = Math.random,
): RecallMemory | null {
  let pool = pastMemories(memories, today)
  if (!pool.length) return null
  if (excludeKey && pool.length > 1) pool = pool.filter(m => m.key !== excludeKey)
  const idx = Math.min(pool.length - 1, Math.floor(rnd() * pool.length))
  return pool[idx] ?? null
}

/** 回顾统计（仅统计旧记忆） */
export function recallStats(memories: RecallMemory[], today: string): RecallStats {
  const past = pastMemories(memories, today)
  const todayNum = localDayNumber(today)
  let oldestDays = 0
  for (const m of past) {
    const n = localDayNumber(m.date)
    if (n == null || todayNum == null) continue
    const days = todayNum - n
    if (days > oldestDays) oldestDays = days
  }
  return {
    total: past.length,
    excerpts: past.filter(m => m.kind === 'excerpt').length,
    photos: past.filter(m => m.kind === 'photo').length,
    oldestDays,
  }
}

/** 每日回顾默认条数 */
export const DAILY_REVIEW_COUNT = 6

/**
 * 记忆回廊组合式：接线阅读摘录 + 照片日记存储，暴露回顾流与漫游。
 * 存储读写全部经既有模块 API，本组合式不直接触碰 storage 键。
 */
export function useRecall() {
  const { excerpts, load: loadReading } = useReading()
  const { entries, load: loadPhotos } = usePhotoDiary()

  const today = ref(getLocalDateKey())
  const memories = ref<RecallMemory[]>([])
  const roam = ref<RecallMemory | null>(null)

  /** 从存储重载并重建记忆时间线（跨日时刷新 today） */
  function refresh(): void {
    loadReading()
    loadPhotos()
    today.value = getLocalDateKey()
    memories.value = collectMemories(excerpts.value, entries.value)
  }

  const dailyReview = computed(() => pickDailyReview(memories.value, today.value, DAILY_REVIEW_COUNT))
  const stats = computed(() => recallStats(memories.value, today.value))

  /** 漫游一条（排除当前，避免原地打转） */
  function roamOnce(): void {
    roam.value = pickRoam(memories.value, today.value, roam.value?.key)
  }

  return { today, memories, dailyReview, stats, roam, refresh, roamOnce }
}
