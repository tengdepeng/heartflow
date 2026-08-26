// ============================================================
// 工痕 · 伤痕故事叙事 + 社区支持
// 增强功能：
//   1. 伤痕故事叙事（将伤痕转化为个人叙事）
//   2. 社区支持（匿名分享+共鸣回应）
//   3. 伤痕地图（身体部位可视化+热力图）
//   4. 锻造仪式（定期回顾+转化仪式）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { BodyMark, BodyPart } from './types'

// ---- 伤痕故事 ----

/** 故事章节 */
export interface StoryChapter {
  /** 章节序号 */
  order: number
  /** 章节标题 */
  title: string
  /** 章节内容 */
  content: string
  /** 关联伤痕 ID */
  scarId: string
  /** 情绪基调 */
  emotion: 'pain' | 'struggle' | 'acceptance' | 'growth' | 'peace'
  /** 写作时间 */
  writtenAt: string
}

/** 伤痕故事 */
export interface ScarStory {
  id: string
  /** 关联的伤痕 ID 列表 */
  scarIds: string[]
  /** 故事标题 */
  title: string
  /** 故事摘要 */
  summary: string
  /** 故事章节 */
  chapters: StoryChapter[]
  /** 整体情绪弧线 */
  emotionArc: ('pain' | 'struggle' | 'acceptance' | 'growth' | 'peace')[]
  /** 是否已完成 */
  completed: boolean
  /** 创建时间 */
  createdAt: string
  /** 最后更新时间 */
  updatedAt: string
  /** 阅读次数 */
  readCount: number
  /** 标签 */
  tags: string[]
}

// ---- 社区支持 ----

/** 社区分享 */
export interface CommunityShare {
  id: string
  /** 关联故事 ID */
  storyId: string
  /** 匿名分享者名称 */
  anonymousName: string
  /** 分享标题 */
  title: string
  /** 分享摘要 */
  excerpt: string
  /** 共鸣计数 */
  resonanceCount: number
  /** 回应列表 */
  responses: CommunityResponse[]
  /** 分享时间 */
  sharedAt: string
  /** 是否匿名 */
  isAnonymous: boolean
}

/** 社区回应 */
export interface CommunityResponse {
  id: string
  /** 回应者匿名名称 */
  anonymousName: string
  /** 回应内容 */
  content: string
  /** 回应类型 */
  type: 'support' | 'shared-experience' | 'encouragement' | 'gratitude'
  /** 回应时间 */
  respondedAt: string
}

// ---- 伤痕地图 ----

/** 身体部位热力数据 */
export interface BodyHeatData {
  bodyPart: BodyPart
  /** 伤痕数量 */
  scarCount: number
  /** 平均严重度 */
  avgSeverity: number
  /** 平均愈合进度 */
  avgHealingProgress: number
  /** 热力值 0-100 */
  heatValue: number
}

/** 伤痕地图 */
export interface ScarMap {
  /** 各部位热力数据 */
  heatData: BodyHeatData[]
  /** 总伤痕数 */
  totalScars: number
  /** 整体愈合率 */
  overallHealingRate: number
  /** 最严重部位 */
  mostSeverePart: BodyPart | null
  /** 生成时间 */
  generatedAt: string
}

// ---- 锻造仪式 ----

/** 仪式类型 */
export type RitualType = 'monthly-review' | 'milestone' | 'transformation' | 'closure'

/** 锻造仪式 */
export interface ForgingRitual {
  id: string
  type: RitualType
  /** 仪式名称 */
  name: string
  /** 关联伤痕 ID 列表 */
  scarIds: string[]
  /** 仪式步骤 */
  steps: string[]
  /** 仪式感言 */
  reflection: string
  /** 仪式后的收获 */
  harvest: string
  /** 仪式时间 */
  performedAt: string
  /** 是否完成 */
  completed: boolean
}

// ---- 存储键 ----

const SCAR_ADVANCED_STORAGE_KEYS = {
  STORIES: 'hf:scar:stories',
  SHARES: 'hf:scar:shares',
  RITUALS: 'hf:scar:rituals',
} as const

