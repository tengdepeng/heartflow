// ============================================================
// 逸趣阁 · 逸趣档案分析引擎
// 蓝图 P2-20：时间种子 + 玩具藏品 + LOD。
//
// 与 play-advanced 的"趋势/偏好/回报"不同，本模块专注于
// 「档案陈列」：全景概览、品类分布、心情种子成长、收藏节律、
// 收藏健康(广度/深度/延续)与温和洞察。全部纯函数、本地计算，
// 均接受 now 参数保证时间可测试。
// ============================================================

import type { PlayData } from './types'
import type { TimeSeed as MoodSeed } from './seeds'

// ---- 心情种子成长阶段（与 PlayGallery 生长系统同语义：浇水加速） ----
export type MoodSeedStage = 'seed' | 'sprout' | 'seedling' | 'bloom'

const HOUR_MS = 60 * 60 * 1000
export const WATER_BOOST_MS = 4 * HOUR_MS
const STAGE_MS: Record<Exclude<MoodSeedStage, 'bloom'>, number> = {
  seed: 24 * HOUR_MS,
  sprout: 3 * 24 * HOUR_MS,
  seedling: 7 * 24 * HOUR_MS,
}

export const MOOD_SEED_STAGE_LABELS: Record<MoodSeedStage, string> = {
  seed: '种子',
  sprout: '发芽',
  seedling: '幼苗',
  bloom: '开花',
}

export const MOOD_SEED_STAGE_COLORS: Record<MoodSeedStage, string> = {
  seed: '#8b7355',
  sprout: '#34d399',
  seedling: '#22c55e',
  bloom: '#f0c040',
}

/** 有效生长时间 = 实际时长 + 浇水加速（与视图 getEffectiveAge 一致） */
export function seedEffectiveAge(seed: MoodSeed, nowMs: number): number {
  const planted = new Date(seed.createdAt).getTime()
  const boost = (seed.waterCount || 0) * WATER_BOOST_MS
  return Math.max(0, nowMs - planted + boost)
}

/** 心情种子成长阶段 */
export function moodSeedStage(seed: MoodSeed, nowMs: number): MoodSeedStage {
  const age = seedEffectiveAge(seed, nowMs)
  if (age < STAGE_MS.seed) return 'seed'
  if (age < STAGE_MS.sprout) return 'sprout'
  if (age < STAGE_MS.seedling) return 'seedling'
  return 'bloom'
}

// ============================================================
// 1. 逸趣库概览
// ============================================================

export interface PlayArchiveOverview {
  totalItems: number
  totalGames: number
  totalHours: number
  platformCount: number
  seriesCount: number
  seedCount: number
  seededCount: number
  bloomCount: number
  recent7: number
  recent30: number
  topPlatform: string
  topGame: string
}

export function playArchiveOverview(data: PlayData, seeds: MoodSeed[], now: Date): PlayArchiveOverview {
  const nowMs = now.getTime()
  const totalItems = data.games.length + data.toys.length + data.models.length + data.others.length
  const totalHours = data.games.reduce((s, g) => s + g.hours, 0)
  const platformCount = new Set(data.games.map(g => g.platform)).size
  const seriesCount = new Set(data.models.map(m => m.series).filter(Boolean)).size

  const sevenAgo = nowMs - 7 * 24 * HOUR_MS
  const thirtyAgo = nowMs - 30 * 24 * HOUR_MS
  const allRecent: string[] = [
    ...data.games, ...data.toys, ...data.models, ...data.others,
  ].map(i => i.at)
  const recent7 = allRecent.filter(t => new Date(t).getTime() >= sevenAgo).length
  const recent30 = allRecent.filter(t => new Date(t).getTime() >= thirtyAgo).length

  const platformHours: Record<string, number> = {}
  for (const g of data.games) platformHours[g.platform] = (platformHours[g.platform] || 0) + g.hours
  const topPlatform = Object.entries(platformHours).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  const topGame = data.games.length > 0
    ? data.games.reduce((m, g) => (g.hours > m.hours ? g : m), data.games[0]).name
    : '—'

  const seededCount = seeds.filter(s => s.waterCount && s.waterCount > 0).length
  const bloomCount = seeds.filter(s => moodSeedStage(s, nowMs) === 'bloom').length

  return {
    totalItems,
    totalGames: data.games.length,
    totalHours,
    platformCount,
    seriesCount,
    seedCount: seeds.length,
    seededCount,
    bloomCount,
    recent7,
    recent30,
    topPlatform,
    topGame,
  }
}

