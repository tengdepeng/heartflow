// ============================================================
// 羁绊档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  daysSinceLast,
  relationOverview,
  relationTypeRows,
  relationRhythm,
  relationHealth,
  relationInsights,
} from '../relation-analytics'
import type { Person } from '../types'
import type { InteractionEntry } from '../interaction-journal'

const DAY = 86_400_000

function mkPerson(over: Partial<Person> & { id: string; name: string }): Person {
  return {
    relation: 'friend',
    tags: [],
    notes: '',
    closeness: 0.5,
    color: '#fff',
    lastContact: null,
    importantDates: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function mkInteraction(personId: string, kind: InteractionEntry['kind'], date: string): InteractionEntry {
  return {
    id: `i_${Math.random().toString(36).slice(2, 6)}`,
    personId,
    kind,
    date,
    mood: 'positive',
    summary: '',
    tags: [],
    createdAt: date,
  }
}

const NOW = new Date('2026-08-22T12:00:00.000Z')
function iso(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * DAY).toISOString()
}
function isoDate(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * DAY).toISOString().split('T')[0]
}

describe('daysSinceLast', () => {
  it('有互动时返回相隔天数', () => {
    const p = mkPerson({ id: 'p1', name: 'A' })
    // 使用完整时间戳 iso(3)，避免 date 截断到零点与 now 产生半天差值
    const inter = [mkInteraction('p1', 'message', iso(3))]
    expect(daysSinceLast(p, inter, NOW)).toBe(3)
  })

  it('无互动返回 null', () => {
    const p = mkPerson({ id: 'p1', name: 'A' })
    expect(daysSinceLast(p, [])).toBeNull()
  })
})

describe('relationOverview', () => {
  it('空列表返回全零概览', () => {
    const ov = relationOverview([], [], NOW)
    expect(ov.total).toBe(0)
    expect(ov.withInteraction).toBe(0)
    expect(ov.neverInteracted).toBe(0)
    expect(ov.dormantCount).toBe(0)
    expect(ov.memorialCount).toBe(0)
    expect(ov.avgCloseness).toBe(0)
    expect(ov.closest).toBeNull()
  })

  it('统计互动/从未互动/沉寂人数', () => {
    const p1 = mkPerson({ id: 'p1', name: 'A' })
    const p2 = mkPerson({ id: 'p2', name: 'B' })
    const p3 = mkPerson({ id: 'p3', name: 'C' })
    // p2 有近互动，p3 有 90 天前互动（沉寂），p1 从未
    const inter = [
      mkInteraction('p2', 'call', isoDate(3)),
      mkInteraction('p3', 'message', isoDate(90)),
    ]
    const ov = relationOverview([p1, p2, p3], inter, NOW)
    expect(ov.total).toBe(3)
    expect(ov.neverInteracted).toBe(1)
    expect(ov.withInteraction).toBe(2)
    expect(ov.dormantCount).toBe(1)
  })

  it('统计本月新增与平均亲密度', () => {
    const p1 = mkPerson({ id: 'p1', name: 'A', closeness: 0.8, createdAt: isoDate(1) })
    const p2 = mkPerson({ id: 'p2', name: 'B', closeness: 0.2, createdAt: iso(150).split('T')[0] })
    const ov = relationOverview([p1, p2], [], NOW)
    expect(ov.thisMonthAdded).toBe(1)
    expect(ov.avgCloseness).toBe(0.5)
    expect(ov.closest).toEqual({ name: 'A', closeness: 0.8 })
  })

  it('统计逝者/留座人数', () => {
    const p1 = mkPerson({ id: 'p1', name: 'A', deceased: true })
    const p2 = mkPerson({ id: 'p2', name: 'B', isSeat: true })
    const ov = relationOverview([p1, p2], [], NOW)
    expect(ov.memorialCount).toBe(2)
  })
})

