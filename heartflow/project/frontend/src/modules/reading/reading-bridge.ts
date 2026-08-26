// ============================================================
// Reading 桥接层
// 简化透传：直接暴露各 composable 的原始 API
// ============================================================

import { computed, ref } from 'vue'
import {
  useReadingHall,
  useReadingChallenges,
  useBookReviews,
  useReadingNotes,
  useReadingDashboard,
} from './index'
import type {
  Book,
  ReadingStatus,
  ReadingGoal,
  ReadingChallenge,
  BookReview,
  ReadingNote,
  ChallengeType,
} from './index'

// ---- 聚合类型 ----

export interface ReadingSummary {
  totalBooks: number
  finishedBooks: number
  readingBooks: number
  totalPages: number
  totalTimeMinutes: number
  todayMinutes: number
  goalProgress: { yearlyProgress: number; dailyProgress: number; streak: number } | null
  activeChallenges: number
  completedChallenges: number
  totalReviews: number
  averageRating: number
  totalNotes: number
}

export interface ReadingChallengeSummary {
  total: number
  active: number
  completed: number
  byType: Record<string, number>
  topProgress: ReadingChallenge[]
}

export interface ReadingNoteSummary {
  total: number
  typeDistribution: Record<string, number>
  notesWithConnections: number
}

// ---- 桥接 ----

export function useReadingBridge() {
  const hall = useReadingHall()
  const challenges = useReadingChallenges()
  const reviews = useBookReviews()
  const notes = useReadingNotes()
  const dashboard = useReadingDashboard()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const summary = computed<ReadingSummary>(() => {
    const stats = hall.getReadingStats()
    const goalProgress = hall.getGoalProgress()
    const activeChallenges = challenges.getActiveChallenges()
    const completedChallenges = challenges.getCompletedChallenges()
    const reviewStats = reviews.getReviewStats()

    return {
      totalBooks: stats.totalBooks,
      finishedBooks: stats.finishedBooks,
      readingBooks: hall.getBooksByStatus('reading').length,
      totalPages: stats.totalPages,
      totalTimeMinutes: stats.totalTime,
      todayMinutes: stats.todayMinutes,
      goalProgress,
      activeChallenges: activeChallenges.length,
      completedChallenges: completedChallenges.length,
      totalReviews: reviewStats.totalReviews,
      averageRating: reviewStats.averageRating,
      totalNotes: notes.getNotes().length,
    }
  })

  const challengeSummary = computed<ReadingChallengeSummary>(() => {
    const all = challenges.getChallenges()
    const byType: Record<string, number> = {}
    for (const c of all) {
      byType[c.type] = (byType[c.type] ?? 0) + 1
    }

    const topProgress = [...all]
      .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
      .slice(0, 5)

    return {
      total: all.length,
      active: challenges.getActiveChallenges().length,
      completed: challenges.getCompletedChallenges().length,
      byType,
      topProgress,
    }
  })

  const noteSummary = computed<ReadingNoteSummary>(() => {
    const stats = notes.getNoteStats()
    return {
      total: stats.total,
      typeDistribution: stats.typeDistribution as Record<string, number>,
      notesWithConnections: stats.notesWithConnections,
    }
  })

  const booksByStatus = computed<Record<ReadingStatus, Book[]>>(() => {
    const result: Record<string, Book[]> = {}
    const statuses: ReadingStatus[] = ['want_to_read', 'reading', 'finished', 'abandoned', 'rereading']
    for (const status of statuses) {
      result[status] = hall.getBooksByStatus(status)
    }
    return result as Record<ReadingStatus, Book[]>
  })

  // ---- 操作 ----

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      challenges.autoUpdateFromBooks(hall.books.value)
      await Promise.resolve()
    } finally {
      isLoading.value = false
    }
  }

  // 书籍
  function addBook(
    title: string,
    author: string,
    totalPages: number,
    tags?: string[],
    cover?: string,
  ): Book {
    return hall.addBook(title, author, totalPages, tags, cover)
  }

  function updateBookStatus(id: string, status: ReadingStatus): boolean {
    return hall.updateBookStatus(id, status)
  }

  function addQuote(bookId: string, text: string, page?: number, chapter?: string, note?: string) {
    return hall.addQuote(bookId, text, page, chapter, note)
  }

  function rateBook(id: string, rating: number, review?: string): boolean {
    return hall.rateBook(id, rating, review)
  }

  function recordSession(
    bookId: string,
    startPage: number,
    endPage: number,
    duration: number,
    note?: string,
  ) {
    return hall.recordSession(bookId, startPage, endPage, duration, note)
  }

  function removeBook(id: string): boolean {
    return hall.removeBook(id)
  }

  // 挑战
  function createChallenge(
    name: string,
    type: ChallengeType,
    target: number,
    endDate: string,
    description: string,
    tags?: string[],
    reward?: string,
  ): ReadingChallenge {
    return challenges.createChallenge(name, type, target, endDate, description, tags, reward)
  }

  function updateChallengeProgress(challengeId: string, progress: number): boolean {
    return challenges.updateProgress(challengeId, progress)
  }

  function incrementChallengeProgress(challengeId: string, amount?: number): boolean {
    return challenges.incrementProgress(challengeId, amount)
  }

  function deleteChallenge(challengeId: string): boolean {
    return challenges.deleteChallenge(challengeId)
  }

  // 书评
  function createReview(
    bookId: string,
    bookTitle: string,
    rating: number,
    title: string,
    content: string,
    options?: Record<string, unknown>,
  ): BookReview {
    return reviews.createReview(bookId, bookTitle, rating, title, content, options)
  }

  function updateReview(reviewId: string, updates: Partial<BookReview>): boolean {
    return reviews.updateReview(reviewId, updates)
  }

  function deleteReview(reviewId: string): boolean {
    return reviews.deleteReview(reviewId)
  }

  function getReviewsByRating(minRating: number, maxRating: number): BookReview[] {
    return reviews.getByRating(minRating, maxRating)
  }

  // 笔记
  function createNote(
    bookId: string,
    content: string,
    type: ReadingNote['type'],
    options?: Record<string, unknown>,
  ): ReadingNote {
    return notes.createNote(bookId, content, type, options)
  }

  function updateNote(noteId: string, updates: Partial<ReadingNote>): boolean {
    return notes.updateNote(noteId, updates)
  }

  function linkNotes(noteId1: string, noteId2: string): boolean {
    return notes.linkNotes(noteId1, noteId2)
  }

  function deleteNote(noteId: string): boolean {
    return notes.deleteNote(noteId)
  }

  function getNotesByType(type: ReadingNote['type']): ReadingNote[] {
    return notes.getNotesByType(type)
  }

  // 目标
  function updateGoal(updates: Partial<ReadingGoal>): void {
    hall.updateGoal(updates)
  }

  return {
    // 状态
    books: hall.books,
    sessions: hall.sessions,
    readingGoal: hall.readingGoal,
    isLoading,
    summary,
    challengeSummary,
    noteSummary,
    booksByStatus,
    // 操作
    initialize,
    addBook,
    updateBookStatus,
    addQuote,
    rateBook,
    recordSession,
    removeBook,
    createChallenge,
    updateChallengeProgress,
    incrementChallengeProgress,
    deleteChallenge,
    createReview,
    updateReview,
    deleteReview,
    getReviewsByRating,
    createNote,
    updateNote,
    linkNotes,
    deleteNote,
    getNotesByType,
    updateGoal,
    // 子模块直通
    hall,
    challenges,
    reviews,
    notes,
    dashboard,
  }
}