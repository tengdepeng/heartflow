// ============================================================
// 阅览殿 · 阅读挑战与笔记系统
// 阅读挑战 + 书评系统 + 阅读笔记增强
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { Book, ReadingStatus } from './types'

// ---- 类型定义 ----

/** 阅读挑战 */
export interface ReadingChallenge {
  id: string
  name: string
  description: string
  /** 挑战类型 */
  type: ChallengeType
  /** 目标数量 */
  target: number
  /** 当前进度 */
  progress: number
  /** 开始日期 */
  startDate: string
  /** 结束日期 */
  endDate: string
  /** 是否完成 */
  completed: boolean
  /** 完成日期 */
  completedAt?: string
  /** 奖励描述 */
  reward?: string
  /** 标签 */
  tags: string[]
}

/** 挑战类型 */
export type ChallengeType =
  | 'book_count'        // 阅读数量
  | 'page_count'        // 阅读页数
  | 'daily_streak'      // 连续天数
  | 'genre_explore'     // 类型探索
  | 'author_deep'       // 作者深度
  | 'classic_read'      // 经典阅读
  | 'custom'            // 自定义

/** 书评 */
export interface BookReview {
  id: string
  bookId: string
  bookTitle: string
  /** 评分 1-5 */
  rating: number
  /** 标题 */
  title: string
  /** 内容 */
  content: string
  /** 是否会剧透 */
  hasSpoiler: boolean
  /** 推荐指数 1-10 */
  recommendationScore: number
  /** 适合人群 */
  targetAudience: string[]
  /** 标签 */
  tags: string[]
  /** 阅读时间 */
  readingTime: string
  timestamp: string
}

/** 阅读笔记 */
export interface ReadingNote {
  id: string
  bookId: string
  chapter?: string
  page?: number
  /** 笔记内容 */
  content: string
  /** 笔记类型 */
  type: 'highlight' | 'thought' | 'question' | 'connection' | 'summary'
  /** 关联的摘录 */
  quoteId?: string
  /** 关联的其他笔记 */
  relatedNoteIds: string[]
  /** 颜色标记 */
  color?: string
  timestamp: string
}

/** 阅读统计 */
export interface ReadingStats {
  /** 总阅读量 */
  totalBooks: number
  /** 今年已读 */
  yearlyBooks: number
  /** 总阅读页数 */
  totalPages: number
  /** 总阅读时间（分钟） */
  totalReadingMinutes: number
  /** 平均评分 */
  averageRating: number
  /** 阅读速度（页/分钟） */
  readingSpeed: number
  /** 阅读状态分布 */
  statusDistribution: Record<ReadingStatus, number>
  /** 最爱作者 */
  favoriteAuthors: { author: string; count: number }[]
  /** 最爱标签 */
  favoriteTags: { tag: string; count: number }[]
  /** 阅读趋势（月度） */
  monthlyTrend: { month: string; books: number; pages: number }[]
  /** 最常阅读时段 */
  preferredReadingTime: string
  /** 当前挑战进度 */
  activeChallenges: ReadingChallenge[]
}

// ---- 元数据 ----

export const CHALLENGE_TYPE_META: Record<ChallengeType, { label: string; icon: string; desc: string }> = {
  book_count: { label: '数量挑战', icon: '📚', desc: '在指定时间内读完一定数量的书' },
  page_count: { label: '页数挑战', icon: '📄', desc: '在指定时间内阅读一定页数' },
  daily_streak: { label: '连续打卡', icon: '🔥', desc: '保持连续阅读天数' },
  genre_explore: { label: '类型探索', icon: '🧭', desc: '探索不同类型的书籍' },
  author_deep: { label: '作者深度', icon: '👤', desc: '深入阅读某位作者的作品' },
  classic_read: { label: '经典阅读', icon: '🏛️', desc: '阅读经典名著' },
  custom: { label: '自定义', icon: '🎯', desc: '自定义挑战目标' },
}