// ---- 情绪元数据 ----

export const EMOTION_META: Record<StoryChapter['emotion'], { label: string; color: string; icon: string }> = {
  pain: { label: '疼痛', color: '#ef4444', icon: '💔' },
  struggle: { label: '挣扎', color: '#f59e0b', icon: '🌪️' },
  acceptance: { label: '接纳', color: '#6b9fc4', icon: '🤲' },
  growth: { label: '成长', color: '#34d399', icon: '🌱' },
  peace: { label: '平和', color: '#b5707a', icon: '🕊️' },
}

export const RITUAL_TYPE_META: Record<RitualType, { label: string; icon: string; description: string }> = {
  'monthly-review': { label: '月度回顾', icon: '📅', description: '每月回顾伤痕的愈合进展' },
  milestone: { label: '里程碑', icon: '🏔️', description: '庆祝愈合的里程碑时刻' },
  transformation: { label: '转化仪式', icon: '🦋', description: '将伤痕正式转化为成长印记' },
  closure: { label: '告别仪式', icon: '🕯️', description: '与过去的伤痛正式告别' },
}

// ============================================================
// useScarStories — 伤痕故事叙事
// ============================================================

export function useScarStories() {
  const stories = ref<ScarStory[]>([])

  /** 加载所有故事 */
  function loadStories(): ScarStory[] {
    const stored = storage.getKV<ScarStory[]>(SCAR_ADVANCED_STORAGE_KEYS.STORIES, [])
    if (stored) stories.value = stored
    return stories.value
  }

  /** 创建新故事 */
  function createStory(
    scarIds: string[],
    title: string,
    summary: string,
    tags: string[] = [],
  ): ScarStory {
    const story: ScarStory = {
      id: `story-${Date.now()}`,
      scarIds,
      title,
      summary,
      chapters: [],
      emotionArc: [],
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readCount: 0,
      tags,
    }

    stories.value.push(story)
    saveStories()
    return story
  }

  /** 添加章节 */
  function addChapter(
    storyId: string,
    title: string,
    content: string,
    scarId: string,
    emotion: StoryChapter['emotion'],
  ): StoryChapter | null {
    const story = stories.value.find(s => s.id === storyId)
    if (!story) return null

    const chapter: StoryChapter = {
      order: story.chapters.length + 1,
      title,
      content,
      scarId,
      emotion,
      writtenAt: new Date().toISOString(),
    }

    story.chapters.push(chapter)
    story.emotionArc.push(emotion)
    story.updatedAt = new Date().toISOString()
    saveStories()
    return chapter
  }

  /** 完成故事 */
  function completeStory(storyId: string): boolean {
    const story = stories.value.find(s => s.id === storyId)
    if (!story) return false
    story.completed = true
    story.updatedAt = new Date().toISOString()
    saveStories()
    return true
  }

  /** 获取故事的完整情绪弧线描述 */
  function getEmotionArcDescription(story: ScarStory): string {
    if (story.emotionArc.length === 0) return '尚未开始书写'

    const start = story.emotionArc[0]
    const end = story.emotionArc[story.emotionArc.length - 1]

    if (start === end) return `维持在 ${EMOTION_META[start].label} 状态`
    return `从 ${EMOTION_META[start].label} 走向 ${EMOTION_META[end].label}`
  }

  /** 根据伤痕生成故事概要 */
  function generateStorySummary(marks: BodyMark[], scarId: string): string {
    const mark = marks.find(m => m.id === scarId)
    if (!mark) return ''

    const stage = mark.healingStage === 'acute' ? '刚刚经历'
      : mark.healingStage === 'proliferation' ? '正在愈合'
      : mark.healingStage === 'remodeling' ? '逐渐重塑'
      : '已经成熟'

    return `${stage}的${mark.description}，目前愈合进度 ${mark.healingProgress}%`
  }

  /** 获取故事统计 */
  const storyStats = computed(() => {
    return {
      total: stories.value.length,
      completed: stories.value.filter(s => s.completed).length,
      inProgress: stories.value.filter(s => !s.completed).length,
      totalChapters: stories.value.reduce((sum, s) => sum + s.chapters.length, 0),
      totalReads: stories.value.reduce((sum, s) => sum + s.readCount, 0),
    }
  })

  /** 保存故事 */
  function saveStories(): void {
    storage.setKV(SCAR_ADVANCED_STORAGE_KEYS.STORIES, stories.value)
  }

  return {
    stories,
    storyStats,
    loadStories,
    createStory,
    addChapter,
    completeStory,
    getEmotionArcDescription,
    generateStorySummary,
    saveStories,
  }
}

