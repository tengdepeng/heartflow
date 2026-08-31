import { describe, it, expect } from 'vitest'
import type { DialogueEntry } from '../types'
import {
  portraitVocabulary,
  portraitCognitiveReport,
  portraitEvolution,
  portraitTrajectory,
  portraitInsights,
  buildPersonalityPortrait,
} from '../personality-portrait-analytics'

type Row = 'user' | 'mirror'
function mk(text: string, ts: number, role: Row = 'user'): DialogueEntry {
  return { id: `e_${ts}_${text.length}`, role, text, timestamp: ts } as DialogueEntry
}

const DAY = 86400000
const BASE = Date.UTC(2026, 7, 1)

/** 反思/成长/情感语料（拉高 reflectRatio 与相关维度） */
function reflective(ts: number, role: Row = 'user'): DialogueEntry[] {
  return [
    mk('今天我觉得很开心，经历了很多期待已久的事。', ts, role),
    mk('我总结了一下最近的成长，反思自己有哪些收获。', ts, role),
    mk('我想尝试一些新的，想象未来更有趣的方向。', ts, role),
  ]
}

describe('portraitVocabulary 常用词汇与句式', () => {
  it('空数据返回空词表与空句式', () => {
    const v = portraitVocabulary([])
    expect(v.words).toEqual([])
    expect(v.patterns).toEqual([])
  })

  it('能提取 2-gram 高频词并按词频降序', () => {
    const d = [...reflective(BASE)]
    const v = portraitVocabulary(d)
    expect(v.words.length).toBeGreaterThan(0)
    for (let i = 1; i < v.words.length; i++) {
      expect(v.words[i - 1].count).toBeGreaterThanOrEqual(v.words[i].count)
    }
    expect(v.patterns.some((p) => p.pattern === '我觉得…')).toBe(true)
  })

  it('尊重词表数量上限', () => {
    const d = [...reflective(BASE), ...reflective(BASE + DAY)]
    const v = portraitVocabulary(d, { wordLimit: 3 })
    expect(v.words.length).toBeLessThanOrEqual(3)
  })
})

describe('portraitCognitiveReport 自我认知报告', () => {
  it('空数据时返回等待引导与六维条目', () => {
    const r = portraitCognitiveReport([])
    expect(r.summary).toContain('等待第一道倒影')
    expect(r.dimensions).toHaveLength(6)
    const keys = r.dimensions.map((d) => d.key)
    expect(keys).toEqual(['strengths', 'growth_areas', 'patterns', 'blind_spots', 'potentials', 'needs'])
    expect(r.recommendations.length).toBeGreaterThan(0)
  })

  it('有反思语料时优势维度引用风格标签', () => {
    const d = [...reflective(BASE)]
    const r = portraitCognitiveReport(d)
    expect(r.summary).toContain('沟通者')
    const strengths = r.dimensions.find((x) => x.key === 'strengths')!
    expect(strengths.content).not.toHaveLength(0)
  })
})

describe('portraitEvolution 演化趋势', () => {
  it('空数据时 8 维全部走稳且置信偏低', () => {
    const e = portraitEvolution([])
    expect(e.styleChanges).toHaveLength(8)
    expect(e.styleChanges.every((c) => c.direction === 'stable')).toBe(true)
    expect(e.overallConfidence).toBeLessThanOrEqual(0.6)
    expect(e.possiblePaths.length).toBeGreaterThan(0)
  })

  it('后段更直接时 directness 呈上行', () => {
    const earlier = ['可能 也许 大概 或许', '好像 感觉 似乎 再说', '考虑一下 也许可以'].map((t, i) => mk(t, BASE + i * DAY))
    const later = ['我要 我决定 我就是 直接', '马上做 现在 我不 直接', '我决定 直接 现在'].map((t, i) =>
      mk(t, BASE + 20 * DAY + i * DAY),
    )
    const e = portraitEvolution([...earlier, ...later])
    const direct = e.styleChanges.find((c) => c.dimension === 'directness')!
    expect(direct.direction).toBe('increasing')
  })
})

describe('portraitTrajectory 成长轨迹', () => {
  it('用户条数不足 8 时返回 null', () => {
    const t = portraitTrajectory([mk('只聊聊', BASE), mk('再聊聊', BASE + DAY)])
    expect(t).toBeNull()
  })

  it('跨度足够时生成 ≥2 个节点并给出稳定性与变化量', () => {
    const d: DialogueEntry[] = []
    // 最早日期聚集 4 条，保证切片一有语料
    for (let i = 0; i < 4; i++) d.push(...reflective(BASE + i * 1000))
    // 后续连续 8 个不同日期各放一条，累计 11+ 条
    for (let k = 1; k < 9; k++) d.push(mk(`第 ${k} 天我感悟到一些东西，反思之后更笃定了。`, BASE + k * DAY + 5000))
    const t = portraitTrajectory(d)!
    expect(t).not.toBeNull()
    expect(t.sampleSize).toBe(d.length)
    expect(t.nodes.length).toBeGreaterThanOrEqual(2)
    expect(t.stabilityScore).toBeGreaterThanOrEqual(0)
    expect(t.stabilityScore).toBeLessThanOrEqual(1)
    expect(t.totalChange).toBeGreaterThanOrEqual(0)
  })
})

describe('portraitInsights 温和洞察', () => {
  it('空数据返回引导性洞察且不超过 3 条', () => {
    const ins = portraitInsights([])
    expect(ins.length).toBeGreaterThan(0)
    expect(ins.length).toBeLessThanOrEqual(3)
    expect(['positive', 'gentle', 'neutral']).toContain(ins[0].tone)
  })

  it('有充足数据时主导风格洞察优先', () => {
    const d = [...reflective(BASE)]
    const top = portraitInsights(d).find((i) => i.title.includes('主导风格'))
    expect(top).toBeTruthy()
  })
})

describe('buildPersonalityPortrait 聚合', () => {
  it('空库时概览归零、报告就绪、轨迹为 null', () => {
    const p = buildPersonalityPortrait([], new Date(BASE))
    expect(p.overview.userCount).toBe(0)
    expect(p.report.dimensions).toHaveLength(6)
    expect(p.trajectory).toBeNull()
    expect(p.evolution.styleChanges).toHaveLength(8)
    expect(p.insights.length).toBeGreaterThan(0)
  })

  it('有数据时若干区块联动渲染', () => {
    const d: DialogueEntry[] = []
    for (let i = 0; i < 4; i++) d.push(...reflective(BASE + i * 1000))
    for (let k = 1; k < 9; k++) d.push(mk(`第 ${k} 天我感悟到一些东西，反思之后更笃定了。`, BASE + k * DAY + 5000))
    const p = buildPersonalityPortrait(d, new Date(BASE + 30 * DAY))
    expect(p.overview.userCount).toBe(d.length)
    expect(p.growth).not.toBeNull()
    expect(p.vocabulary.words.length).toBeGreaterThan(0)
    expect(p.trajectory).not.toBeNull()
    expect(p.insights.length).toBeLessThanOrEqual(3)
  })
})