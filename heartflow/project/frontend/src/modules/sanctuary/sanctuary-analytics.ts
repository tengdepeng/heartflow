// ============================================================
// 安全岛 · 静修档案分析引擎（sanctuary-analytics）
// 从访问记录（进入/停留/呼吸/释放便签）读出"静修的痕迹"：
// 档案概览、驻足节奏、沉淀分数、温和洞察。
// 全纯函数、本地计算、零网络出口（守宪法第 1 条）。
// 顺着蓝图 13「安全岛心理安全」：只呈现事实，不评判、不催促。
// ============================================================

import type { SanctuaryLog, SanctuaryNote } from './useSanctuary'

// ---- 时区敏感：以本地日为准，统一按"日键 + 小时"降维 ----

const DAY = 86_400_000

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

// ---- 档案概览 ----

export interface SanctuaryOverview {
  totalVisits: number
  /** 总停留（秒） */
  totalSeconds: number
  totalMinutes: number
  /** 平均每次停留（秒） */
  avgDurationSec: number
  /** 最长单次停留（秒） */
  longestSec: number
  totalBreaths: number
  totalNotesReleased: number
  /** 有完整停留（duration>0）的占比 0-100 */
  settledRate: number
  /** 平均每次停留的呼吸次数 */
  avgBreathsPerVisit: number
  /** 近 14 天的活跃日数 */
  activeDays14: number
}

function durationOf(log: SanctuaryLog): number {
  return Math.max(0, Math.floor(log.durationSec || 0))
}

export function sanctuaryOverview(
  logs: SanctuaryLog[],
  now: Date = new Date(),
): SanctuaryOverview {
  const total = logs.length
  let totalSec = 0
  let longest = 0
  let breaths = 0
  let notesReleased = 0
  let settled = 0
  const activeDays = new Set<string>()
  const cutoff = now.getTime() - 14 * DAY

  for (const l of logs) {
    const d = durationOf(l)
    totalSec += d
    if (d > longest) longest = d
    breaths += Math.max(0, Math.floor(l.breathCount || 0))
    notesReleased += Math.max(0, Math.floor(l.notesReleased || 0))
    if (d > 0) settled++
    const t = new Date(l.enterAt).getTime()
    if (isFinite(t)) {
      const k = dayKey(t)
      if (t >= cutoff) activeDays.add(k)
    }
  }

  return {
    totalVisits: total,
    totalSeconds: totalSec,
    totalMinutes: Math.round(totalSec / 60),
    avgDurationSec: total ? Math.round(totalSec / total) : 0,
    longestSec: longest,
    totalBreaths: breaths,
    totalNotesReleased: notesReleased,
    settledRate: total ? Math.round((settled / total) * 100) : 0,
    avgBreathsPerVisit: total ? Math.round((breaths / total) * 10) / 10 : 0,
    activeDays14: activeDays.size,
  }
}

// ---- 驻足节奏 ----

export interface RetreatRhythm {
  /** 最近 7 天内完成的进入次数 */
  weeklyVisits: number
  /** 已连续造访的天数（今日无则从昨日回溯） */
  consecutiveDays: number
  /** 历次造访的时段偏好（0-23，取众数） */
  preferredHour: number | null
  /** 最近一次造访时刻 */
  lastVisit: string | null
  /** 平均间隔（小时） */
  avgGapHours: number | null
  /** 近 7 天是否每天都在造访 */
  isDailyThisWeek: boolean
}

export function retreatRhythm(logs: SanctuaryLog[], now: Date = new Date()): RetreatRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY

  let weekly = 0
  let last: string | null = null
  const hourHist = new Map<number, number>()
  const times: number[] = []

  for (const l of logs) {
    const t = new Date(l.enterAt).getTime()
    if (!isFinite(t)) continue
    times.push(t)
    if (t >= weekAgo) weekly++
    if (last === null || t > new Date(last).getTime()) last = l.enterAt
    const h = new Date(t).getHours()
    hourHist.set(h, (hourHist.get(h) || 0) + 1)
  }

  // 连续造访天数：从今日（或今日无则昨日）往前回溯
  const daySet = new Set(times.map(dayKey))
  let consecutive = 0
  const anchorDay = daySet.has(dayKey(nowT)) ? startOfDay(nowT) : startOfDay(nowT) - DAY
  let cursor = anchorDay
  while (daySet.has(dayKey(cursor))) {
    consecutive++
    cursor -= DAY
  }

  let preferredHour: number | null = null
  let maxCount = 0
  for (const [h, c] of hourHist) {
    if (c > maxCount) {
      maxCount = c
      preferredHour = h
    }
  }

  let avgGapHours: number | null = null
  if (times.length > 1) {
    const sorted = [...times].sort((a, b) => a - b)
    let gap = 0
    for (let i = 1; i < sorted.length; i++) gap += sorted[i] - sorted[i - 1]
    avgGapHours = Math.round((gap / (sorted.length - 1)) / 3_600_000)
  }

  const uniqueDaysThisWeek = daySet.size

  return {
    weeklyVisits: weekly,
    consecutiveDays: consecutive,
    preferredHour,
    lastVisit: last,
    avgGapHours,
    isDailyThisWeek: uniqueDaysThisWeek >= 7,
  }
}

