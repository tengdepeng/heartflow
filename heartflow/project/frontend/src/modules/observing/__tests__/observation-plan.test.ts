// ============================================================
// 时间长廊 · 观测计划生成器测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  buildObservationPlan,
  effectiveMagnitudeLimit,
  deepSkyAlt,
} from '../observation-plan'

describe('observation plan', () => {
  it('生成完整观测计划结构', () => {
    const plan = buildObservationPlan(new Date('2026-08-21T20:00:00'), {
      latDeg: 23,
      lngDeg: 113,
      lightPollution: 6,
      cloud: 0,
    })
    expect(plan.dateKey).toBe('2026-08-21')
    expect(plan.moon.illumination).toBeGreaterThanOrEqual(0)
    expect(plan.moon.illumination).toBeLessThanOrEqual(1)
    expect(plan.score.total).toBeGreaterThanOrEqual(0)
    expect(plan.score.total).toBeLessThanOrEqual(100)
    expect(plan.phases.length).toBeGreaterThanOrEqual(3)
    expect(plan.bestTargets.length).toBeGreaterThan(0)
    expect(plan.summary.length).toBeGreaterThan(0)
  })

  it('月相照明比例传递到评分', () => {
    const plan = buildObservationPlan(new Date('2026-08-21T20:00:00'))
    expect(plan.moon.illumination).toBeGreaterThan(0)
  })

  it('effectiveMagnitudeLimit 随光害与月光收紧', () => {
    const dark = effectiveMagnitudeLimit(0.1, 3)
    const light = effectiveMagnitudeLimit(0.9, 8)
    expect(dark).toBeGreaterThan(light)
  })

  it('每时段目标都由星等达标的深空天体构成', () => {
    const plan = buildObservationPlan(new Date('2026-08-21T20:00:00'), { lightPollution: 5 })
    for (const phase of plan.phases) {
      for (const t of phase.targets) {
        expect(t.mag).toBeLessThanOrEqual(plan.magnitudeLimit)
      }
    }
  })

  it('deepSkyAlt 返回合法角度', () => {
    const alt = deepSkyAlt(
      { ra: 0.71, dec: 41.27 },
      new Date('2026-08-21T20:00:00'),
      20,
      23,
      113,
    )
    expect(Math.abs(alt)).toBeLessThanOrEqual(90)
  })
})