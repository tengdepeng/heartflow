import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDefaultEnvironmentState, type EnvironmentState } from '../types'
import { maskUnauthorizedPerception, PERCEPTION_DIMENSIONS } from '../../../stores/perception'

vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn((t: string) => t === 'perception:enabled'),
}))

import { isTargetActive } from '../../../engine/constitution-effect'

function envWithOverrides(o: Partial<EnvironmentState>): EnvironmentState {
  return { ...createDefaultEnvironmentState(), ...o }
}

describe('maskUnauthorizedPerception · 第43条感知的边界', () => {
  beforeEach(() => {
    vi.mocked(isTargetActive).mockReturnValue(true)
  })

  it('边界未生效时透传全部维度（不改写）', () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    const env = envWithOverrides({ activeApp: 'VSCode', ambientLight: 500, isOnline: false })
    const out = maskUnauthorizedPerception(env, new Set(PERCEPTION_DIMENSIONS))
    expect(out.activeApp).toBe('VSCode')
    expect(out.ambientLight).toBe(500)
    expect(out.isOnline).toBe(false)
  })

  it('边界生效且维度全部授权时不遮蔽', () => {
    const env = envWithOverrides({ activeApp: 'VSCode', ambientLight: 500 })
    const out = maskUnauthorizedPerception(env, new Set(PERCEPTION_DIMENSIONS))
    expect(out.activeApp).toBe('VSCode')
    expect(out.ambientLight).toBe(500)
  })

  it('边界生效且 location 未授权时遮蔽其字段', () => {
    const env = envWithOverrides({ activeApp: 'VSCode', activeWindowTitle: 'main.ts' })
    const auth = new Set(PERCEPTION_DIMENSIONS.filter((d) => d !== 'location'))
    const out = maskUnauthorizedPerception(env, auth)
    expect(out.activeApp).toBeNull()
    expect(out.activeWindowTitle).toBeNull()
  })

  it('边界生效且 battery 未授权时回退电量相关字段', () => {
    const env = envWithOverrides({ batteryLevel: 0.3, isCharging: true, isLowPower: true })
    const auth = new Set(PERCEPTION_DIMENSIONS.filter((d) => d !== 'battery'))
    const out = maskUnauthorizedPerception(env, auth)
    expect(out.batteryLevel).toBeNull()
    expect(out.isCharging).toBeNull()
    expect(out.isLowPower).toBe(false)
  })

  it('边界生效且 time 未授权时回退时段字段', () => {
    const env = envWithOverrides({ hour: 14, timeOfDay: 'afternoon' })
    const auth = new Set(PERCEPTION_DIMENSIONS.filter((d) => d !== 'time'))
    const out = maskUnauthorizedPerception(env, auth)
    expect(out.hour).toBe(createDefaultEnvironmentState().hour)
    expect(out.timeOfDay).toBe(createDefaultEnvironmentState().timeOfDay)
  })
})
