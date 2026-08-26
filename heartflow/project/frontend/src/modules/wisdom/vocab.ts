// ============================================================
// 知微阁 · 词书背单词引擎（墨墨背单词 / 不背单词 / 百词斩 借鉴）
// ------------------------------------------------------------
// 词书（WordBook）承载一组单词，每个单词带释义/例句/音标；
// 学习时按「忘记 / 模糊 / 认识」三档反馈推进状态：
//   new → learning → mastered
// 全部本地存储，守宪法第1条本地私有 / 拒 GPU 云端。
// 纯函数核心（可单测）+ 轻量持久化，供 VocabPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

export type WordStatus = 'new' | 'learning' | 'mastered'

/** 单词 */
export interface VocabWord {
  id: string
  term: string
  definition: string
  example?: string
  phonetic?: string
  status: WordStatus
  /** 累计复习次数 */
  reviewCount: number
  /** 累计忘记次数 */
  wrongCount: number
  lastReviewAt?: string
  addedAt: string
}

/** 词书 */
export interface WordBook {
  id: string
  name: string
  description?: string
  words: VocabWord[]
  createdAt: string
}

/** 学习反馈档位 */
export type VocabQuality = 0 | 1 | 2

/** 词书进度 */
export interface BookProgress {
  total: number
  new: number
  learning: number
  mastered: number
  masteredPct: number
}

/** 总览进度 */
export interface VocabProgress {
  bookCount: number
  total: number
  new: number
  learning: number
  mastered: number
  masteredPct: number
}

/** 今日学习计划 */
export interface DailyPlan {
  /** 建议学习的新词数 */
  newCount: number
  /** 待复习词数 */
  reviewCount: number
  /** 建议总量 */
  total: number
}

const STORAGE_KEY = 'hf:vocab_books'

// ============================================================
// 纯函数核心
// ============================================================

/** 按反馈推进单词状态：0=忘记 1=模糊 2=认识 */
export function applyQuality(status: WordStatus, q: VocabQuality): WordStatus {
  if (q === 0) return 'learning'
  if (q === 1) return status === 'mastered' ? 'learning' : status
  if (status === 'new') return 'learning'
  return 'mastered'
}

/** 计算单本词书进度 */
export function bookProgress(book: WordBook): BookProgress {
  const total = book.words.length
  const mastered = book.words.filter(w => w.status === 'mastered').length
  const learning = book.words.filter(w => w.status === 'learning').length
  const fresh = total - mastered - learning
  return {
    total,
    new: fresh,
    learning,
    mastered,
    masteredPct: total ? Math.round((mastered / total) * 100) : 0,
  }
}

/** 汇总所有词书进度 */
export function vocabProgress(books: WordBook[]): VocabProgress {
  const agg = books.reduce(
    (acc, b) => {
      const p = bookProgress(b)
      acc.total += p.total
      acc.new += p.new
      acc.learning += p.learning
      acc.mastered += p.mastered
      return acc
    },
    { total: 0, new: 0, learning: 0, mastered: 0 },
  )
  return {
    bookCount: books.length,
    ...agg,
    masteredPct: agg.total ? Math.round((agg.mastered / agg.total) * 100) : 0,
  }
}

/** 今日学习计划：按每日新词配额 + 待复习词（learning 状态） */
export function dailyPlan(books: WordBook[], dailyNew = 10): DailyPlan {
  const all = books.flatMap(b => b.words)
  const review = all.filter(w => w.status === 'learning').length
  const fresh = all.filter(w => w.status === 'new').length
  const newCount = Math.min(dailyNew, fresh)
  return { newCount, reviewCount: review, total: newCount + review }
}

/** 温和洞察 */
export function vocabInsights(books: WordBook[], limit = 4): string[] {
  const insights: string[] = []
  const p = vocabProgress(books)

  if (p.total === 0) {
    return ['还没有词书，先建一本开始背单词吧。']
  }

  if (p.mastered > 0) {
    insights.push(`已掌握 ${p.mastered} 个单词，占全部 ${p.masteredPct}%。`)
  }

  const learning = books.flatMap(b => b.words).filter(w => w.status === 'learning')
  if (learning.length > 0) {
    insights.push(`有 ${learning.length} 个单词正在巩固中，记得按计划复习。`)
  }

  const mostWrong = learning
    .filter(w => w.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 3)
  if (mostWrong.length > 0) {
    insights.push(`容易忘记的：${mostWrong.map(w => w.term).join('、')}，可以多过几遍。`)
  }

  const empty = books.filter(b => b.words.length === 0)
  if (empty.length > 0) {
    insights.push(`词书「${empty.map(b => b.name).join('、')}」还是空的。`)
  }

  return insights.slice(0, limit)
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadBooks(): WordBook[] {
  try {
    return storage.getKV<WordBook[]>(STORAGE_KEY, [])
  } catch {
    return []
  }
}

export function useVocab() {
  const books = ref<WordBook[]>(loadBooks())

  function persist(): void {
    storage.setKV(STORAGE_KEY, books.value)
  }

  function createBook(name: string, description = ''): WordBook {
    const book: WordBook = {
      id: `vb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: description.trim(),
      words: [],
      createdAt: new Date().toISOString(),
    }
    books.value.push(book)
    persist()
    return book
  }

  function removeBook(id: string): void {
    books.value = books.value.filter(b => b.id !== id)
    persist()
  }

  function addWord(bookId: string, term: string, definition: string, example = '', phonetic = ''): VocabWord | null {
    const book = books.value.find(b => b.id === bookId)
    if (!book || !term.trim() || !definition.trim()) return null
    const word: VocabWord = {
      id: `vw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      term: term.trim(),
      definition: definition.trim(),
      example: example.trim() || undefined,
      phonetic: phonetic.trim() || undefined,
      status: 'new',
      reviewCount: 0,
      wrongCount: 0,
      addedAt: new Date().toISOString(),
    }
    book.words.push(word)
    persist()
    return word
  }

  function removeWord(bookId: string, wordId: string): void {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return
    book.words = book.words.filter(w => w.id !== wordId)
    persist()
  }

  /** 提交一次学习反馈并推进状态 */
  function reviewWord(bookId: string, wordId: string, q: VocabQuality): WordStatus | null {
    const book = books.value.find(b => b.id === bookId)
    const word = book?.words.find(w => w.id === wordId)
    if (!book || !word) return null
    word.status = applyQuality(word.status, q)
    word.reviewCount += 1
    if (q === 0) word.wrongCount += 1
    word.lastReviewAt = new Date().toISOString()
    persist()
    return word.status
  }

  return {
    books: computed(() => books.value),
    createBook,
    removeBook,
    addWord,
    removeWord,
    reviewWord,
    bookProgress,
    vocabProgress,
    dailyPlan,
    vocabInsights,
  }
}
