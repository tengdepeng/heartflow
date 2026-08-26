import { describe, it, expect } from 'vitest'
import {
  masteryStateFor,
  applyFeedback,
  computeMasteryStats,
  sortByWeakness,
  MASTERY_THRESHOLDS,
  type MasteryItem,
} from '../mastery'

function item(partial: Partial<MasteryItem> & { topic: string }): MasteryItem {
  return { id: partial.id ?? 'm1', confidence: 0, attempts: 0, difficulty: 1, updatedAt: 't', ...partial }
}

describe('mastery · 掌握度引擎', () => {
  it('masteryStateFor：阈值映射三态', () => {
    expect(masteryStateFor(0)).toBe('new')
    expect(masteryStateFor(50)).toBe('learning')
    expect(masteryStateFor(MASTERY_THRESHOLDS.mastered)).toBe('mastered')
  })

  it('applyFeedback：高分会提升掌握度并增加尝试次数', () => {
    const m = item({ topic: '流体力学', confidence: 0, attempts: 0, difficulty: 1 })
    const r = applyFeedback(m, 95)
    expect(r.confidence).toBeGreaterThan(0)
    expect(r.attempts).toBe(1)
    expect(r.lastScore).toBe(95)
  })

  it('applyFeedback：难点增长更慢', () => {
    const easy = applyFeedback(item({ topic: 'a', confidence: 0, difficulty: 1 }), 90)
    const hard = applyFeedback(item({ topic: 'b', confidence: 0, difficulty: 4 }), 90)
    expect(easy.confidence).toBeGreaterThan(hard.confidence)
  })

  it('applyFeedback：低分导致回落', () => {
    const start = item({ topic: 'x', confidence: 70, attempts: 2, difficulty: 1 })
    const r = applyFeedback(start, 20)
    expect(r.confidence).toBeLessThan(70)
  })

  it('applyFeedback：已通晓后增长放缓（饱和）', () => {
    const mastered = applyFeedback(item({ topic: 'y', confidence: 90, attempts: 5, difficulty: 1 }), 95)
    const mid = applyFeedback(item({ topic: 'z', confidence: 30, attempts: 1, difficulty: 1 }), 95)
    // 全对反馈下，练习中大幅提升，已通晓因饱和只小幅爬升
    expect(mid.confidence - 30).toBeGreaterThan(mastered.confidence - 90)
    expect(mastered.confidence - 90).toBeLessThan(96)
  })

  it('computeMasteryStats：统计三类与平均', () => {
    const s = computeMasteryStats([
      item({ topic: 'a', confidence: 95 }),
      item({ topic: 'b', confidence: 50 }),
      item({ topic: 'c', confidence: 5 }),
    ])
    expect(s.mastered).toBe(1)
    expect(s.learning).toBe(1)
    expect(s.fresh).toBe(1)
    expect(s.average).toBeGreaterThan(40)
  })

  it('sortByWeakness：掌握度低者在前', () => {
    const sorted = sortByWeakness([item({ topic: 'a', confidence: 90 }), item({ topic: 'b', confidence: 10 })])
    expect(sorted[0].topic).toBe('b')
  })
})