<template>
  <section data-enter class="nsearch-panel">
    <header class="nsearch-head">
      <span class="nsearch-title">🔍 全库检索</span>
      <span v-if="statsAndNotes" class="nsearch-stats">{{ statsAndNotes.documents }} 笔记 · {{ statsAndNotes.terms }} 词条</span>
    </header>

    <div class="nsearch-inputbox">
      <input v-model="q" class="nsearch-input" type="text" placeholder="在思绪书房的全部笔记中查找…" />
      <button v-if="q" class="nsearch-clear" @click="q = ''">✕</button>
    </div>

    <!-- 建议 -->
    <div v-if="q && suggestions.length && !results.length" class="nsearch-suggest">
      <button v-for="s in suggestions" :key="s.type + s.text" class="nsearch-suggestion" @click="applySuggestion(s.text)">
        <span class="nsearch-sug-text">{{ s.text }}</span>
        <span class="nsearch-sug-meta">{{ s.type }}</span>
      </button>
    </div>

    <!-- 结果 -->
    <div v-if="results.length" class="nsearch-results">
      <div v-for="r in results" :key="r.note.id" class="nsearch-result" @click="emitOpen(r.note.id)">
        <div class="nsearch-result-title" v-html="titleHtml(r)"></div>
        <div class="nsearch-result-snippet" v-if="contentSnippet(r)" v-html="contentHtml(r)"></div>
        <div class="nsearch-result-meta">
          <span>相关度 {{ r.score }}</span>
          <span v-for="t in r.note.tags.slice(0, 3)" :key="t" class="nsearch-result-tag">#{{ t }}</span>
        </div>
      </div>
      <p class="nsearch-results-count">找到 {{ results.length }} 条</p>
    </div>
    <p v-if="q && !results.length && !suggestions.length" class="nsearch-empty">没有匹配的笔记。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Note } from '../types'
import { useFulltextSearch, type SearchResult } from '../modules/note/fulltext-search'

const props = defineProps<{ notes: Note[] }>()
const emit = defineEmits<{ (e: 'open', id: string): void }>()

const q = ref('')
const engine = useFulltextSearch()

const activeNotes = computed(() => props.notes.filter((n) => !n.deletedAt))

const statsAndNotes = computed(() => {
  engine.buildIndex(activeNotes.value)
  const s = engine.getStats()
  return { documents: s.indexedDocuments, terms: s.indexedTerms }
})

const results = computed<SearchResult[]>(() => {
  if (!q.value.trim()) return []
  engine.buildIndex(activeNotes.value)
  // sigmoid 归一化使零分也被映射到 50，故需排除「未命中任何字段」的结果
  return engine.search(q.value, activeNotes.value, { limit: 12 }).filter((r) => r.matches.length > 0)
})

const suggestions = computed(() => {
  if (!q.value.trim()) return []
  engine.buildIndex(activeNotes.value)
  return engine.suggest(q.value.trim(), activeNotes.value, 6)
})

function applySuggestion(text: string) { q.value = text }
function emitOpen(id: string) { emit('open', id) }

// ---- 安全高亮：先转义，再仅对转义串插入 <mark>（规避 XSS）----
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function mark(text: string): string {
  const tokens = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length)
  let html = esc(text)
  for (const t of tokens) {
    html = html.replace(new RegExp(esc(t), 'gi'), (m) => `<mark>${m}</mark>`)
  }
  return html
}
function titleHtml(r: SearchResult): string {
  return mark(r.note.title)
}
function contentSnippet(r: SearchResult): string {
  const c = r.note.content
  const query = q.value.trim().toLowerCase()
  if (!query || !c) return ''
  const idx = c.toLowerCase().indexOf(query)
  if (idx < 0) return c.slice(0, 110) + (c.length > 110 ? '…' : '')
  const start = Math.max(0, idx - 30)
  const end = Math.min(c.length, idx + query.length + 60)
  return (start > 0 ? '…' : '') + c.slice(start, end) + (end < c.length ? '…' : '')
}
function contentHtml(r: SearchResult): string {
  return mark(contentSnippet(r))
}
</script>

<style scoped>
.nsearch-panel { padding: 16px; border-radius: 12px; background: var(--bg-card); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.nsearch-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.nsearch-title { font-size: 14px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.75); }
.nsearch-stats { font-size: 11px; opacity: 0.45; }

.nsearch-inputbox { position: relative; }
.nsearch-input { width: 100%; padding: 9px 30px 9px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: inherit; font-size: 13px; }
.nsearch-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: inherit; opacity: 0.5; cursor: pointer; }

.nsearch-suggest { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.nsearch-suggestion { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
.nsearch-sug-meta { font-size: 10px; opacity: 0.45; }

.nsearch-results { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.nsearch-result { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); cursor: pointer; }
.nsearch-result:hover { background: rgba(var(--accent-rgb), 0.08); }
.nsearch-result-title { font-size: 13px; color: #e8dcc8; }
.nsearch-result-title :deep(mark) { background: rgba(240,192,64,0.3); color: inherit; border-radius: 2px; }
.nsearch-result-snippet { margin-top: 4px; font-size: 12px; opacity: 0.65; line-height: 1.6; }
.nsearch-result-snippet :deep(mark) { background: rgba(240,192,64,0.2); color: inherit; }
.nsearch-result-meta { display: flex; gap: 8px; align-items: center; margin-top: 6px; font-size: 10px; opacity: 0.5; }
.nsearch-result-tag { color: rgba(var(--accent-rgb), 0.7); }
.nsearch-results-count { font-size: 11px; opacity: 0.4; text-align: right; }
.nsearch-empty { font-size: 12px; opacity: 0.5; margin-top: 12px; }
</style>