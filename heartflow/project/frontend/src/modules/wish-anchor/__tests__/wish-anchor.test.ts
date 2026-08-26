import { describe, it, expect } from 'vitest'
import {
  urgencyFor,
  viewWish,
  computeWishStats,
  sortWishes,
  recommendTargetDate,
  type Wish,
} from '../wish-anchor'

const now = new Date(2025, 0, 15) // 2025-01-15

function makeWish(partial: Partial<Wish>): Wish {
  return {
    id: 'w1',
    title: '去看极光',
    targetDate: '2025-02-01',
    createdAt: now.toISOString(),
    done: false,
    ...partial,
  }
}

describe('wish-anchor · 心愿锚', () => {
  it('urgencyFor：过期 → done → 迫在眉睫 → 临近 → 从容 → 长期', () => {
    expect(urgencyFor(-1, false)).toBe('overdue')
    expect(urgencyFor(5, false)).toBe('urgent')
    expect(urgencyFor(20, false)).toBe('soon')
    expect(urgencyFor(100, false)).toBe('ahead')
    expect(urgencyFor(365, false)).toBe('long-term')
    expect(urgencyFor(5, true)).toBe('done')
  })

  it('viewWish：计算剩余天数与紧急程度', () => {
    const v = viewWish(makeWish({ targetDate: '2025-01-20' }), now)
    expect(v.daysLeft).toBe(5)
    expect(v.urgency).toBe('urgent')
    expect(v.urgencyLabel).toBe('迫在眉睫')
  })

  it('viewWish：目标日期早于今日为已过期', () => {
    const v = viewWish(makeWish({ targetDate: '2025-01-10' }), now)
    expect(v.daysLeft).toBe(-5)
    expect(v.urgency).toBe('overdue')
  })

  it('computeWishStats：统计达成/活跃/过期', () => {
    const s = computeWishStats(
      [
        makeWish({ id: 'a', targetDate: '2025-01-10', done: false }),
        makeWish({ id: 'b', targetDate: '2025-02-01', done: true }),
        makeWish({ id: 'c', targetDate: '2025-03-01', done: false }),
      ],
      now,
    )
    expect(s.total).toBe(3)
    expect(s.done).toBe(1)
    expect(s.active).toBe(2)
    expect(s.overdue).toBe(1)
  })

  it('sortWishes：过期优先，其次按紧急程度', () => {
    const sorted = sortWishes(
      [
        makeWish({ id: 'c', targetDate: '2025-06-01' }),
        makeWish({ id: 'a', targetDate: '2025-01-10' }),
        makeWish({ id: 'b', targetDate: '2025-01-20' }),
      ],
      now,
    )
    expect(sorted[0].id).toBe('a')
    expect(sorted[1].id).toBe('b')
    expect(sorted[2].id).toBe('c')
  })

  it('recommendTargetDate：默认推荐 7 天后', () => {
    expect(recommendTargetDate(now)).toBe('2025-01-22')
  })
})