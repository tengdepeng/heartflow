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

import { useRotaryPicker, reloadRotary, DEFAULT_ROTARY } from '../rotary-picker'

describe('useRotaryPicker', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useRotaryPicker().reset()
  })

  it('starts with default value and presets', () => {
    const r = useRotaryPicker()
    expect(r.value.value).toBe(DEFAULT_ROTARY.value)
    expect(r.presets.value.length).toBe(DEFAULT_ROTARY.presets.length)
    expect(r.unit.value).toBe('分钟')
  })

  it('snaps value to step', () => {
    const r = useRotaryPicker()
    expect(r.setValue(27)).toBe(25)
    expect(r.setValue(33)).toBe(35)
  })

  it('clamps value within range', () => {
    const r = useRotaryPicker()
    expect(r.setValue(0)).toBe(5)
    expect(r.setValue(9999)).toBe(120)
  })

  it('steps by one increment', () => {
    const r = useRotaryPicker()
    expect(r.stepBy(1)).toBe(30)
    expect(r.stepBy(-1)).toBe(25)
  })

  it('saves, applies and removes presets', () => {
    const r = useRotaryPicker()
    r.setValue(45)
    const p = r.savePreset('  冥想  ')
    expect(p).not.toBeNull()
    expect(p!.label).toBe('冥想')
    expect(p!.value).toBe(45)
    expect(r.savePreset('  ')).toBeNull()
    expect(r.applyPreset(p!.id)).toBe(45)
    r.removePreset(p!.id)
    expect(r.presets.value.some((x) => x.id === p!.id)).toBe(false)
  })

  it('applyPreset returns null for unknown id', () => {
    const r = useRotaryPicker()
    expect(r.applyPreset('nope')).toBeNull()
  })

  it('reset restores defaults', () => {
    const r = useRotaryPicker()
    r.setValue(90)
    r.savePreset('自定义')
    r.reset()
    expect(r.value.value).toBe(DEFAULT_ROTARY.value)
    expect(r.presets.value.length).toBe(DEFAULT_ROTARY.presets.length)
  })

  it('loads saved state from storage', () => {
    store['hf:rotary_picker'] = {
      value: 60,
      min: 5,
      max: 120,
      step: 5,
      unit: '分钟',
      presets: [{ id: 'p1', label: '旧预设', value: 60 }],
    }
    reloadRotary()
    const r = useRotaryPicker()
    expect(r.value.value).toBe(60)
    expect(r.presets.value.length).toBe(1)
  })
})
