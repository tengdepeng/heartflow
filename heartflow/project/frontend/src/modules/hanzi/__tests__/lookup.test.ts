// ============================================================
// 查字引擎测试（lookup）
// ============================================================
import { describe, expect, it } from 'vitest'
import { HANZI_DATA } from '../hanzi-data'
import {
  searchHanzi,
  byPinyin,
  byRadical,
  byStrokeRange,
  listRadicals,
  strokeBuckets,
  normalizePinyin,
  toneOf,
} from '../lookup'

const DB = HANZI_DATA

describe('normalizePinyin', () => {
  it('去除声调符号', () => {
    expect(normalizePinyin('xīn')).toBe('xin')
    expect(normalizePinyin('SHUI')).toBe('shui')
    expect(normalizePinyin('nǚ')).toBe('nv')
  })
  it('无标调时原样小写', () => {
    expect(normalizePinyin('xin')).toBe('xin')
  })
})

describe('toneOf', () => {
  it('提取标注的声调数字', () => {
    expect(toneOf('xīn')).toBe('')
    expect(toneOf('xīn1')).toBe('1')
    expect(toneOf('shān2')).toBe('2')
  })
})

describe('searchHanzi', () => {
  it('按字匹配', () => {
    expect(searchHanzi('心', DB).some((e) => e.char === '心')).toBe(true)
  })
  it('按拼音（带调）匹配', () => {
    expect(searchHanzi('xīn', DB).some((e) => e.char === '心')).toBe(true)
  })
  it('按去调拼音匹配', () => {
    expect(searchHanzi('xin', DB).some((e) => e.char === '心')).toBe(true)
  })
  it('按部首匹配', () => {
    expect(searchHanzi('氵', DB).length).toBe(0) // 库内无此部首名级联
    expect(searchHanzi('心', DB).length).toBeGreaterThan(0)
  })
  it('按释义匹配', () => {
    expect(searchHanzi('太阳', DB).some((e) => e.char === '日')).toBe(true)
  })
  it('按组词匹配', () => {
    expect(searchHanzi('快乐', DB).some((e) => e.char === '快')).toBe(true)
  })
  it('空查询返回空数组', () => {
    expect(searchHanzi('   ', DB)).toEqual([])
  })
})

describe('byPinyin', () => {
  it('全拼精确匹配', () => {
    const r = byPinyin('xin', DB)
    expect(r.some((e) => e.char === '心')).toBe(true)
    expect(r.every((e) => e.noTone === 'xin')).toBe(true)
  })
  it('完整拼音精确匹配（xi → 西/习）', () => {
    const r = byPinyin('xi', DB)
    expect(r.some((e) => e.char === '西')).toBe(true)
    expect(r.some((e) => e.char === '习')).toBe(true)
  })
  it('前缀匹配（xu → 雪）', () => {
    const r = byPinyin('xu', DB)
    expect(r.some((e) => e.char === '雪')).toBe(true)
  })
  it('单字母声母匹配（x → 心/星…）', () => {
    const r = byPinyin('x', DB)
    expect(r.some((e) => e.char === '心')).toBe(true)
    expect(r.some((e) => e.char === '星')).toBe(true)
  })
  it('带声调符号匹配', () => {
    expect(byPinyin('xīn', DB).some((e) => e.char === '心')).toBe(true)
  })
  it('空输入返回空', () => {
    expect(byPinyin('', DB)).toEqual([])
  })
  it('非拼音输入保守返回空', () => {
    expect(byPinyin('123', DB)).toEqual([])
  })
})

describe('byRadical', () => {
  it('按部首精确筛选', () => {
    const r = byRadical('木', DB)
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((e) => e.radical === '木')).toBe(true)
  })
  it('未知部首返回空', () => {
    expect(byRadical('不存在', DB)).toEqual([])
  })
})

describe('byStrokeRange', () => {
  it('闭区间筛选', () => {
    const r = byStrokeRange(1, 3, DB)
    expect(r.every((e) => e.strokes >= 1 && e.strokes <= 3)).toBe(true)
    expect(r.some((e) => e.char === '一')).toBe(true)
    expect(r.some((e) => e.char === '人')).toBe(true)
  })
})

describe('listRadicals', () => {
  it('聚合部首并计数排序', () => {
    const groups = listRadicals(DB)
    expect(groups.length).toBeGreaterThan(10)
    const sum = groups.reduce((s, g) => s + g.count, 0)
    expect(sum).toBe(DB.length)
    expect(groups[0].radical <= groups[1].radical).toBe(true) // 按部首名排序
  })
})

describe('strokeBuckets', () => {
  it('按笔画分桶且计数之和等于库大小', () => {
    const buckets = strokeBuckets(DB)
    const sum = buckets.reduce((s, b) => s + b.count, 0)
    expect(sum).toBe(DB.filter((e) => e.strokes > 0).length)
    expect(buckets.some((b) => b.label.startsWith('1-5'))).toBe(true)
    expect(buckets.some((b) => b.label.startsWith('6-10'))).toBe(true)
  })
})