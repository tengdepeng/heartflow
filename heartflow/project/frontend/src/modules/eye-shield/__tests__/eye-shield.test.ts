import { describe, it, expect } from 'vitest'
import {
  dayPhaseFor,
  warmthForPhase,
  effectiveWarmth,
  shieldStateAt,
  buildDayCurve,
  eyeBreakPoint,
  DEFAULT_EYE_SHIELD_CONFIG,
} from '../eye-shield'

describe('eye-shield · 护眼方案引擎', () => {
  it('dayPhaseFor：昼夜时段分割', () => {
    expect(dayPhaseFor(6)).toBe('dawn')
    expect(dayPhaseFor(12)).toBe('day')
    expect(dayPhaseFor(19)).toBe('dusk')
    expect(dayPhaseFor(23)).toBe('night')
    expect(dayPhaseFor(3)).toBe('night')
  })

  it('warmthForPhase：夜色最暖、白昼最凉', () => {
    expect(warmthForPhase('night')).toBeGreaterThan(warmthForPhase('day'))
    expect(warmthForPhase('dusk')).toBeGreaterThan(warmthForPhase('dawn'))
  })

  it('effectiveWarmth：autoByTime 时偏向时段基准', () => {
    const cfg = { ...DEFAULT_EYE_SHIELD_CONFIG, warmth: 20 }
    expect(effectiveWarmth(cfg, 'night')).toBeGreaterThan(effectiveWarmth(cfg, 'day'))
  })

  it('effectiveWarmth：关闭 autoByTime 时用用户值', () => {
    const cfg = { ...DEFAULT_EYE_SHIELD_CONFIG, autoByTime: false, warmth: 55 }
    expect(effectiveWarmth(cfg, 'day')).toBe(55)
    expect(effectiveWarmth(cfg, 'night')).toBe(55)
  })

  it('shieldStateAt：夜色高暖触发蓝光过滤预设', () => {
    const cfg = { ...DEFAULT_EYE_SHIELD_CONFIG, autoByTime: true, warmth: 90 }
    const s = shieldStateAt(cfg, 23)
    expect(s.preset).toBe('blue')
  })

  it('shieldStateAt：高遮罩触发低亮度', () => {
    const cfg = { ...DEFAULT_EYE_SHIELD_CONFIG, autoByTime: false, warmth: 10, dim: 80 }
    const s = shieldStateAt(cfg, 3)
    expect(s.preset).toBe('dim')
  })

  it('shieldStateAt：灰度触发灰度预设', () => {
    const cfg = { ...DEFAULT_EYE_SHIELD_CONFIG, grayscale: true, warmth: 10, dim: 10 }
    const s = shieldStateAt(cfg, 12)
    expect(s.preset).toBe('grayscale')
  })

  it('buildDayCurve：随小时递增采样且不超当日', () => {
    const curve = buildDayCurve(10, DEFAULT_EYE_SHIELD_CONFIG)
    expect(curve.length).toBe(11)
    expect(curve[curve.length - 1].hour).toBe(10)
  })

  it('eyeBreakPoint：20 分钟整应休息', () => {
    const start = new Date(2025, 0, 1, 9, 0).getTime()
    const bp = eyeBreakPoint(start + 20 * 60 * 1000, start, 20)
    expect(bp.shouldBreak).toBe(true)
    expect(bp.minutesUsed).toBe(20)
  })

  it('eyeBreakPoint：未到间隔不休息', () => {
    const start = new Date(2025, 0, 1, 9, 0).getTime()
    const bp = eyeBreakPoint(start + 5 * 60 * 1000, start, 20)
    expect(bp.shouldBreak).toBe(false)
    expect(bp.secondsUntilBreak).toBe(15 * 60)
  })

  it('eyeBreakPoint：间隔为 0 时关闭提醒', () => {
    const start = new Date(2025, 0, 1, 9, 0).getTime()
    const bp = eyeBreakPoint(start + 60 * 1000, start, 0)
    expect(bp.shouldBreak).toBe(false)
  })
})