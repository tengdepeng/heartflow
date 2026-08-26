// ============================================================
// 数字安息日 · 逻辑单测
// ============================================================

import { describe, expect, it, vi } from 'vitest'

// 隔离引擎依赖，独占验证「条款启用 ∧ 周日」组合语义
vi.mock('../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(),
  onEffectEvent: vi.fn(() => () => {}),
}))

import { isSunday, isSabbathOn } from '../useDigitalSabbath'
import { isTargetActive } from '../../engine/constitution-effect'

// 2026-08-16 为周日（getDay()===0）；用固定日期避免依赖运行环境
function onDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d)
}

describe('isSunday', () => {
  it('周日（getDay()===0）为 true', () => {
    expect(isSunday(onDate(2026, 8, 16))).toBe(true) // 实际周日
  })

  it('非周日为 false', () => {
    expect(isSunday(onDate(2026, 8, 17))).toBe(false) // 周一
    expect(isSunday(onDate(2026, 8, 15))).toBe(false) // 周六
  })
})

describe('isSabbathOn', () => {
  it('条款启用 且 周日 → true', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isSabbathOn(onDate(2026, 8, 16))).toBe(true)
  })

  it('条款关闭 → 即使周日也为 false', () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    expect(isSabbathOn(onDate(2026, 8, 16))).toBe(false)
  })

  it('非周日 → 即使条款启用也为 false', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isSabbathOn(onDate(2026, 8, 17))).toBe(false)
  })
})
