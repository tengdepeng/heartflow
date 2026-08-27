<template>
  <section class="lt-panel" aria-label="信笺">
    <div class="lt-panel-head">
      <span class="lt-panel-title">✉️ 信笺</span>
      <span class="lt-panel-sub">聊天信笺 · 按人分束 · 本地陈列</span>
    </div>

    <!-- 概览 -->
    <div class="lt-block">
      <div class="lt-stats">
        <div class="lt-stat">
          <span class="lt-stat-num">{{ stat.total }}</span>
          <span class="lt-stat-label">消息</span>
        </div>
        <div class="lt-stat">
          <span class="lt-stat-num">{{ stat.messageCount }}</span>
          <span class="lt-stat-label">信束</span>
        </div>
        <div class="lt-stat">
          <span class="lt-stat-num">{{ correspondents.length }}</span>
          <span class="lt-stat-label">对象</span>
        </div>
      </div>
      <p v-if="stat.dateRangeStart" class="lt-range-note">
        时间跨度：{{ stat.dateRangeStart.slice(0, 10) }} → {{ stat.dateRangeEnd?.slice(0, 10) }}
      </p>
    </div>

    <!-- 导入 -->
    <div class="lt-block">
      <span class="lt-block-label">导入信笺</span>
      <div class="lt-import-row">
        <input v-model="correspondent" class="lt-input lt-name" placeholder="信的对象（如：老友）" />
      </div>
      <textarea v-model="messagesText" class="lt-input lt-textarea" placeholder="每行一条消息，格式：时间|发送者|内容&#10;如：2026-08-01 20:00|我|今天过得怎么样？" />
      <button class="lt-btn lt-btn-primary" :disabled="!canImport" @click="importBundle">导入</button>
    </div>

    <!-- 列表 -->
    <div v-if="filteredBundles.length" class="lt-block">
      <div class="lt-list-head">
        <span class="lt-block-label">信束（{{ filteredBundles.length }}）</span>
        <input v-model="query" class="lt-input lt-search" placeholder="搜索对象或内容…" />
      </div>
      <div v-for="b in filteredBundles" :key="b.id" class="lt-bundle">
        <div class="lt-bundle-head">
          <span class="lt-bundle-name">{{ b.correspondent }}</span>
          <span class="lt-bundle-meta">{{ bundleMessageCount(b) }} 条 · {{ bundleRange(b) }}</span>
          <button class="lt-btn lt-btn-danger" @click="remove(b.id)">删除</button>
        </div>
        <div v-if="expandedId === b.id" class="lt-messages">
          <div v-for="(m, i) in b.messages" :key="i" class="lt-msg">
            <span class="lt-msg-from">{{ m.from }}</span>
            <span class="lt-msg-text">{{ m.text }}</span>
            <span class="lt-msg-time">{{ m.ts.slice(0, 16) }}</span>
          </div>
        </div>
        <button v-else class="lt-expand" @click="expandedId = b.id">展开 {{ b.messages.length }} 条消息</button>
      </div>
    </div>
    <p v-else class="lt-hint">还没有信笺。导入一段聊天记录，按人分束陈列。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLetters, lettersStat, distinctCorrespondents, searchLetterBundles, bundleMessageCount, bundleDateRange } from '../modules/study/letters'

const lettersApi = useLetters()

const correspondent = ref('')
const messagesText = ref('')
const query = ref('')
const expandedId = ref<string | null>(null)

const stat = computed(() => lettersStat(lettersApi.letters.value))
const correspondents = computed(() => distinctCorrespondents(lettersApi.letters.value))
const filteredBundles = computed(() => searchLetterBundles(lettersApi.letters.value, query.value))

const canImport = computed(() => correspondent.value.trim().length > 0 && parseMessages().length > 0)

function parseMessages(): { ts: string; from: string; text: string }[] {
  return messagesText.value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('|')
      if (parts.length >= 3) {
        return { ts: parts[0].trim(), from: parts[1].trim(), text: parts.slice(2).join('|').trim() }
      }
      return { ts: new Date().toISOString(), from: '我', text: line }
    })
    .filter(m => m.text)
}

function importBundle() {
  const messages = parseMessages()
  if (correspondent.value.trim() && messages.length > 0) {
    lettersApi.importBundle(correspondent.value, messages)
    correspondent.value = ''
    messagesText.value = ''
  }
}

function remove(id: string) {
  lettersApi.removeBundle(id)
  if (expandedId.value === id) expandedId.value = null
}

function bundleRange(b: { messages: { ts: string }[] }): string {
  const r = bundleDateRange(b as never)
  if (!r) return '—'
  return `${r.start.slice(0, 10)} → ${r.end.slice(0, 10)}`
}
</script>

<style scoped>
.lt-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.lt-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.lt-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.lt-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.lt-block { margin-bottom: 12px; }
.lt-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.lt-stats {
  display: flex;
  gap: 8px;
}
.lt-stat {
  flex: 1;
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.lt-stat-num {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #dce4f0;
}
.lt-stat-label {
  display: block;
  font-size: 11px;
  color: #8a97ad;
  margin-top: 2px;
}
.lt-range-note {
  font-size: 12px;
  color: #8a97ad;
  margin: 8px 0 0;
}
.lt-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
}
.lt-name { width: 100%; margin-bottom: 8px; }
.lt-textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  margin-bottom: 8px;
  font-family: inherit;
}
.lt-search { width: 160px; }
.lt-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.lt-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.lt-btn-danger {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
}
.lt-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.lt-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.lt-list-head .lt-block-label { margin-bottom: 0; }
.lt-bundle {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.lt-bundle-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.lt-bundle-name {
  font-size: 13px;
  font-weight: 600;
  color: #9fc4e8;
}
.lt-bundle-meta {
  flex: 1;
  font-size: 11px;
  color: #7a879c;
}
.lt-messages {
  margin-top: 8px;
  border-top: 1px solid rgba(140, 160, 190, 0.1);
  padding-top: 6px;
}
.lt-msg {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}
.lt-msg-from {
  color: #9fc4e8;
  min-width: 48px;
}
.lt-msg-text {
  flex: 1;
  color: #c6d0e0;
}
.lt-msg-time {
  color: #7a879c;
  font-size: 11px;
}
.lt-expand {
  margin-top: 6px;
  background: none;
  border: none;
  color: #8a97ad;
  font-size: 12px;
  cursor: pointer;
}
.lt-expand:hover { color: #aab6c9; }
.lt-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
</style>
