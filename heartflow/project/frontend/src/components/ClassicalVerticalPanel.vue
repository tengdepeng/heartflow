<template>
  <section class="cv-panel" aria-label="古籍竖排">
    <div class="cv-panel-head">
      <span class="cv-panel-title">📜 古籍竖排</span>
      <span class="cv-panel-sub">自右向左 · 注疏分层 · 句读切换</span>
    </div>

    <!-- 书库 -->
    <div class="cv-block">
      <span class="cv-block-label">书库 · {{ cv.books.value.length }}</span>
      <div v-if="cv.books.value.length" class="cv-book-list">
        <div
          v-for="b in cv.books.value"
          :key="b.id"
          :class="['cv-book', { active: selectedId === b.id }]"
          @click="selectBook(b.id)"
        >
          <span class="cv-book-title">{{ b.title }}</span>
          <span class="cv-book-meta">{{ b.author }} · {{ b.dynasty }} · {{ b.annotations.length }} 注</span>
          <button class="cv-book-del" @click.stop="removeBook(b.id)">×</button>
        </div>
      </div>
      <p v-else class="cv-hint">还没有古籍。录入一部，即可竖排阅读。</p>
    </div>

    <!-- 新增古籍 -->
    <div class="cv-block">
      <span class="cv-block-label">录入古籍</span>
      <div class="cv-add-row">
        <input v-model="form.title" class="cv-input cv-title" placeholder="书名（如：山海经·卷三）" />
        <input v-model="form.author" class="cv-input" placeholder="作者" />
        <input v-model="form.dynasty" class="cv-input cv-dynasty" placeholder="朝代" />
      </div>
      <textarea v-model="form.originalText" class="cv-textarea" placeholder="原文（含句读，每段一行）" rows="4"></textarea>
      <button class="cv-btn cv-btn-primary" :disabled="!form.title.trim() || !form.originalText.trim()" @click="addBook">录入</button>
    </div>

    <!-- 阅读区 -->
    <div v-if="activeBook" class="cv-block">
      <div class="cv-read-head">
        <span class="cv-read-title">{{ activeBook.title }}</span>
        <div class="cv-mode-tabs">
          <button
            v-for="m in PUNCTUATION_MODES"
            :key="m"
            :class="['cv-mode-tab', { active: mode === m }]"
            @click="mode = m"
          >{{ PUNCTUATION_MODE_META[m].label }}</button>
        </div>
      </div>
      <p class="cv-mode-hint">{{ PUNCTUATION_MODE_META[mode].hint }}</p>

      <!-- 竖排栏 -->
      <div class="cv-vertical">
        <div v-for="col in layout.columns" :key="col.index" class="cv-column">
          <div v-for="(line, i) in col.lines" :key="i" class="cv-line" :class="{ empty: line === '' }">
            {{ line }}
          </div>
        </div>
      </div>

      <!-- 注疏 -->
      <div class="cv-annotations">
        <span class="cv-block-label">注疏 · {{ activeBook.annotations.length }}</span>
        <div v-for="g in annotationGroups" :key="g.dynasty" class="cv-ann-group">
          <span class="cv-ann-dynasty">{{ g.dynasty }}</span>
          <div v-for="a in g.items" :key="a.id" class="cv-ann-item">
            <span class="cv-ann-annotator">{{ a.annotator }}</span>
            <span class="cv-ann-content">{{ a.content }}</span>
            <button class="cv-ann-del" @click="removeAnnotation(a.id)">×</button>
          </div>
        </div>
        <div class="cv-ann-add">
          <input v-model="ann.annotator" class="cv-input" placeholder="注者" />
          <input v-model="ann.dynasty" class="cv-input cv-dynasty" placeholder="朝代" />
          <input v-model="ann.content" class="cv-input cv-ann-content-input" placeholder="注释正文" />
          <button class="cv-btn" :disabled="!ann.content.trim()" @click="addAnnotation">加注</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  useClassicalVertical,
  buildVerticalLayout,
  organizeAnnotations,
  PUNCTUATION_MODES,
  PUNCTUATION_MODE_META,
} from '../modules/reading/classical-vertical'
import type { PunctuationMode } from '../modules/reading/classical-vertical'

const cv = useClassicalVertical()
onMounted(() => cv.load())

const selectedId = ref<string | null>(null)
const mode = ref<PunctuationMode>('original')
const linesPerColumn = ref(16)

const form = ref({ title: '', author: '', dynasty: '', originalText: '' })
const ann = ref({ annotator: '', dynasty: '', content: '' })

