import { describe, it, expect } from 'vitest'
import {
  computeFootprintStats,
  byType,
  searchFootprints,
  sortByDate,
  type FootprintRecord,
} from '../footprint'

function rec(partial: Partial<FootprintRecord>): FootprintRecord {
  return {
    id: partial.id ?? 'fp1',
    name: '西湖',
    region: '杭州',
    date: '2024-04-05',
    type: 'sight',
    mood: '宁静',
    ...partial,
  }
}

describe('footprint · 足迹志', () => {
  it('computeFootprintStats：统计总数、去重地区、类别、最早年份、月度', () => {
    const s = computeFootprintStats([
      rec({ id: 'a', name: '西湖', region: '杭州', type: 'sight', date: '2024-04-05' }),
      rec({ id: 'b', name: '山屿', region: '杭州', type: 'nature', date: '2024-04-12' }),
      rec({ id: 'c', name: '洱海', region: '大理', type: 'nature', date: '2025-01-10' }),
    ])
    expect(s.total).toBe(3)
    expect(s.uniqueRegions).toBe(2)
    expect(s.regions[0]).toEqual({ region: '杭州', count: 2 })
    expect(s.sinceYear).toBe(2024)
    const nature = s.byType.find((t) => t.type === 'nature')
    expect(nature!.count).toBe(2)
    expect(s.months.length).toBe(2)
  })

  it('computeFootprintStats：空列表返回零统计', () => {
    const s = computeFootprintStats([])
    expect(s.total).toBe(0)
    expect(s.uniqueRegions).toBe(0)
    expect(s.sinceYear).toBeNull()
  })

  it('byType：筛选类别与 all', () => {
    const list = [rec({ type: 'sight' }), rec({ type: 'nature' }), rec({ type: 'sight' })]
    expect(byType(list, 'sight').length).toBe(2)
    expect(byType(list, 'nature').length).toBe(1)
    expect(byType(list, 'all').length).toBe(3)
  })

  it('searchFootprints：按名称/地区搜索', () => {
    const list = [rec({ id: 'a', name: '西湖', region: '杭州' }), rec({ id: 'b', name: '洱海', region: '大理' })]
    expect(searchFootprints(list, '西湖').length).toBe(1)
    expect(searchFootprints(list, '大理').length).toBe(1)
    expect(searchFootprints(list, 'xixi').length).toBe(0)
  })

  it('sortByDate：日期倒序', () => {
    const list = [rec({ id: 'a', date: '2024-01-01' }), rec({ id: 'b', date: '2025-06-01' })]
    const s = sortByDate(list)
    expect(s[0].id).toBe('b')
  })
})