export const NOTE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  highlight: { label: '摘录', icon: '💡', color: '#f0c040' },
  thought: { label: '思考', icon: '💭', color: '#6b9fc4' },
  question: { label: '疑问', icon: '❓', color: '#cf8b6b' },
  connection: { label: '关联', icon: '🔗', color: '#b5707a' },
  summary: { label: '总结', icon: '📝', color: '#8a9a7a' },
}

// ---- 预设挑战 ----

const PRESET_CHALLENGES: Omit<ReadingChallenge, 'id' | 'progress' | 'completed' | 'completedAt'>[] = [
  {
    name: '年度阅读计划',
    description: '今年读完 24 本书',
    type: 'book_count',
    target: 24,
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString(),
    reward: '解锁"年度书虫"成就',
    tags: ['年度', '基础'],
  },
  {
    name: '每日阅读 30 分钟',
    description: '连续 30 天每天阅读至少 30 分钟',
    type: 'daily_streak',
    target: 30,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    reward: '解锁"恒心读者"成就',
    tags: ['日常', '习惯'],
  },
  {
    name: '类型探索者',
    description: '阅读 5 种不同类型的书籍',
    type: 'genre_explore',
    target: 5,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    reward: '解锁"博览群书"成就',
    tags: ['探索', '广度'],
  },
  {
    name: '经典之名',
    description: '阅读 3 本经典名著',
    type: 'classic_read',
    target: 3,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    reward: '解锁"经典传承者"成就',
    tags: ['经典', '深度'],
  },
  {
    name: '千页之旅',
    description: '阅读 1000 页',
    type: 'page_count',
    target: 1000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    reward: '解锁"翻页达人"成就',
    tags: ['页数', '短期'],
  },
]

// ---- 存储键 ----

const CHALLENGES_KEY = 'hf:reading:challenges'
const REVIEWS_KEY = 'hf:reading:reviews'
const NOTES_KEY = 'hf:reading:notes'

// ---- 响应式状态 ----

const challenges = ref<ReadingChallenge[]>(loadChallenges())
const reviews = ref<BookReview[]>(loadReviews())
const readingNotes = ref<ReadingNote[]>(loadNotes())

function loadChallenges(): ReadingChallenge[] {
  try {
    const saved = storage.getKV<ReadingChallenge[]>(CHALLENGES_KEY, [])
    if (saved.length === 0) {
      // 初始化预设挑战
      return PRESET_CHALLENGES.map((c, i) => ({
        ...c,
        id: `challenge_preset_${i}`,
        progress: 0,
        completed: false,
      }))
    }
    return saved
  } catch { return [] }
}

function loadReviews(): BookReview[] {
  try { return storage.getKV<BookReview[]>(REVIEWS_KEY, []) }
  catch { return [] }
}

function loadNotes(): ReadingNote[] {
  try { return storage.getKV<ReadingNote[]>(NOTES_KEY, []) }
  catch { return [] }
}

function persistChallenges() { storage.setKV(CHALLENGES_KEY, challenges.value) }
function persistReviews() { storage.setKV(REVIEWS_KEY, reviews.value) }
function persistNotes() { storage.setKV(NOTES_KEY, readingNotes.value) }

let counter = 0
function generateId(prefix: string): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}

// ---- 阅读挑战 ----

/**
 * 阅读挑战系统
 */
