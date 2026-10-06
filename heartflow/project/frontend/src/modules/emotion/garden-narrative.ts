// ============================================================
// 情绪花房 · 花园叙事引擎（P15-4）
// 花语故事、成长日记、季节相册、花园分享、访客留言
// ============================================================

import { ref, computed } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import type { EmotionRecord, EmotionType } from './types'
import { EMOTION_FLOWERS } from './types'
import type { FlowerPosition, GardenEnvironment, FlowerCluster, GardenHealth } from './garden-environment'

// ============================================================
// 类型定义
// ============================================================

/** 花语故事 */
export interface FlowerStory {
  id: string
  /** 故事标题 */
  title: string
  /** 故事内容 */
  content: string
  /** 关联的情绪类型 */
  emotionType: EmotionType
  /** 关联的花朵 ID 列表 */
  flowerIds: string[]
  /** 故事发生日期 */
  date: string
  /** 故事标签 */
  tags: string[]
  /** 是否重要时刻 */
  isMilestone: boolean
  /** 故事配图（SVG 片段） */
  illustration?: string
}

/** 成长日记条目 */
export interface DiaryEntry {
  id: string
  /** 日期 */
  date: string
  /** 标题 */
  title: string
  /** 正文 */
  content: string
  /** 当日情绪统计 */
  emotionSummary: Record<EmotionType, number>
  /** 当日新增花朵数 */
  newFlowers: number
  /** 花园健康评分 */
  healthScore: number
  /** 天气心情 */
  mood: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'peaceful'
  /** 是否已编辑 */
  isEdited: boolean
  /** 私密标记 */
  isPrivate: boolean
}

/** 季节相册 */
export interface SeasonAlbum {
  id: string
  /** 季节名称 */
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  /** 年份 */
  year: number
  /** 起始日期 */
  startDate: string
  /** 结束日期 */
  endDate: string
  /** 花园状态快照 */
  snapshot: GardenSnapshot
  /** 季节故事 */
  story: string
  /** 封面花颜色 */
  coverColor: string
}

/** 花园状态快照 */
export interface GardenSnapshot {
  id: string
  /** 快照时间 */
  timestamp: string
  /** 花朵总数 */
  totalFlowers: number
  /** 各类型花朵数 */
  flowersByType: Record<EmotionType, number>
  /** 盛开花朵数 */
  bloomedCount: number
  /** 花园健康评分 */
  healthScore: number
  /** 花园覆盖率 */
  coverage: number
  /** 环境状态 */
  environment: GardenEnvironment
  /** 花丛列表 */
  clusters: FlowerCluster[]
  /** 代表性花朵位置（用于封面） */
  featuredFlowers: FlowerPosition[]
}

/** 花园分享配置 */
export interface ShareConfig {
  /** 分享标题 */
  title: string
  /** 分享描述 */
  description: string
  /** 是否包含情绪数据 */
  includeEmotions: boolean
  /** 是否包含日记 */
  includeDiary: boolean
  /** 是否包含花朵详情 */
  includeFlowerDetails: boolean
  /** 分享过期时间 (ms)，0 表示永不过期 */
  expiresIn: number
  /** 是否公开 */
  isPublic: boolean
}

/** 花园分享链接 */
export interface ShareLink {
  id: string
  /** 分享码 */
  code: string
  /** 配置 */
  config: ShareConfig
  /** 创建时间 */
  createdAt: string
  /** 过期时间 */
  expiresAt: string | null
  /** 访问次数 */
  viewCount: number
  /** 是否有效 */
  active: boolean
}

/** 访客留言 */
export interface VisitorMessage {
  id: string
  /** 访客昵称 */
  visitorName: string
  /** 留言内容 */
  content: string
  /** 留言时间 */
  createdAt: string
  /** 关联的分享链接 ID */
  shareId: string
  /** 花朵 emoji 反应 */
  reaction?: string
  /** 是否已读 */
  isRead: boolean
  /** 是否置顶 */
  isPinned: boolean
}

/** 花语模板 */
export interface FlowerLanguageTemplate {
  emotionType: EmotionType
  /** 花语含义 */
  meanings: string[]
  /** 故事模板 */
  storyTemplates: string[]
  /** 祝福语 */
  blessings: string[]
}

