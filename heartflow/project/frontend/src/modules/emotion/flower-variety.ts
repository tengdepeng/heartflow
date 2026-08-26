// ============================================================
// 情绪花房 · 花朵品种映射
// 蓝图定义：
//   开心→暖金小花、平静→淡蓝铃兰、低落→灰紫绣球
//   焦虑→暗红藤蔓、愤怒→深橙尖瓣花
//   同种情绪不同时期产生不同品种变体
// ============================================================

import type { EmotionType, EmotionRecord } from './types'

// ---- 花朵品种 ----

export interface FlowerVariety {
  /** 品种 ID */
  id: string
  /** 品种名称 */
  name: string
  /** 所属情绪类型 */
  emotionType: EmotionType
  /** 中文花名 */
  chineseName: string
  /** 花瓣颜色 */
  petalColor: string
  /** 花蕊颜色 */
  coreColor: string
  /** 花瓣数 */
  petalCount: number
  /** 花瓣形状 */
  petalShape: 'rounded' | 'pointed' | 'wavy' | 'star' | 'bell'
  /** 花朵大小范围 [min, max] */
  sizeRange: [number, number]
  /** 开花条件：连续同情绪天数 */
  bloomDays: number
  /** 稀有度 */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  /** 特殊效果 */
  specialEffect?: 'glow' | 'sparkle' | 'petal_fall' | 'sway' | 'none'
}

// ---- 蓝图花朵品种映射 ----

