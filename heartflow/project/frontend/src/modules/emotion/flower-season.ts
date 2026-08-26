// ============================================================
// 情绪花房 · 季节系统 + 杂交系统 + 音景系统
// 蓝图：四季影响、花朵杂交、环境音景、访客足迹
// ============================================================

import { ref } from 'vue'
import type { EmotionType } from './types'
import { FLOWER_VARIETIES, type FlowerVariety } from './flower-variety'

// ---- 季节系统 ----

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SeasonConfig {
  season: Season
  label: string
  /** 温度范围 */
  temperature: [number, number]
  /** 日照时长（小时） */
  daylightHours: number
  /** 降水概率 */
  rainProbability: number
  /** 季节色彩 */
  colors: {
    sky: string
    ground: string
    ambient: string
    accent: string
  }
  /** 季节特效 */
  effects: string[]
  /** 对花朵生长的影响 */
  growthModifier: number
  /** 对花朵颜色的影响 */
  colorShift: number
  /** 该季节最适宜的情绪 */
  bestEmotions: EmotionType[]
  /** 该季节特有的花朵变体 */
  seasonalVariants: string[]
}

export const SEASON_CONFIGS: Record<Season, SeasonConfig> = {
  spring: {
    season: 'spring',
    label: '春',
    temperature: [15, 25],
    daylightHours: 13,
    rainProbability: 0.4,
    colors: { sky: '#fce4ec', ground: '#c8e6c9', ambient: '#fff9c4', accent: '#f48fb1' },
    effects: ['cherry-petals', 'gentle-breeze', 'butterflies'],
    growthModifier: 1.3,
    colorShift: 0.1,
    bestEmotions: ['happy'],
    seasonalVariants: ['spring-cherry', 'spring-tulip', 'spring-daisy'],
  },
  summer: {
    season: 'summer',
    label: '夏',
    temperature: [25, 35],
    daylightHours: 15,
    rainProbability: 0.2,
    colors: { sky: '#fff3e0', ground: '#a5d6a7', ambient: '#ffecb3', accent: '#ff8a65' },
    effects: ['sun-rays', 'fireflies', 'heat-wave'],
    growthModifier: 1.0,
    colorShift: 0.2,
    bestEmotions: ['happy'],
    seasonalVariants: ['summer-sunflower', 'summer-lotus', 'summer-hibiscus'],
  },
  autumn: {
    season: 'autumn',
    label: '秋',
    temperature: [10, 20],
    daylightHours: 11,
    rainProbability: 0.35,
    colors: { sky: '#efebe9', ground: '#ffcc80', ambient: '#ffe0b2', accent: '#a1887f' },
    effects: ['falling-leaves', 'mist', 'golden-light'],
    growthModifier: 0.8,
    colorShift: 0.3,
    bestEmotions: ['calm', 'sad'],
    seasonalVariants: ['autumn-maple', 'autumn-chrysanthemum', 'autumn-cosmos'],
  },
  winter: {
    season: 'winter',
    label: '冬',
    temperature: [-5, 10],
    daylightHours: 9,
    rainProbability: 0.15,
    colors: { sky: '#e3f2fd', ground: '#e0e0e0', ambient: '#bbdefb', accent: '#90caf9' },
    effects: ['snowflakes', 'frost', 'aurora'],
    growthModifier: 0.5,
    colorShift: 0.1,
    bestEmotions: ['calm'],
    seasonalVariants: ['winter-plum', 'winter-camellia', 'winter-narcissus'],
  },
}

// ---- 杂交系统 ----

export interface CrossBreedRecipe {
  id: string
  /** 父本花朵 */
  parentA: string
  /** 母本花朵 */
  parentB: string
  /** 产出花朵 */
  result: string
  /** 杂交成功率 */
  successRate: number
  /** 需要的季节条件 */
  requiredSeason?: Season
  /** 需要的情绪环境 */
  requiredEmotion?: EmotionType
  /** 杂交描述 */
  description: string
  /** 是否已解锁 */
  unlocked: boolean
}

export interface CrossBreedResult {
  id: string
  recipeId: string
  parentA: string
  parentB: string
  result: string
  success: boolean
  /** 如果失败，产生的变异花朵 */
  mutation?: string
  timestamp: string
}

