// ============================================================
// 字镜阁 · 字镜档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import type { WordItem } from '../word-mirror-store'
import type { HItem } from '../word-mirror-store'
import {
  wordMirrorOverview,
  wordProficiencyRows,
  wordStatusRows,
  wordMirrorRhythm,
  wordRecentlyPracticed,
  wordMirrorHealth,
  wordMirrorInsights,
} from '../word-mirror-analytics'

const NOW = 1760000000000
const DAY = 24 * 60 * 60 * 1000

function makeWord(partial: Partial<WordItem> & { word: string }): WordItem {
  return {
    id: partial.id || `w${Math.random()}`,
    word: partial.word,
    definition: partial.definition || '释义占位',
    proficiency: partial.proficiency ?? 3,
    favorite: partial.favorite ?? false,
    createdAt: partial.createdAt || new Date().toISOString(),
    lastReviewedAt: partial.lastReviewedAt,
  }
}

function makeHistory(partial: Partial<HItem> & { at: string }): HItem {
  return {
    id: partial.id || `h${Math.random()}`,
    text: partial.text || '这是一段用于分析的文字',
    topWords: partial.topWords || [],
    mood: partial.mood || '平静',
    at: partial.at,
  }
}

describe('wordMirrorOverview', () => {
  it('空输入时各项归零且无信息', () => {
    const ov = wordMirrorOverview([], [], new Date(NOW))
    expect(ov.total).toBe(0)
    expect(ov.mastered).toBe(0)
    expect(ov.favorites).toBe(0)
    expect(ov.staleCount).toBe(0)
    expect(ov.avgProficiency).toBe(0)
    expect(ov.reviewedOnce).toBe(0)
    expect(ov.reviewed7).toBe(0)
    expect(ov.totalAnalyses).toBe(0)
    expect(ov.analyses30).toBe(0)
    expect(ov.latestAnalysisDate).toBeNull()
  })

  it('统计精通 / 收藏 / 生疏 / 平均熟练度与复习词', () => {
    const words = [
      makeWord({ word: '澄明', proficiency: 5, favorite: true, lastReviewedAt: new Date(NOW - 2 * DAY).toISOString() }),
      makeWord({ word: '余温', proficiency: 4, lastReviewedAt: new Date(NOW - 2 * DAY).toISOString() }),
      makeWord({ word: '蒙尘', proficiency: 1, createdAt: new Date(NOW - 60 * DAY).toISOString() }),
    ]
    const ov = wordMirrorOverview(words, [], new Date(NOW))
    expect(ov.total).toBe(3)
    expect(ov.mastered).toBe(2)
    expect(ov.favorites).toBe(1)
    expect(ov.staleCount).toBe(1)
    expect(ov.avgProficiency).toBeGreaterThan(3)
    expect(ov.reviewedOnce).toBe(2)
    expect(ov.reviewed7).toBe(2)
  })

  it('近 30 天分析计数', () => {
    const history = [
      makeHistory({ at: new Date(NOW).toISOString() }),
      makeHistory({ at: new Date(NOW - 50 * DAY).toISOString() }),
    ]
    const ov = wordMirrorOverview([], history, new Date(NOW))
    expect(ov.totalAnalyses).toBe(2)
    expect(ov.analyses30).toBe(1)
    expect(ov.latestAnalysisDate).toBe(history[0].at)
  })
})

describe('wordProficiencyRows', () => {
  it('按熟练度 1-5 分布', () => {
    const words = [
      makeWord({ word: 'a', proficiency: 5 }),
      makeWord({ word: 'b', proficiency: 3 }),
      makeWord({ word: 'c', proficiency: 3 }),
    ]
    const rows = wordProficiencyRows(words)
    expect(rows.every((r) => r.count > 0)).toBe(true)
    const lv3 = rows.find((r) => r.key === '3')
    expect(lv3?.count).toBe(2)
    expect(lv3?.pct).toBe(67)
  })
})

