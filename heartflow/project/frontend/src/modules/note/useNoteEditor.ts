// ============================================================
// 笔记编辑器 · 全局单例
// 供画布便签（CanvasNotes / NoteLayer）与幕僚阁（AdvisorHub）共享同一份编辑态，
// 避免重复挂载 NoteEditor 或状态分裂。笔记「入口」统一收口到幕僚阁，
// 原独立浮动 FAB（接线孤儿）已删除。
// ============================================================

import { ref } from 'vue'
import type { StickyNote } from './types'
import { getNoteStore } from './index'

const editorVisible = ref(false)
const editingNote = ref<StickyNote | null>(null)
const noteStore = getNoteStore()

function openCreate() {
  editingNote.value = null
  editorVisible.value = true
}

function openEdit(note: StickyNote) {
  editingNote.value = note
  editorVisible.value = true
}

function close() {
  editorVisible.value = false
  editingNote.value = null
}

function save(data: { title: string; content: string; tags: string[] }) {
  if (editingNote.value) noteStore.update(editingNote.value.id, data)
  else noteStore.create(data.title, data.content, data.tags)
  close()
}

/** 画布便签（CanvasNotes）双击编辑事件 → 打开编辑器（NoteLayer 挂载期注册一次） */
function handleCanvasNoteEdit(e: CustomEvent) {
  openEdit(e.detail as StickyNote)
}

function initCanvasNoteListener() {
  window.addEventListener('hf:note-edit', handleCanvasNoteEdit as EventListener)
}

function destroyCanvasNoteListener() {
  window.removeEventListener('hf:note-edit', handleCanvasNoteEdit as EventListener)
}

export function useNoteEditor() {
  return {
    editorVisible,
    editingNote,
    openCreate,
    openEdit,
    close,
    save,
    initCanvasNoteListener,
    destroyCanvasNoteListener,
  }
}
