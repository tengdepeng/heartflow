// ============================================================
// 夜静调暗 · 逻辑单测
// ============================================================

import { describe, expect, it, vi } from 'vitest'

// 隔离引擎依赖，独占验证「条款启用 ∧ 夜间时段」组合语义
vi.mock('../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(),
  onEffectEvent: vi.fn(() => () => {}),
}))

import { isNightWindow, isNightDimOn } from '../useNightDim'
import { isTargetActive } from '../../engine/constitution-effect'

function at(hour: number, minute = 0): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

describe('isNightWindow', () => {
  it('22:00（含）至次日 05:00（不含）为夜间', () => {
    expect(isNightWindow(at(22))).toBe(true) // 22:00 边界
    expect(isNightWindow(at(23))).toBe(true)
    expect(isNightWindow(at(0))).toBe(true)
    expect(isNightWindow(at(3))).toBe(true)
    expect(isNightWindow(at(4, 59))).toBe(true)
  })

  it('05:00 起恢复日间', () => {
    expect(isNightWindow(at(5))).toBe(false)
    expect(isNightWindow(at(12))).toBe(false)
    expect(isNightWindow(at(21, 59))).toBe(false) // 21:59 仍日间
  })
})

describe('isNightDimOn', () => {
  it('条款启用 且 夜间 → true', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isNightDimOn(at(23))).toBe(true)
  })

  it('条款关闭 → 即使夜间也为 false', () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    expect(isNightDimOn(at(23))).toBe(false)
  })

  it('日间 → 即使条款启用也为 false', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isNightDimOn(at(12))).toBe(false)
  })
})
