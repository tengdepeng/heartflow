// ============================================================
// 字镜阁 · 文字分析引擎 + 间隔复习 + 写作辅助
// 蓝图：文字分析引擎、间隔复习、写作辅助
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import { getLocalDateKey } from '@/utils/time'
import type { WordEntry, ProficiencyLevel, TextAnalysis } from './types'

// ---- 词频分析 ----

export interface WordFrequencyResult {
  word: string
  count: number
  frequency: number // 0-1 频率占比
  isKnownWord: boolean
  knownWordId?: string
}

export interface SentenceAnalysis {
  text: string
  length: number
  pace: 'fast' | 'normal' | 'slow'
  complexity: number // 0-1 复杂度
  containsUnknownWords: boolean
}

export interface StyleAnalysis {
  /** 整体风格分类 */
  style: 'narrative' | 'descriptive' | 'argumentative' | 'lyrical' | 'conversational' | 'technical'
  /** 风格得分 */
  styleScore: number
  /** 词汇丰富度 0-1 */
  vocabularyRichness: number
  /** 平均句长 */
  avgSentenceLength: number
  /** 句长变化 0-1 */
  sentenceVariation: number
  /** 情感倾向 */
  sentiment: 'positive' | 'neutral' | 'negative'
  /** 情感强度 0-1 */
  sentimentIntensity: number
  /** 建议 */
  suggestions: string[]
}

// ---- 写作辅助 ----

export interface WritingPrompt {
  id: string
  type: 'daily' | 'themed' | 'reflection' | 'challenge' | 'vocabulary'
  title: string
  description: string
  /** 目标词汇 */
  targetWords?: string[]
  /** 难度 */
  difficulty: 'easy' | 'medium' | 'hard'
  /** 建议字数 */
  suggestedLength: number
  createdAt: string
}

export interface WritingRecord {
  id: string
  promptId?: string
  content: string
  wordCount: number
  usedWords: string[]
  newWords: string[]
  style: StyleAnalysis | null
  createdAt: string
  /** 写作时长（分钟） */
  duration: number
}

export interface WritingStats {
  totalRecords: number
  totalWordCount: number
  averageWordCount: number
  longestStreak: number
  currentStreak: number
  totalNewWords: number
  favoriteStyle: string
  lastRecordAt: string | null
}

// ---- 间隔复习 ----

export interface ReviewCard {
  wordId: string
  word: string
  definition: string
  proficiency: ProficiencyLevel
  /** 距上次复习天数 */
  daysSinceLastReview: number
  /** 是否到期 */
  due: boolean
  /** 紧急程度 0-1 */
  urgency: number
}

export interface ReviewSession {
  id: string
  cards: ReviewCard[]
  currentIndex: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
  startedAt: string
  completedAt?: string
  /** 本次复习的词汇 ID */
  wordIds: string[]
}

export interface ReviewStats {
  totalReviews: number
  todayReviewed: number
  dueCount: number
  averageAccuracy: number
  streak: number
  lastReviewDate: string | null
}

// ---- 存储键 ----

const TEXT_ANALYSIS_KEYS = {
  PROMPTS: 'hf:word_mirror:writing_prompts',
  RECORDS: 'hf:word_mirror:writing_records',
  REVIEWS: 'hf:word_mirror:review_sessions',
} as const

// ---- 艾宾浩斯遗忘曲线间隔 ----

const EBBINGHAUS_INTERVALS: Record<ProficiencyLevel, number[]> = {
  1: [1, 2, 4, 7, 15],           // 初识：1天/2天/4天/7天/15天
  2: [3, 7, 15, 30, 60],         // 了解：3天/7天/15天/30天/60天
  3: [7, 15, 30, 60, 120],       // 熟悉：7天/15天/30天/60天/120天
  4: [15, 30, 60, 120, 240],     // 熟练：15天/30天/60天/120天/240天
  5: [30, 60, 120, 240, 365],    // 精通：30天/60天/120天/240天/365天
}

// ---- 预设写作提示 ----