// ============================================================
// 2. 品类分布（游戏/玩具/模型/其他）
// ============================================================

export interface CollectionTypeRow {
  type: string
  icon: string
  count: number
  percentage: number
}

export function collectionTypeRows(data: PlayData): CollectionTypeRow[] {
  const totalItems = data.games.length + data.toys.length + data.models.length + data.others.length
  const rowsRaw: { type: string; icon: string; count: number }[] = [
    { type: '游戏', icon: '🎮', count: data.games.length },
    { type: '玩具', icon: '🧸', count: data.toys.length },
    { type: '模型', icon: '🗿', count: data.models.length },
    { type: '其他', icon: '📦', count: data.others.length },
  ]
  return rowsRaw
    .map(r => ({
      ...r,
      percentage: totalItems > 0 ? Math.round((r.count / totalItems) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// 3. 心情种子成长分布
// ============================================================

export interface MoodSeedRow {
  stage: MoodSeedStage
  label: string
  color: string
  count: number
  percentage: number
}

export interface MoodDistribution {
  mood: string
  count: number
}

export interface MoodSeedOverview {
  rows: MoodSeedRow[]
  moodDist: MoodDistribution[]
  totalWater: number
  avgWater: number
}

const MOOD_LABELS: Record<MoodSeed['mood'], string> = {
  happy: '开心',
  calm: '平静',
  sad: '难过',
  excited: '兴奋',
  tired: '疲惫',
}

export function moodSeedOverview(seeds: MoodSeed[], now: Date): MoodSeedOverview {
  const nowMs = now.getTime()
  const stages: MoodSeedStage[] = ['seed', 'sprout', 'seedling', 'bloom']
  const rows = stages.map(stage => {
    const count = seeds.filter(s => moodSeedStage(s, nowMs) === stage).length
    return {
      stage,
      label: MOOD_SEED_STAGE_LABELS[stage],
      color: MOOD_SEED_STAGE_COLORS[stage],
      count,
      percentage: seeds.length > 0 ? Math.round((count / seeds.length) * 100) : 0,
    }
  })

  const moodMap = new Map<string, number>()
  for (const s of seeds) moodMap.set(s.mood, (moodMap.get(s.mood) || 0) + 1)
  const moodDist = Array.from(moodMap.entries())
    .map(([mood, count]) => ({ mood: MOOD_LABELS[mood as MoodSeed['mood']] || mood, count }))
    .sort((a, b) => b.count - a.count)

  const totalWater = seeds.reduce((s, seed) => s + (seed.waterCount || 0), 0)
  const avgWater = seeds.length > 0 ? Math.round((totalWater / seeds.length) * 10) / 10 : 0

  return { rows, moodDist, totalWater, avgWater }
}

// ============================================================
// 4. 收藏节律
// ============================================================

export interface CollectionRhythm {
  activeDays: number
  spanDays: number
  monthAdditions: number
  monthHours: number
  monthsTracked: number
}

export function collectionRhythm(data: PlayData, seeds: MoodSeed[], now: Date) {
  const dayMs = 24 * HOUR_MS

  // 所有藏品时间点（含种子）
  const stamps: number[] = [
    ...data.games, ...data.toys, ...data.models, ...data.others,
  ].map(i => new Date(i.at).getTime())
  seeds.forEach(s => stamps.push(new Date(s.createdAt).getTime()))

  const uniqueDays = new Set(stamps.map(ms => Math.floor(ms / dayMs))).size
  const spanDays = stamps.length > 0
    ? Math.max(0, Math.round((Math.max(...stamps) - Math.min(...stamps)) / dayMs))
    : 0

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthAdditions = stamps.filter(ms => ms >= startOfMonth).length
  const monthHours = data.games
    .filter(g => new Date(g.at).getTime() >= startOfMonth)
    .reduce((s, g) => s + g.hours, 0)

  // 覆盖的月份数（跨度）
  const months = new Set(stamps.map(ms => {
    const d = new Date(ms)
    return `${d.getFullYear()}-${d.getMonth()}`
  })).size

  return {
    activeDays: uniqueDays,
    spanDays,
    monthAdditions,
    monthHours,
    monthsTracked: months,
  }
}

// ============================================================
// 5. 收藏健康（广度 40% + 深度 35% + 延续 25%）
// ============================================================

export interface CollectionHealth {
  score: number
  label: string
  breadth: number
  depth: number
  continuity: number
}

export function collectionHealth(data: PlayData, seeds: MoodSeed[], now: Date): CollectionHealth {
  const nowMs = now.getTime()
  const totalItems = data.games.length + data.toys.length + data.models.length + data.others.length
  const totalHours = data.games.reduce((s, g) => s + g.hours, 0)
  const platformCount = new Set(data.games.map(g => g.platform)).size
  const seriesCount = new Set(data.models.map(m => m.series).filter(Boolean)).size
  const typesActive = [data.games, data.toys, data.models, data.others]
    .filter(arr => arr.length > 0).length

  // 广度 (0-40)：平台 + 系列 + 品类丰富
  const breadth = Math.min(40,
    Math.round((Math.min(platformCount, 4) / 4) * 15) +
    Math.round((Math.min(seriesCount, 4) / 4) * 10) +
    Math.round((typesActive / 4) * 15),
  )

  // 深度 (0-35)：藏品规模 + 时间投入
  const sizeScore = Math.round((Math.min(totalItems, 50) / 50) * 20)
  const investScore = Math.round((Math.min(totalHours, 300) / 300) * 15)
  const depth = Math.min(35, sizeScore + investScore)

  // 延续 (0-25)：近30天活跃 + 种子照料
  const thirtyAgo = nowMs - 30 * dayMs()
  const recentStamps = [
    ...data.games, ...data.toys, ...data.models, ...data.others,
  ].map(i => new Date(i.at).getTime()).filter(ms => ms >= thirtyAgo).length
  const recentScore = Math.min(15, Math.round((Math.min(recentStamps, 10) / 10) * 15))
  const caredRatio = seeds.length > 0
    ? seeds.filter(s => (s.waterCount || 0) > 0).length / seeds.length
    : 0
  const continuity = Math.min(25, recentScore + Math.round(caredRatio * 10))

  const score = Math.min(100, Math.max(0, Math.round(breadth + depth + continuity)))
  const label = score >= 80 ? '心意丰盈' : score >= 55 ? '兴致盎然' : score >= 30 ? '拾趣渐进' : '萌芽初探'

  return { score, label, breadth, depth, continuity }
}

function dayMs(): number {
  return 24 * HOUR_MS
}

// ============================================================
// 6. 温和洞察（有界、不评判，最多 4 条）
// ============================================================

export interface PlayInsight {
  text: string
  tone: 'gentle' | 'warm' | 'flow'
}

export function playInsights(data: PlayData, seeds: MoodSeed[], now: Date): PlayInsight[] {
  const ov = playArchiveOverview(data, seeds, now)
  const bloomCount = ov.bloomCount
  const sealedOrMint = data.models.filter(m => m.status === 'sealed').length +
    data.toys.filter(t => t.value === 'mint').length

  const pool: PlayInsight[] = []
  if (ov.totalItems === 0 && ov.seedCount === 0) {
    pool.push({ text: '逸趣页还是空白，种下一粒种子或记下一段游戏时光，都无需着急。', tone: 'gentle' })
  }
  if (bloomCount > 0) {
    pool.push({ text: `有 ${bloomCount} 粒时间种子已开出花，那份心情曾被好好照料过。`, tone: 'warm' })
  }
  if (ov.recent30 <= 0 && ov.totalItems > 0) {
    pool.push({ text: '近来没有新的收藏痕迹，收藏的脚步或快或慢，由你决定。', tone: 'gentle' })
  } else if (ov.recent30 > 0) {
    pool.push({ text: `近三十天新增了 ${ov.recent30} 件逸趣记录，兴致仍在延续。`, tone: 'flow' })
  }
  if (ov.platformCount >= 3) {
    pool.push({ text: `你踏足 ${ov.platformCount} 片平台，兴趣的边界在悄然延伸。`, tone: 'warm' })
  }
  if (sealedOrMint > 0) {
    pool.push({ text: '你保留着未拆封的心念，收藏自有属于你的节奏与守则。', tone: 'warm' })
  }
  if (ov.totalHours > 300) {
    pool.push({ text: '累计的游戏时光颇为可观，愿它带来的是松弛而非负担。', tone: 'gentle' })
  }
  if (ov.totalItems > 0 && sealedOrMint === 0) {
    pool.push({ text: '藏品被自然把玩，品相随缘，也自有温度。', tone: 'flow' })
  }

  return pool.slice(0, 4)
}