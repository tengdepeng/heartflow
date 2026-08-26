import { describe, it, expect } from 'vitest'
import type { Move } from '../movement-log'
import {
  movementArchiveOverview,
  moveTypeRows,
  movementRhythm,
  moveCompanions,
  movementHealth,
  movementInsights,
  moveTypeLabel,
  moveTypeIcon,
} from '../movement-archive-analytics'

function mk(partial: Partial<Move> & { at: string }): Move {
  return {
    id: `m${Math.random()}`,
    type: 'run',
    duration: 30,
    withWhom: '',
    location: '',
    note: '',
    isMoment: false,
    ...partial,
  }
}

const NOW = new Date('2026-08-15T12:00:00+08:00')

describe('动律档案·概览', () => {
  it('空数据概览各项归零或占位', () => {
    const ov = movementArchiveOverview([], NOW)
    expect(ov.totalCount).toBe(0)
    expect(ov.totalMinutes).toBe(0)
    expect(ov.avgDuration).toBe(0)
    expect(ov.typeCount).toBe(0)
    expect(ov.bestType).toBe('')
    expect(ov.firstDate).toBe('')
    expect(ov.longestMove).toBe(0)
  })

  it('正确统计次数/时长/均值/本周/本月/近30天', () => {
    const moves: Move[] = [
      mk({ type: 'run', duration: 30, at: '2026-08-15T09:00:00+08:00' }),
      mk({ type: 'swim', duration: 60, at: '2026-08-14T09:00:00+08:00' }),
      mk({ type: 'run', duration: 20, at: '2026-08-01T09:00:00+08:00' }),
      mk({ type: 'hike', duration: 90, at: '2026-07-20T09:00:00+08:00' }),
    ]
    const ov = movementArchiveOverview(moves, NOW)
    expect(ov.totalCount).toBe(4)
    expect(ov.totalMinutes).toBe(200)
    expect(ov.avgDuration).toBe(50)
    expect(ov.weeklyCount).toBe(2)
    expect(ov.monthlyCount).toBe(3)
    expect(ov.recent30).toBe(4)
    expect(ov.typeCount).toBe(3)
    expect(ov.bestType).toBe('run')
    expect(ov.longestMove).toBe(90)
  })

  it('统计运动时刻与同游者数量', () => {
    const moves: Move[] = [
      mk({ isMoment: true, withWhom: '阿明', at: '2026-08-15T09:00:00+08:00' }),
      mk({ isMoment: true, withWhom: '阿明', at: '2026-08-14T09:00:00+08:00' }),
      mk({ withWhom: '小北', at: '2026-08-13T09:00:00+08:00' }),
    ]
    const ov = movementArchiveOverview(moves, NOW)
    expect(ov.momentCount).toBe(2)
    expect(ov.companionCount).toBe(2)
  })
})

describe('动律档案·类型分布', () => {
  it('空数据无类型行', () => {
    expect(moveTypeRows([])).toEqual([])
  })

  it('按次数排序并算百分比', () => {
    const moves: Move[] = [
      mk({ type: 'run', at: '2026-08-15T09:00:00+08:00' }),
      mk({ type: 'run', at: '2026-08-14T09:00:00+08:00' }),
      mk({ type: 'swim', at: '2026-08-13T09:00:00+08:00' }),
    ]
    const rows = moveTypeRows(moves)
    expect(rows[0].type).toBe('run')
    expect(rows[0].count).toBe(2)
    expect(rows[0].percentage).toBe(67)
    expect(rows[0].icon).toBe('🏃')
    expect(rows[0].label).toBe('跑步')
  })

  it('未知类型回退占位图标与名', () => {
    expect(moveTypeLabel('skydive')).toBe('skydive')
    expect(moveTypeIcon('skydive')).toBe('💪')
  })
})

