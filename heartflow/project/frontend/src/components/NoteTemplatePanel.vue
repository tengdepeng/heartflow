<template>
  <section class="ntp" aria-label="笔记模板">
    <div class="ntp-head">
      <span class="ntp-title">📋 笔记模板</span>
      <span class="ntp-sub">模板库 · 从模板创建 · 自定义</span>
    </div>

    <div class="ntp-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['ntp-tab', { active: tab === t.key }]"
        @click="tab = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- Tab 1: 模板库 -->
    <div v-if="tab === 'library'" class="ntp-pane">
      <div class="ntp-cats">
        <button
          v-for="c in categoryChips"
          :key="c.key"
          :class="['ntp-chip', { active: activeCat === c.key }]"
          @click="activeCat = c.key"
        >{{ c.label }}</button>
      </div>
      <input v-model="keyword" class="ntp-search" placeholder="搜索模板名称 / 描述 / 标签…" />
      <div v-if="filteredTemplates.length" class="ntp-list">
        <div v-for="t in filteredTemplates" :key="t.id" class="ntp-card">
          <span class="ntp-card-icon">{{ iconOf(t.icon) }}</span>
          <div class="ntp-card-info">
            <span class="ntp-card-name">{{ t.name }}</span>
            <span class="ntp-card-desc">{{ t.description }}</span>
            <span class="ntp-card-meta">{{ catLabel(t.category) }} · 使用 {{ t.useCount }} 次{{ t.builtin ? '' : ' · 自定义' }}</span>
          </div>
          <button class="ntp-btn ntp-btn--sm" @click="useTemplate(t)">使用</button>
        </div>
      </div>
      <p v-else class="ntp-empty">没有匹配的模板</p>
    </div>

    <!-- Tab 2: 创建笔记 -->
    <div v-if="tab === 'create'" class="ntp-pane">
      <div v-if="!selectedTemplate" class="ntp-empty">先在「模板库」选择一个模板</div>
      <template v-else>
        <div class="ntp-create-head">
          <span class="ntp-create-name">{{ iconOf(selectedTemplate.icon) }} {{ selectedTemplate.name }}</span>
          <button class="ntp-btn ntp-btn--sm" @click="tab = 'library'">换模板</button>
        </div>
        <div v-for="f in selectedTemplate.fields" :key="f.key" class="ntp-field">
          <label class="ntp-field-label">{{ f.label }}<span v-if="f.required" class="ntp-req">*</span></label>
          <textarea
            v-if="f.type === 'textarea'"
            v-model="fieldValues[f.key]"
            :placeholder="f.placeholder"
            class="ntp-input ntp-input--area"
          />
          <select v-else-if="f.type === 'select'" v-model="fieldValues[f.key]" class="ntp-input">
            <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
          </select>
          <input v-else-if="f.type === 'date'" v-model="fieldValues[f.key]" type="date" class="ntp-input" />
          <input v-else-if="f.type === 'number'" v-model.number="fieldValues[f.key]" type="number" class="ntp-input" />
          <input v-else-if="f.type === 'checkbox'" :checked="!!fieldValues[f.key]" type="checkbox" class="ntp-check" @change="onCheckChange(f.key, $event)" />
          <input
            v-else-if="f.type === 'tags'"
            v-model="tagsInput[f.key]"
            :placeholder="f.placeholder"
            class="ntp-input"
          />
          <input v-else v-model="fieldValues[f.key]" :placeholder="f.placeholder" class="ntp-input" />
        </div>
        <div class="ntp-actions">
          <button class="ntp-btn ntp-btn--primary" @click="doCreate">创建笔记</button>
          <button class="ntp-btn" @click="doPreview">预览</button>
        </div>
        <div v-if="preview" class="ntp-preview">
          <div class="ntp-preview-title">{{ preview.previewTitle }}</div>
          <pre class="ntp-preview-content">{{ preview.previewContent }}</pre>
          <div v-if="preview.previewTags.length" class="ntp-preview-tags">#{{ preview.previewTags.join(' #') }}</div>
        </div>
      </template>
    </div>

    <!-- Tab 3: 自定义 -->
    <div v-if="tab === 'custom'" class="ntp-pane">
      <div class="ntp-block">
        <h3 class="ntp-block-title">从笔记创建模板</h3>
        <select v-model="customNoteId" class="ntp-input ntp-note-select">
          <option value="">选择笔记…</option>
          <option v-for="n in notes" :key="n.id" :value="n.id">{{ n.title || '未命名' }}</option>
        </select>
        <input v-model="customName" class="ntp-input ntp-custom-name" placeholder="模板名称" />
        <input v-model="customDesc" class="ntp-input ntp-custom-desc" placeholder="模板描述" />
        <select v-model="customCat" class="ntp-input ntp-custom-cat">
          <option v-for="c in categoryOptions" :key="c.key" :value="c.key">{{ c.label }}</option>
        </select>
        <button
          class="ntp-btn ntp-btn--primary ntp-save-btn"
          :disabled="!customNoteId || !customName"
          @click="doSaveFromNote"
        >保存模板</button>
      </div>
      <div class="ntp-block">
        <h3 class="ntp-block-title">自定义模板</h3>
        <div v-for="t in customTemplates" :key="t.id" class="ntp-card">
          <span class="ntp-card-icon">{{ iconOf(t.icon) }}</span>
          <div class="ntp-card-info">
            <span class="ntp-card-name">{{ t.name }}</span>
            <span class="ntp-card-desc">{{ t.description }}</span>
            <span class="ntp-card-meta">{{ catLabel(t.category) }} · 使用 {{ t.useCount }} 次</span>
          </div>
          <button class="ntp-btn ntp-btn--sm ntp-btn--danger" @click="doDelete(t.id)">删除</button>
        </div>
        <p v-if="customTemplates.length === 0" class="ntp-empty">还没有自定义模板</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useNoteTemplates, TEMPLATE_CATEGORY_LABELS } from '../modules/note/note-templates'
