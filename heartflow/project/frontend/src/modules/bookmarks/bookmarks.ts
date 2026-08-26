// ============================================================
// 书签数据层（Bookmarks.vue）
// 替代视图内裸的 storage.getKV('hf:bookmarks_v2') / storage.setKV 调用。
// 暴露模块级单例 ref，跨消费方共享同一份书签列表。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export interface Bookmark {
  bookmark_id: string
  url: string
  title: string
  description: string
  folder: string
  folder_color: string
  favicon: string
  tags: string[]
  created_at: string
  last_visited_at: string
  visit_count: number
  related_room_ids: string[]
  related_note_ids: string[]
  note: string
  status: 'active' | 'archived'
  /** 摘要/摘录 */
  excerpt?: string
  /** 预览图 */
  preview_image?: string
  /** 内容类型：article/video/image/audio/other */
  content_type?: string
  /** 预读时长（分钟） */
  reading_time?: number
  /** 是否已读 */
  is_read?: boolean
  /** 剪藏时间 */
  clipped_at?: string
}

// 必须保留视图原本使用的存储键原值
const KEY = 'hf:bookmarks_v2'

// 模块级单例：所有消费方共享同一份书签列表
const bookmarks = ref<Bookmark[]>([])

/**
 * 书签数据层：读取 / 写入 / 增删改
 */
export function useBookmarks() {
  /** 从存储载入书签（兼容旧格式迁移） */
  function load(): void {
    try {
      const data = storage.getKV<Bookmark[]>(KEY, [])
      bookmarks.value = data.map((b: any) => ({
        bookmark_id: b.bookmark_id || b.id || `bm_${Date.now()}`,
        url: b.url || '',
        title: b.title || '',
        description: b.description || '',
        folder: b.folder || '',
        folder_color: b.folder_color || '',
        favicon: b.favicon || '📎',
        tags: b.tags || [],
        created_at: b.created_at || b.at || new Date().toISOString(),
        last_visited_at: b.last_visited_at || '',
        visit_count: b.visit_count || 0,
        related_room_ids: b.related_room_ids || [],
        related_note_ids: b.related_note_ids || [],
        note: b.note || '',
        status: b.status || 'active',
        excerpt: b.excerpt || '',
        preview_image: b.preview_image || '',
        content_type: b.content_type || 'other',
        reading_time: b.reading_time || 0,
        is_read: b.is_read !== undefined ? b.is_read : true,
        clipped_at: b.clipped_at || '',
      }))
    } catch {
      bookmarks.value = []
    }
  }

  /** 整体持久化当前书签列表 */
  function save(): void {
    storage.setKV(KEY, bookmarks.value)
  }

  /** 追加一条书签 */
  function add(bookmark: Bookmark): void {
    bookmarks.value = [...bookmarks.value, bookmark]
    save()
  }

  /** 删除指定 id 的书签 */
  function remove(id: string): void {
    bookmarks.value = bookmarks.value.filter((b) => b.bookmark_id !== id)
    save()
  }

  /** 归档指定 id 的书签 */
  function archive(id: string): void {
    const idx = bookmarks.value.findIndex((b) => b.bookmark_id === id)
    if (idx !== -1) {
      bookmarks.value = bookmarks.value.map((b) =>
        b.bookmark_id === id ? { ...b, status: 'archived' } : b
      )
      save()
    }
  }

  /** 取回（取消归档）指定 id 的书签 */
  function unarchive(id: string): void {
    const idx = bookmarks.value.findIndex((b) => b.bookmark_id === id)
    if (idx !== -1) {
      bookmarks.value = bookmarks.value.map((b) =>
        b.bookmark_id === id ? { ...b, status: 'active' } : b
      )
      save()
    }
  }

  return { bookmarks, load, save, add, remove, archive, unarchive }
}
