// ============================================================
// 逸趣阁 · 高级统计与趋势
// 蓝图定义：
//   逸趣数据聚合分析、趋势图表、里程碑追踪、
//   收藏热度地图、品类偏好分析、时间投资回报
// ============================================================

import type { PlayData } from './types'

// ---- 里程碑 ----

export type MilestoneCategory = 'hours' | 'count' | 'variety' | 'streak' | 'collection'

export interface PlayMilestone {
  id: string
  category: MilestoneCategory
  title: string
  description: string
  threshold: number
  current: number
  unlocked: boolean
  unlockedAt?: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

const MILESTONE_DEFS: Omit<PlayMilestone, 'current' | 'unlocked' | 'unlockedAt'>[] = [
  // 时长里程碑
  { id: 'ms_hours_10', category: 'hours', title: '初入游戏', description: '累计游戏10小时', threshold: 10, icon: '🎮', rarity: 'common' },
  { id: 'ms_hours_50', category: 'hours', title: '游戏爱好者', description: '累计游戏50小时', threshold: 50, icon: '🎮', rarity: 'common' },
  { id: 'ms_hours_100', category: 'hours', title: '资深玩家', description: '累计游戏100小时', threshold: 100, icon: '🎮', rarity: 'rare' },
  { id: 'ms_hours_500', category: 'hours', title: '骨灰级玩家', description: '累计游戏500小时', threshold: 500, icon: '👑', rarity: 'epic' },
  { id: 'ms_hours_1000', category: 'hours', title: '游戏传奇', description: '累计游戏1000小时', threshold: 1000, icon: '👑', rarity: 'legendary' },

  // 收藏数量里程碑
  { id: 'ms_count_5', category: 'count', title: '开始收集', description: '收藏5件物品', threshold: 5, icon: '📦', rarity: 'common' },
  { id: 'ms_count_20', category: 'count', title: '小有收藏', description: '收藏20件物品', threshold: 20, icon: '📦', rarity: 'common' },
  { id: 'ms_count_50', category: 'count', title: '收藏家', description: '收藏50件物品', threshold: 50, icon: '🏆', rarity: 'rare' },
  { id: 'ms_count_100', category: 'count', title: '大收藏家', description: '收藏100件物品', threshold: 100, icon: '🏆', rarity: 'epic' },
  { id: 'ms_count_200', category: 'count', title: '博物馆馆长', description: '收藏200件物品', threshold: 200, icon: '🏛', rarity: 'legendary' },

  // 多样性里程碑
  { id: 'ms_variety_platforms_3', category: 'variety', title: '跨平台玩家', description: '在3个平台上玩游戏', threshold: 3, icon: '🖥', rarity: 'common' },
  { id: 'ms_variety_platforms_5', category: 'variety', title: '全平台制霸', description: '在5个平台上玩游戏', threshold: 5, icon: '🖥', rarity: 'rare' },
  { id: 'ms_variety_series_3', category: 'variety', title: '系列收藏者', description: '收藏3个不同系列', threshold: 3, icon: '🗿', rarity: 'common' },
  { id: 'ms_variety_series_5', category: 'variety', title: '系列达人', description: '收藏5个不同系列', threshold: 5, icon: '🗿', rarity: 'rare' },

  // 收藏品质里程碑
  { id: 'ms_collection_mint_5', category: 'collection', title: '品相至上', description: '拥有5件全新品', threshold: 5, icon: '✨', rarity: 'rare' },
  { id: 'ms_collection_sealed_3', category: 'collection', title: '封存珍藏', description: '拥有3件未拆封模型', threshold: 3, icon: '🔒', rarity: 'epic' },
]

/**
 * 检测并解锁里程碑
 */
export function checkMilestones(data: PlayData): { milestones: PlayMilestone[]; newlyUnlocked: PlayMilestone[] } {
  const totalHours = data.games.reduce((s, g) => s + g.hours, 0)
  const totalItems = data.games.length + data.toys.length + data.models.length + data.others.length
  const platforms = new Set(data.games.map(g => g.platform))
  const series = new Set(data.models.map(m => m.series).filter(Boolean))
  const mintCount = data.toys.filter(t => t.value === 'mint').length
  const sealedCount = data.models.filter(m => m.status === 'sealed').length

  const milestones: PlayMilestone[] = []
  const newlyUnlocked: PlayMilestone[] = []

  for (const def of MILESTONE_DEFS) {
    let current = 0
    switch (def.category) {
      case 'hours': current = totalHours; break
      case 'count': current = totalItems; break
      case 'variety':
        if (def.id.includes('platforms')) current = platforms.size
        else if (def.id.includes('series')) current = series.size
        break
      case 'collection':
        if (def.id.includes('mint')) current = mintCount
        else if (def.id.includes('sealed')) current = sealedCount
        break
      default: current = 0
    }

    const unlocked = current >= def.threshold
    const milestone: PlayMilestone = {
      ...def,
      current,
      unlocked,
      unlockedAt: unlocked ? new Date().toISOString() : undefined,
    }

    milestones.push(milestone)
    if (unlocked) {
      newlyUnlocked.push(milestone)
    }
  }

  return { milestones, newlyUnlocked }
}

// ---- 趋势分析 ----

export interface PlayTrend {
  /** 月度游戏时长 */
  monthlyHours: { month: string; hours: number; gameCount: number }[]
  /** 月度收藏增量 */
  monthlyAdditions: { month: string; games: number; toys: number; models: number; others: number }[]
  /** 平台热度变化 */
  platformTrend: { platform: string; months: { month: string; hours: number }[] }[]
  /** 收藏品类分布变化 */
  categoryTrend: { category: string; months: { month: string; count: number }[] }[]
}

export interface PlaySummary {
  totalGames: number
  totalHours: number
  totalToys: number
  totalModels: number
  totalOthers: number
  totalItems: number
  /** 平均每款游戏时长 */
  avgHoursPerGame: number
  /** 最多时间的平台 */
  topPlatform: string
  /** 最多时间的游戏 */
  topGame: string
  /** 收藏最多的系列 */
  topSeries: string
  /** 最近添加 */
  recentAdditions: number
  /** 活跃度（最近30天新增） */
  activityScore: number
}

/**
 * 计算逸趣数据摘要
 */
export function computePlaySummary(data: PlayData): PlaySummary {
  const totalHours = data.games.reduce((s, g) => s + g.hours, 0)
  const totalItems = data.games.length + data.toys.length + data.models.length + data.others.length

  const platformHours: Record<string, number> = {}
  for (const g of data.games) {
    platformHours[g.platform] = (platformHours[g.platform] || 0) + g.hours
  }
  const topPlatform = Object.entries(platformHours)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

  const topGame = data.games.length > 0
    ? data.games.reduce((max, g) => g.hours > max.hours ? g : max, data.games[0]).name
    : '-'

  const seriesCount: Record<string, number> = {}
  for (const m of data.models) {
    const s = m.series || '其他'
    seriesCount[s] = (seriesCount[s] || 0) + 1
  }
  const topSeries = Object.entries(seriesCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

  // 最近30天新增
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const threshold = thirtyDaysAgo.toISOString()

  const recentAdditions = [
    ...data.games.filter(g => g.at >= threshold),
    ...data.toys.filter(t => t.at >= threshold),
    ...data.models.filter(m => m.at >= threshold),
    ...data.others.filter(o => o.at >= threshold),
  ].length

  const activityScore = Math.min(100, recentAdditions * 10)

  return {
    totalGames: data.games.length,
    totalHours,
    totalToys: data.toys.length,
    totalModels: data.models.length,
    totalOthers: data.others.length,
    totalItems,
    avgHoursPerGame: data.games.length > 0 ? Math.round(totalHours / data.games.length * 10) / 10 : 0,
    topPlatform,
    topGame,
    topSeries,
    recentAdditions,
    activityScore,
  }
}

/**
 * 构建逸趣趋势数据
 */
export function buildPlayTrend(data: PlayData, months: number = 12): PlayTrend {
  const now = new Date()
  const monthKeys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // 月度游戏时长
  const monthlyHours = monthKeys.map(month => {
    const monthGames = data.games.filter(g => g.at.slice(0, 7) === month)
    const hours = monthGames.reduce((s, g) => s + g.hours, 0)
    return { month, hours, gameCount: monthGames.length }
  })

  // 月度收藏增量
  const monthlyAdditions = monthKeys.map(month => ({
    month,
    games: data.games.filter(g => g.at.slice(0, 7) === month).length,
    toys: data.toys.filter(t => t.at.slice(0, 7) === month).length,
    models: data.models.filter(m => m.at.slice(0, 7) === month).length,
    others: data.others.filter(o => o.at.slice(0, 7) === month).length,
  }))

  // 平台热度变化
  const allPlatforms = [...new Set(data.games.map(g => g.platform))]
  const platformTrend = allPlatforms.map(platform => ({
    platform,
    months: monthKeys.map(month => {
      const hours = data.games
        .filter(g => g.platform === platform && g.at.slice(0, 7) === month)
        .reduce((s, g) => s + g.hours, 0)
      return { month, hours }
    }),
  }))

  // 品类分布变化
  const categories = ['游戏', '玩具', '模型', '其他']
  const categoryTrend = categories.map(category => ({
    category,
    months: monthKeys.map(month => {
      let count = 0
      if (category === '游戏') count = data.games.filter(g => g.at.slice(0, 7) === month).length
      else if (category === '玩具') count = data.toys.filter(t => t.at.slice(0, 7) === month).length
      else if (category === '模型') count = data.models.filter(m => m.at.slice(0, 7) === month).length
      else count = data.others.filter(o => o.at.slice(0, 7) === month).length
      return { month, count }
    }),
  }))

  return { monthlyHours, monthlyAdditions, platformTrend, categoryTrend }
}

// ---- 时间投资回报分析 ----

export interface TimeInvestmentROI {
  /** 游戏时长分布 */
  hoursDistribution: {
    label: string
    range: [number, number]
    count: number
    percentage: number
  }[]
  /** 最高效平台（平均时长/游戏） */
  platformEfficiency: { platform: string; avgHours: number; gameCount: number }[]
  /** 最值得的游戏（高时长+近期活跃） */
  mostEngaging: { name: string; hours: number; lastPlayed: string; score: number }[]
  /** 时间投资建议 */
  suggestions: string[]
}

/**
 * 计算逸趣时间投资回报
 */
export function computeTimeInvestmentROI(data: PlayData): TimeInvestmentROI {
  const totalHours = data.games.reduce((s, g) => s + g.hours, 0)

  // 时长分布
  const buckets = [
    { label: '轻量 (<10h)', range: [0, 10] as [number, number] },
    { label: '中度 (10-50h)', range: [10, 50] as [number, number] },
    { label: '重度 (50-100h)', range: [50, 100] as [number, number] },
    { label: '硬核 (100-500h)', range: [100, 500] as [number, number] },
    { label: '传奇 (500h+)', range: [500, Infinity] as [number, number] },
  ]

  const hoursDistribution = buckets.map(bucket => {
    const count = data.games.filter(g => g.hours >= bucket.range[0] && g.hours < bucket.range[1]).length
    return {
      label: bucket.label,
      range: bucket.range,
      count,
      percentage: data.games.length > 0 ? Math.round(count / data.games.length * 100) : 0,
    }
  })

  // 平台效率
  const platformMap = new Map<string, { totalHours: number; count: number }>()
  for (const g of data.games) {
    if (!platformMap.has(g.platform)) platformMap.set(g.platform, { totalHours: 0, count: 0 })
    const entry = platformMap.get(g.platform)!
    entry.totalHours += g.hours
    entry.count++
  }
  const platformEfficiency = [...platformMap.entries()]
    .map(([platform, data]) => ({
      platform,
      avgHours: Math.round(data.totalHours / data.count * 10) / 10,
      gameCount: data.count,
    }))
    .sort((a, b) => b.avgHours - a.avgHours)

  // 最值得的游戏（高时长+近期活跃）
  const now = Date.now()
  const mostEngaging = data.games
    .map(g => {
      const daysSince = (now - new Date(g.at).getTime()) / 86400000
      const recencyScore = Math.max(0, 1 - daysSince / 365)
      const hoursScore = Math.min(1, g.hours / 500)
      const score = hoursScore * 0.7 + recencyScore * 0.3
      return { name: g.name, hours: g.hours, lastPlayed: g.at, score: Math.round(score * 100) / 100 }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  // 建议
  const suggestions: string[] = []
  if (totalHours < 50) suggestions.push('你的游戏时间较少，适度放松有益身心')
  else if (totalHours > 500) suggestions.push('你的游戏时间较多，建议关注时间分配')
  const avgHours = data.games.length > 0 ? totalHours / data.games.length : 0
  if (avgHours < 5) suggestions.push('你倾向于浅尝辄止，不妨深入体验一两款游戏')
  if (avgHours > 100) suggestions.push('你有深度投入的偏好，注意保持多样性')
  if (data.toys.length + data.models.length > 20) {
    suggestions.push('你的收藏已经颇具规模，考虑整理和展示')
  }

  return {
    hoursDistribution,
    platformEfficiency,
    mostEngaging,
    suggestions,
  }
}

// ---- 收藏热度分析 ----

export interface CollectionHeatmap {
  /** 按年份的收藏热度 */
  byYear: { year: number; games: number; toys: number; models: number; others: number; total: number }[]
  /** 按季度的收藏热度 */
  byQuarter: { quarter: string; total: number }[]
  /** 收藏的高峰期 */
  peakPeriod: { period: string; total: number }
  /** 收藏的趋势 */
  trend: 'growing' | 'stable' | 'declining'
}

/**
 * 计算收藏热度分析
 */
export function computeCollectionHeatmap(data: PlayData): CollectionHeatmap {
  const allItems = [
    ...data.games.map(g => ({ ...g, type: 'games' as const })),
    ...data.toys.map(t => ({ ...t, type: 'toys' as const })),
    ...data.models.map(m => ({ ...m, type: 'models' as const })),
    ...data.others.map(o => ({ ...o, type: 'others' as const })),
  ]

  // 按年份
  const yearMap = new Map<number, { games: number; toys: number; models: number; others: number }>()
  for (const item of allItems) {
    const year = new Date(item.at).getFullYear()
    if (!yearMap.has(year)) yearMap.set(year, { games: 0, toys: 0, models: 0, others: 0 })
    const entry = yearMap.get(year)!
    entry[item.type]++
  }
  const byYear = [...yearMap.entries()]
    .map(([year, data]) => ({ year, ...data, total: data.games + data.toys + data.models + data.others }))
    .sort((a, b) => a.year - b.year)

  // 按季度
  const quarterMap = new Map<string, number>()
  for (const item of allItems) {
    const d = new Date(item.at)
    const q = Math.floor(d.getMonth() / 3) + 1
    const key = `${d.getFullYear()}-Q${q}`
    quarterMap.set(key, (quarterMap.get(key) || 0) + 1)
  }
  const byQuarter = [...quarterMap.entries()]
    .map(([quarter, total]) => ({ quarter, total }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter))

  // 高峰期
  const peakPeriod = byQuarter.length > 0
    ? { period: byQuarter.reduce((max, q) => q.total > max.total ? q : max, byQuarter[0]).quarter, total: byQuarter.reduce((max, q) => q.total > max.total ? q : max, byQuarter[0]).total }
    : { period: '-', total: 0 }

  // 趋势
  let trend: 'growing' | 'stable' | 'declining' = 'stable'
  if (byYear.length >= 2) {
    const firstHalf = byYear.slice(0, Math.floor(byYear.length / 2))
    const secondHalf = byYear.slice(Math.floor(byYear.length / 2))
    const firstAvg = firstHalf.reduce((s, y) => s + y.total, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, y) => s + y.total, 0) / secondHalf.length
    const change = secondAvg - firstAvg
    if (change > 0.5) trend = 'growing'
    else if (change < -0.5) trend = 'declining'
  }

  return { byYear, byQuarter, peakPeriod, trend }
}

// ---- 品类偏好分析 ----

export interface PreferenceProfile {
  /** 游戏平台偏好 */
  platformPreference: { platform: string; hours: number; percentage: number }[]
  /** 收藏类型偏好 */
  collectionType: { type: string; count: number; percentage: number }[]
  /** 玩家类型标签 */
  playerType: string[]
  /** 收藏家类型标签 */
  collectorType: string[]
  /** 推荐探索方向 */
  recommendations: string[]
}

/**
 * 分析逸趣偏好
 */
export function computePreferenceProfile(data: PlayData): PreferenceProfile {
  const totalHours = data.games.reduce((s, g) => s + g.hours, 0)
  const totalItems = data.games.length + data.toys.length + data.models.length + data.others.length

  // 平台偏好
  const platformMap = new Map<string, number>()
  for (const g of data.games) {
    platformMap.set(g.platform, (platformMap.get(g.platform) || 0) + g.hours)
  }
  const platformPreference = [...platformMap.entries()]
    .map(([platform, hours]) => ({
      platform,
      hours,
      percentage: totalHours > 0 ? Math.round(hours / totalHours * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours)

  // 收藏类型偏好
  const collectionType = [
    { type: '游戏', count: data.games.length, percentage: totalItems > 0 ? Math.round(data.games.length / totalItems * 100) : 0 },
    { type: '玩具', count: data.toys.length, percentage: totalItems > 0 ? Math.round(data.toys.length / totalItems * 100) : 0 },
    { type: '模型', count: data.models.length, percentage: totalItems > 0 ? Math.round(data.models.length / totalItems * 100) : 0 },
    { type: '其他', count: data.others.length, percentage: totalItems > 0 ? Math.round(data.others.length / totalItems * 100) : 0 },
  ].sort((a, b) => b.count - a.count)

  // 玩家类型
  const playerType: string[] = []
  if (totalHours > 500) playerType.push('骨灰级玩家')
  else if (totalHours > 100) playerType.push('资深玩家')
  else if (totalHours > 20) playerType.push('休闲玩家')
  else playerType.push('新手玩家')

  if (platformPreference.length >= 3) playerType.push('跨平台玩家')
  if (data.games.every(g => g.hours > 50)) playerType.push('深度体验者')
  if (data.games.some(g => g.hours < 5)) playerType.push('浅尝辄止型')

  // 收藏家类型
  const collectorType: string[] = []
  if (data.toys.length > 10) collectorType.push('玩具收藏家')
  if (data.models.length > 10) collectorType.push('模型收藏家')
  if (data.models.filter(m => m.status === 'sealed').length > 3) collectorType.push('封存党')
  if (data.toys.filter(t => t.value === 'mint').length > 3) collectorType.push('品相控')
  if (totalItems > 50) collectorType.push('重度收藏家')
  else if (totalItems > 20) collectorType.push('中度收藏家')
  else collectorType.push('轻度收藏家')

  // 推荐
  const recommendations: string[] = []
  if (data.games.length < 5) recommendations.push('尝试不同类型的游戏，拓宽你的游戏体验')
  if (data.toys.length === 0) recommendations.push('玩具收藏也是一个有趣的方向')
  if (data.models.length === 0) recommendations.push('模型/手办可以丰富你的收藏维度')
  if (totalHours > 1000) recommendations.push('你已经投入了大量时间，考虑记录游戏心得')

  return {
    platformPreference,
    collectionType,
    playerType,
    collectorType,
    recommendations,
  }
}

// ---- 导出 ----

export { MILESTONE_DEFS }