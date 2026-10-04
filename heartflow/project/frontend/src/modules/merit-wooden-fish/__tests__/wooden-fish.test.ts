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

import { useMeritWoodenFish, reloadMeritState } from '../wooden-fish'

describe('useMeritWoodenFish', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
  })

  it('starts at zero merit', () => {
    const f = useMeritWoodenFish()
    f.clearAll()
    expect(f.merit.value).toBe(0)
    expect(f.today.value).toBe(0)
    expect(f.isEmpty.value).toBe(true)
    expect(f.soundOn.value).toBe(true)
  })

  it('knock increments total and today, persists', () => {
    const f = useMeritWoodenFish()
    f.clearAll()
    f.knock()
    expect(f.merit.value).toBe(1)
    expect(f.today.value).toBe(1)
    f.knock()
    expect(f.merit.value).toBe(2)
    expect(f.today.value).toBe(2)
    const saved = store['hf:merit_wooden_fish'] as { totalMerit: number; todayCount: number }
    expect(saved.totalMerit).toBe(2)
    expect(saved.todayCount).toBe(2)
  })

  it('toggleSound flips and persists', () => {
    const f = useMeritWoodenFish()
    f.clearAll()
    f.toggleSound()
    expect(f.soundOn.value).toBe(false)
    expect((store['hf:merit_wooden_fish'] as { soundEnabled: boolean }).soundEnabled).toBe(false)
  })

  it('clearAll resets state', () => {
    const f = useMeritWoodenFish()
    f.knock()
    f.knock()
    f.clearAll()
    expect(f.merit.value).toBe(0)
    expect(f.today.value).toBe(0)
    expect(f.isEmpty.value).toBe(true)
  })

  it('loads saved state and rolls today count across days', () => {
    store['hf:merit_wooden_fish'] = {
      totalMerit: 10,
      todayCount: 5,
      lastKnockDate: '2000-01-01',
      soundEnabled: false,
    }
    reloadMeritState()
    const f = useMeritWoodenFish()
    expect(f.merit.value).toBe(10)
    expect(f.today.value).toBe(0) // 跨日归零
    expect(f.soundOn.value).toBe(false) // 保留原设置
    f.knock()
    expect(f.today.value).toBe(1)
  })
})
