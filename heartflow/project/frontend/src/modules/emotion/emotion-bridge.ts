// ============================================================
// 情绪花房 · 视图桥接层
// 蓝图定义：
//   情绪状态聚合、实时检测、趋势分析、花朵品种管理、
//   季节系统、花园叙事、社交互动、花园环境
//   服务于 EmotionGarden.vue, EmotionStats.vue, EmotionHistory.vue,
//   EmotionDetector.vue, GardenNarrative.vue, GardenSocial.vue
// ============================================================

import { ref, computed } from 'vue'
import { useEmotionGarden, useEmotionDetector } from './index'
import { useEmotionTrends } from './emotion-trends'
import { useGardenNarrative } from './garden-narrative'
import { useGardenSocial } from './garden-social'
import { useFlowerSeason } from './flower-season'
import {
  selectFlowerVariety,
  computeAdaptiveEnvironment,
  computeCollection,
  FLOWER_VARIETIES,
} from './flower-variety'
import type { EmotionRecord, EmotionType, EmotionAmbientMood } from './types'
import { EMOTION_OPTIONS, EMOTION_FLOWERS } from './types'
import type { FlowerVariety, AdaptiveEnvironment, FlowerCollection } from './flower-variety'
import type {
  DetectionSource,
  DetectedEmotion,
  EmotionDetectorConfig,
  DetectionStats,
  PeriodicCheckResult,
} from './emotion-detector'
import type {
  TrendPeriod,
  TrendDataPoint,
  EmotionPattern,
  EmotionPrediction,
  TrendSummary,
  DashboardPanel,
  EmotionDashboardConfig,
  EmotionTrendsConfig,
} from './emotion-trends'
import type {
  FlowerStory,
  DiaryEntry,
  SeasonAlbum,
  GardenSnapshot,
  ShareConfig,
  ShareLink,
  VisitorMessage,
  FlowerLanguageTemplate,
  NarrativeConfig,
} from './garden-narrative'
import type {
  FriendStatus,
  GardenFriend,
  FriendRequest,
  GardenVisit,
  GiftType,
  GardenGift,
  GiftExchange,
  SocialActivity,
  SocialStats,
  GardenSocialConfig,
} from './garden-social'

// ---- 重新导出上游类型 ----

export type {
  EmotionRecord,
  EmotionType,
  EmotionAmbientMood,
  FlowerVariety,
  AdaptiveEnvironment,
  FlowerCollection,
  DetectionSource,
  DetectedEmotion,
  EmotionDetectorConfig,
  DetectionStats,
  PeriodicCheckResult,
  TrendPeriod,
  TrendDataPoint,
  EmotionPattern,
  EmotionPrediction,
  TrendSummary,
  DashboardPanel,
  EmotionDashboardConfig,
  EmotionTrendsConfig,
  FlowerStory,
  DiaryEntry,
  SeasonAlbum,
  GardenSnapshot,
  ShareConfig,
  ShareLink,
  VisitorMessage,
  FlowerLanguageTemplate,
  NarrativeConfig,
  FriendStatus,
  GardenFriend,
  FriendRequest,
  GardenVisit,
  GiftType,
  GardenGift,
  GiftExchange,
  SocialActivity,
  SocialStats,
  GardenSocialConfig,
}

export { EMOTION_OPTIONS, EMOTION_FLOWERS, FLOWER_VARIETIES }

// ---- 情绪健康度 ----

export interface EmotionHealth {
  /** 综合评分 0-100 */
  score: number
  /** 总记录数 */
  totalRecords: number
  /** 主导情绪 */
  dominantEmotion: string
  /** 积极情绪占比 */
  positiveRatio: number
  /** 消极情绪占比 */
  negativeRatio: number
  /** 情绪多样性指数 */
  diversity: number
  /** 最近情绪趋势 */
  recentTrend: 'improving' | 'stable' | 'declining'
  /** 健康等级 */
  level: { label: string; color: string }
  /** 改善建议 */
  suggestions: string[]
}

// ---- 花园状态 ----

export interface GardenState {
  /** 当前环境氛围 */
  ambientMood: EmotionAmbientMood
  /** 自适应环境 */
  adaptiveEnvironment: AdaptiveEnvironment
  /** 花朵收藏 */
  collection: FlowerCollection
  /** 当前季节 */
  season: string
  /** 花园中花朵数量 */
  flowerCount: number
  /** 当前品种展示 */
  varietyDisplay: { emotion: EmotionType; variety: FlowerVariety | null }[]
}

// ---- 花园叙事摘要 ----

export interface GardenNarrativeSummary {
  stories: FlowerStory[]
  totalStories: number
  diaries: DiaryEntry[]
  albums: SeasonAlbum[]
  /** 最新故事 */
  latestStory: FlowerStory | null
  /** 花园快照 */
  snapshot: GardenSnapshot | null
}

