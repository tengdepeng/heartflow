// ============================================================
// 留光阁 · 冥想引导与释怀仪式
// 冥想引导脚本 + 释怀仪式流程 + 澄明统计仪表盘
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { MeditationType, MeditationRecord, ReleaseEntry, ClarityLevel, LightState } from './types'

// ---- 类型定义 ----

/** 冥想引导脚本 */
export interface GuidedMeditation {
  id: string
  title: string
  type: MeditationType
  /** 总时长（分钟） */
  duration: number
  /** 引导步骤 */
  steps: MeditationStep[]
  /** 难度 */
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  /** 背景音建议 */
  backgroundSound?: string
  /** 标签 */
  tags: string[]
}

/** 冥想步骤 */
export interface MeditationStep {
  /** 步骤序号 */
  order: number
  /** 引导语 */
  instruction: string
  /** 持续时间（秒） */
  durationSeconds: number
  /** 步骤类型 */
  phase: 'settle' | 'focus' | 'deepen' | 'return' | 'reflect'
}

/** 释怀仪式 */
export interface ReleaseRitual {
  id: string
  name: string
  method: 'write' | 'burn' | 'float' | 'bury' | 'transform'
  /** 仪式步骤 */
  steps: string[]
  /** 准备事项 */
  preparations: string[]
  /** 适用场景 */
  scenarios: string[]
  /** 预计时长（分钟） */
  duration: number
}

/** 澄明统计 */
export interface ClarityStats {
  /** 当前澄明度 */
  currentClarity: ClarityLevel
  /** 澄明趋势（最近 30 天） */
  clarityTrend: { date: string; level: ClarityLevel; score: number }[]
  /** 冥想总时长 */
  totalMeditationMinutes: number
  /** 冥想总次数 */
  totalMeditations: number
  /** 本月冥想次数 */
  monthlyMeditations: number
  /** 连续冥想天数 */
  streak: number
  /** 最长连续天数 */
  bestStreak: number
  /** 释怀完成率 */
  releaseCompletionRate: number
  /** 冥想类型分布 */
  meditationTypeDistribution: { type: MeditationType; count: number; minutes: number }[]
  /** 光照强度趋势 */
  lightIntensityTrend: { date: string; intensity: number }[]
  /** 最佳冥想时段 */
  bestTimeOfDay: string
  /** 推荐冥想类型 */
  recommendedType: MeditationType
}

// ---- 元数据 ----

export const MEDITATION_DIFFICULTY_META: Record<string, { label: string; icon: string }> = {
  beginner: { label: '初学者', icon: '🌱' },
  intermediate: { label: '进阶', icon: '🌿' },
  advanced: { label: '深入', icon: '🌳' },
}

export const STEP_PHASE_META: Record<string, { label: string; icon: string }> = {
  settle: { label: '安顿', icon: '🧎' },
  focus: { label: '专注', icon: '🎯' },
  deepen: { label: '深入', icon: '🔽' },
  return: { label: '回归', icon: '🔼' },
  reflect: { label: '回响', icon: '💭' },
}

// ---- 预设引导脚本 ----