// ============================================================
// useCommunitySupport — 社区支持
// ============================================================

export function useCommunitySupport() {
  const shares = ref<CommunityShare[]>([])

  /** 加载分享 */
  function loadShares(): CommunityShare[] {
    const stored = storage.getKV<CommunityShare[]>(SCAR_ADVANCED_STORAGE_KEYS.SHARES, [])
    if (stored) shares.value = stored
    return shares.value
  }

  /** 创建匿名分享 */
  function createShare(
    storyId: string,
    title: string,
    excerpt: string,
    anonymousName: string,
    isAnonymous: boolean = true,
  ): CommunityShare {
    const share: CommunityShare = {
      id: `share-${Date.now()}`,
      storyId,
      anonymousName,
      title,
      excerpt,
      resonanceCount: 0,
      responses: [],
      sharedAt: new Date().toISOString(),
      isAnonymous,
    }

    shares.value.push(share)
    saveShares()
    return share
  }

  /** 添加共鸣 */
  function addResonance(shareId: string): boolean {
    const share = shares.value.find(s => s.id === shareId)
    if (!share) return false
    share.resonanceCount++
    saveShares()
    return true
  }

  /** 添加回应 */
  function addResponse(
    shareId: string,
    content: string,
    type: CommunityResponse['type'],
    anonymousName: string,
  ): CommunityResponse | null {
    const share = shares.value.find(s => s.id === shareId)
    if (!share) return null

    const response: CommunityResponse = {
      id: `resp-${Date.now()}`,
      anonymousName,
      content,
      type,
      respondedAt: new Date().toISOString(),
    }

    share.responses.push(response)
    saveShares()
    return response
  }

  /** 获取热门分享 */
  const popularShares = computed(() =>
    [...shares.value].sort((a, b) => b.resonanceCount - a.resonanceCount).slice(0, 10)
  )

  /** 获取最新分享 */
  const recentShares = computed(() =>
    [...shares.value]
      .sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime())
      .slice(0, 20)
  )

  /** 保存分享 */
  function saveShares(): void {
    storage.setKV(SCAR_ADVANCED_STORAGE_KEYS.SHARES, shares.value)
  }

  return {
    shares,
    popularShares,
    recentShares,
    loadShares,
    createShare,
    addResonance,
    addResponse,
    saveShares,
  }
}

// ============================================================
// useScarMap — 伤痕地图
// ============================================================

export function useScarMap() {
  const scarMap = ref<ScarMap | null>(null)

  /** 生成伤痕地图 */
  function generateScarMap(marks: BodyMark[]): ScarMap {
    const bodyPartData = new Map<BodyPart, { count: number; severitySum: number; progressSum: number }>()

    for (const mark of marks) {
      const existing = bodyPartData.get(mark.bodyPart) || { count: 0, severitySum: 0, progressSum: 0 }
      existing.count++
      existing.severitySum += mark.severity
      existing.progressSum += mark.healingProgress
      bodyPartData.set(mark.bodyPart, existing)
    }

    const heatData: BodyHeatData[] = [...bodyPartData.entries()].map(([bodyPart, data]) => ({
      bodyPart,
      scarCount: data.count,
      avgSeverity: Math.round(data.severitySum / data.count * 10) / 10,
      avgHealingProgress: Math.round(data.progressSum / data.count),
      heatValue: Math.min(Math.round((data.count * 20 + data.severitySum * 10) / 3), 100),
    }))

    const totalScars = marks.length
    const overallHealingRate = totalScars > 0
      ? Math.round(marks.reduce((sum, m) => sum + m.healingProgress, 0) / totalScars)
      : 0

    const mostSeverePart = heatData.length > 0
      ? heatData.reduce((max, hd) => hd.avgSeverity > max.avgSeverity ? hd : max, heatData[0]).bodyPart
      : null

    scarMap.value = {
      heatData: heatData.sort((a, b) => b.heatValue - a.heatValue),
      totalScars,
      overallHealingRate,
      mostSeverePart,
      generatedAt: new Date().toISOString(),
    }

    return scarMap.value
  }

  return {
    scarMap,
    generateScarMap,
  }
}

