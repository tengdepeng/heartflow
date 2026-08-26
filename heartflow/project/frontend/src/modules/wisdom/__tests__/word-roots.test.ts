// ============================================================
// 词根词缀拆解引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { decomposeWord, lookupPart, wordRootInsights } from '../word-roots'

describe('decomposeWord 拆解', () => {
  it('空串返回空结果', () => {
    const d = decomposeWord('')
    expect(d.matched).toBe(false)
    expect(d.parts).toEqual([])
  })

  it('前缀 + 词根 + 后缀', () => {
    const d = decomposeWord('unhappy')
    // un- 前缀 + happy（happy 不在词根表，作为未识别）
    expect(d.parts.some(p => p.text === 'un' && p.type === 'prefix')).toBe(true)
  })

  it('识别常见词根', () => {
    const d = decomposeWord('transport')
    // trans- 前缀 + port 词根
    expect(d.parts.some(p => p.text === 'trans' && p.type === 'prefix')).toBe(true)
    expect(d.parts.some(p => p.text === 'port' && p.type === 'root' && p.meaning === '搬运，港口')).toBe(true)
  })

  it('识别后缀', () => {
    const d = decomposeWord('action')
    // act 不在词根表，但 -tion 是后缀
    expect(d.parts.some(p => p.text === 'tion' && p.type === 'suffix')).toBe(true)
  })

  it('词根 + 后缀', () => {
    const d = decomposeWord('visible')
    // vis 词根 + ible 后缀
    expect(d.parts.some(p => p.text === 'vis' && p.type === 'root')).toBe(true)
    expect(d.parts.some(p => p.text === 'ible' && p.type === 'suffix')).toBe(true)
  })

  it('大小写归一化', () => {
    const d = decomposeWord('Transport')
    expect(d.word).toBe('transport')
    expect(d.parts.some(p => p.text === 'trans')).toBe(true)
  })

  it('未匹配单词 matched=false', () => {
    const d = decomposeWord('xyzabc')
    expect(d.matched).toBe(false)
  })
})

describe('lookupPart 查部件', () => {
  it('查到前缀', () => {
    expect(lookupPart('un-')?.meaning).toContain('不')
  })
  it('查到词根', () => {
    expect(lookupPart('geo')?.meaning).toContain('地球')
  })
  it('查到后缀', () => {
    expect(lookupPart('less')?.meaning).toContain('没有')
  })
  it('未知部件返回 null', () => {
    expect(lookupPart('zzz')).toBeNull()
  })
})

describe('wordRootInsights 洞察', () => {
  it('未匹配给出提示', () => {
    const insights = wordRootInsights('zzz')
    expect(insights[0]).toContain('没拆出')
  })

  it('给出构词说明', () => {
    const insights = wordRootInsights('transport')
    expect(insights.some(s => s.includes('trans'))).toBe(true)
    expect(insights.some(s => s.includes('port'))).toBe(true)
  })

  it('尊重 limit 截断', () => {
    expect(wordRootInsights('transport', 1).length).toBe(1)
  })
})
