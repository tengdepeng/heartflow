import { describe, it, expect } from 'vitest'
import {
  reciteOverview,
  reciteStepDistribution,
  reciteRhythm,
  reciteInsights,
} from '../recite-analytics'
import type { ReciteCard } from '../recite'

function card(partial: Partial<ReciteCard> & { id: string }): ReciteCard {
  return {
    title: '',
    text: '',
    lang: 'cjk',
    createdAt: new Date().toISOString(),
    stepIndex: 0,
    bestAccuracy: 0,
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    errorTokens: {},
    ...partial,
  }
}

describe('recite-analytics · 背诵档案引擎', () => {
  it('reciteOverview：空库概览归零', () => {
    const ov = reciteOverview([])
    expect(ov.total).toBe(0)
    expect(ov.mastered).toBe(0)
    expect(ov.avgBestAccuracy).toBe(0)
    expect(ov.masteryRate).toBe(0)
  })

  it('reciteOverview：统计已背熟/未练/最佳准确率', () => {
    const ov = reciteOverview([
      card({ id: 'a', stepIndex: 4, attempts: 6, bestAccuracy: 100, correctCount: 5, wrongCount: 1 }),
      card({ id: 'b', attempts: 0 }),
      card({ id: 'c', attempts: 2, bestAccuracy: 80, correctCount: 1, wrongCount: 1 }),
    ])
    expect(ov.total).toBe(3)
    expect(ov.mastered).toBe(1)
    expect(ov.practiced).toBe(2)
    expect(ov.untouched).toBe(1)
    expect(ov.totalAttempts).toBe(8)
    expect(ov.avgBestAccuracy).toBe(90)
    expect(ov.masteryRate).toBe(33)
  })

  it('reciteStepDistribution：按遮盖档归桶', () => {
    const rows = reciteStepDistribution([
      card({ id: 'a', stepIndex: 0 }),
      card({ id: 'b', stepIndex: 0 }),
      card({ id: 'c', stepIndex: 2 }),
      card({ id: 'd', stepIndex: 4 }),
    ])
    expect(rows).toHaveLength(5)
    expect(rows[0].label).toBe('20%')
    expect(rows[0].count).toBe(2)
    expect(rows[2].count).toBe(1)
    expect(rows[4].count).toBe(1)
  })

  it('reciteRhythm：通过率与弱字词累积', () => {
    const r = reciteRhythm([
      card({ id: 'a', attempts: 2, correctCount: 1, wrongCount: 1, errorTokens: { '前': 2, '月': 1 } }),
      card({ id: 'b', attempts: 1, correctCount: 1, errorTokens: { '前': 1 } }),
    ])
    expect(r.practicedCards).toBe(2)
    expect(r.passRate).toBe(67)
    expect(r.weakTokens).toEqual([{ token: '前', count: 3 }])
  })

  it('reciteInsights：空库给出引导', () => {
    const out = reciteInsights([])
    expect(out[0]).toContain('还没有')
  })

  it('reciteInsights：practice 场景生成事实洞察', () => {
    const out = reciteInsights(
      [card({ id: 'a', stepIndex: 1, attempts: 3, bestAccuracy: 85, correctCount: 2, wrongCount: 1, errorTokens: { '前': 2 } })],
      5,
    )
    expect(out.some((s) => s.includes('85%'))).toBe(true)
    expect(out.some((s) => s.includes('「前」'))).toBe(true)
  })

  it('reciteInsights：limit 截断', () => {
    const out = reciteInsights(
      [
        card({ id: 'a', stepIndex: 2, attempts: 8, bestAccuracy: 95, correctCount: 7, wrongCount: 1 }),
        card({ id: 'b', stepIndex: 1, attempts: 5, bestAccuracy: 70, correctCount: 3, wrongCount: 2, errorTokens: { '床': 2 } }),
      ],
      2,
    )
    expect(out.length).toBeLessThanOrEqual(2)
  })
})