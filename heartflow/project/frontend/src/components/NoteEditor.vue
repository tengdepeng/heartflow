<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="cancel">
        <div class="editor-card" @keydown.escape="cancel">
          <div class="editor-header">
            <input
              ref="titleRef"
              v-model="form.title"
              class="title-input"
              placeholder="笔记标题…"
              autofocus
            />
            <button class="close-btn" @click="cancel">✕</button>
          </div>

          <!-- 标签 -->
          <div class="tag-section">
            <div class="tag-list">
              <span
                v-for="t in form.tags"
                :key="t"
                class="tag-chip"
                :style="chipStyle(t)"
              >
                {{ t }}
                <button class="tag-remove" @click="removeTag(t)">×</button>
              </span>
            </div>
            <input
              v-model="tagInput"
              class="tag-input"
              placeholder="添加标签…"
              @keyup.enter.prevent="addTag"
              @keydown.backspace="handleBackspace"
            />
          </div>

          <!-- 原子笔记 + 块锚点工具 -->
          <div class="editor-tools">
            <button
              :class="['tool-btn', { active: form.isAtomic }]"
              @click="form.isAtomic = !form.isAtomic"
              :title="form.isAtomic ? '已是原子笔记：每篇只装一个想法，便于整体复用' : '标记为原子笔记'"
            >⚛ 原子笔记</button>
            <button
              class="tool-btn"
              @click="insertBlockAnchor"
              title="在光标所在行尾插入块锚点，便于被 [[笔记#锚点]] 引用"
            >🔗 插入块锚点</button>
            <button
              class="tool-btn"
              @click="openLinkPicker"
              title="插入 [[笔记]] 双链：选择目标笔记后于光标处插入引用"
            >📎 插入双链</button>
          </div>

          <!-- 编辑/预览模式切换 -->
          <div class="editor-tabs">
            <button
              :class="['tab-btn', { active: editMode === 'edit' }]"
              @click="editMode = 'edit'"
            >编辑</button>
            <button
              :class="['tab-btn', { active: editMode === 'preview' }]"
              @click="editMode = 'preview'"
            >预览</button>
          </div>

          <!-- 正文编辑区 -->
          <textarea
            v-if="editMode === 'edit'"
            ref="contentRef"
            v-model="form.content"
            class="content-area"
            placeholder="支持 Markdown 语法：**加粗** *斜体* `代码` [链接](url)"
            @keydown="handleKeydown"
          />
          <!-- 预览区 -->
          <div
            v-else
            class="preview-area"
            v-html="renderedContent"
            @click="onPreviewClick"
          />

          <!-- 双向链接面板 -->
          <BacklinksPanel
            v-if="props.note"
            :note-id="props.note.id"
            @open="emit('open', $event)"
          />

          <!-- 插入双链 · 笔记选择浮层 -->
          <Transition name="modal">
            <div v-if="showLinkPicker" class="link-picker-overlay" @click.self="closeLinkPicker">
              <div class="link-picker">
                <div class="lp-head">
                  <span>插入双链 · 选择目标笔记</span>
                  <button class="lp-close" @click="closeLinkPicker">✕</button>
                </div>
                <input
                  v-model="linkQuery"
                  class="lp-search"
                  placeholder="搜索笔记标题…"
                  autofocus
                  @keyup.enter.prevent="linkCandidates[0] && insertLink(linkCandidates[0].id)"
                />
                <ul class="lp-list">
                  <li
                    v-for="n in linkCandidates"
                    :key="n.id"
                    class="lp-item"
                    @click="insertLink(n.id)"
                  >
                    <span class="lp-title">{{ n.title || '未命名笔记' }}</span>
                    <span class="lp-id">{{ n.id }}</span>
                  </li>
                  <li v-if="!linkCandidates.length" class="lp-empty">没有匹配的笔记</li>
                </ul>
              </div>
            </div>
          </Transition>

          <!-- 底部信息栏 -->
          <div class="editor-footer">
            <span class="word-count">
              {{ wordCount }} 字 · {{ charCount }} 字符
            </span>
            <div class="editor-actions">
              <button class="btn-cancel" @click="cancel">取消</button>
              <button
                class="btn-save"
                :disabled="!form.title.trim()"
                @click="save"
              >
                {{ editing ? '保存' : '创建' }}
                <span class="shortcut-hint">Ctrl+S</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick } from 'vue'
import type { Note } from '../types'
import { SPINE_COLORS } from '../modules/study/types'
import { renderMarkdown, countWords, countChars } from '../utils/markdown'
import { useStudy } from '../modules/study'
import { resolveTargetId } from '../modules/study/note-links'
import BacklinksPanel from './BacklinksPanel.vue'

const props = defineProps<{
  visible: boolean
  editing: boolean
  note?: Note | null
  /** 从块级引用跳转而来：打开后定位到该块锚点 */
  blockId?: string | null
}>()

const emit = defineEmits<{
  save: [data: { title: string; content: string; tags: string[]; isAtomic: boolean }]
  close: []
  open: [noteId: string]
  openBlock: [noteId: string, blockId: string]
}>()

