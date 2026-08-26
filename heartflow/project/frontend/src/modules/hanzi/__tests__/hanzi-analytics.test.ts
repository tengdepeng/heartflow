// ============================================================
// 汉字档案引擎测试（hanzi-analytics）
// ============================================================
import { describe, expect, it } from 'vitest'
import { HANZI_DATA, type HanziEntry } from '../hanzi-data'
import {
  hanziOverview,
  radicalDistribution,
  strokeDistribution,
  structureDistribution,
  hanziInsights,
  extractChars,
  toHanziEntries,
  vocabularyProfile,
} from '../hanzi-analytics'

function mk(char: string, strokes: number, radical: string, structure = '象形', initial = 'x', meaning = '字', words: string[] = []): HanziEntry {
  return {
    char, pinyin: `${char} x`, noTone: 'x', initial, radical, radicalStrokes: 3,
    strokes, structure, meaning, words,
  }
}

describe('extractChars', () => {
  it('提取去重后的汉字', () => {
    expect(extractChars('你好，世界。你好')).toEqual(expect.arrayContaining(['你', '好', '世', '界']))
    const unique = new Set(extractChars('花花果果果'))
    expect(unique.size).toBeLessThanOrEqual(3)
    expect(unique.has('花')).toBe(true)
  })
  it('跳过非汉字', () => {
    expect(extractChars('abc 123！')).toEqual([])
  })
})

describe('toHanziEntries', () => {
  it('合并库字与个人字，个人字标注未收录', () => {
    const db = [mk('心', 4, '心')]
    const all = toHanziEntries({ list: db, personalChars: ['心', '新', '奇'] })
    expect(all).toHaveLength(3)
    const xin = all.find((e) => e.char === '新')!
    expect(xin.radical).toBe('未收录')
    expect(xin.strokes).toBe(0)
    // 已收录的个人字不重复添加
    const heart = all.filter((e) => e.char === '心')
    expect(heart).toHaveLength(1)
  })
  it('无个人字时仅库字', () => {
    expect(toHanziEntries({ list: HANZI_DATA, personalChars: [] })).toHaveLength(HANZI_DATA.length)
  })
})

describe('hanziOverview', () => {
  it('统计总数/部首/平均笔画', () => {
    const ov = hanziOverview([mk('日', 4, '日'), mk('明', 8, '日'), mk('河', 8, '氵')])
    expect(ov.total).toBe(3)
    expect(ov.radicalCount).toBe(2)
    expect(ov.avgStrokes).toBeCloseTo(6.7, 1)
    expect(ov.topRadical).toBe('日')
  })
  it('empty 集合给出零值', () => {
    const ov = hanziOverview([])
    expect(ov.total).toBe(0)
    expect(ov.radicalCount).toBe(0)
    expect(ov.avgStrokes).toBe(0)
    expect(ov.mostStroked).toEqual([])
  })
  it('极多/极少笔画字', () => {
    const ov = hanziOverview([mk('一', 1, '一'), mk('人', 2, '人'), mk('龘', 48, '龙')])
    expect(ov.mostStroked[0]).toBe('龘')
    expect(ov.leastStroked[0]).toBe('一')
  })
  it('顶部声母（零声母归类）', () => {
    const ov = hanziOverview([mk('安', 6, '宀', '会意', ''), mk('爱', 10, '爫', '会意', ''), mk('心', 4, '心', '象形', 'x')])
    expect(ov.topInitial).toBe('零声母')
  })
})

describe('radicalDistribution', () => {
  it('按部件计数排序并截断', () => {
    const rows = radicalDistribution([mk('日', 4, '日'), mk('明', 8, '日'), mk('河', 8, '氵'), mk('湖', 12, '氵'), mk('木', 4, '木')], 2)
    expect(rows.map((r) => r.initial)).toEqual(['日', '氵'])
    expect(rows[0].count).toBe(2)
  })
  it('跳过无部首项', () => {
    const rows = radicalDistribution([mk('未', 0, '未收录', '未知', 'w')])
    expect(rows).toEqual([])
  })
})

describe('strokeDistribution', () => {
  it('按笔画分桶', () => {
    const buckets = strokeDistribution([mk('一', 1, '一'), mk('日', 4, '日'), mk('河', 8, '氵'), mk('湖', 12, '氵')])
    const lo = buckets.find((b) => b.label.startsWith('1-5'))
    const mid = buckets.find((b) => b.label.startsWith('6-10'))
    expect(lo?.count).toBe(2)
    expect(mid?.count).toBe(1)
  })
})

describe('structureDistribution', () => {
  it('按构字法分组计算占比', () => {
    const rows = structureDistribution([mk('日', 4, '日', '象形'), mk('明', 8, '日', '会意'), mk('河', 8, '氵', '形声'), mk('湖', 12, '氵', '形声')])
    const xing = rows.find((r) => r.structure === '形声')
    expect(xing?.count).toBe(2)
    expect(xing?.pct).toBe(50)
  })
})

describe('vocabularyProfile', () => {
  it('统计个人文本命中库字的数量与去重字符', () => {
    const db = [mk('心', 4, '心'), mk('河', 8, '氵')]
    const p = vocabularyProfile(db, '心河山心')
    // extractChars 去重后为：心、河、山
    expect(p.chars.length).toBe(3)
    expect(p.chars).toEqual(expect.arrayContaining(['心', '河', '山']))
    expect(p.matched).toBe(2) // 心、河 命中
  })
})

describe('hanziInsights', () => {
  it('空集给出引导语', () => {
    const ins = hanziInsights([], 10)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins.some((s) => s.includes('收录'))).toBe(true)
  })
  it('多字时给出概览洞察', () => {
    const db = [mk('一', 1, '一'), mk('人', 2, '人'), mk('日', 4, '日'), mk('木', 4, '木'), mk('河', 8, '氵'), mk('明', 8, '日')]
    const ins = hanziInsights(db, 10)
    expect(ins.some((s) => s.includes('覆盖'))).toBe(true)
    expect(ins.some((s) => s.includes('部首'))).toBe(true)
  })
  it('limit 截断生效', () => {
    const db = [mk('一', 1, '一'), mk('人', 2, '人'), mk('日', 4, '日'), mk('河', 8, '氵')]
    const all = hanziInsights(db, 10)
    const cut = hanziInsights(db, 2)
    expect(all.length).toBeGreaterThan(2)
    expect(cut.length).toBe(2)
  })
})