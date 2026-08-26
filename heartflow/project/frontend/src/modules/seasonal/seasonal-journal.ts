// ============================================================
// 岁时阁 · 季节日志
// 蓝图定义：
//   季节反思日志、季节转换仪式、节气联动、
//   年度回顾总结、季节情绪追踪
// ============================================================

import type { Season, SeasonalRitual } from './types'
import type { Cocoon, CocoonStage } from './cocoon'
import { SOLAR_TERMS } from './data'

// ---- 季节日志 ----

export interface SeasonalJournalEntry {
  id: string
  season: Season
  year: number
  /** 标题 */
  title: string
  /** 正文 */
  content: string
  /** 情绪状态 */
  mood: 'excited' | 'peaceful' | 'reflective' | 'melancholic' | 'energetic' | 'tired'
  /** 关键事件 */
  keyEvents: string[]
  /** 关联的仪式 */
  relatedRitualIds: string[]
  /** 关联的光茧 */
  relatedCocoonIds: string[]
  /** 节气标记 */
  solarTerm: string
  /** 天气 */
  weather: string
  /** 配图URL */
  imageUrl?: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ---- 季节反思提示 ----

export interface SeasonalPrompt {
  id: string
  season: Season
  category: 'life' | 'growth' | 'relationship' | 'work' | 'self' | 'dream'
  question: string
  hint: string
}

const SEASONAL_PROMPTS: SeasonalPrompt[] = [
  // 春 - 新生与开始
  { id: 'sp_spring_life', season: 'spring', category: 'life', question: '这个春天，你想播下什么种子？', hint: '可以是新的习惯、目标或关系' },
  { id: 'sp_spring_growth', season: 'spring', category: 'growth', question: '去年冬天过后，你感觉自己在哪些方面有了新的生机？', hint: '回顾那些重新燃起的事物' },
  { id: 'sp_spring_dream', season: 'spring', category: 'dream', question: '春天是梦想的季节，最近有什么新想法在萌芽？', hint: '哪怕微小的念头也值得记录' },
  // 夏 - 热烈与成长
  { id: 'sp_summer_life', season: 'summer', category: 'life', question: '这个夏天，什么让你感到最充实？', hint: '忙碌中的满足感' },
  { id: 'sp_summer_relationship', season: 'summer', category: 'relationship', question: '炎炎夏日，你和谁一起度过了最美好的时光？', hint: '那些温暖的陪伴' },
  { id: 'sp_summer_self', season: 'summer', category: 'self', question: '在热烈的季节里，你是否也感受到了内心的热情？', hint: '什么事情让你充满干劲' },
  // 秋 - 收获与沉淀
  { id: 'sp_autumn_life', season: 'autumn', category: 'life', question: '秋天是收获的季节，今年你收获了什么？', hint: '不论是实际的成果还是内心的成长' },
  { id: 'sp_autumn_reflective', season: 'autumn', category: 'growth', question: '落叶飘零时，有什么是你想要放下的？', hint: '学会放下也是一种成长' },
  { id: 'sp_autumn_work', season: 'autumn', category: 'work', question: '回顾今年的耕耘，哪些努力正在开花结果？', hint: '盘点你的付出与回报' },
  // 冬 - 沉淀与期待
  { id: 'sp_winter_life', season: 'winter', category: 'life', question: '这个冬天，你如何温暖自己？', hint: '自我关怀的方式' },
  { id: 'sp_winter_reflective', season: 'winter', category: 'growth', question: '安静的季节，你从这一年的经历中学到了什么？', hint: '年终的沉淀与反思' },
  { id: 'sp_winter_dream', season: 'winter', category: 'dream', question: '新的一年即将到来，你对未来有什么期待？', hint: '许下新的愿望' },
]

// ---- 季节情绪追踪 ----

export interface SeasonalMood {
  season: Season
  year: number
  /** 主导情绪 */
  dominantMood: SeasonalJournalEntry['mood']
  /** 情绪分布 */
  moodDistribution: Record<string, number>
  /** 情绪变化曲线 */
  moodCurve: { week: number; mood: string; intensity: number }[]
  /** 情绪关键词 */
  keywords: string[]
  /** 对比上一季的变化 */
  changeFromPrevious: string
}

export interface MoodTrend {
  seasons: { season: Season; year: number; dominantMood: string; avgIntensity: number }[]
  /** 整体趋势 */
  overallTrend: 'improving' | 'stable' | 'declining'
  /** 最高光时刻 */
  peakSeason: { season: Season; year: number }
  /** 最低谷时刻 */
  troughSeason: { season: Season; year: number }
}

// ---- 季节日志管理 ----

const MOOD_LABELS: Record<SeasonalJournalEntry['mood'], string> = {
  excited: '兴奋',
  peaceful: '平静',
  reflective: '沉思',
  melancholic: '感伤',
  energetic: '充满活力',
  tired: '疲惫',
}

const MOOD_ICONS: Record<SeasonalJournalEntry['mood'], string> = {
  excited: '🎉',
  peaceful: '😌',
  reflective: '🤔',
  melancholic: '😢',
  energetic: '⚡',
  tired: '😴',
}

const MOOD_INTENSITY: Record<SeasonalJournalEntry['mood'], number> = {
  excited: 0.9,
  peaceful: 0.6,
  reflective: 0.5,
  melancholic: 0.3,
  energetic: 0.8,
  tired: 0.2,
}

/**
 * 获取当前季节
 */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

/**
 * 获取该季节的反思提示
 */
export function getSeasonalPrompts(season: Season): SeasonalPrompt[] {
  return SEASONAL_PROMPTS.filter(p => p.season === season)
}

/**
 * 创建季节日志条目
 */
export function createJournalEntry(
  title: string,
  content: string,
  mood: SeasonalJournalEntry['mood'],
  season: Season = getCurrentSeason(),
): SeasonalJournalEntry {
  const now = new Date().toISOString()
  const currentTerm = SOLAR_TERMS.find(t => {
    const d = new Date()
    return t.month === d.getMonth() + 1 && t.day >= d.getDate() - 7
  }) || SOLAR_TERMS[0]

  return {
    id: `sj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    season,
    year: new Date().getFullYear(),
    title: title.trim(),
    content: content.trim(),
    mood,
    keyEvents: [],
    relatedRitualIds: [],
    relatedCocoonIds: [],
    solarTerm: currentTerm.name,
    weather: '',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 更新日志条目
 */
export function updateJournalEntry(
  entry: SeasonalJournalEntry,
  updates: Partial<Pick<SeasonalJournalEntry, 'title' | 'content' | 'mood' | 'weather' | 'imageUrl'>>,
): SeasonalJournalEntry {
  return {
    ...entry,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 添加关键事件到日志
 */
export function addKeyEvent(entry: SeasonalJournalEntry, event: string): SeasonalJournalEntry {
  return {
    ...entry,
    keyEvents: [...entry.keyEvents, event],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 关联仪式
 */
export function linkRitual(entry: SeasonalJournalEntry, ritualId: string): SeasonalJournalEntry {
  if (entry.relatedRitualIds.includes(ritualId)) return entry
  return {
    ...entry,
    relatedRitualIds: [...entry.relatedRitualIds, ritualId],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 关联光茧
 */
export function linkCocoon(entry: SeasonalJournalEntry, cocoonId: string): SeasonalJournalEntry {
  if (entry.relatedCocoonIds.includes(cocoonId)) return entry
  return {
    ...entry,
    relatedCocoonIds: [...entry.relatedCocoonIds, cocoonId],
    updatedAt: new Date().toISOString(),
  }
}

// ---- 季节情绪分析 ----

/**
 * 分析季节情绪
 */
export function analyzeSeasonalMood(
  entries: SeasonalJournalEntry[],
  season: Season,
  year: number,
): SeasonalMood | null {
  const seasonEntries = entries.filter(e => e.season === season && e.year === year)
  if (seasonEntries.length === 0) return null

  // 情绪分布
  const moodDistribution: Record<string, number> = {}
  let totalIntensity = 0
  const keywords: string[] = []

  for (const entry of seasonEntries) {
    moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1
    totalIntensity += MOOD_INTENSITY[entry.mood] || 0.5

    // 提取关键词
    const words = entry.content.split(/[\s,，。！？、；：""''（）]/)
    for (const word of words) {
      if (word.length >= 2 && word.length <= 6) {
        keywords.push(word)
      }
    }
  }

  // 主导情绪
  const dominantMood = Object.entries(moodDistribution)
    .sort((a, b) => b[1] - a[1])[0][0] as SeasonalJournalEntry['mood']

  // 情绪曲线（按周）
  const sortedEntries = [...seasonEntries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const moodCurve = sortedEntries.map((entry, i) => ({
    week: i + 1,
    mood: MOOD_LABELS[entry.mood],
    intensity: MOOD_INTENSITY[entry.mood],
  }))

  // 关键词频率
  const keywordFreq = new Map<string, number>()
  for (const kw of keywords) {
    keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1)
  }
  const topKeywords = [...keywordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw)

  // 对比上一季的变化
  const prevSeason = getPreviousSeason(season, year)
  const prevEntries = entries.filter(e => e.season === prevSeason.season && e.year === prevSeason.year)
  let changeFromPrevious = '无数据对比'
  if (prevEntries.length > 0) {
    const prevAvg = prevEntries.reduce((s, e) => s + (MOOD_INTENSITY[e.mood] || 0.5), 0) / prevEntries.length
    const currAvg = seasonEntries.reduce((s, e) => s + (MOOD_INTENSITY[e.mood] || 0.5), 0) / seasonEntries.length
    const diff = currAvg - prevAvg
    if (diff > 0.15) changeFromPrevious = '情绪明显提升 ↑'
    else if (diff > 0.05) changeFromPrevious = '情绪略有改善 ↗'
    else if (diff < -0.15) changeFromPrevious = '情绪明显下降 ↓'
    else if (diff < -0.05) changeFromPrevious = '情绪略有回落 ↘'
    else changeFromPrevious = '情绪保持稳定 →'
  }

  return {
    season,
    year,
    dominantMood,
    moodDistribution,
    moodCurve,
    keywords: topKeywords,
    changeFromPrevious,
  }
}

/**
 * 生成情绪趋势
 */
export function generateMoodTrend(entries: SeasonalJournalEntry[]): MoodTrend {
  const seasonMap = new Map<string, { entries: SeasonalJournalEntry[]; season: Season; year: number }>()

  for (const entry of entries) {
    const key = `${entry.season}_${entry.year}`
    if (!seasonMap.has(key)) {
      seasonMap.set(key, { entries: [], season: entry.season, year: entry.year })
    }
    seasonMap.get(key)!.entries.push(entry)
  }

  const seasons = [...seasonMap.values()]
    .sort((a, b) => a.year - b.year || getSeasonOrder(a.season) - getSeasonOrder(b.season))

  const trendData = seasons.map(s => {
    const avgIntensity = s.entries.length > 0
      ? s.entries.reduce((sum, e) => sum + (MOOD_INTENSITY[e.mood] || 0.5), 0) / s.entries.length
      : 0.5

    const moodDist: Record<string, number> = {}
    for (const e of s.entries) {
      moodDist[e.mood] = (moodDist[e.mood] || 0) + 1
    }
    const dominantMood = Object.entries(moodDist).sort((a, b) => b[1] - a[1])[0]?.[0] || 'peaceful'

    return {
      season: s.season,
      year: s.year,
      dominantMood: MOOD_LABELS[dominantMood as SeasonalJournalEntry['mood']],
      avgIntensity: Math.round(avgIntensity * 100) / 100,
    }
  })

  // 整体趋势
  let overallTrend: MoodTrend['overallTrend'] = 'stable'
  if (trendData.length >= 2) {
    const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2))
    const secondHalf = trendData.slice(Math.floor(trendData.length / 2))
    const firstAvg = firstHalf.reduce((s, d) => s + d.avgIntensity, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, d) => s + d.avgIntensity, 0) / secondHalf.length
    const change = secondAvg - firstAvg
    if (change > 0.1) overallTrend = 'improving'
    else if (change < -0.1) overallTrend = 'declining'
  }

  const peakSeason = trendData.length > 0
    ? trendData.reduce((max, d) => d.avgIntensity > max.avgIntensity ? d : max, trendData[0])
    : { season: 'spring' as Season, year: new Date().getFullYear() }

  const troughSeason = trendData.length > 0
    ? trendData.reduce((min, d) => d.avgIntensity < min.avgIntensity ? d : min, trendData[0])
    : { season: 'spring' as Season, year: new Date().getFullYear() }

  return {
    seasons: trendData,
    overallTrend,
    peakSeason: { season: peakSeason.season, year: peakSeason.year },
    troughSeason: { season: troughSeason.season, year: troughSeason.year },
  }
}

// ---- 季节转换仪式 ----

export interface SeasonTransition {
  from: Season
  to: Season
  timestamp: string
  /** 仪式动作 */
  ritualActions: string[]
  /** 告别上一季 */
  farewell: { things: string[]; lessons: string[] }
  /** 迎接新季节 */
  welcome: { intentions: string[]; hopes: string[] }
  /** 关联的光茧 */
  cocoonTransitions: { cocoonId: string; fromStage: CocoonStage; toStage: CocoonStage }[]
}

/**
 * 生成季节转换仪式
 */
export function generateSeasonTransition(
  from: Season,
  to: Season,
  entries: SeasonalJournalEntry[],
  cocoons: Cocoon[],
  rituals: SeasonalRitual[],
): SeasonTransition {
  const seasonEntries = entries.filter(e => e.season === from)
  

  // 告别
  const things = seasonEntries.flatMap(e => e.keyEvents)
  const lessons = seasonEntries
    .filter(e => e.content.length > 20)
    .map(e => e.content.slice(0, 30) + '...')

  // 迎接
  const intentions: string[] = []
  const toRituals = rituals.filter(r => r.season === to)
  if (toRituals.length > 0) {
    intentions.push(`继续${toRituals[0].name}的仪式`)
  }
  intentions.push(`在${getSeasonLabel(to)}发现新的自己`)

  const hopes = getSeasonalPrompts(to).slice(0, 2).map(p => p.question)

  // 仪式动作
  const ritualActions = [
    `回顾${getSeasonLabel(from)}的${seasonEntries.length}篇日志`,
    `整理${getSeasonLabel(from)}的收获与感悟`,
    `为${getSeasonLabel(to)}设定新意图`,
    `更新光茧阶段`,
  ]

  // 光茧转换
  const cocoonTransitions = cocoons
    .filter(c => c.season === from && c.stage !== 'flying')
    .map(c => ({
      cocoonId: c.id,
      fromStage: c.stage,
      toStage: getNextCocoonStage(c.stage),
    }))

  return {
    from,
    to,
    timestamp: new Date().toISOString(),
    ritualActions,
    farewell: {
      things: things.slice(0, 5),
      lessons: lessons.slice(0, 3),
    },
    welcome: {
      intentions: intentions.slice(0, 3),
      hopes: hopes.slice(0, 3),
    },
    cocoonTransitions,
  }
}

// ---- 年度回顾 ----

export interface YearReview {
  year: number
  seasons: {
    season: Season
    entryCount: number
    dominantMood: string
    highlights: string[]
  }[]
  totalEntries: number
  yearTheme: string
  growth: string[]
  gratitude: string[]
  nextYearIntentions: string[]
}

/**
 * 生成年度回顾
 */
export function generateYearReview(
  year: number,
  entries: SeasonalJournalEntry[],
  _cocoons: Cocoon[],
  _rituals: SeasonalRitual[],
): YearReview {
  const yearEntries = entries.filter(e => e.year === year)
  const seasons: YearReview['seasons'] = []

  const seasonOrder: Season[] = ['spring', 'summer', 'autumn', 'winter']
  for (const season of seasonOrder) {
    const seasonEntries = yearEntries.filter(e => e.season === season)
    if (seasonEntries.length === 0) continue

    const moodDist: Record<string, number> = {}
    for (const e of seasonEntries) {
      moodDist[e.mood] = (moodDist[e.mood] || 0) + 1
    }
    const dominantMood = Object.entries(moodDist).sort((a, b) => b[1] - a[1])[0]?.[0] || 'peaceful'

    seasons.push({
      season,
      entryCount: seasonEntries.length,
      dominantMood: MOOD_LABELS[dominantMood as SeasonalJournalEntry['mood']],
      highlights: seasonEntries.flatMap(e => e.keyEvents).slice(0, 3),
    })
  }

  // 年度主题
  const allMoods = yearEntries.map(e => e.mood)
  const moodCount: Record<string, number> = {}
  for (const m of allMoods) {
    moodCount[m] = (moodCount[m] || 0) + 1
  }
  const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'peaceful'
  const yearTheme = generateYearTheme(topMood as SeasonalJournalEntry['mood'])

  // 成长
  const growth = yearEntries
    .filter(e => e.content.includes('成长') || e.content.includes('学会') || e.content.includes('改变'))
    .slice(0, 5)
    .map(e => e.content.slice(0, 50) + '...')

  // 感恩
  const gratitude = yearEntries
    .filter(e => e.content.includes('感谢') || e.content.includes('感恩') || e.content.includes('幸运'))
    .slice(0, 3)
    .map(e => e.content.slice(0, 50) + '...')

  // 下一年意图
  const nextYearIntentions = yearEntries
    .filter(e => e.content.includes('希望') || e.content.includes('期待') || e.content.includes('想要'))
    .slice(0, 3)
    .map(e => e.content.slice(0, 50) + '...')

  return {
    year,
    seasons,
    totalEntries: yearEntries.length,
    yearTheme,
    growth,
    gratitude,
    nextYearIntentions,
  }
}

// ---- 辅助函数 ----

function getSeasonOrder(season: Season): number {
  const order: Record<Season, number> = { spring: 0, summer: 1, autumn: 2, winter: 3 }
  return order[season]
}

function getSeasonLabel(season: Season): string {
  const labels: Record<Season, string> = { spring: '春天', summer: '夏天', autumn: '秋天', winter: '冬天' }
  return labels[season]
}

function getPreviousSeason(season: Season, year: number): { season: Season; year: number } {
  const order: Season[] = ['spring', 'summer', 'autumn', 'winter']
  const idx = order.indexOf(season)
  if (idx === 0) return { season: 'winter', year: year - 1 }
  return { season: order[idx - 1], year }
}

function getNextCocoonStage(stage: CocoonStage): CocoonStage {
  const order: CocoonStage[] = ['gestating', 'cracking', 'emerging', 'flying']
  const idx = order.indexOf(stage)
  return idx < order.length - 1 ? order[idx + 1] : stage
}

function generateYearTheme(mood: SeasonalJournalEntry['mood']): string {
  const themes: Record<SeasonalJournalEntry['mood'], string> = {
    excited: '充满激情的一年',
    peaceful: '宁静致远的一年',
    reflective: '深度思考的一年',
    melancholic: '沉淀与蜕变的一年',
    energetic: '活力四射的一年',
    tired: '需要休整的一年',
  }
  return themes[mood] || '平凡而珍贵的一年'
}

// ---- 导出 ----

export {
  MOOD_LABELS,
  MOOD_ICONS,
  MOOD_INTENSITY,
  SEASONAL_PROMPTS,
}