const titleRef = ref<HTMLInputElement | null>(null)
const contentRef = ref<HTMLTextAreaElement | null>(null)

const form = reactive({
  title: '',
  content: '',
  tags: [] as string[],
  isAtomic: false,
})

const tagInput = ref('')
const editMode = ref<'edit' | 'preview'>('edit')

const study = useStudy()

const renderedContent = computed(() => renderMarkdown(form.content))
const wordCount = computed(() => countWords(form.content))
const charCount = computed(() => countChars(form.content))

/** 预览区点击内联双链 [[token]] / [[token#块锚点]] → 解析目标并打开 */
function onPreviewClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  const link = target?.closest('.wikilink') as HTMLElement | null
  if (!link) return
  const token = link.getAttribute('data-wikilink')
  if (!token) return
  const id = resolveTargetId(token, study.notes.value)
  if (!id) return
  const blockId = link.getAttribute('data-blockid')
  if (blockId) emit('openBlock', id, blockId)
  else emit('open', id)
}

/** 在光标所在行尾插入块锚点 ^id（Obsidian 风格，便于被 [[笔记#id]] 引用） */
function insertBlockAnchor() {
  const ta = contentRef.value
  const id = 'b' + Math.random().toString(36).slice(2, 8)
  const caret = ta ? (ta.selectionStart ?? form.content.length) : form.content.length
  const nl = form.content.indexOf('\n', caret)
  const end = nl === -1 ? form.content.length : nl
  const anchor = ` ^${id}`
  form.content = form.content.slice(0, end) + anchor + form.content.slice(end)
  nextTick(() => {
    if (!ta) return
    const pos = end + anchor.length
    ta.focus()
    ta.setSelectionRange(pos, pos)
  })
}

/** 插入双链浮层：列出除自身外的笔记，选中后于光标处插入 [[id]] */
const showLinkPicker = ref(false)
const linkQuery = ref('')
const linkCandidates = computed(() => {
  const q = linkQuery.value.trim().toLowerCase()
  const selfId = props.note?.id ?? null
  return study.notes.value
    .filter(n => n.id !== selfId)
    .filter(n => !q || (n.title || '').toLowerCase().includes(q))
    .slice(0, 30)
})
function openLinkPicker() {
  showLinkPicker.value = true
  linkQuery.value = ''
}
function closeLinkPicker() {
  showLinkPicker.value = false
}
function insertLink(noteId: string) {
  const ta = contentRef.value
  const token = `[[${noteId}]]`
  const caret = ta ? (ta.selectionStart ?? form.content.length) : form.content.length
  form.content = form.content.slice(0, caret) + token + form.content.slice(caret)
  closeLinkPicker()
  nextTick(() => {
    if (!ta) return
    const pos = caret + token.length
    ta.focus()
    ta.setSelectionRange(pos, pos)
  })
}

/** 定位到指定块锚点（滚动 textarea 并选中） */
function focusBlockAnchor(blockId: string) {
  const ta = contentRef.value
  if (!ta) return
  const escaped = blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = form.content.match(new RegExp(`\\^${escaped}`))
  if (!m || m.index === undefined) return
  ta.focus()
  ta.setSelectionRange(m.index, m.index + ('^' + blockId).length)
}

watch(() => props.visible, async (v) => {
  if (v) {
    editMode.value = 'edit'
    if (props.note) {
      form.title = props.note.title
      form.content = props.note.content
      form.tags = [...props.note.tags]
      form.isAtomic = !!props.note.isAtomic
    } else {
      form.title = ''
      form.content = ''
      form.tags = []
      form.isAtomic = false
    }
    tagInput.value = ''
    await nextTick()
    titleRef.value?.focus()
    if (props.blockId) {
      editMode.value = 'edit'
      await nextTick()
      focusBlockAnchor(props.blockId)
    }
  }
})

function handleKeydown(e: KeyboardEvent) {
  // Ctrl+S or Cmd+S → 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    save()
  }
  // Escape → 取消
  if (e.key === 'Escape') {
    cancel()
  }
}