const PRESET_GUIDED_MEDITATIONS: GuidedMeditation[] = [
  {
    id: 'guided_breath_5',
    title: '五分钟呼吸安顿',
    type: 'breath',
    duration: 5,
    difficulty: 'beginner',
    steps: [
      { order: 1, instruction: '找一个舒适的坐姿，轻轻闭上眼睛', durationSeconds: 30, phase: 'settle' },
      { order: 2, instruction: '将注意力带到呼吸上，感受空气进入鼻腔的清凉', durationSeconds: 60, phase: 'focus' },
      { order: 3, instruction: '跟随呼吸的节奏，吸气时默数1-2-3，呼气时默数1-2-3-4', durationSeconds: 120, phase: 'deepen' },
      { order: 4, instruction: '如果思绪飘走，温柔地将它带回呼吸', durationSeconds: 60, phase: 'deepen' },
      { order: 5, instruction: '慢慢将注意力扩展到全身，感受这一刻的宁静', durationSeconds: 30, phase: 'return' },
    ],
    tags: ['入门', '呼吸', '短时'],
  },
  {
    id: 'guided_body_scan_10',
    title: '十分钟身体扫描',
    type: 'body_scan',
    duration: 10,
    difficulty: 'beginner',
    steps: [
      { order: 1, instruction: '平躺或舒适地坐着，让身体完全放松', durationSeconds: 60, phase: 'settle' },
      { order: 2, instruction: '将注意力带到头顶，感受头皮的温度和触感', durationSeconds: 60, phase: 'focus' },
      { order: 3, instruction: '缓缓向下扫描：额头→眼睛→脸颊→下巴', durationSeconds: 120, phase: 'deepen' },
      { order: 4, instruction: '继续向下：颈部→肩膀→手臂→手掌→指尖', durationSeconds: 120, phase: 'deepen' },
      { order: 5, instruction: '躯干：胸部→腹部→背部→腰部', durationSeconds: 120, phase: 'deepen' },
      { order: 6, instruction: '下肢：臀部→大腿→膝盖→小腿→脚踝→脚掌→脚趾', durationSeconds: 120, phase: 'deepen' },
      { order: 7, instruction: '将身体作为一个整体来感受，觉察呼吸在全身的流动', durationSeconds: 60, phase: 'return' },
    ],
    tags: ['入门', '身体', '放松'],
  },
  {
    id: 'guided_loving_15',
    title: '十五分钟慈心冥想',
    type: 'loving_kindness',
    duration: 15,
    difficulty: 'intermediate',
    steps: [
      { order: 1, instruction: '安坐，深呼吸三次，让心沉静下来', durationSeconds: 60, phase: 'settle' },
      { order: 2, instruction: '将手轻轻放在心口，感受心跳的温暖', durationSeconds: 60, phase: 'focus' },
      { order: 3, instruction: '在心中默念：愿我平安，愿我健康，愿我快乐，愿我自在', durationSeconds: 180, phase: 'deepen' },
      { order: 4, instruction: '想象一位你爱的人，将同样的祝福送给他/她', durationSeconds: 180, phase: 'deepen' },
      { order: 5, instruction: '想象一位你感到中立的人，将祝福扩展到他/她', durationSeconds: 180, phase: 'deepen' },
      { order: 6, instruction: '想象一位与你有矛盾的人，尝试送出善意', durationSeconds: 180, phase: 'deepen' },
      { order: 7, instruction: '将慈心扩展到所有生命：愿一切众生平安喜乐', durationSeconds: 120, phase: 'return' },
      { order: 8, instruction: '缓缓回到当下，感受心中升起的温暖', durationSeconds: 60, phase: 'reflect' },
    ],
    tags: ['进阶', '慈心', '善意'],
  },
  {
    id: 'guided_silent_20',
    title: '二十分钟静坐',
    type: 'silent',
    duration: 20,
    difficulty: 'intermediate',
    steps: [
      { order: 1, instruction: '调整坐姿，脊柱挺直但不僵硬', durationSeconds: 120, phase: 'settle' },
      { order: 2, instruction: '将注意力锚定在呼吸上，感受每次呼吸的完整过程', durationSeconds: 300, phase: 'focus' },
      { order: 3, instruction: '保持对呼吸的觉察，让思绪如云朵般飘过，不追逐不排斥', durationSeconds: 600, phase: 'deepen' },
      { order: 4, instruction: '慢慢加深觉察，感受身体与呼吸的融合', durationSeconds: 120, phase: 'return' },
      { order: 5, instruction: '轻轻活动手指和脚趾，缓缓睁开眼睛', durationSeconds: 60, phase: 'reflect' },
    ],
    tags: ['进阶', '静坐', '觉察'],
  },
  {
    id: 'guided_visualization_sunset',
    title: '落日观想',
    type: 'visualization',
    duration: 10,
    difficulty: 'beginner',
    steps: [
      { order: 1, instruction: '闭上眼睛，想象自己站在一片开阔的海边', durationSeconds: 60, phase: 'settle' },
      { order: 2, instruction: '天边是温暖的橙红色落日，海面被染成金色', durationSeconds: 120, phase: 'focus' },
      { order: 3, instruction: '随着太阳缓缓下沉，感受一天的疲惫也随之沉入海平线', durationSeconds: 180, phase: 'deepen' },
      { order: 4, instruction: '天空渐渐变成深蓝紫色，星星开始闪烁', durationSeconds: 120, phase: 'deepen' },
      { order: 5, instruction: '感受夜晚的宁静包围着你，内心充满平和', durationSeconds: 120, phase: 'return' },
    ],
    tags: ['入门', '观想', '放松'],
  },
  {
    id: 'guided_mantra_peace',
    title: '平和持咒',
    type: 'mantra',
    duration: 10,
    difficulty: 'intermediate',
    steps: [
      { order: 1, instruction: '安坐，双手自然放在膝盖上', durationSeconds: 60, phase: 'settle' },
      { order: 2, instruction: '选择一句对你有意义的短句，如"平静"、"安好"、"let go"', durationSeconds: 60, phase: 'focus' },
      { order: 3, instruction: '在每一次呼气时，在心中默念这句短句', durationSeconds: 300, phase: 'deepen' },
      { order: 4, instruction: '让这句话成为你内心的锚，每一次默念都是一次回归', durationSeconds: 120, phase: 'deepen' },
      { order: 5, instruction: '慢慢停止默念，感受内心的宁静余韵', durationSeconds: 60, phase: 'return' },
    ],
    tags: ['进阶', '持咒', '专注'],
  },
]