// ============================================================
// useForgingRituals — 锻造仪式
// ============================================================

export function useForgingRituals() {
  const rituals = ref<ForgingRitual[]>([])

  /** 加载仪式 */
  function loadRituals(): ForgingRitual[] {
    const stored = storage.getKV<ForgingRitual[]>(SCAR_ADVANCED_STORAGE_KEYS.RITUALS, [])
    if (stored) rituals.value = stored
    return rituals.value
  }

  /** 创建仪式 */
  function createRitual(
    type: RitualType,
    scarIds: string[],
    name: string,
    steps: string[] = [],
  ): ForgingRitual {
    const ritual: ForgingRitual = {
      id: `ritual-${Date.now()}`,
      type,
      name,
      scarIds,
      steps,
      reflection: '',
      harvest: '',
      performedAt: new Date().toISOString(),
      completed: false,
    }

    rituals.value.push(ritual)
    saveRituals()
    return ritual
  }

  /** 完成仪式 */
  function completeRitual(ritualId: string, reflection: string, harvest: string): boolean {
    const ritual = rituals.value.find(r => r.id === ritualId)
    if (!ritual) return false
    ritual.completed = true
    ritual.reflection = reflection
    ritual.harvest = harvest
    saveRituals()
    return true
  }

  /** 生成预设仪式步骤 */
  function generatePresetSteps(type: RitualType, marks: BodyMark[]): string[] {
    const scarLabels = marks.map(m => m.description).join('、')

    switch (type) {
      case 'monthly-review':
        return [
          '回顾本月所有伤痕的愈合进展',
          '记录每个伤痕的当前状态和感受',
          '识别本月最显著的成长点',
          '写下对下个月的期望',
        ]
      case 'milestone':
        return [
          '回顾从伤痕发生到现在的完整历程',
          `列出所有伤痕：${scarLabels}`,
          '庆祝已经达到的愈合里程碑',
          '感谢自己一路的坚持',
        ]
      case 'transformation':
        return [
          '选择一个已经成熟的伤痕',
          '写下这个伤痕教会你的事',
          '将伤痕标记为"已转化"',
          '记录转化后的成长心得',
          '为自己举行一个小型庆祝仪式',
        ]
      case 'closure':
        return [
          '选择一段想告别的伤痛经历',
          '写下想对这段经历说的话',
          '写下想对自己说的话',
          '进行一次象征性的告别动作',
          '记录告别后的感受',
        ]
      default:
        return []
    }
  }

  /** 仪式统计 */
  const ritualStats = computed(() => {
    const byType = {
      'monthly-review': 0,
      milestone: 0,
      transformation: 0,
      closure: 0,
    }
    for (const r of rituals.value) {
      byType[r.type]++
    }
    return {
      total: rituals.value.length,
      completed: rituals.value.filter(r => r.completed).length,
      byType,
    }
  })

  /** 保存仪式 */
  function saveRituals(): void {
    storage.setKV(SCAR_ADVANCED_STORAGE_KEYS.RITUALS, rituals.value)
  }

  return {
    rituals,
    ritualStats,
    loadRituals,
    createRitual,
    completeRitual,
    generatePresetSteps,
    saveRituals,
  }
}