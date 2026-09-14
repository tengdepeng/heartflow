<template>
  <section class="classical-reader">
    <h4 class="cr-title">📜 {{ CR_TITLE_SUFFIX }}</h4>
    <p class="cr-hint">识典古籍式竖排阅读 · 自右向左 · 注疏分层 · 句读切换</p>

    <!-- 书单切换 -->
    <div class="cr-toolbar">
      <select v-model="bookId" class="cr-select">
        <option v-for="b in books" :key="b.id" :value="b.id">{{ b.title }} · {{ b.dynasty }}</option>
      </select>

      <!-- 句读 / 标点切换 -->
      <div class="cr-seg" role="group" aria-label="标点模式">
        <button
          v-for="m in PUNCTUATION_MODES"
          :key="m"
          :class="['cr-seg-btn', { active: mode === m }]"
          @click="mode = m"
          :title="PUNCTUATION_MODE_META[m].hint"
        >{{ PUNCTUATION_MODE_META[m].label }}</button>
      </div>

      <!-- 影印对照：原文 / 注疏增强 -->
      <div class="cr-seg" role="group" aria-label="视图">
        <button :class="['cr-seg-btn', { active: view === 'plain' }]" @click="view = 'plain'">纯文本</button>
        <button :class="['cr-seg-btn', { active: view === 'annotated' }]" @click="view = 'annotated'">注疏增强</button>
      </div>

      <!-- 栏线开关 -->
      <label class="cr-switch">
        <input type="checkbox" v-model="metrics.showColumnLines" />
        <span>栏线</span>
      </label>
    </div>

    <!-- 竖排书页 -->
    <div class="cr-page" :class="{ 'no-column-lines': !metrics.showColumnLines }"
         :style="{ '--cr-line-spacing': lineSpacingCss }">
      <div class="cr-col" v-for="col in layout.columns" :key="col.index">
        <span v-for="(ch, i) in col.lines" :key="i" class="cr-char" :class="{ 'is-blank': ch === '' }">
          <template v-if="ch !== ''">{{ ch }}</template>
          <template v-else><span class="cr-void"></span></template>
        </span>
      </div>
      <div v-if="layout.columns.length === 0" class="cr-empty">暂无古籍文本，请先添加。</div>
    </div>

    <p class="cr-meta">共 {{ layout.columnCount }} 栏 · 每栏 {{ layout.linesPerColumn }} 行 · {{ book?.author }}（{{ book?.dynasty }}）</p>

    <!-- 注疏分层 -->
    <details v-if="annotations.length" class="cr-annotations" open>
      <summary>注疏分层（{{ annotations.length }}）</summary>
      <div class="cr-ann-group" v-for="g in annotationGroups" :key="g.dynasty">
        <div class="cr-ann-dynasty">{{ g.dynasty }}</div>
        <div class="cr-ann-item" v-for="a in g.items" :key="a.id">
          <span class="cr-ann-author">{{ a.annotator }}</span>
          <span class="cr-ann-content">{{ a.content }}</span>
        </div>
      </div>
    </details>

    <!-- 新增注疏 -->
    <div v-if="book" class="cr-add-ann">
      <input v-model="newAnn.annotator" class="cr-input cr-input-sm" placeholder="注者" />
      <input v-model="newAnn.dynasty" class="cr-input cr-input-sm" placeholder="朝代" />
      <input v-model="newAnn.content" class="cr-input" placeholder="注疏正文" @keydown.enter.prevent="addAnnotation" />
      <button class="cr-btn" @click="addAnnotation">加注</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  useClassicalVertical,
  buildVerticalLayout,
  organizeAnnotations,
  PUNCTUATION_MODES,
  PUNCTUATION_MODE_META,
  defaultVerticalMetrics,
  type PunctuationMode,
  type ClassicalView,
  type VerticalMetrics,
  type ClassicalBook,
} from '../modules/reading'

const CR_TITLE_SUFFIX = '古籍竖排 · 知微阁'
const LINES_PER_COLUMN = 22

// 内建样书，供未入库时直接示范竖排效果
const SAMPLE_BOOK: Omit<ClassicalBook, 'id'> = {
  title: '《山海经 · 南山经》',
  author: '佚名',
  dynasty: '先秦',
  originalText: '南山经之首曰鹊山。其首曰招摇之山，临于西海之上，多桂，多金玉。有草焉，其状如韭而青华，其名曰祝余，食之不饥。有木焉，其状如谷而黑理，其华四照，其名曰迷谷，佩之不迷。有兽焉，其状如禺而白耳，伏行人走，其名曰狌狌，食之善走。西海之山，其状如䳅鹊，其文画夜而白耳。',
  modernText: '南山经之首曰鹊山。其首曰招摇之山，临于西海之上，多桂，多金玉。有草焉，其状如韭而青华，其名曰祝余，食之不饥。有木焉，其状如谷而黑理，其华四照，其名曰迷谷，佩之不迷。有兽焉，其状如禺而白耳，伏行人走，其名曰狌狌，食之善走。西海之山，其状如䳅鹊，其文画夜而白耳。',
  annotations: [
    { id: 'a1', annotator: '郭璞', dynasty: '晋', content: '山经之首，名山之首也。' },
    { id: 'a2', annotator: '郝懿行', dynasty: '清', content: '祝余：草名，食之不饥。' },
    { id: 'a3', annotator: '袁珂', dynasty: '当代', content: '狌狌：猿类异名，善走。' },
  ],
}

