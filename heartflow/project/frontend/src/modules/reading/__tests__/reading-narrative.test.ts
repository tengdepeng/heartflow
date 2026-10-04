// ============================================================
// 阅览殿 · 年度叙事 单元测试
// 覆盖：季度映射 / 分季 era / 阅读人格 / 叙事弧 / markdown 导出
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  quarterOfMonth,
  seasonOfQuarter,
  buildEras,
  buildPersona,
  buildNarrativeArc,
  computeReadingNarrative,
  buildNarrativeMarkdown,
} from '../reading-narrative'
import type { Book, ReadingSession } from '../types'
import type { YearReport } from '../reading-report'

function session(date: string, duration: number, bookId = 'b1'): ReadingSession {
  return {
    id: `${date}_${bookId}_${duration}`,
    bookId,
    startPage: 0,
    endPage: 1,
    duration,
    date,
    timestamp: `${date}T00:00:00.000Z`,
  }
}

function book(over: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    title: '书',
    author: '作者',
    totalPages: 300,
    currentPage: 300,
    status: 'finished',
    tags: [],
    quotes: [],
    totalReadingTime: 0,
    finishDate: '2026-03-10',
    ...over,
  }
}

function report(over: Partial<YearReport> = {}): YearReport {
  return {
    year: 2026,
    totalBooks: 0,
    finishedBooks: 0,
    totalMinutes: 0,
    activeDays: 0,
    bestDay: null,
    avgWpm: 0,
    totalWords: 0,
    topTags: [],
    monthly: [],
    ...over,
  }
}

describe('reading-narrative · 季度映射', () => {
  it('quarterOfMonth 把 1-12 月映射到 0-3 季并做边界钳制', () => {
    expect(quarterOfMonth(1)).toBe(0)
    expect(quarterOfMonth(3)).toBe(0)
    expect(quarterOfMonth(4)).toBe(1)
    expect(quarterOfMonth(12)).toBe(3)
    expect(quarterOfMonth(0)).toBe(0)
    expect(quarterOfMonth(13)).toBe(3)
  })

  it('seasonOfQuarter 返回春夏秋冬', () => {
    expect([0, 1, 2, 3].map(seasonOfQuarter)).toEqual(['春', '夏', '秋', '冬'])
  })
})

describe('reading-narrative · buildEras 分季', () => {
  const books: Book[] = [
    book({ id: 'b1', tags: ['小说'], finishDate: '2026-03-10' }),
    book({ id: 'b2', tags: ['历史'], finishDate: '2026-11-05' }),
  ]
  const sessions: ReadingSession[] = [
    session('2026-01-15', 30, 'b1'), // Q1 春
    session('2026-07-20', 45, 'b1'), // Q3 秋
    session('2025-05-01', 99, 'b1'), // 非本年，忽略
  ]

  it('按季度聚合时长/读完书数/偏好标签，并过滤空季', () => {
    const eras = buildEras(2026, sessions, books)
    expect(eras.map(e => e.id)).toEqual(['Q1', 'Q3', 'Q4'])

    const spring = eras[0]
    expect(spring.season).toBe('春')
    expect(spring.months).toBe('1-3月')
    expect(spring.minutes).toBe(30)
    expect(spring.books).toBe(1)
    expect(spring.topTag).toBe('小说')
    expect(spring.label).toBe('春 · 小说')

    const autumn = eras.find(e => e.id === 'Q3')!
    expect(autumn.minutes).toBe(45)
    expect(autumn.books).toBe(0)

    const winter = eras.find(e => e.id === 'Q4')!
    expect(winter.minutes).toBe(0)
    expect(winter.books).toBe(1)
    expect(winter.label).toBe('冬 · 静读')
  })

  it('无本年数据返回空数组', () => {
    expect(buildEras(2026, [], [])).toEqual([])
  })
})

