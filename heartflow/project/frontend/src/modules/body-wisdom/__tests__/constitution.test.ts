// ============================================================
// 藏象阁 · 体质画像单元测试
// 5 分量表问卷 + 量表分析 + 雷达图数据 + 画像摘要
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  CONSTITUTION_SCALE_QUESTIONS,
  CONSTITUTION_SCALE_OPTIONS,
  analyzeConstitutionScale,
  constitutionRadarData,
  constitutionPortrait,
} from '../constitution'
import type { ConstitutionType } from '../types'
import { CONSTITUTION_META } from '../types'

/** 构造指定体质的满分回答（其余为 0） */
function answersForType(type: ConstitutionType, value = 4): number[] {
  return CONSTITUTION_SCALE_QUESTIONS.map(q => (q.type === type ? value : 0))
}

describe('体质画像 · 量表问卷数据', () => {
  it('共 36 题', () => {
    expect(CONSTITUTION_SCALE_QUESTIONS).toHaveLength(36)
  })

  it('每种体质恰好 4 题', () => {
    const counts: Record<string, number> = {}
    for (const q of CONSTITUTION_SCALE_QUESTIONS) {
      counts[q.type] = (counts[q.type] ?? 0) + 1
    }
    for (const type of Object.keys(CONSTITUTION_META)) {
      expect(counts[type]).toBe(4)
    }
  })

  it('题目 id 唯一', () => {
    const ids = CONSTITUTION_SCALE_QUESTIONS.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('量表选项为 5 档（0-4）', () => {
    expect(CONSTITUTION_SCALE_OPTIONS).toHaveLength(5)
    expect(CONSTITUTION_SCALE_OPTIONS.map(o => o.value)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('analyzeConstitutionScale - 量表分析', () => {
  it('全 0 回答 → 各型 0 分，主体质为平和', () => {
    const r = analyzeConstitutionScale(new Array(36).fill(0))
    expect(r.type).toBe('balanced')
    expect(r.scaleScores!.balanced).toBe(0)
    expect(Object.values(r.scaleScores!).every(v => v === 0)).toBe(true)
  })

  it('全 4 回答 → 各型 100 分', () => {
    const r = analyzeConstitutionScale(new Array(36).fill(4))
    expect(Object.values(r.scaleScores!).every(v => v === 100)).toBe(true)
  })

  it('气虚质满分 → 主体质为气虚，得分 100', () => {
    const r = analyzeConstitutionScale(answersForType('qi-deficiency'))
    expect(r.type).toBe('qi-deficiency')
    expect(r.label).toBe('气虚质')
    expect(r.scaleScores!['qi-deficiency']).toBe(100)
  })

  it('平和质满分且其余 0 → 主体质为平和（官方规则）', () => {
    const r = analyzeConstitutionScale(answersForType('balanced'))
    expect(r.type).toBe('balanced')
    expect(r.scaleScores!.balanced).toBe(100)
  })

  it('平和≥60 且其余<40 → 判定平和', () => {
    // 平和 3 题满分（75 分），其余各型 1 题 1 分（6 分）
    const answers = CONSTITUTION_SCALE_QUESTIONS.map((q, i) => {
      if (q.type === 'balanced') return i % 4 < 3 ? 4 : 0
      return i % 4 === 0 ? 1 : 0
    })
    const r = analyzeConstitutionScale(answers)
    expect(r.scaleScores!.balanced).toBeGreaterThanOrEqual(60)
    expect(r.type).toBe('balanced')
  })

  it('scores 为 0-1 归一化，最高分为 1', () => {
    const r = analyzeConstitutionScale(answersForType('damp-heat', 3))
    expect(Math.max(...Object.values(r.scores))).toBe(1)
    expect(Object.values(r.scores).every(v => v >= 0 && v <= 1)).toBe(true)
  })

  it('回答越界值被钳制到 0-4', () => {
    const answers = CONSTITUTION_SCALE_QUESTIONS.map(q =>
      q.type === 'allergic' ? 99 : -5,
    )
    const r = analyzeConstitutionScale(answers)
    expect(r.scaleScores!.allergic).toBe(100)
    expect(Object.values(r.scaleScores!).every(v => v >= 0 && v <= 100)).toBe(true)
  })

  it('返回特征与调理建议', () => {
    const r = analyzeConstitutionScale(answersForType('yang-deficiency'))
    expect(r.characteristics.length).toBeGreaterThan(0)
    expect(r.recommendations.length).toBeGreaterThan(0)
    expect(r.analyzedAt).toBeTruthy()
  })
})

describe('constitutionRadarData - 雷达图数据', () => {
  it('恒返回 9 个维度', () => {
    const r = analyzeConstitutionScale(answersForType('qi-stagnation'))
    const radar = constitutionRadarData(r)
    expect(radar).toHaveLength(9)
  })

  it('得分 0-100，主体质被标记', () => {
    const r = analyzeConstitutionScale(answersForType('blood-stasis'))
    const radar = constitutionRadarData(r)
    expect(radar.every(p => p.score >= 0 && p.score <= 100)).toBe(true)
    const primary = radar.find(p => p.isPrimary)
    expect(primary!.type).toBe('blood-stasis')
    expect(primary!.score).toBe(100)
  })

  it('无 scaleScores 时回退到 scores*100', () => {
    const r = analyzeConstitutionScale(answersForType('phlegm-dampness'))
    delete r.scaleScores
    const radar = constitutionRadarData(r)
    const primary = radar.find(p => p.isPrimary)
    expect(primary!.score).toBe(100)
  })
})

describe('constitutionPortrait - 画像摘要', () => {
  it('平和质 → 偏颇程度为平和', () => {
    const r = analyzeConstitutionScale(answersForType('balanced'))
    const p = constitutionPortrait(r)
    expect(p.primaryLabel).toBe('平和质')
    expect(p.balanceDegree).toBe('平和')
  })

  it('明显偏颇：主体质得分≥60', () => {
    const r = analyzeConstitutionScale(answersForType('damp-heat'))
    const p = constitutionPortrait(r)
    expect(p.balanceDegree).toBe('明显偏颇')
    expect(p.primaryScore).toBe(100)
  })

  it('topTendencies 排除平和质、按得分降序、最多 3 项', () => {
    const r = analyzeConstitutionScale(answersForType('qi-deficiency'))
    const p = constitutionPortrait(r)
    expect(p.topTendencies.every(t => t.type !== 'balanced')).toBe(true)
    expect(p.topTendencies.length).toBeLessThanOrEqual(3)
    const scores = p.topTendencies.map(t => t.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('调理建议来自分析结果', () => {
    const r = analyzeConstitutionScale(answersForType('yin-deficiency'))
    const p = constitutionPortrait(r)
    expect(p.advice.length).toBeGreaterThan(0)
  })
})