const DEFAULT_PROMPTS: Omit<WritingPrompt, 'id' | 'createdAt'>[] = [
  {
    type: 'daily',
    title: '今日三件事',
    description: '记录今天发生的三件重要事情，每件用2-3句话描述',
    difficulty: 'easy',
    suggestedLength: 150,
  },
  {
    type: 'themed',
    title: '假如时间是条河',
    description: '以"时间"为主题，写一段200字的短文',
    difficulty: 'medium',
    suggestedLength: 200,
  },
  {
    type: 'reflection',
    title: '最近学到的一个词',
    description: '选一个你最近学到的新词，用它写一段话，并解释你为什么喜欢这个词',
    targetWords: [],
    difficulty: 'medium',
    suggestedLength: 180,
  },
  {
    type: 'challenge',
    title: '一分钟速写',
    description: '设定一分钟计时，写下你脑海中浮现的任何内容，不要中断，不要修改',
    difficulty: 'hard',
    suggestedLength: 300,
  },
  {
    type: 'vocabulary',
    title: '生词故事',
    description: '用你最近学到的3个生词编一个简短的故事',
    targetWords: [],
    difficulty: 'hard',
    suggestedLength: 250,
  },
  {
    type: 'daily',
    title: '感恩记录',
    description: '写下今天让你感到感恩的三件事，描述它们为什么让你感恩',
    difficulty: 'easy',
    suggestedLength: 120,
  },
  {
    type: 'themed',
    title: '我心中的花园',
    description: '描述你理想中的一座花园，包含视觉、嗅觉、听觉的细节',
    difficulty: 'medium',
    suggestedLength: 220,
  },
  {
    type: 'reflection',
    title: '给未来自己的一封信',
    description: '想象一年后的自己，写一封信告诉他/她你现在的生活和想法',
    difficulty: 'medium',
    suggestedLength: 300,
  },
]

// ---- 情感词典 ----

const POSITIVE_WORDS = new Set([
  '好', '美', '快乐', '幸福', '喜欢', '热爱', '希望', '成功', '优秀', '精彩',
  '温暖', '阳光', '微笑', '感恩', '美好', '舒适', '满足', '期待', '喜悦', '完美',
  '棒', '赞', '厉害', '出色', '优秀', '灿烂', '辉煌', '杰出', '卓越', '非凡',
])

const NEGATIVE_WORDS = new Set([
  '坏', '痛', '悲伤', '难过', '失望', '失败', '糟糕', '讨厌', '痛苦', '黑暗',
  '寒冷', '孤独', '焦虑', '恐惧', '愤怒', '绝望', '疲惫', '沮丧', '空虚', '无聊',
  '差', '烦', '累', '苦', '恨', '惨', '糟', '烂', '荒', '废',
])

// ============================================================
// useTextAnalysisEngine
// ============================================================

export function useTextAnalysisEngine() {
  const analysisResult = ref<TextAnalysis | null>(null)
  const sentenceAnalysis = ref<SentenceAnalysis[]>([])

  /** 分析文本，返回词频、情绪、节奏、关联 */
  function analyze(text: string, knownWords: WordEntry[]): TextAnalysis {
    // 分词（简单基于标点+空格）
    const segments = segmentText(text)
    const wordFreq = computeWordFrequency(segments, knownWords)
    const mood = detectMood(segments)
    const wordPairs = findWordPairs(segments)
    const rhythm = analyzeRhythm(segments)
    const avgSpacing = segments.length > 1
      ? text.length / segments.length
      : text.length

    const result: TextAnalysis = {
      wordFreq: wordFreq.slice(0, 20), // 前20高频词
      mood,
      wordPairs: wordPairs.slice(0, 10),
      rhythm,
      avgSpacing: Math.round(avgSpacing * 100) / 100,
      avgSentenceLength: Math.round(segments.filter(s => s.length > 0).reduce((sum, s) => sum + s.length, 0) / Math.max(segments.filter(s => s.length > 0).length, 1)),
    }

    analysisResult.value = result
    return result
  }

  /** 分析句子级别的特征 */
  function analyzeSentences(text: string, knownWords: WordEntry[]): SentenceAnalysis[] {
    const sentences = text.split(/[。！？.!?\n]+/).filter(s => s.trim().length > 0)

    const results: SentenceAnalysis[] = sentences.map(sentence => {
      const trimmed = sentence.trim()
      const length = trimmed.length
      const words = segmentText(trimmed)
      const unknownCount = words.filter(w => !knownWords.some(kw => kw.word === w)).length

      // 判断节奏
      let pace: SentenceAnalysis['pace'] = 'normal'
      if (length < 15) pace = 'fast'
      else if (length > 50) pace = 'slow'

      // 复杂度
      const complexity = Math.min((length / 100) + (unknownCount / Math.max(words.length, 1)) * 0.5, 1)

      return {
        text: trimmed,
        length,
        pace,
        complexity: Math.round(complexity * 100) / 100,
        containsUnknownWords: unknownCount > 0,
      }
    })

    sentenceAnalysis.value = results
    return results
  }

  return { analysisResult, sentenceAnalysis, analyze, analyzeSentences }
}

