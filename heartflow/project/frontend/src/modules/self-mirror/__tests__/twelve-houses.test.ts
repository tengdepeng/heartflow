// ============================================================
// 十二宫格测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { createEmptyHouses, computeHouseStats, assessBalance } from '../twelve-houses'

describe('createEmptyHouses', () => {
  it('创建 12 个空宫格', () => {
    const houses = createEmptyHouses()
    expect(houses).toHaveLength(12)
    expect(houses.every(h => h.rating === 0)).toBe(true)
    expect(houses.every(h => h.note === '')).toBe(true)
  })
})

describe('computeHouseStats', () => {
  it('未评估时返回零值', () => {
    const houses = createEmptyHouses()
    const stats = computeHouseStats(houses)
    expect(stats.average).toBe(0)
    expect(stats.total).toBe(0)
  })

  it('计算平均值', () => {
    const houses = createEmptyHouses()
    houses[0].rating = 5
    houses[1].rating = 3
    const stats = computeHouseStats(houses)
    expect(stats.average).toBe(4)
    expect(stats.total).toBe(8)
    expect(stats.strengths).toHaveLength(1)
  })
})

describe('assessBalance', () => {
  it('不足 3 个评估时返回提示', () => {
    const houses = createEmptyHouses()
    houses[0].rating = 5
    const result = assessBalance(houses)
    expect(result.score).toBe(0)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('均衡时返回高分', () => {
    const houses = createEmptyHouses()
    houses.forEach(h => { h.rating = 4 })
    const result = assessBalance(houses)
    expect(result.score).toBeGreaterThanOrEqual(80)
  })
})