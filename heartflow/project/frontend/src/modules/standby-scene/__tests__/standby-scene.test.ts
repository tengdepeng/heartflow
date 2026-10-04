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
  useStandbyScene,
  reloadStandbyScene,
  SCENES,
  DEFAULT_STANDBY,
  MIN_IDLE_SECONDS,
  MAX_IDLE_SECONDS,
} from '../standby-scene'

describe('useStandbyScene', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useStandbyScene().reset()
  })

  it('starts with defaults', () => {
    const s = useStandbyScene()
    expect(s.scene.value).toBe(DEFAULT_STANDBY.scene)
    expect(s.idleSeconds.value).toBe(DEFAULT_STANDBY.idleSeconds)
    expect(s.enabled.value).toBe(true)
  })

  it('sets a valid scene and ignores invalid', () => {
    const s = useStandbyScene()
    s.setScene('aurora')
    expect(s.scene.value).toBe('aurora')
    // @ts-expect-error 故意传非法值
    s.setScene('nebula')
    expect(s.scene.value).toBe('aurora')
  })

  it('clamps idle seconds into range', () => {
    const s = useStandbyScene()
    expect(s.setIdleSeconds(1)).toBe(MIN_IDLE_SECONDS)
    expect(s.setIdleSeconds(9999)).toBe(MAX_IDLE_SECONDS)
    expect(s.setIdleSeconds(45)).toBe(45)
  })

  it('toggles enabled and persists', () => {
    const s = useStandbyScene()
    expect(s.toggleEnabled()).toBe(false)
    const saved = store['hf:standby_scene'] as { enabled: boolean }
    expect(saved.enabled).toBe(false)
  })

  it('reset restores defaults', () => {
    const s = useStandbyScene()
    s.setScene('pulse')
    s.setIdleSeconds(120)
    s.toggleEnabled()
    s.reset()
    expect(s.scene.value).toBe(DEFAULT_STANDBY.scene)
    expect(s.idleSeconds.value).toBe(DEFAULT_STANDBY.idleSeconds)
    expect(s.enabled.value).toBe(true)
  })

  it('loads saved state from storage and falls back on bad scene', () => {
    store['hf:standby_scene'] = { scene: 'bogus', idleSeconds: 2, enabled: false }
    reloadStandbyScene()
    const s = useStandbyScene()
    expect(SCENES).toContain(s.scene.value)
    expect(s.scene.value).toBe(DEFAULT_STANDBY.scene)
    expect(s.idleSeconds.value).toBe(MIN_IDLE_SECONDS)
    expect(s.enabled.value).toBe(false)
  })
})
