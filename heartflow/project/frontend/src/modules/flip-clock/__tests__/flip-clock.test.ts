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
  useFlipClock,
  reloadFlipClock,
  formatClock,
} from '../flip-clock'

describe('useFlipClock', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useFlipClock().reset()
  })

  it('starts with defaults', () => {
    const c = useFlipClock()
    expect(c.format.value).toBe('24h')
    expect(c.showSeconds.value).toBe(true)
    expect(c.showDate.value).toBe(true)
  })

  it('sets format and ignores invalid', () => {
    const c = useFlipClock()
    c.setFormat('12h')
    expect(c.format.value).toBe('12h')
    // @ts-expect-error 故意传非法值
    c.setFormat('36h')
    expect(c.format.value).toBe('12h')
    const saved = store['hf:flip_clock'] as { format: string }
    expect(saved.format).toBe('12h')
  })

  it('toggles seconds and date', () => {
    const c = useFlipClock()
    expect(c.toggleSeconds()).toBe(false)
    expect(c.showSeconds.value).toBe(false)
    expect(c.toggleDate()).toBe(false)
    expect(c.showDate.value).toBe(false)
  })

  it('reset restores defaults', () => {
    const c = useFlipClock()
    c.setFormat('12h')
    c.toggleSeconds()
    c.reset()
    expect(c.format.value).toBe('24h')
    expect(c.showSeconds.value).toBe(true)
  })

  it('loads saved state from storage', () => {
    store['hf:flip_clock'] = { format: '12h', showSeconds: false, showDate: false }
    reloadFlipClock()
    const c = useFlipClock()
    expect(c.format.value).toBe('12h')
    expect(c.showSeconds.value).toBe(false)
    expect(c.showDate.value).toBe(false)
  })

  it('formatClock pads 24h parts', () => {
    const d = new Date(2026, 0, 2, 9, 5, 3)
    const parts = formatClock(d, { format: '24h', showSeconds: true, showDate: true })
    expect(parts).toEqual({ hh: '09', mm: '05', ss: '03', meridiem: 'AM' })
  })

  it('formatClock maps 12h with meridiem and noon/midnight', () => {
    const noon = new Date(2026, 0, 2, 12, 0, 0)
    const midnight = new Date(2026, 0, 2, 0, 30, 0)
    const a = formatClock(noon, { format: '12h', showSeconds: false, showDate: false })
    expect(a.hh).toBe('12')
    expect(a.meridiem).toBe('PM')
    const b = formatClock(midnight, { format: '12h', showSeconds: false, showDate: false })
    expect(b.hh).toBe('12')
    expect(b.meridiem).toBe('AM')
  })
})