// ---- 静修沉淀分数（0-100）----

export interface SanctuaryGrowth {
  /** 0-100：越「频繁而深沉」越高 */
  score: number
  /** 广度（日均造访）0-100 */
  breadth: number
  /** 深度（平均停留时长）0-100 */
  depth: number
  /** 仪式感（呼吸练习参与度）0-100 */
  ritual: number
  label: string
}

export function sanctuaryGrowth(logs: SanctuaryLog[], now: Date = new Date()): SanctuaryGrowth {
  const ov = sanctuaryOverview(logs, now)

  // 广度：最近 14 天活跃日数（≥7 天得满分）
  const breadth = clamp(Math.round((ov.activeDays14 / 7) * 100))

  // 深度：平均停留分钟（≥30 分钟得满分）
  const avgMin = ov.avgDurationSec / 60
  const depth = clamp(Math.round((avgMin / 30) * 100))

  // 仪式感：有呼吸练习的造访占比
  const withBreath = logs.filter((l) => Math.max(0, Math.floor(l.breathCount || 0)) > 0).length
  const ritualScore = logs.length ? Math.round((withBreath / logs.length) * 100) : 0
  const ritual = clamp(ritualScore)

  const score = Math.round(breadth * 0.4 + depth * 0.35 + ritual * 0.25)

  const label =
    score >= 70 ? '深耕静修' : score >= 45 ? '渐入静境' : score >= 20 ? '初尝静憩' : '轻轻来过'

  return { score, breadth, depth, ritual, label }
}

// ---- 温和洞察（只呈现，不催促） ----

export function sanctuaryInsights(
  logs: SanctuaryLog[],
  notes: SanctuaryNote[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  const out: string[] = []
  if (logs.length === 0) {
    out.push('安全岛还空着。想停一停的时候，屏息片刻，它就在。')
    return out
  }

  const ov = sanctuaryOverview(logs, now)
  const rhythm = retreatRhythm(logs, now)
  const growth = sanctuaryGrowth(logs, now)

  if (growth.score > 0) {
    out.push(`近来的造访沉淀为「${growth.label}」。`)
  }
  if (rhythm.consecutiveDays >= 3) {
    out.push(`已连续 ${rhythm.consecutiveDays} 天进来停一停，熟悉的角落会长出手感。`)
  }
  if (ov.avgDurationSec >= 300) {
    out.push(`单次平均停留约 ${Math.round(ov.avgDurationSec / 60)} 分钟——足够让呼吸慢下来。`)
  }
  if (ov.longestSec >= 600) {
    out.push(`最长的一次你停住了 ${Math.floor(ov.longestSec / 60)} 分钟，那段时间是属于自己的。`)
  }
  if (ov.totalBreaths > 0) {
    out.push(`累计完成了 ${ov.totalBreaths} 次呼吸练习。`)
  }
  if (ov.totalNotesReleased > 0) {
    out.push(`曾经放下 ${ov.totalNotesReleased} 条便签，放下的东西不必记挂。`)
  }
  if (notes.length > 0) {
    out.push(`此刻还留着 ${notes.length} 条便签，它们替你留着一句话。`)
  }
  if (rhythm.preferredHour !== null) {
    out.push(`你更常在 ${formatHour(rhythm.preferredHour)} 来到这里。`)
  }

  return out.slice(0, limit)
}

function formatHour(h: number): string {
  if (h < 5) return '深夜'
  if (h < 9) return '清晨'
  if (h < 12) return '上午'
  if (h < 14) return '正午'
  if (h < 18) return '午后'
  if (h < 21) return '傍晚'
  return '夜晚'
}