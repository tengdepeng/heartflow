// ============================================================
// 工痕 · 铸造档案分析引擎（scar-analytics）
// 从每一道身体印记读出「锻造」的痕迹：
// 档案概览、类型分布、部位分布、锻造节律、铸造健康、温和洞察。
// 全纯函数、本地计算、零网络出口。
// 顺着蓝图「伤痕·工痕」：如实记录，让时间去重塑，不催促、不评判。
// ============================================================

import type { ScarMark } from './marks'
import { SCAR_TYPE_META } from './types'

const DAY = 86_400_000

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TYPE_ORDER: ScarMark['scarType'][] = ['impact', 'cut', 'burn', 'wear']

// ---- 档案概览 ----

export interface ScarOverview {
  total: number
  /** 轻中度（严重度 ≤3）印记数 */
  mild: number
  /** 重度（严重度 ≥4）印记数 */
  severe: number
  /** 本月新增印记数 */
  thisMonth: number
  /** 涉及的身体部位覆盖数 */
  bodyPartsCovered: number
  /** 平均严重度 1-5 */
  avgSeverity: number
  /** 平均印记年龄（天） */
  avgAgeDays: number
  /** 最近一次记录时刻 */
  lastActive: string | null
}

export function scarOverview(marks: ScarMark[], now: Date = new Date()): ScarOverview {
  const total = marks.length
  const mild = marks.filter((m) => m.severity <= 3).length
  const severe = marks.filter((m) => m.severity >= 4).length

  const nowT = now.getTime()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let thisMonth = 0
  let sevSum = 0
  let ageSum = 0
  let last: string | null = null
  const parts = new Set<string>()

  for (const m of marks) {
    sevSum += m.severity
    parts.add(m.bodyPart)
    if (m.at) {
      const t = new Date(m.at).getTime()
      if (isFinite(t)) {
        if (m.at.startsWith(yearMonth)) thisMonth++
        ageSum += Math.max(0, (nowT - t) / DAY)
        if (last === null || t > new Date(last).getTime()) last = m.at
      }
    }
  }

  return {
    total,
    mild,
    severe,
    thisMonth,
    bodyPartsCovered: parts.size,
    avgSeverity: total ? Math.round((sevSum / total) * 10) / 10 : 0,
    avgAgeDays: total ? Math.round((ageSum / total) * 10) / 10 : 0,
    lastActive: last,
  }
}

// ---- 类型分布 ----

export interface ScarTypeRow {
  type: ScarMark['scarType']
  label: string
  icon: string
  color: string
  count: number
  /** 占比 0-100 */
  pct: number
}

export function scarTypeRows(marks: ScarMark[]): ScarTypeRow[] {
  const total = marks.length || 1
  return TYPE_ORDER.map((type) => {
    const count = marks.filter((m) => m.scarType === type).length
    const meta = SCAR_TYPE_META[type]
    return {
      type,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      count,
      pct: Math.round((count / total) * 100),
    }
  })
}

// ---- 部位分布 ----

export interface ScarBodyRow {
  bodyPart: string
  count: number
  /** 占比 0-100 */
  pct: number
}

