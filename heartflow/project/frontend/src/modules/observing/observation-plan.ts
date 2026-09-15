// ============================================================
// 时间长廊 · 观测计划生成器（P5-12 星空漫步/天文大师）
// 借鉴「星空漫步/天文大师/天文通」：把观星指数、月相、深空
// 目标与行星可见性整合成「今夜观测计划」。全程本地离线计算，
// 守宪法第1条（本地私有）。纯函数，供 DeepSkyPanel/观测计划渲染。
// ============================================================

import { computeObservingScore, type ObservingScore } from './observing'
import { getMoonPhase, type MoonPhase } from '../timeline/astronomy'
import { DEEP_SKY_CATALOG, TYPE_META, visibilityHint, type DeepSkyObject, type DeepSkyType } from '../sky/deep-sky'
import { planetsAt, PLANET_META, type PlanetPosition } from '../sky/planets'
import { altAz, lstDegrees } from '../sky/starfield'

export interface PlanPhase {
  /** 时段名，如「暮夜」「午夜」「黎明」 */
  label: string
  icon: string
  /** 代表小时 0-24（用于计算天体位置） */
  hour: number
  /** 该时段建议的深空目标 */
  targets: DeepSkyObject[]
  /** 该时段地平线上的裸眼行星 */
  planets: PlanetPosition[]
  /** 一句执行要点 */
  tip: string
}

export interface PlanTarget {
  target: DeepSkyObject
  typeLabel: string
  typeIcon: string
  vision: string
  /** 观测该目标时在地平线上的高度角 */
  altDeg: number
}

export interface ObservationPlan {
  /** YYYY-MM-DD */
  dateKey: string
  moon: MoonPhase
  score: ObservingScore
  /** 当前在可观测夜的等效星等上限 */
  magnitudeLimit: number
  /** 推荐的观察时段 */
  phases: PlanPhase[]
  /** 综合最值得看的深空目标（全天最优排序） */
  bestTargets: PlanTarget[]
  /** 一段话开场 */
  summary: string
}

export interface PlanConfig {
  latDeg?: number
  lngDeg?: number
  lightPollution?: number
  cloud?: number
  boostOnEvents?: boolean
  hour?: number
}

/**
 * 由今夜观测计划生成不超过 4 条的温和观察：
 * 先复述开场摘要，再点出最值得看的目标、月相影响与可执行时段。
 * 纯本地计算，不联网、不臆造天象。
 */
export function observationPlanInsights(plan: ObservationPlan): string[] {
  const out: string[] = []
  if (plan.summary) out.push(plan.summary)

  const best = plan.bestTargets?.[0]
  if (best) {
    out.push(
      `今夜首选 ${best.typeIcon ?? ''}${best.target.name}（${best.typeLabel}），` +
        `地平高度约 ${Math.round(best.altDeg)}°，${best.vision}。`.replace('  ', ' '),
    )
  }

  const moon = plan.moon
  if (moon) {
    const pct = Math.round((moon.illumination ?? 0) * 100)
    out.push(
      pct >= 70
        ? `月相${moon.label}，照亮 ${pct}%，月光较亮，适合先看月亮与亮目标。`
        : `月相${moon.label}，照亮 ${pct}%，暗夜条件不错，深空目标更容易显形。`,
    )
  }

  const phase = (plan.phases ?? []).find((p) => p.targets?.length || p.planets?.length)
  if (phase?.tip) {
    out.push(`${phase.label}：${phase.tip}`)
  }

  return out.slice(0, 4)
}

/** 亮于该星等的深空目标才建议（随光害与月相动态收紧） */
export function effectiveMagnitudeLimit(illumination: number, lightPollution: number): number {
  const i = Math.min(1, Math.max(0, illumination))
  const p = Math.min(10, Math.max(0, lightPollution))
  return Math.round((8 - 0.28 * p - 3.2 * Math.max(0, i - 0.15)) * 10) / 10
}

const PHASES_DEF: Array<{ label: string; icon: string; hour: number }> = [
  { label: '暮夜', icon: '🌆', hour: 20 },
  { label: '午夜', icon: '🌌', hour: 23 },
  { label: '黎明', icon: '🌄', hour: 3 },
]

/** 计算某深空目标在指定时刻的地平高度 */
export function deepSkyAlt(target: Pick<DeepSkyObject, 'ra' | 'dec'>, date: Date, hour: number, latDeg: number, lngDeg: number): number {
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0)
  const lst = lstDegrees(t, lngDeg)
  return altAz(target.ra * 15, target.dec, latDeg, lst).altDeg
}

