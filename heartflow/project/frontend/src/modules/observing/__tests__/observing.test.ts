// ============================================================
// 观星指数观测引擎 · 测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  computeObservingScore,
  ratingForScore,
  tipForScore,
  DEFAULT_OBSERVING_CONFIG,
  OBSERVING_META,
} from '../observing'

describe('ratingForScore', () => {
  it('按阈值分级', () => {
    expect(ratingForScore(90)).toBe('excellent')
    expect(ratingForScore(80)).toBe('good')
    expect(ratingForScore(60)).toBe('fair')
    expect(ratingForScore(45)).toBe('poor')
    expect(ratingForScore(20)).toBe('bad')
  })
})

describe('computeObservingScore', () => {
  it('理想夜况——深夜、新月、暗夜、晴空 得到高分', () => {
    const s = computeObservingScore({
      hour: 23,
      illumination: 0.02,
      lightPollution: 1,
      cloud: 0,
    })
    expect(s.total).toBeGreaterThanOrEqual(85)
    expect(s.rating).toBe('excellent')
  })

  it('白昼时段被大幅压低', () => {
    const day = computeObservingScore({ hour: 13, illumination: 0.3, lightPollution: 5, cloud: 2 })
    const night = computeObservingScore({ hour: 22, illumination: 0.3, lightPollution: 5, cloud: 2 })
    expect(day.total).toBeLessThan(night.total)
  })

  it('满月与光害、厚云都显著拉低得分', () => {
    const bad = computeObservingScore({
      hour: 22,
      illumination: 0.98,
      lightPollution: 10,
      cloud: 10,
    })
    expect(bad.total).toBeLessThan(40)
    expect(bad.rating).toBe('bad')
  })

  it('天象事件带来加成但不超 100', () => {
    const noEvent = computeObservingScore({ hour: 22, illumination: 0.1, lightPollution: 2, cloud: 1 })
    const withEvent = computeObservingScore({ hour: 22, illumination: 0.1, lightPollution: 2, cloud: 1, hasAstroEvent: true })
    expect(withEvent.total).toBeGreaterThan(noEvent.total)
    expect(withEvent.factors.eventBonus).toBe(8)
    expect(withEvent.total).toBeLessThanOrEqual(100)
  })

  it('各维度分解字段齐全且越不利越低', () => {
    const s = computeObservingScore({ hour: 20, illumination: 1, lightPollution: 8, cloud: 7 })
    expect(s.factors.time).toBe(100) // 夜间
    expect(s.factors.moon).toBeLessThan(30) // 满月
    expect(s.factors.light).toBeLessThan(40)
    expect(s.factors.cloud).toBeLessThan(40)
  })
})

describe('tipForScore', () => {
  it('云厚时提醒改期', () => {
    const factors = { time: 100, moon: 50, light: 50, cloud: 80, eventBonus: 0 }
    expect(tipForScore(40, factors)).toContain('改期')
  })

  it('月明时建议观月', () => {
    const factors = { time: 100, moon: 80, light: 50, cloud: 20, eventBonus: 0 }
    expect(tipForScore(70, factors)).toContain('观月')
  })
})

describe('DEFAULT_OBSERVING_CONFIG / OBSERVING_META', () => {
  it('默认光害为城市级别 6', () => {
    expect(DEFAULT_OBSERVING_CONFIG.lightPollution).toBe(6)
    expect(DEFAULT_OBSERVING_CONFIG.boostOnEvents).toBe(true)
  })

  it('每个等级都有描述', () => {
    for (const r of ['excellent', 'good', 'fair', 'poor', 'bad']) {
      expect(OBSERVING_META[r as keyof typeof OBSERVING_META].label.length).toBeGreaterThan(0)
      expect(OBSERVING_META[r as keyof typeof OBSERVING_META].color).toMatch(/^#/)
    }
  })
})