export function scarBodyRows(marks: ScarMark[]): ScarBodyRow[] {
  if (marks.length === 0) return []
  const map = new Map<string, number>()
  for (const m of marks) {
    map.set(m.bodyPart, (map.get(m.bodyPart) || 0) + 1)
  }
  const total = marks.length
  return [...map.entries()]
    .map(([bodyPart, count]) => ({ bodyPart, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
}

// ---- 锻造节律 ----

export interface ScarRhythm {
  /** 近 7 天新增印记数 */
  weeklyCount: number
  /** 近 30 天新增印记数 */
  monthlyCount: number
  /** 有记录的天数 */
  activeDays: number
  /** 连续记录天数（今日无则从昨日回溯） */
  streakDays: number
  /** 平均记录间隔（天，≥2 记录时才有意义） */
  avgGapDays: number
}

export function scarRhythm(marks: ScarMark[], now: Date = new Date()): ScarRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY
  const monthAgo = nowT - 30 * DAY

  const stamps: number[] = []
  const dateSet = new Set<string>()
  for (const m of marks) {
    if (!m.at) continue
    const t = new Date(m.at).getTime()
    if (!isFinite(t)) continue
    stamps.push(t)
    dateSet.add(dayKey(t))
  }

  let weekly = 0
  let monthly = 0
  for (const t of stamps) {
    if (t >= weekAgo) weekly++
    if (t >= monthAgo) monthly++
  }

  let streak = 0
  const anchorDay = dateSet.has(dayKey(nowT)) ? nowT : dateSet.has(dayKey(nowT - DAY)) ? nowT - DAY : -1
  if (anchorDay !== -1) {
    let cursor = anchorDay
    while (dateSet.has(dayKey(cursor))) {
      streak++
      cursor -= DAY
    }
  }

  // 平均记录间隔：对每对相邻记录取间隔，平均
  let avgGap = 0
  if (stamps.length >= 2) {
    const sorted = [...stamps].sort((a, b) => a - b)
    let gapSum = 0
    for (let i = 1; i < sorted.length; i++) gapSum += (sorted[i] - sorted[i - 1]) / DAY
    avgGap = Math.round((gapSum / (sorted.length - 1)) * 10) / 10
  }

  return { weeklyCount: weekly, monthlyCount: monthly, activeDays: dateSet.size, streakDays: streak, avgGapDays: avgGap }
}

// ---- 铸造健康（0-100）----

export interface ScarHealth {
  /** 0-100：身体被如实记录的成度 */
  score: number
  /** 觉察广度（覆盖部位 + 类型多样）0-100 */
  breadth: number
  /** 沉淀深度（印记已跨过重塑期的比例）0-100 */
  depth: number
  /** 锻造节律（近 14 天的活跃记录日数）0-100 */
  cadence: number
  label: string
}

export function scarHealth(marks: ScarMark[], now: Date = new Date()): ScarHealth {
  // 觉察广度：覆盖部位（11 部位基础） + 类型多样（4 类）
  const parts = new Set(marks.map((m) => m.bodyPart))
  const partScore = (Math.min(parts.size, 11) / 11) * 100
  const types = new Set(marks.map((m) => m.scarType))
  const typeScore = (types.size / 4) * 100
  const breadth = Math.round(partScore * 0.6 + typeScore * 0.4)

  // 沉淀深度：跨过重塑期（≥14 天）且已属疤痕（≥7 天）的印记比例
  const cutoff = now.getTime() - 14 * DAY
  const settled = marks.filter((m) => {
    if (!m.at) return false
    const t = new Date(m.at).getTime()
    return isFinite(t) && t <= cutoff
  }).length
  const depth = marks.length ? clamp(Math.round((settled / marks.length) * 100)) : 0

  // 锻造节律：近 14 天活跃记录日数（≥4 天得满分）
  const recCutoff = now.getTime() - 14 * DAY
  const activeDays = new Set<string>()
  for (const m of marks) {
    if (!m.at) continue
    const t = new Date(m.at).getTime()
    if (isFinite(t) && t >= recCutoff) activeDays.add(dayKey(t))
  }
  const cadence = clamp(Math.round((activeDays.size / 4) * 100))

  const score = Math.round(breadth * 0.4 + depth * 0.35 + cadence * 0.25)
  const label =
    score >= 70 ? '千锤已锻' : score >= 45 ? '渐入锻造' : score >= 20 ? '粗砺初记' : '印记待启'

  return { score, breadth, depth, cadence, label }
}

// ---- 温和洞察 ----

export function scarInsights(
  marks: ScarMark[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  if (marks.length === 0) {
    return ['工痕尚未开炉。身体留下的印记值得被如实看见——点下砧板，记下最近一道。']
  }

  const out: string[] = []
  const ov = scarOverview(marks, now)
  const rh = scarRhythm(marks, now)
  const health = scarHealth(marks, now)
  const types = scarTypeRows(marks)

  if (ov.severe > 0) {
    out.push(`有 ${ov.severe} 道重度印记（≥4 级），共 ${ov.total} 道里占了可观的一部分——先照顾最疼的。`)
  } else {
    out.push(`${ov.total} 道印记里都属中轻度，身体在平稳地承受与修复。`)
  }

  if (ov.lastActive) {
    const days = Math.round((now.getTime() - new Date(ov.lastActive).getTime()) / DAY)
    out.push(days <= 3 ? '近几日有新的印记被如实记下，觉察仍在持续。' : `最近一次记录在 ${days} 天前，身体的声音需要被再次听见。`)
  }

  if (rh.streakDays >= 3) {
    out.push(`已连续 ${rh.streakDays} 天记录，工痕日志在成形。`)
  }

  const dominant = types.reduce((a, b) => (b.count > a.count ? b : a), types[0])
  if (dominant && dominant.count > 0) {
    out.push(`最常见的是${dominant.icon} ${dominant.label}（${dominant.count} 道）。`)
  }

  if (health.score > 0) {
    out.push(`近期铸造沉淀为「${health.label}」。`)
  }

  return out.slice(0, limit)
}