export const CROSS_BREED_RECIPES: Omit<CrossBreedRecipe, 'id' | 'unlocked'>[] = [
  {
    parentA: 'joy-rose',
    parentB: 'calm-lavender',
    result: 'serene-peony',
    successRate: 0.6,
    requiredSeason: 'spring',
    description: '喜悦玫瑰与宁静薰衣草的杂交，产出平和牡丹',
  },
  {
    parentA: 'passion-tulip',
    parentB: 'hope-sunflower',
    result: 'vibrant-dahlia',
    successRate: 0.55,
    requiredSeason: 'summer',
    description: '热情郁金香与希望向日葵的杂交，产出活力大丽花',
  },
  {
    parentA: 'nostalgia-maple',
    parentB: 'calm-chrysanthemum',
    result: 'reflective-cosmos',
    successRate: 0.5,
    requiredSeason: 'autumn',
    description: '怀旧枫叶与平静菊花的杂交，产出沉思波斯菊',
  },
  {
    parentA: 'peace-plum',
    parentB: 'contemplation-camellia',
    result: 'tranquil-orchid',
    successRate: 0.45,
    requiredSeason: 'winter',
    description: '平和梅花与沉思山茶的杂交，产出清幽兰花',
  },
  {
    parentA: 'joy-sakura',
    parentB: 'hope-lily',
    result: 'radiant-lotus',
    successRate: 0.5,
    requiredEmotion: 'happy',
    description: '喜悦樱花与希望百合的杂交，产出灿烂莲花',
  },
  {
    parentA: 'passion-rose',
    parentB: 'vitality-orchid',
    result: 'fiery-amaryllis',
    successRate: 0.4,
    requiredSeason: 'summer',
    description: '热情玫瑰与活力兰花的杂交，产出炽热朱顶红',
  },
]

// ---- 音景系统 ----

export interface Soundscape {
  id: string
  name: string
  /** 基础环境音 */
  ambient: string
  /** 情绪对应的旋律 */
  emotionMelodies: Record<EmotionType, string>
  /** 季节变奏 */
  seasonalVariations: Record<Season, string>
  /** 音量 0-1 */
  volume: number
  /** 是否启用 */
  enabled: boolean
}

export const DEFAULT_SOUNDSCAPES: Omit<Soundscape, 'id'>[] = [
  {
    name: '雨林',
    ambient: 'rain-forest',
    emotionMelodies: {
      happy: 'light-piano', calm: 'flowing-water', sad: 'gentle-rain',
      angry: 'distant-thunder', anxious: 'wind-chimes',
    },
    seasonalVariations: {
      spring: 'spring-rain', summer: 'summer-storm',
      autumn: 'autumn-drizzle', winter: 'winter-silence',
    },
    volume: 0.5,
    enabled: true,
  },
  {
    name: '星空',
    ambient: 'cosmic-hum',
    emotionMelodies: {
      happy: 'celestial-harp', calm: 'deep-space', sad: 'lonely-piano',
      angry: 'solar-flare', anxious: 'void-echo',
    },
    seasonalVariations: {
      spring: 'meteor-shower', summer: 'milky-way',
      autumn: 'aurora', winter: 'polaris',
    },
    volume: 0.4,
    enabled: true,
  },
  {
    name: '森林',
    ambient: 'forest-ambient',
    emotionMelodies: {
      happy: 'bird-song', calm: 'stream', sad: 'owl',
      angry: 'thunderstorm', anxious: 'wolf-howl',
    },
    seasonalVariations: {
      spring: 'blooming', summer: 'cicada',
      autumn: 'rustling', winter: 'hush',
    },
    volume: 0.5,
    enabled: true,
  },
]

// ---- 访客足迹 ----

export interface VisitorFootprint {
  id: string
  /** 访客标识（匿名） */
  visitorId: string
  /** 访客昵称 */
  visitorName: string
  /** 访问时间 */
  visitedAt: string
  /** 留下的印记类型 */
  footprintType: 'like' | 'water' | 'comment' | 'gift' | 'admire'
  /** 印记内容 */
  message?: string
  /** 针对的花朵 */
  targetFlower?: string
  /** 是否已回复 */
  replied: boolean
  /** 回复内容 */
  reply?: string
}

// ============================================================
// useFlowerSeason
// ============================================================

