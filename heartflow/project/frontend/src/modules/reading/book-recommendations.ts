// ============================================================
// 阅览殿 · 书籍推荐引擎
// 基于阅读历史、标签、评分、偏好的智能推荐
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { Book } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 推荐来源 */
export type RecommendationSource =
  | 'similar_book'        // 相似书籍
  | 'same_author'         // 同作者
  | 'same_topic'          // 同主题
  | 'reading_history'     // 阅读历史
  | 'rating_based'        // 基于评分
  | 'trending'            // 热门推荐
  | 'completion_series'   // 系列补全
  | 'custom'              // 自定义

/** 推荐理由 */
export interface RecommendationReason {
  /** 主要理由 */
  primary: string
  /** 详细理由 */
  detail: string
  /** 匹配度评分 0-100 */
  matchScore: number
  /** 匹配标签 */
  matchedTags: string[]
  /** 来源类型 */
  source: RecommendationSource
}

/** 书籍推荐 */
export interface BookRecommendation {
  /** 推荐ID */
  id: string
  /** 推荐书名 */
  title: string
  /** 作者 */
  author: string
  /** 封面 */
  cover?: string
  /** 简介 */
  description: string
  /** 推荐理由 */
  reason: RecommendationReason
  /** 预计阅读时间（分钟） */
  estimatedReadingTime: number
  /** 难度等级 1-5 */
  difficulty: number
  /** 标签 */
  tags: string[]
  /** 推荐时间 */
  timestamp: string
}

/** 阅读偏好 */
export interface ReadingPreference {
  /** 偏好标签及其权重 */
  preferredTags: { tag: string; weight: number }[]
  /** 偏好作者 */
  preferredAuthors: { author: string; weight: number }[]
  /** 偏好难度 */
  preferredDifficulty: number
  /** 偏好书籍长度（页数） */
  preferredBookLength: 'short' | 'medium' | 'long' | 'any'
  /** 偏好时间段 */
  preferencesUpdatedAt: string
  /** 已排除的标签 */
  excludedTags: string[]
  /** 已排除的作者 */
  excludedAuthors: string[]
}

// ============================================================
// 存储键
// ============================================================

const RECOMMENDATIONS_KEY = 'hf:reading:recommendations'
const PREFERENCES_KEY = 'hf:reading:preferences'

// ============================================================
// 默认值
// ============================================================

function createDefaultPreferences(): ReadingPreference {
  return {
    preferredTags: [],
    preferredAuthors: [],
    preferredDifficulty: 3,
    preferredBookLength: 'medium',
    preferencesUpdatedAt: new Date().toISOString(),
    excludedTags: [],
    excludedAuthors: [],
  }
}

// ============================================================
// 辅助函数
// ============================================================

let counter = 0
function generateId(prefix: string): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}

/**
 * 计算标签相似度（Jaccard 系数）
 */
function tagSimilarity(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 && tagsB.length === 0) return 0
  const setA = new Set(tagsA.map(t => t.toLowerCase()))
  const setB = new Set(tagsB.map(t => t.toLowerCase()))
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * 计算评分相似度
 */
function ratingSimilarity(bookRating: number | undefined, userAvgRating: number): number {
  if (bookRating === undefined) return 0.5
  const diff = Math.abs(bookRating - userAvgRating)
  return Math.max(0, 1 - diff / 5)
}

/**
 * 计算作者亲和度
 */
function authorAffinity(author: string, preferredAuthors: { author: string; weight: number }[]): number {
  const found = preferredAuthors.find(a => a.author.toLowerCase() === author.toLowerCase())
  return found ? found.weight : 0.3
}

// ============================================================
// 书籍推荐引擎
// ============================================================

