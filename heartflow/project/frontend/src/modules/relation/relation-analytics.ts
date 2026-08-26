// ============================================================
// 羁绊之厅 · 羁绊档案分析引擎（relation-analytics）
// 从每一位故人与每一段互动，读出「羁绊」的经纬。
// 档案概览、类型分布、互动节律、羁绊健康、温和洞察。
// 全纯函数、本地计算、零网络出口。
// 顺着「羁绊」蓝图：关系是编织出来的，是否记得与是否往来，皆有迹可循。
// ============================================================

import type { Person } from './types'
import type { InteractionEntry, InteractionKind } from './interaction-journal'
import { RELATION_LABELS, RELATION_COLORS } from './types'
import { INTERACTION_KIND_META } from './interaction-journal'

const DAY = 86_400_000

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 某人与最近互动相隔天数；无互动返回 null */
export function daysSinceLast(
  person: Person,
  interactions: InteractionEntry[],
  now: Date = new Date(),
): number | null {
  const dates = interactions
    .filter((i) => i.personId === person.id)
    .map((i) => new Date(i.date).getTime())
    .filter((t) => isFinite(t))
  if (dates.length === 0) return null
  return Math.max(0, Math.round((now.getTime() - Math.max(...dates)) / DAY))
}

// ---- 档案概览 ----

export interface RelationOverview {
  total: number
  /** 本月新增人物 */
  thisMonthAdded: number
  /** 有互动记录的人数 */
  withInteraction: number
  /** 从无互动的人数 */
  neverInteracted: number
  /** 超过 60 天没互动的人数 */
  dormantCount: number
  /** 逝者/留座人数 */
  memorialCount: number
  /** 平均亲密度 */
  avgCloseness: number
  /** 平均重要日期数 */
  avgImportantDates: number
  /** 羁绊最亲密的一人 */
  closest: { name: string; closeness: number } | null
}

export function relationOverview(
  persons: Person[],
  interactions: InteractionEntry[],
  now: Date = new Date(),
): RelationOverview {
  const total = persons.length
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let thisMonthAdded = 0
  let withInteraction = 0
  let neverInteracted = 0
  let dormCount = 0
  let memorial = 0
  let closeSum = 0
  let dateSum = 0
  let closest: { name: string; closeness: number } | null = null

  for (const p of persons) {
    if (p.createdAt && p.createdAt.startsWith(yearMonth)) thisMonthAdded++
    if (p.deceased || p.isSeat) memorial++
    closeSum += p.closeness ?? 0.3
    dateSum += p.importantDates?.length ?? 0
    const pDates = interactions.filter((i) => i.personId === p.id).map((i) => new Date(i.date).getTime()).filter((t) => isFinite(t))
    if (pDates.length === 0) neverInteracted++
    else {
      withInteraction++
      if (now.getTime() - Math.max(...pDates) > 60 * DAY) dormCount++
    }
    const c = p.closeness ?? 0.3
    if (!closest || c > closest.closeness) closest = { name: p.name, closeness: c }
  }

  return {
    total,
    thisMonthAdded,
    withInteraction,
    neverInteracted,
    dormantCount: dormCount,
    memorialCount: memorial,
    avgCloseness: total ? Math.round((closeSum / total) * 100) / 100 : 0,
    avgImportantDates: total ? Math.round((dateSum / total) * 10) / 10 : 0,
    closest,
  }
}

// ---- 类型分布 ----

export interface RelationTypeRow {
  type: Person['relation']
  label: string
  color: string
  count: number
  /** 占比 0-100 */
  pct: number
}

const TYPE_ORDER: Person['relation'][] = ['family', 'lover', 'friend', 'colleague', 'mentor', 'other']

export function relationTypeRows(persons: Person[]): RelationTypeRow[] {
  const total = persons.length || 1
  return TYPE_ORDER.map((type) => {
    const count = persons.filter((p) => p.relation === type).length
    return { type, label: RELATION_LABELS[type], color: RELATION_COLORS[type], count, pct: Math.round((count / total) * 100) }
  })
}

// ---- 互动节律 ----

export interface RelationRhythm {
  /** 互动记录总数 */
  totalInteractions: number
  /** 近 7 天互动数 */
  weeklyCount: number
  /** 近 30 天互动数 */
  monthlyCount: number
  /** 有互动的天数 */
  activeDays: number
  /** 连续记录天数（今日无则从昨日回溯） */
  streakDays: number
  /** 平均单日互动数 */
  avgPerDay: number
}