// ---- 预设释怀仪式 ----

const PRESET_RELEASE_RITUALS: ReleaseRitual[] = [
  {
    id: 'ritual_write_letter',
    name: '写一封不寄出的信',
    method: 'write',
    steps: [
      '准备一张纸和一支笔',
      '在心中默念你想要释怀的事或人',
      '开始写信，写下所有你想说但未曾说出口的话',
      '写完后，再读一遍，感受情绪流动',
      '将信轻轻折叠，放入一个信封中',
      '对信说："我释放你，我自由了"',
    ],
    preparations: ['纸', '笔', '信封', '安静的空间'],
    scenarios: ['未表达的情感', '遗憾', '愧疚', '未完成的告别'],
    duration: 20,
  },
  {
    id: 'ritual_burn_release',
    name: '焚化释怀仪式',
    method: 'burn',
    steps: [
      '将你想要释怀的事写在纸条上',
      '准备一个安全的容器（如金属盆）',
      '点燃蜡烛，静默片刻',
      '将纸条放入容器中，看着它燃烧',
      '在火焰中，想象负面情绪也随之化为灰烬',
      '轻轻吹散灰烬，说"我已释怀"',
    ],
    preparations: ['纸条', '安全容器', '蜡烛', '打火机', '通风环境'],
    scenarios: ['强烈的负面情绪', '愤怒', '怨恨', '想要彻底放下的过去'],
    duration: 15,
  },
  {
    id: 'ritual_float_leaf',
    name: '落叶漂流',
    method: 'float',
    steps: [
      '找一片落叶或花瓣',
      '将心事写在叶片上',
      '走到溪流或水池边',
      '将叶片轻轻放入水中',
      '看着它缓缓漂远，直到消失在视野中',
      '在心中说："随水流去，不再回来"',
    ],
    preparations: ['落叶或花瓣', '笔', '户外水源'],
    scenarios: ['日常烦恼', '轻微焦虑', '想要放下的小事'],
    duration: 10,
  },
  {
    id: 'ritual_transform_butterfly',
    name: '化蝶转化仪式',
    method: 'transform',
    steps: [
      '在纸上画一个茧',
      '在茧中写下你的困境或负面情绪',
      '在另一张纸上画一只蝴蝶',
      '在蝴蝶旁写下你希望转化成的积极状态',
      '将两张纸并排放置，感受从茧到蝶的转变',
      '保留蝴蝶图，将茧图折叠收起',
      '每天看一眼蝴蝶图，提醒自己正在蜕变',
    ],
    preparations: ['两张纸', '彩色笔', '安静的空间'],
    scenarios: ['长期困扰', '想改变的模式', '自我成长', '身份转变'],
    duration: 25,
  },
  {
    id: 'ritual_bury_seed',
    name: '种子掩埋',
    method: 'bury',
    steps: [
      '将心事写在可降解的纸上',
      '在花园或花盆中挖一个小坑',
      '将纸放入坑中，同时种下一颗种子',
      '盖上土，轻轻浇水',
      '对种子说："让旧的化作养分，滋养新的生长"',
      '在接下来的日子里，照料这株植物，见证转化',
    ],
    preparations: ['可降解纸', '种子', '花盆或花园', '水'],
    scenarios: ['失去', '结束', '新开始', '希望转化'],
    duration: 15,
  },
]