describe('reading-narrative · buildPersona 阅读人格', () => {
  it('高指标命中速度/完读/持久等标签且置信度降序、上限 4', () => {
    const r = report({
      totalBooks: 10,
      finishedBooks: 8,
      activeDays: 150,
      totalMinutes: 4000,
      avgWpm: 400,
      topTags: [{ tag: '小说', count: 6 }],
    })
    const tags = buildPersona(r, [], [])
    const keys = tags.map(t => t.key)
    expect(keys).toContain('speedster')
    expect(keys).toContain('finisher')
    expect(keys).toContain('devoted')
    expect(tags.length).toBeLessThanOrEqual(4)
    for (let i = 1; i < tags.length; i++) {
      expect(tags[i - 1].score).toBeGreaterThanOrEqual(tags[i].score)
    }
  })

  it('标签种类数达标时命中「跨界探索者」', () => {
    const manyBooks = ['a', 'b', 'c', 'd', 'e'].map((t, i) => book({ id: `bx${i}`, tags: [t] }))
    const tags = buildPersona(report({ totalBooks: 5 }), manyBooks, [])
    expect(tags.map(t => t.key)).toContain('explorer')
  })

  it('完全无数据时给出「待启程」兜底', () => {
    const tags = buildPersona(report(), [], [])
    expect(tags[0].key).toBe('newcomer')
    expect(tags[0].score).toBe(0)
  })

  it('有少量数据但无显著特征时给出「初读者」', () => {
    const tags = buildPersona(
      report({ totalBooks: 1, finishedBooks: 1, totalMinutes: 20, activeDays: 2 }),
      [book({ totalPages: 100 })],
      [session('2026-02-01', 20)],
    )
    expect(tags[0].key).toBe('beginner')
  })
})

describe('reading-narrative · 叙事弧与组装', () => {
  it('无数据时 hasData=false 且标题含年份', () => {
    const n = computeReadingNarrative(2026, report({ year: 2026 }), [], [])
    expect(n.hasData).toBe(false)
    expect(n.headline).toContain('2026')
    expect(n.eras).toEqual([])
  })

  it('有数据时生成封面/分季/人格/发现', () => {
    const books = [book({ id: 'b1', tags: ['小说'], finishDate: '2026-03-10' })]
    const sessions = [session('2026-01-15', 120, 'b1'), session('2026-08-20', 60, 'b1')]
    const r = report({
      year: 2026,
      totalBooks: 1,
      finishedBooks: 1,
      totalMinutes: 180,
      activeDays: 2,
      avgWpm: 360,
      topTags: [{ tag: '小说', count: 1 }],
      bestDay: { date: '2026-01-15', minutes: 120, books: 1, sessions: 1, level: 4 },
    })
    const n = computeReadingNarrative(2026, r, books, sessions)
    expect(n.hasData).toBe(true)
    expect(n.eras.length).toBe(2)
    expect(n.persona.length).toBeGreaterThan(0)
    expect(n.highlights.length).toBeGreaterThan(0)
    expect(n.discovery).toContain('春')
  })

  it('buildNarrativeArc 峰值季度写入 discovery', () => {
    const eras = buildEras(2026, [session('2026-01-15', 120), session('2026-08-20', 30)], [])
    const arc = buildNarrativeArc(2026, report({ year: 2026, totalMinutes: 150 }), eras, [])
    expect(arc.discovery).toContain('春')
    expect(arc.overview).toContain('150')
  })

  it('buildNarrativeMarkdown 含标题与各分区', () => {
    const books = [book({ id: 'b1', tags: ['小说'], finishDate: '2026-03-10' })]
    const n = computeReadingNarrative(
      2026,
      report({ year: 2026, totalBooks: 1, finishedBooks: 1, totalMinutes: 60, activeDays: 1 }),
      books,
      [session('2026-01-15', 60, 'b1')],
    )
    const md = buildNarrativeMarkdown(n)
    expect(md).toContain('# ')
    expect(md).toContain('## 分季')
    expect(md).toContain('## 阅读人格')
    expect(md).toContain('## 叙事')
    expect(md).toContain('> ')
  })
})
