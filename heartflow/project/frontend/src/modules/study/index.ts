// ============================================================
// 思绪书房 · 笔记状态管理
// ============================================================

import { computed } from 'vue'
import type { Note } from './types'
import { notes, loadNotesState, persistNotesState } from '../../engine/storage/notes-state'
import { syncLinksForNote, removeLinksForNote } from './note-links'
import { tagFrequencies, pickRandom } from './explore'

export type { Note }
export { tagFrequencies, pickRandom }

/**
 * 从文本中提取 #标签（支持中英文/数字/下划线，去重、去除 # 前缀）。
 * 对应蓝图17 九 · flomo 式「标签涌现」。
 */
export function extractTags(raw: string): string[] {
  const matches = raw.match(/(?:^|\s)#([\p{L}\p{N}_]+)/gu) || []
  const tags = matches.map(m => m.replace(/^\s*#/, '').trim())
  return [...new Set(tags)].filter(Boolean)
}

export function useStudy() {
  function load() {
    loadNotesState()
    notes.value = [...notes.value].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  function create(title: string, content: string, tags: string[] = [], isAtomic = false): Note {
    const now = new Date().toISOString()
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      content: content.trim(),
      tags: tags.filter(Boolean),
      createdAt: now,
      updatedAt: now,
      isAtomic,
    }
    notes.value.unshift(note)
    persist()
    syncLinksForNote(note.id, content, notes.value)
    return note
  }

  /**
   * 快速记录（flomo 式无压力速记）：
   * 无标题原子卡片，自动抽取 #标签，内容剥离标签令牌后落库。
   * 空内容返回 null（不落库）。
   */
  function quickCapture(
    raw: string,
    opts?: {
      roomId?: string
      /** 语丝结构化抽取：标题（非空时覆盖自动派生） */
      title?: string
      /** 语丝结构化抽取：标签（提供则优先于自动 #抽取） */
      tags?: string[]
      /** 语丝结构化抽取：截止时间（本地日期或带时间字符串） */
      due?: string | null
      /** 语丝结构化抽取：执行人 */
      assignee?: string | null
      /** 语丝结构化抽取：优先级 */
      priority?: 'low' | 'normal' | 'high'
    },
  ): Note | null {
    const text = (raw || '').trim()
    if (!text) return null
    const tags = opts?.tags && opts.tags.length ? [...new Set(opts.tags)] : extractTags(text)
    const content = text
      .replace(/(?:^|\s)#([\p{L}\p{N}_]+)/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const now = new Date().toISOString()
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: opts?.title ?? '',
      content,
      tags,
      createdAt: now,
      updatedAt: now,
      roomId: opts?.roomId || undefined,
      due: opts?.due || undefined,
      assignee: opts?.assignee || undefined,
      priority: opts?.priority || undefined,
    }
    notes.value.unshift(note)
    persist()
    syncLinksForNote(note.id, content, notes.value)
    return note
  }

  function update(id: string, data: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'isAtomic'>>) {
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx === -1) return
    notes.value[idx] = {
      ...notes.value[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    persist()
    if (data.content !== undefined) {
      syncLinksForNote(id, data.content, notes.value)
    }
  }

  function remove(id: string) {
    notes.value = notes.value.filter(n => n.id !== id)
    removeLinksForNote(id)
    persist()
  }

  /** 归档笔记（从书架隐藏，保留内容） */
  function archive(id: string) {
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx === -1) return
    notes.value[idx] = {
      ...notes.value[idx],
      archived: true,
      updatedAt: new Date().toISOString(),
    }
    persist()
  }

  /** 取消归档（回到书架） */
  function unarchive(id: string) {
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx === -1) return
    notes.value[idx] = {
      ...notes.value[idx],
      archived: false,
      updatedAt: new Date().toISOString(),
    }
    persist()
  }

  /** 所有标签（去重） */
  const allTags = computed(() => {
    const set = new Set<string>()
    for (const n of notes.value) {
      for (const t of n.tags) set.add(t)
    }
    return [...set].sort()
  })

  /** 按标签筛选 */
  function byTag(tag: string): Note[] {
    return notes.value.filter(n => n.tags.includes(tag))
  }

  function persist() {
    persistNotesState()
  }

  return {
    notes,
    allTags,
    load,
    create,
    update,
    remove,
    archive,
    unarchive,
    byTag,
    quickCapture,
  }
}
