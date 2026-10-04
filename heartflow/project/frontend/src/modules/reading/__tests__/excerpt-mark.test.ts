// ============================================================
// 摘录多色标记引擎测试（INCR-477）
// 覆盖：调色板校验 / 默认色回落 / 不可变改色 / 分布统计 / 按色筛选
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  EXCERPT_MARK_COLORS,
  DEFAULT_EXCERPT_MARK,
  isExcerptMarkColor,
  excerptMarkColor,
  applyExcerptMark,
  markDistribution,
  filterExcerptsByMark,
} from '../excerpt-mark'
import type { Excerpt } from '../reading-content'

function ex(id: string, color?: string): Excerpt {
  return {
    id,
    source: '测试',
    text: `文本 ${id}`,
    note: '',
    createdAt: '2026-10-04T00:00:00.000Z',
    color,
  }
}

describe('调色板', () => {
  it('至少 4 色且均为合法 hex、id 唯一', () => {
    expect(EXCERPT_MARK_COLORS.length).toBeGreaterThanOrEqual(4)
    const ids = new Set(EXCERPT_MARK_COLORS.map(c => c.id))
    expect(ids.size).toBe(EXCERPT_MARK_COLORS.length)
    for (const c of EXCERPT_MARK_COLORS) {
      expect(c.value).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('默认色属于调色板', () => {
    expect(isExcerptMarkColor(DEFAULT_EXCERPT_MARK)).toBe(true)
  })
})

describe('isExcerptMarkColor', () => {
  it('调色板内为真，其余为假', () => {
    expect(isExcerptMarkColor(EXCERPT_MARK_COLORS[0].value)).toBe(true)
    expect(isExcerptMarkColor('#123456')).toBe(false)
    expect(isExcerptMarkColor(undefined)).toBe(false)
    expect(isExcerptMarkColor(null)).toBe(false)
  })
})

describe('excerptMarkColor', () => {
  it('已设合法色原样返回', () => {
    expect(excerptMarkColor(ex('a', EXCERPT_MARK_COLORS[2].value))).toBe(EXCERPT_MARK_COLORS[2].value)
  })

  it('未设或非法色回落默认色', () => {
    expect(excerptMarkColor(ex('a'))).toBe(DEFAULT_EXCERPT_MARK)
    expect(excerptMarkColor(ex('a', '#000000'))).toBe(DEFAULT_EXCERPT_MARK)
  })
})

describe('applyExcerptMark', () => {
  it('仅改目标项且不可变（原数组不被改写）', () => {
    const list = [ex('a'), ex('b')]
    const next = applyExcerptMark(list, 'a', EXCERPT_MARK_COLORS[1].value)
    expect(next).not.toBe(list)
    expect(next[0].color).toBe(EXCERPT_MARK_COLORS[1].value)
    expect(next[1].color).toBeUndefined()
    expect(list[0].color).toBeUndefined()
  })

  it('非法颜色原样返回同一引用', () => {
    const list = [ex('a')]
    expect(applyExcerptMark(list, 'a', '#000000')).toBe(list)
  })

  it('目标 id 不存在时内容不变', () => {
    const list = [ex('a')]
    const next = applyExcerptMark(list, 'zzz', EXCERPT_MARK_COLORS[0].value)
    expect(next).toEqual(list)
  })
})

describe('markDistribution', () => {
  it('按有效色统计，未设色计入默认色', () => {
    const amber = DEFAULT_EXCERPT_MARK
    const sage = EXCERPT_MARK_COLORS[1].value
    const dist = markDistribution([ex('a'), ex('b', amber), ex('c', sage)])
    const map = Object.fromEntries(dist.map(d => [d.color.value, d.count]))
    expect(map[amber]).toBe(2)
    expect(map[sage]).toBe(1)
    expect(dist).toHaveLength(EXCERPT_MARK_COLORS.length)
  })
})

describe('filterExcerptsByMark', () => {
  it('无色返回全部', () => {
    const list = [ex('a'), ex('b')]
    expect(filterExcerptsByMark(list)).toBe(list)
    expect(filterExcerptsByMark(list, '')).toBe(list)
  })

  it('按色筛选命中有效色', () => {
    const sage = EXCERPT_MARK_COLORS[1].value
    const list = [ex('a'), ex('b', sage), ex('c', sage)]
    const got = filterExcerptsByMark(list, sage)
    expect(got.map(e => e.id)).toEqual(['b', 'c'])
  })
})
