import { describe, it, expect } from 'vitest'
import type { FolkloreEntry } from '../types'
import {
  traditionsOverview,
  traditionsCraftRows,
  traditionsRitualRows,
  traditionsSourceRows,
  traditionsRegionRows,
  practiceBuckets,
  traditionsRhythm,
  traditionsHealth,
  traditionsInsights,
  traditionsTopTags,
} from '../traditions-analytics'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-06-01T00:00:00Z').getTime()

function makeEntry(overrides: Partial<FolkloreEntry> = {}): FolkloreEntry {
  return {
    id: 'e1',
    name: '端午龙舟',
    category: 'seasonal',
    region: '江南',
    description: '',
    steps: ['备料'],
    materials: ['木'],
    meanings: ['祈福'],
    tags: ['岁时', '龙舟'],
    endangered: false,
    recordedAt: new Date(NOW - 10 * DAY).toISOString(),
    practiceCount: 0,
    source: 'family',
    mediaUrls: [],
    ...overrides,
  }
}

describe('traditionsOverview', () => {
  it('空输入时各项归零且无信息', () => {
    const ov = traditionsOverview([], new Date(NOW))
    expect(ov.total).toBe(0)
    expect(ov.endangered).toBe(0)
    expect(ov.totalPracticeCount).toBe(0)
    expect(ov.withInheritor).toBe(0)
    expect(ov.avgPracticeCount).toBe(0)
    expect(ov.topPracticed).toBeNull()
    expect(ov.latest).toBeNull()
  })

  it('统计濒危 / 实践 / 传承人 / 类别与地域覆盖数', () => {
    const entries = [
      makeEntry({ id: 'a', category: 'handicraft', region: '江南' }),
      makeEntry({ id: 'b', category: 'culinary', region: '岭南', practiceCount: 4, lastPracticedAt: new Date(NOW - 2 * DAY).toISOString(), inheritor: '王师傅' } as Partial<FolkloreEntry>),
      makeEntry({ id: 'c', category: 'seasonal', endangered: true }),
    ]
    const ov = traditionsOverview(entries, new Date(NOW))
    expect(ov.total).toBe(3)
    expect(ov.endangered).toBe(1)
    expect(ov.totalPracticeCount).toBe(4)
    expect(ov.withInheritor).toBe(1)
    expect(ov.practiced).toBe(1)
    expect(ov.categoryCount).toBe(3)
    expect(ov.regionCount).toBe(2)
    expect(ov.topPracticed).toEqual({ name: '端午龙舟', count: 4 })
  })

  it('平均实践次数保留一位小数', () => {
    const entries = [makeEntry({ practiceCount: 1 }), makeEntry({ practiceCount: 2 })]
    expect(traditionsOverview(entries, new Date(NOW)).avgPracticeCount).toBe(1.5)
  })

  it('仅统计近 30 天内的新记录', () => {
    const old = makeEntry({ id: 'old', recordedAt: new Date(NOW - 60 * DAY).toISOString() })
    const fresh = makeEntry({ id: 'new', recordedAt: new Date(NOW - 1 * DAY).toISOString() })
    const ov = traditionsOverview([old, fresh], new Date(NOW))
    expect(ov.recentlyRecorded30).toBe(1)
    expect(ov.latest?.name).toBe('端午龙舟')
  })
})

describe('traditionsCraftRows / traditionsRitualRows', () => {
  it('技艺仅统计技艺类条目，按数量降序并带占比', () => {
    const entries = [
      makeEntry({ id: 'a', category: 'handicraft' }),
      makeEntry({ id: 'b', category: 'handicraft' }),
      makeEntry({ id: 'c', category: 'culinary' }),
      makeEntry({ id: 'd', category: 'seasonal' }), // 仪式，不进入技艺
    ]
    const rows = traditionsCraftRows(entries)
    expect(rows.length).toBe(2)
    expect(rows[0]).toMatchObject({ key: 'handicraft', count: 2, pct: 67 })
    expect(rows[1]).toMatchObject({ key: 'culinary', count: 1, pct: 33 })
  })

  it('仪式分布仅统计仪式类条目', () => {
    const entries = [
      makeEntry({ id: 'a', category: 'life' }),
      makeEntry({ id: 'b', category: 'life' }),
      makeEntry({ id: 'c', category: 'handicraft' }), // 技艺，不进入仪式
    ]
    const rows = traditionsRitualRows(entries)
    expect(rows.length).toBe(1)
    expect(rows[0]).toMatchObject({ key: 'life', count: 2, pct: 100 })
  })
})

describe('traditionsSourceRows / traditionsRegionRows', () => {
  it('来源分布覆盖全部四类来源', () => {
    const entries = [
      makeEntry({ source: 'family' }),
      makeEntry({ source: 'personal' }),
      makeEntry({ source: 'community' }),
      makeEntry({ source: 'public' }),
    ]
    const rows = traditionsSourceRows(entries)
    expect(rows).toHaveLength(4)
    const family = rows.find((r) => r.key === 'family')
    expect(family).toMatchObject({ count: 1, pct: 25 })
  })

  it('地域分布按数量降序，未标注合并为一类', () => {
    const entries = [
      makeEntry({ region: '江南' }),
      makeEntry({ region: '岭南' }),
      makeEntry({ region: '岭南' }),
      makeEntry({ region: '' }),
    ]
    const rows = traditionsRegionRows(entries)
    expect(rows[0]).toMatchObject({ label: '岭南', count: 2, pct: 50 })
    expect(rows.some((r) => r.label === '未标注')).toBe(true)
  })
})