const { books, load, upsertBook, addAnnotation: pushAnnotation } = useClassicalVertical()

const bookId = ref('')
const mode = ref<PunctuationMode>('original')
const view = ref<ClassicalView>('annotated')
const metrics = reactive<VerticalMetrics>(defaultVerticalMetrics(LINES_PER_COLUMN))

const book = computed(() => books.value.find(b => b.id === bookId.value))

const layout = computed(() => {
  if (!book.value) return { columns: [], columnCount: 0, linesPerColumn: LINES_PER_COLUMN, punctuationMode: mode.value }
  return buildVerticalLayout(book.value, LINES_PER_COLUMN, mode.value)
})

const annotations = computed(() => (view.value === 'annotated' ? (book.value?.annotations ?? []) : []))
const annotationGroups = computed(() => organizeAnnotations(annotations.value))

const newAnn = ref({ annotator: '', dynasty: '', content: '' })
function addAnnotation() {
  if (!book.value || !newAnn.value.content.trim()) return
  pushAnnotation(book.value.id, {
    annotator: newAnn.value.annotator.trim() || '佚名',
    dynasty: newAnn.value.dynasty.trim() || '未知',
    content: newAnn.value.content.trim(),
  })
  newAnn.value.content = ''
}

const lineSpacingCss = computed(() => `${metrics.lineSpacing}em`)

onMounted(() => {
  load()
  if (books.value.length === 0) {
    upsertBook(SAMPLE_BOOK)
  }
  if (!bookId.value && books.value.length) bookId.value = books.value[0].id
})
</script>

<style scoped>
.classical-reader {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
}
.cr-title { margin: 0; }
.cr-hint { margin: 4px 0 12px; font-size: 12px; opacity: 0.62; }

.cr-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.cr-select {
  padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05); color: inherit; font-size: 13px;
}
.cr-seg { display: inline-flex; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.14); }
.cr-seg-btn {
  border: none; background: rgba(255,255,255,0.04); color: inherit; font-size: 12px;
  padding: 6px 10px; cursor: pointer;
}
.cr-seg-btn + .cr-seg-btn { border-left: 1px solid rgba(255,255,255,0.14); }
.cr-seg-btn.active { background: rgba(107,159,196,0.32); color: #fff; }
.cr-switch { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; opacity: 0.8; }

/* 书页：自右向左的竖排列 */
.cr-page {
  direction: rtl;
  display: flex;
  gap: var(--cr-line-spacing);
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 18px 20px;
  min-height: 32px;
  overflow-x: auto;
}
.cr-col { display: flex; flex-direction: column; gap: 0.25em; }
.cr-page.no-column-lines .cr-col + .cr-col { /* 仍保留间距 */ }
.cr-char {
  width: 1.35em; height: 1.35em; line-height: 1.35em;
  font-size: 21px; text-align: center; color: #efe6d5;
  border-bottom: 1px solid transparent;
}
.cr-void { display: inline-block; }
.cr-char.is-blank { color: transparent; border-bottom-color: rgba(255,255,255,0.05); }
.cr-empty { direction: ltr; font-size: 14px; opacity: 0.5; padding: 10px; }

/* 栏线：在每栏之间可视分隔 */
.cr-col {
  border-inline-end: 1px solid rgba(255, 255, 255, 0.12);
  padding-inline-end: calc(var(--cr-line-spacing) / 2);
}
.cr-page.no-column-lines .cr-col { border-inline-end: none; }

.cr-meta { margin: 10px 2px 0; font-size: 12px; opacity: 0.55; text-align: left; direction: ltr; }

.cr-annotations { margin-top: 14px; font-size: 13px; direction: ltr; }
.cr-ann-group { margin: 8px 0; }
.cr-ann-dynasty {
  display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px;
  background: rgba(90,184,160,0.16); color: #a7e3c9; margin-bottom: 6px;
}
.cr-ann-item { display: flex; gap: 8px; align-items: baseline; padding: 2px 0; }
.cr-ann-author { color: #6b9fc4; font-weight: 600; flex: 0 0 auto; }
.cr-ann-content { opacity: 0.85; }

.cr-add-ann { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
.cr-input {
  padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05); color: inherit; font-size: 13px;
}
.cr-input-sm { width: 74px; }
.cr-input:last-of-type { flex: 1; min-width: 140px; }
.cr-btn {
  padding: 6px 12px; border-radius: 8px; border: none; background: rgba(107,159,196,0.2);
  color: #cfe0ff; font-size: 13px; cursor: pointer;
}
.cr-btn:hover { background: rgba(107,159,196,0.32); }
</style>