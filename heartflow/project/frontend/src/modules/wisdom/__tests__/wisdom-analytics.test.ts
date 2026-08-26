import { describe, it, expect } from 'vitest'
import type { WisdomItem } from '../types'
import type { HistoryItem } from '../history'
import {
  classifyDomain,
  wisdomOverview,
  wisdomDomainRows,
  wisdomTagRows,
  wisdomMonthlyRows,
  wisdomRhythm,
  wisdomHealth,
  wisdomInsights,
  wisdomTopTags,
} from '../wisdom-analytics'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-06-01T00:00:00Z').getTime()

function makeItem(overrides: Partial<WisdomItem> = {}): WisdomItem {
  return {
    id: 'w1',
    question: '最近状态怎么样？',
    answer: '一周以来各时段都稳定，专注与休息交替着来。',
    createdAt: new Date(NOW - 10 * DAY).toISOString(),
    tags: ['近况', '状态'],
    ...overrides,
  }
}

function makeHistory(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 'h1',
    q: '最近状态怎么样？',
    a: '专注与休息交替着来',
    at: new Date(NOW - 3 * DAY).toISOString(),
    ...overrides,
  }
}

describe('classifyDomain', () => {
  it('依据关键词路由到对应领域', () => {
    expect(classifyDomain('最近情绪怎么样')).toBe('emotion')
    expect(classifyDomain('工作有什么进展')).toBe('work')
    expect(classifyDomain('身体还好吗')).toBe('body')
    expect(classifyDomain('朋友和家人近况')).toBe('relation')
    expect(classifyDomain('写了什么记录')).toBe('record')
  })

  it('无关键词时归为其他', () => {
    expect(classifyDomain('xyz')).toBe('other')
  })
})

describe('wisdomOverview', () => {
  it('空输入时各项归零且无信息', () => {
    const ov = wisdomOverview([], [], new Date(NOW))
    expect(ov.total).toBe(0)
    expect(ov.totalAsks).toBe(0)
    expect(ov.avgAnswerLen).toBe(0)
    expect(ov.topTag).toBeNull()
    expect(ov.topDomain).toBeNull()
    expect(ov.latestDate).toBeNull()
  })

  it('统计回答与标签与对话节律', () => {
    const items = [
      makeItem({ id: 'a', question: '最近状态怎么样？', answer: '很好，专注而平静', tags: ['近况', '状态'] }),
      makeItem({ id: 'b', question: '情绪波动大吗', answer: '有几次低落，也有开心', tags: ['情绪'] }),
      makeItem({ id: 'c', question: '什么也没写', answer: '', tags: [] }),
    ]
    const history = [makeHistory(), makeHistory({ id: 'h2', at: new Date(NOW - 1 * DAY).toISOString() })]
    const ov = wisdomOverview(items, history, new Date(NOW))
    expect(ov.total).toBe(3)
    expect(ov.totalAsks).toBe(2)
    expect(ov.withAnswer).toBe(2)
    expect(ov.tagCount).toBe(3)
    expect(ov.avgAnswerLen).toBeGreaterThan(0)
    expect([ov.topTag?.tag, ov.topTag?.count]).toEqual(['近况', 1])
  })

  it('仅统计近 30 天的记录与对话', () => {
    const items = [
      makeItem({ id: 'old', createdAt: new Date(NOW - 60 * DAY).toISOString() }),
      makeItem({ id: 'fresh', createdAt: new Date(NOW - 1 * DAY).toISOString() }),
    ]
    const history = [
      makeHistory({ at: new Date(NOW - 40 * DAY).toISOString() }),
      makeHistory({ id: 'h2', at: new Date(NOW - 2 * DAY).toISOString() }),
    ]
    const ov = wisdomOverview(items, history, new Date(NOW))
    expect(ov.recent30).toBe(1)
    expect(ov.recentAsks30).toBe(1)
    expect(ov.latestDate).toBe(items[1].createdAt)
  })
})

describe('wisdomDomainRows / wisdomTagRows', () => {
  it('领域分布按记录路由并带占比', () => {
    const items = [
      makeItem({ question: '最近状态怎么样？' }), // focus
      makeItem({ id: 'b', question: '情绪波动大吗' }), // emotion
      makeItem({ id: 'c', question: '情绪好一些了吗' }), // emotion
    ]
    const rows = wisdomDomainRows(items)
    const emotion = rows.find((r) => r.key === 'emotion')
    expect(emotion).toMatchObject({ count: 2, pct: 67 })
  })

  it('标签分布按出现次数降序', () => {
    const items = [
      makeItem({ tags: ['近况', '状态'] }),
      makeItem({ id: 'b', tags: ['近况', '情绪'] }),
    ]
    const rows = wisdomTagRows(items)
    expect(rows[0].label).toBe('近况')
    expect(rows[0].count).toBe(2)
  })
})