// ============================================================
// useStyleAnalysis
// ============================================================

export function useStyleAnalysis() {
  const styleResult = ref<StyleAnalysis | null>(null)

  function analyzeStyle(text: string, _knownWords: WordEntry[]): StyleAnalysis {
    const sentences = text.split(/[。！？.!?\n]+/).filter(s => s.trim().length > 0)
    const words = segmentText(text)

    // 词汇丰富度
    const uniqueWords = new Set(words)
    const vocabularyRichness = Math.min(uniqueWords.size / Math.max(words.length, 1), 1)

    // 句长分析
    const lengths = sentences.map(s => s.trim().length)
    const avgSentenceLength = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1)
    const sentenceVariation = lengths.length > 1
      ? Math.min(
          (Math.max(...lengths) - Math.min(...lengths)) / Math.max(avgSentenceLength, 1),
          1,
        )
      : 0

    // 情感分析
    let positiveCount = 0
    let negativeCount = 0
    words.forEach(w => {
      if (POSITIVE_WORDS.has(w)) positiveCount++
      if (NEGATIVE_WORDS.has(w)) negativeCount++
    })
    const total = positiveCount + negativeCount
    let sentiment: StyleAnalysis['sentiment'] = 'neutral'
    let sentimentIntensity = 0
    if (total > 0) {
      sentimentIntensity = Math.min((positiveCount + negativeCount) / words.length * 5, 1)
      if (positiveCount > negativeCount * 1.5) sentiment = 'positive'
      else if (negativeCount > positiveCount * 1.5) sentiment = 'negative'
    }

    // 风格判断
    let style: StyleAnalysis['style'] = 'conversational'
    let styleScore = 0.5

    if (vocabularyRichness > 0.7 && avgSentenceLength > 30) {
      style = 'technical'
      styleScore = 0.8
    } else if (vocabularyRichness > 0.6 && sentenceVariation > 0.5) {
      style = 'narrative'
      styleScore = 0.75
    } else if (sentenceVariation < 0.3 && avgSentenceLength < 20) {
      style = 'conversational'
      styleScore = 0.6
    } else if (positiveCount + negativeCount > words.length * 0.1) {
      style = 'lyrical'
      styleScore = 0.7
    } else if (avgSentenceLength > 25 && vocabularyRichness > 0.5) {
      style = 'argumentative'
      styleScore = 0.7
    } else {
      style = 'descriptive'
      styleScore = 0.65
    }

    // 建议
    const suggestions: string[] = []
    if (vocabularyRichness < 0.3) suggestions.push('词汇丰富度较低，可以尝试使用更多不同的词汇')
    if (avgSentenceLength > 40) suggestions.push('句子较长，适当拆分可以提高可读性')
    if (avgSentenceLength < 10 && sentences.length > 5) suggestions.push('句子偏短，可以尝试合并一些短句')
    if (sentimentIntensity > 0.8) suggestions.push('情感表达强烈，注意控制节奏')

    const result: StyleAnalysis = {
      style,
      styleScore: Math.round(styleScore * 100) / 100,
      vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
      avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
      sentenceVariation: Math.round(sentenceVariation * 100) / 100,
      sentiment,
      sentimentIntensity: Math.round(sentimentIntensity * 100) / 100,
      suggestions,
    }

    styleResult.value = result
    return result
  }

  return { styleResult, analyzeStyle }
}