export const FLOWER_VARIETIES: FlowerVariety[] = [
  // ===== 开心 (happy) =====
  {
    id: 'happy_sunny',
    name: '暖金小花',
    chineseName: '金盏',
    emotionType: 'happy',
    petalColor: '#f5d060',
    coreColor: '#e8a820',
    petalCount: 6,
    petalShape: 'rounded',
    sizeRange: [0.8, 1.2],
    bloomDays: 1,
    rarity: 'common',
    specialEffect: 'glow',
  },
  {
    id: 'happy_marigold',
    name: '阳光万寿菊',
    chineseName: '寿光',
    emotionType: 'happy',
    petalColor: '#f0c040',
    coreColor: '#d4a020',
    petalCount: 8,
    petalShape: 'rounded',
    sizeRange: [1.0, 1.4],
    bloomDays: 2,
    rarity: 'uncommon',
    specialEffect: 'sparkle',
  },
  {
    id: 'happy_sunflower',
    name: '迷你向日葵',
    chineseName: '向暖',
    emotionType: 'happy',
    petalColor: '#f0c040',
    coreColor: '#8b4513',
    petalCount: 12,
    petalShape: 'pointed',
    sizeRange: [1.2, 1.8],
    bloomDays: 3,
    rarity: 'rare',
    specialEffect: 'glow',
  },
  {
    id: 'happy_peony',
    name: '欢喜牡丹',
    chineseName: '喜颜',
    emotionType: 'happy',
    petalColor: '#ffc0cb',
    coreColor: '#ff69b4',
    petalCount: 16,
    petalShape: 'wavy',
    sizeRange: [1.5, 2.0],
    bloomDays: 5,
    rarity: 'legendary',
    specialEffect: 'petal_fall',
  },

  // ===== 平静 (calm) =====
  {
    id: 'calm_lily',
    name: '淡蓝铃兰',
    chineseName: '静铃',
    emotionType: 'calm',
    petalColor: '#a0d0e0',
    coreColor: '#6090b0',
    petalCount: 5,
    petalShape: 'bell',
    sizeRange: [0.7, 1.0],
    bloomDays: 1,
    rarity: 'common',
    specialEffect: 'sway',
  },
  {
    id: 'calm_lavender',
    name: '浅紫薰衣草',
    chineseName: '宁薰',
    emotionType: 'calm',
    petalColor: '#b8a0d8',
    coreColor: '#8070a8',
    petalCount: 7,
    petalShape: 'pointed',
    sizeRange: [0.8, 1.1],
    bloomDays: 2,
    rarity: 'uncommon',
    specialEffect: 'sway',
  },
  {
    id: 'calm_lotus',
    name: '水中睡莲',
    chineseName: '静莲',
    emotionType: 'calm',
    petalColor: '#e8d0f0',
    coreColor: '#c0a0d0',
    petalCount: 10,
    petalShape: 'wavy',
    sizeRange: [1.1, 1.5],
    bloomDays: 3,
    rarity: 'rare',
    specialEffect: 'none',
  },
  {
    id: 'calm_moonflower',
    name: '月光花',
    chineseName: '月静',
    emotionType: 'calm',
    petalColor: '#f0f0ff',
    coreColor: '#c0c0e0',
    petalCount: 6,
    petalShape: 'star',
    sizeRange: [1.0, 1.3],
    bloomDays: 5,
    rarity: 'legendary',
    specialEffect: 'glow',
  },

  // ===== 低落 (sad) =====
  {
    id: 'sad_hydrangea',
    name: '灰紫绣球',
    chineseName: '愁绣',
    emotionType: 'sad',
    petalColor: '#b0a0d0',
    coreColor: '#7060a0',
    petalCount: 5,
    petalShape: 'wavy',
    sizeRange: [0.8, 1.2],
    bloomDays: 1,
    rarity: 'common',
    specialEffect: 'none',
  },
  {
    id: 'sad_forgetmenot',
    name: '勿忘我',
    chineseName: '勿念',
    emotionType: 'sad',
    petalColor: '#8090c0',
    coreColor: '#5060a0',
    petalCount: 5,
    petalShape: 'rounded',
    sizeRange: [0.6, 0.9],
    bloomDays: 2,
    rarity: 'uncommon',
    specialEffect: 'none',
  },
  {
    id: 'sad_bluebell',
    name: '蓝风铃',
    chineseName: '幽铃',
    emotionType: 'sad',
    petalColor: '#7080b0',
    coreColor: '#4050a0',
    petalCount: 6,
    petalShape: 'bell',
    sizeRange: [0.7, 1.0],
    bloomDays: 3,
    rarity: 'rare',
    specialEffect: 'sway',
  },
  {
    id: 'sad_crystalrose',
    name: '水晶蔷薇',
    chineseName: '晶泪',
    emotionType: 'sad',
    petalColor: '#d0c0e0',
    coreColor: '#a090c0',
    petalCount: 12,
    petalShape: 'wavy',
    sizeRange: [1.0, 1.4],
    bloomDays: 5,
    rarity: 'legendary',
    specialEffect: 'glow',
  },

  // ===== 焦虑 (anxious) =====
  {
    id: 'anxious_vine',
    name: '暗红藤蔓',
    chineseName: '缠藤',
    emotionType: 'anxious',
    petalColor: '#d07070',
    coreColor: '#a03030',
    petalCount: 7,
    petalShape: 'pointed',
    sizeRange: [0.8, 1.2],
    bloomDays: 1,
    rarity: 'common',
    specialEffect: 'none',
  },
  {
    id: 'anxious_thorn',
    name: '暗刺蔷薇',
    chineseName: '棘心',
    emotionType: 'anxious',
    petalColor: '#c05050',
    coreColor: '#801010',
    petalCount: 8,
    petalShape: 'pointed',
    sizeRange: [0.9, 1.3],
    bloomDays: 2,
    rarity: 'uncommon',
    specialEffect: 'none',
  },
  {
    id: 'anxious_nightshade',
    name: '夜影龙葵',
    chineseName: '暗影',
    emotionType: 'anxious',
    petalColor: '#6040a0',
    coreColor: '#302060',
    petalCount: 5,
    petalShape: 'star',
    sizeRange: [0.7, 1.0],
    bloomDays: 3,
    rarity: 'rare',
    specialEffect: 'glow',
  },
  {
    id: 'anxious_phoenix',
    name: '涅槃火莲',
    chineseName: '烬莲',
    emotionType: 'anxious',
    petalColor: '#ff6b35',
    coreColor: '#c04020',
    petalCount: 10,
    petalShape: 'wavy',
    sizeRange: [1.1, 1.6],
    bloomDays: 5,
    rarity: 'legendary',
    specialEffect: 'sparkle',
  },

  // ===== 愤怒 (angry) =====
  {
    id: 'angry_spike',
    name: '深橙尖瓣花',
    chineseName: '烈瓣',
    emotionType: 'angry',
    petalColor: '#f09050',
    coreColor: '#c05020',
    petalCount: 8,
    petalShape: 'pointed',
    sizeRange: [0.9, 1.3],
    bloomDays: 1,
    rarity: 'common',
    specialEffect: 'none',
  },
  {
    id: 'angry_cactus',
    name: '沙漠仙人掌花',
    chineseName: '漠焰',
    emotionType: 'angry',
    petalColor: '#e87030',
    coreColor: '#a04020',
    petalCount: 6,
    petalShape: 'star',
    sizeRange: [1.0, 1.4],
    bloomDays: 2,
    rarity: 'uncommon',
    specialEffect: 'none',
  },
  {
    id: 'angry_volcano',
    name: '火山之花',
    chineseName: '熔蕊',
    emotionType: 'angry',
    petalColor: '#ff4500',
    coreColor: '#8b0000',
    petalCount: 10,
    petalShape: 'pointed',
    sizeRange: [1.1, 1.5],
    bloomDays: 3,
    rarity: 'rare',
    specialEffect: 'glow',
  },
  {
    id: 'angry_dragon',
    name: '龙息花',
    chineseName: '龙炎',
    emotionType: 'angry',
    petalColor: '#ff6347',
    coreColor: '#dc143c',
    petalCount: 14,
    petalShape: 'wavy',
    sizeRange: [1.3, 1.8],
    bloomDays: 5,
    rarity: 'legendary',
    specialEffect: 'sparkle',
  },
]