// ---- 存储键 ----

const GUIDED_KEY = 'hf:light:guided_meditations'
const RITUALS_KEY = 'hf:light:rituals'

// ---- 响应式状态 ----

const guidedMeditations = ref<GuidedMeditation[]>(loadGuidedMeditations())
const releaseRituals = ref<ReleaseRitual[]>(loadReleaseRituals())

function loadGuidedMeditations(): GuidedMeditation[] {
  try {
    const saved = storage.getKV<GuidedMeditation[]>(GUIDED_KEY, [])
    return [...PRESET_GUIDED_MEDITATIONS, ...saved]
  } catch { return [...PRESET_GUIDED_MEDITATIONS] }
}

function loadReleaseRituals(): ReleaseRitual[] {
  try {
    const saved = storage.getKV<ReleaseRitual[]>(RITUALS_KEY, [])
    return [...PRESET_RELEASE_RITUALS, ...saved]
  } catch { return [...PRESET_RELEASE_RITUALS] }
}

function persistGuided() { storage.setKV(GUIDED_KEY, guidedMeditations.value) }
function persistRituals() { storage.setKV(RITUALS_KEY, releaseRituals.value) }

// ---- 冥想引导 ----

/**
 * 冥想引导系统
 */
export function useGuidedMeditation() {
  /** 获取所有引导脚本 */
  function getGuidedMeditations(): GuidedMeditation[] {
    return guidedMeditations.value
  }

  /** 按类型筛选 */
  function getByType(type: MeditationType): GuidedMeditation[] {
    return guidedMeditations.value.filter(m => m.type === type)
  }

  /** 按难度筛选 */
  function getByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): GuidedMeditation[] {
    return guidedMeditations.value.filter(m => m.difficulty === difficulty)
  }

  /** 按标签搜索 */
  function searchByTag(tag: string): GuidedMeditation[] {
    return guidedMeditations.value.filter(m => m.tags.includes(tag))
  }

  /** 按时长范围筛选 */
  function getByDuration(minMinutes: number, maxMinutes: number): GuidedMeditation[] {
    return guidedMeditations.value.filter(m => m.duration >= minMinutes && m.duration <= maxMinutes)
  }

  /** 获取推荐引导 */
  function getRecommendations(meditationHistory: MeditationRecord[]): GuidedMeditation[] {
    // 基于历史记录推荐
    const typeCounts: Record<string, number> = {}
    for (const m of meditationHistory) {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1
    }
    const favoriteType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as MeditationType

    // 优先推荐最爱类型，其次是未尝试过的类型
    const favorites = guidedMeditations.value.filter(m => m.type === favoriteType)
    const newTypes = guidedMeditations.value.filter(m => m.type !== favoriteType && !typeCounts[m.type])

    return [...favorites, ...newTypes].slice(0, 5)
  }

  /** 创建自定义引导 */
  function createCustomMeditation(
    title: string,
    type: MeditationType,
    duration: number,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    steps: MeditationStep[],
    tags: string[] = [],
  ): GuidedMeditation {
    const meditation: GuidedMeditation = {
      id: `guided_custom_${Date.now()}`,
      title,
      type,
      duration,
      difficulty,
      steps,
      tags,
    }
    guidedMeditations.value.push(meditation)
    persistGuided()
    return meditation
  }

  return {
    guidedMeditations: computed(() => guidedMeditations.value),
    getGuidedMeditations,
    getByType,
    getByDifficulty,
    searchByTag,
    getByDuration,
    getRecommendations,
    createCustomMeditation,
  }
}