// ---- 花园社交摘要 ----

export interface GardenSocialSummary {
  friends: GardenFriend[]
  totalFriends: number
  visits: GardenVisit[]
  totalVisits: number
  /** 待处理好友请求 */
  pendingRequests: FriendRequest[]
  /** 社交统计 */
  stats: SocialStats | null
  /** 最新活动 */
  recentActivities: SocialActivity[]
}

// ---- 情绪趋势概览 ----

export interface EmotionTrendOverview {
  /** 趋势摘要 */
  summary: TrendSummary | null
  /** 检测到的情绪模式 */
  patterns: EmotionPattern[]
  /** 情绪预测 */
  predictions: EmotionPrediction[]
  /** 趋势数据点 */
  dataPoints: TrendDataPoint[]
}

// ---- 实时检测状态 ----

export interface DetectionState {
  isDetecting: boolean
  recentDetections: DetectedEmotion[]
  stats: DetectionStats
  /** 待确认的检测 */
  pendingConfirmations: DetectedEmotion[]
}

// ---- 情绪连续天数（最长同类型连续，用于品种稀有度派生） ----

function longestEmotionStreak(records: EmotionRecord[], type: EmotionType): number {
  const sorted = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  let max = 0
  let cur = 0
  for (const r of sorted) {
    if (r.type === type) {
      cur++
      if (cur > max) max = cur
    } else {
      cur = 0
    }
  }
  return max
}

// ============================================================
// useEmotionBridge
// ============================================================