// ---- 品种选择 ----

/** 根据情绪记录选择花朵品种 */
export function selectFlowerVariety(record: EmotionRecord, sameTypeStreak: number): FlowerVariety {
  const varieties = FLOWER_VARIETIES.filter(v => v.emotionType === record.type)

  if (varieties.length === 0) {
    // 兜底：返回第一个同情绪类型的品种
    return FLOWER_VARIETIES.find(v => v.emotionType === record.type) || FLOWER_VARIETIES[0]
  }

  // 根据连续天数选择稀有度
  if (sameTypeStreak >= 5) {
    const legendary = varieties.find(v => v.rarity === 'legendary')
    if (legendary) return legendary
  }
  if (sameTypeStreak >= 3) {
    const rare = varieties.find(v => v.rarity === 'rare')
    if (rare) return rare
  }
  if (sameTypeStreak >= 2) {
    const uncommon = varieties.find(v => v.rarity === 'uncommon')
    if (uncommon) return uncommon
  }

  return varieties[0] // 默认 common
}

/** 获取指定情绪类型的所有品种 */
export function getVarietiesByEmotion(type: EmotionType): FlowerVariety[] {
  return FLOWER_VARIETIES.filter(v => v.emotionType === type)
}

/** 获取品种的生长阶段花卉大小 */
export function getVarietySize(variety: FlowerVariety, growthProgress: number): number {
  const [min, max] = variety.sizeRange
  return min + (max - min) * Math.min(1, growthProgress)
}

// ---- 花房自适应环境变化 ----

export interface AdaptiveEnvironment {
  /** 光线条件 */
  lighting: 'bright' | 'normal' | 'dim' | 'warm_dim'
  /** 天空色调 */
  skyTone: string
  /** 环境光颜色 */
  ambientColor: string
  /** 粒子效果 */
  particles: 'none' | 'sparkle' | 'butterfly' | 'petal' | 'firefly' | 'rain' | 'mist'
  /** 音景描述 */
  soundscape: string
  /** 特殊氛围效果 */
  atmosphereEffect: string
}

