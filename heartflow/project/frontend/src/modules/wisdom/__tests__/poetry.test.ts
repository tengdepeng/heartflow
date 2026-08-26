// ============================================================
// 诗词卡片引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  POEMS,
  listPoems,
  poemById,
  searchPoems,
  poemsByDynasty,
  poemsByTag,
  dynasties,
  tags,
  poemOfTheDay,
  randomPoem,
  usePoetryFavorites,
  poetryInsights,
} from '../poetry'

describe('诗词数据', () => {
  it('收录 20+ 首历代诗词', () => {
    expect(POEMS.length).toBeGreaterThanOrEqual(20)
  })

  it('每首均有篇名/作者/朝代/体裁/正文/题材', () => {
    for (const p of POEMS) {
      expect(p.title).toBeTruthy()
      expect(p.author).toBeTruthy()
      expect(p.dynasty).toBeTruthy()
      expect(p.form).toBeTruthy()
      expect(p.lines.length).toBeGreaterThan(0)
      expect(p.tags.length).toBeGreaterThan(0)
    }
  })

  it('诗词 id 唯一', () => {
    const ids = POEMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('覆盖多个朝代与体裁', () => {
    expect(dynasties()).toEqual(expect.arrayContaining(['唐', '宋', '先秦', '汉']))
    expect(POEMS.some((p) => p.form === '词')).toBe(true)
    expect(POEMS.some((p) => p.form === '诗经')).toBe(true)
  })

  it('listPoems 返回全部，poemById 按 id 查找', () => {
    expect(listPoems()).toHaveLength(POEMS.length)
    expect(poemById('p01')?.title).toBe('静夜思')
    expect(poemById('nope')).toBeUndefined()
  })
})

describe('诗词检索', () => {
  it('按篇名检索', () => {
    expect(searchPoems('静夜思').some((p) => p.id === 'p01')).toBe(true)
  })

  it('按作者检索', () => {
    expect(searchPoems('李白').every((p) => p.author === '李白')).toBe(true)
  })

  it('按朝代检索', () => {
    expect(searchPoems('宋').every((p) => p.dynasty === '宋')).toBe(true)
  })

  it('按题材标签检索', () => {
    expect(searchPoems('思乡').length).toBeGreaterThan(0)
  })

  it('按正文检索', () => {
    expect(searchPoems('床前明月光').some((p) => p.id === 'p01')).toBe(true)
  })

  it('空查询返回空数组', () => {
    expect(searchPoems('')).toHaveLength(0)
  })
})

describe('筛选与聚合', () => {
  it('poemsByDynasty 按朝代筛选', () => {
    expect(poemsByDynasty('唐').every((p) => p.dynasty === '唐')).toBe(true)
    expect(poemsByDynasty('唐').length).toBeGreaterThan(0)
  })

  it('poemsByTag 按题材筛选', () => {
    expect(poemsByTag('哲理').every((p) => p.tags.includes('哲理'))).toBe(true)
    expect(poemsByTag('哲理').length).toBeGreaterThanOrEqual(2)
  })

  it('dynasties / tags 去重', () => {
    expect(dynasties().length).toBeLessThan(POEMS.length)
    expect(new Set(tags()).size).toBe(tags().length)
    expect(tags()).toContain('思乡')
  })
})

describe('今日一诗 / 随机', () => {
  it('同一日期返回同一首诗（确定性）', () => {
    expect(poemOfTheDay('2026-08-24').id).toBe(poemOfTheDay('2026-08-24').id)
  })

  it('不同日期可能返回不同诗', () => {
    const a = poemOfTheDay('2026-01-01').id
    const b = poemOfTheDay('2026-12-31').id
    expect(typeof a).toBe('string')
    expect(typeof b).toBe('string')
  })

  it('随机一首始终返回库内诗词', () => {
    for (let i = 0; i < 20; i++) {
      const p = randomPoem()
      expect(poemById(p.id)).toBeDefined()
    }
  })
})

describe('收藏持久化', () => {
  it('toggleFavorite 收藏/取消收藏', () => {
    const fav = usePoetryFavorites()
    const before = fav.isFavorite('p01')
    fav.toggleFavorite('p01')
    expect(fav.isFavorite('p01')).toBe(!before)
    fav.toggleFavorite('p01')
    expect(fav.isFavorite('p01')).toBe(before)
  })
})

describe('poetryInsights 洞察', () => {
  it('首行指出今日一诗', () => {
    const insights = poetryInsights()
    expect(insights[0]).toContain('今日一诗')
  })
})
