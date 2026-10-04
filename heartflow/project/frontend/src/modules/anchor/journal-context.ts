// ============================================================
// 逐日心锚 · 手札上下文（建议卡 + 元数据条）
// ------------------------------------------------------------
// 借鉴 Apple Journal「建议卡」+ Day One「元数据条」：
// 从逐日心锚的当日运行数据（专注 / 情绪 / 运动 / 心锚 / 照片 / 手札）
// 聚合出「零输入成本」的书写入口 —— 点一张卡即预填脚手架，
// 让「今天要不要记一笔」由数据主动提示，而非面对空白页发呆。
// 全部本地读取、本地生成，不外发任何数据。
// ============================================================

import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import type { FocusSession } from '../../types'
import { getAllSessions } from '../timer'
import { useEmotionGarden } from '../emotion'
import { EMOTION_OPTIONS, EMOTION_FLOWERS, WEATHER_OPTIONS } from '../emotion/types'
import type { EmotionRecord, EmotionType, EmotionWeather } from '../emotion/types'
import { useExerciseTracker } from '../body/exercise-tracker'
import type { ExerciseRecord } from '../body/exercise-tracker'
import type { Anchor } from './types'
import { useAnchorJournal } from './anchor-journal'
import type { AnchorJournal, JournalType } from './anchor-journal'
import { usePhotoDiary } from './photo-diary'
import type { PhotoEntry } from './photo-diary'

// ---- 类型 ----

export interface DaySignalsInput {
  /** 目标日期（本地日历键 YYYY-MM-DD） */
  date: string
  focusSessions: FocusSession[]
  emotionRecords: EmotionRecord[]
  exerciseRecords: ExerciseRecord[]
  anchors: Anchor[]
  journals: AnchorJournal[]
  photos: PhotoEntry[]
}

/** 当日运行数据信号（归一化后的只读快照） */
export interface DaySignals {
  date: string
  focusMinutes: number
  focusCount: number
  emotionCount: number
  dominantEmotion: EmotionType | null
  weather: EmotionWeather | null
  exerciseMinutes: number
  exerciseCount: number
  exerciseCalories: number
  anchorTotal: number
  anchorDone: number
  /** 未完成心锚文本（用于预填复盘脚手架） */
  pendingAnchorTexts: string[]
  journalCount: number
  photoCount: number
}

export type MetadataTone = 'focus' | 'emotion' | 'weather' | 'body' | 'anchor' | 'memory'

/** 元数据条 chip（Day One 式：紧凑、只读、本地） */
export interface MetadataChip {
  key: 'focus' | 'emotion' | 'weather' | 'body' | 'anchor' | 'photo' | 'journal'
  icon: string
  label: string
  value: string
  tone: MetadataTone
}

export type SuggestionPriority = 'high' | 'medium' | 'low'

/** 建议卡（Apple Journal 式：数据驱动的书写入口） */
export interface SuggestionCard {
  id: string
  icon: string
  title: string
  hint: string
  /** 点选后预填进手札编辑区的脚手架文本 */
  prefill: string
  type: JournalType
  priority: SuggestionPriority
  source: 'focus' | 'emotion' | 'body' | 'anchor' | 'memory' | 'empty'
}

export const SUGGESTION_LIMIT = 4

const PRIORITY_RANK: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 }

const EMOTION_ICONS: Record<EmotionType, string> = EMOTION_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.type]: o.icon }),
  {} as Record<EmotionType, string>,
)

// ---- 纯函数 ----

