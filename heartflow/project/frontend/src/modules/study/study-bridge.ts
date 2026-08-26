// ============================================================
// Study 桥接层
// 聚合思绪书房状态，提供视图层消费接口
// ============================================================

import { computed, ref } from 'vue'
import { useStudy } from './index'
import type { Note } from './index'

export interface StudySummary {
  totalNotes: number
  uniqueTags: number
  recentNotes: Note[]
  lastUpdated: string | null
}

export function useStudyBridge() {
  const study = useStudy()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const summary = computed<StudySummary>(() => ({
    totalNotes: study.notes.value.length,
    uniqueTags: study.allTags.value.length,
    recentNotes: study.notes.value.slice(0, 5),
    lastUpdated: study.notes.value.length > 0
      ? study.notes.value.reduce((latest, n) =>
          n.updatedAt > latest ? n.updatedAt : latest, study.notes.value[0].updatedAt)
      : null,
  }))

  const notesByTag = computed(() => {
    const map = new Map<string, Note[]>()
    for (const note of study.notes.value) {
      for (const tag of note.tags) {
        if (!map.has(tag)) map.set(tag, [])
        map.get(tag)!.push(note)
      }
    }
    return map
  })

  // ---- 操作 ----

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      await study.load()
    } finally {
      isLoading.value = false
    }
  }

  function createNote(title: string, content: string, tags: string[] = []): Note {
    return study.create(title, content, tags)
  }

  function updateNote(id: string, data: Partial<Pick<Note, 'title' | 'content' | 'tags'>>): void {
    study.update(id, data)
  }

  function removeNote(id: string): void {
    study.remove(id)
  }

  function getNotesByTag(tag: string): Note[] {
    return study.byTag(tag)
  }

  return {
    // 状态
    notes: study.notes,
    allTags: study.allTags,
    isLoading,
    summary,
    notesByTag,
    // 操作
    initialize,
    createNote,
    updateNote,
    removeNote,
    getNotesByTag,
    // 子模块直通
    study,
  }
}