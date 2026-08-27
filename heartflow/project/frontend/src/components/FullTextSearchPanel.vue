<template>
  <section class="fts-panel" aria-label="全文搜索">
    <div class="fts-panel-head">
      <span class="fts-panel-title">🔍 全文搜索</span>
      <span class="fts-panel-sub">倒排索引 · 模糊匹配 · 高亮</span>
    </div>

    <!-- 搜索框 -->
    <div class="fts-block">
      <div class="fts-row">
        <input v-model="query" class="fts-input" placeholder="搜索时间线内容…" @keyup.enter="doSearch" />
        <button class="fts-btn fts-btn-primary" :disabled="!query.trim()" @click="doSearch">搜索</button>
      </div>
      <p v-if="searchIndex" class="fts-index-note">已索引 {{ searchIndex.entryCount }} 条 · {{ Object.keys(searchIndex.wordToIds).length }} 个词</p>
    </div>

    <!-- 结果 -->
    <div v-if="results.length" class="fts-block">
      <span class="fts-block-label">搜索结果（{{ results.length }}）</span>
      <div v-for="r in results" :key="r.entry.indexId" class="fts-result">
        <div class="fts-result-head">
          <span class="fts-result-type">{{ typeLabel(r.entry.type) }}</span>
          <span class="fts-result-score">{{ r.score.toFixed(2) }} 分</span>
        </div>
        <p class="fts-result-snippet">{{ r.entry.summary.snippet || '（无摘要）' }}</p>
        <p v-if="r.highlights.length" class="fts-result-highlight">
          <span v-for="(h, i) in r.highlights" :key="i" class="fts-highlight">{{ h }}</span>
        </p>
        <div class="fts-result-meta">
          <span>{{ r.entry.roomSource }}</span>
          <span>{{ formatTime(r.entry.timestamp) }}</span>
          <span v-if="r.matchedFields.length">命中：{{ r.matchedFields.join('、') }}</span>
        </div>
      </div>
    </div>

    <p v-else-if="searched" class="fts-hint">没有找到匹配「{{ query }}」的条目。</p>
    <p v-else-if="props.entries.length === 0" class="fts-hint">暂无索引条目可搜索。</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFullTextSearch } from '../modules/timeline-index/aggregation'
import type { SearchResult } from '../modules/timeline-index/aggregation'
import type { IndexEntry } from '../modules/timeline-index'

const props = defineProps<{ entries: IndexEntry[] }>()

const searchApi = useFullTextSearch(() => props.entries)
const query = ref('')
const results = ref<SearchResult[]>([])
const searched = ref(false)

const searchIndex = searchApi.searchIndex

function doSearch() {
  const q = query.value.trim()
  if (!q) return
  results.value = searchApi.search(q, props.entries)
  searched.value = true
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    crystal: '💎 结晶', note: '📝 笔记', emotion: '🌷 情绪',
    session: '⏱ 专注', anchor: '⚓ 心锚', output: '📤 输出',
  }
  return map[type] || type
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.fts-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.fts-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.fts-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.fts-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.fts-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.fts-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.fts-row {
  display: flex;
  gap: 8px;
}
.fts-input {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: #e8e4d8;
  font-size: 13px;
}
.fts-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.fts-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.fts-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.fts-index-note {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.fts-result {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.15);
}
.fts-result:last-child {
  border-bottom: none;
}
.fts-result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.fts-result-type {
  font-size: 13px;
  font-weight: 600;
  color: #e8e4d8;
}
.fts-result-score {
  font-size: 11px;
  color: rgba(138, 154, 122, 0.8);
}
.fts-result-snippet {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(232, 228, 216, 0.8);
}
.fts-result-highlight {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fts-highlight {
  font-size: 11px;
  color: rgba(240, 192, 64, 0.85);
  background: rgba(240, 192, 64, 0.08);
  border-radius: 4px;
  padding: 2px 6px;
}
.fts-result-meta {
  margin-top: 6px;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: rgba(232, 228, 216, 0.4);
}
.fts-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
}
</style>
