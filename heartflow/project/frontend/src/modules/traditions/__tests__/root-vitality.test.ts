import { describe, it, expect } from 'vitest'
import {
  vitalityScore,
  growthStage,
  cultivate,
  syntaxTermLink,
  GROWTH_STAGE_META,
} from '../root-vitality'
import type { FolkloreEntry } from '../types'

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
    recordedAt: new Date('2026-01-01').toISOString(),
    practiceCount: 0,
    source: 'family',
    mediaUrls: [],
    ...overrides,
  }
}

const NOW = new Date('2026-06-01').getTime()

describe('vitalityScore', () => {
  it('全新未实践的种子：以记录时间为锚，新鲜度给分', () => {
    const e = makeEntry({ recordedAt: new Date(NOW - 3 * 86400000).toISOString() })
    // recency≈40*(1-3/90)≈38，tenure 0，健康 base 20 → 约 58
    const v = vitalityScore(e, NOW)
    expect(v).toBeGreaterThanOrEqual(30)
    expect(v).toBeLessThanOrEqual(100)
  })

  it('高实践量且刚实践过 → 接近满分上限', () => {
    const e = makeEntry({
      practiceCount: 500,
      lastPracticedAt: new Date(NOW - 1000).toISOString(),
    })
    const v = vitalityScore(e, NOW)
    expect(v).toBeGreaterThanOrEqual(90)
  })

  it('濒危条目基础值更低（更脆弱）', () => {
    const a = makeEntry({ practiceCount: 0, endangered: false, recordedAt: new Date(NOW).toISOString() })
    const b = makeEntry({ practiceCount: 0, endangered: true, recordedAt: new Date(NOW).toISOString() })
    expect(vitalityScore(a, NOW)).toBeGreaterThan(vitalityScore(b, NOW))
  })

  it('久未实践新鲜度衰减到近 0，只剩实践积累 + base', () => {
    const e = makeEntry({
      practiceCount: 10, // log2(11)*12≈42 → cap 45
      lastPracticedAt: new Date(NOW - 400 * 86400000).toISOString(),
      endangered: true,
    })
    const v = vitalityScore(e, NOW)
    // recency≈0, tenure 42, base 10 → 52
    expect(v).toBe(52)
  })
})

describe('growthStage', () => {
  it('生命力决定阶段边界', () => {
    const fresh = makeEntry({ practiceCount: 0, recordedAt: new Date(NOW).toISOString(), endangered: false })
    expect(growthStage(fresh, NOW)).toBe('sprout') // ~60 fresh healthy
    const canopy = makeEntry({ practiceCount: 500, lastPracticedAt: new Date(NOW - 1000).toISOString() })
    expect(growthStage(canopy, NOW)).toBe('canopy')
  })
})

describe('cultivate', () => {
  it('产出阶段分布、均值与排序清单', () => {
    const entries = [
      makeEntry({ id: 'a', practiceCount: 500, lastPracticedAt: new Date(NOW - 1000).toISOString() }),
      makeEntry({ id: 'b', practiceCount: 0, recordedAt: new Date(NOW - 500 * 86400000).toISOString(), endangered: true }),
      makeEntry({ id: 'c', practiceCount: 3, recordedAt: new Date(NOW - 10 * 86400000).toISOString() }),
    ]
    const board = cultivate(entries, NOW)
    expect(board.total).toBe(3)
    expect(board.avgVitality).toBeGreaterThanOrEqual(0)
    expect(board.avgVitality).toBeLessThanOrEqual(100)
    expect(board.byStage.reduce((s, x) => s + x.count, 0)).toBe(3)
    expect(board.thriving.map((e) => e.id)).toContain('a')
    expect(board.withering.map((e) => e.id)).toContain('b')
    expect(board.needNurture.map((e) => e.id)).toContain('b')
  })

  it('空族返回全零且不崩溃', () => {
    const board = cultivate([], NOW)
    expect(board.total).toBe(0)
    expect(board.avgVitality).toBe(0)
    expect(board.byStage.every((s) => s.count === 0)).toBe(true)
  })
})

describe('syntaxTermLink', () => {
  it('命中标签即可建立岁时关联', () => {
    expect(syntaxTermLink(makeEntry({ tags: ['雨水', '农事'] }), ['雨水'])).toBe(true)
    expect(syntaxTermLink(makeEntry({ tags: ['端午', '龙舟'] }), ['大雪'])).toBe(false)
  })
  it('空关键字集返回 false', () => {
    expect(syntaxTermLink(makeEntry(), [])).toBe(false)
  })
  it('存在全部标签元数据', () => {
    for (const stage of Object.keys(GROWTH_STAGE_META)) expect(GROWTH_STAGE_META[stage as keyof typeof GROWTH_STAGE_META].label).toBeTruthy()
  })
})