export function useBookRecommendations() {
  const recommendations = ref<BookRecommendation[]>(loadRecommendations())
  const preferences = ref<ReadingPreference>(loadPreferences())

  // ---- 持久化 ----

  function loadRecommendations(): BookRecommendation[] {
    try {
      return storage.getKV<BookRecommendation[]>(RECOMMENDATIONS_KEY, [])
    } catch { return [] }
  }

  function saveRecommendations() {
    storage.setKV(RECOMMENDATIONS_KEY, recommendations.value)
  }

  function loadPreferences(): ReadingPreference {
    try {
      const raw = storage.getKV<string>(PREFERENCES_KEY, '')
      return raw ? JSON.parse(raw) : createDefaultPreferences()
    } catch { return createDefaultPreferences() }
  }

  function savePreferences() {
    storage.setKV(PREFERENCES_KEY, JSON.stringify(preferences.value))
  }

  // ---- 偏好分析 ----

  /**
   * 从阅读历史中提取偏好
   */
  function extractPreferencesFromHistory(books: Book[]): ReadingPreference {
    const pref = createDefaultPreferences()

    // 分析标签偏好
    const tagWeights = new Map<string, { count: number; totalRating: number }>()
    const authorWeights = new Map<string, { count: number; totalRating: number }>()

    for (const book of books) {
      // 标签权重：阅读次数越多、评分越高，权重越大
      for (const tag of book.tags) {
        const existing = tagWeights.get(tag) || { count: 0, totalRating: 0 }
        existing.count++
        if (book.rating) existing.totalRating += book.rating
        tagWeights.set(tag, existing)
      }

      // 作者权重
      const existing = authorWeights.get(book.author) || { count: 0, totalRating: 0 }
      existing.count++
      if (book.rating) existing.totalRating += book.rating
      authorWeights.set(book.author, existing)
    }

    // 计算归一化权重
    const maxTagCount = Math.max(1, ...[...tagWeights.values()].map(v => v.count))
    pref.preferredTags = [...tagWeights.entries()]
      .map(([tag, data]) => ({
        tag,
        weight: Math.round(((data.count / maxTagCount) * 0.6 + (data.totalRating / (data.count * 5)) * 0.4) * 100) / 100,
      }))
      .sort((a, b) => b.weight - a.weight)

    const maxAuthorCount = Math.max(1, ...[...authorWeights.values()].map(v => v.count))
    pref.preferredAuthors = [...authorWeights.entries()]
      .map(([author, data]) => ({
        author,
        weight: Math.round(((data.count / maxAuthorCount) * 0.6 + (data.totalRating / (data.count * 5)) * 0.4) * 100) / 100,
      }))
      .sort((a, b) => b.weight - a.weight)

    // 偏好难度：按已读书籍
    const finishedBooks = books.filter(b => b.status === 'finished' && b.rating)
    if (finishedBooks.length > 0) {
      const avgRating = finishedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / finishedBooks.length
      // 高评分书籍指向用户偏好的难度
      pref.preferredDifficulty = avgRating >= 4 ? 4 : avgRating >= 3 ? 3 : 2
    }

    // 偏好书籍长度
    const avgPages = books.length > 0
      ? books.reduce((sum, b) => sum + b.totalPages, 0) / books.length
      : 300
    if (avgPages < 200) pref.preferredBookLength = 'short'
    else if (avgPages < 500) pref.preferredBookLength = 'medium'
    else if (avgPages < 800) pref.preferredBookLength = 'long'
    else pref.preferredBookLength = 'any'

    pref.preferencesUpdatedAt = new Date().toISOString()
    return pref
  }

  // ---- 推荐生成 ----

  /**
   * 生成综合推荐
   * @param userBooks 用户已有书籍
   * @param candidateBooks 候选书籍（外部书库）
   * @param count 推荐数量
   */
  function generateRecommendations(
    userBooks: Book[],
    candidateBooks: Book[],
    count: number = 10,
  ): BookRecommendation[] {
    const pref = preferences.value
    const results: BookRecommendation[] = []

    // 获取用户已读/在读的书籍 ID 和作者
    const userBookIds = new Set(userBooks.map(b => b.id))
    const userBookTitles = new Set(userBooks.map(b => b.title.toLowerCase()))
    const userTags = new Set(userBooks.flatMap(b => b.tags.map(t => t.toLowerCase())))
    const userAvgRating = userBooks.filter(b => b.rating).length > 0
      ? userBooks.filter(b => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) / userBooks.filter(b => b.rating).length
      : 3

    // 标记已读作者（用于系列补全推荐）
    const finishedBooks = userBooks.filter(b => b.status === 'finished')
    const finishedAuthors = new Set(finishedBooks.map(b => b.author.toLowerCase()))

    for (const candidate of candidateBooks) {
      // 跳过用户已有的书
      if (userBookIds.has(candidate.id) || userBookTitles.has(candidate.title.toLowerCase())) continue
      // 跳过排除的标签
      if (candidate.tags.some(t => pref.excludedTags.map(et => et.toLowerCase()).includes(t.toLowerCase()))) continue
      // 跳过排除的作者
      if (pref.excludedAuthors.map(ea => ea.toLowerCase()).includes(candidate.author.toLowerCase())) continue

      // 计算推荐分数
      const tagSim = tagSimilarity(candidate.tags, [...userTags])
      const ratingSim = ratingSimilarity(candidate.rating, userAvgRating)
      const authorAff = authorAffinity(candidate.author, pref.preferredAuthors)

      // 综合匹配分数
      const matchScore = Math.round(
        (tagSim * 0.4 + ratingSim * 0.2 + authorAff * 0.3 + 0.1) * 100,
      )

      // 确定推荐来源
      let source: RecommendationSource = 'similar_book'
      let primaryReason = ''
      let detailReason = ''

      if (authorAff > 0.6 && finishedAuthors.has(candidate.author.toLowerCase())) {
        source = 'completion_series'
        primaryReason = '系列补全'
        detailReason = `你已阅读过 ${candidate.author} 的作品，这本书可能是一个系列的延续`
      } else if (authorAff > 0.5) {
        source = 'same_author'
        primaryReason = '同作者相关'
        detailReason = `基于你对 ${candidate.author} 的阅读偏好`
      } else if (tagSim > 0.5) {
        source = 'same_topic'
        primaryReason = '同主题相关'
        const matchedTags = candidate.tags.filter(t => userTags.has(t.toLowerCase()))
        detailReason = `与你感兴趣的 "${matchedTags.slice(0, 3).join('、')}" 主题高度相关`
      } else if (ratingSim > 0.8) {
        source = 'rating_based'
        primaryReason = '评分匹配'
        detailReason = `与你高评分书籍风格相近`
      } else {
        source = 'reading_history'
        primaryReason = '阅读偏好相关'
        detailReason = '依据你过往的阅读记录综合排序，是否感兴趣由你判断'
      }

      const matchedTags = candidate.tags.filter(t => userTags.has(t.toLowerCase()))

      results.push({
        id: generateId('rec'),
        title: candidate.title,
        author: candidate.author,
        cover: candidate.cover,
        description: candidate.review || `${candidate.title} - ${candidate.author}`,
        reason: {
          primary: primaryReason,
          detail: detailReason,
          matchScore: Math.min(100, matchScore),
          matchedTags,
          source,
        },
        estimatedReadingTime: candidate.totalPages > 0
          ? Math.round(candidate.totalPages / 2) // 假设平均 2 分钟/页
          : 0,
        difficulty: candidate.tags.some(t => t.toLowerCase().includes('入门') || t.toLowerCase().includes('基础'))
          ? 2 : candidate.tags.some(t => t.toLowerCase().includes('进阶') || t.toLowerCase().includes('专业'))
            ? 4 : 3,
        tags: candidate.tags,
        timestamp: new Date().toISOString(),
      })
    }

    // 按匹配分数排序
    results.sort((a, b) => b.reason.matchScore - a.reason.matchScore)

    const topResults = results.slice(0, count)
    recommendations.value = topResults
    saveRecommendations()

    return topResults
  }

  /**
   * 获取相似书籍推荐
   */
  function getSimilarBooks(
    sourceBook: Book,
    candidateBooks: Book[],
    count: number = 5,
  ): BookRecommendation[] {
    const sourceTags = new Set(sourceBook.tags.map(t => t.toLowerCase()))
    const results: BookRecommendation[] = []

    for (const candidate of candidateBooks) {
      if (candidate.id === sourceBook.id) continue
      if (candidate.title.toLowerCase() === sourceBook.title.toLowerCase()) continue

      const tagSim = tagSimilarity(candidate.tags, [...sourceTags])
      if (tagSim < 0.3) continue

      const matchedTags = candidate.tags.filter(t => sourceTags.has(t.toLowerCase()))

      results.push({
        id: generateId('sim_rec'),
        title: candidate.title,
        author: candidate.author,
        cover: candidate.cover,
        description: candidate.review || `${candidate.title} - ${candidate.author}`,
        reason: {
          primary: '相似书籍',
          detail: `与《${sourceBook.title}》在 "${matchedTags.slice(0, 3).join('、')}" 方面相似`,
          matchScore: Math.round(tagSim * 100),
          matchedTags,
          source: 'similar_book',
        },
        estimatedReadingTime: candidate.totalPages > 0
          ? Math.round(candidate.totalPages / 2)
          : 0,
        difficulty: 3,
        tags: candidate.tags,
        timestamp: new Date().toISOString(),
      })
    }

    results.sort((a, b) => b.reason.matchScore - a.reason.matchScore)
    return results.slice(0, count)
  }

  /**
   * 获取同作者推荐
   */
  function getAuthorRecommendations(
    author: string,
    userBooks: Book[],
    candidateBooks: Book[],
    count: number = 5,
  ): BookRecommendation[] {
    const userBookTitles = new Set(userBooks.map(b => b.title.toLowerCase()))
    const results: BookRecommendation[] = []

    for (const candidate of candidateBooks) {
      if (candidate.author.toLowerCase() !== author.toLowerCase()) continue
      if (userBookTitles.has(candidate.title.toLowerCase())) continue

      results.push({
        id: generateId('author_rec'),
        title: candidate.title,
        author: candidate.author,
        cover: candidate.cover,
        description: candidate.review || `${candidate.title} - ${candidate.author}`,
        reason: {
          primary: '同作者作品',
          detail: `${author} 的另一部作品，风格可能延续`,
          matchScore: 85,
          matchedTags: candidate.tags,
          source: 'same_author',
        },
        estimatedReadingTime: candidate.totalPages > 0
          ? Math.round(candidate.totalPages / 2)
          : 0,
        difficulty: 3,
        tags: candidate.tags,
        timestamp: new Date().toISOString(),
      })
    }

    return results.slice(0, count)
  }

  /**
   * 获取同主题推荐
   */
  function getTopicRecommendations(
    topic: string,
    userBooks: Book[],
    candidateBooks: Book[],
    count: number = 5,
  ): BookRecommendation[] {
    const userBookIds = new Set(userBooks.map(b => b.id))
    const results: BookRecommendation[] = []

    for (const candidate of candidateBooks) {
      if (userBookIds.has(candidate.id)) continue
      if (!candidate.tags.some(t => t.toLowerCase().includes(topic.toLowerCase()))) continue

      const matchedTags = candidate.tags.filter(t => t.toLowerCase().includes(topic.toLowerCase()))

      results.push({
        id: generateId('topic_rec'),
        title: candidate.title,
        author: candidate.author,
        cover: candidate.cover,
        description: candidate.review || `${candidate.title} - ${candidate.author}`,
        reason: {
          primary: '同主题相关',
          detail: `在 "${topic}" 主题下为你发现的优质书籍`,
          matchScore: Math.round(Math.min(95, 60 + tagSimilarity(candidate.tags, [topic]) * 40)),
          matchedTags,
          source: 'same_topic',
        },
        estimatedReadingTime: candidate.totalPages > 0
          ? Math.round(candidate.totalPages / 2)
          : 0,
        difficulty: 3,
        tags: candidate.tags,
        timestamp: new Date().toISOString(),
      })
    }

    results.sort((a, b) => b.reason.matchScore - a.reason.matchScore)
    return results.slice(0, count)
  }

  // ---- 偏好管理 ----

  /**
   * 更新阅读偏好
   */
  function updatePreferences(updates: Partial<ReadingPreference>): ReadingPreference {
    const current = preferences.value
    const updated: ReadingPreference = {
      ...current,
      ...updates,
      preferencesUpdatedAt: new Date().toISOString(),
    }
    preferences.value = updated
    savePreferences()
    return updated
  }

  /**
   * 从书籍数据自动更新偏好
   */
  function autoUpdatePreferences(books: Book[]): ReadingPreference {
    const extracted = extractPreferencesFromHistory(books)
    preferences.value = {
      ...extracted,
      excludedTags: preferences.value.excludedTags,
      excludedAuthors: preferences.value.excludedAuthors,
    }
    savePreferences()
    return preferences.value
  }

  /**
   * 排除某个标签（不再推荐包含此标签的书）
   */
  function excludeTag(tag: string): void {
    if (!preferences.value.excludedTags.includes(tag)) {
      preferences.value.excludedTags.push(tag)
      savePreferences()
    }
  }

  /**
   * 排除某个作者
   */
  function excludeAuthor(author: string): void {
    if (!preferences.value.excludedAuthors.includes(author)) {
      preferences.value.excludedAuthors.push(author)
      savePreferences()
    }
  }

  /**
   * 移除排除项
   */
  function removeExclusion(type: 'tag' | 'author', value: string): void {
    if (type === 'tag') {
      preferences.value.excludedTags = preferences.value.excludedTags.filter(t => t !== value)
    } else {
      preferences.value.excludedAuthors = preferences.value.excludedAuthors.filter(a => a !== value)
    }
    savePreferences()
  }

  // ---- 推荐管理 ----

  /** 清除所有推荐 */
  function clearRecommendations(): void {
    recommendations.value = []
    saveRecommendations()
  }

  /** 移除单条推荐 */
  function dismissRecommendation(recommendationId: string): boolean {
    const idx = recommendations.value.findIndex(r => r.id === recommendationId)
    if (idx < 0) return false
    recommendations.value.splice(idx, 1)
    saveRecommendations()
    return true
  }

  // ---- 推荐摘要 ----

  /** 推荐统计摘要 */
  const recommendationSummary = computed(() => {
    const recs = recommendations.value
    const bySource: Record<RecommendationSource, number> = {
      similar_book: 0,
      same_author: 0,
      same_topic: 0,
      reading_history: 0,
      rating_based: 0,
      trending: 0,
      completion_series: 0,
      custom: 0,
    }
    for (const r of recs) {
      bySource[r.reason.source] = (bySource[r.reason.source] || 0) + 1
    }
    return {
      total: recs.length,
      averageMatchScore: recs.length > 0
        ? Math.round(recs.reduce((sum, r) => sum + r.reason.matchScore, 0) / recs.length)
        : 0,
      bySource,
      topMatchedTags: [...new Set(recs.flatMap(r => r.reason.matchedTags))].slice(0, 10),
    }
  })

  return {
    // 状态
    recommendations: computed(() => recommendations.value),
    preferences: computed(() => preferences.value),

    // 计算属性
    recommendationSummary,

    // 推荐生成
    generateRecommendations,
    getSimilarBooks,
    getAuthorRecommendations,
    getTopicRecommendations,

    // 偏好管理
    updatePreferences,
    autoUpdatePreferences,
    extractPreferencesFromHistory,
    excludeTag,
    excludeAuthor,
    removeExclusion,

    // 推荐管理
    clearRecommendations,
    dismissRecommendation,
  }
}