// ============================================================
// 思绪书房 · 书房气象分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  studioOverview,
  writingRhythm,
  studioHealth,
  revisitSuggestion,
  studioInsights,
} from '../study-analytics'
import type { Note } from '../types'

const NOW = new Date(2026, 7, 1, 12, 0, 0) // 2026-08-01
const DAY = 86_400_000

function mk(over: Partial<Note> = {}): Note {
  const now = NOW.getTime()
  const created = over.createdAt || new Date(now - 5 * DAY).toISOString()
  return {
    id: over.id || `n${Math.random().toString(36).slice(2, 6)}`,
    title: over.title || '一篇笔记',
    content: over.content || '',
    tags: over.tags || [],
    createdAt: created,
    updatedAt: over.updatedAt || created,
    archived: over.archived,
    roomId: over.roomId,
    due: over.due,
    assignee: over.assignee,
    priority: over.priority,
    isAtomic: over.isAtomic,
  }
}

describe('studioOverview', () => {
  it('空书房返回零值', () => {
    const o = studioOverview([], NOW)
    expect(o.total).toBe(0)
    expect(o.totalTags).toBe(0)
    expect(o.avgPerDay).toBe(0)
  })

  it('统计活跃/归档/速记/标签/字数', () => {
    const list = [
      mk({ archived: true }),
      mk({ isAtomic: true, tags: ['a', 'b'], content: 'x'.repeat(100) }),
      mk({ tags: ['a'], content: 'y'.repeat(50) }),
    ]
    const o = studioOverview(list, NOW)
    expect(o.total).toBe(3)
    expect(o.active).toBe(2)
    expect(o.archived).toBe(1)
    expect(o.atomicCount).toBe(1)
    expect(o.totalTags).toBe(2)
    expect(o.totalWords).toBe(150)
  })
})

describe('writingRhythm', () => {
  it('统计连续天数（今日有则从今日算）', () => {
    const list = [
      mk({ createdAt: new Date(NOW.getTime() - 0 * DAY).toISOString() }),
      mk({ createdAt: new Date(NOW.getTime() - 1 * DAY).toISOString() }),
      mk({ createdAt: new Date(NOW.getTime() - 2 * DAY).toISOString() }),
    ]
    const r = writingRhythm(list, NOW)
    expect(r.consecutiveDays).toBe(3)
    expect(r.activeDays7).toBe(3)
    expect(r.longestStreak).toBe(3)
  })

  it('今日未写则从昨日回溯', () => {
    const list = [
      mk({ createdAt: '2026-07-31T09:00:00' }),
      mk({ createdAt: '2026-07-30T09:00:00' }),
    ]
    const r = writingRhythm(list, NOW)
    expect(r.consecutiveDays).toBe(2)
  })

  it('历史最长连续跨间隔也算', () => {
    const list = [
      mk({ createdAt: '2026-07-01T09:00:00' }),
      mk({ createdAt: '2026-07-02T09:00:00' }),
      mk({ createdAt: '2026-07-03T09:00:00' }),
    ]
    const r = writingRhythm(list, NOW)
    expect(r.longestStreak).toBe(3)
  })

  it('统计高频标签 Top', () => {
    const list = [
      mk({ tags: ['甲', '乙'] }),
      mk({ tags: ['甲'] }),
      mk({ tags: ['甲', '丙'] }),
    ]
    const r = writingRhythm(list, NOW)
    expect(r.topTags[0].tag).toBe('甲')
    expect(r.topTags[0].count).toBe(3)
  })
})

describe('revisitSuggestion', () => {
  it('空书房无建议', () => {
    expect(revisitSuggestion([], NOW)).toBeNull()
  })

  it('优先建议久未翻动的笔记', () => {
    const list = [
      mk({ title: '刚写的', createdAt: new Date(NOW.getTime() - 1 * DAY).toISOString(), updatedAt: new Date(NOW.getTime() - 1 * DAY).toISOString() }),
      mk({ title: '搁了一个月', content: 'x'.repeat(200), createdAt: new Date(NOW.getTime() - 60 * DAY).toISOString(), updatedAt: new Date(NOW.getTime() - 35 * DAY).toISOString() }),
    ]
    const s = revisitSuggestion(list, NOW)
    expect(s?.note.title).toBe('搁了一个月')
    expect(s?.days).toBeGreaterThanOrEqual(30)
  })

  it('归档笔记不参与温故', () => {
    const list = [mk({ title: '已归档', archived: true, updatedAt: new Date(NOW.getTime() - 40 * DAY).toISOString() })]
    expect(revisitSuggestion(list, NOW)).toBeNull()
  })
})

describe('studioHealth', () => {
  it('空书房', () => {
    const h = studioHealth([], NOW)
    expect(h.score).toBe(0)
    expect(h.label).toBe('墨迹初干')
  })

  it('勤写多标签深写得分更高', () => {
    const list: Note[] = []
    for (let i = 0; i < 6; i++) {
      list.push(mk({ createdAt: new Date(NOW.getTime() - i * DAY).toISOString(), content: 'x'.repeat(300), tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] }))
    }
    const h = studioHealth(list, NOW)
    expect(h.cadence).toBeGreaterThan(30)
    expect(h.breadth).toBe(30)
    expect(h.depth).toBe(30)
    expect(h.score).toBeGreaterThan(80)
  })
})

describe('studioInsights', () => {
  it('空书房给引导', () => {
    const list = studioInsights([], NOW)
    expect(list[0]).toContain('空着')
  })

  it('给出连续落字与话题洞察', () => {
    const list = studioInsights(
      [mk({ tags: ['前端'], createdAt: new Date(NOW.getTime() - 0 * DAY).toISOString() }),
       mk({ tags: ['前端'], createdAt: new Date(NOW.getTime() - 1 * DAY).toISOString() }),
       mk({ tags: ['前端'], createdAt: new Date(NOW.getTime() - 2 * DAY).toISOString() })],
      NOW,
      10,
    )
    expect(list.some((s) => s.includes('连续'))).toBe(true)
    expect(list.some((s) => s.includes('前端'))).toBe(true)
  })
})