const activeBook = computed(() =>
  cv.books.value.find(b => b.id === selectedId.value) || null,
)

const layout = computed(() =>
  activeBook.value
    ? buildVerticalLayout(activeBook.value, linesPerColumn.value, mode.value)
    : { columns: [] as { index: number; lines: string[] }[], columnCount: 0, linesPerColumn: linesPerColumn.value, punctuationMode: mode.value },
)

const annotationGroups = computed(() =>
  activeBook.value ? organizeAnnotations(activeBook.value.annotations) : [],
)

function selectBook(id: string) {
  selectedId.value = id
}

function addBook() {
  const book = cv.upsertBook({
    title: form.value.title.trim(),
    author: form.value.author.trim() || '佚名',
    dynasty: form.value.dynasty.trim() || '未知',
    originalText: form.value.originalText.trim(),
    annotations: [],
  })
  form.value = { title: '', author: '', dynasty: '', originalText: '' }
  selectedId.value = book.id
}

function removeBook(id: string) {
  cv.removeBook(id)
  if (selectedId.value === id) selectedId.value = null
}

function addAnnotation() {
  if (!activeBook.value || !ann.value.content.trim()) return
  cv.addAnnotation(activeBook.value.id, {
    annotator: ann.value.annotator.trim() || '佚名',
    dynasty: ann.value.dynasty.trim() || '未知',
    content: ann.value.content.trim(),
  })
  ann.value = { annotator: '', dynasty: '', content: '' }
}

function removeAnnotation(id: string) {
  if (!activeBook.value) return
  cv.removeAnnotation(activeBook.value.id, id)
}
</script>

<style scoped>
.cv-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.cv-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.cv-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.cv-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.cv-block { margin-bottom: 12px; }
.cv-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.cv-book-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cv-book {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
}
.cv-book.active {
  border-color: rgba(140, 170, 220, 0.5);
  background: rgba(120, 150, 200, 0.12);
}
.cv-book-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #dce4f0;
}
.cv-book-meta {
  font-size: 11px;
  color: #8a97ad;
}
.cv-book-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: #c46a5a;
  font-size: 13px;
  cursor: pointer;

  min-height: 24px;
  min-width: 24px;
}
.cv-add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.cv-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
}
.cv-title { flex: 2; }
.cv-dynasty { width: 90px; }
.cv-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
  resize: vertical;
  margin-bottom: 8px;
}
.cv-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.cv-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.cv-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cv-read-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cv-read-title {
  font-size: 14px;
  font-weight: 600;
  color: #e8d9a8;
}
.cv-mode-tabs {
  display: flex;
  gap: 4px;
}
.cv-mode-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: transparent;
  color: #8a97ad;
  font-size: 11px;
  cursor: pointer;

  min-height: 26px;
}
.cv-mode-tab.active {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.cv-mode-hint {
  font-size: 11px;
  color: #7a879c;
  margin: 0 0 10px;
}
.cv-vertical {
  display: flex;
  flex-direction: row-reverse;
  gap: 12px;
  background: rgba(20, 26, 38, 0.5);
  border: 1px solid rgba(140, 160, 190, 0.15);
  border-radius: 10px;
  padding: 14px;
  overflow-x: auto;
  margin-bottom: 12px;
}
.cv-column {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(140, 160, 190, 0.25);
  padding-right: 8px;
}
.cv-line {
  writing-mode: vertical-rl;
  font-size: 18px;
  line-height: 1.6;
  color: #e8d9a8;
  min-height: 18px;
}
.cv-line.empty {
  min-height: 28px;
}
.cv-annotations {
  background: rgba(20, 26, 38, 0.4);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 12px;
}
.cv-ann-group {
  margin-bottom: 8px;
}
.cv-ann-dynasty {
  display: inline-block;
  font-size: 11px;
  color: #9fc4e8;
  background: rgba(120, 150, 200, 0.12);
  border-radius: 6px;
  padding: 2px 8px;
  margin-bottom: 6px;
}
.cv-ann-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.cv-ann-annotator {
  font-size: 12px;
  font-weight: 600;
  color: #e0a96d;
  white-space: nowrap;
}
.cv-ann-content {
  flex: 1;
  font-size: 12px;
  color: #aab6c9;
}
.cv-ann-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: #c46a5a;
  font-size: 12px;
  cursor: pointer;

  min-height: 24px;
  min-width: 24px;
}
.cv-ann-add {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.cv-ann-content-input {
  flex: 1;
  min-width: 120px;
}
.cv-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
</style>