export function useReadingChallenges() {
  /** 获取所有挑战 */
  function getChallenges(): ReadingChallenge[] {
    return challenges.value
  }

  /** 获取活跃挑战 */
  function getActiveChallenges(): ReadingChallenge[] {
    return challenges.value.filter(c => !c.completed)
  }

  /** 获取已完成挑战 */
  function getCompletedChallenges(): ReadingChallenge[] {
    return challenges.value.filter(c => c.completed)
  }

  /** 创建挑战 */
  function createChallenge(
    name: string,
    type: ChallengeType,
    target: number,
    endDate: string,
    description: string,
    tags: string[] = [],
    reward?: string,
  ): ReadingChallenge {
    const challenge: ReadingChallenge = {
      id: generateId('challenge'),
      name,
      description,
      type,
      target,
      progress: 0,
      startDate: new Date().toISOString(),
      endDate,
      completed: false,
      reward,
      tags,
    }
    challenges.value.push(challenge)
    persistChallenges()
    return challenge
  }

  /** 更新挑战进度 */
  function updateProgress(challengeId: string, progress: number): boolean {
    const challenge = challenges.value.find(c => c.id === challengeId)
    if (!challenge) return false
    challenge.progress = Math.min(progress, challenge.target)
    if (challenge.progress >= challenge.target && !challenge.completed) {
      challenge.completed = true
      challenge.completedAt = new Date().toISOString()
    }
    persistChallenges()
    return true
  }

  /** 递增进度 */
  function incrementProgress(challengeId: string, amount: number = 1): boolean {
    const challenge = challenges.value.find(c => c.id === challengeId)
    if (!challenge) return false
    return updateProgress(challengeId, challenge.progress + amount)
  }

  /** 删除挑战 */
  function deleteChallenge(challengeId: string): boolean {
    const idx = challenges.value.findIndex(c => c.id === challengeId)
    if (idx < 0) return false
    challenges.value.splice(idx, 1)
    persistChallenges()
    return true
  }

  /** 根据阅读数据自动更新挑战 */
  function autoUpdateFromBooks(books: Book[]) {
    for (const challenge of challenges.value) {
      if (challenge.completed) continue

      switch (challenge.type) {
        case 'book_count':
          challenge.progress = books.filter(b => b.status === 'finished').length
          break
        case 'page_count':
          challenge.progress = books.reduce((sum, b) => sum + b.currentPage, 0)
          break
        case 'genre_explore':
          challenge.progress = new Set(books.map(b => b.tags).flat()).size
          break
      }

      if (challenge.progress >= challenge.target) {
        challenge.completed = true
        challenge.completedAt = new Date().toISOString()
      }
    }
    persistChallenges()
  }

  return {
    challenges: computed(() => challenges.value),
    getChallenges,
    getActiveChallenges,
    getCompletedChallenges,
    createChallenge,
    updateProgress,
    incrementProgress,
    deleteChallenge,
    autoUpdateFromBooks,
  }
}

// ---- 书评系统 ----

/**
 * 书评系统
 */
