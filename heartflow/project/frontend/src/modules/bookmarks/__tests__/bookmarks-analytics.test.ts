// ============================================================
// 书签入口架 · 收藏档案分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  collectionOverview,
  collectionRhythm,
  collectionHealth,
  revisitSuggestion,
  collectionInsights,
} from '../bookmarks-analytics'
import type { Bookmark } from '../bookmarks'

const NOW = new Date(2026, 7, 1, 12, 0, 0) // 2026-08-01
const DAY = 86_400_000

function mk(over: Partial<Bookmark> = {}): Bookmark {
  return {
    bookmark_id: over.bookmark_id || `bm${Math.random().toString(36).slice(2, 6)}`,
    url: over.url || 'https://example.com',
    title: over.title || '条目',
    description: over.description || '',
    folder: over.folder || '',
    folder_color: over.folder_color || '',
    favicon: over.favicon || '📎',
    tags: over.tags || [],
    created_at: over.created_at || new Date(NOW.getTime() - 5 * DAY).toISOString(),
    last_visited_at: over.last_visited_at || '',
    visit_count: over.visit_count || 0,
    related_room_ids: over.related_room_ids || [],
    related_note_ids: over.related_note_ids || [],
    note: over.note || '',
    status: over.status || 'active',
    excerpt: over.excerpt || '',
    preview_image: over.preview_image || '',
    content_type: over.content_type || 'other',
    reading_time: over.reading_time || 0,
    is_read: over.is_read !== undefined ? over.is_read : true,
    clipped_at: over.clipped_at || '',
  }
}

describe('collectionOverview', () => {
  it('空清单返回零值', () => {
    const o = collectionOverview([])
    expect(o.total).toBe(0)
    expect(o.active).toBe(0)
    expect(o.unread).toBe(0)
    expect(o.totalReadingMinutes).toBe(0)
  })

  it('统计活跃/归档/待读与内容分布', () => {
    const list = [
      mk({ status: 'archived' }),
      mk({ is_read: false, content_type: 'article', folder: '阅读' }),
      mk({ is_read: false, content_type: 'video' }),
      mk({ content_type: 'article', folder: '阅读', tags: ['a', 'b'], reading_time: 20, visit_count: 3 }),
    ]
    const o = collectionOverview(list)
    expect(o.total).toBe(4)
    expect(o.active).toBe(3)
    expect(o.archived).toBe(1)
    expect(o.unread).toBe(2)
    expect(o.read).toBe(1)
    expect(o.totalReadingMinutes).toBe(20)
    expect(o.folderCount).toBe(1)
    expect(o.tagCount).toBe(2)
    expect(o.byContentType.article).toBe(2)
    expect(o.byContentType.video).toBe(1)
    expect(o.avgVisits).toBe(1)
  })
})

describe('collectionRhythm', () => {
  it('统计本周新增与回访及蒙尘', () => {
    const list = [
      mk({ created_at: new Date(NOW.getTime() - 1 * DAY).toISOString(), last_visited_at: NOW.toISOString(), visit_count: 2 }),
      mk({ is_read: false }),
    ]
    const r = collectionRhythm(list, NOW)
    expect(r.addedThisWeek).toBe(2)
    expect(r.visitedThisWeek).toBe(1)
    expect(r.dormantCount).toBe(1)
    expect(r.readRate).toBe(50)
  })

  it('统计蒙尘已读率与内容主类', () => {
    const list = [
      mk({ is_read: false }),
      mk({ is_read: true, content_type: 'article' }),
      mk({ is_read: true, content_type: 'article' }),
      mk({ is_read: false }),
    ]
    const r = collectionRhythm(list, NOW)
    expect(r.dormantCount).toBe(2)
    expect(r.readRate).toBe(50)
    expect(r.topContentType).toBe('article')
  })
})

describe('revisitSuggestion', () => {
  it('空清单无建议', () => {
    expect(revisitSuggestion([], NOW)).toBeNull()
  })

  it('优先建议待读，且放得越久越靠前', () => {
    const list = [
      mk({ title: '刚收的待读', is_read: false, created_at: new Date(NOW.getTime() - 2 * DAY).toISOString() }),
      mk({ title: '搁了很久的待读', is_read: false, created_at: new Date(NOW.getTime() - 60 * DAY).toISOString(), visit_count: 0 }),
    ]
    const s = revisitSuggestion(list, NOW)
    expect(s?.bookmark.title).toBe('搁了很久的待读')
    expect(s?.reason).toContain('待读')
  })

  it('无待读时建议久未回访的已读', () => {
    const list = [
      mk({ title: '常回访', is_read: true, visit_count: 9, last_visited_at: new Date(NOW.getTime() - 2 * DAY).toISOString() }),
      mk({ title: '蒙尘未访', is_read: true, visit_count: 0 }),
    ]
    const s = revisitSuggestion(list, NOW)
    expect(s?.bookmark.title).toBe('蒙尘未访')
  })

  it('归档条目不参与建议', () => {
    const list = [mk({ title: '归档', status: 'archived', is_read: false })]
    expect(revisitSuggestion(list, NOW)).toBeNull()
  })
})

describe('collectionHealth', () => {
  it('空书架', () => {
    const h = collectionHealth([], NOW)
    expect(h.score).toBe(0)
    expect(h.label).toBe('空书架')
  })

  it('已读且常回访且有分类得分更高', () => {
    const list = [
      mk({ is_read: true, visit_count: 5, folder: '阅读' }),
      mk({ is_read: true, visit_count: 2, folder: '阅读' }),
      mk({ is_read: true, visit_count: 1, folder: '工具' }),
    ]
    const h = collectionHealth(list, NOW)
    expect(h.readRate).toBe(100)
    expect(h.revisitRate).toBe(100)
    expect(h.tidyRate).toBe(100)
    expect(h.score).toBe(100)
    expect(h.label).toBe('收得明白')
  })
})

describe('collectionInsights', () => {
  it('空收藏给引导', () => {
    const list = collectionInsights([], NOW)
    expect(list.length).toBe(1)
    expect(list[0]).toContain('空着')
  })

  it('给出待读与类型洞察', () => {
    const list = collectionInsights(
      [mk({ is_read: false, content_type: 'article' }), mk({ content_type: 'article' })],
      NOW,
      10,
    )
    expect(list.some((s) => s.includes('待读'))).toBe(true)
    expect(list.some((s) => s.includes('文章'))).toBe(true)
  })
})