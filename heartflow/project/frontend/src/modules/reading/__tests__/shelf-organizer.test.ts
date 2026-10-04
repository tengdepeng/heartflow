import { describe, expect, it, beforeEach } from 'vitest'
import {
  normalizeShelfPrefs,
  normalizeIdList,
  readingProgress,
  progressPercent,
  orderBooks,
  shelfSections,
  shelfStats,
  useShelfOrganizer,
  DEFAULT_SHELF_PREFS,
  SHELF_ORGANIZER_KEYS,
} from '../shelf-organizer'
import { storage } from '../../../engine/storage'
import type { Book } from '../types'

function mkBook(id: string, title: string, extra: Partial<Book> = {}): Book {
  return {
    id,
    title,
    author: extra.author ?? '佚名',
    totalPages: extra.totalPages ?? 100,
    currentPage: extra.currentPage ?? 0,
    status: extra.status ?? 'want_to_read',
    tags: extra.tags ?? [],
    quotes: extra.quotes ?? [],
    totalReadingTime: extra.totalReadingTime ?? 0,
    ...extra,
  }
}

describe('shelf-organizer · 归一化', () => {
  it('normalizeShelfPrefs 非法值回落默认，字段缺失补齐', () => {
    expect(normalizeShelfPrefs(null)).toEqual(DEFAULT_SHELF_PREFS)
    expect(normalizeShelfPrefs({ view: 'bogus', sort: 'xxx', showPrivate: 'yes' })).toEqual(DEFAULT_SHELF_PREFS)
    expect(normalizeShelfPrefs({ view: 'grid', sort: 'title', showPrivate: true })).toEqual({
      view: 'grid',
      sort: 'title',
      showPrivate: true,
    })
  })

  it('normalizeIdList 去重且仅保留非空字符串', () => {
    expect(normalizeIdList(['a', 'b', 'a', '', null, 3, 'c'])).toEqual(['a', 'b', 'c'])
    expect(normalizeIdList('not-array')).toEqual([])
    expect(normalizeIdList(undefined)).toEqual([])
  })
})

describe('shelf-organizer · 进度计算', () => {
  it('已读书恒为 100%', () => {
    const b = mkBook('1', 'A', { status: 'finished', totalPages: 200, currentPage: 10 })
    expect(readingProgress(b)).toBe(1)
    expect(progressPercent(b)).toBe(100)
  })

  it('在读按 当前页/总页 计算并夹取', () => {
    expect(progressPercent(mkBook('1', 'A', { totalPages: 200, currentPage: 50 }))).toBe(25)
    expect(progressPercent(mkBook('2', 'B', { totalPages: 200, currentPage: 400 }))).toBe(100)
  })

  it('无总页数时为 0', () => {
    expect(readingProgress(mkBook('1', 'A', { totalPages: 0, currentPage: 5 }))).toBe(0)
  })
})

describe('shelf-organizer · 排序', () => {
  const a = mkBook('a', 'C 书', { totalPages: 100, currentPage: 80 })
  const b = mkBook('b', 'A 书', { totalPages: 100, currentPage: 20 })
  const c = mkBook('c', 'B 书', { totalPages: 100, currentPage: 50 })

  it('title 排序按中文书名', () => {
    const out = orderBooks([a, b, c], [], 'title').map((x) => x.id)
    expect(out).toEqual(['b', 'c', 'a'])
  })

  it('progress 排序按进度降序', () => {
    const out = orderBooks([b, a, c], [], 'progress').map((x) => x.id)
    expect(out).toEqual(['a', 'c', 'b'])
  })

  it('置顶书按置顶顺序提到最前', () => {
    const out = orderBooks([a, b, c], ['c', 'b'], 'title').map((x) => x.id)
    expect(out.slice(0, 2)).toEqual(['c', 'b'])
    expect(out.slice(2)).toEqual(['a'])
  })

  it('manual 排序仅置顶前移，其余保持传入顺序', () => {
    const out = orderBooks([a, b, c], ['b'], 'manual').map((x) => x.id)
    expect(out).toEqual(['b', 'a', 'c'])
  })
})

describe('shelf-organizer · 分区与统计', () => {
  const books = [
    mkBook('1', 'A', { status: 'reading', totalPages: 100, currentPage: 50 }),
    mkBook('2', 'B', { status: 'finished' }),
    mkBook('3', 'C', { status: 'want_to_read' }),
  ]

  it('私密藏书在 showPrivate=false 时被隐藏并计数', () => {
    const sec = shelfSections(books, {
      pinnedIds: [],
      privateIds: ['2'],
      showPrivate: false,
      sort: 'manual',
    })
    const ids = [...sec.pinned, ...sec.normal].map((x) => x.id)
    expect(ids).toEqual(['1', '3'])
    expect(sec.hiddenPrivate).toBe(1)
  })

  it('showPrivate=true 时私密藏书可见且隐藏数为 0', () => {
    const sec = shelfSections(books, {
      pinnedIds: ['3'],
      privateIds: ['2'],
      showPrivate: true,
      sort: 'manual',
    })
    expect(sec.pinned.map((x) => x.id)).toEqual(['3'])
    expect(sec.normal.map((x) => x.id).sort()).toEqual(['1', '2'])
    expect(sec.hiddenPrivate).toBe(0)
  })

  it('shelfStats 统计总数/置顶/私密/已读/在读', () => {
    expect(shelfStats(books, ['1'], ['2'])).toEqual({
      total: 3,
      pinned: 1,
      privateCount: 1,
      finished: 1,
      reading: 1,
    })
  })
})

describe('shelf-organizer · 组合式（持久化）', () => {
  beforeEach(() => {
    useShelfOrganizer().reset()
  })

  it('setPref 写回存储', () => {
    const s = useShelfOrganizer()
    s.setPref('view', 'grid')
    s.setPref('sort', 'progress')
    s.setPref('showPrivate', true)
    expect(s.prefs.value).toEqual({ view: 'grid', sort: 'progress', showPrivate: true })
    expect(JSON.parse(storage.getKV<string>(SHELF_ORGANIZER_KEYS.prefs, ''))).toEqual({
      view: 'grid',
      sort: 'progress',
      showPrivate: true,
    })
  })

  it('togglePin / togglePrivate 去重写入并持久化', () => {
    const s = useShelfOrganizer()
    s.togglePin('b1')
    s.togglePin('b2')
    s.togglePin('b1') // 再点取消
    expect(s.pinned.value).toEqual(['b2'])
    expect(s.isPinned('b2')).toBe(true)
    expect(s.isPinned('b1')).toBe(false)

    s.togglePrivate('b3')
    expect(s.privateIds.value).toEqual(['b3'])
    expect(s.isPrivate('b3')).toBe(true)
    expect(JSON.parse(storage.getKV<string>(SHELF_ORGANIZER_KEYS.pins, '[]'))).toEqual(['b2'])
    expect(JSON.parse(storage.getKV<string>(SHELF_ORGANIZER_KEYS.private, '[]'))).toEqual(['b3'])
  })

  it('reset 恢复默认并清空集合', () => {
    const s = useShelfOrganizer()
    s.setPref('view', 'grid')
    s.togglePin('b1')
    s.reset()
    expect(s.prefs.value).toEqual(DEFAULT_SHELF_PREFS)
    expect(s.pinned.value).toEqual([])
    expect(s.privateIds.value).toEqual([])
  })
})
