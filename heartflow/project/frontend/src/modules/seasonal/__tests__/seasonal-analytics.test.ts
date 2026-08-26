// ============================================================
// 岁时档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  seasonalOverview,
  seasonRows,
  seasonHealth,
  seasonalInsights,
} from '../seasonal-analytics'
import type { SeasonalRitual } from '../types'

const DAY = 86_400_000

function mkRitual(season: SeasonalRitual['season'], count: number, completedAt: string | null): SeasonalRitual {
  return {
    id: `${season}_${count}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${season}仪式`,
    season,
    description: '',
    count,
    lastCompletedAt: completedAt,
    createdAt: '2025-01-01T00:00:00.000Z',
  }
}

const NOW = new Date('2026-08-22T12:00:00.000Z')
function iso(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * DAY).toISOString()
}

describe('seasonalOverview', () => {
  it('空仪式列表返回全零概览', () => {
    const ov = seasonalOverview([], NOW)
    expect(ov.total).toBe(0)
    expect(ov.awakened).toBe(0)
    expect(ov.doneThisYear).toBe(0)
    expect(ov.avgCount).toBe(0)
    expect(ov.streak).toBe(0)
    expect(ov.coveredSeasons).toBe(0)
    expect(ov.lastActive).toBeNull()
  })

  it('统计仪式总数与已唤醒数', () => {
    const rituals = [
      mkRitual('spring', 0, null),
      mkRitual('spring', 3, iso(10)),
      mkRitual('winter', 1, iso(5)),
    ]
    const ov = seasonalOverview(rituals, NOW)
    expect(ov.total).toBe(3)
    expect(ov.awakened).toBe(2)
    expect(ov.coveredSeasons).toBe(2)
  })

  it('统计今年完成次数与平均次数', () => {
    const rituals = [
      mkRitual('spring', 4, iso(3)),
      mkRitual('winter', 2, iso(8)),
    ]
    const ov = seasonalOverview(rituals, NOW)
    expect(ov.doneThisYear).toBe(6)
    expect(ov.avgCount).toBe(3)
  })

  it('计算最近完成时刻', () => {
    const rituals = [mkRitual('autumn', 2, iso(1))]
    const ov = seasonalOverview(rituals, NOW)
    expect(ov.lastActive).toBe(iso(1))
  })

  it('连续打卡天数：从今日回溯', () => {
    const rituals = [
      mkRitual('spring', 1, iso(0)),
      mkRitual('summer', 1, iso(1)),
      mkRitual('autumn', 1, iso(2)),
    ]
    const ov = seasonalOverview(rituals, NOW)
    expect(ov.streak).toBe(3)
  })

  it('昨日仍在连续但今日未完成，天数从昨日起算', () => {
    const rituals = [
      mkRitual('spring', 1, iso(1)),
      mkRitual('summer', 1, iso(2)),
    ]
    const ov = seasonalOverview(rituals, NOW)
    expect(ov.streak).toBe(2)
  })

  it('无近两日完成则连续归零', () => {
    const rituals = [mkRitual('spring', 1, iso(3)), mkRitual('winter', 1, iso(7))]
    const ov = seasonalOverview(rituals, NOW)
    expect(ov.streak).toBe(0)
  })
})

describe('seasonRows', () => {
  it('四季补齐，统计仪式数与完成数', () => {
    const rituals = [
      mkRitual('spring', 0, null),
      mkRitual('spring', 2, iso(2)),
      mkRitual('winter', 1, iso(6)),
    ]
    const rows = seasonRows(rituals)
    expect(rows).toHaveLength(4)
    const spring = rows.find((r) => r.season === 'spring')!
    expect(spring.ritualCount).toBe(2)
    expect(spring.completedCount).toBe(1)
    expect(spring.doneRate).toBe(50)
    expect(rows.find((r) => r.season === 'summer')!.ritualCount).toBe(0)
  })

  it('附上中文标签与图标', () => {
    const rows = seasonRows([mkRitual('winter', 1, iso(1))])
    const winter = rows.find((r) => r.season === 'winter')!
    expect(winter.label).toBe('冬')
    expect(winter.icon).toBeTruthy()
  })
})

describe('seasonHealth', () => {
  it('空库健康度为零（岁时待启）', () => {
    const h = seasonHealth([], NOW)
    expect(h.score).toBe(0)
    expect(h.breadth).toBe(0)
    expect(h.depth).toBe(0)
    expect(h.cadence).toBe(0)
    expect(h.label).toBe('岁时待启')
  })

  it('覆盖全季且高完成得高分', () => {
    const rituals = [
      mkRitual('spring', 6, iso(0)),
      mkRitual('summer', 6, iso(1)),
      mkRitual('autumn', 6, iso(2)),
      mkRitual('winter', 6, iso(3)),
    ]
    const h = seasonHealth(rituals, NOW)
    expect(h.breadth).toBe(100)
    expect(h.depth).toBe(100)
    expect(h.cadence).toBeGreaterThan(0)
    expect(h.score).toBeGreaterThan(70)
    expect(h.label).toBe('岁时入序')
  })

  it('节律越活跃 cadence 越高', () => {
    const recent = Array.from({ length: 7 }, (_, i) => mkRitual('spring', 1, iso(i)))
    const h = seasonHealth(recent, NOW)
    expect(h.cadence).toBe(100)
  })
})

describe('seasonalInsights', () => {
  it('空库给出温和引导', () => {
    const insights = seasonalInsights([], NOW)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0]).toContain('岁时阁')
  })

  it('有仪式未唤醒时提示开始', () => {
    const insights = seasonalInsights([mkRitual('spring', 0, null)], NOW)
    expect(insights.some((s) => s.includes('还没开始'))).toBe(true)
  })

  it('连续多天归来时提示节律成形', () => {
    const rituals = [
      mkRitual('spring', 1, iso(0)),
      mkRitual('spring', 1, iso(1)),
      mkRitual('spring', 1, iso(2)),
    ]
    const insights = seasonalInsights(rituals, NOW)
    expect(insights.some((s) => s.includes('连续'))).toBe(true)
  })

  it('只拾起一季时稍作提醒', () => {
    const rituals = [mkRitual('spring', 2, iso(1))]
    const insights = seasonalInsights(rituals, NOW, 10)
    expect(insights.some((s) => s.includes('另三季'))).toBe(true)
  })

  it('尊重 limit 限制', () => {
    const rituals = [
      mkRitual('spring', 2, iso(1)),
      mkRitual('autumn', 1, iso(6)),
      mkRitual('winter', 0, null),
    ]
    const insights = seasonalInsights(rituals, NOW, 2)
    expect(insights.length).toBeLessThanOrEqual(2)
  })
})