// ---- 释怀仪式 ----

/**
 * 释怀仪式系统
 */
export function useReleaseRituals() {
  /** 获取所有仪式 */
  function getRituals(): ReleaseRitual[] {
    return releaseRituals.value
  }

  /** 按释怀方式筛选 */
  function getByMethod(method: 'write' | 'burn' | 'float' | 'bury' | 'transform'): ReleaseRitual[] {
    return releaseRituals.value.filter(r => r.method === method)
  }

  /** 按场景推荐仪式 */
  function recommendForScenario(scenario: string): ReleaseRitual[] {
    return releaseRituals.value
      .filter(r => r.scenarios.some(s => s.includes(scenario) || scenario.includes(s)))
      .sort((a, b) => a.duration - b.duration)
  }

  /** 获取仪式详情 */
  function getRitual(id: string): ReleaseRitual | undefined {
    return releaseRituals.value.find(r => r.id === id)
  }

  /** 创建自定义仪式 */
  function createCustomRitual(
    name: string,
    method: 'write' | 'burn' | 'float' | 'bury' | 'transform',
    steps: string[],
    preparations: string[],
    scenarios: string[],
    duration: number,
  ): ReleaseRitual {
    const ritual: ReleaseRitual = {
      id: `ritual_custom_${Date.now()}`,
      name,
      method,
      steps,
      preparations,
      scenarios,
      duration,
    }
    releaseRituals.value.push(ritual)
    persistRituals()
    return ritual
  }

  return {
    rituals: computed(() => releaseRituals.value),
    getRituals,
    getByMethod,
    recommendForScenario,
    getRitual,
    createCustomRitual,
  }
}

// ---- 澄明统计仪表盘 ----

/**
 * 澄明统计仪表盘
 */
