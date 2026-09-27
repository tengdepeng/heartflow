import { describe, expect, it } from 'vitest'
import {
  buildLifeBook,
  monthlySeries,
  tagBreakdown,
  breadthMetrics,
  clamp01,
  type LifeBookSnapshot,
} from '../life-book'

function makeSnapshot(over: Partial<LifeBookSnapshot> = {}): LifeBookSnapshot {
  return {
    books: [],
    sessions: [],
    analytics: { totalBooks: 0, totalReadingTime: 0, streak: 0 },
    speed: { totalWordsRead: 0, averageWPM: 0 },
    knowledge: { totalNodes: 0, totalConnections: 0 },
    socialCount: 0,
    emotionAvg: 0,
    ...over,
  }
}

const thisMonth = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`
})()

describe('clamp01', () => {
  it('把越界值夹到 0..1', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(NaN)).toBe(0)
  })
})

describe('monthlySeries（正·时间轴）', () => {
  it('无会话时返回 6 个月全 0', () => {
    const r = monthlySeries([], 6)
    expect(r).toHaveLength(6)
    expect(r.every(p => p.value === 0)).toBe(true)
  })
  it('本月会话分钟计入对应桶', () => {
    const r = monthlySeries([{ date: thisMonth, duration: 30 }], 6)
    const cur = r[r.length - 1]
    expect(cur.value).toBe(30)
  })
  it('非本月会话不计入', () => {
    const r = monthlySeries([{ date: '2000-01-10', duration: 99 }], 6)
    expect(r.every(p => p.value === 0)).toBe(true)
  })
})

describe('tagBreakdown（侧·类型轴）', () => {
  it('按标签聚合并取前 N', () => {
    const books = [
      { tags: ['小说', '科幻'] },
      { tags: ['小说'] },
      { tags: ['历史'] },
      { tags: ['小说', '经典'] },
    ]
    const r = tagBreakdown(books as any, 2)
    expect(r).toHaveLength(2)
    expect(r[0].label).toBe('小说')
    expect(r[0].value).toBe(3)
  })
  it('空标签忽略', () => {
    const r = tagBreakdown([{ tags: ['', '  '] }] as any)
    expect(r).toHaveLength(0)
  })
})

describe('breadthMetrics（横·广度轴）', () => {
  it('汇总藏书/作者/标签/会话/节点', () => {
    const s = makeSnapshot({
      books: [
        { status: 'finished', rating: 0, tags: ['a', 'b'], author: '甲', totalReadingTime: 0 },
        { status: 'finished', rating: 0, tags: ['a'], author: '乙', totalReadingTime: 0 },
      ],
      sessions: [{ date: thisMonth, duration: 10 }, { date: thisMonth, duration: 5 }],
      knowledge: { totalNodes: 7, totalConnections: 0 },
    })
    const r = breadthMetrics(s)
    const byLabel = Object.fromEntries(r.map(p => [p.label, p.value]))
    expect(byLabel['藏书']).toBe(2)
    expect(byLabel['作者']).toBe(2)
    expect(byLabel['标签']).toBe(2)
    expect(byLabel['会话']).toBe(2)
    expect(byLabel['节点']).toBe(7)
  })
})

describe('buildLifeBook（人生之书聚合）', () => {
  it('空数据：8 维全 0、生命度 0、呼吸最缓最浅', () => {
    const lb = buildLifeBook(makeSnapshot())
    expect(Object.values(lb.dimensions).every(v => v === 0)).toBe(true)
    expect(lb.vitality).toBe(0)
    expect(lb.breath.durationSec).toBeCloseTo(12, 1)
    expect(lb.breath.depth).toBeCloseTo(0.02, 3)
    expect(lb.summary.totalBooks).toBe(0)
  })

  it('活跃数据：维度封顶、生命度拉满、呼吸更短更深', () => {
    const s = makeSnapshot({
      books: [
        { status: 'finished', rating: 5, tags: ['小说'], author: '甲', totalReadingTime: 3000 },
        { status: 'finished', rating: 4, tags: ['历史'], author: '乙', totalReadingTime: 2000 },
      ],
      sessions: Array.from({ length: 200 }, () => ({ date: thisMonth, duration: 30 })),
      analytics: { totalBooks: 2, totalReadingTime: 5000, streak: 30 },
      speed: { totalWordsRead: 200_000, averageWPM: 320 },
      knowledge: { totalNodes: 100, totalConnections: 200 },
      socialCount: 100,
      emotionAvg: 5,
    })
    const lb = buildLifeBook(s)
    expect(lb.dimensions.words).toBe(1)
    expect(lb.dimensions.knowledge).toBe(1)
    expect(lb.dimensions.focus).toBe(1)
    expect(lb.dimensions.activity).toBe(1)
    expect(lb.dimensions.body).toBe(1)
    expect(lb.dimensions.social).toBe(1)
    expect(lb.dimensions.cognition).toBe(1)
    expect(lb.dimensions.emotion).toBe(1)
    expect(lb.vitality).toBe(1)
    expect(lb.breath.durationSec).toBeCloseTo(4, 1)
    expect(lb.breath.depth).toBeCloseTo(0.08, 3)
    expect(lb.summary.totalWords).toBe(200_000)
    expect(lb.summary.avgWPM).toBe(320)
  })

  it('维度在 0..1 之间且单调跟随输入', () => {
    const low = buildLifeBook(makeSnapshot({ speed: { totalWordsRead: 1000, averageWPM: 0 }, knowledge: { totalNodes: 1, totalConnections: 0 } }))
    const high = buildLifeBook(makeSnapshot({ speed: { totalWordsRead: 100_000, averageWPM: 0 }, knowledge: { totalNodes: 50, totalConnections: 0 } }))
    expect(high.dimensions.words).toBeGreaterThan(low.dimensions.words)
    expect(high.dimensions.knowledge).toBeGreaterThan(low.dimensions.knowledge)
    expect(Object.values(high.dimensions).every(v => v >= 0 && v <= 1)).toBe(true)
  })
})
