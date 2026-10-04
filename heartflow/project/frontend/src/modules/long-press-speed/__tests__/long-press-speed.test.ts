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
  useLongPressSpeed,
  reloadLongPressSpeed,
  computeSpeed,
  computeProgress,
  DEFAULT_LONG_PRESS_SPEED,
  MIN_BASE_SPEED,
  MAX_BASE_SPEED,
  MIN_HOLD_SPEED,
  MAX_HOLD_SPEED,
  MIN_RAMP_MS,
  MAX_RAMP_MS,
} from '../long-press-speed'

describe('useLongPressSpeed', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useLongPressSpeed().reset()
  })

  it('默认状态', () => {
    const s = useLongPressSpeed()
    expect(s.enabled.value).toBe(true)
    expect(s.baseSpeed.value).toBe(1)
    expect(s.holdSpeed.value).toBe(2)
    expect(s.rampMs.value).toBe(600)
    expect(s.ripple.value).toBe(true)
  })

  it('基准/按住倍速与爬升时长均夹取', () => {
    const s = useLongPressSpeed()
    expect(s.setBaseSpeed(0)).toBe(MIN_BASE_SPEED)
    expect(s.setBaseSpeed(9)).toBe(MAX_BASE_SPEED)
    expect(s.setHoldSpeed(0)).toBe(MIN_HOLD_SPEED)
    expect(s.setHoldSpeed(9)).toBe(MAX_HOLD_SPEED)
    expect(s.setRampMs(0)).toBe(MIN_RAMP_MS)
    expect(s.setRampMs(99999)).toBe(MAX_RAMP_MS)
  })

  it('切换涟漪与开关', () => {
    const s = useLongPressSpeed()
    expect(s.toggleRipple()).toBe(false)
    s.setEnabled(false)
    expect(s.enabled.value).toBe(false)
  })

  it('倍速由基准线性爬升至按住倍速', () => {
    const cfg = { ...DEFAULT_LONG_PRESS_SPEED, baseSpeed: 1, holdSpeed: 3, rampMs: 1000 }
    expect(computeSpeed(0, cfg)).toBe(1)
    expect(computeSpeed(500, cfg)).toBe(2)
    expect(computeSpeed(1000, cfg)).toBe(3)
    expect(computeSpeed(5000, cfg)).toBe(3)
  })

  it('禁用时长按不加速', () => {
    const cfg = { ...DEFAULT_LONG_PRESS_SPEED, enabled: false }
    expect(computeSpeed(9999, cfg)).toBe(cfg.baseSpeed)
  })

  it('爬升进度 0~1', () => {
    const cfg = { ...DEFAULT_LONG_PRESS_SPEED, rampMs: 400 }
    expect(computeProgress(-10, cfg)).toBe(0)
    expect(computeProgress(200, cfg)).toBe(0.5)
    expect(computeProgress(9999, cfg)).toBe(1)
  })

  it('复位与持久化', () => {
    const s = useLongPressSpeed()
    s.setHoldSpeed(3)
    s.toggleRipple()
    expect((store['hf:long_press_speed'] as any).holdSpeed).toBe(3)
    s.reset()
    expect(s.holdSpeed.value).toBe(DEFAULT_LONG_PRESS_SPEED.holdSpeed)
    expect(s.ripple.value).toBe(true)
  })

  it('加载时清洗非法值', () => {
    store['hf:long_press_speed'] = { enabled: false, baseSpeed: 99, holdSpeed: 0, rampMs: -1, ripple: false }
    reloadLongPressSpeed()
    const s = useLongPressSpeed()
    expect(s.enabled.value).toBe(false)
    expect(s.baseSpeed.value).toBe(MAX_BASE_SPEED)
    expect(s.holdSpeed.value).toBe(MIN_HOLD_SPEED)
    expect(s.rampMs.value).toBe(MIN_RAMP_MS)
    expect(s.ripple.value).toBe(false)
  })
})
