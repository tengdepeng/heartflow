// ============================================================
// 阅览殿 · 间隔重复测试（复用笔记知识年轮引擎）
// ============================================================
import { describe, expect, it } from 'vitest'
import { useReadingSrs } from '../srs'
import { useNote } from '../../note'
import type { KnowledgeRing } from '../../note/knowledge-ring'

function makeRing(noteId: string, title: string, nextReviewAt: string, rings = 0): KnowledgeRing {
  const now = new Date().toISOString()
  return {
    noteId, title, rings,
    lastReviewedAt: now,
    nextReviewAt,
    reviewCount: rings,
    forgetCount: 0,
    crackCount: 0,
    hasReunion: false,
    luminance: Math.min(1, 0.3 + rings * 0.1),
    createdAt: now,
    updatedAt: now,
  }
}

describe('阅览殿 间隔重复', () => {
  it('reviewQueue 仅包含到期/逾期年轮', () => {
    const note = useNote()
    const past = new Date(Date.now() - 86400000).toISOString()
    const future = new Date(Date.now() + 86400000).toISOString()
    note.knowledgeRings.value = [makeRing('n1', '笔记A', past), makeRing('n2', '笔记B', future)]
    const srs = useReadingSrs()
    expect(srs.reviewQueue.value.map(i => i.noteId)).toEqual(['n1'])
  })

  it('review(know) 推进年轮层数并移出待复习', () => {
    const note = useNote()
    const past = new Date(Date.now() - 86400000).toISOString()
    note.knowledgeRings.value = [makeRing('n1', '笔记A', past, 0)]
    const srs = useReadingSrs()
    const updated = srs.review('n1', 'know')
    expect(updated?.rings).toBe(1)
    expect(srs.reviewQueue.value.find(i => i.noteId === 'n1')).toBeUndefined()
  })

  it('review(forget) 产生裂缝并重置层数', () => {
    const note = useNote()
    const past = new Date(Date.now() - 86400000).toISOString()
    note.knowledgeRings.value = [makeRing('n1', '笔记A', past, 3)]
    const srs = useReadingSrs()
    const updated = srs.review('n1', 'forget')
    expect(updated?.crackCount).toBe(1)
    expect(updated?.rings).toBe(2)
  })

  it('review(fuzzy) 弱掌握：层数不超过倒数第二档', () => {
    const note = useNote()
    const past = new Date(Date.now() - 86400000).toISOString()
    note.knowledgeRings.value = [makeRing('n1', '笔记A', past, 0)]
    const srs = useReadingSrs()
    const updated = srs.review('n1', 'fuzzy')
    // INTERVALS.length-2 = 6，但 reviewCount=1 → idx=1，层数=1（弱于 know 的同档）
    expect(updated?.rings).toBe(1)
  })

  it('memoryCurve 按掌握度分布聚合', () => {
    const note = useNote()
    const future = new Date(Date.now() + 86400000).toISOString()
    note.knowledgeRings.value = [
      makeRing('a', 'A', future, 0),
      makeRing('b', 'B', future, 2),
      makeRing('c', 'C', future, 2),
    ]
    const srs = useReadingSrs()
    const curve = srs.memoryCurve.value
    expect(curve.find(p => p.level === 2)?.count).toBe(2)
    expect(curve.find(p => p.level === 0)?.count).toBe(1)
  })

  it('stats 统计待复习数量', () => {
    const note = useNote()
    const past = new Date(Date.now() - 86400000).toISOString()
    note.knowledgeRings.value = [makeRing('n1', 'A', past, 1)]
    const srs = useReadingSrs()
    expect(srs.stats.value.dueForReview).toBeGreaterThanOrEqual(1)
  })
})
