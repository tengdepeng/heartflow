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

import {
  useVerticalMarquee,
  reloadMarquee,
  DEFAULT_MARQUEE,
  DEFAULT_MARQUEE_ITEMS,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  MAX_ITEMS,
} from '../vertical-marquee'

describe('useVerticalMarquee', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useVerticalMarquee().reset()
  })

  it('starts with default items and playback state', () => {
    const m = useVerticalMarquee()
    expect(m.items.value).toEqual(DEFAULT_MARQUEE_ITEMS)
    expect(m.intervalMs.value).toBe(DEFAULT_MARQUEE.intervalMs)
    expect(m.direction.value).toBe('up')
    expect(m.paused.value).toBe(false)
  })

  it('adds a trimmed item and rejects blank', () => {
    const m = useVerticalMarquee()
    expect(m.addItem('  新公告  ')).toBe(true)
    expect(m.items.value[m.items.value.length - 1]).toBe('新公告')
    expect(m.addItem('   ')).toBe(false)
    expect(m.items.value.length).toBe(DEFAULT_MARQUEE_ITEMS.length + 1)
  })

  it('caps items at MAX_ITEMS', () => {
    const m = useVerticalMarquee()
    while (m.canAdd.value) m.addItem('x')
    expect(m.items.value.length).toBe(MAX_ITEMS)
    expect(m.addItem('overflow')).toBe(false)
  })

  it('removes an item by index and ignores out-of-range', () => {
    const m = useVerticalMarquee()
    const before = m.items.value.length
    expect(m.removeItem(0)).toBe(true)
    expect(m.items.value.length).toBe(before - 1)
    expect(m.removeItem(-1)).toBe(false)
    expect(m.removeItem(999)).toBe(false)
  })

  it('clamps interval into range', () => {
    const m = useVerticalMarquee()
    expect(m.setIntervalMs(10)).toBe(MIN_INTERVAL_MS)
    expect(m.setIntervalMs(999999)).toBe(MAX_INTERVAL_MS)
    expect(m.setIntervalMs(2500)).toBe(2500)
  })

  it('sets direction and ignores invalid', () => {
    const m = useVerticalMarquee()
    m.setDirection('down')
    expect(m.direction.value).toBe('down')
    // @ts-expect-error 故意传非法值
    m.setDirection('sideways')
    expect(m.direction.value).toBe('down')
  })

  it('toggles pause and persists', () => {
    const m = useVerticalMarquee()
    expect(m.togglePause()).toBe(true)
    expect(m.paused.value).toBe(true)
    const saved = store['hf:vertical_marquee'] as { paused: boolean }
    expect(saved.paused).toBe(true)
    expect(m.togglePause()).toBe(false)
  })

  it('reset restores defaults', () => {
    const m = useVerticalMarquee()
    m.addItem('临时')
    m.setDirection('down')
    m.togglePause()
    m.reset()
    expect(m.items.value).toEqual(DEFAULT_MARQUEE_ITEMS)
    expect(m.direction.value).toBe('up')
    expect(m.paused.value).toBe(false)
  })

  it('loads saved state from storage, sanitizing entries', () => {
    store['hf:vertical_marquee'] = {
      items: ['  A  ', '', 123, 'B'],
      intervalMs: 500,
      direction: 'down',
      paused: true,
    }
    reloadMarquee()
    const m = useVerticalMarquee()
    expect(m.items.value).toEqual(['A', 'B'])
    expect(m.intervalMs.value).toBe(MIN_INTERVAL_MS)
    expect(m.direction.value).toBe('down')
    expect(m.paused.value).toBe(true)
  })
})
