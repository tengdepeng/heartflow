// ============================================================
// 逸趣阁 · 时间种子
// 蓝图定义：
//   将逸趣数据与时间种子遗传体系关联
//   每个游戏/玩具/模型都可以生成一枚时间种子
//   种子记录时间点、情感强度、可遗传给未来的记忆
// ============================================================

import type { Game, Toy, Model, Other } from './types'

// ---- 时间种子 ----

export type SeedSource = 'game' | 'toy' | 'model' | 'other'

export interface TimeSeed {
  id: string
  /** 种子名称 */
  name: string
  /** 来源类型 */
  source: SeedSource
  /** 来源物品 ID */
  sourceId: string
  /** 时间点 */
  timestamp: string
  /** 情感强度 0-1 */
  emotion: number
  /** 记忆标签 */
  tags: string[]
  /** 是否已遗传 */
  inherited: boolean
  /** 遗传目标（下一阶段 / 下一代） */
  inheritTarget?: string
  /** 种子描述 */
  description: string
  /** 稀有度 */
  rarity: SeedRarity
  /** 创建时间 */
  createdAt: string
}

export type SeedRarity = 'common' | 'rare' | 'epic' | 'legendary'

export const SEED_RARITY_LABELS: Record<SeedRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
}

export const SEED_RARITY_COLORS: Record<SeedRarity, string> = {
  common: '#a0a0a0',
  rare: '#6b9fc4',
  epic: '#c084fc',
  legendary: '#e0a96d',
}

/** 从游戏记录生成时间种子 */
export function seedFromGame(game: Game): TimeSeed {
  const rarity = game.hours > 100 ? 'legendary' : game.hours > 50 ? 'epic' : game.hours > 20 ? 'rare' : 'common'
  return {
    id: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: game.name,
    source: 'game',
    sourceId: game.id,
    timestamp: game.at,
    emotion: Math.min(1, game.hours / 100),
    tags: [game.platform, '游戏'],
    inherited: false,
    description: `在${game.platform}上玩了${game.hours}小时的${game.name}`,
    rarity,
    createdAt: new Date().toISOString(),
  }
}

/** 从玩具收藏生成时间种子 */
export function seedFromToy(toy: Toy): TimeSeed {
  const rarityMap: Record<Toy['value'], SeedRarity> = {
    mint: 'legendary',
    display: 'epic',
    light: 'rare',
    used: 'common',
  }
  return {
    id: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: toy.name,
    source: 'toy',
    sourceId: toy.id,
    timestamp: toy.at,
    emotion: toy.value === 'mint' ? 0.9 : 0.5,
    tags: [toy.value, '玩具'],
    inherited: false,
    description: toy.note || `收藏了${toy.name}`,
    rarity: rarityMap[toy.value],
    createdAt: new Date().toISOString(),
  }
}

/** 从模型生成时间种子 */
export function seedFromModel(model: Model): TimeSeed {
  const rarity: SeedRarity = model.status === 'sealed' ? 'legendary' : model.status === 'display' ? 'epic' : 'rare'
  return {
    id: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: model.name,
    source: 'model',
    sourceId: model.id,
    timestamp: model.at,
    emotion: 0.6,
    tags: [model.series, '模型'],
    inherited: false,
    description: `${model.series}系列的${model.name}（${model.status === 'sealed' ? '未拆封' : model.status === 'display' ? '展示中' : '已开封'}）`,
    rarity,
    createdAt: new Date().toISOString(),
  }
}

/** 从其他收藏生成时间种子 */
export function seedFromOther(other: Other): TimeSeed {
  return {
    id: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: other.name,
    source: 'other',
    sourceId: other.id,
    timestamp: other.at,
    emotion: 0.4,
    tags: [other.cat, '收藏'],
    inherited: false,
    description: `${other.cat}分类的${other.name}`,
    rarity: 'common',
    createdAt: new Date().toISOString(),
  }
}

// ---- 种子遗传 ----

/** 遗传种子（标记为已遗传） */
export function inheritSeed(seed: TimeSeed, target: string): TimeSeed {
  return {
    ...seed,
    inherited: true,
    inheritTarget: target,
  }
}

/** 检查种子是否可遗传 */
export function canInherit(seed: TimeSeed): boolean {
  return !seed.inherited && seed.rarity !== 'common'
}

// ---- 种子统计 ----

export interface SeedStats {
  total: number
  byRarity: { rarity: SeedRarity; label: string; count: number; color: string }[]
  bySource: { source: SeedSource; count: number }[]
  inherited: number
  /** 平均情感强度 */
  avgEmotion: number
  /** 可遗传的种子数 */
  inheritable: number
}

export function computeSeedStats(seeds: TimeSeed[]): SeedStats {
  const byRarity = ['common', 'rare', 'epic', 'legendary'].map(rarity => ({
    rarity: rarity as SeedRarity,
    label: SEED_RARITY_LABELS[rarity as SeedRarity],
    count: seeds.filter(s => s.rarity === rarity).length,
    color: SEED_RARITY_COLORS[rarity as SeedRarity],
  }))

  const sourceMap = new Map<SeedSource, number>()
  for (const s of seeds) {
    sourceMap.set(s.source, (sourceMap.get(s.source) || 0) + 1)
  }
  const bySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }))

  return {
    total: seeds.length,
    byRarity,
    bySource,
    inherited: seeds.filter(s => s.inherited).length,
    avgEmotion: seeds.length > 0 ? seeds.reduce((sum, s) => sum + s.emotion, 0) / seeds.length : 0,
    inheritable: seeds.filter(s => canInherit(s)).length,
  }
}

// ---- LOD 降级 ----

export type LODLevel = 'high' | 'medium' | 'low'

/** 根据种子数量计算推荐 LOD 级别 */
export function computeLODLevel(count: number): LODLevel {
  if (count <= 50) return 'high'
  if (count <= 200) return 'medium'
  return 'low'
}

/** LOD 降级后的种子列表（仅保留关键种子） */
export function applyLOD(seeds: TimeSeed[], level: LODLevel): TimeSeed[] {
  if (level === 'high') return seeds

  // medium: 保留 rare 及以上
  if (level === 'medium') {
    return seeds.filter(s => s.rarity !== 'common')
  }

  // low: 仅保留 epic 和 legendary
  return seeds.filter(s => s.rarity === 'epic' || s.rarity === 'legendary')
}