// ============================================================
// useSpacedRepetition
// ============================================================

export function useSpacedRepetition() {
  const reviewCards = ref<ReviewCard[]>([])
  const reviewSessions = ref<ReviewSession[]>([])
  const reviewStats = ref<ReviewStats>({
    totalReviews: 0,
    todayReviewed: 0,
    dueCount: 0,
    averageAccuracy: 0,
    streak: 0,
    lastReviewDate: null,
  })

  function loadSessions(): void {
    reviewSessions.value = storage.getKV<ReviewSession[]>(TEXT_ANALYSIS_KEYS.REVIEWS, []) || []
  }

  function saveSessions(): void {
    storage.setKV(TEXT_ANALYSIS_KEYS.REVIEWS, reviewSessions.value)
  }

  /** 生成待复习卡片 */
  function generateReviewCards(words: WordEntry[], today: Date = new Date()): ReviewCard[] {
    const cards: ReviewCard[] = []

    words.forEach(word => {
      const proficiency = word.proficiency
      const intervals = EBBINGHAUS_INTERVALS[proficiency]
      const lastReview = word.lastReviewedAt ? new Date(word.lastReviewedAt) : null
      const daysSinceLastReview = lastReview
        ? Math.floor((today.getTime() - lastReview.getTime()) / 86400000)
        : Infinity

      // 判断是否到期
      const reviewIndex = word.reviewCount % intervals.length
      const dueInDays = intervals[reviewIndex]
      const due = daysSinceLastReview >= dueInDays

      // 紧急程度
      const urgency = due
        ? Math.min(daysSinceLastReview / Math.max(dueInDays, 1), 1)
        : 0

      cards.push({
        wordId: word.id,
        word: word.word,
        definition: word.definition,
        proficiency,
        daysSinceLastReview: daysSinceLastReview === Infinity ? 999 : daysSinceLastReview,
        due,
        urgency: Math.round(urgency * 100) / 100,
      })
    })

    // 按紧急程度排序
    cards.sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1
      return b.urgency - a.urgency
    })

    reviewCards.value = cards
    return cards
  }

  /** 获取到期卡片 */
  function getDueCards(): ReviewCard[] {
    return reviewCards.value.filter(c => c.due)
  }

  /** 开始复习会话 */
  function startSession(words: WordEntry[], count: number = 10): ReviewSession {
    const cards = generateReviewCards(words)
    // 优先取到期卡片，不足则补充
    const dueCards = cards.filter(c => c.due)
    const sessionCards = [
      ...dueCards,
      ...cards.filter(c => !c.due),
    ].slice(0, count)

    const session: ReviewSession = {
      id: `review-${Date.now()}`,
      cards: sessionCards,
      currentIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      skippedCount: 0,
      startedAt: new Date().toISOString(),
      wordIds: sessionCards.map(c => c.wordId),
    }

    reviewSessions.value.push(session)
    saveSessions()
    return session
  }

  /** 记录答题结果 */
  function recordAnswer(
    sessionId: string,
    correct: boolean,
    skipped: boolean = false,
  ): ReviewSession | undefined {
    const session = reviewSessions.value.find(s => s.id === sessionId)
    if (!session) return undefined

    if (skipped) {
      session.skippedCount++
    } else if (correct) {
      session.correctCount++
    } else {
      session.incorrectCount++
    }

    session.currentIndex++

    if (session.currentIndex >= session.cards.length) {
      session.completedAt = new Date().toISOString()
    }

    saveSessions()
    return session
  }

  /** 更新统计 */
  function computeStats(today: Date = new Date()): ReviewStats {
    const todayStr = getLocalDateKey(today)

    const todaySessions = reviewSessions.value.filter(s =>
      getLocalDateKey(new Date(s.startedAt)) === todayStr,
    )

    const todayReviewed = todaySessions.reduce(
      (sum, s) => sum + s.correctCount + s.incorrectCount,
      0,
    )

    const allSessions = reviewSessions.value.filter(s => s.completedAt)
    const totalAnswers = allSessions.reduce(
      (sum, s) => sum + s.correctCount + s.incorrectCount,
      0,
    )
    const totalCorrect = allSessions.reduce((sum, s) => sum + s.correctCount, 0)

    const averageAccuracy = totalAnswers > 0
      ? Math.round((totalCorrect / totalAnswers) * 100) / 100
      : 0

    // 计算连续天数
    let streak = 0
    const reviewDates = new Set(
      reviewSessions.value.map(s => getLocalDateKey(new Date(s.startedAt))),
    )
    let checkDate = new Date(today)
    while (reviewDates.has(getLocalDateKey(checkDate))) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    const sortedDates = [...reviewDates].sort().reverse()
    const lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : null

    const stats: ReviewStats = {
      totalReviews: reviewSessions.value.length,
      todayReviewed,
      dueCount: getDueCards().length,
      averageAccuracy,
      streak,
      lastReviewDate,
    }

    reviewStats.value = stats
    return stats
  }

  return {
    reviewCards,
    reviewSessions,
    reviewStats,
    loadSessions,
    generateReviewCards,
    getDueCards,
    startSession,
    recordAnswer,
    computeStats,
  }
}

