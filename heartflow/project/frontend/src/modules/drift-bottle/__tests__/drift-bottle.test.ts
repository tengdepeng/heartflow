import { describe, it, expect, beforeEach, vi } from 'vitest'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, def: any) => (k in store ? store[k] : def)),
    mockSetKV: vi.fn((k: string, val: any) => {
      store[k] = val
    }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: { getKV: mockGetKV, setKV: mockSetKV },
}))

import { useDriftBottle, reloadBottles, BOTTLE_MOODS } from '../drift-bottle'

describe('useDriftBottle', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useDriftBottle().clearAll()
  })

  it('starts empty', () => {
    const b = useDriftBottle()
    expect(b.isEmpty.value).toBe(true)
    expect(b.driftingCount.value).toBe(0)
    expect(b.collectedCount.value).toBe(0)
  })

  it('throws a bottle and trims text', () => {
    const b = useDriftBottle()
    const bottle = b.throwBottle('  今天很开心  ', '喜悦')
    expect(bottle).not.toBeNull()
    expect(bottle!.text).toBe('今天很开心')
    expect(bottle!.mood).toBe('喜悦')
    expect(bottle!.status).toBe('drifting')
    expect(b.driftingCount.value).toBe(1)
    const saved = store['hf:drift_bottle'] as { bottles: unknown[] }
    expect(saved.bottles.length).toBe(1)
  })

  it('ignores blank bottles', () => {
    const b = useDriftBottle()
    expect(b.throwBottle('   ')).toBeNull()
    expect(b.driftingCount.value).toBe(0)
  })

  it('defaults mood to 平静', () => {
    const b = useDriftBottle()
    expect(b.throwBottle('随手一投')!.mood).toBe('平静')
    expect(BOTTLE_MOODS).toContain('平静')
  })

  it('picks a drifting bottle and marks it collected', () => {
    const b = useDriftBottle()
    b.throwBottle('心事一', '思念')
    const picked = b.pickBottle()
    expect(picked).not.toBeNull()
    expect(picked!.status).toBe('collected')
    expect(picked!.collectedAt).not.toBeNull()
    expect(b.driftingCount.value).toBe(0)
    expect(b.collectedCount.value).toBe(1)
  })

  it('pickBottle returns null when nothing is drifting', () => {
    const b = useDriftBottle()
    expect(b.pickBottle()).toBeNull()
  })

  it('removes a bottle and clears all', () => {
    const b = useDriftBottle()
    const one = b.throwBottle('甲')!
    b.throwBottle('乙')
    b.removeBottle(one.id)
    expect(b.bottles.value.length).toBe(1)
    b.clearAll()
    expect(b.bottles.value.length).toBe(0)
  })

  it('loads saved bottles from storage', () => {
    store['hf:drift_bottle'] = {
      bottles: [
        {
          id: 'bottle_x',
          text: '旧念头',
          mood: '释然',
          createdAt: '2026-01-01T00:00:00.000Z',
          thrownAt: '2026-01-01T00:00:00.000Z',
          collectedAt: null,
          status: 'drifting',
        },
      ],
    }
    reloadBottles()
    const b = useDriftBottle()
    expect(b.bottles.value.length).toBe(1)
    expect(b.driftingCount.value).toBe(1)
  })
})