describe('动律档案·节律', () => {
  it('空数据节律归零', () => {
    const r = movementRhythm([], NOW)
    expect(r.activeDays).toBe(0)
    expect(r.spanDays).toBe(0)
    expect(r.currentStreak).toBe(0)
    expect(r.bestStreak).toBe(0)
    expect(r.monthsTracked).toBe(0)
  })

  it('统计活跃天数/跨度/月份数', () => {
    const moves: Move[] = [
      mk({ at: '2026-08-15T09:00:00+08:00' }),
      mk({ at: '2026-08-15T19:00:00+08:00' }),
      mk({ at: '2026-08-10T09:00:00+08:00' }),
      mk({ at: '2026-07-01T09:00:00+08:00' }),
    ]
    const r = movementRhythm(moves, NOW)
    expect(r.activeDays).toBe(3)
    expect(r.spanDays).toBe(45)
    expect(r.monthsTracked).toBe(2)
  })

  it('今天有记录则当前连续从今天起算', () => {
    const moves: Move[] = [
      mk({ at: '2026-08-15T08:00:00+08:00' }),
      mk({ at: '2026-08-14T08:00:00+08:00' }),
    ]
    const r = movementRhythm(moves, NOW)
    expect(r.currentStreak).toBe(2)
    expect(r.bestStreak).toBe(2)
  })

  it('今天无记录但昨天有，连续仍从昨天起算', () => {
    const moves: Move[] = [
      mk({ at: '2026-08-14T08:00:00+08:00' }),
      mk({ at: '2026-08-13T08:00:00+08:00' }),
    ]
    const r = movementRhythm(moves, NOW)
    expect(r.currentStreak).toBe(2)
  })

  it('最长连续跨多段取最大', () => {
    const moves: Move[] = [
      mk({ at: '2026-08-15T08:00:00+08:00' }),
      mk({ at: '2026-08-11T08:00:00+08:00' }),
      mk({ at: '2026-08-10T08:00:00+08:00' }),
      mk({ at: '2026-08-09T08:00:00+08:00' }),
    ]
    const r = movementRhythm(moves, NOW)
    expect(r.currentStreak).toBe(1)
    expect(r.bestStreak).toBe(3)
  })
})

describe('动律档案·同游者', () => {
  it('按同行次数排序', () => {
    const moves: Move[] = [
      mk({ withWhom: '阿明', at: '2026-08-15T09:00:00+08:00' }),
      mk({ withWhom: '阿明', at: '2026-08-14T09:00:00+08:00' }),
      mk({ withWhom: '小北', at: '2026-08-13T09:00:00+08:00' }),
      mk({ withWhom: '', at: '2026-08-12T09:00:00+08:00' }),
    ]
    const list = moveCompanions(moves)
    expect(list).toHaveLength(2)
    expect(list[0]).toEqual({ name: '阿明', count: 2 })
  })
})

describe('动律档案·健康', () => {
  it('空数据健康分数为 0，标签为最低档', () => {
    const h = movementHealth([], NOW)
    expect(h.score).toBe(0)
    expect(h.label).toBe('静待启程')
  })

  it('丰富数据健康分数较高且三轴均在 0-100', () => {
    const moves: Move[] = Array.from({ length: 30 }, (_, i) =>
      mk({
        type: ['run', 'swim', 'yoga', 'gym', 'dance'][i % 5],
        duration: 30,
        isMoment: i % 3 === 0,
        at: `2026-08-${String((i % 15) + 1).padStart(2, '0')}T09:00:00+08:00`,
      })
    )
    const h = movementHealth(moves, NOW)
    expect(h.score).toBeGreaterThan(0)
    expect(h.score).toBeLessThanOrEqual(100)
    expect(h.consistency).toBeGreaterThanOrEqual(0)
    expect(h.consistency).toBeLessThanOrEqual(100)
    expect(h.diversity).toBeGreaterThanOrEqual(0)
    expect(h.diversity).toBeLessThanOrEqual(100)
    expect(h.ritual).toBeGreaterThanOrEqual(0)
    expect(h.ritual).toBeLessThanOrEqual(100)
  })
})

describe('动律档案·温和洞察', () => {
  it('空数据给出耐心开场', () => {
    const ins = movementInsights([], NOW)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins[0].text).toContain('身体')
  })

  it('单一类型时提示可交换方式', () => {
    const moves = [mk({ type: 'run', at: '2026-08-15T09:00:00+08:00' })]
    const text = movementInsights(moves, NOW).map(i => i.text).join('')
    expect(text).toContain('略单薄')
  })

  it('多样性高时给出鼓励', () => {
    const moves: Move[] = ['run', 'swim', 'yoga', 'gym', 'dance'].map((t, i) =>
      mk({ type: t, at: `2026-08-${String(i + 1).padStart(2, '0')}T09:00:00+08:00` })
    )
    const text = movementInsights(moves, NOW).map(i => i.text).join('')
    expect(text).toContain('5 种律动')
  })

  it('有运动时刻时提及标记', () => {
    const moves = [mk({ isMoment: true, at: '2026-08-15T09:00:00+08:00' })]
    const text = movementInsights(moves, NOW).map(i => i.text).join('')
    expect(text).toContain('运动时刻')
  })

  it('洞察条数有界', () => {
    const moves: Move[] = Array.from({ length: 20 }, (_, i) =>
      mk({ type: ['run', 'swim', 'yoga'][i % 3], isMoment: i % 2 === 0, withWhom: '阿明', duration: 60, at: `2026-08-${String((i % 10) + 1).padStart(2, '0')}T09:00:00+08:00` })
    )
    expect(movementInsights(moves, NOW).length).toBeLessThanOrEqual(4)
  })
})