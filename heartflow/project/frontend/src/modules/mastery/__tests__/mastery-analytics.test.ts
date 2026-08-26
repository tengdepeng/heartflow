import { describe, it, expect } from 'vitest'
import {
  masteryOverview,
  masteryStateDistribution,
  weakList,
  masteryRhythm,
  masteryInsights,
} from '../mastery-analytics'
import type { MasteryItem } from '../mastery'

function item(partial: Partial<MasteryItem> & { topic: string }): MasteryItem {
  return { id: partial.id ?? 'm1', confidence: 0, attempts: 0, difficulty: 1, updatedAt: 't', ...partial }
}

const DAY = 86_400_000

describe('mastery-analytics · 掌握度档案引擎', () => {
  it('masteryOverview：空库归零', () => {
    const ov = masteryOverview([])
    expect(ov.total).toBe(0)
    expect(ov.masteryRate).toBe(0)
    expect(ov.avgConfidence).toBe(0)
  })

  it('masteryOverview：三态与均值', () => {
    const ov = masteryOverview([
      item({ topic: 'a', confidence: 95, attempts: 5 }),
      item({ topic: 'b', confidence: 50, attempts: 2 }),
      item({ topic: 'c', confidence: 5 }),
    ])
    expect(ov.total).toBe(3)
    expect(ov.mastered).toBe(1)
    expect(ov.learning).toBe(1)
    expect(ov.fresh).toBe(1)
    expect(ov.practiced).toBe(2)
    expect(ov.masteryRate).toBe(33)
  })

  it('masteryStateDistribution：分桶且含元数据', () => {
    const rows = masteryStateDistribution([
      item({ topic: 'a', confidence: 95 }),
      item({ topic: 'b', confidence: 50 }),
      item({ topic: 'c', confidence: 5 }),
    ])
    expect(rows).toHaveLength(3)
    const m = rows.find((r) => r.state === 'mastered')!
    expect(m.count).toBe(1)
    expect(m.label).toBe('已通晓')
    expect(rows.find((r) => r.state === 'new')!.count).toBe(1)
  })

  it('weakList：待学优于练习中，同类按掌握度升序', () => {
    const list = weakList([
      item({ topic: 'learned', confidence: 60 }),
      item({ topic: 'freshA', confidence: 5 }),
      item({ topic: 'avoid', confidence: 95 }),
      item({ topic: 'freshB', confidence: 30 }),
    ])
    expect(list.map((w) => w.item.topic)).toEqual(['freshA', 'freshB', 'learned'])
  })

  it('masteryRhythm：近 7 天与连续天数', () => {
    const now = new Date('2026-08-22T12:00:00')
    const nowT = now.getTime()
    const items = [
      // 今天
      item({ topic: 'a', updatedAt: new Date(nowT).toISOString() }),
      // 昨天
      item({ topic: 'b', updatedAt: new Date(nowT - DAY).toISOString() }),
      // 前天
      item({ topic: 'c', updatedAt: new Date(nowT - 2 * DAY).toISOString() }),
      // 十天前（不在近 7 天，但在近 30 天）
      item({ topic: 'd', updatedAt: new Date(nowT - 10 * DAY).toISOString() }),
    ]
    const r = masteryRhythm(items, now)
    expect(r.weeklyAttempts).toBe(3)
    expect(r.monthlyAttempts).toBe(4)
    expect(r.streakDays).toBe(3)
    expect(r.activeDays).toBe(4)
  })

  it('masteryInsights：空库给出引导', () => {
    const out = masteryInsights([], new Date())
    expect(out[0]).toContain('还没有')
  })

  it('masteryInsights：weak 场景生成建议', () => {
    const out = masteryInsights(
      [
        item({ topic: '微积分', confidence: 10, attempts: 1 }),
        item({ topic: '概率', confidence: 50, attempts: 2 }),
      ],
      new Date(),
      5,
    )
    expect(out.some((s) => s.includes('微积分'))).toBe(true)
  })

  it('masteryInsights：limit 截断', () => {
    const out = masteryInsights(
      [
        item({ topic: 'a', confidence: 10, attempts: 1 }),
        item({ topic: 'b', confidence: 40, attempts: 1 }),
      ],
      new Date('2026-08-22T12:00:00'),
      2,
    )
    expect(out.length).toBeLessThanOrEqual(2)
  })
})