// ============================================================
// 古籍竖排阅读引擎 · 测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  splitVertical,
  buildVerticalLayout,
  textForMode,
  stripPunctuationAndSpace,
  organizeAnnotations,
  splitChunksVertical,
} from '../classical-vertical'
import type { ClassicalAnnotation } from '../classical-vertical'

describe('stripPunctuationAndSpace', () => {
  it('去除全部标点与空白', () => {
    expect(stripPunctuationAndSpace('山海经。南山经，第一！')).toBe('山海经南山经第一')
    expect(stripPunctuationAndSpace('有兽焉 其状如禺')).toBe('有兽焉其状如禺')
  })
})

describe('textForMode', () => {
  const book = {
    originalText: '北冥有鱼。其名为鲲。',
    modernText: '北冥有鱼，其名为鲲。',
  }

  it('original 返回原文', () => {
    expect(textForMode(book, 'original')).toBe('北冥有鱼。其名为鲲。')
  })

  it('modern 返回现代标点文本', () => {
    expect(textForMode(book, 'modern')).toBe('北冥有鱼，其名为鲲。')
  })

  it('modern 无 modernText 时回退原文', () => {
    expect(textForMode({ originalText: '赤水之东。', modernText: '' }, 'modern')).toBe('赤水之东。')
  })

  it('none 去除全部标点', () => {
    expect(textForMode(book, 'none')).toBe('北冥有鱼其名为鲲')
  })
})

describe('splitVertical', () => {
  it('单段文本按行数切分为多栏', () => {
    const cols = splitVertical('一二三四五六', 2)
    // 自右向左：栏0 含前2字，栏1 含次2字，栏2 含末2字
    expect(cols.length).toBe(3)
    expect(cols[0].lines.join('')).toBe('一二')
    expect(cols[1].lines.join('')).toBe('三四')
    expect(cols[2].lines.join('')).toBe('五六')
  })

  it('不足一栏时仅一栏', () => {
    const cols = splitVertical('hello', 10)
    expect(cols.length).toBe(1)
    expect(cols[0].lines.join('')).toBe('hello')
  })

  it('栏号从右至左递增', () => {
    const cols = splitVertical('abcdef', 2)
    cols.forEach((c, i) => expect(c.index).toBe(i))
  })

  it('段落间留空行分隔', () => {
    const cols = splitVertical('甲\n乙', 4)
    const lines = cols[0].lines
    expect(lines.join('')).toBe('甲乙') // 空行位于段间
    // 检查空行占位存在
    expect(lines.some(l => l === '')).toBe(true)
  })

  it('长文本跨栏不丢字', () => {
    const text = '金石录三十卷目录十卷成书目十卷' // 16 字
    const cols = splitVertical(text, 6)
    const reflowed = cols.map(c => c.lines.join('')).join('')
    expect(reflowed).toBe(text)
  })
})

describe('buildVerticalLayout', () => {
  const book = { originalText: '南山经之首曰鹊山。', modernText: '南山经之首，曰鹊山。' }

  it('返回栏数、行数与标点模式', () => {
    const layout = buildVerticalLayout(book, 4, 'original')
    expect(layout.columnCount).toBe(layout.columns.length)
    expect(layout.linesPerColumn).toBe(4)
    expect(layout.punctuationMode).toBe('original')
  })

  it('none 模式切分后不含标点', () => {
    const layout = buildVerticalLayout(book, 4, 'none')
    const reflowed = layout.columns.map(c => c.lines.join('')).join('')
    expect(reflowed).not.toContain('。')
    expect(reflowed).not.toContain('，')
  })

  it('linesPerColumn 小于 1 时回退为 1', () => {
    expect(buildVerticalLayout(book, 0).linesPerColumn).toBe(1)
  })
})

describe('splitChunksVertical', () => {
  it('分段拼接切分并返回各段独立栏', () => {
    const { columns, bySection } = splitChunksVertical(['甲乙', '丙丁'], 2)
    expect(columns.length).toBeGreaterThanOrEqual(2)
    expect(bySection.length).toBe(2)
    expect(bySection[0][0].lines.join('')).toBe('甲乙')
    expect(bySection[1][0].lines.join('')).toBe('丙丁')
  })
})

describe('organizeAnnotations', () => {
  const make = (annotator: string, dynasty: string): ClassicalAnnotation => ({
    id: annotator,
    annotator,
    dynasty,
    content: `${annotator}注`,
  })

  it('按朝代先后分层组织', () => {
    const groups = organizeAnnotations([
      make('朱熹', '宋'),
      make('郭璞', '晋'),
      make('沈括', '宋'),
    ])
    expect(groups.map(g => g.dynasty)).toEqual(['晋', '宋'])
    expect(groups[1].items.map(a => a.annotator)).toEqual(['朱熹', '沈括'])
  })

  it('保留同朝代的原有顺序', () => {
    const groups = organizeAnnotations([
      make('甲', '唐'),
      make('乙', '唐'),
      make('丙', '唐'),
    ])
    expect(groups[0].items.map(a => a.annotator)).toEqual(['甲', '乙', '丙'])
  })

  it('未知朝代排在已知朝代之后', () => {
    const groups = organizeAnnotations([
      make('今人', '当代'),
      make('某人', '未知朝'),
    ])
    expect(groups[groups.length - 1].dynasty).toBe('未知朝')
  })
})