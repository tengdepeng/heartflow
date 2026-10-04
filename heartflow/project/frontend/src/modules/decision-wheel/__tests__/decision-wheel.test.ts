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

import { useDecisionWheel, reloadWheel, DEFAULT_OPTIONS, MAX_HISTORY } from '../decision-wheel'

describe('useDecisionWheel', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    const w = useDecisionWheel()
    w.resetOptions()
    w.clearHistory()
  })

  it('starts with default options and empty history', () => {
    const w = useDecisionWheel()
    expect(w.options.value.length).toBe(DEFAULT_OPTIONS.length)
    expect(w.history.value.length).toBe(0)
    expect(w.canSpin.value).toBe(true)
    expect(w.lastResult.value).toBeNull()
  })

  it('adds and removes options', () => {
    const w = useDecisionWheel()
    const opt = w.addOption('  看电影  ')
    expect(opt).not.toBeNull()
    expect(w.options.value[w.options.value.length - 1].label).toBe('看电影')
    w.removeOption(opt!.id)
    expect(w.options.value.some((o) => o.id === opt!.id)).toBe(false)
  })

  it('ignores blank options', () => {
    const w = useDecisionWheel()
    const before = w.options.value.length
    expect(w.addOption('   ')).toBeNull()
    expect(w.options.value.length).toBe(before)
  })

  it('spin picks an option and records history', () => {
    const w = useDecisionWheel()
    const res = w.spin()
    expect(res).not.toBeNull()
    expect(res!.index).toBeGreaterThanOrEqual(0)
    expect(res!.index).toBeLessThan(w.options.value.length)
    expect(res!.option.label).toBe(w.options.value[res!.index].label)
    expect(w.history.value.length).toBe(1)
    expect(w.lastResult.value?.label).toBe(res!.option.label)
    const saved = store['hf:decision_wheel'] as { history: unknown[] }
    expect(saved.history.length).toBe(1)
  })

  it('spin returns null when fewer than two options', () => {
    const w = useDecisionWheel()
    while (w.options.value.length > 1) w.removeOption(w.options.value[0].id)
    expect(w.canSpin.value).toBe(false)
    expect(w.spin()).toBeNull()
  })

  it('caps history at MAX_HISTORY', () => {
    const w = useDecisionWheel()
    for (let i = 0; i < MAX_HISTORY + 5; i++) w.spin()
    expect(w.history.value.length).toBe(MAX_HISTORY)
  })

  it('clearHistory and resetOptions restore defaults', () => {
    const w = useDecisionWheel()
    w.spin()
    w.addOption('临时选项')
    w.clearHistory()
    expect(w.history.value.length).toBe(0)
    w.resetOptions()
    expect(w.options.value.length).toBe(DEFAULT_OPTIONS.length)
    expect(w.options.value.some((o) => o.label === '临时选项')).toBe(false)
  })

  it('loads saved state from storage', () => {
    store['hf:decision_wheel'] = {
      options: [
        { id: 'a', label: '甲' },
        { id: 'b', label: '乙' },
      ],
      history: [{ id: 'h1', label: '乙', at: '2026-01-01T00:00:00.000Z' }],
    }
    reloadWheel()
    const w = useDecisionWheel()
    expect(w.options.value.length).toBe(2)
    expect(w.history.value.length).toBe(1)
    expect(w.lastResult.value?.label).toBe('乙')
  })
})
