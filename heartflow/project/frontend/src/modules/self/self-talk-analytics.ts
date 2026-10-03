// ============================================================
// 全我镜 · 自我对话档案分析引擎（self-talk-analytics）
// 从每一条「对自己说的话」里，读出镜中的余温。
// 只呈现不评判：概览、来源分布（来自哪个房间）、节律、
// 对话健康（广度 / 厚度 / 延续）与温和回看建议。
// 全纯函数、本地计算、零网络出口，接受 now 以保证时间可测试。
// ============================================================

import type { SelfTalk } from './types'

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

const DAY = 24 * 60 * 60 * 1000

// ---- 档案概览 ----

export interface SelfTalkOverview {
  /** 对话总数 */
  total: number
  /** 累计记录字数 */
  totalWords: number
  /** 平均每条字数 */
  avgWords: number
  /** 较长对话（≥20 字）条数 */
  richCount: number
  /** 覆盖的来源房间数 */
  sourceCount: number
  /** 自主记录（无房间来源）条数 */
  selfInitiated: number
  /** 最近 30 天对话条数 */
  recent30: number
  /** 最近 7 天对话条数 */
  recent7: number
  /** 最近一次对话的日期 */
  latestDate: string | null
  /** 最长的一次自言自语 */
  longest: { text: string; words: number } | null
}

export function selfTalkOverview(talks: SelfTalk[], now: Date = new Date()): SelfTalkOverview {
  const nowT = now.getTime()
  const c30 = nowT - 30 * DAY
  const c7 = nowT - 7 * DAY
  const sources = new Set<string>()
  let totalWords = 0
  let richCount = 0
  let selfInitiated = 0
  let recent30 = 0
  let recent7 = 0
  let latestDate: string | null = null
  let longest: { text: string; words: number } | null = null

  for (const t of talks) {
    const text = (t.text || '').trim()
    const words = countWords(text)
    totalWords += words
    if (words >= 20) richCount++
    if (t.roomContext) sources.add(t.roomContext)
    else selfInitiated++

    if (!longest || words > longest.words) longest = { text, words }

    const at = new Date(t.at).getTime()
    if (isFinite(at)) {
      if (at >= c30) recent30++
      if (at >= c7) recent7++
      if (!latestDate || t.at > latestDate) latestDate = t.at
    }
  }

  const total = talks.length
  return {
    total,
    totalWords,
    avgWords: total ? Math.round((totalWords / total) * 10) / 10 : 0,
    richCount,
    sourceCount: sources.size,
    selfInitiated,
    recent30,
    recent7,
    latestDate,
    longest,
  }
}

/** 统计中文字数（含标点只计正文，去空白） */
function countWords(text: string): number {
  // 粗略统计：每个非空白字符算一个字（中英文/数字混合场景的轻量度量）
  return text.replace(/\s+/g, '').length
}

// ---- 日志节律（逐日）----

export interface SelfTalkDaily {
  date: string
  count: number
}