describe('wordStatusRows', () => {
  it('分为精通 / 学习中 / 待复习', () => {
    const words = [
      makeWord({ word: 'a', proficiency: 5 }),
      makeWord({ word: 'b', proficiency: 2 }),
      makeWord({ word: 'c', proficiency: 1, createdAt: new Date(NOW - 60 * DAY).toISOString() }),
    ]
    const rows = wordStatusRows(words, new Date(NOW))
    const mastered = rows.find((r) => r.key === 'mastered')
    const learning = rows.find((r) => r.key === 'learning')
    const stale = rows.find((r) => r.key === 'stale')
    expect(mastered?.count).toBe(1)
    expect(learning?.count).toBe(1)
    expect(stale?.count).toBe(1)
  })
})

describe('wordMirrorRhythm', () => {
  it('统计近 7/30 天复习与覆盖占比', () => {
    const words = [
      makeWord({ word: 'a', lastReviewedAt: new Date(NOW).toISOString() }),
      makeWord({ word: 'b', lastReviewedAt: new Date(NOW - 2 * DAY).toISOString() }),
      makeWord({ word: 'c' }),
    ]
    const r = wordMirrorRhythm(words, new Date(NOW))
    expect(r.reviewed7).toBe(2)
    expect(r.reviewed30).toBe(2)
    expect(r.reviewCoverage).toBe(67)
    expect(r.staleCount).toBeGreaterThanOrEqual(0)
  })

  it('reviewCoverage 反映复习过一次的词占比', () => {
    const words = [
      makeWord({ word: 'a', lastReviewedAt: new Date(NOW - 60 * DAY).toISOString() }),
      makeWord({ word: 'b' }),
      makeWord({ word: 'c' }),
    ]
    const r = wordMirrorRhythm(words, new Date(NOW))
    expect(r.reviewCoverage).toBe(33)
  })
})

describe('wordRecentlyPracticed', () => {
  it('按最近复习日期取 top N（近期优先）', () => {
    const words = [
      makeWord({ word: 'old', lastReviewedAt: new Date(NOW - 10 * DAY).toISOString() }),
      makeWord({ word: 'new', lastReviewedAt: new Date(NOW - 1 * DAY).toISOString() }),
      makeWord({ word: 'mid', lastReviewedAt: new Date(NOW - 5 * DAY).toISOString() }),
    ]
    const top = wordRecentlyPracticed(words, 2)
    expect(top[0].word).toBe('new')
    expect(top.length).toBe(2)
  })
})

describe('wordMirrorHealth', () => {
  it('空输入得分归零且标签存在', () => {
    const h = wordMirrorHealth([], [], new Date(NOW))
    expect(h.score).toBe(0)
    expect(h.breadth).toBe(0)
    expect(h.depth).toBe(0)
    expect(h.continuity).toBe(0)
    expect(h.label).toBeTruthy()
  })

  it('丰富词库的健康度高于空疏词库', () => {
    const sparse = [makeWord({ word: '独', proficiency: 1 })]
    const rich = [
      makeWord({ word: '澄明', proficiency: 5, favorite: true, lastReviewedAt: new Date(NOW).toISOString() }),
      makeWord({ word: '余温', proficiency: 4, lastReviewedAt: new Date(NOW - 2 * DAY).toISOString() }),
      makeWord({ word: '蒙尘', proficiency: 2, lastReviewedAt: new Date(NOW - 5 * DAY).toISOString() }),
    ]
    const hSparse = wordMirrorHealth(sparse, [], new Date(NOW))
    const hRich = wordMirrorHealth(rich, [], new Date(NOW))
    expect(hRich.score).toBeGreaterThan(hSparse.score)
  })
})

describe('wordMirrorInsights', () => {
  it('空输入给出引导性建议', () => {
    const ins = wordMirrorInsights([], [], new Date(NOW))
    expect(ins.length).toBeGreaterThan(0)
    expect(ins[0]).toContain('字镜')
  })

  it('有限条且随词汇增加而变化', () => {
    const words = [
      makeWord({ word: 'a', proficiency: 5 }),
      makeWord({ word: 'b', proficiency: 2 }),
    ]
    const history = [makeHistory({ at: new Date(NOW - 40 * DAY).toISOString() })]
    const ins = wordMirrorInsights(words, history, new Date(NOW), 4)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins.length).toBeLessThanOrEqual(4)
  })
})