/** 分析近期情绪记录，计算自适应环境 */
export function computeAdaptiveEnvironment(records: EmotionRecord[], days: number = 7): AdaptiveEnvironment {
  if (records.length === 0) {
    return {
      lighting: 'normal',
      skyTone: '#d4e4f0',
      ambientColor: 'rgba(200, 220, 240, 0.3)',
      particles: 'none',
      soundscape: '微风轻拂',
      atmosphereEffect: '花房空荡，等待播种',
    }
  }

  const cutoff = Date.now() - days * 86400000
  const recent = records.filter(r => new Date(r.createdAt).getTime() >= cutoff)

  if (recent.length === 0) {
    return {
      lighting: 'dim',
      skyTone: '#c8d8e8',
      ambientColor: 'rgba(180, 200, 220, 0.2)',
      particles: 'none',
      soundscape: '安静',
      atmosphereEffect: '花朵在沉睡',
    }
  }

  // 统计情绪分布
  const counts: Record<string, number> = {}
  for (const r of recent) {
    counts[r.type] = (counts[r.type] || 0) + 1
  }

  const total = recent.length
  const happyRatio = (counts['happy'] || 0) / total
  const sadRatio = (counts['sad'] || 0) / total
  const anxiousRatio = (counts['anxious'] || 0) / total
  const angryRatio = (counts['angry'] || 0) / total
  const calmRatio = (counts['calm'] || 0) / total

  // 检测连续同情绪天数
  const streak = getLongestStreak(recent)

  // 自适应规则

  // 连续低落 ≥ 3天 → 光线变暖变暗 + 舒缓氛围 + 花苞保护
  if (sadRatio >= 0.5 && streak.type === 'sad' && streak.days >= 3) {
    return {
      lighting: 'warm_dim',
      skyTone: '#b8a8c8',
      ambientColor: 'rgba(200, 180, 220, 0.35)',
      particles: 'mist',
      soundscape: '柔和的雨声，舒缓的低语',
      atmosphereEffect: '暖黄光线温柔包裹花房，未开放的花苞被轻轻保护，空气中弥漫薰衣草香',
    }
  }

  // 连续焦虑 ≥ 3天 → 光线变暗+藤蔓蔓延
  if (anxiousRatio >= 0.5 && streak.type === 'anxious' && streak.days >= 3) {
    return {
      lighting: 'dim',
      skyTone: '#604050',
      ambientColor: 'rgba(120, 60, 80, 0.25)',
      particles: 'firefly',
      soundscape: '低沉的嗡鸣，偶尔的静默',
      atmosphereEffect: '暗红藤蔓在角落蔓延，萤火虫在暗处闪烁，提醒你放慢呼吸',
    }
  }

  // 连续开心 ≥ 3天 → 明亮 + 蝴蝶光点
  if (happyRatio >= 0.5 && streak.type === 'happy' && streak.days >= 3) {
    return {
      lighting: 'bright',
      skyTone: '#f0e8c0',
      ambientColor: 'rgba(255, 240, 200, 0.4)',
      particles: 'butterfly',
      soundscape: '清脆鸟鸣，微风铃响',
      atmosphereEffect: '阳光透过穹顶洒落，金色蝴蝶光点在花丛间翩翩起舞',
    }
  }

  // 连续平静 ≥ 3天 → 柔光 + 花瓣飘落
  if (calmRatio >= 0.5 && streak.type === 'calm' && streak.days >= 3) {
    return {
      lighting: 'normal',
      skyTone: '#d0e0f0',
      ambientColor: 'rgba(200, 220, 240, 0.35)',
      particles: 'petal',
      soundscape: '舒缓的钢琴曲，流水潺潺',
      atmosphereEffect: '淡蓝花瓣轻轻飘落，睡莲在池中静静绽放',
    }
  }

  // 愤怒主导 → 风暴前的压抑
  if (angryRatio >= 0.4) {
    return {
      lighting: 'dim',
      skyTone: '#706050',
      ambientColor: 'rgba(160, 100, 60, 0.2)',
      particles: 'rain',
      soundscape: '远处雷声，大雨将至',
      atmosphereEffect: '天空暗沉，花朵低垂，风暴正在积聚',
    }
  }

  // 混合情绪 → 默认正常
  return {
    lighting: 'normal',
    skyTone: '#d4e4f0',
    ambientColor: 'rgba(200, 220, 240, 0.3)',
    particles: happyRatio > 0.3 ? 'sparkle' : 'none',
    soundscape: '微风轻拂',
    atmosphereEffect: '各色花朵和谐共生，花房生机盎然',
  }
}

// ---- 情绪连续检测 ----

interface EmotionStreak {
  type: EmotionType | null
  days: number
}

/** 获取最近的连续同情绪天数 */
function getLongestStreak(records: EmotionRecord[]): EmotionStreak {
  if (records.length === 0) return { type: null, days: 0 }

  const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  let maxStreak = 1
  let currentStreak = 1
  let maxType = sorted[0].type
  let currentType = sorted[0].type

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].type === currentType) {
      currentStreak++
    } else {
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
        maxType = currentType
      }
      currentType = sorted[i].type
      currentStreak = 1
    }
  }

  if (currentStreak > maxStreak) {
    maxStreak = currentStreak
    maxType = currentType
  }

  return { type: maxType, days: maxStreak }
}

// ---- 花房收藏图鉴 ----

export interface FlowerCollection {
  /** 已解锁的品种 */
  unlocked: string[]
  /** 总品种数 */
  total: number
  /** 收藏完成度 */
  completionRate: number
  /** 每种情绪类型的收藏进度 */
  byEmotion: { type: EmotionType; unlocked: number; total: number }[]
}

/** 计算花房收藏图鉴 */
export function computeCollection(unlockedVarietyIds: string[]): FlowerCollection {
  const unlocked = new Set(unlockedVarietyIds)
  const total = FLOWER_VARIETIES.length

  const byEmotion: FlowerCollection['byEmotion'] = []
  const emotionTypes: EmotionType[] = ['happy', 'calm', 'sad', 'anxious', 'angry']

  for (const type of emotionTypes) {
    const varieties = getVarietiesByEmotion(type)
    const unlockedCount = varieties.filter(v => unlocked.has(v.id)).length
    byEmotion.push({ type, unlocked: unlockedCount, total: varieties.length })
  }

  return {
    unlocked: unlockedVarietyIds,
    total,
    completionRate: total > 0 ? Math.round((unlocked.size / total) * 100) : 0,
    byEmotion,
  }
}