<template>
  <section class="rin" aria-label="待读箱">
    <div class="rin-head">
      <span class="rin-title">📥 待读箱</span>
      <span class="rin-sub">收入想读的内容（本地全文本快照），随时打开阅读或转正书架</span>
    </div>

    <!-- 录入 -->
    <form class="rin-add" @submit.prevent="onAdd">
      <input v-model="form.title" class="rin-input" placeholder="标题（可空，自动取首行）" aria-label="标题" />
      <textarea
        v-model="form.content"
        class="rin-textarea"
        rows="6"
        placeholder="粘贴 / 写下待读内容……"
        aria-label="待读内容"
      ></textarea>
      <div class="rin-add-row">
        <input v-model="form.source" class="rin-input rin-input--sm" placeholder="来源（可选）" aria-label="来源" />
        <input v-model="form.tags" class="rin-input rin-input--sm" placeholder="标签,逗号分隔" aria-label="标签" />
      </div>
      <div class="rin-actions">
        <button type="submit" class="rin-btn" :disabled="!form.content.trim()">收入待读箱</button>
        <button type="button" class="rin-btn rin-import" @click="importInput?.click()">导入文件 (.txt/.epub/.pdf)</button>
        <input ref="importInput" type="file" accept=".txt,.epub,.pdf" hidden @change="onImport" />
      </div>
    </form>

    <!-- 列表 -->
    <p v-if="inbox.length === 0" class="rin-empty">待读箱空空如也，收点想读的内容吧。</p>
    <div v-else class="rin-list">
      <div
        v-for="it in inbox"
        :key="it.id"
        class="rin-item"
        :class="{ read: it.status === 'read' }"
      >
        <div class="rin-item-main">
          <div class="rin-item-title">{{ it.title }}</div>
          <div class="rin-item-snippet">{{ snippet(it) }}</div>
          <div class="rin-item-meta">
            <span class="rin-badge" :class="it.status">{{ it.status === 'read' ? '已读' : '待读' }}</span>
            <span class="rin-time">{{ formatTime(it.createdAt) }}</span>
            <span v-if="it.source" class="rin-src">· {{ it.source }}</span>
            <span v-if="it.tags.length" class="rin-tags">{{ it.tags.map(t => '#' + t).join(' ') }}</span>
          </div>
        </div>
        <div class="rin-item-side">
          <button class="rin-link" type="button" @click="$emit('open-item', it.id)">打开阅读</button>
          <button class="rin-link" type="button" @click="onPromote(it)">转正书架</button>
          <button class="rin-del" type="button" :title="`移除《${it.title}》`" @click="onRemove(it)">✕</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useReadingInbox, parseBookFile } from '../modules/reading'
import type { InboxItem } from '../modules/reading'

defineEmits<{ (e: 'open-item', id: string): void }>()

const { inbox, addInboxItem, getInboxContent, removeInboxItem, promoteToBook } = useReadingInbox()

const form = reactive({ title: '', content: '', source: '', tags: '' })
const importInput = ref<HTMLInputElement | null>(null)

function onAdd() {
  if (!form.content.trim()) return
  addInboxItem({
    title: form.title.trim(),
    content: form.content,
    source: form.source.trim() || undefined,
    tags: form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
  })
  form.title = ''
  form.content = ''
  form.source = ''
  form.tags = ''
}

async function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  input.value = '' // 允许重复导入同名文件
  if (!file) return
  try {
    const { title, text } = await parseBookFile(file)
    if (!text) return
    addInboxItem({ title: title || file.name.replace(/\.[^.]+$/, ''), content: text })
  } catch (err) {
    console.error('[ReadingInboxPanel] 导入失败', err)
  }
}

function onPromote(it: InboxItem) {
  promoteToBook(it.id)
}

function onRemove(it: InboxItem) {
  removeInboxItem(it.id)
}

function snippet(it: InboxItem): string {
  const c = getInboxContent(it.id) || ''
  const first = c.split(/\n+/).map(p => p.trim()).find(p => p) ?? ''
  return first.length > 80 ? first.slice(0, 80) + '…' : first
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.rin {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rin-head { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.rin-title { font-size: 16px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.85); letter-spacing: 1px; }
.rin-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); letter-spacing: 0.5px; }

/* 录入 */
.rin-add { display: flex; flex-direction: column; gap: 8px; }
.rin-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.22);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  box-sizing: border-box;
}
.rin-input:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.4); }
.rin-textarea {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.22);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
}
.rin-textarea:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.4); }
.rin-add-row { display: flex; gap: 8px; }
.rin-input--sm { flex: 1; min-width: 0; }
.rin-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.rin-btn {
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  padding: 7px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.rin-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.45); }
.rin-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* 列表 */
.rin-empty { margin: 0; font-size: 12px; color: var(--text-secondary); text-align: center; padding: 18px 0; }
.rin-list { display: flex; flex-direction: column; gap: 10px; }
.rin-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.45);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.rin-item.read { opacity: 0.62; }
.rin-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.rin-item-title { font-size: 14px; color: rgba(var(--text-primary-rgb), 0.9); }
.rin-item-snippet {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rin-item-meta { display: flex; align-items: center; gap: 8px; font-size: 10px; color: rgba(var(--text-primary-rgb), 0.35); flex-wrap: wrap; }
.rin-badge { padding: 1px 7px; border-radius: 6px; font-size: 10px; }
.rin-badge.pending { background: rgba(var(--accent-rgb), 0.14); color: var(--accent); }
.rin-badge.read { background: rgba(var(--text-primary-rgb), 0.12); color: rgba(var(--text-primary-rgb), 0.5); }
.rin-tags { color: rgba(var(--accent-rgb), 0.55); }

.rin-item-side { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rin-link { border: none; background: transparent; color: var(--accent); font-size: 11px; font-family: inherit; cursor: pointer; padding: 4px 6px; border-radius: 6px; white-space: nowrap; }
.rin-link:hover { background: rgba(var(--accent-rgb), 0.1); }
.rin-del { border: none; background: transparent; color: rgba(var(--text-primary-rgb), 0.35); cursor: pointer; font-size: 12px; padding: 4px 6px; }
.rin-del:hover { color: #c46a5a; }

@media (max-width: 480px) {
  .rin { padding: 14px 14px; }
  .rin-add-row { flex-wrap: wrap; }
  .rin-input--sm { flex: 1 1 100%; }
  .rin-item { flex-wrap: wrap; }
  .rin-item-side { flex-basis: 100%; }
}
</style>
