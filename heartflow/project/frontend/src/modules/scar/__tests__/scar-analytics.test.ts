// ============================================================
// 铸造档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  scarOverview,
  scarTypeRows,
  scarBodyRows,
  scarRhythm,
  scarHealth,
  scarInsights,
} from '../scar-analytics'
import type { ScarMark } from '../marks'

const DAY = 86_400_000

function mk(
  bodyPart: string,
  severity: number,
  scarType: ScarMark['scarType'],
  at: string | null,
): ScarMark {
  return {
    id: `${bodyPart}_${Math.random().toString(36).slice(2, 6)}`,
    bodyPart,
    severity,
    description: '',
    scarType,
    at: at as string,
  }
}

const NOW = new Date('2026-08-22T12:00:00.000Z')
function iso(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * DAY).toISOString()
}

describe('scarOverview', () => {
  it('空印记返回全零概览', () => {
    const ov = scarOverview([], NOW)
    expect(ov.total).toBe(0)
    expect(ov.mild).toBe(0)
    expect(ov.severe).toBe(0)
    expect(ov.thisMonth).toBe(0)
    expect(ov.bodyPartsCovered).toBe(0)
    expect(ov.avgSeverity).toBe(0)
    expect(ov.avgAgeDays).toBe(0)
    expect(ov.lastActive).toBeNull()
  })

  it('统计轻/重/部位覆盖/平均严重度', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(5)),
      mk('肩', 4, 'impact', iso(10)),
      mk('手', 5, 'cut', iso(2)),
    ]
    const ov = scarOverview(marks, NOW)
    expect(ov.total).toBe(3)
    expect(ov.mild).toBe(1)
    expect(ov.severe).toBe(2)
    expect(ov.bodyPartsCovered).toBe(3)
    expect(ov.avgSeverity).toBe(4)
  })

  it('统计本月新增', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(1)), // 本月（2026-08）
      mk('肩', 4, 'impact', iso(150)), // 超过一个月
    ]
    const ov = scarOverview(marks, NOW)
    expect(ov.thisMonth).toBe(1)
  })

  it('取最近记录时刻', () => {
    const marks = [mk('腰', 3, 'wear', iso(1))]
    const ov = scarOverview(marks, NOW)
    expect(ov.lastActive).toBe(iso(1))
  })

  it('计算平均年龄（天）', () => {
    const marks = [mk('腰', 3, 'wear', iso(10)), mk('手', 2, 'burn', iso(2))]
    const ov = scarOverview(marks, NOW)
    expect(ov.avgAgeDays).toBe(6)
  })
})

describe('scarTypeRows', () => {
  it('四季类型补齐并计算占比', () => {
    const marks = [
      mk('腰', 3, 'impact', iso(1)),
      mk('手', 2, 'impact', iso(2)),
      mk('脚', 1, 'cut', iso(3)),
    ]
    const rows = scarTypeRows(marks)
    expect(rows).toHaveLength(4)
    const impact = rows.find((r) => r.type === 'impact')!
    expect(impact.count).toBe(2)
    expect(impact.pct).toBe(67)
    expect(rows.find((r) => r.type === 'wear')!.count).toBe(0)
  })

  it('附上标签与图标', () => {
    const rows = scarTypeRows([mk('腰', 3, 'burn', iso(1))])
    const burn = rows.find((r) => r.type === 'burn')!
    expect(burn.label).toBeTruthy()
    expect(burn.icon).toBeTruthy()
  })
})

describe('scarBodyRows', () => {
  it('多部位降序排序', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(1)),
      mk('腰', 2, 'wear', iso(2)),
      mk('手', 1, 'cut', iso(3)),
    ]
    const rows = scarBodyRows(marks)
    expect(rows[0].bodyPart).toBe('腰')
    expect(rows[0].count).toBe(2)
    expect(rows[1].bodyPart).toBe('手')
  })

  it('空印记返回空数组', () => {
    expect(scarBodyRows([])).toEqual([])
  })
})