function typeMeta(t: DeepSkyType): { label: string; icon: string } {
  return TYPE_META[t]
}

function localKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 为某个夜晚生成观测计划。
 * date 通常取当地暮夜开始的日期；hour 用于观星指数时段（默认 20）。
 */
export function buildObservationPlan(date: Date, config: PlanConfig = {}): ObservationPlan {
  const latDeg = config.latDeg ?? 39.9
  const lngDeg = config.lngDeg ?? 116.4
  const lightPollution = config.lightPollution ?? 6
  const cloud = config.cloud ?? 0
  const hour = config.hour ?? 20

  const moon = getMoonPhase(date)
  const score = computeObservingScore({
    hour,
    illumination: moon.illumination,
    lightPollution,
    cloud,
    hasAstroEvent: config.boostOnEvents ?? true,
  })

  const magLimit = effectiveMagnitudeLimit(moon.illumination, lightPollution)

  // 全天候候选：星等 ≤ 上限即可
  let candidates = DEEP_SKY_CATALOG.filter(o => o.mag <= magLimit)

  // 分时段计算
  const phases: PlanPhase[] = PHASES_DEF.map(def => {
    const targets = sortByBestAlt(candidates, date, def.hour, latDeg, lngDeg).slice(0, 4)
    const planets = planetsAt(new Date(date.getFullYear(), date.getMonth(), date.getDate(), def.hour, 30, 0, 0), { latDeg, lngDeg })
      .filter(p => p.aboveHorizon)
      .sort((a, b) => b.altDeg - a.altDeg)
    return {
      label: def.label,
      icon: def.icon,
      hour: def.hour,
      targets,
      planets: planets.slice(0, 3),
      tip: tipForPhase(def.hour, planets[0]),
    }
  })

  // 全程最值得看
  const bestTargets = sortByBestAlt(candidates, date, 23, latDeg, lngDeg).slice(0, 6).map(t => ({
    target: t,
    typeLabel: typeMeta(t.type).label,
    typeIcon: typeMeta(t.type).icon,
    vision: visibilityHint(t.mag),
    altDeg: Math.round(deepSkyAlt(t, date, 23, latDeg, lngDeg)),
  }))

  const summary = buildSummary(score.total, moon.illumination, lightPollution, cloud)

  return {
    dateKey: localKey(date),
    moon,
    score,
    magnitudeLimit: magLimit,
    phases,
    bestTargets,
    summary,
  }
}

function sortByBestAlt(
  items: DeepSkyObject[],
  date: Date,
  hour: number,
  latDeg: number,
  lngDeg: number,
): DeepSkyObject[] {
  return [...items].sort((a, b) => {
    const aa = deepSkyAlt(a, date, hour, latDeg, lngDeg)
    const ba = deepSkyAlt(b, date, hour, latDeg, lngDeg)
    // 优先高于地平线的目标；越高越优先；同高比亮
    if (aa > 0 && ba <= 0) return -1
    if (aa <= 0 && ba > 0) return 1
    if (aa <= 0 && ba <= 0) return b.mag - a.mag
    return ba - aa || a.mag - b.mag
  })
}

function tipForPhase(hour: number, firstPlanet?: PlanetPosition): string {
  if (firstPlanet) {
    return `${firstPlanet.icon} ${PLANET_META[firstPlanet.id as keyof typeof PLANET_META].label} 现于 ${Math.abs(Math.round(firstPlanet.altDeg))}° 高空，肉眼可先认它。`
  }
  if (hour < 4) return '后半夜月光隐去，宜追深空目标。'
  return '若云量合适，可尝试亮星校准与双筒观察。'
}

function buildSummary(
  total: number,
  illumination: number,
  lightPollution: number,
  cloud: number,
): string {
  const heads: string[] = []
  if (illumination >= 0.7) heads.push('今夜月光满溢，深空目标会暗淡——把目光放在行星与亮星云上')
  else if (illumination <= 0.3) heads.push('新月/残月夜，正是深空好时光')
  else heads.push('月相适中，较暗目标可一试')
  if (cloud >= 7) heads.push('云量偏多，建议优先低空高亮度目标或取消')
  if (lightPollution >= 7) heads.push('光害偏重，以亮目标为主')
  if (total >= 70) heads.push('观星指数优良，放心出发')
  if (heads.length === 0) heads.push('按当前条件安排可见目标即可')
  return heads.join('；') + '。'
}