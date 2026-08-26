// ============================================================
// 藏象阁 · 体质调理方案（five-movements / useWellnessPlan）测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { useWellnessPlan } from '../five-movements'
import type { ConstitutionAnalysis, ConstitutionType } from '../types'

function planFor(type: ConstitutionType) {
  const wp = useWellnessPlan()
  const analysis: ConstitutionAnalysis = {
    type,
    label: type,
    scores: {} as Record<ConstitutionType, number>,
    characteristics: [],
    recommendations: [],
    analyzedAt: new Date().toISOString(),
  }
  return wp.generateWellnessPlan(analysis)
}

const ALL_TYPES: ConstitutionType[] = [
  'balanced', 'qi-deficiency', 'yang-deficiency', 'yin-deficiency',
  'phlegm-dampness', 'damp-heat', 'blood-stasis', 'qi-stagnation', 'allergic',
]

describe('generateWellnessPlan', () => {
  it('每种体质都产出完整方案结构', () => {
    for (const t of ALL_TYPES) {
      const p = planFor(t)
      expect(p.constitutionType).toBe(t)
      expect(p.dietAdvice.length).toBeGreaterThan(0)
      expect(p.exerciseAdvice.length).toBeGreaterThan(0)
      expect(p.lifestyleAdvice.length).toBeGreaterThan(0)
      expect(p.acupressurePoints.length).toBeGreaterThan(0)
      expect(p.teaRecommendations.length).toBeGreaterThan(0)
      expect(p.generatedAt).toBeTruthy()
    }
  })

  it('气虚质给出补气饮食', () => {
    const p = planFor('qi-deficiency')
    expect(p.dietAdvice.some(x => x.includes('黄芪'))).toBe(true)
    expect(p.teaRecommendations.some(x => x.includes('黄芪'))).toBe(true)
  })

  it('气郁质给出太冲、期门穴位', () => {
    const p = planFor('qi-stagnation')
    const names = p.acupressurePoints.map(x => x.name)
    expect(names).toContain('太冲')
    expect(names).toContain('期门')
  })

  it('血瘀质给出血海、三阴交穴位', () => {
    const p = planFor('blood-stasis')
    const names = p.acupressurePoints.map(x => x.name)
    expect(names).toContain('血海')
    expect(names).toContain('三阴交')
  })

  it('四季调整含五季', () => {
    const p = planFor('balanced')
    expect(Object.keys(p.seasonalAdjustments)).toEqual(['春', '夏', '长夏', '秋', '冬'])
  })

  it('平和质给出均衡饮食并含体质建议', () => {
    const p = planFor('balanced')
    expect(p.dietAdvice.some(x => x.includes('均衡'))).toBe(true)
    expect(p.lifestyleAdvice.some(x => x.includes('保持'))).toBe(true)
  })
})