export function useEmotionBridge() {
  // ---- 子模块 ----
  const garden = useEmotionGarden()
  const detector = useEmotionDetector()
  const trends = useEmotionTrends()
  const narrative = useGardenNarrative()
  const social = useGardenSocial()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 初始化 ----

  function initialize(): void {
    garden.load()
    trends.analyzeAll(garden.records.value)
  }

  // ---- 情绪健康度 ----

  const POSITIVE_EMOTIONS: EmotionType[] = ['happy', 'calm']
  const NEGATIVE_EMOTIONS: EmotionType[] = ['sad', 'anxious', 'angry']

  const emotionHealth = computed<EmotionHealth>(() => {
    const records = garden.records.value
    const counts = garden.counts.value

    // 主导情绪
    let dominantEmotion = ''
    let maxCount = 0
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        dominantEmotion = type
      }
    }

    // 积极/消极占比
    const positiveCount = records.filter(r => POSITIVE_EMOTIONS.includes(r.type as EmotionType)).length
    const negativeCount = records.filter(r => NEGATIVE_EMOTIONS.includes(r.type as EmotionType)).length
    const totalCount = records.length
    const positiveRatio = totalCount > 0 ? positiveCount / totalCount : 0
    const negativeRatio = totalCount > 0 ? negativeCount / totalCount : 0

    // 情绪多样性
    const emotionTypes = new Set(records.map(r => r.type))
    const diversity = emotionTypes.size / 5

    // 最近趋势（近7天 vs 前7天）
    const recent = garden.recent(7)
    const older = records.filter(r => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 14)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(r.createdAt) >= cutoff && new Date(r.createdAt) < weekAgo
    })
    const recentPositive = recent.filter(r => POSITIVE_EMOTIONS.includes(r.type as EmotionType)).length
    const olderPositive = older.filter(r => POSITIVE_EMOTIONS.includes(r.type as EmotionType)).length
    const recentRatio = recent.length > 0 ? recentPositive / recent.length : 0
    const olderRatio = older.length > 0 ? olderPositive / older.length : 0
    const recentTrend: 'improving' | 'stable' | 'declining' =
      recentRatio > olderRatio + 0.1 ? 'improving' :
      recentRatio < olderRatio - 0.1 ? 'declining' : 'stable'

    // 综合评分
    const score = Math.round(
      positiveRatio * 40 + diversity * 30 + (recentTrend === 'improving' ? 20 : recentTrend === 'stable' ? 10 : 0) + 10
    )

    let level: { label: string; color: string }
    if (score >= 80) level = { label: '阳光明媚', color: '#f0c040' }
    else if (score >= 60) level = { label: '微风和煦', color: '#80b8d0' }
    else if (score >= 40) level = { label: '多云转晴', color: '#9080b8' }
    else if (score >= 20) level = { label: '需要灌溉', color: '#c05050' }
    else level = { label: '待播种', color: '#95a5a6' }

    const suggestions: string[] = []
    if (records.length === 0) {
      suggestions.push('记录你的第一条情绪，让花房开始生长')
    } else {
      if (negativeRatio > 0.5) {
        suggestions.push('消极情绪占比较高，尝试关注生活中的小确幸')
      }
      if (diversity < 0.4) {
        suggestions.push('你的情绪表达较为单一，尝试更细腻地感知情绪变化')
      }
      if (recentTrend === 'declining') {
        suggestions.push('最近情绪有下滑趋势，给自己一些温暖的关怀')
      }
      if (positiveRatio > 0.7) {
        suggestions.push('你的情绪花园阳光明媚，继续保持这份美好')
      }
    }

    return {
      score: Math.min(100, score),
      totalRecords: totalCount,
      dominantEmotion,
      positiveRatio: Math.round(positiveRatio * 100),
      negativeRatio: Math.round(negativeRatio * 100),
      diversity: Math.round(diversity * 100),
      recentTrend,
      level,
      suggestions,
    }
  })

  // ---- 花园状态 ----

  const flowerSeason = useFlowerSeason()

  const gardenState = computed<GardenState>(() => {
    const records = garden.records.value
    const ambientMood = garden.getAmbientMood()
    const adaptiveEnv = computeAdaptiveEnvironment(records)
    const season = flowerSeason.detectSeason(new Date())

    // 图鉴：按真实解锁的品种 ID 计算（不再把 EmotionRecord[] 误当品种 ID）
    const unlockedVarietyIds = records.length > 0
      ? Array.from(new Set(records.map(r => selectFlowerVariety(r, longestEmotionStreak(records, r.type)).id)))
      : []
    const collection = computeCollection(unlockedVarietyIds)

    // 每种情绪按其自身连续天数派生对应品种（不再错显为最新一条记录的品种）
    const varietyDisplay = EMOTION_OPTIONS.map(opt => {
      const sample = records.find(r => r.type === opt.type)
      return {
        emotion: opt.type,
        variety: sample ? selectFlowerVariety(sample, longestEmotionStreak(records, opt.type)) : null,
      }
    })

    return {
      ambientMood,
      adaptiveEnvironment: adaptiveEnv,
      collection,
      season,
      flowerCount: collection?.unlocked.length ?? 0,
      varietyDisplay,
    }
  })

  // ---- 花园叙事摘要 ----

  const gardenNarrativeSummary = computed<GardenNarrativeSummary>(() => {
    const stories = narrative.stories.value
    const diaries = narrative.diaryEntries.value
    const albums = narrative.seasonAlbums.value
    const snapshot = narrative.latestSnapshot.value

    return {
      stories,
      totalStories: stories.length,
      diaries,
      albums,
      latestStory: stories.length > 0 ? stories[0] : null,
      snapshot,
    }
  })

  // ---- 花园社交摘要 ----

  const gardenSocialSummary = computed<GardenSocialSummary>(() => {
    const friends = social.friends.value
    const visits = social.visits.value
    const pendingRequests = social.pendingRequests.value
    const stats = social.socialStats.value
    const recentActivities = social.activities.value?.slice(0, 10) ?? []

    return {
      friends,
      totalFriends: friends.length,
      visits,
      totalVisits: visits.length,
      pendingRequests,
      stats,
      recentActivities,
    }
  })

  // ---- 情绪趋势概览 ----

  const emotionTrendOverview = computed<EmotionTrendOverview>(() => {
    const summary = trends.summary.value
    const patterns = trends.patterns.value
    const predictions = trends.predictions.value
    const dataPoints = trends.trendData.value

    return {
      summary,
      patterns,
      predictions,
      dataPoints,
    }
  })

  // ---- 实时检测状态 ----

  const detectionState = computed<DetectionState>(() => {
    const detections = detector.detections.value
    const stats = detector.stats.value

    return {
      isDetecting: detector.isAnalyzing.value,
      recentDetections: detections.slice(0, 10),
      stats,
      pendingConfirmations: detections.filter(d => d.needsConfirmation),
    }
  })

  // ---- 操作入口 ----

  /**
   * 记录情绪
   */
  function logEmotion(type: EmotionType, note: string = ''): EmotionRecord {
    const record = garden.add(type, note)
    // 同步更新趋势
    trends.analyzeAll(garden.records.value)
    return record
  }

  /**
   * 编辑情绪记录
   */
  function editEmotion(id: string, data: { type?: EmotionType; note?: string }): boolean {
    const result = garden.update(id, data)
    if (result) {
      trends.analyzeAll(garden.records.value)
    }
    return result
  }

  /**
   * 删除情绪记录
   */
  function removeEmotion(id: string): void {
    garden.remove(id)
    trends.analyzeAll(garden.records.value)
  }

  /**
   * 获取最近情绪记录
   */
  function getRecentEmotions(days: number = 7): EmotionRecord[] {
    return garden.recent(days)
  }

  /**
   * 分析文本情绪
   */
  function analyzeTextEmotion(text: string): DetectedEmotion | null {
    return detector.detectPrimary(text)
  }

  /**
   * 确认检测结果
   */
  function confirmDetection(id: string, type: EmotionType, note?: string): boolean {
    const confirmed = detector.confirmDetection(id)
    if (confirmed) {
      logEmotion(type, note ?? '')
    }
    return confirmed
  }

  /**
   * 刷新趋势分析
   */
  function refreshTrends(): void {
    trends.analyzeAll(garden.records.value)
  }

  /**
   * 创建花园故事
   */
  function createGardenStory(title: string, content: string): FlowerStory {
    // generateFlowerStory takes (record, flower, previousStories)
    // Use the most recent record if available
    const records = garden.records.value
    if (records.length === 0) {
      return {
        id: `story_${Date.now()}`,
        title,
        content,
        emotionType: 'happy',
        flowerIds: [],
        date: new Date().toISOString().split('T')[0],
        tags: [],
        isMilestone: false,
      }
    }
    return narrative.generateFlowerStory(records[0], { id: '', recordId: '', type: 'happy', x: 0, y: 0, scale: 1, rotation: 0, bloomed: true, opacity: 1, depth: 0.5, createdAt: '' }, [])
  }

  /**
   * 创建花园日记
   */
  function createGardenDiary(_content: string, _emotion: EmotionType): DiaryEntry {
    return narrative.generateDiaryEntry(
      new Date().toISOString().split('T')[0],
      garden.records.value,
      [],
      { score: 0, coverage: 0, diversity: 0, bloomRate: 0, recentActivity: 0, description: '' },
      { sky: 'clear', ground: 'lush', ambientLight: 'rgba(200, 220, 240, 0.3)', skyGradient: ['#d4e4f0', '#e8f0f8'], particleType: 'none', particleColor: '#ffffff', swayIntensity: 0.5 },
    )
  }

  /**
   * 生成花园快照
   */
  function generateGardenSnapshot(): GardenSnapshot {
    return narrative.createSnapshot([], { score: 0, coverage: 0, diversity: 0, bloomRate: 0, recentActivity: 0, description: '' }, {
      sky: 'clear',
      ground: 'lush',
      ambientLight: 'rgba(200, 220, 240, 0.3)',
      skyGradient: ['#d4e4f0', '#e8f0f8'],
      particleType: 'none',
      particleColor: '#ffffff',
      swayIntensity: 0.5,
    }, [])
  }

  /**
   * 创建分享链接
   */
  function createShareLink(config?: Partial<ShareConfig>): ShareLink {
    return narrative.createShareLink(config)
  }

  /**
   * 添加好友
   */
  function addFriend(friendId: string, name: string): GardenFriend {
    return social.addFriend({
      name,
      avatar: undefined,
      gardenName: `${name}的花园`,
      gardenDescription: undefined,
      status: 'offline',
      lastActiveAt: Date.now(),
      flowerCount: 0,
      dominantEmotion: 'neutral',
    }) ?? {
      id: friendId,
      name,
      gardenName: `${name}的花园`,
      status: 'offline',
      lastActiveAt: Date.now(),
      friendedAt: Date.now(),
      flowerCount: 0,
      dominantEmotion: 'neutral',
      interactionCount: 0,
      isStarred: false,
      tags: [],
    }
  }

  /**
   * 发送礼物
   */
  function sendGift(friendId: string, _giftType: GiftType, message?: string): GiftExchange {
    return social.sendGift(friendId, '好友', `gift-flower-rose`, message) ?? {
      id: `gift_${Date.now()}`,
      fromId: '',
      toId: friendId,
      gift: { id: 'gift-flower-rose', type: 'flower', name: '玫瑰', description: '', icon: '🌹', rarity: 'common', emotionEffect: 'happy' },
      message,
      sentAt: Date.now(),
      read: false,
      reciprocated: false,
      fromName: '',
      toName: '好友',
    }
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 聚合状态
    isLoading,
    emotionHealth,
    gardenState,
    gardenNarrativeSummary,
    gardenSocialSummary,
    emotionTrendOverview,
    detectionState,

    // 操作入口
    initialize,
    logEmotion,
    editEmotion,
    removeEmotion,
    getRecentEmotions,
    analyzeTextEmotion,
    confirmDetection,
    refreshTrends,
    createGardenStory,
    createGardenDiary,
    generateGardenSnapshot,
    createShareLink,
    addFriend,
    sendGift,

    // 子模块直通（供高级场景使用）
    garden,
    detector,
    trends,
    narrative,
    social,
  }
}