// ============================================================
// 匠庐 · 匠庐档案分析引擎（craft-analytics）
// 从每一件作品的类型、状态、进化与时间线里，读出「匠心」的成色。
// 作品概览、状态分布、类型分布、进化分档、创作节律、匠庐健康、温和洞察。
// 全纯函数、本地计算、零网络出口，接受 now 以保证时间可测试。
// ============================================================

import type { CraftWork, WorkStatus, WorkType } from './types'

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

const DAY = 24 * 60 * 60 * 1000

// ---- 元数据 ----

export const WORK_STATUS_META: Record<WorkStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: '#9aa0a8' },
  refining: { label: '打磨中', color: '#e0a040' },
  completed: { label: '已完成', color: '#6bae7a' },
  archived: { label: '归档', color: '#8a8a9a' },
}

export const WORK_TYPE_META: Record<WorkType, { label: string; icon: string; color: string }> = {
  writing: { label: '写作', icon: '✍', color: '#c8a87a' },
  code: { label: '代码', icon: '⌨', color: '#6b9fc4' },
  design: { label: '设计', icon: '🎨', color: '#a07c8c' },
  plan: { label: '规划', icon: '🗺', color: '#8a9a7a' },
  insight: { label: '洞见', icon: '💡', color: '#f0c040' },
}

export interface EvolutionStageMeta {
  key: string
  label: string
  color: string
  from: number
  to: number
}

export const EVOLUTION_STAGES: EvolutionStageMeta[] = [
  { key: 'seed', label: '胚料', color: '#8a7a6a', from: 0, to: 24 },
  { key: 'rough', label: '粗坯', color: '#a08a7a', from: 25, to: 49 },
  { key: 'refine', label: '细琢', color: '#b89a7a', from: 50, to: 74 },
  { key: 'polish', label: '打磨', color: '#d0a860', from: 75, to: 99 },
  { key: 'done', label: '成品', color: '#e8c060', from: 100, to: 100 },
]

// ---- 作品概览 ----

export interface CraftWorkOverview {
  total: number
  /** 平均进化 0-100 */
  avgEvolution: number
  /** 已完成数量 */
  completed: number
  /** 打磨中的数量 */
  wip: number
  /** 归档数量 */
  archived: number
  /** 打磨次数总数（进化史条目数） */
  totalPolishEvents: number
  /** 获得的最高进化作品 */
  peak: { name: string; evolution: number; icon: string } | null
  /** 最近创作的作品 */
  latest: { name: string; date: string } | null
}

export function craftOverview(works: CraftWork[]): CraftWorkOverview {
  const total = works.length
  let completed = 0
  let wip = 0
  let archived = 0
  let evoSum = 0
  let peak: { name: string; evolution: number; icon: string } | null = null
  let latest: { name: string; date: string } | null = null
  let polish = 0

  for (const w of works) {
    if (w.status === 'completed') completed++
    else if (w.status === 'refining') wip++
    else if (w.status === 'draft') wip++
    if (w.status === 'archived') archived++
    evoSum += w.evolution ?? 0
    polish += w.evolutionHistory?.length ?? 0
    if (!peak || (w.evolution ?? 0) > peak.evolution) peak = { name: w.name, evolution: w.evolution ?? 0, icon: w.icon }
    const date = w.createdAt || w.date
    if (date && (!latest || date > latest.date)) latest = { name: w.name, date }
  }

  return {
    total,
    avgEvolution: total ? Math.round((evoSum / total) * 10) / 10 : 0,
    completed,
    wip,
    archived,
    totalPolishEvents: polish,
    peak,
    latest,
  }
}

// ---- 通用分布行 ----

export interface CraftRow {
  key: string
  label: string
  color: string
  /** 图标（类型分布用） */
  icon?: string
  count: number
  /** 占比 0-100 */
  pct: number
}

const STATUS_ORDER: WorkStatus[] = ['draft', 'refining', 'completed', 'archived']
const TYPE_ORDER: WorkType[] = ['writing', 'code', 'design', 'plan', 'insight']

/** 状态分布 */
export function craftStatusRows(works: CraftWork[]): CraftRow[] {
  const total = works.length || 1
  return STATUS_ORDER.map((status) => {
    const count = works.filter((w) => w.status === status).length
    return { key: status, ...WORK_STATUS_META[status], count, pct: Math.round((count / total) * 100) }
  })
}

/** 类型分布 */
export function craftTypeRows(works: CraftWork[]): CraftRow[] {
  const total = works.length || 1
  return TYPE_ORDER.map((type) => {
    const count = works.filter((w) => w.type === type).length
    return { key: type, ...WORK_TYPE_META[type], count, pct: Math.round((count / total) * 100) }
  })
}

/** 进化分档（胚料→成品） */
export function craftEvolutionRows(works: CraftWork[]): CraftRow[] {
  const total = works.length || 1
  return EVOLUTION_STAGES.map((stage) => {
    const count = works.filter((w) => {
      const e = w.evolution ?? 0
      return e >= stage.from && e <= stage.to
    }).length
    return { key: stage.key, label: stage.label, color: stage.color, count, pct: Math.round((count / total) * 100) }
  })
}