import type { Note } from '../types'
import type { NoteTemplate, TemplateCategory } from '../modules/note/note-templates'

const props = defineProps<{ notes: Note[] }>()
const emit = defineEmits<{ (e: 'create-note', payload: { title: string; content: string; tags: string[] }): void }>()

const templates = useNoteTemplates()

const tabs = [
  { key: 'library', label: '模板库' },
  { key: 'create', label: '创建笔记' },
  { key: 'custom', label: '自定义' },
] as const
const tab = ref<'library' | 'create' | 'custom'>('library')

const activeCat = ref<string>('all')
const keyword = ref('')
const selectedTemplate = ref<NoteTemplate | null>(null)
const fieldValues = reactive<Record<string, any>>({})
const tagsInput = reactive<Record<string, string>>({})
const preview = ref<{ previewTitle: string; previewContent: string; previewTags: string[] } | null>(null)

const customNoteId = ref('')
const customName = ref('')
const customDesc = ref('')
const customCat = ref<TemplateCategory>('work')

const categoryChips = computed(() => [
  { key: 'all', label: '全部' },
  ...Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
])

const categoryOptions = Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => ({ key, label }))

const filteredTemplates = computed(() => {
  const all = templates.getTemplates()
  const byCat = activeCat.value === 'all' ? all : all.filter(t => t.category === activeCat.value)
  const q = keyword.value.trim().toLowerCase()
  if (!q) return byCat
  return byCat.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.defaultTags.some(tag => tag.toLowerCase().includes(q)),
  )
})

const customTemplates = computed(() => templates.getTemplates().filter(t => !t.builtin))

const ICON_MAP: Record<string, string> = {
  users: '👥',
  book: '📖',
  calendar: '📅',
  'book-open': '📚',
  lightbulb: '💡',
  refresh: '🔄',
  target: '🎯',
  'graduation-cap': '🎓',
  file: '📄',
}

function iconOf(icon: string): string {
  return ICON_MAP[icon] || icon
}

function catLabel(cat: TemplateCategory): string {
  return TEMPLATE_CATEGORY_LABELS[cat] || cat
}

function useTemplate(t: NoteTemplate) {
  selectedTemplate.value = t
  for (const k of Object.keys(fieldValues)) delete fieldValues[k]
  for (const k of Object.keys(tagsInput)) delete tagsInput[k]
  const defaults = templates.getFieldDefaults(t.id)
  for (const f of t.fields) {
    if (f.type === 'tags') {
      tagsInput[f.key] = Array.isArray(defaults[f.key]) ? (defaults[f.key] as string[]).join(', ') : ''
    } else if (f.type === 'select' && f.options && f.options.length > 0 && defaults[f.key] == null) {
      fieldValues[f.key] = f.options[0]
    } else {
      fieldValues[f.key] = defaults[f.key] ?? (f.type === 'checkbox' ? false : '')
    }
  }
  preview.value = null
  tab.value = 'create'
}

