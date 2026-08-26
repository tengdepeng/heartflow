import { describe, it, expect } from 'vitest'
import {
  isNewJourney,
  buildJourneys,
  computeJourneyStats,
  journeySpanScore,
  type Journey,
} from '../journey'
import type { FootprintRecord } from '../../footprint/footprint'

function rec(id: string, region: string, date: string): FootprintRecord {
  return { id, name: '站', region, date, type: 'city' }
}

describe('journey · 旅程引擎', () => {
  it('isNewJourney：同地区且间隔小为同一旅程', () => {
    expect(isNewJourney(rec('a', '杭州', '2024-04-01'), rec('b', '杭州', '2024-04-05'), 45)).toBe(false)
  })

  it('isNewJourney：间隔超阈值开启新旅程', () => {
    expect(isNewJourney(rec('a', '杭州', '2024-04-01'), rec('b', '杭州', '2024-08-01'), 45)).toBe(true)
  })

  it('isNewJourney：地区变化即使同日也开新旅程', () => {
    expect(isNewJourney(rec('a', '杭州', '2024-04-01'), rec('b', '大理', '2024-04-02'), 45)).toBe(true)
  })

  it('buildJourneys：把足迹聚成旅程并按天数计算跨度', () => {
    const sorted = [
      rec('a', '杭州', '2024-04-01'),
      rec('b', '杭州', '2024-04-03'),
      rec('c', '大理', '2024-10-01'),
      rec('d', '大理', '2024-10-02'),
    ].sort((x, y) => x.date.localeCompare(y.date))
    const journeys = buildJourneys(sorted, 45)
    expect(journeys.length).toBe(2)
    expect(journeys[0].stops).toBe(2)
    expect(journeys[0].spanDays).toBe(3)
    expect(journeys[0].regions).toEqual(['杭州'])
    expect(journeys[1].regions).toEqual(['大理'])
  })

  it('buildJourneys：空输入返回空', () => {
    expect(buildJourneys([], 45)).toEqual([])
  })

  it('computeJourneyStats：统计旅程数/总天数/平均/最长', () => {
    const journeys: Journey[] = [
      { id: '1', startDate: '2024-04-01', endDate: '2024-04-03', regions: ['杭州'], stops: 2, spanDays: 3 },
      { id: '2', startDate: '2024-10-01', endDate: '2024-10-01', regions: ['大理'], stops: 1, spanDays: 1 },
    ]
    const s = computeJourneyStats(journeys)
    expect(s.total).toBe(2)
    expect(s.totalDays).toBe(4)
    expect(s.avgDays).toBe(2)
    expect(s.longestDays).toBe(3)
  })

  it('computeJourneyStats：空旅程零值', () => {
    const s = computeJourneyStats([])
    expect(s).toEqual({ total: 0, totalDays: 0, avgDays: 0, longestDays: 0 })
  })

  it('journeySpanScore：地区与天数越多跨度分越高且封顶 100', () => {
    expect(journeySpanScore({ id: '1', startDate: 'a', endDate: 'b', regions: ['杭州'], stops: 1, spanDays: 1 })).toBeLessThan(
      journeySpanScore({ id: '2', startDate: 'a', endDate: 'b', regions: ['杭州', '大理', '丽江', '成都'], stops: 8, spanDays: 30 }),
    )
    expect(journeySpanScore({ id: '3', startDate: 'a', endDate: 'b', regions: Array(8).fill('x'), stops: 60, spanDays: 60 })).toBe(100)
  })
})