describe('practiceBuckets', () => {
  it('按实践次数分档：从未 / 偶有 / 常践', () => {
    const entries = [
      makeEntry({ practiceCount: 0 }),
      makeEntry({ practiceCount: 1 }),
      makeEntry({ practiceCount: 2 }),
      makeEntry({ practiceCount: 5 }),
    ]
    const b = practiceBuckets(entries)
    expect(b.never).toMatchObject({ count: 1, pct: 25 })
    expect(b.light).toMatchObject({ count: 2, pct: 50 })
    expect(b.active).toMatchObject({ count: 1, pct: 25 })
  })
})

describe('traditionsRhythm', () => {
  it('统计近 30 / 90 天记录与近 30 天实践活力', () => {
    const entries = [
      makeEntry({ id: 'a', recordedAt: new Date(NOW - 5 * DAY).toISOString(), practiceCount: 1, lastPracticedAt: new Date(NOW - 5 * DAY).toISOString() }),
      makeEntry({ id: 'b', recordedAt: new Date(NOW - 60 * DAY).toISOString(), practiceCount: 0 }),
    ]
    const r = traditionsRhythm(entries, new Date(NOW))
    expect(r.recorded30).toBe(1)
    expect(r.recorded90).toBe(2)
    expect(r.practiced30).toBe(1)
    expect(r.totalPractice).toBe(1)
    expect(r.avgPractice).toBe(0.5)
  })
})

describe('traditionsHealth', () => {
  it('空库时文明待耕', () => {
    expect(traditionsHealth([], new Date(NOW))).toMatchObject({ score: 0, label: '文明待耕' })
  })

  it('广度随类别与地域多样提升', () => {
    const entries = [
      makeEntry({ id: 'a', category: 'handicraft', region: '江南' }),
      makeEntry({ id: 'b', category: 'culinary', region: '岭南' }),
      makeEntry({ id: 'c', category: 'textile', region: '西北' }),
    ]
    const health = traditionsHealth(entries, new Date(NOW))
    expect(health.breadth).toBeGreaterThan(10)
  })

  it('传承轴：越多传承人且越少濒危得分越高', () => {
    const withInheritor = traditionsHealth(
      [makeEntry({ inheritor: '王师傅', practiceCount: 3, lastPracticedAt: new Date(NOW - 1 * DAY).toISOString() })],
      new Date(NOW),
    )
    const orphaned = traditionsHealth(
      [makeEntry({ endangered: true, practiceCount: 0 })],
      new Date(NOW),
    )
    expect(withInheritor.heritage).toBeGreaterThan(orphaned.heritage)
  })

  it('延续轴：近 90 天有记录且实践活跃时更高', () => {
    const active = traditionsHealth(
      [makeEntry({ recordedAt: new Date(NOW - 2 * DAY).toISOString(), practiceCount: 3, lastPracticedAt: new Date(NOW - 1 * DAY).toISOString() })],
      new Date(NOW),
    )
    const stale = traditionsHealth(
      [makeEntry({ recordedAt: new Date(NOW - 200 * DAY).toISOString(), practiceCount: 0 })],
      new Date(NOW),
    )
    expect(active.continuity).toBeGreaterThan(stale.continuity)
    expect(active.score).toBeGreaterThan(stale.score)
  })
})

describe('traditionsInsights', () => {
  it('空库有引导性提示', () => {
    const out = traditionsInsights([], new Date(NOW))
    expect(out.length).toBeGreaterThan(0)
  })

  it('濒危、无传承人、未实践各有对应洞察', () => {
    const out = traditionsInsights(
      [
        makeEntry({ endangered: true, practiceCount: 0 }),
        makeEntry({ id: 'b', practiceCount: 0 }),
      ],
      new Date(NOW),
    )
    expect(out.some((s) => s.includes('濒危'))).toBe(true)
    expect(out.some((s) => s.includes('传承人'))).toBe(true)
    expect(out.some((s) => s.includes('还未曾实践'))).toBe(true)
  })

  it('洞察数量受 limit 限制', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      makeEntry({ id: `e${i}`, category: i % 2 ? 'handicraft' : 'life', region: `区${i}` }),
    )
    const out = traditionsInsights(entries, new Date(NOW), 3)
    expect(out.length).toBeLessThanOrEqual(3)
  })
})

describe('traditionsTopTags', () => {
  it('高频标签按出现次数降序，忽略空白与大小写', () => {
    const entries = [
      makeEntry({ tags: ['岁时', '龙舟'] }),
      makeEntry({ tags: ['岁时', '江上'] }),
      makeEntry({ tags: [' 岁时 ', ''] }),
    ]
    const tags = traditionsTopTags(entries)
    expect(tags[0]).toEqual({ tag: '岁时', count: 3 })
    expect(tags.length).toBe(3)
  })
})