describe('relationTypeRows', () => {
  it('六类补齐并计算占比', () => {
    const persons = [
      mkPerson({ id: '1', name: 'A', relation: 'family' }),
      mkPerson({ id: '2', name: 'B', relation: 'family' }),
      mkPerson({ id: '3', name: 'C', relation: 'friend' }),
    ]
    const rows = relationTypeRows(persons)
    expect(rows).toHaveLength(6)
    const family = rows.find((r) => r.type === 'family')!
    expect(family.count).toBe(2)
    expect(family.pct).toBe(67)
    expect(rows.find((r) => r.type === 'lover')!.count).toBe(0)
  })

  it('附上中文标签与颜色', () => {
    const rows = relationTypeRows([mkPerson({ id: '1', name: 'A', relation: 'family' })])
    const family = rows.find((r) => r.type === 'family')!
    expect(family.label).toBe('家人')
    expect(family.color).toBeTruthy()
  })
})

describe('relationRhythm', () => {
  it('统计近 7/30 天互动数与有互动天数', () => {
    const inter = [
      mkInteraction('p1', 'call', isoDate(1)),
      mkInteraction('p1', 'message', isoDate(20)),
      mkInteraction('p2', 'meal', isoDate(60)),
    ]
    const rh = relationRhythm(inter, NOW)
    expect(rh.totalInteractions).toBe(3)
    expect(rh.weeklyCount).toBe(1)
    expect(rh.monthlyCount).toBe(2)
    expect(rh.activeDays).toBe(3)
  })

  it('连续互动天数', () => {
    const inter = [
      mkInteraction('p1', 'call', isoDate(0)),
      mkInteraction('p1', 'message', isoDate(1)),
      mkInteraction('p2', 'meal', isoDate(2)),
    ]
    const rh = relationRhythm(inter, NOW)
    expect(rh.streakDays).toBe(3)
  })

  it('无互动时默认零', () => {
    const rh = relationRhythm([], NOW)
    expect(rh.totalInteractions).toBe(0)
    expect(rh.streakDays).toBe(0)
    expect(rh.avgPerDay).toBe(0)
  })
})

describe('relationHealth', () => {
  it('空网络健康度偏低（羁绊待织）', () => {
    const h = relationHealth([], [], NOW)
    expect(h.score).toBe(0)
    expect(h.label).toBe('羁绊待织')
  })

  it('类型多样且互动频繁得高分', () => {
    const persons = ['family', 'lover', 'friend', 'colleague', 'mentor'].map((rel, i) =>
      mkPerson({ id: `p${i}`, name: `人${i}`, relation: rel as Person['relation'] }),
    )
    const inter = Array.from({ length: 14 }, (_, i) => mkInteraction(`p${i % 5}`, 'message', isoDate(i)))
    const h = relationHealth(persons, inter, NOW)
    expect(h.breadth).toBeGreaterThan(40)
    expect(h.cadence).toBeGreaterThan(60)
    expect(h.label).not.toBe('羁绊待织')
  })

  it('类型越多样 breadth 越高', () => {
    const single = [mkPerson({ id: 'p1', name: 'A', relation: 'family' })]
    const multi = ['family', 'friend', 'mentor'].map((rel, i) =>
      mkPerson({ id: `p${i}`, name: `人${i}`, relation: rel as Person['relation'] }),
    )
    expect(relationHealth(multi, [], NOW).breadth).toBeGreaterThan(
      relationHealth(single, [], NOW).breadth,
    )
  })
})

describe('relationInsights', () => {
  it('空网络给出温和引导', () => {
    const insights = relationInsights([], [], NOW)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0]).toContain('羁绊')
  })

  it('从未互动时提醒主动联系', () => {
    const p = mkPerson({ id: 'p1', name: 'A' })
    const insights = relationInsights([p], [], NOW, 10)
    expect(insights.some((s) => s.includes('互动') || s.includes('问候'))).toBe(true)
  })

  it('连续互动时提示往来', () => {
    const p = mkPerson({ id: 'p1', name: 'A' })
    const inter = [
      mkInteraction('p1', 'call', isoDate(0)),
      mkInteraction('p1', 'message', isoDate(1)),
      mkInteraction('p1', 'meal', isoDate(2)),
    ]
    const insights = relationInsights([p], inter, NOW, 10)
    expect(insights.some((s) => s.includes('连续'))).toBe(true)
  })

  it('尊重 limit', () => {
    const p = mkPerson({ id: 'p1', name: 'A', relation: 'family' })
    const insights = relationInsights([p], [mkInteraction('p1', 'call', isoDate(1))], NOW, 2)
    expect(insights.length).toBeLessThanOrEqual(2)
  })
})