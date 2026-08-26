// ============================================================
// useBookmarks 数据层测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useBookmarks } from '../bookmarks'
import type { Bookmark } from '../bookmarks'

const KEY = 'hf:bookmarks_v2'

function mkbm(over: Partial<Bookmark> = {}): Bookmark {
  return {
    bookmark_id: over.bookmark_id || 'bm_1',
    url: over.url || 'https://example.com',
    title: over.title || '示例',
    description: over.description || '',
    folder: over.folder || '',
    folder_color: over.folder_color || '',
    favicon: over.favicon || '📎',
    tags: over.tags || [],
    created_at: over.created_at || '2026-01-01T00:00:00Z',
    last_visited_at: over.last_visited_at || '',
    visit_count: over.visit_count || 0,
    related_room_ids: [],
    related_note_ids: [],
    note: over.note || '',
    status: over.status || 'active',
  }
}

describe('useBookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store[KEY] = []
    useBookmarks().load()
  })

  it('load 从存储载入书签', () => {
    store[KEY] = [mkbm({ bookmark_id: 'a', title: 'A' }), mkbm({ bookmark_id: 'b', title: 'B' })]
    const { bookmarks, load } = useBookmarks()
    load()
    expect(bookmarks.value).toHaveLength(2)
    expect(bookmarks.value[0].title).toBe('A')
  })

  it('load 在存储为空时回退默认空数组', () => {
    const { bookmarks } = useBookmarks()
    expect(bookmarks.value).toEqual([])
  })

  it('load 兼容旧格式迁移（id/at 字段）', () => {
    store[KEY] = [{ id: 'old_1', url: 'https://old.com', at: '2025-05-05T00:00:00Z' }]
    const { bookmarks, load } = useBookmarks()
    load()
    expect(bookmarks.value[0].bookmark_id).toBe('old_1')
    expect(bookmarks.value[0].created_at).toBe('2025-05-05T00:00:00Z')
    expect(bookmarks.value[0].status).toBe('active')
    expect(bookmarks.value[0].favicon).toBe('📎')
  })

  it('save 持久化当前列表', () => {
    const { bookmarks, save } = useBookmarks()
    bookmarks.value = [mkbm({ bookmark_id: 'x' })]
    save()
    expect(mockSetKV).toHaveBeenCalledWith(KEY, bookmarks.value)
    expect(store[KEY]).toHaveLength(1)
  })

  it('add 追加并持久化', () => {
    const { add } = useBookmarks()
    add(mkbm({ bookmark_id: 'c', title: 'C' }))
    expect(useBookmarks().bookmarks.value).toHaveLength(1)
    expect(useBookmarks().bookmarks.value[0].title).toBe('C')
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('remove 删除指定书签', () => {
    store[KEY] = [mkbm({ bookmark_id: 'a' }), mkbm({ bookmark_id: 'b' })]
    const { remove, load } = useBookmarks()
    load()
    remove('a')
    expect(useBookmarks().bookmarks.value.map((b) => b.bookmark_id)).toEqual(['b'])
  })

  it('archive / unarchive 切换状态', () => {
    store[KEY] = [mkbm({ bookmark_id: 'a', status: 'active' })]
    const { archive, unarchive, bookmarks, load } = useBookmarks()
    load()
    archive('a')
    expect(bookmarks.value[0].status).toBe('archived')
    unarchive('a')
    expect(bookmarks.value[0].status).toBe('active')
  })
})