function buildFieldValues(): Record<string, string | number | boolean | string[]> {
  const result: Record<string, string | number | boolean | string[]> = { ...fieldValues }
  for (const f of selectedTemplate.value?.fields ?? []) {
    if (f.type === 'tags') {
      result[f.key] = (tagsInput[f.key] || '').split(/[,，]/).map(s => s.trim()).filter(Boolean)
    }
  }
  return result
}

function onCheckChange(key: string, e: Event) {
  fieldValues[key] = (e.target as HTMLInputElement).checked
}

function doPreview() {
  if (!selectedTemplate.value) return
  preview.value = templates.previewTemplate(selectedTemplate.value.id, buildFieldValues())
}

function doCreate() {
  if (!selectedTemplate.value) return
  const result = templates.createFromTemplate(selectedTemplate.value.id, buildFieldValues())
  if (!result) return
  emit('create-note', result)
  preview.value = null
}

function doSaveFromNote() {
  const note = props.notes.find(n => n.id === customNoteId.value)
  if (!note || !customName.value) return
  templates.saveFromNote(note, customName.value, customDesc.value, customCat.value)
  customNoteId.value = ''
  customName.value = ''
  customDesc.value = ''
}

function doDelete(id: string) {
  templates.deleteTemplate(id)
}
</script>

<style scoped>
/* =============================================
   笔记模板 · 模板库/创建/自定义（INCR-106）
   ============================================= */

.ntp {
  position: relative;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.ntp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.ntp-title {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.7);
  letter-spacing: 2px;
}

.ntp-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

/* ---- Tab ---- */
.ntp-tabs {
  display: flex;
  gap: 8px;
  margin: 12px 0 10px;
}

.ntp-tab {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.55);
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ntp-tab:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
}

.ntp-tab.active {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.1);
}

.ntp-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ---- 分类与搜索 ---- */
.ntp-cats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ntp-chip {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 20px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.ntp-chip:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
}

.ntp-chip.active {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.1);
}

.ntp-search {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.75);
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  padding: 6px 10px;
  outline: none;
  transition: border-color 0.2s;
}

.ntp-search:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}

/* ---- 模板卡 ---- */
.ntp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.ntp-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: border-color 0.2s;
}

.ntp-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
}

.ntp-card-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.ntp-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.ntp-card-name {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.8);
}

.ntp-card-desc {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ntp-card-meta {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.35);
}

.ntp-empty {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- 创建 ---- */
.ntp-create-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ntp-create-name {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.8);
}

.ntp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ntp-field-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
  letter-spacing: 1px;
}

.ntp-req {
  color: #c46a5a;
  margin-left: 2px;
}

.ntp-input {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.75);
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  padding: 6px 10px;
  outline: none;
  transition: border-color 0.2s;
}

.ntp-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}

.ntp-input--area {
  min-height: 72px;
  resize: vertical;
  line-height: 1.5;
}

.ntp-check {
  accent-color: var(--accent);
}

/* ---- 操作 ---- */
.ntp-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ntp-btn {
  font-size: 12px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 6px;
  padding: 5px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.ntp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.18);
}

.ntp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ntp-btn--primary {
  color: #fff;
  background: rgba(var(--accent-rgb), 0.75);
  border-color: transparent;
}

.ntp-btn--primary:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.9);
}

.ntp-btn--sm {
  font-size: 11px;
  padding: 3px 10px;
  flex-shrink: 0;
}

.ntp-btn--danger {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
}

/* ---- 预览 ---- */
.ntp-preview {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.ntp-preview-title {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.8);
  margin-bottom: 6px;
}

.ntp-preview-content {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(var(--accent-rgb), 0.6);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
}

.ntp-preview-tags {
  margin-top: 6px;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* ---- 自定义 ---- */
.ntp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.ntp-block-title {
  margin: 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.7);
  letter-spacing: 1px;
}
</style>