export function useClarityDashboard() {
  /** 计算澄明统计 */
  function computeClarityStats(
    meditations: MeditationRecord[],
    releases: ReleaseEntry[],
    state: LightState,
  ): ClarityStats {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 澄明趋势（最近 30 天）
    const clarityTrend = generateClarityTrend(meditations, thirtyDaysAgo)

    // 冥想统计
    const totalMeditations = meditations.length
    const totalMeditationMinutes = meditations.reduce((sum, m) => sum + m.duration, 0)
    const monthlyMeditations = meditations.filter(m => {
      const d = new Date(m.timestamp)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    // 冥想类型分布
    const typeDist: Record<string, { count: number; minutes: number }> = {}
    for (const m of meditations) {
      if (!typeDist[m.type]) typeDist[m.type] = { count: 0, minutes: 0 }
      typeDist[m.type].count++
      typeDist[m.type].minutes += m.duration
    }
    const meditationTypeDistribution = Object.entries(typeDist).map(([type, data]) => ({
      type: type as MeditationType,
      ...data,
    }))

    // 释怀完成率
    const releaseCompletionRate = releases.length > 0
      ? Math.round((releases.filter(r => r.released).length / releases.length) * 100)
      : 0

    // 光照强度趋势
    const lightIntensityTrend = generateLightTrend(meditations, thirtyDaysAgo)

    // 最佳冥想时段
    const bestTimeOfDay = findBestTimeOfDay(meditations)

    // 推荐冥想类型
    const recommendedType = recommendMeditationType(meditationTypeDistribution)

    return {
      currentClarity: state.clarity,
      clarityTrend,
      totalMeditationMinutes,
      totalMeditations,
      monthlyMeditations,
      streak: state.meditationStreak,
      bestStreak: calculateBestStreak(meditations),
      releaseCompletionRate,
      meditationTypeDistribution,
      lightIntensityTrend,
      bestTimeOfDay,
      recommendedType,
    }
  }

  return {
    computeClarityStats,
  }
}

// ---- 辅助函数 ----

function generateClarityTrend(
  meditations: MeditationRecord[],
  since: Date,
): { date: string; level: ClarityLevel; score: number }[] {
  const trend: { date: string; level: ClarityLevel; score: number }[] = []
  const dailyScores: Record<string, number> = {}

  for (const m of meditations) {
    const date = getLocalDateKey(new Date(m.timestamp))
    const d = new Date(m.timestamp)
    if (d < since) continue
    // 每次冥想根据时长和质量加分
    let score = m.duration * 2
    if (m.insight) score += 10
    if (m.stateAfter === 'calm' || m.stateAfter === 'peaceful') score += 5
    dailyScores[date] = (dailyScores[date] || 0) + score
  }

  // 填充所有日期
  const now = new Date()
  for (let d = 29; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
    const dateStr = getLocalDateKey(date)
    const score = dailyScores[dateStr] || 0

    let level: ClarityLevel = 'clouded'
    if (score >= 80) level = 'crystal'
    else if (score >= 50) level = 'clear'
    else if (score >= 30) level = 'neutral'
    else if (score >= 10) level = 'unclear'

    trend.push({ date: dateStr, level, score })
  }

  return trend
}

function generateLightTrend(
  meditations: MeditationRecord[],
  since: Date,
): { date: string; intensity: number }[] {
  const dailyIntensity: Record<string, number> = {}

  for (const m of meditations) {
    const date = getLocalDateKey(new Date(m.timestamp))
    const d = new Date(m.timestamp)
    if (d < since) continue
    dailyIntensity[date] = (dailyIntensity[date] || 0) + m.duration
  }

  const now = new Date()
  const trend: { date: string; intensity: number }[] = []
  for (let d = 29; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
    const dateStr = getLocalDateKey(date)
    trend.push({
      date: dateStr,
      intensity: Math.min(100, (dailyIntensity[dateStr] || 0) * 2),
    })
  }

  return trend
}

function findBestTimeOfDay(meditations: MeditationRecord[]): string {
  const hourCounts: Record<number, number> = {}
  for (const m of meditations) {
    const hour = new Date(m.timestamp).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  let bestHour = 7
  let maxCount = 0
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count > maxCount) {
      maxCount = count
      bestHour = parseInt(hour)
    }
  }

  if (bestHour < 6) return '凌晨'
  if (bestHour < 9) return '清晨'
  if (bestHour < 12) return '上午'
  if (bestHour < 14) return '午后'
  if (bestHour < 18) return '下午'
  if (bestHour < 21) return '傍晚'
  return '夜晚'
}

function recommendMeditationType(
  typeDistribution: { type: MeditationType; count: number; minutes: number }[],
): MeditationType {
  // 推荐尝试最少的类型
  const allTypes: MeditationType[] = ['breath', 'body_scan', 'loving_kindness', 'walking', 'guided', 'silent', 'visualization', 'mantra']
  const triedTypes = new Set(typeDistribution.map(d => d.type))
  const untried = allTypes.filter(t => !triedTypes.has(t))
  if (untried.length > 0) return untried[0]

  // 如果都尝试过，推荐最少的
  const sorted = [...typeDistribution].sort((a, b) => a.count - b.count)
  return sorted[0]?.type || 'breath'
}

function calculateBestStreak(meditations: MeditationRecord[]): number {
  if (meditations.length === 0) return 0

  const dates = [...new Set(meditations.map(m => getLocalDateKey(new Date(m.timestamp))))].sort()
  let bestStreak = 0
  let currentStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)

    if (diffDays === 1) {
      currentStreak++
    } else {
      bestStreak = Math.max(bestStreak, currentStreak)
      currentStreak = 1
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak)
  return bestStreak
}

// ---- 存储键 ----

export const LIGHT_ADVANCED_STORAGE_KEYS = {
  GUIDED_MEDITATIONS: GUIDED_KEY,
  RITUALS: RITUALS_KEY,
} as const