// ============================================================
// 岁时阁 · 年度俯瞰引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  buildYearOverview,
  getAvailableYears,
  buildYearComparison,
  yearOverviewInsights,
} from '../overview'
import type { SeasonalRitual, Ritual, LifeRitual } from '../types'

function ritual(overrides: Partial<SeasonalRitual> = {}): SeasonalRitual {
  return {
    id: 'sr1',
    name: '踏青',
    season: 'spring',
    description: '',
    count: 0,
    lastCompletedAt: null,
    createdAt: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

function lifeRitual(overrides: Partial<LifeRitual> = {}): LifeRitual {
  return {
    id: 'lr1',
    name: '婚礼',
    date: '2026-05-20',
    note: '',
    icon: '💒',
    type: '婚礼',
    ...overrides,
  }
}

function privateRitual(overrides: Partial<Ritual> = {}): Ritual {
  return {
    id: 'pr1',
    name: '晨读',
    date: '2026-04-10',
    note: '',
    icon: '🕯',
    ...overrides,
  }
}

describe('buildYearOverview 年度俯瞰', () => {
  it('空数据返回全零统计', () => {
    const ov = buildYearOverview(2026, [], [], [])
    expect(ov.months).toHaveLength(12)
    expect(ov.stats.totalRituals).toBe(0)
    expect(ov.stats.activeMonths).toBe(0)
    expect(ov.stats.peakCount).toBe(0)
  })

  it('统计四季仪式完成次数并按月归集', () => {
    const rituals = [
      ritual({ id: 'r1', name: '踏青', count: 3, lastCompletedAt: '2026-03-15T00:00:00Z' }),
      ritual({ id: 'r2', name: '秋收', count: 2, lastCompletedAt: '2026-09-10T00:00:00Z' }),
    ]
    const ov = buildYearOverview(2026, rituals, [], [])
    expect(ov.stats.totalRituals).toBe(5)
    expect(ov.months[2].ritualCount).toBe(3) // 三月
    expect(ov.months[8].ritualCount).toBe(2) // 九月
    expect(ov.stats.peakMonth).toBe(3)
    expect(ov.stats.peakCount).toBe(3)
    expect(ov.stats.activeMonths).toBe(2)
  })

  it('统计生命仪礼与私人仪式', () => {
    const ov = buildYearOverview(2026, [], [lifeRitual()], [privateRitual()])
    expect(ov.stats.lifeRitualCount).toBe(1)
    expect(ov.stats.privateRitualCount).toBe(1)
    expect(ov.months[4].lifeRituals).toHaveLength(1) // 五月
    expect(ov.months[3].privateRituals).toHaveLength(1) // 四月
  })

  it('不同年份的仪式互不串扰', () => {
    const rituals = [
      ritual({ id: 'r1', count: 4, lastCompletedAt: '2025-06-01T00:00:00Z' }),
      ritual({ id: 'r2', count: 2, lastCompletedAt: '2026-06-01T00:00:00Z' }),
    ]
    const ov2025 = buildYearOverview(2025, rituals, [], [])
    const ov2026 = buildYearOverview(2026, rituals, [], [])
    expect(ov2025.stats.totalRituals).toBe(4)
    expect(ov2026.stats.totalRituals).toBe(2)
  })
})

describe('getAvailableYears 可用年份', () => {
  it('始终包含当前年份', () => {
    const years = getAvailableYears([], [], [])
    expect(years).toContain(new Date().getFullYear())
  })

  it('收集仪式创建与完成年份', () => {
    const rituals = [
      ritual({ id: 'r1', createdAt: '2025-03-01T00:00:00Z' }),
      ritual({ id: 'r2', createdAt: '2026-03-01T00:00:00Z', lastCompletedAt: '2026-03-15T00:00:00Z' }),
    ]
    const years = getAvailableYears(rituals, [], [])
    expect(years).toContain(2025)
    expect(years).toContain(2026)
  })

  it('收集生命仪礼与私人仪式年份', () => {
    const years = getAvailableYears([], [lifeRitual({ date: '2024-05-20' })], [privateRitual({ date: '2023-04-10' })])
    expect(years).toContain(2024)
    expect(years).toContain(2023)
  })
})

describe('buildYearComparison 年度对比', () => {
  it('按年份升序输出对比数据', () => {
    const rituals = [
      ritual({ id: 'r1', count: 2, lastCompletedAt: '2025-06-01T00:00:00Z' }),
      ritual({ id: 'r2', count: 5, lastCompletedAt: '2026-06-01T00:00:00Z' }),
    ]
    const cmp = buildYearComparison([2026, 2025], rituals, [], [])
    expect(cmp.years).toEqual([2025, 2026])
    expect(cmp.rituals).toEqual([2, 5])
  })
})

describe('yearOverviewInsights 温和洞察', () => {
  it('空数据返回引导语', () => {
    const ov = buildYearOverview(2026, [], [], [])
    const insights = yearOverviewInsights(ov)
    expect(insights).toHaveLength(1)
    expect(insights[0]).toContain('还没有仪式记录')
  })

  it('有仪式时给出完成次数与最活跃月', () => {
    const rituals = [
      ritual({ id: 'r1', count: 3, lastCompletedAt: '2026-03-15T00:00:00Z' }),
    ]
    const ov = buildYearOverview(2026, rituals, [], [])
    const insights = yearOverviewInsights(ov)
    expect(insights[0]).toContain('2026 年共完成 3 次')
    expect(insights[0]).toContain('三月')
  })

  it('覆盖月数多时给出渐成习惯评估', () => {
    const rituals = [
      ritual({ id: 'r1', count: 1, lastCompletedAt: '2026-01-15T00:00:00Z' }),
      ritual({ id: 'r2', count: 1, lastCompletedAt: '2026-02-15T00:00:00Z' }),
      ritual({ id: 'r3', count: 1, lastCompletedAt: '2026-03-15T00:00:00Z' }),
      ritual({ id: 'r4', count: 1, lastCompletedAt: '2026-04-15T00:00:00Z' }),
      ritual({ id: 'r5', count: 1, lastCompletedAt: '2026-05-15T00:00:00Z' }),
      ritual({ id: 'r6', count: 1, lastCompletedAt: '2026-06-15T00:00:00Z' }),
    ]
    const ov = buildYearOverview(2026, rituals, [], [])
    const insights = yearOverviewInsights(ov)
    expect(insights.some(i => i.includes('岁时渐成习惯'))).toBe(true)
  })

  it('有生命仪礼时给出提示', () => {
    const ov = buildYearOverview(2026, [], [lifeRitual()], [])
    const insights = yearOverviewInsights(ov)
    expect(insights.some(i => i.includes('生命仪礼'))).toBe(true)
  })

  it('对比数据上升时给出生长洞察', () => {
    const rituals = [
      ritual({ id: 'r1', count: 2, lastCompletedAt: '2025-06-01T00:00:00Z' }),
      ritual({ id: 'r2', count: 5, lastCompletedAt: '2026-06-01T00:00:00Z' }),
    ]
    const ov = buildYearOverview(2026, rituals, [], [])
    const cmp = buildYearComparison([2025, 2026], rituals, [], [])
    const insights = yearOverviewInsights(ov, cmp)
    expect(insights.some(i => i.includes('较上年多 3 次'))).toBe(true)
  })

  it('洞察不超过 limit 条', () => {
    const rituals = [
      ritual({ id: 'r1', count: 3, lastCompletedAt: '2026-03-15T00:00:00Z' }),
      ritual({ id: 'r2', count: 2, lastCompletedAt: '2026-09-10T00:00:00Z' }),
    ]
    const ov = buildYearOverview(2026, rituals, [lifeRitual()], [privateRitual()])
    const cmp = buildYearComparison([2025, 2026], rituals, [lifeRitual()], [privateRitual()])
    const insights = yearOverviewInsights(ov, cmp, 4)
    expect(insights.length).toBeLessThanOrEqual(4)
  })
})
