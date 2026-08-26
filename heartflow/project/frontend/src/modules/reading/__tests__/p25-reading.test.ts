// ============================================================
// 阅览殿 · 综合测试套件 (p25-reading)
// 覆盖所有 composable 核心方法、常量、边界条件
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- vi.hoisted: 共享 kvStore ----
const { kvStore, clearKV } = vi.hoisted(() => {
  const kvStore = new Map<string, any>()
  return { kvStore, clearKV: () => kvStore.clear() }
})

// ---- mock engine/storage ----
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, defaultValue: any) => {
      return kvStore.has(key) ? kvStore.get(key) : defaultValue
    }),
    setKV: vi.fn((key: string, value: any) => {
      kvStore.set(key, value)
    }),
  },
}))

// ---- 动态导入的函数引用 ----
let useReadingHall: any
let useReadingChallenges: any
let useBookReviews: any
let useReadingNotes: any
let useReadingDashboard: any
let useReadingHabits: any
let useReadingInsights: any
let useReadingSpeed: any
let useBookRecommendations: any
let READING_STATUS_META: any
let READING_STORAGE_KEYS: any
let CHALLENGE_TYPE_META: any
let NOTE_TYPE_META: any
let HABIT_TYPE_META: any

beforeEach(async () => {
  clearKV()
  vi.resetModules()

  const hallMod = await import('../hall')
  useReadingHall = hallMod.useReadingHall

  const challengesMod = await import('../challenges')
  useReadingChallenges = challengesMod.useReadingChallenges
  useBookReviews = challengesMod.useBookReviews
  useReadingNotes = challengesMod.useReadingNotes
  useReadingDashboard = challengesMod.useReadingDashboard
  CHALLENGE_TYPE_META = challengesMod.CHALLENGE_TYPE_META
  NOTE_TYPE_META = challengesMod.NOTE_TYPE_META

  const typesMod = await import('../types')
  READING_STATUS_META = typesMod.READING_STATUS_META
  READING_STORAGE_KEYS = typesMod.READING_STORAGE_KEYS

  const habitsMod = await import('../reading-habits')
  useReadingHabits = habitsMod.useReadingHabits
  HABIT_TYPE_META = habitsMod.HABIT_TYPE_META

  const insightsMod = await import('../reading-insights')
  useReadingInsights = insightsMod.useReadingInsights

  const speedMod = await import('../reading-speed')
  useReadingSpeed = speedMod.useReadingSpeed

  const recMod = await import('../book-recommendations')
  useBookRecommendations = recMod.useBookRecommendations
})