/** 叙事引擎配置 */
export interface NarrativeConfig {
  /** 最大故事数 */
  maxStories: number
  /** 日记自动生成间隔（天） */
  diaryInterval: number
  /** 季节相册自动生成 */
  autoSeasonAlbum: boolean
  /** 分享链接默认有效期（天） */
  defaultShareExpiry: number
  /** 访客留言最大字数 */
  maxMessageLength: number
}

// ============================================================
// 花语模板库
// ============================================================

export const FLOWER_LANGUAGES: Record<EmotionType, FlowerLanguageTemplate> = {
  happy: {
    emotionType: 'happy',
    meanings: ['喜悦的绽放', '阳光般的温暖', '生命的美好', '真挚的快乐', '感恩的心'],
    storyTemplates: [
      '那天，{note}……阳光洒在花瓣上，这朵花就这样盛开了。',
      '因为{note}的喜悦，花园里多了一抹金黄。',
      '快乐如同这朵花，不需要理由，只需要被看见。',
    ],
    blessings: ['愿你永远保持这份快乐', '让喜悦如花绽放', '美好值得被铭记'],
  },
  calm: {
    emotionType: 'calm',
    meanings: ['内心的宁静', '淡然的从容', '平和的接纳', '静谧的思考', '如水的心境'],
    storyTemplates: [
      '在{note}的时刻，心湖平静无波，这朵蓝色的花静静开放。',
      '平静不是没有波澜，而是{note}——懂得与自己和睦相处。',
      '这朵花记录了那个安静的午后，{note}。',
    ],
    blessings: ['愿你内心常驻宁静', '平和是最强大的力量', '在喧嚣中保持自己的节奏'],
  },
  sad: {
    emotionType: 'sad',
    meanings: ['温柔的忧伤', '深沉的思念', '成长必经的雨季', '需要被看见的脆弱', '雨后的彩虹'],
    storyTemplates: [
      '因为{note}，这朵紫色的小花低下了头。但雨总会停的。',
      '悲伤是心灵的雨季，{note}。每一滴雨都在浇灌成长。',
      '这朵花知道，{note}是可以被允许的。它在这里陪你。',
    ],
    blessings: ['悲伤是心灵的雨季，但雨后会天晴', '允许自己脆弱，也是一种勇气', '每一滴眼泪都在浇灌你的花园'],
  },
  anxious: {
    emotionType: 'anxious',
    meanings: ['紧绷的思绪', '不安的预感', '想要奔跑的心', '需要安抚的焦灼', '风暴前的宁静'],
    storyTemplates: [
      '当{note}让心跳加速，这朵红色的花在风中摇曳——但它的根扎得很深。',
      '焦虑是身体的预警，{note}。深呼吸，花还在。',
      '这朵花记录了那次{note}。回头看，那些风暴都已过去。',
    ],
    blessings: ['风暴终将过去，你比想象中更坚强', '深呼吸，此刻你是安全的', '把焦虑交给风，把平静留给自己'],
  },
  angry: {
    emotionType: 'angry',
    meanings: ['燃烧的边界', '需要被听见的声音', '不服输的倔强', '炽热的正义感', '蜕变前的火焰'],
    storyTemplates: [
      '当{note}点燃了愤怒，这朵橙色的花像火焰般绽放——它提醒你，你有权设立边界。',
      '愤怒是未被听见的呐喊，{note}。这朵花为你发声。',
      '这朵花炽热地开着，记录了那次{note}。火焰过后，是新生。',
    ],
    blessings: ['你的愤怒值得被看见', '边界让花园更美丽', '火焰过后，是更坚韧的自己'],
  },
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_NARRATIVE_CONFIG: NarrativeConfig = {
  maxStories: 50,
  diaryInterval: 1,
  autoSeasonAlbum: true,
  defaultShareExpiry: 30,
  maxMessageLength: 500,
}

export const DEFAULT_SHARE_CONFIG: ShareConfig = {
  title: '我的情绪花房',
  description: '来看看我的花园吧，每一朵花都是一个故事。',
  includeEmotions: false,
  includeDiary: false,
  includeFlowerDetails: true,
  expiresIn: 30 * 86400000,
  isPublic: false,
}

// ============================================================
// 工具函数
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatDate(date: Date): string {
  return getLocalDateKey(date)
}

function getSeason(date: Date): SeasonAlbum['season'] {
  const m = date.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

function getSeasonColor(season: SeasonAlbum['season']): string {
  switch (season) {
    case 'spring': return '#f0a0b0'
    case 'summer': return '#80c060'
    case 'autumn': return '#e8a040'
    case 'winter': return '#a0b8d0'
  }
}

/** 从记录中提取 note 文本或默认描述 */
function extractNoteText(record: EmotionRecord, emotionType: EmotionType): string {
  if (record.note && record.note.trim().length > 0) {
    return record.note.trim()
  }
  const labels: Record<EmotionType, string> = {
    happy: '一件让人开心的小事',
    calm: '一段安静的时光',
    sad: '一个让人低落的瞬间',
    anxious: '一阵莫名的不安',
    angry: '一次让人烦躁的经历',
  }
  return labels[emotionType]
}

// ============================================================
// 花园叙事引擎 Composable
// ============================================================

export function useGardenNarrative() {
  // ---- 花语故事 ----
  const stories = ref<FlowerStory[]>([])

  // ---- 成长日记 ----
  const diaryEntries = ref<DiaryEntry[]>([])

  // ---- 季节相册 ----
  const seasonAlbums = ref<SeasonAlbum[]>([])

  // ---- 花园快照 ----
  const snapshots = ref<GardenSnapshot[]>([])

  // ---- 分享链接 ----
  const shareLinks = ref<ShareLink[]>([])

  // ---- 访客留言 ----
  const visitorMessages = ref<VisitorMessage[]>([])

  // ---- 叙事配置 ----
  const narrativeConfig = ref<NarrativeConfig>({ ...DEFAULT_NARRATIVE_CONFIG })

  // ============================================================
  // 花语故事
  // ============================================================

  /** 根据情绪记录生成花语故事 */
  function generateFlowerStory(
    record: EmotionRecord,
    flower: FlowerPosition,
    previousStories: FlowerStory[] = [],
  ): FlowerStory {
    const language = FLOWER_LANGUAGES[record.type]
    const sameTypeStories = previousStories.filter(s => s.emotionType === record.type)
    const templateIndex = sameTypeStories.length % language.storyTemplates.length
    const template = language.storyTemplates[templateIndex]

    const noteText = extractNoteText(record, record.type)
    const content = template.replace('{note}', noteText)

    const meaningIndex = sameTypeStories.length % language.meanings.length
    const meaning = language.meanings[meaningIndex]
    const title = `${meaning} · ${EMOTION_FLOWERS[record.type].label}`

    const isMilestone = sameTypeStories.length > 0 && (sameTypeStories.length + 1) % 10 === 0

    return {
      id: generateId('story'),
      title,
      content,
      emotionType: record.type,
      flowerIds: [flower.id],
      date: formatDate(new Date(record.createdAt)),
      tags: [record.type, meaning],
      isMilestone,
    }
  }

  /** 批量生成花语故事 */
  function generateStories(
    records: EmotionRecord[],
    flowers: FlowerPosition[],
  ): FlowerStory[] {
    const newStories: FlowerStory[] = []

    for (const record of records) {
      const flower = flowers.find(f => f.recordId === record.id)
      if (!flower) continue

      const existing = stories.value.find(s => s.flowerIds.includes(flower.id))
      if (existing) continue

      const allStories = [...stories.value, ...newStories]
      const story = generateFlowerStory(record, flower, allStories)
      newStories.push(story)
    }

    // 限制最大故事数
    const combined = [...newStories, ...stories.value]
    stories.value = combined.slice(0, narrativeConfig.value.maxStories)

    return newStories
  }

  /** 获取里程碑故事 */
  function getMilestoneStories(): FlowerStory[] {
    return stories.value.filter(s => s.isMilestone)
  }

  /** 按情绪类型获取故事 */
  function getStoriesByEmotion(type: EmotionType): FlowerStory[] {
    return stories.value.filter(s => s.emotionType === type)
  }

  /** 删除故事 */
  function removeStory(id: string): boolean {
    const idx = stories.value.findIndex(s => s.id === id)
    if (idx === -1) return false
    stories.value = stories.value.filter(s => s.id !== id)
    return true
  }

  // ============================================================
  // 成长日记
  // ============================================================

  /** 生成或更新日记条目 */
  function generateDiaryEntry(
    date: string,
    records: EmotionRecord[],
    flowers: FlowerPosition[],
    health: GardenHealth,
    _environment: GardenEnvironment,
  ): DiaryEntry {
    const dayRecords = records.filter(r => formatDate(new Date(r.createdAt)) === date)
    const dayFlowers = flowers.filter(f => {
      return dayRecords.some(r => r.id === f.recordId)
    })

    // 情绪统计
    const emotionSummary: Record<EmotionType, number> = {
      happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0,
    }
    for (const r of dayRecords) {
      emotionSummary[r.type]++
    }

    // 判断心情
    const dominantType = Object.entries(emotionSummary)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as EmotionType | undefined

    let mood: DiaryEntry['mood'] = 'peaceful'
    if (dominantType === 'happy') mood = 'sunny'
    else if (dominantType === 'sad') mood = 'rainy'
    else if (dominantType === 'anxious' || dominantType === 'angry') mood = 'stormy'
    else if (dominantType === 'calm') mood = 'peaceful'
    else mood = 'cloudy'

    // 生成标题和内容
    const moodLabels: Record<DiaryEntry['mood'], string> = {
      sunny: '阳光灿烂的一天',
      cloudy: '多云转晴',
      rainy: '细雨绵绵',
      stormy: '风雨交加',
      peaceful: '宁静致远',
    }

    const title = `${date} · ${moodLabels[mood]}`
    const flowerNames = dayFlowers.map(f => EMOTION_FLOWERS[f.type].label).join('、')

    let content = ''
    if (dayFlowers.length === 0) {
      content = '今天花园里没有新的花朵，但每一片叶子都在呼吸。也许明天，会有新的种子发芽。'
    } else {
      content = `今天花园里盛开了 ${dayFlowers.length} 朵新花：${flowerNames}。`

      if (dominantType) {
        const language = FLOWER_LANGUAGES[dominantType]
        content += ` ${language.blessings[dayFlowers.length % language.blessings.length]}。`
      }
    }

    if (health.score >= 80) {
      content += ' 花园生机勃勃，每一朵花都在诉说着故事。'
    } else if (health.score < 40) {
      content += ' 花园需要更多关爱，记得常来看看。'
    }

    const existing = diaryEntries.value.find(e => e.date === date)
    if (existing) {
      // 更新已有条目
      const updated: DiaryEntry = {
        ...existing,
        emotionSummary,
        newFlowers: dayFlowers.length,
        healthScore: health.score,
        mood,
        isEdited: true,
      }
      diaryEntries.value = diaryEntries.value.map(e => e.date === date ? updated : e)
      return updated
    }

    const entry: DiaryEntry = {
      id: generateId('diary'),
      date,
      title,
      content,
      emotionSummary,
      newFlowers: dayFlowers.length,
      healthScore: health.score,
      mood,
      isEdited: false,
      isPrivate: false,
    }

    diaryEntries.value = [entry, ...diaryEntries.value]
    return entry
  }

  /** 编辑日记内容 */
  function editDiaryEntry(id: string, content: string, title?: string): DiaryEntry | null {
    const entry = diaryEntries.value.find(e => e.id === id)
    if (!entry) return null

    const updated: DiaryEntry = {
      ...entry,
      content,
      title: title ?? entry.title,
      isEdited: true,
    }
    diaryEntries.value = diaryEntries.value.map(e => e.id === id ? updated : e)
    return updated
  }

  /** 切换日记私密状态 */
  function toggleDiaryPrivacy(id: string): boolean {
    const entry = diaryEntries.value.find(e => e.id === id)
    if (!entry) return false
    entry.isPrivate = !entry.isPrivate
    diaryEntries.value = [...diaryEntries.value]
    return entry.isPrivate
  }

  /** 获取公开日记 */
  const publicDiaryEntries = computed(() =>
    diaryEntries.value.filter(e => !e.isPrivate),
  )

  /** 按日期获取日记 */
  function getDiaryByDate(date: string): DiaryEntry | undefined {
    return diaryEntries.value.find(e => e.date === date)
  }

  /** 按月份获取日记 */
  function getDiaryByMonth(year: number, month: number): DiaryEntry[] {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return diaryEntries.value.filter(e => e.date.startsWith(prefix))
  }

  // ============================================================
  // 季节相册
  // ============================================================

  /** 创建季节相册 */
  function createSeasonAlbum(
    season: SeasonAlbum['season'],
    year: number,
    snapshot: GardenSnapshot,
  ): SeasonAlbum {
    const seasonDates: Record<SeasonAlbum['season'], { start: string; end: string }> = {
      spring: { start: `${year}-03-01`, end: `${year}-05-31` },
      summer: { start: `${year}-06-01`, end: `${year}-08-31` },
      autumn: { start: `${year}-09-01`, end: `${year}-11-30` },
      winter: { start: `${year}-12-01`, end: `${year + 1}-02-28` },
    }

    const dates = seasonDates[season]

    // 生成季节故事
    const seasonStories: Record<SeasonAlbum['season'], string> = {
      spring: '春天来了，花园从沉睡中苏醒。新芽破土，花苞初绽。这是希望的季节，每一朵花都承载着新的开始。',
      summer: '盛夏的花园，繁花似锦。阳光热烈，花朵尽情绽放。这是生命力最旺盛的季节，每一片花瓣都在诉说着热情。',
      autumn: '秋天带着金色的画笔走过花园。有些花开始凋谢，但果实正在成熟。这是收获的季节，回望过去，感恩每一刻。',
      winter: '冬天为花园披上银装。花朵进入了休眠，但土地下的根正在积蓄力量。这是沉淀的季节，静待下一个春天。',
    }

    // 检查是否已存在
    const existing = seasonAlbums.value.find(a => a.season === season && a.year === year)
    if (existing) return existing

    const album: SeasonAlbum = {
      id: generateId('season'),
      season,
      year,
      startDate: dates.start,
      endDate: dates.end,
      snapshot,
      story: seasonStories[season],
      coverColor: getSeasonColor(season),
    }

    seasonAlbums.value = [album, ...seasonAlbums.value]
    return album
  }

  /** 创建花园状态快照 */
  function createSnapshot(
    flowers: FlowerPosition[],
    health: GardenHealth,
    environment: GardenEnvironment,
    clusters: FlowerCluster[],
  ): GardenSnapshot {
    const flowersByType: Record<EmotionType, number> = {
      happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0,
    }
    for (const f of flowers) {
      flowersByType[f.type]++
    }

    const bloomedCount = flowers.filter(f => f.bloomed).length

    // 选取代表性花朵（每个类型选一朵盛开的）
    const featuredFlowers: FlowerPosition[] = []
    const typeSet = new Set<EmotionType>()
    for (const f of flowers) {
      if (f.bloomed && !typeSet.has(f.type)) {
        featuredFlowers.push(f)
        typeSet.add(f.type)
      }
    }

    const snapshot: GardenSnapshot = {
      id: generateId('snap'),
      timestamp: new Date().toISOString(),
      totalFlowers: flowers.length,
      flowersByType,
      bloomedCount,
      healthScore: health.score,
      coverage: health.coverage,
      environment,
      clusters,
      featuredFlowers,
    }

    snapshots.value = [snapshot, ...snapshots.value]
    return snapshot
  }

  /** 获取最新快照 */
  const latestSnapshot = computed(() => snapshots.value[0] ?? null)

  /** 比较两个快照 */
  function compareSnapshots(
    a: GardenSnapshot,
    b: GardenSnapshot,
  ): { newFlowers: number; lostFlowers: number; scoreChange: number; typeChanges: Partial<Record<EmotionType, number>> } {
    const newFlowers = Math.max(0, a.totalFlowers - b.totalFlowers)
    const lostFlowers = Math.max(0, b.totalFlowers - a.totalFlowers)
    const scoreChange = a.healthScore - b.healthScore

    const typeChanges: Partial<Record<EmotionType, number>> = {}
    for (const type of ['happy', 'calm', 'sad', 'anxious', 'angry'] as EmotionType[]) {
      const diff = a.flowersByType[type] - b.flowersByType[type]
      if (diff !== 0) typeChanges[type] = diff
    }

    return { newFlowers, lostFlowers, scoreChange, typeChanges }
  }

  // ============================================================
  // 花园分享
  // ============================================================

  /** 创建分享链接 */
  function createShareLink(config: Partial<ShareConfig> = {}): ShareLink {
    const mergedConfig: ShareConfig = { ...DEFAULT_SHARE_CONFIG, ...config }
    const code = Math.random().toString(36).slice(2, 10).toUpperCase()

    const expiresIn = mergedConfig.expiresIn
    const link: ShareLink = {
      id: generateId('share'),
      code,
      config: mergedConfig,
      createdAt: new Date().toISOString(),
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn).toISOString() : null,
      viewCount: 0,
      active: true,
    }

    shareLinks.value = [link, ...shareLinks.value]
    return link
  }

  /** 通过分享码获取分享链接 */
  function getShareByCode(code: string): ShareLink | undefined {
    return shareLinks.value.find(l => l.code === code && l.active)
  }

  /** 记录分享访问 */
  function recordShareView(code: string): boolean {
    const link = shareLinks.value.find(l => l.code === code)
    if (!link) return false

    // 检查是否过期
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      link.active = false
      shareLinks.value = [...shareLinks.value]
      return false
    }

    link.viewCount++
    shareLinks.value = [...shareLinks.value]
    return true
  }

  /** 停用分享链接 */
  function deactivateShare(id: string): boolean {
    const link = shareLinks.value.find(l => l.id === id)
    if (!link) return false
    link.active = false
    shareLinks.value = [...shareLinks.value]
    return true
  }

  /** 获取活跃的分享链接 */
  const activeShareLinks = computed(() =>
    shareLinks.value.filter(l => l.active && (!l.expiresAt || new Date(l.expiresAt) > new Date())),
  )

  /** 生成分享数据 */
  function generateShareData(
    shareId: string,
    flowers: FlowerPosition[],
    health: GardenHealth,
    stories: FlowerStory[],
    diary: DiaryEntry[],
  ): Record<string, unknown> {
    const link = shareLinks.value.find(l => l.id === shareId)
    if (!link) return {}

    const data: Record<string, unknown> = {
      title: link.config.title,
      description: link.config.description,
      garden: {
        totalFlowers: flowers.length,
        bloomedCount: flowers.filter(f => f.bloomed).length,
        healthScore: health.score,
        healthDescription: health.description,
      },
    }

    if (link.config.includeFlowerDetails) {
      const flowerTypes: Record<string, number> = {}
      for (const f of flowers) {
        flowerTypes[f.type] = (flowerTypes[f.type] || 0) + 1
      }
      data.flowerTypes = flowerTypes
    }

    if (link.config.includeEmotions) {
      data.emotions = stories.map(s => ({
        title: s.title,
        type: s.emotionType,
        date: s.date,
      }))
    }

    if (link.config.includeDiary) {
      data.diary = diary.filter(e => !e.isPrivate).slice(0, 7).map(e => ({
        date: e.date,
        title: e.title,
        mood: e.mood,
      }))
    }

    return data
  }

  // ============================================================
  // 访客留言
  // ============================================================

  /** 添加访客留言 */
  function addVisitorMessage(
    shareId: string,
    visitorName: string,
    content: string,
    reaction?: string,
  ): VisitorMessage | null {
    // 检查分享链接是否存在且有效
    const link = shareLinks.value.find(l => l.id === shareId)
    if (!link || !link.active) return null

    // 检查是否过期
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return null

    const trimmedContent = content.trim().slice(0, narrativeConfig.value.maxMessageLength)
    if (trimmedContent.length === 0) return null

    const message: VisitorMessage = {
      id: generateId('msg'),
      visitorName: visitorName.trim() || '匿名访客',
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      shareId,
      reaction,
      isRead: false,
      isPinned: false,
    }

    visitorMessages.value = [message, ...visitorMessages.value]
    return message
  }

  /** 标记留言为已读 */
  function markMessageRead(id: string): boolean {
    const msg = visitorMessages.value.find(m => m.id === id)
    if (!msg) return false
    msg.isRead = true
    visitorMessages.value = [...visitorMessages.value]
    return true
  }

  /** 标记所有留言为已读 */
  function markAllMessagesRead(): void {
    visitorMessages.value = visitorMessages.value.map(m => ({ ...m, isRead: true }))
  }

  /** 置顶/取消置顶留言 */
  function toggleMessagePin(id: string): boolean {
    const msg = visitorMessages.value.find(m => m.id === id)
    if (!msg) return false
    msg.isPinned = !msg.isPinned
    visitorMessages.value = [...visitorMessages.value]
    return msg.isPinned
  }

  /** 删除留言 */
  function removeMessage(id: string): boolean {
    const idx = visitorMessages.value.findIndex(m => m.id === id)
    if (idx === -1) return false
    visitorMessages.value = visitorMessages.value.filter(m => m.id !== id)
    return true
  }

  /** 获取分享链接的留言 */
  function getMessagesByShare(shareId: string): VisitorMessage[] {
    return visitorMessages.value
      .filter(m => m.shareId === shareId)
      .sort((a, b) => {
        // 置顶优先
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }

  /** 未读留言数 */
  const unreadMessageCount = computed(() =>
    visitorMessages.value.filter(m => !m.isRead).length,
  )

  /** 留言反应统计 */
  function getReactionStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const msg of visitorMessages.value) {
      if (msg.reaction) {
        stats[msg.reaction] = (stats[msg.reaction] || 0) + 1
      }
    }
    return stats
  }

  // ============================================================
  // 综合叙事生成
  // ============================================================

  /** 自动生成完整的叙事内容（故事+日记+快照+相册） */
  function generateFullNarrative(
    records: EmotionRecord[],
    flowers: FlowerPosition[],
    health: GardenHealth,
    environment: GardenEnvironment,
    clusters: FlowerCluster[],
  ): {
    newStories: FlowerStory[]
    diaryEntry: DiaryEntry | null
    snapshot: GardenSnapshot
    seasonAlbum: SeasonAlbum | null
  } {
    // 生成故事
    const newStories = generateStories(records, flowers)

    // 生成日记（今天）
    const today = formatDate(new Date())
    const todayRecords = records.filter(r => formatDate(new Date(r.createdAt)) === today)
    const diaryEntry = todayRecords.length > 0 || flowers.length > 0
      ? generateDiaryEntry(today, records, flowers, health, environment)
      : null

    // 创建快照
    const snapshot = createSnapshot(flowers, health, environment, clusters)

    // 季节相册（如果启用自动生成且当前没有该季节的相册）
    let seasonAlbum: SeasonAlbum | null = null
    if (narrativeConfig.value.autoSeasonAlbum) {
      const now = new Date()
      const season = getSeason(now)
      const year = now.getFullYear()
      const existing = seasonAlbums.value.find(a => a.season === season && a.year === year)
      if (!existing) {
        seasonAlbum = createSeasonAlbum(season, year, snapshot)
      }
    }

    return { newStories, diaryEntry, snapshot, seasonAlbum }
  }

  // ---- 计算属性 ----

  /** 故事总数 */
  const storyCount = computed(() => stories.value.length)

  /** 日记总数 */
  const diaryCount = computed(() => diaryEntries.value.length)

  /** 季节相册数 */
  const albumCount = computed(() => seasonAlbums.value.length)

  /** 活跃分享链接数 */
  const activeShareCount = computed(() => activeShareLinks.value.length)

  // ---- 清理 ----

  function destroy(): void {
    stories.value = []
    diaryEntries.value = []
    seasonAlbums.value = []
    snapshots.value = []
    shareLinks.value = []
    visitorMessages.value = []
  }

  return {
    // 配置
    narrativeConfig,

    // 花语故事
    stories,
    storyCount,
    generateFlowerStory,
    generateStories,
    getMilestoneStories,
    getStoriesByEmotion,
    removeStory,

    // 成长日记
    diaryEntries,
    diaryCount,
    publicDiaryEntries,
    generateDiaryEntry,
    editDiaryEntry,
    toggleDiaryPrivacy,
    getDiaryByDate,
    getDiaryByMonth,

    // 季节相册
    seasonAlbums,
    albumCount,
    createSeasonAlbum,
    createSnapshot,
    latestSnapshot,
    compareSnapshots,

    // 花园分享
    shareLinks,
    activeShareLinks,
    activeShareCount,
    createShareLink,
    getShareByCode,
    recordShareView,
    deactivateShare,
    generateShareData,

    // 访客留言
    visitorMessages,
    unreadMessageCount,
    addVisitorMessage,
    markMessageRead,
    markAllMessagesRead,
    toggleMessagePin,
    removeMessage,
    getMessagesByShare,
    getReactionStats,

    // 综合
    generateFullNarrative,

    // 生命周期
    destroy,
  }
}