/** 近 days 天的逐日对话量（从今天回溯，含今天，不足的天补 0） */
export function selfTalkDailyRows(talks: SelfTalk[], now: Date = new Date(), days = 14): SelfTalkDaily[] {
  const map = new Map<string, number>()
  for (const t of talks) {
    const d = new Date(t.at)
    if (!isFinite(d.getTime())) continue
    const key = localDateKey(d)
    map.set(key, (map.get(key) || 0) + 1)
  }
  const rows: SelfTalkDaily[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY)
    const key = localDateKey(d)
    rows.push({ date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`, count: map.get(key) || 0 })
  }
  return rows
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- 来源分布 ----

export interface SelfTalkSourceRow {
  key: string
  label: string
  count: number
  /** 占比 0-100 */
  pct: number
}

/** 来源房间分布（null 记作「自主记录」） */
export function selfTalkSourceRows(talks: SelfTalk[]): SelfTalkSourceRow[] {
  const total = talks.length || 1
  const map = new Map<string, number>()
  for (const t of talks) {
    const key = t.roomContext || '(自主)'
    map.set(key, (map.get(key) || 0) + 1)
  }
  const rowFor = (key: string, label: string): SelfTalkSourceRow => {
    const count = map.get(key) || 0
    return { key, label, count, pct: Math.round((count / total) * 100) }
  }
  const rows: SelfTalkSourceRow[] = []
  const autoKey = '(自主)'
  const auto = map.get(autoKey)
  for (const key of map.keys()) {
    if (key === autoKey) continue
    rows.push(rowFor(key, key))
  }
  if (auto) rows.push(rowFor(autoKey, '自主'))
  rows.sort((a, b) => b.count - a.count)
  return rows
}

// ---- 对话节律 ----

export interface SelfTalkRhythm {
  /** 近 7 天对话数 */
  recorded7: number
  /** 近 30 天对话数 */
  recorded30: number
  /** 近 7 天有记录的天数 */
  activeDays7: number
  /** 最近一次对话距今（天，无记录为 null） */
  lastGapDays: number | null
  /** 连续有记录的天数（从今天或昨天倒推，无则为 0） */
  streakDays: number
  /** 记录最密集的时刻段 */
  peakSlot: string | null
}

/** 把毫秒时刻归入 6 段大时段 */
function slotOf(t: number): string {
  const d = new Date(t)
  const h = d.getHours()
  if (h >= 5 && h < 9) return '清晨'
  if (h >= 9 && h < 12) return '上午'
  if (h >= 12 && h < 14) return '正午'
  if (h >= 14 && h < 18) return '午后'
  if (h >= 18 && h < 23) return '傍晚'
  return '深夜'
}

export function selfTalkRhythm(talks: SelfTalk[], now: Date = new Date()): SelfTalkRhythm {
  const nowT = now.getTime()
  const c7 = nowT - 7 * DAY
  const c30 = nowT - 30 * DAY
  let recorded7 = 0
  let recorded30 = 0
  const days7 = new Set<string>()
  const slots = new Map<string, number>()
  let latest: number | null = null

  for (const t of talks) {
    const at = new Date(t.at).getTime()
    if (!isFinite(at)) continue
    if (at >= c7) {
      recorded7++
      days7.add(localDateKey(new Date(at)))
    }
    if (at >= c30) recorded30++
    if (!latest || at > latest) latest = at
    const slot = slotOf(at)
    slots.set(slot, (slots.get(slot) || 0) + 1)
  }

  let peakSlot: string | null = null
  for (const [slot, count] of slots) if (!peakSlot || count > (slots.get(peakSlot) || 0)) peakSlot = slot

  const lastGapDays = latest === null ? null : Math.max(0, Math.floor((nowT - latest) / DAY))

  // 连续天数：从今天（或昨天若今天未记）往前数
  let streakDays = 0
  if (latest !== null) {
    const dateSet = new Set(talks
      .map((t) => new Date(t.at).getTime())
      .filter((at) => isFinite(at))
      .map((at) => localDateKey(new Date(at))))
    const todayKey = localDateKey(now)
    let cursor = dateSet.has(todayKey) ? 0 : 1
    // 若今天未记，从昨天起算；若昨天也未记则连续 0
    if (cursor === 1 && !dateSet.has(localDateKey(new Date(nowT - DAY)))) {
      streakDays = 0
    } else {
      while (dateSet.has(localDateKey(new Date(nowT - cursor * DAY)))) {
        streakDays++
        cursor++
      }
    }
  }

  return { recorded7, recorded30, activeDays7: days7.size, lastGapDays, streakDays, peakSlot }
}

// ---- 对话健康（0-100）----

export interface SelfTalkArchiveHealth {
  /** 0-100 镜中对话的丰盈程度 */
  score: number
  /** 广度（来源房间多样）0-100 */
  breadth: number
  /** 厚度（字数沉淀）0-100 */
  depth: number
  /** 延续（近 90 天对话活力度）0-100 */
  continuity: number
  label: string
}

export function selfTalkHealth(talks: SelfTalk[], now: Date = new Date()): SelfTalkArchiveHealth {
  const total = talks.length
  if (total === 0) {
    return { score: 0, breadth: 0, depth: 0, continuity: 0, label: '镜面初拭' }
  }

  const ov = selfTalkOverview(talks, now)
  const sourceCount = ov.sourceCount
  const breadth = clamp(Math.round(Math.min(ov.total, 80) * 0.5 + Math.min(sourceCount, 6) * 6 + ov.selfInitiated * 0.35))

  const avgWords = ov.total ? ov.totalWords / ov.total : 0
  const depth = clamp(Math.round(Math.min(avgWords / 15, 4) * 16 + (ov.richCount / total) * 36))

  const recency = limit01(talks, now, 90)
  const rhythm = selfTalkRhythm(talks, now)
  const continuity = clamp(Math.round(recency * 55 + Math.min(rhythm.activeDays7, 7) * 5 + Math.min(rhythm.recorded30, 24) * 0.5))

  const score = clamp(Math.round(breadth * 0.35 + depth * 0.35 + continuity * 0.3))
  const label = score >= 70 ? '镜中清明' : score >= 45 ? '光影渐明' : score >= 20 ? '镜面初聚' : '镜面初拭'

  return { score, breadth, depth, continuity, label }
}

/** 近 cutoff 天内有记录的条数占比（0-1） */
function limit01(talks: SelfTalk[], now: Date, cutoffDays: number): number {
  const cutoff = now.getTime() - cutoffDays * DAY
  let hit = 0
  for (const t of talks) {
    const at = new Date(t.at).getTime()
    if (isFinite(at) && at >= cutoff) hit++
  }
  return Math.min(hit / Math.max(talks.length, 1), 1)
}

// ---- 温和回看建议 ----

export function selfTalkInsights(talks: SelfTalk[], now = new Date(), limit = 4): string[] {
  if (talks.length === 0) {
    return ['全我镜还是空的。写下第一句对自己说、又不评判自己的话，让镜面开始显影。']
  }
  const out: string[] = []
  const ov = selfTalkOverview(talks, now)
  const health = selfTalkHealth(talks, now)
  const sources = selfTalkSourceRows(talks)
  const rhythm = selfTalkRhythm(talks, now)

  if (ov.recent7 === 0) out.push('近一周没有对自己说话，试着在某个房间停留时，留下一句此刻的余温。')
  if (ov.avgWords < 16 && ov.total > 0) out.push('话还很轻，试着把一句「我看到了」展开，让镜中的身影更真切。')
  const top = sources[0]
  if (top && top.key !== '(自主)' && top.count > 0) out.push(`你常在这样的时刻说话——来自「${top.label}」的对话最多。`)
  if (rhythm.peakSlot) out.push(`你更常在「${rhythm.peakSlot}」留声，那是你靠近自己的时候。`)
  if (ov.selfInitiated === 0 && ov.total > 0) out.push('你还没试过不借助房间、主动对镜说话，那同样是被看见的方式。')
  out.push(`当前镜中的对话沉淀为「${health.label}」。`)
  return out.slice(0, limit)
}