/** 把毫秒时长格式化为「X 分钟 / X 小时 Y 分」 */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} 小时` : `${h} 小时 ${rest} 分`
}

/** 空信号（无任何当日数据时的基线） */
export function emptyDaySignals(date: string): DaySignals {
  return {
    date,
    focusMinutes: 0,
    focusCount: 0,
    emotionCount: 0,
    dominantEmotion: null,
    weather: null,
    exerciseMinutes: 0,
    exerciseCount: 0,
    exerciseCalories: 0,
    anchorTotal: 0,
    anchorDone: 0,
    pendingAnchorTexts: [],
    journalCount: 0,
    photoCount: 0,
  }
}

/**
 * 汇总当日运行数据。
 * 时间戳一律走本地日历键，避免 UTC 偏移把凌晨记录算到前一天。
 */
export function collectDaySignals(input: DaySignalsInput): DaySignals {
  const { date } = input

  const focusToday = input.focusSessions.filter(s => {
    const at = s.completedAt ?? s.startedAt
    if (!at || s.status !== 'completed') return false
    return getLocalDateKey(new Date(at)) === date
  })
  const focusMinutes = focusToday.reduce((sum, s) => sum + (s.elapsed || 0), 0) / 60000

  const emotionToday = input.emotionRecords.filter(
    r => getLocalDateKey(new Date(r.createdAt)) === date,
  )
  const emotionCounts: Record<string, number> = {}
  for (const r of emotionToday) {
    emotionCounts[r.type] = (emotionCounts[r.type] || 0) + 1
  }
  const dominantEmotion =
    (Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] as EmotionType | undefined) ??
    null
  const weather = (emotionToday.find(r => r.weather)?.weather ?? null) as EmotionWeather | null

  const exerciseToday = input.exerciseRecords.filter(r => r.date === date)
  const exerciseMinutes = exerciseToday.reduce((sum, r) => sum + (r.duration || 0), 0)
  const exerciseCalories = exerciseToday.reduce((sum, r) => sum + (r.calories || 0), 0)

  const anchorToday = input.anchors.filter(
    a => a.targetDate === date && (a.stage ?? 'active') === 'active',
  )
  const anchorDone = anchorToday.filter(a => a.done).length
  const pendingAnchorTexts = anchorToday.filter(a => !a.done).map(a => a.text)

  const journalCount = input.journals.filter(
    j => getLocalDateKey(new Date(j.createdAt)) === date,
  ).length

  const photoCount = input.photos
    .filter(p => p.date === date)
    .reduce((sum, p) => sum + (p.images?.length || 0), 0)

  return {
    date,
    focusMinutes: Math.round(focusMinutes),
    focusCount: focusToday.length,
    emotionCount: emotionToday.length,
    dominantEmotion,
    weather,
    exerciseMinutes,
    exerciseCount: exerciseToday.length,
    exerciseCalories,
    anchorTotal: anchorToday.length,
    anchorDone,
    pendingAnchorTexts,
    journalCount,
    photoCount,
  }
}

/** 由信号生成元数据条 chips（仅呈现有数据的维度） */
export function buildMetadataBar(signals: DaySignals): MetadataChip[] {
  const chips: MetadataChip[] = []

  if (signals.focusMinutes > 0) {
    chips.push({ key: 'focus', icon: '⏳', label: '专注', value: formatMinutes(signals.focusMinutes), tone: 'focus' })
  }
  if (signals.emotionCount > 0 && signals.dominantEmotion) {
    chips.push({
      key: 'emotion',
      icon: EMOTION_ICONS[signals.dominantEmotion] ?? '🌸',
      label: EMOTION_FLOWERS[signals.dominantEmotion].label,
      value: `${signals.emotionCount} 次`,
      tone: 'emotion',
    })
  }
  if (signals.weather) {
    const w = WEATHER_OPTIONS.find(o => o.type === signals.weather)
    if (w) chips.push({ key: 'weather', icon: w.icon, label: '天气', value: w.label, tone: 'weather' })
  }
  if (signals.exerciseMinutes > 0) {
    chips.push({ key: 'body', icon: '🏃', label: '运动', value: `${signals.exerciseMinutes} 分`, tone: 'body' })
  }
  if (signals.anchorTotal > 0) {
    chips.push({
      key: 'anchor',
      icon: '⚓',
      label: '心锚',
      value: `${signals.anchorDone}/${signals.anchorTotal}`,
      tone: 'anchor',
    })
  }
  if (signals.photoCount > 0) {
    chips.push({ key: 'photo', icon: '📷', label: '照片', value: `${signals.photoCount} 张`, tone: 'memory' })
  }
  if (signals.journalCount > 0) {
    chips.push({ key: 'journal', icon: '📝', label: '手札', value: `${signals.journalCount} 篇`, tone: 'memory' })
  }

  return chips
}

/** 由信号生成建议卡（高优先在前，最多 SUGGESTION_LIMIT 张） */
export function generateSuggestionCards(signals: DaySignals): SuggestionCard[] {
  const cards: SuggestionCard[] = []

  // 全空日：没有任何运行数据，交给末尾的 empty-day 兜底卡，避免与 first-journal 重复
  const isSilentDay =
    signals.focusMinutes === 0 &&
    signals.emotionCount === 0 &&
    signals.exerciseMinutes === 0 &&
    signals.anchorTotal === 0 &&
    signals.photoCount === 0

  // 1. 今天还没写手札 —— 最高优先的零输入成本入口
  if (signals.journalCount === 0 && !isSilentDay) {
    cards.push({
      id: 'first-journal',
      icon: '📝',
      title: '今天还没有手札',
      hint: '用「今日三件事」起个头，写下最先想到的',
      prefill: '今日三件事：\n① \n② \n③ ',
      type: 'diary',
      priority: 'high',
      source: 'memory',
    })
  }

  // 2. 专注复盘
  if (signals.focusMinutes >= 30) {
    cards.push({
      id: 'focus-review',
      icon: '⏳',
      title: `今天专注了 ${formatMinutes(signals.focusMinutes)}`,
      hint: `${signals.focusCount} 段专注 · 趁记忆还热，记一笔心得`,
      prefill: `今日专注 ${formatMinutes(signals.focusMinutes)}（${signals.focusCount} 段）\n· 状态最好的一段：\n· 卡住的地方：\n· 明天想调整：`,
      type: 'review',
      priority: 'high',
      source: 'focus',
    })
  }

  // 3. 情绪记录
  if (signals.emotionCount > 0 && signals.dominantEmotion) {
    const label = EMOTION_FLOWERS[signals.dominantEmotion].label
    cards.push({
      id: 'emotion-note',
      icon: EMOTION_ICONS[signals.dominantEmotion] ?? '🌸',
      title: `今天情绪多为「${label}」`,
      hint: `${signals.emotionCount} 次记录 · 写下触发它的事`,
      prefill: `今日情绪：${label}（${signals.emotionCount} 次）\n· 触发它的事：\n· 它想告诉我：`,
      type: 'diary',
      priority: 'medium',
      source: 'emotion',
    })
  }

  // 4. 运动身体感
  if (signals.exerciseMinutes > 0) {
    cards.push({
      id: 'body-note',
      icon: '🏃',
      title: `今天运动了 ${signals.exerciseMinutes} 分钟`,
      hint: `约消耗 ${signals.exerciseCalories} 千卡 · 记录身体的感觉`,
      prefill: `今日运动 ${signals.exerciseMinutes} 分钟 · 约 ${signals.exerciseCalories} 千卡\n· 身体的感觉：\n· 运动后的心情：`,
      type: 'insight',
      priority: 'medium',
      source: 'body',
    })
  }

  // 5. 未完成心锚复盘
  if (signals.anchorTotal > 0 && signals.anchorDone < signals.anchorTotal) {
    const pending = signals.pendingAnchorTexts
      .slice(0, 3)
      .map(t => `· ${t}`)
      .join('\n')
    cards.push({
      id: 'anchor-pending',
      icon: '⚓',
      title: `还有 ${signals.anchorTotal - signals.anchorDone} 个心锚未完成`,
      hint: '复盘一下卡在哪里，给明天留条路',
      prefill: `今日心锚 ${signals.anchorDone}/${signals.anchorTotal}\n未完成：\n${pending}\n· 卡点：\n· 明日计划：`,
      type: 'review',
      priority: 'medium',
      source: 'anchor',
    })
  }

  // 6. 心锚全部完成 —— 感恩
  if (signals.anchorTotal > 0 && signals.anchorDone === signals.anchorTotal) {
    cards.push({
      id: 'anchor-done',
      icon: '✅',
      title: '今日心锚全部完成',
      hint: '值得为这一刻记一笔感恩',
      prefill: `今日心锚 ${signals.anchorDone}/${signals.anchorTotal} 全部完成 ✅\n· 最想感谢的一件事：\n· 今天做对了什么：`,
      type: 'gratitude',
      priority: 'medium',
      source: 'anchor',
    })
  }

  // 7. 照片配文
  if (signals.photoCount > 0) {
    cards.push({
      id: 'photo-caption',
      icon: '📷',
      title: `今天拍了 ${signals.photoCount} 张照片`,
      hint: '为这些画面配一句话',
      prefill: `今日照片 ${signals.photoCount} 张\n· 这一天的画面：\n· 当时在想什么：`,
      type: 'diary',
      priority: 'low',
      source: 'memory',
    })
  }

  // 8. 全空兜底 —— 仍然给一个开始
  if (cards.length === 0) {
    cards.push({
      id: 'empty-day',
      icon: '🌱',
      title: '今天还很安静',
      hint: '没有运行数据也可以写，记录一个瞬间就够',
      prefill: '此刻最想记下的一件事：\n\n它为什么值得记：',
      type: 'diary',
      priority: 'low',
      source: 'empty',
    })
  }

  return cards
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .slice(0, SUGGESTION_LIMIT)
}

// ---- 组合式 ----

/**
 * 手札上下文：聚合当日运行数据，产出元数据条 + 建议卡。
 * @param anchors 当日心锚（由宿主视图注入，保持响应式）
 */
export function useJournalContext(anchors: Ref<Anchor[]>) {
  const { records: emotionRecords, load: loadEmotions } = useEmotionGarden()
  const { getRecords } = useExerciseTracker()
  const { entries: photoEntries, load: loadPhotos } = usePhotoDiary()
  const { getAll: getAllJournals, load: loadJournals } = useAnchorJournal()

  const signals = ref<DaySignals>(emptyDaySignals(getLocalDateKey()))

  function refresh(): void {
    loadEmotions()
    loadPhotos()
    loadJournals()
    signals.value = collectDaySignals({
      date: getLocalDateKey(),
      focusSessions: getAllSessions(),
      emotionRecords: emotionRecords.value,
      exerciseRecords: getRecords({}),
      anchors: anchors.value,
      journals: getAllJournals(),
      photos: photoEntries.value,
    })
  }

  const metadataBar = computed(() => buildMetadataBar(signals.value))
  const suggestions = computed(() => generateSuggestionCards(signals.value))

  return { signals, metadataBar, suggestions, refresh }
}