// ============================================================
// useWritingAssistant
// ============================================================

export function useWritingAssistant() {
  const prompts = ref<WritingPrompt[]>([])
  const records = ref<WritingRecord[]>([])

  function loadAll(): void {
    const storedPrompts = storage.getKV<WritingPrompt[]>(TEXT_ANALYSIS_KEYS.PROMPTS, [])
    if (storedPrompts && storedPrompts.length > 0) {
      prompts.value = storedPrompts
    } else {
      prompts.value = DEFAULT_PROMPTS.map(p => ({
        ...p,
        id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      }))
      savePrompts()
    }
    records.value = storage.getKV<WritingRecord[]>(TEXT_ANALYSIS_KEYS.RECORDS, []) || []
  }

  function savePrompts(): void {
    storage.setKV(TEXT_ANALYSIS_KEYS.PROMPTS, prompts.value)
  }

  function saveRecords(): void {
    storage.setKV(TEXT_ANALYSIS_KEYS.RECORDS, records.value)
  }

  /** 获取今日写作提示 */
  function getDailyPrompt(): WritingPrompt {
    const dailyPrompts = prompts.value.filter(p => p.type === 'daily')
    const today = getLocalDateKey()
    // 基于日期选择固定的提示
    const dayIndex = new Date(today).getDate() % dailyPrompts.length
    return dailyPrompts[dayIndex] || dailyPrompts[0]
  }

  /** 添加自定义提示 */
  function addPrompt(prompt: Omit<WritingPrompt, 'id' | 'createdAt'>): WritingPrompt {
    const newPrompt: WritingPrompt = {
      ...prompt,
      id: `prompt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    prompts.value.push(newPrompt)
    savePrompts()
    return newPrompt
  }

  /** 记录写作 */
  function recordWriting(
    content: string,
    knownWords: WordEntry[],
    promptId?: string,
    duration: number = 0,
  ): WritingRecord {
    const words = segmentText(content)
    const wordCount = words.length

    // 识别使用的已学词汇
    const usedWords = knownWords
      .filter(kw => words.some(w => w === kw.word))
      .map(kw => kw.word)

    // 识别新词汇
    const newWords = words.filter(
      w => !knownWords.some(kw => kw.word === w) && w.length >= 2,
    )

    const record: WritingRecord = {
      id: `writing-${Date.now()}`,
      promptId,
      content,
      wordCount,
      usedWords,
      newWords: [...new Set(newWords)],
      style: null,
      createdAt: new Date().toISOString(),
      duration,
    }

    records.value.push(record)
    saveRecords()
    return record
  }

  /** 获取写作统计 */
  function getWritingStats(): WritingStats {
    const sorted = [...records.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    const totalRecords = records.value.length
    const totalWordCount = records.value.reduce((sum, r) => sum + r.wordCount, 0)
    const averageWordCount = totalRecords > 0 ? Math.round(totalWordCount / totalRecords) : 0

    // 连续天数
    const dates = new Set(records.value.map(r => getLocalDateKey(new Date(r.createdAt))))
    let currentStreak = 0
    let longestStreak = 0
    let streakCount = 0
    const today = new Date()
    const checkDate = new Date(today)

    // 从今天开始往前计算连续天数
    while (dates.has(getLocalDateKey(checkDate))) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // 最长连续
    const sortedDates = [...dates].sort()
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        streakCount = 1
      } else {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000
        if (diffDays === 1) {
          streakCount++
        } else {
          longestStreak = Math.max(longestStreak, streakCount)
          streakCount = 1
        }
      }
    }
    longestStreak = Math.max(longestStreak, streakCount)

    const totalNewWords = records.value.reduce((sum, r) => sum + r.newWords.length, 0)

    // 最常用风格
    const styleCounts: Record<string, number> = {}
    records.value.forEach(r => {
      if (r.style) {
        styleCounts[r.style.style] = (styleCounts[r.style.style] || 0) + 1
      }
    })
    const favoriteStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '未知'

    return {
      totalRecords,
      totalWordCount,
      averageWordCount,
      longestStreak,
      currentStreak,
      totalNewWords,
      favoriteStyle,
      lastRecordAt: sorted.length > 0 ? sorted[0].createdAt : null,
    }
  }

  return {
    prompts,
    records,
    loadAll,
    getDailyPrompt,
    addPrompt,
    recordWriting,
    getWritingStats,
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 简单分词 */
function segmentText(text: string): string[] {
  // 按标点、空格、换行分割
  return text
    .split(/[，。！？、；：""''（）《》\s,.!?;:'"()\n\r]+/)
    .filter(w => w.length > 0)
}

/** 词频统计 */
function computeWordFrequency(
  segments: string[],
  _knownWords: WordEntry[],
): TextAnalysis['wordFreq'] {
  const freqMap = new Map<string, number>()
  segments.forEach(seg => {
    freqMap.set(seg, (freqMap.get(seg) || 0) + 1)
  })

  return [...freqMap.entries()]
    .map(([word, count]) => ({
      word,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

/** 检测情绪基调 */
function detectMood(segments: string[]): string {
  let positive = 0
  let negative = 0

  segments.forEach(seg => {
    if (POSITIVE_WORDS.has(seg)) positive++
    if (NEGATIVE_WORDS.has(seg)) negative++
  })

  if (positive > negative * 1.5) return '积极'
  if (negative > positive * 1.5) return '消极'
  if (positive > 0 && negative > 0) return '复杂'
  return '中性'
}

/** 寻找字间关联 */
function findWordPairs(segments: string[]): TextAnalysis['wordPairs'] {
  const pairs: TextAnalysis['wordPairs'] = []
  const seen = new Set<string>()

  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i]
    const b = segments[i + 1]
    if (a.length < 2 || b.length < 2) continue

    const key = `${a}:${b}`
    if (seen.has(key)) continue
    seen.add(key)

    // 简单判断关系
    let relation = 'co-occurrence'
    if (POSITIVE_WORDS.has(a) && POSITIVE_WORDS.has(b)) relation = 'positive-pair'
    else if (NEGATIVE_WORDS.has(a) && NEGATIVE_WORDS.has(b)) relation = 'negative-pair'
    else if (POSITIVE_WORDS.has(a) && NEGATIVE_WORDS.has(b)) relation = 'contrast'
    else if (NEGATIVE_WORDS.has(a) && POSITIVE_WORDS.has(b)) relation = 'contrast'

    pairs.push({ a, b, relation })
  }

  return pairs
}

/** 分析节奏 */
function analyzeRhythm(segments: string[]): TextAnalysis['rhythm'] {
  const result: TextAnalysis['rhythm'] = []
  let currentSegment = ''
  let currentPace: 'fast' | 'normal' | 'slow' = 'normal'

  for (const seg of segments) {
    let pace: 'fast' | 'normal' | 'slow' = 'normal'
    if (seg.length < 3) pace = 'fast'
    else if (seg.length > 6) pace = 'slow'

    if (pace !== currentPace && currentSegment) {
      result.push({ segment: currentSegment, pace: currentPace })
      currentSegment = seg
      currentPace = pace
    } else {
      currentSegment = currentSegment ? `${currentSegment}${seg}` : seg
      currentPace = pace
    }
  }

  if (currentSegment) {
    result.push({ segment: currentSegment, pace: currentPace })
  }

  return result
}