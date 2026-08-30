<template>
  <div class="note-layer">
    <!-- 笔记编辑器（全局单例：画布便签与幕僚阁共享同一份编辑态，避免重复挂载） -->
    <NoteEditor
      :visible="editorVisible"
      :editing="!!editingNote"
      :note="editingNote"
      @save="save"
      @close="close"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import NoteEditor from './NoteEditor.vue'
import { getNoteStore } from '../modules/note'
import { useNoteEditor } from '../modules/note/useNoteEditor'

const noteStore = getNoteStore()
const { editorVisible, editingNote, save, close, initCanvasNoteListener, destroyCanvasNoteListener } =
  useNoteEditor()

onMounted(() => {
  noteStore.load()
  // 监听画布笔记编辑事件（来自 CanvasNotes）：双击便签 → 全局编辑器
  initCanvasNoteListener()
})

onUnmounted(() => {
  destroyCanvasNoteListener()
})
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
</style>
