<template>
  <div class="note-layer">
    <!-- 浮动便签按钮（首屏由幕僚坞的「笔记」标签接管，故在 Home 隐藏） -->
    <button
      v-show="!isHome"
      class="note-fab"
      :class="{ active: boardVisible, 'fab-hidden': chromeHidden }"
      :title="boardVisible ? '关闭笔记板' : '打开笔记板'"
      @click="toggleBoard"
    >
      <span class="fab-icon">📝</span>
      <span class="fab-count" v-if="noteStore.noteCount.value > 0">{{ noteStore.noteCount.value }}</span>
    </button>

    <!-- 笔记板侧边栏 -->
    <NoteBoard
      :visible="boardVisible"
      @close="boardVisible = false"
      @create="startCreate"
      @edit="openEditor"
      @delete="deleteNote"
      @toggle-sticky="toggleSticky"
    />

    <!-- 笔记编辑器 -->
    <NoteEditor
      :visible="editorVisible"
      :editing="!!editingNote"
      :note="editingNote"
      @save="saveNote"
      @close="closeEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, watch, computed, type Ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getNoteStore } from '../modules/note'
import type { StickyNote } from '../modules/note'
import NoteBoard from './NoteBoard.vue'
import NoteEditor from './NoteEditor.vue'
import { useChromeAutoHide } from '../modules/customization/useChromeAutoHide'

const noteStore = getNoteStore()
const { chromeHidden } = useChromeAutoHide()

// 首屏（Home）下笔记入口由幕僚坞「笔记」标签提供，隐藏全局浮动按钮
const route = useRoute()
const isHome = computed(() => route.name === 'home' || route.path === '/')

// ---- 笔记板状态（与 App.vue 提供的全局状态同步） ----
const noteBoardVisible = inject<Ref<boolean>>('noteBoardVisible')!
const boardVisible = ref(noteBoardVisible.value)

watch(noteBoardVisible, (v) => { boardVisible.value = v })
watch(boardVisible, (v) => { noteBoardVisible.value = v })

function toggleBoard() {
  boardVisible.value = !boardVisible.value
}

// ---- 编辑器状态 ----
const editorVisible = ref(false)
const editingNote = ref<StickyNote | null>(null)

function startCreate() {
  editingNote.value = null
  editorVisible.value = true
  boardVisible.value = false
}

function openEditor(note: StickyNote) {
  editingNote.value = note
  editorVisible.value = true
}

function closeEditor() {
  editorVisible.value = false
  editingNote.value = null
}

function saveNote(data: { title: string; content: string; tags: string[] }) {
  if (editingNote.value) {
    // 编辑已有笔记
    noteStore.update(editingNote.value.id, data)
  } else {
    // 新建笔记
    noteStore.create(data.title, data.content, data.tags)
  }
  closeEditor()
}

function deleteNote(id: string) {
  noteStore.remove(id)
}

function toggleSticky(id: string) {
  const s = noteStore.getStickyById(id)
  if (!s) return
  if (s.displayMode === 'sticky' || s.displayMode === 'minimized') {
    noteStore.moveToBoard(id)
  } else {
    noteStore.moveToSticky(id)
  }
}

onMounted(() => {
  noteStore.load()
  // 监听画布笔记编辑事件（来自 CanvasNotes）
  window.addEventListener('hf:note-edit', handleCanvasNoteEdit as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('hf:note-edit', handleCanvasNoteEdit as EventListener)
})

function handleCanvasNoteEdit(e: CustomEvent) {
  const note = e.detail as StickyNote
  openEditor(note)
}
</script>

<style scoped>
.note-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 300;
}

.note-layer > * {
  pointer-events: auto;
}

/* 浮动便签按钮 */
.note-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a24;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  z-index: 400;
}

.note-fab:hover {
  background: #22222e;
  color: var(--text-disabled);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.note-fab.active {
  border-color: var(--accent, #d4a574);
  color: var(--accent, #d4a574);
  box-shadow: 0 0 20px rgba(212, 165, 116, 0.15);
}

/* 界面自动隐藏（沉浸模式）：空闲时淡出笔记板按钮 */
.note-fab.fab-hidden {
  opacity: 0;
  transform: translateY(16px) scale(0.9);
  pointer-events: none;
}

.fab-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--accent, #d4a574);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* 便签层 */
.sticky-notes-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.sticky-notes-layer > * {
  pointer-events: auto;
}
</style>