export function relationRhythm(interactions: InteractionEntry[], now: Date = new Date()): RelationRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY
  const monthAgo = nowT - 30 * DAY

  let weekly = 0
  let monthly = 0
  const dateSet = new Set<string>()
  for (const i of interactions) {
    const t = new Date(i.date).getTime()
    if (!isFinite(t)) continue
    dateSet.add(dayKey(t))
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

  const actDayCount = dateSet.size
  return {
    totalInteractions: interactions.length,
    weeklyCount: weekly,
    monthlyCount: monthly,
    activeDays: actDayCount,
    streakDays: streak,
    avgPerDay: actDayCount ? Math.round((interactions.length / actDayCount) * 10) / 10 : 0,
  }
}

// ---- 羁绊健康（0-100）----

export interface RelationHealth {
  /** 0-100 关系网络的温热程度 */
  score: number
  /** 广度（人均互动 + 类型多样）0-100 */
  breadth: number
  /** 频率（近 14 天互动活跃度）0-100 */
  cadence: number
  /** 维系（无长期沉寂人数占比）0-100 */
  sustain: number
  label: string
}

export function relationHealth(
  persons: Person[],
  interactions: InteractionEntry[],
  now: Date = new Date(),
): RelationHealth {
  const nowT = now.getTime()
  const recCutoff = nowT - 14 * DAY

  // 广度：类型覆盖 + 人均互动（每项 4 分，封顶到 64）
  const actTypes = new Set(persons.map((p) => p.relation))
  const interactionsPerPerson = persons.length ? interactions.length / persons.length : 0
  const breadth = Math.round(
    Math.min(actTypes.size, 6) * 6 + // 最多 36
      clamp(Math.round(interactionsPerPerson * 4), 0, 64),
  )

  // 频率：近 14 天活跃互动日（≥7 天得满分）
  const activeDays = new Set<string>()
  for (const i of interactions) {
    const t = new Date(i.date).getTime()
    if (isFinite(t) && t >= recCutoff) activeDays.add(dayKey(t))
  }
  const cadence = clamp(Math.round((activeDays.size / 7) * 100))

  // 维系：超过 60 天未互动占比越低越好
  const nonMemorial = persons.filter((p) => !p.deceased && !p.isSeat)
  let neglected = 0
  for (const p of nonMemorial) {
    const days = daysSinceLast(p, interactions, now)
    if (days !== null && days > 60) neglected++
  }
  const sustain = nonMemorial.length ? clamp(Math.round(((nonMemorial.length - neglected) / nonMemorial.length) * 100)) : 0

  const score = Math.round(breadth * 0.35 + cadence * 0.35 + sustain * 0.3)
  const label =
    score >= 70 ? '羁绊温热' : score >= 45 ? '往来渐密' : score >= 20 ? '偶有回响' : '羁绊待织'

  return { score, breadth, cadence, sustain, label }
}

// ---- 温和洞察 ----

export function relationInsights(
  persons: Person[],
  interactions: InteractionEntry[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  if (persons.length === 0) {
    return ['羁绊之厅空落落。记下生命中重要的人，往网络里织上第一根线。']
  }

  const out: string[] = []
  const ov = relationOverview(persons, interactions, now)
  const rh = relationRhythm(interactions, now)
  const health = relationHealth(persons, interactions, now)
  const types = relationTypeRows(persons)
  const byKind = countByKind(interactions)

  if (ov.neverInteracted > 0) {
    out.push(`${ov.neverInteracted} 位故人还没有互动记录，可以主动送去一声问候。`)
  } else if (ov.dormantCount > 0) {
    out.push(`${ov.dormantCount} 段关系已疏远逾两个月，值得一次回访。`)
  }

  if (rh.streakDays >= 3) {
    out.push(`已连续 ${rh.streakDays} 天有互动往来。`)
  }

  const dominant = types.reduce((a, b) => (b.count > a.count ? b : a), types[0])
  if (dominant && dominant.count > 0) {
    out.push(`人脉中最重的是${dominant.label}（${dominant.count} 位）。`)
  }

  const topKind = byKind[0]
  if (topKind && topKind.count > 0) {
    out.push(`最常用的是${INTERACTION_KIND_META[topKind.kind]?.icon ?? ''} ${INTERACTION_KIND_META[topKind.kind]?.label ?? topKind.kind}。`)
  }

  out.push(`近期羁绊沉淀为「${health.label}」。`)

  return out.slice(0, limit)
}

function countByKind(interactions: InteractionEntry[]): { kind: InteractionKind; count: number }[] {
  const map = new Map<InteractionKind, number>()
  for (const i of interactions) {
    map.set(i.kind, (map.get(i.kind) || 0) + 1)
  }
  return [...map.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count)
}