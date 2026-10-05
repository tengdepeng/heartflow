// ============================================================
// 阅览殿 · 殿堂引擎
// 阅读追踪、书籍管理、摘录、阅读目标
// ============================================================

import { ref } from 'vue'
import type { Book, BookQuote, ReadingSession, ReadingStatus, ReadingGoal } from './types'
import { READING_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'
import { saveBookContent, removeBookContent } from './book-content'

function generateId(): string {
  return `read_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadBooks(): Book[] {
  try { return JSON.parse(storage.getKV<string>(READING_STORAGE_KEYS.books, '[]')) } catch { return [] }
}
function saveBooks(data: Book[]) { storage.setKV(READING_STORAGE_KEYS.books, JSON.stringify(data)) }

function loadSessions(): ReadingSession[] {
  try { return JSON.parse(storage.getKV<string>(READING_STORAGE_KEYS.sessions, '[]')) } catch { return [] }
}
function saveSessions(data: ReadingSession[]) { storage.setKV(READING_STORAGE_KEYS.sessions, JSON.stringify(data)) }

function loadGoal(): ReadingGoal {
  try {
    const parsed = JSON.parse(storage.getKV<string>(READING_STORAGE_KEYS.goal, '{}'))
    return { yearlyTarget: 12, yearlyCompleted: 0, dailyTarget: 30, streak: 0, ...parsed }
  } catch { return { yearlyTarget: 12, yearlyCompleted: 0, dailyTarget: 30, streak: 0 } }
}
function saveGoal(data: ReadingGoal) { storage.setKV(READING_STORAGE_KEYS.goal, JSON.stringify(data)) }

const books = ref<Book[]>(loadBooks())
const sessions = ref<ReadingSession[]>(loadSessions())
const readingGoal = ref<ReadingGoal>(loadGoal())

function todayStr(): string { return new Date().toISOString().split('T')[0] }

export function useReadingHall() {
  // ---- 书籍管理 ----
  function addBook(title: string, author: string, totalPages: number, tags: string[] = [], cover?: string): Book {
    const book: Book = {
      id: generateId(), title, author, cover, totalPages,
      currentPage: 0, status: 'want_to_read', tags,
      quotes: [], totalReadingTime: 0,
    }
    books.value = [...books.value, book]
    saveBooks(books.value)
    return book
  }

  function updateBookStatus(id: string, status: ReadingStatus): boolean {
    const book = books.value.find(b => b.id === id)
    if (!book) return false
    book.status = status
    if (status === 'reading' && !book.startDate) book.startDate = todayStr()
    if (status === 'finished') book.finishDate = todayStr()
    books.value = [...books.value]
    saveBooks(books.value)
    return true
  }

  /**
   * 从一段文本建书（导入 .txt / 粘贴正文时使用）。
   * 按标题去重：同名书已存在则复用并更新其按书正文，避免重复书目。
   * 返回该书对象（含 id，可用于加载按书正文做续读）。
   */
  function addBookFromText(title: string, author: string, totalPages: number, text: string, tags: string[] = []): Book {
    const norm = title.trim()
    const existing = books.value.find(b => b.title.trim() === norm)
    if (existing) {
      saveBookContent(existing.id, text)
      existing.lastPosition = 0
      existing.lastChunkOffset = 0
      existing.lastChunkRatio = 0
      books.value = [...books.value]
      saveBooks(books.value)
      return existing
    }
    const book = addBook(norm, author, totalPages, tags)
    saveBookContent(book.id, text)
    return book
  }

  /** 记录续读位置（段落索引 + 段内句块偏移 + 句内进度，读↔听续接的词级精度） */
  function setBookProgress(id: string, position: number, chunkOffset = 0, chunkRatio = 0): boolean {
    const book = books.value.find(b => b.id === id)
    if (!book) return false
    book.lastPosition = Math.max(0, Math.floor(position))
    book.lastChunkOffset = Math.max(0, Math.floor(chunkOffset))
    book.lastChunkRatio = Math.min(1, Math.max(0, chunkRatio))
    books.value = [...books.value]
    saveBooks(books.value)
    return true
  }

  function addQuote(bookId: string, text: string, page?: number, chapter?: string, note?: string): BookQuote | undefined {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return undefined
    const quote: BookQuote = { id: generateId(), text, page, chapter, note, timestamp: new Date().toISOString() }
    book.quotes = [...book.quotes, quote]
    books.value = [...books.value]
    saveBooks(books.value)
    return quote
  }

  function rateBook(id: string, rating: number, review?: string): boolean {
    const book = books.value.find(b => b.id === id)
    if (!book) return false
    book.rating = Math.max(1, Math.min(5, rating))
    if (review) book.review = review
    books.value = [...books.value]
    saveBooks(books.value)
    return true
  }

  function getBooksByStatus(status: ReadingStatus): Book[] {
    return books.value.filter(b => b.status === status)
  }

  // ---- 阅读会话 ----
  function recordSession(bookId: string, startPage: number, endPage: number, duration: number, note?: string): ReadingSession | undefined {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return undefined
    const session: ReadingSession = {
      id: generateId(), bookId, startPage, endPage, duration, note,
      date: todayStr(), timestamp: new Date().toISOString(),
    }
    sessions.value = [...sessions.value, session]
    saveSessions(sessions.value)
    book.currentPage = endPage
    book.totalReadingTime += duration
    if (book.status === 'want_to_read') {
      book.status = 'reading'
      book.startDate = todayStr()
    }
    books.value = [...books.value]
    saveBooks(books.value)
    return session
  }

  function getReadingStats(): { totalBooks: number; finishedBooks: number; totalPages: number; totalTime: number; todayMinutes: number } {
    const today = todayStr()
    return {
      totalBooks: books.value.length,
      finishedBooks: books.value.filter(b => b.status === 'finished').length,
      totalPages: books.value.reduce((s, b) => s + b.currentPage, 0),
      totalTime: books.value.reduce((s, b) => s + b.totalReadingTime, 0),
      todayMinutes: sessions.value.filter(s => s.date === today).reduce((s, s2) => s + s2.duration, 0),
    }
  }

  // ---- 阅读目标 ----
  function updateGoal(updates: Partial<ReadingGoal>): void {
    readingGoal.value = { ...readingGoal.value, ...updates }
    saveGoal(readingGoal.value)
  }

  function getGoalProgress(): { yearlyProgress: number; dailyProgress: number; streak: number } {
    const finished = books.value.filter(b => b.status === 'finished').length
    const today = todayStr()
    const todayMinutes = sessions.value.filter(s => s.date === today).reduce((s, s2) => s + s2.duration, 0)
    return {
      yearlyProgress: Math.min(1, finished / (readingGoal.value.yearlyTarget || 1)),
      dailyProgress: Math.min(1, todayMinutes / (readingGoal.value.dailyTarget || 1)),
      streak: readingGoal.value.streak,
    }
  }

  function removeBook(id: string): boolean {
    const idx = books.value.findIndex(b => b.id === id)
    if (idx === -1) return false
    books.value = books.value.filter(b => b.id !== id)
    saveBooks(books.value)
    removeBookContent(id)
    return true
  }

  return {
    books, sessions, readingGoal,
    addBook, addBookFromText, updateBookStatus, addQuote, rateBook, getBooksByStatus,
    recordSession, getReadingStats, setBookProgress,
    updateGoal, getGoalProgress,
    removeBook,
  }
}