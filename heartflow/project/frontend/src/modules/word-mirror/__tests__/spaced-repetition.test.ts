import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SR_INTERVALS,
  proficiencyIntervalDays,
  isDue,
  dueWords,
  nextReviewState,
} from '../spaced-repetition'

const DAY = 86_400_000

describe('proficiencyIntervalDays', () => {
  it('maps each proficiency to its default interval', () => {
    expect(proficiencyIntervalDays(1)).toBe(1)
    expect(proficiencyIntervalDays(2)).toBe(2)
    expect(proficiencyIntervalDays(3)).toBe(4)
    expect(proficiencyIntervalDays(4)).toBe(7)
    expect(proficiencyIntervalDays(5)).toBe(16)
  })

  it('clamps out-of-range proficiency', () => {
    expect(proficiencyIntervalDays(0)).toBe(1)
    expect(proficiencyIntervalDays(9)).toBe(16)
  })

  it('honors a custom interval table', () => {
    const custom = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }
    expect(proficiencyIntervalDays(3, custom)).toBe(3)
  })
})

describe('isDue', () => {
  it('returns false for unparseable dates (允许未定义)', () => {
    expect(isDue({ createdAt: '', proficiency: 1 }, Date.now())).toBe(false)
  })

  it('a brand-new word is due immediately (interval 1 day, base = createdAt)', () => {
    const now = Date.now()
    const createdAt = new Date(now - 2 * DAY).toISOString()
    // 熟练度 1 → 间隔 1 天，已超 2 天，到期
    expect(isDue({ createdAt, proficiency: 1 }, now)).toBe(true)
  })

  it('respects the proficiency interval', () => {
    const now = Date.now()
    const reviewed = new Date(now - 3 * DAY).toISOString()
    // 熟练度 3 → 间隔 4 天，刚过 3 天，未到期
    expect(isDue({ lastReviewedAt: reviewed, createdAt: '', proficiency: 3 }, now)).toBe(false)
    // 熟练度 2 → 间隔 2 天，已过 3 天，到期
    expect(isDue({ lastReviewedAt: reviewed, createdAt: '', proficiency: 2 }, now)).toBe(true)
  })

  it('falls back to createdAt when lastReviewedAt is missing', () => {
    const now = Date.now()
    const createdAt = new Date(now - 5 * DAY).toISOString()
    // 熟练度 4 → 间隔 7 天，刚过 5 天，未到期（以 createdAt 为锚）
    expect(isDue({ createdAt, proficiency: 4 }, now)).toBe(false)
  })

  it('boundary: exactly at interval is due', () => {
    const now = Date.now()
    const reviewed = new Date(now - 4 * DAY).toISOString()
    expect(isDue({ lastReviewedAt: reviewed, createdAt: '', proficiency: 3 }, now)).toBe(true)
  })
})

describe('dueWords', () => {
  it('filters only due words', () => {
    const now = Date.now()
    const words = [
      { id: 'a', createdAt: new Date(now - 10 * DAY).toISOString(), proficiency: 1 }, // 1d 间隔 → 到期
      { id: 'b', createdAt: new Date(now - 1 * DAY).toISOString(), proficiency: 5 }, // 16d 间隔 → 未到期
      { id: 'c', lastReviewedAt: new Date(now - 20 * DAY).toISOString(), createdAt: '', proficiency: 5 }, // 16d → 到期
    ]
    const due = dueWords(words, now)
    expect(due.map((w) => (w as any).id).sort()).toEqual(['a', 'c'])
  })
})

describe('nextReviewState', () => {
  it('bumps proficiency by 1 and refreshes lastReviewedAt', () => {
    const now = 1_700_000_000_000
    const next = nextReviewState({ proficiency: 2 }, now)
    expect(next.proficiency).toBe(3)
    expect(new Date(next.lastReviewedAt).getTime()).toBe(now)
  })

  it('caps proficiency at 5', () => {
    const next = nextReviewState({ proficiency: 5 }, 123)
    expect(next.proficiency).toBe(5)
  })
})

describe('DEFAULT_SR_INTERVALS', () => {
  it('covers all five proficiency levels', () => {
    for (const p of [1, 2, 3, 4, 5]) {
      expect(typeof DEFAULT_SR_INTERVALS[p]).toBe('number')
      expect(DEFAULT_SR_INTERVALS[p]).toBeGreaterThan(0)
    }
  })
})