function addTag() {
  const t = tagInput.value.trim()
  if (t && !form.tags.includes(t)) {
    form.tags.push(t)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter(t => t !== tag)
}

function handleBackspace() {
  if (!tagInput.value && form.tags.length > 0) {
    form.tags.pop()
  }
}

function save() {
  if (!form.title.trim()) return
  emit('save', {
    title: form.title.trim(),
    content: form.content.trim(),
    tags: [...form.tags],
    isAtomic: form.isAtomic,
  })
}

function cancel() {
  emit('close')
}

function chipStyle(tag: string) {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const color = SPINE_COLORS[hash % SPINE_COLORS.length]
  return {
    background: color + '22',
    borderColor: color + '44',
    color,
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.editor-card {
  width: 560px;
  max-width: 90vw;
  max-height: 85vh;
  background: #18181f;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-input {
  flex: 1;
  font-size: 20px;
  font-weight: 600;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: var(--text-disabled);
  font-family: inherit;
  outline: none;
}

.title-input::placeholder {
  color: rgba(255,255,255,0.25);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255,255,255,0.12);
  color: var(--text-disabled);
}

/* 标签 */
.tag-section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid;
}

.tag-remove {
  font-size: 14px;
  color: inherit;
  opacity: 0.5;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tag-remove:hover { opacity: 1; }

.tag-input {
  padding: 4px 8px;
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 6px;
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  min-width: 100px;
}

.tag-input:focus {
  border-color: rgba(255,255,255,0.25);
}

.tag-input::placeholder {
  color: rgba(255,255,255,0.2);
}

/* 原子笔记 + 块锚点工具 */
.editor-tools {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
}

.tool-btn.active {
  background: rgba(212, 165, 116, 0.16);
  border-color: rgba(212, 165, 116, 0.5);
  color: var(--accent, #d4a574);
}

/* 插入双链 · 笔记选择浮层 */
.link-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.link-picker {
  width: 420px;
  max-width: 88vw;
  max-height: 70vh;
  background: #1e1e26;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.lp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.lp-close {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.lp-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.lp-search {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.lp-search:focus {
  border-color: rgba(255, 255, 255, 0.25);
}

.lp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.lp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.lp-item:hover {
  background: rgba(124, 92, 252, 0.12);
}

.lp-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.lp-id {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.lp-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  padding: 10px;
  text-align: center;
}

/* 模式切换标签 */
.editor-tabs {
  display: flex;
  gap: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
}

.tab-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:first-child {
  border-right: 1px solid rgba(255,255,255,0.08);
}

.tab-btn:hover {
  color: rgba(255,255,255,0.6);
}

.tab-btn.active {
  background: rgba(255,255,255,0.08);
  color: var(--text-disabled);
}

/* 正文编辑区 */
.content-area {
  width: 100%;
  min-height: 180px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: var(--bg-surface);
  color: rgba(255,255,255,0.75);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.content-area:focus {
  border-color: rgba(255,255,255,0.2);
}

.content-area::placeholder {
  color: rgba(255,255,255,0.2);
}

/* 预览区 */
.preview-area {
  width: 100%;
  min-height: 180px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: var(--bg-surface);
  color: rgba(255,255,255,0.75);
  font-size: 14px;
  line-height: 1.7;
  overflow-y: auto;
  box-sizing: border-box;
}

.preview-area :deep(h1),
.preview-area :deep(h2),
.preview-area :deep(h3),
.preview-area :deep(h4),
.preview-area :deep(h5),
.preview-area :deep(h6) {
  margin: 0.5em 0 0.25em;
  color: var(--text-disabled);
  font-weight: 600;
}

.preview-area :deep(h1) { font-size: 1.4em; }
.preview-area :deep(h2) { font-size: 1.2em; }
.preview-area :deep(h3) { font-size: 1.1em; }

.preview-area :deep(p) {
  margin: 0.4em 0;
}

.preview-area :deep(strong) {
  color: var(--text-disabled);
  font-weight: 600;
}

.preview-area :deep(code) {
  background: rgba(255,255,255,0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #f0c674;
}

.preview-area :deep(pre) {
  background: rgba(0,0,0,0.3);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}

.preview-area :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 13px;
  line-height: 1.5;
}

.preview-area :deep(a) {
  color: var(--accent, #d4a574);
  text-decoration: none;
}

.preview-area :deep(a:hover) {
  text-decoration: underline;
}

.preview-area :deep(.wikilink) {
  color: var(--accent, #d4a574);
  cursor: pointer;
  border-bottom: 1px dashed rgba(212, 165, 116, 0.5);
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}

.preview-area :deep(.wikilink:hover) {
  background: rgba(212, 165, 116, 0.12);
  border-bottom-color: var(--accent, #d4a574);
}

.preview-area :deep(blockquote) {
  border-left: 3px solid var(--accent, #d4a574);
  margin: 0.5em 0;
  padding: 4px 12px;
  color: rgba(255,255,255,0.5);
  background: rgba(212, 165, 116, 0.05);
  border-radius: 0 4px 4px 0;
}

.preview-area :deep(ul),
.preview-area :deep(ol) {
  padding-left: 20px;
  margin: 0.3em 0;
}

.preview-area :deep(li) {
  margin: 0.2em 0;
}

.preview-area :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.1);
  margin: 1em 0;
}

/* 底部信息栏 */
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.word-count {
  font-size: 11px;
  color: rgba(255,255,255,0.25);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.btn-cancel {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
}

.btn-save {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: var(--accent, #d4a574);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-save:hover { opacity: 0.85; }
.btn-save:disabled { opacity: 0.35; cursor: default; }

.shortcut-hint {
  font-size: 10px;
  opacity: 0.6;
  font-weight: 400;
}

/* 动画 */
.modal-enter-active { transition: all 0.25s ease-out; }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-enter-from .editor-card { transform: scale(0.95) translateY(16px); }
.modal-leave-to { opacity: 0; }
.modal-leave-to .editor-card { transform: scale(0.95); }
</style>