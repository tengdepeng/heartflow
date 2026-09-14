<template>
  <section class="mdx" aria-label="笔记导出">
    <div class="mdx-head">
      <span class="mdx-title">📤 笔记导出</span>
      <span class="mdx-sub">单篇 · 批量 · Markdown / HTML / PDF</span>
    </div>

    <!-- 笔记选择 -->
    <p class="mdx-subtitle">选择笔记</p>
    <div v-if="notes.length" class="mdx-list">
      <label v-for="n in notes" :key="n.id" class="mdx-item" :class="{ active: selectedIds.includes(n.id) }">
        <input type="checkbox" :checked="selectedIds.includes(n.id)" @change="toggleSelect(n.id)" />
        <span class="mdx-item-title">{{ n.title || '未命名' }}</span>
        <span v-if="n.tags.length" class="mdx-item-tags">#{{ n.tags.slice(0, 2).join(' #') }}</span>
      </label>
    </div>
    <p v-else class="mdx-empty">书架还空着，先写一篇笔记吧。</p>

    <!-- 格式与选项 -->
    <p class="mdx-subtitle">导出设置</p>
    <div class="mdx-format">
      <button
        v-for="f in formats"
        :key="f.value"
        class="mdx-fmt"
        :class="{ active: format === f.value }"
        @click="format = f.value"
      >{{ f.label }}</button>
    </div>
    <div class="mdx-opts">
      <label class="mdx-opt"><input type="checkbox" v-model="opts.includeFrontmatter" /> 前置元数据</label>
      <label class="mdx-opt"><input type="checkbox" v-model="opts.includeMetadata" /> 元数据块</label>
      <label class="mdx-opt"><input type="checkbox" v-model="opts.includeTableOfContents" /> 目录</label>
      <label class="mdx-opt"><input type="checkbox" v-model="opts.includeTagLinks" /> 标签链接</label>
    </div>

    <!-- 操作 -->
    <div class="mdx-actions">
      <button class="mdx-btn" :disabled="!selectedNote" @click="doExportSingle">导出单篇</button>
      <button class="mdx-btn" :disabled="!selectedIds.length" @click="doExportBatch">批量导出</button>
      <button class="mdx-btn" :disabled="!selectedNote" @click="doCopy">复制</button>
      <button class="mdx-btn" :disabled="!selectedNote" @click="doPreview">预览</button>
    </div>

    <!-- 结果 -->
    <div v-if="result" class="mdx-result">
      <div class="mdx-result-head">
        <span class="mdx-result-name">{{ result.filename }}</span>
        <span class="mdx-result-meta">{{ result.noteCount }} 篇 · {{ result.totalChars }} 字符</span>
      </div>
      <button class="mdx-btn mdx-btn--small" @click="doDownload">下载</button>
    </div>

    <!-- 预览 -->
    <pre v-if="preview" class="mdx-preview">{{ preview }}</pre>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useMarkdownExport } from '../modules/note/markdown-export'
import type { Note } from '../types'
import type { ExportFormat, ExportResult, MarkdownExportOptions } from '../modules/note/markdown-export'

const props = defineProps<{ notes: Note[] }>()

const {
  exportToMarkdown,
  exportToHTML,
  exportToPDF,
  batchExport,
  copyToClipboard,
  downloadAsFile,
  previewExport,
} = useMarkdownExport()

const selectedIds = ref<string[]>([])
const format = ref<ExportFormat>('markdown')
const opts = reactive({
  includeFrontmatter: true,
  includeMetadata: true,
  includeTableOfContents: false,
  includeTagLinks: true,
})
const result = ref<ExportResult | null>(null)
const preview = ref('')

const formats: { value: ExportFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'pdf', label: 'PDF' },
]

const selectedNote = computed<Note | null>(() => {
  const id = selectedIds.value[0]
  return id ? props.notes.find(n => n.id === id) || null : null
})

function buildOptions(): Partial<MarkdownExportOptions> {
  return { ...opts, format: format.value }
}

function toggleSelect(id: string): void {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function doExportSingle(): void {
  const note = selectedNote.value
  if (!note) return
  result.value =
    format.value === 'html'
      ? exportToHTML(note, buildOptions())
      : format.value === 'pdf'
        ? exportToPDF(note, buildOptions())
        : exportToMarkdown(note, buildOptions())
  preview.value = ''
}

function doExportBatch(): void {
  const selected = props.notes.filter(n => selectedIds.value.includes(n.id))
  result.value = batchExport(selected, buildOptions())
  preview.value = ''
}

async function doCopy(): Promise<void> {
  const note = selectedNote.value
  if (!note) return
  await copyToClipboard(note, buildOptions())
}

function doPreview(): void {
  const note = selectedNote.value
  if (!note) return
  preview.value = previewExport(note, buildOptions(), 300)
}

function doDownload(): void {
  if (!result.value) return
  downloadAsFile(result.value)
}
</script>

<style scoped>
/* =============================================
   笔记导出 · 单篇/批量 · Markdown/HTML/PDF（INCR-104）
   ============================================= */

.mdx {
  position: relative;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.mdx-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.mdx-title {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.7);
  letter-spacing: 2px;
}

.mdx-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

.mdx-subtitle {
  margin: 14px 0 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  letter-spacing: 2px;
}

/* ---- 笔记列表 ---- */
.mdx-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.mdx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mdx-item:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
}

.mdx-item.active {
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.1);
}

.mdx-item input {
  accent-color: var(--accent);
}

.mdx-item-title {
  color: rgba(var(--accent-rgb), 0.75);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mdx-item-tags {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
  flex-shrink: 0;
}

.mdx-empty {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- 格式与选项 ---- */
.mdx-format {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mdx-fmt {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.6);
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mdx-fmt:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
}

.mdx-fmt.active {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.1);
}

.mdx-opts {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.mdx-opt {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
  cursor: pointer;
}

.mdx-opt input {
  accent-color: var(--accent);
}

/* ---- 操作 ---- */
.mdx-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.mdx-btn {
  font-size: 12px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 6px;
  padding: 5px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.mdx-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.18);
}

.mdx-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mdx-btn--small {
  font-size: 11px;
  padding: 2px 10px;
}

/* ---- 结果 ---- */
.mdx-result {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.mdx-result-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.mdx-result-name {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mdx-result-meta {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* ---- 预览 ---- */
.mdx-preview {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 11px;
  line-height: 1.6;
  color: rgba(var(--accent-rgb), 0.6);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 220px;
  overflow-y: auto;
}
</style>