export function useFlowerSeason() {
  const currentSeason = ref<Season>('summer')
  const seasonProgress = ref<number>(0) // 0-1，当前季节的进度

  /** 根据日期计算当前季节 */
  function detectSeason(date: Date = new Date()): Season {
    const month = date.getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'autumn'
    return 'winter'
  }

  /** 更新季节状态 */
  function updateSeason(date: Date = new Date()): void {
    currentSeason.value = detectSeason(date)

    // 计算季节进度
    const month = date.getMonth()
    const seasonStartMonth = Math.floor(month / 3) * 3
    const seasonEndMonth = seasonStartMonth + 2
    const totalDays = new Date(date.getFullYear(), seasonEndMonth + 1, 0).getDate()
    const elapsedDays = (month - seasonStartMonth) * 30 + date.getDate()
    seasonProgress.value = Math.min(elapsedDays / (totalDays * 3), 1)
  }

  /** 获取当前季节配置 */
  function getSeasonConfig(): SeasonConfig {
    return SEASON_CONFIGS[currentSeason.value]
  }

  /** 计算季节对花朵生长的影响 */
  function applySeasonToFlower(
    flower: FlowerVariety,
  ): FlowerVariety & { growthSpeed: number; colorShift: number } {
    const config = SEASON_CONFIGS[currentSeason.value]
    const isBestEmotion = config.bestEmotions.includes(flower.emotionType)

    return {
      ...flower,
      growthSpeed: 1.0 * config.growthModifier * (isBestEmotion ? 1.2 : 1),
      colorShift: config.colorShift,
    }
  }

  /** 获取季节推荐花朵 */
  function getSeasonalRecommendations(): FlowerVariety[] {
    const config = SEASON_CONFIGS[currentSeason.value]
    return FLOWER_VARIETIES.filter(
      (f) => config.bestEmotions.includes(f.emotionType),
    )
  }

  /** 获取季节特效 */
  function getSeasonalEffects(): string[] {
    return SEASON_CONFIGS[currentSeason.value].effects
  }

  return {
    currentSeason,
    seasonProgress,
    detectSeason,
    updateSeason,
    getSeasonConfig,
    applySeasonToFlower,
    getSeasonalRecommendations,
    getSeasonalEffects,
  }
}

// ============================================================
// useCrossBreeding
// ============================================================

export function useCrossBreeding() {
  const recipes = ref<CrossBreedRecipe[]>([])
  const results = ref<CrossBreedResult[]>([])

  /** 初始化杂交配方 */
  function initRecipes(): void {
    recipes.value = CROSS_BREED_RECIPES.map((r) => ({
      ...r,
      id: `cb-${Date.now()}-${r.parentA}-${r.parentB}`,
      unlocked: true,
    }))
  }

  /** 执行杂交 */
  function performCrossBreed(
    parentA: string,
    parentB: string,
    currentSeason: Season,
    currentEmotion: EmotionType,
  ): CrossBreedResult | null {
    const recipe = recipes.value.find(
      (r) =>
        (r.parentA === parentA && r.parentB === parentB) ||
        (r.parentA === parentB && r.parentB === parentA),
    )

    if (!recipe || !recipe.unlocked) return null

    // 检查季节条件
    let seasonBonus = 0
    if (recipe.requiredSeason) {
      if (recipe.requiredSeason !== currentSeason) {
        return null // 季节不匹配，无法杂交
      }
      seasonBonus = 0.1
    }

    // 检查情绪条件
    let emotionBonus = 0
    if (recipe.requiredEmotion) {
      if (recipe.requiredEmotion === currentEmotion) {
        emotionBonus = 0.15
      }
    }

    const actualRate = Math.min(recipe.successRate + seasonBonus + emotionBonus, 0.95)
    const success = Math.random() < actualRate

    const result: CrossBreedResult = {
      id: `cbr-${Date.now()}`,
      recipeId: recipe.id,
      parentA,
      parentB,
      result: success ? recipe.result : '',
      success,
      mutation: !success ? generateMutation(parentA, parentB) : undefined,
      timestamp: new Date().toISOString(),
    }

    results.value.push(result)
    return result
  }

  /** 获取可用的杂交配方 */
  function getAvailableRecipes(
    ownedFlowers: string[],
    currentSeason: Season,
  ): CrossBreedRecipe[] {
    return recipes.value.filter((r) => {
      if (!r.unlocked) return false
      if (r.requiredSeason && r.requiredSeason !== currentSeason) return false
      return ownedFlowers.includes(r.parentA) && ownedFlowers.includes(r.parentB)
    })
  }

  /** 解锁新配方 */
  function unlockRecipe(recipeId: string): void {
    const recipe = recipes.value.find((r) => r.id === recipeId)
    if (recipe) recipe.unlocked = true
  }

  /** 获取杂交统计 */
  function getBreedStats(): {
    totalAttempts: number
    successCount: number
    successRate: number
    uniqueResults: number
  } {
    const total = results.value.length
    const success = results.value.filter((r) => r.success).length
    const unique = new Set(results.value.filter((r) => r.success).map((r) => r.result)).size

    return {
      totalAttempts: total,
      successCount: success,
      successRate: total > 0 ? success / total : 0,
      uniqueResults: unique,
    }
  }

  return {
    recipes,
    results,
    initRecipes,
    performCrossBreed,
    getAvailableRecipes,
    unlockRecipe,
    getBreedStats,
  }
}

