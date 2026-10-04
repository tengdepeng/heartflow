// ============================================================
// annotation-layer 引擎测试（INCR-523 划线/想法按段聚合）
// 覆盖：段-摘录匹配 · 聚合 · 标记色映射 · 热门排序 · 统计 · Markdown 导出
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Excerpt } from '../reading-content'
import {
  matchExcerptParagraph,
  buildAnnotationLayer,
  annotationMarkMap,
  popularParagraphs,
  annotationStats,
  buildAnnotationsMarkdown,
} from '../annotation-layer'

function ex(partial: Partial<Excerpt> & { text: string }): Excerpt {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    source: partial.source ?? '测试书',
    text: partial.text,
    note: partial.note ?? '',
    createdAt: partial.createdAt ?? '2026-10-05T00:00:00.000Z',
    color: partial.color,
  }
}

describe('matchExcerptParagraph', () => {
  it('段落包含摘录文本即命中', () => {
    expect(matchExcerptParagraph(ex({ text: '活着' }), '人是为了活着本身而活着。')).toBe(true)
  })

  it('摘录包含段落文本亦命中（长摘录覆盖短段）', () => {
    expect(matchExcerptParagraph(ex({ text: '人是为了活着本身而活着。' }), '活着')).toBe(true)
  })

  it('无交集不命中', () => {
    expect(matchExcerptParagraph(ex({ text: '星空' }), '人是为了活着本身而活着。')).toBe(false)
  })

  it('空文本不命中', () => {
    expect(matchExcerptParagraph(ex({ text: '   ' }), '正文')).toBe(false)
    expect(matchExcerptParagraph(ex({ text: '正文' }), '  ')).toBe(false)
  })
})

describe('buildAnnotationLayer', () => {
  const paragraphs = ['第一段正文，谈活着。', '第二段正文，谈时间。', '第三段正文，谈星空。']

  it('按段聚合划线，并区分想法（带批注的摘录）', () => {
    const excerpts = [
      ex({ id: 'a', text: '活着', note: '活着本身即是意义' }),
      ex({ id: 'b', text: '谈时间' }),
      ex({ id: 'c', text: '第一段正文', color: '#9bb08a' }),
    ]
    const layer = buildAnnotationLayer(excerpts, paragraphs)
    expect(layer.size).toBe(2)
    const first = layer.get(0)!
    expect(first.index).toBe(0)
    expect(first.highlights.map((e) => e.id).sort()).toEqual(['a', 'c'])
    expect(first.thoughts.map((e) => e.id)).toEqual(['a'])
    expect(first.count).toBe(2)
    const second = layer.get(1)!
    expect(second.highlights.map((e) => e.id)).toEqual(['b'])
    expect(second.thoughts).toHaveLength(0)
  })

  it('无命中段落不入表；空输入返回空表', () => {
    expect(buildAnnotationLayer([ex({ text: '不存在的句子' })], paragraphs).size).toBe(0)
    expect(buildAnnotationLayer([], paragraphs).size).toBe(0)
    expect(buildAnnotationLayer([ex({ text: '活着' })], []).size).toBe(0)
  })

  it('空白批注不计为想法', () => {
    const layer = buildAnnotationLayer([ex({ text: '活着', note: '   ' })], paragraphs)
    expect(layer.get(0)!.thoughts).toHaveLength(0)
    expect(layer.get(0)!.highlights).toHaveLength(1)
  })
})

describe('annotationMarkMap', () => {
  it('段落下标映射标记色，同段多条取首条色', () => {
    const layer = buildAnnotationLayer(
      [ex({ id: 'a', text: '活着', color: '#9bb08a' }), ex({ id: 'b', text: '第一段正文', color: '#8aa9c9' })],
      ['第一段正文，谈活着。'],
    )
    const map = annotationMarkMap(layer)
    expect(map.get(0)).toBe('#9bb08a')
  })

  it('未设色时回落默认琥珀色', () => {
    const layer = buildAnnotationLayer([ex({ text: '活着' })], ['第一段正文，谈活着。'])
    expect(annotationMarkMap(layer).get(0)).toBe('#e8c07a')
  })
})

describe('popularParagraphs', () => {
  const paragraphs = ['甲段。', '乙段。', '丙段。']
  const excerpts = [
    ex({ text: '甲段' }),
    ex({ text: '乙段' }),
    ex({ text: '乙段' }),
    ex({ text: '丙段' }),
    ex({ text: '丙段' }),
    ex({ text: '丙段' }),
  ]

  it('按划线条数降序、同数按段序升序', () => {
    const layer = buildAnnotationLayer(excerpts, paragraphs)
    const ranked = popularParagraphs(layer)
    expect(ranked.map((a) => a.index)).toEqual([2, 1, 0])
  })

  it('topN 截断；topN=0 返回空', () => {
    const layer = buildAnnotationLayer(excerpts, paragraphs)
    expect(popularParagraphs(layer, 2).map((a) => a.index)).toEqual([2, 1])
    expect(popularParagraphs(layer, 0)).toHaveLength(0)
  })
})

describe('annotationStats', () => {
  it('汇总划线 / 想法 / 覆盖段落数', () => {
    const layer = buildAnnotationLayer(
      [ex({ text: '甲段', note: '想法一' }), ex({ text: '乙段' }), ex({ text: '丙段', note: '想法二' })],
      ['甲段。', '乙段。', '丙段。'],
    )
    expect(annotationStats(layer)).toEqual({ paragraphs: 3, highlights: 3, thoughts: 2 })
  })

  it('空表统计为全 0', () => {
    expect(annotationStats(new Map())).toEqual({ paragraphs: 0, highlights: 0, thoughts: 0 })
  })
})

describe('buildAnnotationsMarkdown', () => {
  it('按段输出划线引用与想法批注', () => {
    const layer = buildAnnotationLayer(
      [ex({ text: '活着', note: '活着本身即是意义' }), ex({ text: '谈时间' })],
      ['第一段正文，谈活着。', '第二段正文，谈时间。'],
    )
    const md = buildAnnotationsMarkdown(layer)
    expect(md).toContain('# 心流工坊 · 划线与想法')
    expect(md).toContain('划线 2 条 · 想法 1 条 · 覆盖 2 段')
    expect(md).toContain('## 第 1 段')
    expect(md).toContain('> 活着')
    expect(md).toContain('**想法：** 活着本身即是意义')
    expect(md).toContain('## 第 2 段')
    expect(md).toContain('> 谈时间')
  })

  it('自定义标题；空层输出占位', () => {
    const md = buildAnnotationsMarkdown(new Map(), { title: '我的划线' })
    expect(md).toContain('# 我的划线')
    expect(md).toContain('_暂无划线或想法。_')
  })
})