describe('scarRhythm', () => {
  it('统计近 7 天与近 30 天印记数', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(1)), // 一周内
      mk('手', 2, 'cut', iso(20)), // 月内
      mk('脚', 1, 'burn', iso(60)), // 月外
    ]
    const rh = scarRhythm(marks, NOW)
    expect(rh.weeklyCount).toBe(1)
    expect(rh.monthlyCount).toBe(2)
  })

  it('连续记录天数', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(0)),
      mk('手', 2, 'cut', iso(1)),
      mk('脚', 1, 'burn', iso(2)),
    ]
    const rh = scarRhythm(marks, NOW)
    expect(rh.streakDays).toBe(3)
  })

  it('平均记录间隔', () => {
    const marks = [mk('腰', 3, 'wear', iso(0)), mk('手', 2, 'cut', iso(6))]
    const rh = scarRhythm(marks, NOW)
    expect(rh.avgGapDays).toBe(6)
  })

  it('无印记时连续与间隔为零', () => {
    const rh = scarRhythm([], NOW)
    expect(rh.streakDays).toBe(0)
    expect(rh.activeDays).toBe(0)
    expect(rh.avgGapDays).toBe(0)
  })
})

describe('scarHealth', () => {
  it('空库健康度为零（印记待启）', () => {
    const h = scarHealth([], NOW)
    expect(h.score).toBe(0)
    expect(h.breadth).toBe(0)
    expect(h.depth).toBe(0)
    expect(h.cadence).toBe(0)
    expect(h.label).toBe('印记待启')
  })

  it('覆盖多部位多类型得高分', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(60)),
      mk('肩', 4, 'impact', iso(60)),
      mk('手', 2, 'cut', iso(50)),
      mk('脚', 1, 'burn', iso(50)),
      mk('背', 3, 'impact', iso(40)),
      mk('腿', 2, 'wear', iso(30)),
      mk('颈', 3, 'cut', iso(20)),
      mk('头', 2, 'burn', iso(15)),
    ]
    const h = scarHealth(marks, NOW)
    expect(h.breadth).toBeGreaterThan(60)
    expect(h.depth).toBeGreaterThan(60)
    expect(h.score).toBeGreaterThan(50)
  })

  it('体表覆盖越多 breadth 越高', () => {
    const many = [mk('腰', 3, 'wear', iso(30)), mk('肩', 4, 'impact', iso(30)), mk('手', 2, 'cut', iso(30))]
    const few = [mk('腰', 3, 'wear', iso(30))]
    const hMany = scarHealth(many, NOW)
    const hFew = scarHealth(few, NOW)
    expect(hMany.breadth).toBeGreaterThan(hFew.breadth)
  })
})

describe('scarInsights', () => {
  it('空库给出温和引导', () => {
    const insights = scarInsights([], NOW)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0]).toContain('工痕')
  })

  it('重度印记多时优先提醒', () => {
    const insights = scarInsights([mk('腰', 5, 'impact', iso(1)), mk('肩', 4, 'burn', iso(2))], NOW, 10)
    expect(insights.some((s) => s.includes('重度'))).toBe(true)
  })

  it('连续记录时提示成形', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(0)),
      mk('肩', 2, 'cut', iso(1)),
      mk('手', 1, 'burn', iso(2)),
    ]
    const insights = scarInsights(marks, NOW)
    expect(insights.some((s) => s.includes('连续'))).toBe(true)
  })

  it('尊重 limit 限制', () => {
    const marks = [
      mk('腰', 3, 'wear', iso(1)),
      mk('肩', 4, 'impact', iso(6)),
      mk('手', 1, 'burn', iso(30)),
    ]
    const insights = scarInsights(marks, NOW, 2)
    expect(insights.length).toBeLessThanOrEqual(2)
  })
})