// ---- 创作节律 ----

export interface CraftRhythm {
  /** 近 30 天新作 */
  recent30: number
  /** 近 90 天新作 */
  recent90: number
  /** 近 7 天有打磨/创作活动 */
  active7: number
  /** 最近一次创作距今的天数（作品无则 null） */
  daysSinceLastCreated: number | null
  /** 既有打磨史的作品数 */
  worksPolished: number
}

export function craftRhythm(works: CraftWork[], now: Date = new Date()): CraftRhythm {
  const nowT = now.getTime()
  const cutoff30 = nowT - 30 * DAY
  const cutoff90 = nowT - 90 * DAY
  const cutoff7 = nowT - 7 * DAY

  let recent30 = 0
  let recent90 = 0
  let active7 = 0
  let polished = 0
  let lastCreated: { t: number } | null = null

  for (const w of works) {
    const createdAt = new Date(w.createdAt || w.date).getTime()
    const updatedAt = new Date(w.updatedAt || w.createdAt || w.date).getTime()
    if (isFinite(createdAt)) {
      if (createdAt >= cutoff30) recent30++
      if (createdAt >= cutoff90) recent90++
      if (!lastCreated || createdAt > lastCreated.t) lastCreated = { t: createdAt }
      if (createdAt >= cutoff7 || (isFinite(updatedAt) && updatedAt >= cutoff7)) active7++
    }
    if (w.evolutionHistory && w.evolutionHistory.length > 0) polished++
  }

  return {
    recent30,
    recent90,
    active7,
    daysSinceLastCreated: lastCreated ? clamp(Math.round((nowT - lastCreated.t) / DAY), 0, 9999) : null,
    worksPolished: polished,
  }
}

// ---- 匠庐健康（0-100）----

export interface CraftArchiveHealth {
  /** 0-100 匠心的成色 */
  score: number
  /** 精进（平均进化度）0-100 */
  refine: number
  /** 完成（成品率）0-100 */
  complete: number
  /** 持续（创作活力）0-100 */
  sustain: number
  label: string
}

export function craftHealth(works: CraftWork[], now: Date = new Date()): CraftArchiveHealth {
  const total = works.length
  if (total === 0) {
    return { score: 0, refine: 0, complete: 0, sustain: 0, label: '朴石初开' }
  }

  const avgEvo = works.reduce((s, w) => s + (w.evolution ?? 0), 0) / total
  const completedRatio = works.filter((w) => w.status === 'completed').length / total
  const rhythm = craftRhythm(works, now)
  const recentRatio = Math.min(rhythm.recent90, total) / total
  const polishedRatio = rhythm.worksPolished / total

  const refine = clamp(Math.round((avgEvo / 100) * 45))
  const complete = clamp(Math.round(completedRatio * 30))
  const sustain = clamp(Math.round(recentRatio * 15 + polishedRatio * 10))

  const score = clamp(refine + complete + sustain)
  const label =
    score >= 70 ? '匠心大成' : score >= 45 ? '巧思渐成' : score >= 20 ? '方起炉火' : '朴石初开'

  return { score, refine, complete, sustain, label }
}

// ---- 温和洞察 ----

export function craftInsights(works: CraftWork[], now = new Date(), limit = 4): string[] {
  if (works.length === 0) {
    return ['匠庐还空空如也。从一件「样作」起步，点燃第一炉火。']
  }
  const out: string[] = []
  const ov = craftOverview(works)
  const health = craftHealth(works, now)
  const rhythm = craftRhythm(works, now)
  const types = craftTypeRows(works)
  const evos = craftEvolutionRows(works)

  if (ov.wip > 0) out.push(`${ov.wip} 件半成品正在工作台上，打磨到「细琢」或许就是成品。`)
  if (ov.archived > 0) out.push(`${ov.archived} 件已归档，不妨回望，或许有值得拂尘再启的旧作。`)

  const hasDone = evos.find((e) => e.key === 'done')
  if (hasDone && hasDone.count === 0 && ov.avgEvolution > 0) {
    out.push(`平均进化度 ${ov.avgEvolution}，还差一缕力就能越过「打磨」的门槛。`)
  }

  const domType = types.slice().sort((a, b) => b.count - a.count)[0]
  if (domType && domType.count > 0) {
    out.push(`创作多偏向「${domType.label}」，已经是很拿得出手的一门手艺。`)
  }

  if (rhythm.active7 === 0 && ov.total > 1) {
    out.push('最近一周没有动笔，温故一件半成品，能把火续上。')
  }

  out.push(`当下匠心沉淀为「${health.label}」。`)
  return out.slice(0, limit)
}

// ---- 高频标签 ----

export interface TagCount {
  tag: string
  count: number
}

export function craftTopTags(works: CraftWork[], top = 5): TagCount[] {
  const map = new Map<string, number>()
  for (const w of works) {
    for (const t of w.tags || []) {
      const k = t.trim().toLowerCase()
      if (!k) continue
      map.set(k, (map.get(k) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}