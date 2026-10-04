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

import { useDynamicIsland, reloadIsland, ISLAND_MODES, DEFAULT_ISLAND } from '../dynamic-island'

describe('useDynamicIsland', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useDynamicIsland().reset()
  })

  it('starts with default mode and auto cycle', () => {
    const d = useDynamicIsland()
    expect(d.mode.value).toBe(DEFAULT_ISLAND.mode)
    expect(d.autoCycle.value).toBe(true)
    expect(d.modeIndex.value).toBe(0)
  })

  it('sets a valid mode and ignores invalid', () => {
    const d = useDynamicIsland()
    d.setMode('music')
    expect(d.mode.value).toBe('music')
    // @ts-expect-error 故意传非法值
    d.setMode('bogus')
    expect(d.mode.value).toBe('music')
    const saved = store['hf:dynamic_island'] as { mode: string }
    expect(saved.mode).toBe('music')
  })

  it('nextMode cycles through all modes', () => {
    const d = useDynamicIsland()
    const seen = new Set<string>()
    for (let i = 0; i < ISLAND_MODES.length; i++) {
      seen.add(d.nextMode())
    }
    expect(seen.size).toBe(ISLAND_MODES.length)
    expect(d.mode.value).toBe(DEFAULT_ISLAND.mode)
  })

  it('toggles auto cycle', () => {
    const d = useDynamicIsland()
    expect(d.toggleAutoCycle()).toBe(false)
    expect(d.autoCycle.value).toBe(false)
    expect(d.toggleAutoCycle()).toBe(true)
  })

  it('reset restores defaults', () => {
    const d = useDynamicIsland()
    d.setMode('battery')
    d.toggleAutoCycle()
    d.reset()
    expect(d.mode.value).toBe(DEFAULT_ISLAND.mode)
    expect(d.autoCycle.value).toBe(true)
  })

  it('loads saved state from storage', () => {
    store['hf:dynamic_island'] = { mode: 'focus', autoCycle: false }
    reloadIsland()
    const d = useDynamicIsland()
    expect(d.mode.value).toBe('focus')
    expect(d.autoCycle.value).toBe(false)
  })
})
