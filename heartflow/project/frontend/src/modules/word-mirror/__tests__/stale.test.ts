import { describe, it, expect } from 'vitest'
import { isStale, DEFAULT_STALE_THRESHOLD_DAYS } from '../stale'

const DAY = 86_400_000

describe('isStale', () => {
  it('returns false for unparseable dates (允许未定义)', () => {
    expect(isStale({ createdAt: '' }, Date.now())).toBe(false)
  })

  it('marks a long-unreviewed word as stale', () => {
    const now = Date.now()
    const createdAt = new Date(now - 40 * DAY).toISOString()
    expect(isStale({ createdAt }, now)).toBe(true)
  })

  it('keeps a recently reviewed word fresh even if created long ago', () => {
    const now = Date.now()
    const createdAt = new Date(now - 60 * DAY).toISOString()
    const lastReviewedAt = new Date(now - 2 * DAY).toISOString()
    expect(isStale({ createdAt, lastReviewedAt }, now)).toBe(false)
  })

  it('respects a custom threshold', () => {
    const now = Date.now()
    const createdAt = new Date(now - 10 * DAY).toISOString()
    expect(isStale({ createdAt }, now, 5)).toBe(true)
    expect(isStale({ createdAt }, now, 15)).toBe(false)
  })

  it('uses the default threshold of 21 days', () => {
    const now = Date.now()
    const fresh = new Date(now - (DEFAULT_STALE_THRESHOLD_DAYS - 1) * DAY).toISOString()
    const stale = new Date(now - (DEFAULT_STALE_THRESHOLD_DAYS + 1) * DAY).toISOString()
    expect(isStale({ createdAt: fresh }, now)).toBe(false)
    expect(isStale({ createdAt: stale }, now)).toBe(true)
  })

  it('boundary: exactly at threshold is stale', () => {
    const now = Date.now()
    const createdAt = new Date(now - DEFAULT_STALE_THRESHOLD_DAYS * DAY).toISOString()
    expect(isStale({ createdAt }, now)).toBe(true)
  })
})