describe('wisdomMonthlyRows', () => {
  it('按月归组并返回最近月份', () => {
    const items = [
      makeItem({ createdAt: new Date('2026-05-10').toISOString() }),
      makeItem({ id: 'b', createdAt: new Date('2026-05-20').toISOString() }),
      makeItem({ id: 'c', createdAt: new Date('2026-03-01').toISOString() }),
    ]
    const rows = wisdomMonthlyRows(items)
    expect(rows[0].label).toBe('2026-05')
    expect(rows[0].count).toBe(2)
  })
})

describe('wisdomRhythm', () => {
  it('统计近 30 / 90 天记录与对话活力', () => {
    const items = [
      makeItem({ createdAt: new Date(NOW - 5 * DAY).toISOString() }),
      makeItem({ id: 'b', createdAt: new Date(NOW - 60 * DAY).toISOString() }),
    ]
    const history = [makeHistory({ at: new Date(NOW - 2 * DAY).toISOString() })]
    const r = wisdomRhythm(items, history, new Date(NOW))
    expect(r.recorded30).toBe(1)
    expect(r.recorded90).toBe(2)
    expect(r.asks30).toBe(1)
    expect(r.totalAsks).toBe(1)
  })
})

describe('wisdomHealth', () => {
  it('空库时慧心初醒', () => {
    expect(wisdomHealth([], [], new Date(NOW))).toMatchObject({ score: 0, label: '慧心初醒' })
  })

  it('广度随标签与领域多样提升', () => {
    const items = [
      makeItem({ id: 'a', question: '状态怎么样', tags: ['a'] }),
      makeItem({ id: 'b', question: '情绪好吗', tags: ['b'] }),
      makeItem({ id: 'c', question: '身体好吗', tags: ['c'] }),
      makeItem({ id: 'd', question: '朋友好吗', tags: ['d'] }),
    ]
    const broad = wisdomHealth(items, [], new Date(NOW))
    const narrow = wisdomHealth([makeItem()], [], new Date(NOW))
    expect(broad.breadth).toBeGreaterThan(narrow.breadth)
  })

  it('深度随回答丰富程度提升', () => {
    const rich = wisdomHealth(
      [makeItem({ answer: '这一周的状态整体稳定，情绪平稳而专注，偶尔有低落也很快恢复，身体也保持得不错。' })],
      [],
      new Date(NOW),
    )
    const shallow = wisdomHealth([makeItem({ answer: '还行' })], [], new Date(NOW))
    expect(rich.depth).toBeGreaterThan(shallow.depth)
  })

  it('延续轴：近记录与对话更活跃时更高', () => {
    const active = wisdomHealth(
      [makeItem({ createdAt: new Date(NOW - 2 * DAY).toISOString() })],
      [makeHistory({ at: new Date(NOW - 1 * DAY).toISOString() })],
      new Date(NOW),
    )
    const stale = wisdomHealth(
      [makeItem({ createdAt: new Date(NOW - 200 * DAY).toISOString() })],
      [],
      new Date(NOW),
    )
    expect(active.continuity).toBeGreaterThan(stale.continuity)
  })
})

describe('wisdomInsights', () => {
  it('空库有引导性提示', () => {
    const out = wisdomInsights([], [], new Date(NOW))
    expect(out.length).toBeGreaterThan(0)
  })

  it('浅回答、无对话各有对应洞察', () => {
    const out = wisdomInsights(
      [makeItem({ question: '状态怎么样', answer: '还行' })],
      [],
      new Date(NOW),
    )
    expect(out.some((s) => s.includes('回答'))).toBe(true)
    expect(out.some((s) => s.includes('对话'))).toBe(true)
  })

  it('洞察数量受 limit 限制', () => {
    const items = [makeItem(), makeItem({ id: 'b', question: '情绪好吗', tags: ['情绪'] })]
    const out = wisdomInsights(items, [], new Date(NOW), 2)
    expect(out.length).toBeLessThanOrEqual(2)
  })
})

describe('wisdomTopTags', () => {
  it('高频标签按次数降序，忽略空白与大小写', () => {
    const items = [
      makeItem({ tags: ['近况', '状态'] }),
      makeItem({ id: 'b', tags: ['近况', ' 近况 '] }),
      makeItem({ id: 'c', tags: [''] }),
    ]
    const tags = wisdomTopTags(items)
    expect(tags[0]).toEqual({ tag: '近况', count: 3 })
  })
})