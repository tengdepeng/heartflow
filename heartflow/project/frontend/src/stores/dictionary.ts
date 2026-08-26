// ============================================================
// 殿堂辞典 · Pinia Store
// 模块三十六：个人词条定义与管理
// 数据模型见蓝图15·第七部分·补二·模块三十六
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'

// ---- 类型定义 ----

export interface DictEntry {
  id: string
  word: string
  definition: string
  category: string
  createdAt: string
  updatedAt?: string
  relatedRoomIds?: string[]
  relatedNoteIds?: string[]
  tags?: string[]
  status?: 'active' | 'archived'
}

// ---- 存储键 ----

const K = 'hf:dictionary'

// ---- 加载辅助 ----

function loadEntries(): DictEntry[] {
  try { return storage.getKV<DictEntry[]>(K, []) } catch { return [] }
}

function saveEntries(entries: DictEntry[]) {
  storage.setKV(K, entries)
}

export const useDictionaryStore = defineStore('dictionary', () => {
  // ---- 状态 ----
  const entries = ref<DictEntry[]>(loadEntries())

  // ---- 计算属性 ----

  const categories = computed(() => {
    const cats = new Set(entries.value.map(e => e.category).filter(Boolean))
    return [...cats].sort()
  })

  const activeEntries = computed(() =>
    entries.value.filter(e => e.status !== 'archived')
  )

  const archivedEntries = computed(() =>
    entries.value.filter(e => e.status === 'archived')
  )

  const totalCount = computed(() => entries.value.length)

  const categoryCount = computed(() => categories.value.length)

  const latestWord = computed(() =>
    entries.value[entries.value.length - 1]?.word || '暂无'
  )

  // ---- 操作方法 ----

  function persist() {
    saveEntries(entries.value)
  }

  function addEntry(word: string, definition: string, category: string = '', tags: string[] = []): DictEntry {
    const entry: DictEntry = {
      id: `dict_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      word: word.trim(),
      definition: definition.trim(),
      category: category.trim(),
      tags,
      createdAt: new Date().toISOString(),
      status: 'active',
    }
    entries.value.push(entry)
    persist()
    return entry
  }

  function updateEntry(id: string, fields: Partial<Pick<DictEntry, 'word' | 'definition' | 'category' | 'tags' | 'status'>>) {
    const e = entries.value.find(x => x.id === id)
    if (!e) return
    if (fields.word !== undefined) e.word = fields.word.trim()
    if (fields.definition !== undefined) e.definition = fields.definition.trim()
    if (fields.category !== undefined) e.category = fields.category.trim()
    if (fields.tags !== undefined) e.tags = fields.tags
    if (fields.status !== undefined) e.status = fields.status
    e.updatedAt = new Date().toISOString()
    persist()
  }

  function deleteEntry(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
    persist()
  }

  function archiveEntry(id: string) {
    updateEntry(id, { status: 'archived' })
  }

  function unarchiveEntry(id: string) {
    updateEntry(id, { status: 'active' })
  }

  function getEntry(id: string): DictEntry | undefined {
    return entries.value.find(e => e.id === id)
  }

  function filterEntries(search?: string, category?: string, status?: string): DictEntry[] {
    return entries.value.filter(e => {
      if (search && !e.word.toLowerCase().includes(search.toLowerCase())
        && !e.definition.toLowerCase().includes(search.toLowerCase())) return false
      if (category && e.category !== category) return false
      if (status && e.status !== status) return false
      return true
    }).sort((a, b) => a.word.localeCompare(b.word, 'zh'))
  }

  function exportDict(): string {
    return JSON.stringify(entries.value, null, 2)
  }

  function importDict(json: string): { added: number; skipped: number } {
    const imported = JSON.parse(json) as DictEntry[]
    if (!Array.isArray(imported)) throw new Error('格式不正确')
    const existing = new Set(entries.value.map(x => x.word))
    let added = 0
    for (const item of imported) {
      if (item.word && !existing.has(item.word)) {
        entries.value.push(item)
        existing.add(item.word)
        added++
      }
    }
    persist()
    return { added, skipped: imported.length - added }
  }

  function linkNote(entryId: string, noteId: string) {
    const e = entries.value.find(x => x.id === entryId)
    if (!e) return
    if (!e.relatedNoteIds) e.relatedNoteIds = []
    if (!e.relatedNoteIds.includes(noteId)) {
      e.relatedNoteIds.push(noteId)
      persist()
    }
  }

  function unlinkNote(entryId: string, noteId: string) {
    const e = entries.value.find(x => x.id === entryId)
    if (!e?.relatedNoteIds) return
    e.relatedNoteIds = e.relatedNoteIds.filter(id => id !== noteId)
    persist()
  }

  function linkRoom(entryId: string, roomId: string) {
    const e = entries.value.find(x => x.id === entryId)
    if (!e) return
    if (!e.relatedRoomIds) e.relatedRoomIds = []
    if (!e.relatedRoomIds.includes(roomId)) {
      e.relatedRoomIds.push(roomId)
      persist()
    }
  }

  return {
    // 状态
    entries,
    // 计算属性
    categories,
    activeEntries,
    archivedEntries,
    totalCount,
    categoryCount,
    latestWord,
    // 操作
    addEntry,
    updateEntry,
    deleteEntry,
    archiveEntry,
    unarchiveEntry,
    getEntry,
    filterEntries,
    exportDict,
    importDict,
    linkNote,
    unlinkNote,
    linkRoom,
    persist,
  }
})