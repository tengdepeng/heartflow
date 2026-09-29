<template>
  <section class="rm-panel" aria-label="读书便签">
    <div class="rm-head">
      <span class="rm-title">📝 读书便签</span>
      <span class="rm-sub">阅读时随手记 · 本地私有</span>
      <div class="rm-export">
        <button class="rm-btn" data-test="rm-export-md" :disabled="!visibleMemos.length" @click="readingExport.exportMemos">导出便签(MD)</button>
        <button
          class="rm-btn"
          data-test="rm-export-json"
          :disabled="!visibleMemos.length && !readingExport.excerptCount.value"
          @click="readingExport.exportAllJson"
        >导出全部(JSON)</button>
      </div>
    </div>

    <!-- 新增 -->
    <div class="rm-compose">
      <textarea
        v-model="draft"
        class="rm-input"
        rows="3"
        placeholder="写下此刻的念头、灵感或待办……"
        data-test="rm-input"
      ></textarea>
      <div class="rm-compose-actions">
        <span v-if="bookTitle" class="rm-linked">关联：《{{ bookTitle }}》</span>
        <button class="rm-btn rm-add" :disabled="!draft.trim()" data-test="rm-add" @click="onAdd">
          添加便签
        </button>
      </div>
    </div>

    <!-- 过滤（仅当有关联书目时） -->
    <div v-if="bookId" class="rm-filter">
      <label class="rm-filter-opt">
        <input type="checkbox" v-model="onlyBook" data-test="rm-only-book" />
        <span>只看《{{ bookTitle }}》的便签</span>
      </label>
    </div>

    <!-- 列表 -->
    <div v-if="visibleMemos.length" class="rm-list">
      <div
        v-for="m in visibleMemos"
        :key="m.id"
        class="rm-item"
        :data-test="`rm-item-${m.id}`"
      >
        <template v-if="editingId === m.id">
          <textarea v-model="editText" class="rm-input" rows="3" data-test="rm-edit-input"></textarea>
          <div class="rm-item-actions">
            <button class="rm-btn" data-test="rm-edit-save" @click="saveEdit">保存</button>
            <button class="rm-btn rm-ghost" @click="cancelEdit">取消</button>
          </div>
        </template>
        <template v-else>
          <p class="rm-text">{{ m.text }}</p>
          <div class="rm-item-meta">
            <span v-if="m.bookTitle" class="rm-book-chip">{{ m.bookTitle }}</span>
            <span class="rm-time">{{ formatTime(m.updatedAt || m.createdAt) }}</span>
            <span class="rm-item-actions">
              <button class="rm-btn rm-ghost" data-test="rm-edit" @click="startEdit(m)">编辑</button>
              <button class="rm-btn rm-del" data-test="rm-remove" @click="remove(m.id)">删除</button>
            </span>
          </div>
        </template>
      </div>
    </div>
    <p v-else class="rm-empty">还没有便签。读到这里，记一笔吧。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReadingMemos, useReadingExport, type ReadingMemo } from '../modules/reading'

const props = defineProps<{
  /** 当前打开的书目 id（可选） */
  bookId?: string
  /** 当前打开的书目标题（可选） */
  bookTitle?: string
}>()

const memos = useReadingMemos()
const readingExport = useReadingExport()
const draft = ref('')
const onlyBook = ref(false)
const editingId = ref<string | null>(null)
const editText = ref('')

const visibleMemos = computed(() =>
  onlyBook.value && props.bookId ? memos.memosForBook(props.bookId) : memos.memos.value,
)

function onAdd() {
  if (!draft.value.trim()) return
  memos.addMemo(draft.value, props.bookId || null, props.bookTitle || '')
  draft.value = ''
}

function startEdit(m: ReadingMemo) {
  editingId.value = m.id
  editText.value = m.text
}

function saveEdit() {
  if (editingId.value) memos.updateMemo(editingId.value, editText.value)
  editingId.value = null
  editText.value = ''
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function remove(id: string) {
  memos.removeMemo(id)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.rm-panel {
  background: var(--card-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.08);
  border-radius: 14px;
  padding: 16px;
}
.rm-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.rm-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.rm-sub {
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.5);
}
.rm-export {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.rm-export .rm-btn {
  padding: 4px 10px;
  font-size: 11px;
}
@media (max-width: 480px) {
  .rm-head {
    flex-wrap: wrap;
  }
  .rm-export {
    margin-left: 0;
    width: 100%;
  }
  .rm-export .rm-btn {
    flex: 1;
  }
}
.rm-compose {
  margin-bottom: 12px;
}
.rm-input {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.14);
  background: rgba(var(--bg-card-rgb, 42, 36, 30), 0.5);
  color: var(--text-high, rgba(232, 224, 216, 0.88));
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}
.rm-input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.3);
}
.rm-compose-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}
.rm-linked {
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-filter {
  margin-bottom: 10px;
}
.rm-filter-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.7);
  cursor: pointer;
}
.rm-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rm-item {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.08);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.04);
}
.rm-text {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
  white-space: pre-wrap;
  word-break: break-word;
}
.rm-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.45);
  flex-wrap: wrap;
}
.rm-book-chip {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.3);
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.85);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-time {
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.45);
}
.rm-item-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.rm-btn {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.22);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.1);
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.rm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.rm-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.18);
}
.rm-ghost {
  background: transparent;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.6);
}
.rm-del {
  color: #ff9b8a;
  border-color: rgba(255, 155, 138, 0.35);
}
.rm-del:hover:not(:disabled) {
  background: rgba(255, 155, 138, 0.12);
}
.rm-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.5);
  margin: 8px 0 0;
}
</style>
