// ============================================================
// 岁时阁 · 蜕变光茧
// 蓝图定义：
//   蜕变回廊已并入岁时阁第三层，光茧记录个人成长阶段
//   每个光茧代表一个蜕变阶段：孕育→破茧→化蝶→飞翔
//   光茧与生命仪礼联动，重要人生节点触发新光茧
// ============================================================

import type { LifeRitual, Season } from './types'

// ---- 光茧阶段 ----

export type CocoonStage = 'gestating' | 'cracking' | 'emerging' | 'flying'

export const COCOON_STAGE_LABELS: Record<CocoonStage, string> = {
  gestating: '孕育中',
  cracking: '破茧中',
  emerging: '化蝶中',
  flying: '飞翔中',
}

export const COCOON_STAGE_ICONS: Record<CocoonStage, string> = {
  gestating: '🥚',
  cracking: '🐛',
  emerging: '🦋',
  flying: '✨',
}

export const COCOON_STAGE_COLORS: Record<CocoonStage, string> = {
  gestating: '#8B6F47',
  cracking: '#C9A96E',
  emerging: '#E8C97A',
  flying: '#F5E6B8',
}

// ---- 驱动力类型（蓝图：颜色代表驱动力类型） ----
// for_someone→暖金色，to_escape→深蓝色逐渐变亮，for_goal→冷白色，awakening→柔和紫色，custom→用户自选

export type DrivingForce = 'for_someone' | 'to_escape' | 'for_goal' | 'awakening' | 'custom'

export const DRIVING_FORCE_LABELS: Record<DrivingForce, string> = {
  for_someone: '为了某个人',
  to_escape: '为了走出困境',
  for_goal: '为了一个目标',
  awakening: '为了觉醒',
  custom: '自定义',
}

export const DRIVING_FORCE_COLORS: Record<DrivingForce, string> = {
  for_someone: '#f0b429', // 暖金
  to_escape: '#2b6cb0', // 深蓝（慢慢变亮）
  for_goal: '#cbd5e1', // 冷白
  awakening: '#b794f4', // 柔和紫
  custom: '#9ae6b4',
}

// ---- 蜕变纹理（蓝图：纹理代表蜕变类型） ----

export type CocoonTexture = 'smooth' | 'rough' | 'layered' | 'cracked'

export const COCOON_TEXTURE_LABELS: Record<CocoonTexture, string> = {
  smooth: '认知转变·光滑微光',
  rough: '艰难蜕变·细密颗粒',
  layered: '多次反复·层叠',
  cracked: '痛苦蜕变·细微裂纹透光',
}

// ---- 光茧 ----