/** 生成杂交变异花朵 */
function generateMutation(_parentA: string, _parentB: string): string {
  const mutations = [
    'mystery-iris', 'phantom-lily', 'shadow-rose',
    'crystal-daisy', 'moonlight-orchid', 'twilight-tulip',
  ]
  return mutations[Math.floor(Math.random() * mutations.length)]
}

// ============================================================
// useSoundscape
// ============================================================

export function useSoundscape() {
  const soundscapes = ref<Soundscape[]>([])
  const activeSoundscapeId = ref<string | null>(null)
  const masterVolume = ref<number>(0.5)

  /** 初始化音景 */
  function initSoundscapes(): void {
    soundscapes.value = DEFAULT_SOUNDSCAPES.map((s) => ({
      ...s,
      id: `ss-${Date.now()}-${s.name}`,
    }))
    if (soundscapes.value.length > 0) {
      activeSoundscapeId.value = soundscapes.value[0].id
    }
  }

  /** 切换音景 */
  function switchSoundscape(soundscapeId: string): void {
    activeSoundscapeId.value = soundscapeId
  }

  /** 获取当前音景 */
  function getActiveSoundscape(): Soundscape | undefined {
    return soundscapes.value.find((s) => s.id === activeSoundscapeId.value)
  }

  /** 根据情绪获取旋律 */
  function getEmotionMelody(emotion: EmotionType): string | undefined {
    const active = getActiveSoundscape()
    return active?.emotionMelodies[emotion]
  }

  /** 根据季节获取变奏 */
  function getSeasonalVariation(season: Season): string | undefined {
    const active = getActiveSoundscape()
    return active?.seasonalVariations[season]
  }

  /** 设置主音量 */
  function setVolume(volume: number): void {
    masterVolume.value = Math.max(0, Math.min(1, volume))
  }

  return {
    soundscapes,
    activeSoundscapeId,
    masterVolume,
    initSoundscapes,
    switchSoundscape,
    getActiveSoundscape,
    getEmotionMelody,
    getSeasonalVariation,
    setVolume,
  }
}

// ============================================================
// useVisitorFootprints
// ============================================================

export function useVisitorFootprints() {
  const footprints = ref<VisitorFootprint[]>([])

  /** 添加访客足迹 */
  function addFootprint(
    visitorId: string,
    visitorName: string,
    footprintType: VisitorFootprint['footprintType'],
    message?: string,
    targetFlower?: string,
  ): VisitorFootprint {
    const footprint: VisitorFootprint = {
      id: `vf-${Date.now()}`,
      visitorId,
      visitorName,
      visitedAt: new Date().toISOString(),
      footprintType,
      message,
      targetFlower,
      replied: false,
    }

    footprints.value.push(footprint)
    return footprint
  }

  /** 回复足迹 */
  function replyToFootprint(footprintId: string, reply: string): VisitorFootprint | undefined {
    const footprint = footprints.value.find((f) => f.id === footprintId)
    if (!footprint) return undefined

    footprint.replied = true
    footprint.reply = reply
    return footprint
  }

  /** 获取未回复的足迹 */
  function getUnrepliedFootprints(): VisitorFootprint[] {
    return footprints.value.filter((f) => !f.replied)
  }

  /** 获取针对特定花朵的足迹 */
  function getFootprintsForFlower(flowerId: string): VisitorFootprint[] {
    return footprints.value.filter((f) => f.targetFlower === flowerId)
  }

  /** 获取访客统计 */
  function getVisitorStats(): {
    totalVisitors: number
    totalFootprints: number
    byType: Record<string, number>
    unrepliedCount: number
  } {
    const uniqueVisitors = new Set(footprints.value.map((f) => f.visitorId))
    const byType: Record<string, number> = {}
    footprints.value.forEach((f) => {
      byType[f.footprintType] = (byType[f.footprintType] || 0) + 1
    })

    return {
      totalVisitors: uniqueVisitors.size,
      totalFootprints: footprints.value.length,
      byType,
      unrepliedCount: footprints.value.filter((f) => !f.replied).length,
    }
  }

  return {
    footprints,
    addFootprint,
    replyToFootprint,
    getUnrepliedFootprints,
    getFootprintsForFlower,
    getVisitorStats,
  }
}