export function useBookReviews() {
  /** 获取所有书评 */
  function getReviews(): BookReview[] {
    return reviews.value
  }

  /** 获取某本书的书评 */
  function getReviewsForBook(bookId: string): BookReview[] {
    return reviews.value.filter(r => r.bookId === bookId)
  }

  /** 按评分筛选 */
  function getByRating(minRating: number, maxRating: number): BookReview[] {
    return reviews.value.filter(r => r.rating >= minRating && r.rating <= maxRating)
  }

  /** 创建书评 */
  function createReview(
    bookId: string,
    bookTitle: string,
    rating: number,
    title: string,
    content: string,
    options?: {
      hasSpoiler?: boolean
      recommendationScore?: number
      targetAudience?: string[]
      tags?: string[]
      readingTime?: string
    },
  ): BookReview {
    const review: BookReview = {
      id: generateId('review'),
      bookId,
      bookTitle,
      rating: Math.min(5, Math.max(1, rating)),
      title,
      content,
      hasSpoiler: options?.hasSpoiler ?? false,
      recommendationScore: options?.recommendationScore ?? Math.round(rating * 2),
      targetAudience: options?.targetAudience ?? [],
      tags: options?.tags ?? [],
      readingTime: options?.readingTime ?? '',
      timestamp: new Date().toISOString(),
    }
    reviews.value.unshift(review)
    persistReviews()
    return review
  }

  /** 更新书评 */
  function updateReview(reviewId: string, updates: Partial<BookReview>): boolean {
    const review = reviews.value.find(r => r.id === reviewId)
    if (!review) return false
    Object.assign(review, updates)
    persistReviews()
    return true
  }

  /** 删除书评 */
  function deleteReview(reviewId: string): boolean {
    const idx = reviews.value.findIndex(r => r.id === reviewId)
    if (idx < 0) return false
    reviews.value.splice(idx, 1)
    persistReviews()
    return true
  }

  /** 获取书评统计 */
  function getReviewStats(): {
    totalReviews: number
    averageRating: number
    ratingDistribution: Record<number, number>
    topRatedBooks: { bookId: string; bookTitle: string; averageRating: number }[]
  } {
    const totalReviews = reviews.value.length
    const avgRating = totalReviews > 0
      ? Math.round((reviews.value.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of reviews.value) {
      ratingDistribution[Math.round(r.rating)] = (ratingDistribution[Math.round(r.rating)] || 0) + 1
    }

    const bookRatings: Record<string, { bookTitle: string; total: number; count: number }> = {}
    for (const r of reviews.value) {
      if (!bookRatings[r.bookId]) bookRatings[r.bookId] = { bookTitle: r.bookTitle, total: 0, count: 0 }
      bookRatings[r.bookId].total += r.rating
      bookRatings[r.bookId].count++
    }
    const topRatedBooks = Object.entries(bookRatings)
      .map(([bookId, data]) => ({
        bookId,
        bookTitle: data.bookTitle,
        averageRating: Math.round((data.total / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10)

    return { totalReviews, averageRating: avgRating, ratingDistribution, topRatedBooks }
  }

  return {
    reviews: computed(() => reviews.value),
    getReviews,
    getReviewsForBook,
    getByRating,
    createReview,
    updateReview,
    deleteReview,
    getReviewStats,
  }
}

// ---- 阅读笔记增强 ----

/**
 * 阅读笔记系统
 */
export function useReadingNotes() {
  /** 获取所有笔记 */
  function getNotes(): ReadingNote[] {
    return readingNotes.value
  }

  /** 获取某本书的笔记 */
  function getNotesForBook(bookId: string): ReadingNote[] {
    return readingNotes.value.filter(n => n.bookId === bookId)
  }

  /** 按类型筛选 */
  function getNotesByType(type: ReadingNote['type']): ReadingNote[] {
    return readingNotes.value.filter(n => n.type === type)
  }

  /** 创建笔记 */
  function createNote(
    bookId: string,
    content: string,
    type: ReadingNote['type'],
    options?: {
      chapter?: string
      page?: number
      quoteId?: string
      color?: string
    },
  ): ReadingNote {
    const note: ReadingNote = {
      id: generateId('note'),
      bookId,
      content,
      type,
      chapter: options?.chapter,
      page: options?.page,
      quoteId: options?.quoteId,
      relatedNoteIds: [],
      color: options?.color,
      timestamp: new Date().toISOString(),
    }
    readingNotes.value.unshift(note)
    persistNotes()
    return note
  }

  /** 更新笔记 */
  function updateNote(noteId: string, updates: Partial<ReadingNote>): boolean {
    const note = readingNotes.value.find(n => n.id === noteId)
    if (!note) return false
    Object.assign(note, updates)
    persistNotes()
    return true
  }

  /** 关联笔记 */
  function linkNotes(noteId1: string, noteId2: string): boolean {
    const note1 = readingNotes.value.find(n => n.id === noteId1)
    const note2 = readingNotes.value.find(n => n.id === noteId2)
    if (!note1 || !note2) return false
    if (!note1.relatedNoteIds.includes(noteId2)) note1.relatedNoteIds.push(noteId2)
    if (!note2.relatedNoteIds.includes(noteId1)) note2.relatedNoteIds.push(noteId1)
    persistNotes()
    return true
  }

  /** 删除笔记 */
  function deleteNote(noteId: string): boolean {
    const idx = readingNotes.value.findIndex(n => n.id === noteId)
    if (idx < 0) return false
    readingNotes.value.splice(idx, 1)
    // 清理关联
    for (const note of readingNotes.value) {
      note.relatedNoteIds = note.relatedNoteIds.filter(id => id !== noteId)
    }
    persistNotes()
    return true
  }

  /** 获取笔记统计 */
  function getNoteStats(bookId?: string): {
    total: number
    typeDistribution: Record<string, number>
    notesWithConnections: number
  } {
    const notes = bookId ? readingNotes.value.filter(n => n.bookId === bookId) : readingNotes.value
    const typeDist: Record<string, number> = {}
    let withConnections = 0
    for (const n of notes) {
      typeDist[n.type] = (typeDist[n.type] || 0) + 1
      if (n.relatedNoteIds.length > 0) withConnections++
    }
    return { total: notes.length, typeDistribution: typeDist, notesWithConnections: withConnections }
  }

  return {
    notes: computed(() => readingNotes.value),
    getNotes,
    getNotesForBook,
    getNotesByType,
    createNote,
    updateNote,
    linkNotes,
    deleteNote,
    getNoteStats,
  }
}

// ---- 阅读统计仪表盘 ----

/**
 * 阅读统计仪表盘
 */
export function useReadingDashboard() {
  function computeReadingStats(
    books: Book[],
    activeChallenges: ReadingChallenge[],
  ): ReadingStats {
    const totalBooks = books.length
    const finishedBooks = books.filter(b => b.status === 'finished')
    const yearlyBooks = finishedBooks.filter(b => {
      const d = new Date(b.finishDate || '')
      return d.getFullYear() === new Date().getFullYear()
    }).length

    const totalPages = books.reduce((sum, b) => sum + b.currentPage, 0)
    const totalReadingMinutes = books.reduce((sum, b) => sum + b.totalReadingTime, 0)

    const ratedBooks = books.filter(b => b.rating !== undefined)
    const averageRating = ratedBooks.length > 0
      ? Math.round((ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length) * 10) / 10
      : 0

    const readingSpeed = totalReadingMinutes > 0
      ? Math.round((totalPages / totalReadingMinutes) * 10) / 10
      : 0

    // 状态分布
    const statusDistribution: Record<ReadingStatus, number> = {
      want_to_read: 0, reading: 0, finished: 0, abandoned: 0, rereading: 0,
    }
    for (const b of books) {
      statusDistribution[b.status] = (statusDistribution[b.status] || 0) + 1
    }

    // 最爱作者
    const authorCounts: Record<string, number> = {}
    for (const b of books) {
      authorCounts[b.author] = (authorCounts[b.author] || 0) + 1
    }
    const favoriteAuthors = Object.entries(authorCounts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 最爱标签
    const tagCounts: Record<string, number> = {}
    for (const b of books) {
      for (const t of b.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      }
    }
    const favoriteTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 月度趋势
    const monthlyTrend = generateMonthlyTrend(books)

    // 阅读时段
    const preferredReadingTime = '晚间'

    return {
      totalBooks,
      yearlyBooks,
      totalPages,
      totalReadingMinutes,
      averageRating,
      readingSpeed,
      statusDistribution,
      favoriteAuthors,
      favoriteTags,
      monthlyTrend,
      preferredReadingTime,
      activeChallenges,
    }
  }

  return {
    computeReadingStats,
  }
}

function generateMonthlyTrend(books: Book[]): { month: string; books: number; pages: number }[] {
  const now = new Date()
  const trend: { month: string; books: number; pages: number }[] = []

  for (let m = 11; m >= 0; m--) {
    const date = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthBooks = books.filter(b => {
      if (!b.finishDate) return false
      const d = new Date(b.finishDate)
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth()
    })
    trend.push({
      month: monthKey,
      books: monthBooks.filter(b => b.status === 'finished').length,
      pages: monthBooks.reduce((sum, b) => sum + b.currentPage, 0),
    })
  }

  return trend
}

// ---- 存储键 ----

export const READING_ADVANCED_STORAGE_KEYS = {
  CHALLENGES: CHALLENGES_KEY,
  REVIEWS: REVIEWS_KEY,
  NOTES: NOTES_KEY,
} as const