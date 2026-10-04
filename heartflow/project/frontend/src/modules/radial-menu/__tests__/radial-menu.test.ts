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

import { useRadialMenu, reloadRadialMenu, DEFAULT_ACTIONS, MAX_ACTIONS } from '../radial-menu'

describe('useRadialMenu', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useRadialMenu().resetActions()
  })

  it('starts with default actions', () => {
    const m = useRadialMenu()
    expect(m.actions.value.length).toBe(DEFAULT_ACTIONS.length)
    expect(m.canAdd.value).toBe(true)
  })

  it('adds a trimmed action and ignores blanks', () => {
    const m = useRadialMenu()
    const a = m.addAction('  泡杯茶  ')
    expect(a).not.toBeNull()
    expect(a!.label).toBe('泡杯茶')
    expect(m.addAction('   ')).toBeNull()
    expect(m.actions.value.some((x) => x.label === '泡杯茶')).toBe(true)
  })

  it('caps actions at MAX_ACTIONS', () => {
    const m = useRadialMenu()
    while (m.actions.value.length < MAX_ACTIONS) m.addAction('补充')
    expect(m.canAdd.value).toBe(false)
    expect(m.addAction('超出')).toBeNull()
    expect(m.actions.value.length).toBe(MAX_ACTIONS)
  })

  it('removes an action', () => {
    const m = useRadialMenu()
    const target = m.actions.value[0]
    m.removeAction(target.id)
    expect(m.actions.value.some((a) => a.id === target.id)).toBe(false)
  })

  it('records trigger and rejects unknown ids', () => {
    const m = useRadialMenu()
    const target = m.actions.value[0]
    expect(m.trigger(target.id)).toBe(true)
    expect(m.lastTriggeredId.value).toBe(target.id)
    const saved = store['hf:radial_menu'] as { lastTriggeredId: string }
    expect(saved.lastTriggeredId).toBe(target.id)
    expect(m.trigger('nope')).toBe(false)
  })

  it('resetActions restores defaults', () => {
    const m = useRadialMenu()
    m.addAction('临时')
    m.resetActions()
    expect(m.actions.value.length).toBe(DEFAULT_ACTIONS.length)
    expect(m.actions.value.some((a) => a.label === '临时')).toBe(false)
  })

  it('loads saved actions from storage', () => {
    store['hf:radial_menu'] = {
      actions: [
        { id: 'x1', label: '独一份', icon: '🌟' },
        { id: 'x2', label: '第二', icon: '✨' },
      ],
      lastTriggeredId: 'x2',
      lastTriggeredAt: '2026-01-01T00:00:00.000Z',
    }
    reloadRadialMenu()
    const m = useRadialMenu()
    expect(m.actions.value.length).toBe(2)
    expect(m.lastTriggeredId.value).toBe('x2')
  })
})
