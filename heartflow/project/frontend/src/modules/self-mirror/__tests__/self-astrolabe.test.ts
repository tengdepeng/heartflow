// ============================================================
// 自体星盘测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { housesToAstrolabe, deriveAstrolabeInsight } from '../self-astrolabe'
import { createEmptyHouses } from '../twelve-houses'

describe('housesToAstrolabe', () => {
  it('将 12 宫格映射为星盘点', () => {
    const houses = createEmptyHouses()
    const data = housesToAstrolabe(houses)
    expect(data.points).toHaveLength(12)
    expect(data.coverage).toBe(0)
  })

  it('满评星盘覆盖率为 100', () => {
    const houses = createEmptyHouses()
    houses.forEach(h => { h.rating = 5 })
    const data = housesToAstrolabe(houses)
    expect(data.coverage).toBe(100)
  })
})

describe('deriveAstrolabeInsight', () => {
  it('未评估时返回提示', () => {
    const houses = createEmptyHouses()
    const insight = deriveAstrolabeInsight(houses)
    expect(insight.strongest).toBe('—')
    expect(insight.advice).toBeTruthy()
  })

  it('识别最强和最弱维度', () => {
    const houses = createEmptyHouses()
    houses[0].rating = 5
    houses[1].rating = 1
    const insight = deriveAstrolabeInsight(houses)
    expect(insight.strongest).toContain(houses[0].label)
    expect(insight.weakest).toContain(houses[1].label)
  })
})