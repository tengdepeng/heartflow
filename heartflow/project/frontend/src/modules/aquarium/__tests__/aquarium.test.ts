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

import { useAquarium, reloadAquarium, growthStage, MAX_FISH } from '../aquarium'

describe('useAquarium', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useAquarium().clearAll()
  })

  it('starts empty', () => {
    const a = useAquarium()
    expect(a.fishCount.value).toBe(0)
    expect(a.totalFeeds.value).toBe(0)
    expect(a.todayFeeds.value).toBe(0)
    expect(a.isEmpty.value).toBe(true)
    expect(a.isFull.value).toBe(false)
  })

  it('adds a fish and persists', () => {
    const a = useAquarium()
    const f = a.addFish('koi')
    expect(f).not.toBeNull()
    expect(a.fishCount.value).toBe(1)
    expect(a.fish.value[0].speciesId).toBe('koi')
    expect(a.fish.value[0].name).toBe('锦鲤')
    const saved = store['hf:aquarium'] as { fish: unknown[] }
    expect(saved.fish.length).toBe(1)
  })

  it('respects the max fish capacity', () => {
    const a = useAquarium()
    for (let i = 0; i < MAX_FISH + 3; i++) a.addFish('goldfish')
    expect(a.fishCount.value).toBe(MAX_FISH)
    expect(a.isFull.value).toBe(true)
    expect(a.addFish('neon')).toBeNull()
  })

  it('feed feeds every fish and accumulates counts', () => {
    const a = useAquarium()
    a.addFish('koi')
    a.addFish('guppy')
    expect(a.feed()).toBe(2)
    expect(a.totalFeeds.value).toBe(2)
    expect(a.todayFeeds.value).toBe(2)
    expect(a.fish.value[0].feedCount).toBe(1)
    a.feed()
    expect(a.totalFeeds.value).toBe(4)
    expect(a.todayFeeds.value).toBe(4)
    expect(a.fish.value[1].feedCount).toBe(2)
  })

  it('feed with no fish returns 0 and does not change totals', () => {
    const a = useAquarium()
    expect(a.feed()).toBe(0)
    expect(a.totalFeeds.value).toBe(0)
  })

  it('removes a fish', () => {
    const a = useAquarium()
    const f = a.addFish('koi')!
    a.removeFish(f.id)
    expect(a.fishCount.value).toBe(0)
  })

  it('clearAll resets state', () => {
    const a = useAquarium()
    a.addFish('koi')
    a.feed()
    a.clearAll()
    expect(a.fishCount.value).toBe(0)
    expect(a.totalFeeds.value).toBe(0)
    expect(a.isEmpty.value).toBe(true)
  })

  it('loads saved fish and rolls today count across days', () => {
    store['hf:aquarium'] = {
      fish: [
        {
          id: 'fish_x',
          speciesId: 'neon',
          name: '霓虹灯鱼',
          bornAt: '2000-01-01T00:00:00.000Z',
          lastFedAt: '2000-01-01T00:00:00.000Z',
          feedCount: 5,
        },
      ],
      totalFeeds: 20,
      todayFeeds: 4,
      lastFedDate: '2000-01-01',
    }
    reloadAquarium()
    const a = useAquarium()
    expect(a.fishCount.value).toBe(1)
    expect(a.totalFeeds.value).toBe(20)
    expect(a.todayFeeds.value).toBe(0) // 跨日归零
    a.feed()
    expect(a.todayFeeds.value).toBe(1)
    expect(a.fish.value[0].feedCount).toBe(6)
  })

  it('growthStage advances by feed count', () => {
    expect(growthStage(0).key).toBe('fry')
    expect(growthStage(3).key).toBe('juvenile')
    expect(growthStage(8).key).toBe('adult')
  })
})
