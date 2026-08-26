// ============================================================
// 匠庐档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  craftOverview,
  craftStatusRows,
  craftTypeRows,
  craftEvolutionRows,
  craftRhythm,
  craftHealth,
  craftInsights,
  craftTopTags,
} from '../craft-analytics'
import type { CraftWork } from '../types'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-08-23T12:00:00Z')

/** 距今 n 天的 ISO 日期（完整时间戳） */
function iso(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * DAY).toISOString()
}

function mkWork(over: Partial<CraftWork> & { id: string; name: string }): CraftWork {
  return {
    icon: '🔨',
    description: '',
    color: '#b8a080',
    status: 'completed',
    type: 'writing',
    date: '2026-08',
    evolution: 100,
    tags: [],
    createdAt: iso(1),
    updatedAt: iso(1),
    ...over,
  }
}

describe('craftOverview', () => {
  it('空列表返回全零概览', () => {
    const ov = craftOverview([])
    expect(ov.total).toBe(0)
    expect(ov.avgEvolution).toBe(0)
    expect(ov.completed).toBe(0)
    expect(ov.wip).toBe(0)
    expect(ov.peak).toBeNull()
    expect(ov.latest).toBeNull()
  })

  it('统计状态、平均进化与峰值作品', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', status: 'completed', evolution: 100, icon: '⭐' }),
      mkWork({ id: 'b', name: 'B', status: 'refining', evolution: 60 }),
      mkWork({ id: 'c', name: 'C', status: 'draft', evolution: 20 }),
      mkWork({ id: 'd', name: 'D', status: 'archived', evolution: 100 }),
    ]
    const ov = craftOverview(works)
    expect(ov.total).toBe(4)
    expect(ov.completed).toBe(1)
    expect(ov.wip).toBe(2)
    expect(ov.archived).toBe(1)
    expect(ov.avgEvolution).toBe(70)
    expect(ov.peak).toEqual({ name: 'A', evolution: 100, icon: '⭐' })
  })

  it('打磨事件统计', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', evolutionHistory: [{ date: '2026-08-01', evolution: 50 }, { date: '2026-08-02', evolution: 100 }] }),
      mkWork({ id: 'b', name: 'B' }),
    ]
    expect(craftOverview(works).totalPolishEvents).toBe(2)
  })

  it('取创建时间最晚者为最近作品', () => {
    const works = [
      mkWork({ id: 'a', name: '早', createdAt: iso(10) }),
      mkWork({ id: 'b', name: '新', createdAt: iso(0) }),
    ]
    expect(craftOverview(works).latest).toEqual({ name: '新', date: iso(0) })
  })
})

describe('craftStatusRows', () => {
  it('四状态补齐并计算占比', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', status: 'completed' }),
      mkWork({ id: 'b', name: 'B', status: 'refining' }),
    ]
    const rows = craftStatusRows(works)
    expect(rows).toHaveLength(4)
    expect(rows.find((r) => r.key === 'completed')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'completed')!.pct).toBe(50)
    expect(rows.find((r) => r.key === 'draft')!.count).toBe(0)
  })
})

describe('craftTypeRows', () => {
  it('五类型补齐', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', type: 'writing' }),
      mkWork({ id: 'b', name: 'B', type: 'code' }),
    ]
    const rows = craftTypeRows(works)
    expect(rows).toHaveLength(5)
    expect(rows.find((r) => r.key === 'writing')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'code')!.label).toBe('代码')
  })
})

describe('craftEvolutionRows', () => {
  it('五阶段分档', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', evolution: 10 }),
      mkWork({ id: 'b', name: 'B', evolution: 40 }),
      mkWork({ id: 'c', name: 'C', evolution: 60 }),
      mkWork({ id: 'd', name: 'D', evolution: 80 }),
      mkWork({ id: 'e', name: 'E', evolution: 100 }),
    ]
    const rows = craftEvolutionRows(works)
    expect(rows.find((r) => r.key === 'seed')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'rough')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'polish')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'done')!.count).toBe(1)
  })
})

describe('craftRhythm', () => {
  it('统计近 30/90 天新作与最近停留', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', createdAt: iso(5) }),
      mkWork({ id: 'b', name: 'B', createdAt: iso(50) }),
      mkWork({ id: 'c', name: 'C', createdAt: iso(120) }),
    ]
    const r = craftRhythm(works, NOW)
    expect(r.recent30).toBe(1)
    expect(r.recent90).toBe(2)
    expect(r.worksPolished).toBe(0)
    expect(r.daysSinceLastCreated).toBe(5)
  })

  it('打磨史计入 worksPolished', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', evolutionHistory: [{ date: '2026-08-01', evolution: 60 }] }),
    ]
    expect(craftRhythm(works, NOW).worksPolished).toBe(1)
  })

  it('空列表返回默认', () => {
    const r = craftRhythm([], NOW)
    expect(r.recent30).toBe(0)
    expect(r.daysSinceLastCreated).toBeNull()
  })
})

describe('craftHealth', () => {
  it('空匠庐健康度最低', () => {
    const h = craftHealth([], NOW)
    expect(h.score).toBe(0)
    expect(h.label).toBe('朴石初开')
  })

  it('成品率与进化度越高 匠心越盛', () => {
    const div = craftHealth([
      mkWork({ id: 'a', name: 'A', status: 'draft', evolution: 20, createdAt: iso(200) }),
    ], NOW)
    const lush = craftHealth([
      mkWork({ id: 'a', name: 'A', status: 'completed', evolution: 100, createdAt: iso(1) }),
      mkWork({ id: 'b', name: 'B', status: 'completed', evolution: 100, createdAt: iso(1) }),
    ], NOW)
    expect(lush.complete).toBeGreaterThan(div.complete)
    expect(lush.refine).toBeGreaterThan(div.refine)
    expect(lush.label).toBe('匠心大成')
  })
})

describe('craftInsights', () => {
  it('空列表温和引导', () => {
    const insights = craftInsights([], NOW)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0]).toContain('匠庐')
  })

  it('半成品时提示工作台', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', status: 'refining' }),
      mkWork({ id: 'b', name: 'B', status: 'completed' }),
    ]
    const insights = craftInsights(works, NOW)
    expect(insights.some((s) => s.includes('半成品'))).toBe(true)
  })

  it('尊重 limit', () => {
    expect(craftInsights([], NOW, 1).length).toBeLessThanOrEqual(1)
  })
})

describe('craftTopTags', () => {
  it('按出现次数降序', () => {
    const works = [
      mkWork({ id: 'a', name: 'A', tags: ['心流', '随笔'] }),
      mkWork({ id: 'b', name: 'B', tags: ['心流', '刻意练习'] }),
      mkWork({ id: 'c', name: 'C', tags: ['心流'] }),
    ]
    const tags = craftTopTags(works)
    expect(tags[0]).toEqual({ tag: '心流', count: 3 })
    expect(tags.length).toBe(3)
  })
})