// ============================================================
// 1. 常量与类型验证
// ============================================================
describe('Constants and Types', () => {
  it('READING_STATUS_META should contain all 5 reading statuses', () => {
    const statuses = Object.keys(READING_STATUS_META)
    expect(statuses).toHaveLength(5)
    expect(statuses).toContain('want_to_read')
    expect(statuses).toContain('reading')
    expect(statuses).toContain('finished')
    expect(statuses).toContain('abandoned')
    expect(statuses).toContain('rereading')
  })

  it('READING_STATUS_META entries should have label, icon, color', () => {
    for (const status of Object.keys(READING_STATUS_META)) {
      const meta = READING_STATUS_META[status]
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('icon')
      expect(meta).toHaveProperty('color')
      expect(typeof meta.label).toBe('string')
      expect(typeof meta.icon).toBe('string')
      expect(typeof meta.color).toBe('string')
      expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('READING_STORAGE_KEYS should have books, sessions, goal keys', () => {
    expect(READING_STORAGE_KEYS.books).toBe('hf:reading:books')
    expect(READING_STORAGE_KEYS.sessions).toBe('hf:reading:sessions')
    expect(READING_STORAGE_KEYS.goal).toBe('hf:reading:goal')
  })

  it('CHALLENGE_TYPE_META should cover all 7 challenge types', () => {
    const types = Object.keys(CHALLENGE_TYPE_META)
    expect(types).toHaveLength(7)
    for (const t of types) {
      expect(CHALLENGE_TYPE_META[t]).toHaveProperty('label')
      expect(CHALLENGE_TYPE_META[t]).toHaveProperty('icon')
      expect(CHALLENGE_TYPE_META[t]).toHaveProperty('desc')
    }
  })

  it('HABIT_TYPE_META should cover all 9 habit types', () => {
    const types = Object.keys(HABIT_TYPE_META)
    expect(types).toHaveLength(9)
    expect(types).toContain('daily_reading')
    expect(types).toContain('custom')
  })

  it('NOTE_TYPE_META should cover all 5 note types', () => {
    const types = Object.keys(NOTE_TYPE_META)
    expect(types).toHaveLength(5)
    expect(types).toContain('highlight')
    expect(types).toContain('thought')
    expect(types).toContain('question')
    expect(types).toContain('connection')
    expect(types).toContain('summary')
  })
})

// ============================================================
// 2. useReadingHall
// ============================================================
describe('useReadingHall', () => {
  it('addBook should create a book with correct defaults', () => {
    const { addBook, books } = useReadingHall()
    const book = addBook('三国演义', '罗贯中', 800)

    expect(book.title).toBe('三国演义')
    expect(book.author).toBe('罗贯中')
    expect(book.totalPages).toBe(800)
    expect(book.currentPage).toBe(0)
    expect(book.status).toBe('want_to_read')
    expect(book.tags).toEqual([])
    expect(book.quotes).toEqual([])
    expect(book.totalReadingTime).toBe(0)
    expect(book.id).toMatch(/^read_/)
    expect(books.value).toHaveLength(1)
  })

  it('addBook should accept optional cover and tags', () => {
    const { addBook, books } = useReadingHall()
    const book = addBook('活着', '余华', 200, ['文学', '经典'], 'cover.jpg')

    expect(book.tags).toEqual(['文学', '经典'])
    expect(book.cover).toBe('cover.jpg')
    expect(books.value).toHaveLength(1)
  })

  it('updateBookStatus should update status and set startDate for reading', () => {
    const { addBook, updateBookStatus } = useReadingHall()
    const book = addBook('Test', 'Author', 100)
    expect(book.startDate).toBeUndefined()

    const result = updateBookStatus(book.id, 'reading')
    expect(result).toBe(true)

    const updated = useReadingHall().books.value[0]
    expect(updated.status).toBe('reading')
    expect(updated.startDate).toBeDefined()
    expect(updated.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('updateBookStatus should set finishDate for finished', () => {
    const { addBook, updateBookStatus } = useReadingHall()
    const book = addBook('Test', 'Author', 100)
    updateBookStatus(book.id, 'reading')
    const result = updateBookStatus(book.id, 'finished')
    expect(result).toBe(true)

    const updated = useReadingHall().books.value[0]
    expect(updated.status).toBe('finished')
    expect(updated.finishDate).toBeDefined()
    expect(updated.finishDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('updateBookStatus should return false for unknown book id', () => {
    const { updateBookStatus } = useReadingHall()
    const result = updateBookStatus('nonexistent', 'reading')
    expect(result).toBe(false)
  })

  it('addQuote should add a quote to a book', () => {
    const { addBook, addQuote } = useReadingHall()
    const book = addBook('Test', 'Author', 100)
    const quote = addQuote(book.id, '精彩段落', 42, '第三章', '深刻')

    expect(quote).toBeDefined()
    expect(quote!.text).toBe('精彩段落')
    expect(quote!.page).toBe(42)
    expect(quote!.chapter).toBe('第三章')
    expect(quote!.note).toBe('深刻')
    expect(quote!.id).toMatch(/^read_/)
    expect(quote!.timestamp).toBeDefined()

    const updated = useReadingHall().books.value[0]
    expect(updated.quotes).toHaveLength(1)
  })

  it('addQuote should return undefined for unknown book', () => {
    const { addQuote } = useReadingHall()
    const quote = addQuote('nonexistent', 'text')
    expect(quote).toBeUndefined()
  })

  it('rateBook should set rating and optional review', () => {
    const { addBook, rateBook } = useReadingHall()
    const book = addBook('Test', 'Author', 100)
    const result = rateBook(book.id, 4, '写得不错')
    expect(result).toBe(true)

    const updated = useReadingHall().books.value[0]
    expect(updated.rating).toBe(4)
    expect(updated.review).toBe('写得不错')
  })

  it('rateBook should clamp rating between 1 and 5', () => {
    const { addBook, rateBook } = useReadingHall()
    const book = addBook('Test', 'Author', 100)

    rateBook(book.id, 10)
    expect(useReadingHall().books.value[0].rating).toBe(5)

    rateBook(book.id, -3)
    expect(useReadingHall().books.value[0].rating).toBe(1)
  })

  it('getBooksByStatus should filter books correctly', () => {
    const { addBook, updateBookStatus, getBooksByStatus } = useReadingHall()
    addBook('Book A', 'Author A', 100)
    const b2 = addBook('Book B', 'Author B', 200)

    updateBookStatus(b2.id, 'reading')

    const wantToRead = getBooksByStatus('want_to_read')
    const reading = getBooksByStatus('reading')
    const finished = getBooksByStatus('finished')

    expect(wantToRead).toHaveLength(1)
    expect(reading).toHaveLength(1)
    expect(finished).toHaveLength(0)
  })

  it('recordSession should create a session and update book progress', () => {
    const { addBook, recordSession, sessions } = useReadingHall()
    const book = addBook('Test', 'Author', 200)

    const session = recordSession(book.id, 0, 50, 30, '专心阅读')

    expect(session).toBeDefined()
    expect(session!.bookId).toBe(book.id)
    expect(session!.startPage).toBe(0)
    expect(session!.endPage).toBe(50)
    expect(session!.duration).toBe(30)
    expect(session!.note).toBe('专心阅读')
    expect(session!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(sessions.value).toHaveLength(1)

    const updated = useReadingHall().books.value[0]
    expect(updated.currentPage).toBe(50)
    expect(updated.totalReadingTime).toBe(30)
    expect(updated.status).toBe('reading')
  })

  it('recordSession should auto-transition from want_to_read to reading', () => {
    const { addBook, recordSession } = useReadingHall()
    const book = addBook('Test', 'Author', 200)
    expect(book.status).toBe('want_to_read')

    recordSession(book.id, 0, 10, 15)
    const updated = useReadingHall().books.value[0]
    expect(updated.status).toBe('reading')
    expect(updated.startDate).toBeDefined()
  })

  it('recordSession should return undefined for unknown book', () => {
    const { recordSession } = useReadingHall()
    const session = recordSession('nonexistent', 0, 10, 15)
    expect(session).toBeUndefined()
  })

  it('getReadingStats should return correct statistics', () => {
    const { addBook, recordSession, updateBookStatus, getReadingStats } = useReadingHall()
    addBook('Book A', 'Author A', 300)
    const b2 = addBook('Book B', 'Author B', 400)
    updateBookStatus(b2.id, 'finished')

    recordSession(b2.id, 0, 200, 60)

    const stats = getReadingStats()
    expect(stats.totalBooks).toBe(2)
    expect(stats.finishedBooks).toBe(1)
    expect(stats.totalPages).toBe(200) // b2.currentPage = 200
    expect(stats.totalTime).toBe(60)
    expect(stats.todayMinutes).toBe(60)
  })

  it('updateGoal should update goal fields', () => {
    const { updateGoal, readingGoal } = useReadingHall()
    updateGoal({ yearlyTarget: 24, dailyTarget: 60 })

    expect(readingGoal.value.yearlyTarget).toBe(24)
    expect(readingGoal.value.dailyTarget).toBe(60)
  })

  it('getGoalProgress should compute progress from finished books', () => {
    const { addBook, updateBookStatus, getGoalProgress } = useReadingHall()
    // Default yearlyTarget is 12
    addBook('Book A', 'Author A', 100)
    const b2 = addBook('Book B', 'Author B', 200)
    const b3 = addBook('Book C', 'Author C', 300)
    updateBookStatus(b2.id, 'finished')
    updateBookStatus(b3.id, 'finished')

    const progress = getGoalProgress()
    expect(progress.yearlyProgress).toBeCloseTo(2 / 12, 5)
    expect(progress.streak).toBe(0)
  })

  it('removeBook should remove a book by id', () => {
    const { addBook, removeBook, books } = useReadingHall()
    const book = addBook('Test', 'Author', 100)
    expect(books.value).toHaveLength(1)

    const result = removeBook(book.id)
    expect(result).toBe(true)
    expect(books.value).toHaveLength(0)
  })

  it('removeBook should return false for unknown book id', () => {
    const { removeBook } = useReadingHall()
    expect(removeBook('nonexistent')).toBe(false)
  })
})

// ============================================================
// 3. useReadingChallenges
// ============================================================
describe('useReadingChallenges', () => {
  it('getChallenges should return preset challenges on first load', () => {
    const { getChallenges } = useReadingChallenges()
    const challenges = getChallenges()
    expect(challenges.length).toBeGreaterThanOrEqual(5)
    expect(challenges[0].id).toContain('challenge_preset_')
  })

  it('getActiveChallenges should filter out completed challenges', () => {
    const { getActiveChallenges } = useReadingChallenges()
    // All presets are initially active (not completed)
    const active = getActiveChallenges()
    const all = useReadingChallenges().getChallenges()
    expect(active.length).toBe(all.length)
  })

  it('createChallenge should create a new custom challenge', () => {
    const { createChallenge, getChallenges } = useReadingChallenges()
    const ch = createChallenge('自定义挑战', 'book_count', 10, '2026-12-31', '测试描述', ['测试'], 'reward')

    expect(ch.name).toBe('自定义挑战')
    expect(ch.type).toBe('book_count')
    expect(ch.target).toBe(10)
    expect(ch.progress).toBe(0)
    expect(ch.completed).toBe(false)
    expect(ch.tags).toEqual(['测试'])
    expect(ch.reward).toBe('reward')

    const all = getChallenges()
    expect(all.find((c: any) => c.id === ch.id)).toBeDefined()
  })

  it('updateProgress should update progress and auto-complete when reached', () => {
    const { createChallenge, updateProgress } = useReadingChallenges()
    const ch = createChallenge('测试', 'book_count', 5, '2026-12-31', 'desc')

    const result = updateProgress(ch.id, 5)
    expect(result).toBe(true)

    const updated = useReadingChallenges().getChallenges().find((c: any) => c.id === ch.id)
    expect(updated.progress).toBe(5)
    expect(updated.completed).toBe(true)
    expect(updated.completedAt).toBeDefined()
  })

  it('incrementProgress should increment by given amount', () => {
    const { createChallenge, incrementProgress } = useReadingChallenges()
    const ch = createChallenge('测试', 'book_count', 10, '2026-12-31', 'desc')

    incrementProgress(ch.id, 3)
    const updated = useReadingChallenges().getChallenges().find((c: any) => c.id === ch.id)
    expect(updated.progress).toBe(3)

    incrementProgress(ch.id, 2)
    const updated2 = useReadingChallenges().getChallenges().find((c: any) => c.id === ch.id)
    expect(updated2.progress).toBe(5)
  })

  it('deleteChallenge should remove a challenge', () => {
    const { createChallenge, deleteChallenge, getChallenges } = useReadingChallenges()
    const ch = createChallenge('测试', 'book_count', 10, '2026-12-31', 'desc')
    const before = getChallenges().length

    const result = deleteChallenge(ch.id)
    expect(result).toBe(true)
    expect(getChallenges().length).toBe(before - 1)
    expect(getChallenges().find((c: any) => c.id === ch.id)).toBeUndefined()
  })

  it('autoUpdateFromBooks should update challenge progress from books', () => {
    const { createChallenge, autoUpdateFromBooks } = useReadingChallenges()
    createChallenge('书籍数量', 'book_count', 5, '2026-12-31', 'desc')

    const mockBooks = [
      { id: '1', status: 'finished', currentPage: 100, tags: ['文学'], totalReadingTime: 0, author: '', title: '', totalPages: 0, quotes: [] },
      { id: '2', status: 'finished', currentPage: 200, tags: ['科幻'], totalReadingTime: 0, author: '', title: '', totalPages: 0, quotes: [] },
      { id: '3', status: 'reading', currentPage: 50, tags: ['文学'], totalReadingTime: 0, author: '', title: '', totalPages: 0, quotes: [] },
    ] as any

    autoUpdateFromBooks(mockBooks)

    const updated = useReadingChallenges().getChallenges()
    const bookCountChallenge = updated.find((c: any) => c.type === 'book_count')
    expect(bookCountChallenge.progress).toBe(2)
  })
})

// ============================================================
// 4. useBookReviews
// ============================================================
describe('useBookReviews', () => {
  it('createReview should create a review with computed recommendationScore', () => {
    const { createReview, getReviews } = useBookReviews()
    const review = createReview('book1', '测试书', 4, '标题', '内容')

    expect(review.bookId).toBe('book1')
    expect(review.bookTitle).toBe('测试书')
    expect(review.rating).toBe(4)
    expect(review.title).toBe('标题')
    expect(review.content).toBe('内容')
    expect(review.hasSpoiler).toBe(false)
    expect(review.recommendationScore).toBe(8) // default: rating * 2 = 8
    expect(review.id).toMatch(/^review_/)

    expect(getReviews()).toHaveLength(1)
  })

  it('getReviewsForBook should filter by bookId', () => {
    const { createReview, getReviewsForBook } = useBookReviews()
    createReview('book1', '书A', 4, '标题', '内容')
    createReview('book2', '书B', 3, '标题', '内容')
    createReview('book1', '书A', 5, '标题', '内容')

    const reviews = getReviewsForBook('book1')
    expect(reviews).toHaveLength(2)
    expect(reviews.every((r: any) => r.bookId === 'book1')).toBe(true)
  })

  it('getByRating should filter by rating range', () => {
    const { createReview, getByRating } = useBookReviews()
    createReview('b1', '书A', 2, 't', 'c')
    createReview('b2', '书B', 4, 't', 'c')
    createReview('b3', '书C', 5, 't', 'c')

    const highRated = getByRating(4, 5)
    expect(highRated).toHaveLength(2)
  })

  it('updateReview should update review fields', () => {
    const { createReview, updateReview } = useBookReviews()
    const review = createReview('b1', '书', 3, '标题', '内容')
    const result = updateReview(review.id, { title: '新标题', rating: 5 })

    expect(result).toBe(true)
    const updated = useBookReviews().getReviews()[0]
    expect(updated.title).toBe('新标题')
    expect(updated.rating).toBe(5)
  })

  it('deleteReview should remove a review', () => {
    const { createReview, deleteReview, getReviews } = useBookReviews()
    const review = createReview('b1', '书', 3, '标题', '内容')
    expect(getReviews()).toHaveLength(1)

    const result = deleteReview(review.id)
    expect(result).toBe(true)
    expect(getReviews()).toHaveLength(0)
  })

  it('getReviewStats should return correct statistics', () => {
    const { createReview, getReviewStats } = useBookReviews()
    createReview('b1', '书A', 4, 't', 'c')
    createReview('b2', '书B', 2, 't', 'c')

    const stats = getReviewStats()
    expect(stats.totalReviews).toBe(2)
    expect(stats.averageRating).toBe(3)
    expect(stats.ratingDistribution[4]).toBe(1)
    expect(stats.ratingDistribution[2]).toBe(1)
  })
})

// ============================================================
// 5. useReadingNotes
// ============================================================
describe('useReadingNotes', () => {
  it('createNote should create a note with given type', () => {
    const { createNote, getNotes } = useReadingNotes()
    const note = createNote('book1', '这段内容很有启发', 'thought', { chapter: '第3章', page: 42 })

    expect(note.bookId).toBe('book1')
    expect(note.content).toBe('这段内容很有启发')
    expect(note.type).toBe('thought')
    expect(note.chapter).toBe('第3章')
    expect(note.page).toBe(42)
    expect(note.relatedNoteIds).toEqual([])
    expect(note.id).toMatch(/^note_/)
    expect(getNotes()).toHaveLength(1)
  })

  it('getNotesForBook should filter by bookId', () => {
    const { createNote, getNotesForBook } = useReadingNotes()
    createNote('book1', '内容1', 'thought')
    createNote('book2', '内容2', 'highlight')
    createNote('book1', '内容3', 'question')

    const notes = getNotesForBook('book1')
    expect(notes).toHaveLength(2)
  })

  it('getNotesByType should filter by type', () => {
    const { createNote, getNotesByType } = useReadingNotes()
    createNote('b1', 'c1', 'thought')
    createNote('b1', 'c2', 'highlight')
    createNote('b2', 'c3', 'thought')

    const thoughts = getNotesByType('thought')
    expect(thoughts).toHaveLength(2)
  })

  it('linkNotes should connect two notes bidirectionally', () => {
    const { createNote, linkNotes } = useReadingNotes()
    const n1 = createNote('b1', 'c1', 'thought')
    const n2 = createNote('b1', 'c2', 'thought')

    const result = linkNotes(n1.id, n2.id)
    expect(result).toBe(true)

    const notes = useReadingNotes().getNotes()
    const updated1 = notes.find((n: any) => n.id === n1.id)
    const updated2 = notes.find((n: any) => n.id === n2.id)
    expect(updated1.relatedNoteIds).toContain(n2.id)
    expect(updated2.relatedNoteIds).toContain(n1.id)
  })

  it('deleteNote should remove note and clean up relatedNoteIds', () => {
    const { createNote, linkNotes, deleteNote } = useReadingNotes()
    const n1 = createNote('b1', 'c1', 'thought')
    const n2 = createNote('b1', 'c2', 'thought')
    linkNotes(n1.id, n2.id)

    const result = deleteNote(n1.id)
    expect(result).toBe(true)

    const remaining = useReadingNotes().getNotes()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].relatedNoteIds).not.toContain(n1.id)
  })

  it('getNoteStats should return correct distribution', () => {
    const { createNote, getNoteStats } = useReadingNotes()
    createNote('b1', 'c1', 'thought')
    createNote('b1', 'c2', 'highlight')
    createNote('b2', 'c3', 'thought')

    const stats = getNoteStats()
    expect(stats.total).toBe(3)
    expect(stats.typeDistribution.thought).toBe(2)
    expect(stats.typeDistribution.highlight).toBe(1)
  })
})

// ============================================================
// 6. useReadingDashboard
// ============================================================
describe('useReadingDashboard', () => {
  it('computeReadingStats should return comprehensive stats', () => {
    const { computeReadingStats } = useReadingDashboard()
    const books = [
      { id: '1', title: 'A', author: 'Author A', totalPages: 300, currentPage: 200, status: 'reading', rating: 4, totalReadingTime: 120, tags: ['文学'], finishDate: undefined, quotes: [] },
      { id: '2', title: 'B', author: 'Author A', totalPages: 400, currentPage: 400, status: 'finished', rating: 5, totalReadingTime: 240, tags: ['文学', '经典'], finishDate: new Date().toISOString(), quotes: [] },
      { id: '3', title: 'C', author: 'Author B', totalPages: 200, currentPage: 0, status: 'want_to_read', rating: undefined, totalReadingTime: 0, tags: ['科幻'], finishDate: undefined, quotes: [] },
    ] as any

    const stats = computeReadingStats(books, [])
    expect(stats.totalBooks).toBe(3)
    expect(stats.totalPages).toBe(600)
    expect(stats.totalReadingMinutes).toBe(360)
    expect(stats.averageRating).toBeCloseTo(4.5, 1)
    expect(stats.statusDistribution.reading).toBe(1)
    expect(stats.statusDistribution.finished).toBe(1)
    expect(stats.statusDistribution.want_to_read).toBe(1)
    expect(stats.favoriteAuthors[0].author).toBe('Author A')
    expect(stats.favoriteAuthors[0].count).toBe(2)
    expect(stats.favoriteTags.length).toBeGreaterThanOrEqual(1)
  })

  it('computeReadingStats should handle empty books array', () => {
    const { computeReadingStats } = useReadingDashboard()
    const stats = computeReadingStats([], [])

    expect(stats.totalBooks).toBe(0)
    expect(stats.yearlyBooks).toBe(0)
    expect(stats.totalPages).toBe(0)
    expect(stats.totalReadingMinutes).toBe(0)
    expect(stats.averageRating).toBe(0)
    expect(stats.readingSpeed).toBe(0)
    expect(stats.favoriteAuthors).toEqual([])
    expect(stats.favoriteTags).toEqual([])
  })
})

// ============================================================
// 7. useReadingHabits
// ============================================================
describe('useReadingHabits', () => {
  it('createHabit should create a habit with initial values', () => {
    const { createHabit, habits } = useReadingHabits()
    const habit = createHabit('每日阅读', '坚持每天阅读', 'daily_reading')

    expect(habit.name).toBe('每日阅读')
    expect(habit.type).toBe('daily_reading')
    expect(habit.strength).toBe(0)
    expect(habit.streak).toBe(0)
    expect(habit.bestStreak).toBe(0)
    expect(habit.id).toMatch(/^habit_/)
    expect(habits.value).toHaveLength(1)
  })

  it('updateHabitStrength should update strength with clamping', () => {
    const { createHabit, updateHabitStrength } = useReadingHabits()
    const habit = createHabit('测试', 'desc', 'daily_reading')

    updateHabitStrength(habit.id, 0.75)
    expect(useReadingHabits().habits.value[0].strength).toBe(0.75)

    updateHabitStrength(habit.id, 1.5)
    expect(useReadingHabits().habits.value[0].strength).toBe(1)

    updateHabitStrength(habit.id, -0.5)
    expect(useReadingHabits().habits.value[0].strength).toBe(0)
  })

  it('deleteHabit should remove a habit', () => {
    const { createHabit, deleteHabit, habits } = useReadingHabits()
    const habit = createHabit('测试', 'desc', 'daily_reading')
    expect(habits.value).toHaveLength(1)

    const result = deleteHabit(habit.id)
    expect(result).toBe(true)
    expect(habits.value).toHaveLength(0)
  })

  it('analyzeReadingPatterns should return empty pattern for empty sessions', () => {
    const { analyzeReadingPatterns } = useReadingHabits()
    const pattern = analyzeReadingPatterns([])

    expect(pattern.averageDuration).toBe(0)
    expect(pattern.medianDuration).toBe(0)
    expect(pattern.maxDuration).toBe(0)
    expect(pattern.minDuration).toBe(0)
    expect(pattern.timeSlotDistribution).toEqual([])
    expect(pattern.consistency).toBe(0)
  })

  it('getReadingConsistency should handle empty sessions', () => {
    const { getReadingConsistency } = useReadingHabits()
    const consistency = getReadingConsistency([], [])

    expect(consistency.consistencyScore).toBe(0)
    expect(consistency.streak).toBe(0)
    expect(consistency.bestStreak).toBe(0)
    expect(consistency.level).toBe('beginner')
  })

  it('generateHabitInsights should generate insights from books and sessions', () => {
    const { generateHabitInsights } = useReadingHabits()
    const books = [
      { id: '1', status: 'finished', tags: ['文学', '经典'], rating: 5, totalPages: 300, currentPage: 300, totalReadingTime: 200, author: 'Author A', title: 'Book A', quotes: [] },
    ] as any
    const sessions = [
      { id: 's1', bookId: '1', startPage: 0, endPage: 50, duration: 45, date: '2026-08-05', timestamp: '2026-08-05T10:00:00.000Z' },
    ] as any

    const insights = generateHabitInsights(books, sessions)
    expect(insights.length).toBeGreaterThanOrEqual(1)
    expect(insights[0]).toHaveProperty('id')
    expect(insights[0]).toHaveProperty('title')
    expect(insights[0]).toHaveProperty('type')
    expect(insights[0]).toHaveProperty('priority')
  })
})

// ============================================================
// 8. useReadingInsights
// ============================================================
describe('useReadingInsights', () => {
  it('updateAnalytics should compute analytics from books and sessions', () => {
    const { updateAnalytics, analytics } = useReadingInsights()
    const books = [
      { id: '1', title: 'A', author: 'Author A', totalPages: 300, currentPage: 300, totalReadingTime: 200, status: 'finished', rating: 4, tags: ['文学'], finishDate: new Date().toISOString(), quotes: [] },
      { id: '2', title: 'B', author: 'Author B', totalPages: 200, currentPage: 100, totalReadingTime: 50, status: 'reading', rating: 3, tags: ['科幻'], finishDate: undefined, quotes: [] },
    ] as any
    const sessions = [
      { id: 's1', bookId: '1', startPage: 0, endPage: 50, duration: 30, date: '2026-08-05', timestamp: '2026-08-05T10:00:00.000Z' },
    ] as any

    updateAnalytics(books, sessions)

    expect(analytics.value.totalBooks).toBe(2)
    expect(analytics.value.totalPages).toBe(400)
    expect(analytics.value.totalReadingTime).toBe(250)
    expect(analytics.value.topTags.length).toBeGreaterThanOrEqual(1)
  })

  it('addKnowledgeNode should create a knowledge node', () => {
    const { addKnowledgeNode, knowledgeNodes } = useReadingInsights()
    const node = addKnowledgeNode('编程思维', '内容摘要', 'book1', 'Book Title', 'insight')

    expect(node.label).toBe('编程思维')
    expect(node.sourceBookId).toBe('book1')
    expect(node.type).toBe('insight')
    expect(node.connections).toEqual([])
    expect(node.id).toMatch(/^kn_/)
    expect(knowledgeNodes.value).toHaveLength(1)
  })

  it('connectNodes should connect two knowledge nodes', () => {
    const { addKnowledgeNode, connectNodes } = useReadingInsights()
    const n1 = addKnowledgeNode('概念A', '内容', 'b1', '书', 'concept')
    const n2 = addKnowledgeNode('概念B', '内容', 'b1', '书', 'fact')

    const result = connectNodes(n1.id, n2.id)
    expect(result).toBe(true)

    const nodes = useReadingInsights().knowledgeNodes.value
    expect(nodes[0].connections).toContain(n2.id)
    expect(nodes[1].connections).toContain(n1.id)
  })

  it('createReadingPlan should create a plan', () => {
    const { createReadingPlan, readingPlans } = useReadingInsights()
    const plan = createReadingPlan('学习计划', '读3本书', ['book1', 'book2'], '2026-12-31')

    expect(plan.name).toBe('学习计划')
    expect(plan.books).toEqual(['book1', 'book2'])
    expect(plan.targetDate).toBe('2026-12-31')
    expect(plan.completed).toBe(false)
    expect(readingPlans.value).toHaveLength(1)
  })

  it('completePlan should mark a plan as completed', () => {
    const { createReadingPlan, completePlan } = useReadingInsights()
    const plan = createReadingPlan('计划', 'desc', ['b1'], '2026-12-31')

    const result = completePlan(plan.id)
    expect(result).toBe(true)

    const updated = useReadingInsights().readingPlans.value[0]
    expect(updated.completed).toBe(true)
  })
})

// ============================================================
// 9. useReadingSpeed
// ============================================================
describe('useReadingSpeed', () => {
  it('recordSpeed should record a speed measurement', () => {
    const { recordSpeed, records } = useReadingSpeed()
    const record = recordSpeed('book1', 'session1', 10, 30, { comprehensionRate: 0.8, difficulty: 3 })

    expect(record.bookId).toBe('book1')
    expect(record.pagesRead).toBe(10)
    expect(record.duration).toBe(30)
    expect(record.comprehensionRate).toBe(0.8)
    expect(record.difficulty).toBe(3)
    expect(record.wordsPerMinute).toBeGreaterThan(0) // 10 * 600 / 30 = 200
    expect(record.id).toMatch(/^speed_/)
    expect(records.value).toHaveLength(1)
  })

  it('recordSpeedFromSession should compute speed from book and session', () => {
    const { recordSpeedFromSession } = useReadingSpeed()
    const book = { id: 'book1', totalPages: 300 } as any
    const session = { id: 's1', startPage: 0, endPage: 30, duration: 30 } as any

    const record = recordSpeedFromSession(book, session, { comprehensionRate: 0.9 })
    expect(record).toBeDefined()
    expect(record!.pagesRead).toBe(30)
    expect(record!.wordsPerMinute).toBeGreaterThan(0)
  })

  it('recordSpeedFromSession should return undefined for invalid session', () => {
    const { recordSpeedFromSession } = useReadingSpeed()
    const book = { id: 'book1', totalPages: 300 } as any
    const session = { id: 's1', startPage: 50, endPage: 30, duration: 30 } as any

    const record = recordSpeedFromSession(book, session)
    expect(record).toBeUndefined()
  })

  it('computeSpeedStats should return default stats for empty records', () => {
    const { computeSpeedStats } = useReadingSpeed()
    const stats = computeSpeedStats()

    expect(stats.averageWPM).toBe(0)
    expect(stats.maxWPM).toBe(0)
    expect(stats.minWPM).toBe(0)
    expect(stats.medianWPM).toBe(0)
    expect(stats.averageComprehension).toBe(0)
    expect(stats.trend).toBe('stable')
  })

  it('setSpeedGoal should create a goal with progress evaluation', () => {
    const { setSpeedGoal, speedGoal } = useReadingSpeed()
    const goal = setSpeedGoal(500, 0.75, '2026-12-31')

    expect(goal.targetWPM).toBe(500)
    expect(goal.targetComprehension).toBe(0.75)
    expect(goal.deadline).toBe('2026-12-31')
    expect(goal.completed).toBe(false)
    expect(speedGoal.value).toBeDefined()
  })

  it('analyzeSpeedTrend should handle empty records', () => {
    const { analyzeSpeedTrend } = useReadingSpeed()
    const trend = analyzeSpeedTrend(30)

    expect(trend.points).toEqual([])
    expect(trend.changeRate).toBe(0)
    expect(trend.direction).toBe('flat')
    expect(trend.bestDay.date).toBe('')
  })

  it('getSpeedRecommendations should return general recommendations for empty records', () => {
    const { getSpeedRecommendations } = useReadingSpeed()
    const recs = getSpeedRecommendations()

    expect(recs.length).toBeGreaterThanOrEqual(1)
    expect(recs[0]).toHaveProperty('title')
    expect(recs[0]).toHaveProperty('description')
    expect(recs[0]).toHaveProperty('type')
    expect(recs[0]).toHaveProperty('priority')
  })
})

// ============================================================
// 10. useBookRecommendations
// ============================================================
describe('useBookRecommendations', () => {
  const makeBook = (id: string, title: string, author: string, tags: string[], rating?: number, status: string = 'want_to_read', totalPages: number = 300) => ({
    id, title, author, tags, rating, status, totalPages,
    currentPage: 0, totalReadingTime: 0, quotes: [], review: '简介',
    cover: undefined, startDate: undefined, finishDate: undefined,
  }) as any

  it('extractPreferencesFromHistory should extract preferences from books', () => {
    const { extractPreferencesFromHistory } = useBookRecommendations()
    const books = [
      makeBook('1', 'Book A', 'Author A', ['文学', '经典'], 5),
      makeBook('2', 'Book B', 'Author A', ['文学', '小说'], 4),
      makeBook('3', 'Book C', 'Author B', ['科幻'], 3),
    ]

    const pref = extractPreferencesFromHistory(books)
    expect(pref.preferredTags.length).toBeGreaterThanOrEqual(1)
    expect(pref.preferredAuthors.length).toBeGreaterThanOrEqual(1)
    expect(pref.preferredDifficulty).toBeGreaterThanOrEqual(2)
    expect(pref.preferredBookLength).toBeDefined()
  })

  it('generateRecommendations should generate recommendations from candidates', () => {
    const { generateRecommendations } = useBookRecommendations()
    const userBooks = [
      makeBook('1', 'User Book A', 'Author A', ['文学', '经典'], 5, 'finished'),
    ]
    const candidates = [
      makeBook('c1', 'Candidate A', 'Author A', ['文学', '历史'], 4),
      makeBook('c2', 'Candidate B', 'Author B', ['科幻'], 3),
      makeBook('c3', 'Candidate C', 'Author C', ['文学', '哲学'], 4),
    ]

    const recs = generateRecommendations(userBooks, candidates, 5)
    expect(recs.length).toBeGreaterThanOrEqual(1)
    expect(recs[0]).toHaveProperty('id')
    expect(recs[0]).toHaveProperty('reason')
    expect(recs[0].reason).toHaveProperty('matchScore')
    expect(recs[0].reason).toHaveProperty('source')
    // 同作者推荐应该排在前面
    const authorRec = recs.find((r: any) => r.author === 'Author A')
    expect(authorRec).toBeDefined()
  })

  it('getSimilarBooks should find books with similar tags', () => {
    const { getSimilarBooks } = useBookRecommendations()
    const source = makeBook('s1', 'Source', 'Author', ['文学', '经典', '小说'], 5)
    const candidates = [
      makeBook('c1', 'Similar A', 'Author B', ['文学', '经典'], 4),
      makeBook('c2', 'Diff B', 'Author C', ['科技', '编程'], 3),
      makeBook('c3', 'Similar C', 'Author D', ['文学', '小说'], 4),
    ]

    const similar = getSimilarBooks(source, candidates, 5)
    expect(similar.length).toBeGreaterThanOrEqual(1)
    expect(similar.some((r: any) => r.title === 'Diff B')).toBe(false)
  })

  it('getAuthorRecommendations should find books by same author', () => {
    const { getAuthorRecommendations } = useBookRecommendations()
    const userBooks = [makeBook('1', 'Owned', 'Author A', ['文学'], 4)]
    const candidates = [
      makeBook('c1', 'Other A', 'Author A', ['文学'], 4),
      makeBook('c2', 'Other B', 'Author B', ['科幻'], 3),
    ]

    const recs = getAuthorRecommendations('Author A', userBooks, candidates, 5)
    expect(recs).toHaveLength(1)
    expect(recs[0].author).toBe('Author A')
    expect(recs[0].reason.source).toBe('same_author')
  })

  it('excludeTag should add tag to excluded list', () => {
    const { excludeTag, preferences } = useBookRecommendations()
    excludeTag('恐怖')
    expect(preferences.value.excludedTags).toContain('恐怖')
  })

  it('autoUpdatePreferences should update preferences from books', () => {
    const { autoUpdatePreferences, preferences } = useBookRecommendations()
    const books = [
      makeBook('1', 'Book A', 'Author A', ['文学', '经典'], 5, 'finished'),
      makeBook('2', 'Book B', 'Author A', ['文学'], 4, 'finished'),
    ]

    const pref = autoUpdatePreferences(books)
    expect(pref.preferredTags.length).toBeGreaterThanOrEqual(1)
    expect(pref.preferredAuthors.length).toBeGreaterThanOrEqual(1)
    expect(preferences.value.preferredTags.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================
// 11. 边界条件与异常场景
// ============================================================
describe('Edge Cases', () => {
  it('getBooksByStatus should return empty array for status with no books', () => {
    const { addBook, getBooksByStatus } = useReadingHall()
    addBook('Test', 'Author', 100) // status = want_to_read

    const finished = getBooksByStatus('finished')
    expect(finished).toEqual([])

    const reading = getBooksByStatus('reading')
    expect(reading).toEqual([])
  })

  it('should handle adding multiple books with same title', () => {
    const { addBook, books } = useReadingHall()
    const b1 = addBook('Same Title', 'Author A', 100)
    const b2 = addBook('Same Title', 'Author B', 200)

    expect(books.value).toHaveLength(2)
    expect(b1.id).not.toBe(b2.id)
    expect(b1.author).toBe('Author A')
    expect(b2.author).toBe('Author B')
  })

  it('removeBook then addBook again should work independently', () => {
    const { addBook, removeBook, books } = useReadingHall()
    const b1 = addBook('Test', 'Author', 100)
    removeBook(b1.id)
    expect(books.value).toHaveLength(0)

    const b2 = addBook('Test', 'Author', 100)
    expect(books.value).toHaveLength(1)
    expect(b2.id).not.toBe(b1.id)
  })

  it('rateBook with non-existent id should return false', () => {
    const { rateBook } = useReadingHall()
    expect(rateBook('nonexistent', 5)).toBe(false)
  })

  it('recordSession with zero duration should still create session', () => {
    const { addBook, recordSession, sessions } = useReadingHall()
    const book = addBook('Test', 'Author', 100)
    const session = recordSession(book.id, 0, 10, 0)

    expect(session).toBeDefined()
    expect(session!.duration).toBe(0)
    expect(sessions.value).toHaveLength(1)
    expect(useReadingHall().books.value[0].totalReadingTime).toBe(0)
  })

  it('getReadingStats with no books should return zeros', () => {
    const { getReadingStats } = useReadingHall()
    const stats = getReadingStats()

    expect(stats.totalBooks).toBe(0)
    expect(stats.finishedBooks).toBe(0)
    expect(stats.totalPages).toBe(0)
    expect(stats.totalTime).toBe(0)
    expect(stats.todayMinutes).toBe(0)
  })

  it('createChallenge with duplicate name should create a separate challenge', () => {
    const { createChallenge, getChallenges } = useReadingChallenges()
    const ch1 = createChallenge('同名挑战', 'book_count', 5, '2026-12-31', 'desc')
    const ch2 = createChallenge('同名挑战', 'page_count', 100, '2026-12-31', 'desc')

    expect(ch1.id).not.toBe(ch2.id)
    expect(ch1.type).toBe('book_count')
    expect(ch2.type).toBe('page_count')
    const all = getChallenges()
    const matching = all.filter((c: any) => c.name === '同名挑战')
    expect(matching).toHaveLength(2)
  })

  it('updateProgress for non-existent challenge should return false', () => {
    const { updateProgress } = useReadingChallenges()
    expect(updateProgress('nonexistent', 5)).toBe(false)
  })

  it('deleteChallenge for non-existent challenge should return false', () => {
    const { deleteChallenge } = useReadingChallenges()
    expect(deleteChallenge('nonexistent')).toBe(false)
  })

  it('createReview with rating out of bounds should be clamped', () => {
    const { createReview } = useBookReviews()
    const review = createReview('b1', '书', 10, '标题', '内容')
    expect(review.rating).toBe(5)
  })

  it('linkNotes with non-existent note should return false', () => {
    const { createNote, linkNotes } = useReadingNotes()
    const n1 = createNote('b1', 'c1', 'thought')
    expect(linkNotes(n1.id, 'nonexistent')).toBe(false)
  })

  it('updateNote for non-existent note should return false', () => {
    const { updateNote } = useReadingNotes()
    expect(updateNote('nonexistent', { content: 'new' })).toBe(false)
  })

  it('deleteNote for non-existent note should return false', () => {
    const { deleteNote } = useReadingNotes()
    expect(deleteNote('nonexistent')).toBe(false)
  })

  it('connectNodes with non-existent node should return false', () => {
    const { addKnowledgeNode, connectNodes } = useReadingInsights()
    const n1 = addKnowledgeNode('概念', '内容', 'b1', '书', 'concept')
    expect(connectNodes(n1.id, 'nonexistent')).toBe(false)
  })

  it('completePlan for non-existent plan should return false', () => {
    const { completePlan } = useReadingInsights()
    expect(completePlan('nonexistent')).toBe(false)
  })

  it('dismissRecommendation for non-existent id should return false', () => {
    const { dismissRecommendation } = useBookRecommendations()
    expect(dismissRecommendation('nonexistent')).toBe(false)
  })

  it('getTopicRecommendations should filter by topic', () => {
    const { getTopicRecommendations } = useBookRecommendations()
    const userBooks = [makeBookLocal('1', 'Owned', 'Author', ['文学'], 4)]
    const candidates = [
      makeBookLocal('c1', 'AI Book', 'Author B', ['人工智能', '科技'], 4),
      makeBookLocal('c2', 'History Book', 'Author C', ['历史', '文学'], 4),
    ]

    const recs = getTopicRecommendations('人工智能', userBooks, candidates, 5)
    expect(recs.length).toBeGreaterThanOrEqual(1)
    expect(recs.every((r: any) => r.tags.includes('人工智能'))).toBe(true)
  })

  it('getReviewsForBook with no reviews should return empty array', () => {
    const { getReviewsForBook } = useBookReviews()
    expect(getReviewsForBook('nonexistent')).toEqual([])
  })

  it('getNotesForBook with no notes should return empty array', () => {
    const { getNotesForBook } = useReadingNotes()
    expect(getNotesForBook('nonexistent')).toEqual([])
  })
})

// ---- 辅助函数 (用于 book-recommendations 边界测试) ----
function makeBookLocal(
  id: string, title: string, author: string, tags: string[], rating?: number,
  status: string = 'want_to_read', totalPages: number = 300
) {
  return {
    id, title, author, tags, rating, status, totalPages,
    currentPage: 0, totalReadingTime: 0, quotes: [],
    review: '简介', cover: undefined,
    startDate: undefined, finishDate: undefined,
  } as any
}