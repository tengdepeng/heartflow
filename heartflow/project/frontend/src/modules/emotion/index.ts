// ============================================================
// 情绪花房 · 状态管理
// ============================================================

import { ref, computed } from 'vue'
import type { EmotionRecord, EmotionType, EmotionAmbientMood, EmotionWeather } from './types'
import { storage } from '../../engine/storage'
import type { FlowerVariety, AdaptiveEnvironment, FlowerCollection } from './flower-variety'

export type { EmotionRecord, EmotionType, EmotionAmbientMood, EmotionWeather }
export { WEATHER_OPTIONS } from './types'
export type { FlowerVariety, AdaptiveEnvironment, FlowerCollection }
export { EMOTION_OPTIONS, EMOTION_FLOWERS } from './types'
export {
  selectFlowerVariety,
  getVarietiesByEmotion,
  computeAdaptiveEnvironment,
  computeCollection,
  FLOWER_VARIETIES,
} from './flower-variety'

// ---- 花园叙事引擎（P15-4） ----
export {
  useGardenNarrative,
  FLOWER_LANGUAGES,
  DEFAULT_NARRATIVE_CONFIG,
  DEFAULT_SHARE_CONFIG,
} from './garden-narrative'
export type {
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

// ---- 实时情绪检测引擎（P16-14） ----
export {
  useEmotionDetector,
  DEFAULT_DETECTOR_CONFIG,
  DEFAULT_EMOTION_KEYWORDS,
  DEFAULT_INTENSITY_MODIFIERS,
} from './emotion-detector'
export type {
  DetectionSource,
  DetectedEmotion,
  EmotionDetectorConfig,
  DetectionStats,
  PeriodicCheckResult,
} from './emotion-detector'

// ---- 花园社交互动系统（P16-14） ----
export {
  useGardenSocial,
  DEFAULT_SOCIAL_CONFIG,
  GIFT_LIBRARY,
} from './garden-social'
export type {
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

// ---- 情绪趋势分析仪表盘（P16-14） ----
export {
  useEmotionTrends,
  DEFAULT_TRENDS_CONFIG,
  DEFAULT_DASHBOARD_CONFIG,
  EMOTION_COLORS,
  POSITIVE_EMOTIONS,
  NEGATIVE_EMOTIONS,
} from './emotion-trends'
export type {
  TrendPeriod,
  TrendDataPoint,
  EmotionPattern,
  EmotionPrediction,
  TrendSummary,
  DashboardPanel,
  EmotionDashboardConfig,
  EmotionTrendsConfig,
} from './emotion-trends'

// 模块级共享状态（singleton pattern，与 useCanvasRoom 一致）
const records = ref<EmotionRecord[]>([])

export function useEmotionGarden() {
  function load() {
    records.value = storage.getEmotions()
  }

  function add(type: EmotionType, note: string = '', weather?: EmotionWeather) {
    const record: EmotionRecord = {
      id: `emotion_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      note: note.trim(),
      createdAt: new Date().toISOString(),
      weather,
    }
    records.value.unshift(record)
    storage.setEmotions(records.value)
    return record
  }

  function remove(id: string) {
    records.value = records.value.filter(r => r.id !== id)
    storage.setEmotions(records.value)
  }

  /** 编辑已有情绪记录的类型、备注或天气第二轴 */
  function update(id: string, data: { type?: EmotionType; note?: string; weather?: EmotionWeather }) {
    const record = records.value.find(r => r.id === id)
    if (!record) return false
    if (data.type) record.type = data.type
    if (data.note !== undefined) record.note = data.note.trim()
    if (data.weather !== undefined) record.weather = data.weather
    storage.setEmotions(records.value)
    return true
  }

  /** 按情绪类型统计 */
  const counts = computed(() => {
    const map: Record<string, number> = {}
    for (const r of records.value) {
      map[r.type] = (map[r.type] || 0) + 1
    }
    return map
  })

  /** 最近 N 天的记录 */
  function recent(days: number = 7) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return records.value.filter(r => new Date(r.createdAt) >= cutoff)
  }

  function getAmbientMood(sampleSize: number = 6): EmotionAmbientMood {
    const recentRecords = records.value.slice(0, sampleSize)
    if (recentRecords.length === 0) return 'normal'

    const sadCount = recentRecords.filter(r => r.type === 'sad').length
    const anxiousCount = recentRecords.filter(r => r.type === 'anxious').length
    const happyCount = recentRecords.filter(r => r.type === 'happy').length

    if (sadCount >= 2) return 'warm'
    if (anxiousCount >= 2) return 'dim'
    if (happyCount >= 2) return 'bright'
    return 'normal'
  }

  return {
    records,
    counts,
    load,
    add,
    remove,
    update,
    recent,
    getAmbientMood,
  }
}
