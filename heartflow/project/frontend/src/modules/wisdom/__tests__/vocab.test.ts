// ============================================================
// 词书背单词引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  applyQuality,
  bookProgress,
  vocabProgress,
  dailyPlan,
  vocabInsights,
} from '../vocab'
import type { WordBook, VocabWord } from '../vocab'

function word(partial: Partial<VocabWord> & { term: string }): VocabWord {
  return {
    id: `w_${partial.term}`,
    definition: '释义',
    status: 'new',
    reviewCount: 0,
    wrongCount: 0,
    addedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function book(name: string, words: VocabWord[]): WordBook {
  return { id: `b_${name}`, name, words, createdAt: '2026-01-01T00:00:00.000Z' }
}

describe('applyQuality 状态推进', () => {
  it('忘记(0) → learning', () => {
    expect(applyQuality('new', 0)).toBe('learning')
    expect(applyQuality('learning', 0)).toBe('learning')
    expect(applyQuality('mastered', 0)).toBe('learning')
  })

  it('模糊(1) 不升档，mastered 降为 learning', () => {
    expect(applyQuality('new', 1)).toBe('new')
    expect(applyQuality('learning', 1)).toBe('learning')
    expect(applyQuality('mastered', 1)).toBe('learning')
  })

  it('认识(2)：new → learning，learning/mastered → mastered', () => {
    expect(applyQuality('new', 2)).toBe('learning')
    expect(applyQuality('learning', 2)).toBe('mastered')
    expect(applyQuality('mastered', 2)).toBe('mastered')
  })
})

describe('bookProgress 单本进度', () => {
  it('空词书全零', () => {
    const p = bookProgress(book('a', []))
    expect(p).toEqual({ total: 0, new: 0, learning: 0, mastered: 0, masteredPct: 0 })
  })

  it('按状态统计', () => {
    const b = book('a', [
      word({ term: 'x', status: 'new' }),
      word({ term: 'y', status: 'learning' }),
      word({ term: 'z', status: 'mastered' }),
      word({ term: 'w', status: 'mastered' }),
    ])
    const p = bookProgress(b)
    expect(p.total).toBe(4)
    expect(p.new).toBe(1)
    expect(p.learning).toBe(1)
    expect(p.mastered).toBe(2)
    expect(p.masteredPct).toBe(50)
  })
})

describe('vocabProgress 总览', () => {
  it('汇总多本词书', () => {
    const books = [
      book('a', [word({ term: 'x', status: 'mastered' }), word({ term: 'y', status: 'new' })]),
      book('b', [word({ term: 'z', status: 'learning' })]),
    ]
    const p = vocabProgress(books)
    expect(p.bookCount).toBe(2)
    expect(p.total).toBe(3)
    expect(p.mastered).toBe(1)
    expect(p.masteredPct).toBe(33)
  })

  it('空返回全零', () => {
    const p = vocabProgress([])
    expect(p.total).toBe(0)
    expect(p.masteredPct).toBe(0)
  })
})

describe('dailyPlan 今日计划', () => {
  it('新词配额受剩余新词数限制', () => {
    const books = [book('a', [word({ term: 'x', status: 'new' }), word({ term: 'y', status: 'learning' })])]
    const p = dailyPlan(books, 10)
    expect(p.newCount).toBe(1)
    expect(p.reviewCount).toBe(1)
    expect(p.total).toBe(2)
  })

  it('无新词时只复习', () => {
    const books = [book('a', [word({ term: 'x', status: 'mastered' }), word({ term: 'y', status: 'learning' })])]
    const p = dailyPlan(books, 10)
    expect(p.newCount).toBe(0)
    expect(p.reviewCount).toBe(1)
  })
})

describe('vocabInsights 洞察', () => {
  it('空返回提示', () => {
    expect(vocabInsights([])).toEqual(['还没有词书，先建一本开始背单词吧。'])
  })

  it('提示掌握情况', () => {
    const books = [book('a', [word({ term: 'x', status: 'mastered' })])]
    const insights = vocabInsights(books)
    expect(insights.some(s => s.includes('已掌握'))).toBe(true)
  })

  it('提示易忘词', () => {
    const books = [
      book('a', [
        word({ term: 'hard', status: 'learning', wrongCount: 5 }),
        word({ term: 'easy', status: 'learning', wrongCount: 1 }),
      ]),
    ]
    const insights = vocabInsights(books)
    expect(insights.some(s => s.includes('hard'))).toBe(true)
  })

  it('尊重 limit 截断', () => {
    const books = [
      book('a', [word({ term: 'x', status: 'mastered' }), word({ term: 'y', status: 'learning', wrongCount: 3 })]),
    ]
    expect(vocabInsights(books, 1).length).toBe(1)
  })
})
