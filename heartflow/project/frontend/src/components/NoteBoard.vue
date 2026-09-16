<template>
  <div class="note-board" :class="{ open: visible }">
    <!-- 面板头部 -->
    <div class="board-header">
      <h3 class="board-title">📝 笔记板</h3>
      <button class="board-close" @click="$emit('close')">✕</button>
    </div>

    <!-- 新建按钮 -->
    <div class="board-create">
      <button class="create-btn" @click="startCreate">+ 新建笔记</button>
    </div>

    <!-- 搜索过滤 -->
    <div class="board-search">
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="搜索笔记标题或内容…"
      />
      <div class="sort-bar">
        <select v-model="sortOrder" class="sort-select">
          <option value="updated">按更新时间</option>
          <option value="created">按创建时间</option>
          <option value="title">按标题</option>
        </select>
      </div>
    </div>

    <!-- 笔记列表 -->
    <div class="board-list" ref="listRef">
      <div
        v-for="n in filteredNotes"
        :key="n.id"
        class="board-item"
        :class="{ sticky: n.displayMode === 'sticky' || n.displayMode === 'minimized' }"
      >
        <div class="item-header">
          <span class="item-color" :style="{ background: '#' + n.color }"></span>
          <span class="item-title">{{ n.title || '无标题' }}</span>
          <span class="item-mode" v-if="n.displayMode !== 'board'">
            {{ n.displayMode === 'minimized' ? '📌' : '📋' }}
          </span>
        </div>
        <p class="item-preview">{{ n.content || '（空）' }}</p>
        <div class="item-meta">
          <span class="item-tags" v-if="n.tags.length">
            <span v-for="t in n.tags.slice(0, 3)" :key="t" class="item-tag">{{ t }}</span>
          </span>
          <span class="item-time">{{ fmtTime(n.updatedAt) }}</span>
        </div>
        <div class="item-actions">
          <button class="item-btn" @click="editNote(n)" title="编辑">✏️</button>
          <button
            class="item-btn"
            @click="toggleSticky(n)"
            :title="n.displayMode === 'sticky' || n.displayMode === 'minimized' ? '收入面板' : '贴为便签'"
          >
            {{ n.displayMode === 'sticky' || n.displayMode === 'minimized' ? '📥' : '📌' }}
          </button>
          <button class="item-btn del-btn" @click="deleteNote(n.id)" title="删除">🗑️</button>
        </div>
      </div>
      <div v-if="!filteredNotes.length" class="board-empty">
        <p>{{ searchQuery ? '没有匹配的笔记' : '还没有笔记，点击上方按钮创建' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StickyNote } from '../modules/note'
import { getNoteStore } from '../modules/note'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  create: []
  edit: [note: StickyNote]
  'delete': [id: string]
  'toggle-sticky': [id: string]
}>()

const noteStore = getNoteStore()
const searchQuery = ref('')
const sortOrder = ref<'updated' | 'created' | 'title'>('updated')
const listRef = ref<HTMLElement | null>(null)

const filteredNotes = computed(() => {
  const all = noteStore.allStickyNotes.value.concat(noteStore.boardNotes.value)
  // 搜索筛选
  let result = all
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = all.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
  }
  // 排序
  const sorted = [...result]
  switch (sortOrder.value) {
    case 'updated':
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      break
    case 'created':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
  }
  return sorted
})

function startCreate() {
  emit('create')
}

function editNote(n: StickyNote) {
  emit('edit', n)
}

function toggleSticky(n: StickyNote) {
  emit('toggle-sticky', n.id)
}

function deleteNote(id: string) {
  emit('delete', id)
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.note-board {
  position: fixed;
  top: 0;
  right: -360px;
  width: 340px;
  height: 100dvh;
  background: #16161e;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 500;
  display: flex;
  flex-direction: column;
  transition: right 0.3s ease;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
}

.note-board.open {
  right: 0;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.board-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-disabled);
  margin: 0;
}

.board-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.board-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-disabled);
}

.board-create {
  padding: 12px 20px;
}

.create-btn {
  width: 100%;
  padding: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: var(--bg-surface);
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  border-color: var(--accent, #d4a574);
  color: var(--accent, #d4a574);
  background: rgba(212, 165, 116, 0.06);
}

.board-search {
  padding: 0 20px 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.sort-bar {
  margin-top: 8px;
}

.sort-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  cursor: pointer;
  transition: border-color 0.2s;
  appearance: auto;
}

.sort-select:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

.sort-select option {
  background: #1a1a24;
  color: rgba(255, 255, 255, 0.7);
}

.board-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.board-item {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.2s, border-color 0.2s;
}

.board-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.board-item.sticky {
  border-left: 3px solid var(--accent, #d4a574);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.item-color {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.item-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-mode {
  font-size: 10px;
  opacity: 0.5;
}

.item-preview {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin: 4px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.item-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.item-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
}

.item-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  margin-left: auto;
}

.item-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.board-item:hover .item-actions {
  opacity: 1;
}

.item-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.item-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.del-btn:hover {
  background: rgba(224, 49, 49, 0.15);
}

.board-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 20px;
}

.board-empty p {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  text-align: center;
  line-height: 1.6;
}
</style>