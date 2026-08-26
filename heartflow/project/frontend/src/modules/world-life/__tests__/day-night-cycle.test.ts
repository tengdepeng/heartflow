// ============================================================
// 昼夜循环引擎 · 测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ---- 模拟 storage ----
const mockKV: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, def: any) => mockKV[key] ?? def),
    setKV: vi.fn((key: string, val: any) => { mockKV[key] = val }),
  },
}))

// ---- 模拟时间 ----
const mockDate = new Date(2026, 7, 19, 10, 30, 0) // 2026-08-19 10:30

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(mockDate)
  Object.keys(mockKV).forEach(k => delete mockKV[k])
})

afterEach(() => {
  vi.useRealTimers()
})

import { useDayNightCycle, getCurrentDayPhase, DAY_PHASES } from '../day-night-cycle'

describe('day-night-cycle 昼夜循环', () => {
  it('getCurrentDayPhase 根据小时返回正确时段', () => {
    expect(getCurrentDayPhase()).toBe('morning') // 10:30 → morning
  })

  it('06:00 返回 dawn', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 6, 0, 0))
    expect(getCurrentDayPhase()).toBe('dawn')
  })

  it('12:00 返回 noon', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 12, 0, 0))
    expect(getCurrentDayPhase()).toBe('noon')
  })

  it('15:00 返回 afternoon', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 15, 0, 0))
    expect(getCurrentDayPhase()).toBe('afternoon')
  })

  it('18:00 返回 dusk', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 18, 0, 0))
    expect(getCurrentDayPhase()).toBe('dusk')
  })

  it('22:00 返回 night', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 22, 0, 0))
    expect(getCurrentDayPhase()).toBe('night')
  })

  it('03:00 返回 night（跨午夜）', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 3, 0, 0))
    expect(getCurrentDayPhase()).toBe('night')
  })

  it('useDayNightCycle 返回 API 对象', () => {
    const api = useDayNightCycle()
    expect(api).toBeDefined()
    expect(typeof api.enable).toBe('function')
    expect(typeof api.disable).toBe('function')
    expect(typeof api.setOverride).toBe('function')
    expect(typeof api.load).toBe('function')
  })

  it('load 默认禁用状态', () => {
    const api = useDayNightCycle()
    api.load()
    expect(api.enabled.value).toBe(false)
  })

  it('enable 启用后 enabled 为 true', () => {
    const api = useDayNightCycle()
    api.load()
    api.enable()
    expect(api.enabled.value).toBe(true)
    api.stop()
  })

  it('disable 禁用后 enabled 为 false', () => {
    const api = useDayNightCycle()
    api.load()
    api.enable()
    api.disable()
    expect(api.enabled.value).toBe(false)
    api.stop()
  })

  it('setOverride 覆盖时段', () => {
    const api = useDayNightCycle()
    api.load()
    api.setOverride('night')
    expect(api.currentPhase.value).toBe('night')
    expect(api.overridePhase.value).toBe('night')
  })

  it('setOverride(null) 恢复跟随实际时间', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 10, 0, 0))
    const api = useDayNightCycle()
    api.load()
    api.setOverride('night')
    api.setOverride(null)
    expect(api.currentPhase.value).toBe('morning')
  })

  it('phaseInfo 返回当前时段信息', () => {
    vi.setSystemTime(new Date(2026, 7, 19, 10, 0, 0))
    const api = useDayNightCycle()
    api.load()
    expect(api.phaseInfo.value.phase).toBe('morning')
    expect(api.phaseInfo.value.label).toBe('上午')
  })

  it('allPhases 包含全部 6 个时段', () => {
    const api = useDayNightCycle()
    api.load()
    expect(api.allPhases.length).toBe(6)
  })

  it('DAY_PHASES 每个时段有唯一 phase', () => {
    const phases = DAY_PHASES.map(p => p.phase)
    expect(new Set(phases).size).toBe(phases.length)
  })
})