export interface Cocoon {
  id: string
  /** 光茧名称 */
  name: string
  /** 当前阶段 */
  stage: CocoonStage
  /** 所属季节 */
  season: Season
  /** 关联的生命仪礼 */
  lifeRitualId?: string
  /** 关联的生命仪礼名称 */
  lifeRitualName?: string
  /** 阶段变化记录 */
  stageHistory: StageLog[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 备注 */
  note: string
  /** 自定义标签 */
  tags: string[]

  // ---- 蓝图扩展字段（可选，向后兼容） ----
  /** 驱动力类型（决定光茧颜色） */
  drivingForce?: DrivingForce
  /** 驱动力描述 */
  drivingForceDescription?: string
  /** 蜕变深度（决定光茧大小） */
  size?: number
  /** 蜕变纹理（决定光茧质感） */
  texture?: CocoonTexture
  /** 蜕变前状态 */
  beforeState?: string
  /** 蜕变后状态 */
  afterState?: string
  /** 关联的留光阁目标 ID */
  relatedGoalId?: string
  /** 是否被中断 */
  interrupted?: boolean
  /** 中断说明 */
  interruptionDescription?: string
}

export interface StageLog {
  from: CocoonStage
  to: CocoonStage
  at: string
  /** 转变原因 */
  reason?: string
}

// ---- 光茧管理 ----

/** 创建光茧 */
export function createCocoon(
  name: string,
  season: Season,
  lifeRitualId?: string,
  lifeRitualName?: string,
  relatedGoalId?: string,
  drivingForce?: DrivingForce,
  extra?: Partial<Cocoon>,
): Cocoon {
  const now = new Date().toISOString()
  return {
    id: `cocoon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    stage: 'gestating',
    season,
    lifeRitualId,
    lifeRitualName,
    stageHistory: [],
    createdAt: now,
    updatedAt: now,
    note: '',
    tags: [],
    ...(relatedGoalId ? { relatedGoalId } : {}),
    ...(drivingForce ? { drivingForce } : {}),
    ...extra,
  }
}

/** 阶段流转规则 */
const STAGE_TRANSITIONS: Record<CocoonStage, CocoonStage[]> = {
  gestating: ['cracking'],
  cracking: ['emerging', 'gestating'],
  emerging: ['flying', 'cracking'],
  flying: ['emerging'],
}

/** 可用的下一阶段 */
export function getAvailableNextStages(stage: CocoonStage): CocoonStage[] {
  return STAGE_TRANSITIONS[stage] || []
}

/** 推进光茧阶段 */
export function advanceCocoon(
  cocoon: Cocoon,
  to: CocoonStage,
  reason?: string,
): Cocoon {
  const available = getAvailableNextStages(cocoon.stage)
  if (!available.includes(to)) return cocoon

  const now = new Date().toISOString()
  return {
    ...cocoon,
    stage: to,
    stageHistory: [
      ...cocoon.stageHistory,
      { from: cocoon.stage, to, at: now, reason },
    ],
    updatedAt: now,
  }
}

/** 回退光茧阶段 */
export function regressCocoon(cocoon: Cocoon, reason?: string): Cocoon {
  const available = getAvailableNextStages(cocoon.stage)
  // 回退到上一个阶段或孕育
  const prevStage = available.find(s => s !== 'flying') || 'gestating'
  return advanceCocoon(cocoon, prevStage, reason || '自然回退')
}

// ---- 光茧与生命仪礼联动 ----

/** 从生命仪礼创建光茧 */
export function cocoonFromLifeRitual(
  ritual: LifeRitual,
  season: Season,
): Cocoon {
  return createCocoon(
    ritual.name,
    season,
    ritual.id,
    ritual.name,
  )
}

/** 当生命仪礼完成时，推进关联光茧 */
export function onLifeRitualCompleted(
  cocoons: Cocoon[],
  ritualId: string,
): Cocoon[] {
  return cocoons.map(c => {
    if (c.lifeRitualId === ritualId && c.stage !== 'flying') {
      return advanceCocoon(c, 'flying', '生命仪礼完成')
    }
    return c
  })
}

// ---- 光茧统计 ----

export interface CocoonStats {
  total: number
  byStage: { stage: CocoonStage; label: string; count: number; color: string }[]
  bySeason: { season: Season; count: number }[]
  /** 已飞翔的（完成蜕变） */
  completed: number
  /** 正在蜕变中的 */
  active: number
  /** 平均蜕变次数 */
  avgTransitions: number
}

export function computeCocoonStats(cocoons: Cocoon[]): CocoonStats {
  const byStage = ['gestating', 'cracking', 'emerging', 'flying'].map(stage => ({
    stage: stage as CocoonStage,
    label: COCOON_STAGE_LABELS[stage as CocoonStage],
    count: cocoons.filter(c => c.stage === stage).length,
    color: COCOON_STAGE_COLORS[stage as CocoonStage],
  }))

  const seasonMap = new Map<Season, number>()
  for (const c of cocoons) {
    seasonMap.set(c.season, (seasonMap.get(c.season) || 0) + 1)
  }
  const bySeason = Array.from(seasonMap.entries()).map(([season, count]) => ({ season, count }))

  const totalTransitions = cocoons.reduce((s, c) => s + c.stageHistory.length, 0)

  return {
    total: cocoons.length,
    byStage,
    bySeason,
    completed: cocoons.filter(c => c.stage === 'flying').length,
    active: cocoons.filter(c => c.stage !== 'flying').length,
    avgTransitions: cocoons.length > 0 ? totalTransitions / cocoons.length : 0,
  }
}